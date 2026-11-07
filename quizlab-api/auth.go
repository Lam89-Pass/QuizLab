package main

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/oauth2"
	"golang.org/x/oauth2/github"
	"golang.org/x/oauth2/google"
)

const sessionCookie = "quizlab_session"

type profile struct {
	ID, Name, Email, Avatar string
}

func randomHex(n int) string {
	b := make([]byte, n)
	_, _ = rand.Read(b)
	return hex.EncodeToString(b)
}

// Callback OAuth diarahkan lewat origin frontend (/api/... di-rewrite ke Go),
// jadi redirect URI yang didaftarkan: FRONTEND_URL + /api/auth/callback/<provider>
func (a *App) initOAuth() {
	a.oauth = map[string]*oauth2.Config{}
	base := a.cfg.FrontendURL + "/api/auth/callback/"

	if a.cfg.GoogleID != "" {
		a.oauth["google"] = &oauth2.Config{
			ClientID:     a.cfg.GoogleID,
			ClientSecret: a.cfg.GoogleSecret,
			RedirectURL:  base + "google",
			Scopes:       []string{"openid", "profile", "email"},
			Endpoint:     google.Endpoint,
		}
	}
	if a.cfg.GithubID != "" {
		a.oauth["github"] = &oauth2.Config{
			ClientID:     a.cfg.GithubID,
			ClientSecret: a.cfg.GithubSecret,
			RedirectURL:  base + "github",
			Scopes:       []string{"read:user"},
			Endpoint:     github.Endpoint,
		}
	}
}

func (a *App) oauthLogin(c *gin.Context) {
	cfg, ok := a.oauth[c.Param("provider")]
	if !ok {
		c.JSON(404, gin.H{"error": "provider belum dikonfigurasi"})
		return
	}
	state := randomHex(16)
	c.SetSameSite(http.SameSiteLaxMode)
	c.SetCookie("oauth_state", state, 600, "/", "", a.cfg.CookieSecure, true)
	c.Redirect(http.StatusTemporaryRedirect, cfg.AuthCodeURL(state))
}

func (a *App) loginFailed(c *gin.Context, reason string) {
	c.Redirect(http.StatusFound, a.cfg.FrontendURL+"/login?error="+reason)
}

func (a *App) oauthCallback(c *gin.Context) {
	provider := c.Param("provider")
	cfg, ok := a.oauth[provider]
	if !ok {
		c.JSON(404, gin.H{"error": "provider belum dikonfigurasi"})
		return
	}

	saved, err := c.Cookie("oauth_state")
	if err != nil || saved == "" || saved != c.Query("state") {
		a.loginFailed(c, "state_tidak_valid")
		return
	}
	c.SetCookie("oauth_state", "", -1, "/", "", a.cfg.CookieSecure, true)

	if c.Query("error") != "" || c.Query("code") == "" {
		a.loginFailed(c, "login_dibatalkan")
		return
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), 15*time.Second)
	defer cancel()

	tok, err := cfg.Exchange(ctx, c.Query("code"))
	if err != nil {
		log.Printf("oauth exchange (%s): %v", provider, err)
		a.loginFailed(c, "gagal_tukar_kode")
		return
	}
	p, err := fetchProfile(ctx, cfg, provider, tok)
	if err != nil {
		log.Printf("oauth profile (%s): %v", provider, err)
		a.loginFailed(c, "gagal_ambil_profil")
		return
	}
	userID, err := a.upsertUser(ctx, provider, p)
	if err != nil {
		log.Printf("upsert user: %v", err)
		a.loginFailed(c, "gagal_simpan_user")
		return
	}
	if err := a.setSession(c, userID); err != nil {
		log.Printf("set session: %v", err)
		a.loginFailed(c, "gagal_simpan_user")
		return
	}
	c.Redirect(http.StatusFound, a.cfg.FrontendURL+"/dashboard")
}

