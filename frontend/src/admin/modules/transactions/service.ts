import axios from '@/lib/axios';
import { Transaction } from './types';

// Adapts the backend transaction item to the frontend Transaction interface
const adaptTransaction = (item: any): Transaction => {
    // Determine category and type based on item.type or description
    // Backend types: "TRANSPORT_BOOKING", "REFUND", etc.
    let category: 'wallet' | 'ticket' = 'ticket';
    let type: any = 'purchase';

    if (item.type === 'TRANSPORT_BOOKING') {
        category = 'ticket';
        type = 'purchase';
    } else if (item.type === 'REFUND') {
        category = 'ticket';
        type = 'refund';
    } else {
        category = 'wallet';
        type = 'received';
    }

    // Try to extract passenger name from description "Ticket for X"
    let passengerName = '';
    const desc = item.description || '';
    if (desc.startsWith('Ticket for ')) {
        passengerName = desc.replace('Ticket for ', '');
    }

    return {
        id: item.id,
        userId: 0, // Not available in simple ledger view
        userName: passengerName || 'System User', // Fallback
        userEmail: '-', // Not available
        amount: item.amount,
        timestamp: item.created_at,
        status: 'completed', // Ledger entries are always completed

        // Specific fields
        category,
        type,

        // Ticket specific
        ticketNumber: item.reference_id,
        passengerName: passengerName,

        // Wallet specific
        senderName: passengerName || 'User',
    } as Transaction;
};

export const getTransportTransactions = async (): Promise<Transaction[]> => {
    const { data } = await axios.get('/admin/transport/transactions');
    return data.map(adaptTransaction);
};
