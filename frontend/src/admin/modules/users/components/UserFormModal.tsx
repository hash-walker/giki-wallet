/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useEffect } from 'react';
import { Modal } from '@/shared/components/ui/Modal';
import { Input } from '@/shared/components/ui/Input';
import { Button } from '@/shared/components/ui/button';
import { Select } from '@/shared/components/ui/Select';
import { User } from '../schema';

interface UserFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (user: Partial<User>) => void;
    user?: User;
}

export const UserFormModal = ({
    isOpen,
    onClose,
    onSubmit,
    user
}: UserFormModalProps) => {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [role, setRole] = useState('STUDENT');
    const [regId, setRegId] = useState('');
    const [batchYear, setBatchYear] = useState('');
    const [isActive, setIsActive] = useState(true);

    useEffect(() => {
        if (user) {
            setName(user.name);
            setEmail(user.email);
            setPhone(user.phone_number || '');
            setRole(user.user_type);
            setIsActive(user.is_active);
            setRegId(''); // We don't fetch profile details in the list usually, but can be added if needed
            setBatchYear('');
        } else {
            setName('');
            setEmail('');
            setPhone('');
            setRole('STUDENT');
            setRegId('');
            setBatchYear('');
            setIsActive(true);
        }
    }, [user, isOpen]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (!name || !email) {
            alert('Name and email are required');
            return;
        }

        onSubmit({
            name,
            email,
            phone_number: phone || undefined,
            user_type: role,
            is_active: isActive,
            // Pass extra fields for student creation
            ...(role === 'STUDENT' ? {
                reg_id: regId,
                batch_year: batchYear ? parseInt(batchYear) : undefined
            } : {})
        } as any);
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={user ? 'Edit User' : 'Add New User'}
            size="md"
            footer={
                <div className="flex gap-3 justify-end">
                    <Button variant="outline" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button onClick={handleSubmit}>
                        {user ? 'Update User' : 'Add User'}
                    </Button>
                </div>
            }
        >
            <form onSubmit={handleSubmit} className="space-y-4">
                <Input
                    label="Name *"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter full name"
                    required
                />

                <Input
                    label="Email *"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter email address"
                    required
                />

                <Input
                    label="Phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Enter phone number"
                />

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Role *
                    </label>
                    <Select
                        value={role}
                        onChange={(value) => setRole(value)}
                        options={[
                            { value: 'STUDENT', label: 'Student' },
                            { value: 'EMPLOYEE', label: 'Employee' },
                            { value: 'TRANSPORT_ADMIN', label: 'Admin' },
                        ]}
                        placeholder="Select role"
                    />
                </div>

                {role === 'STUDENT' && (
                    <div className="grid grid-cols-2 gap-4">
                        <Input
                            label="Registration ID *"
                            value={regId}
                            onChange={(e) => setRegId(e.target.value)}
                            placeholder="e.g. 2022001"
                            required={!user}
                        />
                        <Input
                            label="Batch Year *"
                            type="number"
                            value={batchYear}
                            onChange={(e) => setBatchYear(e.target.value)}
                            placeholder="e.g. 2022"
                            required={!user}
                        />
                    </div>
                )}

                <div className="flex items-center gap-2">
                    <input
                        type="checkbox"
                        id="isActive"
                        checked={isActive}
                        onChange={(e) => setIsActive(e.target.checked)}
                        className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                    />
                    <label htmlFor="isActive" className="text-sm font-medium text-gray-700 cursor-pointer">
                        Active (User can access the system)
                    </label>
                </div>
            </form>
        </Modal>
    );
};

