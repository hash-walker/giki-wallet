package mailer

// ---------------------------------------------------------
// Internal Structs for JSON Marshaling
// ---------------------------------------------------------

type graphEmailPayload struct {
	Message         graphMessage `json:"message"`
	SaveToSentItems bool         `json:"saveToSentItems"`
}

type graphMessage struct {
	Subject      string           `json:"subject"`
	Body         graphBody        `json:"body"`
	ToRecipients []graphRecipient `json:"toRecipients"`
}

type graphBody struct {
	ContentType string `json:"contentType"`
	Content     string `json:"content"`
}

type graphRecipient struct {
	EmailAddress graphEmailAddress `json:"emailAddress"`
}

type graphEmailAddress struct {
	Address string `json:"address"`
}
