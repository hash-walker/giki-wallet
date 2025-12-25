import { useState } from 'react';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import {BookingPage} from "@/modules/booking/pages/BookingPage";
import { WalletPage } from "@/modules/wallet/pages/WalletPage";
import { TopUpModal } from "@/modules/wallet/components/TopUpModal";
import { TransferModal } from "@/modules/wallet/components/TransferModal";
import { TransactionHistory } from "@/modules/wallet/components/TransactionHistory";

function App() {
    const [isHistoryOpen, setIsHistoryOpen] = useState(false);
    const [isTopUpOpen, setIsTopUpOpen] = useState(false);
    const [isTransferOpen, setIsTransferOpen] = useState(false);

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

    return (
        <div className="min-h-screen flex flex-col bg-light-background font-inter">
            <Navbar />

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
        </div>
    );
}

export default App;