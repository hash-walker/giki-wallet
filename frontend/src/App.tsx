import { useState, useRef, useEffect } from 'react';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import {BookingPage} from "@/modules/booking/pages/BookingPage";
import { WalletPage } from "@/modules/wallet/pages/WalletPage";
import { TopUpPage } from "@/modules/wallet/pages/TopUpPage";
import { TransferPage } from "@/modules/wallet/pages/TransferPage";
import { TransactionHistory } from "@/modules/wallet/components/TransactionHistory";

type Page = 'home' | 'topup' | 'transfer';

function App() {
    const [currentPage, setCurrentPage] = useState<Page>('home');
    const [isHistoryOpen, setIsHistoryOpen] = useState(false);
    const historyRef = useRef<HTMLDivElement>(null);

    const handleHistoryClick = () => {
        setIsHistoryOpen(prev => !prev);
    };

    const handleCloseHistory = () => {
        setIsHistoryOpen(false);
    };

    const handleTopUpClick = () => {
        setCurrentPage('topup');
    };

    const handleTransferClick = () => {
        setCurrentPage('transfer');
    };

    const handleBackToHome = () => {
        setCurrentPage('home');
    };

    // Scroll to transaction history when it opens
    useEffect(() => {
        if (isHistoryOpen && historyRef.current && currentPage === 'home') {
            // Small delay to ensure the component is rendered
            setTimeout(() => {
                historyRef.current?.scrollIntoView({ 
                    behavior: 'smooth', 
                    block: 'start' 
                });
            }, 100);
        }
    }, [isHistoryOpen, currentPage]);

    return (
        <div className="min-h-screen flex flex-col bg-light-background font-inter">
            <Navbar />

            <main className="flex-1 flex flex-col container mx-auto px-4 py-8 md:py-12">
                {currentPage === 'home' && (
                    <>
                        <div className="mt-8">
                            <WalletPage 
                                onHistoryClick={handleHistoryClick}
                                onTopUpClick={handleTopUpClick}
                                onTransferClick={handleTransferClick}
                            />
                        </div>
                        <BookingPage />
                        
                        {/* Transaction History - Below Booking Page */}
                        <div ref={historyRef} className="max-w-5xl mx-auto w-full px-4 md:px-6">
                            <TransactionHistory
                                isOpen={isHistoryOpen}
                                onClose={handleCloseHistory}
                            />
                        </div>
                    </>
                )}

                {currentPage === 'topup' && <TopUpPage onBack={handleBackToHome} />}
                {currentPage === 'transfer' && <TransferPage onBack={handleBackToHome} />}
            </main>

            <Footer />
        </div>
    );
}

export default App;