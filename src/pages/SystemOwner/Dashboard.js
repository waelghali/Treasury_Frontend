// frontend/src/pages/SystemOwner/Dashboard.js
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { apiRequest } from 'services/apiService.js';
import {
  Users,
  TrendingUp,
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
  Database,
  CheckCircle2,
  X,
  Zap,
  Globe,
  AlertTriangle,
  Sparkles,
  FileSpreadsheet,
  Award,
  Lock
} from 'lucide-react';
import apiClient from '../../services/apiClient';

const MODULE_STYLE_MAP = {
  custody: {
    icon: HardDrive,
    color: 'text-indigo-600 dark:text-indigo-400',
    bg: 'bg-indigo-50 dark:bg-indigo-950/50',
    bar: 'bg-indigo-600',
    border: 'border-indigo-200 dark:border-indigo-800/60',
    badge: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300',
  },
  issuance: {
    icon: Building,
    color: 'text-blue-600 dark:text-blue-400',
    bg: 'bg-blue-50 dark:bg-blue-950/50',
    bar: 'bg-blue-600',
    border: 'border-blue-200 dark:border-blue-800/60',
    badge: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300',
  },
  quotations: {
    icon: Globe,
    color: 'text-emerald-600 dark:text-emerald-400',
    bg: 'bg-emerald-50 dark:bg-emerald-950/50',
    bar: 'bg-emerald-500',
    border: 'border-emerald-200 dark:border-emerald-800/60',
    badge: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300',
  },
  reconciliation: {
    icon: FileSpreadsheet,
    color: 'text-amber-600 dark:text-amber-400',
    bg: 'bg-amber-50 dark:bg-amber-950/50',
    bar: 'bg-amber-500',
    border: 'border-amber-200 dark:border-amber-800/60',
    badge: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
  },
  inbox: {
    icon: Mail,
    color: 'text-purple-600 dark:text-purple-400',
    bg: 'bg-purple-50 dark:bg-purple-950/50',
    bar: 'bg-purple-500',
    border: 'border-purple-200 dark:border-purple-800/60',
    badge: 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300',
  },
  ai_copilot: {
    icon: Sparkles,
    color: 'text-rose-600 dark:text-rose-400',
    bg: 'bg-rose-50 dark:bg-rose-950/50',
    bar: 'bg-rose-500',
    border: 'border-rose-200 dark:border-rose-800/60',
    badge: 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300',
  },
};

