package middleware

import (
	"context"
	"net/http"
	"os"
	"strings"

	"peekpanel/models"

	"github.com/golang-jwt/jwt/v5"
)



func Auth(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		authHeader := r.Header.Get("Authorization")

		if authHeader == "" {
			http.Error(w, `{"message":"Authorization header is required"}`, http.StatusUnauthorized)
			return
		}

		parts := strings.SplitN(authHeader, " ", 2)

		if len(parts) != 2 || parts[0] != "Bearer" {
			http.Error(w, `{"message":"Invalid authorization format"}`, http.StatusUnauthorized)
			return
		}

		tokenString := parts[1]

		jwtSecret := os.Getenv("JWT_SECRET")

		if jwtSecret == "" {
			http.Error(w, `{"message":"JWT secret is not configured"}`, http.StatusInternalServerError)
			return
		}

		claims := &models.Claims{}

		token, err := jwt.ParseWithClaims(
			tokenString,
			claims,
			func(token *jwt.Token) (interface{}, error) {
				if token.Method != jwt.SigningMethodHS256 {
					return nil, jwt.ErrTokenSignatureInvalid
				}

				return []byte(jwtSecret), nil
			},
		)

		if err != nil || !token.Valid {
			http.Error(w, `{"message":"Invalid or expired token"}`, http.StatusUnauthorized)
			return
		}

		ctx := context.WithValue(r.Context(), "userID", claims.UserID)
		ctx = context.WithValue(ctx, "userEmail", claims.Email)

		next(w, r.WithContext(ctx))
	}
}