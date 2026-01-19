package api

import (
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/hash-walker/giki-wallet/internal/auth"
	"github.com/hash-walker/giki-wallet/internal/payment"
	"github.com/hash-walker/giki-wallet/internal/user"
)

type Server struct {
	Router  *chi.Mux
	User    *user.Handler
	Auth    *auth.Handler
	Payment *payment.Handler
}

func NewServer(userHandler *user.Handler, authHandler *auth.Handler, paymentHandler *payment.Handler) *Server {
	return &Server{
		Router:  chi.NewRouter(),
		User:    userHandler,
		Auth:    authHandler,
		Payment: paymentHandler,
	}
}

func (s *Server) MountRoutes() {

	r := s.Router
	r.Use(middleware.Logger)

	r.Get("/health", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		_, err := w.Write([]byte("OK"))
		if err != nil {
			return
		}
	})

	r.Post("/auth/register", s.User.Register)
	r.Post("/auth/signin", s.Auth.Login)

	r.Route(
		r.Use(auth)
		)
}
