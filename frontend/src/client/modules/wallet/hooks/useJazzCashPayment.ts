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
    const pollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const abortControllerRef = useRef<AbortController | null>(null);
    const isActive = useRef(false);

    const clearAllTimers = useCallback(() => {
        if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
        if (pollTimeoutRef.current) clearTimeout(pollTimeoutRef.current);
        timerIntervalRef.current = null;
        pollTimeoutRef.current = null;

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

    const pollOnce = useCallback(async (currentTxnRefNo: string) => {
        try {
            const result = await getTransactionStatus(currentTxnRefNo);
            if (result.status === 'SUCCESS') handleSuccess();
            else if (result.status === 'FAILED') handleFailure(result.message || "Transaction failed");
        } catch (err) {
            // Silently ignore poll errors, wait for next cycle
        }
    }, [handleSuccess, handleFailure]);

    const startPolling = useCallback(() => {
        if (pollTimeoutRef.current) return;

        const tick = async () => {
            pollTimeoutRef.current = null;

            const { status: currentStatus, txnRefNo: currentTxnRefNo } = useWalletModuleStore.getState();
            if (currentStatus !== 'processing' || !currentTxnRefNo) return;

            await pollOnce(currentTxnRefNo);

            const { status: nextStatus, txnRefNo: nextTxnRefNo } = useWalletModuleStore.getState();
            if (nextStatus === 'processing' && nextTxnRefNo) {
                pollTimeoutRef.current = setTimeout(tick, 1000);
            }
        };

        pollTimeoutRef.current = setTimeout(tick, 1000);
    }, [pollOnce]);

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
            } else if (result.redirect) {
                // For CARD payments, redirect to the payment page
                // Use absolute path for safety if it starts with /api
                const url = result.redirect.startsWith('/') ? window.location.origin + result.redirect : result.redirect;
                window.location.assign(url);
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
                startPolling();
            }
        };
        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }, [status, startPolling]);

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
