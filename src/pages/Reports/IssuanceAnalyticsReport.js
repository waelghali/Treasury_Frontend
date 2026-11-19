import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Landmark, ShieldCheck, Lock, Coins, RefreshCw,
  Download, FileSpreadsheet, Printer, Building2, Filter, CheckCircle2,
  ArrowUpDown, Layers, TrendingUp, Send, Calendar, Award
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  Legend, ResponsiveContainer, Cell
} from 'recharts';
import * as XLSX from 'xlsx';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import { apiRequest } from '../../services/apiService';
import FormattedDateInput from '../../components/FormattedDateInput';
import CustomExportModal from '../../components/Modals/CustomExportModal';
import { formatDate } from '../../utils/dateFormat';

const toISODate = (d) => d.toISOString().split('T')[0];

const computePresetDates = (preset) => {
  const end = new Date();
  const start = new Date();
  if (preset === '30D') {
    start.setDate(end.getDate() - 30);
  } else if (preset === '90D') {
    start.setDate(end.getDate() - 90);
  } else if (preset === 'YTD') {
    start.setMonth(0, 1);
  } else if (preset === '12M') {
    start.setFullYear(end.getFullYear() - 1);
  } else {
    start.setDate(end.getDate() - 90);
  }
  return { start: toISODate(start), end: toISODate(end) };
};

const formatCompact = (amount, currency = '') => {
  const num = Number(amount || 0);
  const abs = Math.abs(num);
  let txt;
  if (abs >= 1_000_000_000) txt = `${(num / 1_000_000_000).toFixed(2)}B`;
  else if (abs >= 1_000_000) txt = `${(num / 1_000_000).toFixed(2)}M`;
  else if (abs >= 10_000) txt = `${(num / 1_000).toFixed(1)}K`;
  else txt = num.toLocaleString(undefined, { maximumFractionDigits: 0 });
  return currency ? `${currency} ${txt}` : txt;
};

const formatExact = (amount, currency = '') => {
  const num = Number(amount || 0);
  const txt = num.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  return currency ? `${currency} ${txt}` : txt;
};

