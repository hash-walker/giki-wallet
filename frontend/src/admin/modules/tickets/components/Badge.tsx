interface BadgeProps {
    status?: 'CONFIRMED' | 'PENDING' | 'CANCELLED' | 'CANCELLED_BY_ADMIN' | 'DELETED' | 'Student' | 'Employee';
}

export const Badge = ({ status }: BadgeProps) => {
    if (!status) return null;

    const styles: Record<string, string> = {
        CONFIRMED: 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20',
        PENDING: 'bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-600/20',
        CANCELLED: 'bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-600/20',
        CANCELLED_BY_ADMIN: 'bg-orange-50 text-orange-700 ring-1 ring-inset ring-orange-600/20',
        DELETED: 'bg-gray-50 text-gray-700 ring-1 ring-inset ring-gray-500/10',
        Student: 'bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-700/10',
        Employee: 'bg-purple-50 text-purple-700 ring-1 ring-inset ring-purple-700/10',
    };

    const labels: Record<string, string> = {
        CONFIRMED: 'Confirmed',
        PENDING: 'Pending',
        CANCELLED: 'Cancelled (User)',
        CANCELLED_BY_ADMIN: 'Cancelled (Admin)',
        DELETED: 'Deleted',
        Student: 'Student',
        Employee: 'Employee',
    };

    const style = styles[status] || 'bg-gray-50 text-gray-600 ring-1 ring-inset ring-gray-500/10';
    const label = labels[status] || status;

    return (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${style}`}>
            {label}
        </span>
    );
};
