import * as React from 'react';
import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Select } from '@/shared/components/ui/Select';
import { Button } from '@/shared/components/ui/button';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/shared/stores/authStore';
import { useTransportStore } from '../store';
import {
    getUniqueRoutes,
    getAvailableTimesForRoute,
    getStopsForTrip,
    getTripById,
    isFromGIKI,
    isToGIKI,
    getGikiStop
} from '../utils';
import { Trip } from '../api';
import { toast } from 'sonner';
import { BookingSelection as TransportBookingSelection } from '../validators';

// Badge component
const Badge = ({ type, children }: { type: 'employee' | 'student' | 'full'; children: React.ReactNode }) => {
    const colors = {
        employee: 'bg-primary',
        student: 'bg-accent',
        full: 'bg-destructive'
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
    mode,
    onSelectionReset
}: {
    ticketCount: number;
    setTicketCount: (n: number) => void;
    isStudent: boolean;
    maxTickets: number;
    mode: 'immediate' | 'collect';
    onSelectionReset?: () => void;
}) => (
    <select
        className="border border-gray-300 rounded-lg px-2 py-2.5 bg-white focus:ring-2 focus:ring-primary text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
        value={ticketCount}
        onChange={(e) => {
            if (mode === 'collect') onSelectionReset?.();
            setTicketCount(Number(e.target.value));
        }}
        disabled={isStudent || maxTickets <= 0}
        title={isStudent ? "Students can only book 1 ticket" : undefined}
    >
        {[1, 2, 3].map(n => (
            <option key={n} value={n} disabled={n > maxTickets}>{n}</option>
        ))}
    </select>
);

interface TransportBookingCardProps {
    direction: 'from-giki' | 'to-giki';
    allTrips: Trip[];
    onBook?: (selection: TransportBookingSelection) => void;
    mode?: 'immediate' | 'collect';
    onSaveSelection?: (selection: TransportBookingSelection) => void;
    onSelectionReset?: () => void;
    sharedCityName?: string | null;  // For round trip linkage if needed
    loading?: boolean;
}

