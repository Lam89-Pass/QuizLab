package main

import (
	"context"
	"log"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/joho/godotenv"
	"golang.org/x/oauth2"
)

type App struct {
	cfg   Config
	db    *pgxpool.Pool
	oauth map[string]*oauth2.Config
}

func main() {
	_ = godotenv.Load()
	cfg := loadConfig()

	pool, err := connectDB(context.Background(), cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("database: %v", err)
	}
	defer pool.Close()

	app := &App{cfg: cfg, db: pool}
	app.initOAuth()

	r := gin.Default()
	_ = r.SetTrustedProxies(nil)

	api := r.Group("/api")
	api.GET("/health", func(c *gin.Context) { c.JSON(200, gin.H{"ok": true}) })

	api.GET("/auth/login/:provider", app.oauthLogin)
	api.GET("/auth/callback/:provider", app.oauthCallback)
	api.POST("/auth/logout", app.logout)
	if cfg.DevLogin {
		log.Println("PERINGATAN: DEV_LOGIN aktif. Matikan di production.")
		api.POST("/auth/dev-login", app.devLogin)
	}

	authed := api.Group("", app.requireAuth)
	authed.GET("/me", app.me)
	authed.GET("/quizzes", app.listQuizzes)
	authed.POST("/quizzes", app.createQuiz)
	authed.POST("/ai/generate", app.generateAIQuiz)
	authed.POST("/ai/generate-from-file", app.generateAIQuizFromFile)
	authed.GET("/quizzes/:id", app.getQuiz)
	authed.PUT("/quizzes/:id", app.updateQuiz)
	authed.DELETE("/quizzes/:id", app.deleteQuiz)
	authed.POST("/quizzes/:id/sessions", app.createSession)
	authed.PATCH("/sessions/:code/status", app.updateSessionStatus)
	authed.PATCH("/sessions/:code/state", app.updateGameState)

	api.GET("/sessions/:code", app.getSession)
	api.GET("/sessions/:code/state", app.getGameState)
	api.POST("/sessions/:code/join", app.joinSession)
	api.POST("/sessions/:code/answer", app.submitAnswer)

	log.Printf("QuizLab API jalan di :%s", cfg.Port)
	if err := r.Run(":" + cfg.Port); err != nil {
		log.Fatal(err)
	}
}
