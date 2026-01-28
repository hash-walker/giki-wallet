import { apiClient } from '@/lib/axios';
import { TopUpRequest, TopUpResult } from './types';

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

export async function topUp(request: TopUpRequest & { timeout?: number }) {
    const { timeout, ...data } = request;
    console.log(`Initiating topUp with timeout: ${timeout || 60000}ms`);
    const res = await apiClient.post<TopUpResult>('/payment/topup', data, {
        timeout: timeout || 60000
    });
    return res.data;
}

export async function getTransactionStatus(txnRefNo: string) {
    const res = await apiClient.get<TopUpResult>(`/payment/status/${txnRefNo}`);
    return res.data;
}
