package main

import (
	"context"
	"encoding/json"
	"errors"
	"log"
	"sort"
	"strings"
	"sync"
	"time"

	"github.com/jackc/pgx/v5"
)

type M map[string]any

const pointsPerCorrect = 1000

func nowMs() int64 { return time.Now().UnixMilli() }

/* ---------- Hub: daftar engine yang sedang aktif ---------- */

type Hub struct {
	mu      sync.Mutex
	engines map[string]*Engine
}

func newHub() *Hub { return &Hub{engines: map[string]*Engine{}} }

func (h *Hub) remove(sid string, e *Engine) {
	h.mu.Lock()
	if h.engines[sid] == e {
		delete(h.engines, sid)
	}
	h.mu.Unlock()
}

// engineFor mengambil engine sesi, atau membuatnya kalau belum ada.
func (a *App) engineFor(ctx context.Context, sid string) (*Engine, error) {
	h := a.hub
	h.mu.Lock()
	defer h.mu.Unlock()
	if e, ok := h.engines[sid]; ok {
		select {
		case <-e.done:
			delete(h.engines, sid)
		default:
			return e, nil
		}
	}
	e, err := a.loadEngine(ctx, sid)
	if err != nil {
		return nil, err
	}
	h.engines[sid] = e
	go e.run()
	return e, nil
}

/* ---------- Tipe data ---------- */

type liveQuestion struct {
	ID        string
	Text      string
	Type      string
	Duration  int
	Options   []string
	AnswerIDs []string
	Correct   int
}

type Player struct {
	ID       string
	Name     string
	Score    int
	TimeMs   int64 // total waktu menjawab (untuk pemecah skor seri)
	seq      int
	online   int
	choice   int
	respMs   int64
	correct  bool
	gained   int
	rank     int
	prevRank int
}

type inbound struct {
	c   *Conn
	raw []byte
}

type enterReq struct {
	c    *Conn
	nick string
}

type Engine struct {
	a        *App
	sid      string
	code     string
	title    string
	hostName string

	questions []liveQuestion

	join  chan enterReq
	leave chan *Conn
	in    chan inbound
	done  chan struct{}

	// state di bawah ini hanya disentuh oleh goroutine run()
	conns      map[*Conn]bool
	players    map[string]*Player
	seq        int
	phase      string // lobby | question | reveal | board | final
	qIndex     int
	qStart     time.Time
	qEnd       time.Time
	timer      *time.Timer
	timerC     <-chan time.Time
	counts     []int
	lastActive time.Time
}

/* ---------- Memuat engine dari database ---------- */

