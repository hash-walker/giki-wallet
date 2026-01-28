import { useEffect, useCallback, useRef } from 'react';
import { usePaymentStore, PaymentFlowStatus } from '../store/paymentStore';
import { paymentService, TopUpRequest } from '../services/paymentService';

export const useJazzCashPayment = (amount: number, phoneNumber: string, cnicLast6: string) => {
    const {
        status,
        timeLeft,
        txnRefNo,
        errorMessage,
        setStatus,
        setTimeLeft,
        setTxnRefNo,
        setErrorMessage,
        reset
    } = usePaymentStore();

    const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const abortControllerRef = useRef<AbortController | null>(null);
    const isActive = useRef(false);

    const clearAllTimers = useCallback(() => {
        if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
        if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
        timerIntervalRef.current = null;
        pollIntervalRef.current = null;

        // Abort any pending requests to free up browser connection pool
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            abortControllerRef.current = null;
        }
    }, []);

    const handleSuccess = useCallback(() => {
        clearAllTimers();
        setStatus('success');
    }, [clearAllTimers, setStatus]);

    const handleFailure = useCallback((msg: string) => {
        // Ignore abort errors
        if (msg === 'canceled' || msg === 'Canceled') return;

        clearAllTimers();
        setStatus('failed');
        setErrorMessage(msg);
    }, [clearAllTimers, setStatus, setErrorMessage]);

    const pollStatus = useCallback(async () => {
        if (!txnRefNo || status !== 'processing') return;
        try {
            const result = await paymentService.getStatus(txnRefNo);
            if (result.status === 'SUCCESS') handleSuccess();
            else if (result.status === 'FAILED') handleFailure(result.message || "Transaction failed");
        } catch (err) {
            // Silently ignore poll errors, wait for next cycle
        }
    }, [txnRefNo, status, handleSuccess, handleFailure]);

    const startPolling = useCallback(() => {
        if (pollIntervalRef.current) return;
        pollIntervalRef.current = setInterval(pollStatus, 4000);
    }, [pollStatus]);

    const initiatePayment = async () => {
        if (isActive.current) return;

        // Create new AbortController for this attempt
        abortControllerRef.current = new AbortController();
        isActive.current = true;

        reset();
        setStatus('initiating'); // Show "Connecting" instantly

        // Start 60s visual timer immediately
        timerIntervalRef.current = setInterval(() => {
            setTimeLeft((prev) => {
                if (prev <= 1) {
                    handleFailure("Payment timed out. Please try again.");
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        try {
            const uuid = typeof crypto.randomUUID === 'function'
                ? crypto.randomUUID()
                : Math.random().toString(36).substring(2) + Date.now().toString(36);

            const request: TopUpRequest = {
                idempotency_key: uuid,
                amount,
                method: 'MWALLET',
                phone_number: phoneNumber,
                cnic_last6: cnicLast6
            };

            const result = await paymentService.topUp(request, abortControllerRef.current.signal);

            // Switch from "Connecting" to the "Check your phone" screen
            setStatus('processing');

            if (result.status === 'SUCCESS') {
                handleSuccess();
            } else if (result.status === 'PENDING') {
                setTxnRefNo(result.txn_ref_no || null);
                startPolling();
            } else {
                handleFailure(result.message || "Initiation failed");
            }
        } catch (err: any) {
            if (err.code === 'ERR_CANCELED' || err.name === 'CanceledError') {
                return; // User cancelled/unmounted, do nothing
            }
            handleFailure(err.response?.data?.message || err.message || "Connection failed");
        } finally {
            isActive.current = false;
        }
    };

    // Auto-Wake on visibility change
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible' && status === 'processing') {
                pollStatus();
            }
        };
        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }, [status, pollStatus]);

    // Cleanup on unmount
    useEffect(() => {
        return () => clearAllTimers();
    }, [clearAllTimers]);

    return {
        status,
        timeLeft,
        errorMessage,
        initiatePayment,
        reset
    };
};
