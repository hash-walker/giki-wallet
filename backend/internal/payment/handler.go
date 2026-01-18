package payment

import (
	"encoding/json"
	"fmt"
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
		common.ResponseWithError(w, http.StatusInternalServerError, "Parsing the json failed")
		return
	}

	tx, err := h.service.dbPool.Begin(r.Context())

	if err != nil {
		fmt.Printf("DATABASE ERROR: %v\n", err)
		common.ResponseWithError(w, http.StatusInternalServerError, "Internal Server Error")
		return
	}
	defer tx.Rollback(r.Context())

	response, err := h.service.InitiatePayment(r.Context(), tx, params)

	if err != nil {
		common.ResponseWithError(w, http.StatusInternalServerError, err.Error())
		return
	}

	if response.Status == PaymentStatusSuccess {
		common.ResponseWithJSON(w, http.StatusOK, response)
		return
	}
}
