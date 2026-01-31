import { z } from 'zod';

// ============================================================================
// RESPONSE TYPES 
// ============================================================================

export const tripStopSchema = z.object({
    stop_id: z.string().uuid(),
    stop_name: z.string(),
    sequence: z.number(),
});

export const tripSchema = z.object({
    id: z.string().uuid(),
    route_id: z.string().uuid(),
    route_name: z.string(),
    direction: z.string(),
    bus_type: z.string(),
    departure_time: z.string(),
    booking_opens_at: z.string(),
    booking_closes_at: z.string(),
    status: z.string(),
    available_seats: z.number(),
    total_capacity: z.number(),
    base_price: z.number(),
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

// ============================================================================
// REQUEST SCHEMAS (for validation)
// ============================================================================

export const holdSeatsRequestSchema = z.object({
    trip_id: z.string().uuid(),
    count: z.number().min(1).max(5),
    pickup_stop_id: z.string().uuid(),
    dropoff_stop_id: z.string().uuid(),
});

export const confirmItemSchema = z.object({
    hold_id: z.string().uuid(),
    passenger_name: z.string().min(1, 'Passenger name is required'),
    passenger_relation: z.enum(['SELF', 'SPOUSE', 'CHILD', 'PARENT', 'GUEST']),
});

export const confirmBatchRequestSchema = z.object({
    confirmations: z.array(confirmItemSchema),
});

// ============================================================================
// RESPONSE SCHEMAS (for API responses)
// ============================================================================

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

// ============================================================================
// TYPESCRIPT TYPES (exported for use in components)
// ============================================================================

export type TripStop = z.infer<typeof tripStopSchema>;
export type Trip = z.infer<typeof tripSchema>;
export type QuotaResponse = z.infer<typeof quotaResponseSchema>;
export type ActiveHold = z.infer<typeof activeHoldSchema>;
export type HoldSeatsRequest = z.infer<typeof holdSeatsRequestSchema>;
export type HoldSeatsResponse = z.infer<typeof holdSeatsResponseSchema>;
export type ConfirmItem = z.infer<typeof confirmItemSchema>;
export type ConfirmBatchRequest = z.infer<typeof confirmBatchRequestSchema>;
export type ConfirmBatchResponse = z.infer<typeof confirmBatchResponseSchema>;

// Alias for backward compatibility
export type WeeklyTrip = Trip;

// ============================================================================
// BOOKING FLOW TYPES (frontend-specific)
// ============================================================================

export const passengerSchema = z.object({
    name: z.string().min(1, "Name is required"),
    relation: z.enum(['SELF', 'SPOUSE', 'CHILD', 'PARENT', 'GUEST']),
});

export const bookingSelectionSchema = z.object({
    tripId: z.string().uuid(),
    pickupId: z.string().uuid(),
    dropoffId: z.string().uuid(),
    ticketCount: z.number().min(1).max(3),
}).refine(
    (data) => data.pickupId !== data.dropoffId,
    {
        message: "Pickup and dropoff stops cannot be the same",
        path: ['dropoffId']
    }
);

export type Passenger = z.infer<typeof passengerSchema>;
export type BookingSelection = z.infer<typeof bookingSelectionSchema>;

// ============================================================================
// TICKET TYPES
// ============================================================================

export const myTicketSchema = z.object({
    ticket_id: z.string().uuid(),
    ticket_code: z.string(),
    serial_no: z.number(),
    status: z.string(),

    passenger_name: z.string(),
    passenger_relation: z.string(),
    is_self: z.boolean(),

    route_name: z.string(),
    direction: z.string(),

    relevant_location: z.string(),
    pickup_location: z.string(),
    dropoff_location: z.string(),

    departure_time: z.string(), // ISO date string
    bus_type: z.string(),
    price: z.number(),
    is_cancellable: z.boolean(),
});

export type MyTicket = z.infer<typeof myTicketSchema>;
