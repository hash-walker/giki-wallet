import { useEffect } from 'react';
import { useForm, FormProvider, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { addHours, parse, format, differenceInHours } from 'date-fns';
import { useTripCreateStore } from '../store';
import { createTripSchema, CreateTripFormValues } from '../schema';
import { Button } from '@/shared/components/ui/button';
import { Select } from '@/shared/components/ui/Select';
import { RouteScheduleSection } from './RouteScheduleSection';
import { CapacityPricingSection } from './CapacityPricingSection';
import { StopsSelectionSection } from './StopsSelectionSection';
import { BookingWindowSection } from './BookingWindowSection';

export const TripCreateForm = () => {
    const {
        routes,
        template,
        isLoadingRoutes,
        isSubmitting,
        fetchRoutes,
        selectRoute,
        createTrip
    } = useTripCreateStore();

    const methods = useForm<CreateTripFormValues>({
        resolver: zodResolver(createTripSchema),
        defaultValues: {
            totalCapacity: 0,
            basePrice: 0,
            selectedStopIds: [],
            date: new Date(),
            time: "08:00",
            bookingOpenDate: new Date(),
            bookingOpenTime: "08:00",
            bookingCloseDate: new Date(),
            bookingCloseTime: "08:00",
            busType: "STUDENT"
        },
    });

    const {
        handleSubmit,
        setValue,
        reset
    } = methods;

    useEffect(() => {
        // eslint-disable-next-line
        fetchRoutes();
    }, []); // Run once on mount

    // When route template loads, update form defaults
    useEffect(() => {
        if (template) {
            // Calculate default booking times from offset hours
            const currentDate = methods.getValues('date') || new Date();
            const currentTime = methods.getValues('time') || '08:00';
            const departureDateTime = parse(currentTime, 'HH:mm', currentDate);

            // Booking opens X hours before departure
            const bookingOpenDateTime = addHours(departureDateTime, -template.rules.open_hours_before);
            setValue('bookingOpenDate', bookingOpenDateTime);
            setValue('bookingOpenTime', format(bookingOpenDateTime, 'HH:mm'));

            // Booking closes X hours before departure
            const bookingCloseDateTime = addHours(departureDateTime, -template.rules.close_hours_before);
            setValue('bookingCloseDate', bookingCloseDateTime);
            setValue('bookingCloseTime', format(bookingCloseDateTime, 'HH:mm'));

            // Auto-detect direction
            const stops = template.stops;
            if (stops.length >= 2) {
                const firstStop = stops[0].name.toUpperCase();
                const lastStop = stops[stops.length - 1].name.toUpperCase();

                if (firstStop.includes("GIKI")) {
                    setValue('direction', 'OUTBOUND');
                } else if (lastStop.includes("GIKI")) {
                    setValue('direction', 'INBOUND');
                } else {
                    // Fallback to route name check
                    const name = template.route_name.toUpperCase();
                    if (name.startsWith("GIKI")) {
                        setValue('direction', 'OUTBOUND');
                    } else {
                        setValue('direction', 'INBOUND');
                    }
                }
            } else {
                setValue('direction', 'OUTBOUND'); // Default
            }

            // Auto-select active stops
            const activeStopIds = template.stops
                .filter(s => s.is_active)
                .map(s => s.stop_id);
            setValue('selectedStopIds', activeStopIds);
        }
    }, [template, setValue, methods]);

    const handleRouteChange = (routeId: string) => {
        selectRoute(routeId);
        setValue('routeId', routeId);
    };

    const onSubmit = async (values: CreateTripFormValues) => {
        // Combine Date + Time for departure
        const departureDateTime = parse(values.time, 'HH:mm', values.date);

        // Combine Date + Time for booking window
        const bookingOpenDateTime = parse(values.bookingOpenTime, 'HH:mm', values.bookingOpenDate);
        const bookingCloseDateTime = parse(values.bookingCloseTime, 'HH:mm', values.bookingCloseDate);

        // Calculate offset hours (hours before departure)
        const openOffsetHours = Math.round(differenceInHours(departureDateTime, bookingOpenDateTime));
        const closeOffsetHours = Math.round(differenceInHours(departureDateTime, bookingCloseDateTime));

        const payload = {
            route_id: values.routeId,
            departure_time: departureDateTime.toISOString(),
            booking_open_offset_hours: openOffsetHours,
            booking_close_offset_hours: closeOffsetHours,
            total_capacity: values.totalCapacity,
            base_price: values.basePrice,
            bus_type: values.busType,
            direction: values.direction,
            stops: values.selectedStopIds.map(id => ({ stop_id: id }))
        };

        const success = await createTrip(payload);
        if (success) {
            reset();
        }
    };

    return (
        <FormProvider {...methods}>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-8 max-w-4xl mx-auto p-6 bg-white border rounded-xl shadow-sm">

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* --- LEFT COLUMN: Route & Schedule --- */}
                    <div className="space-y-6">
                        <RouteScheduleSection
                            routes={routes}
                            isLoadingRoutes={isLoadingRoutes}
                            quickSlots={template?.quick_slots}
                            onRouteSelect={handleRouteChange}
                        />
                    </div>

                    {/* --- RIGHT COLUMN: Booking Window, Capacity & Stops --- */}
                    <div className="space-y-6">
                        {template && (
                            <>
                                <BookingWindowSection />
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-700">Bus Type</label>
                                    <Controller
                                        name="busType"
                                        control={methods.control}
                                        render={({ field }) => (
                                            <Select
                                                options={[
                                                    { value: 'STUDENT', label: 'Student' },
                                                    { value: 'EMPLOYEE', label: 'Employee' }
                                                ]}
                                                value={field.value}
                                                onChange={field.onChange}
                                                placeholder="Select Bus Type"
                                                showLabel={false}
                                            />
                                        )}
                                    />
                                    {methods.formState.errors.busType && (
                                        <p className="text-xs text-red-500 mt-1">{methods.formState.errors.busType.message}</p>
                                    )}
                                </div>
                                <CapacityPricingSection />
                                <StopsSelectionSection stops={template.stops} />
                            </>
                        )}
                    </div>
                </div>

                <div className="flex justify-end pt-6 border-t">
                    <Button type="submit" disabled={isSubmitting || !template} size="lg">
                        {isSubmitting ? "Creating Trip..." : "Create Trip"}
                    </Button>
                </div>
            </form>
        </FormProvider>
    );
};