export const TransportBookingCard = ({
    direction,
    allTrips,
    onBook,
    mode = 'immediate',
    onSaveSelection,
    onSelectionReset,
    sharedCityName,
    loading = false
}: TransportBookingCardProps) => {
    const navigate = useNavigate();
    const { user } = useAuthStore();
    const { heldCity, stage, activeHolds, releaseAllHolds } = useTransportStore();

    // Selection state
    const [selectedRouteName, setSelectedRouteName] = useState<string | null>(null);
    const [selectedTripId, setSelectedTripId] = useState<string | null>(null);
    const [selectedStopId, setSelectedStopId] = useState<string | null>(null);
    const [ticketCount, setTicketCount] = useState(1);

    // Derived flags
    const isStudent = user?.user_type === 'student';

    // Effect to sync shared city or held city (for return leg)
    useEffect(() => {
        if (stage === 'select_return' && heldCity) {
            setSelectedRouteName(heldCity);
        } else if (sharedCityName !== undefined && sharedCityName !== selectedRouteName) {
            setSelectedRouteName(sharedCityName);
            setSelectedTripId(null);
            setSelectedStopId(null);
            setTicketCount(1);
        }
    }, [sharedCityName, heldCity, stage]);

    // Auto-set ticket count for students
    useEffect(() => {
        if (isStudent) setTicketCount(1);
    }, [isStudent]);

    // Derived Options
    const routeOptions = useMemo(() => getUniqueRoutes(allTrips, direction), [allTrips, direction]);

    const timeOptions = useMemo(() => {
        if (!selectedRouteName) return [];
        return getAvailableTimesForRoute(allTrips, selectedRouteName, direction);
    }, [allTrips, selectedRouteName, direction]);

    const stopOptions = useMemo(() => {
        if (!selectedTripId) return [];
        return getStopsForTrip(allTrips, selectedTripId, direction);
    }, [allTrips, selectedTripId, direction]);

    const currentTrip = useMemo(() => {
        if (!selectedTripId) return null;
        return getTripById(allTrips, selectedTripId);
    }, [allTrips, selectedTripId]);

    // Handlers
    const handleRouteChange = (routeName: string | null) => {
        if (mode === 'collect') onSelectionReset?.();
        if (stage === 'select_return' && heldCity) return;

        if (activeHolds.length > 0 && selectedRouteName !== routeName) {
            releaseAllHolds();
        }

        setSelectedRouteName(routeName);
        setSelectedTripId(null);
        setSelectedStopId(null);
        setTicketCount(1);
    };

    const handleTimeChange = (tripId: string | null) => {
        if (mode === 'collect') onSelectionReset?.();

        if (activeHolds.length > 0 && selectedTripId !== tripId) {
            releaseAllHolds();
        }

        setSelectedTripId(tripId);
        setSelectedStopId(null);
        setTicketCount(1);
    };

    const handleStopChange = (stopId: string | null) => {
        if (mode === 'collect') onSelectionReset?.();

        if (activeHolds.length > 0 && selectedStopId !== stopId) {
            releaseAllHolds();
        }

        setSelectedStopId(stopId);
    };

    const handleBook = () => {
        if (!currentTrip || !selectedTripId || !selectedStopId) return;

        const isFullStatus = currentTrip.available_seats <= 0 || currentTrip.booking_status === 'FULL';
        if (isFullStatus) {
            toast.error('This trip is full');
            return;
        }

        const gikiStopId = getGikiStop(currentTrip.stops);
        if (!gikiStopId) {
            toast.error('GIKI Stop not found');
            return;
        }

        const payload: TransportBookingSelection = {
            tripId: selectedTripId,
            pickupId: direction === 'from-giki' ? gikiStopId : selectedStopId,
            dropoffId: direction === 'from-giki' ? selectedStopId : gikiStopId,
            ticketCount,
            isFull: isFullStatus
        };

        if (mode === 'collect') {
            onSaveSelection?.(payload);
        } else {
            onBook?.(payload);
        }
    };

    // Auto-selection of stop if only one is available
    useEffect(() => {
        if (stopOptions.length === 1 && !selectedStopId) {
            setSelectedStopId(stopOptions[0].value);
        }
    }, [stopOptions, selectedStopId]);

    // Auto-Hold Logic: Trigger handleBook when valid selection is complete
    useEffect(() => {
        const canAutoHold = selectedRouteName && selectedTripId && selectedStopId && currentTrip && activeHolds.length === 0;
        if (canAutoHold) {
            // Check if it's already full before holding
            const isFullStatus = currentTrip.available_seats <= 0 || currentTrip.booking_status === 'FULL';
            const isScheduled = currentTrip.booking_status === 'SCHEDULED';
            if (!isFullStatus && !isScheduled) {
                handleBook();
            }
        }
    }, [selectedRouteName, selectedTripId, selectedStopId, currentTrip, activeHolds.length]);

    const isFull = currentTrip ? (currentTrip.available_seats <= 0 || currentTrip.booking_status === 'FULL') : false;
    const isScheduled = currentTrip?.booking_status === 'SCHEDULED';
    const maxTickets = Math.min(3, currentTrip?.available_seats || 0);
    const hasCompleteSelection = !!(selectedRouteName && selectedTripId && selectedStopId && currentTrip);

    // Labels
    const stopLabel = direction === 'from-giki' ? "Drop Location" : "Pickup Point";
    const routeLabel = "Route";

    if (loading) return <div className="p-8 text-center text-gray-400">Loading schedules...</div>;

    return (
        <div className="bg-white rounded-xl overflow-hidden shadow-sm border border-gray-200 hover:shadow-md transition-all duration-300">
            {/* Mobile View */}
            <div className="block md:hidden p-4 space-y-3">
                {sharedCityName === undefined && (
                    <Select
                        options={routeOptions}
                        value={selectedRouteName}
                        onChange={handleRouteChange}
                        placeholder="Select Route"
                        label={routeLabel}
                        disabled={stage === 'select_return' && !!heldCity}
                    />
                )}
                <Select
                    options={timeOptions}
                    value={selectedTripId}
                    onChange={handleTimeChange}
                    placeholder="Select Time"
                    disabledPlaceholder="Select route first"
                    label="Date & Time"
                    disabled={!selectedRouteName}
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

                {hasCompleteSelection && currentTrip && (
                    <div className="space-y-3 pt-2 border-t border-gray-100">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5">
                                {currentTrip.bus_type && (
                                    <Badge type={currentTrip.bus_type.toLowerCase() as any}>
                                        {currentTrip.bus_type}
                                    </Badge>
                                )}
                                <span className="text-[10px] font-bold text-gray-500 uppercase">{currentTrip.route_name}</span>
                                {isFull && <Badge type="full">Full</Badge>}
                            </div>
                            <Availability isFull={isFull} tickets={currentTrip.available_seats} />
                        </div>
                        <div className="flex gap-3 items-center">
                            <TicketSelect
                                ticketCount={ticketCount}
                                setTicketCount={setTicketCount}
                                isStudent={isStudent}
                                maxTickets={maxTickets}
                                mode={mode}
                                onSelectionReset={onSelectionReset}
                            />
                            <Button
                                className="flex-1 font-semibold"
                                disabled={isFull || isScheduled}
                                variant={isFull ? "secondary" : "default"}
                                onClick={handleBook}
                            >
                                {mode === 'collect'
                                    ? isFull ? "Sold Out" : "Save Selection"
                                    : isFull ? "Full" : (isScheduled ? "Scheduled" : "Book")}
                            </Button>
                        </div>
                    </div>
                )}
            </div>

            {/* Desktop View */}
            <div className="hidden md:flex py-6 px-5 items-center gap-4">
                {sharedCityName === undefined && (
                    <div className="w-[18%]">
                        <Select
                            options={routeOptions}
                            value={selectedRouteName}
                            onChange={handleRouteChange}
                            placeholder="Select Route"
                            showLabel={false}
                            disabled={stage === 'select_return' && !!heldCity}
                        />
                    </div>
                )}

                <div className={sharedCityName === undefined ? "w-[18%]" : "w-[24%]"}>
                    <Select
                        options={timeOptions}
                        value={selectedTripId}
                        onChange={handleTimeChange}
                        placeholder="Select Time"
                        disabledPlaceholder={sharedCityName ? "Select time" : "Select route first"}
                        disabled={!selectedRouteName}
                        showLabel={false}
                    />
                </div>

                <div className={sharedCityName === undefined ? "w-[18%]" : "w-[24%]"}>
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

                <div className={cn(sharedCityName === undefined ? "w-[12%]" : "w-[13%]", "flex justify-center")}>
                    {hasCompleteSelection && currentTrip ? (
                        <div className="flex items-center gap-1.5 flex-wrap justify-center">
                            {currentTrip.bus_type && (
                                <Badge type={currentTrip.bus_type.toLowerCase() as any}>
                                    {currentTrip.bus_type}
                                </Badge>
                            )}
                            <span className="text-[10px] font-bold text-gray-600 uppercase tracking-widest">{currentTrip.route_name}</span>
                            {isFull && <Badge type="full">Full</Badge>}
                        </div>
                    ) : (
                        <span className="text-xs text-gray-400">--</span>
                    )}
                </div>

                <div className={cn(sharedCityName === undefined ? "w-[10%]" : "w-[11%]", "text-center")}>
                    {hasCompleteSelection && currentTrip ? (
                        <Availability isFull={isFull} tickets={currentTrip.available_seats} />
                    ) : (
                        <span className="text-xs text-gray-400">--</span>
                    )}
                </div>

                <div className={cn(sharedCityName === undefined ? "w-[8%]" : "w-[9%]", "flex justify-center")}>
                    {hasCompleteSelection ? (
                        <TicketSelect
                            ticketCount={ticketCount}
                            setTicketCount={setTicketCount}
                            isStudent={isStudent}
                            maxTickets={maxTickets}
                            mode={mode}
                            onSelectionReset={onSelectionReset}
                        />
                    ) : (
                        <span className="text-xs text-gray-400">--</span>
                    )}
                </div>

                <div className={sharedCityName === undefined ? "w-[16%]" : "w-[19%]"}>
                    <Button
                        className="w-full font-semibold shadow-sm"
                        disabled={!hasCompleteSelection || isFull || isScheduled}
                        variant={!hasCompleteSelection || isFull ? "secondary" : "default"}
                        onClick={handleBook}
                    >
                        {mode === 'collect'
                            ? isFull ? "Sold Out" : "Save Selection"
                            : isFull ? "Waitlist" : (isScheduled ? "Scheduled" : "Book Now")}
                    </Button>
                </div>
            </div>
        </div>
    );
};
