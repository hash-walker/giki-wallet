import { apiClient } from '@/lib/axios';
import { GatewayTransaction } from './schema';

export const GatewayTransactionService = {
    listGatewayTransactions: async (): Promise<GatewayTransaction[]> => {
        const response = await apiClient.get('/admin/transactions/gateway');
        return response.data;
    },

    verifyTransaction: async (txnRefNo: string): Promise<GatewayTransaction> => {
        const response = await apiClient.post(`/admin/transactions/gateway/${txnRefNo}/verify`);
        return response.data;
    },
};
