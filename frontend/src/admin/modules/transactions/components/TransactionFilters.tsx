import { Input } from '@/shared/components/ui/Input';
import { Select } from '@/shared/components/ui/Select';
import { TransactionCategory, TransactionType } from '../types';

interface TransactionFiltersProps {
    searchTerm: string;
    onSearchChange: (value: string) => void;
    category: TransactionCategory | 'all';
    onCategoryChange: (value: string) => void;
    type: string;
    onTypeChange: (value: string) => void;
    status: string;
    onStatusChange: (value: string) => void;
}

export const TransactionFilters = ({
    searchTerm,
    onSearchChange,
    category,
    onCategoryChange,
    type,
    onTypeChange,
    status,
    onStatusChange,
}: TransactionFiltersProps) => {
    const getTypeOptions = () => {
        if (category === 'wallet') {
            return [
                { value: 'all', label: 'All Types' },
                { value: 'topup', label: 'Top Up' },
                { value: 'transfer', label: 'Transfer' },
                { value: 'received', label: 'Received' },
            ];
        } else if (category === 'ticket') {
            return [
                { value: 'all', label: 'All Types' },
                { value: 'purchase', label: 'Purchase' },
                { value: 'cancellation', label: 'Cancellation' },
                { value: 'refund', label: 'Refund' },
            ];
        }
        return [
            { value: 'all', label: 'All Types' },
            { value: 'topup', label: 'Top Up' },
            { value: 'transfer', label: 'Transfer' },
            { value: 'received', label: 'Received' },
            { value: 'purchase', label: 'Purchase' },
            { value: 'cancellation', label: 'Cancellation' },
            { value: 'refund', label: 'Refund' },
        ];
    };

    return (
        <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
                <Input
                    placeholder="Search by user name, email, ticket number..."
                    value={searchTerm}
                    onChange={(e) => onSearchChange(e.target.value)}
                    className="w-full"
                />
            </div>
            <div className="w-full md:w-48">
                <Select
                    value={category}
                    onChange={(value) => onCategoryChange(value)}
                    options={[
                        { value: 'all', label: 'All Categories' },
                        { value: 'wallet', label: 'Wallet' },
                        { value: 'ticket', label: 'Ticket' },
                    ]}
                    placeholder="Category"
                />
            </div>
            <div className="w-full md:w-48">
                <Select
                    value={type}
                    onChange={(value) => onTypeChange(value)}
                    options={getTypeOptions()}
                    placeholder="Type"
                />
            </div>
            <div className="w-full md:w-48">
                <Select
                    value={status}
                    onChange={(value) => onStatusChange(value)}
                    options={[
                        { value: 'all', label: 'All Statuses' },
                        { value: 'completed', label: 'Completed' },
                        { value: 'pending', label: 'Pending' },
                        { value: 'failed', label: 'Failed' },
                    ]}
                    placeholder="Status"
                />
            </div>
        </div>
    );
};

