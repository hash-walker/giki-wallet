package audit

import (
	"net/http"
	"strconv"

	"github.com/hash-walker/giki-wallet/internal/common"
	"github.com/hash-walker/giki-wallet/internal/common/errors"
	"github.com/hash-walker/giki-wallet/internal/middleware"
)

type Handler struct {
	service *Service
}

func NewHandler(service *Service) *Handler {
	return &Handler{service: service}
}

func (h *Handler) HandlerListSecurityEvents(w http.ResponseWriter, r *http.Request) {
	requestID := middleware.GetRequestID(r.Context())

	pageStr := r.URL.Query().Get("page")
	page, err := strconv.Atoi(pageStr)
	if err != nil || page < 1 {
		page = 1
	}

	pageSizeStr := r.URL.Query().Get("page_size")
	pageSize, err := strconv.Atoi(pageSizeStr)
	if err != nil || pageSize < 1 {
		pageSize = 20
	}

	logs, total, err := h.service.ListSecurityEvents(r.Context(), page, pageSize)
	if err != nil {
		middleware.HandleError(w, errors.Wrap(errors.ErrInternalServer, err), requestID)
		return
	}

	response := map[string]interface{}{
		"data": logs,
		"meta": map[string]interface{}{
			"current_page": page,
			"page_size":    pageSize,
			"total_items":  total,
			"total_pages":  (total + int64(pageSize) - 1) / int64(pageSize),
		},
	}

	common.ResponseWithJSON(w, http.StatusOK, response, requestID)
}
