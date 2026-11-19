import React, { useState, useEffect, useCallback } from 'react';
import {
  BarChart3, Clock, AlertTriangle, ShieldCheck,
  FileText, ArrowRight, ArrowUpRight, Loader2, Activity, CheckCircle2,
  Calendar, Landmark, RefreshCw, Inbox, Lock,
  Globe, Building2, AlertCircle, Send, Layers, PieChart as PieChartIcon
} from 'lucide-react';
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip
} from 'recharts';
import { apiRequest } from '../../services/apiService';
import { useNavigate } from 'react-router-dom';
import { formatDate } from '../../utils/dateFormat';

const CHART_PALETTE = [
  '#4F46E5', // Indigo 600
  '#0EA5E9', // Sky 500
  '#10B981', // Emerald 500
  '#F59E0B', // Amber 500
  '#8B5CF6', // Violet 500
  '#EC4899', // Pink 500
  '#64748B', // Slate 500
];

const formatCompactMoney = (amount, currency = '') => {
  const num = Number(amount || 0);
  const abs = Math.abs(num);
  let formatted;
  if (abs >= 1_000_000_000) {
    formatted = `${(num / 1_000_000_000).toFixed(2)}B`;
  } else if (abs >= 1_000_000) {
    formatted = `${(num / 1_000_000).toFixed(2)}M`;
  } else if (abs >= 10_000) {
    formatted = `${(num / 1_000).toFixed(1)}K`;
  } else {
    formatted = num.toLocaleString(undefined, { maximumFractionDigits: 0 });
  }
  return currency ? `${currency} ${formatted}` : formatted;
};

const formatExactMoney = (amount, currency = '') => {
  const num = Number(amount || 0);
  const formatted = num.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
  return currency ? `${currency} ${formatted}` : formatted;
};

