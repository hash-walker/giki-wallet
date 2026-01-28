import { z } from 'zod';

export const tripStopSchema = z.object({
    stop_id: z.string().uuid(),
    stop_name: z.string(),
    sequence: z.number(),
});

export const tripSchema = z.object({
    trip_id: z.string().uuid(),
    route_name: z.string(),
    departure_time: z.string(), // ISO String
    booking_status: z.enum(['OPEN', 'LOCKED', 'FULL', 'CLOSED', 'CANCELLED']),
    opens_at: z.string(),
    available_seats: z.number(),
    price: z.number(),
    stops: z.array(tripStopSchema),
});

export const quotaUsageSchema = z.object({
    limit: z.number(),
    used: z.number(),
    remaining: z.number(),
});

export const quotaResponseSchema = z.object({
    outbound: quotaUsageSchema,
    inbound: quotaUsageSchema,
});

export const activeHoldSchema = z.object({
    id: z.string().uuid(),
    trip_id: z.string().uuid(),
    expires_at: z.string(),
    direction: z.string(),
    route_name: z.string(),
});

export const holdSeatsRequestSchema = z.object({
    trip_id: z.string().uuid(),
    count: z.number().min(1).max(5),
    pickup_stop_id: z.string().uuid(),
    dropoff_stop_id: z.string().uuid(),
});

export const confirmItemSchema = z.object({
    hold_id: z.string().uuid(),
    passenger_name: z.string().min(1, 'Passenger name is required'),
    passenger_relation: z.enum(['SELF', 'SPOUSE', 'CHILD']),
});

export const confirmBatchRequestSchema = z.object({
    confirmations: z.array(confirmItemSchema),
});

export const transportRouteSchema = z.object({
    route_id: z.string().uuid(),
    route_name: z.string(),
});

export const routeTemplateSchema = z.object({
    route_id: z.string().uuid(),
    route_name: z.string(),
    rules: z.object({
        open_hours_before: z.number(),
        close_hours_before: z.number(),
    }),
    stops: z.array(z.object({
        stop_id: z.string().uuid(),
        name: z.string(),
        sequence: z.number(),
        is_active: z.boolean(),
    })),
    quick_slots: z.array(z.object({
        slot_id: z.string().uuid(),
        day_of_week: z.string(),
        departure_time: z.object({ time: z.string() }),
    })),
});

export const weeklySummarySchema = z.object({
    scheduled: z.number(),
    opened: z.number(),
    locked: z.number(),
    trips: z.array(z.object({
        trip_id: z.string().uuid(),
        route_name: z.string(),
        departure_time: z.string(),
        available_seats: z.number(),
        total_capacity: z.number(),
        booking_status: z.string(),
    })),
});

export const holdSeatsResponseSchema = z.object({
    holds: z.array(z.object({
        hold_id: z.string().uuid(),
        expires_at: z.string(),
    })),
});

export const confirmBatchResponseSchema = z.object({
    tickets: z.array(z.object({
        ticket_id: z.string().uuid(),
        status: z.string(),
    })),
});

export type TransportRoute = z.infer<typeof transportRouteSchema>;
export type RouteTemplate = z.infer<typeof routeTemplateSchema>;
export type WeeklySummary = z.infer<typeof weeklySummarySchema>;
export type HoldSeatsResponse = z.infer<typeof holdSeatsResponseSchema>;
export type ConfirmBatchResponse = z.infer<typeof confirmBatchResponseSchema>;

export type TripStop = z.infer<typeof tripStopSchema>;
export type Trip = z.infer<typeof tripSchema>;
export type QuotaResponse = z.infer<typeof quotaResponseSchema>;
export type ActiveHold = z.infer<typeof activeHoldSchema>;
export type HoldSeatsRequest = z.infer<typeof holdSeatsRequestSchema>;
export type ConfirmBatchRequest = z.infer<typeof confirmBatchRequestSchema>;
export type ConfirmItem = z.infer<typeof confirmItemSchema>;

// Booking Flow Schemas
export const passengerSchema = z.object({
    name: z.string().min(1, "Name is required"),
    relation: z.enum(['SELF', 'SPOUSE', 'CHILD']),
});

export const bookingSelectionSchema = z.object({
    tripId: z.string().uuid(),
    pickupId: z.string().uuid(),
    dropoffId: z.string().uuid(),
    ticketCount: z.number().min(1).max(3),
    isFull: z.boolean(),
});

export type Passenger = z.infer<typeof passengerSchema>;
export type BookingSelection = z.infer<typeof bookingSelectionSchema>;
