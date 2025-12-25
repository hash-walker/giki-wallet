import { WalletCard } from '../components/WalletCard';
import { WalletPageHeader } from '../components/WalletPageHeader';

interface WalletPageProps {
    onHistoryClick?: () => void;
    onTopUpClick?: () => void;
    onTransferClick?: () => void;
}

export const WalletPage = ({ 
    onHistoryClick,
    onTopUpClick,
    onTransferClick
}: WalletPageProps) => {
    return (
        <div className="flex-1 flex flex-col max-w-5xl mx-auto p-4 md:p-6 w-full">
            <WalletPageHeader />
            
            <div className="mt-6">
                <WalletCard
                    balance={1000}
                    onHistoryClick={onHistoryClick}
                    onTopUpClick={onTopUpClick}
                    onTransferClick={onTransferClick}
                />
            </div>
        </div>
    );
};

