package main

import (
	"context"
	"encoding/json"
	"log"
	"net/http"
	"os"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/joho/godotenv"

	"peekpanel/handlers"
	"peekpanel/middleware"
)

func main() {
	// Load .env jika tersedia (untuk development lokal)
	_ = godotenv.Load()
	

	// Database connection
	databaseURL := os.Getenv("DATABASE_URL")

	if databaseURL == "" {
		log.Fatal("DATABASE_URL tidak ditemukan")
	}

	pool, err := pgxpool.New(context.Background(), databaseURL)

	if err != nil {
		log.Fatal("Gagal membuat connection pool:", err)
	}

	defer pool.Close()

	if err := pool.Ping(context.Background()); err != nil {
		log.Fatal("Database tidak merespons:", err)
	}

	log.Println("✅ Berhasil terhubung ke Neon PostgreSQL!")

	// API routes
	http.HandleFunc("/api/health", healthHandler)
	http.HandleFunc("/api/auth/register", handlers.Register(pool))
	http.HandleFunc("/api/auth/login", handlers.Login(pool))
	http.HandleFunc("/api/me", middleware.Auth(handlers.Me(pool)))
	http.HandleFunc("/api/peeks", middleware.Auth(handlers.Peeks(pool)))
	http.HandleFunc("/api/peeks/{id}", middleware.Auth(handlers.Peeks(pool)))
	http.HandleFunc("/api/categories", middleware.Auth(handlers.GetCategories(pool)))

	//log.Println("🚀 PeekPanel API running on http://localhost:8080")

	//log.Fatal(http.ListenAndServe(":8080", withCORS(http.DefaultServeMux)))
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	log.Println("🚀 PeekPanel API running on port " + port)

	log.Fatal(http.ListenAndServe(":"+port, withCORS(http.DefaultServeMux)))
}

func healthHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	w.Header().Set("Content-Type", "application/json")

	response := map[string]string{
		"status":  "ok",
		"message": "PeekPanel API is running",
	}

	json.NewEncoder(w).Encode(response)
}

func withCORS(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		origin := r.Header.Get("Origin")

		if origin == "http://localhost:4200" ||
			origin == "https://peek-panel.vercel.app" {
			w.Header().Set("Access-Control-Allow-Origin", origin)
		}

		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")

		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}

		next.ServeHTTP(w, r)
	})
}