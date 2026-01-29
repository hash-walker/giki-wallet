import { User } from '../schema';
import { Table, ActionButtons } from '../../../shared';

interface UsersTableProps {
    users: User[];
    onEdit: (user: User) => void;
    onDelete: (id: string) => void;
    onToggleActive: (id: string) => void;
}

const getRoleBadge = (role: string) => {
    const roleLower = role.toLowerCase();
    const styles: Record<string, string> = {
        student: 'bg-blue-100 text-blue-800',
        employee: 'bg-green-100 text-green-800',
        admin: 'bg-purple-100 text-purple-800',
    };

    const labels: Record<string, string> = {
        student: 'Student',
        employee: 'Employee',
        admin: 'Admin',
    };

    return (
        <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[roleLower] || 'bg-gray-100 text-gray-800'}`}>
            {labels[roleLower] || role}
        </span>
    );
};

export const UsersTable = ({
    users,
    onEdit,
    onDelete,
    onToggleActive
}: UsersTableProps) => {
    const headers = [
        { content: 'Name', align: 'left' as const },
        { content: 'Email', align: 'left' as const },
        { content: 'Phone', align: 'left' as const },
        { content: 'Role', align: 'left' as const },
        { content: 'Status', align: 'left' as const },
        { content: 'Actions', align: 'right' as const },
    ];

    const rows = users.map((user) => ({
        key: user.id,
        cells: [
            <span key="name" className="text-sm font-medium text-gray-900">{user.name}</span>,
            <span key="email" className="text-sm text-gray-600">{user.email}</span>,
            <span key="phone" className="text-sm text-gray-600">{user.phone_number || 'N/A'}</span>,
            getRoleBadge(user.user_type),
            user.is_active ? (
                <span key="status-active" className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    Active
                </span>
            ) : (
                <span key="status-inactive" className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                    Inactive
                </span>
            ),
            <ActionButtons
                key="actions"
                onEdit={() => onEdit(user)}
                onDelete={() => onDelete(user.id)}
                onToggle={() => onToggleActive(user.id)}
                isActive={user.is_active}
                showToggle={true}
                activeLabel="Deactivate"
                inactiveLabel="Activate"
            />,
        ],
    }));

    return (
        <Table
            headers={headers}
            rows={rows}
            emptyMessage="No users found. Add your first user to get started."
        />
    );
};

