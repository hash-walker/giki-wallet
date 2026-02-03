import { z } from 'zod';

export const gatewayTransactionSchema = z.object({
    txn_ref_no: z.string(),
    user_id: z.string().uuid(),
    user_name: z.string(),
    user_email: z.string().email(),
    amount: z.string(), // BigInt returned as string
    status: z.string(),
    payment_method: z.string(),
    created_at: z.string(),
    updated_at: z.string(),
    bill_ref_id: z.string().optional().nullable(),
});

export const updateGatewayTransactionStatusSchema = z.object({
    status: z.string(),
});

export type GatewayTransaction = z.infer<typeof gatewayTransactionSchema>;
export type UpdateGatewayTransactionStatus = z.infer<typeof updateGatewayTransactionStatusSchema>;

export interface GatewayTransactionListParams {
    page: number;
    page_size: number;
    start_date?: string;
    end_date?: string;
    search?: string;
    status?: string;
    payment_method?: string;
}

export interface GatewayTransactionResponse {
    data: GatewayTransaction[];
    total_count: number;
    page: number;
    page_size: number;
}
