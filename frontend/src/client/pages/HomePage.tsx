import { BookingPage } from '@/client/modules/booking/pages/BookingPage';
import { WalletPage } from '@/client/modules/wallet/pages/WalletPage';
import { useWallet } from '@/context/WalletContext';

export const HomePage = () => {
    const { onHistoryClick, onTopUpClick, onTransferClick } = useWallet();

    return (
        <>
            <div className="mt-8">
                <WalletPage 
                    onHistoryClick={onHistoryClick}
                    onTopUpClick={onTopUpClick}
                    onTransferClick={onTransferClick}
                />
            </div>
            <BookingPage />
        </>
    );
};

