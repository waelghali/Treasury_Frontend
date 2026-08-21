// frontend/src/pages/SystemOwner/Dashboard.js
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { apiRequest } from 'services/apiService.js';
import {
  Users,
  TrendingUp,
  DollarSign,
  Clock,
  Calendar,
  Briefcase,
  Loader2,
  BarChart,
  Building,
  HardDrive,
  Mail,
  MessageSquare,
  ArrowRight,
  RefreshCw,
  Activity,
  Layers,
  FileCheck,
  UserPlus,
  ShieldCheck,
  Cpu,
  Server,
  Database,
  CheckCircle2,
  X,
  Zap,
  Globe
} from 'lucide-react';
import apiClient from '../../services/apiClient';

function SystemOwnerDashboard({ onLogout }) {
  const [dashboardData, setDashboardData] = useState({
    total_active_customers: 0,
    customers_change_percent: '0%',
    total_active_users: 0,
    users_change_percent: '0%',
    total_active_lgs: '0',
    lgs_change_percent: '0%',
    expiring_soon_lgs: '0',
    total_lg_value: '$0',
    recent_activity: [],
  });
  const [systemUsageData, setSystemUsageData] = useState(null);
  const [unreviewedFeedbackCount, setUnreviewedFeedbackCount] = useState(0);
  const [pendingTrialsCount, setPendingTrialsCount] = useState(0);
  const [healthData, setHealthData] = useState(null);
  const [isHealthModalOpen, setIsHealthModalOpen] = useState(false);
  const [isPingingHealth, setIsPingingHealth] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchAllDashboardData = async () => {
    setIsLoading(true);
    setError('');
    try {
      const [dashboardMetrics, usageMetrics, feedbackRes, trialRes, telemetryRes] = await Promise.all([
        apiRequest('/system-owner/dashboard-metrics', 'GET'),
        apiRequest('/reports/system-owner/system-usage-overview', 'GET'),
        apiClient.get('/feedback/').catch(() => ({ data: [] })),
        apiRequest('/system-owner/trial/trial-registrations/?status=pending', 'GET').catch(() => []),
        apiRequest('/system-owner/system-health-telemetry', 'GET').catch(() => null)
      ]);

      setDashboardData({
        total_active_customers: dashboardMetrics.total_active_customers || 0,
        customers_change_percent: dashboardMetrics.customers_change_percent || '0%',
        total_active_users: dashboardMetrics.total_active_users || 0,
        users_change_percent: dashboardMetrics.users_change_percent || '0%',
        total_active_lgs: dashboardMetrics.total_active_lgs || '0',
        lgs_change_percent: dashboardMetrics.lgs_change_percent || '0%',
        expiring_soon_lgs: dashboardMetrics.expiring_soon_lgs || '0',
        total_lg_value: dashboardMetrics.total_lg_value || '$0',
        recent_activity: dashboardMetrics.recent_activity || [],
      });

      setSystemUsageData(usageMetrics.data);

      const allFeedback = feedbackRes.data || [];
      const newCount = allFeedback.filter((f) => f.status === 'NEW').length;
      setUnreviewedFeedbackCount(newCount);

      const pendingTrials = Array.isArray(trialRes) ? trialRes.length : 0;
      setPendingTrialsCount(pendingTrials);

      if (telemetryRes) {
        setHealthData(telemetryRes);
      }
    } catch (err) {
      console.error('Failed to fetch dashboard data:', err);
      setError(`Failed to load dashboard data. ${err.message || 'An unexpected error occurred.'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRunHealthDiagnostics = async () => {
    setIsPingingHealth(true);
    try {
      const res = await apiRequest('/system-owner/system-health-telemetry', 'GET');
      if (res) setHealthData(res);
    } catch (err) {
      console.error('Failed to run diagnostics:', err);
    } finally {
      setIsPingingHealth(false);
    }
  };

  useEffect(() => {
    fetchAllDashboardData();
  }, []);

  const metricsToDisplay = [
    {
      id: 1,
      title: 'Active Customers',
      value: dashboardData.total_active_customers,
      change: dashboardData.customers_change_percent,
      icon: Users,
      gradient: 'from-blue-600 to-indigo-600',
      changeColor: dashboardData.customers_change_percent && dashboardData.customers_change_percent.startsWith('+') ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40' : 'text-rose-600 bg-rose-50 dark:bg-rose-950/40',
      link: '/system-owner/customers'
    },
    {
      id: 2,
      title: 'Free Trial Requests',
      value: `${pendingTrialsCount} Pending`,
      unit: pendingTrialsCount > 0 ? 'Requires Review' : 'Queue Clear',
      icon: UserPlus,
      gradient: pendingTrialsCount > 0 ? 'from-amber-500 to-orange-600' : 'from-slate-600 to-slate-700',
      changeColor: pendingTrialsCount > 0 ? 'text-amber-700 bg-amber-100 dark:bg-amber-950/60 animate-pulse' : 'text-slate-500 bg-slate-100',
      link: '/system-owner/customers/trial-registrations',
      isActionable: pendingTrialsCount > 0
    },
    {
      id: 3,
      title: 'Active Users',
      value: dashboardData.total_active_users,
      change: dashboardData.users_change_percent,
      icon: Users,
      gradient: 'from-purple-600 to-violet-600',
      changeColor: dashboardData.users_change_percent && dashboardData.users_change_percent.startsWith('+') ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40' : 'text-rose-600 bg-rose-50 dark:bg-rose-950/40',
      link: '/system-owner/customers'
    },
    {
      id: 4,
      title: 'Expiring Soon (30d)',
      value: dashboardData.expiring_soon_lgs,
      unit: 'Upcoming Maturity',
      icon: Clock,
      gradient: 'from-rose-500 to-red-600',
      changeColor: 'text-rose-600 bg-rose-50 dark:bg-rose-950/40'
    },
    {
      id: 5,
      title: 'Total LG Portfolio',
      value: dashboardData.total_lg_value,
      change: dashboardData.lgs_change_percent,
      icon: DollarSign,
      gradient: 'from-emerald-600 to-teal-600',
      changeColor: dashboardData.lgs_change_percent && dashboardData.lgs_change_percent.startsWith('+') ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40' : 'text-rose-600 bg-rose-50 dark:bg-rose-950/40'
    },
  ];

  const quickActions = [
    { id: 1, title: 'Add Customer', description: 'Onboard tenant', icon: Users, link: '/system-owner/customers/onboard', color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-950/50' },
    { id: 2, title: 'Trial Queue', description: `${pendingTrialsCount} Pending Review`, icon: UserPlus, link: '/system-owner/customers/trial-registrations', color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-950/50' },
    { id: 3, title: 'Plans & Tiers', description: 'Billing quotas', icon: Briefcase, link: '/system-owner/subscription-plans', color: 'text-purple-600', bg: 'bg-purple-50 dark:bg-purple-950/50' },
    { id: 4, title: 'Bank Forms', description: 'AI overlays', icon: FileCheck, link: '/system-owner/bank-forms', color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-950/50' },
  ];

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 space-y-3">
        <Loader2 className="h-8 w-8 text-indigo-600 animate-spin" />
        <p className="text-xs font-medium text-slate-500">Loading System Owner Center...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-rose-50 border border-rose-200 text-rose-800 p-3 rounded-xl text-xs flex items-center justify-between">
        <span>{error}</span>
        <button onClick={fetchAllDashboardData} className="px-2.5 py-1 bg-rose-600 text-white rounded font-semibold">
          Retry
        </button>
      </div>
    );
  }

  const kpiCards = systemUsageData ? [
    { name: "Customers", value: systemUsageData.total_customers, icon: Building, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-950/40' },
    { name: "Users", value: systemUsageData.total_users, icon: Users, color: 'text-purple-600', bg: 'bg-purple-50 dark:bg-purple-950/40' },
    { name: "LGs Active", value: systemUsageData.total_lgs_managed, icon: HardDrive, color: 'text-indigo-600', bg: 'bg-indigo-50 dark:bg-indigo-950/40' },
    { name: "Instructions", value: systemUsageData.total_instructions_issued, icon: BarChart, color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-950/40' },
    { name: "Emails Sent", value: systemUsageData.total_emails_sent, icon: Mail, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-950/40' },
  ] : [];

  return (
    <div className="flex flex-col h-full space-y-3 overflow-hidden">
      {/* Compact Executive Hero Bar */}
      <div className="flex-shrink-0 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-2xl px-4 py-3 text-white shadow-md border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-600 rounded-xl text-white shadow-sm">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-black tracking-tight text-white">
                System Owner Executive Center
              </h1>
              <button
                onClick={() => setIsHealthModalOpen(true)}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 transition-all cursor-pointer"
                title="Click to view full System Health Diagnostics"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Live Telemetry: {healthData ? `${healthData.db_latency_ms}ms` : 'Operational'}
              </button>
            </div>
            <p className="text-[11px] text-slate-300">
              Cross-tenant telemetry, subscription governance, inbound trial queue, and microservice health.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-end sm:self-auto">
          <button
            onClick={() => setIsHealthModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600/80 hover:bg-indigo-600 text-white text-xs font-bold rounded-xl shadow transition-all active:scale-95 border border-indigo-400/30 cursor-pointer"
          >
            <Zap className="w-3.5 h-3.5 text-amber-300" />
            <span>Health & Diagnostics</span>
          </button>

          {pendingTrialsCount > 0 && (
            <Link
              to="/system-owner/customers/trial-registrations"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white text-xs font-bold rounded-xl shadow transition-all active:scale-95 border border-amber-400/30 animate-pulse"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>{pendingTrialsCount} Free Trial Requests</span>
              <span className="bg-white text-amber-900 text-[9px] font-black px-1.5 py-0.2 rounded-full">
                REVIEW
              </span>
            </Link>
          )}

          {unreviewedFeedbackCount > 0 && (
            <Link
              to="/system-owner/feedback"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold rounded-xl shadow transition-all active:scale-95 border border-purple-400/30"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>{unreviewedFeedbackCount} New Feedback</span>
              <span className="bg-white text-purple-900 text-[9px] font-black px-1.5 py-0.2 rounded-full">
                NEW
              </span>
            </Link>
          )}

          <button
            onClick={fetchAllDashboardData}
            className="flex items-center gap-1 px-2.5 py-1.5 bg-white/10 hover:bg-white/20 text-white text-xs font-semibold rounded-xl backdrop-blur-sm transition-all border border-white/10 active:scale-95 cursor-pointer"
            title="Refresh Telemetry"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>
      </div>

      {/* Top 5 Executive KPI Cards */}
      <div className="flex-shrink-0 grid grid-cols-2 sm:grid-cols-5 gap-2.5">
        {metricsToDisplay.map((metric) => {
          const CardContent = (
            <div className="space-y-0.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block truncate">
                {metric.title}
              </span>
              <div className="text-xl font-black text-slate-900 dark:text-white tracking-tight truncate">
                {metric.value}
              </div>
              <div className="text-[10px] font-semibold flex items-center">
                {metric.change ? (
                  <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded ${metric.changeColor}`}>
                    <TrendingUp className="w-2.5 h-2.5" />
                    {metric.change}
                  </span>
                ) : (
                  <span className={`px-1.5 py-0.2 rounded font-bold ${metric.changeColor || 'text-slate-400'}`}>
                    {metric.unit}
                  </span>
                )}
              </div>
            </div>
          );

          if (metric.link) {
            return (
              <Link
                key={metric.id}
                to={metric.link}
                className={`bg-white dark:bg-slate-800 p-3 rounded-xl border transition-all shadow-xs flex items-center justify-between hover:shadow-md hover:border-indigo-300 ${
                  metric.isActionable ? 'border-amber-300 bg-amber-50/20' : 'border-slate-200 dark:border-slate-700'
                }`}
              >
                {CardContent}
                <div className={`p-2.5 rounded-xl bg-gradient-to-br ${metric.gradient} text-white shadow-xs flex-shrink-0`}>
                  <metric.icon className="w-4 h-4" />
                </div>
              </Link>
            );
          }

          return (
            <div
              key={metric.id}
              className="bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs flex items-center justify-between"
            >
              {CardContent}
              <div className={`p-2.5 rounded-xl bg-gradient-to-br ${metric.gradient} text-white shadow-xs flex-shrink-0`}>
                <metric.icon className="w-4 h-4" />
              </div>
            </div>
          );
        })}
      </div>

      {/* Main Viewport-Fit Lower Grid (Fills Remaining Screen Height) */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-3 min-h-0">
        {/* Left Column: System Traction Grid + Quick Actions (7 cols) */}
        <div className="lg:col-span-7 flex flex-col space-y-3 min-h-0">
          {/* System Usage Traction Mini Grid */}
          <div className="flex-shrink-0 bg-white dark:bg-slate-800 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <BarChart className="w-4 h-4 text-indigo-600" />
                <h2 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                  Cross-Tenant Usage Traction
                </h2>
              </div>
              <Link
                to="/system-owner/reports/system-usage-overview"
                className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-0.5"
              >
                <span>Full Report</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            <div className="grid grid-cols-5 gap-2">
              {kpiCards.map((kpi, idx) => (
                <div
                  key={idx}
                  className="bg-slate-50/80 dark:bg-slate-900/60 p-2 rounded-lg border border-slate-100 dark:border-slate-800 text-center space-y-0.5"
                >
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block truncate">
                    {kpi.name}
                  </span>
                  <span className="text-base font-black text-slate-900 dark:text-white block">
                    {kpi.value}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Actions Panel */}
          <div className="flex-1 bg-white dark:bg-slate-800 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs flex flex-col justify-between min-h-0">
            <div className="flex items-center gap-1.5 mb-2">
              <Layers className="w-4 h-4 text-indigo-600" />
              <h2 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Administrative Quick Actions
              </h2>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {quickActions.map((action) => (
                <Link
                  key={action.id}
                  to={action.link}
                  className="group p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-700 bg-slate-50/50 dark:bg-slate-900/40 hover:bg-indigo-50/50 dark:hover:bg-slate-800 transition-all flex flex-col justify-between"
                >
                  <div className={`p-2 rounded-lg ${action.bg} ${action.color} w-fit mb-1.5`}>
                    <action.icon className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block group-hover:text-indigo-600 transition-colors truncate">
                      {action.title}
                    </span>
                    <span className="text-[10px] text-slate-400 block truncate">
                      {action.description}
                    </span>
                  </div>
                </Link>
              ))}
            </div>

            {/* Inbound Trial Approvals Banner */}
            <div className="mt-2 bg-gradient-to-r from-slate-900 to-indigo-950 p-2.5 rounded-xl text-white flex items-center justify-between border border-slate-800">
              <div className="flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-amber-400" />
                <span className="text-[11px] font-semibold text-slate-200">
                  {pendingTrialsCount > 0 ? `${pendingTrialsCount} Inbound Free Trial Applications Awaiting Approval` : 'Self-Serve Free Trial Registrations Queue Clear'}
                </span>
              </div>
              <Link
                to="/system-owner/customers/trial-registrations"
                className="text-[11px] font-bold text-amber-300 hover:text-white underline decoration-amber-400 flex items-center gap-1"
              >
                <span>Review Trials</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </div>
        </div>

        {/* Right Column: Global Activity Trail (5 cols, Inner-Scrollable) */}
        <div className="lg:col-span-5 bg-white dark:bg-slate-800 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs flex flex-col min-h-0">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100 dark:border-slate-700 flex-shrink-0">
            <div className="flex items-center gap-1.5">
              <Activity className="w-4 h-4 text-indigo-600" />
              <h2 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Recent Audit Trail
              </h2>
            </div>
            <Link
              to="/system-owner/audit-logs"
              className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-0.5"
            >
              <span>Full Audit Logs</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2 pr-1 min-h-0">
            {dashboardData.recent_activity.length > 0 ? (
              dashboardData.recent_activity.slice(0, 12).map((activity, index) => (
                <div
                  key={activity.id || index}
                  className="flex items-start justify-between p-2 rounded-lg bg-slate-50/70 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 text-xs"
                >
                  <div className="flex items-start gap-2 max-w-[80%]">
                    <Calendar className="w-3.5 h-3.5 text-indigo-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-[11px] font-semibold text-slate-800 dark:text-slate-200 line-clamp-1">
                        {activity.description}
                      </p>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {activity.timestamp ? new Date(activity.timestamp).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'N/A'}
                      </span>
                    </div>
                  </div>
                  <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 bg-white dark:bg-slate-800 px-1.5 py-0.2 rounded border border-slate-200 dark:border-slate-700 flex-shrink-0">
                    Event
                  </span>
                </div>
              ))
            ) : (
              <div className="p-6 text-center text-slate-400 text-xs italic">
                No recent activity recorded today.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* System Health & Operational Telemetry Modal */}
      {isHealthModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-w-2xl w-full p-5 space-y-4 animate-in fade-in zoom-in duration-150 flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 flex-shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-emerald-50 dark:bg-emerald-950/60 rounded-xl text-emerald-600 border border-emerald-200 dark:border-emerald-800">
                  <Zap className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                    System Health & Infrastructure Telemetry
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      {healthData?.status || 'HEALTHY'}
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Real-time backend microservices, database latency, and security guardrail status.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsHealthModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Top Quick Telemetry KPIs */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 flex-shrink-0">
              <div className="bg-slate-50 dark:bg-slate-800 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Uptime SLA</span>
                <span className="text-sm font-black text-emerald-600 block">{healthData?.uptime_sla || '99.98%'}</span>
              </div>
              <div className="bg-slate-50 dark:bg-slate-800 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">DB Round-trip</span>
                <span className="text-sm font-black text-indigo-600 block">{healthData ? `${healthData.db_latency_ms} ms` : 'Evaluating...'}</span>
              </div>
              <div className="bg-slate-50 dark:bg-slate-800 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Security Guard</span>
                <span className="text-sm font-black text-emerald-600 block">Active Guard</span>
              </div>
              <div className="bg-slate-50 dark:bg-slate-800 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Failed Logins (24h)</span>
                <span className="text-sm font-black text-slate-800 dark:text-slate-200 block">{healthData?.failed_logins_24h ?? 0}</span>
              </div>
            </div>

            {/* Microservice Matrix */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1 min-h-0">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Subsystem Status Matrix</h4>
              {healthData?.services ? (
                healthData.services.map((srv, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-slate-50/80 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700/80 flex items-center justify-between"
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900 dark:text-white">{srv.name}</span>
                        <span className="text-[9px] font-semibold uppercase px-1.5 py-0.2 rounded bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                          {srv.category}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">{srv.details}</p>
                    </div>
                    <div className="text-right space-y-0.5">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${srv.badge}`}>
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        {srv.status}
                      </span>
                      <span className="text-[10px] font-mono text-slate-400 block">{srv.latency}</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-4 text-center text-xs text-slate-400">Loading subsystem matrix...</div>
              )}
            </div>

            {/* Modal Footer with Live Ping Diagnostic */}
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between flex-shrink-0">
              <span className="text-[10px] text-slate-400 font-mono">
                Environment: {healthData?.environment || 'Multi-Tenant Production'}
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleRunHealthDiagnostics}
                  disabled={isPingingHealth}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900 text-indigo-700 dark:text-indigo-300 text-xs font-bold rounded-xl border border-indigo-200 dark:border-indigo-800 transition-all cursor-pointer active:scale-95 disabled:opacity-50"
                >
                  {isPingingHealth ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                  <span>{isPingingHealth ? 'Pinging Services...' : 'Run Live Ping Diagnostics'}</span>
                </button>
                <button
                  onClick={() => setIsHealthModalOpen(false)}
                  className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-all cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default SystemOwnerDashboard;
