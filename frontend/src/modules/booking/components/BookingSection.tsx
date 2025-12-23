import { BookingCard } from './BookingCard';
import { RouteDirection, BookingData, BookingSelection } from '../types';

interface BookingSectionProps {
    title: string;
    direction: RouteDirection;
    bookingData: BookingData;
    icon: React.ReactNode;
    onBook?: (selection: BookingSelection & { scheduleId: number }) => void;
}

export const BookingSection = ({
    title,
    direction,
    bookingData,
    icon,
    onBook
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
                onBook={onBook}
            />
        </section>
    );
};
