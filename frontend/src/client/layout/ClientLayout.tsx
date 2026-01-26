import { ReactNode, useState } from 'react';
import { Wallet } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ClientNavbar, Footer } from '@/shared/components/layout';
import { BottomNav } from '@/shared/components/layout/BottomNav';
import { TransactionHistory } from '@/client/modules/wallet/components/TransactionHistory';
import { WalletProvider } from '@/context/WalletContext';
import { useAuthStore } from '@/shared/stores/authStore';
import { toast } from '@/lib/toast';

interface ClientLayoutProps {
    children: ReactNode;
}

export const ClientLayout = ({ children }: ClientLayoutProps) => {
    const navigate = useNavigate();
    const { user, signOut } = useAuthStore();
    const [isHistoryOpen, setIsHistoryOpen] = useState(false);


    const handleHistoryClick = () => {
        setIsHistoryOpen(true);
    };

    const handleTopUpClick = () => {
        navigate('/top-up');
    };



    const handleMyTicketsClick = () => {
        navigate('/tickets');
    };

    const handleMyAccountClick = () => {
        navigate('/account');
    };

    const handleSignInClick = () => {
        navigate('/auth/sign-in');
    };

    const handleSignUpClick = () => {
        navigate('/auth/sign-up');
    };

    const handleLogout = () => {
        signOut();
        toast.success('Signed out');
        navigate('/auth/sign-in', { replace: true });
    };

    return (
        <WalletProvider
            onHistoryClick={handleHistoryClick}
            onTopUpClick={handleTopUpClick}

            onMyTicketsClick={handleMyTicketsClick}
            onMyAccountClick={handleMyAccountClick}
        >
            <div className="min-h-screen flex flex-col bg-light-background font-inter pb-20 md:pb-0">
                <div className="hidden md:block">
                    <ClientNavbar
                        onMyBookingsClick={handleMyTicketsClick}
                        onMyAccountClick={handleMyAccountClick}
                        onSignInClick={handleSignInClick}
                        onSignUpClick={handleSignUpClick}
                        onLogoutClick={handleLogout}
                        isAuthenticated={!!user}
                    />
                </div>

                {/* Mobile Top Bar */}
                <div className="md:hidden sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-gray-100/50 h-14 flex items-center justify-center px-4 shadow-sm">
                    <div className="flex items-center gap-2">
                        <div className="bg-primary/10 p-1.5 rounded-xl">
                            <Wallet className="w-5 h-5 text-primary" />
                        </div>
                        <span className="font-bold text-lg text-gray-900 tracking-tight">
                            GIKI <span className="text-primary">Wallet</span>
                        </span>
                    </div>
                </div>

                <main className="flex-1 flex flex-col max-w-5xl mx-auto w-full px-4 lg:px-6 py-4 md:py-12">
                    {children}
                </main>

                <div className="hidden md:block">
                    <Footer />
                </div>

                {/* Bottom Nav for Mobile */}
                <BottomNav />

                {/* Modals */}
                <TransactionHistory
                    isOpen={isHistoryOpen}
                    onClose={() => setIsHistoryOpen(false)}
                />
            </div>
        </WalletProvider>
    );
};

