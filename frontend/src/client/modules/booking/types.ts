import { z } from 'zod';

export const TicketSchema = z.object({
    id: z.string().uuid(),
    ticket_number: z.string(),
    serial_no: z.number(),
    route_name: z.string(),
    direction: z.string(),
    pickup_location: z.string(),
    dropoff_location: z.string(),
    date: z.string(),
    time: z.string(),
    status: z.string(),
    bus_type: z.string(),
    passenger_name: z.string(),
    passenger_relation: z.string(),
    is_self: z.boolean(),
    price: z.number(),
    can_cancel: z.boolean(),
});

export type Ticket = z.infer<typeof TicketSchema>;
