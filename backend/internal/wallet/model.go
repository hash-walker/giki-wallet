package wallet

type SystemWalletType string

const (
	SystemWalletRevenue   SystemWalletType = "_SYS_REVENUE"  // Where ticket money goes
	SystemWalletLiability SystemWalletType = "SYS_LIABILITY" // Where top-up money comes from
)

type SystemWalletName string

const (
	TransportSystemWallet SystemWalletName = "Transport Revenue"
	GikiWallet            SystemWalletName = "GIKI Wallet"
)