export default function IssuanceAnalyticsReport() {
  const navigate = useNavigate();
  const initialDates = useMemo(() => computePresetDates('90D'), []);

  const [preset, setPreset] = useState('90D');
  const [startDate, setStartDate] = useState(initialDates.start);
  const [endDate, setEndDate] = useState(initialDates.end);
  const [entityId, setEntityId] = useState('');
  const [bankId, setBankId] = useState('');
  const [baseCurrency, setBaseCurrency] = useState('');

  const [activeTab, setActiveTab] = useState('portfolio'); // 'portfolio' | 'banks' | 'operations'
  const [allocDim, setAllocDim] = useState('by_entity'); // 'by_entity' | 'by_department' | 'by_project' | 'by_lg_type' | 'by_beneficiary'
  const [bankSort, setBankSort] = useState({ field: 'active_exposure_base', dir: 'desc' });
  const [showCustomExport, setShowCustomExport] = useState(false);

  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchAnalytics = useCallback(async (isManual = false) => {
    if (isManual) setRefreshing(true);
    else setLoading(true);
    try {
      const params = new URLSearchParams();
      if (startDate) params.append('start_date', startDate);
      if (endDate) params.append('end_date', endDate);
      if (entityId) params.append('entity_id', entityId);
      if (bankId) params.append('bank_id', bankId);
      if (baseCurrency) params.append('base_currency', baseCurrency);

      const data = await apiRequest(`/issuance/analytics-report?${params.toString()}`, 'GET');
      setReport(data);
    } catch (err) {
      toast.error(`Failed to load LG Issuance report: ${err.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [startDate, endDate, entityId, bankId, baseCurrency]);

  useEffect(() => {
    fetchAnalytics(Boolean(report));
  }, [fetchAnalytics]); // eslint-disable-line react-hooks/exhaustive-deps

  const handlePresetClick = (nextPreset) => {
    setPreset(nextPreset);
    if (nextPreset !== 'CUSTOM') {
      const d = computePresetDates(nextPreset);
      setStartDate(d.start);
      setEndDate(d.end);
    }
  };

  const r = report || {};
  const baseCcy = r.base_currency || 'EGP';
  const kpis = r.executive_kpis || {};
  const ladder = r.maturity_ladder || [];
  const watchItems = r.maturity_watch_items || [];
  const allocations = r.allocations || {};
  const bankScorecard = useMemo(() => r.bank_scorecard || [], [r.bank_scorecard]);
  const velocity = r.operational_velocity || {};
  const turnaround = velocity.turnaround || {};
  const funnel = velocity.period_funnel || {};
  const maintByType = velocity.maintenance_by_type || {};
  const verifQuality = velocity.verification_quality || {};
  const monthlyTrend = velocity.monthly_trend || [];
  const filterOpts = r.filter_options || { entities: [], banks: [] };
  const availableCurrencies = r.available_currencies || [baseCcy];

  const sortedBanks = useMemo(() => {
    const arr = [...bankScorecard];
    const { field, dir } = bankSort;
    arr.sort((a, b) => {
      const va = a[field] ?? -1;
      const vb = b[field] ?? -1;
      if (typeof va === 'string') {
        return dir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va);
      }
      return dir === 'asc' ? Number(va) - Number(vb) : Number(vb) - Number(va);
    });
    return arr;
  }, [bankScorecard, bankSort]);

  const toggleBankSort = (field) => {
    setBankSort((prev) => ({
      field,
      dir: prev.field === field && prev.dir === 'desc' ? 'asc' : 'desc',
    }));
  };

  // Export Multi-Sheet Executive Analytics Pack (.xlsx)
  const handleExportAnalyticsExcel = () => {
    if (!report) return;
    try {
      const wb = XLSX.utils.book_new();

      // Sheet 1: Executive KPIs
      const kpiRows = [
        { Metric: 'Reporting Base Currency', Value: baseCcy },
        { Metric: 'Period Start', Value: r.period?.start_date || startDate },
        { Metric: 'Period End', Value: r.period?.end_date || endDate },
        { Metric: 'Active LGs Count', Value: kpis.active_lgs_count || 0 },
        { Metric: 'In-Flight Execution LGs Count', Value: kpis.in_flight_lgs_count || 0 },
        { Metric: `Active Contingent Exposure (${baseCcy})`, Value: kpis.active_exposure_base || 0 },
        { Metric: `Total Facility Limit (${baseCcy})`, Value: kpis.total_facility_limit_base || 0 },
        { Metric: `Utilized Facility Exposure (${baseCcy})`, Value: kpis.utilized_facility_base || 0 },
        { Metric: `Available Facility Headroom (${baseCcy})`, Value: kpis.headroom_base || 0 },
        { Metric: 'Facility Utilization %', Value: kpis.utilization_pct || 0 },
        { Metric: `Locked Cash Margin (${baseCcy})`, Value: kpis.locked_cash_margin_base || 0 },
        { Metric: 'Weighted Avg Cash Margin %', Value: kpis.weighted_margin_pct || 0 },
        { Metric: `Est. Annualized Commission (${baseCcy})`, Value: kpis.annualized_commission_base || 0 },
        { Metric: 'Weighted Avg Commission Rate %', Value: kpis.weighted_commission_rate_pct ?? 'N/A' },
        { Metric: 'Priced Active LGs Count', Value: kpis.priced_lgs_count || 0 },
        { Metric: 'Expired Unreleased LGs Count', Value: kpis.expired_unreleased_count || 0 },
        { Metric: `Expired Unreleased Exposure (${baseCcy})`, Value: kpis.expired_unreleased_base || 0 },
      ];
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(kpiRows), 'Executive_KPIs');

      // Sheet 2: Bank Scorecard
      if (bankScorecard.length > 0) {
        const bankRows = bankScorecard.map((b) => ({
          Bank: b.bank_name,
          'Active LGs': b.active_lgs_count,
          'In-Flight LGs': b.in_flight_count,
          [`Active Exposure (${baseCcy})`]: b.active_exposure_base,
          'Wallet Share %': b.wallet_share_pct,
          'Active Facilities': b.facilities_count,
          [`Facility Limit (${baseCcy})`]: b.total_limit_base,
          [`Utilized (${baseCcy})`]: b.utilized_base,
          [`Headroom (${baseCcy})`]: b.headroom_base,
          'Utilization %': b.utilization_pct,
          'Agreed SLA (Biz Days)': b.agreed_sla_days,
          'Actual Turnaround (Biz Days)': b.actual_turnaround_days ?? 'N/A',
          'SLA On-Time %': b.sla_compliance_pct ?? 'N/A',
          'Avg Commission %': b.avg_commission_rate_pct ?? 'N/A',
          'Avg Cash Margin %': b.avg_cash_margin_pct ?? 'N/A',
          [`Locked Margin (${baseCcy})`]: b.locked_margin_base,
          'Bank Inquiries': b.inquiries_count,
          'Bank Rejections': b.rejections_count,
          'Scan Discrepancies': b.discrepancies_count,
          'Open Recon Variances': b.open_recon_variances,
          'Last Recon Date': b.last_recon_date || 'None',
        }));
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(bankRows), 'Bank_Scorecard');
      }

      // Sheet 3: Maturity Ladder
      if (ladder.length > 0) {
        const matRows = ladder.map((m) => ({
          'Maturity Horizon': m.bucket,
          'LG Count': m.count,
          [`Exposure (${baseCcy})`]: m.base_amount,
          'Portfolio Share %': m.share_pct,
        }));
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(matRows), 'Maturity_Ladder');
      }

      // Sheet 4: Entity & Department Allocations
      if ((allocations.by_entity || []).length > 0) {
        XLSX.utils.book_append_sheet(
          wb,
          XLSX.utils.json_to_sheet(
            allocations.by_entity.map((e) => ({
              Entity: e.name,
              Code: e.extra || '',
              'Active LGs': e.active_count,
              [`Exposure (${baseCcy})`]: e.base_amount,
              'Share %': e.share_pct,
              [`Locked Margin (${baseCcy})`]: e.locked_margin_base,
              'Avg Tenor (Days)': e.avg_tenor_days ?? 'N/A',
              'Expired Unclosed': e.stale_count,
            }))
          ),
          'By_Entity'
        );
      }

      if ((allocations.by_department || []).length > 0) {
        XLSX.utils.book_append_sheet(
          wb,
          XLSX.utils.json_to_sheet(
            allocations.by_department.map((d) => ({
              Department: d.name,
              'Active LGs': d.active_count,
              [`Exposure (${baseCcy})`]: d.base_amount,
              'Share %': d.share_pct,
              [`Locked Margin (${baseCcy})`]: d.locked_margin_base,
            }))
          ),
          'By_Department'
        );
      }

      // Sheet 5: Monthly Trend
      if (monthlyTrend.length > 0) {
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(monthlyTrend), 'Monthly_Velocity');
      }

      XLSX.writeFile(wb, `LG_Issuance_Analytics_${toISODate(new Date())}.xlsx`);
      toast.success('Executive Analytics Pack exported successfully');
    } catch (err) {
      toast.error('Failed to generate Excel export');
    }
  };

  const renderVelocityBadge = (periodVal, lifeVal) => {
    if (periodVal == null || lifeVal == null || lifeVal === 0) return null;
    const diff = Number(periodVal) - Number(lifeVal);
    if (Math.abs(diff) < 0.1) {
      return <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10.5px] font-bold">On Par</span>;
    }
    const isFaster = diff < 0;
    return (
      <span className={`px-2 py-0.5 rounded-full text-[10.5px] font-bold ${isFaster ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-800'}`}>
        {isFaster ? `↓ ${Math.abs(diff).toFixed(1)}d Faster` : `↑ ${diff.toFixed(1)}d Slower`}
      </span>
    );
  };

  if (loading && !report) {
    return (
      <div className="flex items-center justify-center min-h-[55vh]">
        <div className="text-center">
          <RefreshCw className="w-9 h-9 animate-spin text-indigo-600 mx-auto mb-3" />
          <p className="text-sm font-medium text-slate-600">Compiling LG Issuance analytics...</p>
        </div>
      </div>
    );
  }

  const currentAllocRows = allocations[allocDim] || [];
  const ladderBarColors = {
    expired_unclosed: '#EF4444',
    d0_30: '#F59E0B',
    d31_60: '#3B82F6',
    d61_90: '#6366F1',
    d91_180: '#4F46E5',
    d181_365: '#0EA5E9',
    gt_365: '#10B981',
    open_ended: '#64748B',
  };

  const slaComparisonData = bankScorecard
    .filter((b) => b.agreed_sla_days != null || b.actual_turnaround_days != null)
    .slice(0, 8)
    .map((b) => ({
      name: b.short_name || b.bank_name,
      agreed: b.agreed_sla_days || 0,
      actual: b.actual_turnaround_days ?? 0,
      hasActual: b.actual_turnaround_days != null,
    }));

  const bankWalletChartData = bankScorecard.slice(0, 8).map((b) => ({
    name: b.short_name || b.bank_name,
    exposure: b.active_exposure_base || 0,
    headroom: b.headroom_base || 0,
  }));

  return (
    <div className="space-y-6 pb-12">
      {/* ==================== HEADER & EXECUTIVE EXPORT BAR ==================== */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-indigo-600 text-xs font-bold uppercase tracking-widest">
              <Send className="w-3.5 h-3.5" />
              <span>LG Issuance Reporting &amp; Intelligence</span>
            </div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight mt-1">
              Executive Guarantee Portfolio &amp; Bank Scorecard
            </h1>
            <p className="text-slate-500 text-xs sm:text-sm mt-0.5">
              Fact-based exposure, collateral &amp; fee run-rate, banking partner SLA compliance, and turnaround velocity
            </p>
          </div>

          {/* Export Actions */}
          <div className="flex flex-wrap items-center gap-2 print:hidden">
            <button
              type="button"
              onClick={() => setShowCustomExport(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-sm"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Position &amp; Audit Register</span>
            </button>

            <button
              type="button"
              onClick={handleExportAnalyticsExcel}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-all shadow-none"
            >
              <Download className="w-3.5 h-3.5 text-slate-600" />
              <span>Analytics Pack (.xlsx)</span>
            </button>

            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold transition-all shadow-none"
              title="Print / Save as PDF"
            >
              <Printer className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Print</span>
            </button>
          </div>
        </div>

        {/* Interactive Filter Strip */}
        <div className="mt-5 pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 print:hidden">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1 text-xs font-bold text-slate-500 mr-1">
              <Filter className="w-3.5 h-3.5" />
              Flow Window:
            </span>
            <div className="inline-flex rounded-xl bg-slate-100 p-0.5">
              {['30D', '90D', 'YTD', '12M', 'CUSTOM'].map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => handlePresetClick(p)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all shadow-none focus:ring-0 ${
                    preset === p ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {p === 'CUSTOM' ? 'Custom' : p}
                </button>
              ))}
            </div>

            {preset === 'CUSTOM' && (
              <div className="flex items-center gap-1.5">
                <FormattedDateInput
                  name="start_date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="px-2.5 py-1 border border-slate-200 rounded-lg text-xs bg-white"
                />
                <span className="text-xs text-slate-400">to</span>
                <FormattedDateInput
                  name="end_date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="px-2.5 py-1 border border-slate-200 rounded-lg text-xs bg-white"
                />
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Entity Filter */}
            {filterOpts.entities?.length > 0 && (
              <select
                value={entityId}
                onChange={(e) => setEntityId(e.target.value)}
                className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 bg-slate-50 focus:bg-white"
              >
                <option value="">All Legal Entities ({filterOpts.entities.length})</option>
                {filterOpts.entities.map((ent) => (
                  <option key={ent.id} value={ent.id}>
                    {ent.name} ({ent.code})
                  </option>
                ))}
              </select>
            )}

            {/* Bank Filter */}
            {filterOpts.banks?.length > 0 && (
              <select
                value={bankId}
                onChange={(e) => setBankId(e.target.value)}
                className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 bg-slate-50 focus:bg-white"
              >
                <option value="">All Banks ({filterOpts.banks.length})</option>
                {filterOpts.banks.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            )}

            {/* Base Currency Selector */}
            {availableCurrencies.length > 1 && (
              <select
                value={baseCurrency || baseCcy}
                onChange={(e) => setBaseCurrency(e.target.value)}
                className="px-2.5 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-indigo-700 bg-indigo-50/50"
              >
                {availableCurrencies.map((c) => (
                  <option key={c} value={c}>
                    Base: {c}
                  </option>
                ))}
              </select>
            )}

            <button
              type="button"
              onClick={() => fetchAnalytics(true)}
              disabled={refreshing}
              className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 shadow-none"
              title="Refresh report"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* ==================== VIEW NAVIGATION TABS ==================== */}
      <div className="flex flex-wrap items-center gap-2 print:hidden">
        {[
          { id: 'portfolio', label: 'Portfolio, Liquidity & Cost', icon: ShieldCheck },
          { id: 'banks', label: 'Bank SLA, Pricing & Wallet Share', icon: Award },
          { id: 'operations', label: 'Operational Velocity & Funnel', icon: TrendingUp },
        ].map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all shadow-none focus:ring-0 ${
                active
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <Icon className={`w-4 h-4 ${active ? 'text-indigo-400' : 'text-slate-400'}`} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ========================================================================
          TAB 1: PORTFOLIO, LIQUIDITY & COST
         ======================================================================== */}
      {activeTab === 'portfolio' && (
        <div className="space-y-6">
          {/* 4 Executive Financial KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            {/* Active Contingent Liability */}
            <div className="bg-white rounded-2xl border border-slate-200/90 p-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Active Contingent Liability
                </span>
                <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
                  <ShieldCheck className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-extrabold text-slate-900 mt-2" title={formatExact(kpis.active_exposure_base, baseCcy)}>
                {formatCompact(kpis.active_exposure_base, baseCcy)}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                <strong>{kpis.active_lgs_count || 0}</strong> Confirmed Live ·{' '}
                <strong>{kpis.in_flight_lgs_count || 0}</strong> In-Flight
              </p>
              {(kpis.expired_unreleased_count || 0) > 0 && (
                <div className="mt-2.5 px-2.5 py-1 rounded-lg bg-red-50 border border-red-100 text-[11px] font-semibold text-red-700">
                  {kpis.expired_unreleased_count} Expired Unreleased ({formatCompact(kpis.expired_unreleased_base, baseCcy)})
                </div>
              )}
            </div>

            {/* Facility Headroom & Utilization */}
            <div className="bg-white rounded-2xl border border-slate-200/90 p-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Credit Facility Headroom
                </span>
                <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
                  <Landmark className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-extrabold text-slate-900 mt-2" title={formatExact(kpis.headroom_base, baseCcy)}>
                {formatCompact(kpis.headroom_base, baseCcy)}
              </p>
              <div className="mt-2">
                <div className="flex justify-between text-[11px] text-slate-500 mb-1">
                  <span>Utilized: <strong>{kpis.utilization_pct || 0}%</strong></span>
                  <span>Limit: {formatCompact(kpis.total_facility_limit_base, baseCcy)}</span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      (kpis.utilization_pct || 0) >= 85 ? 'bg-amber-500' : 'bg-emerald-500'
                    }`}
                    style={{ width: `${Math.min(kpis.utilization_pct || 0, 100)}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Locked Cash Collateral */}
            <div className="bg-white rounded-2xl border border-slate-200/90 p-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Locked Cash Margin
                </span>
                <div className="p-2 rounded-xl bg-sky-50 text-sky-600">
                  <Lock className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-extrabold text-slate-900 mt-2" title={formatExact(kpis.locked_cash_margin_base, baseCcy)}>
                {formatCompact(kpis.locked_cash_margin_base, baseCcy)}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Weighted Margin: <strong className="text-slate-800">{kpis.weighted_margin_pct || 0}%</strong>
              </p>
              <p className="text-[11px] text-slate-400 mt-1">
                {kpis.cash_backed_share_pct || 0}% of portfolio requires cash margin
              </p>
            </div>

            {/* Factual Annualized Commission Run-Rate */}
            <div className="bg-white rounded-2xl border border-slate-200/90 p-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Annualized Fee Run-Rate
                </span>
                <div className="p-2 rounded-xl bg-violet-50 text-violet-600">
                  <Coins className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-extrabold text-slate-900 mt-2" title={formatExact(kpis.annualized_commission_base, baseCcy)}>
                {(kpis.priced_lgs_count || 0) > 0
                  ? formatCompact(kpis.annualized_commission_base, baseCcy)
                  : 'Not Configured'}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                {kpis.weighted_commission_rate_pct != null ? (
                  <>
                    Effective Rate: <strong className="text-slate-800">{kpis.weighted_commission_rate_pct}% p.a.</strong>
                  </>
                ) : (
                  'Set commission % on sub-limits to track'
                )}
              </p>
              <p className="text-[11px] text-slate-400 mt-1">
                Based on {kpis.priced_lgs_count || 0} of {kpis.active_lgs_count || 0} active LGs with configured rates
              </p>
            </div>
          </div>

          {/* Maturity Ladder Chart + 90-Day / Stale Watchlist */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200/90 p-5 flex flex-col">
              <div className="mb-4">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-indigo-600" />
                  Contingent Liability Maturity Ladder ({baseCcy})
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Red highlights expired guarantees not yet returned/closed (stale contingent exposure)
                </p>
              </div>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={ladder} margin={{ top: 10, right: 10, left: 0, bottom: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                    <XAxis
                      dataKey="bucket"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#64748B', fontSize: 11 }}
                      interval={0}
                      angle={-15}
                      textAnchor="end"
                      height={45}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#64748B', fontSize: 11 }}
                      tickFormatter={(v) => formatCompact(v)}
                    />
                    <RechartsTooltip
                      formatter={(val, _name, props) => [
                        `${formatExact(val, baseCcy)} (${props?.payload?.count || 0} LGs · ${props?.payload?.share_pct || 0}%)`,
                        'Exposure',
                      ]}
                      contentStyle={{ borderRadius: '10px', border: '1px solid #E2E8F0', fontSize: '12px' }}
                    />
                    <Bar dataKey="base_amount" radius={[6, 6, 0, 0]} barSize={36}>
                      {ladder.map((entry) => (
                        <Cell key={entry.key} fill={ladderBarColors[entry.key] || '#4F46E5'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200/90 overflow-hidden flex flex-col">
              <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">90-Day &amp; Stale Expiry Watchlist</h3>
                  <p className="text-[11px] text-slate-500">Prioritized for release or extension action</p>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-xs font-bold">
                  {watchItems.length}
                </span>
              </div>
              <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto flex-1">
                {watchItems.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 text-xs">
                    <CheckCircle2 className="w-7 h-7 text-emerald-400 mx-auto mb-2" />
                    No stale or 90-day maturing guarantees in scope.
                  </div>
                ) : (
                  watchItems.map((it) => (
                    <div
                      key={it.id}
                      onClick={() => navigate('/corporate-admin/issuance/issued-lgs')}
                      className="px-5 py-3 flex items-center justify-between gap-2 hover:bg-slate-50 cursor-pointer"
                    >
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-900 truncate">{it.ref}</p>
                        <p className="text-[11px] text-slate-500 truncate">
                          {it.beneficiary} · {it.bank}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-xs font-bold text-slate-800">{formatCompact(it.amount, it.currency)}</p>
                        <span
                          className={`inline-block mt-0.5 px-1.5 py-0.2 rounded text-[10px] font-bold ${
                            it.is_expired_unclosed
                              ? 'bg-red-100 text-red-700'
                              : it.days_remaining <= 14
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-blue-50 text-blue-700'
                          }`}
                        >
                          {it.is_expired_unclosed
                            ? `Expired ${Math.abs(it.days_remaining)}d ago`
                            : `In ${it.days_remaining}d`}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Multi-Dimensional Allocation Breakdown Table */}
          <div className="bg-white rounded-2xl border border-slate-200/90 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-indigo-600" />
                  Guarantee Line Consumption &amp; Collateral Allocation
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Drill across organizational entities, departments, projects, LG types, and top beneficiaries
                </p>
              </div>

              <div className="inline-flex flex-wrap rounded-xl bg-slate-100 p-1 gap-0.5">
                {[
                  { id: 'by_entity', label: 'Legal Entities' },
                  { id: 'by_department', label: 'Departments' },
                  { id: 'by_project', label: 'Projects' },
                  { id: 'by_lg_type', label: 'LG Types' },
                  { id: 'by_beneficiary', label: 'Top Beneficiaries' },
                ].map((d) => (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => setAllocDim(d.id)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all shadow-none focus:ring-0 ${
                      allocDim === d.id ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full text-sm text-left">
                <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-100">
                  <tr>
                    <th className="px-5 py-3">Segment</th>
                    <th className="px-4 py-3 text-right">Active LGs</th>
                    <th className="px-4 py-3 text-right">Exposure ({baseCcy})</th>
                    <th className="px-4 py-3 w-44">Portfolio Share</th>
                    <th className="px-4 py-3 text-right">Cash Margin ({baseCcy})</th>
                    <th className="px-4 py-3 text-right">Avg Ticket ({baseCcy})</th>
                    <th className="px-4 py-3 text-center">Avg Tenor</th>
                    <th className="px-5 py-3 text-center">Risk Flags</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {currentAllocRows.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-5 py-10 text-center text-slate-400 text-xs italic">
                        No active guarantees found for the selected filters.
                      </td>
                    </tr>
                  ) : (
                    currentAllocRows.map((row) => (
                      <tr key={row.name} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-5 py-3 font-semibold text-slate-900">
                          {row.name}
                          {row.extra && (
                            <span className="ml-2 px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 text-[10px] font-mono">
                              {row.extra}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-slate-700">{row.active_count}</td>
                        <td className="px-4 py-3 text-right font-bold text-slate-900">
                          {formatExact(row.base_amount)}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-2 rounded-full bg-slate-100 overflow-hidden">
                              <div
                                className="h-full rounded-full bg-indigo-500"
                                style={{ width: `${Math.min(row.share_pct || 0, 100)}%` }}
                              />
                            </div>
                            <span className="text-xs font-semibold text-slate-600 w-11 text-right">
                              {row.share_pct}%
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right text-slate-700">
                          {row.locked_margin_base > 0 ? formatExact(row.locked_margin_base) : '—'}
                        </td>
                        <td className="px-4 py-3 text-right text-slate-600">
                          {formatCompact(row.avg_lg_base)}
                        </td>
                        <td className="px-4 py-3 text-center text-xs text-slate-600">
                          {row.avg_tenor_days != null ? `${row.avg_tenor_days}d` : '—'}
                        </td>
                        <td className="px-5 py-3 text-center">
                          <div className="inline-flex items-center gap-1 flex-wrap justify-center">
                            {row.stale_count > 0 && (
                              <span className="px-1.5 py-0.5 rounded bg-red-50 text-red-700 text-[10px] font-bold">
                                {row.stale_count} Expired*
                              </span>
                            )}
                            {row.cross_border_count > 0 && (
                              <span className="px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 text-[10px] font-semibold">
                                {row.cross_border_count} X-Border
                              </span>
                            )}
                            {row.stale_count === 0 && row.cross_border_count === 0 && (
                              <span className="text-xs text-slate-300">—</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================
          TAB 2: BANK SLA, PRICING & WALLET SHARE SCORECARD
         ======================================================================== */}
      {activeTab === 'banks' && (
        <div className="space-y-6">
          {/* Dual Bank Comparison Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Share of Wallet & Headroom */}
            <div className="bg-white rounded-2xl border border-slate-200/90 p-5">
              <h3 className="text-sm font-bold text-slate-900">
                Share of Wallet vs Available Facility Headroom ({baseCcy})
              </h3>
              <p className="text-xs text-slate-500 mt-0.5 mb-4">
                Active guarantee exposure compared against unutilized facility capacity per bank
              </p>
              <div className="h-64 w-full">
                {bankWalletChartData.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-xs text-slate-400 italic">
                    No bank facility or issuance records available.
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={bankWalletChartData} margin={{ top: 10, right: 10, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 11 }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 11 }} tickFormatter={(v) => formatCompact(v)} />
                      <RechartsTooltip
                        formatter={(val, name) => [formatExact(val, baseCcy), name]}
                        contentStyle={{ borderRadius: '10px', border: '1px solid #E2E8F0', fontSize: '12px' }}
                      />
                      <Legend wrapperStyle={{ fontSize: '12px' }} />
                      <Bar dataKey="exposure" name="Active Exposure" fill="#4F46E5" radius={[4, 4, 0, 0]} barSize={28} />
                      <Bar dataKey="headroom" name="Available Headroom" fill="#10B981" radius={[4, 4, 0, 0]} barSize={28} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Contractual SLA vs Empirical Turnaround */}
            <div className="bg-white rounded-2xl border border-slate-200/90 p-5">
              <h3 className="text-sm font-bold text-slate-900">
                Agreed SLA vs Actual Bank Turnaround (Business Days)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5 mb-4">
                Benchmarks contractual SLA commitments against actual delivery-to-confirmation speed
              </p>
              <div className="h-64 w-full">
                {slaComparisonData.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-xs text-slate-400 italic">
                    No SLA turnaround data recorded yet.
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={slaComparisonData} margin={{ top: 10, right: 10, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 11 }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 11 }} unit="d" />
                      <RechartsTooltip
                        formatter={(val, name) => [`${val} business days`, name]}
                        contentStyle={{ borderRadius: '10px', border: '1px solid #E2E8F0', fontSize: '12px' }}
                      />
                      <Legend wrapperStyle={{ fontSize: '12px' }} />
                      <Bar dataKey="agreed" name="Agreed SLA" fill="#94A3B8" radius={[4, 4, 0, 0]} barSize={26} />
                      <Bar dataKey="actual" name="Actual Avg Turnaround" fill="#0EA5E9" radius={[4, 4, 0, 0]} barSize={26} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </div>

          {/* Sortable Bank Partner Scorecard Table */}
          <div className="bg-white rounded-2xl border border-slate-200/90 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Banking Partner Performance &amp; Pricing Scorecard</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Use wallet-share, empirical SLA turnaround, and pricing metrics for annual bank facility reviews
                </p>
              </div>
              <span className="text-xs font-semibold text-slate-500">
                {sortedBanks.length} Relationship Bank{sortedBanks.length === 1 ? '' : 's'}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full text-sm text-left">
                <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-100">
                  <tr>
                    <th className="px-5 py-3 cursor-pointer" onClick={() => toggleBankSort('bank_name')}>
                      <span className="inline-flex items-center gap-1">Bank <ArrowUpDown className="w-3 h-3" /></span>
                    </th>
                    <th className="px-4 py-3 text-right cursor-pointer" onClick={() => toggleBankSort('active_exposure_base')}>
                      <span className="inline-flex items-center gap-1 justify-end">Exposure ({baseCcy}) <ArrowUpDown className="w-3 h-3" /></span>
                    </th>
                    <th className="px-4 py-3 text-right cursor-pointer" onClick={() => toggleBankSort('wallet_share_pct')}>
                      Wallet %
                    </th>
                    <th className="px-4 py-3 text-right cursor-pointer" onClick={() => toggleBankSort('utilization_pct')}>
                      Facility Util %
                    </th>
                    <th className="px-4 py-3 text-center cursor-pointer" onClick={() => toggleBankSort('actual_turnaround_days')}>
                      Turnaround vs SLA
                    </th>
                    <th className="px-4 py-3 text-center">On-Time %</th>
                    <th className="px-4 py-3 text-center">Pricing (Comm / Margin)</th>
                    <th className="px-5 py-3 text-center">Quality &amp; Recon</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {sortedBanks.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-5 py-10 text-center text-slate-400 text-xs italic">
                        No relationship banks found in scope.
                      </td>
                    </tr>
                  ) : (
                    sortedBanks.map((b) => {
                      const slaLate = b.actual_turnaround_days != null && b.actual_turnaround_days > b.agreed_sla_days;
                      return (
                        <tr key={b.bank_id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="px-5 py-3.5">
                            <p className="font-bold text-slate-900">{b.bank_name}</p>
                            <p className="text-[11px] text-slate-400">
                              {b.active_lgs_count} Live LGs
                              {b.in_flight_count > 0 ? ` · +${b.in_flight_count} At Bank` : ''}
                              {b.facilities_count > 0 ? ` · ${b.facilities_count} Line${b.facilities_count > 1 ? 's' : ''}` : ' · Direct'}
                            </p>
                          </td>
                          <td className="px-4 py-3.5 text-right font-bold text-slate-900">
                            {formatExact(b.active_exposure_base)}
                          </td>
                          <td className="px-4 py-3.5 text-right font-semibold text-indigo-700">
                            {b.wallet_share_pct}%
                          </td>
                          <td className="px-4 py-3.5 text-right">
                            {b.total_limit_base > 0 ? (
                              <div>
                                <span className={`font-bold ${b.utilization_pct >= 85 ? 'text-amber-700' : 'text-slate-800'}`}>
                                  {b.utilization_pct}%
                                </span>
                                <p className="text-[10.5px] text-slate-400">
                                  {formatCompact(b.headroom_base)} free
                                </p>
                              </div>
                            ) : (
                              <span className="text-xs text-slate-400">No Line</span>
                            )}
                          </td>
                          <td className="px-4 py-3.5 text-center">
                            {b.actual_turnaround_days != null ? (
                              <span
                                className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold ${
                                  slaLate ? 'bg-amber-50 text-amber-800' : 'bg-emerald-50 text-emerald-700'
                                }`}
                              >
                                {b.actual_turnaround_days}d / {b.agreed_sla_days}d
                              </span>
                            ) : (
                              <span className="text-xs text-slate-400">Agreed: {b.agreed_sla_days}d</span>
                            )}
                          </td>
                          <td className="px-4 py-3.5 text-center">
                            {b.sla_compliance_pct != null ? (
                              <span className={`text-xs font-bold ${b.sla_compliance_pct >= 80 ? 'text-emerald-700' : 'text-amber-700'}`}>
                                {b.sla_compliance_pct}%
                              </span>
                            ) : (
                              <span className="text-xs text-slate-300">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3.5 text-center text-xs text-slate-700">
                            <div>
                              <span className="font-semibold">
                                {b.avg_commission_rate_pct != null ? `${b.avg_commission_rate_pct}%` : '—'}
                              </span>
                              <span className="text-slate-300 mx-1">/</span>
                              <span>
                                {b.avg_cash_margin_pct != null ? `${b.avg_cash_margin_pct}% mgn` : '0% mgn'}
                              </span>
                            </div>
                          </td>
                          <td className="px-5 py-3.5 text-center">
                            <div className="inline-flex items-center gap-1 flex-wrap justify-center">
                              {b.discrepancies_count > 0 && (
                                <span className="px-1.5 py-0.5 rounded bg-red-50 text-red-700 text-[10px] font-bold">
                                  {b.discrepancies_count} Discr.
                                </span>
                              )}
                              {b.inquiries_count > 0 && (
                                <span className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 text-[10px] font-semibold">
                                  {b.inquiries_count} Inq.
                                </span>
                              )}
                              {b.open_recon_variances > 0 && (
                                <span className="px-1.5 py-0.5 rounded bg-purple-50 text-purple-700 text-[10px] font-bold">
                                  {b.open_recon_variances} Recon Var.
                                </span>
                              )}
                              {b.discrepancies_count === 0 && b.inquiries_count === 0 && b.open_recon_variances === 0 && (
                                <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 text-[10.5px] font-semibold">
                                  Clean
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================
          TAB 3: OPERATIONAL VELOCITY, FUNNEL & GOVERNANCE
         ======================================================================== */}
      {activeTab === 'operations' && (
        <div className="space-y-6">
          {/* 4 Lifecycle Speedometers */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            {[
              {
                label: 'Internal Approval Time',
                sub: 'Request Submit → Final Approval',
                period: turnaround.approval_days_period,
                life: turnaround.approval_days_lifetime,
                unit: 'days',
                accent: 'border-indigo-500',
              },
              {
                label: 'Treasury Delivery Time',
                sub: 'Execution → Delivered to Bank',
                period: turnaround.delivery_days_period,
                life: turnaround.delivery_days_lifetime,
                unit: 'days',
                accent: 'border-sky-500',
              },
              {
                label: 'Bank Issuance Time',
                sub: 'Bank Delivery → LG Confirmed',
                period: turnaround.bank_biz_days_period,
                life: turnaround.bank_biz_days_lifetime,
                unit: 'biz days',
                accent: 'border-emerald-500',
              },
              {
                label: 'End-to-End Cycle Time',
                sub: 'Origination → Confirmed LG',
                period: turnaround.end_to_end_days_period,
                life: turnaround.end_to_end_days_lifetime,
                unit: 'days',
                accent: 'border-violet-500',
              },
            ].map((card) => {
              const displayVal = card.period ?? card.life;
              return (
                <div key={card.label} className={`bg-white rounded-2xl border border-slate-200/90 border-l-4 ${card.accent} p-5`}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-slate-700">{card.label}</span>
                    {renderVelocityBadge(card.period, card.life)}
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">{card.sub}</p>
                  <div className="mt-3 flex items-baseline justify-between">
                    <div>
                      <span className="text-2xl font-extrabold text-slate-900">
                        {displayVal != null ? displayVal : '—'}
                      </span>
                      {displayVal != null && (
                        <span className="text-xs text-slate-500 ml-1">{card.unit}</span>
                      )}
                    </div>
                    <span className="text-[11px] text-slate-400">
                      Lifetime: <strong>{card.life != null ? `${card.life}d` : '—'}</strong>
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* 6-Month Activity Trend + Period Conversion Funnel */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200/90 p-5">
              <h3 className="text-sm font-bold text-slate-900">
                6-Month Issuance &amp; Post-Issuance Activity Trend
              </h3>
              <p className="text-xs text-slate-500 mt-0.5 mb-4">
                Monthly volume of new guarantees issued, extensions, closures, and amendments
              </p>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyTrend} margin={{ top: 10, right: 10, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                    <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 11 }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 11 }} allowDecimals={false} />
                    <RechartsTooltip
                      contentStyle={{ borderRadius: '10px', border: '1px solid #E2E8F0', fontSize: '12px' }}
                    />
                    <Legend wrapperStyle={{ fontSize: '12px' }} />
                    <Bar dataKey="new_lgs_issued" name="New LGs Executed" stackId="a" fill="#4F46E5" barSize={34} />
                    <Bar dataKey="extensions" name="Extensions" stackId="a" fill="#0EA5E9" barSize={34} />
                    <Bar dataKey="closures" name="Closures / Returns" stackId="a" fill="#10B981" barSize={34} />
                    <Bar dataKey="other_maintenance" name="Other Maint." stackId="a" fill="#F59E0B" radius={[4, 4, 0, 0]} barSize={34} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Period Funnel */}
            <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200/90 p-5 flex flex-col justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Selected Period Conversion Funnel
                </h3>
                <p className="text-xs text-slate-500 mt-0.5 mb-4">
                  {formatDate(r.period?.start_date || startDate)} — {formatDate(r.period?.end_date || endDate)}
                </p>

                <div className="space-y-2.5">
                  {[
                    { label: 'Requests Submitted', val: funnel.requests_submitted || 0, color: 'bg-slate-700' },
                    { label: 'Internally Approved', val: funnel.requests_approved || 0, color: 'bg-indigo-600' },
                    { label: 'Executed by Treasury', val: funnel.lgs_executed || 0, color: 'bg-sky-500' },
                    { label: 'Delivered to Bank', val: funnel.lgs_delivered_to_bank || 0, color: 'bg-blue-500' },
                    { label: 'Confirmed & Issued by Bank', val: funnel.lgs_confirmed_by_bank || 0, color: 'bg-emerald-500' },
                    { label: 'Handed Over to Recipient', val: funnel.lgs_handed_over || 0, color: 'bg-teal-500' },
                  ].map((step) => {
                    const maxBase = Math.max(
                      1,
                      funnel.requests_submitted || 0,
                      funnel.lgs_executed || 0,
                      funnel.lgs_confirmed_by_bank || 0
                    );
                    const pct = Math.min(100, Math.round((step.val / maxBase) * 100));
                    return (
                      <div key={step.label} className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="font-medium text-slate-700">{step.label}</span>
                          <span className="font-extrabold text-slate-900">{step.val}</span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                          <div className={`h-full rounded-full ${step.color}`} style={{ width: `${Math.max(step.val > 0 ? 6 : 0, pct)}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs">
                <span className="text-amber-700 bg-amber-50 px-2.5 py-1 rounded-lg font-semibold">
                  Returned for Revision: {funnel.requests_revision_required || 0}
                </span>
                <span className="text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg font-semibold">
                  Rejected / Cancelled: {funnel.requests_rejected_or_cancelled || 0}
                </span>
              </div>
            </div>
          </div>

          {/* Maintenance Breakdown & Verification Quality */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl border border-slate-200/90 p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Layers className="w-4 h-4 text-indigo-600" />
                    Post-Issuance Maintenance Activity (In Period)
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Amendments, extensions, amount increases, activations &amp; formal closures
                  </p>
                </div>
                <span className="px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 text-xs font-bold">
                  {velocity.maintenance_total_in_period || 0} Total
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {[
                  { key: 'EXTEND', label: 'Extensions' },
                  { key: 'INCREASE_AMOUNT', label: 'Amount Increases' },
                  { key: 'AMENDMENT', label: 'Text Amendments' },
                  { key: 'CLOSE', label: 'Closures / Returns' },
                  { key: 'ACTIVATE', label: 'Activations' },
                  { key: 'LIQUIDATION', label: 'Liquidations' },
                ].map((m) => (
                  <div key={m.key} className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
                    <p className="text-xl font-extrabold text-slate-900">{maintByType[m.key] || 0}</p>
                    <p className="text-xs text-slate-500 font-medium mt-0.5">{m.label}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200/90 p-5">
              <div className="mb-4">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  Verification &amp; Custody Chain Integrity (Live Portfolio)
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  AI/manual bank LG scan verification &amp; physical handover completion status
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="p-3.5 rounded-xl bg-emerald-50/60 border border-emerald-100">
                  <p className="text-xl font-extrabold text-emerald-700">{verifQuality.matched || 0}</p>
                  <p className="text-xs text-emerald-800 font-medium mt-0.5">Verified &amp; Matched</p>
                </div>
                <div className="p-3.5 rounded-xl bg-blue-50/60 border border-blue-100">
                  <p className="text-xl font-extrabold text-blue-700">{verifQuality.accepted_with_discrepancy || 0}</p>
                  <p className="text-xs text-blue-800 font-medium mt-0.5">Accepted w/ Note</p>
                </div>
                <div className="p-3.5 rounded-xl bg-red-50/60 border border-red-100">
                  <p className="text-xl font-extrabold text-red-700">{verifQuality.discrepancy_open || 0}</p>
                  <p className="text-xs text-red-800 font-medium mt-0.5">Open Discrepancies</p>
                </div>
                <div className="p-3.5 rounded-xl bg-amber-50/60 border border-amber-100">
                  <p className="text-xl font-extrabold text-amber-700">{verifQuality.pending_verification || 0}</p>
                  <p className="text-xs text-amber-800 font-medium mt-0.5">Pending Scan Check</p>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                  <p className="text-xl font-extrabold text-slate-900">{verifQuality.handed_over || 0}</p>
                  <p className="text-xs text-slate-600 font-medium mt-0.5">Handed Over</p>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                  <p className="text-xl font-extrabold text-slate-700">{verifQuality.pending_handover || 0}</p>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">Awaiting Handover</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Custom Position & Lifecycle Audit Excel Export Modal */}
      <CustomExportModal
        isOpen={showCustomExport}
        onClose={() => setShowCustomExport(false)}
        statusFilter="ALL"
        searchFilter=""
      />
    </div>
  );
}
