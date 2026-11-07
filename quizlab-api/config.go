package main

import (
	"log"
	"os"
)

type Config struct {
	Port         string
	DatabaseURL  string
	JWTSecret    string
	FrontendURL  string
	CookieSecure bool
	DevLogin     bool

	GoogleID     string
	GoogleSecret string
	GithubID     string
	GithubSecret string
}

func env(key, def string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return def
}

func loadConfig() Config {
	c := Config{
		Port:         env("PORT", "8080"),
		DatabaseURL:  os.Getenv("DATABASE_URL"),
		JWTSecret:    os.Getenv("JWT_SECRET"),
		FrontendURL:  env("FRONTEND_URL", "http://localhost:3000"),
		CookieSecure: os.Getenv("COOKIE_SECURE") == "true",
		DevLogin:     os.Getenv("DEV_LOGIN") == "true",
		GoogleID:     os.Getenv("GOOGLE_CLIENT_ID"),
		GoogleSecret: os.Getenv("GOOGLE_CLIENT_SECRET"),
		GithubID:     os.Getenv("GITHUB_CLIENT_ID"),
		GithubSecret: os.Getenv("GITHUB_CLIENT_SECRET"),
	}
	if c.DatabaseURL == "" {
		log.Fatal("DATABASE_URL wajib diisi di .env")
	}
	if len(c.JWTSecret) < 16 {
		log.Fatal("JWT_SECRET wajib diisi (minimal 16 karakter)")
	}
	return c
}