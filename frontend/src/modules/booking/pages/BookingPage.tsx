import { useState } from 'react';
import { PageHeader } from '../components/PageHeader';
import { BookingSection } from '../components/BookingSection';
import { LoadingState } from '@/components/ui/LoadingState';
import { ErrorState } from '@/components/ui/ErrorState';
import { getBookingData } from '../data/mockRoutes';
import { ArrowRightIcon, ArrowLeftIcon } from 'lucide-react';
import { BookingSelection } from '../types';

export const BookingPage = () => {
    const [isLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Get booking data for each direction
    const fromGikiData = getBookingData('from-giki');
    const toGikiData = getBookingData('to-giki');

    const handleBook = (selection: BookingSelection & { scheduleId: number }) => {
        console.log('Booking:', selection);
        // TODO: Implement booking logic with API call
    };

    const handleRetry = () => {
        setError(null);
        // TODO: Retry fetching routes
    };

    if (isLoading) {
        return (
            <div className="flex-1 flex flex-col max-w-5xl mx-auto p-4 md:p-6 w-full">
                <PageHeader />
                <LoadingState />
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex-1 flex flex-col max-w-5xl mx-auto p-4 md:p-6 w-full">
                <PageHeader />
                <ErrorState message={error} onRetry={handleRetry} />
            </div>
        );
    }

    return (
        <div className="flex-1 flex flex-col max-w-5xl mx-auto p-4 md:p-6 w-full">
            <PageHeader />

            <div className="flex-1 flex flex-col justify-evenly gap-6 py-6">
                <BookingSection
                    title="Departing From GIKI"
                    direction="from-giki"
                    bookingData={fromGikiData}
                    icon={<ArrowRightIcon className="w-5 h-5" />}
                    onBook={handleBook}
                />

                <BookingSection
                    title="Returning To GIKI"
                    direction="to-giki"
                    bookingData={toGikiData}
                    icon={<ArrowLeftIcon className="w-5 h-5" />}
                    onBook={handleBook}
                />
            </div>
        </div>
    );
};