export default function TreasuryDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [selectedCurrency, setSelectedCurrency] = useState('');
  const [concentrationTab, setConcentrationTab] = useState('lg_type'); // 'lg_type' | 'currency' | 'entity'
  const [entitySubMode, setEntitySubMode] = useState('entity'); // 'entity' | 'department'
  const [pulseTab, setPulseTab] = useState('exceptions'); // 'exceptions' | 'activity'

  const fetchStats = useCallback(async (ccyOverride = selectedCurrency, isManual = false) => {
    if (isManual) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const qs = ccyOverride ? `?base_currency=${encodeURIComponent(ccyOverride)}` : '';
      const data = await apiRequest(`/issuance/dashboard-stats${qs}`, 'GET');
      setStats(data);
      if (data?.exceptions_feed?.length === 0 && pulseTab === 'exceptions') {
        // Keep exceptions tab if user explicitly clicked it, otherwise fine to show nominal state
      }
    } catch (err) {
      setError(err.message || 'Failed to load LG Issuance dashboard');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedCurrency]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchStats(selectedCurrency, Boolean(stats));
  }, [selectedCurrency]); // eslint-disable-line react-hooks/exhaustive-deps

  const s = stats || {};
  const baseCcy = s.base_currency || 'EGP';
  const exp = s.exposure_summary || {};
  const cap = s.capacity_summary || {};
  const col = s.collateral_summary || {};
  const gov = s.governance_queue || {};
  const conc = s.concentration || {};
  const facilities = s.facility_utilization || [];
  const pipeline = s.pipeline_stages || [];
  const maturityHorizon = s.maturity_horizon || [];
  const exceptions = s.exceptions_feed || [];
  const expiringLgs = s.expiring_lgs || [];
  const recentActivity = s.recent_activity || [];
  const availableCurrencies = s.available_currencies || [baseCcy];
  const fxRatesApplied = s.fx_rates_applied || {};

  const totalAttentionCount = (
    (gov.my_pending_approvals || 0) +
    (s.sla_breaches || 0) +
    (gov.discrepancy_count || 0) +
    (gov.expired_unreleased_count || 0) +
    (gov.unreconciled_variances_count || 0)
  );

  if (loading && !stats) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-indigo-600 mx-auto mb-3" />
          <p className="text-slate-600 font-medium text-sm">Loading LG Issuance Command Center...</p>
        </div>
      </div>
    );
  }

  if (error && !stats) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="bg-red-50 border border-red-200 rounded-2xl p-8 text-center max-w-md">
          <AlertTriangle className="w-8 h-8 text-red-500 mx-auto mb-3" />
          <h3 className="font-bold text-red-900 mb-1">Dashboard Unavailable</h3>
          <p className="text-sm text-red-600">{error}</p>
          <button
            onClick={() => fetchStats(selectedCurrency, false)}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-semibold hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const getUtilStyles = (pct) => {
    if (pct >= 90) return { bar: 'bg-red-500', soft: 'bg-red-100', badge: 'bg-red-50 text-red-700 border-red-200' };
    if (pct >= 75) return { bar: 'bg-amber-500', soft: 'bg-amber-100', badge: 'bg-amber-50 text-amber-700 border-amber-200' };
    return { bar: 'bg-emerald-500', soft: 'bg-slate-100', badge: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
  };

  const getSeverityBadge = (sev) => {
    if (sev === 'CRITICAL') return 'bg-red-100 text-red-800 border-red-200';
    if (sev === 'HIGH') return 'bg-amber-100 text-amber-800 border-amber-200';
    return 'bg-blue-50 text-blue-700 border-blue-200';
  };

  const getDaysBadge = (days) => {
    if (days <= 0) return 'bg-red-600 text-white border-red-600';
    if (days <= 7) return 'bg-red-50 text-red-700 border-red-200';
    if (days <= 30) return 'bg-amber-50 text-amber-700 border-amber-200';
    return 'bg-slate-100 text-slate-700 border-slate-200';
  };

  const lgTypeData = (conc.by_lg_type || []).map((item, idx) => ({
    ...item,
    color: CHART_PALETTE[idx % CHART_PALETTE.length],
  }));

  const entityOrDeptList = entitySubMode === 'entity' ? (conc.by_entity || []) : (conc.by_department || []);
  const fxNoteEntries = Object.entries(fxRatesApplied);

  return (
    <div className="space-y-6 pb-8">
      {/* ==================== 1. EXECUTIVE COMMAND BANNER ==================== */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white p-5 sm:p-6 shadow-lg border border-indigo-500/20">
        <div className="absolute -right-12 -top-12 w-56 h-56 rounded-full bg-indigo-500/10 blur-2xl pointer-events-none" />
        <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-indigo-300 text-xs font-bold uppercase tracking-widest">
              <Send className="w-3.5 h-3.5" />
              <span>Corporate Treasury · LG Issuance</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-white mt-1">
              Issuance Command Center
            </h1>
            <p className="text-slate-300 text-xs sm:text-sm mt-0.5">
              Contingent liability exposure, credit facility headroom, collateral &amp; live workflow governance
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Base Currency Switcher (shown when multiple currencies exist) */}
            {availableCurrencies.length > 1 && (
              <div
                className="inline-flex items-center bg-white/10 border border-white/15 rounded-xl p-1"
                title={
                  fxNoteEntries.length > 0
                    ? `Consolidated in ${baseCcy} using CBE rates (${fxNoteEntries.map(([c, r]) => `1 ${c} = ${Number(r).toFixed(2)} ${baseCcy}`).join(', ')})`
                    : `Consolidated in ${baseCcy}`
                }
              >
                <span className="text-[10px] uppercase tracking-wider text-slate-300 px-2 font-semibold">
                  Base
                </span>
                {availableCurrencies.slice(0, 4).map((ccy) => (
                  <button
                    key={ccy}
                    type="button"
                    onClick={() => setSelectedCurrency(ccy)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all shadow-none focus:ring-0 ${
                      baseCcy === ccy
                        ? 'bg-indigo-500 text-white shadow-sm'
                        : 'text-slate-300 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    {ccy}
                  </button>
                ))}
              </div>
            )}

            <button
              type="button"
              onClick={() => fetchStats(selectedCurrency, true)}
              disabled={refreshing}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-xs font-semibold text-slate-200 transition-all shadow-none"
              title="Refresh live telemetry"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>

            <button
              type="button"
              onClick={() => navigate('/corporate-admin/reports/issuance-intelligence')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-xs font-semibold text-white transition-all shadow-none"
            >
              <BarChart3 className="w-3.5 h-3.5 text-indigo-300" />
              <span>Analytics &amp; Reports</span>
              <ArrowUpRight className="w-3.5 h-3.5 text-indigo-300" />
            </button>

            <button
              type="button"
              onClick={() => navigate('/corporate-admin/approval-requests')}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-500 hover:bg-indigo-400 text-white text-xs font-bold transition-all shadow-md"
              title="Open Approval Center to review pending governance requests"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Approval Center</span>
              {(gov.my_pending_approvals || 0) > 0 && (
                <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-white text-indigo-700 text-[10px] font-extrabold">
                  {gov.my_pending_approvals}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* FX Transparency Strip when multi-currency conversion is active */}
        {fxNoteEntries.length > 0 && (
          <div className="mt-4 pt-3 border-t border-white/10 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-300">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-indigo-300 font-semibold">FX Consolidation ({baseCcy}):</span>
              {fxNoteEntries.map(([code, rate]) => (
                <span key={code} className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 font-mono text-[10.5px]">
                  1 {code} = {Number(rate).toFixed(2)} {baseCcy}
                </span>
              ))}
            </div>
            {(s.fx_unconverted_currencies || []).length > 0 && (
              <span className="text-amber-300 text-[11px]">
                Note: No CBE rate on file for {s.fx_unconverted_currencies.join(', ')} (shown at 1:1 nominal)
              </span>
            )}
          </div>
        )}
      </div>

      {/* ==================== 2. FOUR CORE EXECUTIVE PILLARS ==================== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* Pillar 1: Active Contingent Exposure */}
        <div
          onClick={() => navigate('/corporate-admin/issuance/issued-lgs')}
          className="bg-white rounded-2xl border border-slate-200/90 p-5 cursor-pointer hover:shadow-md hover:border-indigo-300 transition-all group relative overflow-hidden"
        >
          <div className="absolute inset-x-0 top-0 h-1 bg-indigo-600" />
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Active Contingent Exposure
              </p>
              <p
                className="text-2xl font-extrabold text-slate-900 mt-1.5 tracking-tight"
                title={formatExactMoney(exp.total_active_base_amount ?? s.total_active_amount, baseCcy)}
              >
                {formatCompactMoney(exp.total_active_base_amount ?? s.total_active_amount, baseCcy)}
              </p>
            </div>
            <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-600 group-hover:bg-indigo-100 transition-colors">
              <ShieldCheck className="w-5 h-5" />
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs">
            <span className="font-semibold text-slate-700">
              {exp.total_active_lgs ?? s.total_active_lgs ?? 0} Live LGs
            </span>
            {(exp.in_flight_lgs_count || 0) > 0 ? (
              <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-semibold text-[11px]">
                +{exp.in_flight_lgs_count} In-Flight ({formatCompactMoney(exp.in_flight_base_amount, baseCcy)})
              </span>
            ) : (
              <span className="text-slate-400 text-[11px]">No in-flight execution</span>
            )}
          </div>

          {(exp.by_currency || []).length > 1 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {exp.by_currency.slice(0, 3).map((c) => (
                <span
                  key={c.currency}
                  className="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[10.5px] font-medium"
                  title={formatExactMoney(c.amount, c.currency)}
                >
                  {formatCompactMoney(c.amount, c.currency)} ({c.count})
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Pillar 2: Credit Facility Headroom */}
        <div
          onClick={() => navigate('/corporate-admin/issuance/facilities')}
          className="bg-white rounded-2xl border border-slate-200/90 p-5 cursor-pointer hover:shadow-md hover:border-emerald-300 transition-all group relative overflow-hidden"
        >
          <div className={`absolute inset-x-0 top-0 h-1 ${(cap.overall_utilization_pct || 0) >= 85 ? 'bg-amber-500' : 'bg-emerald-500'}`} />
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Available Facility Headroom
              </p>
              <p
                className="text-2xl font-extrabold text-slate-900 mt-1.5 tracking-tight"
                title={formatExactMoney(cap.total_headroom_base, baseCcy)}
              >
                {(cap.active_facilities_count || 0) > 0
                  ? formatCompactMoney(cap.total_headroom_base, baseCcy)
                  : 'No Active Lines'}
              </p>
            </div>
            <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600 group-hover:bg-emerald-100 transition-colors">
              <Landmark className="w-5 h-5" />
            </div>
          </div>

          <div className="mt-3">
            <div className="flex justify-between text-[11px] font-semibold mb-1">
              <span className="text-slate-600">
                Line Utilization: {cap.overall_utilization_pct || 0}%
              </span>
              <span className="text-slate-400">
                of {formatCompactMoney(cap.total_limit_base, baseCcy)}
              </span>
            </div>
            <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700 ${
                  (cap.overall_utilization_pct || 0) >= 90
                    ? 'bg-red-500'
                    : (cap.overall_utilization_pct || 0) >= 75
                    ? 'bg-amber-500'
                    : 'bg-emerald-500'
                }`}
                style={{ width: `${Math.min(cap.overall_utilization_pct || 0, 100)}%` }}
              />
            </div>
          </div>

          <div className="mt-2.5 flex items-center justify-between text-[11px] text-slate-500">
            <span>
              {cap.active_facilities_count || 0} Facilities · {cap.banks_count || 0} Banks
            </span>
            {(cap.high_utilization_count || 0) > 0 && (
              <span className="text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded font-bold">
                {cap.high_utilization_count} ≥ 80% used
              </span>
            )}
          </div>
        </div>

        {/* Pillar 3: Locked Cash Margin (Liquidity Tie-Up) */}
        <div
          onClick={() => navigate('/corporate-admin/issuance/facilities')}
          className="bg-white rounded-2xl border border-slate-200/90 p-5 cursor-pointer hover:shadow-md hover:border-sky-300 transition-all group relative overflow-hidden"
        >
          <div className="absolute inset-x-0 top-0 h-1 bg-sky-500" />
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Cash Margin Locked
              </p>
              <p
                className="text-2xl font-extrabold text-slate-900 mt-1.5 tracking-tight"
                title={formatExactMoney(col.locked_cash_margin_base, baseCcy)}
              >
                {formatCompactMoney(col.locked_cash_margin_base || 0, baseCcy)}
              </p>
            </div>
            <div className="p-2.5 rounded-xl bg-sky-50 text-sky-600 group-hover:bg-sky-100 transition-colors">
              <Lock className="w-5 h-5" />
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-600 font-medium">
              Avg Margin: <strong className="text-slate-900">{col.weighted_avg_margin_pct || 0}%</strong>
            </span>
            <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-semibold text-[11px]">
              {col.unsecured_lgs_count || 0} Clean / {col.cash_backed_lgs_count || 0} Cash-Backed
            </span>
          </div>

          <p className="mt-2 text-[11px] text-slate-400">
            Clean credit exposure: {formatCompactMoney(col.clean_credit_exposure_base || 0, baseCcy)}
          </p>
        </div>

        {/* Pillar 4: Governance & Action Queue */}
        <div
          onClick={() => navigate('/corporate-admin/approval-requests')}
          className="bg-white rounded-2xl border border-slate-200/90 p-5 cursor-pointer hover:shadow-md hover:border-amber-300 transition-all group relative overflow-hidden"
        >
          <div className={`absolute inset-x-0 top-0 h-1 ${totalAttentionCount > 0 ? 'bg-amber-500' : 'bg-emerald-500'}`} />
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Action &amp; Governance Queue
              </p>
              <div className="flex items-baseline gap-2 mt-1.5">
                <p className={`text-2xl font-extrabold tracking-tight ${totalAttentionCount > 0 ? 'text-slate-900' : 'text-emerald-700'}`}>
                  {totalAttentionCount}
                </p>
                <span className="text-xs font-medium text-slate-500">
                  {totalAttentionCount === 1 ? 'item needs review' : 'items need review'}
                </span>
              </div>
            </div>
            <div className={`p-2.5 rounded-xl transition-colors ${totalAttentionCount > 0 ? 'bg-amber-50 text-amber-600 group-hover:bg-amber-100' : 'bg-emerald-50 text-emerald-600'}`}>
              <Inbox className="w-5 h-5" />
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-slate-100 flex flex-wrap gap-1.5">
            <span className={`px-2 py-0.5 rounded-md text-[11px] font-semibold ${(gov.my_pending_approvals || 0) > 0 ? 'bg-indigo-50 text-indigo-700' : 'bg-slate-100 text-slate-500'}`}>
              {gov.my_pending_approvals || 0} My Approvals
            </span>
            {(s.sla_breaches || 0) > 0 && (
              <span className="px-2 py-0.5 rounded-md bg-red-50 text-red-700 text-[11px] font-semibold">
                {s.sla_breaches} SLA Breach
              </span>
            )}
            {(gov.discrepancy_count || 0) > 0 && (
              <span className="px-2 py-0.5 rounded-md bg-red-50 text-red-700 text-[11px] font-semibold">
                {gov.discrepancy_count} Discrepancy
              </span>
            )}
            {(gov.expired_unreleased_count || 0) > 0 && (
              <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 text-[11px] font-semibold">
                {gov.expired_unreleased_count} Expired Unclosed
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ==================== 3. LIVE ISSUANCE PIPELINE RIBBON ==================== */}
      {pipeline.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3.5">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-600" />
              <h2 className="text-sm font-bold text-slate-800">Live Issuance Lifecycle Pipeline</h2>
            </div>
            {(gov.urgent_requests_count || 0) > 0 && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-red-50 border border-red-200 text-red-700 text-[11px] font-bold">
                <AlertCircle className="w-3 h-3" />
                {gov.urgent_requests_count} Urgent Request{gov.urgent_requests_count > 1 ? 's' : ''} in Queue
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5">
            {pipeline.map((st, idx) => {
              const isActionStage = idx < 5 && st.count > 0;
              return (
                <button
                  key={st.key}
                  type="button"
                  onClick={() => navigate(st.path)}
                  className={`text-left p-3 rounded-xl border transition-all shadow-none focus:ring-0 group ${
                    isActionStage
                      ? 'bg-indigo-50/40 border-indigo-200 hover:bg-indigo-50 hover:border-indigo-300'
                      : 'bg-slate-50/70 border-slate-200/70 hover:bg-slate-100/80'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Step {idx + 1}
                    </span>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-indigo-600 transition-colors" />
                  </div>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className={`text-xl font-extrabold ${isActionStage ? 'text-indigo-700' : 'text-slate-800'}`}>
                      {st.count}
                    </span>
                    {st.base_amount > 0 && (
                      <span className="text-[11px] font-semibold text-slate-500 truncate">
                        {formatCompactMoney(st.base_amount, baseCcy)}
                      </span>
                    )}
                  </div>
                  <p className="text-xs font-bold text-slate-800 mt-1 truncate">{st.label}</p>
                  <p className="text-[10.5px] text-slate-500 truncate">{st.sublabel}</p>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ==================== 4. CAPACITY & PORTFOLIO CONCENTRATION ==================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left (7 cols): Facility Utilization, Headroom & Bank SLA Health */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200/90 flex flex-col overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Landmark className="w-4 h-4 text-indigo-600" />
                Banking Partner Facilities &amp; SLA Performance
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                True currency-normalized utilization, reserved pipeline &amp; empirical bank turnaround
              </p>
            </div>
            <button
              type="button"
              onClick={() => navigate('/corporate-admin/issuance/facilities')}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 shadow-none bg-transparent"
            >
              Manage Lines →
            </button>
          </div>

          <div className="p-5 space-y-4 max-h-[390px] overflow-y-auto flex-1">
            {facilities.length === 0 ? (
              <div className="py-12 text-center">
                <Landmark className="w-9 h-9 text-slate-300 mx-auto mb-2" />
                <p className="text-sm font-semibold text-slate-600">No Active Credit Facilities Configured</p>
                <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
                  Add banking credit lines and sub-limits to track facility headroom, margin rules, and SLA compliance.
                </p>
                <button
                  type="button"
                  onClick={() => navigate('/corporate-admin/issuance/facilities')}
                  className="mt-4 px-3.5 py-1.5 rounded-lg bg-indigo-50 text-indigo-700 text-xs font-bold hover:bg-indigo-100 shadow-none"
                >
                  Configure Facilities
                </button>
              </div>
            ) : (
              facilities.map((fac, i) => {
                const styles = getUtilStyles(fac.used_pct || 0);
                const issuedPct = fac.total_limit > 0 ? Math.min(100, ((fac.issued_utilized ?? fac.utilized) / fac.total_limit) * 100) : 0;
                const reservedPct = fac.total_limit > 0 ? Math.min(100 - issuedPct, ((fac.reserved_utilized || 0) / fac.total_limit) * 100) : 0;

                return (
                  <div
                    key={fac.facility_id || i}
                    className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition-colors space-y-2.5"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-bold text-slate-900">{fac.bank}</span>
                          <span className="text-xs text-slate-500">· {fac.facility_name}</span>
                          {fac.review_or_expiry_soon && (
                            <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 text-[10px] font-bold">
                              {fac.days_to_expiry != null && fac.days_to_expiry <= 30
                                ? `Line expires in ${fac.days_to_expiry}d`
                                : 'Review due'}
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-2 mt-1 text-[11px] text-slate-500">
                          <span>
                            Limit: <strong className="text-slate-700">{formatCompactMoney(fac.total_limit, fac.currency)}</strong>
                          </span>
                          <span>·</span>
                          <span>
                            Headroom: <strong className="text-emerald-700">{formatCompactMoney(fac.available, fac.currency)}</strong>
                          </span>
                          {fac.default_margin_pct > 0 ? (
                            <>
                              <span>·</span>
                              <span>{fac.default_margin_pct}% Margin</span>
                            </>
                          ) : (
                            <>
                              <span>·</span>
                              <span className="text-emerald-600 font-medium">0% Clean Line</span>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {/* Empirical SLA Badge */}
                        <span
                          className={`px-2 py-0.5 rounded-md border text-[10.5px] font-semibold ${
                            fac.slippage_risk
                              ? 'bg-amber-50 text-amber-800 border-amber-200'
                              : 'bg-white text-slate-600 border-slate-200'
                          }`}
                          title={
                            fac.actual_sla_days != null
                              ? `Actual EMA Turnaround: ${fac.actual_sla_days} business days vs Agreed ${fac.agreed_sla_days}d (${fac.sla_commitment_pct}% on-time)`
                              : `Contractual Agreed SLA: ${fac.agreed_sla_days} business days`
                          }
                        >
                          SLA: {fac.actual_sla_days != null ? `${fac.actual_sla_days}d actual` : `${fac.agreed_sla_days}d agreed`}
                          {fac.sla_commitment_pct != null ? ` (${Math.round(fac.sla_commitment_pct)}%)` : ''}
                        </span>

                        <span className={`px-2 py-0.5 rounded-md border text-xs font-extrabold ${styles.badge}`}>
                          {fac.used_pct}%
                        </span>
                      </div>
                    </div>

                    {/* Stacked Utilization Bar (Issued + Reserved) */}
                    <div className="w-full h-2.5 rounded-full bg-slate-200/80 overflow-hidden flex">
                      <div
                        className={`${styles.bar} h-full transition-all duration-700`}
                        style={{ width: `${issuedPct}%` }}
                        title={`Issued Exposure: ${formatExactMoney(fac.issued_utilized ?? fac.utilized, fac.currency)}`}
                      />
                      {reservedPct > 0 && (
                        <div
                          className="bg-indigo-400 h-full transition-all duration-700"
                          style={{ width: `${reservedPct}%` }}
                          title={`Reserved Pipeline: ${formatExactMoney(fac.reserved_utilized, fac.currency)}`}
                        />
                      )}
                    </div>

                    {(fac.reserved_utilized || 0) > 0 && (
                      <div className="flex items-center gap-4 text-[10.5px] text-slate-500">
                        <span className="inline-flex items-center gap-1">
                          <span className={`w-2 h-2 rounded-full ${styles.bar}`} />
                          Issued: {formatCompactMoney(fac.issued_utilized, fac.currency)}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-indigo-400" />
                          Reserved: {formatCompactMoney(fac.reserved_utilized, fac.currency)}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right (5 cols): Portfolio Concentration Lens */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200/90 flex flex-col overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-100 flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <PieChartIcon className="w-4 h-4 text-indigo-600" />
              Portfolio Concentration
            </h3>
            <div className="inline-flex rounded-lg bg-slate-100 p-0.5">
              {[
                { id: 'lg_type', label: 'LG Type' },
                { id: 'currency', label: 'Currency & Risk' },
                { id: 'entity', label: 'Entity / Dept' },
              ].map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setConcentrationTab(t.id)}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all shadow-none focus:ring-0 ${
                    concentrationTab === t.id
                      ? 'bg-white text-indigo-700 shadow-sm'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div className="p-5 flex-1 flex flex-col justify-between">
            {concentrationTab === 'lg_type' && (
              lgTypeData.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-sm">
                  No active LG exposure to classify yet.
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="h-48 w-full relative">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={lgTypeData}
                          dataKey="base_amount"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          innerRadius={54}
                          outerRadius={78}
                          paddingAngle={3}
                        >
                          {lgTypeData.map((entry, idx) => (
                            <Cell key={entry.name || idx} fill={entry.color} />
                          ))}
                        </Pie>
                        <RechartsTooltip
                          formatter={(val, name, props) => [
                            `${formatExactMoney(val, baseCcy)} (${props?.payload?.share_pct || 0}%)`,
                            name,
                          ]}
                          contentStyle={{
                            borderRadius: '10px',
                            border: '1px solid #E2E8F0',
                            fontSize: '12px',
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Active</span>
                      <span className="text-sm font-extrabold text-slate-900">
                        {formatCompactMoney(exp.total_active_base_amount ?? s.total_active_amount, baseCcy)}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                    {lgTypeData.map((item) => (
                      <div key={item.name} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                          <span className="font-medium text-slate-700 truncate">{item.name}</span>
                          <span className="text-[10.5px] text-slate-400">({item.count})</span>
                        </div>
                        <div className="text-right shrink-0 ml-2">
                          <span className="font-bold text-slate-900">{formatCompactMoney(item.base_amount, baseCcy)}</span>
                          <span className="text-[11px] text-slate-400 ml-1.5">{item.share_pct}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            )}

            {concentrationTab === 'currency' && (
              <div className="space-y-5">
                <div className="space-y-3">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Currency Denomination Mix
                  </p>
                  {(exp.by_currency || []).length === 0 ? (
                    <p className="text-xs text-slate-400 italic py-4">No active currency exposure.</p>
                  ) : (
                    exp.by_currency.map((c, idx) => (
                      <div key={c.currency} className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="font-bold text-slate-800">
                            {c.currency} <span className="font-normal text-slate-400">· {c.count} LGs</span>
                          </span>
                          <span className="font-semibold text-slate-700">
                            {formatExactMoney(c.amount, c.currency)} ({c.share_pct}%)
                          </span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${Math.min(c.share_pct || 0, 100)}%`,
                              backgroundColor: CHART_PALETTE[idx % CHART_PALETTE.length],
                            }}
                          />
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <div className="pt-3 border-t border-slate-100">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2.5">
                    Structural Risk Indicators
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-center">
                      <Globe className="w-4 h-4 text-indigo-500 mx-auto mb-1" />
                      <p className="text-base font-extrabold text-slate-900">{exp.cross_border_count || 0}</p>
                      <p className="text-[10px] text-slate-500 font-medium">Cross-Border</p>
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-center">
                      <Clock className="w-4 h-4 text-amber-500 mx-auto mb-1" />
                      <p className="text-base font-extrabold text-slate-900">{exp.non_operative_count || 0}</p>
                      <p className="text-[10px] text-slate-500 font-medium">Non-Operative</p>
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-center">
                      <Building2 className="w-4 h-4 text-sky-500 mx-auto mb-1" />
                      <p className="text-base font-extrabold text-slate-900">{exp.third_party_count || 0}</p>
                      <p className="text-[10px] text-slate-500 font-medium">Third-Party</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {concentrationTab === 'entity' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Internal Line Consumption
                  </span>
                  <div className="inline-flex rounded-md bg-slate-100 p-0.5">
                    <button
                      type="button"
                      onClick={() => setEntitySubMode('entity')}
                      className={`px-2 py-0.5 rounded text-[10.5px] font-semibold shadow-none ${
                        entitySubMode === 'entity' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
                      }`}
                    >
                      Entities
                    </button>
                    <button
                      type="button"
                      onClick={() => setEntitySubMode('department')}
                      className={`px-2 py-0.5 rounded text-[10.5px] font-semibold shadow-none ${
                        entitySubMode === 'department' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
                      }`}
                    >
                      Departments
                    </button>
                  </div>
                </div>

                {entityOrDeptList.length === 0 ? (
                  <p className="text-xs text-slate-400 italic py-8 text-center">No active allocations recorded.</p>
                ) : (
                  <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
                    {entityOrDeptList.slice(0, 6).map((item, idx) => (
                      <div key={item.name} className="space-y-1">
                        <div className="flex justify-between items-baseline text-xs gap-2">
                          <span className="font-semibold text-slate-800 truncate">
                            {item.name}
                            {item.code ? <span className="text-slate-400 font-mono text-[10.5px] ml-1">[{item.code}]</span> : null}
                          </span>
                          <span className="font-bold text-slate-900 shrink-0">
                            {formatCompactMoney(item.base_amount, baseCcy)}{' '}
                            <span className="text-[10.5px] font-normal text-slate-400">({item.count})</span>
                          </span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-indigo-500"
                            style={{
                              width: `${Math.max(4, Math.min(item.share_pct || 0, 100))}%`,
                              opacity: Math.max(0.45, 1 - idx * 0.1),
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ==================== 5. MATURITY RADAR & GOVERNANCE PULSE ==================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left (6 cols): 90-Day Maturity & Stale Rollover Radar */}
        <div className="lg:col-span-6 bg-white rounded-2xl border border-slate-200/90 overflow-hidden flex flex-col">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-amber-600" />
                Maturity &amp; Rollover Horizon (90 Days)
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Upcoming expiries &amp; expired guarantees still awaiting formal release
              </p>
            </div>
            <button
              type="button"
              onClick={() => navigate('/corporate-admin/action-center')}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 shadow-none bg-transparent"
            >
              Action Center →
            </button>
          </div>

          {/* Horizon Bucket Strip */}
          {maturityHorizon.length > 0 && (
            <div className="px-5 pt-4 pb-2 grid grid-cols-3 sm:grid-cols-5 gap-2">
              {maturityHorizon
                .filter((b) => ['expired_unclosed', 'critical_7d', 'near_30d', 'mid_60d', 'quarter_90d'].includes(b.key))
                .map((b) => {
                  const isAlert = b.key === 'expired_unclosed' && b.count > 0;
                  const isWarn = b.key === 'critical_7d' && b.count > 0;
                  return (
                    <div
                      key={b.key}
                      className={`p-2.5 rounded-xl border text-center ${
                        isAlert
                          ? 'bg-red-50 border-red-200'
                          : isWarn
                          ? 'bg-amber-50 border-amber-200'
                          : 'bg-slate-50 border-slate-100'
                      }`}
                    >
                      <p className={`text-lg font-extrabold ${isAlert ? 'text-red-700' : isWarn ? 'text-amber-700' : 'text-slate-800'}`}>
                        {b.count}
                      </p>
                      <p className="text-[10px] font-semibold text-slate-500 truncate">
                        {b.key === 'expired_unclosed' ? 'Expired*' : b.label}
                      </p>
                    </div>
                  );
                })}
            </div>
          )}

          {/* Expiring LGs Watchlist */}
          <div className="divide-y divide-slate-100 max-h-[280px] overflow-y-auto flex-1 mt-2">
            {expiringLgs.length === 0 ? (
              <div className="p-8 text-center">
                <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                <p className="text-sm font-semibold text-slate-700">No Imminent Expiries in Next 90 Days</p>
                <p className="text-xs text-slate-400 mt-0.5">All dated active guarantees mature beyond 90 days.</p>
              </div>
            ) : (
              expiringLgs.map((lg) => (
                <div
                  key={lg.id}
                  onClick={() => navigate('/corporate-admin/issuance/issued-lgs')}
                  className="px-5 py-3 flex items-center justify-between hover:bg-slate-50 cursor-pointer transition-colors gap-3"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-bold text-slate-900 truncate">{lg.ref}</p>
                      {lg.entity && (
                        <span className="px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 text-[10px] font-mono">
                          {lg.entity}
                        </span>
                      )}
                      {lg.reference_exceeded && (
                        <span className="px-1.5 py-0.2 rounded bg-red-50 text-red-700 text-[10px] font-bold">
                          Exceeds Contract
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 truncate mt-0.5">
                      {lg.beneficiary} · {lg.bank} ({lg.lg_type})
                    </p>
                  </div>
                  <div className="flex items-center gap-2.5 shrink-0">
                    <div className="text-right">
                      <p className="text-xs font-bold text-slate-800">
                        {formatCompactMoney(lg.amount, lg.currency)}
                      </p>
                      <p className="text-[10px] text-slate-400">{formatDate(lg.expiry_date)}</p>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-[10.5px] font-bold border ${getDaysBadge(lg.days_remaining)}`}>
                      {lg.days_remaining}d
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right (6 cols): Governance Exceptions & Recent Treasury Pulse */}
        <div className="lg:col-span-6 bg-white rounded-2xl border border-slate-200/90 overflow-hidden flex flex-col">
          <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between gap-2">
            <div className="inline-flex rounded-lg bg-slate-100 p-0.5">
              <button
                type="button"
                onClick={() => setPulseTab('exceptions')}
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold transition-all shadow-none focus:ring-0 ${
                  pulseTab === 'exceptions' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <AlertTriangle className={`w-3.5 h-3.5 ${exceptions.length > 0 ? 'text-amber-500' : 'text-emerald-500'}`} />
                <span>Exceptions &amp; Risks</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${exceptions.length > 0 ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-700'}`}>
                  {exceptions.length}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setPulseTab('activity')}
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold transition-all shadow-none focus:ring-0 ${
                  pulseTab === 'activity' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <Activity className="w-3.5 h-3.5 text-indigo-500" />
                <span>Recent Activity</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => navigate('/corporate-admin/activity')}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 shadow-none bg-transparent"
            >
              Audit Feed →
            </button>
          </div>

          {pulseTab === 'exceptions' ? (
            <div className="divide-y divide-slate-100 max-h-[360px] overflow-y-auto flex-1">
              {exceptions.length === 0 ? (
                <div className="p-10 text-center">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-3">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <p className="text-sm font-bold text-slate-900">All Governance Controls Nominal</p>
                  <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                    Zero SLA breaches, scan verification discrepancies, stale unreleased guarantees, or open position variances.
                  </p>
                </div>
              ) : (
                exceptions.map((ex, idx) => (
                  <div
                    key={`${ex.category}-${idx}`}
                    onClick={() => navigate(ex.path || '/corporate-admin/action-center')}
                    className="px-5 py-3.5 flex items-start justify-between gap-3 hover:bg-slate-50 cursor-pointer transition-colors group"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`px-1.5 py-0.5 rounded border text-[9.5px] font-extrabold uppercase tracking-wider ${getSeverityBadge(ex.severity)}`}>
                          {ex.severity}
                        </span>
                        <p className="text-xs font-bold text-slate-900 truncate">{ex.title}</p>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1">{ex.detail}</p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-indigo-600 shrink-0 mt-1 transition-colors" />
                  </div>
                ))
              )}
            </div>
          ) : (
            <div className="divide-y divide-slate-100 max-h-[360px] overflow-y-auto flex-1">
              {recentActivity.length === 0 ? (
                <div className="p-10 text-center text-slate-400 text-sm">No recent issuance activity recorded.</div>
              ) : (
                recentActivity.map((item, idx) => (
                  <div key={idx} className="px-5 py-3 flex items-center justify-between gap-3 hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="p-2 rounded-lg bg-slate-100 text-indigo-600 shrink-0">
                        {item.type === 'ISSUED' ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        ) : (
                          <FileText className="w-4 h-4 text-indigo-600" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-900 truncate">
                          {item.ref}
                          {item.amount ? (
                            <span className="ml-2 font-semibold text-indigo-700">
                              {formatCompactMoney(item.amount, item.currency)}
                            </span>
                          ) : null}
                        </p>
                        <p className="text-[11px] text-slate-500 truncate">{item.description}</p>
                      </div>
                    </div>
                    <span className="text-[10.5px] text-slate-400 shrink-0">
                      {item.timestamp ? formatDate(item.timestamp, '') : ''}
                    </span>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