function SystemOwnerDashboard({ onLogout }) {
  const [dashboardData, setDashboardData] = useState({
    total_active_customers: 0,
    customers_change_percent: '0% (30d)',
    customers_new_30d: 0,
    tenant_status_breakdown: { active: 0, grace: 0, expired: 0 },
    total_active_users: 0,
    users_change_percent: '0% (30d)',
    users_new_30d: 0,
    active_users_7d: 0,
    active_users_30d: 0,
    total_active_lgs: '0',
    lgs_change_percent: '0% (30d)',
    most_used_module: 'LG Custody',
    scale_and_footprint: {
      total_records_managed: 0,
      records_added_30d: 0,
      records_added_prev_30d: 0,
      records_growth_pct: 0,
      records_growth_label: '0% (30d)',
      is_increasing: true,
      momentum_status: 'GROWING',
      db_size_mb: 0,
      total_stored_documents: 0,
      total_audit_blocks: 0,
      ai_tokens_total: 0,
      ai_pages_total: 0,
    },
    module_usage: [],
    monthly_growth_trend: [],
    performance_insights: {
      avg_approval_hours: 0,
      avg_bank_sla_days: 0,
      recon_automation_rate_pct: 0,
      promoted_collab_patterns: 0,
      quotation_response_rate_pct: 0,
      quotation_completion_rate_pct: 0,
      inbox_accuracy_rate_pct: 100,
      active_user_engagement_30d_pct: 0,
    },
    recent_activity: [],
  });
  const [activeUsageTab, setActiveUsageTab] = useState('modules'); // 'modules' | 'growth'
  const [unreviewedFeedbackCount, setUnreviewedFeedbackCount] = useState(0);
  const [pendingTrialsCount, setPendingTrialsCount] = useState(0);
  const [healthData, setHealthData] = useState(null);
  const [isHealthModalOpen, setIsHealthModalOpen] = useState(false);
  const [isPingingHealth, setIsPingingHealth] = useState(false);
  const [telemetryTab, setTelemetryTab] = useState('subsystems');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // Cryptographic WORM Audit Chain Verification State
  const [isVerifyingWorm, setIsVerifyingWorm] = useState(false);
  const [isResealingWorm, setIsResealingWorm] = useState(false);
  const [wormVerifyResult, setWormVerifyResult] = useState(null);

  const handleVerifyWormChain = async () => {
    setIsVerifyingWorm(true);
    setWormVerifyResult(null);
    try {
      const res = await apiRequest('/system-owner/audit-logs/verify-chain', 'GET');
      setWormVerifyResult(res);
      const updatedHealth = await apiRequest('/system-owner/system-health-telemetry', 'GET');
      if (updatedHealth) setHealthData(updatedHealth);
    } catch (err) {
      console.error('Failed to verify audit chain:', err);
      setWormVerifyResult({
        is_valid: false,
        message: err.message || 'Audit chain verification failed'
      });
    } finally {
      setIsVerifyingWorm(false);
    }
  };

  const handleResealWormChain = async () => {
    setIsResealingWorm(true);
    try {
      const res = await apiRequest('/system-owner/audit-logs/reseal-chain', 'POST');
      setWormVerifyResult(res);
      const updatedHealth = await apiRequest('/system-owner/system-health-telemetry', 'GET');
      if (updatedHealth) setHealthData(updatedHealth);
    } catch (err) {
      console.error('Failed to re-seal audit chain:', err);
      setWormVerifyResult({
        is_valid: false,
        message: err.message || 'Audit chain re-seal failed'
      });
    } finally {
      setIsResealingWorm(false);
    }
  };

  const fetchAllDashboardData = async () => {
    setIsLoading(true);
    setError('');
    try {
      const [dashboardMetrics, feedbackRes, trialRes, telemetryRes] = await Promise.all([
        apiRequest('/system-owner/dashboard-metrics', 'GET'),
        apiClient.get('/feedback/').catch(() => ({ data: [] })),
        apiRequest('/system-owner/trial/trial-registrations/?status=pending', 'GET').catch(() => []),
        apiRequest('/system-owner/system-health-telemetry', 'GET').catch(() => null)
      ]);

      setDashboardData((prev) => ({
        ...prev,
        ...dashboardMetrics,
        scale_and_footprint: {
          ...prev.scale_and_footprint,
          ...(dashboardMetrics.scale_and_footprint || {}),
        },
        performance_insights: {
          ...prev.performance_insights,
          ...(dashboardMetrics.performance_insights || {}),
        },
        module_usage: dashboardMetrics.module_usage || [],
        monthly_growth_trend: dashboardMetrics.monthly_growth_trend || [],
        recent_activity: dashboardMetrics.recent_activity || [],
      }));

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

  const scale = dashboardData.scale_and_footprint || {};
  const perf = dashboardData.performance_insights || {};
  const tenantStatus = dashboardData.tenant_status_breakdown || { active: 0, grace: 0, expired: 0 };

  const metricsToDisplay = [
    {
      id: 1,
      title: 'Active Tenants',
      value: dashboardData.total_active_customers,
      change: dashboardData.customers_change_percent,
      subtext: `${tenantStatus.active} Active • ${tenantStatus.grace} Grace`,
      icon: Building,
      gradient: 'from-blue-600 to-indigo-600',
      changeColor:
        dashboardData.customers_change_percent && !dashboardData.customers_change_percent.startsWith('-')
          ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40'
          : 'text-rose-600 bg-rose-50 dark:bg-rose-950/40',
      link: '/system-owner/customers',
    },
    {
      id: 2,
      title: 'Platform Users',
      value: dashboardData.total_active_users,
      change: dashboardData.users_change_percent,
      subtext: `${dashboardData.active_users_7d || 0} active (7d) • ${perf.active_user_engagement_30d_pct || 0}% (30d)`,
      icon: Users,
      gradient: 'from-purple-600 to-violet-600',
      changeColor:
        dashboardData.users_change_percent && !dashboardData.users_change_percent.startsWith('-')
          ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40'
          : 'text-rose-600 bg-rose-50 dark:bg-rose-950/40',
      link: '/system-owner/customers',
    },
    {
      id: 3,
      title: 'Total Platform Volume',
      value: (scale.total_records_managed || 0).toLocaleString(),
      change: `${scale.records_growth_label || '0%'} • ${scale.momentum_status || 'STEADY'}`,
      subtext: `+${(scale.records_added_30d || 0).toLocaleString()} records in last 30d`,
      icon: TrendingUp,
      gradient: 'from-emerald-600 to-teal-600',
      changeColor: scale.is_increasing
        ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40'
        : 'text-amber-600 bg-amber-50 dark:bg-amber-950/40',
      link: '/system-owner/reports/system-usage-overview',
    },
    {
      id: 4,
      title: 'Database & Vault Size',
      value: scale.db_size_mb > 0 ? `${scale.db_size_mb} MB` : `${(scale.total_stored_documents || 0).toLocaleString()} Docs`,
      unit: `${(scale.total_stored_documents || 0).toLocaleString()} Stored Files`,
      subtext: `${(scale.total_audit_blocks || 0).toLocaleString()} WORM Audit Blocks`,
      icon: Database,
      gradient: 'from-indigo-600 to-cyan-600',
      changeColor: 'text-indigo-600 bg-indigo-50 dark:bg-indigo-950/40',
    },
    {
      id: 5,
      title: 'Inbound Trial Queue',
      value: `${pendingTrialsCount} Pending`,
      unit: pendingTrialsCount > 0 ? 'Requires Review' : 'Queue Clear',
      subtext: `Top Module: ${dashboardData.most_used_module || 'LG Custody'}`,
      icon: UserPlus,
      gradient: pendingTrialsCount > 0 ? 'from-amber-500 to-orange-600' : 'from-slate-600 to-slate-700',
      changeColor:
        pendingTrialsCount > 0
          ? 'text-amber-700 bg-amber-100 dark:bg-amber-950/60 animate-pulse'
          : 'text-slate-500 bg-slate-100 dark:bg-slate-800',
      link: '/system-owner/customers/trial-registrations',
      isActionable: pendingTrialsCount > 0,
    },
  ];

  const quickActions = [
    { id: 1, title: 'Add Customer', description: 'Onboard tenant', icon: Users, link: '/system-owner/customers/onboard', color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-950/50' },
    { id: 2, title: 'Trial Queue', description: `${pendingTrialsCount} Pending Review`, icon: UserPlus, link: '/system-owner/customers/trial-registrations', color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-950/50' },
    { id: 3, title: 'Plans & Tiers', description: 'Module quotas', icon: Briefcase, link: '/system-owner/subscription-plans', color: 'text-purple-600', bg: 'bg-purple-50 dark:bg-purple-950/50' },
    { id: 4, title: 'Bank Forms', description: 'AI overlays', icon: FileCheck, link: '/system-owner/bank-forms', color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-950/50' },
    { id: 5, title: 'FX Telemetry', description: 'Bank SLA league', icon: Globe, link: '/system-owner/quotations-telemetry', color: 'text-cyan-600', bg: 'bg-cyan-50 dark:bg-cyan-950/50' },
    { id: 6, title: 'Campaigns', description: 'Partner cashback', icon: Award, link: '/system-owner/campaigns', color: 'text-rose-600', bg: 'bg-rose-50 dark:bg-rose-950/50' },
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

  const maxMonthlyTotal = Math.max(
    1,
    ...(dashboardData.monthly_growth_trend || []).map((m) => m.total || 0)
  );

  return (
    <div className="flex flex-col h-full space-y-3 overflow-y-auto">
      {/* Compact Executive Hero Bar */}
      <div className="flex-shrink-0 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-2xl px-4 py-3 text-white shadow-md border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-600 rounded-xl text-white shadow-sm">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-lg font-black tracking-tight text-white">
                System Owner Executive Center
              </h1>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-500/20 text-indigo-200 border border-indigo-400/30">
                <Lock className="w-2.5 h-2.5 text-indigo-300" />
                Zero-PII Anonymized Telemetry
              </span>
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
              Cross-module adoption rankings, database scale &amp; growth momentum, engine velocity, and microservice health.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-end sm:self-auto">
          <button
            onClick={() => setIsHealthModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600/80 hover:bg-indigo-600 text-white text-xs font-bold rounded-xl shadow transition-all active:scale-95 border border-indigo-400/30 cursor-pointer"
          >
            <Zap className="w-3.5 h-3.5 text-amber-300" />
            <span>Health &amp; Diagnostics</span>
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

      {/* Top 5 Executive KPI Cards (Scale, Size & Growth) */}
      <div className="flex-shrink-0 grid grid-cols-2 sm:grid-cols-5 gap-2.5">
        {metricsToDisplay.map((metric) => {
          const CardContent = (
            <div className="space-y-0.5 min-w-0">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block truncate">
                {metric.title}
              </span>
              <div className="text-xl font-black text-slate-900 dark:text-white tracking-tight truncate">
                {metric.value}
              </div>
              <div className="text-[10px] font-semibold flex items-center gap-1 flex-wrap">
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
              {metric.subtext && (
                <span className="text-[10px] text-slate-400 block truncate pt-0.5">
                  {metric.subtext}
                </span>
              )}
            </div>
          );

          if (metric.link) {
            return (
              <Link
                key={metric.id}
                to={metric.link}
                className={`bg-white dark:bg-slate-800 p-3 rounded-xl border transition-all shadow-xs flex items-center justify-between gap-2 hover:shadow-md hover:border-indigo-300 ${
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
              className="bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs flex items-center justify-between gap-2"
            >
              {CardContent}
              <div className={`p-2.5 rounded-xl bg-gradient-to-br ${metric.gradient} text-white shadow-xs flex-shrink-0`}>
                <metric.icon className="w-4 h-4" />
              </div>
            </div>
          );
        })}
      </div>

      {/* Main Viewport-Fit Lower Grid */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-3 min-h-0">
        {/* Left/Center Column: Diversified Module Usage + Velocity & Quick Actions (8 cols) */}
        <div className="lg:col-span-8 flex flex-col space-y-3 min-h-0">
          {/* Panel 1: Diversified Module Usage & Growth Trajectory */}
          <div className="bg-white dark:bg-slate-800 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs flex flex-col space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <BarChart className="w-4 h-4 text-indigo-600" />
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                      Diversified Module Adoption &amp; Scale
                    </h2>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                      Most Used: {dashboardData.most_used_module || 'LG Custody'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <div className="inline-flex rounded-lg bg-slate-100 dark:bg-slate-900 p-0.5 border border-slate-200 dark:border-slate-700">
                  <button
                    type="button"
                    onClick={() => setActiveUsageTab('modules')}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                      activeUsageTab === 'modules'
                        ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-2xs'
                        : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                  >
                    Module Usage Ranking (6)
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveUsageTab('growth')}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                      activeUsageTab === 'growth'
                        ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-2xs'
                        : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                  >
                    4-Month Volume Trend
                  </button>
                </div>

                <Link
                  to="/system-owner/reports/system-usage-overview"
                  className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-0.5 ml-1"
                >
                  <span>Ops Report</span>
                  <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            </div>

            {/* Stacked Module Usage Share Bar */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[10px] text-slate-500 font-semibold">
                <span>Platform Activity Distribution by Module (Ranked by Usage)</span>
                <span>
                  Total Volume: <strong className="text-slate-800 dark:text-white">{(scale.total_records_managed || 0).toLocaleString()}</strong> records &amp; actions ({scale.records_growth_label})
                </span>
              </div>
              <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-900 rounded-full overflow-hidden flex border border-slate-200 dark:border-slate-700">
                {(dashboardData.module_usage || []).map((mod) => {
                  const style = MODULE_STYLE_MAP[mod.id] || MODULE_STYLE_MAP.custody;
                  const widthPct = Math.max(mod.total_volume > 0 ? 3 : 0, mod.usage_share_pct || 0);
                  return (
                    <div
                      key={mod.id}
                      className={`${style.bar} h-full transition-all duration-500 first:rounded-l-full last:rounded-r-full`}
                      style={{ width: `${widthPct}%` }}
                      title={`${mod.name}: ${mod.usage_share_pct}% share (${mod.total_volume} total)`}
                    />
                  );
                })}
              </div>
            </div>

            {activeUsageTab === 'modules' ? (
              /* 6-Module Diversified Cards Grid */
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {(dashboardData.module_usage || []).map((mod, idx) => {
                  const style = MODULE_STYLE_MAP[mod.id] || MODULE_STYLE_MAP.custody;
                  const ModIcon = style.icon;
                  const adoptionPct =
                    mod.entitled_tenants > 0
                      ? Math.min(100, Math.round((mod.adopted_tenants / mod.entitled_tenants) * 100))
                      : 0;

                  return (
                    <div
                      key={mod.id}
                      className={`p-3 rounded-xl border ${style.border} bg-slate-50/60 dark:bg-slate-900/50 flex flex-col justify-between space-y-2.5 hover:shadow-xs transition-all`}
                    >
                      {/* Header */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className={`p-2 rounded-lg ${style.bg} ${style.color} flex-shrink-0`}>
                            <ModIcon className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className={`text-[9px] font-black px-1.5 py-0.2 rounded ${style.badge}`}>
                                #{idx + 1}
                              </span>
                              <h3 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                                {mod.short_name}
                              </h3>
                            </div>
                            <span className="text-[10px] text-slate-400 block truncate">
                              {mod.category}
                            </span>
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <span className="text-xs font-black text-slate-900 dark:text-white block">
                            {mod.usage_share_pct}%
                          </span>
                          <span
                            className={`text-[9px] font-bold ${
                              mod.growth_pct >= 0 ? 'text-emerald-600' : 'text-rose-600'
                            }`}
                          >
                            {mod.growth_label}
                          </span>
                        </div>
                      </div>

                      {/* 3 Sub-Metrics */}
                      <div className="grid grid-cols-3 gap-1.5 bg-white dark:bg-slate-800/90 p-2 rounded-lg border border-slate-100 dark:border-slate-800">
                        {(mod.sub_metrics || []).map((sm, smIdx) => (
                          <div key={smIdx} className="text-center">
                            <span className="text-xs font-black text-slate-900 dark:text-white block truncate">
                              {(sm.value || 0).toLocaleString()}
                            </span>
                            <span className="text-[9px] font-semibold text-slate-400 block truncate">
                              {sm.label}
                            </span>
                          </div>
                        ))}
                      </div>

                      {/* Tenant Adoption Footer */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[10px]">
                          <span className="text-slate-500 font-medium">
                            Tenant Adoption: <strong className="text-slate-700 dark:text-slate-200">{mod.adopted_tenants}/{mod.entitled_tenants || dashboardData.total_active_customers}</strong>
                          </span>
                          <span className="font-bold text-slate-600 dark:text-slate-300">
                            +{mod.volume_30d} (30d)
                          </span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                          <div
                            className={`${style.bar} h-full rounded-full`}
                            style={{ width: `${adoptionPct}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              /* 4-Month Volume Growth & Scale Trend View */
              <div className="space-y-3 pt-1">
                <div className="grid grid-cols-4 gap-3 items-end h-36 pt-4 px-3 bg-slate-50/70 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-800">
                  {(dashboardData.monthly_growth_trend || []).map((m, idx) => {
                    const heightPct = Math.max(12, Math.round(((m.total || 0) / maxMonthlyTotal) * 100));
                    return (
                      <div key={idx} className="flex flex-col items-center h-full justify-end space-y-1.5">
                        <span className="text-[11px] font-black text-slate-800 dark:text-white">
                          {(m.total || 0).toLocaleString()}
                        </span>
                        <div
                          className="w-full max-w-[68px] rounded-t-lg overflow-hidden flex flex-col-reverse bg-slate-200 dark:bg-slate-800 border border-slate-300/60 dark:border-slate-700 transition-all duration-500"
                          style={{ height: `${heightPct}%` }}
                          title={`${m.month}: ${m.total} total events`}
                        >
                          {m.total > 0 && (
                            <>
                              <div style={{ height: `${(m.custody / m.total) * 100}%` }} className="bg-indigo-600 w-full" title={`Custody: ${m.custody}`} />
                              <div style={{ height: `${(m.issuance / m.total) * 100}%` }} className="bg-blue-500 w-full" title={`Issuance: ${m.issuance}`} />
                              <div style={{ height: `${(m.quotations / m.total) * 100}%` }} className="bg-emerald-500 w-full" title={`Quotations: ${m.quotations}`} />
                              <div style={{ height: `${(m.reconciliation / m.total) * 100}%` }} className="bg-amber-500 w-full" title={`Reconciliation: ${m.reconciliation}`} />
                              <div style={{ height: `${(m.inbox / m.total) * 100}%` }} className="bg-purple-500 w-full" title={`Inbox: ${m.inbox}`} />
                              <div style={{ height: `${(m.ai / m.total) * 100}%` }} className="bg-rose-500 w-full" title={`AI & OCR: ${m.ai}`} />
                            </>
                          )}
                        </div>
                        <span className="text-[10px] font-bold text-slate-500 pb-1">
                          {m.month}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Monthly Module Breakdown Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-[11px] text-left">
                    <thead className="text-[10px] uppercase text-slate-400 border-b border-slate-200 dark:border-slate-700">
                      <tr>
                        <th className="py-1.5 px-2">Month</th>
                        <th className="py-1.5 px-2 text-right">Custody</th>
                        <th className="py-1.5 px-2 text-right">Issuance</th>
                        <th className="py-1.5 px-2 text-right">Quotations</th>
                        <th className="py-1.5 px-2 text-right">Recon</th>
                        <th className="py-1.5 px-2 text-right">Inbox</th>
                        <th className="py-1.5 px-2 text-right">AI/OCR</th>
                        <th className="py-1.5 px-2 text-right font-bold text-slate-700 dark:text-slate-200">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {(dashboardData.monthly_growth_trend || []).map((m, idx) => (
                        <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-900/40">
                          <td className="py-1.5 px-2 font-bold text-slate-800 dark:text-slate-200">{m.month}</td>
                          <td className="py-1.5 px-2 text-right font-mono">{m.custody}</td>
                          <td className="py-1.5 px-2 text-right font-mono">{m.issuance}</td>
                          <td className="py-1.5 px-2 text-right font-mono">{m.quotations}</td>
                          <td className="py-1.5 px-2 text-right font-mono">{m.reconciliation}</td>
                          <td className="py-1.5 px-2 text-right font-mono">{m.inbox}</td>
                          <td className="py-1.5 px-2 text-right font-mono">{m.ai}</td>
                          <td className="py-1.5 px-2 text-right font-black text-indigo-600 dark:text-indigo-400 font-mono">
                            {m.total}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* Panel 2: Performance & Operational Velocity + Quick Actions */}
          <div className="flex-1 bg-white dark:bg-slate-800 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs flex flex-col justify-between space-y-3 min-h-0">
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  <Zap className="w-4 h-4 text-indigo-600" />
                  <h2 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                    Performance &amp; Automation Velocity Insights
                  </h2>
                </div>
                <span className="text-[10px] text-slate-400 font-semibold">
                  Cross-Tenant Anonymized Averages
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {/* Velocity 1: Approval & Bank Turnaround */}
                <div className="p-2.5 rounded-xl bg-slate-50/80 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase text-slate-400">Approval SLA</span>
                    <Clock className="w-3.5 h-3.5 text-indigo-500" />
                  </div>
                  <div className="text-base font-black text-slate-900 dark:text-white mt-0.5">
                    {perf.avg_approval_hours > 0 ? `${perf.avg_approval_hours}h` : '< 1h'}
                  </div>
                  <span className="text-[10px] text-slate-500 block truncate">
                    Bank Reply Avg: <strong>{perf.avg_bank_sla_days || 0}d</strong>
                  </span>
                </div>

                {/* Velocity 2: Reconciliation Automation */}
                <div className="p-2.5 rounded-xl bg-slate-50/80 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase text-slate-400">Recon Auto-Rate</span>
                    <FileSpreadsheet className="w-3.5 h-3.5 text-amber-500" />
                  </div>
                  <div className="text-base font-black text-amber-600 dark:text-amber-400 mt-0.5">
                    {perf.recon_automation_rate_pct || 0}%
                  </div>
                  <span className="text-[10px] text-slate-500 block truncate">
                    <strong>{perf.promoted_collab_patterns || 0}</strong> Collaborative Rules
                  </span>
                </div>

                {/* Velocity 3: Quotation Desk Liquidity */}
                <div className="p-2.5 rounded-xl bg-slate-50/80 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase text-slate-400">RFQ Deal Fill</span>
                    <Globe className="w-3.5 h-3.5 text-emerald-500" />
                  </div>
                  <div className="text-base font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
                    {perf.quotation_completion_rate_pct || 0}%
                  </div>
                  <span className="text-[10px] text-slate-500 block truncate">
                    Bank Quote Rate: <strong>{perf.quotation_response_rate_pct || 0}%</strong>
                  </span>
                </div>

                {/* Velocity 4: Smart Inbox & AI Engine */}
                <div className="p-2.5 rounded-xl bg-slate-50/80 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase text-slate-400">Inbox &amp; AI Parse</span>
                    <Sparkles className="w-3.5 h-3.5 text-rose-500" />
                  </div>
                  <div className="text-base font-black text-rose-600 dark:text-rose-400 mt-0.5">
                    {perf.inbox_accuracy_rate_pct ?? 100}%
                  </div>
                  <span className="text-[10px] text-slate-500 block truncate">
                    <strong>{(scale.ai_pages_total || 0).toLocaleString()}</strong> OCR Pages
                  </span>
                </div>
              </div>
            </div>

            {/* Administrative Quick Actions */}
            <div>
              <div className="flex items-center gap-1.5 mb-2">
                <Layers className="w-3.5 h-3.5 text-indigo-600" />
                <h3 className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Executive Quick Actions
                </h3>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-6 gap-2">
                {quickActions.map((action) => (
                  <Link
                    key={action.id}
                    to={action.link}
                    className="group p-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-700 bg-slate-50/50 dark:bg-slate-900/40 hover:bg-indigo-50/50 dark:hover:bg-slate-800 transition-all flex flex-col justify-between"
                  >
                    <div className={`p-1.5 rounded-lg ${action.bg} ${action.color} w-fit mb-1`}>
                      <action.icon className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200 block group-hover:text-indigo-600 transition-colors truncate">
                        {action.title}
                      </span>
                      <span className="text-[9px] text-slate-400 block truncate">
                        {action.description}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Sanitized Zero-PII Activity Stream & WORM Integrity (4 cols) */}
        <div className="lg:col-span-4 bg-white dark:bg-slate-800 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs flex flex-col min-h-0">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100 dark:border-slate-700 flex-shrink-0">
            <div className="flex items-center gap-1.5">
              <Activity className="w-4 h-4 text-indigo-600" />
              <div>
                <h2 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                  Anonymized Activity Stream
                </h2>
              </div>
            </div>
            <Link
              to="/system-owner/audit-logs"
              className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-0.5"
            >
              <span>Full Audit Logs</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          {/* Cryptographic WORM Integrity Pill */}
          <div className="mb-2 px-2.5 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/80 flex items-center justify-between flex-shrink-0 text-[11px]">
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span className="font-bold text-emerald-900 dark:text-emerald-200">
                WORM Chain Sealed
              </span>
              <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-mono">
                ({healthData?.audit_worm?.chained_count ?? scale.total_audit_blocks ?? 0} blocks)
              </span>
            </div>
            <button
              onClick={() => setIsHealthModalOpen(true)}
              className="font-bold text-emerald-700 dark:text-emerald-300 hover:text-emerald-800 dark:hover:text-white transition-colors cursor-pointer"
            >
              Verify →
            </button>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2 pr-1 min-h-0">
            {dashboardData.recent_activity.length > 0 ? (
              dashboardData.recent_activity.slice(0, 12).map((activity, index) => (
                <div
                  key={activity.id || index}
                  className="flex items-start justify-between p-2 rounded-lg bg-slate-50/70 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 text-xs gap-2"
                >
                  <div className="flex items-start gap-2 min-w-0">
                    <Calendar className="w-3.5 h-3.5 text-indigo-500 mt-0.5 flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-[11px] font-semibold text-slate-800 dark:text-slate-200 truncate">
                        {activity.description}
                      </p>
                      <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-mono truncate">
                        <span>{activity.actor || 'System'}</span>
                        <span>•</span>
                        <span>
                          {activity.timestamp
                            ? new Date(activity.timestamp).toLocaleString(undefined, {
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })
                            : 'N/A'}
                        </span>
                      </div>
                    </div>
                  </div>
                  <span className="text-[9px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 px-1.5 py-0.5 rounded border border-indigo-200 dark:border-indigo-800 flex-shrink-0">
                    {activity.module || 'Event'}
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
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl max-w-3xl w-full p-6 space-y-4 animate-in fade-in zoom-in duration-150 flex flex-col max-h-[92vh]">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950/60 rounded-2xl text-indigo-600 border border-indigo-200 dark:border-indigo-800">
                  <Zap className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-black text-slate-900 dark:text-white tracking-tight">
                      System Health &amp; Performance Telemetry
                    </h3>
                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                      healthData?.status === 'ALL_SYSTEMS_OPERATIONAL' 
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                        : healthData?.status === 'OPERATIONAL_WITH_WARNINGS'
                        ? 'bg-amber-50 text-amber-700 border-amber-200'
                        : 'bg-rose-50 text-rose-700 border-rose-200'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${
                        healthData?.status === 'ALL_SYSTEMS_OPERATIONAL' ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
                      }`} />
                      {healthData?.status ? healthData.status.replace(/_/g, ' ') : 'OPERATIONAL'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Real-time container RAM, process uptime, OOM watchdog history, and microservice status.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsHealthModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Top Quick Telemetry KPIs */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 flex-shrink-0">
              {/* RAM Usage */}
              <div className="bg-slate-50 dark:bg-slate-800/80 p-3 rounded-2xl border border-slate-200 dark:border-slate-700">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">RAM Utilization</span>
                <span className={`text-sm font-black block mt-0.5 ${
                  (healthData?.memory?.peak_percent || 0) >= 88 
                    ? 'text-rose-600' 
                    : (healthData?.memory?.peak_percent || 0) >= 70 
                    ? 'text-amber-600' 
                    : 'text-indigo-600'
                }`}>
                  {healthData?.memory?.current_mb ? `${healthData.memory.current_mb} MB` : 'Evaluating...'}
                </span>
                <span className="text-[10px] text-slate-400 font-medium block">
                  Peak: {healthData?.memory?.peak_mb || 0} MB / {healthData?.memory?.limit_mb || 512} MB
                </span>
              </div>

              {/* Uptime & Restarts */}
              <div className="bg-slate-50 dark:bg-slate-800/80 p-3 rounded-2xl border border-slate-200 dark:border-slate-700">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Process Uptime</span>
                <span className="text-sm font-black text-emerald-600 block mt-0.5">
                  {healthData?.uptime_human || '< 1m'}
                </span>
                <span className={`text-[10px] font-medium block ${
                  (healthData?.restarts_24h || 0) > 0 ? 'text-amber-600 font-bold' : 'text-slate-400'
                }`}>
                  {healthData?.restarts_24h || 0} restart{(healthData?.restarts_24h || 0) === 1 ? '' : 's'} (24h)
                </span>
              </div>

              {/* DB Round-trip */}
              <div className="bg-slate-50 dark:bg-slate-800/80 p-3 rounded-2xl border border-slate-200 dark:border-slate-700">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">DB Round-trip</span>
                <span className="text-sm font-black text-indigo-600 block mt-0.5">
                  {healthData ? `${healthData.db_latency_ms} ms` : 'Evaluating...'}
                </span>
                <span className="text-[10px] text-slate-400 font-medium block">PostgreSQL Pool Active</span>
              </div>

              {/* Security Guard */}
              <div className="bg-slate-50 dark:bg-slate-800/80 p-3 rounded-2xl border border-slate-200 dark:border-slate-700">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Security Guard</span>
                <span className="text-sm font-black text-emerald-600 block mt-0.5">Active</span>
                <span className="text-[10px] text-slate-400 font-medium block">
                  {healthData?.failed_logins_24h ?? 0} Failed Logins (24h)
                </span>
              </div>

              {/* WORM Audit Chain */}
              <div className="bg-slate-50 dark:bg-slate-800/80 p-3 rounded-2xl border border-slate-200 dark:border-slate-700">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">WORM Chain (SHA-256)</span>
                <span className="text-sm font-black text-emerald-600 block mt-0.5 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                  {healthData?.audit_worm?.status || 'HEALTHY'}
                </span>
                <span className="text-[10px] text-slate-400 font-medium block">
                  {healthData?.audit_worm?.chained_count ?? 0} Chained Blocks
                </span>
              </div>
            </div>

            {/* Cryptographic WORM Audit Trail & Integrity Verification Card */}
            <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-3.5 rounded-2xl border border-slate-800 shadow-sm flex-shrink-0 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-start sm:items-center gap-3">
                <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex-shrink-0">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-white tracking-tight">
                      Cryptographic WORM Audit Trail (Phase 5)
                    </span>
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold border ${
                      wormVerifyResult
                        ? wormVerifyResult.is_valid
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                          : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                        : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${
                        wormVerifyResult?.is_valid === false ? 'bg-rose-400' : 'bg-emerald-400 animate-pulse'
                      }`} />
                      {wormVerifyResult 
                        ? (wormVerifyResult.is_valid ? '100% INTACT' : 'TAMPER DETECTED') 
                        : (healthData?.audit_worm?.status || 'CHAIN ACTIVE')}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-300 mt-0.5">
                    {wormVerifyResult ? (
                      wormVerifyResult.is_valid ? (
                        <span>Verified <strong className="text-white font-mono">{wormVerifyResult.records_verified}</strong> records against SHA-256 genesis root. Block: <code className="text-emerald-300 font-mono text-[10px]">{wormVerifyResult.latest_hash ? `${wormVerifyResult.latest_hash.slice(0, 16)}...` : 'Genesis'}</code></span>
                      ) : (
                        <span className="text-rose-300 font-bold">{wormVerifyResult.message}</span>
                      )
                    ) : (
                      <span>
                        SHA-256 sequential forward chain. Chained: <strong className="text-white">{healthData?.audit_worm?.chained_count || 0}</strong> events | Tip: <code className="text-slate-300 font-mono text-[10px]">{healthData?.audit_worm?.latest_hash_short || 'GENESIS'}</code>
                      </span>
                    )}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0 self-end sm:self-auto">
                <Link
                  to="/system-owner/audit-logs"
                  onClick={() => setIsHealthModalOpen(false)}
                  className="text-[11px] font-semibold text-indigo-300 hover:text-white px-2 py-1 transition-colors"
                >
                  Audit Page →
                </Link>
                {wormVerifyResult?.is_valid === false && wormVerifyResult?.status === 'BROKEN_CHAIN_LINK' && (
                  <button
                    type="button"
                    onClick={handleResealWormChain}
                    disabled={isResealingWorm || isVerifyingWorm}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-500 disabled:bg-slate-700 text-white rounded-xl text-xs font-bold shadow transition-all active:scale-95 border border-amber-400/30 cursor-pointer"
                  >
                    {isResealingWorm ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Re-sealing...</span>
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="w-3.5 h-3.5 text-amber-200" />
                        <span>Re-seal Chain Links</span>
                      </>
                    )}
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleVerifyWormChain}
                  disabled={isVerifyingWorm || isResealingWorm}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 text-white rounded-xl text-xs font-bold shadow transition-all active:scale-95 border border-emerald-400/30 cursor-pointer"
                >
                  {isVerifyingWorm ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Verifying Chain...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-200" />
                      <span>Verify Integrity Now</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Real-time RAM & OOM Gauge Card */}
            {healthData?.memory && (
              <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white p-4 rounded-2xl border border-slate-800 shadow-sm flex-shrink-0 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <Cpu className="w-4 h-4 text-indigo-400" />
                    <span className="font-bold tracking-tight">Container Memory Allocation &amp; Peak High-Watermark</span>
                  </div>
                  <span className="font-mono text-[11px] text-slate-300">
                    {healthData.memory.current_mb} MB ({healthData.memory.current_percent}%) of {healthData.memory.limit_mb} MB Limit
                  </span>
                </div>

                {/* Progress Bar with Peak Indicator */}
                <div className="relative w-full h-3 bg-slate-800 rounded-full overflow-hidden border border-slate-700">
                  {/* Current RAM Bar */}
                  <div 
                    className={`h-full rounded-full transition-all duration-500 ${
                      healthData.memory.peak_percent >= 88 
                        ? 'bg-rose-500' 
                        : healthData.memory.peak_percent >= 70 
                        ? 'bg-amber-500' 
                        : 'bg-gradient-to-r from-emerald-500 to-indigo-500'
                    }`}
                    style={{ width: `${Math.min(100, healthData.memory.current_percent)}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-[10px] text-slate-400">
                  <span>0 MB Baseline</span>
                  <span className="text-amber-300 font-semibold">
                    ▲ Peak Reached: {healthData.memory.peak_mb} MB ({healthData.memory.peak_percent}%)
                  </span>
                  <span>{healthData.memory.limit_mb} MB (Host OOM Ceiling)</span>
                </div>

                {/* Warning Message if Near OOM or Restarts Detected */}
                {((healthData.memory.peak_percent >= 75) || (healthData.restarts_24h > 0)) && (
                  <div className="mt-2 bg-amber-500/15 border border-amber-400/30 text-amber-200 p-2.5 rounded-xl text-xs flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-300 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-amber-300">Hosting Headroom Notice</p>
                      <p className="text-[11px] text-amber-200/90 mt-0.5">
                        {healthData.restarts_24h > 0 
                          ? `The watchdog detected ${healthData.restarts_24h} container reboot(s) in the last 24h. Peak memory reached ${healthData.memory.peak_mb} MB. Heavy concurrent batch jobs (Document AI / PDF generation) can push memory past the 512MB limit.`
                          : `Peak memory reached ${healthData.memory.peak_mb} MB (${healthData.memory.peak_percent}%). Monitor memory during large OCR or batch exports to avoid container eviction.`}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Navigation Tabs */}
            <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-1 flex-shrink-0">
              <button
                onClick={() => setTelemetryTab('subsystems')}
                className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                  telemetryTab === 'subsystems'
                    ? 'bg-indigo-600 text-white shadow-2xs'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                Subsystem Matrix ({healthData?.services?.length || 0})
              </button>
              <button
                onClick={() => setTelemetryTab('events')}
                className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                  telemetryTab === 'events'
                    ? 'bg-indigo-600 text-white shadow-2xs'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <span>Process &amp; Reboot Audit Trail</span>
                {healthData?.restarts_24h > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full text-[9px] font-black bg-amber-500 text-slate-900">
                    {healthData.restarts_24h}
                  </span>
                )}
              </button>
            </div>

            {/* Tab Content Area */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1 min-h-0">
              {telemetryTab === 'subsystems' ? (
                healthData?.services ? (
                  healthData.services.map((srv, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-slate-50/90 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700/80 flex items-center justify-between gap-3"
                    >
                      <div className="space-y-0.5 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-900 dark:text-white truncate">{srv.name}</span>
                          <span className="text-[9px] font-bold uppercase px-2 py-0.5 rounded-md bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 flex-shrink-0">
                            {srv.category}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">{srv.details}</p>
                      </div>
                      <div className="text-right space-y-0.5 flex-shrink-0">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${srv.badge}`}>
                          <CheckCircle2 className="w-3 h-3" />
                          {srv.status}
                        </span>
                        <span className="text-[10px] font-mono text-slate-400 block">{srv.latency}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-8 text-center text-xs text-slate-400">Loading subsystem matrix...</div>
                )
              ) : (
                /* Process Lifecycle & Reboot Events Timeline */
                <div className="space-y-2">
                  {healthData?.uptime_stats?.recent_events?.length > 0 ? (
                    healthData.uptime_stats.recent_events.map((evt) => (
                      <div 
                        key={evt.id} 
                        className={`p-3 rounded-2xl border flex items-start justify-between gap-3 ${
                          evt.event_type === 'CRASH_REBOOT' 
                            ? 'bg-rose-50/70 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900 text-rose-900 dark:text-rose-200' 
                            : evt.event_type === 'SHUTDOWN'
                            ? 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700'
                            : 'bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900 text-slate-800 dark:text-slate-200'
                        }`}
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            {evt.event_type === 'CRASH_REBOOT' ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-600 text-white">
                                <AlertTriangle className="w-3 h-3" /> UNEXPECTED RESTART DETECTED
                              </span>
                            ) : evt.event_type === 'SHUTDOWN' ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-600 text-white">
                                CLEAN SHUTDOWN
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-600 text-white">
                                SERVER STARTUP
                              </span>
                            )}
                            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                              {evt.action_type.replace(/SYSTEM_/g, '').replace(/_/g, ' ')}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-600 dark:text-slate-400">
                            {evt.details?.reason || (evt.event_type === 'CRASH_REBOOT' 
                              ? 'Previous instance terminated abruptly without graceful shutdown (e.g. OOM killer or host eviction).'
                              : `Instance booted in ${evt.details?.environment || 'Cloud'} with ${evt.details?.initial_rss_mb || 0} MB initial RAM.`
                            )}
                          </p>
                        </div>
                        <span className="text-[10px] font-mono text-slate-400 whitespace-nowrap">
                          {evt.formatted_time}
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="p-8 text-center bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-1">
                      <CheckCircle2 className="w-6 h-6 text-emerald-500 mx-auto" />
                      <p className="text-xs font-bold text-slate-700 dark:text-slate-300">No ungraceful crashes recorded</p>
                      <p className="text-[11px] text-slate-400">Current server instance is running continuously without interruptions.</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer with Live Ping Diagnostic */}
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between flex-shrink-0">
              <span className="text-[10px] text-slate-400 font-mono truncate max-w-xs">
                Host: {healthData?.environment || 'Multi-Tenant Production'} (PID {healthData?.memory?.pid || '—'})
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
