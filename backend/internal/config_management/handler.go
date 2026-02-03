package config_management

import (
	"encoding/json"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/hash-walker/giki-wallet/internal/common"
	"github.com/hash-walker/giki-wallet/internal/middleware"
)

type Handler struct {
	service *Service
}

func NewHandler(service *Service) *Handler {
	return &Handler{service: service}
}

func (h *Handler) ListConfigs(w http.ResponseWriter, r *http.Request) {
	requestID := middleware.GetRequestID(r.Context())
	configs, err := h.service.ListConfigs(r.Context())
	if err != nil {
		common.ResponseWithError(w, http.StatusInternalServerError, "failed to list configs", requestID)
		return
	}
	common.ResponseWithJSON(w, http.StatusOK, configs, requestID)
}

func (h *Handler) GetMaxTopUpLimit(w http.ResponseWriter, r *http.Request) {
	requestID := middleware.GetRequestID(r.Context())
	limit, err := h.service.GetMaxTopUpAmount(r.Context())
	if err != nil {
		common.ResponseWithError(w, http.StatusInternalServerError, "failed to get limit", requestID)
		return
	}
	common.ResponseWithJSON(w, http.StatusOK, map[string]int64{"max_limit_paisa": limit}, requestID)
}

func (h *Handler) UpdateConfig(w http.ResponseWriter, r *http.Request) {
	requestID := middleware.GetRequestID(r.Context())
	key := chi.URLParam(r, "key")
	var body struct {
		Value string `json:"value"`
	}

	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		common.ResponseWithError(w, http.StatusBadRequest, "invalid request body", requestID)
		return
	}

	if err := h.service.UpdateConfig(r.Context(), key, body.Value); err != nil {
		common.ResponseWithError(w, http.StatusInternalServerError, "failed to update config", requestID)
		return
	}

	common.ResponseWithJSON(w, http.StatusOK, map[string]string{"message": "Configuration updated successfully"}, requestID)
}
