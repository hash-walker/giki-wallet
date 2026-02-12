import { useState, useMemo, useEffect } from 'react';
import { Bus, Clock, MapPin, Users, Lock } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Select } from '@/shared/components/ui/Select';
import { cn } from '@/lib/utils';
import { formatTime12 } from '../utils';
import type { Trip } from '../validators';

interface RouteCardProps {
    routeName: string;
    routeId: string;
    direction: 'OUTBOUND' | 'INBOUND';
    trips: Trip[];
    activeHolds: any[];
    isStudent: boolean;
    quota: { limit: number; used: number; remaining: number } | null;
    isRoundTrip?: boolean;
    onBook: (tripId: string, stopId: string, ticketCount: number) => void;
}

export const RouteCard = ({
    routeName,
    routeId,
    direction,
    trips,
    activeHolds,
    isStudent,
    quota,
    isRoundTrip = false,
    onBook
}: RouteCardProps) => {
    const [selectedTripId, setSelectedTripId] = useState<string | null>(null);
    const [selectedStopId, setSelectedStopId] = useState<string | null>(null);
    const [ticketCount, setTicketCount] = useState(1);
    const [currentTime, setCurrentTime] = useState(Date.now());

    // Update current time every minute for live countdown
    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentTime(Date.now());
        }, 60000); // Update every 1 minute
        return () => clearInterval(timer);
    }, []);

    // Helper to format time remaining
    const getTimeRemaining = (opensAt: string) => {
        const now = currentTime;
        const openTime = new Date(opensAt).getTime();
        const diff = openTime - now;

        // If booking has already opened or opening very soon
        if (diff <= 60000) return 'Opening soon...'; // Less than 1 minute

        const totalMinutes = Math.floor(diff / 60000);
        const hours = Math.floor(totalMinutes / 60);
        const days = Math.floor(hours / 24);
        const remainingHours = hours % 24;
        const remainingMinutes = totalMinutes % 60;

        if (days > 0) {
            return `Opens in ${days}d ${remainingHours}h`;
        }
        if (hours > 0) {
            return `Opens in ${hours}h ${remainingMinutes}m`;
        }
        if (totalMinutes > 0) {
            return `Opens in ${totalMinutes}m`;
        }
        
        return 'Opening soon...';
    };

    // Get selected trip
    const selectedTrip = trips.find(t => t.id === selectedTripId);

    // Get stops for selected trip
    const stopOptions = useMemo(() => {
        if (!selectedTrip) return [];
        
        // Filter out GIKI stop - stops is already an array
        return selectedTrip.stops
            .filter((s) => !s.stop_name.includes('GIKI'))
            .map((s) => ({
                value: s.stop_id,
                label: s.stop_name
            }));
    }, [selectedTrip]);

    // Auto-select stop if only one option
    useMemo(() => {
        if (stopOptions.length === 1 && !selectedStopId) {
            setSelectedStopId(stopOptions[0].value);
        }
    }, [stopOptions, selectedStopId]);

    // Check if trip is held
    const isHeld = selectedTrip ? activeHolds.some(h => h.trip_id === selectedTrip.id) : false;
    
    // Check if trip is full or scheduled
    const isFull = selectedTrip ? (selectedTrip.available_seats <= 0 || selectedTrip.status === 'FULL') : false;
    const isScheduled = selectedTrip?.status === 'SCHEDULED';

    // Calculate max tickets
    const quotaRemaining = quota?.remaining ?? 3;
    const maxTickets = Math.min(
        3,
        selectedTrip?.available_seats || 0,
        quotaRemaining
    );

    const handleBook = () => {
        if (!selectedTripId || !selectedStopId) return;
        onBook(selectedTripId, selectedStopId, ticketCount);
    };

    const canBook = selectedTripId && selectedStopId && !isFull && !isScheduled;

    return (
        <div className={cn(
            "bg-white border-2 rounded-2xl p-5 transition-all duration-300",
            selectedTripId ? "border-primary shadow-lg" : "border-gray-200 hover:border-gray-300 hover:shadow-md"
        )}>
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                        <Bus className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                        <h3 className="font-bold text-base text-gray-900">{routeName}</h3>
                        <p className="text-xs text-gray-500 uppercase tracking-wide">
                            {trips[0]?.bus_type || 'STUDENT'}
                        </p>
                    </div>
                </div>
                {isHeld && (
                    <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-full">
                        Reserved
                    </span>
                )}
            </div>

            {/* Time Slots */}
            <div className="space-y-2 mb-4">
                <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                    Select Time
                </label>
                <div className="space-y-2">
                    {trips.length === 0 ? (
                        <div className="text-center py-6 text-gray-400 text-sm">
                            No trips available
                        </div>
                    ) : (
                        trips.map((trip) => {
                            const tripFull = trip.available_seats <= 0 || trip.status === 'FULL';
                            const tripScheduled = trip.status === 'SCHEDULED';
                            const tripCancelled = trip.status === 'CANCELLED';
                            const isDisabled = tripFull || tripScheduled || tripCancelled;
                            
                            return (
                                <label
                                    key={trip.id}
                                    className={cn(
                                        "flex items-center justify-between p-3 border-2 rounded-xl cursor-pointer transition-all",
                                        selectedTripId === trip.id 
                                            ? "border-primary bg-primary/5" 
                                            : "border-gray-200 hover:border-gray-300 hover:bg-gray-50",
                                        isDisabled && "opacity-60 cursor-not-allowed",
                                        tripScheduled && "bg-blue-50/50 border-blue-200",
                                        tripCancelled && "bg-red-50 border-red-200"
                                    )}
                                >
                                    <div className="flex items-center gap-3">
                                        <input
                                            type="radio"
                                            name={`trip-${routeId}`}
                                            value={trip.id}
                                            checked={selectedTripId === trip.id}
                                            onChange={() => {
                                                if (!isDisabled) {
                                                    setSelectedTripId(trip.id);
                                                    setSelectedStopId(null);
                                                    setTicketCount(1);
                                                }
                                            }}
                                            disabled={isDisabled}
                                            className="w-4 h-4 text-primary"
                                        />
                                        <div className="flex items-center gap-2">
                                            <Clock className="w-4 h-4 text-gray-400" />
                                            <span className="font-semibold text-sm">
                                                {formatTime12(trip.departure_time)}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-end gap-1">
                                        {tripCancelled ? (
                                            <span className="text-xs text-red-700 font-bold uppercase">CANCELLED</span>
                                        ) : tripScheduled ? (
                                            <>
                                                <div className="flex items-center gap-1.5 bg-blue-100 px-2 py-1 rounded-md">
                                                    <Lock className="w-3 h-3 text-blue-700" />
                                                    <span className="text-xs text-blue-700 font-bold uppercase">
                                                        Locked
                                                    </span>
                                                </div>
                                                <span className="text-[10px] text-blue-600 font-semibold">
                                                    {getTimeRemaining(trip.booking_opens_at)}
                                                </span>
                                                <span className="text-[9px] text-gray-500">
                                                    @ {formatTime12(trip.booking_opens_at)}
                                                </span>
                                            </>
                                        ) : tripFull ? (
                                            <span className="text-xs text-red-600 font-bold">FULL</span>
                                        ) : (
                                            <div className="flex items-center gap-1.5">
                                                <Users className="w-3.5 h-3.5 text-green-600" />
                                                <span className="font-bold text-sm text-gray-900">
                                                    {trip.available_seats}
                                                </span>
                                                <span className="text-xs text-gray-400 font-medium">
                                                    / {trip.total_capacity}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </label>
                            );
                        })
                    )}
                </div>
            </div>

            {/* Stop Selection (only if trip selected) */}
            {selectedTripId && stopOptions.length > 0 && (
                <div className="mb-4">
                    <div className="flex items-center gap-2 text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">
                        <MapPin className="w-3 h-3" />
                        {direction === 'OUTBOUND' ? 'Drop-off Location' : 'Pickup Location'}
                    </div>
                    <Select
                        options={stopOptions}
                        value={selectedStopId}
                        onChange={setSelectedStopId}
                        placeholder="Select your stop"
                        showLabel={false}
                    />
                </div>
            )}

            {/* Ticket Count (only if stop selected) */}
            {selectedTripId && selectedStopId && !isStudent && (
                <div className="mb-4">
                    <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide block mb-2">
                        Number of Tickets
                    </label>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setTicketCount(Math.max(1, ticketCount - 1))}
                            disabled={ticketCount <= 1}
                            className="w-10 h-10 rounded-lg border-2 border-gray-300 hover:border-primary disabled:opacity-50 disabled:cursor-not-allowed font-bold text-lg"
                        >
                            −
                        </button>
                        <span className="text-2xl font-bold text-gray-900 min-w-[3ch] text-center">
                            {ticketCount}
                        </span>
                        <button
                            onClick={() => setTicketCount(Math.min(maxTickets, ticketCount + 1))}
                            disabled={ticketCount >= maxTickets}
                            className="w-10 h-10 rounded-lg border-2 border-gray-300 hover:border-primary disabled:opacity-50 disabled:cursor-not-allowed font-bold text-lg"
                        >
                            +
                        </button>
                        <span className="text-xs text-gray-500 ml-2">
                            Max: {maxTickets}
                        </span>
                    </div>
                </div>
            )}

            {/* Book Button */}
            <Button
                className="w-full h-12 text-base font-bold"
                disabled={!canBook}
                onClick={handleBook}
            >
                {isHeld ? 'Reserved' : (isFull ? 'Fully Booked' : (isScheduled ? 'Not Open Yet' : (isRoundTrip ? 'Select Trip' : 'Book Now →')))}
            </Button>
        </div>
    );
};
