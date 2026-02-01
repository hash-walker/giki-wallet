import { useFormContext, Controller } from 'react-hook-form';
import { format, parse, differenceInHours } from 'date-fns';
import { Input } from '@/shared/components/ui/Input';
import { CreateTripFormValues } from '../schema';

export const BookingWindowSection = () => {
    const { control, watch, formState: { errors } } = useFormContext<CreateTripFormValues>();

    // Watch all relevant fields for offset calculation
    const departureDate = watch('date');
    const departureTime = watch('time');
    const bookingOpenDate = watch('bookingOpenDate');
    const bookingOpenTime = watch('bookingOpenTime');
    const bookingCloseDate = watch('bookingCloseDate');
    const bookingCloseTime = watch('bookingCloseTime');

    // Calculate offset hours for display
    const calculateOffsets = () => {
        if (!departureDate || !departureTime || !bookingOpenDate || !bookingOpenTime || !bookingCloseDate || !bookingCloseTime) {
            return null;
        }

        try {
            const departure = parse(departureTime, 'HH:mm', departureDate);
            const opens = parse(bookingOpenTime, 'HH:mm', bookingOpenDate);
            const closes = parse(bookingCloseTime, 'HH:mm', bookingCloseDate);

            const openOffset = Math.round(differenceInHours(departure, opens));
            const closeOffset = Math.round(differenceInHours(departure, closes));

            return {
                openOffset,
                closeOffset,
                isValid: openOffset > 0 && closeOffset > 0 && closeOffset < openOffset
            };
        } catch {
            return null;
        }
    };

    const offsets = calculateOffsets();

    return (
        <div className="space-y-4">
            <div className="border-b pb-2">
                <h3 className="text-md font-semibold text-gray-800">Booking Window</h3>
                <p className="text-sm text-gray-500">When can students book this trip?</p>
            </div>

            <div className="space-y-4">
                <div>
                    <p className="text-sm font-medium text-gray-700 mb-2">Booking Opens</p>
                    <div className="grid grid-cols-2 gap-3">
                        <Controller
                            control={control}
                            name="bookingOpenDate"
                            render={({ field }) => (
                                <Input
                                    label="Date"
                                    type="date"
                                    value={field.value ? format(field.value, 'yyyy-MM-dd') : ''}
                                    onChange={(e) => field.onChange(new Date(e.target.value))}
                                    error={errors.bookingOpenDate?.message}
                                />
                            )}
                        />
                        <Controller
                            control={control}
                            name="bookingOpenTime"
                            render={({ field }) => (
                                <Input
                                    label="Time"
                                    type="time"
                                    {...field}
                                    error={errors.bookingOpenTime?.message}
                                />
                            )}
                        />
                    </div>
                </div>

                <div>
                    <p className="text-sm font-medium text-gray-700 mb-2">Booking Closes</p>
                    <div className="grid grid-cols-2 gap-3">
                        <Controller
                            control={control}
                            name="bookingCloseDate"
                            render={({ field }) => (
                                <Input
                                    label="Date"
                                    type="date"
                                    value={field.value ? format(field.value, 'yyyy-MM-dd') : ''}
                                    onChange={(e) => field.onChange(new Date(e.target.value))}
                                    error={errors.bookingCloseDate?.message}
                                />
                            )}
                        />
                        <Controller
                            control={control}
                            name="bookingCloseTime"
                            render={({ field }) => (
                                <Input
                                    label="Time"
                                    type="time"
                                    {...field}
                                    error={errors.bookingCloseTime?.message}
                                />
                            )}
                        />
                    </div>
                </div>
            </div>

            {offsets && (
                <div className={`rounded-lg p-3 text-sm border ${offsets.isValid
                        ? 'bg-blue-50 border-blue-200'
                        : 'bg-red-50 border-red-200'
                    }`}>
                    <p className={`font-medium mb-1 ${offsets.isValid ? 'text-blue-900' : 'text-red-900'}`}>
                        Calculated Offsets:
                    </p>
                    <p className={offsets.isValid ? 'text-blue-700' : 'text-red-700'}>
                        Opens: {offsets.openOffset} hours before departure
                    </p>
                    <p className={offsets.isValid ? 'text-blue-700' : 'text-red-700'}>
                        Closes: {offsets.closeOffset} hours before departure
                    </p>
                    {!offsets.isValid && (
                        <p className="text-red-600 text-xs mt-2 font-medium">
                            ⚠️ Booking close time must be after open time and both must be before departure
                        </p>
                    )}
                </div>
            )}
        </div>
    );
};
