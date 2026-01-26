
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

            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden group">
                {/* Profile Header */}
                <div className="bg-primary/5 p-10 flex flex-col items-center justify-center border-b border-gray-100 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-accent/5 rounded-full -mr-16 -mt-16 blur-2xl" />
                    <div className="absolute bottom-0 left-0 w-24 h-24 bg-primary/5 rounded-full -ml-12 -mb-12 blur-xl" />

                    <div className="relative w-24 h-24 rounded-3xl bg-white border border-primary/10 shadow-xl shadow-primary/5 flex items-center justify-center mb-4 transform transition-transform group-hover:scale-105 duration-300">
                        <span className="text-4xl font-black text-primary">
                            {user.name.charAt(0).toUpperCase()}
                        </span>
                    </div>
                    <h2 className="text-2xl font-black text-primary tracking-tight">{user.name}</h2>
                    <p className="text-xs font-bold text-accent uppercase tracking-[0.2em] mt-1">{user.user_type}</p>
                </div>

                {/* Account Details */}
                <div className="p-8 space-y-6">
                    <div className="space-y-4">
                        <div className="flex items-center gap-4 p-5 rounded-2xl bg-gray-50/50 border border-gray-100/50 hover:bg-white hover:shadow-md transition-all duration-300">
                            <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center text-accent shadow-sm border border-gray-100">
                                <Mail className="w-5 h-5" />
                            </div>
                            <div>
                                <p className="text-[10px] text-gray-400 uppercase font-black tracking-widest">Email Address</p>
                                <p className="text-base font-bold text-primary">{user.email}</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-4 p-5 rounded-2xl bg-gray-50/50 border border-gray-100/50 hover:bg-white hover:shadow-md transition-all duration-300">
                            <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center text-accent shadow-sm border border-gray-100">
                                <Phone className="w-5 h-5" />
                            </div>
                            <div>
                                <p className="text-[10px] text-gray-400 uppercase font-black tracking-widest">Phone Number</p>
                                <p className="text-base font-bold text-primary">{user.phone_number || 'Not provided'}</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-4 p-5 rounded-2xl bg-gray-50/50 border border-gray-100/50 hover:bg-white hover:shadow-md transition-all duration-300">
                            <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center text-accent shadow-sm border border-gray-100">
                                <ShieldCheck className="w-5 h-5" />
                            </div>
                            <div>
                                <p className="text-[10px] text-gray-400 uppercase font-black tracking-widest">Account Role</p>
                                <p className="text-base font-bold text-primary capitalize">{user.user_type.toLowerCase()}</p>
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
