package config

import (
	"log"
	"os"
)

type Config struct {
	Database DatabaseConfig
	Server   ServerConfig
	Jazzcash JazzcashConfig
	Mailer   GraphSenderConfig
}

type DatabaseConfig struct {
	dbURL string
}

type ServerConfig struct {
	Port string
}

type JazzcashConfig struct {
	MerchantID       string
	Password         string
	IntegritySalt    string
	MerchantMPIN     string
	CardCallbackURL  string
	BaseURL          string
	WalletPaymentURl string
	CardPaymentURL   string
	StatusInquiryURL string
}

type GraphSenderConfig struct {
	ClientID     string
	TenantID     string
	ClientSecret string
	SenderEmail  string
}

func LoadConfig() *Config {
	cfg := &Config{
		Database: DatabaseConfig{
			dbURL: getRequiredEnv("DB_URL"),
		},
		Server: ServerConfig{
			Port: getEnvWithDefault("PORT", "8080"),
		},
		Jazzcash: JazzcashConfig{
			MerchantID:       getRequiredEnv("JAZZCASH_MERCHANT_ID"),
			Password:         getRequiredEnv("JAZZCASH_PASSWORD"),
			IntegritySalt:    getRequiredEnv("JAZZCASH_INTEGRITY_SALT"),
			MerchantMPIN:     getRequiredEnv("JAZZCASH_MERCHANT_MPIN"),
			CardCallbackURL:  getRequiredEnv("JAZZCASH_RETURN_URL"),
			BaseURL:          getRequiredEnv("JAZZCASH_BASE_URL"),
			WalletPaymentURl: getRequiredEnv("JAZZCASH_WALLET_PAYMENT_URL"),
			CardPaymentURL:   getRequiredEnv("JAZZCASH_CARD_PAYMENT_URL"),
			StatusInquiryURL: getRequiredEnv("JAZZCASH_STATUS_INQUIRY_URL"),
		},

		Mailer: GraphSenderConfig{
			ClientID:     getRequiredEnv("MS_GRAPH_CLIENT_ID"),
			TenantID:     getRequiredEnv("MS_GRAPH_TENANT_ID"),
			ClientSecret: getRequiredEnv("MS_GRAPH_CLIENT_SECRET"),
			SenderEmail:  getRequiredEnv("MS_GRAPH_SENDER_EMAIL"),
		},
	}

	return cfg
}

func getRequiredEnv(key string) string {
	value := os.Getenv(key)
	if value == "" {
		log.Fatalf("Required environment variable %s is not set", key)
	}
	return value
}

func getEnvWithDefault(key, defaultValue string) string {
	value := os.Getenv(key)
	if value == "" {
		return defaultValue
	}
	return value
}
