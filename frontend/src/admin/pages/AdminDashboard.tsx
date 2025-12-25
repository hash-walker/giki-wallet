import { Card } from '../modules/shared/Card';
import { Users, Bus, Ticket, DollarSign } from 'lucide-react';

export const AdminDashboard = () => {
    // Mock data - replace with API calls
    const stats = {
        totalUsers: 150,
        activeRoutes: 8,
        todayBookings: 45,
        totalRevenue: 12500,
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
                <p className="text-gray-600 mt-1">Overview of your transport system</p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-600">Total Users</p>
                            <p className="text-2xl font-bold text-gray-900 mt-1">{stats.totalUsers}</p>
                        </div>
                        <div className="p-3 bg-blue-100 rounded-lg">
                            <Users className="w-6 h-6 text-blue-600" />
                        </div>
                    </div>
                </Card>

                <Card>
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-600">Active Routes</p>
                            <p className="text-2xl font-bold text-gray-900 mt-1">{stats.activeRoutes}</p>
                        </div>
                        <div className="p-3 bg-green-100 rounded-lg">
                            <Bus className="w-6 h-6 text-green-600" />
                        </div>
                    </div>
                </Card>

                <Card>
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-600">Today's Bookings</p>
                            <p className="text-2xl font-bold text-gray-900 mt-1">{stats.todayBookings}</p>
                        </div>
                        <div className="p-3 bg-purple-100 rounded-lg">
                            <Ticket className="w-6 h-6 text-purple-600" />
                        </div>
                    </div>
                </Card>

                <Card>
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-600">Total Revenue</p>
                            <p className="text-2xl font-bold text-gray-900 mt-1">Rs {stats.totalRevenue.toLocaleString()}</p>
                        </div>
                        <div className="p-3 bg-yellow-100 rounded-lg">
                            <DollarSign className="w-6 h-6 text-yellow-600" />
                        </div>
                    </div>
                </Card>
            </div>

            {/* Recent Activity */}
            <Card>
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h2>
                <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                            <p className="text-sm font-medium text-gray-900">New booking received</p>
                            <p className="text-xs text-gray-500">2 minutes ago</p>
                        </div>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                            <p className="text-sm font-medium text-gray-900">Route updated</p>
                            <p className="text-xs text-gray-500">1 hour ago</p>
                        </div>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                            <p className="text-sm font-medium text-gray-900">New user registered</p>
                            <p className="text-xs text-gray-500">3 hours ago</p>
                        </div>
                    </div>
                </div>
            </Card>
        </div>
    );
};