func fetchProfile(ctx context.Context, cfg *oauth2.Config, provider string, tok *oauth2.Token) (profile, error) {
	endpoint := "https://openidconnect.googleapis.com/v1/userinfo"
	if provider == "github" {
		endpoint = "https://api.github.com/user"
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, endpoint, nil)
	if err != nil {
		return profile{}, err
	}
	req.Header.Set("Accept", "application/json")

	resp, err := cfg.Client(ctx, tok).Do(req)
	if err != nil {
		return profile{}, err
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return profile{}, fmt.Errorf("userinfo status %d", resp.StatusCode)
	}

	if provider == "github" {
		var u struct {
			ID        int64  `json:"id"`
			Login     string `json:"login"`
			Name      string `json:"name"`
			Email     string `json:"email"`
			AvatarURL string `json:"avatar_url"`
		}
		if err := json.NewDecoder(resp.Body).Decode(&u); err != nil {
			return profile{}, err
		}
		if u.ID == 0 {
			return profile{}, fmt.Errorf("github: id kosong")
		}
		name := u.Name
		if name == "" {
			name = u.Login
		}
		return profile{ID: strconv.FormatInt(u.ID, 10), Name: name, Email: u.Email, Avatar: u.AvatarURL}, nil
	}

	var u struct {
		Sub     string `json:"sub"`
		Name    string `json:"name"`
		Email   string `json:"email"`
		Picture string `json:"picture"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&u); err != nil {
		return profile{}, err
	}
	if u.Sub == "" {
		return profile{}, fmt.Errorf("google: sub kosong")
	}
	name := u.Name
	if name == "" {
		name = u.Email
	}
	return profile{ID: u.Sub, Name: name, Email: u.Email, Avatar: u.Picture}, nil
}

func (a *App) upsertUser(ctx context.Context, provider string, p profile) (string, error) {
	var id string
	err := a.db.QueryRow(ctx, `
		INSERT INTO users (name, email, avatar_url, provider, provider_user_id)
		VALUES ($1, $2, $3, $4, $5)
		ON CONFLICT (provider, provider_user_id)
		DO UPDATE SET name = EXCLUDED.name, email = EXCLUDED.email, avatar_url = EXCLUDED.avatar_url
		RETURNING id::text`,
		p.Name, p.Email, p.Avatar, provider, p.ID).Scan(&id)
	return id, err
}

func (a *App) setSession(c *gin.Context, userID string) error {
	now := time.Now()
	claims := jwt.RegisteredClaims{
		Subject:   userID,
		IssuedAt:  jwt.NewNumericDate(now),
		ExpiresAt: jwt.NewNumericDate(now.Add(7 * 24 * time.Hour)),
	}
	token, err := jwt.NewWithClaims(jwt.SigningMethodHS256, claims).SignedString([]byte(a.cfg.JWTSecret))
	if err != nil {
		return err
	}
	c.SetSameSite(http.SameSiteLaxMode)
	c.SetCookie(sessionCookie, token, 7*24*3600, "/", "", a.cfg.CookieSecure, true)
	return nil
}

// requireAuth melindungi endpoint pengelolaan kuis (PRD 7.2).
func (a *App) requireAuth(c *gin.Context) {
	raw, err := c.Cookie(sessionCookie)
	if err != nil {
		c.AbortWithStatusJSON(401, gin.H{"error": "belum login"})
		return
	}
	claims := &jwt.RegisteredClaims{}
	tok, err := jwt.ParseWithClaims(raw, claims, func(t *jwt.Token) (any, error) {
		return []byte(a.cfg.JWTSecret), nil
	}, jwt.WithValidMethods([]string{"HS256"}))
	if err != nil || !tok.Valid || claims.Subject == "" {
		c.AbortWithStatusJSON(401, gin.H{"error": "sesi tidak valid, silakan login lagi"})
		return
	}
	c.Set("uid", claims.Subject)
	c.Next()
}

func (a *App) me(c *gin.Context) {
	var u struct{ ID, Name, Email, Avatar, Provider string }
	err := a.db.QueryRow(c.Request.Context(), `
		SELECT id::text, name, email, avatar_url, provider
		FROM users WHERE id = $1::uuid`, uid(c)).
		Scan(&u.ID, &u.Name, &u.Email, &u.Avatar, &u.Provider)
	if err != nil {
		c.JSON(401, gin.H{"error": "user tidak ditemukan"})
		return
	}
	c.JSON(200, gin.H{
		"id": u.ID, "name": u.Name, "email": u.Email,
		"avatarUrl": u.Avatar, "provider": u.Provider,
	})
}

func (a *App) logout(c *gin.Context) {
	c.SetSameSite(http.SameSiteLaxMode)
	c.SetCookie(sessionCookie, "", -1, "/", "", a.cfg.CookieSecure, true)
	c.JSON(200, gin.H{"ok": true})
}

// devLogin hanya terdaftar kalau DEV_LOGIN=true. Jangan aktifkan di production.
func (a *App) devLogin(c *gin.Context) {
	id, err := a.upsertUser(c.Request.Context(), "dev", profile{ID: "dev-1", Name: "Bu Rina (dev)"})
	if err != nil {
		serverError(c, err)
		return
	}
	if err := a.setSession(c, id); err != nil {
		serverError(c, err)
		return
	}
	c.JSON(200, gin.H{"ok": true})
}