func (a *App) loadEngine(ctx context.Context, sid string) (*Engine, error) {
	e := &Engine{
		a:          a,
		sid:        sid,
		join:       make(chan enterReq),
		leave:      make(chan *Conn, 16),
		in:         make(chan inbound, 64),
		done:       make(chan struct{}),
		conns:      map[*Conn]bool{},
		players:    map[string]*Player{},
		phase:      "lobby",
		lastActive: time.Now(),
	}

	var status, quizID string
	err := a.db.QueryRow(ctx, `
		SELECT s.game_code, s.status, s.quiz_id::text, q.title, u.name
		FROM game_sessions s
		JOIN quizzes q ON q.id = s.quiz_id
		JOIN users u ON u.id = s.host_id
		WHERE s.id = $1::uuid`, sid).Scan(&e.code, &status, &quizID, &e.title, &e.hostName)
	if err != nil {
		return nil, errors.New("sesi tidak ditemukan")
	}

	rows, err := a.db.Query(ctx, `
		SELECT q.id::text, q.question_text, q.qtype, q.duration,
		       a.id::text, a.answer_text, a.is_correct
		FROM questions q
		JOIN answers a ON a.question_id = q.id
		WHERE q.quiz_id = $1::uuid
		ORDER BY q.order_number, a.order_number`, quizID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	idx := map[string]int{}
	for rows.Next() {
		var qid, text, qtype, aid, atext string
		var dur int
		var isCorrect bool
		if err := rows.Scan(&qid, &text, &qtype, &dur, &aid, &atext, &isCorrect); err != nil {
			return nil, err
		}
		i, found := idx[qid]
		if !found {
			e.questions = append(e.questions, liveQuestion{ID: qid, Text: text, Type: qtype, Duration: dur})
			i = len(e.questions) - 1
			idx[qid] = i
		}
		q := &e.questions[i]
		if isCorrect {
			q.Correct = len(q.Options)
		}
		q.Options = append(q.Options, atext)
		q.AnswerIDs = append(q.AnswerIDs, aid)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	if len(e.questions) == 0 {
		return nil, errors.New("kuis tidak punya pertanyaan")
	}

	switch status {
	case "waiting":
		// engine baru, mulai dari lobby
	case "finished":
		e.phase = "final"
		if err := e.loadFinalPlayers(ctx); err != nil {
			return nil, err
		}
	default:
		// "playing" tapi engine-nya hilang (server dimulai ulang)
		_, _ = a.db.Exec(ctx,
			`UPDATE game_sessions SET status='finished', ended_at=now() WHERE id=$1::uuid`, sid)
		return nil, errors.New("permainan terputus karena server dimulai ulang")
	}
	return e, nil
}

func (e *Engine) loadFinalPlayers(ctx context.Context) error {
	rows, err := e.a.db.Query(ctx, `
		SELECT p.id::text, p.nickname, p.total_score,
		       COALESCE((SELECT sum(pa.response_time) FROM participant_answers pa
		                 WHERE pa.participant_id = p.id), 0)
		FROM participants p
		WHERE p.session_id = $1::uuid
		  AND EXISTS (SELECT 1 FROM participant_answers pa WHERE pa.participant_id = p.id)`, e.sid)
	if err != nil {
		return err
	}
	defer rows.Close()
	for rows.Next() {
		p := &Player{choice: -1}
		if err := rows.Scan(&p.ID, &p.Name, &p.Score, &p.TimeMs); err != nil {
			return err
		}
		e.seq++
		p.seq = e.seq
		e.players[p.ID] = p
	}
	return rows.Err()
}

/* ---------- Loop utama ---------- */

func (e *Engine) run() {
	idle := time.NewTicker(time.Minute)
	defer idle.Stop()
	defer e.shutdown()
	for {
		select {
		case r := <-e.join:
			e.onJoin(r)
		case c := <-e.leave:
			e.onLeave(c)
		case m := <-e.in:
			e.onMessage(m)
		case <-e.timerC:
			e.endQuestion()
		case <-idle.C:
			limit := 30 * time.Minute
			if e.phase == "final" {
				limit = 10 * time.Minute
			}
			if len(e.conns) == 0 && time.Since(e.lastActive) > limit {
				return
			}
		}
	}
}

func (e *Engine) shutdown() {
	e.a.hub.remove(e.sid, e)
	close(e.done)
	if e.timer != nil {
		e.timer.Stop()
	}
	for c := range e.conns {
		close(c.send)
		c.close()
	}
}

/* ---------- Kirim pesan ---------- */

func (e *Engine) push(c *Conn, b []byte) {
	select {
	case c.send <- b:
	default:
		c.close() // klien terlalu lambat; readPump akan memicu onLeave
	}
}

func (e *Engine) sendTo(c *Conn, v any) {
	b, err := json.Marshal(v)
	if err != nil {
		log.Printf("marshal: %v", err)
		return
	}
	e.push(c, b)
}

func (e *Engine) broadcast(v any) {
	b, err := json.Marshal(v)
	if err != nil {
		log.Printf("marshal: %v", err)
		return
	}
	for c := range e.conns {
		e.push(c, b)
	}
}

func (e *Engine) toHosts(v any) {
	b, err := json.Marshal(v)
	if err != nil {
		return
	}
	for c := range e.conns {
		if c.role == "host" {
			e.push(c, b)
		}
	}
}

func (e *Engine) toPlayer(pid string, v any) {
	b, err := json.Marshal(v)
	if err != nil {
		return
	}
	for c := range e.conns {
		if c.role == "player" && c.pid == pid {
			e.push(c, b)
		}
	}
}

func (e *Engine) reject(c *Conn, msg string) {
	if b, err := json.Marshal(M{"t": "error", "msg": msg}); err == nil {
		select {
		case c.send <- b:
		default:
		}
	}
	close(c.send) // writePump mengirim sisa pesan lalu menutup koneksi
}

/* ---------- Join / leave ---------- */

func (e *Engine) onJoin(r enterReq) {
	e.lastActive = time.Now()
	c := r.c
	if c.role == "player" {
		p := e.players[c.pid]
		if p == nil {
			if e.phase != "lobby" {
				e.reject(c, "permainan sudah dimulai")
				return
			}
			e.seq++
			p = &Player{ID: c.pid, Name: r.nick, choice: -1, seq: e.seq}
			e.players[c.pid] = p
		}
		p.online++
	}
	e.conns[c] = true
	e.welcome(c)
	if e.phase == "lobby" {
		e.broadcast(e.lobbyMsg())
	}
}

func (e *Engine) onLeave(c *Conn) {
	if !e.conns[c] {
		return
	}
	e.lastActive = time.Now()
	delete(e.conns, c)
	close(c.send)
	if c.role == "player" {
		if p := e.players[c.pid]; p != nil {
			p.online--
			if p.online <= 0 && e.phase == "lobby" {
				delete(e.players, c.pid)
				e.broadcast(e.lobbyMsg())
			}
		}
	}
}

// welcome mengirim keadaan terkini ke satu koneksi (juga dipakai saat masuk kembali).
func (e *Engine) welcome(c *Conn) {
	var p *Player
	if c.role == "player" {
		p = e.players[c.pid]
	}
	w := M{
		"t": "welcome", "role": c.role, "code": e.code, "title": e.title,
		"hostName": e.hostName, "total": len(e.questions),
		"phase": e.phase, "serverNow": nowMs(),
	}
	if p != nil {
		w["nickname"] = p.Name
	}
	e.sendTo(c, w)

	switch e.phase {
	case "question":
		e.sendTo(c, e.questionMsg(p))
		if c.role == "host" {
			e.sendTo(c, e.progressMsg())
		}
	case "reveal":
		e.sendTo(c, e.revealMsg())
		if p != nil {
			e.sendTo(c, e.resultMsg(p))
		}
	case "board", "final":
		e.sendTo(c, e.boardMsg())
	}
}

/* ---------- Perintah dari klien ---------- */

func (e *Engine) onMessage(m inbound) {
	e.lastActive = time.Now()
	c := m.c
	if !e.conns[c] {
		return
	}
	var msg struct {
		T      string `json:"t"`
		Q      int    `json:"q"`
		Choice *int   `json:"choice"`
	}
	if json.Unmarshal(m.raw, &msg) != nil {
		return
	}
	switch msg.T {
	case "start":
		if c.role == "host" {
			e.startGame(c)
		}
	case "skip":
		if c.role == "host" && e.phase == "question" {
			e.endQuestion()
		}
	case "next":
		if c.role == "host" {
			e.next()
		}
	case "answer":
		if c.role == "player" && msg.Choice != nil {
			e.onAnswer(c, msg.Q, *msg.Choice)
		}
	case "ping":
		e.sendTo(c, M{"t": "pong", "serverNow": nowMs()})
	}
}

func (e *Engine) startGame(c *Conn) {
	if e.phase != "lobby" {
		return
	}
	if len(e.players) == 0 {
		e.sendTo(c, M{"t": "error", "msg": "belum ada peserta"})
		return
	}
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if _, err := e.a.db.Exec(ctx, `
		UPDATE game_sessions SET status='playing', started_at=now()
		WHERE id=$1::uuid AND status='waiting'`, e.sid); err != nil {
		log.Printf("start session: %v", err)
		e.sendTo(c, M{"t": "error", "msg": "gagal memulai permainan"})
		return
	}
	e.beginQuestion(0)
}

func (e *Engine) beginQuestion(i int) {
	q := e.questions[i]
	e.qIndex = i
	e.phase = "question"
	e.counts = make([]int, len(q.Options))
	for _, p := range e.players {
		p.choice, p.respMs, p.gained, p.correct = -1, 0, 0, false
	}
	e.qStart = time.Now()
	e.qEnd = e.qStart.Add(time.Duration(q.Duration) * time.Second)
	if e.timer != nil {
		e.timer.Stop()
	}
	e.timer = time.NewTimer(time.Until(e.qEnd))
	e.timerC = e.timer.C
	e.broadcast(e.questionMsg(nil))
	e.toHosts(e.progressMsg())
}

func (e *Engine) onAnswer(c *Conn, q, choice int) {
	if e.phase != "question" || q != e.qIndex {
		return
	}
	p := e.players[c.pid]
	if p == nil || p.choice >= 0 { // hanya satu jawaban per soal
		return
	}
	now := time.Now()
	if now.After(e.qEnd) {
		return
	}
	if choice < 0 || choice >= len(e.questions[e.qIndex].Options) {
		return
	}
	p.choice = choice
	p.respMs = now.Sub(e.qStart).Milliseconds()
	e.toPlayer(p.ID, M{"t": "locked", "index": q, "choice": choice})
	e.toHosts(e.progressMsg())
}

func (e *Engine) endQuestion() {
	if e.phase != "question" {
		return
	}
	if e.timer != nil {
		e.timer.Stop()
	}
	e.timerC = nil
	q := e.questions[e.qIndex]
	e.phase = "reveal"

	for i := range e.counts {
		e.counts[i] = 0
	}
	for _, p := range e.players {
		if p.choice >= 0 {
			e.counts[p.choice]++
			p.correct = p.choice == q.Correct
			p.TimeMs += p.respMs
		} else {
			p.correct = false
			p.TimeMs += int64(q.Duration) * 1000
		}
		p.gained = 0
		if p.correct {
			p.gained = pointsPerCorrect
		}
		p.Score += p.gained
	}
	for i, p := range e.ranked() {
		p.rank = i + 1
	}

	e.broadcast(e.revealMsg())
	for _, p := range e.players {
		e.toPlayer(p.ID, e.resultMsg(p))
	}
	e.persistQuestion(q)
}

func (e *Engine) next() {
	switch e.phase {
	case "reveal":
		e.phase = "board"
		e.broadcast(e.boardMsg())
		for _, p := range e.players {
			p.prevRank = p.rank
		}
	case "board":
		if e.qIndex+1 < len(e.questions) {
			e.beginQuestion(e.qIndex + 1)
		} else {
			e.finish()
		}
	}
}

func (e *Engine) finish() {
	e.phase = "final"
	e.broadcast(e.boardMsg())
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if _, err := e.a.db.Exec(ctx,
		`UPDATE game_sessions SET status='finished', ended_at=now() WHERE id=$1::uuid`, e.sid); err != nil {
		log.Printf("finish session: %v", err)
	}
}

/* ---------- Peringkat dan penyimpanan ---------- */

func (e *Engine) ranked() []*Player {
	ps := make([]*Player, 0, len(e.players))
	for _, p := range e.players {
		ps = append(ps, p)
	}
	sort.Slice(ps, func(i, j int) bool {
		a, b := ps[i], ps[j]
		if a.Score != b.Score {
			return a.Score > b.Score
		}
		if a.TimeMs != b.TimeMs {
			return a.TimeMs < b.TimeMs // skor sama: yang lebih cepat menang
		}
		return strings.ToLower(a.Name) < strings.ToLower(b.Name)
	})
	return ps
}

func (e *Engine) persistQuestion(q liveQuestion) {
	ctx, cancel := context.WithTimeout(context.Background(), 8*time.Second)
	defer cancel()

	batch := &pgx.Batch{}
	for _, p := range e.players {
		var sel any
		resp := int64(q.Duration) * 1000
		if p.choice >= 0 {
			sel = q.AnswerIDs[p.choice]
			resp = p.respMs
		}
		batch.Queue(`
			INSERT INTO participant_answers
			  (participant_id, question_id, selected_answer_id, is_correct, response_time, score)
			VALUES ($1::uuid, $2::uuid, $3::uuid, $4, $5, $6)
			ON CONFLICT (participant_id, question_id) DO NOTHING`,
			p.ID, q.ID, sel, p.correct, int(resp), p.gained)
		batch.Queue(`UPDATE participants SET total_score = $2 WHERE id = $1::uuid`, p.ID, p.Score)
	}
	if batch.Len() == 0 {
		return
	}
	br := e.a.db.SendBatch(ctx, batch)
	defer br.Close()
	for i := 0; i < batch.Len(); i++ {
		if _, err := br.Exec(); err != nil {
			log.Printf("simpan jawaban: %v", err)
			return
		}
	}
}

/* ---------- Isi pesan ---------- */

func (e *Engine) lobbyMsg() M {
	ps := make([]*Player, 0, len(e.players))
	for _, p := range e.players {
		ps = append(ps, p)
	}
	sort.Slice(ps, func(i, j int) bool { return ps[i].seq < ps[j].seq })
	names := make([]string, len(ps))
	for i, p := range ps {
		names[i] = p.Name
	}
	return M{"t": "lobby", "players": names, "count": len(names)}
}

// questionMsg TIDAK memuat kunci jawaban.
func (e *Engine) questionMsg(p *Player) M {
	q := e.questions[e.qIndex]
	choice := -1
	if p != nil {
		choice = p.choice
	}
	return M{
		"t": "question", "index": e.qIndex, "total": len(e.questions),
		"text": q.Text, "qtype": q.Type, "options": q.Options,
		"duration": q.Duration, "endsAt": e.qEnd.UnixMilli(),
		"serverNow": nowMs(), "choice": choice,
	}
}

func (e *Engine) progressMsg() M {
	n := 0
	for _, p := range e.players {
		if p.choice >= 0 {
			n++
		}
	}
	return M{"t": "progress", "answered": n, "total": len(e.players)}
}

// revealMsg baru dikirim setelah waktu soal habis.
func (e *Engine) revealMsg() M {
	q := e.questions[e.qIndex]
	answered := 0
	for _, n := range e.counts {
		answered += n
	}
	return M{
		"t": "reveal", "index": e.qIndex, "correct": q.Correct,
		"counts": e.counts, "answered": answered, "total": len(e.players),
	}
}

func (e *Engine) resultMsg(p *Player) M {
	return M{
		"t": "result", "index": e.qIndex, "choice": p.choice, "correct": p.correct,
		"gained": p.gained, "score": p.Score, "rank": p.rank,
	}
}

func (e *Engine) boardMsg() M {
	ps := e.ranked()
	rows := make([]M, len(ps))
	for i, p := range ps {
		change := 0
		if p.prevRank > 0 {
			change = p.prevRank - (i + 1) // positif = naik peringkat
		}
		rows[i] = M{"name": p.Name, "score": p.Score, "rank": i + 1, "change": change}
	}
	return M{
		"t": "board", "final": e.phase == "final", "index": e.qIndex,
		"total": len(e.questions), "players": rows,
	}
}
