import { WalletCard } from '../components/WalletCard';
import { WalletPageHeader } from '../components/WalletPageHeader';

export const WalletPage = () => {
    return (
        <div className="w-full">

            <div className="mt-6">
                <WalletCard balance={1000} />
            </div>
        </div>
    );
};

