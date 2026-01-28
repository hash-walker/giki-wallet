import { useEffect, useState } from 'react';
import { Eye, EyeOff, Plus, Wallet, RotateCcw } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { useWalletModuleStore } from '../store';

interface WalletCardProps {
    onTopUp: () => void;
}

export const WalletCard = ({ onTopUp }: WalletCardProps) => {
    const { balance, currency, isDataLoading, fetchBalance } = useWalletModuleStore();
    const [showBalance, setShowBalance] = useState(true);

    useEffect(() => {
        fetchBalance();
    }, [fetchBalance]);

    return (
        <div className="bg-gray-900 rounded-3xl p-6 text-white shadow-xl shadow-gray-200 mb-8 relative overflow-hidden group">
            {/* Background Decorations */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -mr-32 -mt-32 group-hover:bg-white/10 transition-colors duration-700" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-primary/20 rounded-full blur-3xl -ml-24 -mb-24 group-hover:bg-primary/30 transition-colors duration-700" />

            <div className="relative">
                <div className="flex justify-between items-start mb-8">
                    <div className="flex items-center gap-3">
                        <div className="bg-white/10 p-2.5 rounded-xl backdrop-blur-md">
                            <Wallet className="w-6 h-6 text-primary-300" />
                        </div>
                        <div>
                            <p className="text-gray-400 text-sm font-medium">Total Balance</p>
                            <div className="flex items-center gap-2 mt-0.5">
                                <span className={`bg-primary/20 text-primary-300 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${isDataLoading ? 'animate-pulse' : ''}`}>
                                    {currency} Wallet
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="space-y-1 mb-8">
                    <div className="flex items-baseline gap-1">
                        <span className="text-4xl font-bold tracking-tight">
                            {showBalance ? balance.toLocaleString() : '••••••'}
                        </span>
                        <span className="text-xl text-gray-400 font-medium">{currency}</span>
                    </div>
                    {isDataLoading && <p className="text-xs text-gray-500 animate-pulse">Updating balance...</p>}
                </div>

                <div className="flex gap-3">
                    <Button
                        onClick={onTopUp}
                        className="flex-1 bg-white text-gray-900 hover:bg-gray-100 font-bold border-0 h-12 rounded-xl"
                    >
                        <Plus className="w-4 h-4 mr-2" />
                        Top Up
                    </Button>
                    <Button
                        variant="outline"
                        onClick={() => setShowBalance(!showBalance)}
                        className="w-12 h-12 p-0 border-white/20 hover:bg-white/10 text-white rounded-xl"
                    >
                        {showBalance ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </Button>
                    <Button
                        variant="ghost"
                        onClick={() => fetchBalance()}
                        className="w-12 h-12 p-0 text-gray-400 hover:text-white hover:bg-white/10 rounded-xl"
                    >
                        <RotateCcw className={`w-5 h-5 ${isDataLoading ? 'animate-spin' : ''}`} />
                    </Button>
                </div>
            </div>
        </div>
    );
};
