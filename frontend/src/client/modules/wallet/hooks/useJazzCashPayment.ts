import { useCallback, useRef } from 'react';
import { useWalletModuleStore, PaymentFlowStatus } from '../store';
import { topUp } from '../api';
import { getErrorMessage } from '@/lib/errors';
import { TopUpRequest } from '../types';

export const useJazzCashPayment = (amount: number, phoneNumber: string, cnicLast6: string) => {

    const {
        formData,
        status,
        setStatus,
        setErrorMessage,
        fetchBalance,
        resetPaymentState: reset
    } = useWalletModuleStore();

    const abortControllerRef = useRef<AbortController | null>(null);
    const isActive = useRef(false);

    const initiatePayment = async () => {
        if (isActive.current) return;

        abortControllerRef.current = new AbortController();
        isActive.current = true;

        reset();

        // IMMEDIATELY show the "Payment Request Sent" state
        setStatus('processing');

        try {
            const request: TopUpRequest = {
                idempotency_key: formData.idempotency_key,
                amount: parseFloat(formData.amount),
                method: formData.method,
                phone_number: formData.mobile_number,
                cnic_last6: formData.cnic_last_six
            };

            // Send payment request in background
            const result = await topUp(request, abortControllerRef.current.signal);

            if (result.status === 'SUCCESS') {
                setStatus('success');
                fetchBalance();
            } else if (result.redirect) {
                // For CARD payments, redirect to the payment page
                const url = result.redirect.startsWith('/') ? window.location.origin + result.redirect : result.redirect;
                window.location.assign(url);
            } else if (result.status === 'PENDING') {
                // Keep showing processing state for mobile wallet
                setStatus('processing');
            } else {
                setStatus('failed');
                setErrorMessage(result.message || "Payment initiation failed");
            }
        } catch (err: any) {
            if (err.code === 'ERR_CANCELED' || err.name === 'CanceledError') {
                return; // User cancelled, do nothing
            }
            setStatus('failed');
            setErrorMessage(getErrorMessage(err));
        } finally {
            isActive.current = false;
        }
    };

    return {
        status,
        errorMessage,
        initiatePayment,
        reset
    };
};
