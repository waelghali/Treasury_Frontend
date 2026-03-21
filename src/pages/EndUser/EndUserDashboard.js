// In EndUserDashboard.js, around line 55

import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { PlusCircle, FileText, BarChart2, AlertCircle, Save, Loader2, Clock, Printer } from 'lucide-react';
import { apiRequest } from 'services/apiService.js';

// NEW: A reusable component to provide a tooltip for disabled elements during the grace period.
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

function EndUserDashboard({ isGracePeriod }) { // NEW: Accept isGracePeriod prop
  const navigate = useNavigate();

  const [dashboardInfo, setDashboardInfo] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchDashboardInfo = async () => {
      setIsLoading(true);
      setError('');
      try {
        const info = await apiRequest('/end-user/users/me_dashboard_info', 'GET');
        setDashboardInfo(info);
      } catch (err) {
        console.error('Failed to fetch dashboard info:', err);
        setError(`Failed to load dashboard data: ${err.message || 'An unexpected error occurred.'}`);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardInfo();
  }, []);

  // NEW: Updated quickActions to conditionally disable the 'Record New LG' action
  const quickActions = [
    {
      title: "Record New LG",
      description: "Initiate the process to record a new Letter of Guarantee.",
      icon: <PlusCircle className="h-6 w-6 text-blue-500" />,
      link: "/end-user/lg-records/new",
      isWriteAction: true,
    },
    {
      title: "View My LGs",
      description: "Access and manage your active Letters of Guarantee.",
      icon: <FileText className="h-6 w-6 text-green-500" />,
      link: "/end-user/lg-records",
      isWriteAction: false,
    },
    {
      title: "View Reports",
      description: "Access various reports and analytics related to LGs.",
      icon: <BarChart2 className="h-6 w-6 text-purple-500" />,
      link: "/end-user/reports",
      isWriteAction: false,
    },
  ];

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <Loader2 className="animate-spin h-8 w-8 text-blue-600 mx-auto" />
        <p className="text-gray-600 mt-2">Loading dashboard data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-md relative mb-4 flex items-center" role="alert">
        <AlertCircle className="h-5 w-5 mr-2" />
        <span className="block sm:inline">{error}</span>
      </div>
    );
  }

  return (
    <div>
      {/* Page Header */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Welcome to Your Dashboard</h2>
        <p className="text-sm text-gray-500 mt-1">Your LG portfolio at a glance — key metrics and quick actions.</p>
      </div>

      {/* Overview Stats */}
      <div className="mb-8">
        <p className="text-xs font-bold text-blue-600 uppercase tracking-widest mb-4">Portfolio Overview</p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          <Link
            to="/end-user/lg-records"
            className="bg-white rounded-xl border border-gray-100 p-5 flex items-center hover:shadow-lg hover:border-blue-200 transition-all duration-300 cursor-pointer group"
          >
            <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 mr-4" style={{ backgroundColor: 'rgba(37,99,235,0.08)' }}>
              <FileText className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Active LGs</p>
              <p className="text-2xl font-bold text-gray-900 mt-0.5">
                {dashboardInfo?.active_lgs_count !== undefined ? dashboardInfo.active_lgs_count : 'N/A'}
              </p>
            </div>
          </Link>

          <Link
            to="/end-user/action-center"
            className="bg-white rounded-xl border border-gray-100 p-5 flex items-center hover:shadow-lg hover:border-orange-200 transition-all duration-300 cursor-pointer group"
          >
            <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 mr-4" style={{ backgroundColor: 'rgba(234,88,12,0.08)' }}>
              <Clock className="h-5 w-5 text-orange-600" />
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">LGs for Renewal</p>
              <p className="text-2xl font-bold text-gray-900 mt-0.5">
                {dashboardInfo?.lgs_for_renewal_count !== undefined ? dashboardInfo.lgs_for_renewal_count : 'N/A'}
              </p>
            </div>
          </Link>

          <Link
            to="/end-user/action-center"
            className="bg-white rounded-xl border border-gray-100 p-5 flex items-center hover:shadow-lg hover:border-purple-200 transition-all duration-300 cursor-pointer group"
          >
            <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 mr-4" style={{ backgroundColor: 'rgba(147,51,234,0.08)' }}>
              <Printer className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Pending Print Actions</p>
              <p className="text-2xl font-bold text-gray-900 mt-0.5">
                {dashboardInfo?.pending_prints_count !== undefined ? dashboardInfo.pending_prints_count : 'N/A'}
              </p>
            </div>
          </Link>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mb-8">
        <p className="text-xs font-bold text-blue-600 uppercase tracking-widest mb-4">Quick Actions</p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {quickActions.map((action, index) => {
            const isActionDisabled = action.isWriteAction && isGracePeriod;
            const linkClasses = `flex items-start p-5 rounded-xl border transition-all duration-300 ${
              isActionDisabled
                ? 'bg-gray-50 border-gray-200 text-gray-400 cursor-not-allowed'
                : 'bg-white border-gray-100 hover:border-blue-200 hover:shadow-md'
            }`;

            const content = (
              <>
                <div className="mr-4 flex-shrink-0 mt-0.5">
                  {action.icon}
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-gray-900 mb-1">{action.title}</h4>
                  <p className="text-sm text-gray-500 leading-relaxed">{action.description}</p>
                </div>
              </>
            );

            if (isActionDisabled) {
              return (
                <GracePeriodTooltip key={index} isGracePeriod={true}>
                  <div className={linkClasses}>{content}</div>
                </GracePeriodTooltip>
              );
            } else {
              return (
                <Link key={index} to={action.link} className={linkClasses}>
                  {content}
                </Link>
              );
            }
          })}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-xl border border-gray-100 p-6">
        <p className="text-xs font-bold text-blue-600 uppercase tracking-widest mb-3">Recent Activity</p>
        <p className="text-sm text-gray-500">Coming soon: A list of your most recent LG records and actions.</p>
      </div>
    </div>
  );
}

export default EndUserDashboard;