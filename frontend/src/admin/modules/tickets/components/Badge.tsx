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
        confirmed: 'bg-accent/10 text-accent',
        pending: 'bg-yellow-100 text-yellow-800',
        cancelled: 'bg-destructive/10 text-destructive',
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
        employee: 'bg-primary/10 text-primary',
        family: 'bg-purple-100 text-purple-800',
        student: 'bg-accent/10 text-accent',
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

