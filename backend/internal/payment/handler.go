package payment

import (
	"encoding/json"
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
		middleware.HandleError(w, err, requestID)
		return
	}

	if response.PaymentMethod == PaymentMethodMWallet && response.Status == PaymentStatusPending {
		go h.pService.startPollingForTransaction(response.TxnRefNo)
	}

	switch response.Status {
	case PaymentStatusSuccess:
		common.ResponseWithJSON(w, http.StatusOK, response, requestID)
	case PaymentStatusFailed:
		common.ResponseWithJSON(w, http.StatusOK, response, requestID)
	default:
		common.ResponseWithJSON(w, http.StatusAccepted, response, requestID)
	}
}

func (h *Handler) CardPaymentPage(w http.ResponseWriter, r *http.Request) {
	requestID := middleware.GetRequestID(r.Context())
	txnRefNo := chi.URLParam(r, "txnRefNo")

	html, err := h.pService.initiateCardPayment(r.Context(), txnRefNo)
	if err != nil {
		middleware.HandleError(w, err, requestID)
		return
	}

	w.Header().Set("Content-Type", "text/html")
	w.Write([]byte(html))
}

func (h *Handler) CardCallBack(w http.ResponseWriter, r *http.Request) {
	requestID := middleware.GetRequestID(r.Context())

	err := r.ParseForm()
	if err != nil {
		middleware.HandleError(w, commonerrors.Wrap(commonerrors.ErrInvalidInput, err), requestID)
		return
	}

	auditID, err := h.pService.LogCardCallbackAudit(r.Context(), r.Form)

	if err != nil {
		middleware.HandleError(w, commonerrors.Wrap(commonerrors.ErrInternal, err), requestID)
		return
	}

	tx, err := h.pService.dbPool.Begin(r.Context())

	if err != nil {
		middleware.LogAppError(commonerrors.Wrap(commonerrors.ErrDatabase, err), requestID)
		h.pService.MarkAuditFailed(r.Context(), auditID, err.Error())
		http.Redirect(w, r, "/payment/pending", http.StatusSeeOther)
		return
	}
	defer tx.Rollback(r.Context())

	result, err := h.pService.CompleteCardPayment(r.Context(), tx, r.Form, auditID)

	if err != nil {
		middleware.LogAppError(err, requestID)
		h.pService.MarkAuditFailed(r.Context(), auditID, err.Error())
		http.Redirect(w, r, "/payment/pending", http.StatusSeeOther)
		return
	}

	if err := tx.Commit(r.Context()); err != nil {
		middleware.LogAppError(commonerrors.Wrap(commonerrors.ErrDatabase, err), requestID)
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

func (h *Handler) CheckStatus(w http.ResponseWriter, r *http.Request) {
	requestID := middleware.GetRequestID(r.Context())
	txnRefNo := chi.URLParam(r, "txnRefNo")

	if txnRefNo == "" {
		middleware.HandleError(w, commonerrors.Wrap(commonerrors.ErrInvalidInput, nil), requestID)
		return
	}

	result, err := h.pService.GetTransactionStatus(r.Context(), txnRefNo)
	if err != nil {
		middleware.HandleError(w, err, requestID)
		return
	}

	common.ResponseWithJSON(w, http.StatusOK, result, requestID)
}

// =============================================================================
// ADMIN HANDLERS
// =============================================================================

func (h *Handler) ListGatewayTransactions(w http.ResponseWriter, r *http.Request) {
	requestID := middleware.GetRequestID(r.Context())

	txns, err := h.pService.ListGatewayTransactions(r.Context())
	if err != nil {
		middleware.HandleError(w, err, requestID)
		return
	}

	common.ResponseWithJSON(w, http.StatusOK, txns, requestID)
}

func (h *Handler) VerifyGatewayTransaction(w http.ResponseWriter, r *http.Request) {
	requestID := middleware.GetRequestID(r.Context())
	txnRefNo := chi.URLParam(r, "txnRefNo")

	if txnRefNo == "" {
		middleware.HandleError(w, commonerrors.Wrap(commonerrors.ErrInvalidInput, nil), requestID)
		return
	}

	result, err := h.pService.VerifyTransaction(r.Context(), txnRefNo)
	if err != nil {
		middleware.HandleError(w, err, requestID)
		return
	}

	common.ResponseWithJSON(w, http.StatusOK, result, requestID)
}
