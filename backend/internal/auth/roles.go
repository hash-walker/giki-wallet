package auth

// Role constants defined in the system.
// These must match the 'user_type' column in giki_wallet.users table.
const (
	RoleSuperAdmin     = "SUPER_ADMIN"
	RoleTransportAdmin = "TRANSPORT_ADMIN"
	RoleFinanceAdmin   = "FINANCE_ADMIN"
	RoleStudent        = "STUDENT"
	RoleEmployee       = "EMPLOYEE"
)

// AllowedRoles is a map for quick validation if needed
var AllowedRoles = map[string]bool{
	RoleSuperAdmin:     true,
	RoleTransportAdmin: true,
	RoleFinanceAdmin:   true,
	RoleStudent:        true,
	RoleEmployee:       true,
}
