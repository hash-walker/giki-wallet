package auth

import (
	"crypto/sha256"
	"encoding/base64"
	"fmt"
	"strconv"
	"strings"

	"golang.org/x/crypto/pbkdf2"
)

// verifyDjangoPBKDF2 verifies a password against a Django-style PBKDF2-SHA256 hash.
// Format: pbkdf2_sha256$<iterations>$<salt>$<hash>
func verifyDjangoPBKDF2(password, encoded string) (bool, error) {
	parts := strings.Split(encoded, "$")
	if len(parts) != 4 {
		return false, fmt.Errorf("invalid hash format")
	}

	if parts[0] != "pbkdf2_sha256" {
		return false, fmt.Errorf("unsupported algorithm: %s", parts[0])
	}

	iterations, err := strconv.Atoi(parts[1])
	if err != nil {
		return false, fmt.Errorf("invalid iterations: %v", err)
	}

	salt := parts[2]
	expectedHash := parts[3]

	// PBKDF2 derivation
	hash := pbkdf2.Key([]byte(password), []byte(salt), iterations, sha256.Size, sha256.New)
	encodedHash := base64.StdEncoding.EncodeToString(hash)

	return encodedHash == expectedHash, nil
}
