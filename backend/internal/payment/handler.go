package payment

import (
	"encoding/json"
	"errors"
	"log"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/hash-walker/giki-wallet/internal/common"
	"github.com/hash-walker/giki-wallet/internal/wallet"
)

type Handler struct {
	pService *Service
	wService *wallet.Service
}

func NewHandler(pService *Service, wService *wallet.Service) *Handler {
	return &Handler{
		pService: pService,
		wService: wService,
	}
}

func (h *Handler) TopUp(w http.ResponseWriter, r *http.Request) {
	var params TopUpRequest

	if err := json.NewDecoder(r.Body).Decode(&params); err != nil {
		common.ResponseWithError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	response, err := h.pService.InitiatePayment(r.Context(), params)
	if err != nil {
		h.handleServiceError(w, err)
		return
	}

	if response.PaymentMethod == PaymentMethodMWallet && response.Status == PaymentStatusPending {
		go h.pService.startPollingForTransaction(response.TxnRefNo)
	}

	switch response.Status {
	case PaymentStatusSuccess:
		common.ResponseWithJSON(w, http.StatusOK, response)
	case PaymentStatusFailed:
		common.ResponseWithJSON(w, http.StatusOK, response)
	default:
		common.ResponseWithJSON(w, http.StatusAccepted, response)
	}
}

func (h *Handler) CardPaymentPage(w http.ResponseWriter, r *http.Request) {
	txnRefNo := chi.URLParam(r, "txnRefNo")

	html, err := h.pService.initiateCardPayment(r.Context(), txnRefNo)

	if err != nil {
		h.handleServiceError(w, err)
		return
	}

	w.Header().Set("Content-Type", "text/html")
	w.Write([]byte(html))
}

func (h *Handler) CardCallBack(w http.ResponseWriter, r *http.Request) {
	err := r.ParseForm()

	if err != nil {
		log.Printf("cannot parse form data: %v", err)
		common.ResponseWithError(w, http.StatusInternalServerError, "Internal Server Error")
		return
	}

	auditID, err := h.pService.LogCardCallbackAudit(r.Context(), r.Form)
	if err != nil {
		log.Printf("CRITICAL: failed to write audit log: %v", err)
		http.Error(w, "Internal Server Error", http.StatusInternalServerError)
		return
	}

	tx, err := h.pService.dbPool.Begin(r.Context())

	if err != nil {
		log.Printf("DATABASE ERROR: %v", err)
		h.pService.MarkAuditFailed(r.Context(), auditID, err.Error())

		http.Redirect(w, r, "/payment/pending", http.StatusSeeOther)
		return
	}

	defer tx.Rollback(r.Context())

	result, err := h.pService.CompleteCardPayment(r.Context(), tx, r.Form, auditID)
	if err != nil {
		h.pService.MarkAuditFailed(r.Context(), auditID, err.Error())
		http.Redirect(w, r, "/payment/pending", http.StatusSeeOther)
		return
	}

	if err := tx.Commit(r.Context()); err != nil {
		log.Printf("failed to commit: %v", err)
		h.pService.MarkAuditFailed(r.Context(), auditID, err.Error())
		http.Redirect(w, r, "/payment/error", http.StatusSeeOther)
		return
	}

	if result.Status == PaymentStatusSuccess {
		http.Redirect(w, r, "/payment/success?txn="+result.TxnRefNo, http.StatusSeeOther)
	} else {
		http.Redirect(w, r, "/payment/failed?txn="+result.TxnRefNo, http.StatusSeeOther)
	}
}

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

	// Duplicate/conflict (409)
	case errors.Is(err, ErrDuplicateIdempotencyKey):
		common.ResponseWithError(w, http.StatusConflict, "This request has already been processed.")

	// Internal errors (500) - generic message, log details
	default:
		log.Printf("payment error: %v", err)
		common.ResponseWithError(w, http.StatusInternalServerError, "An unexpected error occurred. Please try again later.")
	}
}
