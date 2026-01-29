import { z } from 'zod';

export const createTripSchema = z.object({
    routeId: z.string().uuid({ message: "Route selection is required" }),
    // UI usage: separated date and time for better UX
    date: z.date(),
    time: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, { message: "Invalid time format (HH:mm)" }),

    // Rules
    bookingOpenOffset: z.number().min(1, "Must be at least 1 hour"),
    bookingCloseOffset: z.number().min(1, "Must be at least 1 hour"),

    // Capacity & Price
    totalCapacity: z.number().min(1, "Capacity must be greater than 0"),
    basePrice: z.number().min(0, "Price cannot be negative"),
    busType: z.string().min(1, "Bus type is required"),
    direction: z.enum(['OUTBOUND', 'INBOUND']),

    // Selected stops IDs
    selectedStopIds: z.array(z.string().uuid()).min(2, "A trip must have at least 2 stops (Origin & Destination)"),
});

export type CreateTripFormValues = z.infer<typeof createTripSchema>;
