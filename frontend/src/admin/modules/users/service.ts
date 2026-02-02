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

    approveUser: async (userId: string): Promise<User> => {
        const { data } = await apiClient.post<User>(`/admin/users/${userId}/approve`);
        return data;
    },

    rejectUser: async (userId: string): Promise<void> => {
        await apiClient.post(`/admin/users/${userId}/reject`);
    },
};
