import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { createFeedback, type CreateFeedbackRequest } from '../api';
import { toast } from 'sonner';

export const useFeedback = () => {
    const [isOpen, setIsOpen] = useState(false);

    const mutation = useMutation({
        mutationFn: (data: CreateFeedbackRequest) => createFeedback(data),
        onSuccess: () => {
            toast.success('Thank you for your feedback!');
            setIsOpen(false);
        },
        onError: (error: any) => {
            toast.error(error.message || 'Failed to submit feedback');
        },
    });

    const openFeedback = () => setIsOpen(true);
    const closeFeedback = () => setIsOpen(false);

    const submitFeedback = (rating: number, comment: string) => {
        mutation.mutate({ rating, comment });
    };

    return {
        isOpen,
        openFeedback,
        closeFeedback,
        submitFeedback,
        isPending: mutation.isPending,
    };
};
