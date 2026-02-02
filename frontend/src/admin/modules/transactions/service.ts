import axios from '@/lib/axios';
import { Transaction, TransactionsPaginationResponse, AdminRevenueTransaction, WeeklyStats } from './types';

// Adapts the backend transaction item to the frontend Transaction interface
const adaptTransaction = (item: AdminRevenueTransaction): Transaction => {
    let category: 'wallet' | 'ticket' = 'ticket';
    let type: any = 'purchase';

    // TYPE MAPPING (Basic)
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

    // Amount comes in Cents from backend -> convert to Units
    const amount = item.amount / 100;

    return {
        id: item.id,
        userId: 0,
        userName: item.user_name || 'System User',
        userEmail: item.user_email || '-',
        amount: amount,
        timestamp: item.created_at,
        status: 'completed',
        category,
        type,
        ticketNumber: item.reference_id,
        // Fill both for UI flexibility
        passengerName: item.user_name || 'Passenger',
        senderName: item.user_name || 'Sender',
        description: item.description
    } as Transaction;
};

export interface FinanceResponse extends TransactionsPaginationResponse {
    weekly_stats: WeeklyStats;
}

export const getTransportTransactions = async (
    page = 1,
    pageSize = 20,
    startDate?: Date,
    endDate?: Date
): Promise<FinanceResponse> => {

    const params: any = { page, page_size: pageSize };
    if (startDate) params.start_date = startDate.toISOString();
    if (endDate) params.end_date = endDate.toISOString();

    const { data } = await axios.get('/admin/finance/transactions', { params });

    return {
        data: (data.data || []).map((item: any) => adaptTransaction(item)),
        total_count: data.meta.total_records,
        page: data.meta.page,
        page_size: data.meta.page_size,
        weekly_stats: data.meta.weekly_stats
    };
};

