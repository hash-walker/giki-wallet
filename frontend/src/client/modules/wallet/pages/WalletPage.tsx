import { WalletCard } from '../components/WalletCard';

export const WalletPage = () => {
    return (
        <div className="w-full">
            <div className="mt-6">
                {/* WalletCard now handles its own data fetching */}
                <WalletCard />
            </div>
        </div>
    );
};
