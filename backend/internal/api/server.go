package api

import (
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/hash-walker/giki-wallet/internal/auth"
	"github.com/hash-walker/giki-wallet/internal/middleware"
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

	// Global middleware stack (order matters!)
	r.Use(middleware.RequestID)    // 1. Generate request ID
	r.Use(middleware.Logger)       // 2. Log requests/responses
	r.Use(middleware.ErrorHandler) // 3. Recover from panics

	r.Get("/health", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		_, err := w.Write([]byte("OK"))
		if err != nil {
			return
		}
	})

	r.Post("/auth/register", s.User.Register)
	r.Post("/auth/signin", s.Auth.Login)

	r.Route("/payment", func(r chi.Router) {
		r.Use(auth.RequireAuth)
		r.Post("/topup", s.Payment.TopUp)
		r.Get("/page/{txnRefNo}", s.Payment.CardPaymentPage)
	})

	r.Post("/booking/payment/response", s.Payment.CardCallBack)

	r.Route("/admin", func(r chi.Router) {
		r.Use(auth.RequireAuth)
		// Protect all admin routes with RBAC
		// Base level: Must be at least some kind of Admin
		r.Use(auth.RequireRole(auth.RoleSuperAdmin, auth.RoleTransportAdmin, auth.RoleFinanceAdmin))

		r.Get("/dashboard", func(w http.ResponseWriter, r *http.Request) {
			w.Write([]byte("Admin Dashboard"))
		})
	})
}
