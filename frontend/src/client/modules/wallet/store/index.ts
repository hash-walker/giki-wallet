import { create } from 'zustand';
import { getBalance, getHistory, topUp, getTransactionStatus, type ApiTransaction } from '../api';
import { type TopUpRequest } from '../types';

export type PaymentFlowStatus = 'idle' | 'initiating' | 'processing' | 'success' | 'failed';

interface WalletState {
    // Data Slice
    balance: number;
    currency: string;
    transactions: ApiTransaction[];
    isDataLoading: boolean;
    dataError: string | null;

    // Actions
    fetchBalance: () => Promise<void>;
    fetchHistory: () => Promise<void>;
}

interface PaymentState {
    // Payment UI Slice
    status: PaymentFlowStatus;
    timeLeft: number;
    txnRefNo: string | null;
    errorMessage: string | null;

    // Actions
    setStatus: (status: PaymentFlowStatus) => void;
    setTimeLeft: (time: number | ((prev: number) => number)) => void;
    setTxnRefNo: (ref: string | null) => void;
    setErrorMessage: (msg: string | null) => void;
    resetPaymentState: () => void;
}

type WalletModuleStore = WalletState & PaymentState;

export const useWalletModuleStore = create<WalletModuleStore>((set, get) => ({
    // Initial Data State
    balance: 0,
    currency: 'PKR',
    transactions: [],
    isDataLoading: false,
    dataError: null,

    // Initial Payment State
    status: 'idle',
    timeLeft: 60,
    txnRefNo: null,
    errorMessage: null,

    // Data Actions
    fetchBalance: async () => {
        set({ isDataLoading: true, dataError: null });
        try {
            const data = await getBalance();
            set({ balance: data.balance, currency: data.currency, isDataLoading: false });
        } catch (error: any) {
            set({ dataError: error.message || 'Failed to fetch balance', isDataLoading: false });
        }
    },

    fetchHistory: async () => {
        set({ isDataLoading: true, dataError: null });
        try {
            const data = await getHistory();
            set({ transactions: data, isDataLoading: false });
        } catch (error: any) {
            set({ dataError: error.message || 'Failed to fetch history', isDataLoading: false });
        }
    },

    // Payment UI Actions
    setStatus: (status) => set({ status }),
    setTimeLeft: (time) => set((state) => ({
        timeLeft: typeof time === 'function' ? time(state.timeLeft) : time
    })),
    setTxnRefNo: (txnRefNo) => set({ txnRefNo }),
    setErrorMessage: (errorMessage) => set({ errorMessage }),
    resetPaymentState: () => set({
        status: 'idle',
        timeLeft: 60,
        txnRefNo: null,
        errorMessage: null
    }),
}));
