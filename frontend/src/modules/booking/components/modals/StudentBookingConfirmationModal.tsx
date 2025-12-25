import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/Modal';
import { TripDetailsCard } from '../shared';

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
    const totalTickets = selections.reduce((sum, sel) => sum + sel.ticketCount, 0);

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Confirm Booking"
            footer={
                <div className="flex gap-3">
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
            }
        >
            <p className="text-sm text-gray-600 mb-6">
                Please review your booking details before confirming:
            </p>

            <div className="space-y-4">
                {selections.map((selection, index) => (
                    <TripDetailsCard
                        key={index}
                        selection={selection}
                        index={index}
                        isRoundTrip={isRoundTrip}
                        cities={cities}
                        timeSlots={timeSlots}
                        stops={stops}
                    />
                ))}
            </div>

            <div className="mt-6 pt-4 border-t border-gray-200">
                <div className="flex justify-between items-center">
                    <span className="text-base font-semibold text-gray-900">Total Tickets:</span>
                    <span className="text-lg font-bold text-primary">{totalTickets}</span>
                </div>
            </div>
        </Modal>
    );
};

