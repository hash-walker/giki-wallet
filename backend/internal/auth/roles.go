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

var AllowedRoles = map[string]bool{
	RoleSuperAdmin:     true,
	RoleTransportAdmin: true,
	RoleFinanceAdmin:   true,
	RoleStudent:        true,
	RoleEmployee:       true,
}
