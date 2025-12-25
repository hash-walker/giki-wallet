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
    sharedCityId?: string | null; // For round trip - shared city selection
}

export const BookingSection = ({
    title,
    direction,
    bookingData,
    icon,
    onBook,
    mode = 'immediate',
    onSaveSelection,
    onSelectionReset,
    sharedCityId
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
                {sharedCityId === undefined ? (
                    <>
                        <div className="w-[18%]">CITY</div>
                        <div className="w-[18%]">DATE & TIME</div>
                        <div className="w-[18%]">{isFromGIKI ? "DROP LOCATION" : "PICKUP POINT"}</div>
                        <div className="w-[12%] text-center">TYPE</div>
                        <div className="w-[10%] text-center">AVAILABLE QTY</div>
                        <div className="w-[8%]"></div>
                        <div className="w-[16%] pl-2">ACTION</div>
                    </>
                ) : (
                    <>
                        <div className="w-[24%]">DATE & TIME</div>
                        <div className="w-[24%]">{isFromGIKI ? "DROP LOCATION" : "PICKUP POINT"}</div>
                        <div className="w-[13%] text-center">TYPE</div>
                        <div className="w-[11%] text-center">AVAILABLE QTY</div>
                        <div className="w-[9%]"></div>
                        <div className="w-[19%] pl-2">ACTION</div>
                    </>
                )}
            </div>

            {/* Booking Card */}
            <BookingCard
                direction={direction}
                bookingData={bookingData}
                mode={mode}
                onBook={onBook}
                onSaveSelection={onSaveSelection}
                onSelectionReset={onSelectionReset}
                sharedCityId={sharedCityId}
            />
        </section>
    );
};
