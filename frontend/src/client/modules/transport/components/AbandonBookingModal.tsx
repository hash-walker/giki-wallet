import { Button } from '@/shared/components/ui/button';
import { Modal } from '@/shared/components/ui/Modal';
import { Clock } from 'lucide-react';

interface AbandonBookingModalProps {
    isOpen: boolean;
    onClose: () => void;
    timeLeft: number;
    onAbandon: () => void;
    onStay: () => void;
}

export function AbandonBookingModal({ isOpen, onClose, timeLeft, onAbandon, onStay }: AbandonBookingModalProps) {
    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Abandon Booking?"
        >
            <div className="p-6">
                <div className="flex items-center gap-4 mb-6">
                    <div className="w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center text-red-500 border border-red-100 shadow-sm">
                        <Clock className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-sm font-black text-slate-900 uppercase tracking-tight">Active Reservation</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Time remaining: {formatTime(timeLeft)}</p>
                    </div>
                </div>

                <p className="text-sm text-slate-600 mb-8 font-medium leading-relaxed">
                    You have pending seat reservations. Leaving this page will **release your seats** and free up your weekly quota.
                    Do you want to proceed?
                </p>

                <div className="flex flex-col gap-3">
                    <Button
                        className="w-full h-14 rounded-2xl font-black text-xs uppercase tracking-[0.2em] bg-red-500 hover:bg-red-600 shadow-xl shadow-red-100 transition-all duration-300 active:scale-[0.98]"
                        onClick={onAbandon}
                    >
                        Yes, Release & Leave
                    </Button>
                    <Button
                        variant="ghost"
                        className="w-full h-12 rounded-2xl font-bold text-xs uppercase tracking-widest text-slate-500 hover:bg-slate-50 transition-all"
                        onClick={onStay}
                    >
                        No, Stay Here
                    </Button>
                </div>
            </div>
        </Modal>
    );
}
