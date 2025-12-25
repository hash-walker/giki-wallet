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
};

interface StudentBookingConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    selections: SavedSelection[];
    cities: Array<{ id: string; name: string }>;
    timeSlots: Array<{ id: string; date: string; time: string }>;
    stops: Array<{ id: string; name: string }>;
    isRoundTrip?: boolean;
}

export const StudentBookingConfirmationModal = ({
    isOpen,
    onClose,
    onConfirm,
    selections,
    cities,
    timeSlots,
    stops,
    isRoundTrip = false
}: StudentBookingConfirmationModalProps) => {
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

    const totalTickets = selections.reduce((sum, sel) => sum + sel.ticketCount, 0);

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
                "absolute inset-0 md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 w-full md:w-[500px] md:max-h-[90vh] bg-white rounded-t-3xl md:rounded-2xl shadow-xl transition-transform duration-300 ease-in-out flex flex-col",
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
                    <p className="text-sm text-gray-600 mb-6">
                        Please review your booking details before confirming:
                    </p>

                    <div className="space-y-4">
                        {selections.map((selection, index) => (
                            <div key={index} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                                <div className="flex items-center justify-between mb-3">
                                    <h3 className="font-semibold text-gray-900">
                                        {isRoundTrip 
                                            ? (index === 0 ? 'Departing Trip' : 'Returning Trip')
                                            : 'Trip Details'}
                                    </h3>
                                    {selection.busType && (
                                        <span className={cn(
                                            "px-2 py-1 text-xs font-medium rounded-full text-white",
                                            selection.busType === 'Student' ? "bg-green-500" : "bg-blue-500"
                                        )}>
                                            {selection.busType}
                                        </span>
                                    )}
                                </div>
                                
                                <div className="space-y-2 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">City:</span>
                                        <span className="font-medium text-gray-900">{getCityName(selection.cityId)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Date & Time:</span>
                                        <span className="font-medium text-gray-900">{getTimeSlot(selection.timeSlotId)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Stop:</span>
                                        <span className="font-medium text-gray-900">{getStopName(selection.stopId)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Tickets:</span>
                                        <span className="font-medium text-gray-900">{selection.ticketCount}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="mt-6 pt-4 border-t border-gray-200">
                        <div className="flex justify-between items-center">
                            <span className="text-base font-semibold text-gray-900">Total Tickets:</span>
                            <span className="text-lg font-bold text-primary">{totalTickets}</span>
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
                        onClick={onConfirm}
                        className="flex-1 font-semibold"
                    >
                        Confirm Booking
                    </Button>
                </div>
            </div>
        </div>
    );
};

