// Helper functions for wallet-related operations

// Email validation
export const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};

// Date formatting (shared with booking module)
export const formatDate = (dateString: string): string => {
    const today = new Date();
    const transactionDate = new Date(dateString);
    const todayStr = today.toISOString().split('T')[0];
    
    if (dateString === todayStr) {
        return 'Today';
    }
    
    return transactionDate.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    });
};

// Group transactions by date
export const groupTransactionsByDate = <T extends { date: string }>(transactions: T[]) => {
    const grouped: Record<string, T[]> = {};
    
    transactions.forEach(transaction => {
        if (!grouped[transaction.date]) {
            grouped[transaction.date] = [];
        }
        grouped[transaction.date].push(transaction);
    });
    
    // Sort dates in descending order (most recent first)
    const sortedDates = Object.keys(grouped).sort((a, b) => 
        new Date(b).getTime() - new Date(a).getTime()
    );
    
    return sortedDates.map(date => ({
        date,
        transactions: grouped[date]
    }));
};

