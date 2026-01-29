import { create } from 'zustand';
import { User } from './schema';
import { UserService } from './service';
import { toast } from '@/lib/toast';

interface UserState {
    // Data
    users: User[];
    isLoading: boolean;
    isUpdating: boolean;

    // Actions
    fetchUsers: () => Promise<void>;
    toggleUserStatus: (userId: string, currentStatus: boolean) => Promise<void>;
}

export const useUserStore = create<UserState>((set) => ({
    users: [],
    isLoading: false,
    isUpdating: false,

    fetchUsers: async () => {
        set({ isLoading: true });
        try {
            const users = await UserService.listUsers();
            set({ users });
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
