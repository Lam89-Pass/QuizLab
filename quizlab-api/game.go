package main

import (
	"crypto/rand"
	"errors"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5"
)

// 32 karakter (tanpa 0/O/1/I) dan 256 habis dibagi 32, jadi hasilnya tidak bias.
const codeAlphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"

func makeCode() string {
	b := make([]byte, 6)
	_, _ = rand.Read(b)
	for i := range b {
		b[i] = codeAlphabet[int(b[i])%len(codeAlphabet)]
	}
	return string(b)
}

func normCode(s string) string { return strings.ToUpper(strings.TrimSpace(s)) }

// POST /api/quizzes/:id/sessions (host) -> buat sesi dan kode game
func (a *App) createSession(c *gin.Context) {
	quizID := c.Param("id")
	if !validUUID(quizID) {
		c.JSON(404, gin.H{"error": "kuis tidak ditemukan"})
		return
	}
	ctx := c.Request.Context()

	var n int
	err := a.db.QueryRow(ctx, `
		SELECT (SELECT count(*) FROM questions WHERE quiz_id = q.id)
		FROM quizzes q WHERE q.id = $1::uuid AND q.user_id = $2::uuid`,
		quizID, uid(c)).Scan(&n)
	if errors.Is(err, pgx.ErrNoRows) {
		c.JSON(404, gin.H{"error": "kuis tidak ditemukan"})
		return
	}
	if err != nil {
		serverError(c, err)
		return
	}
	if n == 0 {
		c.JSON(400, gin.H{"error": "kuis belum punya pertanyaan"})
		return
	}

	// pakai ulang sesi "waiting" yang masih baru, supaya refresh halaman host tidak mengganti kode
	var existingID, existingCode string
	err = a.db.QueryRow(ctx, `
		SELECT id::text, game_code FROM game_sessions
		WHERE quiz_id = $1::uuid AND host_id = $2::uuid AND status = 'waiting'
		  AND created_at > now() - interval '2 hours'
		ORDER BY created_at DESC LIMIT 1`, quizID, uid(c)).Scan(&existingID, &existingCode)
	if err == nil {
		c.JSON(200, gin.H{"id": existingID, "code": existingCode, "status": "waiting"})
		return
	}
	if !errors.Is(err, pgx.ErrNoRows) {
		serverError(c, err)
		return
	}

	// kode bentrok sangat jarang terjadi, tapi tetap dicoba ulang beberapa kali
	for attempt := 0; attempt < 5; attempt++ {
		code := makeCode()
		var id string
		err := a.db.QueryRow(ctx, `
			INSERT INTO game_sessions (quiz_id, host_id, game_code)
			VALUES ($1::uuid, $2::uuid, $3) RETURNING id::text`,
			quizID, uid(c), code).Scan(&id)
		if err == nil {
			c.JSON(201, gin.H{"id": id, "code": code, "status": "waiting"})
			return
		}
		if !isUniqueViolation(err) {
			serverError(c, err)
			return
		}
	}
	c.JSON(503, gin.H{"error": "gagal membuat kode game, coba lagi"})
}

// GET /api/sessions/:code (publik) -> validasi kode + info waiting room
func (a *App) getSession(c *gin.Context) {
	code := normCode(c.Param("code"))
	ctx := c.Request.Context()

	var sid, status, title, host string
	err := a.db.QueryRow(ctx, `
		SELECT s.id::text, s.status, q.title, u.name
		FROM game_sessions s
		JOIN quizzes q ON q.id = s.quiz_id
		JOIN users u ON u.id = s.host_id
		WHERE s.game_code = $1 AND s.status <> 'finished'`, code).
		Scan(&sid, &status, &title, &host)
	if errors.Is(err, pgx.ErrNoRows) {
		c.JSON(404, gin.H{"error": "kode game tidak valid"})
		return
	}
	if err != nil {
		serverError(c, err)
		return
	}

	rows, err := a.db.Query(ctx, `
		SELECT nickname FROM participants
		WHERE session_id = $1::uuid ORDER BY joined_at`, sid)
	if err != nil {
		serverError(c, err)
		return
	}
	defer rows.Close()
	names := []string{}
	for rows.Next() {
		var nm string
		if err := rows.Scan(&nm); err != nil {
			serverError(c, err)
			return
		}
		names = append(names, nm)
	}
	if err := rows.Err(); err != nil {
		serverError(c, err)
		return
	}

	c.JSON(200, gin.H{
		"code": code, "status": status, "quizTitle": title, "hostName": host,
		"participants": names, "participantCount": len(names),
	})
}

