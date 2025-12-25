import { BookingCard } from './BookingCard';
import { RouteDirection, BookingData, BookingSelection } from '../types';

type SelectionPayload = BookingSelection & {
    scheduleId: number;
    isFull: boolean;
    ticketsLeft: number;
    status?: string;
    busType?: string;
    isHeld?: boolean;
};

interface BookingSectionProps {
    title: string;
    direction: RouteDirection;
    bookingData: BookingData;
    icon: React.ReactNode;
    onBook?: (selection: SelectionPayload) => void;
    mode?: 'immediate' | 'collect';
    onSaveSelection?: (selection: SelectionPayload) => void;
    onSelectionReset?: () => void;
}

export const BookingSection = ({
    title,
    direction,
    bookingData,
    icon,
    onBook,
    mode = 'immediate',
    onSaveSelection,
    onSelectionReset
}: BookingSectionProps) => {
    const isFromGIKI = direction === 'from-giki';
    const locationLabel = isFromGIKI ? "Drop Location" : "Pickup Point";

    return (
        <section>
            {/* Section Header */}
            <div className="flex items-center gap-2 mb-7">
                <span className={isFromGIKI ? "bg-blue-100 p-2 rounded-lg text-blue-700" : "bg-green-100 p-2 rounded-lg text-green-700"}>
                    {icon}
                </span>
                <h2 className="text-xl font-bold text-gray-800">{title}</h2>
            </div>

            {/* Table Headers (Desktop) */}
            <div className="hidden md:flex px-5 mb-5 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                <div className="w-[18%]">City</div>
                <div className="w-[18%]">Date & Time</div>
                <div className="w-[18%]">{locationLabel}</div>
                <div className="w-[12%] text-center">Type</div>
                <div className="w-[10%] text-center">Available</div>
                <div className="w-[8%] text-center">Qty</div>
                <div className="w-[16%] pl-2">Action</div>
            </div>

            {/* Booking Card */}
            <BookingCard
                direction={direction}
                bookingData={bookingData}
                mode={mode}
                onBook={onBook}
                onSaveSelection={onSaveSelection}
                onSelectionReset={onSelectionReset}
            />
        </section>
    );
};
