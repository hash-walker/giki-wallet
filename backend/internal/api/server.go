package api

import (
	"net/http"

	"github.com/hash-walker/giki-wallet/internal/user"
)

type Server struct {
	Router *http.ServeMux
	User   *user.Handler
}

func NewServer(userHandler *user.Handler) *Server {
	return &Server{
		Router: http.NewServeMux(),
		User:   userHandler,
	}
}

func (s *Server) MountRoutes() {

	s.Router.HandleFunc("GET /health", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		_, err := w.Write([]byte("OK"))
		if err != nil {
			return
		}
	})

	s.Router.HandleFunc("POST /auth/register", s.User.Register)

}
