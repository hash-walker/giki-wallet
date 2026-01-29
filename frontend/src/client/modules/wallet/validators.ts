import { z } from 'zod';

export const paymentStatusSchema = z.enum(['PENDING', 'SUCCESS', 'FAILED', 'UNKNOWN']);

export const paymentMethodSchema = z.enum(['MWALLET', 'CARD']);

export const topUpFormSchema = z.object({
    idempotency_key: z.string(),
    amount: z.string(),
    method: paymentMethodSchema,
    mobile_number: z.string(),
    cnic_last_six: z.string(),
});

export const topUpRequestSchema = z.object({
    idempotency_key: z.string(),
    amount: z.number().min(1),
    method: paymentMethodSchema,
    phone_number: z.string().optional(),
    cnic_last6: z.string().optional(),
});

export const topUpResultSchema = z.object({
    id: z.string(),
    txn_ref_no: z.string(),
    status: paymentStatusSchema,
    message: z.string().optional(),
    paymentMethod: paymentMethodSchema,
    redirect: z.string().optional(),
    amount: z.number().optional()
});

export const balanceSchema = z.object({
    balance: z.number(),
    currency: z.string()
});

export const transactionSchema = z.object({
    id: z.string(),
    amount: z.number(),
    balance_after: z.number(),
    type: z.string(),
    reference_id: z.string(),
    description: z.string(),
    created_at: z.string()
});

export const historyResponseSchema = z.array(transactionSchema);

