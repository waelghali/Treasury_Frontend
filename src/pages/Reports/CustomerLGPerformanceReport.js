import React, { useState, useEffect, useCallback, useRef } from 'react';
import { apiRequest } from 'services/apiService';
import { toast } from 'react-toastify';
import {
  FileText, RefreshCw, AlertTriangle, CheckCircle2, Sparkles, Download, Filter
} from 'lucide-react';
import * as XLSX from 'xlsx';
import LoadingSpinner from 'components/LoadingSpinner';
import FormattedDateInput from 'components/FormattedDateInput';
import { formatDate } from '../../utils/dateFormat';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';

const getPresetDates = (days = 30) => {
  const end = new Date();
  const start = new Date();
  if (days === 'YTD') {
    start.setMonth(0, 1);
  } else {
    start.setDate(end.getDate() - Number(days));
  }
  return {
    start: start.toISOString().split('T')[0],
    end: end.toISOString().split('T')[0],
  };
};

const RiskTable = ({ title, items, emptyMessage, accentBorder = 'border-red-500', badgeCls = 'bg-red-50 text-red-700' }) => (
  <div className={`bg-white rounded-2xl border border-slate-200/90 border-l-4 ${accentBorder} p-5 shadow-xs`}>
    <div className="flex items-center justify-between mb-3">
      <h3 className="text-sm font-bold text-slate-900">{title}</h3>
      <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${badgeCls}`}>
        {items.length}
      </span>
    </div>
    {items.length === 0 ? (
      <p className="text-xs text-slate-400 italic py-3">{emptyMessage}</p>
    ) : (
      <div className="overflow-x-auto max-h-72 overflow-y-auto">
        <table className="min-w-full text-xs text-left">
          <thead className="text-[10.5px] text-slate-500 uppercase bg-slate-50 border-b border-slate-100">
            <tr>
              <th className="px-3 py-2">LG Reference</th>
              <th className="px-3 py-2">Trigger Date</th>
              <th className="px-3 py-2">Detail</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {items.map((item, idx) => (
              <tr key={idx} className="hover:bg-slate-50">
                <td className="px-3 py-2.5 font-bold text-slate-900">{item.reference_number}</td>
                <td className="px-3 py-2.5 text-slate-500">{formatDate(item.date_trigger)}</td>
                <td className="px-3 py-2.5 font-semibold text-slate-700">
                  <span className={`px-1.5 py-0.5 rounded mr-1.5 ${badgeCls}`}>{item.days_remaining}d</span>
                  <span className="text-slate-500 font-normal">{item.details}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )}
  </div>
);

const CustomerLGPerformanceReport = () => {
  const [showAll, setShowAll] = useState(false);
  const [preset, setPreset] = useState('30D');
  const defaults = getPresetDates(30);
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ start_date: defaults.start, end_date: defaults.end });

  const isFetching = useRef(false);

  const fetchReport = useCallback(async () => {
    if (isFetching.current) return;
    try {
      isFetching.current = true;
      setLoading(true);
      const queryString = `?start_date=${filters.start_date}&end_date=${filters.end_date}`;
      const response = await apiRequest(`/reports/ops-health${queryString}`);
      setReportData(response);
    } catch (err) {
      console.error('Fetch error:', err);
      toast.error(`Error loading custody health report: ${err.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
      isFetching.current = false;
    }
  }, [filters.start_date, filters.end_date]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  const handlePreset = (p) => {
    setPreset(p);
    if (p === '30D') setFilters(getPresetDates(30));
    else if (p === '90D') setFilters(getPresetDates(90));
    else if (p === 'YTD') setFilters(getPresetDates('YTD'));
  };

  const handleFilterChange = (e) => {
    setPreset('CUSTOM');
    setFilters((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const { flow, pipeline, risks, efficiency, ai_usage } = reportData || {
    flow: {},
    pipeline: {},
    risks: { expiry_critical_list: [], stalled_internal_list: [], bank_ghosting_list: [] },
    efficiency: {
      avg_internal_days: 0,
      avg_bank_days: 0,
      avg_approval_days: 0,
      lifetime_internal_days: 0,
      lifetime_bank_days: 0,
      lifetime_approval_days: 0,
      internal_change_pct: 0,
    },
    ai_usage: [],
  };

  const renderTrend = (current, lifetime) => {
    if (!lifetime || lifetime === 0) return null;
    const isFaster = current <= lifetime;
    return (
      <span className={`ml-2 text-[10.5px] font-bold px-2 py-0.5 rounded-full ${isFaster ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-800'}`}>
        {isFaster ? '↓ Faster' : '↑ Slower'}
      </span>
    );
  };

  const handleExportCustodyXlsx = () => {
    if (!reportData) return;
    try {
      const wb = XLSX.utils.book_new();
      const summaryRows = [
        { Metric: 'Period Start', Value: filters.start_date },
        { Metric: 'Period End', Value: filters.end_date },
        { Metric: 'Net Operational Actions', Value: flow.net_activity_score || 0 },
        { Metric: 'New LGs Recorded', Value: flow.new_issuances_count || 0 },
        { Metric: 'Extensions', Value: flow.extensions_delivered_count || 0 },
        { Metric: 'Reductions', Value: flow.reductions_count || 0 },
        { Metric: 'Amendments', Value: flow.amendments_count || 0 },
        { Metric: 'Activations', Value: flow.activations_count || 0 },
        { Metric: 'Releases', Value: flow.releases_count || 0 },
        { Metric: 'Liquidations', Value: flow.liquidations_count || 0 },
        { Metric: 'Bank Reminders', Value: flow.reminders_count || 0 },
        { Metric: 'Avg Approval Days', Value: efficiency.avg_approval_days || 0 },
        { Metric: 'Avg Internal Delivery Days', Value: efficiency.avg_internal_days || 0 },
        { Metric: 'Avg Bank Reply Days', Value: efficiency.avg_bank_days || 0 },
      ];
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(summaryRows), 'Custody_Summary');
      if (reportData.history?.length) {
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(reportData.history), 'Monthly_Activity');
      }
      XLSX.writeFile(wb, `LG_Custody_Ops_Health_${filters.end_date}.xlsx`);
      toast.success('Custody Ops Health exported');
    } catch {
      toast.error('Failed to export report');
    }
  };

  const statusDistEntries = Object.entries(reportData?.status_distribution || {}).map(([name, value]) => ({ name, value }));
  const statusColors = { Valid: '#059669', Expired: '#EF4444', Released: '#3B82F6', Liquidated: '#8B5CF6' };

  return (
    <div className="space-y-6 pb-10">
      {/* Header & Filter Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-emerald-600 text-xs font-bold uppercase tracking-widest">
              <FileText className="w-3.5 h-3.5" />
              <span>LG Custody Reporting &amp; Telemetry</span>
            </div>
            <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight mt-1">
              Custody Operational Health
            </h2>
            <p className="text-slate-500 text-xs sm:text-sm mt-0.5">
              Incoming beneficiary guarantee flow, instruction turnaround speed, and risk backlog
            </p>
          </div>

          <button
            type="button"
            onClick={handleExportCustodyXlsx}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-all self-start lg:self-auto shadow-none"
          >
            <Download className="w-3.5 h-3.5 text-slate-600" />
            <span>Export (.xlsx)</span>
          </button>
        </div>

        <div className="mt-4 pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1 text-xs font-bold text-slate-500">
              <Filter className="w-3.5 h-3.5" />
              Period:
            </span>
            <div className="inline-flex rounded-xl bg-slate-100 p-0.5">
              {['30D', '90D', 'YTD', 'CUSTOM'].map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => handlePreset(p)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all shadow-none focus:ring-0 ${
                    preset === p ? 'bg-white text-emerald-700 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {p === 'CUSTOM' ? 'Custom' : p}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <FormattedDateInput
              name="start_date"
              value={filters.start_date}
              onChange={handleFilterChange}
              className="px-2.5 py-1.5 border border-slate-200 rounded-xl text-xs bg-white"
            />
            <span className="text-slate-400 text-xs">to</span>
            <FormattedDateInput
              name="end_date"
              value={filters.end_date}
              onChange={handleFilterChange}
              className="px-2.5 py-1.5 border border-slate-200 rounded-xl text-xs bg-white"
            />
            <button
              type="button"
              onClick={fetchReport}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white text-xs font-bold rounded-xl hover:bg-emerald-700 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Apply</span>
            </button>
          </div>
        </div>
      </div>

      {loading && !reportData ? (
        <LoadingSpinner />
      ) : !reportData ? (
        <div className="text-center py-10 text-slate-500">No data available.</div>
      ) : (
        <>
          {/* Period Activity Flow */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Period Instruction &amp; Custody Flow</h3>
                <p className="text-xs text-slate-500">Completed actions within selected date window</p>
              </div>
              <div className="text-right">
                <span className="text-[10.5px] font-bold uppercase tracking-wider text-slate-400 block">
                  Net Actions
                </span>
                <span className="text-xl font-extrabold text-emerald-700">{flow.net_activity_score || 0}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5">
              {[
                { label: 'New LGs', val: flow.new_issuances_count || 0, accent: 'text-indigo-600' },
                { label: 'Extensions', val: flow.extensions_delivered_count || 0, accent: 'text-blue-600' },
                { label: 'Reductions', val: flow.reductions_count || 0, accent: 'text-sky-600' },
                { label: 'Amendments', val: flow.amendments_count || 0, accent: 'text-amber-600' },
                { label: 'Activations', val: flow.activations_count || 0, accent: 'text-teal-600' },
                { label: 'Releases', val: flow.releases_count || 0, accent: 'text-emerald-600' },
                { label: 'Liquidations', val: flow.liquidations_count || 0, accent: 'text-purple-600' },
                { label: 'Reminders', val: flow.reminders_count || 0, accent: 'text-slate-700' },
              ].map((m) => (
                <div key={m.label} className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
                  <p className="text-[11px] font-semibold text-slate-500">{m.label}</p>
                  <p className={`text-xl font-extrabold mt-1 ${m.accent}`}>{m.val}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Visual Analytics */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-8 bg-white p-5 rounded-2xl border border-slate-200/90">
              <h3 className="text-sm font-bold text-slate-900 mb-1">4-Month Instruction Trend</h3>
              <p className="text-xs text-slate-500 mb-4">Stacked monthly custody instruction activity</p>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={reportData.history || []} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                    <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 12 }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 12 }} allowDecimals={false} />
                    <Tooltip
                      cursor={{ fill: '#F8FAFC' }}
                      contentStyle={{ backgroundColor: '#FFFFFF', borderRadius: '10px', border: '1px solid #E2E8F0', fontSize: '12px' }}
                    />
                    <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }} />
                    <Bar dataKey="extensions_delivered_count" name="Extend" stackId="a" fill="#2563EB" barSize={42} />
                    <Bar dataKey="reductions_count" name="Reduce" stackId="a" fill="#0EA5E9" barSize={42} />
                    <Bar dataKey="amendments_count" name="Amend" stackId="a" fill="#D97706" barSize={42} />
                    <Bar dataKey="activations_count" name="Activate" stackId="a" fill="#0D9488" barSize={42} />
                    <Bar dataKey="releases_count" name="Release" stackId="a" fill="#10B981" barSize={42} />
                    <Bar dataKey="liquidations_count" name="Liquidate" stackId="a" fill="#DC2626" barSize={42} />
                    <Bar dataKey="reminders_count" name="Remind" stackId="a" fill="#6366F1" radius={[4, 4, 0, 0]} barSize={42} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="lg:col-span-4 bg-white p-5 rounded-2xl border border-slate-200/90">
              <h3 className="text-sm font-bold text-slate-900 mb-1">Custody Status Mix</h3>
              <p className="text-xs text-slate-500 mb-4">Distribution across all custody records</p>
              <div className="h-64 w-full">
                {statusDistEntries.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-xs text-slate-400 italic">
                    No custody records found.
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={statusDistEntries}
                        cx="50%"
                        cy="45%"
                        innerRadius={58}
                        outerRadius={82}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {statusDistEntries.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={statusColors[entry.name] || '#94A3B8'} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ borderRadius: '10px', border: '1px solid #E2E8F0', fontSize: '12px' }} />
                      <Legend iconType="circle" verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: '12px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </div>

          {/* Efficiency Speedometer */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              {
                title: 'Approval Turnaround',
                val: efficiency.avg_approval_days || '0.0',
                life: efficiency.lifetime_approval_days || '0.0',
                border: 'border-amber-500',
              },
              {
                title: 'Internal Delivery Time',
                val: efficiency.avg_internal_days || '0.0',
                life: efficiency.lifetime_internal_days || '0.0',
                border: 'border-blue-500',
              },
              {
                title: 'Bank Reply Time',
                val: efficiency.avg_bank_days || '0.0',
                life: efficiency.lifetime_bank_days || '0.0',
                border: 'border-emerald-500',
              },
            ].map((c) => (
              <div key={c.title} className={`bg-white p-5 rounded-2xl border border-slate-200/90 border-l-4 ${c.border} flex items-center justify-between`}>
                <div>
                  <div className="flex items-center">
                    <p className="text-xs font-bold text-slate-700">{c.title}</p>
                    {renderTrend(c.val, c.life)}
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Lifetime benchmark: <span className="font-semibold text-slate-600">{c.life} days</span>
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-2xl font-extrabold text-slate-900">{c.val}</span>
                  <span className="text-xs text-slate-500 ml-1">days</span>
                </div>
              </div>
            ))}
          </div>

          {/* Instruction Pipeline Snapshot */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-5">
            <div className="flex flex-wrap justify-between items-center gap-2 mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Instruction Backlog Snapshot</h3>
                <p className="text-xs text-slate-500">Pending internal deliveries vs pending bank confirmations</p>
              </div>
              <div className="inline-flex rounded-xl bg-slate-100 p-0.5">
                <button
                  type="button"
                  onClick={() => setShowAll(false)}
                  className={`px-3 py-1 text-xs rounded-lg font-bold shadow-none ${!showAll ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500'}`}
                >
                  Actionable Window
                </button>
                <button
                  type="button"
                  onClick={() => setShowAll(true)}
                  className={`px-3 py-1 text-xs rounded-lg font-bold shadow-none ${showAll ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500'}`}
                >
                  Total Backlog
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-amber-50/50 border border-amber-100">
                <p className="text-xs font-bold text-amber-900">Internal Delivery Backlog</p>
                <p className="text-2xl font-extrabold text-amber-700 mt-1">
                  {(showAll ? pipeline.internal_backlog_total : pipeline.internal_backlog_count) || 0}
                </p>
                <p className="text-[11px] text-amber-800/70 mt-1">
                  {showAll ? 'All undelivered instructions' : 'Instructions needing immediate delivery'}
                </p>
              </div>

              <div className="p-4 rounded-xl bg-blue-50/50 border border-blue-100">
                <p className="text-xs font-bold text-blue-900">Awaiting Bank Reply</p>
                <p className="text-2xl font-extrabold text-blue-700 mt-1">
                  {(showAll ? pipeline.bank_backlog_total : pipeline.bank_backlog_count) || 0}
                </p>
                <p className="text-[11px] text-blue-800/70 mt-1">
                  {showAll ? 'All instructions awaiting bank reply' : 'Banks exceeding reminder threshold'}
                </p>
              </div>

              <div className="p-4 rounded-xl bg-emerald-50/50 border border-emerald-100">
                <p className="text-xs font-bold text-emerald-900">Extensions Delivered (Period)</p>
                <p className="text-2xl font-extrabold text-emerald-700 mt-1">
                  {pipeline.completed_recently_count || 0}
                </p>
                <p className="text-[11px] text-emerald-800/70 mt-1">Completed renewals in window</p>
              </div>
            </div>
          </div>

          {/* Risk & Attention Panel */}
          <div>
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              Custody Risk &amp; Attention Alerts
            </h3>

            {risks.expiry_critical_list.length === 0 &&
            risks.stalled_internal_list.length === 0 &&
            risks.bank_ghosting_list.length === 0 ? (
              <div className="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-6 text-center">
                <CheckCircle2 className="w-7 h-7 text-emerald-600 mx-auto mb-1.5" />
                <p className="text-emerald-900 font-bold text-sm">All Custody Controls Nominal</p>
                <p className="text-emerald-700 text-xs mt-0.5">No critical 7-day expiries or stalled instructions detected.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <RiskTable
                  title="Critical Expiries (< 7 Days)"
                  items={risks.expiry_critical_list}
                  emptyMessage="No immediate 7-day expiry risks."
                  accentBorder="border-red-500"
                  badgeCls="bg-red-50 text-red-700"
                />
                <RiskTable
                  title="Unresponsive Banks"
                  items={risks.bank_ghosting_list}
                  emptyMessage="All banks responding within threshold."
                  accentBorder="border-amber-500"
                  badgeCls="bg-amber-50 text-amber-800"
                />
                <div className="lg:col-span-2">
                  <RiskTable
                    title="Undelivered Internal Instructions"
                    items={risks.stalled_internal_list}
                    emptyMessage="No stalled internal instructions."
                    accentBorder="border-yellow-500"
                    badgeCls="bg-yellow-50 text-yellow-800"
                  />
                </div>
              </div>
            )}
          </div>

          {/* AI Co-Pilot Engagement (compact card when active) */}
          {(ai_usage || []).length > 0 && (
            <div className="bg-white rounded-2xl border border-indigo-100 p-5">
              <h3 className="text-xs font-bold text-indigo-600 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4" />
                AI Document &amp; Co-Pilot Telemetry
              </h3>
              <div className="flex flex-wrap gap-6 text-sm">
                <div>
                  <span className="text-slate-500 text-xs block">Total AI Requests</span>
                  <span className="text-lg font-extrabold text-slate-900">
                    {ai_usage.reduce((s, u) => s + (u.request_count || 0), 0)}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 text-xs block">Tokens Processed</span>
                  <span className="text-lg font-extrabold text-indigo-700">
                    {ai_usage.reduce((s, u) => s + (u.total_tokens || 0), 0).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default CustomerLGPerformanceReport;
