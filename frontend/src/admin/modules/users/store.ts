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
    approveUser: (userId: string) => Promise<void>;
    rejectUser: (userId: string) => Promise<void>;
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

    approveUser: async (userId: string) => {
        set({ isUpdating: true });
        try {
            const updatedUser = await UserService.approveUser(userId);
            set((state) => ({
                users: state.users.map((u) => (u.id === userId ? updatedUser : u)),
            }));
            toast.success('User approved and verification email sent');
        } catch (error) {
            console.error(error);
            toast.error('Failed to approve user');
        } finally {
            set({ isUpdating: false });
        }
    },

    rejectUser: async (userId: string) => {
        set({ isUpdating: true });
        try {
            await UserService.rejectUser(userId);
            // Optionally remove from list or update locally
            set((state) => ({
                users: state.users.map((u) => (u.id === userId ? { ...u, is_active: false } : u)),
            }));
            toast.success('User application rejected');
        } catch (error) {
            console.error(error);
            toast.error('Failed to reject user');
        } finally {
            set({ isUpdating: false });
        }
    },
}));
