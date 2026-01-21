package wallet

type TransactionCategory string

const (
	JazzcashDeposit TransactionCategory = "JAZZCASH_DEPOSIT"
	TicketPurchase  TransactionCategory = "TICKET_PURCHASE"
	REFUND          TransactionCategory = "REFUND"
)
