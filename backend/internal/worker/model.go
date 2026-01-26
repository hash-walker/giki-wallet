package worker

type UserData struct {
	Email string `json:"email"`
	Name  string `json:"name"`
	Link  string `json:"link"`
}

type StudentVerifyPayload struct {
	Email string `json:"email"`
	Name  string `json:"name"`
	Link  string `json:"link"`
}

type EmployeeWaitPayload struct {
	Email string `json:"email"`
	Name  string `json:"name"`
}

type EmployeeApprovedPayload struct {
	Email string `json:"email"`
	Name  string `json:"name"`
}
