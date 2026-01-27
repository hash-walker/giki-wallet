import { Button } from '@/shared/components/ui/button';
import { Clock } from 'lucide-react';

interface PendingReservationBannerProps {
    count: number;
    timeLeft: number;
    onReleaseAll: () => void;
}

export function PendingReservationBanner({ count, timeLeft, onReleaseAll }: PendingReservationBannerProps) {
    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    if (count === 0) return null;

    return (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center justify-between animate-in slide-in-from-top duration-500 ring-1 ring-amber-100/50">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center text-amber-600 shadow-sm border border-amber-200/50">
                    <Clock className="w-5 h-5" />
                </div>
                <div>
                    <p className="text-sm font-black text-amber-900 uppercase tracking-tight">Pending Reservation</p>
                    <p className="text-[10px] font-bold text-amber-700 uppercase tracking-widest flex items-center gap-2">
                        {count} seats held <span className="w-1 h-1 rounded-full bg-amber-300" /> Expires in <span className="font-black text-amber-900 bg-amber-200/50 px-1.5 py-0.5 rounded-md tabular-nums">{formatTime(timeLeft)}</span>
                    </p>
                </div>
            </div>
            <Button
                variant="ghost"
                size="sm"
                onClick={onReleaseAll}
                className="text-amber-700 hover:bg-amber-200/50 hover:text-amber-900 font-black text-[10px] uppercase tracking-[0.15em] px-4 h-9 rounded-xl border border-amber-200 transition-all duration-300 active:scale-95"
            >
                Release All
            </Button>
        </div>
    );
}
