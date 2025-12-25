import { User } from '../types';
import { Card } from '../../shared/Card';
import { ActionButtons } from '../../shared/ActionButtons';

interface UsersTableProps {
    users: User[];
    onEdit: (user: User) => void;
    onDelete: (id: number) => void;
    onToggleActive: (id: number) => void;
}

const getRoleBadge = (role: User['role']) => {
    const styles = {
        student: 'bg-blue-100 text-blue-800',
        employee: 'bg-green-100 text-green-800',
        admin: 'bg-purple-100 text-purple-800',
    };
    
    const labels = {
        student: 'Student',
        employee: 'Employee',
        admin: 'Admin',
    };

    return (
        <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[role]}`}>
            {labels[role]}
        </span>
    );
};

export const UsersTable = ({
    users,
    onEdit,
    onDelete,
    onToggleActive
}: UsersTableProps) => {
    if (users.length === 0) {
        return (
            <Card>
                <div className="text-center py-12">
                    <p className="text-gray-500">No users found. Add your first user to get started.</p>
                </div>
            </Card>
        );
    }

    return (
        <Card>
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead>
                        <tr className="border-b border-gray-200">
                            <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Name</th>
                            <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Email</th>
                            <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Phone</th>
                            <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Role</th>
                            <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Status</th>
                            <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {users.map((user) => (
                            <tr key={user.id} className="border-b border-gray-100 hover:bg-gray-50">
                                <td className="py-3 px-4">
                                    <span className="text-sm font-medium text-gray-900">{user.name}</span>
                                </td>
                                <td className="py-3 px-4">
                                    <span className="text-sm text-gray-600">{user.email}</span>
                                </td>
                                <td className="py-3 px-4">
                                    <span className="text-sm text-gray-600">{user.phone || 'N/A'}</span>
                                </td>
                                <td className="py-3 px-4">
                                    {getRoleBadge(user.role)}
                                </td>
                                <td className="py-3 px-4">
                                    {user.isActive ? (
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                            Active
                                        </span>
                                    ) : (
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                            Inactive
                                        </span>
                                    )}
                                </td>
                                <td className="py-3 px-4">
                                    <ActionButtons
                                        onEdit={() => onEdit(user)}
                                        onDelete={() => onDelete(user.id)}
                                        onToggle={() => onToggleActive(user.id)}
                                        isActive={user.isActive}
                                        showToggle={true}
                                        activeLabel="Deactivate"
                                        inactiveLabel="Activate"
                                    />
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </Card>
    );
};

