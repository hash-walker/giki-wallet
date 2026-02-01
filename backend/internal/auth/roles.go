package auth

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
