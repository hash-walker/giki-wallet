package payment

import (
	"encoding/json"
	"log"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/hash-walker/giki-wallet/internal/common"
	commonerrors "github.com/hash-walker/giki-wallet/internal/common/errors"
	"github.com/hash-walker/giki-wallet/internal/middleware"
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
	requestID := middleware.GetRequestID(r.Context())
	var params TopUpRequest

	if err := json.NewDecoder(r.Body).Decode(&params); err != nil {
		middleware.HandleError(w, commonerrors.Wrap(commonerrors.ErrInvalidJSON, err), requestID)
		return
	}

	response, err := h.pService.InitiatePayment(r.Context(), params)
	if err != nil {
		h.handleServiceError(w, err, requestID)
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
	requestID := middleware.GetRequestID(r.Context())
	txnRefNo := chi.URLParam(r, "txnRefNo")

	html, err := h.pService.initiateCardPayment(r.Context(), txnRefNo)
	if err != nil {
		h.handleServiceError(w, err, requestID)
		return
	}

	w.Header().Set("Content-Type", "text/html")
	w.Write([]byte(html))
}

func (h *Handler) CardCallBack(w http.ResponseWriter, r *http.Request) {
	requestID := middleware.GetRequestID(r.Context())

	err := r.ParseForm()
	if err != nil {
		log.Printf("ERROR: requestID=%s, cannot parse form data: %v", requestID, err)
		middleware.HandleError(w, commonerrors.Wrap(commonerrors.ErrInvalidInput, err), requestID)
		return
	}

	auditID, err := h.pService.LogCardCallbackAudit(r.Context(), r.Form)
	if err != nil {
		log.Printf("CRITICAL: requestID=%s, failed to write audit log: %v", requestID, err)
		middleware.HandleError(w, commonerrors.Wrap(commonerrors.ErrInternal, err), requestID)
		return
	}

	tx, err := h.pService.dbPool.Begin(r.Context())
	if err != nil {
		log.Printf("ERROR: requestID=%s, failed to begin transaction: %v", requestID, err)
		h.pService.MarkAuditFailed(r.Context(), auditID, err.Error())
		http.Redirect(w, r, "/payment/pending", http.StatusSeeOther)
		return
	}
	defer tx.Rollback(r.Context())

	result, err := h.pService.CompleteCardPayment(r.Context(), tx, r.Form, auditID)
	if err != nil {
		log.Printf("ERROR: requestID=%s, failed to complete card payment: %v", requestID, err)
		h.pService.MarkAuditFailed(r.Context(), auditID, err.Error())
		http.Redirect(w, r, "/payment/pending", http.StatusSeeOther)
		return
	}

	if err := tx.Commit(r.Context()); err != nil {
		log.Printf("ERROR: requestID=%s, failed to commit transaction: %v", requestID, err)
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

func (h *Handler) handleServiceError(w http.ResponseWriter, err error, requestID string) {
	log.Printf("ERROR: requestID=%s, payment service error: %v", requestID, err)
	middleware.HandleError(w, err, requestID)
}
