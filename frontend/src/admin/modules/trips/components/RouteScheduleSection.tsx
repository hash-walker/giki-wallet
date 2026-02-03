import { useFormContext, Controller } from 'react-hook-form';
import { format } from 'date-fns';
import { Input } from '@/shared/components/ui/Input';
import { Select } from '@/shared/components/ui/Select';
import { Button } from '@/shared/components/ui/button';
import { CreateTripFormValues } from '../schema';
import { QuickSlotItem, Route } from '../types';

interface RouteScheduleSectionProps {
    routes: Route[];
    isLoadingRoutes: boolean;
    quickSlots?: QuickSlotItem[];
    onRouteSelect: (id: string) => void;
    disabled?: boolean;
}

export const RouteScheduleSection = ({
    routes,
    isLoadingRoutes,
    quickSlots,
    onRouteSelect,
    disabled
}: RouteScheduleSectionProps) => {
    const { control, setValue, watch, formState: { errors } } = useFormContext<CreateTripFormValues>();

    // Filter quick slots for currently selected date
    const selectedDate = watch('date');
    const filteredQuickSlots = quickSlots?.filter(slot => {
        if (!selectedDate) return true;
        const dayName = format(selectedDate, 'EEEE');
        return slot.day_of_week === dayName;
    });

    const handleQuickSlotClick = (slot: QuickSlotItem) => {
        setValue('time', slot.departure_time.slice(0, 5)); // HH:mm
    };

    return (
        <div className="space-y-6">
            <div className="border-b pb-4 mb-4">
                <h2 className="text-lg font-semibold tracking-tight">Route & Schedule</h2>
                <p className="text-sm text-gray-500">Select route and timing</p>
            </div>

            <Controller
                control={control}
                name="routeId"
                render={({ field }) => (
                    <Select
                        label="Select Route *"
                        placeholder={isLoadingRoutes ? "Loading..." : "Select a route"}
                        value={field.value}
                        onChange={(val) => {
                            field.onChange(val);
                            onRouteSelect(val);
                        }}
                        options={routes.map(r => ({ value: r.route_id, label: r.route_name }))}
                        disabled={disabled}
                    />
                )}
            />
            {errors.routeId && <p className="text-sm text-red-500">{errors.routeId.message}</p>}

            {/* Only show Date/Time if a route is selected (controlled by parent visibility usually, but here we can rely on routeId) */}
            {watch('routeId') && (
                <>
                    <Controller
                        control={control}
                        name="date"
                        render={({ field }) => (
                            <Input
                                label="Departure Date *"
                                type="date"
                                value={field.value ? format(field.value, 'yyyy-MM-dd') : ''}
                                onChange={(e) => field.onChange(new Date(e.target.value))}
                                error={errors.date?.message}
                            />
                        )}
                    />

                    <div>
                        <Controller
                            control={control}
                            name="time"
                            render={({ field }) => (
                                <Input
                                    label="Departure Time *"
                                    type="time"
                                    {...field}
                                    error={errors.time?.message}
                                />
                            )}
                        />
                        {filteredQuickSlots && filteredQuickSlots.length > 0 && (
                            <div className="flex gap-2 mt-2 flex-wrap">
                                {filteredQuickSlots.map(slot => (
                                    <Button
                                        key={slot.slot_id}
                                        type="button"
                                        variant="secondary"
                                        size="sm"
                                        onClick={() => handleQuickSlotClick(slot)}
                                        className="text-xs h-7 px-2"
                                    >
                                        {slot.departure_time.slice(0, 5)}
                                    </Button>
                                ))}
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
};
