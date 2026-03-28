// In EndUserDashboard.js, around line 55

import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { PlusCircle, FileText, BarChart2, AlertCircle, Save, Loader2, Clock, Printer, Wrench, CalendarClock, TrendingUp, Pencil, XCircle, CheckCircle, ArrowRight } from 'lucide-react';
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

const ACTION_TYPE_CONFIG = {
  EXTEND: { label: 'Extend', icon: CalendarClock, color: 'text-blue-600 bg-blue-50' },
  INCREASE_AMOUNT: { label: 'Increase Amount', icon: TrendingUp, color: 'text-emerald-600 bg-emerald-50' },
  CLOSE: { label: 'Close / Return', icon: XCircle, color: 'text-red-600 bg-red-50' },
  AMENDMENT: { label: 'Amendment', icon: Pencil, color: 'text-violet-600 bg-violet-50' },
  LIQUIDATION: { label: 'Liquidation', icon: XCircle, color: 'text-orange-600 bg-orange-50' },
  ACTIVATE: { label: 'Activate', icon: CheckCircle, color: 'text-teal-600 bg-teal-50' },
};

const STATUS_BADGE = {
  PENDING_APPROVAL: { label: 'Pending Approval', cls: 'bg-amber-100 text-amber-700' },
  APPROVED: { label: 'Approved', cls: 'bg-emerald-100 text-emerald-700' },
  EXECUTED: { label: 'Executed', cls: 'bg-blue-100 text-blue-700' },
  REJECTED: { label: 'Rejected', cls: 'bg-red-100 text-red-700' },
  CANCELLED: { label: 'Cancelled', cls: 'bg-gray-100 text-gray-500' },
};

const INSTRUCTION_BADGE = {
  'Instruction Issued': { label: 'Issued', cls: 'bg-blue-100 text-blue-700' },
  'Instruction Delivered': { label: 'Delivered', cls: 'bg-indigo-100 text-indigo-700' },
  'Confirmed by Bank': { label: 'Confirmed', cls: 'bg-emerald-100 text-emerald-700' },
};

function EndUserDashboard({ isGracePeriod }) { // NEW: Accept isGracePeriod prop
  const navigate = useNavigate();

  const [dashboardInfo, setDashboardInfo] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' or 'actions'
  const [maintenanceActions, setMaintenanceActions] = useState([]);
  const [actionsLoading, setActionsLoading] = useState(false);

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

  const fetchMaintenanceActions = useCallback(async () => {
    setActionsLoading(true);
    try {
      const data = await apiRequest('/issuance/my-maintenance-actions', 'GET');
      setMaintenanceActions(data.actions || []);
    } catch (err) {
      console.error('Failed to load maintenance actions:', err);
    } finally {
      setActionsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'actions' && maintenanceActions.length === 0 && !actionsLoading) {
      fetchMaintenanceActions();
    }
  }, [activeTab, maintenanceActions.length, actionsLoading, fetchMaintenanceActions]);

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

  const formatDate = (d) => {
    if (!d) return '—';
    try { return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }); } catch { return d; }
  };

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
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Welcome to Your Dashboard</h2>
        <p className="text-sm text-gray-500 mt-1">Your LG portfolio at a glance — key metrics and quick actions.</p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 mb-6">
        <button
          onClick={() => setActiveTab('overview')}
          className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 transition-all ${activeTab === 'overview' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
        >
          <BarChart2 className="w-4 h-4" /> Overview
        </button>
        <button
          onClick={() => setActiveTab('actions')}
          className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 transition-all ${activeTab === 'actions' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
        >
          <Wrench className="w-4 h-4" /> Issuance Actions ({maintenanceActions.length})
        </button>
      </div>

      {/* =============== OVERVIEW TAB =============== */}
      {activeTab === 'overview' && (
        <>
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
        </>
      )}

      {/* =============== ISSUANCE ACTIONS TAB =============== */}
      {activeTab === 'actions' && (
        <div>
          {actionsLoading ? (
            <div className="text-center py-10">
              <Loader2 className="animate-spin h-6 w-6 text-blue-600 mx-auto" />
              <p className="text-sm text-gray-500 mt-2">Loading actions...</p>
            </div>
          ) : maintenanceActions.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-200 p-10 text-center">
              <Wrench className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <h3 className="text-lg font-semibold text-gray-700 mb-1">No Issuance Actions</h3>
              <p className="text-sm text-gray-400">Maintenance actions on issued LGs will appear here.</p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200 text-left">
                    <th className="px-4 py-3 font-semibold text-gray-500 uppercase tracking-wider">Action</th>
                    <th className="px-4 py-3 font-semibold text-gray-500 uppercase tracking-wider">LG Reference</th>
                    <th className="px-4 py-3 font-semibold text-gray-500 uppercase tracking-wider">Beneficiary</th>
                    <th className="px-4 py-3 font-semibold text-gray-500 uppercase tracking-wider">Details</th>
                    <th className="px-4 py-3 font-semibold text-gray-500 uppercase tracking-wider">Approval</th>
                    <th className="px-4 py-3 font-semibold text-gray-500 uppercase tracking-wider">Instruction</th>
                    <th className="px-4 py-3 font-semibold text-gray-500 uppercase tracking-wider">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {maintenanceActions.map(action => {
                    const typeConfig = ACTION_TYPE_CONFIG[action.action_type] || { label: action.action_type, icon: Wrench, color: 'text-gray-600 bg-gray-50' };
                    const TypeIcon = typeConfig.icon;
                    const statusConfig = STATUS_BADGE[action.status] || { label: action.status, cls: 'bg-gray-100 text-gray-600' };
                    const instrConfig = action.instruction_status ? (INSTRUCTION_BADGE[action.instruction_status] || { label: action.instruction_status, cls: 'bg-gray-100 text-gray-600' }) : null;

                    const details = [];
                    if (action.action_data?.new_expiry_date) details.push(`New expiry: ${formatDate(action.action_data.new_expiry_date)}`);
                    if (action.action_data?.new_amount) details.push(`New amount: ${Number(action.action_data.new_amount).toLocaleString()}`);
                    if (action.action_data?.amendment_text) details.push(action.action_data.amendment_text);

                    return (
                      <tr key={action.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className={`p-1.5 rounded-lg ${typeConfig.color}`}>
                              <TypeIcon className="w-3.5 h-3.5" />
                            </div>
                            <span className="font-semibold text-gray-800">{typeConfig.label}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-bold text-gray-900">{action.lg_ref || '—'}</p>
                          {action.letter_serial_number && <p className="text-[10px] text-gray-400">{action.letter_serial_number}</p>}
                        </td>
                        <td className="px-4 py-3 text-gray-700 max-w-[150px] truncate">{action.lg_beneficiary || '—'}</td>
                        <td className="px-4 py-3 text-gray-600 max-w-[180px]">
                          {details.length > 0 ? (
                            <div className="space-y-0.5">
                              {details.map((d, i) => <p key={i} className="truncate text-[11px]">{d}</p>)}
                            </div>
                          ) : '—'}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold whitespace-nowrap ${statusConfig.cls}`}>
                            {statusConfig.label}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {instrConfig ? (
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold whitespace-nowrap ${instrConfig.cls}`}>
                              {instrConfig.label}
                            </span>
                          ) : (
                            <span className="text-gray-300">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{formatDate(action.created_at)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default EndUserDashboard;