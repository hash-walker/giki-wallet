package api

import (
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/hash-walker/giki-wallet/internal/auth"
	"github.com/hash-walker/giki-wallet/internal/middleware"
	"github.com/hash-walker/giki-wallet/internal/payment"
	"github.com/hash-walker/giki-wallet/internal/transport"
	"github.com/hash-walker/giki-wallet/internal/user"
	"github.com/hash-walker/giki-wallet/internal/wallet"
)

type Server struct {
	Router    *chi.Mux
	User      *user.Handler
	Auth      *auth.Handler
	Payment   *payment.Handler
	Transport *transport.Handler
	Wallet    *wallet.Handler
}

func NewServer(
	userHandler *user.Handler,
	authHandler *auth.Handler,
	paymentHandler *payment.Handler,
	transportHandler *transport.Handler,
	walletHandler *wallet.Handler,
) *Server {
	return &Server{
		Router:    chi.NewRouter(),
		User:      userHandler,
		Auth:      authHandler,
		Payment:   paymentHandler,
		Transport: transportHandler,
		Wallet:    walletHandler,
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
	r.Post("/auth/signout", s.Auth.Logout)
	r.Get("/auth/verify", s.Auth.VerifyEmail)
	r.With(auth.RequireAuth).Get("/auth/me", s.Auth.Me)

	r.Route("/payment", func(r chi.Router) {
		r.Use(auth.RequireAuth)
		r.Post("/topup", s.Payment.TopUp)
		r.Get("/page/{txnRefNo}", s.Payment.CardPaymentPage)
		r.Get("/status/{txnRefNo}", s.Payment.CheckStatus)
	})

	r.Post("/booking/payment/response", s.Payment.CardCallBack)

	r.Route("/transport", func(r chi.Router) {

		r.Get("/trips/upcoming", s.Transport.GetAllUpcomingTrips)
		r.Get("/weekly-summary", s.Transport.GetWeeklyTripSummary)

		// Protected routes (Auth required for booking)
		r.Group(func(r chi.Router) {
			r.Use(auth.RequireAuth)
			r.Get("/quota", s.Transport.GetQuota)
			r.Post("/holds", s.Transport.HoldSeats)
			r.Get("/holds/active", s.Transport.GetActiveHolds)
			r.Delete("/holds/active", s.Transport.ReleaseAllActiveHolds)
			r.Get("/tickets", s.Transport.GetMyTickets)
			r.Post("/confirm", s.Transport.ConfirmBatch)
			r.Delete("/holds/{hold_id}", s.Transport.ReleaseHold)
			r.Delete("/tickets/{ticket_id}", s.Transport.CancelTicket)
		})
	})

	r.Route("/wallet", func(r chi.Router) {
		r.Use(auth.RequireAuth)
		r.Get("/balance", s.Wallet.GetBalance)
		r.Get("/history", s.Wallet.GetHistory)
	})

	r.Route("/admin", func(r chi.Router) {
		r.Use(auth.RequireAuth)
		// Protect all admin routes with RBAC
		// Base level: Must be at least some kind of Admin
		r.Use(auth.RequireRole(auth.RoleSuperAdmin, auth.RoleTransportAdmin, auth.RoleFinanceAdmin))

		r.Get("/dashboard", func(w http.ResponseWriter, r *http.Request) {
			w.Write([]byte("Admin Dashboard"))
		})

		r.Get("/routes", s.Transport.ListRoutes)
		r.Get("/routes/{route_id}/template", s.Transport.GetRouteTemplate)
		r.Get("/routes/{route_id}/trips/upcoming", s.Transport.GetUpcomingTrips)
		r.Get("/trips", s.Transport.AdminListTrips)

		r.Post("/trips", s.Transport.CreateTrip)
	})
}
