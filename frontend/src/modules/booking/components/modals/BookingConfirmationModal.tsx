import { StudentBookingConfirmationModal } from './StudentBookingConfirmationModal';
import { EmployeeBookingConfirmationModal } from './EmployeeBookingConfirmationModal';

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
    cnic?: string;
    relation?: string;
};

type EmployeeTicketInfo = {
    employeeTicketExistsToday?: boolean;
    canBookFamily?: boolean;
    familySlotsRemaining?: number;
    routeAlreadyBooked?: boolean;
};

interface BookingConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (data: { selections: SavedSelection[]; passengers: PassengerData[][]; isEmployeeTraveling?: boolean[] }) => void;
    selections: SavedSelection[];
    cities: Array<{ id: string; name: string }>;
    timeSlots: Array<{ id: string; date: string; time: string }>;
    stops: Array<{ id: string; name: string }>;
    isRoundTrip?: boolean;
    isEmployee?: boolean;
    employeeTicketInfo?: EmployeeTicketInfo;
}

export const BookingConfirmationModal = ({
    isOpen,
    onClose,
    onConfirm,
    selections,
    cities,
    timeSlots,
    stops,
    isRoundTrip = false,
    isEmployee = false,
    employeeTicketInfo
}: BookingConfirmationModalProps) => {
    if (isEmployee) {
        return (
            <EmployeeBookingConfirmationModal
                isOpen={isOpen}
                onClose={onClose}
                onConfirm={onConfirm}
                selections={selections}
                cities={cities}
                timeSlots={timeSlots}
                stops={stops}
                isRoundTrip={isRoundTrip}
                employeeTicketInfo={employeeTicketInfo}
            />
        );
    }

    return (
        <StudentBookingConfirmationModal
            isOpen={isOpen}
            onClose={onClose}
            onConfirm={() => onConfirm({ selections, passengers: selections.map(() => []) })}
            selections={selections}
            cities={cities}
            timeSlots={timeSlots}
            stops={stops}
            isRoundTrip={isRoundTrip}
        />
    );
};

