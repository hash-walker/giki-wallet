package common

import (
	"encoding/json"
	"net/http"
)

type APIResponse struct {
	Success bool         `json:"success"`
	Data    interface{}  `json:"data,omitempty"`
	Error   interface{}  `json:"error,omitempty"`
	Meta    ResponseMeta `json:"meta"`
}

type ResponseMeta struct {
	RequestID string `json:"request_id"`
}

func ResponseWithError(w http.ResponseWriter, code int, msg string, requestID string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(code)

	response := APIResponse{
		Success: false,
		Error: map[string]string{
			"message": msg,
		},
		Meta: ResponseMeta{
			RequestID: requestID,
		},
	}

	_ = json.NewEncoder(w).Encode(response)
}

func ResponseWithJSON(w http.ResponseWriter, code int, payload interface{}, requestID string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(code)

	response := APIResponse{
		Success: true,
		Data:    payload,
		Meta: ResponseMeta{
			RequestID: requestID,
		},
	}

	_ = json.NewEncoder(w).Encode(response)
}
