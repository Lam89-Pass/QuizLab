package main

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5"
)

type QuestionDTO struct {
	ID       string   `json:"id"`
	Text     string   `json:"text"`
	Type     string   `json:"type"` // "mc" | "tf"
	Options  []string `json:"options"`
	Correct  int      `json:"correct"`
	Duration int      `json:"duration"`
}

type QuizDTO struct {
	ID          string        `json:"id"`
	Title       string        `json:"title"`
	Description string        `json:"description"`
	Questions   []QuestionDTO `json:"questions"`
	UpdatedAt   int64         `json:"updatedAt"`
}

// validate merapikan input dan mengembalikan pesan error ("" kalau valid).
func (q *QuizDTO) validate() string {
	q.Title = strings.TrimSpace(q.Title)
	q.Description = strings.TrimSpace(q.Description)
	if q.Title == "" || len([]rune(q.Title)) > 60 {
		return "judul kuis wajib diisi (maks 60 karakter)"
	}
	if len([]rune(q.Description)) > 160 {
		return "deskripsi maksimal 160 karakter"
	}
	if len(q.Questions) == 0 || len(q.Questions) > 100 {
		return "kuis harus punya 1 sampai 100 pertanyaan"
	}
	for i := range q.Questions {
		s := &q.Questions[i]
		n := i + 1
		s.Text = strings.TrimSpace(s.Text)
		if s.Text == "" || len([]rune(s.Text)) > 300 {
			return fmt.Sprintf("soal %d: teks pertanyaan kosong atau terlalu panjang", n)
		}
		switch s.Type {
		case "tf":
			s.Options = []string{"Benar", "Salah"}
		case "mc":
			if len(s.Options) < 2 || len(s.Options) > 4 {
				return fmt.Sprintf("soal %d: pilihan ganda harus punya 2 sampai 4 jawaban", n)
			}
		default:
			return fmt.Sprintf("soal %d: tipe pertanyaan tidak dikenal", n)
		}
		for j := range s.Options {
			s.Options[j] = strings.TrimSpace(s.Options[j])
			if s.Options[j] == "" || len([]rune(s.Options[j])) > 100 {
				return fmt.Sprintf("soal %d: ada pilihan jawaban yang kosong atau terlalu panjang", n)
			}
		}
		if s.Correct < 0 || s.Correct >= len(s.Options) {
			return fmt.Sprintf("soal %d: jawaban benar belum dipilih", n)
		}
		if s.Duration < 5 || s.Duration > 120 {
			return fmt.Sprintf("soal %d: durasi harus 5 sampai 120 detik", n)
		}
	}
	return ""
}

func insertQuestions(ctx context.Context, tx pgx.Tx, quizID string, qs []QuestionDTO) error {
	for i, q := range qs {
		var qid string
		err := tx.QueryRow(ctx, `
			INSERT INTO questions (quiz_id, question_text, qtype, duration, order_number)
			VALUES ($1::uuid, $2, $3, $4, $5) RETURNING id::text`,
			quizID, q.Text, q.Type, q.Duration, i).Scan(&qid)
		if err != nil {
			return err
		}
		for j, opt := range q.Options {
			if _, err := tx.Exec(ctx, `
				INSERT INTO answers (question_id, answer_text, is_correct, order_number)
				VALUES ($1::uuid, $2, $3, $4)`,
				qid, opt, j == q.Correct, j); err != nil {
				return err
			}
		}
	}
	return nil
}

