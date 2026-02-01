import axios from '@/lib/axios';
import { Transaction, TransactionsPaginationResponse } from './types';

// Adapts the backend transaction item to the frontend Transaction interface
const adaptTransaction = (item: any): Transaction => {
    // ... existing adaptation logic ... (I will keep it same)
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

    let passengerName = '';
    const desc = item.description || '';
    if (desc.startsWith('Ticket for ')) {
        passengerName = desc.replace('Ticket for ', '');
    }

    return {
        id: item.id,
        userId: 0,
        userName: passengerName || 'System User',
        userEmail: '-',
        amount: item.amount,
        timestamp: item.created_at,
        status: 'completed',
        category,
        type,
        ticketNumber: item.reference_id,
        passengerName: passengerName,
        senderName: passengerName || 'User',
    } as Transaction;
};

export const getTransportTransactions = async (page = 1, pageSize = 100): Promise<TransactionsPaginationResponse> => {
    const { data } = await axios.get('/admin/transport/transactions', {
        params: { page, page_size: pageSize },
    });

    return {
        data: data.data.map(adaptTransaction),
        total_count: data.total_count,
        page: data.page,
        page_size: data.page_size,
    };
};

