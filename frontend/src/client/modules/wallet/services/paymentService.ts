import { z } from 'zod';
import { apiClient } from '@/lib/axios';

// --- SCHEMAS ---
export const PaymentStatusSchema = z.enum(['SUCCESS', 'FAILED', 'PENDING', 'CANCELLED']);

export const TopUpResultSchema = z.object({
    status: PaymentStatusSchema,
    txn_ref_no: z.string().optional(),
    message: z.string().optional(),
    redirect: z.string().optional(),
});

export const TopUpRequestSchema = z.object({
    idempotency_key: z.string(),
    amount: z.number().min(1),
    method: z.enum(['MWALLET', 'CARD']),
    phone_number: z.string().optional(),
    cnic_last6: z.string().optional(),
});

export type TopUpResult = z.infer<typeof TopUpResultSchema>;
export type TopUpRequest = z.infer<typeof TopUpRequestSchema>;

// --- SERVICE ---
export const paymentService = {
    async topUp(request: TopUpRequest, signal?: AbortSignal) {
        // Validation before sending
        TopUpRequestSchema.parse(request);

        const res = await apiClient.post('/payment/topup', request, {
            timeout: 60000, // 60s for backend wait
            signal // Allow aborting the request
        });

        return TopUpResultSchema.parse(res.data);
    },

    async getStatus(txnRefNo: string, signal?: AbortSignal) {
        const res = await apiClient.get(`/payment/status/${txnRefNo}`, { signal });
        return TopUpResultSchema.parse(res.data);
    }
};
