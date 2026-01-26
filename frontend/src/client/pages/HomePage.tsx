import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { WalletPage } from '@/client/modules/wallet/pages/WalletPage';
import { ServiceTiles } from '@/client/components/ServiceTiles';

export const HomePage = () => {
    const navigate = useNavigate();
    const openTransport = useCallback(() => {
        navigate('/transport');
    }, [navigate]);

    return (
        <>
            <div className="mt-6">
                <WalletPage />
            </div>

            <ServiceTiles onTransportClick={openTransport} />
        </>
    );
};

