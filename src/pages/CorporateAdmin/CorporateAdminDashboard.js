import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { FolderKanban, Users, Settings, TrendingUp, TrendingDown, Clock, BarChart } from 'lucide-react';
import { apiRequest } from 'services/apiService.js';
import { toast } from 'react-toastify';
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
  BarChart as RechartsBarChart, Bar, XAxis, YAxis, CartesianGrid, Legend,
} from 'recharts';

const COLORS = ['#0088FE', '#00C49F', '#C0C0C0', '#ff2bbcd0', '#8884d8', '#82ca9d', '#ffc658'];

const createColorMap = (allData) => {
  const colorMap = {};
  const allItems = new Set();
  const datasets = Array.isArray(allData) ? allData : [];
  
  datasets.forEach(dataset => {
    if (dataset) {
      dataset.forEach(item => {
        allItems.add(item.name);
      });
    }
  });
  
  Array.from(allItems).sort().forEach((name, index) => {
    colorMap[name] = COLORS[index % COLORS.length];
  });
  
  return colorMap;
};

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
    <div className="card flex items-center p-3 space-x-4">
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

const CustomUnifiedLegend = ({ allData, colorMapping = null }) => {
    const colorMap = colorMapping || createColorMap(allData);
    const uniqueValues = new Set();
    const uniquePayload = allData
      .flatMap(data => data || [])
      .filter(entry => {
        if (entry && !uniqueValues.has(entry.name)) {
          uniqueValues.add(entry.name);
          return true;
        }
        return false;
      })
      .map(entry => ({
        value: entry.name,
        color: colorMap[entry.name]
      }));

    return (
      <ul className="flex flex-col mt-4 max-h-[180px] overflow-y-auto items-start h-24">
        {uniquePayload.map((entry, index) => (
          <li key={`item-${index}`} className="flex items-center text-sm mb-1">
            <span className="w-2 h-2 inline-block rounded-full mr-2" style={{ backgroundColor: entry.color }}></span>
            {entry.value}
          </li>
        ))}
      </ul>
    );
};

const CustomMultiPieTooltip = ({ active, payload, allData, chartType }) => {
    if (active && payload && payload.length) {
      const hoveredSlice = payload[0];
      const sliceName = hoveredSlice?.name;
      if (!sliceName) return null;
      const { customerData, globalData } = allData;
      const customerSlice = customerData.find(d => d.name === sliceName);
      const globalSlice = globalData.find(d => d.name === sliceName);
      const customerTotal = customerData.reduce((sum, entry) => sum + entry.value, 0);
      const globalTotal = globalData.reduce((sum, entry) => sum + entry.value, 0);
      const customerPercentage = customerSlice && customerTotal > 0 ? ((customerSlice.value / customerTotal) * 100).toFixed(1) : null;
      const globalPercentage = globalSlice && globalTotal > 0 ? ((globalSlice.value / globalTotal) * 100).toFixed(1) : null;
      const chartTitle = chartType === 'lgTypeMix' ? 'LG Type Mix' : 'Bank Market Share';
      return (
        <div className="bg-white p-2 border border-gray-300 rounded shadow-md text-sm">
          <p className="font-semibold">{chartTitle}</p>
          <p className="font-medium text-gray-800">{`${sliceName}`}</p>
          {customerPercentage !== null && <p className="text-gray-600">Your Figures: {customerPercentage}%</p>}
          {globalPercentage !== null && <p className="text-gray-600">Global: {globalPercentage}%</p>}
        </div>
      );
    }
    return null;
};

