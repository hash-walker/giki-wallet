import * as React from 'react';
import { useState, useMemo, useEffect } from 'react';
import { Select } from '@/shared/components/ui/Select';
import { Button } from '@/shared/components/ui/button';
import { cn } from '@/lib/utils';
import {
    getUniqueCities,
    getAvailableTimesForCity,
    getStopsForTrip,
    getTripById,
    isFromGIKI,
    isToGIKI
} from '../utils';
import { Trip } from '../api';

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

export interface TransportBookingSelection {
    tripId: string;
    pickupId: string;
    dropoffId: string;
    ticketCount: number;
    isFull: boolean;
}

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

    // Selection state
    const [selectedCityName, setSelectedCityName] = useState<string | null>(null);
    const [selectedTripId, setSelectedTripId] = useState<string | null>(null);
    const [selectedStopId, setSelectedStopId] = useState<string | null>(null);
    const [ticketCount, setTicketCount] = useState(1);

    // Effect to sync shared city
    useEffect(() => {
        if (sharedCityName !== undefined && sharedCityName !== selectedCityName) {
            setSelectedCityName(sharedCityName);
            setSelectedTripId(null);
            setSelectedStopId(null);
            setTicketCount(1);
        }
    }, [sharedCityName]);

    // Derived Options using helpers
    // 1. Cities
    const cityOptions = useMemo(() => getUniqueCities(allTrips, direction), [allTrips, direction]);

    // 2. Time Slots (Trips)
    const timeOptions = useMemo(() => {
        if (!selectedCityName) return [];
        return getAvailableTimesForCity(allTrips, selectedCityName, direction);
    }, [allTrips, selectedCityName, direction]);

    // 3. Stops
    const stopOptions = useMemo(() => {
        if (!selectedTripId) return [];
        return getStopsForTrip(allTrips, selectedTripId, direction);
    }, [allTrips, selectedTripId, direction]);

    // 4. Current Trip Data
    const currentTrip = useMemo(() => {
        if (!selectedTripId) return null;
        return getTripById(allTrips, selectedTripId);
    }, [allTrips, selectedTripId]);


    // Handlers
    const handleCityChange = (cityName: string | null) => {
        if (mode === 'collect') onSelectionReset?.();
        if (sharedCityName === undefined) {
            setSelectedCityName(cityName);
        }
        setSelectedTripId(null);
        setSelectedStopId(null);
        setTicketCount(1);
    };

    const handleTimeChange = (tripId: string | null) => {
        if (mode === 'collect') onSelectionReset?.();
        setSelectedTripId(tripId);
        setSelectedStopId(null);
        setTicketCount(1);
    };

    const handleStopChange = (stopId: string | null) => {
        if (mode === 'collect') onSelectionReset?.();
        setSelectedStopId(stopId);
        setTicketCount(1);
    };

    const handleBook = () => {
        if (!currentTrip || !selectedTripId || !selectedStopId) return;

        // Determine Pickup/Dropoff based on direction
        let pickupId = '';
        let dropoffId = '';

        const gikiStopIndex = currentTrip.stops.findIndex(s => s.stop_name.toLowerCase().includes('giki'));
        const gikiStopId = gikiStopIndex !== -1 ? currentTrip.stops[gikiStopIndex].stop_id : null;

        if (!gikiStopId) {
            console.error("GIKI Stop not found on trip");
            return;
        }

        if (direction === 'from-giki') {
            pickupId = gikiStopId;
            dropoffId = selectedStopId;
        } else {
            pickupId = selectedStopId;
            dropoffId = gikiStopId;
        }

        const isFull = currentTrip.available_seats <= 0 || currentTrip.booking_status === 'FULL';

        const payload: TransportBookingSelection = {
            tripId: selectedTripId,
            pickupId,
            dropoffId,
            ticketCount,
            isFull
        };

        if (mode === 'collect') {
            onSaveSelection?.(payload);
        } else {
            onBook?.(payload);
        }
    };

    const isFull = currentTrip ? (currentTrip.available_seats <= 0 || currentTrip.booking_status === 'FULL') : false;
    const isScheduled = currentTrip?.booking_status === 'SCHEDULED';
    const isStudent = false; // We don't have explicit student/employee flag on Trip yet, or infer from route name? 
    // Assuming generic for now, strict "Student" bus logic might rely on route_name parsing if needed.
    const maxTickets = Math.min(3, currentTrip?.available_seats || 0);

    const hasCompleteSelection = selectedCityName && selectedTripId && selectedStopId && currentTrip;

    // Labels
    const stopLabel = direction === 'from-giki' ? "Drop Location" : "Pickup Point";
    const cityLabel = "City"; // Generic

    if (loading) return <div className="p-8 text-center text-gray-400">Loading schedules...</div>;

    return (
        <div className="bg-white rounded-xl overflow-hidden shadow-sm border border-gray-200 hover:shadow-md transition-all duration-300">
            {/* Mobile View */}
            <div className="block md:hidden p-4 space-y-3">
                {sharedCityName === undefined && (
                    <Select
                        options={cityOptions}
                        value={selectedCityName}
                        onChange={handleCityChange}
                        placeholder="Select City"
                        label={cityLabel}
                    />
                )}
                <Select
                    options={timeOptions}
                    value={selectedTripId}
                    onChange={handleTimeChange}
                    placeholder="Select Time"
                    disabledPlaceholder="Select city first"
                    label="Date & Time"
                    disabled={!selectedCityName}
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
                                {/* Infer Type from route name if possible, else generic */}
                                <Badge type="employee">{currentTrip.route_name}</Badge>
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
                            options={cityOptions}
                            value={selectedCityName}
                            onChange={handleCityChange}
                            placeholder="Select City"
                            showLabel={false}
                        />
                    </div>
                )}

                <div className={sharedCityName === undefined ? "w-[18%]" : "w-[24%]"}>
                    <Select
                        options={timeOptions}
                        value={selectedTripId}
                        onChange={handleTimeChange}
                        placeholder="Select Time"
                        disabledPlaceholder={sharedCityName ? "Select time" : "Select city first"}
                        disabled={!selectedCityName}
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
                            {/* <Badge type="student">Student</Badge> */}
                            {/* Skipping type badge for now unless route_name has it */}
                            <span className="text-xs font-bold text-gray-500">{currentTrip.route_name}</span>
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