// loadQuiz mengambil satu kuis lengkap milik userID.
func (a *App) loadQuiz(ctx context.Context, quizID, userID string) (*QuizDTO, error) {
	q := &QuizDTO{Questions: []QuestionDTO{}}
	var updated time.Time
	err := a.db.QueryRow(ctx, `
		SELECT id::text, title, description, updated_at
		FROM quizzes WHERE id = $1::uuid AND user_id = $2::uuid`,
		quizID, userID).Scan(&q.ID, &q.Title, &q.Description, &updated)
	if err != nil {
		return nil, err
	}
	q.UpdatedAt = updated.UnixMilli()

	rows, err := a.db.Query(ctx, `
		SELECT q.id::text, q.question_text, q.qtype, q.duration, a.answer_text, a.is_correct
		FROM questions q
		JOIN answers a ON a.question_id = q.id
		WHERE q.quiz_id = $1::uuid
		ORDER BY q.order_number, a.order_number`, quizID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	index := map[string]int{}
	for rows.Next() {
		var qid, text, qtype, atext string
		var dur int
		var correct bool
		if err := rows.Scan(&qid, &text, &qtype, &dur, &atext, &correct); err != nil {
			return nil, err
		}
		i, ok := index[qid]
		if !ok {
			q.Questions = append(q.Questions, QuestionDTO{
				ID: qid, Text: text, Type: qtype, Duration: dur, Options: []string{},
			})
			i = len(q.Questions) - 1
			index[qid] = i
		}
		if correct {
			q.Questions[i].Correct = len(q.Questions[i].Options)
		}
		q.Questions[i].Options = append(q.Questions[i].Options, atext)
	}
	return q, rows.Err()
}

func (a *App) listQuizzes(c *gin.Context) {
	rows, err := a.db.Query(c.Request.Context(), `
		SELECT q.id::text, q.title, q.description, q.updated_at,
		       (SELECT count(*) FROM questions WHERE quiz_id = q.id)
		FROM quizzes q
		WHERE q.user_id = $1::uuid
		ORDER BY q.updated_at DESC`, uid(c))
	if err != nil {
		serverError(c, err)
		return
	}
	defer rows.Close()

	type item struct {
		ID            string `json:"id"`
		Title         string `json:"title"`
		Description   string `json:"description"`
		UpdatedAt     int64  `json:"updatedAt"`
		QuestionCount int    `json:"questionCount"`
	}
	out := []item{}
	for rows.Next() {
		var it item
		var t time.Time
		if err := rows.Scan(&it.ID, &it.Title, &it.Description, &t, &it.QuestionCount); err != nil {
			serverError(c, err)
			return
		}
		it.UpdatedAt = t.UnixMilli()
		out = append(out, it)
	}
	if err := rows.Err(); err != nil {
		serverError(c, err)
		return
	}
	c.JSON(200, out)
}

func (a *App) getQuiz(c *gin.Context) {
	id := c.Param("id")
	if !validUUID(id) {
		c.JSON(404, gin.H{"error": "kuis tidak ditemukan"})
		return
	}
	q, err := a.loadQuiz(c.Request.Context(), id, uid(c))
	if errors.Is(err, pgx.ErrNoRows) {
		c.JSON(404, gin.H{"error": "kuis tidak ditemukan"})
		return
	}
	if err != nil {
		serverError(c, err)
		return
	}
	c.JSON(200, q)
}

func (a *App) createQuiz(c *gin.Context) {
	var in QuizDTO
	if err := c.ShouldBindJSON(&in); err != nil {
		c.JSON(400, gin.H{"error": "format JSON tidak valid"})
		return
	}
	if msg := in.validate(); msg != "" {
		c.JSON(400, gin.H{"error": msg})
		return
	}

	ctx := c.Request.Context()
	tx, err := a.db.Begin(ctx)
	if err != nil {
		serverError(c, err)
		return
	}
	defer tx.Rollback(ctx)

	var id string
	err = tx.QueryRow(ctx, `
		INSERT INTO quizzes (user_id, title, description)
		VALUES ($1::uuid, $2, $3) RETURNING id::text`,
		uid(c), in.Title, in.Description).Scan(&id)
	if err != nil {
		serverError(c, err)
		return
	}
	if err := insertQuestions(ctx, tx, id, in.Questions); err != nil {
		serverError(c, err)
		return
	}
	if err := tx.Commit(ctx); err != nil {
		serverError(c, err)
		return
	}
	out, err := a.loadQuiz(ctx, id, uid(c))
	if err != nil {
		serverError(c, err)
		return
	}
	c.JSON(201, out)
}

// updateQuiz mengganti seluruh isi kuis (judul, deskripsi, semua soal).
func (a *App) updateQuiz(c *gin.Context) {
	id := c.Param("id")
	if !validUUID(id) {
		c.JSON(404, gin.H{"error": "kuis tidak ditemukan"})
		return
	}
	var in QuizDTO
	if err := c.ShouldBindJSON(&in); err != nil {
		c.JSON(400, gin.H{"error": "format JSON tidak valid"})
		return
	}
	if msg := in.validate(); msg != "" {
		c.JSON(400, gin.H{"error": msg})
		return
	}

	ctx := c.Request.Context()
	tx, err := a.db.Begin(ctx)
	if err != nil {
		serverError(c, err)
		return
	}
	defer tx.Rollback(ctx)

	tag, err := tx.Exec(ctx, `
		UPDATE quizzes SET title = $1, description = $2, updated_at = now()
		WHERE id = $3::uuid AND user_id = $4::uuid`,
		in.Title, in.Description, id, uid(c))
	if err != nil {
		serverError(c, err)
		return
	}
	if tag.RowsAffected() == 0 {
		c.JSON(404, gin.H{"error": "kuis tidak ditemukan"})
		return
	}
	if _, err := tx.Exec(ctx, `DELETE FROM questions WHERE quiz_id = $1::uuid`, id); err != nil {
		serverError(c, err)
		return
	}
	if err := insertQuestions(ctx, tx, id, in.Questions); err != nil {
		serverError(c, err)
		return
	}
	if err := tx.Commit(ctx); err != nil {
		serverError(c, err)
		return
	}
	out, err := a.loadQuiz(ctx, id, uid(c))
	if err != nil {
		serverError(c, err)
		return
	}
	c.JSON(200, out)
}

func (a *App) deleteQuiz(c *gin.Context) {
	id := c.Param("id")
	if !validUUID(id) {
		c.JSON(404, gin.H{"error": "kuis tidak ditemukan"})
		return
	}
	tag, err := a.db.Exec(c.Request.Context(), `
		DELETE FROM quizzes WHERE id = $1::uuid AND user_id = $2::uuid`, id, uid(c))
	if err != nil {
		serverError(c, err)
		return
	}
	if tag.RowsAffected() == 0 {
		c.JSON(404, gin.H{"error": "kuis tidak ditemukan"})
		return
	}
	c.Status(204)
}
