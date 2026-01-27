import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { WalletPage } from '@/client/modules/wallet/pages/WalletPage';
import { ServiceTiles } from '@/client/components/ServiceTiles';
import { TripSummaryTile } from '@/client/components/TripSummaryTile';
import { useAuthStore } from '@/shared/stores/authStore';

export const HomePage = () => {
    const navigate = useNavigate();
    const { user } = useAuthStore();

    const openTransport = useCallback(() => {
        navigate('/transport');
    }, [navigate]);

    return (
        <div className="space-y-6">
            {user && user.user_type !== 'employee' && (
                <div className="mt-6">
                    <WalletPage />
                </div>
            )}

            <TripSummaryTile />

            <ServiceTiles onTransportClick={openTransport} />
        </div>
    );
};

