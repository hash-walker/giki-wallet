interface BadgeProps {
    status?: 'CONFIRMED' | 'PENDING' | 'CANCELLED' | 'DELETED' | 'Student' | 'Employee';
}

export const Badge = ({ status }: BadgeProps) => {
    if (!status) return null;

    const styles: Record<string, string> = {
        CONFIRMED: 'bg-green-100 text-green-800',
        PENDING: 'bg-yellow-100 text-yellow-800',
        CANCELLED: 'bg-red-100 text-red-800',
        DELETED: 'bg-gray-100 text-gray-800',
        Student: 'bg-blue-100 text-blue-800',
        Employee: 'bg-purple-100 text-purple-800',
    };

    const labels: Record<string, string> = {
        CONFIRMED: 'Confirmed',
        PENDING: 'Pending',
        CANCELLED: 'Cancelled',
        DELETED: 'Deleted',
        Student: 'Student',
        Employee: 'Employee',
    };

    const style = styles[status] || 'bg-gray-100 text-gray-800';
    const label = labels[status] || status;

    return (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${style}`}>
            {label}
        </span>
    );
};
