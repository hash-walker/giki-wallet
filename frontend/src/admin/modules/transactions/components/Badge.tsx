import { TransactionType, TransactionCategory } from '../types';

interface BadgeProps {
    type?: TransactionType;
    category?: TransactionCategory;
    status?: 'completed' | 'pending' | 'failed';
}

export const Badge = ({ type, category, status }: BadgeProps) => {
    if (status) {
        return <StatusBadge status={status} />;
    }

    if (type && category) {
        return <TypeBadge type={type} category={category} />;
    }

    return null;
};

const StatusBadge = ({ status }: { status: 'completed' | 'pending' | 'failed' }) => {
    const styles = {
        completed: 'bg-accent/10 text-accent',
        pending: 'bg-yellow-100 text-yellow-800',
        failed: 'bg-destructive/10 text-destructive',
    };

    return (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[status]}`}>
            {status.charAt(0).toUpperCase() + status.slice(1)}
        </span>
    );
};

const TypeBadge = ({ type, category }: { type: TransactionType; category: TransactionCategory }) => {
    const getLabel = () => {
        if (category === 'wallet') {
            switch (type) {
                case 'topup':
                    return 'Top Up';
                case 'transfer':
                    return 'Transfer';
                case 'received':
                    return 'Received';
                default:
                    return type;
            }
        } else {
            switch (type) {
                case 'purchase':
                    return 'Purchase';
                case 'cancellation':
                    return 'Cancellation';
                case 'refund':
                    return 'Refund';
                default:
                    return type;
            }
        }
    };

    const getStyles = () => {
        if (category === 'wallet') {
            switch (type) {
                case 'topup':
                    return 'bg-accent/10 text-accent';
                case 'transfer':
                    return 'bg-primary/10 text-primary';
                case 'received':
                    return 'bg-accent/10 text-accent';
                default:
                    return 'bg-gray-100 text-gray-800';
            }
        } else {
            switch (type) {
                case 'purchase':
                    return 'bg-primary/10 text-primary';
                case 'cancellation':
                    return 'bg-orange-100 text-orange-800';
                case 'refund':
                    return 'bg-accent/10 text-accent';
                default:
                    return 'bg-gray-100 text-gray-800';
            }
        }
    };

    return (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStyles()}`}>
            {getLabel()}
        </span>
    );
};

