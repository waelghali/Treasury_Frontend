import React, { useState, useEffect } from 'react';
import apiClient from '../../services/apiClient';
import {
    Activity, Shield, Landmark, CheckCircle2,
    AlertCircle, BarChart3, Layers, RefreshCw
} from 'lucide-react';

export default function QuotationTelemetryDashboard() {
    const [telemetry, setTelemetry] = useState(null);
    const [loading, setLoading] = useState(true);

    const fetchTelemetry = async () => {
        try {
            const res = await apiClient.get('/system-owner/quotations-telemetry');
            setTelemetry(res.data);
        } catch (err) {
            console.error('Failed to load quotation telemetry:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTelemetry();
    }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="text-center">
                    <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-gray-500 text-sm font-medium">Aggregating platform quotation telemetry...</p>
                </div>
            </div>
        );
    }

    const velocity = telemetry?.velocity || {};
    const governance = telemetry?.governance || {};
    const banks = telemetry?.bank_ecosystem || [];

    return (
        <div className="w-full max-w-[1400px] mx-auto p-4 sm:p-8 space-y-8">
            {/* Header */}
            <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2.5">
                        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900">
                            Quotation Ecosystem Telemetry
                        </h1>
                        <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                            Live Matrix
                        </span>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">
                        Macro liquidity velocity, bank participation rankings, and governance bottlenecks across the platform.
                    </p>
                </div>
                <div className="flex items-center gap-2 self-stretch sm:self-auto">
                    <button
                        onClick={fetchTelemetry}
                        className="flex items-center gap-1.5 px-3.5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-xl transition-all"
                    >
                        <RefreshCw size={13} /> Refresh
                    </button>
                    <div className="text-[11px] text-slate-500 bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl flex items-center gap-1.5">
                        <Shield size={13} className="text-emerald-600" />
                        <span>Zero-Knowledge Privacy Guaranteed</span>
                    </div>
                </div>
            </header>

            {/* Macro Velocity Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-3xl shadow-sm border border-black/5 space-y-2">
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Total Network RFQs</span>
                        <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                            <Activity size={16} />
                        </div>
                    </div>
                    <p className="text-2xl sm:text-3xl font-bold text-gray-900">{velocity.total_rfqs || 0}</p>
                    <p className="text-xs text-gray-500">
                        {velocity.live_desk_rfqs || 0} currently active on desks
                    </p>
                </div>

                <div className="bg-white p-5 rounded-3xl shadow-sm border border-black/5 space-y-2">
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Traded Execution Ratio</span>
                        <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                            <CheckCircle2 size={16} />
                        </div>
                    </div>
                    <p className="text-2xl sm:text-3xl font-bold text-emerald-600">{velocity.traded_ratio_pct || 0}%</p>
                    <p className="text-xs text-gray-500">
                        {velocity.completed_rfqs || 0} successfully traded
                    </p>
                </div>

                <div className="bg-white p-5 rounded-3xl shadow-sm border border-black/5 space-y-2">
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Inconclusive Rate</span>
                        <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                            <AlertCircle size={16} />
                        </div>
                    </div>
                    <p className="text-2xl sm:text-3xl font-bold text-amber-600">{velocity.inconclusive_ratio_pct || 0}%</p>
                    <p className="text-xs text-gray-500">
                        Zero quotes or tolerance breach
                    </p>
                </div>

                <div className="bg-white p-5 rounded-3xl shadow-sm border border-black/5 space-y-2">
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Revision Loop Rate</span>
                        <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                            <RefreshCw size={16} />
                        </div>
                    </div>
                    <p className="text-2xl sm:text-3xl font-bold text-purple-600">{governance.revision_loop_rate_pct || 0}%</p>
                    <p className="text-xs text-gray-500">
                        Returned by admins for revisions
                    </p>
                </div>
            </div>

            {/* Product Mix & Volume Tiers */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white p-5 sm:p-6 rounded-3xl shadow-sm border border-black/5 space-y-3">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 flex items-center gap-2">
                        <Layers size={14} /> Product Mix Distribution
                    </h3>
                    <div className="grid grid-cols-2 gap-3 pt-1">
                        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                            <span className="text-xs font-semibold text-slate-500 block">FX Spot Trades</span>
                            <span className="text-2xl font-bold text-slate-900">{velocity.product_mix?.fx_spot_count || 0}</span>
                        </div>
                        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                            <span className="text-xs font-semibold text-slate-500 block">Treasury Bills (T-Bills)</span>
                            <span className="text-2xl font-bold text-slate-900">{velocity.product_mix?.tbill_count || 0}</span>
                        </div>
                    </div>
                </div>

                <div className="bg-white p-5 sm:p-6 rounded-3xl shadow-sm border border-black/5 space-y-3">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 flex items-center gap-2">
                        <BarChart3 size={14} /> Macro Volume Tiers (Differential Privacy)
                    </h3>
                    <div className="grid grid-cols-3 gap-2 pt-1">
                        <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 text-center">
                            <span className="text-[10px] font-bold text-slate-400 block uppercase">Tier 1 (&lt;$250K)</span>
                            <span className="text-xl font-bold text-slate-900">{velocity.volume_tiers?.tier1_under_250k || 0}</span>
                        </div>
                        <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 text-center">
                            <span className="text-[10px] font-bold text-slate-400 block uppercase">Tier 2 ($250K-$1M)</span>
                            <span className="text-xl font-bold text-slate-900">{velocity.volume_tiers?.tier2_250k_to_1m || 0}</span>
                        </div>
                        <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 text-center">
                            <span className="text-[10px] font-bold text-slate-400 block uppercase">Tier 3 (&gt;$1M)</span>
                            <span className="text-xl font-bold text-slate-900">{velocity.volume_tiers?.tier3_over_1m || 0}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Bank Participation & SLA Scorecard Table */}
            <section className="bg-white rounded-3xl shadow-sm border border-black/5 overflow-hidden">
                <div className="p-5 sm:p-6 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                    <div>
                        <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                            <Landmark size={16} className="text-indigo-600" />
                            Commercial Bank Network SLA & Participation League
                        </h3>
                        <p className="text-xs text-gray-500 mt-0.5">
                            Identifies active vs underperforming banking institutions across tender invitations.
                        </p>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[700px]">
                        <thead>
                            <tr className="bg-gray-50/80 border-b border-gray-100">
                                <th className="px-5 py-3.5 text-[10px] font-bold text-gray-400 uppercase">Bank Institution</th>
                                <th className="px-5 py-3.5 text-[10px] font-bold text-gray-400 uppercase text-center">Invitations</th>
                                <th className="px-5 py-3.5 text-[10px] font-bold text-gray-400 uppercase text-center">Quotes Submitted</th>
                                <th className="px-5 py-3.5 text-[10px] font-bold text-gray-400 uppercase">Participation Rate</th>
                                <th className="px-5 py-3.5 text-[10px] font-bold text-gray-400 uppercase">Avg Response Time</th>
                                <th className="px-5 py-3.5 text-[10px] font-bold text-gray-400 uppercase text-right">Ecosystem Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {banks.map((b) => (
                                <tr key={b.bank_id} className="hover:bg-gray-50/60 transition-colors">
                                    <td className="px-5 py-4 font-bold text-sm text-gray-900 flex items-center gap-2.5">
                                        <div className="w-8 h-8 rounded-xl bg-gray-100 flex items-center justify-center text-gray-600 shrink-0">
                                            <Landmark size={14} />
                                        </div>
                                        <span>{b.bank_name}</span>
                                    </td>
                                    <td className="px-5 py-4 text-xs font-mono font-bold text-gray-700 text-center">
                                        {b.invitations_count}
                                    </td>
                                    <td className="px-5 py-4 text-xs font-mono font-bold text-gray-700 text-center">
                                        {b.quotes_submitted}
                                    </td>
                                    <td className="px-5 py-4 min-w-[160px]">
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs font-bold font-mono">{b.participation_rate}%</span>
                                            <div className="flex-1 bg-gray-100 h-2 rounded-full overflow-hidden">
                                                <div
                                                    className={`h-full rounded-full transition-all duration-500 ${
                                                        b.participation_rate >= 75 ? 'bg-emerald-500' :
                                                        b.participation_rate >= 50 ? 'bg-blue-500' : 'bg-amber-500'
                                                    }`}
                                                    style={{ width: `${Math.min(100, b.participation_rate)}%` }}
                                                />
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-5 py-4 text-xs text-gray-600 font-mono">
                                        {b.avg_response_minutes ? `${b.avg_response_minutes} mins` : '—'}
                                    </td>
                                    <td className="px-5 py-4 text-right">
                                        <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider ${
                                            b.status === 'EXCELLENT' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                                            b.status === 'HEALTHY' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                                            'bg-amber-50 text-amber-800 border border-amber-200'
                                        }`}>
                                            {b.status === 'NEEDS_ATTENTION' ? 'Low Response (<50%)' : b.status}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                            {banks.length === 0 && (
                                <tr>
                                    <td colSpan="6" className="py-12 text-center text-gray-400 italic">
                                        No bank response data recorded yet.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </section>
        </div>
    );
}