type joinReq struct {
	Nickname string `json:"nickname"`
	Token    string `json:"token"` // dikirim saat masuk kembali setelah koneksi putus
}

// PATCH /api/sessions/:code/status (host only) → update status sesi
func (a *App) updateSessionStatus(c *gin.Context) {
	code := normCode(c.Param("code"))
	ctx := c.Request.Context()

	var body struct {
		Status string `json:"status"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(400, gin.H{"error": "format JSON tidak valid"})
		return
	}
	if body.Status != "playing" && body.Status != "finished" {
		c.JSON(400, gin.H{"error": "status tidak valid"})
		return
	}

	tag, err := a.db.Exec(ctx, `
		UPDATE game_sessions SET status = $1
		WHERE game_code = $2 AND host_id = $3::uuid AND status <> 'finished'`,
		body.Status, code, uid(c))
	if err != nil {
		serverError(c, err)
		return
	}
	if tag.RowsAffected() == 0 {
		c.JSON(404, gin.H{"error": "sesi tidak ditemukan atau bukan milikmu"})
		return
	}
	c.JSON(200, gin.H{"status": body.Status})
}

// POST /api/sessions/:code/join (publik, tanpa login)
func (a *App) joinSession(c *gin.Context) {
	code := normCode(c.Param("code"))
	var req joinReq
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(400, gin.H{"error": "format JSON tidak valid"})
		return
	}
	req.Nickname = strings.TrimSpace(req.Nickname)
	ctx := c.Request.Context()

	var sid, status string
	err := a.db.QueryRow(ctx, `
		SELECT id::text, status FROM game_sessions
		WHERE game_code = $1 AND status <> 'finished'`, code).Scan(&sid, &status)
	if errors.Is(err, pgx.ErrNoRows) {
		c.JSON(404, gin.H{"error": "kode game tidak valid"})
		return
	}
	if err != nil {
		serverError(c, err)
		return
	}

	// masuk kembali: peserta lama dengan token yang cocok boleh masuk kapan pun
	if req.Token != "" {
		var pid, nick string
		err := a.db.QueryRow(ctx, `
			SELECT id::text, nickname FROM participants
			WHERE session_id = $1::uuid AND token = $2`, sid, req.Token).Scan(&pid, &nick)
		if err == nil {
			c.JSON(200, gin.H{"participantId": pid, "token": req.Token, "nickname": nick, "rejoined": true})
			return
		}
		if !errors.Is(err, pgx.ErrNoRows) {
			serverError(c, err)
			return
		}
	}

	if status != "waiting" {
		c.JSON(409, gin.H{"error": "permainan sudah dimulai"})
		return
	}
	if l := len([]rune(req.Nickname)); l < 1 || l > 20 {
		c.JSON(400, gin.H{"error": "nama panggilan wajib diisi (maks 20 karakter)"})
		return
	}

	token := randomHex(16)
	var pid string
	err = a.db.QueryRow(ctx, `
		INSERT INTO participants (session_id, nickname, token)
		VALUES ($1::uuid, $2, $3) RETURNING id::text`,
		sid, req.Nickname, token).Scan(&pid)
	if isUniqueViolation(err) {
		c.JSON(409, gin.H{"error": "nama itu sudah dipakai, coba yang lain"})
		return
	}
	if err != nil {
		serverError(c, err)
		return
	}
	c.JSON(201, gin.H{"participantId": pid, "token": token, "nickname": req.Nickname})
}

type updateGameStateReq struct {
	Phase         string `json:"phase"` // "lobby" | "question" | "reveal" | "final"
	QuestionIndex int    `json:"questionIndex"`
	IsPaused      *bool  `json:"isPaused,omitempty"`
}

// PATCH /api/sessions/:code/state (host only)
func (a *App) updateGameState(c *gin.Context) {
	code := normCode(c.Param("code"))
	var req updateGameStateReq
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(400, gin.H{"error": "format JSON tidak valid"})
		return
	}

	ctx := c.Request.Context()

	// Handle pause / resume toggle independently jika ada
	if req.IsPaused != nil {
		_, err := a.db.Exec(ctx, `
			UPDATE game_sessions
			SET is_paused = $1
			WHERE game_code = $2 AND host_id = $3::uuid`,
			*req.IsPaused, code, uid(c))
		if err != nil {
			serverError(c, err)
			return
		}
		if req.Phase == "" {
			c.JSON(200, gin.H{"ok": true, "isPaused": *req.IsPaused})
			return
		}
	}

	switch req.Phase {
	case "lobby":
		_, err := a.db.Exec(ctx, `
			UPDATE game_sessions
			SET current_phase = 'lobby', status = 'waiting', is_paused = false
			WHERE game_code = $1 AND host_id = $2::uuid`,
			code, uid(c))
		if err != nil {
			serverError(c, err)
			return
		}
	case "question":
		tag, err := a.db.Exec(ctx, `
			UPDATE game_sessions
			SET current_phase = 'question',
			    current_question = $1,
			    question_started_at = now(),
			    status = 'playing',
			    is_paused = false,
			    started_at = COALESCE(started_at, now())
			WHERE game_code = $2 AND host_id = $3::uuid AND status <> 'finished'`,
			req.QuestionIndex, code, uid(c))
		if err != nil {
			serverError(c, err)
			return
		}
		if tag.RowsAffected() == 0 {
			c.JSON(404, gin.H{"error": "sesi tidak ditemukan atau bukan milikmu"})
			return
		}
	case "reveal":
		tag, err := a.db.Exec(ctx, `
			UPDATE game_sessions
			SET current_phase = 'reveal', is_paused = false
			WHERE game_code = $1 AND host_id = $2::uuid AND status <> 'finished'`,
			code, uid(c))
		if err != nil {
			serverError(c, err)
			return
		}
		if tag.RowsAffected() == 0 {
			c.JSON(404, gin.H{"error": "sesi tidak ditemukan atau bukan milikmu"})
			return
		}
	case "final":
		tag, err := a.db.Exec(ctx, `
			UPDATE game_sessions
			SET current_phase = 'final',
			    status = 'finished',
			    is_paused = false,
			    ended_at = now()
			WHERE game_code = $1 AND host_id = $2::uuid`,
			code, uid(c))
		if err != nil {
			serverError(c, err)
			return
		}
		if tag.RowsAffected() == 0 {
			c.JSON(404, gin.H{"error": "sesi tidak ditemukan atau bukan milikmu"})
			return
		}
	default:
		c.JSON(400, gin.H{"error": "fase tidak valid"})
		return
	}

	c.JSON(200, gin.H{"ok": true, "phase": req.Phase, "questionIndex": req.QuestionIndex})
}

type LivePlayer struct {
	Name           string  `json:"name"`
	Score          int     `json:"score"`
	Streak         int     `json:"streak"`
	MaxStreak      int     `json:"maxStreak"`
	TotalCorrect   int     `json:"totalCorrect"`
	TotalIncorrect int     `json:"totalIncorrect"`
	Accuracy       float64 `json:"accuracy"`
	IsMe           bool    `json:"isMe,omitempty"`
}

type LiveQuestion struct {
	ID          string   `json:"id"`
	Text        string   `json:"text"`
	Type        string   `json:"type"`
	Options     []string `json:"options"`
	Duration    int      `json:"duration"`
	Correct     int      `json:"correct"`
	ImageURL    string   `json:"imageUrl"`
	Explanation string   `json:"explanation,omitempty"`
}

type GameReport struct {
	AvgScore            float64 `json:"avgScore"`
	TotalCorrect        int     `json:"totalCorrect"`
	TotalIncorrect      int     `json:"totalIncorrect"`
	CorrectPercentage   float64 `json:"correctPercentage"`
	IncorrectPercentage float64 `json:"incorrectPercentage"`
}

// GET /api/sessions/:code/state (publik)
func (a *App) getGameState(c *gin.Context) {
	code := normCode(c.Param("code"))
	token := strings.TrimSpace(c.Query("token"))
	ctx := c.Request.Context()

	var sid, quizID, status, currentPhase, title, hostName string
	var currentQuestion int
	var isPaused bool
	var questionStartedAt *time.Time

	err := a.db.QueryRow(ctx, `
		SELECT s.id::text, s.quiz_id::text, s.status, s.current_phase, s.current_question,
		       s.question_started_at, s.is_paused, q.title, u.name
		FROM game_sessions s
		JOIN quizzes q ON q.id = s.quiz_id
		JOIN users u ON u.id = s.host_id
		WHERE s.game_code = $1`, code).
		Scan(&sid, &quizID, &status, &currentPhase, &currentQuestion, &questionStartedAt, &isPaused, &title, &hostName)
	if errors.Is(err, pgx.ErrNoRows) {
		c.JSON(404, gin.H{"error": "sesi tidak ditemukan"})
		return
	}
	if err != nil {
		serverError(c, err)
		return
	}

	// Ambil daftar pemain, skor, streak, dan statistik akurasi
	// Saat fase 'question', skor soal aktif belum dihitung di papan skor / header agar tidak spoiler dan tidak naik-turun saat peserta ganti pilihan
	pRows, err := a.db.Query(ctx, `
		SELECT p.id::text, p.nickname, p.total_score, p.token, p.streak, p.max_streak,
		       COUNT(pa.id) FILTER (WHERE pa.is_correct = true) as total_correct,
		       COUNT(pa.id) FILTER (WHERE pa.is_correct = false) as total_incorrect,
		       COALESCE(cur_pa.score, 0) as cur_score
		FROM participants p
		LEFT JOIN participant_answers pa ON pa.participant_id = p.id
		LEFT JOIN participant_answers cur_pa ON cur_pa.participant_id = p.id
		     AND cur_pa.question_id IN (SELECT id FROM questions WHERE quiz_id = $2::uuid AND order_number = $3)
		WHERE p.session_id = $1::uuid
		GROUP BY p.id, p.nickname, p.total_score, p.token, p.streak, p.max_streak, cur_pa.score
		ORDER BY (p.total_score - CASE WHEN $4 = 'question' THEN COALESCE(cur_pa.score, 0) ELSE 0 END) DESC, p.joined_at ASC`,
		sid, quizID, currentQuestion, currentPhase)
	if err != nil {
		serverError(c, err)
		return
	}
	defer pRows.Close()

	players := []LivePlayer{}
	var myPID string
	var myScore int
	var myStreak int
	totalGameCorrect := 0
	totalGameIncorrect := 0
	sumScore := 0

	for pRows.Next() {
		var pid, nick, pToken string
		var rawScore, streak, maxStreak, tCorrect, tIncorrect, curScore int
		if err := pRows.Scan(&pid, &nick, &rawScore, &pToken, &streak, &maxStreak, &tCorrect, &tIncorrect, &curScore); err != nil {
			serverError(c, err)
			return
		}
		// Saat fase question, jangan tampilkan poin soal yang sedang berjalan
		dispScore := rawScore
		if currentPhase == "question" {
			dispScore = rawScore - curScore
			if dispScore < 0 {
				dispScore = 0
			}
		}

		isMe := (token != "" && pToken == token)
		if isMe {
			myPID = pid
			myScore = dispScore
			myStreak = streak
		}
		totAns := tCorrect + tIncorrect
		acc := 0.0
		if totAns > 0 {
			acc = float64(tCorrect) / float64(totAns) * 100.0
		}
		totalGameCorrect += tCorrect
		totalGameIncorrect += tIncorrect
		sumScore += dispScore

		players = append(players, LivePlayer{
			Name:           nick,
			Score:          dispScore,
			Streak:         streak,
			MaxStreak:      maxStreak,
			TotalCorrect:   tCorrect,
			TotalIncorrect: tIncorrect,
			Accuracy:       acc,
			IsMe:           isMe,
		})
	}

	// Hitung report agregat kuis
	var report GameReport
	if len(players) > 0 {
		report.AvgScore = float64(sumScore) / float64(len(players))
	}
	totalAnsAll := totalGameCorrect + totalGameIncorrect
	if totalAnsAll > 0 {
		report.TotalCorrect = totalGameCorrect
		report.TotalIncorrect = totalGameIncorrect
		report.CorrectPercentage = float64(totalGameCorrect) / float64(totalAnsAll) * 100.0
		report.IncorrectPercentage = float64(totalGameIncorrect) / float64(totalAnsAll) * 100.0
	}

	// Ambil semua soal untuk quiz ini (termasuk image_url & explanation)
	qRows, err := a.db.Query(ctx, `
		SELECT q.id::text, q.question_text, q.qtype, q.duration, q.image_url, q.explanation,
		       a.id::text, a.answer_text, a.is_correct
		FROM questions q
		JOIN answers a ON a.question_id = q.id
		WHERE q.quiz_id = $1::uuid
		ORDER BY q.order_number, a.order_number`, quizID)
	if err != nil {
		serverError(c, err)
		return
	}
	defer qRows.Close()

	type rawQ struct {
		id      string
		text    string
		qtype   string
		dur     int
		img     string
		expl    string
		opts    []string
		optIDs  []string
		correct int
	}

	var questions []rawQ
	qIndexMap := map[string]int{}
	for qRows.Next() {
		var qid, qtext, qtype, img, expl, aid, atext string
		var dur int
		var isCorrect bool
		if err := qRows.Scan(&qid, &qtext, &qtype, &dur, &img, &expl, &aid, &atext, &isCorrect); err != nil {
			serverError(c, err)
			return
		}
		idx, exists := qIndexMap[qid]
		if !exists {
			idx = len(questions)
			qIndexMap[qid] = idx
			questions = append(questions, rawQ{
				id: qid, text: qtext, qtype: qtype, dur: dur, img: img, expl: expl, correct: 0,
			})
		}
		if isCorrect {
			questions[idx].correct = len(questions[idx].opts)
		}
		questions[idx].opts = append(questions[idx].opts, atext)
		questions[idx].optIDs = append(questions[idx].optIDs, aid)
	}

	totalQuestions := len(questions)

	var curQ *LiveQuestion
	var myAnswer = -1
	var answeredCount int
	var counts []int

	if currentQuestion >= 0 && currentQuestion < len(questions) {
		qData := questions[currentQuestion]
		counts = make([]int, len(qData.opts))

		ansRows, err := a.db.Query(ctx, `
			SELECT pa.participant_id::text, pa.selected_answer_id::text
			FROM participant_answers pa
			JOIN participants p ON p.id = pa.participant_id
			WHERE p.session_id = $1::uuid AND pa.question_id = $2::uuid`,
			sid, qData.id)
		if err == nil {
			defer ansRows.Close()
			for ansRows.Next() {
				var partID, selAnsID string
				if err := ansRows.Scan(&partID, &selAnsID); err == nil {
					answeredCount++
					for optIdx, optID := range qData.optIDs {
						if optID == selAnsID {
							counts[optIdx]++
							if partID == myPID {
								myAnswer = optIdx
							}
							break
						}
					}
				}
			}
		}

		dispCorrect := qData.correct
		dispExplanation := ""
		if currentPhase == "question" {
			dispCorrect = -1
		} else {
			dispExplanation = qData.expl
		}

		curQ = &LiveQuestion{
			ID:          qData.id,
			Text:        qData.text,
			Type:        qData.qtype,
			Options:     qData.opts,
			Duration:    qData.dur,
			Correct:     dispCorrect,
			ImageURL:    qData.img,
			Explanation: dispExplanation,
		}
	}

	var elapsedSec float64
	if questionStartedAt != nil {
		elapsedSec = time.Since(*questionStartedAt).Seconds()
	}

	c.JSON(200, gin.H{
		"code":            code,
		"status":          status,
		"currentPhase":    currentPhase,
		"currentQuestion": currentQuestion,
		"totalQuestions":  totalQuestions,
		"quizTitle":       title,
		"hostName":        hostName,
		"isPaused":        isPaused,
		"question":        curQ,
		"players":         players,
		"report":          report,
		"answeredCount":   answeredCount,
		"counts":          counts,
		"myAnswer":        myAnswer,
		"myScore":         myScore,
		"myStreak":        myStreak,
		"elapsedSeconds":  int(elapsedSec),
	})
}

type submitAnswerReq struct {
	Token          string `json:"token"`
	QuestionIndex  int    `json:"questionIndex"`
	SelectedOption int    `json:"selectedOption"`
}

// POST /api/sessions/:code/answer (publik, butuh token peserta)
func (a *App) submitAnswer(c *gin.Context) {
	code := normCode(c.Param("code"))
	var req submitAnswerReq
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(400, gin.H{"error": "format JSON tidak valid"})
		return
	}
	req.Token = strings.TrimSpace(req.Token)
	if req.Token == "" {
		c.JSON(401, gin.H{"error": "token peserta tidak ditemukan"})
		return
	}

	ctx := c.Request.Context()

	var sid, quizID, status, currentPhase string
	var currentQuestion int
	err := a.db.QueryRow(ctx, `
		SELECT id::text, quiz_id::text, status, current_phase, current_question
		FROM game_sessions
		WHERE game_code = $1`, code).Scan(&sid, &quizID, &status, &currentPhase, &currentQuestion)
	if err != nil {
		c.JSON(404, gin.H{"error": "sesi tidak ditemukan"})
		return
	}

	if status != "playing" || currentPhase != "question" {
		c.JSON(400, gin.H{"error": "saat ini bukan waktu menjawab"})
		return
	}

	if req.QuestionIndex != currentQuestion {
		c.JSON(400, gin.H{"error": "soal sudah berganti"})
		return
	}

	var pid string
	err = a.db.QueryRow(ctx, `
		SELECT id::text FROM participants
		WHERE session_id = $1::uuid AND token = $2`, sid, req.Token).Scan(&pid)
	if err != nil {
		c.JSON(403, gin.H{"error": "peserta tidak valid"})
		return
	}

	var qid string
	err = a.db.QueryRow(ctx, `
		SELECT id::text FROM questions
		WHERE quiz_id = $1::uuid AND order_number = $2`, quizID, currentQuestion).Scan(&qid)
	if err != nil {
		c.JSON(404, gin.H{"error": "soal tidak ditemukan"})
		return
	}

	aRows, err := a.db.Query(ctx, `
		SELECT id::text, is_correct FROM answers
		WHERE question_id = $1::uuid
		ORDER BY order_number`, qid)
	if err != nil {
		serverError(c, err)
		return
	}
	defer aRows.Close()

	type aItem struct {
		id      string
		correct bool
	}
	var answers []aItem
	for aRows.Next() {
		var aid string
		var isCor bool
		if err := aRows.Scan(&aid, &isCor); err != nil {
			serverError(c, err)
			return
		}
		answers = append(answers, aItem{id: aid, correct: isCor})
	}

	if req.SelectedOption < 0 || req.SelectedOption >= len(answers) {
		c.JSON(400, gin.H{"error": "pilihan jawaban tidak valid"})
		return
	}

	chosen := answers[req.SelectedOption]

	tx, err := a.db.Begin(ctx)
	if err != nil {
		serverError(c, err)
		return
	}
	defer tx.Rollback(ctx)

	// Simpan / update jawaban peserta untuk soal ini (bisa ganti jawaban bebas sebelum waktu habis)
	_, err = tx.Exec(ctx, `
		INSERT INTO participant_answers (participant_id, question_id, selected_answer_id, is_correct, score)
		VALUES ($1::uuid, $2::uuid, $3::uuid, $4, 0)
		ON CONFLICT (participant_id, question_id)
		DO UPDATE SET selected_answer_id = EXCLUDED.selected_answer_id,
		              is_correct = EXCLUDED.is_correct`,
		pid, qid, chosen.id, chosen.correct)
	if err != nil {
		serverError(c, err)
		return
	}

	// Hitung ulang streak, combo bonus, dan skor semua soal secara berurutan
	rows, err := tx.Query(ctx, `
		SELECT pa.id::text, pa.question_id::text, pa.is_correct
		FROM participant_answers pa
		JOIN questions q ON q.id = pa.question_id
		WHERE pa.participant_id = $1::uuid
		ORDER BY q.order_number ASC`, pid)
	if err != nil {
		serverError(c, err)
		return
	}
	defer rows.Close()

	currStreak := 0
	maxStreak := 0
	totalScore := 0
	thisScore := 0
	thisBonus := 0

	type paUp struct {
		id    string
		score int
	}
	var updates []paUp

	for rows.Next() {
		var paID, itemQID string
		var isCor bool
		if err := rows.Scan(&paID, &itemQID, &isCor); err != nil {
			serverError(c, err)
			return
		}
		itemScore := 0
		if isCor {
			currStreak++
			bonus := 0
			if currStreak > 1 {
				bonus = (currStreak - 1) * 100
			}
			itemScore = 1000 + bonus
			if currStreak > maxStreak {
				maxStreak = currStreak
			}
			if itemQID == qid {
				thisScore = itemScore
				thisBonus = bonus
			}
		} else {
			currStreak = 0
		}
		totalScore += itemScore
		updates = append(updates, paUp{id: paID, score: itemScore})
	}
	rows.Close()

	for _, u := range updates {
		_, _ = tx.Exec(ctx, `UPDATE participant_answers SET score = $1 WHERE id = $2::uuid`, u.score, u.id)
	}

	_, err = tx.Exec(ctx, `
		UPDATE participants
		SET total_score = $1, streak = $2, max_streak = $3
		WHERE id = $4::uuid`, totalScore, currStreak, maxStreak, pid)
	if err != nil {
		serverError(c, err)
		return
	}

	if err := tx.Commit(ctx); err != nil {
		serverError(c, err)
		return
	}

	c.JSON(200, gin.H{
		"ok":         true,
		"score":      thisScore,
		"streak":     currStreak,
		"comboBonus": thisBonus,
		"selected":   req.SelectedOption,
	})
}
