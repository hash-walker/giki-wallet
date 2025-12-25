import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type SavedSelection = {
    cityId: string | null;
    timeSlotId: string | null;
    stopId: string | null;
    ticketCount: number;
    scheduleId: number;
    busType?: string;
    ticketsLeft?: number;
};

type PassengerData = {
    name: string;
    cnic: string;
    relation: string;
};

interface EmployeeTicketInfo {
    employeeTicketExistsToday?: boolean; // Employee already booked for themselves today
    canBookFamily?: boolean; // Can book family tickets
    familySlotsRemaining?: number; // Remaining family ticket slots
    routeAlreadyBooked?: boolean; // Already booked this specific route
}

interface EmployeeBookingConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (data: { selections: SavedSelection[]; passengers: PassengerData[][]; isEmployeeTraveling: boolean[] }) => void;
    selections: SavedSelection[];
    cities: Array<{ id: string; name: string }>;
    timeSlots: Array<{ id: string; date: string; time: string }>;
    stops: Array<{ id: string; name: string }>;
    isRoundTrip?: boolean;
    employeeTicketInfo?: EmployeeTicketInfo; // Employee-specific constraints
}

export const EmployeeBookingConfirmationModal = ({
    isOpen,
    onClose,
    onConfirm,
    selections,
    cities,
    timeSlots,
    stops,
    isRoundTrip = false,
    employeeTicketInfo
}: EmployeeBookingConfirmationModalProps) => {
    // State for ticket counts and passenger data
    const [ticketCounts, setTicketCounts] = useState<number[]>([]);
    const [passengers, setPassengers] = useState<PassengerData[][]>([]);
    // State for whether employee is traveling on each trip
    const [isEmployeeTraveling, setIsEmployeeTraveling] = useState<boolean[]>([]);

    // Initialize state when modal opens or selections change
    useEffect(() => {
        if (isOpen && selections.length > 0) {
            const initialCounts = selections.map(sel => sel.ticketCount);
            const initialPassengers = selections.map(sel => 
                Array(sel.ticketCount).fill(null).map(() => ({ name: '', cnic: '', relation: '' }))
            );
            // Initialize employee traveling state (disabled if already booked today)
            const initialEmployeeTraveling = selections.map(() => 
                employeeTicketInfo?.employeeTicketExistsToday ? false : false
            );
            setTicketCounts(initialCounts);
            setPassengers(initialPassengers);
            setIsEmployeeTraveling(initialEmployeeTraveling);
        }
    }, [isOpen, selections, employeeTicketInfo]);

    if (!isOpen) return null;

    const getCityName = (cityId: string | null) => {
        return cities.find(c => c.id === cityId)?.name || 'N/A';
    };

    const getTimeSlot = (timeSlotId: string | null) => {
        const slot = timeSlots.find(t => t.id === timeSlotId);
        return slot ? `${slot.date} - ${slot.time}` : 'N/A';
    };

    const getStopName = (stopId: string | null) => {
        return stops.find(s => s.id === stopId)?.name || 'N/A';
    };

    const getMaxTickets = (index: number) => {
        const selection = selections[index];
        const available = selection.ticketsLeft ?? selection.ticketCount ?? 3;
        const employeeTraveling = isEmployeeTraveling[index] || false;
        
        // Constraint: If employee is traveling, max 2 family tickets (Employee + 2 family = 3 total)
        // If employee is NOT traveling, max 3 family tickets
        const policyMax = employeeTraveling ? 2 : 3;
        
        // Also limited by backend family slots remaining (if provided, otherwise use policy max)
        const familySlotsRemaining = employeeTicketInfo?.familySlotsRemaining ?? policyMax;
        
        // And limited by seat availability (subtract 1 if employee is traveling)
        const seatsAvailableForFamily = Math.max(0, available - (employeeTraveling ? 1 : 0));
        
        // Return the minimum of all constraints, but at least 1 if seats are available
        const maxAllowed = Math.min(policyMax, familySlotsRemaining, seatsAvailableForFamily);
        return Math.max(1, maxAllowed); // Always allow at least 1 ticket if calculation allows
    };

    const handleTicketCountChange = (index: number, newCount: number) => {
        const maxTickets = getMaxTickets(index);
        const count = Math.min(newCount, maxTickets);
        
        const newCounts = [...ticketCounts];
        newCounts[index] = count;
        setTicketCounts(newCounts);

        // Update passengers array
        const newPassengers = [...passengers];
        if (count > passengers[index].length) {
            // Add new passenger fields
            newPassengers[index] = [
                ...passengers[index],
                ...Array(count - passengers[index].length).fill(null).map(() => ({ name: '', cnic: '', relation: '' }))
            ];
        } else {
            // Remove excess passenger fields
            newPassengers[index] = passengers[index].slice(0, count);
        }
        setPassengers(newPassengers);
    };

    const handlePassengerChange = (tripIndex: number, passengerIndex: number, field: keyof PassengerData, value: string) => {
        const newPassengers = [...passengers];
        newPassengers[tripIndex][passengerIndex][field] = value;
        setPassengers(newPassengers);
    };

    const validateCNIC = (cnic: string): boolean => {
        // CNIC format: 12345-1234567-1 (14 characters with dashes)
        const cnicPattern = /^\d{5}-\d{7}-\d{1}$/;
        return cnicPattern.test(cnic);
    };

    const formatCNIC = (value: string): string => {
        // Remove all non-digits
        const digits = value.replace(/\D/g, '');
        
        // Format as 12345-1234567-1
        if (digits.length <= 5) {
            return digits;
        } else if (digits.length <= 12) {
            return `${digits.slice(0, 5)}-${digits.slice(5)}`;
        } else {
            return `${digits.slice(0, 5)}-${digits.slice(5, 12)}-${digits.slice(12, 13)}`;
        }
    };

    const handleEmployeeTravelChange = (index: number, checked: boolean) => {
        const newEmployeeTraveling = [...isEmployeeTraveling];
        newEmployeeTraveling[index] = checked;
        setIsEmployeeTraveling(newEmployeeTraveling);
        
        // If employee is now traveling, adjust ticket count if needed
        const maxTickets = getMaxTickets(index);
        if (checked && ticketCounts[index] > maxTickets) {
            const newCounts = [...ticketCounts];
            newCounts[index] = maxTickets;
            setTicketCounts(newCounts);
            
            // Remove excess passengers
            const newPassengers = [...passengers];
            newPassengers[index] = passengers[index].slice(0, maxTickets);
            setPassengers(newPassengers);
        }
    };

    const handleConfirm = () => {
        // Check if route is already booked
        if (employeeTicketInfo?.routeAlreadyBooked) {
            alert('You have already booked a ticket for this route. You cannot book multiple tickets for the same route.');
            return;
        }

        // Check if can book family tickets
        if (!employeeTicketInfo?.canBookFamily && ticketCounts.some((count, idx) => count > (isEmployeeTraveling[idx] ? 1 : 0))) {
            alert('Family ticket slots are not available. Please try again later.');
            return;
        }

        // Validate that all required fields are filled
        const allFieldsFilled = passengers.every(tripPassengers => 
            tripPassengers.every(p => 
                p.name.trim() !== '' && 
                p.relation !== '' &&
                (p.cnic.trim() === '' || validateCNIC(p.cnic))
            )
        );

        if (!allFieldsFilled) {
            alert('Please fill in all required fields. CNIC must be in format: 12345-1234567-1');
            return;
        }

        // Validate ticket counts don't exceed limits
        const exceedsLimits = ticketCounts.some((count, index) => {
            const maxTickets = getMaxTickets(index);
            return count > maxTickets;
        });

        if (exceedsLimits) {
            alert('Ticket count exceeds allowed limits. Please adjust the number of tickets.');
            return;
        }

        // Update selections with new ticket counts (including employee ticket if traveling)
        const updatedSelections = selections.map((sel, index) => ({
            ...sel,
            ticketCount: ticketCounts[index] + (isEmployeeTraveling[index] ? 1 : 0)
        }));

        onConfirm({
            selections: updatedSelections,
            passengers,
            isEmployeeTraveling
        });
    };

    const totalFamilyTickets = ticketCounts.reduce((sum, count) => sum + count, 0);
    const totalEmployeeTickets = isEmployeeTraveling.filter(t => t).length;
    const totalTickets = totalFamilyTickets + totalEmployeeTickets;

    return (
        <div className={cn(
            "fixed inset-0 z-50 transition-all duration-300",
            isOpen ? "visible" : "invisible delay-300"
        )}>
            {/* Backdrop */}
            <div
                className={cn(
                    "absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity duration-300",
                    isOpen ? "opacity-100" : "opacity-0"
                )}
                onClick={onClose}
            />

            {/* Modal Content */}
            <div className={cn(
                "absolute inset-0 md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 w-full md:w-[600px] md:max-h-[90vh] bg-white rounded-t-3xl md:rounded-2xl shadow-xl transition-transform duration-300 ease-in-out flex flex-col",
                isOpen ? "translate-y-0" : "translate-y-full md:translate-y-0 md:scale-95"
            )}>
                {/* Header */}
                <div className="flex justify-between items-center p-6 border-b border-gray-200">
                    <h2 className="text-xl font-bold text-gray-900">Confirm Booking</h2>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg h-8 w-8"
                        onClick={onClose}
                        aria-label="Close"
                    >
                        <X className="h-4 w-4" />
                    </Button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    <div className="space-y-6">
                        {selections.map((selection, tripIndex) => {
                            const maxTickets = getMaxTickets(tripIndex);
                            const currentCount = ticketCounts[tripIndex] || selection.ticketCount;
                            
                            return (
                                <div key={tripIndex} className="space-y-4">
                                    {/* Trip Header */}
                                    <div className="flex items-center justify-between pb-3 border-b">
                                        <h3 className="font-semibold text-gray-900">
                                            {isRoundTrip 
                                                ? (tripIndex === 0 ? 'Departing' : 'Returning')
                                                : 'Trip Details'}
                                        </h3>
                                        <div className="text-sm text-gray-600">
                                            {getCityName(selection.cityId)} • {getTimeSlot(selection.timeSlotId)}
                                        </div>
                                    </div>

                                    {/* Route Already Booked Warning */}
                                    {employeeTicketInfo?.routeAlreadyBooked && (
                                        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                                            Already booked for this route
                                        </div>
                                    )}

                                    {/* Employee Travel & Ticket Count */}
                                    <div className="space-y-3">
                                        {selection.busType === 'Employee' && (
                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="checkbox"
                                                    id={`is_self_${tripIndex}`}
                                                    checked={isEmployeeTraveling[tripIndex] || false}
                                                    onChange={(e) => handleEmployeeTravelChange(tripIndex, e.target.checked)}
                                                    disabled={employeeTicketInfo?.employeeTicketExistsToday}
                                                    className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                                                />
                                                <label 
                                                    htmlFor={`is_self_${tripIndex}`}
                                                    className={cn(
                                                        "text-sm",
                                                        employeeTicketInfo?.employeeTicketExistsToday 
                                                            ? "text-gray-400" 
                                                            : "text-gray-700"
                                                    )}
                                                >
                                                    I am traveling {employeeTicketInfo?.employeeTicketExistsToday && "(Already booked today)"}
                                                </label>
                                            </div>
                                        )}

                                        <div>
                                            <label className="text-sm font-medium text-gray-700 mb-2 block">
                                                Family Tickets
                                            </label>
                                            <select
                                                value={currentCount}
                                                onChange={(e) => handleTicketCountChange(tripIndex, parseInt(e.target.value))}
                                                disabled={employeeTicketInfo?.canBookFamily === false}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-primary text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
                                            >
                                                {maxTickets > 0 ? (
                                                    Array.from({ length: maxTickets }, (_, i) => i + 1).map(num => (
                                                        <option key={num} value={num}>{num}</option>
                                                    ))
                                                ) : (
                                                    <option value={0}>0 (Not available)</option>
                                                )}
                                            </select>
                                            <p className="text-xs text-gray-500 mt-1">
                                                {isEmployeeTraveling[tripIndex] ? 'Max 2 (with employee = 3 total)' : 'Max 3 per day'}
                                                {selection.ticketsLeft !== undefined && ` • ${selection.ticketsLeft} seats`}
                                                {employeeTicketInfo?.familySlotsRemaining !== undefined && ` • ${employeeTicketInfo.familySlotsRemaining} slots left`}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Passenger Forms */}
                                    {passengers[tripIndex]?.map((passenger, passengerIndex) => (
                                        <div key={passengerIndex} className="bg-gray-50 rounded-lg p-4 space-y-3">
                                            <p className="text-sm font-medium text-gray-700">Passenger {passengerIndex + 1}</p>
                                            
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                                <input
                                                    type="text"
                                                    value={passenger.name}
                                                    onChange={(e) => handlePassengerChange(tripIndex, passengerIndex, 'name', e.target.value)}
                                                    placeholder="Full Name *"
                                                    className="px-3 py-2 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-primary text-sm"
                                                    required
                                                />
                                                <select
                                                    value={passenger.relation}
                                                    onChange={(e) => handlePassengerChange(tripIndex, passengerIndex, 'relation', e.target.value)}
                                                    className="px-3 py-2 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-primary text-sm"
                                                    required
                                                >
                                                    <option value="">Relation *</option>
                                                    <option value="Child">Child</option>
                                                    <option value="Spouse">Spouse</option>
                                                    <option value="Parent">Parent</option>
                                                </select>
                                                <input
                                                    type="text"
                                                    value={passenger.cnic}
                                                    onChange={(e) => {
                                                        const formatted = formatCNIC(e.target.value);
                                                        handlePassengerChange(tripIndex, passengerIndex, 'cnic', formatted);
                                                    }}
                                                    placeholder="CNIC (optional)"
                                                    maxLength={15}
                                                    className="px-3 py-2 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-primary text-sm"
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            );
                        })}
                    </div>

                    {/* Summary */}
                    <div className="mt-6 pt-4 border-t">
                        <div className="flex justify-between items-center">
                            <span className="font-semibold text-gray-900">Total Tickets:</span>
                            <span className="text-xl font-bold text-primary">{totalTickets}</span>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-gray-200 flex gap-3">
                    <Button
                        variant="outline"
                        onClick={onClose}
                        className="flex-1"
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleConfirm}
                        className="flex-1 font-semibold"
                    >
                        Confirm Booking
                    </Button>
                </div>
            </div>
        </div>
    );
};

