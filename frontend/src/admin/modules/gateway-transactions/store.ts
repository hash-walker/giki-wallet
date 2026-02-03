import { create } from 'zustand';
import { GatewayTransaction } from './schema';
import { GatewayTransactionService } from './service';
import { toast } from '@/lib/toast';
import { getWeekStart, getWeekEnd } from '../../shared';
import { apiClient } from '@/lib/axios';

interface GatewayTransactionState {
    transactions: GatewayTransaction[];
    totalCount: number;
    totalLiability: number;
    totalRevenue: number;
    periodVolume: number;
    periodRevenue: number;
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
    fetchFinanceStats: () => Promise<void>;
    exportTransactions: () => Promise<void>;
}

export const useGatewayTransactionStore = create<GatewayTransactionState>((set, get) => ({
    transactions: [],
    totalCount: 0,
    totalLiability: 0,
    totalRevenue: 0,
    periodVolume: 0,
    periodRevenue: 0,
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
        get().fetchFinanceStats();
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
                totalCount: data.total_count,
                periodVolume: parseFloat(data.total_amount) / 100.0
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

    fetchFinanceStats: async () => {
        const { startDate, endDate } = get();
        try {
            const [liability, revenue, periodRev] = await Promise.all([
                GatewayTransactionService.getLiabilityBalance(),
                GatewayTransactionService.getRevenueBalance(),
                GatewayTransactionService.getPeriodRevenue({
                    page: 1, page_size: 1,
                    start_date: startDate.toISOString(),
                    end_date: endDate.toISOString()
                })
            ]);
            set({
                totalLiability: liability.balance,
                totalRevenue: revenue.balance,
                periodRevenue: periodRev.volume
            });
        } catch (error) {
            console.error(error);
        }
    },

    exportTransactions: async () => {
        const { search, status, paymentMethod, startDate, endDate } = get();
        try {
            const params = {
                search,
                status: status === 'ALL' ? undefined : status,
                payment_method: paymentMethod === 'ALL' ? undefined : paymentMethod,
                start_date: startDate.toISOString(),
                end_date: endDate.toISOString(),
            };

            const response = await apiClient.get('/admin/transactions/gateway/export', {
                params,
                responseType: 'blob'
            });

            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            const contentDisposition = response.headers['content-disposition'];
            let fileName = 'gateway_transactions.csv';
            if (contentDisposition) {
                const fileNameMatch = contentDisposition.match(/filename="?([^"]+)"?/);
                if (fileNameMatch && fileNameMatch.length === 2)
                    fileName = fileNameMatch[1];
            }
            link.setAttribute('download', fileName);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (error) {
            console.error(error);
            toast.error('Failed to export transactions');
        }
    },
}));
