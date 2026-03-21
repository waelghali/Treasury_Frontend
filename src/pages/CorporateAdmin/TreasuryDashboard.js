import React, { useState, useEffect } from 'react';
import {
    BarChart3, Clock, AlertTriangle, Shield, TrendingUp,
    FileText, ArrowRight, Loader2, Activity, CheckCircle2,
    Calendar, Landmark, RefreshCw, Inbox, ClipboardList
} from 'lucide-react';
import { apiRequest } from '../../services/apiService';
import { useNavigate } from 'react-router-dom';

export default function TreasuryDashboard() {
    const navigate = useNavigate();
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchStats = async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await apiRequest('/issuance/dashboard-stats', 'GET');
            setStats(data);
        } catch (err) {
            setError(err.message || 'Failed to load dashboard');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchStats(); }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="text-center">
                    <Loader2 className="w-10 h-10 animate-spin text-indigo-600 mx-auto mb-3" />
                    <p className="text-slate-500 text-sm">Loading treasury dashboard...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="bg-red-50 border border-red-200 rounded-2xl p-8 text-center max-w-md">
                    <AlertTriangle className="w-8 h-8 text-red-500 mx-auto mb-3" />
                    <h3 className="font-bold text-red-900 mb-1">Dashboard Error</h3>
                    <p className="text-sm text-red-600">{error}</p>
                    <button onClick={fetchStats} className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-bold hover:bg-red-700">
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    const s = stats || {};

    // Color helpers for utilization gauges
    const getUtilColor = (pct) => {
        if (pct >= 90) return { bar: 'bg-red-500', bg: 'bg-red-100', text: 'text-red-700' };
        if (pct >= 70) return { bar: 'bg-amber-500', bg: 'bg-amber-100', text: 'text-amber-700' };
        return { bar: 'bg-emerald-500', bg: 'bg-emerald-100', text: 'text-emerald-700' };
    };

    // Days remaining badge color
    const getDaysBadge = (days) => {
        if (days <= 3) return 'bg-red-100 text-red-700 border-red-200';
        if (days <= 7) return 'bg-amber-100 text-amber-700 border-amber-200';
        return 'bg-blue-100 text-blue-700 border-blue-200';
    };

    // Activity icon
    const getActivityIcon = (type) => {
        if (type === 'ISSUED') return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
        if (type.includes('EXTEND')) return <Calendar className="w-4 h-4 text-blue-500" />;
        if (type.includes('CLOSE')) return <Shield className="w-4 h-4 text-slate-500" />;
        return <Activity className="w-4 h-4 text-indigo-500" />;
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                    <BarChart3 className="w-7 h-7 text-indigo-600" />
                    Treasury Dashboard
                </h1>
                <p className="text-slate-500 mt-1 text-sm">Real-time overview of your LG issuance operations</p>
            </div>

            {/* KPI Cards Row */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Pending Requests */}
                <div
                    onClick={() => navigate('/corporate-admin/issuance/requests')}
                    className="bg-white rounded-2xl border border-slate-200 p-5 cursor-pointer hover:shadow-lg hover:border-indigo-200 transition-all group"
                >
                    <div className="flex items-center justify-between mb-3">
                        <div className="p-2.5 bg-indigo-100 rounded-xl group-hover:bg-indigo-200 transition-colors">
                            <ClipboardList className="w-5 h-5 text-indigo-600" />
                        </div>
                        <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-indigo-500 transition-colors" />
                    </div>
                    <p className="text-2xl font-bold text-slate-900">{s.pending_requests || 0}</p>
                    <p className="text-xs text-slate-500 mt-0.5">Pending Requests</p>
                </div>

                {/* My Pending Approvals */}
                <div
                    onClick={() => navigate('/corporate-admin/approval-inbox')}
                    className="bg-white rounded-2xl border border-slate-200 p-5 cursor-pointer hover:shadow-lg hover:border-blue-200 transition-all group"
                >
                    <div className="flex items-center justify-between mb-3">
                        <div className="p-2.5 bg-blue-100 rounded-xl group-hover:bg-blue-200 transition-colors">
                            <Inbox className="w-5 h-5 text-blue-600" />
                        </div>
                        <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-blue-500 transition-colors" />
                    </div>
                    <p className="text-2xl font-bold text-slate-900">{s.pending_approvals || 0}</p>
                    <p className="text-xs text-slate-500 mt-0.5">My Pending Approvals</p>
                </div>

                {/* SLA Breaches */}
                <div className="bg-white rounded-2xl border border-slate-200 p-5 hover:shadow-lg transition-all">
                    <div className="flex items-center justify-between mb-3">
                        <div className={`p-2.5 rounded-xl ${s.sla_breaches > 0 ? 'bg-red-100' : 'bg-emerald-100'}`}>
                            <AlertTriangle className={`w-5 h-5 ${s.sla_breaches > 0 ? 'text-red-600' : 'text-emerald-600'}`} />
                        </div>
                    </div>
                    <p className={`text-2xl font-bold ${s.sla_breaches > 0 ? 'text-red-600' : 'text-slate-900'}`}>
                        {s.sla_breaches || 0}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">SLA Breaches</p>
                </div>

                {/* Expiring 7d */}
                <div className="bg-white rounded-2xl border border-slate-200 p-5 hover:shadow-lg transition-all">
                    <div className="flex items-center justify-between mb-3">
                        <div className={`p-2.5 rounded-xl ${s.expiring_lgs_7d > 0 ? 'bg-amber-100' : 'bg-emerald-100'}`}>
                            <Clock className={`w-5 h-5 ${s.expiring_lgs_7d > 0 ? 'text-amber-600' : 'text-emerald-600'}`} />
                        </div>
                    </div>
                    <p className={`text-2xl font-bold ${s.expiring_lgs_7d > 0 ? 'text-amber-600' : 'text-slate-900'}`}>
                        {s.expiring_lgs_7d || 0}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">Expiring in 7 Days</p>
                </div>
            </div>

            {/* Summary Banner */}
            <div className="bg-gradient-to-r from-indigo-600 to-violet-600 rounded-2xl p-6 text-white flex items-center justify-between">
                <div>
                    <p className="text-indigo-200 text-xs font-bold uppercase tracking-wider">Portfolio Overview</p>
                    <div className="flex items-baseline gap-6 mt-2">
                        <div>
                            <span className="text-3xl font-bold">{s.total_active_lgs || 0}</span>
                            <span className="text-indigo-200 text-sm ml-1">Active LGs</span>
                        </div>
                        <div className="h-8 w-px bg-indigo-400/50" />
                        <div>
                            <span className="text-3xl font-bold">
                                {(s.total_active_amount || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                            </span>
                            <span className="text-indigo-200 text-sm ml-1">Total Exposure</span>
                        </div>
                        <div className="h-8 w-px bg-indigo-400/50" />
                        <div>
                            <span className="text-3xl font-bold">{s.pending_bank_replies || 0}</span>
                            <span className="text-indigo-200 text-sm ml-1">Awaiting Bank Reply</span>
                        </div>
                    </div>
                </div>
                <TrendingUp className="w-12 h-12 text-indigo-300/40" />
            </div>

            {/* Main Grid: Facility Utilization + Expiring LGs */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* Facility Utilization */}
                <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                    <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
                        <h3 className="font-bold text-slate-900 flex items-center gap-2">
                            <Landmark className="w-4 h-4 text-indigo-600" />
                            Facility Utilization
                        </h3>
                        <button
                            onClick={() => navigate('/corporate-admin/issuance/facilities')}
                            className="text-xs text-indigo-600 font-semibold hover:text-indigo-800"
                        >
                            View All →
                        </button>
                    </div>
                    <div className="p-6 space-y-5">
                        {(s.facility_utilization || []).length === 0 ? (
                            <p className="text-sm text-slate-400 text-center py-4">No active facilities</p>
                        ) : (
                            (s.facility_utilization || []).map((fac, i) => {
                                const colors = getUtilColor(fac.used_pct);
                                return (
                                    <div key={fac.facility_id || i} className="space-y-2">
                                        <div className="flex justify-between items-center">
                                            <div>
                                                <p className="text-sm font-semibold text-slate-900">{fac.bank}</p>
                                                <p className="text-[10px] text-slate-400">{fac.facility_name}</p>
                                            </div>
                                            <div className="text-right">
                                                <span className={`text-sm font-bold ${colors.text}`}>
                                                    {fac.used_pct}%
                                                </span>
                                                <p className="text-[10px] text-slate-400">
                                                    {fac.currency} {fac.available.toLocaleString()} available
                                                </p>
                                            </div>
                                        </div>
                                        <div className={`w-full h-2.5 rounded-full ${colors.bg}`}>
                                            <div
                                                className={`h-full rounded-full ${colors.bar} transition-all duration-700 ease-out`}
                                                style={{ width: `${Math.min(fac.used_pct, 100)}%` }}
                                            />
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* Expiring LGs Table */}
                <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                    <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
                        <h3 className="font-bold text-slate-900 flex items-center gap-2">
                            <Clock className="w-4 h-4 text-amber-600" />
                            Expiring Within 30 Days
                        </h3>
                        <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-bold">
                            {s.expiring_lgs_30d || 0} total
                        </span>
                    </div>
                    <div className="divide-y divide-slate-100 max-h-[340px] overflow-y-auto">
                        {(s.expiring_lgs || []).length === 0 ? (
                            <div className="p-6 text-center text-slate-400 text-sm">
                                <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                                No LGs expiring within 30 days
                            </div>
                        ) : (
                            (s.expiring_lgs || []).map(lg => (
                                <div key={lg.id} className="px-6 py-3 flex items-center justify-between hover:bg-slate-50 transition-colors">
                                    <div>
                                        <p className="text-sm font-semibold text-slate-900">{lg.ref}</p>
                                        <p className="text-[10px] text-slate-400">{lg.beneficiary} · {lg.bank}</p>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className="text-sm font-bold text-slate-700">
                                            {lg.currency} {lg.amount.toLocaleString()}
                                        </span>
                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${getDaysBadge(lg.days_remaining)}`}>
                                            {lg.days_remaining}d
                                        </span>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            {/* Bottom Row: Recent Activity + Quick Actions */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Recent Activity */}
                <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 overflow-hidden">
                    <div className="px-6 py-4 border-b border-slate-100">
                        <h3 className="font-bold text-slate-900 flex items-center gap-2">
                            <Activity className="w-4 h-4 text-violet-600" />
                            Recent Activity
                        </h3>
                    </div>
                    <div className="divide-y divide-slate-100 max-h-[300px] overflow-y-auto">
                        {(s.recent_activity || []).length === 0 ? (
                            <div className="p-6 text-center text-slate-400 text-sm">No recent activity</div>
                        ) : (
                            (s.recent_activity || []).map((item, idx) => (
                                <div key={idx} className="px-6 py-3 flex items-center gap-3 hover:bg-slate-50 transition-colors">
                                    <div className="p-1.5 bg-slate-100 rounded-lg shrink-0">
                                        {getActivityIcon(item.type)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm text-slate-900 truncate">
                                            <span className="font-semibold">{item.ref}</span>
                                            <span className="text-slate-400 mx-1.5">—</span>
                                            {item.description}
                                        </p>
                                    </div>
                                    <span className="text-[10px] text-slate-400 shrink-0">
                                        {item.timestamp ? new Date(item.timestamp).toLocaleDateString() : ''}
                                    </span>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Quick Actions */}
                <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                    <div className="px-6 py-4 border-b border-slate-100">
                        <h3 className="font-bold text-slate-900">Quick Actions</h3>
                    </div>
                    <div className="p-4 space-y-2">
                        {[
                            { label: 'Approval Inbox', icon: Inbox, path: '/corporate-admin/approval-inbox', color: 'text-blue-600 bg-blue-50' },
                            { label: 'All Requests', icon: ClipboardList, path: '/corporate-admin/issuance/requests', color: 'text-indigo-600 bg-indigo-50' },
                            { label: 'Issued LGs', icon: FileText, path: '/corporate-admin/issuance/issued-lgs', color: 'text-emerald-600 bg-emerald-50' },
                            { label: 'Facilities', icon: Landmark, path: '/corporate-admin/issuance/facilities', color: 'text-violet-600 bg-violet-50' },
                            { label: 'Reconciliation', icon: RefreshCw, path: '/corporate-admin/reconciliation', color: 'text-amber-600 bg-amber-50' },
                        ].map(action => (
                            <button
                                key={action.path}
                                onClick={() => navigate(action.path)}
                                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-slate-50 transition-all text-left group"
                            >
                                <div className={`p-2 rounded-lg ${action.color}`}>
                                    <action.icon className="w-4 h-4" />
                                </div>
                                <span className="text-sm font-medium text-slate-700 flex-1">{action.label}</span>
                                <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500 transition-colors" />
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
