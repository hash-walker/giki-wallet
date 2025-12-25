import { cn } from '@/lib/utils';
import { getCityName, getTimeSlot, getStopName } from '../../utils/bookingHelpers';

type SavedSelection = {
    cityId: string | null;
    timeSlotId: string | null;
    stopId: string | null;
    ticketCount: number;
    scheduleId: number;
    busType?: string;
};

interface TripDetailsCardProps {
    selection: SavedSelection;
    index: number;
    isRoundTrip?: boolean;
    cities: Array<{ id: string; name: string }>;
    timeSlots: Array<{ id: string; date: string; time: string }>;
    stops: Array<{ id: string; name: string }>;
}

export const TripDetailsCard = ({
    selection,
    index,
    isRoundTrip = false,
    cities,
    timeSlots,
    stops
}: TripDetailsCardProps) => {
    return (
        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
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
                    <span className="font-medium text-gray-900">{getCityName(selection.cityId, cities)}</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-gray-600">Date & Time:</span>
                    <span className="font-medium text-gray-900">{getTimeSlot(selection.timeSlotId, timeSlots)}</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-gray-600">Stop:</span>
                    <span className="font-medium text-gray-900">{getStopName(selection.stopId, stops)}</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-gray-600">Tickets:</span>
                    <span className="font-medium text-gray-900">{selection.ticketCount}</span>
                </div>
            </div>
        </div>
    );
};

