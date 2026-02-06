import { z } from 'zod';
import { parse } from 'date-fns';

const tripFormSchema = z.object({
    routeId: z.string().uuid({ message: "Route selection is required" }),
    // UI usage: separated date and time for better UX
    date: z.date(),
    time: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, { message: "Invalid time format (HH:mm)" }),

    // Booking window times (admin selects actual date/time)
    bookingOpenDate: z.date(),
    bookingOpenTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, { message: "Invalid time format (HH:mm)" }),
    bookingCloseDate: z.date(),
    bookingCloseTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, { message: "Invalid time format (HH:mm)" }),

    // Capacity & Price
    totalCapacity: z.number().min(1, "Capacity must be greater than 0"),
    basePrice: z.number().min(0, "Price cannot be negative"),
    busType: z.string().min(1, "Bus type is required"),
    direction: z.enum(['OUTBOUND', 'INBOUND']),

    // Selected stops IDs
    selectedStopIds: z.array(z.string().uuid()).min(2, "A trip must have at least 2 stops (Origin & Destination)"),
});

export type CreateTripFormValues = z.infer<typeof tripFormSchema>;

export const createTripSchema = tripFormSchema.refine((data) => {
    const closeDateTime = parse(data.bookingCloseTime, 'HH:mm', data.bookingCloseDate);
    const now = new Date();
    return closeDateTime > now;
}, {
    message: "Booking close time must be in the future",
    path: ["bookingCloseTime"],
}).refine((data) => {
    const openDateTime = parse(data.bookingOpenTime, 'HH:mm', data.bookingOpenDate);
    const closeDateTime = parse(data.bookingCloseTime, 'HH:mm', data.bookingCloseDate);
    return openDateTime < closeDateTime;
}, {
    message: "Booking must open before it closes",
    path: ["bookingOpenTime"],
});
