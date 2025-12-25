import { useState } from 'react';
import { PageHeader } from '../components/PageHeader';
import { BookingSection } from '../components/BookingSection';
import { LoadingState } from '@/components/ui/LoadingState';
import { ErrorState } from '@/components/ui/ErrorState';
import { BookingConfirmationModal } from '../components/BookingConfirmationModal';
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
    const [showConfirmationModal, setShowConfirmationModal] = useState(false);
    const [pendingBooking, setPendingBooking] = useState<SavedSelection[]>([]);
    
    // TODO: Get this from user context/auth
    const isStudentUser = true; // For now, set to true to test student bookings
    const isEmployeeUser = !isStudentUser;

    // Get booking data for each direction
    const fromGikiData = getBookingData('from-giki');
    const toGikiData = getBookingData('to-giki');

    const handleBook = (selection: SavedSelection) => {
        // Check if user is a student and booking a student bus
        const isStudentBus = selection.busType === 'Student';
        
        if (isStudentUser && isStudentBus) {
            // Show confirmation modal for students
            setPendingBooking([selection]);
            setShowConfirmationModal(true);
        } else if (isEmployeeUser && selection.busType === 'Employee') {
            // Show confirmation modal for employees booking employee buses
            setPendingBooking([selection]);
            setShowConfirmationModal(true);
        } else {
            // Direct booking for other cases
            console.log('Booking:', selection);
            // TODO: Implement booking logic with API call
        }
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
            // Check if user is a student and booking student buses
            const hasStudentBus = fromSelection.busType === 'Student' || toSelection.busType === 'Student';
            const hasEmployeeBus = fromSelection.busType === 'Employee' || toSelection.busType === 'Employee';
            
            if (isStudentUser && hasStudentBus) {
                // Show confirmation modal for students
                setPendingBooking([fromSelection, toSelection]);
                setShowConfirmationModal(true);
            } else if (isEmployeeUser && hasEmployeeBus) {
                // Show confirmation modal for employees
                setPendingBooking([fromSelection, toSelection]);
                setShowConfirmationModal(true);
            } else {
                // Direct booking for other cases
                console.log('Round trip booking:', { outbound: fromSelection, inbound: toSelection });
                // TODO: call booking API with both legs
            }
        }
    };

    const handleConfirmBooking = (data?: { selections: SavedSelection[]; passengers: Array<Array<{ name: string; cnic?: string; relation?: string }>>; isEmployeeTraveling?: boolean[] }) => {
        // Close modal and proceed with booking
        setShowConfirmationModal(false);
        
        if (data) {
            // Employee booking with passenger data
            if (data.selections.length === 1) {
                console.log('Confirmed booking:', {
                    selection: data.selections[0],
                    passengers: data.passengers[0],
                    isEmployeeTraveling: data.isEmployeeTraveling?.[0] || false
                });
                // TODO: Implement booking logic with API call
            } else if (data.selections.length === 2) {
                console.log('Confirmed round trip booking:', {
                    outbound: {
                        selection: data.selections[0],
                        passengers: data.passengers[0],
                        isEmployeeTraveling: data.isEmployeeTraveling?.[0] || false
                    },
                    inbound: {
                        selection: data.selections[1],
                        passengers: data.passengers[1],
                        isEmployeeTraveling: data.isEmployeeTraveling?.[1] || false
                    }
                });
                // TODO: call booking API with both legs
            }
        } else {
            // Student booking (no passenger data needed)
            if (pendingBooking.length === 1) {
                console.log('Confirmed booking:', pendingBooking[0]);
                // TODO: Implement booking logic with API call
            } else if (pendingBooking.length === 2) {
                console.log('Confirmed round trip booking:', { outbound: pendingBooking[0], inbound: pendingBooking[1] });
                // TODO: call booking API with both legs
            }
        }
        
        setPendingBooking([]);
    };

    const handleCloseModal = () => {
        setShowConfirmationModal(false);
        setPendingBooking([]);
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

            {/* Booking Confirmation Modal */}
            <BookingConfirmationModal
                isOpen={showConfirmationModal}
                onClose={handleCloseModal}
                onConfirm={handleConfirmBooking}
                selections={pendingBooking}
                cities={fromGikiData.cities}
                timeSlots={fromGikiData.timeSlots}
                stops={fromGikiData.stops}
                isRoundTrip={pendingBooking.length === 2}
                isEmployee={isEmployeeUser}
            />
        </div>
    );
};
