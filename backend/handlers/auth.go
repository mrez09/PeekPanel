package handlers

import (
	"context"
	"encoding/json"
	"log"
	"net/http"
	"strings"
	"os"
	"time"

	"github.com/jackc/pgx/v5"
	"golang.org/x/crypto/bcrypt"
	"peekpanel/models"
	"github.com/golang-jwt/jwt/v5"
)


type RegisterRequest struct {
	Name     string `json:"name"`
	Email    string `json:"email"`
	Password string `json:"password"`
}

func Register(conn *pgx.Conn) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
			return
		}

		var request RegisterRequest

		err := json.NewDecoder(r.Body).Decode(&request)
		if err != nil {
			http.Error(w, "Invalid request body", http.StatusBadRequest)
			return
		}

		request.Name = strings.TrimSpace(request.Name)
		request.Email = strings.TrimSpace(strings.ToLower(request.Email))

		if request.Name == "" || request.Email == "" || request.Password == "" {
			http.Error(w, "Name, email, and password are required", http.StatusBadRequest)
			return
		}

		if len(request.Password) < 8 {
			http.Error(w, "Password must be at least 8 characters", http.StatusBadRequest)
			return
		}

		hashedPassword, err := bcrypt.GenerateFromPassword(
			[]byte(request.Password),
			bcrypt.DefaultCost,
		)
		if err != nil {
			log.Println("Gagal melakukan hashing password:", err)
			http.Error(w, "Internal server error", http.StatusInternalServerError)
			return
		}

		var userID int64

		err = conn.QueryRow(
			context.Background(),
			`INSERT INTO users (name, email, password)
			 VALUES ($1, $2, $3)
			 RETURNING id`,
			request.Name,
			request.Email,
			string(hashedPassword),
		).Scan(&userID)

		if err != nil {
			if strings.Contains(err.Error(), "duplicate key") {
				http.Error(w, "Email already registered", http.StatusConflict)
				return
			}

			log.Println("Gagal membuat user:", err)
			http.Error(w, "Internal server error", http.StatusInternalServerError)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusCreated)

		response := map[string]interface{}{
			"message": "User registered successfully",
			"user": map[string]interface{}{
				"id":    userID,
				"name":  request.Name,
				"email": request.Email,
			},
		}

		json.NewEncoder(w).Encode(response)
	}
}

type LoginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}


func Login(conn *pgx.Conn) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
			return
		}

		var request LoginRequest

		err := json.NewDecoder(r.Body).Decode(&request)
		if err != nil {
			http.Error(w, "Invalid request body", http.StatusBadRequest)
			return
		}

		request.Email = strings.TrimSpace(strings.ToLower(request.Email))

		if request.Email == "" || request.Password == "" {
			http.Error(w, "Email and password are required", http.StatusBadRequest)
			return
		}

		var (
			userID       int64
			name         string
			email        string
			passwordHash string
		)

		err = conn.QueryRow(
			context.Background(),
			`SELECT id, name, email, password
			 FROM users
			 WHERE email = $1`,
			request.Email,
		).Scan(
			&userID,
			&name,
			&email,
			&passwordHash,
		)

		if err != nil {
			if err == pgx.ErrNoRows {
				http.Error(w, "Invalid email or password", http.StatusUnauthorized)
				return
			}

			log.Println("Gagal mencari user:", err)
			http.Error(w, "Internal server error", http.StatusInternalServerError)
			return
		}

		jwtSecret := os.Getenv("JWT_SECRET")

		if jwtSecret == "" {
			http.Error(w, `{"message":"JWT secret is not configured"}`, http.StatusInternalServerError)
			return
		}

		claims := models.Claims{
			UserID: userID,
			Email:  email,
			RegisteredClaims: jwt.RegisteredClaims{
				ExpiresAt: jwt.NewNumericDate(time.Now().Add(24 * time.Hour)),
				IssuedAt:  jwt.NewNumericDate(time.Now()),
			},
		}

		token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)

		tokenString, err := token.SignedString([]byte(jwtSecret))
		if err != nil {
			http.Error(w, `{"message":"Failed to create token"}`, http.StatusInternalServerError)
			return
		}

		err = bcrypt.CompareHashAndPassword(
			[]byte(passwordHash),
			[]byte(request.Password),
		)

		if err != nil {
			http.Error(w, `{"message":"Invalid email or password"}`, http.StatusUnauthorized)
			return
		}


		// Untuk sementara kita belum membuat JWT.
		// Kita pastikan login + pengecekan password bekerja dulu.

		w.Header().Set("Content-Type", "application/json")

		response := map[string]interface{}{
			"message": "Login successful",
			"token":   tokenString,
			"user": map[string]interface{}{
				"id":    userID,
				"name":  name,
				"email": email,
			},
		}

		json.NewEncoder(w).Encode(response)
	}
}

func Me(conn *pgx.Conn) http.HandlerFunc {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        userID := r.Context().Value("userID")

        var name string
        var email string

        err := conn.QueryRow(
            r.Context(),
            "SELECT name, email FROM users WHERE id = $1",
            userID,
        ).Scan(&name, &email)

        if err != nil {
            http.Error(w, `{"message":"User not found"}`, http.StatusNotFound)
            return
        }

        response := map[string]interface{}{
            "id":    userID,
            "name":  name,
            "email": email,
        }

        w.Header().Set("Content-Type", "application/json")
        json.NewEncoder(w).Encode(response)
    })
}