package wallet

import (
	"net/http"

	"github.com/hash-walker/giki-wallet/internal/auth"
	"github.com/hash-walker/giki-wallet/internal/common"
	commonerrors "github.com/hash-walker/giki-wallet/internal/common/errors"
	"github.com/hash-walker/giki-wallet/internal/middleware"
)

type Handler struct {
	service *Service
}

func NewHandler(service *Service) *Handler {
	return &Handler{
		service: service,
	}
}

func (h *Handler) GetBalance(w http.ResponseWriter, r *http.Request) {
	requestID := middleware.GetRequestID(r.Context())

	userID, ok := auth.GetUserIDFromContext(r.Context())
	if !ok {
		middleware.HandleError(w, commonerrors.ErrUnauthorized, requestID)
		return
	}

	res, err := h.service.GetUserBalance(r.Context(), userID)
	if err != nil {
		middleware.HandleError(w, err, requestID)
		return
	}

	common.ResponseWithJSON(w, http.StatusOK, res, requestID)
}

func (h *Handler) GetHistory(w http.ResponseWriter, r *http.Request) {
	requestID := middleware.GetRequestID(r.Context())

	userID, ok := auth.GetUserIDFromContext(r.Context())
	if !ok {
		middleware.HandleError(w, commonerrors.ErrUnauthorized, requestID)
		return
	}

	res, err := h.service.GetUserHistory(r.Context(), userID)
	if err != nil {
		middleware.HandleError(w, err, requestID)
		return
	}

	common.ResponseWithJSON(w, http.StatusOK, res, requestID)
}
