import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
    Clock, ShieldCheck, Zap, ArrowUpRight, ArrowDownLeft, RefreshCw, Volume2, VolumeX,
    LogOut, ExternalLink, ChevronDown, ChevronUp, Copy, Check,
    AlertCircle, CheckCircle2, TrendingUp, Layers, Building2,
    Calendar, Trophy, Award, Search, Filter, Loader2, Info,
    FileText, CheckCircle, XCircle, BarChart3, LayoutList, LayoutGrid, X,
    Lock, Unlock
} from 'lucide-react';
import tradingAudio from '../../utils/tradingAudioEngine';

const DIRECT_BACKEND_URL = 'https://api.growbusinessdevelopment.com';

const getApiBaseUrl = () => {
    if (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
        let localEnv = process.env.REACT_APP_API_BASE_URL || process.env.REACT_APP_API_URL;
        return localEnv ? localEnv.replace(/\/api\/v1\/?$/, '') : 'http://localhost:8000';
    }
    if (typeof window !== 'undefined' && (window.location.hostname === 'www.growbusinessdevelopment.com' || window.location.hostname === 'growbusinessdevelopment.com')) {
        return '';
    }
    let url = process.env.REACT_APP_API_BASE_URL || process.env.REACT_APP_API_URL;
    return url ? url.replace(/\/api\/v1\/?$/, '') : DIRECT_BACKEND_URL;
};

const API_BASE_URL = getApiBaseUrl();

