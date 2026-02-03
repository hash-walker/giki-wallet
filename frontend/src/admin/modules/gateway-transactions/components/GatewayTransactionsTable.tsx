import { GatewayTransaction } from '../schema';
import { Table } from '../../../shared';
import { Button } from '@/shared/components/ui/button';
import { CheckCircle, RotateCw, Eye } from 'lucide-react';
import { format } from 'date-fns';

interface GatewayTransactionsTableProps {
    transactions: GatewayTransaction[];
    onVerify: (txnRefNo: string) => void;
    onViewLogs: (txnRefNo: string) => void;
    isUpdating: boolean;
}

export const GatewayTransactionsTable = ({
    transactions,
    onVerify,
    onViewLogs,
    isUpdating
}: GatewayTransactionsTableProps) => {
    const headers = [
        { content: 'Txn Ref', align: 'left' as const },
        { content: 'User', align: 'left' as const },
        { content: 'Method', align: 'left' as const },
        { content: 'Amount', align: 'right' as const },
        { content: 'Status', align: 'left' as const },
        { content: 'Date', align: 'left' as const },
        { content: 'Actions', align: 'right' as const },
    ];

    const rows = transactions.map((txn) => ({
        key: txn.txn_ref_no,
        cells: [
            <span key="ref" className="font-mono text-sm">{txn.txn_ref_no}</span>,
            <div key="user" className="flex flex-col">
                <span className="text-sm font-medium text-gray-900">{txn.user_name}</span>
                <span className="text-xs text-gray-500">{txn.user_email}</span>
            </div>,
            <span key="method" className="text-sm capitalize">{txn.payment_method}</span>,
            <span key="amount" className="text-sm font-medium">
                {parseInt(txn.amount).toLocaleString()} G-Bux
            </span>,
            <StatusBadge key="status" status={txn.status} />,
            <span key="date" className="text-sm text-gray-500">
                {format(new Date(txn.created_at), 'MMM d, yyyy HH:mm')}
            </span>,
            <div key="actions" className="flex justify-end gap-2">
                <Button
                    size="sm"
                    variant="ghost"
                    className="text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                    onClick={() => onViewLogs(txn.txn_ref_no)}
                    title="View Logs"
                >
                    <Eye className="w-4 h-4" />
                </Button>
                {txn.status !== 'COMPLETED' && (
                    <Button
                        size="sm"
                        variant="ghost"
                        className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                        onClick={() => onVerify(txn.txn_ref_no)}
                        disabled={isUpdating}
                        title="Inquiry Status"
                    >
                        <RotateCw className={`w-4 h-4 mr-1 ${isUpdating ? 'animate-spin' : ''}`} />
                        Verify
                    </Button>
                )}
            </div>,
        ],
    }));

    return (
        <Table
            headers={headers}
            rows={rows}
            emptyMessage="No gateway transactions found."
        />
    );
};

const StatusBadge = ({ status }: { status: string }) => {
    const styles: Record<string, string> = {
        COMPLETED: 'bg-green-100 text-green-800',
        PENDING: 'bg-yellow-100 text-yellow-800',
        FAILED: 'bg-red-100 text-red-800',
        UNKNOWN: 'bg-gray-100 text-gray-800',
    };

    return (
        <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[status] || styles.UNKNOWN}`}>
            {status}
        </span>
    );
};
