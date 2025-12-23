import { useState, useMemo } from 'react';
import { RouteDirection, BookingData, BookingSelection, Schedule } from '../types';
import { Select } from './Select';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { getAvailableTimeSlotsForCity, getAvailableStopsForCityAndTime, getScheduleForSelection } from '../data/mockRoutes';

// Badge component - defined outside to avoid recreation on each render
const Badge = ({ type, children }: { type: 'employee' | 'student' | 'full'; children: React.ReactNode }) => {
    const colors = {
        employee: 'bg-blue-500',
        student: 'bg-green-500',
        full: 'bg-red-500'
    };
    return (
        <span className={cn("px-2 py-0.5 text-white text-[0.65rem] rounded-full font-medium", colors[type])}>
            {children}
        </span>
    );
};

// Availability component - defined outside
const Availability = ({ isFull, tickets }: { isFull: boolean; tickets?: number }) => (
    <span className={cn("font-semibold text-sm", isFull ? "text-red-500" : "text-primary")}>
        {isFull ? "Sold Out" : `${tickets} Left`}
    </span>
);

// TicketSelect component - defined outside
const TicketSelect = ({ 
    ticketCount, 
    setTicketCount, 
    isStudent, 
    maxTickets 
}: { 
    ticketCount: number; 
    setTicketCount: (n: number) => void; 
    isStudent: boolean; 
    maxTickets: number;
}) => (
    <select
        className="border border-gray-300 rounded-lg px-2 py-2.5 bg-white focus:ring-2 focus:ring-primary text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
        value={ticketCount}
        onChange={(e) => setTicketCount(Number(e.target.value))}
        disabled={isStudent || maxTickets <= 0}
        title={isStudent ? "Students can only book 1 ticket" : undefined}
    >
        {[1, 2, 3].map(n => (
            <option key={n} value={n} disabled={n > maxTickets}>{n}</option>
        ))}
    </select>
);

interface BookingCardProps {
    direction: RouteDirection;
    bookingData: BookingData;
    onBook?: (selection: BookingSelection & { scheduleId: number }) => void;
}

