export const LoadingState = () => {
    return (
        <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            <p className="text-gray-500">Loading...</p>
        </div>
    );
};

