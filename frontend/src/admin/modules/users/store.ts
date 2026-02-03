import { create } from 'zustand';
import { User } from './schema';
import { UserService } from './service';
import { toast } from '@/lib/toast';
import { AppError } from '@/lib/errors';

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

    filters: {
        search: string;
        role: string;
        status: string;
    };
    setFilters: (filters: Partial<UserState['filters']>) => void;

    // Actions
    fetchUsers: (page?: number) => Promise<void>;
    createUser: (data: Partial<User>) => Promise<void>;
    updateUser: (userId: string, data: Partial<User>) => Promise<void>;
    deleteUser: (userId: string) => Promise<void>;
    toggleUserStatus: (userId: string, currentStatus: boolean) => Promise<void>;
    approveUser: (userId: string) => Promise<void>;
    rejectUser: (userId: string) => Promise<void>;
}

export const useUserStore = create<UserState>((set, get) => ({
    // ... (existing state)
    // ...
    users: [],
    isLoading: false,
    isUpdating: false,
    pagination: {
        page: 1,
        pageSize: 100,
        totalCount: 0,
    },
    filters: {
        search: '',
        role: 'all',
        status: 'all',
    },

    setFilters: (newFilters) => {
        set((state) => ({
            filters: { ...state.filters, ...newFilters },
            pagination: { ...state.pagination, page: 1 },
        }));
        get().fetchUsers(1);
    },

    fetchUsers: async (page = 1) => {
        // ... (existing fetchUsers)
        set({ isLoading: true });
        const { filters, pagination } = get();
        try {
            const response = await UserService.listUsers(
                page,
                pagination.pageSize,
                filters.search,
                filters.role,
                filters.status
            );
            set({
                users: response.data,
                pagination: {
                    ...pagination,
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

    createUser: async (data: Partial<User>) => {
        set({ isUpdating: true });
        try {
            await UserService.createUser(data);
            get().fetchUsers(1); // Refresh list
            toast.success('User created successfully');
        } catch (error) {
            console.error(error);
            toast.error('Failed to create user');
        } finally {
            set({ isUpdating: false });
        }
    },

    updateUser: async (userId: string, data: Partial<User>) => {
        set({ isUpdating: true });
        try {
            const updatedUser = await UserService.updateUser(userId, data);
            set((state) => ({
                users: state.users.map((u) => (u.id === userId ? { ...u, ...updatedUser } : u)),
            }));
            toast.success('User updated successfully');
        } catch (error) {
            console.error(error);
            toast.error('Failed to update user');
        } finally {
            set({ isUpdating: false });
        }
    },

    deleteUser: async (userId: string) => {
        set({ isUpdating: true });
        try {
            await UserService.deleteUser(userId);
            set((state) => ({
                users: state.users.filter((u) => u.id !== userId),
                pagination: {
                    ...state.pagination,
                    totalCount: state.pagination.totalCount - 1,
                }
            }));
            toast.success('User deleted successfully');
        } catch (error) {
            console.error(error);
            if (error instanceof AppError && error.code === 'USER_HAS_DATA') {
                toast.error(error.message); // Backend message: "Cannot delete user: ..."
            } else {
                toast.error('Failed to delete user');
            }
        } finally {
            set({ isUpdating: false });
        }
    },
}));
