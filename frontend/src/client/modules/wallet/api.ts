import { apiClient } from '@/lib/axios';

export type BalanceResponse = {
    balance: number;
    currency: string;
};

export type ApiTransaction = {
    id: string;
    amount: number;
    balance_after: number;
    type: string;
    reference_id: string;
    description: string;
    created_at: string;
};

export async function getBalance() {
    const res = await apiClient.get<BalanceResponse>('/wallet/balance');
    return res.data;
}

export async function getHistory() {
    const res = await apiClient.get<ApiTransaction[]>('/wallet/history');
    return res.data;
}
