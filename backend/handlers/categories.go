package handlers

import (
	"encoding/json"
	"net/http"

	"github.com/jackc/pgx/v5/pgxpool"
)

func GetCategories(pool *pgxpool.Pool) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		rows, err := pool.Query(
			r.Context(),
			`
			SELECT id, name
			FROM categories
			ORDER BY name ASC
			`,
		)

		if err != nil {
			http.Error(w, `{"message":"Failed to get categories"}`, http.StatusInternalServerError)
			return
		}
		defer rows.Close()

		type CategoryResponse struct {
			ID   int64  `json:"id"`
			Name string `json:"name"`
		}

		categories := []CategoryResponse{}

		for rows.Next() {
			var category CategoryResponse

			err := rows.Scan(
				&category.ID,
				&category.Name,
			)

			if err != nil {
				http.Error(w, `{"message":"Failed to read categories"}`, http.StatusInternalServerError)
				return
			}

			categories = append(categories, category)
		}

		if err := rows.Err(); err != nil {
			http.Error(w, `{"message":"Failed to read categories"}`, http.StatusInternalServerError)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(categories)
	}
}
