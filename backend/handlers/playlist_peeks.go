package handlers

import (
	"encoding/json"
	"net/http"
	"strconv"

	"github.com/jackc/pgx/v5/pgxpool"
)

type PlaylistPeek struct {
	ID           int64  `json:"id"`
	Title        string `json:"title"`
	Content      string `json:"content"`
	CategoryID   int64  `json:"category_id"`
	CategoryName string `json:"category_name"`
	Position     int      `json:"position"`
}

func AddPeekToPlaylist(pool *pgxpool.Pool) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		userID := r.Context().Value("userID")
		playlistID := r.PathValue("id")

		var request struct {
			PeekID   int64 `json:"peek_id"`
			Position int   `json:"position"`
		}

		if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
			http.Error(w, `{"message":"Data tidak valid"}`, http.StatusBadRequest)
			return
		}

		if request.PeekID == 0 {
			http.Error(w, `{"message":"peek_id wajib diisi"}`, http.StatusBadRequest)
			return
		}

		playlistIDInt, err := strconv.ParseInt(playlistID, 10, 64)
		if err != nil {
			http.Error(w, `{"message":"Playlist tidak valid"}`, http.StatusBadRequest)
			return
		}

		// Pastikan playlist milik user.
		var playlistExists bool

		err = pool.QueryRow(
			r.Context(),
			`
			SELECT EXISTS (
				SELECT 1
				FROM playlists
				WHERE id = $1 AND user_id = $2
			)
			`,
			playlistIDInt,
			userID,
		).Scan(&playlistExists)

		if err != nil {
			http.Error(w, `{"message":"Gagal memeriksa playlist"}`, http.StatusInternalServerError)
			return
		}

		if !playlistExists {
			http.Error(w, `{"message":"Playlist tidak ditemukan"}`, http.StatusNotFound)
			return
		}

		// Pastikan Peek milik user.
		var peekExists bool

		err = pool.QueryRow(
			r.Context(),
			`
			SELECT EXISTS (
				SELECT 1
				FROM peeks
				WHERE id = $1 AND user_id = $2
			)
			`,
			request.PeekID,
			userID,
		).Scan(&peekExists)

		if err != nil {
			http.Error(w, `{"message":"Gagal memeriksa Peek"}`, http.StatusInternalServerError)
			return
		}

		if !peekExists {
			http.Error(w, `{"message":"Peek tidak ditemukan"}`, http.StatusNotFound)
			return
		}

		_, err = pool.Exec(
			r.Context(),
			`
			INSERT INTO peek_playlists (
				peek_id,
				playlist_id,
				position
			)
			VALUES ($1, $2, $3)
			ON CONFLICT (peek_id, playlist_id)
			DO UPDATE SET position = EXCLUDED.position
			`,
			request.PeekID,
			playlistIDInt,
			request.Position,
		)

		if err != nil {
			http.Error(w, `{"message":"Gagal menambahkan Peek ke playlist"}`, http.StatusInternalServerError)
			return
		}

		w.Header().Set("Content-Type", "application/json")

		json.NewEncoder(w).Encode(map[string]string{
			"message": "Peek berhasil ditambahkan ke playlist",
		})
	}
}

func GetPlaylistPeeks(pool *pgxpool.Pool) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		userID := r.Context().Value("userID")
		playlistID := r.PathValue("id")

		rows, err := pool.Query(
			r.Context(),
			`
			SELECT
				p.id,
				p.title,
				p.content,
				p.category_id,
				c.name AS category_name,
				pp.position
			FROM peek_playlists pp
			JOIN peeks p ON p.id = pp.peek_id
			JOIN categories c ON c.id = p.category_id
			JOIN playlists pl ON pl.id = pp.playlist_id
			WHERE pp.playlist_id = $1
			  AND pl.user_id = $2
			  AND p.user_id = $2
			ORDER BY pp.position ASC, pp.peek_id ASC
			`,
			playlistID,
			userID,
		)

		if err != nil {
			http.Error(w, `{"message":"Gagal mengambil Peek playlist"}`, http.StatusInternalServerError)
			return
		}

		defer rows.Close()

		peeks := []PlaylistPeek{}

		for rows.Next() {
			var peek PlaylistPeek

			err := rows.Scan(
				&peek.ID,
				&peek.Title,
				&peek.Content,
				&peek.CategoryID,
				&peek.CategoryName,
				&peek.Position,
			)

			if err != nil {
				http.Error(w, `{"message":"Gagal membaca Peek playlist"}`, http.StatusInternalServerError)
				return
			}

			peeks = append(peeks, peek)
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(peeks)
	}
}

func RemovePeekFromPlaylist(pool *pgxpool.Pool) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		userID := r.Context().Value("userID")
		playlistID := r.PathValue("id")
		peekID := r.PathValue("peekId")

		result, err := pool.Exec(
			r.Context(),
			`
			DELETE FROM peek_playlists pp
			USING playlists pl
			WHERE pp.playlist_id = pl.id
			  AND pp.playlist_id = $1
			  AND pp.peek_id = $2
			  AND pl.user_id = $3
			`,
			playlistID,
			peekID,
			userID,
		)

		if err != nil {
			http.Error(w, `{"message":"Gagal menghapus Peek dari playlist"}`, http.StatusInternalServerError)
			return
		}

		if result.RowsAffected() == 0 {
			http.Error(w, `{"message":"Peek tidak ditemukan di playlist"}`, http.StatusNotFound)
			return
		}

		w.Header().Set("Content-Type", "application/json")

		json.NewEncoder(w).Encode(map[string]string{
			"message": "Peek berhasil dikeluarkan dari playlist",
		})
	}
}

func PlaylistPeeks(pool *pgxpool.Pool) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		switch r.Method {
		case http.MethodGet:
			GetPlaylistPeeks(pool)(w, r)

		case http.MethodPost:
			AddPeekToPlaylist(pool)(w, r)

		default:
			http.Error(
				w,
				`{"message":"Method not allowed"}`,
				http.StatusMethodNotAllowed,
			)
		}
	}
}