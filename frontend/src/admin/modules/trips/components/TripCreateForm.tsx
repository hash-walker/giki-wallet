import { useEffect } from 'react';
import { useForm, FormProvider, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { addHours, parse } from 'date-fns';
import { useTripCreateStore } from '../store';
import { createTripSchema, CreateTripFormValues } from '../schema';
import { Button } from '@/shared/components/ui/button';
import { Select } from '@/shared/components/ui/Select';
import { RouteScheduleSection } from './RouteScheduleSection';
import { CapacityPricingSection } from './CapacityPricingSection';
import { StopsSelectionSection } from './StopsSelectionSection';

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
            bookingOpenOffset: 48,
            bookingCloseOffset: 5,
            totalCapacity: 0,
            basePrice: 0,
            selectedStopIds: [],
            date: new Date(),
            time: "08:00",
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
            setValue('bookingOpenOffset', template.rules.open_hours_before);
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
    }, [template, setValue]);

    const handleRouteChange = (routeId: string) => {
        selectRoute(routeId);
        setValue('routeId', routeId);
    };

    const onSubmit = async (values: CreateTripFormValues) => {
        // Combine Date + Time
        const departureDateTime = parse(values.time, 'HH:mm', values.date);

        const opensAt = addHours(departureDateTime, -values.bookingOpenOffset);
        const closesAt = addHours(departureDateTime, -values.bookingCloseOffset);

        const payload = {
            route_id: values.routeId,
            departure_time: departureDateTime.toISOString(),
            booking_opens_at: opensAt.toISOString(),
            booking_closes_at: closesAt.toISOString(),
            total_capacity: values.totalCapacity,
            base_price: values.basePrice,
            bus_type: values.busType,
            direction: values.direction,
            stops: values.selectedStopIds.map(id => ({ stop_id: id }))
        };

        const success = await createTrip(payload);
        if (success) {
            reset();
            // In real app, maybe navigate away or show success modal
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

                    {/* --- RIGHT COLUMN: Capacity & Stops --- */}
                    <div className="space-y-6">
                        {template && (
                            <>
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
