import { useState } from 'react';
import { PageHeader } from '../../shared';
import { HistoryTabs, HistoryTab } from '../components/HistoryTabs';
import { RoutesHistory } from '../components/RoutesHistory';
import { TicketsHistory } from '../components/TicketsHistory';
import { TransactionsHistory } from '../components/TransactionsHistory';

export const HistoryPage = () => {
    const [activeTab, setActiveTab] = useState<HistoryTab>('routes');

    const renderTabContent = () => {
        switch (activeTab) {
            case 'routes':
                return <RoutesHistory />;
            case 'tickets':
                return <TicketsHistory />;
            case 'transactions':
                return <TransactionsHistory />;
            default:
                return <RoutesHistory />;
        }
    };

    return (
        <div className="space-y-6">
            <PageHeader
                title="History"
                description="View historical data for routes, tickets, and transactions"
            />

            {/* Tabs */}
            <div className="bg-white rounded-lg border border-gray-200">
                <HistoryTabs activeTab={activeTab} onTabChange={setActiveTab} />
                
                {/* Tab Content */}
                <div className="p-6">
                    {renderTabContent()}
                </div>
            </div>
        </div>
    );
};