function CorporateAdminDashboard({ isGracePeriod }) {
  const [kpiData, setKpiData] = useState({
    avgDeliveryDays: 'N/A', avgDeliveryDaysOverall: 'N/A',
    avgDaysToExpiryAction: 'N/A', avgDaysToExpiryActionOverall: 'N/A',
    lgVolume: 'N/A',
  });

  const [chartData, setChartData] = useState({
    lgTypeMix: { customer_lg_type_mix: [], global_lg_type_mix: [] },
    bankProcessingTimes: [],
    bankMarketShare: {
      customer_market_share: [],
      global_market_share: [],
      colorMapping: {}
    },
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState('');

  const processMarketShareData = (globalData, customerData, limit = 7) => {
    const sortedGlobal = [...globalData].sort((a, b) => b.value - a.value);
    const topBanks = sortedGlobal.slice(0, limit).map(b => b.name);
    const palette = ['#2563EB', '#7C3AED', '#DB2777', '#EA580C', '#0891B2', '#16A34A', '#4F46E5'];
    const colorMapping = {};
    topBanks.forEach((name, i) => { colorMapping[name] = palette[i]; });
    colorMapping['Others'] = '#94A3B8';
    const group = (data) => {
      const grouped = data.reduce((acc, item) => {
        if (topBanks.includes(item.name)) acc.push({ ...item });
        else {
          const otherIdx = acc.findIndex(i => i.name === 'Others');
          if (otherIdx > -1) acc[otherIdx].value += item.value;
          else acc.push({ name: 'Others', value: item.value });
        }
        return acc;
      }, []);
      return grouped.sort((a, b) => b.value - a.value);
    };
    return {
      groupedGlobal: group(globalData),
      groupedCustomer: group(customerData),
      colorMapping
    };
  };

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [lgTypeMixResponse, avgDeliveryDaysResponse, avgDaysToExpiryActionResponse, bankProcessingTimesResponse, bankMarketShareResponse] = await Promise.all([
        apiRequest('/reports/customer-lg-type-mix', 'GET'),
        apiRequest('/reports/avg-delivery-days', 'GET'), 
        apiRequest('/reports/avg-days-to-action', 'GET'),
        apiRequest('/reports/avg-bank-processing-time', 'GET'),
        apiRequest('/reports/bank-market-share', 'GET'),
      ]);

      const marketShareResult = processMarketShareData(
        bankMarketShareResponse?.data?.global_market_share || [],
        bankMarketShareResponse?.data?.customer_market_share || [],
        7
      );

      setKpiData({
        avgDeliveryDays: typeof avgDeliveryDaysResponse?.customer_avg === 'number' ? avgDeliveryDaysResponse.customer_avg.toFixed(0) : 'N/A',
        avgDeliveryDaysOverall: typeof avgDeliveryDaysResponse?.overall_avg === 'number' ? avgDeliveryDaysResponse.overall_avg.toFixed(0) : 'N/A',
        avgDaysToExpiryAction: typeof avgDaysToExpiryActionResponse?.customer_avg === 'number' ? avgDaysToExpiryActionResponse.customer_avg.toFixed(0) : 'N/A',
        avgDaysToExpiryActionOverall: typeof avgDaysToExpiryActionResponse?.overall_avg === 'number' ? avgDaysToExpiryActionResponse.overall_avg.toFixed(0) : 'N/A',
        lgVolume: lgTypeMixResponse?.data?.customer_lg_type_mix.reduce((sum, item) => sum + item.value, 0) ?? 'N/A',
      });

      setChartData({
        lgTypeMix: lgTypeMixResponse?.data || { customer_lg_type_mix: [], global_lg_type_mix: [] },
        bankProcessingTimes: bankProcessingTimesResponse?.data || [],
        bankMarketShare: {
          customer_market_share: marketShareResult.groupedCustomer,
          global_market_share: marketShareResult.groupedGlobal,
          colorMapping: marketShareResult.colorMapping
        },
      });
      
      setTimeout(() => setIsReady(true), 150);
    } catch (err) {
      setError(`Failed to load dashboard data. ${err.message || 'An unexpected error occurred.'}`);
      toast.error('Failed to load dashboard data.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const quickActions = [
    { id: 1, title: 'Manage LG Categories', description: 'Create and organize customer-specific LG categories', icon: FolderKanban, link: '/corporate-admin/lg-categories', isWriteAction: true },
    { id: 2, title: 'Manage Users', description: 'Add, edit, and deactivate users for your organization', icon: Users, link: '/corporate-admin/users', isWriteAction: true },
    { id: 3, title: 'Module Configurations', description: 'Adjust settings for subscribed modules (e.g., LG Custody)', icon: Settings, link: '/corporate-admin/module-configs', isWriteAction: true },
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
    return isActionDisabled ? <GracePeriodTooltip key={action.id} isGracePeriod={true}>{actionCard}</GracePeriodTooltip> : <Link key={action.id} to={action.link}>{actionCard}</Link>;
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

  const lgTypeColorMap = createColorMap([chartData.lgTypeMix.customer_lg_type_mix, chartData.lgTypeMix.global_lg_type_mix]);

  return (
    <div>
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-md relative mb-6" role="alert">
          <span className="block sm:inline">{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
        
		{/* Column 1: Average Delivery Days & LG Type Mix */}
		<div className="flex flex-col space-y-6">
		  <KPICard 
			title="Average Delivery Days" 
			value={`${kpiData.avgDeliveryDays} days`} 
			subValue={`Overall: ${kpiData.avgDeliveryDaysOverall} days`} 
			icon={Clock}
			trend={kpiData.avgDeliveryDays !== 'N/A' && kpiData.avgDeliveryDaysOverall !== 'N/A' ? (parseFloat(kpiData.avgDeliveryDays) <= parseFloat(kpiData.avgDeliveryDaysOverall) ? 'up' : 'down') : undefined}
		  />

		  {/* Main Card Wrapper: Holds everything together visually */}
		  <div className="bg-white rounded-xl shadow-sm border border-gray-100 h-[420px] flex flex-col overflow-hidden">
			
			{/* Part 1: Header & Chart Area (Flexible space) */}
			<div className="p-6 pb-0 flex-1 min-h-0 flex flex-col">
			  <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-6">
				  LG Type Mix
				  <span className="text-[10px] font-normal text-gray-400 ml-2 normal-case tracking-normal">
					  (Outer: Global | Inner: Your Figures)
				  </span>
			  </h3>
			  
			  <div className="flex-1 min-h-0">
				{isReady && chartData.lgTypeMix.global_lg_type_mix.length > 0 ? (
				  <ResponsiveContainer width="100%" height="100%">
					<PieChart margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
					  <Pie data={chartData.lgTypeMix.global_lg_type_mix} cx="35%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={2} dataKey="value" nameKey="name" animationDuration={1000}>
						{chartData.lgTypeMix.global_lg_type_mix.map((entry, i) => <Cell key={i} fill={lgTypeColorMap[entry.name]} />)}
					  </Pie>
					  <Pie data={chartData.lgTypeMix.customer_lg_type_mix} cx="80%" cy="75%" innerRadius={25} outerRadius={40} paddingAngle={2} dataKey="value" nameKey="name" animationDuration={1000}>
						{chartData.lgTypeMix.customer_lg_type_mix.map((entry, i) => <Cell key={i} fill={lgTypeColorMap[entry.name]} />)}
					  </Pie>
					  <Tooltip content={<CustomMultiPieTooltip chartType="lgTypeMix" allData={{ customerData: chartData.lgTypeMix.customer_lg_type_mix, globalData: chartData.lgTypeMix.global_lg_type_mix }} />} />
					  {/* Internal Legend removed to separate it below */}
					</PieChart>
				  </ResponsiveContainer>
				) : (
				  <div className="h-full flex items-center justify-center text-gray-400 italic text-sm">No data available.</div>
				)}
			  </div>
			</div>

			{/* Part 2: Separate Legend Area (Fixed at the bottom) */}
			<div className="p-6 pt-2">
			   <CustomUnifiedLegend 
				  allData={[chartData.lgTypeMix.customer_lg_type_mix, chartData.lgTypeMix.global_lg_type_mix]} 
			   />
			</div>

		  </div>
		</div>

		{/* Column 2: Avg Days to Action & Market Share */}
		<div className="flex flex-col space-y-6">
		  <KPICard 
			title="Avg. Days to Action" 
			value={`${kpiData.avgDaysToExpiryAction} days`} 
			subValue={`Overall: ${kpiData.avgDaysToExpiryActionOverall} days`} 
			icon={BarChart}
			trend={kpiData.avgDaysToExpiryAction !== 'N/A' && kpiData.avgDaysToExpiryActionOverall !== 'N/A' ? (parseFloat(kpiData.avgDaysToExpiryAction) <= parseFloat(kpiData.avgDaysToExpiryActionOverall) ? 'up' : 'down') : undefined}
		  />

		  {/* Container for the Chart and Legend - looks like one card to the user */}
		  <div className="bg-white rounded-xl shadow-sm border border-gray-100 h-[420px] flex flex-col overflow-hidden">
			
			{/* Part 1: Header & Chart Area */}
			<div className="p-6 pb-0 flex-1 min-h-0 flex flex-col">
			  <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-6">
				  Bank Market Share
				  <span className="text-[10px] font-normal text-gray-400 ml-2 normal-case tracking-normal">
					  (Outer: Global | Inner: Your Figures)
				  </span>
			  </h3>
			  <div className="flex-1 min-h-0">
				{isReady && chartData.bankMarketShare.global_market_share.length > 0 ? (
				  <ResponsiveContainer width="100%" height="100%">
					  <PieChart margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
						<Pie data={chartData.bankMarketShare.global_market_share} cx="35%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={2} dataKey="value" nameKey="name" animationDuration={1000}>
						  {chartData.bankMarketShare.global_market_share.map((entry, i) => <Cell key={i} fill={chartData.bankMarketShare.colorMapping[entry.name]} />)}
						</Pie>
						<Pie data={chartData.bankMarketShare.customer_market_share} cx="80%" cy="75%" innerRadius={25} outerRadius={40} paddingAngle={2} dataKey="value" nameKey="name" animationDuration={1000}>
						  {chartData.bankMarketShare.customer_market_share.map((entry, i) => <Cell key={i} fill={chartData.bankMarketShare.colorMapping[entry.name]} />)}
						</Pie>
						<Tooltip content={<CustomMultiPieTooltip chartType="bankMarketShare" allData={{ customerData: chartData.bankMarketShare.customer_market_share, globalData: chartData.bankMarketShare.global_market_share }} />} />
						{/* Legend is removed from here */}
					  </PieChart>
				  </ResponsiveContainer>
				) : <div className="h-full flex items-center justify-center text-gray-400 italic text-sm">No data available.</div>}
			  </div>
			</div>

			{/* Part 2: Separate Legend Area */}
			<div className="p-6 pt-2">
			   <CustomUnifiedLegend 
				  allData={[chartData.bankMarketShare.customer_market_share, chartData.bankMarketShare.global_market_share]} 
				  colorMapping={chartData.bankMarketShare.colorMapping} 
			   />
			</div>

		  </div>
		</div>
        {/* Column 3: Total Volume & Processing Times */}
        <div className="flex flex-col space-y-6">
          <KPICard title="Total LG Volume" value={kpiData.lgVolume} subLabel="LG Records" icon={FolderKanban} />
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 h-[420px] flex flex-col">
            <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-6">
                Average Processing Times by Bank
            </h3>
            <div className="flex-1 min-h-0">
              {isReady && chartData.bankProcessingTimes.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <RechartsBarChart data={chartData.bankProcessingTimes} margin={{ top: 10, right: 10, bottom: 20, left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#9CA3AF', fontSize: 12 }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#9CA3AF', fontSize: 12 }} />
                  <Tooltip cursor={{ fill: '#F9FAFB' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} formatter={(value) => [Number(value).toFixed(2), "Days"]}/>
                  <Bar dataKey="value" fill="#2563EB" radius={[4, 4, 0, 0]} barSize={40} animationDuration={1500} />
                </RechartsBarChart>
              </ResponsiveContainer>
              ) : <div className="h-full flex items-center justify-center text-gray-400 italic text-sm">No data available.</div>}
            </div>
          </div>
        </div>
      </div>
      
      <div className="mt-4 card">
        <h3 className="text-lg font-semibold text-gray-800 mb-2">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {quickActions.map(action => renderQuickAction(action))}
        </div>
      </div>
    </div>
  );
}

export default CorporateAdminDashboard;