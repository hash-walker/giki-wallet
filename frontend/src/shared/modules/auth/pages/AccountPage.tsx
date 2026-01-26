
import { useNavigate } from 'react-router-dom';
import { LogOut, User, Mail, Phone, ShieldCheck } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { useAuthStore } from '@/shared/stores/authStore';

export const AccountPage = () => {
    const navigate = useNavigate();
    const { user, signOut } = useAuthStore();

    const handleLogout = () => {
        signOut();
        navigate('/auth/sign-in');
    };

    if (!user) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
                <p className="text-gray-500">Please sign in to view your account</p>
                <Button onClick={() => navigate('/auth/sign-in')}>Sign In</Button>
            </div>
        )
    }

    return (
        <div className="w-full pb-20 md:pb-6 pt-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-6">My Account</h1>

            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                {/* Profile Header */}
                <div className="bg-primary/5 p-8 flex flex-col items-center justify-center border-b border-gray-100">
                    <div className="w-24 h-24 rounded-full bg-white border-4 border-white shadow-md flex items-center justify-center mb-4">
                        <span className="text-3xl font-bold text-primary">
                            {user.name.charAt(0).toUpperCase()}
                        </span>
                    </div>
                    <h2 className="text-xl font-bold text-gray-900">{user.name}</h2>
                    <p className="text-sm text-gray-500">{user.user_type}</p>
                </div>

                {/* Account Details */}
                <div className="p-6 space-y-6">
                    <div className="space-y-4">
                        <div className="flex items-center gap-4 p-4 rounded-2xl bg-gray-50 border border-gray-100">
                            <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-gray-500 shadow-sm">
                                <Mail className="w-5 h-5" />
                            </div>
                            <div>
                                <p className="text-xs text-gray-500 uppercase font-semibold">Email</p>
                                <p className="text-sm font-medium text-gray-900">{user.email}</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-4 p-4 rounded-2xl bg-gray-50 border border-gray-100">
                            <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-gray-500 shadow-sm">
                                <Phone className="w-5 h-5" />
                            </div>
                            <div>
                                <p className="text-xs text-gray-500 uppercase font-semibold">Phone</p>
                                <p className="text-sm font-medium text-gray-900">{user.phone_number || 'Not provided'}</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-4 p-4 rounded-2xl bg-gray-50 border border-gray-100">
                            <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-gray-500 shadow-sm">
                                <ShieldCheck className="w-5 h-5" />
                            </div>
                            <div>
                                <p className="text-xs text-gray-500 uppercase font-semibold">Role</p>
                                <p className="text-sm font-medium text-gray-900 capitalize">{user.user_type.toLowerCase()}</p>
                            </div>
                        </div>
                    </div>

                    <div className="pt-6 border-t border-gray-100">
                        <Button
                            className="w-full"
                            onClick={handleLogout}
                        >
                            <LogOut className="w-4 h-4 mr-2" />
                            Logout
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
};
