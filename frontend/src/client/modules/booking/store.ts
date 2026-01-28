import { create } from 'zustand';
import axios from '@/lib/axios';
import { Ticket, TicketSchema } from './types';
import { z } from 'zod';
import { toast } from '@/lib/toast';

interface TicketsState {
    tickets: Ticket[];
    loading: boolean;
    error: string | null;
    initialized: boolean;

    fetchTickets: () => Promise<void>;
}

export const useTicketsStore = create<TicketsState>((set) => ({
    tickets: [],
    loading: false,
    error: null,
    initialized: false,

    fetchTickets: async () => {
        set({ loading: true, error: null });
        try {
            const res = await axios.get('/transport/tickets');
            // Validate response
            const TicketsArraySchema = z.array(TicketSchema);
            const parsed = TicketsArraySchema.parse(res.data);

            set({ tickets: parsed, loading: false, initialized: true });
        } catch (err: any) {
            console.error('Failed to fetch tickets:', err);
            set({
                error: err.message || 'Failed to load tickets',
                loading: false
            });
            toast.error('Failed to load your tickets');
        }
    }
}));
