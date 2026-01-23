package middleware

import (
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/hash-walker/giki-wallet/internal/common/errors"
)

func TestHandleError_WrappedError(t *testing.T) {
	// 1. Create a base AppError
	baseErr := errors.ErrUnauthorized

	// 2. Wrap it
	wrappedErr := fmt.Errorf("context message: %w", baseErr)

	// 3. Setup response recorder
	rr := httptest.NewRecorder()
	requestID := "test-request-id"

	// 4. Call HandleError
	HandleError(rr, wrappedErr, requestID)

	// 5. Assert result
	if rr.Code != http.StatusUnauthorized {
		t.Errorf("expected status 401, got %d", rr.Code)
	}

	var response map[string]interface{}
	if err := json.Unmarshal(rr.Body.Bytes(), &response); err != nil {
		t.Fatalf("failed to unmarshal response: %v", err)
	}

	if response["code"] != "UNAUTHORIZED" {
		t.Errorf("expected code UNAUTHORIZED, got %v", response["code"])
	}

	if response["message"] != baseErr.Message {
		t.Errorf("expected message %q, got %q", baseErr.Message, response["message"])
	}
}

func TestLogAppError_WrappedError(t *testing.T) {
	// This test just ensures no panic when logging wrapped errors
	baseErr := errors.New("TEST_CODE", http.StatusBadRequest, "Test message")
	wrappedErr := fmt.Errorf("wrapped: %w", baseErr)

	// Should not panic
	LogAppError(wrappedErr, "test-id")
}
