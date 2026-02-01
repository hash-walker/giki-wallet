import { useState, useEffect } from 'react';
import { Button } from '@/shared/components/ui/button';
import { Plus } from 'lucide-react';
import { UsersTable } from '../components/UsersTable';
import { UserFormModal } from '../components/UserFormModal';
import { User } from '../schema';
import { Input } from '@/shared/components/ui/Input';
import { Select } from '@/shared/components/ui/Select';
import { PageHeader, TableWrapper } from '../../../shared';
import { useUserStore } from '../store';
import { PaginationControl } from '@/admin/shared/components/PaginationControl';

export const UsersPage = () => {
    const { users, isLoading, fetchUsers, toggleUserStatus, pagination } = useUserStore();

    const totalPages = Math.ceil(pagination.totalCount / pagination.pageSize);

    const handlePageChange = (page: number) => {
        fetchUsers(page);
    };

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<User | undefined>();
    const [searchTerm, setSearchTerm] = useState('');
    const [filterRole, setFilterRole] = useState<string>('all');
    const [filterStatus, setFilterStatus] = useState<string>('all');

    useEffect(() => {
        fetchUsers(1);
    }, [fetchUsers]);

    const handleAddUser = () => {
        setEditingUser(undefined);
        setIsModalOpen(true);
    };

    const handleEditUser = (user: User) => {
        setEditingUser(user);
        setIsModalOpen(true);
    };

    const handleDeleteUser = (id: string) => {
        if (window.confirm('Are you sure you want to delete this user?')) {
            // TODO: Implement delete in backend if needed
            console.log('Delete user', id);
        }
    };

    const handleToggleActive = (id: string) => {
        const user = users.find(u => u.id === id);
        if (user) {
            toggleUserStatus(id, user.is_active);
        }
    };

    const handleSubmitUser = (userData: Partial<User>) => {
        // TODO: Implement Create/Update in store/service
        console.log('Submit user', userData);
        setIsModalOpen(false);
        setEditingUser(undefined);
    };

    // Filter users
    const filteredUsers = users.filter(user => {
        const matchesSearch =
            user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (user.phone_number && user.phone_number.includes(searchTerm));

        const matchesRole = filterRole === 'all' || user.user_type === filterRole;
        const matchesStatus = filterStatus === 'all' ||
            (filterStatus === 'active' && user.is_active) ||
            (filterStatus === 'inactive' && !user.is_active);

        return matchesSearch && matchesRole && matchesStatus;
    });

    return (
        <div className="space-y-6">
            <PageHeader
                title="Users Management"
                description="Manage users and their permissions"
                action={
                    <Button onClick={handleAddUser}>
                        <Plus className="w-4 h-4 mr-2" />
                        Add User
                    </Button>
                }
            />

            {/* Filters */}
            <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                    <Input
                        placeholder="Search by name, email, or phone..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full"
                    />
                </div>
                <div className="w-full md:w-48">
                    <Select
                        value={filterRole}
                        onChange={(value) => setFilterRole(value)}
                        options={[
                            { value: 'all', label: 'All Roles' },
                            { value: 'student', label: 'Student' },
                            { value: 'employee', label: 'Employee' },
                            { value: 'admin', label: 'Admin' },
                        ]}
                        placeholder="Filter by role"
                    />
                </div>
                <div className="w-full md:w-48">
                    <Select
                        value={filterStatus}
                        onChange={(value) => setFilterStatus(value)}
                        options={[
                            { value: 'all', label: 'All Status' },
                            { value: 'active', label: 'Active' },
                            { value: 'inactive', label: 'Inactive' },
                        ]}
                        placeholder="Filter by status"
                    />
                </div>
            </div>

            {/* Users Table */}
            <TableWrapper count={pagination.totalCount} itemName="user" isLoading={isLoading}>
                <div className="flex flex-col">
                    <div className="p-4 border-b">
                        <PaginationControl
                            currentPage={pagination.page}
                            totalPages={totalPages}
                            onPageChange={handlePageChange}
                        />
                    </div>
                    <UsersTable
                        users={filteredUsers}
                        onEdit={handleEditUser}
                        onDelete={handleDeleteUser}
                        onToggleActive={handleToggleActive}
                    />
                </div>
            </TableWrapper>

            {/* User Form Modal */}
            <UserFormModal
                isOpen={isModalOpen}
                onClose={() => {
                    setIsModalOpen(false);
                    setEditingUser(undefined);
                }}
                onSubmit={handleSubmitUser}
                user={editingUser}
            />
        </div>
    );
};
