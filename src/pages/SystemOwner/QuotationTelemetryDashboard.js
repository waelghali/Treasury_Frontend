import React, { useState, useEffect } from 'react';
import apiClient from '../../services/apiClient';
import {
    Activity, Shield, Landmark, CheckCircle2,
    AlertCircle, BarChart3, Layers, RefreshCw,
    Trophy, Crown, Zap, Eye, Globe, Hourglass,
    Award, X, Building2, Flame, ArrowLeft,
    Search, Filter, ChevronRight
} from 'lucide-react';

export default function QuotationTelemetryDashboard() {
    const [activeTab, setActiveTab] = useState('telemetry'); // 'telemetry' | 'trophies'
    const [telemetry, setTelemetry] = useState(null);
    const [loading, setLoading] = useState(true);

    // Phase 7.1: Trophy Diagnostics & Leaderboard State
    const [trophiesData, setTrophiesData] = useState(null);
    const [trophiesLoading, setTrophiesLoading] = useState(false);
    const [selectedBankId, setSelectedBankId] = useState(null);
    const [selectedDealerEmail, setSelectedDealerEmail] = useState('');
    const [isStreakModalOpen, setIsStreakModalOpen] = useState(false);
    const [trophySubView, setTrophySubView] = useState('comparison'); // 'comparison' | 'deep_dive'
    const [hideInactive, setHideInactive] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [sortField, setSortField] = useState('vol_usd');
    const [sortDir, setSortDir] = useState('desc');

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

    const fetchTrophies = async (bankId = selectedBankId, dealerEmail = selectedDealerEmail) => {
        setTrophiesLoading(true);
        try {
            let url = '/system-owner/quotation-diagnostics/bank-trophies';
            const params = new URLSearchParams();
            if (bankId) params.append('bank_id', bankId);
            if (dealerEmail) params.append('dealer_email', dealerEmail);
            if (params.toString()) url += `?${params.toString()}`;

            const res = await apiClient.get(url);
            setTrophiesData(res.data);
            if (!selectedBankId && res.data?.selected_bank_id) {
                setSelectedBankId(res.data.selected_bank_id);
            }
        } catch (err) {
            console.error('Failed to load bank trophies diagnostics:', err);
        } finally {
            setTrophiesLoading(false);
        }
    };

    useEffect(() => {
        fetchTelemetry();
        fetchTrophies();
    }, []);

    const handleBankChange = (newBankId) => {
        const idNum = parseInt(newBankId, 10);
        setSelectedBankId(idNum);
        setSelectedDealerEmail('');
        fetchTrophies(idNum, '');
    };

    const handleDealerChange = (newEmail) => {
        setSelectedDealerEmail(newEmail);
        fetchTrophies(selectedBankId, newEmail);
    };

    const handleInspectBank = (bankId) => {
        const idNum = parseInt(bankId, 10);
        setSelectedBankId(idNum);
        setSelectedDealerEmail('');
        setTrophySubView('deep_dive');
        fetchTrophies(idNum, '');
    };

    const handleSort = (field) => {
        if (sortField === field) {
            setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortDir('desc');
        }
    };

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

    // Phase 7.1 Data mappings
    const banksRoster = trophiesData?.banks || [];
    const macroSummary = trophiesData?.macro_summary || {
        total_active_desks: banksRoster.filter(b => b.has_execution).length,
        total_onboarded_banks: banksRoster.length,
        total_market_volume_usd: banksRoster.reduce((sum, b) => sum + (b.vol_usd || 0), 0),
        total_market_deals: banksRoster.reduce((sum, b) => sum + (b.deals || 0), 0),
        total_market_quotes: banksRoster.reduce((sum, b) => sum + (b.quotes || 0), 0)
    };

    const activeBanks = banksRoster.filter(b => b.has_execution);
    const inactiveBanks = banksRoster.filter(b => !b.has_execution);

    const filteredBanks = banksRoster.filter(b => {
        if (hideInactive && !b.has_execution) return false;
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            const matchesName = b.name && b.name.toLowerCase().includes(q);
            const matchesDealer = b.dealers && b.dealers.some(d => (d.email && d.email.toLowerCase().includes(q)) || (d.name && d.name.toLowerCase().includes(q)));
            return matchesName || matchesDealer;
        }
        return true;
    }).sort((a, b) => {
        let aVal = a[sortField] ?? 0;
        let bVal = b[sortField] ?? 0;
        if (typeof aVal === 'string') {
            return sortDir === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
        }
        return sortDir === 'asc' ? (aVal - bVal) : (bVal - aVal);
    });

    const currentBankObj = banksRoster.find(b => b.id === selectedBankId);
    const availableDealers = currentBankObj?.dealers || [];
    const achievements = trophiesData?.achievements || {};
    const trophiesList = achievements?.trophies || [];
    const personalBests = achievements?.personal_bests || {};
    const streakAuditTrail = trophiesData?.streak_audit || [];

    const getTierColorBadge = (tier) => {
        switch (tier) {
            case 'PLATINUM':
                return 'bg-purple-100 text-purple-900 border-purple-300';
            case 'GOLD':
                return 'bg-amber-100 text-amber-900 border-amber-300';
            case 'SILVER':
                return 'bg-slate-100 text-slate-800 border-slate-300';
            case 'BRONZE':
                return 'bg-orange-100 text-orange-900 border-orange-300';
            default:
                return 'bg-gray-100 text-gray-500 border-gray-200';
        }
    };

    const getTrophyIcon = (iconName) => {
        switch (iconName) {
            case 'Trophy': return <Trophy className="text-amber-500" size={20} />;
            case 'Crown': return <Crown className="text-yellow-600" size={20} />;
            case 'Landmark': return <Landmark className="text-emerald-600" size={20} />;
            case 'Zap': return <Zap className="text-blue-500" size={20} />;
            case 'Eye': return <Eye className="text-indigo-500" size={20} />;
            case 'Shield': return <Shield className="text-emerald-600" size={20} />;
            case 'Globe': return <Globe className="text-cyan-600" size={20} />;
            case 'Hourglass': return <Hourglass className="text-amber-600" size={20} />;
            default: return <Award className="text-indigo-500" size={20} />;
        }
    };

    return (
        <div className="w-full max-w-[1400px] mx-auto p-4 sm:p-8 space-y-6">
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
                        Macro liquidity velocity, commercial bank SLA performance, and institutional 8-trophy streak diagnostics.
                    </p>
                </div>
                <div className="flex items-center gap-2 self-stretch sm:self-auto">
                    <button
                        onClick={() => {
                            if (activeTab === 'telemetry') fetchTelemetry();
                            else fetchTrophies();
                        }}
                        className="flex items-center gap-1.5 px-3.5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-xl transition-all"
                    >
                        <RefreshCw size={13} className={trophiesLoading ? 'animate-spin' : ''} /> Refresh
                    </button>
                    <div className="text-[11px] text-slate-500 bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl flex items-center gap-1.5">
                        <Shield size={13} className="text-emerald-600" />
                        <span>Zero-Knowledge Privacy Guaranteed</span>
                    </div>
                </div>
            </header>

            {/* Top Navigation Tabs */}
            <div className="flex items-center gap-2 border-b border-gray-200 pb-2">
                <button
                    onClick={() => setActiveTab('telemetry')}
                    className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2 ${
                        activeTab === 'telemetry'
                            ? 'bg-slate-900 text-white shadow-xs'
                            : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
                    }`}
                >
                    <BarChart3 size={15} /> Network Telemetry &amp; SLA Matrix
                </button>
                <button
                    onClick={() => {
                        setActiveTab('trophies');
                        if (!trophiesData) fetchTrophies();
                    }}
                    className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2 ${
                        activeTab === 'trophies'
                            ? 'bg-indigo-600 text-white shadow-xs'
                            : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
                    }`}
                >
                    <Trophy size={15} /> Bank Desk &amp; Dealer 8-Trophy Diagnostics
                </button>
            </div>

            {/* TAB 1: MACRO NETWORK TELEMETRY */}
            {activeTab === 'telemetry' && (
                <div className="space-y-8 animate-fadeIn">
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
                                    Commercial Bank Network SLA &amp; Participation League
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
            )}

            {/* TAB 2: BANK DESK & DEALER 8-TROPHY DIAGNOSTICS */}
            {activeTab === 'trophies' && (
                <div className="space-y-6 animate-fadeIn">
                    {/* Sub-Navigation & Diagnostic Mode Control Bar */}
                    <div className="bg-white p-4 rounded-3xl shadow-sm border border-black/5 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
                        <div className="flex flex-wrap items-center gap-2">
                            <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-2xl">
                                <button
                                    onClick={() => setTrophySubView('comparison')}
                                    className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2 ${
                                        trophySubView === 'comparison'
                                            ? 'bg-white text-indigo-700 shadow-xs'
                                            : 'text-slate-600 hover:text-slate-900'
                                    }`}
                                >
                                    <BarChart3 size={15} />
                                    <span>Counterparty Comparison Matrix</span>
                                    <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700">
                                        {macroSummary.total_active_desks} Active
                                    </span>
                                </button>
                                <button
                                    onClick={() => setTrophySubView('deep_dive')}
                                    className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2 ${
                                        trophySubView === 'deep_dive'
                                            ? 'bg-white text-indigo-700 shadow-xs'
                                            : 'text-slate-600 hover:text-slate-900'
                                    }`}
                                >
                                    <Trophy size={15} />
                                    <span>Single Desk 8-Trophies Deep Dive</span>
                                    {currentBankObj && (
                                        <span className="text-[10px] font-semibold text-slate-500 max-w-[130px] truncate hidden md:inline">
                                            ({currentBankObj.name.split(' ')[0]})
                                        </span>
                                    )}
                                </button>
                            </div>
                        </div>

                        {/* Search and Inactive Desks Filter Toggle */}
                        <div className="flex flex-wrap items-center gap-3">
                            <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer select-none bg-slate-50 hover:bg-slate-100 px-3.5 py-2 rounded-xl border border-slate-200 transition-colors">
                                <input
                                    type="checkbox"
                                    checked={hideInactive}
                                    onChange={(e) => setHideInactive(e.target.checked)}
                                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-gray-300"
                                />
                                <span className="flex items-center gap-1.5">
                                    <Filter size={13} className={hideInactive ? 'text-indigo-600' : 'text-slate-400'} />
                                    <span>Hide 0-Execution Desks</span>
                                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${hideInactive ? 'bg-indigo-100 text-indigo-800' : 'bg-slate-200 text-slate-600'}`}>
                                        {hideInactive ? `${macroSummary.total_active_desks} of ${macroSummary.total_onboarded_banks}` : `All ${macroSummary.total_onboarded_banks}`}
                                    </span>
                                </span>
                            </label>

                            <button
                                onClick={() => setIsStreakModalOpen(true)}
                                className="flex items-center gap-1.5 px-3.5 py-2 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 text-xs font-bold rounded-xl transition-all shadow-2xs"
                                title="View clean-sweep streak progression and competitor win resets"
                            >
                                <Flame size={14} className="text-amber-600" />
                                <span>Streak Audit ({streakAuditTrail.length})</span>
                            </button>
                        </div>
                    </div>

                    {/* SUB-VIEW 1: COMPARATIVE LEADERBOARD & PROGRESS MATRIX */}
                    {trophySubView === 'comparison' && (
                        <div className="space-y-6">
                            {/* Macro KPIs */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                <div className="bg-white p-5 rounded-3xl shadow-sm border border-black/5 space-y-2">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Active Desks</span>
                                        <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                                            <Building2 size={16} />
                                        </div>
                                    </div>
                                    <p className="text-2xl sm:text-3xl font-bold text-gray-900">
                                        {macroSummary.total_active_desks}
                                        <span className="text-sm font-semibold text-slate-400 ml-1.5">/ {macroSummary.total_onboarded_banks}</span>
                                    </p>
                                    <p className="text-xs text-slate-500">
                                        {macroSummary.total_onboarded_banks - macroSummary.total_active_desks} desks idle (0 executions)
                                    </p>
                                </div>

                                <div className="bg-white p-5 rounded-3xl shadow-sm border border-black/5 space-y-2">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Market Volume Won</span>
                                        <div className="w-8 h-8 rounded-xl bg-cyan-50 text-cyan-600 flex items-center justify-center">
                                            <Landmark size={16} />
                                        </div>
                                    </div>
                                    <p className="text-2xl sm:text-3xl font-bold text-gray-900 font-mono">
                                        ${(macroSummary.total_market_volume_usd / 1000000).toFixed(2)}M
                                    </p>
                                    <p className="text-xs text-slate-500">
                                        Awarded USD trade volume
                                    </p>
                                </div>

                                <div className="bg-white p-5 rounded-3xl shadow-sm border border-black/5 space-y-2">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Platform Deals Won</span>
                                        <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                                            <CheckCircle2 size={16} />
                                        </div>
                                    </div>
                                    <p className="text-2xl sm:text-3xl font-bold text-gray-900">
                                        {macroSummary.total_market_deals}
                                    </p>
                                    <p className="text-xs text-slate-500">
                                        Corporate tender awards
                                    </p>
                                </div>

                                <div className="bg-white p-5 rounded-3xl shadow-sm border border-black/5 space-y-2">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Live Quotes Logged</span>
                                        <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                                            <Zap size={16} />
                                        </div>
                                    </div>
                                    <p className="text-2xl sm:text-3xl font-bold text-gray-900">
                                        {macroSummary.total_market_quotes}
                                    </p>
                                    <p className="text-xs text-slate-500">
                                        Competitive firm submissions
                                    </p>
                                </div>
                            </div>

                            {/* Search and Quick Filter Row */}
                            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-4 rounded-3xl border border-black/5 shadow-2xs">
                                <div className="relative flex-1 max-w-md">
                                    <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <input
                                        type="text"
                                        placeholder="Search bank name or dealer..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="w-full pl-9 pr-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-gray-900 placeholder-slate-400 focus:bg-white focus:border-indigo-600 outline-none transition-all"
                                    />
                                    {searchQuery && (
                                        <button
                                            onClick={() => setSearchQuery('')}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                                        >
                                            <X size={13} />
                                        </button>
                                    )}
                                </div>

                                <div className="flex items-center gap-1.5 flex-wrap text-xs text-slate-500">
                                    <span className="font-semibold text-slate-400 uppercase tracking-wider text-[10px] mr-1">Quick Sort:</span>
                                    <button
                                        onClick={() => handleSort('vol_usd')}
                                        className={`px-2.5 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1 ${
                                            sortField === 'vol_usd' ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                                        }`}
                                    >
                                        Volume {sortField === 'vol_usd' && (sortDir === 'desc' ? '↓' : '↑')}
                                    </button>
                                    <button
                                        onClick={() => handleSort('deals')}
                                        className={`px-2.5 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1 ${
                                            sortField === 'deals' ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                                        }`}
                                    >
                                        Deals {sortField === 'deals' && (sortDir === 'desc' ? '↓' : '↑')}
                                    </button>
                                    <button
                                        onClick={() => handleSort('quotes')}
                                        className={`px-2.5 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1 ${
                                            sortField === 'quotes' ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                                        }`}
                                    >
                                        Quotes {sortField === 'quotes' && (sortDir === 'desc' ? '↓' : '↑')}
                                    </button>
                                    <button
                                        onClick={() => handleSort('unlocked')}
                                        className={`px-2.5 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1 ${
                                            sortField === 'unlocked' ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                                        }`}
                                    >
                                        Trophies {sortField === 'unlocked' && (sortDir === 'desc' ? '↓' : '↑')}
                                    </button>
                                </div>
                            </div>

                            {/* Comparison Matrix Table */}
                            <div className="bg-white rounded-3xl shadow-sm border border-black/5 overflow-hidden">
                                <div className="p-5 border-b border-gray-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                                    <div>
                                        <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                                            <Trophy size={18} className="text-amber-500" />
                                            Counterparty Execution Matrix &amp; Trophy Leaderboard
                                        </h3>
                                        <p className="text-xs text-gray-500 mt-0.5">
                                            Side-by-side liquidity ranking across confirmed tender awards, firm quotes, desk tier, and trophy milestones.
                                        </p>
                                    </div>
                                    <div className="text-xs font-semibold text-slate-500 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
                                        Showing {filteredBanks.length} of {banksRoster.length} counterparties
                                    </div>
                                </div>

                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-xs">
                                        <thead>
                                            <tr className="bg-slate-50/80 border-b border-gray-100 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                                                <th className="py-3 px-4 text-center w-12">Rank</th>
                                                <th className="py-3 px-4">Banking Counterparty</th>
                                                <th className="py-3 px-3">Desk Tier</th>
                                                <th className="py-3 px-3 text-center">8-Trophies</th>
                                                <th className="py-3 px-4 text-right cursor-pointer hover:text-indigo-600" onClick={() => handleSort('vol_usd')}>
                                                    Awarded Volume {sortField === 'vol_usd' && (sortDir === 'desc' ? '↓' : '↑')}
                                                </th>
                                                <th className="py-3 px-3 text-right cursor-pointer hover:text-indigo-600" onClick={() => handleSort('deals')}>
                                                    Won Deals {sortField === 'deals' && (sortDir === 'desc' ? '↓' : '↑')}
                                                </th>
                                                <th className="py-3 px-3 text-right cursor-pointer hover:text-indigo-600" onClick={() => handleSort('quotes')}>
                                                    Quotes {sortField === 'quotes' && (sortDir === 'desc' ? '↓' : '↑')}
                                                </th>
                                                <th className="py-3 px-3 text-right">Tenders</th>
                                                <th className="py-3 px-3 text-center">Streak</th>
                                                <th className="py-3 px-4 text-center">Action</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {filteredBanks.map((b, idx) => {
                                                const rankNum = idx + 1;
                                                const volShare = macroSummary.total_market_volume_usd > 0
                                                    ? ((b.vol_usd / macroSummary.total_market_volume_usd) * 100).toFixed(1)
                                                    : '0.0';
                                                const dealShare = macroSummary.total_market_deals > 0
                                                    ? ((b.deals / macroSummary.total_market_deals) * 100).toFixed(1)
                                                    : '0.0';

                                                return (
                                                    <tr
                                                        key={b.id}
                                                        onClick={() => handleInspectBank(b.id)}
                                                        className={`hover:bg-indigo-50/40 transition-colors cursor-pointer ${
                                                            b.id === selectedBankId ? 'bg-indigo-50/20' : ''
                                                        }`}
                                                    >
                                                        {/* Rank */}
                                                        <td className="py-3.5 px-4 text-center">
                                                            {rankNum === 1 && b.has_execution ? (
                                                                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-100 text-amber-800 font-black text-xs shadow-2xs">
                                                                    1
                                                                </span>
                                                            ) : rankNum === 2 && b.has_execution ? (
                                                                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-200 text-slate-800 font-black text-xs shadow-2xs">
                                                                    2
                                                                </span>
                                                            ) : rankNum === 3 && b.has_execution ? (
                                                                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-orange-100 text-orange-800 font-black text-xs shadow-2xs">
                                                                    3
                                                                </span>
                                                            ) : (
                                                                <span className="text-slate-400 font-mono font-bold text-xs">
                                                                    #{rankNum}
                                                                </span>
                                                            )}
                                                        </td>

                                                        {/* Bank Name & Dealers */}
                                                        <td className="py-3.5 px-4">
                                                            <div className="flex items-center gap-2.5">
                                                                <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                                                                    b.has_execution ? 'bg-indigo-50 text-indigo-700' : 'bg-slate-100 text-slate-400'
                                                                }`}>
                                                                    <Building2 size={16} />
                                                                </div>
                                                                <div>
                                                                    <div className="font-bold text-gray-900 hover:text-indigo-600 transition-colors flex items-center gap-2">
                                                                        <span>{b.name}</span>
                                                                        {b.has_execution ? (
                                                                            <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                                                                Active
                                                                            </span>
                                                                        ) : (
                                                                            <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-slate-100 text-slate-400 border border-slate-200">
                                                                                0 Execution
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                    <p className="text-[11px] text-slate-400">
                                                                        {b.dealers?.length || 0} registered dealers
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        </td>

                                                        {/* Desk Tier */}
                                                        <td className="py-3.5 px-3">
                                                            <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                                                                b.tier.includes('Silver') ? 'bg-slate-100 text-slate-800 border-slate-300' :
                                                                b.tier.includes('Verified') ? 'bg-indigo-50 text-indigo-800 border-indigo-200' :
                                                                b.tier.includes('Gold') ? 'bg-amber-100 text-amber-800 border-amber-300' :
                                                                'bg-gray-100 text-gray-500 border-gray-200'
                                                            }`}>
                                                                {b.tier}
                                                            </span>
                                                        </td>

                                                        {/* Trophies Unlocked */}
                                                        <td className="py-3.5 px-3 text-center">
                                                            <div className="inline-flex flex-col items-center gap-1">
                                                                <span className="font-bold text-xs text-gray-900">
                                                                    {b.unlocked} <span className="text-slate-400 font-normal">/ 8</span>
                                                                </span>
                                                                <div className="w-16 bg-slate-100 h-1 rounded-full overflow-hidden">
                                                                    <div
                                                                        className="bg-emerald-500 h-full rounded-full"
                                                                        style={{ width: `${(b.unlocked / 8) * 100}%` }}
                                                                    />
                                                                </div>
                                                            </div>
                                                        </td>

                                                        {/* Volume */}
                                                        <td className="py-3.5 px-4 text-right">
                                                            <span className="font-mono font-bold text-gray-900 block text-xs">
                                                                ${(b.vol_usd / 1000000).toFixed(2)}M
                                                            </span>
                                                            {b.has_execution && (
                                                                <span className="text-[10px] text-slate-400 font-semibold">
                                                                    {volShare}% share
                                                                </span>
                                                            )}
                                                        </td>

                                                        {/* Deals Won */}
                                                        <td className="py-3.5 px-3 text-right">
                                                            <span className="font-bold text-gray-900 block text-xs">
                                                                {b.deals}
                                                            </span>
                                                            {b.has_execution && (
                                                                <span className="text-[10px] text-slate-400">
                                                                    {dealShare}% win
                                                                </span>
                                                            )}
                                                        </td>

                                                        {/* Quotes Logged */}
                                                        <td className="py-3.5 px-3 text-right font-medium text-slate-700">
                                                            {b.quotes}
                                                        </td>

                                                        {/* Tenders Entered */}
                                                        <td className="py-3.5 px-3 text-right font-medium text-slate-500">
                                                            {b.tenders}
                                                        </td>

                                                        {/* Streak */}
                                                        <td className="py-3.5 px-3 text-center">
                                                            {b.streak > 0 ? (
                                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 font-bold text-[11px]">
                                                                    <Flame size={11} className="text-amber-600" />
                                                                    {b.streak}
                                                                </span>
                                                            ) : (
                                                                <span className="text-slate-400 font-mono text-xs">0</span>
                                                            )}
                                                        </td>

                                                        {/* Action */}
                                                        <td className="py-3.5 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                                                            <button
                                                                onClick={() => handleInspectBank(b.id)}
                                                                className="px-2.5 py-1 text-[11px] font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors flex items-center gap-1 mx-auto"
                                                            >
                                                                <span>Inspect</span>
                                                                <ChevronRight size={12} />
                                                            </button>
                                                        </td>
                                                    </tr>
                                                );
                                            })}

                                            {filteredBanks.length === 0 && (
                                                <tr>
                                                    <td colSpan="10" className="py-12 text-center text-gray-400 italic">
                                                        No counterparties match the current search or filter criteria.
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* SUB-VIEW 2: SINGLE DESK 8-TROPHIES DEEP DIVE */}
                    {trophySubView === 'deep_dive' && (
                        <div className="space-y-6">
                            {/* Top Return Banner */}
                            <div className="flex items-center justify-between">
                                <button
                                    onClick={() => setTrophySubView('comparison')}
                                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-xl transition-all"
                                >
                                    <ArrowLeft size={14} />
                                    <span>Return to Counterparty Comparison Matrix</span>
                                </button>
                                <span className="text-xs text-slate-400 font-medium">
                                    Auditing {currentBankObj?.name}
                                </span>
                            </div>

                            {/* Bank & Dealer Selector Filter Card */}
                            <div className="bg-white p-5 rounded-3xl shadow-sm border border-black/5 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
                                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1">
                                    {/* Bank Selector */}
                                    <div className="flex-1">
                                        <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                                            Select Banking Institution
                                        </label>
                                        <div className="relative">
                                            <select
                                                value={selectedBankId || ''}
                                                onChange={(e) => handleBankChange(e.target.value)}
                                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-bold text-gray-900 focus:bg-white focus:border-indigo-600 outline-none"
                                            >
                                                {hideInactive ? (
                                                    activeBanks.map(b => (
                                                        <option key={b.id} value={b.id}>
                                                            {b.name} — {b.deals} deals • ${(b.vol_usd / 1000000).toFixed(2)}M ({b.unlocked}/8 trophies)
                                                        </option>
                                                    ))
                                                ) : (
                                                    <>
                                                        <optgroup label={`Active Counterparties (${activeBanks.length})`}>
                                                            {activeBanks.map(b => (
                                                                <option key={b.id} value={b.id}>
                                                                    {b.name} — {b.deals} deals • ${(b.vol_usd / 1000000).toFixed(2)}M ({b.unlocked}/8 trophies)
                                                                </option>
                                                            ))}
                                                        </optgroup>
                                                        <optgroup label={`Zero-Execution Desks (${inactiveBanks.length})`}>
                                                            {inactiveBanks.map(b => (
                                                                <option key={b.id} value={b.id}>
                                                                    {b.name} (0 executions)
                                                                </option>
                                                            ))}
                                                        </optgroup>
                                                    </>
                                                )}
                                            </select>
                                        </div>
                                    </div>

                                    {/* Dealer Selector */}
                                    <div className="flex-1">
                                        <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                                            Dealer Roster Scope
                                        </label>
                                        <select
                                            value={selectedDealerEmail}
                                            onChange={(e) => handleDealerChange(e.target.value)}
                                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-bold text-gray-900 focus:bg-white focus:border-indigo-600 outline-none"
                                        >
                                            <option value="">🏢 Entire Bank Desk (Collective Audit)</option>
                                            {availableDealers.map(d => (
                                                <option key={d.email} value={d.email}>
                                                    👤 {d.name} ({d.email}) — {d.role}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 self-end md:self-center">
                                    <button
                                        onClick={() => setIsStreakModalOpen(true)}
                                        className="flex items-center gap-1.5 px-4 py-2 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 text-xs font-bold rounded-xl transition-all shadow-2xs"
                                    >
                                        <Flame size={14} className="text-amber-600" />
                                        Streak Audit Trail ({streakAuditTrail.length})
                                    </button>
                                </div>
                            </div>

                            {/* Desk Status Overview Banner */}
                            <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 rounded-3xl text-white shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                                <div className="space-y-2">
                                    <div className="flex items-center gap-3 flex-wrap">
                                        <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center text-white">
                                            <Building2 size={20} />
                                        </div>
                                        <div>
                                            <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                                                {currentBankObj?.name || 'Bank Desk'}
                                                {selectedDealerEmail && (
                                                    <span className="text-xs font-normal text-indigo-300 bg-white/10 px-2 py-0.5 rounded-full">
                                                        👤 {selectedDealerEmail}
                                                    </span>
                                                )}
                                            </h2>
                                            <p className="text-xs text-slate-300">
                                                {achievements?.dealer_perk || 'Institutional market participation verified.'}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3 flex-wrap">
                                    <div className="bg-white/10 backdrop-blur-xs px-4 py-2.5 rounded-2xl border border-white/15 text-center">
                                        <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-200 block">
                                            Desk Tier
                                        </span>
                                        <span className="text-sm font-black text-white">
                                            {achievements?.dealer_tier || 'Active Desk'}
                                        </span>
                                    </div>
                                    <div className="bg-white/10 backdrop-blur-xs px-4 py-2.5 rounded-2xl border border-white/15 text-center">
                                        <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-200 block">
                                            Trophies Unlocked
                                        </span>
                                        <span className="text-sm font-black text-emerald-400">
                                            {achievements?.earned_trophy_count || 0} / {achievements?.total_trophies || 8}
                                        </span>
                                    </div>
                                    <div className="bg-white/10 backdrop-blur-xs px-4 py-2.5 rounded-2xl border border-white/15 text-center">
                                        <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-200 block">
                                            Volume Awarded
                                        </span>
                                        <span className="text-sm font-black text-cyan-300 font-mono">
                                            ${(personalBests.total_volume_won_usd ? (personalBests.total_volume_won_usd / 1000000).toFixed(2) : '0.00')}M
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* 8-Trophy Showcase Grid */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                {trophiesList.map(trophy => {
                                    const isEarned = trophy.current_tier !== 'NONE';
                                    return (
                                        <div
                                            key={trophy.trophy_id}
                                            className={`bg-white rounded-3xl p-5 border shadow-xs flex flex-col justify-between transition-all ${
                                                isEarned ? 'border-indigo-100 hover:border-indigo-300' : 'border-slate-200/80 opacity-90'
                                            }`}
                                        >
                                            <div>
                                                <div className="flex items-start justify-between gap-2 mb-3">
                                                    <div className="w-10 h-10 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0">
                                                        {getTrophyIcon(trophy.icon)}
                                                    </div>
                                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wider ${getTierColorBadge(trophy.current_tier)}`}>
                                                        {trophy.current_tier === 'NONE' ? 'In Progress' : trophy.current_tier}
                                                    </span>
                                                </div>

                                                <h4 className="text-sm font-bold text-gray-900 leading-snug">
                                                    {trophy.title}
                                                </h4>
                                                <p className="text-[11px] text-gray-500 mt-1 line-clamp-2">
                                                    {trophy.description}
                                                </p>
                                            </div>

                                            <div className="mt-4 pt-3 border-t border-slate-100 space-y-2">
                                                <div className="flex items-baseline justify-between text-xs">
                                                    <span className="text-slate-500 text-[11px]">Current Score:</span>
                                                    <span className="font-mono font-bold text-gray-900">
                                                        {trophy.is_currency ? `$${(trophy.current_value / 1000000).toFixed(2)}M` : trophy.current_value} {trophy.unit}
                                                    </span>
                                                </div>

                                                {/* Progress bar */}
                                                <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                                                    <div
                                                        className={`h-full rounded-full transition-all duration-500 ${
                                                            trophy.current_tier === 'PLATINUM' ? 'bg-purple-600' :
                                                            trophy.current_tier === 'GOLD' ? 'bg-amber-500' :
                                                            trophy.current_tier === 'SILVER' ? 'bg-slate-600' :
                                                            trophy.current_tier === 'BRONZE' ? 'bg-orange-500' : 'bg-indigo-500'
                                                        }`}
                                                        style={{ width: `${Math.min(100, trophy.progress_pct || 0)}%` }}
                                                    />
                                                </div>

                                                <div className="flex items-center justify-between text-[10px] text-slate-400">
                                                    <span>
                                                        {trophy.next_milestone ? `Next: ${trophy.is_currency ? `$${(trophy.next_milestone / 1000000).toFixed(1)}M` : trophy.next_milestone} ${trophy.unit}` : 'Max Milestone'}
                                                    </span>
                                                    {trophy.trophy_id === 'TRIPLE_CROWN' && (
                                                        <button
                                                            onClick={() => setIsStreakModalOpen(true)}
                                                            className="text-indigo-600 font-bold hover:underline"
                                                        >
                                                            View History
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* STREAK AUDIT TRAIL MODAL */}
            {isStreakModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
                    <div className="bg-white w-full max-w-3xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[85vh]">
                        {/* Modal Header */}
                        <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-slate-50/50">
                            <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center">
                                    <Crown size={16} />
                                </div>
                                <div>
                                    <h3 className="text-base font-bold text-gray-900">
                                        Streak Audit Trail: {currentBankObj?.name}
                                    </h3>
                                    <p className="text-xs text-gray-500">
                                        Chronological evaluation of all completed tenders explaining streak progression and resets.
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsStreakModalOpen(false)}
                                className="p-2 text-gray-400 hover:text-gray-700 rounded-xl hover:bg-gray-100"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {/* Modal Body / Timeline */}
                        <div className="p-6 overflow-y-auto space-y-3 flex-1">
                            {streakAuditTrail.length === 0 ? (
                                <p className="text-center text-gray-400 text-xs italic py-12">
                                    No tender executions recorded for this counterparty yet.
                                </p>
                            ) : (
                                streakAuditTrail.map((item, idx) => {
                                    const isWin = item.badge === 'CLEAN_SWEEP';
                                    const isReset = item.badge === 'COMPETITOR_WIN';
                                    return (
                                        <div
                                            key={`${item.rfq_id}-${idx}`}
                                            className="p-3.5 rounded-2xl border border-slate-100 bg-slate-50/60 flex items-center justify-between gap-3 text-xs"
                                        >
                                            <div className="space-y-0.5">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-mono font-bold text-gray-900">{item.ref_no}</span>
                                                    <span className="text-[10px] text-slate-400 font-mono">
                                                        {item.date ? item.date.split('T')[0] : '—'}
                                                    </span>
                                                    <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.2 bg-white text-slate-600 rounded border border-slate-200">
                                                        {item.type}
                                                    </span>
                                                </div>
                                                <p className="text-[11px] text-slate-600">
                                                    {item.reason}
                                                </p>
                                            </div>

                                            <div className="flex items-center gap-3 shrink-0">
                                                <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                                                    isWin ? 'bg-emerald-50 text-emerald-800 border-emerald-300' :
                                                    isReset ? 'bg-rose-50 text-rose-800 border-rose-300' :
                                                    'bg-slate-100 text-slate-700 border-slate-300'
                                                }`}>
                                                    {item.transition}
                                                </span>
                                                <div className="text-right">
                                                    <span className="text-[9px] uppercase tracking-wider text-slate-400 block font-semibold">
                                                        Streak
                                                    </span>
                                                    <span className="font-mono font-bold text-sm text-gray-900">
                                                        {item.running_streak}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>

                        {/* Modal Footer */}
                        <div className="p-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
                            <span>Mathematical verification complete against PostgreSQL database records.</span>
                            <button
                                onClick={() => setIsStreakModalOpen(false)}
                                className="px-4 py-1.5 bg-gray-900 text-white font-bold rounded-xl text-xs"
                            >
                                Close Audit
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
