import { Bus, Clock, ShieldCheck } from 'lucide-react';
import { Trip } from '../api';
import { formatDateTime, statusBadge } from '../utils';
import { useWalletStore } from '@/client/modules/wallet/walletStore';
import { cn } from '@/lib/utils';

interface TripListProps {
    trips: Trip[];
    loading: boolean;
    selectedTripId: string | null;
    onSelectTrip: (id: string) => void;
}

export function TripList({ trips, loading, selectedTripId, onSelectTrip }: TripListProps) {
    const { currency } = useWalletStore();

    if (loading) {
        return <div className="text-sm font-medium text-gray-500 animate-pulse">Loading trips…</div>;
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-100 fill-mode-backwards">
            {trips.map((t) => {
                const isSelected = selectedTripId === t.trip_id;
                const badge = statusBadge(t.booking_status);
                return (
                    <button
                        key={t.trip_id}
                        type="button"
                        onClick={() => onSelectTrip(t.trip_id)}
                        className={`text-left border rounded-[2rem] p-6 transition-all duration-500 relative group overflow-hidden ${isSelected
                            ? 'border-primary shadow-2xl shadow-primary/20 bg-primary/5 ring-2 ring-primary/10'
                            : 'border-slate-100 hover:border-accent/40 hover:shadow-xl bg-white hover:-translate-y-1.5'
                            }`}
                    >
                        {isSelected && (
                            <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-accent rounded-r-full" />
                        )}

                        {/* Subtle background pattern */}
                        <div className="absolute -right-4 -bottom-4 opacity-[0.03] group-hover:opacity-[0.05] transition-opacity duration-500">
                            <Bus className="w-24 h-24 rotate-12" />
                        </div>

                        <div className="flex items-start justify-between gap-4 relative z-10">
                            <div className="flex-1">
                                <div className="flex items-center gap-2.5 mb-2">
                                    <div className="p-1.5 rounded-lg bg-primary/5">
                                        <Clock className="w-4 h-4 text-primary" />
                                    </div>
                                    <p className="text-2xl font-bold text-slate-900 tracking-tight leading-none">
                                        {new Date(t.departure_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </p>
                                </div>

                                <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-4">
                                    {new Date(t.departure_time).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}
                                </p>

                                <div className="flex flex-wrap items-center gap-2">
                                    <div className="px-3 py-1.5 rounded-xl bg-slate-50 text-[10px] font-bold uppercase tracking-widest text-slate-500 border border-slate-100/50 backdrop-blur-sm">
                                        {t.available_seats} SEATS
                                    </div>
                                    <div className="px-3 py-1.5 rounded-xl bg-accent text-[10px] font-black text-white border border-accent/10 shadow-lg shadow-accent/20 uppercase tracking-widest">
                                        {currency} {Math.round(t.price)}
                                    </div>
                                </div>

                                {t.booking_status === 'LOCKED' && (
                                    <div className="mt-4 flex items-center gap-2 text-[10px] font-bold text-amber-600 bg-amber-50/50 border border-amber-100/50 px-3 py-1.5 rounded-xl backdrop-blur-sm uppercase tracking-widest">
                                        <ShieldCheck className="w-3.5 h-3.5" />
                                        OPENS {formatDateTime(t.opens_at).toUpperCase()}
                                    </div>
                                )}
                            </div>

                            <div className="flex flex-col items-end gap-2">
                                <span className={cn(
                                    "text-[10px] px-3 py-1.5 rounded-xl font-black shadow-sm tracking-widest uppercase border",
                                    badge.cls.includes('green') ? 'bg-accent/10 text-accent border-accent/20' :
                                        badge.cls.includes('red') ? 'bg-destructive/10 text-destructive border-destructive/20' :
                                            'bg-slate-100 text-slate-600 border-slate-200'
                                )}>
                                    {badge.label}
                                </span>
                            </div>
                        </div>
                    </button>
                );
            })}
        </div>
    );
}
