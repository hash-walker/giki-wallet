import { useState, useEffect } from 'react';
import { User, Mail, Phone, GraduationCap } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Modal } from '@/shared/components/ui/Modal';
import { Input } from '@/shared/components/ui/Input';
import { toast } from '@/lib/toast';

type UserType = 'student' | 'employee';

interface UserAccount {
    name: string;
    email: string;
    phoneNumber?: string;
    regNo?: string; // For students only
    userType: UserType;
}

interface MyAccountModalProps {
    isOpen: boolean;
    onClose: () => void;
    userAccount?: UserAccount;
}

export const MyAccountModal = ({ 
    isOpen, 
    onClose,
    userAccount 
}: MyAccountModalProps) => {
    // Mock user data - replace with actual user data from auth context
    const defaultUser: UserAccount = {
        name: 'John Doe',
        email: 'john.doe@giki.edu.pk',
        phoneNumber: undefined, // Missing phone number to test prompt
        regNo: '2021-CS-123', // Student reg number
        userType: 'student'
    };

    const [currentUser, setCurrentUser] = useState<UserAccount>(userAccount || defaultUser);
    const [phoneNumber, setPhoneNumber] = useState(currentUser.phoneNumber || '');
    const [isEditingPhone, setIsEditingPhone] = useState(!currentUser.phoneNumber);
    const [isSaving, setIsSaving] = useState(false);

    // Update state when userAccount prop changes
    useEffect(() => {
        if (userAccount) {
            setCurrentUser(userAccount);
            setPhoneNumber(userAccount.phoneNumber || '');
            setIsEditingPhone(!userAccount.phoneNumber);
        }
    }, [userAccount]);

    const hasPhoneNumber = currentUser.phoneNumber || phoneNumber;
    const showPhonePrompt = !hasPhoneNumber && !isEditingPhone;

    const handleSavePhone = async () => {
        if (!phoneNumber.trim()) {
            toast.error('Please enter a valid phone number');
            return;
        }

        // Validate phone number format (basic validation)
        const phoneRegex = /^[0-9]{10,11}$/;
        if (!phoneRegex.test(phoneNumber.replace(/[\s-]/g, ''))) {
            toast.error('Please enter a valid phone number (10-11 digits)');
            return;
        }

        setIsSaving(true);
        try {
            // TODO: API call to update phone number
            console.log('Updating phone number:', phoneNumber);
            await new Promise(resolve => setTimeout(resolve, 1000));
            toast.success('Phone number updated successfully');
            setIsEditingPhone(false);
            // Update current user state
            setCurrentUser(prev => ({ ...prev, phoneNumber }));
        } catch (error) {
            console.error('Error updating phone number:', error);
            toast.error('Failed to update phone number. Please try again.');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="My Account"
        >
                    {/* Phone Number Prompt (if missing) */}
                    {showPhonePrompt && (
                        <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                            <div className="flex items-start gap-3">
                                <Phone className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                                <div className="flex-1">
                                    <h3 className="text-sm font-semibold text-yellow-900 mb-1">
                                        Phone Number Required
                                    </h3>
                                    <p className="text-sm text-yellow-700 mb-3">
                                        Please add your phone number to complete your profile.
                                    </p>
                                    <Button
                                        onClick={() => setIsEditingPhone(true)}
                                        className="bg-yellow-600 hover:bg-yellow-700 text-white text-sm"
                                    >
                                        Add Phone Number
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Phone Number Form (when editing) */}
                    {isEditingPhone && (
                        <div className="mb-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
                            <label htmlFor="phone" className="text-sm font-semibold text-gray-700 mb-2 block">
                                Phone Number
                            </label>
                            <div className="flex gap-2">
                                <Input
                                    id="phone"
                                    type="tel"
                                    value={phoneNumber}
                                    onChange={(e) => setPhoneNumber(e.target.value)}
                                    placeholder="03XX-XXXXXXX"
                                    className="flex-1"
                                />
                                <Button
                                    onClick={handleSavePhone}
                                    disabled={isSaving || !phoneNumber.trim()}
                                    className="font-semibold"
                                >
                                    {isSaving ? 'Saving...' : 'Save'}
                                </Button>
                                {hasPhoneNumber && (
                                    <Button
                                        variant="outline"
                                        onClick={() => {
                                            setIsEditingPhone(false);
                                            setPhoneNumber(currentUser.phoneNumber || '');
                                        }}
                                    >
                                        Cancel
                                    </Button>
                                )}
                            </div>
                            <p className="text-xs text-gray-500 mt-2">
                                Enter your phone number (10-11 digits)
                            </p>
                        </div>
                    )}

                    {/* Account Details */}
                    <div className="space-y-4">
                        {/* Name */}
                        <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
                            <User className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                            <div className="flex-1 min-w-0">
                                <p className="text-xs text-gray-500 mb-1">Full Name</p>
                                <p className="text-base font-semibold text-gray-900">{currentUser.name}</p>
                            </div>
                        </div>

                        {/* Email */}
                        <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
                            <Mail className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                            <div className="flex-1 min-w-0">
                                <p className="text-xs text-gray-500 mb-1">Email</p>
                                <p className="text-base font-semibold text-gray-900 break-all">{currentUser.email}</p>
                            </div>
                        </div>

                        {/* Registration Number (Students only) */}
                        {currentUser.userType === 'student' && currentUser.regNo && (
                            <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
                                <GraduationCap className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs text-gray-500 mb-1">Registration Number</p>
                                    <p className="text-base font-semibold text-gray-900">{currentUser.regNo}</p>
                                </div>
                            </div>
                        )}

                        {/* Phone Number (Display) */}
                        {hasPhoneNumber && !isEditingPhone && (
                            <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
                                <Phone className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs text-gray-500 mb-1">Phone Number</p>
                                    <div className="flex items-center justify-between">
                                        <p className="text-base font-semibold text-gray-900">
                                            {currentUser.phoneNumber || phoneNumber}
                                        </p>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => {
                                                setIsEditingPhone(true);
                                                setPhoneNumber(currentUser.phoneNumber || phoneNumber);
                                            }}
                                            className="text-primary hover:text-primary/80 text-sm"
                                        >
                                            Edit
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
        </Modal>
    );
};

