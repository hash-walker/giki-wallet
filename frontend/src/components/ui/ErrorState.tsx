interface ErrorStateProps {
    message?: string;
    onRetry?: () => void;
}

export const ErrorState = ({ message = "Something went wrong", onRetry }: ErrorStateProps) => {
    return (
        <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <div className="text-red-500 text-lg font-semibold">{message}</div>
            {onRetry && (
                <button
                    onClick={onRetry}
                    className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 transition-colors"
                >
                    Try Again
                </button>
            )}
        </div>
    );
};

