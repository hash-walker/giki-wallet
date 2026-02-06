package mailer

import (
	"bytes"
	"embed"
	"encoding/json"
	"fmt"
	"html/template"
	"log"
	"net/http"
	"strings"
	"time"
)

//go:embed templates/*.html
var templateFS embed.FS

type GraphSender struct {
	ClientID     string
	TenantID     string
	ClientSecret string
	SenderEmail  string
	httpClient   *http.Client
}

func NewGraphSender(clientID, tenantID, clientSecret, senderEmail string) *GraphSender {
	return &GraphSender{
		ClientID:     clientID,
		TenantID:     tenantID,
		ClientSecret: clientSecret,
		SenderEmail:  senderEmail,
		httpClient:   &http.Client{Timeout: 30 * time.Second},
	}
}

func (g *GraphSender) SendTemplate(to, subject, templateName string, data interface{}) error {
	log.Printf("[MAILER] Parsing templates for %s", templateName)

	tmpl := template.New("mail")
	_, err := tmpl.ParseFS(templateFS, "templates/base.html", "templates/"+templateName)
	if err != nil {
		return fmt.Errorf("failed to parse templates: %w", err)
	}

	// Debug: list all templates in the set
	var names []string
	for _, t := range tmpl.Templates() {
		names = append(names, t.Name())
	}
	log.Printf("[MAILER] Templates in set: %s", strings.Join(names, ", "))

	var body bytes.Buffer

	// Render HTML - execute the "base" template which includes our specific template
	if err := tmpl.ExecuteTemplate(&body, "base", data); err != nil {
		return fmt.Errorf("failed to render template %s: %w", templateName, err)
	}

	// Call the low-level Send method
	return g.Send(to, subject, body.String())
}

func (g *GraphSender) Send(to, subject, htmlBody string) error {
	// get Access Token
	token, err := g.getAccessToken()

	if err != nil {
		return fmt.Errorf("failed to get graph token: %w", err)
	}

	// prepare Payload
	payload := graphEmailPayload{
		SaveToSentItems: false,

		Message: graphMessage{
			Subject: subject,
			Body: graphBody{
				ContentType: "HTML",
				Content:     htmlBody,
			},

			ToRecipients: []graphRecipient{
				{
					EmailAddress: graphEmailAddress{Address: to},
				},
			},
		},
	}

	jsonBytes, err := json.Marshal(payload)
	if err != nil {
		return fmt.Errorf("failed to marshal payload: %w", err)
	}

	// 3end Request

	url := fmt.Sprintf("https://graph.microsoft.com/v1.0/users/%s/sendMail", g.SenderEmail)

	req, err := http.NewRequest("POST", url, bytes.NewBuffer(jsonBytes))
	if err != nil {
		return err
	}

	req.Header.Set("Authorization", "Bearer "+token)
	req.Header.Set("Content-Type", "application/json")

	resp, err := g.httpClient.Do(req)

	if err != nil {
		return fmt.Errorf("graph api call failed: %w", err)
	}

	defer resp.Body.Close()

	if resp.StatusCode != http.StatusAccepted {
		return fmt.Errorf("graph api returned status: %d", resp.StatusCode)
	}

	return nil
}

// getAccessToken fetches a fresh token.
// Note: In production, you should wrap this in a cached struct that checks expiration.
func (g *GraphSender) getAccessToken() (string, error) {

	url := fmt.Sprintf("https://login.microsoftonline.com/%s/oauth2/v2.0/token", g.TenantID)

	// Prepare Form Data
	data := fmt.Sprintf(
		"grant_type=client_credentials&client_id=%s&client_secret=%s&scope=https://graph.microsoft.com/.default",
		g.ClientID, g.ClientSecret,
	)

	req, err := http.NewRequest("POST", url, strings.NewReader(data))
	if err != nil {
		return "", err
	}

	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")

	resp, err := g.httpClient.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("token fetch failed with status: %d", resp.StatusCode)
	}

	// Decode response
	var result struct {
		AccessToken string `json:"access_token"`
		ExpiresIn   int    `json:"expires_in"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return "", err
	}

	return result.AccessToken, nil
}
