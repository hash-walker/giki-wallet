package payment

import (
	"encoding/json"
	"errors"
	"log"
	"net/http"

	"github.com/hash-walker/giki-wallet/internal/common"
)

type Handler struct {
	service *Service
}

func NewHandler(service *Service) *Handler {
	return &Handler{
		service: service,
	}
}

func (h *Handler) TopUp(w http.ResponseWriter, r *http.Request) {
	var params TopUpRequest

	if err := json.NewDecoder(r.Body).Decode(&params); err != nil {
		common.ResponseWithError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	tx, err := h.service.dbPool.Begin(r.Context())
	if err != nil {
		log.Printf("DATABASE ERROR: %v", err)
		common.ResponseWithError(w, http.StatusInternalServerError, "Internal Server Error")
		return
	}
	defer tx.Rollback(r.Context())

	response, err := h.service.InitiatePayment(r.Context(), tx, params)
	if err != nil {
		h.handleServiceError(w, err)
		return
	}

	if err := tx.Commit(r.Context()); err != nil {
		log.Printf("failed to commit transaction: %v", err)
		common.ResponseWithError(w, http.StatusInternalServerError, "Internal Server Error")
		return
	}

	// Start polling for pending MWallet transactions
	if response.PaymentMethod == PaymentMethodMWallet && response.Status == PaymentStatusPending {
		go h.service.startPollingForTransaction(response.TxnRefNo)
	}

	// Return appropriate status based on payment result
	switch response.Status {
	case PaymentStatusSuccess:
		common.ResponseWithJSON(w, http.StatusOK, response)
	case PaymentStatusFailed:
		common.ResponseWithJSON(w, http.StatusOK, response) // 200 OK with failed status in body
	default:
		common.ResponseWithJSON(w, http.StatusAccepted, response) // 202 for pending
	}
}

// handleServiceError maps service errors to HTTP responses
func (h *Handler) handleServiceError(w http.ResponseWriter, err error) {
	switch {
	// Validation errors (400) - show message to user
	case errors.Is(err, ErrInvalidPhoneNumber):
		common.ResponseWithError(w, http.StatusBadRequest, "Invalid phone number format. Please enter a valid Pakistani mobile number.")
	case errors.Is(err, ErrInvalidCNIC):
		common.ResponseWithError(w, http.StatusBadRequest, "Invalid CNIC format. Please enter the last 6 digits of your CNIC.")
	case errors.Is(err, ErrInvalidPaymentMethod):
		common.ResponseWithError(w, http.StatusBadRequest, "Invalid payment method selected.")

	// Gateway unreachable (502)
	case errors.Is(err, ErrGatewayUnavailable):
		common.ResponseWithError(w, http.StatusBadGateway, "Payment service is temporarily unavailable. Please try again later.")

	// Auth errors (401)
	case errors.Is(err, ErrUserIDNotFound):
		common.ResponseWithError(w, http.StatusUnauthorized, "Authentication required.")

	// Internal errors (500) - generic message, log details
	default:
		log.Printf("payment error: %v", err)
		common.ResponseWithError(w, http.StatusInternalServerError, "An unexpected error occurred. Please try again later.")
	}
}
