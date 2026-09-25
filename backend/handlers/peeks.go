package handlers

import (
	"encoding/json"
	"net/http"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

func GetPeeks(pool *pgxpool.Pool) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		userID := r.Context().Value("userID")

		rows, err := pool.Query(
			r.Context(),
			`
			SELECT
				p.id,
				p.title,
				p.content,
				p.category_id,
				c.name AS category_name,
				p.created_at,
				p.updated_at
			FROM peeks p
			JOIN categories c ON c.id = p.category_id
			WHERE p.user_id = $1
			ORDER BY p.created_at DESC
			`,
			userID,
		)

		if err != nil {
			http.Error(w, `{"message":"Failed to get peeks"}`, http.StatusInternalServerError)
			return
		}
		defer rows.Close()

		type PeekResponse struct {
			ID           int64     `json:"id"`
			Title        string    `json:"title"`
			Content      string    `json:"content"`
			CategoryID   int64     `json:"category_id"`
			CategoryName string    `json:"category_name"`
			CreatedAt    time.Time `json:"created_at"`
			UpdatedAt    time.Time `json:"updated_at"`
		}

		peeks := []PeekResponse{}

		for rows.Next() {
			var peek PeekResponse

			err := rows.Scan(
				&peek.ID,
				&peek.Title,
				&peek.Content,
				&peek.CategoryID,
				&peek.CategoryName,
				&peek.CreatedAt,
				&peek.UpdatedAt,
			)

			if err != nil {
				http.Error(w, `{"message":"Failed to read peeks"}`, http.StatusInternalServerError)
				return
			}

			peeks = append(peeks, peek)
		}

		if err := rows.Err(); err != nil {
			http.Error(w, `{"message":"Failed to read peeks"}`, http.StatusInternalServerError)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(peeks)
	}
}

func GetPeek(pool *pgxpool.Pool) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		userID := r.Context().Value("userID")
		peekID := r.PathValue("id")

		type PeekResponse struct {
			ID           int64     `json:"id"`
			Title        string    `json:"title"`
			Content      string    `json:"content"`
			CategoryID   int64     `json:"category_id"`
			CategoryName string    `json:"category_name"`
			CreatedAt    time.Time `json:"created_at"`
			UpdatedAt    time.Time `json:"updated_at"`
		}

		var peek PeekResponse

		err := pool.QueryRow(
			r.Context(),
			`
			SELECT
				p.id,
				p.title,
				p.content,
				p.category_id,
				c.name AS category_name,
				p.created_at,
				p.updated_at
			FROM peeks p
			JOIN categories c ON c.id = p.category_id
			WHERE p.id = $1 AND p.user_id = $2
			`,
			peekID,
			userID,
		).Scan(
			&peek.ID,
			&peek.Title,
			&peek.Content,
			&peek.CategoryID,
			&peek.CategoryName,
			&peek.CreatedAt,
			&peek.UpdatedAt,
		)

		if err != nil {
			http.Error(w, `{"message":"Peek not found"}`, http.StatusNotFound)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(peek)
	}
}

func CreatePeek(pool *pgxpool.Pool) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		userID := r.Context().Value("userID")

		type CreatePeekRequest struct {
			Title      string `json:"title"`
			Content    string `json:"content"`
			CategoryID int64  `json:"category_id"`
		}

		var request CreatePeekRequest

		err := json.NewDecoder(r.Body).Decode(&request)
		if err != nil {
			http.Error(w, `{"message":"Invalid request body"}`, http.StatusBadRequest)
			return
		}

		if request.Title == "" || request.Content == "" || request.CategoryID == 0 {
			http.Error(w, `{"message":"Title, content, and category_id are required"}`, http.StatusBadRequest)
			return
		}

		var peekID int64

		err = pool.QueryRow(
			r.Context(),
			`
			INSERT INTO peeks (user_id, category_id, title, content)
			VALUES ($1, $2, $3, $4)
			RETURNING id
			`,
			userID,
			request.CategoryID,
			request.Title,
			request.Content,
		).Scan(&peekID)

		if err != nil {
			http.Error(w, `{"message":"Failed to create peek"}`, http.StatusInternalServerError)
			return
		}

		response := map[string]interface{}{
			"message": "Peek created successfully",
			"id":      peekID,
		}

		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusCreated)
		json.NewEncoder(w).Encode(response)
	}
}

func Peeks(pool *pgxpool.Pool) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		switch r.Method {
		case http.MethodGet:
			if r.PathValue("id") != "" {
				GetPeek(pool)(w, r)
				return
			}

			GetPeeks(pool)(w, r)

		case http.MethodPost:
			CreatePeek(pool)(w, r)

		case http.MethodPut:
			UpdatePeek(pool)(w, r)

		case http.MethodDelete:
			DeletePeek(pool)(w, r)

		default:
			http.Error(w, `{"message":"Method not allowed"}`, http.StatusMethodNotAllowed)
		}
	}
}

func UpdatePeek(pool *pgxpool.Pool) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		userID := r.Context().Value("userID")

		peekID := r.PathValue("id")

		type UpdatePeekRequest struct {
			Title      string `json:"title"`
			Content    string `json:"content"`
			CategoryID int64  `json:"category_id"`
		}

		var request UpdatePeekRequest

		err := json.NewDecoder(r.Body).Decode(&request)
		if err != nil {
			http.Error(w, `{"message":"Invalid request body"}`, http.StatusBadRequest)
			return
		}

		if request.Title == "" || request.Content == "" || request.CategoryID == 0 {
			http.Error(w, `{"message":"Title, content, and category_id are required"}`, http.StatusBadRequest)
			return
		}

		result, err := pool.Exec(
			r.Context(),
			`
			UPDATE peeks
			SET
				title = $1,
				content = $2,
				category_id = $3,
				updated_at = NOW()
			WHERE id = $4 AND user_id = $5
			`,
			request.Title,
			request.Content,
			request.CategoryID,
			peekID,
			userID,
		)

		if err != nil {
			http.Error(w, `{"message":"Failed to update peek"}`, http.StatusInternalServerError)
			return
		}

		if result.RowsAffected() == 0 {
			http.Error(w, `{"message":"Peek not found"}`, http.StatusNotFound)
			return
		}

		response := map[string]interface{}{
			"message": "Peek updated successfully",
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(response)
	}
}

func DeletePeek(pool *pgxpool.Pool) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		userID := r.Context().Value("userID")
		peekID := r.PathValue("id")

		result, err := pool.Exec(
			r.Context(),
			`
			DELETE FROM peeks
			WHERE id = $1 AND user_id = $2
			`,
			peekID,
			userID,
		)

		if err != nil {
			http.Error(w, `{"message":"Failed to delete peek"}`, http.StatusInternalServerError)
			return
		}

		if result.RowsAffected() == 0 {
			http.Error(w, `{"message":"Peek not found"}`, http.StatusNotFound)
			return
		}

		response := map[string]interface{}{
			"message": "Peek deleted successfully",
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(response)
	}
}