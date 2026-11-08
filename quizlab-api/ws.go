package main

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"github.com/gorilla/websocket"
	"github.com/jackc/pgx/v5"
)

const (
	helloTimeout = 10 * time.Second
	writeWait    = 10 * time.Second
	pongWait     = 60 * time.Second
	pingEvery    = 25 * time.Second
	maxMsgBytes  = 4096
)

// Conn adalah satu koneksi WebSocket (host atau peserta).
type Conn struct {
	ws   *websocket.Conn
	send chan []byte
	role string // "host" | "player"
	pid  string // id peserta; kosong untuk host
}

func (c *Conn) close() { _ = c.ws.Close() }

func (c *Conn) readPump(e *Engine) {
	defer func() {
		select {
		case e.leave <- c:
		case <-e.done:
		}
		c.close()
	}()
	_ = c.ws.SetReadDeadline(time.Now().Add(pongWait))
	c.ws.SetPongHandler(func(string) error {
		return c.ws.SetReadDeadline(time.Now().Add(pongWait))
	})
	for {
		_, raw, err := c.ws.ReadMessage()
		if err != nil {
			return
		}
		_ = c.ws.SetReadDeadline(time.Now().Add(pongWait))
		select {
		case e.in <- inbound{c: c, raw: raw}:
		case <-e.done:
			return
		}
	}
}

func (c *Conn) writePump() {
	t := time.NewTicker(pingEvery)
	defer func() {
		t.Stop()
		c.close()
	}()
	for {
		select {
		case msg, ok := <-c.send:
			_ = c.ws.SetWriteDeadline(time.Now().Add(writeWait))
			if !ok {
				_ = c.ws.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}
			if err := c.ws.WriteMessage(websocket.TextMessage, msg); err != nil {
				return
			}
		case <-t.C:
			_ = c.ws.SetWriteDeadline(time.Now().Add(writeWait))
			if err := c.ws.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}
}

func wsFail(ws *websocket.Conn, msg string) {
	_ = ws.SetWriteDeadline(time.Now().Add(writeWait))
	b, _ := json.Marshal(M{"t": "error", "msg": msg})
	_ = ws.WriteMessage(websocket.TextMessage, b)
	_ = ws.Close()
}

/* ---------- Tiket host ---------- */

// POST /api/sessions/:code/host-ticket (host, wajib login)
func (a *App) hostTicket(c *gin.Context) {
	code := normCode(c.Param("code"))
	var sid string
	err := a.db.QueryRow(c.Request.Context(), `
		SELECT id::text FROM game_sessions
		WHERE game_code = $1 AND host_id = $2::uuid
		ORDER BY created_at DESC LIMIT 1`, code, uid(c)).Scan(&sid)
	if errors.Is(err, pgx.ErrNoRows) {
		c.JSON(404, gin.H{"error": "sesi tidak ditemukan"})
		return
	}
	if err != nil {
		serverError(c, err)
		return
	}
	claims := jwt.MapClaims{
		"sub": uid(c), "sid": sid, "role": "host",
		"exp": time.Now().Add(60 * time.Second).Unix(),
	}
	tok, err := jwt.NewWithClaims(jwt.SigningMethodHS256, claims).SignedString([]byte(a.cfg.JWTSecret))
	if err != nil {
		serverError(c, err)
		return
	}
	c.JSON(200, gin.H{"ticket": tok})
}

func (a *App) verifyTicket(raw string) (string, error) {
	claims := jwt.MapClaims{}
	tok, err := jwt.ParseWithClaims(raw, claims, func(t *jwt.Token) (any, error) {
		return []byte(a.cfg.JWTSecret), nil
	}, jwt.WithValidMethods([]string{"HS256"}))
	if err != nil || !tok.Valid {
		return "", errors.New("tiket tidak valid")
	}
	sid, _ := claims["sid"].(string)
	role, _ := claims["role"].(string)
	if role != "host" || sid == "" {
		return "", errors.New("tiket tidak valid")
	}
	return sid, nil
}

func (a *App) lookupPlayer(ctx context.Context, code, token string) (sid, pid, nick string, err error) {
	if code == "" || token == "" {
		return "", "", "", errors.New("data kurang")
	}
	err = a.db.QueryRow(ctx, `
		SELECT s.id::text, p.id::text, p.nickname
		FROM participants p
		JOIN game_sessions s ON s.id = p.session_id
		WHERE s.game_code = $1 AND p.token = $2
		ORDER BY s.created_at DESC LIMIT 1`, code, token).Scan(&sid, &pid, &nick)
	return
}

/* ---------- Endpoint WebSocket ---------- */

type hello struct {
	T      string `json:"t"`
	Ticket string `json:"ticket"` // host
	Code   string `json:"code"`   // peserta
	Token  string `json:"token"`  // peserta
}

// GET /ws
func (a *App) wsHandler(c *gin.Context) {
	up := websocket.Upgrader{
		ReadBufferSize:  1024,
		WriteBufferSize: 1024,
		CheckOrigin: func(r *http.Request) bool {
			o := r.Header.Get("Origin")
			return o == "" || o == a.cfg.FrontendURL
		},
	}
	ws, err := up.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		return // Upgrade sudah membalas error ke klien
	}
	ws.SetReadLimit(maxMsgBytes)

	// Pesan pertama wajib "hello". Token tidak lewat URL supaya tidak tercatat di log.
	_ = ws.SetReadDeadline(time.Now().Add(helloTimeout))
	_, raw, err := ws.ReadMessage()
	if err != nil {
		_ = ws.Close()
		return
	}
	var h hello
	if json.Unmarshal(raw, &h) != nil || h.T != "hello" {
		wsFail(ws, "pesan pertama harus hello")
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	var sid, role, pid, nick string
	if h.Ticket != "" {
		role = "host"
		sid, err = a.verifyTicket(h.Ticket)
	} else {
		role = "player"
		sid, pid, nick, err = a.lookupPlayer(ctx, normCode(h.Code), h.Token)
	}
	if err != nil {
		wsFail(ws, "tidak diizinkan")
		return
	}

	conn := &Conn{ws: ws, send: make(chan []byte, 32), role: role, pid: pid}
	for try := 0; try < 2; try++ {
		e, err := a.engineFor(ctx, sid)
		if err != nil {
			wsFail(ws, err.Error())
			return
		}
		select {
		case e.join <- enterReq{c: conn, nick: nick}:
			go conn.writePump()
			conn.readPump(e) // berjalan sampai koneksi putus
			return
		case <-e.done:
			// engine baru saja berhenti; coba ambil yang baru
		}
	}
	wsFail(ws, "server sibuk, coba lagi")
}
