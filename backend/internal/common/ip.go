package common

import (
	"net"
	"net/http"
	"strings"
)

// GetClientIP returns the real client IP by checking X-Forwarded-For and X-Real-IP headers
func GetClientIP(r *http.Request) string {
	// Check X-Forwarded-For
	xForwardedFor := r.Header.Get("X-Forwarded-For")
	if xForwardedFor != "" {
		// X-Forwarded-For can contain multiple IPs, the first one is the client
		ips := strings.Split(xForwardedFor, ",")
		clientIP := strings.TrimSpace(ips[0])
		if clientIP != "" {
			return clientIP
		}
	}

	// Check X-Real-IP
	xRealIP := r.Header.Get("X-Real-IP")
	if xRealIP != "" {
		return xRealIP
	}

	// Fallback to RemoteAddr
	ip, _, _ := net.SplitHostPort(r.RemoteAddr)
	if ip == "" {
		return r.RemoteAddr
	}
	return ip
}
