import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { FolderKanban, Users, Settings, TrendingUp, TrendingDown, Clock, BarChart, Banknote } from 'lucide-react';
import { apiRequest } from 'services/apiService.js';
import { toast } from 'react-toastify';
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
  BarChart as RechartsBarChart, Bar, XAxis, YAxis, CartesianGrid, Legend,
} from 'recharts';

const COLORS = ['#0088FE', '#00C49F', '#C0C0C0', '#ff2bbcd0', '#8884d8', '#82ca9d', '#ffc658'];

const GracePeriodTooltip = ({ children, isGracePeriod }) => {
    if (isGracePeriod) {
        return (
            <div className="relative group inline-block">
                {children}
                <div className="opacity-0 w-max bg-gray-800 text-white text-xs rounded-lg py-2 px-3 absolute z-10 bottom-full left-1/2 -translate-x-1/2 pointer-events-none group-hover:opacity-100 transition-opacity duration-200">
                    This action is disabled during your subscription's grace period.
                    <svg className="absolute text-gray-800 h-2 w-full left-0 top-full" x="0px" y="0px" viewBox="0 0 255 255">
                        <polygon className="fill-current" points="0,0 127.5,127.5 255,0"/>
                    </svg>
                </div>
            </div>
        );
    }
    return children;
};

const KPICard = ({ title, value, subValue, subLabel, icon, trend }) => {
  const Icon = icon;
  const TrendIcon = trend === 'up' ? TrendingUp : TrendingDown;
  const trendColor = trend === 'up' ? 'text-green-600' : 'text-red-600';
  const iconBg = `p-3 rounded-full ${title.includes('Days') ? 'bg-orange-100' : title.includes('LG Mix') ? 'bg-purple-100' : 'bg-blue-100'}`;

  return (
    <div className="card flex items-center p-5 space-x-4">
      <div className={`${iconBg} text-blue-600`}>
        <Icon className="h-6 w-6" />
      </div>
      <div>
        <p className="text-sm font-medium text-gray-500">{title}</p>
        <p className="text-2xl font-semibold text-gray-900">{value}</p>
        <p className="text-xs text-gray-500 flex items-center mt-1">
          {subValue && <span className="font-semibold mr-1">{subValue}</span>}
          {subLabel}
          {trend && <TrendIcon className={`h-4 w-4 ml-1 ${trendColor}`} />}
        </p>
      </div>
    </div>
  );
};

// Updated CustomPieLegend with increased height
const CustomPieLegend = ({ payload }) => {
  return (
    <ul className="flex flex-col mt-4 max-h-[180px] overflow-y-auto items-start h-24">
      {payload.map((entry, index) => (
        <li key={`item-${index}`} className="flex items-center text-sm mb-1">
          <span className="w-2 h-2 inline-block rounded-full mr-2" style={{ backgroundColor: entry.color }}></span>
          {entry.value}
        </li>
      ))}
    </ul>
  );
};

// Custom tooltip component to show percentages only
const CustomTooltip = ({ active, payload, totalData }) => {
  if (active && payload && payload.length && totalData) {
    const totalValue = totalData.reduce((sum, entry) => sum + entry.value, 0);
    if (totalValue === 0) return null;
    
    const percentage = ((payload[0].value / totalValue) * 100).toFixed(1);

    return (
      <div className="bg-white p-2 border border-gray-300 rounded shadow-md text-sm">
        <p className="font-semibold">{`${payload[0].name}`}</p>
        <p className="text-gray-600">{`Percentage: ${percentage}%`}</p>
      </div>
    );
  }
  return null;
};

