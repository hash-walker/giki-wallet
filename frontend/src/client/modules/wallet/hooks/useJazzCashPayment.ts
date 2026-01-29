import { useEffect, useCallback, useRef } from 'react';
import { useWalletModuleStore, PaymentFlowStatus } from '../store';
import { topUp, getTransactionStatus } from '../api';
import { TopUpRequest } from '../types';

export const useJazzCashPayment = (amount: number, phoneNumber: string, cnicLast6: string) => {
    
    const {
        formData,
        status,
        timeLeft,
        txnRefNo,
        errorMessage,
        setStatus,
        setTimeLeft,
        setTxnRefNo,
        setErrorMessage,
        resetPaymentState: reset
    } = useWalletModuleStore();

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
            const result = await getTransactionStatus(txnRefNo);
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
        setStatus('initiating'); // Show "Processing" or loading state

        try {
            // Get form data from store
            const request: TopUpRequest = {
                idempotency_key: formData.idempotency_key,
                amount: parseFloat(formData.amount),
                method: formData.method,
                phone_number: formData.mobile_number,
                cnic_last6: formData.cnic_last_six
            };

            const result = await topUp(request, abortControllerRef.current.signal);

            // Only after receiving response, switch to processing state and start countdown
            setStatus('processing');

            // Start 60s visual timer after getting response
            timerIntervalRef.current = setInterval(() => {
                setTimeLeft((prev) => {
                    if (prev <= 1) {
                        handleFailure("Payment timed out. Please try again.");
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);

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
