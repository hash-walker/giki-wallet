import { useState } from 'react';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import {BookingPage} from "@/modules/booking/pages/BookingPage";
import { WalletPage } from "@/modules/wallet/pages/WalletPage";
import { TopUpModal, TransferModal, TransactionHistory } from "@/modules/wallet/components/modals";
import { MyTicketsModal } from "@/modules/booking/components/modals";
import { SignInModal, MyAccountModal } from "@/modules/auth";

function App() {
    const [isHistoryOpen, setIsHistoryOpen] = useState(false);
    const [isTopUpOpen, setIsTopUpOpen] = useState(false);
    const [isTransferOpen, setIsTransferOpen] = useState(false);
    const [isMyTicketsOpen, setIsMyTicketsOpen] = useState(false);
    const [isSignInOpen, setIsSignInOpen] = useState(false);
    const [isMyAccountOpen, setIsMyAccountOpen] = useState(false);

    const handleHistoryClick = () => {
        setIsHistoryOpen(true);
    };

    const handleCloseHistory = () => {
        setIsHistoryOpen(false);
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
        <div className="min-h-screen flex flex-col bg-light-background font-inter">
            <Navbar 
                onMyBookingsClick={handleMyTicketsClick}
                onSignInClick={handleSignInClick}
            />

            <main className="flex-1 flex flex-col container mx-auto px-4 py-8 md:py-12">
                <div className="mt-8">
                    <WalletPage 
                        onHistoryClick={handleHistoryClick}
                        onTopUpClick={handleTopUpClick}
                        onTransferClick={handleTransferClick}
                    />
                </div>
                <BookingPage />
            </main>

            <Footer />

            {/* Wallet Modals */}
            <TransactionHistory
                isOpen={isHistoryOpen}
                onClose={handleCloseHistory}
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
        </div>
    );
}

export default App;