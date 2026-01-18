package api

import (
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/hash-walker/giki-wallet/internal/auth"
	"github.com/hash-walker/giki-wallet/internal/user"
)

type Server struct {
	Router *chi.Mux
	User   *user.Handler
	Auth   *auth.Handler
}

func NewServer(userHandler *user.Handler, authHandler *auth.Handler) *Server {
	return &Server{
		Router: chi.NewRouter(),
		User:   userHandler,
		Auth:   authHandler,
	}
}

func (s *Server) MountRoutes() {

	s.Router.Use(middleware.Logger)

	s.Router.Get("/health", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		_, err := w.Write([]byte("OK"))
		if err != nil {
			return
		}
	})

	s.Router.Post("/auth/register", s.User.Register)
	s.Router.Post("/auth/signin", s.Auth.Login)

}
