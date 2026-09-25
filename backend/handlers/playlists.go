package handlers

import (
	"encoding/json"
	"net/http"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

type Playlist struct {
	ID          int64     `json:"id"`
	Name        string    `json:"name"`
	Description *string   `json:"description"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

type PlaylistRequest struct {
	Name        string  `json:"name"`
	Description *string `json:"description"`
}

func GetPlaylists(pool *pgxpool.Pool) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		userID := r.Context().Value("userID")

		rows, err := pool.Query(
			r.Context(),
			`
			SELECT
				id,
				name,
				description,
				created_at,
				updated_at
			FROM playlists
			WHERE user_id = $1
			ORDER BY created_at DESC
			`,
			userID,
		)

		if err != nil {
			http.Error(w, `{"message":"Gagal mengambil playlist"}`, http.StatusInternalServerError)
			return
		}
		defer rows.Close()

		playlists := []Playlist{}

		for rows.Next() {
			var playlist Playlist

			err := rows.Scan(
				&playlist.ID,
				&playlist.Name,
				&playlist.Description,
				&playlist.CreatedAt,
				&playlist.UpdatedAt,
			)

			if err != nil {
				http.Error(w, `{"message":"Gagal membaca playlist"}`, http.StatusInternalServerError)
				return
			}

			playlists = append(playlists, playlist)
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(playlists)
	}
}

func CreatePlaylist(pool *pgxpool.Pool) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		userID := r.Context().Value("userID")

		var request PlaylistRequest

		if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
			http.Error(w, `{"message":"Data tidak valid"}`, http.StatusBadRequest)
			return
		}

		if request.Name == "" {
			http.Error(w, `{"message":"Nama playlist wajib diisi"}`, http.StatusBadRequest)
			return
		}

		var playlistID int64

		err := pool.QueryRow(
			r.Context(),
			`
			INSERT INTO playlists (
				user_id,
				name,
				description
			)
			VALUES ($1, $2, $3)
			RETURNING id
			`,
			userID,
			request.Name,
			request.Description,
		).Scan(&playlistID)

		if err != nil {
			http.Error(w, `{"message":"Gagal membuat playlist"}`, http.StatusInternalServerError)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"message": "Playlist berhasil dibuat",
			"id":      playlistID,
		})
	}
}

func UpdatePlaylist(pool *pgxpool.Pool) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		userID := r.Context().Value("userID")
		playlistID := r.PathValue("id")

		var request PlaylistRequest

		if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
			http.Error(w, `{"message":"Data tidak valid"}`, http.StatusBadRequest)
			return
		}

		if request.Name == "" {
			http.Error(w, `{"message":"Nama playlist wajib diisi"}`, http.StatusBadRequest)
			return
		}

		result, err := pool.Exec(
			r.Context(),
			`
			UPDATE playlists
			SET
				name = $1,
				description = $2,
				updated_at = NOW()
			WHERE id = $3 AND user_id = $4
			`,
			request.Name,
			request.Description,
			playlistID,
			userID,
		)

		if err != nil {
			http.Error(w, `{"message":"Gagal memperbarui playlist"}`, http.StatusInternalServerError)
			return
		}

		if result.RowsAffected() == 0 {
			http.Error(w, `{"message":"Playlist tidak ditemukan"}`, http.StatusNotFound)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]string{
			"message": "Playlist berhasil diperbarui",
		})
	}
}

func DeletePlaylist(pool *pgxpool.Pool) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		userID := r.Context().Value("userID")
		playlistID := r.PathValue("id")

		result, err := pool.Exec(
			r.Context(),
			`
			DELETE FROM playlists
			WHERE id = $1 AND user_id = $2
			`,
			playlistID,
			userID,
		)

		if err != nil {
			http.Error(w, `{"message":"Gagal menghapus playlist"}`, http.StatusInternalServerError)
			return
		}

		if result.RowsAffected() == 0 {
			http.Error(w, `{"message":"Playlist tidak ditemukan"}`, http.StatusNotFound)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]string{
			"message": "Playlist berhasil dihapus",
		})
	}
}

func Playlists(pool *pgxpool.Pool) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		switch r.Method {
		case http.MethodGet:
			if r.PathValue("id") != "" {
				GetPlaylist(pool)(w, r)
				return
			}

			GetPlaylists(pool)(w, r)

		case http.MethodPost:
			CreatePlaylist(pool)(w, r)

		case http.MethodPut:
			UpdatePlaylist(pool)(w, r)

		case http.MethodDelete:
			DeletePlaylist(pool)(w, r)

		default:
			http.Error(
				w,
				`{"message":"Method not allowed"}`,
				http.StatusMethodNotAllowed,
			)
		}
	}
}

func GetPlaylist(pool *pgxpool.Pool) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		userID := r.Context().Value("userID")
		playlistID := r.PathValue("id")

		var playlist Playlist

		err := pool.QueryRow(
			r.Context(),
			`
			SELECT
				id,
				name,
				description,
				created_at,
				updated_at
			FROM playlists
			WHERE id = $1 AND user_id = $2
			`,
			playlistID,
			userID,
		).Scan(
			&playlist.ID,
			&playlist.Name,
			&playlist.Description,
			&playlist.CreatedAt,
			&playlist.UpdatedAt,
		)

		if err != nil {
			http.Error(
				w,
				`{"message":"Playlist tidak ditemukan"}`,
				http.StatusNotFound,
			)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(playlist)
	}
}