import { apiClient } from '@/lib/axios';
import { z } from 'zod';
import {
    topUpRequestSchema,
    topUpResultSchema,
    balanceSchema,
    historyResponseSchema
} from './validators';
import { TopUpRequest } from './types';

// Infer types from schemas
export type BalanceResponse = z.infer<typeof balanceSchema>;
export type ApiTransaction = z.infer<typeof historyResponseSchema>[number];
// Re-export TopUp result type
export type TopUpResult = z.infer<typeof topUpResultSchema>;

export async function getBalance() {
    const res = await apiClient.get<BalanceResponse>('/wallet/balance');
    return balanceSchema.parse(res.data);
}

export async function getHistory() {
    const res = await apiClient.get<ApiTransaction[]>('/wallet/history');
    return historyResponseSchema.parse(res.data);
}

export async function topUp(request: TopUpRequest & { timeout?: number }, signal?: AbortSignal) {
    const { timeout, ...data } = request;

    // Validate request
    topUpRequestSchema.parse(data);

    console.log(`Initiating topUp with timeout: ${timeout || 60000}ms`);
    const res = await apiClient.post<TopUpResult>('/payment/topup', data, {
        timeout: timeout || 60000,
        signal
    });

    // Validate and return response
    return topUpResultSchema.parse(res.data);
}

export async function getTransactionStatus(txnRefNo: string, signal?: AbortSignal) {
    const res = await apiClient.get<TopUpResult>(`/payment/status/${txnRefNo}`, { signal });
    return topUpResultSchema.parse(res.data);
}
