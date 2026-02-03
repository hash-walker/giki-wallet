import { apiClient } from '@/lib/axios';
import { GatewayTransaction, GatewayTransactionListParams, GatewayTransactionResponse } from './schema';

export const GatewayTransactionService = {
    listGatewayTransactions: async (params: GatewayTransactionListParams): Promise<GatewayTransactionResponse> => {
        const response = await apiClient.get('/admin/transactions/gateway', { params });
        return response.data;
    },

    verifyTransaction: async (txnRefNo: string): Promise<GatewayTransaction> => {
        const response = await apiClient.post(`/admin/transactions/gateway/${txnRefNo}/verify`);
        return response.data;
    },
};
