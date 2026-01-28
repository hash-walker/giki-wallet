import { create } from 'zustand';

export type PaymentFlowStatus = 'idle' | 'initiating' | 'processing' | 'success' | 'failed';

interface PaymentState {
    status: PaymentFlowStatus;
    timeLeft: number;
    txnRefNo: string | null;
    errorMessage: string | null;

    // Actions
    setStatus: (status: PaymentFlowStatus) => void;
    setTimeLeft: (time: number | ((prev: number) => number)) => void;
    setTxnRefNo: (ref: string | null) => void;
    setErrorMessage: (msg: string | null) => void;
    reset: () => void;
}

export const usePaymentStore = create<PaymentState>((set) => ({
    status: 'idle',
    timeLeft: 60,
    txnRefNo: null,
    errorMessage: null,

    setStatus: (status) => set({ status }),
    setTimeLeft: (time) => set((state) => ({
        timeLeft: typeof time === 'function' ? time(state.timeLeft) : time
    })),
    setTxnRefNo: (txnRefNo) => set({ txnRefNo }),
    setErrorMessage: (errorMessage) => set({ errorMessage }),
    reset: () => set({
        status: 'idle',
        timeLeft: 60,
        txnRefNo: null,
        errorMessage: null
    }),
}));
