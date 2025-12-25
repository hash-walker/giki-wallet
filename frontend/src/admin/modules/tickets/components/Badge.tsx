interface BadgeProps {
    status?: 'confirmed' | 'pending' | 'cancelled';
    category?: 'employee' | 'family' | 'student';
}

export const Badge = ({ status, category }: BadgeProps) => {
    if (status) {
        return <StatusBadge status={status} />;
    }

    if (category) {
        return <CategoryBadge category={category} />;
    }

    return null;
};

const StatusBadge = ({ status }: { status: 'confirmed' | 'pending' | 'cancelled' }) => {
    const styles = {
        confirmed: 'bg-green-100 text-green-800',
        pending: 'bg-yellow-100 text-yellow-800',
        cancelled: 'bg-red-100 text-red-800',
    };

    const labels = {
        confirmed: 'Confirmed',
        pending: 'Pending',
        cancelled: 'Cancelled',
    };

    return (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[status]}`}>
            {labels[status]}
        </span>
    );
};

const CategoryBadge = ({ category }: { category: 'employee' | 'family' | 'student' }) => {
    const styles = {
        employee: 'bg-blue-100 text-blue-800',
        family: 'bg-purple-100 text-purple-800',
        student: 'bg-green-100 text-green-800',
    };

    const labels = {
        employee: 'Employee',
        family: 'Family',
        student: 'Student',
    };

    return (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[category]}`}>
            {labels[category]}
        </span>
    );
};

