import { apiClient } from '@/lib/axios';
import { User } from './schema';

export const UserService = {
    listUsers: async (): Promise<User[]> => {
        const { data } = await apiClient.get<User[]>('/admin/users');
        return data;
    },

    updateUserStatus: async (userId: string, isActive: boolean): Promise<User> => {
        const { data } = await apiClient.patch<User>(`/admin/users/${userId}/status`, {
            is_active: isActive,
        });
        return data;
    },
};
