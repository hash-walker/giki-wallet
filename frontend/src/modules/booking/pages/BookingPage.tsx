import { useState } from 'react';
import { PageHeader } from '../components/PageHeader';
import { BookingSection } from '../components/BookingSection';
import { LoadingState } from '@/components/ui/LoadingState';
import { ErrorState } from '@/components/ui/ErrorState';
import { getBookingData } from '../data/mockRoutes';
import { ArrowRightIcon, ArrowLeftIcon } from 'lucide-react';
import { BookingSelection } from '../types';
import { Button } from '@/components/ui/button';

type SavedSelection = BookingSelection & {
    scheduleId: number;
    isFull: boolean;
    ticketsLeft: number;
    status?: string;
    busType?: string;
    isHeld?: boolean;
};

export const BookingPage = () => {
    const [isLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isRoundTrip, setIsRoundTrip] = useState(false);
    const [fromSelection, setFromSelection] = useState<SavedSelection | null>(null);
    const [toSelection, setToSelection] = useState<SavedSelection | null>(null);

    // Get booking data for each direction
    const fromGikiData = getBookingData('from-giki');
    const toGikiData = getBookingData('to-giki');

    const handleBook = (selection: SavedSelection) => {
        console.log('Booking:', selection);
        // TODO: Implement booking logic with API call
    };

    const handleSaveSelection = (direction: 'from-giki' | 'to-giki') => (selection: SavedSelection) => {
        // Do not save selections that are sold out (regardless of hold)
        if (selection.isFull) {
            if (direction === 'from-giki') {
                setFromSelection(null);
            } else {
                setToSelection(null);
            }
            return;
        }

        if (direction === 'from-giki') {
            setFromSelection(selection);
        } else {
            setToSelection(selection);
        }
    };

    const handleResetSelection = (direction: 'from-giki' | 'to-giki') => () => {
        if (direction === 'from-giki') {
            setFromSelection(null);
        } else {
            setToSelection(null);
        }
    };

    const handleConfirmRoundTrip = () => {
        if (fromSelection && toSelection) {
            console.log('Round trip booking:', { outbound: fromSelection, inbound: toSelection });
            // TODO: call booking API with both legs
        }
    };

    const hasBothSelections = Boolean(fromSelection && toSelection);
    const hasFullLeg = Boolean((fromSelection?.isFull && !fromSelection?.isHeld) || (toSelection?.isFull && !toSelection?.isHeld));
    const canConfirm = hasBothSelections && !hasFullLeg;

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

            {/* Round trip toggle */}
            <div className="mt-4 mb-2 flex items-center justify-between rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm">
                <div className="flex flex-col">
                    <span className="text-sm font-semibold text-gray-800">Round trip booking</span>
                    <span className="text-xs text-gray-500">Select trips for both directions, then confirm together.</span>
                </div>
                <label className="inline-flex items-center gap-2 text-sm font-medium text-gray-700">
                    <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                        checked={isRoundTrip}
                        onChange={(e) => setIsRoundTrip(e.target.checked)}
                    />
                    Enable
                </label>
            </div>

            <div className="flex-1 flex flex-col justify-evenly gap-6 py-6">
                <BookingSection
                    title="Departing From GIKI"
                    direction="from-giki"
                    bookingData={fromGikiData}
                    icon={<ArrowRightIcon className="w-5 h-5" />}
                    onBook={!isRoundTrip ? handleBook : undefined}
                    mode={isRoundTrip ? 'collect' : 'immediate'}
                    onSaveSelection={isRoundTrip ? handleSaveSelection('from-giki') : undefined}
                    onSelectionReset={isRoundTrip ? handleResetSelection('from-giki') : undefined}
                />

                <BookingSection
                    title="Returning To GIKI"
                    direction="to-giki"
                    bookingData={toGikiData}
                    icon={<ArrowLeftIcon className="w-5 h-5" />}
                    onBook={!isRoundTrip ? handleBook : undefined}
                    mode={isRoundTrip ? 'collect' : 'immediate'}
                    onSaveSelection={isRoundTrip ? handleSaveSelection('to-giki') : undefined}
                    onSelectionReset={isRoundTrip ? handleResetSelection('to-giki') : undefined}
                />
            </div>

            {isRoundTrip && (
                <div className="mt-3 rounded-2xl border border-gray-200 bg-white/90 px-4 py-4 shadow-sm md:flex md:items-center md:justify-between md:gap-4">
                    <div className="space-y-1">
                        <p className="text-sm font-semibold text-gray-800">
                            Round trip summary
                        </p>
                        <div className="flex flex-wrap gap-2 text-xs">
                            <span
                                className={`inline-flex items-center rounded-full px-2.5 py-1 font-medium ${
                                    fromSelection
                                        ? fromSelection.isFull && !fromSelection.isHeld
                                            ? 'bg-red-50 text-red-700'
                                            : 'bg-green-50 text-green-700'
                                        : 'bg-gray-100 text-gray-500'
                                }`}
                            >
                                <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-current" />
                                Departing — {fromSelection ? (fromSelection.isFull && !fromSelection.isHeld ? 'Sold out' : 'Saved') : 'Pending'}
                            </span>
                            <span
                                className={`inline-flex items-center rounded-full px-2.5 py-1 font-medium ${
                                    toSelection
                                        ? toSelection.isFull && !toSelection.isHeld
                                            ? 'bg-red-50 text-red-700'
                                            : 'bg-green-50 text-green-700'
                                        : 'bg-gray-100 text-gray-500'
                                }`}
                            >
                                <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-current" />
                                Returning — {toSelection ? (toSelection.isFull && !toSelection.isHeld ? 'Sold out' : 'Saved') : 'Pending'}
                            </span>
                        </div>
                        {!canConfirm && (
                            <p className="text-xs text-gray-500">
                                {hasFullLeg
                                    ? 'One of the legs is sold out. Please pick another schedule.'
                                    : 'Save both Departing and Returning trips to enable confirmation.'}
                            </p>
                        )}
                    </div>

                    <div className="mt-3 md:mt-0">
                        <Button
                            className="w-full md:w-auto font-semibold"
                            disabled={!canConfirm}
                            onClick={handleConfirmRoundTrip}
                        >
                            Confirm Round Trip
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
};
