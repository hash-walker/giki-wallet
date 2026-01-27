import { useEffect, useState, useCallback, ReactNode } from 'react';
import { Calendar, Lock, Unlock, Loader2, ChevronRight, Bus, Users, Clock, Radio } from 'lucide-react';
import { getWeeklySummary, type WeeklySummary } from '../modules/transport/api';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import { Modal } from '@/shared/components/ui/Modal';

export const TripSummaryTile = () => {
    const navigate = useNavigate();
    const [summary, setSummary] = useState<WeeklySummary | null>(null);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const fetchSummary = useCallback(async (showLoading = false) => {
        if (showLoading) setLoading(true);
        try {
            const data = await getWeeklySummary();
            // Production-ready validation
            if (data && typeof data === 'object') {
                setSummary({
                    scheduled: data.scheduled || 0,
                    opened: data.opened || 0,
                    locked: data.locked || 0,
                    trips: Array.isArray(data.trips) ? data.trips : []
                });
            }
        } catch (error) {
            // Only log errors if we were explicitly showing loading (initial Load or user-triggered)
            // Background polling errors should be silent to avoid console clutter.
            if (showLoading) {
                console.error('Failed to fetch weekly summary:', error);
            }
        } finally {
            if (showLoading) setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchSummary(true);

        // Polling for "real-time" updates every 30 seconds
        const interval = setInterval(() => {
            fetchSummary(false);
        }, 30000);

        return () => clearInterval(interval);
    }, [fetchSummary]);

    if (loading) {
        return (
            <div className="w-full bg-white/50 backdrop-blur-sm border border-slate-100 rounded-[2.5rem] p-8 h-64 flex flex-col items-center justify-center gap-4">
                <div className="relative">
                    <Loader2 className="w-8 h-8 animate-spin text-primary/40" />
                    <Bus className="w-4 h-4 text-primary absolute inset-0 m-auto" />
                </div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] animate-pulse">Loading Live Schedule...</p>
            </div>
        );
    }

    if (!summary) return null;

    const stats = [
        {
            label: 'Scheduled',
            value: summary.scheduled,
            icon: Calendar,
            color: 'text-primary'
        },
        {
            label: 'Opened',
            value: summary.opened,
            icon: Unlock,
            color: 'text-accent'
        },
        {
            label: 'Locked',
            value: summary.locked,
            icon: Lock,
            color: 'text-slate-400'
        }
    ];

    const formatTime = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        });
    };

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric'
        });
    };

    const TripItem = ({ trip, className }: { trip: any, className?: string }) => (
        <div
            className={cn(
                "flex items-center justify-between p-4 rounded-2xl bg-white border border-slate-100 hover:border-primary/20 hover:bg-slate-50/50 transition-all duration-300",
                className
            )}
        >
            <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500">
                    <Clock className="w-5 h-5" />
                </div>
                <div>
                    <p className="text-xs font-black text-slate-900 tracking-tight uppercase leading-none">{trip.route_name}</p>
                    <div className="flex items-center gap-2 mt-1.5">
                        <span className="text-[9px] font-bold text-slate-400 uppercase">{formatDate(trip.departure_time)}</span>
                        <span className="w-1 h-1 rounded-full bg-slate-200" />
                        <span className="text-[9px] font-black text-primary uppercase">{formatTime(trip.departure_time)}</span>
                    </div>
                </div>
            </div>

            <div className="flex flex-col items-end gap-1">
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-slate-100 shadow-sm">
                    <Users className="w-3 h-3 text-accent" />
                    <span className="text-[10px] font-black text-slate-900">{trip.available_seats} / {trip.total_capacity}</span>
                </div>
                <span className={cn(
                    "text-[8px] font-black uppercase tracking-widest",
                    trip.booking_status === 'OPEN' ? "text-accent" :
                        trip.booking_status === 'FULL' ? "text-destructive" : "text-slate-400"
                )}>
                    {trip.booking_status}
                </span>
            </div>
        </div>
    );

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between px-4">
                <div className="flex items-center gap-2">
                    <Radio className="w-4 h-4 text-destructive animate-pulse" />
                    <h2 className="text-sm font-black text-slate-400 uppercase tracking-[0.2em]">Live Schedule</h2>
                </div>
                <div className="flex items-center gap-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-accent animate-ping" />
                    <span className="text-[8px] font-black text-accent uppercase tracking-widest">Real-time updates</span>
                </div>
            </div>

            <div
                className="group relative overflow-hidden bg-white border border-slate-100 rounded-[2.5rem] p-6 md:p-8 shadow-sm hover:shadow-2xl hover:shadow-primary/5 hover:border-primary/20 transition-all duration-500"
            >
                {/* Background Decor */}
                <div className="absolute top-0 right-0 -mr-24 -mt-24 w-80 h-80 rounded-full bg-primary/5 blur-3xl group-hover:bg-primary/10 transition-colors duration-500 pointer-events-none" />
                <div className="absolute bottom-0 left-0 -ml-24 -mb-24 w-64 h-64 rounded-full bg-accent/5 blur-3xl group-hover:bg-accent/10 transition-colors duration-500 pointer-events-none" />

                <div className="relative z-10 space-y-8">
                    {/* Header & Stats */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 cursor-pointer" onClick={() => navigate('/transport')}>
                        <div className="flex items-center gap-4">
                            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary border border-primary/5 shadow-inner group-hover:scale-110 group-hover:rotate-3 transition-all duration-500">
                                <Bus className="w-7 h-7" />
                            </div>
                            <div>
                                <h3 className="text-2xl font-black text-slate-900 tracking-tighter uppercase">Weekly Trips</h3>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Available for the next 7 days</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-4">
                            {stats.map((stat) => (
                                <div key={stat.label} className="flex flex-col items-center px-4 py-2 rounded-2xl bg-slate-50 border border-slate-100/50">
                                    <span className={cn("text-xs font-black", stat.color)}>{stat.value}</span>
                                    <span className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter">{stat.label}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Trip Detail List (Limited to 2) */}
                    <div className="space-y-3">
                        {summary.trips.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {summary.trips.slice(0, 2).map((trip) => (
                                    <TripItem key={trip.trip_id} trip={trip} />
                                ))}
                            </div>
                        ) : (
                            <div className="py-8 text-center bg-slate-50 rounded-3xl border border-dashed border-slate-200">
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">No trips scheduled for this week</p>
                            </div>
                        )}

                        {summary.trips.length > 2 && (
                            <div className="pt-2 flex justify-center">
                                <span
                                    onClick={() => setIsModalOpen(true)}
                                    className="text-[10px] font-black text-primary uppercase tracking-widest hover:underline cursor-pointer flex items-center gap-1 group/btn"
                                >
                                    View {summary.trips.length - 2} more trips
                                    <ChevronRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                                </span>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title="Weekly Schedule"
                size="lg"
            >
                <div className="space-y-4">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-[0.1em] mb-4">
                        Full Schedule for {formatDate(new Date().toISOString())} - {formatDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString())}
                    </p>
                    <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2 no-scrollbar">
                        {summary.trips.map((trip) => (
                            <TripItem key={trip.trip_id} trip={trip} />
                        ))}
                    </div>
                    <div className="pt-6 flex justify-center">
                        <button
                            onClick={() => {
                                setIsModalOpen(false);
                                navigate('/transport');
                            }}
                            className="bg-primary text-white px-8 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-lg shadow-primary/20 hover:scale-105 transition-all"
                        >
                            Go to Booking
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};
