import { useState } from 'react';
import { Button } from '@/shared/components/ui/button';
import { Plus } from 'lucide-react';
import { UsersTable } from '../components/UsersTable';
import { UserFormModal } from '../components/UserFormModal';
import { User } from '../types';
import { toast } from '@/lib/toast';
import { Input } from '@/shared/components/ui/Input';
import { Select } from '@/shared/components/ui/Select';
import { PageHeader } from '../../shared/PageHeader';
import { TableWrapper } from '../../shared/TableWrapper';

export const UsersPage = () => {
    // Mock data - replace with API calls
    const [users, setUsers] = useState<User[]>([
        {
            id: 1,
            name: 'John Doe',
            email: 'john.doe@example.com',
            phone: '+92 300 1234567',
            role: 'student',
            isActive: true,
        },
        {
            id: 2,
            name: 'Jane Smith',
            email: 'jane.smith@example.com',
            phone: '+92 300 7654321',
            role: 'employee',
            isActive: true,
        },
        {
            id: 3,
            name: 'Admin User',
            email: 'admin@example.com',
            role: 'admin',
            isActive: true,
        },
    ]);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<User | undefined>();
    const [searchTerm, setSearchTerm] = useState('');
    const [filterRole, setFilterRole] = useState<string>('all');
    const [filterStatus, setFilterStatus] = useState<string>('all');

    const handleAddUser = () => {
        setEditingUser(undefined);
        setIsModalOpen(true);
    };

    const handleEditUser = (user: User) => {
        setEditingUser(user);
        setIsModalOpen(true);
    };

    const handleDeleteUser = (id: number) => {
        if (window.confirm('Are you sure you want to delete this user?')) {
            setUsers(users.filter(u => u.id !== id));
            toast.success('User deleted successfully');
        }
    };

    const handleToggleActive = (id: number) => {
        setUsers(users.map(u => 
            u.id === id ? { ...u, isActive: !u.isActive } : u
        ));
        const user = users.find(u => u.id === id);
        toast.success(user?.isActive ? 'User deactivated' : 'User activated');
    };

    const handleSubmitUser = (userData: Omit<User, 'id'>) => {
        if (editingUser) {
            setUsers(users.map(u => 
                u.id === editingUser.id 
                    ? { ...userData, id: editingUser.id }
                    : u
            ));
            toast.success('User updated successfully');
        } else {
            const newId = Math.max(...users.map(u => u.id), 0) + 1;
            setUsers([...users, { ...userData, id: newId }]);
            toast.success('User added successfully');
        }
        setIsModalOpen(false);
        setEditingUser(undefined);
    };

    // Filter users
    const filteredUsers = users.filter(user => {
        const matchesSearch = 
            user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (user.phone && user.phone.includes(searchTerm));
        
        const matchesRole = filterRole === 'all' || user.role === filterRole;
        const matchesStatus = filterStatus === 'all' || 
            (filterStatus === 'active' && user.isActive) ||
            (filterStatus === 'inactive' && !user.isActive);

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
            <TableWrapper count={filteredUsers.length} itemName="user">
                <UsersTable
                    users={filteredUsers}
                    onEdit={handleEditUser}
                    onDelete={handleDeleteUser}
                    onToggleActive={handleToggleActive}
                />
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
