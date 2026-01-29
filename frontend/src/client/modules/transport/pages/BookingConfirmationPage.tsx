import { useEffect, useMemo } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuthStore } from '@/shared/stores/authStore';
import { useTransportStore } from '../store';
import { Button } from '@/shared/components/ui/button';
import { Select } from '@/shared/components/ui/Select';
import { formatDateTime, getStopById } from '../utils';
import { ArrowLeft, Clock, ShieldCheck, UserCheck } from 'lucide-react';
import { toast } from 'sonner';

export const BookingConfirmationPage = () => {
    const navigate = useNavigate();
    const { user } = useAuthStore();
    const {
        allTrips,
        activeHolds,
        outboundSelection,
        returnSelection,
        outboundHolds,
        returnHolds,
        passengers,
        updatePassenger,
        confirmCurrentBooking,
        loading,
        timeLeft,
        fetchData,
        releaseAllHolds,
        initialized
    } = useTransportStore();

    useEffect(() => {
        if (!initialized) {
            void fetchData(true);
        }
    }, [initialized, fetchData]);

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    const outboundSummary = useMemo(() => {
        if (!outboundSelection) return null;
        const trip = allTrips.find(t => t.trip_id === outboundSelection.tripId);
        if (!trip) return null;
        const pickup = getStopById(trip.stops, outboundSelection.pickupId);
        const drop = getStopById(trip.stops, outboundSelection.dropoffId);
        return {
            route: trip.route_name,
            when: formatDateTime(trip.departure_time),
            pickup: pickup?.stop_name || '—',
            dropoff: drop?.stop_name || '—',
            seats: outboundSelection.ticketCount,
        };
    }, [outboundSelection, allTrips]);

    const returnSummary = useMemo(() => {
        if (!returnSelection) return null;
        const trip = allTrips.find(t => t.trip_id === returnSelection.tripId);
        if (!trip) return null;
        const pickup = getStopById(trip.stops, returnSelection.pickupId);
        const drop = getStopById(trip.stops, returnSelection.dropoffId);
        return {
            route: trip.route_name,
            when: formatDateTime(trip.departure_time),
            pickup: pickup?.stop_name || '—',
            dropoff: drop?.stop_name || '—',
            seats: returnSelection.ticketCount,
        };
    }, [returnSelection, allTrips]);

    const allHolds = useMemo(() => [...outboundHolds, ...returnHolds], [outboundHolds, returnHolds]);

    // If no holds and initialized, redirect back
    if (initialized && activeHolds.length === 0) {
        return <Navigate to="/transport" replace />;
    }

    const handleConfirm = async () => {
        // Basic validation
        const missingNames = allHolds.some(h => !passengers[h.hold_id]?.name.trim());
        if (missingNames) {
            toast.error("Please enter all passenger names");
            return;
        }

        try {
            await confirmCurrentBooking();
            navigate('/tickets');
        } catch (e) {
            // Error handled in store
        }
    };

    return (
        <div className="max-w-2xl mx-auto space-y-8 pb-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Button
                    variant="ghost"
                    size="icon"
                    className="rounded-xl border border-slate-100 shadow-sm hover:bg-white"
                    onClick={() => navigate('/transport')}
                >
                    <ArrowLeft className="w-5 h-5" />
                </Button>
                <div>
                    <h1 className="text-2xl font-black text-slate-900 tracking-tight uppercase tracking-tighter">Finalize Booking</h1>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Review details and confirm seats</p>
                </div>
            </div>

            {/* Hold Timer */}
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center justify-between shadow-sm ring-1 ring-amber-100/50">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center text-amber-600 border border-amber-200/50">
                        <Clock className="w-5 h-5" />
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-amber-900 uppercase tracking-tight">Seats are held</p>
                        <p className="text-sm font-black text-amber-900 tabular-nums">
                            Expires in {formatTime(timeLeft)}
                        </p>
                    </div>
                </div>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={async () => {
                        await releaseAllHolds();
                        navigate('/transport');
                    }}
                    className="text-amber-700 hover:bg-amber-100 font-bold text-[10px] uppercase tracking-widest px-4"
                >
                    Abandon
                </Button>
            </div>

            {/* Summaries */}
            <div className="grid gap-4 md:grid-cols-2">
                {outboundSummary && (
                    <div className="group p-6 rounded-3xl border border-slate-100 bg-white shadow-xl shadow-slate-200/40 hover:shadow-2xl hover:shadow-slate-200/60 transition-all duration-500 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full -mr-12 -mt-12 group-hover:scale-110 transition-transform duration-700" />
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-accent" />
                            Outbound
                        </p>
                        <h4 className="text-lg font-black text-slate-900 leading-tight mb-2">{outboundSummary.route}</h4>
                        <div className="space-y-2">
                            <p className="text-xs text-slate-500 font-bold flex items-center gap-2">
                                <Clock className="w-3.5 h-3.5 text-slate-300" />
                                {outboundSummary.when}
                            </p>
                            <p className="text-xs text-slate-500 font-bold flex items-center gap-2">
                                <ShieldCheck className="w-3.5 h-3.5 text-slate-300" />
                                {outboundSummary.seats} Seat(s)
                            </p>
                        </div>
                        <div className="mt-4 pt-4 border-t border-slate-50">
                            <p className="text-[10px] font-black text-primary uppercase tracking-widest leading-relaxed">
                                {outboundSummary.pickup} <span className="text-slate-300 mx-1">→</span> {outboundSummary.dropoff}
                            </p>
                        </div>
                    </div>
                )}

                {returnSummary && (
                    <div className="group p-6 rounded-3xl border border-slate-100 bg-white shadow-xl shadow-slate-200/40 hover:shadow-2xl hover:shadow-slate-200/60 transition-all duration-500 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-accent/5 rounded-full -mr-12 -mt-12 group-hover:scale-110 transition-transform duration-700" />
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                            Return
                        </p>
                        <h4 className="text-lg font-black text-slate-900 leading-tight mb-2">{returnSummary.route}</h4>
                        <div className="space-y-2">
                            <p className="text-xs text-slate-500 font-bold flex items-center gap-2">
                                <Clock className="w-3.5 h-3.5 text-slate-300" />
                                {returnSummary.when}
                            </p>
                            <p className="text-xs text-slate-500 font-bold flex items-center gap-2">
                                <ShieldCheck className="w-3.5 h-3.5 text-slate-300" />
                                {returnSummary.seats} Seat(s)
                            </p>
                        </div>
                        <div className="mt-4 pt-4 border-t border-slate-50">
                            <p className="text-[10px] font-black text-accent uppercase tracking-widest leading-relaxed">
                                {returnSummary.pickup} <span className="text-slate-300 mx-1">→</span> {returnSummary.dropoff}
                            </p>
                        </div>
                    </div>
                )}
            </div>

            {/* Passenger Fields */}
            <div className="bg-white rounded-[2rem] border border-slate-100 p-8 shadow-2xl shadow-slate-200/50">
                <div className="flex items-center gap-3 mb-8">
                    <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary border border-primary/10">
                        <UserCheck className="w-5 h-5" />
                    </div>
                    <div>
                        <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">Passenger Details</h3>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Enter names for held seats</p>
                    </div>
                </div>

                <div className="space-y-6">
                    {allHolds.map((h, idx) => {
                        const p = passengers[h.hold_id] || { name: '', relation: 'SELF' };
                        return (
                            <div key={h.hold_id} className="group relative p-6 rounded-2xl border border-slate-100 bg-slate-50/30 hover:bg-white hover:shadow-xl hover:shadow-slate-200/30 transition-all duration-500 ring-1 ring-slate-100">
                                <div className="absolute -top-3 left-6 px-3 py-1 bg-white border border-slate-100 rounded-full shadow-sm">
                                    <p className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">Seat #{idx + 1}</p>
                                </div>
                                <div className="grid gap-4 mt-2">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Full Name</label>
                                        <input
                                            className="w-full h-12 border border-slate-200 rounded-xl px-4 text-sm font-black text-slate-900 placeholder:text-slate-300 focus:ring-4 focus:ring-primary/5 focus:border-primary transition-all bg-white shadow-sm disabled:bg-slate-50"
                                            placeholder="Enter full name"
                                            value={p.name}
                                            onChange={(e) => updatePassenger(h.hold_id, { ...p, name: e.target.value })}
                                            disabled={loading}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Relation</label>
                                        <Select
                                            options={[
                                                { value: 'SELF', label: 'Self (Employee)' },
                                                { value: 'SPOUSE', label: 'Spouse/Partner' },
                                                { value: 'CHILD', label: 'Son/Daughter' },
                                            ]}
                                            value={p.relation}
                                            onChange={(v) => updatePassenger(h.hold_id, { ...p, relation: v as any })}
                                            placeholder="Select relation"
                                            className="h-12 rounded-xl bg-white border-slate-200 font-bold text-sm shadow-sm"
                                            showLabel={false}
                                            disabled={loading}
                                        />
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                <div className="mt-10">
                    <Button
                        className="w-full h-16 rounded-2xl font-black text-xs uppercase tracking-[0.25em] shadow-2xl shadow-primary/30 hover:shadow-primary/40 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-300"
                        onClick={handleConfirm}
                        disabled={loading}
                    >
                        {loading ? 'Processing...' : 'Confirm Booking'}
                    </Button>
                    <p className="text-center text-[10px] font-bold text-slate-400 uppercase tracking-[0.15em] mt-6 flex items-center justify-center gap-2">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        Secure Payment Authorization
                    </p>
                </div>
            </div>
        </div>
    );
};
