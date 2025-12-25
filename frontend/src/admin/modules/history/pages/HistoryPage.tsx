import { useState } from 'react';
import { PageHeader, WeekSelector, formatWeekRange } from '../../../shared';
import { HistoryTabs, HistoryTab } from '../components/HistoryTabs';
import { RoutesHistory } from '../components/RoutesHistory';
import { TicketsHistory } from '../components/TicketsHistory';
import { TransactionsHistory } from '../components/TransactionsHistory';

export const HistoryPage = () => {
    const [activeTab, setActiveTab] = useState<HistoryTab>('routes');
    const [selectedWeek, setSelectedWeek] = useState<Date>(new Date());
    const weekRange = formatWeekRange(selectedWeek);

    const renderTabContent = () => {
        switch (activeTab) {
            case 'routes':
                return <RoutesHistory selectedWeek={selectedWeek} />;
            case 'tickets':
                return <TicketsHistory selectedWeek={selectedWeek} />;
            case 'transactions':
                return <TransactionsHistory selectedWeek={selectedWeek} />;
            default:
                return <RoutesHistory selectedWeek={selectedWeek} />;
        }
    };

    return (
        <div className="space-y-6">
            <PageHeader
                title="History"
                description="View historical data for routes, tickets, and transactions"
            />

            {/* Week Selector */}
            <WeekSelector
                currentWeek={selectedWeek}
                onWeekChange={setSelectedWeek}
                weekRange={weekRange}
            />

            {/* Tabs */}
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                <HistoryTabs activeTab={activeTab} onTabChange={setActiveTab} />
                
                {/* Tab Content */}
                <div className="p-4 sm:p-6">
                    {renderTabContent()}
                </div>
            </div>
        </div>
    );
};

