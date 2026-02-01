import { apiClient } from '@/lib/axios';
import { User, UsersPaginationResponse } from './schema';

export const UserService = {
    listUsers: async (page = 1, pageSize = 100): Promise<UsersPaginationResponse> => {
        const { data } = await apiClient.get<UsersPaginationResponse>('/admin/users', {
            params: { page, page_size: pageSize },
        });
        return data;
    },

    updateUserStatus: async (userId: string, isActive: boolean): Promise<User> => {
        const { data } = await apiClient.patch<User>(`/admin/users/${userId}/status`, {
            is_active: isActive,
        });
        return data;
    },
};
