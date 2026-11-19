import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Layers, CheckCircle2, AlertTriangle, Landmark, RefreshCw, Eye,
  Settings2, Download, Users, Clock, FileSpreadsheet, ShieldCheck,
  Sparkles, ArrowRight, FileText, AlertCircle
} from 'lucide-react';
import { apiRequest } from '../../../services/apiService';
import { formatDate } from '../../../utils/dateFormat';

const formatMoney = (val, currency = '') => {
  const num = Number(val || 0);
  const txt = num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return currency ? `${currency} ${txt}` : txt;
};

const SOURCE_LABELS = {
  BUILTIN: 'Built-in Classifiers',
  RULE: 'Confirmed Rules',
  LEARNED_RULE: 'Online Learned Rules',
  CONCEPT: 'Semantic Concept Match',
  COLLABORATIVE: 'Collaborative Consensus',
  MANUAL: 'Manual User Classification',
};

export default function ReconciliationAdminOverview() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [rightTab, setRightTab] = useState('team'); // 'team' | 'automation'

  const fetchOverview = useCallback(async (isManual = false) => {
    if (isManual) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const res = await apiRequest('/reconciliation/admin-overview', 'GET');
      setData(res);
    } catch (err) {
      setError(err.message || 'Failed to load reconciliation oversight telemetry');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchOverview(false);
  }, [fetchOverview]);

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center min-h-[55vh]">
        <div className="text-center">
          <RefreshCw className="w-9 h-9 animate-spin text-cyan-600 mx-auto mb-3" />
          <p className="text-sm font-medium text-slate-600">Loading Reconciliation Control Center...</p>
        </div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-2xl p-8 text-center max-w-md mx-auto mt-12">
        <AlertTriangle className="w-8 h-8 text-red-500 mx-auto mb-2" />
        <h3 className="font-bold text-red-900">Unable to Load Reconciliation Control</h3>
        <p className="text-xs text-red-600 mt-1">{error}</p>
        <button
          type="button"
          onClick={() => fetchOverview(false)}
          className="mt-4 px-4 py-2 bg-red-600 text-white rounded-xl text-xs font-bold hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    );
  }

  const d = data || {};
  const kpis = d.kpis || {};
  const exc = d.exceptions || {};
  const bankProgress = d.bank_progress || [];
  const recentStatements = d.recent_statements || [];
  const teamActivity = d.team_activity || [];
  const autoHealth = d.automation_health || {};
  const continuityWarnings = exc.continuity_warnings || [];
  const sourceEntries = Object.entries(autoHealth.classification_sources || {}).sort((a, b) => b[1] - a[1]);
  const totalSourceClassified = sourceEntries.reduce((s, [, v]) => s + v, 0);

  const hasControlAlerts =
    continuityWarnings.length > 0 ||
    (exc.aged_unreconciled_30d_count || 0) > 0 ||
    (exc.suggested_rules_pending_count || 0) > 0 ||
    (exc.variance_matches_count || 0) > 0;

  return (
    <div className="space-y-6 pb-10">
      {/* ==================== 1. EXECUTIVE CONTROL HEADER ==================== */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-cyan-950 to-slate-900 text-white p-5 sm:p-6 shadow-lg border border-cyan-500/20">
        <div className="absolute -right-12 -top-12 w-56 h-56 rounded-full bg-cyan-500/10 blur-2xl pointer-events-none" />
        <div className="relative flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-cyan-300 text-xs font-bold uppercase tracking-widest">
              <Layers className="w-3.5 h-3.5" />
              <span>Corporate Governance · Bank Reconciliation Oversight</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-white mt-1">
              Reconciliation Control &amp; Progress Center
            </h1>
            <p className="text-slate-300 text-xs sm:text-sm mt-0.5">
              Monitor statement ingestion, matching &amp; GL classification completion, balance continuity, and team workload
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => fetchOverview(true)}
              disabled={refreshing}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-xs font-semibold text-slate-200 transition-all shadow-none"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>

            <button
              type="button"
              onClick={() => navigate('/corporate-admin/reconciliation/rules')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-xs font-semibold text-white transition-all shadow-none"
            >
              <Settings2 className="w-3.5 h-3.5 text-cyan-300" />
              <span>Rules &amp; Taxonomy</span>
              {(exc.suggested_rules_pending_count || 0) > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-amber-400 text-slate-900 text-[10px] font-extrabold">
                  {exc.suggested_rules_pending_count}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => navigate('/corporate-admin/reconciliation/export')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-xs font-semibold text-white transition-all shadow-none"
            >
              <Download className="w-3.5 h-3.5 text-cyan-300" />
              <span>Export Profiles</span>
            </button>

            <button
              type="button"
              onClick={() => navigate('/corporate-admin/reconciliation/workspace')}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-extrabold transition-all shadow-md"
            >
              <Eye className="w-4 h-4" />
              <span>Inspect Master Ledger</span>
            </button>
          </div>
        </div>
      </div>

      {/* ==================== 2. FOUR CORE PROGRESS & INTEGRITY KPIS ==================== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* KPI 1: Matching Completion */}
        <div
          onClick={() => navigate('/corporate-admin/reconciliation/workspace')}
          className="bg-white rounded-2xl border border-slate-200/90 p-5 cursor-pointer hover:shadow-md hover:border-cyan-300 transition-all relative overflow-hidden"
        >
          <div className="absolute inset-x-0 top-0 h-1 bg-cyan-500" />
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Matching Completion</p>
              <p className="text-2xl font-extrabold text-slate-900 mt-1.5">
                {kpis.reconciliation_rate_pct || 0}%
              </p>
            </div>
            <div className="p-2.5 rounded-xl bg-cyan-50 text-cyan-600">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
              <div
                className="h-full rounded-full bg-cyan-500 transition-all duration-700"
                style={{ width: `${Math.min(kpis.reconciliation_rate_pct || 0, 100)}%` }}
              />
            </div>
            <div className="flex justify-between text-[11px] text-slate-500 mt-2">
              <span><strong>{kpis.reconciled_transactions || 0}</strong> Matched</span>
              <span className={(kpis.unreconciled_transactions || 0) > 0 ? 'text-amber-700 font-semibold' : ''}>
                {kpis.unreconciled_transactions || 0} Unmatched
              </span>
            </div>
          </div>
        </div>

        {/* KPI 2: GL Classification & Export Readiness */}
        <div
          onClick={() => navigate('/corporate-admin/reconciliation/export')}
          className="bg-white rounded-2xl border border-slate-200/90 p-5 cursor-pointer hover:shadow-md hover:border-indigo-300 transition-all relative overflow-hidden"
        >
          <div className="absolute inset-x-0 top-0 h-1 bg-indigo-500" />
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">GL Classification</p>
              <p className="text-2xl font-extrabold text-slate-900 mt-1.5">
                {kpis.classification_rate_pct || 0}%
              </p>
            </div>
            <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-600">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
              <div
                className="h-full rounded-full bg-indigo-500 transition-all duration-700"
                style={{ width: `${Math.min(kpis.classification_rate_pct || 0, 100)}%` }}
              />
            </div>
            <div className="flex justify-between text-[11px] text-slate-500 mt-2">
              <span>Ready to Post: <strong className="text-emerald-700">{kpis.ready_for_export_count || 0}</strong></span>
              <span>Exported: <strong>{kpis.exported_count || 0}</strong></span>
            </div>
          </div>
        </div>

        {/* KPI 3: Statement Balance Continuity */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-5 relative overflow-hidden">
          <div className={`absolute inset-x-0 top-0 h-1 ${(kpis.continuity_warning_statements || 0) > 0 ? 'bg-amber-500' : 'bg-emerald-500'}`} />
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Statements Ingested</p>
              <p className="text-2xl font-extrabold text-slate-900 mt-1.5">
                {kpis.total_statements || 0}
              </p>
            </div>
            <div className={`p-2.5 rounded-xl ${(kpis.continuity_warning_statements || 0) > 0 ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600'}`}>
              <ShieldCheck className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-emerald-700 font-semibold">
              {kpis.validated_statements || 0} Balanced
            </span>
            {(kpis.continuity_warning_statements || 0) > 0 ? (
              <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[11px] font-bold">
                {kpis.continuity_warning_statements} Continuity Gap
              </span>
            ) : (
              <span className="text-slate-400 text-[11px]">Zero balance gaps</span>
            )}
          </div>
        </div>

        {/* KPI 4: Open ERP & Aged Backlog */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-5 relative overflow-hidden">
          <div className={`absolute inset-x-0 top-0 h-1 ${(exc.aged_unreconciled_7d_count || 0) > 0 ? 'bg-amber-500' : 'bg-slate-400'}`} />
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Open ERP Items</p>
              <p className="text-2xl font-extrabold text-slate-900 mt-1.5">
                {kpis.open_erp_records_count || 0}
              </p>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-100 text-slate-700">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px]">
            <span className="text-slate-500">
              Cleared ERP: <strong className="text-slate-800">{kpis.reconciled_erp_records_count || 0}</strong>
            </span>
            <span className={(exc.aged_unreconciled_7d_count || 0) > 0 ? 'text-amber-700 font-bold' : 'text-slate-400'}>
              {exc.aged_unreconciled_7d_count || 0} Bank Lines &gt; 7d
            </span>
          </div>
        </div>
      </div>

      {/* ==================== 3. GOVERNANCE & EXCEPTION CALLOUTS ==================== */}
      {hasControlAlerts && (
        <div className="bg-amber-50/60 border border-amber-200/90 rounded-2xl p-4 sm:p-5">
          <div className="flex items-center gap-2 text-amber-900 text-xs font-extrabold uppercase tracking-wider mb-3">
            <AlertCircle className="w-4 h-4 text-amber-600" />
            <span>Governance &amp; Control Items Requiring Attention</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
            {continuityWarnings.length > 0 && (
              <div className="bg-white rounded-xl border border-amber-200 p-3.5">
                <p className="text-xs font-bold text-red-700">
                  {continuityWarnings.length} Balance Continuity Warning{continuityWarnings.length > 1 ? 's' : ''}
                </p>
                <p className="text-[11px] text-slate-600 mt-1">
                  Latest: <strong>{continuityWarnings[0].bank_name}</strong> ({continuityWarnings[0].file_name}) — Variance{' '}
                  {formatMoney(continuityWarnings[0].variance_amount, continuityWarnings[0].currency)}
                </p>
              </div>
            )}

            {(exc.suggested_rules_pending_count || 0) > 0 && (
              <div
                onClick={() => navigate('/corporate-admin/reconciliation/rules')}
                className="bg-white rounded-xl border border-indigo-200 p-3.5 cursor-pointer hover:border-indigo-400 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold text-indigo-700">
                    {exc.suggested_rules_pending_count} Learned Rule{exc.suggested_rules_pending_count > 1 ? 's' : ''} Pending Review
                  </p>
                  <ArrowRight className="w-3.5 h-3.5 text-indigo-500" />
                </div>
                <p className="text-[11px] text-slate-600 mt-1">
                  Online-induced from maker classifications — promote in Rules Engine to automate future imports.
                </p>
              </div>
            )}

            {(exc.aged_unreconciled_30d_count || 0) > 0 && (
              <div
                onClick={() => navigate('/corporate-admin/reconciliation/workspace')}
                className="bg-white rounded-xl border border-amber-200 p-3.5 cursor-pointer hover:border-amber-400 transition-colors"
              >
                <p className="text-xs font-bold text-amber-800">
                  {exc.aged_unreconciled_30d_count} Stale Unmatched Bank Line{exc.aged_unreconciled_30d_count > 1 ? 's' : ''} (&gt; 30 Days)
                </p>
                <p className="text-[11px] text-slate-600 mt-1">
                  Older statement entries still awaiting ERP invoice/payment matching.
                </p>
              </div>
            )}

            {(exc.variance_matches_count || 0) > 0 && (
              <div className="bg-white rounded-xl border border-slate-200 p-3.5">
                <p className="text-xs font-bold text-slate-800">
                  {exc.variance_matches_count} Matches with Fee / FX Variance
                </p>
                <p className="text-[11px] text-slate-500 mt-1">
                  {Object.entries(exc.variance_by_disposition || {})
                    .map(([k, v]) => `${k.replace(/_/g, ' ')}: ${formatMoney(v)}`)
                    .join(' · ')}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ==================== 4. BANK COMPLETION & TEAM WORKLOAD ==================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left (7 cols): Per-Bank Reconciliation Progress */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200/90 overflow-hidden flex flex-col">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Landmark className="w-4 h-4 text-cyan-600" />
                Reconciliation Completion by Bank
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Statement coverage, matching progress, and unclassified backlog per bank
              </p>
            </div>
            <button
              type="button"
              onClick={() => navigate('/corporate-admin/reconciliation/workspace')}
              className="text-xs font-semibold text-cyan-700 hover:text-cyan-900 shadow-none bg-transparent"
            >
              Open Ledger →
            </button>
          </div>

          <div className="p-5 space-y-3.5 max-h-[380px] overflow-y-auto flex-1">
            {bankProgress.length === 0 ? (
              <div className="py-12 text-center">
                <Landmark className="w-9 h-9 text-slate-300 mx-auto mb-2" />
                <p className="text-sm font-bold text-slate-700">No Bank Statements Ingested Yet</p>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  Treasury Makers (End Users) upload bank statements and run ERP matching from their Bank Reconciliation workspace. Progress appears here automatically.
                </p>
              </div>
            ) : (
              bankProgress.map((b) => (
                <div
                  key={b.bank_id}
                  onClick={() => navigate('/corporate-admin/reconciliation/workspace')}
                  className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 cursor-pointer transition-colors space-y-2.5"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-slate-900">{b.bank_name}</span>
                        {b.has_continuity_warning ? (
                          <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 text-[10px] font-bold">
                            Continuity Warning
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 text-[10px] font-semibold">
                            Balanced
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        {b.statements_count} Statement{b.statements_count === 1 ? '' : 's'} · Latest Ending{' '}
                        <strong>{formatDate(b.latest_end_date)}</strong> · Closing{' '}
                        <strong>{formatMoney(b.latest_closing_balance, b.currency)}</strong>
                      </p>
                    </div>

                    <div className="text-right text-xs">
                      <span className="font-extrabold text-cyan-700">{b.reconciled_pct}% Matched</span>
                      <p className="text-[10.5px] text-slate-400">
                        {b.unreconciled_txns} unmatched · {b.unclassified_txns} unclassified
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <div className="flex justify-between text-[10px] text-slate-500 mb-0.5">
                        <span>Matched ({b.reconciled_txns}/{b.total_txns})</span>
                        <span>{b.reconciled_pct}%</span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-slate-200 overflow-hidden">
                        <div className="h-full rounded-full bg-cyan-500" style={{ width: `${Math.min(b.reconciled_pct, 100)}%` }} />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-[10px] text-slate-500 mb-0.5">
                        <span>GL Classified ({b.classified_txns}/{b.total_txns})</span>
                        <span>{b.classified_pct}%</span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-slate-200 overflow-hidden">
                        <div className="h-full rounded-full bg-indigo-500" style={{ width: `${Math.min(b.classified_pct, 100)}%` }} />
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right (5 cols): Team Maker Activity & Automation Health */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200/90 overflow-hidden flex flex-col">
          <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between gap-2">
            <div className="inline-flex rounded-lg bg-slate-100 p-0.5">
              <button
                type="button"
                onClick={() => setRightTab('team')}
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold shadow-none focus:ring-0 ${
                  rightTab === 'team' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <Users className="w-3.5 h-3.5 text-cyan-600" />
                <span>Team Workload</span>
              </button>
              <button
                type="button"
                onClick={() => setRightTab('automation')}
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold shadow-none focus:ring-0 ${
                  rightTab === 'automation' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                <span>Automation Mix</span>
              </button>
            </div>
          </div>

          <div className="p-5 flex-1 max-h-[380px] overflow-y-auto">
            {rightTab === 'team' ? (
              teamActivity.length === 0 ? (
                <div className="py-10 text-center">
                  <Users className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-xs font-bold text-slate-700">No Maker Activity Recorded Yet</p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Statement uploads, ERP imports, and cleared matches by your team members will be tracked here.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {teamActivity.map((actor) => (
                    <div key={actor.user_id} className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="text-xs font-bold text-slate-900 truncate">{actor.email}</p>
                          <span className="px-1.5 py-0.2 rounded bg-slate-200/80 text-slate-600 text-[9.5px] font-bold uppercase">
                            {String(actor.role || '').replace('_', ' ')}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-1">
                          <strong>{actor.statements_uploaded}</strong> Stmts ·{' '}
                          <strong>{actor.matches_created}</strong> Matches ·{' '}
                          <strong>{actor.erp_ingested}</strong> ERP Rows
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-[10px] text-slate-400 block">Last Active</span>
                        <span className="text-[11px] font-semibold text-slate-700">
                          {actor.last_activity_at ? formatDate(actor.last_activity_at) : '—'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                    <p className="text-lg font-extrabold text-indigo-700">{autoHealth.active_confirmed_rules || 0}</p>
                    <p className="text-[10px] text-slate-500 font-semibold">Active Rules</p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                    <p className="text-lg font-extrabold text-cyan-700">{autoHealth.counterparties_count || 0}</p>
                    <p className="text-[10px] text-slate-500 font-semibold">Counterparties</p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                    <p className="text-lg font-extrabold text-emerald-700">{autoHealth.tolerance_rules_count || 0}</p>
                    <p className="text-[10px] text-slate-500 font-semibold">Tolerance Rules</p>
                  </div>
                </div>

                <div className="space-y-2.5 pt-2">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Classification Engine Attribution
                  </p>
                  {sourceEntries.length === 0 ? (
                    <p className="text-xs text-slate-400 italic py-4">No classified transactions yet.</p>
                  ) : (
                    sourceEntries.map(([src, count]) => {
                      const pct = totalSourceClassified > 0 ? Math.round((count / totalSourceClassified) * 100) : 0;
                      return (
                        <div key={src} className="space-y-1">
                          <div className="flex justify-between text-xs">
                            <span className="font-medium text-slate-700">{SOURCE_LABELS[src] || src}</span>
                            <span className="font-bold text-slate-900">
                              {count} <span className="text-slate-400 font-normal">({pct}%)</span>
                            </span>
                          </div>
                          <div className="w-full h-1.5 rounded-full bg-slate-100 overflow-hidden">
                            <div className="h-full rounded-full bg-indigo-500" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ==================== 5. RECENT STATEMENT INGESTION REGISTER ==================== */}
      <div className="bg-white rounded-2xl border border-slate-200/90 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <FileText className="w-4 h-4 text-cyan-600" />
              Statement Ingestion &amp; Clearance Register
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Click any statement to inspect its bank lines, ERP matches, and GL classifications
            </p>
          </div>
          <span className="text-xs font-semibold text-slate-500">
            Latest {recentStatements.length}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm text-left">
            <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-100">
              <tr>
                <th className="px-5 py-3">Statement File / Bank</th>
                <th className="px-4 py-3">Period</th>
                <th className="px-4 py-3 text-right">Closing Balance</th>
                <th className="px-4 py-3 text-center">Integrity</th>
                <th className="px-4 py-3 w-40">Matched</th>
                <th className="px-4 py-3 w-40">Classified</th>
                <th className="px-4 py-3">Uploaded By</th>
                <th className="px-5 py-3 text-right">Inspect</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {recentStatements.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-5 py-10 text-center text-xs text-slate-400 italic">
                    No bank statements have been uploaded yet.
                  </td>
                </tr>
              ) : (
                recentStatements.map((stmt) => (
                  <tr
                    key={stmt.id}
                    onClick={() => navigate(`/corporate-admin/reconciliation/workspace/${stmt.id}`)}
                    className="hover:bg-slate-50 cursor-pointer transition-colors"
                  >
                    <td className="px-5 py-3.5">
                      <p className="font-bold text-slate-900 truncate max-w-[220px]">{stmt.file_name}</p>
                      <p className="text-[11px] text-slate-500">{stmt.bank_name}</p>
                    </td>
                    <td className="px-4 py-3.5 text-xs text-slate-600 whitespace-nowrap">
                      {formatDate(stmt.start_date)} — {formatDate(stmt.end_date)}
                    </td>
                    <td className="px-4 py-3.5 text-right font-bold text-slate-900 whitespace-nowrap">
                      {formatMoney(stmt.closing_balance, stmt.currency)}
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      {stmt.has_continuity_warning ? (
                        <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10.5px] font-bold">
                          Continuity Gap
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10.5px] font-semibold">
                          Balanced
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                          <div className="h-full rounded-full bg-cyan-500" style={{ width: `${Math.min(stmt.reconciled_pct, 100)}%` }} />
                        </div>
                        <span className="text-xs font-bold text-slate-700 w-10 text-right">{stmt.reconciled_pct}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                          <div className="h-full rounded-full bg-indigo-500" style={{ width: `${Math.min(stmt.classified_pct, 100)}%` }} />
                        </div>
                        <span className="text-xs font-bold text-slate-700 w-10 text-right">{stmt.classified_pct}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-xs text-slate-600">
                      <p className="truncate max-w-[160px]">{stmt.uploaded_by}</p>
                      <p className="text-[10px] text-slate-400">{formatDate(stmt.created_at)}</p>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-cyan-700">
                        View <ArrowRight className="w-3.5 h-3.5" />
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
