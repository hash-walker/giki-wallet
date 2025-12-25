import { createContext, useContext, ReactNode } from 'react';

interface WalletContextType {
    onHistoryClick: () => void;
    onTopUpClick: () => void;
    onTransferClick: () => void;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export const WalletProvider = ({ 
    children, 
    onHistoryClick, 
    onTopUpClick, 
    onTransferClick 
}: { 
    children: ReactNode;
    onHistoryClick: () => void;
    onTopUpClick: () => void;
    onTransferClick: () => void;
}) => {
    return (
        <WalletContext.Provider value={{ onHistoryClick, onTopUpClick, onTransferClick }}>
            {children}
        </WalletContext.Provider>
    );
};

export const useWallet = () => {
    const context = useContext(WalletContext);
    if (context === undefined) {
        throw new Error('useWallet must be used within a WalletProvider');
    }
    return context;
};

