import { useState, useMemo } from 'react';
import { PageHeader, TableWrapper } from '../../shared';
import { TransactionsTable } from '../components/TransactionsTable';
import { TransactionFilters } from '../components/TransactionFilters';
import { Transaction, TransactionCategory } from '../types';
import { Download, FileText } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';

export const TransactionsPage = () => {
    // Mock data - replace with API calls
    const [transactions] = useState<Transaction[]>([
        // Wallet Transactions
        {
            id: '1',
            category: 'wallet',
            type: 'topup',
            userId: 1,
            userName: 'John Doe',
            userEmail: 'john@example.com',
            amount: 500,
            timestamp: new Date().toISOString(),
            status: 'completed',
            paymentMethod: 'jazzcash',
        },
        {
            id: '2',
            category: 'wallet',
            type: 'transfer',
            userId: 1,
            userName: 'John Doe',
            userEmail: 'john@example.com',
            amount: -200,
            timestamp: new Date(Date.now() - 3600000).toISOString(),
            status: 'completed',
            recipientId: 2,
            recipientName: 'Jane Smith',
            recipientEmail: 'jane@example.com',
        },
        {
            id: '3',
            category: 'wallet',
            type: 'received',
            userId: 2,
            userName: 'Jane Smith',
            userEmail: 'jane@example.com',
            amount: 200,
            timestamp: new Date(Date.now() - 3600000).toISOString(),
            status: 'completed',
            senderId: 1,
            senderName: 'John Doe',
            senderEmail: 'john@example.com',
        },
        // Ticket Transactions
        {
            id: '4',
            category: 'ticket',
            type: 'purchase',
            userId: 1,
            userName: 'John Doe',
            userEmail: 'john@example.com',
            amount: -200,
            timestamp: new Date(Date.now() - 7200000).toISOString(),
            status: 'completed',
            ticketId: 'T001',
            ticketNumber: '1234',
            routeId: 1,
            routeName: 'GIKI to Peshawar',
            direction: 'to-giki',
            cityId: 'peshawar',
            cityName: 'Peshawar',
            stopId: 'pes_stop1',
            stopName: 'University Stop',
            travelDate: new Date(Date.now() + 86400000).toISOString(),
            passengerName: 'John Doe',
        },
        {
            id: '5',
            category: 'ticket',
            type: 'cancellation',
            userId: 2,
            userName: 'Jane Smith',
            userEmail: 'jane@example.com',
            amount: 150,
            timestamp: new Date(Date.now() - 10800000).toISOString(),
            status: 'completed',
            ticketId: 'T002',
            ticketNumber: '5678',
            routeId: 2,
            routeName: 'GIKI to Islamabad',
            direction: 'to-giki',
            cityId: 'islamabad',
            cityName: 'Islamabad',
            originalTransactionId: '4',
            refundAmount: 150,
        },
        {
            id: '6',
            category: 'ticket',
            type: 'refund',
            userId: 2,
            userName: 'Jane Smith',
            userEmail: 'jane@example.com',
            amount: 150,
            timestamp: new Date(Date.now() - 10800000).toISOString(),
            status: 'completed',
            ticketId: 'T002',
            ticketNumber: '5678',
            originalTransactionId: '5',
        },
    ]);

    const [searchTerm, setSearchTerm] = useState('');
    const [category, setCategory] = useState<TransactionCategory | 'all'>('all');
    const [type, setType] = useState<string>('all');
    const [status, setStatus] = useState<string>('all');

    const filteredTransactions = useMemo(() => {
        return transactions.filter((transaction) => {
            // Search filter
            const matchesSearch =
                transaction.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                transaction.userEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (transaction.category === 'ticket' &&
                    transaction.ticketNumber?.toLowerCase().includes(searchTerm.toLowerCase()));

            // Category filter
            const matchesCategory = category === 'all' || transaction.category === category;

            // Type filter
            const matchesType = type === 'all' || transaction.type === type;

            // Status filter
            const matchesStatus = status === 'all' || transaction.status === status;

            return matchesSearch && matchesCategory && matchesType && matchesStatus;
        });
    }, [transactions, searchTerm, category, type, status]);

    const handleExport = () => {
        // TODO: Implement export functionality
        console.log('Export transactions');
    };

    // Determine which category to show in table
    const tableCategory = category !== 'all' ? category : undefined;

    return (
        <div className="space-y-6">
            <PageHeader
                title="Transactions Management"
                description="View and manage all wallet and ticket transactions"
                action={
                    <Button variant="outline" onClick={handleExport}>
                        <Download className="w-4 h-4 mr-2" />
                        Export
                    </Button>
                }
            />

            {/* Filters */}
            <TransactionFilters
                searchTerm={searchTerm}
                onSearchChange={setSearchTerm}
                category={category}
                onCategoryChange={(value) => {
                    setCategory(value as TransactionCategory | 'all');
                    setType('all'); // Reset type when category changes
                }}
                type={type}
                onTypeChange={setType}
                status={status}
                onStatusChange={setStatus}
            />

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <SummaryCard
                    title="Total Transactions"
                    value={filteredTransactions.length}
                    icon={<FileText className="w-5 h-5" />}
                />
                <SummaryCard
                    title="Wallet Transactions"
                    value={filteredTransactions.filter(t => t.category === 'wallet').length}
                    icon={<FileText className="w-5 h-5" />}
                />
                <SummaryCard
                    title="Ticket Transactions"
                    value={filteredTransactions.filter(t => t.category === 'ticket').length}
                    icon={<FileText className="w-5 h-5" />}
                />
                <SummaryCard
                    title="Total Amount"
                    value={`RS ${filteredTransactions.reduce((sum, t) => sum + Math.abs(t.amount), 0).toLocaleString()}`}
                    icon={<FileText className="w-5 h-5" />}
                />
            </div>

            {/* Transactions Table */}
            <TableWrapper count={filteredTransactions.length} itemName="transaction">
                <TransactionsTable
                    transactions={filteredTransactions}
                    category={tableCategory}
                />
            </TableWrapper>
        </div>
    );
};

const SummaryCard = ({ title, value, icon }: { title: string; value: string | number; icon: React.ReactNode }) => {
    return (
        <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-sm text-gray-600">{title}</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
                </div>
                <div className="p-3 bg-blue-100 rounded-lg">
                    <div className="text-blue-600">{icon}</div>
                </div>
            </div>
        </div>
    );
};

