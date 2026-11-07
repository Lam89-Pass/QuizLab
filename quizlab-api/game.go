package main

import (
	"crypto/rand"
	"errors"
	"strings"

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
