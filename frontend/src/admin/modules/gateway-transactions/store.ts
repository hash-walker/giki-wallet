import { create } from 'zustand';
import { GatewayTransaction } from './schema';
import { GatewayTransactionService } from './service';
import { toast } from '@/lib/toast';
import { getWeekStart, getWeekEnd } from '../../shared';

interface GatewayTransactionState {
    transactions: GatewayTransaction[];
    totalCount: number;
    isLoading: boolean;
    isUpdating: boolean;

    // Filters & Pagination
    page: number;
    pageSize: number;
    search: string;
    status: string;
    paymentMethod: string;
    startDate: Date;
    endDate: Date;

    // Actions
    setPage: (page: number) => void;
    setSearch: (search: string) => void;
    setStatus: (status: string) => void;
    setPaymentMethod: (method: string) => void;
    setDateRange: (start: Date, end: Date) => void;

    fetchTransactions: () => Promise<void>;
    verifyTransaction: (txnRefNo: string) => Promise<void>;
}

export const useGatewayTransactionStore = create<GatewayTransactionState>((set, get) => ({
    transactions: [],
    totalCount: 0,
    isLoading: false,
    isUpdating: false,

    page: 1,
    pageSize: 100,
    search: '',
    status: 'ALL',
    paymentMethod: 'ALL',
    startDate: getWeekStart(new Date()),
    endDate: getWeekEnd(new Date()),

    setPage: (page) => {
        set({ page });
        get().fetchTransactions();
    },
    setSearch: (search) => {
        set({ search, page: 1 });
        get().fetchTransactions();
    },
    setStatus: (status) => {
        set({ status, page: 1 });
        get().fetchTransactions();
    },
    setPaymentMethod: (paymentMethod) => {
        set({ paymentMethod, page: 1 });
        get().fetchTransactions();
    },
    setDateRange: (startDate, endDate) => {
        set({ startDate, endDate, page: 1 });
        get().fetchTransactions();
    },

    fetchTransactions: async () => {
        set({ isLoading: true });
        const { page, pageSize, search, status, paymentMethod, startDate, endDate } = get();
        try {
            const data = await GatewayTransactionService.listGatewayTransactions({
                page,
                page_size: pageSize,
                search,
                status: status === 'ALL' ? undefined : status,
                payment_method: paymentMethod === 'ALL' ? undefined : paymentMethod,
                start_date: startDate.toISOString(),
                end_date: endDate.toISOString(),
            });
            set({
                transactions: data.data,
                totalCount: data.total_count
            });
        } catch (error) {
            console.error(error);
            toast.error('Failed to fetch gateway transactions');
        } finally {
            set({ isLoading: false });
        }
    },

    verifyTransaction: async (txnRefNo: string) => {
        set({ isUpdating: true });
        try {
            const updatedTxn = await GatewayTransactionService.verifyTransaction(txnRefNo);
            set((state) => ({
                transactions: state.transactions.map((t) =>
                    t.txn_ref_no === txnRefNo ? updatedTxn : t
                ),
            }));
            toast.success('Transaction verified successfully');
        } catch (error) {
            console.error(error);
            toast.error('Failed to verify transaction');
        } finally {
            set({ isUpdating: false });
        }
    },
}));
