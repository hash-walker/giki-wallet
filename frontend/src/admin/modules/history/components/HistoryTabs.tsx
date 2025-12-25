import { Button } from '@/shared/components/ui/button';
import { Bus, Ticket, Receipt } from 'lucide-react';
import { cn } from '@/lib/utils';

export type HistoryTab = 'routes' | 'tickets' | 'transactions';

interface HistoryTabsProps {
    activeTab: HistoryTab;
    onTabChange: (tab: HistoryTab) => void;
}

export const HistoryTabs = ({ activeTab, onTabChange }: HistoryTabsProps) => {
    const tabs: Array<{ id: HistoryTab; label: string; icon: React.ReactNode }> = [
        { id: 'routes', label: 'Routes', icon: <Bus className="w-4 h-4" /> },
        { id: 'tickets', label: 'Tickets', icon: <Ticket className="w-4 h-4" /> },
        { id: 'transactions', label: 'Transactions', icon: <Receipt className="w-4 h-4" /> },
    ];

    return (
        <div className="flex gap-2 border-b border-gray-200">
            {tabs.map((tab) => (
                <button
                    key={tab.id}
                    onClick={() => onTabChange(tab.id)}
                    className={cn(
                        "flex items-center gap-2 px-4 py-3 font-medium text-sm transition-colors border-b-2 -mb-px",
                        activeTab === tab.id
                            ? "text-primary border-primary"
                            : "text-gray-600 border-transparent hover:text-gray-900 hover:border-gray-300"
                    )}
                >
                    {tab.icon}
                    <span>{tab.label}</span>
                </button>
            ))}
        </div>
    );
};

