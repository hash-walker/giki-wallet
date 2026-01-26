import { useEffect } from 'react';
import { WalletCard } from '../components/WalletCard';
import { WalletPageHeader } from '../components/WalletPageHeader';
import { useWalletStore } from '../walletStore';

export const WalletPage = () => {
    const { balance, currency, fetchBalance } = useWalletStore();

    useEffect(() => {
        fetchBalance();
    }, [fetchBalance]);

    return (
        <div className="w-full">
            <div className="mt-6">
                <WalletCard balance={balance} currency={currency} />
            </div>
        </div>
    );
};