function CorporateAdminDashboard({ isGracePeriod }) {
  const [kpiData, setKpiData] = useState({
    avgDeliveryDays: 'N/A',
    avgDeliveryDaysOverall: 'N/A',
    avgDaysToExpiryAction: 'N/A',
    avgDaysToExpiryActionOverall: 'N/A',
    lgVolume: 'N/A',
  });
  const [chartData, setChartData] = useState({
    lgTypeMix: [],
    bankProcessingTimes: [],
    bankMarketShare: [],
    bankMarketShareTrend: [],
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      
      const [
        lgTypeMixResponse,
        avgDeliveryDaysResponse, 
        avgDaysToExpiryActionResponse,
        bankProcessingTimesResponse,
        bankMarketShareResponse 
      ] = await Promise.all([
        apiRequest('/reports/customer-lg-type-mix', 'GET'),
        apiRequest('/reports/avg-delivery-days', 'GET'), 
        apiRequest('/reports/avg-days-to-action', 'GET'),
        apiRequest('/reports/avg-bank-processing-time', 'GET'),
        apiRequest('/reports/bank-market-share', 'GET'),
      ]);

      setKpiData({
        avgDeliveryDays: avgDeliveryDaysResponse?.customer_avg || 'N/A', 
        avgDeliveryDaysOverall: avgDeliveryDaysResponse?.overall_avg || 'N/A', 
        avgDaysToExpiryAction: avgDaysToExpiryActionResponse?.customer_avg || 'N/A', 
        avgDaysToExpiryActionOverall: avgDaysToExpiryActionResponse?.overall_avg || 'N/A', 
        lgVolume: lgTypeMixResponse?.data.reduce((sum, item) => sum + item.value, 0) || 'N/A',
      });

      setChartData({
        lgTypeMix: lgTypeMixResponse?.data || [],
        bankProcessingTimes: bankProcessingTimesResponse?.data || [],
        bankMarketShare: bankMarketShareResponse?.data || [],
      });

    } catch (err) {
      console.error('Failed to fetch dashboard data:', err);
      setError(`Failed to load dashboard data. ${err.message || 'An unexpected error occurred.'}`);
      toast.error('Failed to load dashboard data.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const quickActions = [
    {
      id: 1,
      title: 'Manage LG Categories',
      description: 'Create and organize customer-specific LG categories',
      icon: FolderKanban,
      link: '/corporate-admin/lg-categories',
      isWriteAction: true,
    },
    {
      id: 2,
      title: 'Manage Users',
      description: 'Add, edit, and deactivate users for your organization',
      icon: Users,
      link: '/corporate-admin/users',
      isWriteAction: true,
    },
    {
      id: 3,
      title: 'Module Configurations',
      description: 'Adjust settings for subscribed modules (e.g., LG Custody)',
      icon: Settings,
      link: '/corporate-admin/module-configs',
      isWriteAction: true,
    },
  ];

  const renderQuickAction = (action) => {
    const isActionDisabled = action.isWriteAction && isGracePeriod;
    const Icon = action.icon;
    
    const actionCard = (
        <div className={`flex items-center p-3 rounded-lg transition-colors duration-200 ${isActionDisabled ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-gray-50 hover:bg-gray-100'}`}>
            <Icon className={`h-5 w-5 mr-3 ${isActionDisabled ? 'text-gray-400' : 'text-blue-600'}`} />
            <div>
                <p className={`font-medium ${isActionDisabled ? 'text-gray-400' : 'text-gray-800'}`}>{action.title}</p>
                <p className={`text-sm ${isActionDisabled ? 'text-gray-400' : 'text-gray-500'}`}>{action.description}</p>
            </div>
        </div>
    );

    if (isActionDisabled) {
      return (
        <GracePeriodTooltip key={action.id} isGracePeriod={true}>
          {actionCard}
        </GracePeriodTooltip>
      );
    } else {
      return (
        <Link key={action.id} to={action.link}>
          {actionCard}
        </Link>
      );
    }
  };

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <svg className="animate-spin h-8 w-8 text-blue-600 mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <p className="text-gray-600 mt-2">Loading Corporate Admin Dashboard...</p>
      </div>
    );
  }

  return (
    <div>
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-md relative" role="alert">
          <span className="block sm:inline">{error}</span>
        </div>
      )}

      {/* Main content grid for the three columns with KPIs and Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* First Column */}
        <div className="flex flex-col space-y-6">
          <KPICard
            title="Average Delivery Days"
            value={`${kpiData.avgDeliveryDays !== 'N/A' ? kpiData.avgDeliveryDays.toFixed(0) : 'N/A'} days`}
            subValue={`Overall: ${kpiData.avgDeliveryDaysOverall !== 'N/A' ? kpiData.avgDeliveryDaysOverall.toFixed(0) : 'N/A'} days`}
            subLabel=""
            icon={Clock}
            trend={kpiData.avgDeliveryDays < kpiData.avgDeliveryDaysOverall ? 'down' : 'up'}
          />
          <div className="card h-[320px] flex flex-col">
            <h3 className="text-lg font-semibold text-gray-800 mb-1 text-center">LG Type Mix</h3>
            <div className="flex-1 flex flex-col items-center justify-center">
              {chartData.lgTypeMix.length > 0 ? (
                <div className="flex w-full h-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                      <Pie
                        data={chartData.lgTypeMix}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {chartData.lgTypeMix.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend content={<CustomPieLegend />} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p className="text-gray-500 text-center italic">No LG Type Mix data available.</p>
              )}
            </div>
          </div>
        </div>

        {/* Second Column (now contains Bank Market Share) */}
        <div className="flex flex-col space-y-6">
          <KPICard
            title="Avg. Days to Action"
            value={`${kpiData.avgDaysToExpiryAction !== 'N/A' ? kpiData.avgDaysToExpiryAction.toFixed(0) : 'N/A'} days`}
            subValue={`Overall: ${kpiData.avgDaysToExpiryActionOverall !== 'N/A' ? kpiData.avgDaysToExpiryActionOverall.toFixed(0) : 'N/A'} days`}
            subLabel=""
            icon={BarChart}
            trend={kpiData.avgDaysToExpiryAction > kpiData.avgDaysToExpiryActionOverall ? 'down' : 'up'}
          />
          <div className="card h-[320px] flex flex-col">
            <h3 className="text-lg font-semibold text-gray-800 text-center mb-1">Bank Market Share (Global)</h3>
            <div className="flex-1 flex items-center justify-center">
              {chartData.bankMarketShare.length > 0 ? (
                <div className="flex w-full h-full">
                  <ResponsiveContainer width="100%" height="100%">
                      <PieChart margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                        <Pie
                          data={chartData.bankMarketShare}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {chartData.bankMarketShare.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip content={<CustomTooltip totalData={chartData.bankMarketShare} />} />
                        <Legend content={<CustomPieLegend />} />
                      </PieChart>
                    </ResponsiveContainer>
                </div>
              ) : (
                <p className="text-gray-500 text-center italic">No Bank Market Share data available.</p>
              )}
            </div>
          </div>
        </div>

        {/* Third Column (now contains Average Processing Times by Bank) */}
        <div className="flex flex-col space-y-6">
          <KPICard
            title="Total LG Volume"
            value={kpiData.lgVolume}
            subValue=""
            subLabel="LG Records"
            icon={FolderKanban}
            trend=""
          />
          <div className="card h-[320px] flex flex-col">
            <h3 className="text-lg font-semibold text-gray-800 text-center mb-4">Average Processing Times by Bank</h3>
            <div className="flex-1">
              {chartData.bankProcessingTimes.length > 0 ? (
                <div className="flex flex-col items-center h-full">
                  <ResponsiveContainer width="85%" height="100%">
                    <RechartsBarChart data={chartData.bankProcessingTimes} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="value" fill="#8884d8" />
                    </RechartsBarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p className="text-gray-500 text-center italic">No data available for Bank Processing Times.</p>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Quick Actions Row */}
      <div className="mt-4">
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-800 mb-2">Quick Actions</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {quickActions.map(action => renderQuickAction(action))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default CorporateAdminDashboard;