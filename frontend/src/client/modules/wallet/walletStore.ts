import { create } from 'zustand';
import { getBalance, getHistory, type ApiTransaction } from './api';
import { Transaction } from './utils/transactionHelpers';

interface WalletState {
    balance: number;
    currency: string;
    transactions: Transaction[];
    loading: boolean;
    error: string | null;
    fetchBalance: () => Promise<void>;
    fetchHistory: () => Promise<void>;
}

export const useWalletStore = create<WalletState>((set) => ({
    balance: 0,
    currency: 'PKR',
    transactions: [],
    loading: false,
    error: null,
    fetchBalance: async () => {
        set({ loading: true });
        try {
            const data = await getBalance();
            set({ balance: data.balance, currency: data.currency, loading: false });
        } catch (error: any) {
            set({ error: error.message, loading: false });
        }
    },
    fetchHistory: async () => {
        set({ loading: true });
        try {
            const data = await getHistory();
            const mapped = data.map((t: ApiTransaction) => {
                const dateObj = new Date(t.created_at);
                return {
                    id: t.id,
                    type: mapTxType(t.type),
                    description: t.description,
                    amount: t.amount,
                    timestamp: dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }),
                    date: dateObj.toISOString().split('T')[0]
                };
            });
            set({ transactions: mapped, loading: false });
        } catch (error: any) {
            set({ error: error.message, loading: false });
        }
    },
}));

function mapTxType(type: string): 'ticket' | 'topup' | 'transfer' | 'received' {
    switch (type) {
        case 'TICKET_PURCHASE': return 'ticket';
        case 'TOP_UP': return 'topup';
        case 'TRANSFER': return 'transfer'; // This might need logic based on amount
        case 'TRANSFER_RECEIVED': return 'received';
        default: return 'ticket';
    }
}
