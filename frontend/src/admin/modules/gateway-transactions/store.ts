import { create } from 'zustand';
import { GatewayTransaction } from './schema';
import { GatewayTransactionService } from './service';
import { toast } from '@/lib/toast';

interface GatewayTransactionState {
    transactions: GatewayTransaction[];
    isLoading: boolean;
    isUpdating: boolean;

    fetchTransactions: () => Promise<void>;
    verifyTransaction: (txnRefNo: string) => Promise<void>;
}

export const useGatewayTransactionStore = create<GatewayTransactionState>((set, get) => ({
    transactions: [],
    isLoading: false,
    isUpdating: false,

    fetchTransactions: async () => {
        set({ isLoading: true });
        try {
            const transactions = await GatewayTransactionService.listGatewayTransactions();
            set({ transactions });
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
