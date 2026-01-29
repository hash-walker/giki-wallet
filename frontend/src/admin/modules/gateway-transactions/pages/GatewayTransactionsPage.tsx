import { useEffect } from 'react';
import { PageHeader, TableWrapper } from '../../../shared';
import { useGatewayTransactionStore } from '../store';
import { GatewayTransactionsTable } from '../components/GatewayTransactionsTable';

export const GatewayTransactionsPage = () => {
    const {
        transactions,
        isLoading,
        isUpdating,
        fetchTransactions,
        verifyTransaction
    } = useGatewayTransactionStore();

    useEffect(() => {
        fetchTransactions();
    }, [fetchTransactions]);

    const handleVerify = (txnRefNo: string) => {
        if (confirm('Are you sure you want to verify this transaction?')) {
            verifyTransaction(txnRefNo);
        }
    };

    return (
        <div className="space-y-6">
            <PageHeader
                title="Gateway Transactions"
                description="View and verify external top-up transactions"
            />

            <TableWrapper
                count={transactions.length}
                itemName="transaction"
                isLoading={isLoading}
            >
                <GatewayTransactionsTable
                    transactions={transactions}
                    onVerify={handleVerify}
                    isUpdating={isUpdating}
                />
            </TableWrapper>
        </div>
    );
};
