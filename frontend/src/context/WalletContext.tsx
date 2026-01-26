/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, ReactNode } from 'react';

interface WalletContextType {
    onHistoryClick: () => void;
    onTopUpClick: () => void;

    onMyTicketsClick?: () => void;
    onMyAccountClick?: () => void;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export const WalletProvider = ({
    children,
    onHistoryClick,
    onTopUpClick,

    onMyTicketsClick,
    onMyAccountClick,
}: {
    children: ReactNode;
    onHistoryClick: () => void;
    onTopUpClick: () => void;

    onMyTicketsClick?: () => void;
    onMyAccountClick?: () => void;
}) => {
    return (
        <WalletContext.Provider value={{ onHistoryClick, onTopUpClick, onMyTicketsClick, onMyAccountClick }}>
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

