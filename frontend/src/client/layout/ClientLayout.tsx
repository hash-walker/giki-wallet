import { ReactNode, useState } from 'react';
import { Wallet, MessageSquarePlus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ClientNavbar, Footer } from '@/shared/components/layout';
import { BottomNav } from '@/shared/components/layout/BottomNav';
import { TransactionHistory } from '@/client/modules/wallet/components/TransactionHistory';
import { FeedbackModal } from '@/client/modules/feedback/components/FeedbackModal';
import { useFeedback } from '@/client/modules/feedback/hooks/useFeedback';
import { Button } from '@/shared/components/ui/button';
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

    const {
        isOpen: isFeedbackOpen,
        openFeedback,
        closeFeedback,
        submitFeedback,
        isPending: isFeedbackPending
    } = useFeedback();

    return (
        <WalletProvider
            onHistoryClick={handleHistoryClick}
            onTopUpClick={handleTopUpClick}

            onMyTicketsClick={handleMyTicketsClick}
            onMyAccountClick={handleMyAccountClick}
        >
            <div className="min-h-screen flex flex-col bg-background font-inter pb-20 md:pb-0 transition-colors duration-500">
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
                <div className="md:hidden sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-gray-100/40 h-16 flex items-center justify-center px-4 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-full bg-accent/5 blur-xl pointer-events-none" />
                    <div className="flex items-center gap-2.5">
                        <div className="bg-primary/5 p-2 rounded-xl border border-primary/10 shadow-inner">
                            <Wallet className="w-5 h-5 text-primary" />
                        </div>
                        <span className="font-black text-xl text-gray-900 tracking-tighter">
                            GIKI <span className="text-accent">Wallet</span>
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
                <FeedbackModal
                    isOpen={isFeedbackOpen}
                    onClose={closeFeedback}
                    onSubmit={submitFeedback}
                    isPending={isFeedbackPending}
                />

                {/* Floating Feedback Trigger */}
                {!!user && (
                    <div className="fixed bottom-20 right-4 md:bottom-8 md:right-8 z-50">
                        <Button
                            onClick={openFeedback}
                            className="rounded-full shadow-lg h-12 w-12 p-0 bg-primary hover:bg-primary/90 text-white"
                            aria-label="Send Feedback"
                        >
                            <MessageSquarePlus className="h-6 w-6" />
                        </Button>
                    </div>
                )}
            </div>
        </WalletProvider>
    );
};

