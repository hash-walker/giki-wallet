import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type SavedSelection = {
    scheduleId: number;
    isFull: boolean;
    ticketsLeft: number;
    status?: string;
    busType?: string;
    isHeld?: boolean;
};

interface RoundTripSummaryProps {
    fromSelection: SavedSelection | null;
    toSelection: SavedSelection | null;
    onConfirm: () => void;
}

export const RoundTripSummary = ({
    fromSelection,
    toSelection,
    onConfirm
}: RoundTripSummaryProps) => {
    const hasBothSelections = Boolean(fromSelection && toSelection);
    const hasFullLeg = Boolean(
        (fromSelection?.isFull && !fromSelection?.isHeld) || 
        (toSelection?.isFull && !toSelection?.isHeld)
    );
    const canConfirm = hasBothSelections && !hasFullLeg;

    return (
        <div className="mt-3 rounded-2xl border border-gray-200 bg-white/90 px-4 py-4 shadow-sm md:flex md:items-center md:justify-between md:gap-4">
            <div className="space-y-1">
                <p className="text-sm font-semibold text-gray-800">
                    Round trip summary
                </p>
                <div className="flex flex-wrap gap-2 text-xs">
                    <span
                        className={cn(
                            "inline-flex items-center rounded-full px-2.5 py-1 font-medium",
                            fromSelection
                                ? fromSelection.isFull && !fromSelection.isHeld
                                    ? 'bg-red-50 text-red-700'
                                    : 'bg-green-50 text-green-700'
                                : 'bg-gray-100 text-gray-500'
                        )}
                    >
                        <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-current" />
                        Departing — {fromSelection 
                            ? (fromSelection.isFull && !fromSelection.isHeld ? 'Sold out' : 'Saved') 
                            : 'Pending'}
                    </span>
                    <span
                        className={cn(
                            "inline-flex items-center rounded-full px-2.5 py-1 font-medium",
                            toSelection
                                ? toSelection.isFull && !toSelection.isHeld
                                    ? 'bg-red-50 text-red-700'
                                    : 'bg-green-50 text-green-700'
                                : 'bg-gray-100 text-gray-500'
                        )}
                    >
                        <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-current" />
                        Returning — {toSelection 
                            ? (toSelection.isFull && !toSelection.isHeld ? 'Sold out' : 'Saved') 
                            : 'Pending'}
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
                    onClick={onConfirm}
                >
                    Confirm Round Trip
                </Button>
            </div>
        </div>
    );
};

