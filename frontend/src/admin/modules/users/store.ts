import { create } from 'zustand';
import { User } from './schema';
import { UserService } from './service';
import { toast } from '@/lib/toast';

interface UserState {
    // Data
    users: User[];
    isLoading: boolean;
    isUpdating: boolean;
    pagination: {
        page: number;
        pageSize: number;
        totalCount: number;
    };

    // Actions
    fetchUsers: (page?: number) => Promise<void>;
    toggleUserStatus: (userId: string, currentStatus: boolean) => Promise<void>;
}

export const useUserStore = create<UserState>((set, get) => ({
    users: [],
    isLoading: false,
    isUpdating: false,
    pagination: {
        page: 1,
        pageSize: 100,
        totalCount: 0,
    },

    fetchUsers: async (page = 1) => {
        set({ isLoading: true });
        try {
            const response = await UserService.listUsers(page, get().pagination.pageSize);
            set({
                users: response.data,
                pagination: {
                    ...get().pagination,
                    page: response.page,
                    totalCount: response.total_count,
                }
            });
        } catch (error) {
            console.error(error);
            toast.error('Failed to fetch users');
        } finally {
            set({ isLoading: false });
        }
    },

    toggleUserStatus: async (userId: string, currentStatus: boolean) => {
        set({ isUpdating: true });
        try {
            const updatedUser = await UserService.updateUserStatus(userId, !currentStatus);
            set((state) => ({
                users: state.users.map((u) => (u.id === userId ? updatedUser : u)),
            }));
            toast.success(updatedUser.is_active ? 'User activated' : 'User deactivated');
        } catch (error) {
            console.error(error);
            toast.error('Failed to update user status');
        } finally {
            set({ isUpdating: false });
        }
    },
}));
