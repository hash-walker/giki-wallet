import { ArrowUpCircle, ArrowRightLeft, ChevronRight } from 'lucide-react';
import { useWallet } from '@/context/WalletContext';

interface WalletCardProps {
    balance?: number;
}

export const WalletCard = ({
    balance = 1000
}: WalletCardProps) => {
    const { onHistoryClick, onTopUpClick, onTransferClick } = useWallet();
    return (
        <div className="flex flex-row gap-4">
            {/* Main Wallet Card */}
            <button
                onClick={onHistoryClick}
                className="flex-1 bg-white rounded-xl overflow-hidden shadow-sm border border-gray-200 hover:shadow-md transition-all duration-300 text-left cursor-pointer"
                aria-label="View transaction history"
            >
                <div className="p-6 flex flex-col min-h-[180px] h-full">
                    {/* Current Balance Label */}
                    <p className="text-sm text-gray-500 mb-3">Current Balance</p>
                    
                    {/* Balance Amount */}
                    <div className="flex-1 flex items-start">
                        <p className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900">
                            RS <span className="text-primary">{balance.toLocaleString()}</span>
                        </p>
                    </div>
                    
                    {/* History Button - Bottom */}
                    <div className="flex items-center justify-between w-full mt-auto text-gray-700 group-hover:text-primary transition-colors">
                        <span className="text-base font-medium">History</span>
                        <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </div>
                </div>
            </button>

            {/* Action Cards */}
            <div className="w-32 md:w-40 flex flex-col gap-4 flex-shrink-0">
                {/* Top Up Card */}
                <button
                    onClick={onTopUpClick}
                    className="w-full bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-all p-4 md:p-5 flex flex-col items-center gap-2 group cursor-pointer"
                    aria-label="Top up wallet"
                >
                    <div className="w-12 h-12 rounded-full bg-primary text-white flex items-center justify-center group-hover:bg-primary/90 transition-colors shadow-sm">
                        <ArrowUpCircle className="w-6 h-6" />
                    </div>
                    <span className="text-sm md:text-base font-medium text-gray-700 group-hover:text-primary transition-colors">Top up</span>
                </button>

                {/* Transfer Card */}
                <button
                    onClick={onTransferClick}
                    className="w-full bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-all p-4 md:p-5 flex flex-col items-center gap-2 group cursor-pointer"
                    aria-label="Transfer money"
                >
                    <div className="w-12 h-12 rounded-full bg-primary text-white flex items-center justify-center group-hover:bg-primary/90 transition-colors shadow-sm">
                        <ArrowRightLeft className="w-6 h-6" />
                    </div>
                    <span className="text-sm md:text-base font-medium text-gray-700 group-hover:text-primary transition-colors">Transfer</span>
                </button>
            </div>
        </div>
    );
};


