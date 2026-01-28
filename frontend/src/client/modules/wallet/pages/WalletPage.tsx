import { useNavigate } from 'react-router-dom';
import { WalletCard } from '../components/WalletCard';

export const WalletPage = () => {
    const navigate = useNavigate();

    return (
        <div className="w-full">
            <div className="mt-6">
                {/* WalletCard now handles its own data fetching */}
                <WalletCard
                    onTopUp={() => navigate('/wallet/topup')}
                />
            </div>
        </div>
    );
};
