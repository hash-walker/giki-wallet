import { apiClient } from "@/lib/axios";

export interface CreateFeedbackRequest {
    rating: number;
    comment: string;
}

export interface Feedback {
    id: number;
    user_id: string;
    rating: number;
    comment: string;
    created_at: string;
}

export const createFeedback = async (data: CreateFeedbackRequest): Promise<Feedback> => {
    const response = await apiClient.post<Feedback>("/feedback", data);
    return response.data;
};
