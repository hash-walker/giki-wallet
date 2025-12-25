// Toast utility - simple wrapper around sonner
// This makes it easy to use and understand
import { toast as sonnerToast } from 'sonner';

export const toast = {
    // Success message (green)
    success: (message: string) => {
        sonnerToast.success(message);
    },
    
    // Error message (red)
    error: (message: string) => {
        sonnerToast.error(message);
    },
    
    // Info message (blue)
    info: (message: string) => {
        sonnerToast.info(message);
    },
    
    // Loading state
    loading: (message: string) => {
        return sonnerToast.loading(message);
    },
    
    // Promise toast (shows loading, then success/error)
    promise: <T,>(
        promise: Promise<T>,
        messages: {
            loading: string;
            success: string;
            error: string;
        }
    ) => {
        return sonnerToast.promise(promise, messages);
    }
};

