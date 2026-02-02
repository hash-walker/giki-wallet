import { User } from '../schema';
import { Table, ActionButtons } from '../../../shared';
import { Button } from '@/shared/components/ui/button';
import { CheckCircle2, XCircle } from 'lucide-react';

interface UsersTableProps {
    users: User[];
    onEdit: (user: User) => void;
    onDelete: (id: string) => void;
    onToggleActive: (id: string) => void;
    onApprove: (id: string) => void;
    onReject: (id: string) => void;
}

const getRoleBadge = (role: string) => {
    // Standardize input for robustness, but map keys should match expected uppercase
    const roleUpper = role.toUpperCase();
    const styles: Record<string, string> = {
        STUDENT: 'bg-blue-100 text-blue-800',
        EMPLOYEE: 'bg-green-100 text-green-800',
        ADMIN: 'bg-purple-100 text-purple-800',
        TRANSPORT_ADMIN: 'bg-purple-100 text-purple-800',
        FINANCE_ADMIN: 'bg-purple-100 text-purple-800',
        SUPER_ADMIN: 'bg-purple-100 text-purple-800',
    };

    const labels: Record<string, string> = {
        STUDENT: 'Student',
        EMPLOYEE: 'Employee',
        TRANSPORT_ADMIN: 'Transport Admin',
        FINANCE_ADMIN: 'Finance Admin',
        SUPER_ADMIN: 'Super Admin',
        ADMIN: 'Admin',
    };

    return (
        <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[roleUpper] || 'bg-gray-100 text-gray-800'}`}>
            {labels[roleUpper] || role}
        </span>
    );
};

export const UsersTable = ({
    users,
    onEdit,
    onDelete,
    onToggleActive,
    onApprove,
    onReject
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
            <div key="actions" className="flex items-center justify-end gap-2">
                {user.user_type === 'EMPLOYEE' && !user.is_verified && (
                    <div className="flex items-center border-r pr-2 mr-1 gap-1">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50"
                            onClick={() => onApprove(user.id)}
                            title="Approve Employee"
                        >
                            <CheckCircle2 className="w-4 h-4" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={() => onReject(user.id)}
                            title="Reject Employee"
                        >
                            <XCircle className="w-4 h-4" />
                        </Button>
                    </div>
                )}
                <ActionButtons
                    onEdit={() => onEdit(user)}
                    onDelete={() => onDelete(user.id)}
                    onToggle={() => onToggleActive(user.id)}
                    isActive={user.is_active}
                    showToggle={true}
                    activeLabel="Deactivate"
                    inactiveLabel="Activate"
                />
            </div>,
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

