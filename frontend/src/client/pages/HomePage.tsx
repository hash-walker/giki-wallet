import { BookingPage } from '@/client/modules/booking/pages/BookingPage';
import { WalletPage } from '@/client/modules/wallet/pages/WalletPage';

export const HomePage = () => {
    return (
        <>
            <div className="mt-8">
                <WalletPage />
            </div>
            <BookingPage />
        </>
    );
};

