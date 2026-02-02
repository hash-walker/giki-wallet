import * as React from 'react';
import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Select } from '@/shared/components/ui/Select';
import { Button } from '@/shared/components/ui/button';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/shared/stores/authStore';
import { useTransportStore } from '../store';
import { getGIKIStopObject, formatTime, formatDate } from '../utils';
import type { Trip } from '../validators';
import { toast } from 'sonner';
import type { BookingSelection } from '../validators';
import { TransportBookingSkeleton } from './TransportBookingSkeleton';

// Badge component
const Badge = ({ type, children }: { type: 'EMPLOYEE' | 'STUDENT' | 'FULL'; children: React.ReactNode }) => {
    const colors = {
        EMPLOYEE: 'bg-primary',
        STUDENT: 'bg-accent',
        FULL: 'bg-destructive'
    };
    return (
        <span className={cn("px-2 py-0.5 text-white text-[0.65rem] rounded-full font-medium", colors[type])}>
            {children}
        </span>
    );
};

// Availability component
const Availability = ({ isFull, tickets }: { isFull: boolean; tickets?: number }) => (
    <span className={cn("font-semibold text-sm", isFull ? "text-destructive" : "text-primary")}>
        {isFull ? "Sold Out" : `${tickets} Left`}
    </span>
);

// TicketSelect component
const TicketSelect = ({
    ticketCount,
    setTicketCount,
    isStudent,
    maxTickets,
}: {
    ticketCount: number;
    setTicketCount: (n: number) => void;
    isStudent: boolean;
    maxTickets: number;
}) => {
    // Feature 1: Dynamic Quota Enforcement
    // Student: Max 1 seat. Employee: Max 3 seats.
    const effectiveMax = isStudent ? 1 : maxTickets;

    // Ensure we don't show options > effectiveMax
    const options = [1, 2, 3].filter(n => n <= effectiveMax);

    return (
        <select
            className="border border-gray-300 rounded-lg px-2 py-2.5 bg-white focus:ring-2 focus:ring-primary text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
            value={ticketCount}
            onChange={(e) => setTicketCount(Number(e.target.value))}
            disabled={isStudent || maxTickets <= 0 || options.length <= 1} // Disable if only 1 option (locked) or sold out
            title={isStudent ? "Students can only book 1 ticket" : undefined}
        >
            {options.map(n => (
                <option key={n} value={n}>{n}</option>
            ))}
        </select>
    );
};

interface TransportBookingCardProps {
    direction: 'OUTBOUND' | 'INBOUND';
    allTrips: Trip[];
    onBook?: (selection: BookingSelection) => void;
    loading?: boolean;
    quota?: { outbound: { remaining: number }; inbound: { remaining: number } } | null;
}

