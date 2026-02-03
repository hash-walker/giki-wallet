import { apiClient } from '@/lib/axios';
import { GatewayTransaction, GatewayTransactionListParams, GatewayTransactionResponse, PaymentAuditLog } from './schema';

export const GatewayTransactionService = {
    listGatewayTransactions: async (params: GatewayTransactionListParams): Promise<GatewayTransactionResponse> => {
        const response = await apiClient.get('/admin/transactions/gateway', { params });
        return response.data;
    },

    verifyTransaction: async (txnRefNo: string): Promise<GatewayTransaction> => {
        const response = await apiClient.post(`/admin/transactions/gateway/${txnRefNo}/verify`);
        return response.data;
    },

    getLiabilityBalance: async (): Promise<{ balance: number, currency: string }> => {
        const response = await apiClient.get('/admin/finance/liability');
        return response.data;
    },

    getRevenueBalance: async (): Promise<{ balance: number, currency: string }> => {
        const response = await apiClient.get('/admin/finance/revenue');
        return response.data;
    },

    getPeriodRevenue: async (params: GatewayTransactionListParams): Promise<{ volume: number, currency: string }> => {
        const response = await apiClient.get('/admin/finance/revenue/period', {
            params: {
                start_date: params.start_date,
                end_date: params.end_date
            }
        });
        return response.data;
    },

    getAuditLogs: async (txnRefNo: string): Promise<PaymentAuditLog[]> => {
        const response = await apiClient.get(`/admin/transactions/gateway/${txnRefNo}/logs`);
        return response.data;
    },
};