export default function BankDealerDeskPage() {
    const navigate = useNavigate();

    // Session & Profile
    const [dealer, setDealer] = useState(null);
    const [activeTab, setActiveTab] = useState('live'); // 'live', 'won', 'history', 'analytics'
    const [blotterViewMode, setBlotterViewMode] = useState('table'); // 'table' vs 'cards'
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState(null);

    // Audio & Clock
    const [audioMuted, setAudioMuted] = useState(false);
    const [currentTimeUtc, setCurrentTimeUtc] = useState('');
    const [currentTimeLocal, setCurrentTimeLocal] = useState('');

    // Blotter Data
    const [liveTickets, setLiveTickets] = useState([]);
    const [historyRecords, setHistoryRecords] = useState([]);
    const [blotterStats, setBlotterStats] = useState({
        won_deals_count: 0,
        total_volume_won: 0,
        win_rate_percent: 0,
        avg_dealer_rank: null
    });

    // Filters & Search
    const [searchQuery, setSearchQuery] = useState('');
    const [outcomeFilter, setOutcomeFilter] = useState('ALL'); // 'ALL', 'WON', 'LOST', 'QUOTED'

    // UI state & Modal
    const [expandedTicketId, setExpandedTicketId] = useState(null);
    const [selectedDealSlip, setSelectedDealSlip] = useState(null);
    const [copiedReceiptId, setCopiedReceiptId] = useState(null);
    const prevLiveCountRef = useRef(0);

    const getAuthHeaders = useCallback(() => {
        const token = localStorage.getItem('grow_bank_dealer_token');
        return token ? { Authorization: `Bearer ${token}` } : {};
    }, []);

    // Desk Clock Tick
    useEffect(() => {
        const updateClock = () => {
            const now = new Date();
            setCurrentTimeUtc(now.toUTCString().slice(17, 25) + ' UTC');
            setCurrentTimeLocal(now.toLocaleTimeString());
        };
        updateClock();
        const clockTimer = setInterval(updateClock, 1000);
        return () => clearInterval(clockTimer);
    }, []);

    // Logout Handler
    const handleLogout = useCallback(() => {
        localStorage.removeItem('grow_bank_dealer_token');
        localStorage.removeItem('grow_bank_dealer_profile');
        navigate('/dealer/login', { replace: true });
    }, [navigate]);

    // Fetch Dealer Profile
    useEffect(() => {
        const token = localStorage.getItem('grow_bank_dealer_token');
        if (!token) {
            navigate('/dealer/login', { replace: true });
            return;
        }

        axios.get(`${API_BASE_URL}/api/v1/bank-dealer/auth/me`, {
            headers: { Authorization: `Bearer ${token}` }
        }).then(res => {
            if (res.data?.success) {
                setDealer(res.data.dealer);
            } else {
                handleLogout();
            }
        }).catch(() => {
            handleLogout();
        });
    }, [navigate, handleLogout]);

    // Fetch Blotter Feeds
    const fetchBlotterData = useCallback(async (isSilent = false) => {
        if (!isSilent) setRefreshing(true);
        const headers = getAuthHeaders();
        try {
            const [liveRes, histRes] = await Promise.all([
                axios.get(`${API_BASE_URL}/api/v1/bank-dealer/blotter/live-rfqs`, { headers }),
                axios.get(`${API_BASE_URL}/api/v1/bank-dealer/blotter/history`, { headers })
            ]);

            if (liveRes.data?.success) {
                const tickets = liveRes.data.tickets || [];
                if (tickets.length > prevLiveCountRef.current && prevLiveCountRef.current > 0 && !audioMuted) {
                    try { tradingAudio.play('openingBell'); } catch (e) {}
                }
                prevLiveCountRef.current = tickets.length;
                setLiveTickets(tickets);
            }

            if (histRes.data?.success) {
                setHistoryRecords(histRes.data.records || []);
                setBlotterStats({
                    won_deals_count: histRes.data.won_deals_count || 0,
                    total_volume_won: histRes.data.total_volume_won || 0,
                    win_rate_percent: histRes.data.win_rate_percent || 0,
                    avg_dealer_rank: histRes.data.avg_dealer_rank
                });
            }
            setError(null);
        } catch (err) {
            if (err.response?.status === 401) {
                handleLogout();
            } else {
                setError('Could not refresh trading blotter feeds.');
            }
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [getAuthHeaders, audioMuted, handleLogout]);

    // Initial Load & 3-Second Poll
    useEffect(() => {
        fetchBlotterData();
        const pollInterval = setInterval(() => {
            fetchBlotterData(true);
        }, 3000);
        return () => clearInterval(pollInterval);
    }, [fetchBlotterData]);

    // Copy Receipt Hash
    const handleCopyReceipt = (hash, id) => {
        if (!hash) return;
        navigator.clipboard.writeText(hash);
        setCopiedReceiptId(id);
        setTimeout(() => setCopiedReceiptId(null), 2000);
    };

    // Filter tickets
    const filteredLiveTickets = liveTickets.filter(t => {
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        return (
            t.customer_name?.toLowerCase().includes(q) ||
            t.ref_no?.toLowerCase().includes(q) ||
            t.summary_pair?.toLowerCase().includes(q)
        );
    });

    const wonHistoryRecords = historyRecords.filter(h => h.is_won);

    const filteredHistoryRecords = historyRecords.filter(h => {
        if (outcomeFilter === 'WON' && !h.is_won) return false;
        if (outcomeFilter === 'LOST' && (h.is_won || h.outcome === 'EXPIRED' || h.outcome === 'CANCELLED')) return false;
        if (outcomeFilter === 'QUOTED' && !h.has_quoted) return false;

        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        return (
            h.customer_name?.toLowerCase().includes(q) ||
            h.ref_no?.toLowerCase().includes(q) ||
            h.summary_pair?.toLowerCase().includes(q) ||
            h.dealer_submitted_by?.toLowerCase().includes(q)
        );
    });

    const formatCurrency = (amt) => {
        if (amt === null || amt === undefined) return '—';
        return Number(amt).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 });
    };

    const formatRate = (rate) => {
        if (rate === null || rate === undefined) return '—';
        return Number(rate).toFixed(4);
    };

    const formatSeconds = (sec) => {
        if (sec === null || sec === undefined) return '--:--';
        const m = Math.floor(sec / 60);
        const s = Math.floor(sec % 60);
        return `${m}:${s < 10 ? '0' : ''}${s}`;
    };

    return (
        <div className="min-h-screen bg-[#070b12] text-slate-100 flex flex-col selection:bg-emerald-500 selection:text-white">
            {/* Top Institutional Command Bar */}
            <header className="bg-[#0b0f17] border-b border-slate-800/80 px-4 sm:px-6 py-3 sticky top-0 z-30 shadow-xl backdrop-blur-md">
                <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
                    {/* Brand & Bank Title */}
                    <div className="flex items-center space-x-3">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-lg shadow-emerald-950 font-black text-base">
                            G
                        </div>
                        <div>
                            <div className="flex items-center space-x-2">
                                <h1 className="text-sm sm:text-base font-extrabold text-white tracking-tight">
                                    {dealer?.bank_name || 'Institutional Trading Desk'}
                                </h1>
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                                    LIVE DESK
                                </span>
                            </div>
                            <div className="flex items-center space-x-2 text-xs text-slate-400 mt-0.5">
                                <span>Trader: <strong className="text-slate-200">{dealer?.full_name || 'Active Dealer'}</strong></span>
                                <span>&bull;</span>
                                <span className="flex items-center text-emerald-400 font-mono text-[11px]">
                                    <ShieldCheck className="w-3 h-3 mr-1 inline" /> 2FA Active
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Clocks, Audio Toggle, Refresh & Logout */}
                    <div className="flex items-center space-x-2 sm:space-x-3">
                        {/* Clocks */}
                        <div className="hidden md:flex items-center space-x-2 px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-xs font-mono">
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                            <span className="text-slate-200">{currentTimeLocal}</span>
                            <span className="text-slate-500">&bull;</span>
                            <span className="text-emerald-400 font-bold">{currentTimeUtc}</span>
                        </div>

                        {/* Audio Chime Toggle */}
                        <button
                            type="button"
                            onClick={() => setAudioMuted(!audioMuted)}
                            title={audioMuted ? "Unmute Desk Audio" : "Mute Desk Audio"}
                            className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition-colors"
                        >
                            {audioMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
                        </button>

                        {/* Refresh Button */}
                        <button
                            type="button"
                            onClick={() => fetchBlotterData()}
                            disabled={refreshing}
                            title="Force Refresh Feeds"
                            className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition-colors"
                        >
                            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-emerald-400' : ''}`} />
                        </button>

                        {/* Logout */}
                        <button
                            type="button"
                            onClick={handleLogout}
                            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-rose-500/40 text-xs font-bold text-slate-400 hover:text-rose-400 transition-colors"
                        >
                            <LogOut className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Exit Desk</span>
                        </button>
                    </div>
                </div>
            </header>

            {/* Main Blotter Body */}
            <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6">
                {/* Desk KPI HUD Strip */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-6">
                    <div className="bg-[#0f172a] border border-slate-800 rounded-2xl p-4 relative overflow-hidden">
                        <div className="flex justify-between items-start">
                            <span className="text-xs text-slate-400 font-medium">Active Live Tenders</span>
                            {liveTickets.filter(t => t.status === 'LIVE_OPEN').length > 0 && (
                                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                            )}
                        </div>
                        <div className="text-2xl font-black text-white mt-1 font-mono">
                            {liveTickets.filter(t => t.status === 'LIVE_OPEN').length}
                        </div>
                        <span className="text-[11px] text-emerald-400">Actionable live client RFQs</span>
                    </div>

                    <div className="bg-[#0f172a] border border-slate-800 rounded-2xl p-4">
                        <span className="text-xs text-slate-400 font-medium">Client Evaluating</span>
                        <div className="text-2xl font-black text-white mt-1 font-mono">
                            {liveTickets.filter(t => t.status === 'EVALUATING').length}
                        </div>
                        <span className="text-[11px] text-amber-400">Quotes pending award decision</span>
                    </div>

                    <div className="bg-[#0f172a] border border-slate-800 rounded-2xl p-4">
                        <span className="text-xs text-slate-400 font-medium">Desk Win Ratio</span>
                        <div className="text-2xl font-black text-emerald-400 mt-1 font-mono flex items-baseline space-x-1">
                            <span>{blotterStats.win_rate_percent}%</span>
                            {blotterStats.avg_dealer_rank && (
                                <span className="text-xs text-slate-400 font-normal ml-1.5">
                                    (Avg #{blotterStats.avg_dealer_rank})
                                </span>
                            )}
                        </div>
                        <span className="text-[11px] text-slate-400">Competitiveness across quoted RFQs</span>
                    </div>

                    <div className="bg-[#0f172a] border border-slate-800 rounded-2xl p-4">
                        <span className="text-xs text-slate-400 font-medium">Total Flow Won</span>
                        <div className="text-2xl font-black text-cyan-400 mt-1 font-mono">
                            {blotterStats.total_volume_won > 0 ? `$${formatCurrency(blotterStats.total_volume_won)}` : `${blotterStats.won_deals_count} Won Deals`}
                        </div>
                        <span className="text-[11px] text-cyan-500">{blotterStats.won_deals_count} cryptographically sealed</span>
                    </div>
                </div>

                {/* Sub-Navigation Tabs & Search Bar */}
                <div className="flex flex-wrap items-center justify-between gap-3 mb-6 bg-[#0f172a] p-2 rounded-2xl border border-slate-800">
                    {/* Tabs */}
                    <div className="flex flex-wrap items-center gap-1">
                        <button
                            type="button"
                            onClick={() => setActiveTab('live')}
                            className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                                activeTab === 'live'
                                    ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-950'
                                    : 'text-slate-400 hover:text-white'
                            }`}
                        >
                            <Zap className="w-3.5 h-3.5" />
                            <span>Live Multi-Customer Feed</span>
                            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-900/80 font-mono">
                                {liveTickets.length}
                            </span>
                        </button>

                        <button
                            type="button"
                            onClick={() => setActiveTab('won')}
                            className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                                activeTab === 'won'
                                    ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-950'
                                    : 'text-slate-400 hover:text-white'
                            }`}
                        >
                            <Trophy className="w-3.5 h-3.5 text-amber-400" />
                            <span>Won Trades &amp; Receipts</span>
                            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-900/80 font-mono text-emerald-400 font-bold">
                                {wonHistoryRecords.length}
                            </span>
                        </button>

                        <button
                            type="button"
                            onClick={() => setActiveTab('history')}
                            className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                                activeTab === 'history'
                                    ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-950'
                                    : 'text-slate-400 hover:text-white'
                            }`}
                        >
                            <FileText className="w-3.5 h-3.5" />
                            <span>All Concluded Deals</span>
                            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-900/80 font-mono">
                                {historyRecords.length}
                            </span>
                        </button>

                        <button
                            type="button"
                            onClick={() => setActiveTab('analytics')}
                            className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                                activeTab === 'analytics'
                                    ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-950'
                                    : 'text-slate-400 hover:text-white'
                            }`}
                        >
                            <BarChart3 className="w-3.5 h-3.5" />
                            <span>Desk Analytics</span>
                        </button>
                    </div>

                    {/* View Switcher and Search */}
                    <div className="flex items-center space-x-2 w-full sm:w-auto">
                        {(activeTab === 'history' || activeTab === 'won') && (
                            <div className="flex items-center bg-slate-900 border border-slate-800 rounded-xl p-0.5">
                                <button
                                    type="button"
                                    onClick={() => setBlotterViewMode('table')}
                                    title="Institutional Table Blotter"
                                    className={`p-1.5 rounded-lg transition-colors ${blotterViewMode === 'table' ? 'bg-slate-800 text-emerald-400' : 'text-slate-500 hover:text-white'}`}
                                >
                                    <LayoutList className="w-4 h-4" />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setBlotterViewMode('cards')}
                                    title="Detailed Card View"
                                    className={`p-1.5 rounded-lg transition-colors ${blotterViewMode === 'cards' ? 'bg-slate-800 text-emerald-400' : 'text-slate-500 hover:text-white'}`}
                                >
                                    <LayoutGrid className="w-4 h-4" />
                                </button>
                            </div>
                        )}

                        <div className="relative flex-1 sm:w-64">
                            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-500" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search client, pair, ref..."
                                className="w-full pl-8 pr-3 py-1.5 bg-slate-900 border border-slate-700/80 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                            />
                        </div>
                    </div>
                </div>

                {/* Sub-Filters for History Tab */}
                {activeTab === 'history' && (
                    <div className="flex flex-wrap items-center gap-2 mb-4 px-1">
                        <span className="text-xs text-slate-500 font-semibold mr-1 flex items-center">
                            <Filter className="w-3 h-3 mr-1" /> Filter Outcome:
                        </span>
                        {['ALL', 'WON', 'LOST', 'QUOTED'].map((filter) => (
                            <button
                                key={filter}
                                type="button"
                                onClick={() => setOutcomeFilter(filter)}
                                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                                    outcomeFilter === filter
                                        ? 'bg-slate-800 text-emerald-400 border border-emerald-500/30'
                                        : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 border border-slate-800'
                                }`}
                            >
                                {filter === 'ALL' && 'All Outcomes'}
                                {filter === 'WON' && 'Won Only'}
                                {filter === 'LOST' && 'Lost Only'}
                                {filter === 'QUOTED' && 'Quoted by Desk'}
                            </button>
                        ))}
                    </div>
                )}

                {/* Loading Indicator */}
                {loading && (
                    <div className="text-center py-16">
                        <Loader2 className="w-8 h-8 animate-spin text-emerald-400 mx-auto mb-3" />
                        <p className="text-xs text-slate-400">Loading institutional blotter feed...</p>
                    </div>
                )}

                {/* TAB 1: LIVE MULTI-CUSTOMER FEED */}
                {!loading && activeTab === 'live' && (
                    <div className="space-y-3">
                        {filteredLiveTickets.length === 0 ? (
                            <div className="text-center py-16 bg-[#0f172a] rounded-2xl border border-slate-800">
                                <Building2 className="w-10 h-10 text-slate-600 mx-auto mb-3" />
                                <h3 className="text-sm font-bold text-white">No Active RFQs Right Now</h3>
                                <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                                    When corporate clients dispatch Request for Quotations to {dealer?.bank_name || 'your bank'}, they will appear here in real time.
                                </p>
                            </div>
                        ) : (
                            filteredLiveTickets.map((ticket) => {
                                const isExpanded = expandedTicketId === ticket.assignment_id;
                                const isUrgent = ticket.status === 'LIVE_OPEN' && ticket.seconds_remaining < 120;
                                const isCriticallyUrgent = ticket.status === 'LIVE_OPEN' && ticket.seconds_remaining < 30;

                                return (
                                    <div
                                        key={ticket.assignment_id}
                                        className={`bg-[#0f172a] border rounded-2xl p-4 sm:p-5 transition-all shadow-lg ${
                                            isCriticallyUrgent
                                                ? 'border-rose-500/80 bg-rose-950/10 shadow-rose-950/20'
                                                : isUrgent
                                                    ? 'border-amber-500/60 bg-amber-950/10'
                                                    : 'border-slate-800 hover:border-slate-700'
                                        }`}
                                    >
                                        <div className="flex flex-wrap items-center justify-between gap-4">
                                            {/* Client and Ticket Meta */}
                                            <div className="flex items-center space-x-3.5">
                                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm ${
                                                    ticket.summary_direction === 'BUY'
                                                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                                        : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                                                }`}>
                                                    {ticket.summary_direction === 'BUY' ? <ArrowUpRight className="w-5 h-5" /> : <ArrowDownLeft className="w-5 h-5" />}
                                                </div>

                                                <div>
                                                    <div className="flex items-center space-x-2">
                                                        <h2 className="text-sm font-black text-white tracking-tight">
                                                            {ticket.customer_name}
                                                        </h2>
                                                        {ticket.entity_name && (
                                                            <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-800 text-slate-300 font-medium">
                                                                {ticket.entity_name}
                                                            </span>
                                                        )}
                                                        <span className="text-xs font-mono text-slate-500">
                                                            {ticket.ref_no}
                                                        </span>
                                                    </div>

                                                    <div className="flex flex-wrap items-center gap-2 mt-1 text-xs">
                                                        <span className="font-extrabold text-white text-sm">
                                                            {ticket.summary_direction} {Number(ticket.summary_amount).toLocaleString()} {ticket.summary_pair}
                                                        </span>
                                                        <span className="text-slate-500">&bull;</span>
                                                        <span className="text-slate-400 font-medium">{ticket.summary_value_date}</span>
                                                        <span className="text-slate-500">&bull;</span>
                                                        <span className={`px-2 py-0.2 rounded text-[10px] font-bold uppercase ${
                                                            ticket.quotation_base?.toLowerCase() === 'indicative'
                                                                ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                                                                : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                                        }`}>
                                                            {ticket.quotation_base || 'Execution'}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Desk Lock & Timer & Action */}
                                            <div className="flex items-center space-x-4">
                                                {/* Concurrency Lock Badge */}
                                                <div className="hidden sm:block text-right">
                                                    {ticket.desk_lock?.is_locked ? (
                                                        ticket.desk_lock.is_you ? (
                                                            <span className="inline-flex items-center text-xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-lg">
                                                                <Unlock className="w-3 h-3 mr-1" /> You Hold Active Lock
                                                            </span>
                                                        ) : (
                                                            <span className="inline-flex items-center text-xs font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-lg">
                                                                <Lock className="w-3 h-3 mr-1" /> Active: {ticket.desk_lock.locked_by_name}
                                                            </span>
                                                        )
                                                    ) : (
                                                        <span className="text-xs text-slate-500">
                                                            Desk Open
                                                        </span>
                                                    )}
                                                </div>

                                                {/* Countdown Pill */}
                                                {ticket.status === 'LIVE_OPEN' ? (
                                                    <div className={`px-3 py-1.5 rounded-xl font-mono text-sm font-extrabold flex items-center space-x-1.5 ${
                                                        isCriticallyUrgent
                                                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500 animate-pulse'
                                                            : isUrgent
                                                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500'
                                                                : 'bg-slate-900 border border-slate-700 text-emerald-400'
                                                    }`}>
                                                        <Clock className="w-4 h-4" />
                                                        <span>{formatSeconds(ticket.seconds_remaining)}</span>
                                                    </div>
                                                ) : (
                                                    <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                                                        ticket.status === 'SCHEDULED' ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' : 'bg-slate-800 text-slate-400'
                                                    }`}>
                                                        {ticket.status}
                                                    </span>
                                                )}

                                                {/* Action Button: Quote Desk */}
                                                <a
                                                    href={`/public-quotation/${ticket.token}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-lg shadow-emerald-950 flex items-center space-x-1.5 transition-all"
                                                >
                                                    <Zap className="w-3.5 h-3.5" />
                                                    <span>Quote Ticket</span>
                                                    <ExternalLink className="w-3 h-3 ml-0.5 opacity-70" />
                                                </a>
                                            </div>
                                        </div>

                                        {/* Multi-Leg Drawer Toggle */}
                                        {ticket.is_multi_leg && (
                                            <div className="mt-3 pt-3 border-t border-slate-800/80">
                                                <button
                                                    type="button"
                                                    onClick={() => setExpandedTicketId(isExpanded ? null : ticket.assignment_id)}
                                                    className="flex items-center space-x-1 text-xs text-slate-400 hover:text-white font-medium transition-colors"
                                                >
                                                    <Layers className="w-3.5 h-3.5 text-emerald-400" />
                                                    <span>Multi-Currency Basket ({ticket.visible_legs_count} Visible Legs)</span>
                                                    {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                                                </button>

                                                {isExpanded && (
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 mt-3 pt-2">
                                                        {ticket.visible_legs.map((leg, idx) => (
                                                            <div key={leg.leg_id || idx} className="p-2.5 bg-slate-900/90 border border-slate-800 rounded-xl text-xs">
                                                                <div className="flex justify-between font-bold text-white">
                                                                    <span>{leg.direction} {leg.currency_pair}</span>
                                                                    <span className="text-emerald-400">{Number(leg.amount).toLocaleString()}</span>
                                                                </div>
                                                                <div className="text-[11px] text-slate-500 mt-1 flex justify-between">
                                                                    <span>Value: {leg.value_date}</span>
                                                                    {leg.is_passed ? (
                                                                        <span className="text-amber-400 font-bold">Passed</span>
                                                                    ) : leg.has_quote ? (
                                                                        <span className="text-emerald-400 font-bold">Quoted</span>
                                                                    ) : (
                                                                        <span className="text-slate-500">Unquoted</span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                );
                            })
                        )}
                    </div>
                )}

                {/* TAB 2: WON TRADES & RECEIPTS */}
                {!loading && activeTab === 'won' && (
                    <div className="space-y-4">
                        {wonHistoryRecords.length === 0 ? (
                            <div className="text-center py-16 bg-[#0f172a] rounded-2xl border border-slate-800">
                                <Trophy className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                                <h3 className="text-base font-bold text-white">No Won Trades in Blotter</h3>
                                <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
                                    When corporate treasurers award executed FX tenders to {dealer?.bank_name || 'your desk'}, tamper-proof cryptographic receipts and settlement slips will be stored here.
                                </p>
                            </div>
                        ) : blotterViewMode === 'table' ? (
                            /* Institutional Table Blotter - Won */
                            <div className="bg-[#0b0f17] border border-emerald-500/30 rounded-2xl overflow-hidden shadow-2xl">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-xs">
                                        <thead>
                                            <tr className="bg-slate-900/90 border-b border-slate-800 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                                                <th className="py-3 px-4">Deal Ref / Concluded</th>
                                                <th className="py-3 px-4">Corporate Client</th>
                                                <th className="py-3 px-4">Pair &amp; Side</th>
                                                <th className="py-3 px-4">Notional Volume</th>
                                                <th className="py-3 px-4 text-emerald-400 font-extrabold">Executed Rate</th>
                                                <th className="py-3 px-4">Value Date</th>
                                                <th className="py-3 px-4">Receipt Seal</th>
                                                <th className="py-3 px-4 text-right">Ticket</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-800/60 font-mono">
                                            {wonHistoryRecords.map((item) => (
                                                <tr key={item.rfq_id} className="hover:bg-emerald-950/10 transition-colors">
                                                    <td className="py-3 px-4">
                                                        <div className="font-bold text-white font-mono">{item.ref_no}</div>
                                                        <div className="text-[10px] text-slate-500 font-sans mt-0.5">
                                                            {new Date(item.concluded_at).toLocaleDateString()} {new Date(item.concluded_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                        </div>
                                                    </td>
                                                    <td className="py-3 px-4 font-sans font-semibold text-slate-200">
                                                        <div className="flex items-center space-x-1.5">
                                                            <Building2 className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                                                            <span className="truncate max-w-[140px]">{item.customer_name}</span>
                                                        </div>
                                                    </td>
                                                    <td className="py-3 px-4 font-sans">
                                                        <div className="flex items-center space-x-1.5">
                                                            <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold ${
                                                                item.summary_direction === 'BUY'
                                                                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                                                    : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                                                            }`}>
                                                                {item.summary_direction}
                                                            </span>
                                                            <span className="font-bold text-slate-200 font-mono">{item.summary_pair}</span>
                                                        </div>
                                                    </td>
                                                    <td className="py-3 px-4 font-mono font-bold text-white">
                                                        {formatCurrency(item.summary_amount)}{' '}
                                                        <span className="text-[10px] text-slate-400 font-normal">{item.summary_currency}</span>
                                                    </td>
                                                    <td className="py-3 px-4 font-mono font-extrabold text-emerald-400 text-sm">
                                                        {formatRate(item.dealer_rate || item.winning_rate)}
                                                    </td>
                                                    <td className="py-3 px-4 text-slate-300 font-sans text-xs">
                                                        {item.summary_value_date || 'Spot'}
                                                    </td>
                                                    <td className="py-3 px-4">
                                                        {item.receipt ? (
                                                            <div className="inline-flex items-center space-x-1.5 bg-slate-900 border border-emerald-500/30 rounded-lg px-2 py-1">
                                                                <span className="font-mono text-[10px] font-bold text-emerald-400">
                                                                    {item.receipt.receipt_id}
                                                                </span>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleCopyReceipt(item.receipt.signature_hash, item.receipt.receipt_id)}
                                                                    className="text-slate-400 hover:text-emerald-300"
                                                                    title="Copy SHA-256 Signature Seal"
                                                                >
                                                                    {copiedReceiptId === item.receipt.receipt_id ? (
                                                                        <Check className="w-3 h-3 text-emerald-400" />
                                                                    ) : (
                                                                        <Copy className="w-3 h-3" />
                                                                    )}
                                                                </button>
                                                            </div>
                                                        ) : (
                                                            <span className="text-[10px] text-slate-500 font-sans">Pending Seal</span>
                                                        )}
                                                    </td>
                                                    <td className="py-3 px-4 text-right">
                                                        <button
                                                            type="button"
                                                            onClick={() => setSelectedDealSlip(item)}
                                                            className="px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[11px] font-bold transition-colors inline-flex items-center space-x-1 font-sans"
                                                        >
                                                            <FileText className="w-3 h-3" />
                                                            <span>Deal Slip</span>
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        ) : (
                            /* Card Grid - Won */
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {wonHistoryRecords.map((item) => (
                                    <div
                                        key={item.rfq_id}
                                        className="bg-[#0b0f17] border border-emerald-500/40 rounded-2xl p-5 shadow-lg relative overflow-hidden"
                                    >
                                        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-bl-full pointer-events-none" />
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="flex items-center space-x-3">
                                                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
                                                    <Award className="w-5 h-5" />
                                                </div>
                                                <div>
                                                    <div className="flex items-center space-x-2">
                                                        <h4 className="text-sm font-bold text-white">{item.customer_name}</h4>
                                                        <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 uppercase">
                                                            AWARDED
                                                        </span>
                                                    </div>
                                                    <div className="text-xs font-mono text-slate-400 mt-0.5">
                                                        {item.ref_no} &bull; {new Date(item.concluded_at).toLocaleString()}
                                                    </div>
                                                </div>
                                            </div>

                                            <button
                                                type="button"
                                                onClick={() => setSelectedDealSlip(item)}
                                                className="px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-bold transition-colors inline-flex items-center space-x-1"
                                            >
                                                <FileText className="w-3.5 h-3.5" />
                                                <span>Deal Slip</span>
                                            </button>
                                        </div>

                                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-3 border-t border-slate-800/80 text-xs">
                                            <div>
                                                <div className="text-[10px] uppercase font-bold text-slate-500">Pair &amp; Side</div>
                                                <div className="font-bold text-white mt-0.5">
                                                    <span className={item.summary_direction === 'BUY' ? 'text-emerald-400' : 'text-rose-400'}>
                                                        {item.summary_direction}
                                                    </span>{' '}
                                                    {item.summary_pair}
                                                </div>
                                            </div>
                                            <div>
                                                <div className="text-[10px] uppercase font-bold text-slate-500">Volume</div>
                                                <div className="font-mono font-bold text-white mt-0.5">
                                                    {formatCurrency(item.summary_amount)} {item.summary_currency}
                                                </div>
                                            </div>
                                            <div>
                                                <div className="text-[10px] uppercase font-bold text-slate-500">Executed Rate</div>
                                                <div className="font-mono font-extrabold text-emerald-400 mt-0.5 text-sm">
                                                    {formatRate(item.dealer_rate || item.winning_rate)}
                                                </div>
                                            </div>
                                            <div>
                                                <div className="text-[10px] uppercase font-bold text-slate-500">Value Date</div>
                                                <div className="text-slate-300 mt-0.5">
                                                    {item.summary_value_date || 'Spot'}
                                                </div>
                                            </div>
                                        </div>

                                        {item.receipt && (
                                            <div className="mt-3 pt-3 border-t border-slate-800/60 flex items-center justify-between bg-slate-900/50 p-2.5 rounded-xl">
                                                <div>
                                                    <div className="text-[9px] uppercase font-bold text-slate-500">SHA-256 Receipt Seal</div>
                                                    <div className="font-mono text-xs font-bold text-emerald-400">{item.receipt.receipt_id}</div>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => handleCopyReceipt(item.receipt.signature_hash, item.receipt.receipt_id)}
                                                    className="p-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 transition-colors"
                                                    title="Copy SHA-256 Signature Seal"
                                                >
                                                    {copiedReceiptId === item.receipt.receipt_id ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* TAB 3: ALL CONCLUDED DEALS */}
                {!loading && activeTab === 'history' && (
                    <div className="space-y-4">
                        {filteredHistoryRecords.length === 0 ? (
                            <div className="text-center py-16 bg-[#0f172a] rounded-2xl border border-slate-800">
                                <FileText className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                                <h3 className="text-base font-bold text-white">No Records Found</h3>
                                <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                                    No concluded RFQ transactions match your filter criteria.
                                </p>
                            </div>
                        ) : blotterViewMode === 'table' ? (
                            /* Institutional Table Blotter - All */
                            <div className="bg-[#0b0f17] border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-xs">
                                        <thead>
                                            <tr className="bg-slate-900/90 border-b border-slate-800 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                                                <th className="py-3 px-4">Deal Ref / Date</th>
                                                <th className="py-3 px-4">Client</th>
                                                <th className="py-3 px-4">Pair &amp; Side</th>
                                                <th className="py-3 px-4">Volume</th>
                                                <th className="py-3 px-4">Desk Quote</th>
                                                <th className="py-3 px-4">Winning Rate</th>
                                                <th className="py-3 px-4">Rank / Spread</th>
                                                <th className="py-3 px-4">Outcome</th>
                                                <th className="py-3 px-4 text-right">Inspect</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-800/60 font-mono">
                                            {filteredHistoryRecords.map((item) => (
                                                <tr
                                                    key={item.rfq_id}
                                                    className={`hover:bg-slate-900/50 transition-colors ${
                                                        item.is_won ? 'bg-emerald-950/10' : ''
                                                    }`}
                                                >
                                                    <td className="py-3 px-4">
                                                        <div className="font-bold text-white font-mono">{item.ref_no}</div>
                                                        <div className="text-[10px] text-slate-500 font-sans mt-0.5">
                                                            {new Date(item.concluded_at).toLocaleDateString()} {new Date(item.concluded_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                        </div>
                                                    </td>
                                                    <td className="py-3 px-4 font-sans font-semibold text-slate-200">
                                                        <div className="flex items-center space-x-1.5">
                                                            <Building2 className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                                                            <span className="truncate max-w-[130px]">{item.customer_name}</span>
                                                        </div>
                                                    </td>
                                                    <td className="py-3 px-4 font-sans">
                                                        <div className="flex items-center space-x-1.5">
                                                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-extrabold ${
                                                                item.summary_direction === 'BUY'
                                                                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                                                    : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                                                            }`}>
                                                                {item.summary_direction}
                                                            </span>
                                                            <span className="font-bold text-slate-200 font-mono">{item.summary_pair}</span>
                                                        </div>
                                                    </td>
                                                    <td className="py-3 px-4 font-mono font-bold text-white">
                                                        {formatCurrency(item.summary_amount)}{' '}
                                                        <span className="text-[10px] text-slate-400 font-normal">{item.summary_currency}</span>
                                                    </td>
                                                    <td className="py-3 px-4 font-mono font-semibold">
                                                        {item.dealer_rate ? (
                                                            <span className={item.is_won ? 'text-emerald-400 font-extrabold' : 'text-slate-200'}>
                                                                {formatRate(item.dealer_rate)}
                                                            </span>
                                                        ) : (
                                                            <span className="text-slate-500 italic font-sans text-[11px]">No Quote</span>
                                                        )}
                                                    </td>
                                                    <td className="py-3 px-4 font-mono">
                                                        {item.winning_rate ? (
                                                            <div>
                                                                <span className="font-bold text-white">{formatRate(item.winning_rate)}</span>
                                                                {item.winning_bank_name && !item.is_won && (
                                                                    <div className="text-[10px] text-slate-400 font-sans truncate max-w-[110px]">
                                                                        {item.winning_bank_name}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        ) : (
                                                            <span className="text-slate-500">—</span>
                                                        )}
                                                    </td>
                                                    <td className="py-3 px-4 font-sans">
                                                        {item.dealer_rank ? (
                                                            <div>
                                                                <span className={`inline-block px-1.5 py-0.2 rounded font-mono text-[11px] font-bold ${
                                                                    item.dealer_rank === 1
                                                                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                                                        : 'bg-slate-800 text-slate-300'
                                                                }`}>
                                                                    Rank #{item.dealer_rank}
                                                                </span>
                                                                {item.spread_delta !== null && item.spread_delta !== undefined && item.dealer_rank > 1 && (
                                                                    <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                                                                        +{formatRate(item.spread_delta)}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        ) : (
                                                            <span className="text-slate-500">—</span>
                                                        )}
                                                    </td>
                                                    <td className="py-3 px-4 font-sans">
                                                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                                                            item.is_won
                                                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                                                                : item.outcome === 'CANCELLED'
                                                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                                                : 'bg-slate-800 text-slate-400'
                                                        }`}>
                                                            {item.is_won ? 'WON' : item.outcome?.replace('_', ' ')}
                                                        </span>
                                                    </td>
                                                    <td className="py-3 px-4 text-right font-sans">
                                                        <button
                                                            type="button"
                                                            onClick={() => setSelectedDealSlip(item)}
                                                            className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-bold transition-colors inline-flex items-center space-x-1"
                                                        >
                                                            <FileText className="w-3 h-3 text-slate-400" />
                                                            <span>Details</span>
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        ) : (
                            /* Card Grid - All */
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {filteredHistoryRecords.map((item) => (
                                    <div
                                        key={item.rfq_id}
                                        className={`bg-[#0b0f17] border rounded-2xl p-5 shadow-lg transition-all ${
                                            item.is_won
                                                ? 'border-emerald-500/40 bg-emerald-950/5'
                                                : 'border-slate-800'
                                        }`}
                                    >
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="flex items-center space-x-3">
                                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold ${
                                                    item.is_won ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-400'
                                                }`}>
                                                    {item.is_won ? <Award className="w-5 h-5" /> : <Building2 className="w-5 h-5" />}
                                                </div>
                                                <div>
                                                    <div className="flex items-center space-x-2">
                                                        <h4 className="text-sm font-bold text-white">{item.customer_name}</h4>
                                                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                                                            item.is_won
                                                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                                                                : 'bg-slate-800 text-slate-400'
                                                        }`}>
                                                            {item.is_won ? 'WON' : item.outcome?.replace('_', ' ')}
                                                        </span>
                                                    </div>
                                                    <div className="text-xs font-mono text-slate-400 mt-0.5">
                                                        {item.ref_no} &bull; {new Date(item.concluded_at).toLocaleString()}
                                                    </div>
                                                </div>
                                            </div>

                                            <button
                                                type="button"
                                                onClick={() => setSelectedDealSlip(item)}
                                                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-colors inline-flex items-center space-x-1"
                                            >
                                                <FileText className="w-3.5 h-3.5 text-slate-400" />
                                                <span>Slip</span>
                                            </button>
                                        </div>

                                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-3 border-t border-slate-800/80 text-xs">
                                            <div>
                                                <div className="text-[10px] uppercase font-bold text-slate-500">Pair &amp; Side</div>
                                                <div className="font-bold text-white mt-0.5">
                                                    <span className={item.summary_direction === 'BUY' ? 'text-emerald-400' : 'text-rose-400'}>
                                                        {item.summary_direction}
                                                    </span>{' '}
                                                    {item.summary_pair}
                                                </div>
                                            </div>
                                            <div>
                                                <div className="text-[10px] uppercase font-bold text-slate-500">Volume</div>
                                                <div className="font-mono font-bold text-white mt-0.5">
                                                    {formatCurrency(item.summary_amount)} {item.summary_currency}
                                                </div>
                                            </div>
                                            <div>
                                                <div className="text-[10px] uppercase font-bold text-slate-500">Desk Quote</div>
                                                <div className="font-mono font-bold mt-0.5">
                                                    {item.dealer_rate ? (
                                                        <span className={item.is_won ? 'text-emerald-400 font-extrabold' : 'text-slate-200'}>
                                                            {formatRate(item.dealer_rate)}
                                                        </span>
                                                    ) : (
                                                        <span className="text-slate-500 italic text-[11px]">No Quote</span>
                                                    )}
                                                </div>
                                            </div>
                                            <div>
                                                <div className="text-[10px] uppercase font-bold text-slate-500">Winning Rate</div>
                                                <div className="font-mono font-bold text-white mt-0.5">
                                                    {item.winning_rate ? formatRate(item.winning_rate) : '—'}
                                                </div>
                                            </div>
                                        </div>

                                        {item.dealer_rank && (
                                            <div className="mt-3 pt-3 border-t border-slate-800/60 flex items-center justify-between text-xs">
                                                <div className="flex items-center space-x-2">
                                                    <span className="text-slate-400 text-[11px]">Dealer Rank:</span>
                                                    <span className={`px-2 py-0.5 rounded font-mono font-bold text-[11px] ${
                                                        item.dealer_rank === 1 ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-slate-800 text-slate-300'
                                                    }`}>
                                                        #{item.dealer_rank}
                                                    </span>
                                                    {item.spread_delta !== null && item.spread_delta !== undefined && (
                                                        <span className="text-slate-500 font-mono text-[11px]">
                                                            (Spread Δ: {item.spread_delta > 0 ? `+${formatRate(item.spread_delta)}` : formatRate(item.spread_delta)})
                                                        </span>
                                                    )}
                                                </div>
                                                {item.receipt && (
                                                    <span className="text-[11px] font-mono text-emerald-400 flex items-center">
                                                        <ShieldCheck className="w-3.5 h-3.5 mr-1" /> Verified Deal
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* TAB 4: DESK ANALYTICS */}
                {!loading && activeTab === 'analytics' && (
                    <div className="space-y-6">
                        {/* Summary Metrics */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            <div className="bg-[#0b0f17] border border-slate-800 rounded-2xl p-5 shadow-lg">
                                <div className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Total Concluded Deals</div>
                                <div className="text-2xl font-black text-white font-mono mt-2">{historyRecords.length}</div>
                                <div className="text-xs text-slate-500 mt-1">Addressed through desk blotter</div>
                            </div>
                            <div className="bg-[#0b0f17] border border-emerald-500/30 rounded-2xl p-5 shadow-lg">
                                <div className="text-emerald-400 text-xs font-semibold uppercase tracking-wider">Executed &amp; Won</div>
                                <div className="text-2xl font-black text-emerald-400 font-mono mt-2">
                                    {blotterStats.won_deals_count}
                                </div>
                                <div className="text-xs text-slate-400 mt-1">
                                    Win Rate:{' '}
                                    <strong className="text-emerald-400 font-bold">
                                        {blotterStats.win_rate_percent}%
                                    </strong>
                                </div>
                            </div>
                            <div className="bg-[#0b0f17] border border-slate-800 rounded-2xl p-5 shadow-lg">
                                <div className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Won Volume (Total)</div>
                                <div className="text-2xl font-black text-white font-mono mt-2">
                                    {formatCurrency(blotterStats.total_volume_won)}
                                </div>
                                <div className="text-xs text-slate-500 mt-1">Cumulative executed notional</div>
                            </div>
                            <div className="bg-[#0b0f17] border border-slate-800 rounded-2xl p-5 shadow-lg">
                                <div className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Average Pricing Rank</div>
                                <div className="text-2xl font-black text-teal-400 font-mono mt-2">
                                    {blotterStats.avg_dealer_rank ? `#${blotterStats.avg_dealer_rank}` : '—'}
                                </div>
                                <div className="text-xs text-slate-500 mt-1">Relative competitiveness across bids</div>
                            </div>
                        </div>

                        {/* Regulatory & Institutional Compliance Notice */}
                        <div className="bg-[#0b0f17] border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
                            <div className="flex items-center space-x-3">
                                <div className="w-10 h-10 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400 font-bold">
                                    <ShieldCheck className="w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="text-sm font-bold text-white">Central Bank &amp; Institutional Governance Compliance</h3>
                                    <p className="text-xs text-slate-400 mt-0.5">
                                        Tamper-evident quote non-repudiation and cryptographic audit records.
                                    </p>
                                </div>
                            </div>

                            <p className="text-xs text-slate-300 leading-relaxed">
                                Every quotation submitted by {dealer?.bank_name || 'your institution'} is cryptographically sealed with an immutable SHA-256 signature hash incorporating the dealer&apos;s identity, precise quote timestamp, currency pair, notional volume, and final rate. This ensures compliance with central bank FX quotation transparency rules, corporate governance audits, and prevents retrospective alteration of trading terms.
                            </p>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                                <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3.5">
                                    <div className="text-xs font-bold text-white flex items-center">
                                        <CheckCircle2 className="w-4 h-4 text-emerald-400 mr-1.5" />
                                        Deterministic Evaluation
                                    </div>
                                    <div className="text-[11px] text-slate-400 mt-1">
                                        All bids are evaluated simultaneously upon client execution window closing with zero front-running.
                                    </div>
                                </div>
                                <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3.5">
                                    <div className="text-xs font-bold text-white flex items-center">
                                        <CheckCircle2 className="w-4 h-4 text-emerald-400 mr-1.5" />
                                        Immutable Receipts
                                    </div>
                                    <div className="text-[11px] text-slate-400 mt-1">
                                        Won executions generate cryptographically signed settlement slips verifiable by internal and external auditors.
                                    </div>
                                </div>
                                <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3.5">
                                    <div className="text-xs font-bold text-white flex items-center">
                                        <CheckCircle2 className="w-4 h-4 text-emerald-400 mr-1.5" />
                                        Sub-second Refresh
                                    </div>
                                    <div className="text-[11px] text-slate-400 mt-1">
                                        Active RFQ windows operate on high-frequency 3-second live blotter polling with audio chime triggers.
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* DEAL SLIP INSPECTION MODAL */}
                {selectedDealSlip && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
                        <div className="bg-[#0b0f17] border border-slate-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl relative">
                            {/* Modal Header */}
                            <div className="flex items-start justify-between pb-4 border-b border-slate-800">
                                <div className="flex items-center space-x-3">
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold ${
                                        selectedDealSlip.is_won ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-300'
                                    }`}>
                                        <FileText className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <div className="flex items-center space-x-2">
                                            <h3 className="text-base font-extrabold text-white">
                                                Institutional Deal Slip
                                            </h3>
                                            <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                                                selectedDealSlip.is_won
                                                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                                                    : 'bg-slate-800 text-slate-400'
                                            }`}>
                                                {selectedDealSlip.is_won ? 'AWARDED & EXECUTED' : selectedDealSlip.outcome?.replace('_', ' ')}
                                            </span>
                                        </div>
                                        <p className="text-xs text-slate-400 font-mono mt-0.5">
                                            Ref: {selectedDealSlip.ref_no} &bull; ID: #{selectedDealSlip.rfq_id}
                                        </p>
                                    </div>
                                </div>

                                <button
                                    type="button"
                                    onClick={() => setSelectedDealSlip(null)}
                                    className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition-colors"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            {/* Ticket Details Grid */}
                            <div className="py-4 space-y-4 text-xs font-sans">
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-slate-900/60 p-4 rounded-xl border border-slate-800/80">
                                    <div>
                                        <div className="text-[10px] uppercase font-bold text-slate-500">Corporate Client</div>
                                        <div className="font-bold text-white text-sm mt-0.5">{selectedDealSlip.customer_name}</div>
                                    </div>
                                    <div>
                                        <div className="text-[10px] uppercase font-bold text-slate-500">Pair &amp; Direction</div>
                                        <div className="font-bold text-white text-sm mt-0.5 flex items-center space-x-1.5">
                                            <span className={selectedDealSlip.summary_direction === 'BUY' ? 'text-emerald-400' : 'text-rose-400'}>
                                                {selectedDealSlip.summary_direction}
                                            </span>
                                            <span>{selectedDealSlip.summary_pair}</span>
                                        </div>
                                    </div>
                                    <div>
                                        <div className="text-[10px] uppercase font-bold text-slate-500">Notional Volume</div>
                                        <div className="font-mono font-bold text-white text-sm mt-0.5">
                                            {formatCurrency(selectedDealSlip.summary_amount)} {selectedDealSlip.summary_currency}
                                        </div>
                                    </div>
                                    <div>
                                        <div className="text-[10px] uppercase font-bold text-slate-500">Value Date</div>
                                        <div className="text-slate-200 mt-0.5">{selectedDealSlip.summary_value_date || 'Spot Settlement'}</div>
                                    </div>
                                    <div>
                                        <div className="text-[10px] uppercase font-bold text-slate-500">Concluded Timestamp</div>
                                        <div className="text-slate-200 mt-0.5">{new Date(selectedDealSlip.concluded_at).toLocaleString()}</div>
                                    </div>
                                    <div>
                                        <div className="text-[10px] uppercase font-bold text-slate-500">Desk Quote Status</div>
                                        <div className="text-slate-200 mt-0.5 font-semibold">
                                            {selectedDealSlip.has_quoted ? 'Quote Submitted' : 'Unquoted Tender'}
                                        </div>
                                    </div>
                                </div>

                                {/* Pricing Breakdown */}
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                    <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-xl">
                                        <div className="text-[10px] uppercase font-bold text-slate-500">Your Quoted Rate</div>
                                        <div className="text-base font-extrabold font-mono text-emerald-400 mt-1">
                                            {selectedDealSlip.dealer_rate ? formatRate(selectedDealSlip.dealer_rate) : '—'}
                                        </div>
                                        {selectedDealSlip.dealer_submitted_at && (
                                            <div className="text-[10px] text-slate-500 mt-1 font-mono">
                                                Submitted: {new Date(selectedDealSlip.dealer_submitted_at).toLocaleTimeString()}
                                            </div>
                                        )}
                                    </div>
                                    <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-xl">
                                        <div className="text-[10px] uppercase font-bold text-slate-500">Winning Execution Rate</div>
                                        <div className="text-base font-extrabold font-mono text-white mt-1">
                                            {selectedDealSlip.winning_rate ? formatRate(selectedDealSlip.winning_rate) : '—'}
                                        </div>
                                        <div className="text-[10px] text-slate-500 mt-1 truncate">
                                            Winner: {selectedDealSlip.is_won ? (dealer?.bank_name || 'This Bank') : (selectedDealSlip.winning_bank_name || 'Counterparty Bank')}
                                        </div>
                                    </div>
                                    <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-xl">
                                        <div className="text-[10px] uppercase font-bold text-slate-500">Competitive Rank &amp; Spread</div>
                                        <div className="text-base font-extrabold font-mono text-teal-400 mt-1">
                                            {selectedDealSlip.dealer_rank ? `Rank #${selectedDealSlip.dealer_rank}` : '—'}
                                        </div>
                                        <div className="text-[10px] text-slate-500 mt-1 font-mono">
                                            {selectedDealSlip.spread_delta !== null && selectedDealSlip.spread_delta !== undefined
                                                ? `Δ ${selectedDealSlip.spread_delta > 0 ? `+${formatRate(selectedDealSlip.spread_delta)}` : formatRate(selectedDealSlip.spread_delta)}`
                                                : 'Zero delta'}
                                        </div>
                                    </div>
                                </div>

                                {/* Cryptographic Non-Repudiation Seal */}
                                {selectedDealSlip.receipt ? (
                                    <div className="bg-emerald-950/20 border border-emerald-500/40 rounded-xl p-4 space-y-2">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center space-x-2 text-emerald-400 font-bold text-xs">
                                                <ShieldCheck className="w-4 h-4" />
                                                <span>Cryptographic SHA-256 Receipt Seal</span>
                                            </div>
                                            <span className="font-mono text-xs font-bold text-emerald-400">
                                                {selectedDealSlip.receipt.receipt_id}
                                            </span>
                                        </div>
                                        <div className="bg-black/40 border border-emerald-500/20 rounded-lg p-2 font-mono text-[11px] text-emerald-300 break-all select-all flex items-center justify-between gap-2">
                                            <span>{selectedDealSlip.receipt.signature_hash}</span>
                                            <button
                                                type="button"
                                                onClick={() => handleCopyReceipt(selectedDealSlip.receipt.signature_hash, selectedDealSlip.receipt.receipt_id)}
                                                className="p-1 rounded bg-emerald-500/20 text-emerald-300 hover:text-white flex-shrink-0"
                                                title="Copy Signature Hash"
                                            >
                                                {copiedReceiptId === selectedDealSlip.receipt.receipt_id ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                                            </button>
                                        </div>
                                        <p className="text-[10px] text-slate-400">
                                            This cryptographic signature binds the transaction parameters and is verifiable against the central ledger for trade confirmations and regulatory reporting.
                                        </p>
                                    </div>
                                ) : (
                                    <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3 text-slate-400 text-xs flex items-center space-x-2">
                                        <Info className="w-4 h-4 text-slate-500" />
                                        <span>Trade slip archived without an executed receipt seal (Unawarded / Counterparty Awarded).</span>
                                    </div>
                                )}
                            </div>

                            {/* Modal Footer */}
                            <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
                                <div className="text-[11px] text-slate-500 font-mono">
                                    Logged Trader: {dealer?.full_name || 'Bank Trader'} &bull; 2FA Verified
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setSelectedDealSlip(null)}
                                    className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition-colors"
                                >
                                    Close Deal Slip
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
