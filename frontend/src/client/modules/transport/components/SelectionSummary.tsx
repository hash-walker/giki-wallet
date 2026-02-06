import { MapPin, ArrowRight, CheckCircle2, CircleDashed } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDate, formatTime } from '../utils';
import type { Trip, BookingSelection } from '../validators';
import { useTransportStore } from '../store';
import { PencilLine } from 'lucide-react';

interface SelectionSummaryProps {
    isRoundTrip: boolean;
    allTrips: Trip[];
    outboundSelection: BookingSelection | null;
    returnSelection: BookingSelection | null;
    activeHolds: Array<{ id: string; trip_id: string; direction: string }>;
}

export function SelectionSummary({
    isRoundTrip,
    allTrips,
    outboundSelection,
    returnSelection,
    activeHolds
}: SelectionSummaryProps) {
    const { direction, setDirection } = useTransportStore();

    const getTripData = (selection: BookingSelection | null) => {
        if (!selection) return null;
        const trip = allTrips.find(t => t.id === selection.tripId);
        if (!trip) return null;

        const pickup = trip.stops.find(s => s.stop_id === selection.pickupId)?.stop_name || '...';
        const dropoff = trip.stops.find(s => s.stop_id === selection.dropoffId)?.stop_name || '...';
        const isHeld = activeHolds.some(h => h.trip_id === selection.tripId);

        return {
            route: trip.route_name,
            departure: `${formatDate(trip.departure_time)} @ ${formatTime(trip.departure_time)}`,
            pickup,
            dropoff,
            isHeld
        };
    };

    const outbound = getTripData(outboundSelection);
    const returnTrip = getTripData(returnSelection);

    if (!outboundSelection && !returnSelection) return null;

    return (
        <div className="bg-white border border-slate-200 rounded-[2rem] p-4 shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-500">
            <div className="flex flex-col md:flex-row items-stretch gap-3">
                {/* Outbound Leg */}
                <div
                    onClick={() => setDirection('OUTBOUND')}
                    className={cn(
                        "flex-1 p-4 rounded-2xl border transition-all duration-300 cursor-pointer group",
                        direction === 'OUTBOUND' ? "ring-2 ring-slate-900 border-transparent shadow-md" : "hover:border-slate-300",
                        outbound?.isHeld ? "bg-emerald-50/50 border-emerald-100" : "bg-slate-50 border-slate-100"
                    )}
                >
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Outbound Trip</span>
                        <div className="flex items-center gap-2">
                            {outbound?.isHeld ? (
                                <div className="flex items-center gap-1 text-emerald-600">
                                    <span className="text-[10px] font-bold uppercase">Seat Held</span>
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                </div>
                            ) : outbound ? (
                                <div className="flex items-center gap-1 text-amber-500">
                                    <span className="text-[10px] font-bold uppercase">Pending</span>
                                    <CircleDashed className="w-3.5 h-3.5 animate-spin-slow" />
                                </div>
                            ) : null}
                            <PencilLine className={cn(
                                "w-3.5 h-3.5 transition-colors",
                                direction === 'OUTBOUND' ? "text-slate-900" : "text-slate-300 group-hover:text-slate-500"
                            )} />
                        </div>
                    </div>
                    {outbound ? (
                        <div className="space-y-1">
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-bold text-slate-900">{outbound.route}</span>
                                <span className="text-[10px] text-slate-400">{outbound.departure}</span>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-slate-600">
                                <span className="truncate max-w-[120px]">{outbound.pickup}</span>
                                <ArrowRight className="w-3 h-3 flex-shrink-0 text-slate-300" />
                                <span className="truncate max-w-[120px]">{outbound.dropoff}</span>
                            </div>
                        </div>
                    ) : (
                        <div className="h-10 flex items-center text-xs text-slate-400 font-medium italic">
                            Select an outbound trip...
                        </div>
                    )}
                </div>

                {isRoundTrip && (
                    <div
                        onClick={() => setDirection('INBOUND')}
                        className={cn(
                            "flex-1 p-4 rounded-2xl border transition-all duration-300 cursor-pointer group",
                            direction === 'INBOUND' ? "ring-2 ring-slate-900 border-transparent shadow-md" : "hover:border-slate-300",
                            returnTrip?.isHeld ? "bg-emerald-50/50 border-emerald-100" : "bg-slate-50 border-slate-100"
                        )}
                    >
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Return Trip</span>
                            <div className="flex items-center gap-2">
                                {returnTrip?.isHeld ? (
                                    <div className="flex items-center gap-1 text-emerald-600">
                                        <span className="text-[10px] font-bold uppercase">Seat Held</span>
                                        <CheckCircle2 className="w-3.5 h-3.5" />
                                    </div>
                                ) : outbound?.isHeld ? (
                                    <div className="flex items-center gap-1 text-amber-600">
                                        <span className="text-[10px] font-bold uppercase text-amber-500">Next Step</span>
                                        <CircleDashed className="w-3.5 h-3.5 animate-spin-slow" />
                                    </div>
                                ) : null}
                                <PencilLine className={cn(
                                    "w-3.5 h-3.5 transition-colors",
                                    direction === 'INBOUND' ? "text-slate-900" : "text-slate-300 group-hover:text-slate-500"
                                )} />
                            </div>
                        </div>
                        {returnTrip ? (
                            <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                    <span className="text-sm font-bold text-slate-900">{returnTrip.route}</span>
                                    <span className="text-[10px] text-slate-400">{returnTrip.departure}</span>
                                </div>
                                <div className="flex items-center gap-2 text-xs text-slate-600">
                                    <span className="truncate max-w-[120px]">{returnTrip.pickup}</span>
                                    <ArrowRight className="w-3 h-3 flex-shrink-0 text-slate-300" />
                                    <span className="truncate max-w-[120px]">{returnTrip.dropoff}</span>
                                </div>
                            </div>
                        ) : (
                            <div className="h-10 flex items-center text-xs text-slate-400 font-medium italic">
                                {outbound?.isHeld ? "Waiting for selection..." : "Select outbound first"}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
