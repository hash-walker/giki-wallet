import { ChevronRight, Wallet, History } from 'lucide-react';
import { useWallet } from '@/context/WalletContext';

interface WalletCardProps {
    balance?: number;
    currency?: string;
}

export const WalletCard = ({
    balance = 0,
    currency = 'PKR'
}: WalletCardProps) => {
    const { onHistoryClick } = useWallet();

    return (
        <div className="w-full bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
            <div className="p-8">
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary border border-primary/5 shadow-inner">
                            <Wallet className="w-7 h-7" />
                        </div>
                        <div>
                            <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">My Balance</h2>
                            <p className="text-sm font-bold text-slate-900 tracking-tight">GIKI Digital Wallet</p>
                        </div>
                    </div>

                    <button
                        onClick={onHistoryClick}
                        className="h-10 px-4 rounded-xl bg-accent/5 hover:bg-accent/10 text-accent text-sm font-bold transition-all group border border-accent/10 flex items-center gap-2"
                    >
                        <History className="w-4 h-4 text-accent/60 group-hover:text-accent transition-colors" />
                        History
                        <ChevronRight className="w-4 h-4 text-accent/30" />
                    </button>
                </div>

                <div className="flex items-baseline gap-2 pb-2">
                    <span className="text-2xl font-bold text-primary/40 tracking-tighter">{currency}</span>
                    <span className="text-5xl md:text-6xl font-black text-primary tracking-tighter leading-none">
                        {balance.toLocaleString()}
                    </span>
                </div>
            </div>

            <div className="bg-slate-50/50 px-8 py-4 border-t border-slate-100 flex items-center justify-between">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    Status: <span className="text-accent ml-1">VERIFIED</span>
                </p>
                <div className="flex gap-1.5">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="w-1.5 h-1.5 rounded-full bg-slate-200" />
                    ))}
                </div>
            </div>
        </div>
    );
};
