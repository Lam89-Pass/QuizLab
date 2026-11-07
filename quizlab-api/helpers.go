package main

import (
	"errors"
	"log"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgconn"
)

func uid(c *gin.Context) string { return c.GetString("uid") }

func serverError(c *gin.Context, err error) {
	log.Printf("error: %v", err)
	c.JSON(500, gin.H{"error": "terjadi kesalahan server"})
}

func validUUID(s string) bool {
	_, err := uuid.Parse(s)
	return err == nil
}

func isUniqueViolation(err error) bool {
	var pgErr *pgconn.PgError
	return errors.As(err, &pgErr) && pgErr.Code == "23505"
}
