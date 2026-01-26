import { TransactionCategory } from '../../transactions/types';

interface BadgeProps {
    type: 'busType' | 'status' | 'ticketStatus' | 'ticketCategory' | 'transactionType' | 'transactionStatus';
    value: string;
    category?: TransactionCategory;
}

export const Badge = ({ type, value, category }: BadgeProps) => {
    if (type === 'busType') {
        const styles = {
            Student: 'bg-accent/10 text-accent',
            Employee: 'bg-primary/10 text-primary',
        };
        return (
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[value as keyof typeof styles] || 'bg-gray-100 text-gray-800'}`}>
                {value}
            </span>
        );
    }

    if (type === 'status') {
        const styles = {
            held: 'bg-yellow-100 text-yellow-800',
            live: 'bg-accent/10 text-accent',
        };
        return (
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[value as keyof typeof styles] || 'bg-gray-100 text-gray-800'}`}>
                {value === 'held' ? 'Held' : 'Live'}
            </span>
        );
    }

    if (type === 'ticketStatus') {
        const styles = {
            confirmed: 'bg-accent/10 text-accent',
            pending: 'bg-yellow-100 text-yellow-800',
            cancelled: 'bg-destructive/10 text-destructive',
        };
        return (
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[value as keyof typeof styles] || 'bg-gray-100 text-gray-800'}`}>
                {value.charAt(0).toUpperCase() + value.slice(1)}
            </span>
        );
    }

    if (type === 'ticketCategory') {
        const styles = {
            employee: 'bg-primary/10 text-primary',
            family: 'bg-purple-100 text-purple-800',
            student: 'bg-accent/10 text-accent',
        };
        return (
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[value as keyof typeof styles] || 'bg-gray-100 text-gray-800'}`}>
                {value.charAt(0).toUpperCase() + value.slice(1)}
            </span>
        );
    }

    if (type === 'transactionType') {
        const getLabel = () => {
            if (category === 'wallet') {
                switch (value) {
                    case 'topup':
                        return 'Top Up';
                    case 'transfer':
                        return 'Transfer';
                    case 'received':
                        return 'Received';
                    default:
                        return value;
                }
            } else {
                switch (value) {
                    case 'purchase':
                        return 'Purchase';
                    case 'cancellation':
                        return 'Cancellation';
                    case 'refund':
                        return 'Refund';
                    default:
                        return value;
                }
            }
        };

        const getStyles = () => {
            if (category === 'wallet') {
                switch (value) {
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
                switch (value) {
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
    }

    if (type === 'transactionStatus') {
        const styles = {
            completed: 'bg-accent/10 text-accent',
            pending: 'bg-yellow-100 text-yellow-800',
            failed: 'bg-destructive/10 text-destructive',
        };
        return (
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[value as keyof typeof styles] || 'bg-gray-100 text-gray-800'}`}>
                {value.charAt(0).toUpperCase() + value.slice(1)}
            </span>
        );
    }

    return null;
};

