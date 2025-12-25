import { ReactNode, useState } from 'react';
import { ClientNavbar, Footer } from '@/shared/components/layout';
import { Toaster } from '@/shared/components/ui/sonner';
import { TopUpModal } from '@/client/modules/wallet/components/TopUpModal';
import { TransferModal } from '@/client/modules/wallet/components/TransferModal';
import { TransactionHistory } from '@/client/modules/wallet/components/TransactionHistory';
import { MyTicketsModal } from '@/client/modules/booking/components/MyTicketsModal';
import { SignInModal, MyAccountModal } from '@/shared/modules/auth';
import { WalletProvider } from '@/context/WalletContext';

interface ClientLayoutProps {
    children: ReactNode;
}

export const ClientLayout = ({ children }: ClientLayoutProps) => {
    const [isHistoryOpen, setIsHistoryOpen] = useState(false);
    const [isTopUpOpen, setIsTopUpOpen] = useState(false);
    const [isTransferOpen, setIsTransferOpen] = useState(false);
    const [isMyTicketsOpen, setIsMyTicketsOpen] = useState(false);
    const [isSignInOpen, setIsSignInOpen] = useState(false);
    const [isMyAccountOpen, setIsMyAccountOpen] = useState(false);

    const handleHistoryClick = () => {
        setIsHistoryOpen(true);
    };

    const handleTopUpClick = () => {
        setIsTopUpOpen(true);
    };

    const handleTransferClick = () => {
        setIsTransferOpen(true);
    };

    const handleMyTicketsClick = () => {
        setIsMyTicketsOpen(true);
    };

    const handleSignInClick = () => {
        setIsSignInOpen(true);
    };

    const handleSignInSuccess = () => {
        setIsMyAccountOpen(true);
    };

    return (
        <WalletProvider
            onHistoryClick={handleHistoryClick}
            onTopUpClick={handleTopUpClick}
            onTransferClick={handleTransferClick}
        >
            <div className="min-h-screen flex flex-col bg-light-background font-inter">
                <ClientNavbar 
                    onMyBookingsClick={handleMyTicketsClick}
                    onSignInClick={handleSignInClick}
                />

                <main className="flex-1 flex flex-col container mx-auto px-4 py-8 md:py-12">
                    {children}
                </main>

            <Footer />

            {/* Modals */}
            <TransactionHistory
                isOpen={isHistoryOpen}
                onClose={() => setIsHistoryOpen(false)}
            />
            <TopUpModal 
                isOpen={isTopUpOpen}
                onClose={() => setIsTopUpOpen(false)}
            />
            <TransferModal 
                isOpen={isTransferOpen}
                onClose={() => setIsTransferOpen(false)}
            />
            <MyTicketsModal 
                isOpen={isMyTicketsOpen}
                onClose={() => setIsMyTicketsOpen(false)}
            />
            <SignInModal 
                isOpen={isSignInOpen}
                onClose={() => setIsSignInOpen(false)}
                onSignInSuccess={handleSignInSuccess}
            />
            <MyAccountModal 
                isOpen={isMyAccountOpen}
                onClose={() => setIsMyAccountOpen(false)}
            />
            
                <Toaster />
            </div>
        </WalletProvider>
    );
};