export const TransportBookingCard = ({
    direction,
    allTrips,
    onBook,
    loading = false,
    quota
}: TransportBookingCardProps) => {
    const navigate = useNavigate();
    const { user } = useAuthStore();
    const { activeHolds, releaseAllHolds, isRoundTrip } = useTransportStore();

    // Selection state
    const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);
    const [selectedTripId, setSelectedTripId] = useState<string | null>(null);
    const [selectedStopId, setSelectedStopId] = useState<string | null>(null);
    const [ticketCount, setTicketCount] = useState(1);

    // Derived flags
    const isStudent = user?.user_type === 'STUDENT';

    // Filter trips by direction
    const filteredTrips = useMemo(() => {
        if (!allTrips.length) return [];

        const filtered = allTrips.filter(trip => {
            const isOutbound = trip.direction.toUpperCase() === 'OUTBOUND';
            const matchesDirection = direction === 'OUTBOUND' ? isOutbound : !isOutbound;

            if (!matchesDirection) return false;

            if (trip.status !== 'OPEN') return false;

            return true;
        });

        return filtered;
    }, [allTrips, direction]);

    // Reset selection when direction changes
    useEffect(() => {
        setSelectedRouteId(null);
        setSelectedTripId(null);
        setSelectedStopId(null);
        setTicketCount(1);
    }, [direction]);

    // Role-based Auto-set logic can go here if needed
    useEffect(() => {
        if (isStudent) setTicketCount(1);
    }, [isStudent]);

    // Route options
    const routeOptions = useMemo(() => {
        const uniqueRoutes = new Map<string, string>();
        filteredTrips.forEach(trip => {
            uniqueRoutes.set(trip.route_id, trip.route_name);
        });
        return Array.from(uniqueRoutes).map(([id, name]) => ({
            value: id,
            label: name
        }));
    }, [filteredTrips]);

    // Time options
    const timeOptions = useMemo(() => {
        if (!selectedRouteId) return [];
        const routeTrips = filteredTrips.filter(t => t.route_id === selectedRouteId);
        return routeTrips.map(trip => {
            const date = formatDate(trip.departure_time);
            const time = formatTime(trip.departure_time);
            return {
                value: trip.id,
                label: `${date} - ${time} (${trip.bus_type})`
            };
        });
    }, [filteredTrips, selectedRouteId]);

    // Stop options
    const stopOptions = useMemo(() => {
        if (!selectedTripId) return [];
        const trip = filteredTrips.find(t => t.id === selectedTripId);

        if (!trip || !trip.stops || trip.stops.length === 0) return [];

        const sortedStops = [...trip.stops].sort((a, b) => a.sequence - b.sequence);
        const gikiIndex = sortedStops.findIndex(s => s.stop_name.toUpperCase().includes('GIKI'));

        let validStops = [];

        if (gikiIndex !== -1) {
            // GIKI explicitly in list
            if (direction === 'OUTBOUND') {
                validStops = sortedStops.slice(gikiIndex + 1);
            } else {
                validStops = sortedStops.slice(0, gikiIndex);
            }
        } else {
            // GIKI implied
            validStops = sortedStops;
        }

        return validStops.map(s => ({ value: s.stop_id, label: s.stop_name }));
    }, [filteredTrips, selectedTripId, direction]);

    const currentTrip = useMemo(() => {
        if (!selectedTripId) return null;
        return filteredTrips.find(t => t.id === selectedTripId);
    }, [filteredTrips, selectedTripId]);

    // Handlers
    // Helper to determine if we should auto-release
    const shouldReleaseOnUpdate = () => {
        if (activeHolds.length === 0) return false;

        if (!isRoundTrip) return true;

        const hasHoldForThisDirection = activeHolds.some(h =>
            h.direction?.toUpperCase() === direction
        );

        return hasHoldForThisDirection;
    };

    const handleRouteChange = (routeId: string | null) => {
        if (shouldReleaseOnUpdate() && selectedRouteId !== routeId) {
            releaseAllHolds();
        }
        setSelectedRouteId(routeId);
        setSelectedTripId(null);
        setSelectedStopId(null);
        setTicketCount(1);
    };

    const handleTimeChange = (tripId: string | null) => {
        if (shouldReleaseOnUpdate() && selectedTripId !== tripId) {
            releaseAllHolds();
        }
        setSelectedTripId(tripId);
        setSelectedStopId(null);
        setTicketCount(1);
    };

    const handleStopChange = (stopId: string | null) => {
        if (shouldReleaseOnUpdate() && selectedStopId !== stopId) {
            releaseAllHolds();
        }
        setSelectedStopId(stopId);
    };

    const handleBook = () => {
        if (!currentTrip || !selectedTripId || !selectedStopId) return;

        const isFullStatus = currentTrip.available_seats <= 0 || currentTrip.status === 'FULL';
        if (isFullStatus) {
            toast.error('This trip is full');
            return;
        }

        const gikiStop = getGIKIStopObject(currentTrip.stops);
        if (!gikiStop) {
            toast.error('GIKI Stop not found');
            return;
        }

        const payload: BookingSelection = {
            tripId: selectedTripId,
            pickupId: direction === 'OUTBOUND' ? gikiStop.stop_id : selectedStopId,
            dropoffId: direction === 'OUTBOUND' ? selectedStopId : gikiStop.stop_id,
            ticketCount,
        };

        onBook?.(payload);
    };

    // Auto-selection of stop if only one available
    useEffect(() => {
        if (stopOptions.length === 1 && !selectedStopId) {
            setSelectedStopId(stopOptions[0].value);
        }
    }, [stopOptions, selectedStopId]);

    const isFull = currentTrip ? (currentTrip.available_seats <= 0 || currentTrip.status === 'FULL') : false;
    const isScheduled = currentTrip?.status === 'SCHEDULED';

    // Max Tickets Logic:
    // 1. Hard Role Limit (Student=1, Employee=3 via TicketSelect which handles role check too, but let's be safe)
    // 2. Bus Capacity (available_seats)
    // 3. Quota Remaining (Dynamic)
    const directionKey = direction === 'OUTBOUND' ? 'outbound' : 'inbound';
    const quotaRemaining = quota ? quota[directionKey].remaining : 3; // Default to 3 if loading? Or maybe 0?

    // We act conservative. If no quota loaded, assume max possible (wait for hydration? or let TicketSelect cap it?)
    // Actually, store initializes as null. Let's default to full allowance if API hasn't loaded to avoid flickering '0'.

    const maxTickets = Math.min(
        3,
        currentTrip?.available_seats || 0,
        quotaRemaining
    );

    const hasCompleteSelection = !!(selectedRouteId && selectedTripId && selectedStopId && currentTrip);

    // Labels
    const stopLabel = direction === 'OUTBOUND' ? "Drop Location" : "Pickup Point";
    const routeLabel = "Route";

    if (loading) return <TransportBookingSkeleton />;

    return (
        <div className="bg-white rounded-xl overflow-hidden shadow-sm border border-gray-200 hover:shadow-md transition-all duration-300">
            {/* Mobile View */}
            <div className="block md:hidden p-4 space-y-3">
                <Select
                    options={routeOptions}
                    value={selectedRouteId}
                    onChange={handleRouteChange}
                    placeholder="Select Route"
                    label={routeLabel}
                />
                <Select
                    options={timeOptions}
                    value={selectedTripId}
                    onChange={handleTimeChange}
                    placeholder="Select Time"
                    disabledPlaceholder="Select route first"
                    label="Date & Time"
                    disabled={!selectedRouteId}
                />
                <Select
                    options={stopOptions}
                    value={selectedStopId}
                    onChange={handleStopChange}
                    placeholder="Select Stop"
                    disabledPlaceholder="Select time first"
                    label={stopLabel}
                    disabled={!selectedTripId}
                />

                {currentTrip && (
                    <div className="space-y-3 pt-2 border-t border-gray-100">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5">
                                {currentTrip.bus_type && (
                                    <Badge type={currentTrip.bus_type as any}>
                                        {currentTrip.bus_type}
                                    </Badge>
                                )}
                                <span className="text-[10px] font-bold text-gray-500 uppercase">{currentTrip.route_name}</span>
                                {isFull && <Badge type="FULL">Full</Badge>}
                            </div>
                            <Availability isFull={isFull} tickets={currentTrip.available_seats} />
                        </div>
                        <div className="flex gap-3 items-center">
                            <TicketSelect
                                ticketCount={ticketCount}
                                setTicketCount={setTicketCount}
                                isStudent={isStudent}
                                maxTickets={maxTickets}
                            />
                            <Button
                                className="flex-1 font-semibold"
                                disabled={isFull || isScheduled}
                                variant={isFull ? "secondary" : "default"}
                                onClick={handleBook}
                            >
                                {isFull ? "Full" : (isScheduled ? "Scheduled" : "Book")}
                            </Button>
                        </div>
                    </div>
                )}
            </div>

            {/* Desktop View */}
            <div className="hidden md:flex py-6 px-5 items-center gap-4">
                <div className="w-[18%]">
                    <Select
                        options={routeOptions}
                        value={selectedRouteId}
                        onChange={handleRouteChange}
                        placeholder="Select Route"
                        showLabel={false}
                    />
                </div>

                <div className="w-[18%]">
                    <Select
                        options={timeOptions}
                        value={selectedTripId}
                        onChange={handleTimeChange}
                        placeholder="Select Time"
                        disabledPlaceholder="Select route first"
                        disabled={!selectedRouteId}
                        showLabel={false}
                    />
                </div>

                <div className="w-[18%]">
                    <Select
                        options={stopOptions}
                        value={selectedStopId}
                        onChange={handleStopChange}
                        placeholder="Select Stop"
                        disabledPlaceholder="Select time first"
                        disabled={!selectedTripId}
                        showLabel={false}
                    />
                </div>

                <div className="w-[12%] flex justify-center">
                    {currentTrip ? (
                        <div className="flex items-center gap-1.5 flex-wrap justify-center">
                            {currentTrip.bus_type && (
                                <Badge type={currentTrip.bus_type as any}>
                                    {currentTrip.bus_type}
                                </Badge>
                            )}
                            <span className="text-[10px] font-bold text-gray-600 uppercase tracking-widest">{currentTrip.route_name}</span>
                            {isFull && <Badge type="FULL">Full</Badge>}
                        </div>
                    ) : (
                        <span className="text-xs text-gray-400">--</span>
                    )}
                </div>

                <div className="w-[10%] text-center">
                    {currentTrip ? (
                        <Availability isFull={isFull} tickets={currentTrip.available_seats} />
                    ) : (
                        <span className="text-xs text-gray-400">--</span>
                    )}
                </div>

                <div className="w-[8%] flex justify-center">
                    {hasCompleteSelection ? (
                        <TicketSelect
                            ticketCount={ticketCount}
                            setTicketCount={setTicketCount}
                            isStudent={isStudent}
                            maxTickets={maxTickets}
                        />
                    ) : (
                        <span className="text-xs text-gray-400">--</span>
                    )}
                </div>

                <div className="w-[16%]">
                    <Button
                        className="w-full font-semibold shadow-sm"
                        disabled={!hasCompleteSelection || isFull || isScheduled}
                        variant={!hasCompleteSelection || isFull ? "secondary" : "default"}
                        onClick={handleBook}
                    >
                        {isFull ? "Waitlist" : (isScheduled ? "Scheduled" : "Book Now")}
                    </Button>
                </div>
            </div>
        </div>
    );
};
