import { ChevronRight, Wallet } from 'lucide-react';
import { useWallet } from '@/context/WalletContext';

interface WalletCardProps {
    balance?: number;
}

export const WalletCard = ({
    balance = 1000
}: WalletCardProps) => {
    const { onHistoryClick } = useWallet();
    return (
        <button
            onClick={onHistoryClick}
            className="group w-full text-left cursor-pointer relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary to-primary-dark shadow-xl shadow-primary/20 hover:shadow-2xl hover:shadow-primary/30 transition-all duration-300 transform hover:-translate-y-1"
            aria-label="View transaction history"
        >
            {/* Decorative background circles */}
            <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 rounded-full bg-white/5 blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-48 h-48 rounded-full bg-accent/10 blur-2xl pointer-events-none" />

            <div className="relative p-6 md:p-8 flex flex-col justify-between h-full min-h-[220px]">
                <div className="flex items-start justify-between">
                    <div>
                        <p className="text-white/60 text-sm font-medium tracking-wide">Total Balance</p>
                        <p className="mt-2 text-4xl md:text-5xl font-bold text-white tracking-tight">
                            <span className="text-2xl align-top mr-1 font-medium opacity-70">Rs.</span>
                            {balance.toLocaleString()}
                        </p>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20">
                        <Wallet className="w-6 h-6 text-white" />
                    </div>
                </div>

                <div className="flex items-end justify-between mt-8">
                    <div className="flex flex-col gap-1">
                        <div className="flex gap-2">
                            {/* Mock Chip */}
                            <div className="w-10 h-8 rounded-md bg-yellow-200/20 border border-yellow-200/30 relative overflow-hidden">
                                <div className="absolute inset-0 bg-gradient-to-tr from-yellow-500/10 to-transparent" />
                                <div className="absolute top-1/2 left-0 w-full h-[1px] bg-yellow-200/30" />
                                <div className="absolute left-1/2 top-0 h-full w-[1px] bg-yellow-200/30" />
                            </div>
                            <div className="text-white/40 text-xs self-end mb-1">GIKI Wallet</div>
                        </div>
                        <p className="text-white/90 font-mono tracking-widest text-lg mt-2">
                            •••• •••• •••• 4242
                        </p>
                    </div>

                    <div className="flex items-center gap-1 text-accent-light text-sm font-semibold bg-white/5 px-3 py-1.5 rounded-full border border-white/5 group-hover:bg-white/10 transition-colors">
                        History <ChevronRight className="w-4 h-4" />
                    </div>
                </div>
            </div>
        </button>
    );
};