export const BookingCard = ({ direction, bookingData, onBook }: BookingCardProps) => {
    const { cities, timeSlots, stops, schedules } = bookingData;

    // Selection state
    const [selectedCityId, setSelectedCityId] = useState<string | null>(null);
    const [selectedTimeSlotId, setSelectedTimeSlotId] = useState<string | null>(null);
    const [selectedStopId, setSelectedStopId] = useState<string | null>(null);
    const [ticketCount, setTicketCount] = useState(1);

    // Derived data based on selections
    const availableTimeSlots = useMemo(() => {
        if (!selectedCityId) return [];
        return getAvailableTimeSlotsForCity(selectedCityId, schedules, timeSlots);
    }, [selectedCityId, schedules, timeSlots]);

    const availableStops = useMemo(() => {
        if (!selectedCityId || !selectedTimeSlotId) return [];
        return getAvailableStopsForCityAndTime(selectedCityId, selectedTimeSlotId, schedules, stops);
    }, [selectedCityId, selectedTimeSlotId, schedules, stops]);

    const currentSchedule: Schedule | undefined = useMemo(() => {
        if (!selectedCityId || !selectedTimeSlotId || !selectedStopId) return undefined;
        return getScheduleForSelection(selectedCityId, selectedTimeSlotId, selectedStopId, schedules);
    }, [selectedCityId, selectedTimeSlotId, selectedStopId, schedules]);

    // Handle city change - reset dependent selections
    const handleCityChange = (cityId: string | null) => {
        setSelectedCityId(cityId);
        setSelectedTimeSlotId(null);
        setSelectedStopId(null);
        setTicketCount(1);
    };

    // Handle time slot change - reset dependent selections
    const handleTimeSlotChange = (timeSlotId: string | null) => {
        setSelectedTimeSlotId(timeSlotId);
        setSelectedStopId(null);
        setTicketCount(1);
    };

    // Handle stop change - reset ticket count
    const handleStopChange = (stopId: string | null) => {
        setSelectedStopId(stopId);
        setTicketCount(1);
    };

    // Handle booking
    const handleBook = () => {
        if (onBook && currentSchedule) {
            onBook({
                cityId: selectedCityId,
                timeSlotId: selectedTimeSlotId,
                stopId: selectedStopId,
                ticketCount,
                scheduleId: currentSchedule.id
            });
        }
    };

    const isFull = currentSchedule ? (currentSchedule.tickets <= 0 || currentSchedule.status === 'full') : false;
    const isHeld = currentSchedule?.is_held || false;
    const hasCompleteSelection = selectedCityId && selectedTimeSlotId && selectedStopId && currentSchedule;
    const isFromGIKI = direction === 'from-giki';
    const stopLabel = isFromGIKI ? "Drop Location" : "Pickup Point";

    // Convert data to select options
    const cityOptions = cities.map(c => ({ value: c.id, label: c.name }));
    const timeOptions = availableTimeSlots.map(t => ({ value: t.id, label: `${t.date} - ${t.time}` }));
    const stopOptions = availableStops.map(s => ({ value: s.id, label: s.name }));

    // Computed values for TicketSelect
    const isStudent = currentSchedule?.bus_type === 'Student';
    const maxTickets = Math.min(3, currentSchedule?.tickets || 0);

    return (
        <div className="bg-white rounded-xl overflow-hidden shadow-sm border border-gray-200 hover:shadow-md transition-all duration-300">
            {/* Mobile View */}
            <div className="block md:hidden p-4 space-y-3">
                <Select
                    options={cityOptions}
                    value={selectedCityId}
                    onChange={handleCityChange}
                    placeholder="Select City"
                    label="City"
                />
                <Select
                    options={timeOptions}
                    value={selectedTimeSlotId}
                    onChange={handleTimeSlotChange}
                    placeholder="Select Time"
                    disabledPlaceholder="Select city first"
                    label="Date & Time"
                    disabled={!selectedCityId}
                />
                <Select
                    options={stopOptions}
                    value={selectedStopId}
                    onChange={handleStopChange}
                    placeholder="Select Stop"
                    disabledPlaceholder="Select time first"
                    label={stopLabel}
                    disabled={!selectedTimeSlotId}
                />

                {hasCompleteSelection && (
                    <div className="space-y-3 pt-2 border-t border-gray-100">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5">
                                <Badge type={currentSchedule.bus_type === 'Student' ? 'student' : 'employee'}>
                                    {currentSchedule.bus_type}
                                </Badge>
                                {isFull && <Badge type="full">Full</Badge>}
                            </div>
                            <Availability isFull={isFull} tickets={currentSchedule?.tickets} />
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
                                disabled={isFull && !isHeld}
                                variant={isFull && !isHeld ? "secondary" : "default"}
                                onClick={handleBook}
                            >
                                {isHeld ? "Resume" : isFull ? "Full" : "Book"}
                            </Button>
                        </div>
                    </div>
                )}

                {!hasCompleteSelection && selectedCityId && (
                    <p className="text-sm text-gray-400 text-center py-2">
                        Complete all selections to see availability
                    </p>
                )}
            </div>

            {/* Desktop View */}
            <div className="hidden md:flex py-6 px-5 items-center gap-4">
                <div className="w-[18%]">
                    <Select
                        options={cityOptions}
                        value={selectedCityId}
                        onChange={handleCityChange}
                        placeholder="Select City"
                        showLabel={false}
                    />
                </div>

                <div className="w-[18%]">
                    <Select
                        options={timeOptions}
                        value={selectedTimeSlotId}
                        onChange={handleTimeSlotChange}
                        placeholder="Select Time"
                        disabledPlaceholder="Select city first"
                        disabled={!selectedCityId}
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
                        disabled={!selectedTimeSlotId}
                        showLabel={false}
                    />
                </div>

                <div className="w-[12%] flex justify-center">
                    {hasCompleteSelection ? (
                        <div className="flex items-center gap-1.5 flex-wrap justify-center">
                            <Badge type={currentSchedule.bus_type === 'Student' ? 'student' : 'employee'}>
                                {currentSchedule.bus_type}
                            </Badge>
                            {isFull && <Badge type="full">Full</Badge>}
                        </div>
                    ) : (
                        <span className="text-xs text-gray-400">--</span>
                    )}
                </div>

                <div className="w-[10%] text-center">
                    {hasCompleteSelection ? (
                        <Availability isFull={isFull} tickets={currentSchedule?.tickets} />
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
                        disabled={!hasCompleteSelection || (isFull && !isHeld)}
                        variant={!hasCompleteSelection || (isFull && !isHeld) ? "secondary" : "default"}
                        onClick={handleBook}
                    >
                        {isHeld ? "Resume" : isFull ? "Waitlist" : "Book Now"}
                    </Button>
                </div>
            </div>
        </div>
    );
};
