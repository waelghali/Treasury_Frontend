import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
    Clock, Shield, ShieldCheck, Zap, Lock, Unlock,
    ArrowUpRight, ArrowDownLeft, RefreshCw, Volume2, VolumeX,
    LogOut, ExternalLink, ChevronDown, ChevronUp, Copy, Check,
    AlertCircle, CheckCircle2, TrendingUp, Layers, Building2,
    Calendar, Trophy, Award, Search, Filter, Loader2, Info
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
    const [activeTab, setActiveTab] = useState('live'); // 'live' vs 'history'
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
    const [searchQuery, setSearchQuery] = useState('');
    const [filterBase, setFilterBase] = useState('ALL'); // 'ALL', 'EXECUTION', 'INDICATIVE'

    // UI state
    const [expandedTicketId, setExpandedTicketId] = useState(null);
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
                // Play institutional bell if new live tickets arrived
                if (tickets.length > prevLiveCountRef.current && prevLiveCountRef.current > 0 && !audioMuted) {
                    try { tradingAudio.play('openingBell'); } catch (e) {}
                }
                prevLiveCountRef.current = tickets.length;
                setLiveTickets(tickets);
            }

            if (histRes.data?.success) {
                setHistoryRecords(histRes.data.records || []);
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
        const matchesSearch = !searchQuery ||
            t.customer_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            t.ref_no?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            t.summary_pair?.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesBase = filterBase === 'ALL' || t.quotation_base?.toUpperCase() === filterBase;
        return matchesSearch && matchesBase;
    });

    const formatSeconds = (sec) => {
        if (!sec || sec <= 0) return '00:00';
        const m = Math.floor(sec / 60);
        const s = sec % 60;
        return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
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
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                        </div>
                        <div className="text-2xl font-black text-white mt-1 font-mono">
                            {liveTickets.filter(t => t.status === 'LIVE_OPEN').length}
                        </div>
                        <span className="text-[10px] text-emerald-400">Available across corporate clients</span>
                    </div>

                    <div className="bg-[#0f172a] border border-slate-800 rounded-2xl p-4">
                        <span className="text-xs text-slate-400 font-medium">Scheduled Tenders</span>
                        <div className="text-2xl font-black text-white mt-1 font-mono">
                            {liveTickets.filter(t => t.status === 'SCHEDULED').length}
                        </div>
                        <span className="text-[10px] text-slate-500">Upcoming window opens</span>
                    </div>

                    <div className="bg-[#0f172a] border border-slate-800 rounded-2xl p-4">
                        <span className="text-xs text-slate-400 font-medium">Client Evaluating</span>
                        <div className="text-2xl font-black text-white mt-1 font-mono">
                            {liveTickets.filter(t => t.status === 'EVALUATING').length}
                        </div>
                        <span className="text-[10px] text-amber-400">Pending customer award</span>
                    </div>

                    <div className="bg-[#0f172a] border border-slate-800 rounded-2xl p-4">
                        <span className="text-xs text-slate-400 font-medium">Won Executions</span>
                        <div className="text-2xl font-black text-emerald-400 mt-1 font-mono">
                            {historyRecords.filter(h => h.is_won).length}
                        </div>
                        <span className="text-[10px] text-emerald-500">Cryptographically sealed deals</span>
                    </div>
                </div>

                {/* Sub-Navigation Tabs & Search Bar */}
                <div className="flex flex-wrap items-center justify-between gap-3 mb-6 bg-[#0f172a] p-2 rounded-2xl border border-slate-800">
                    {/* Tabs */}
                    <div className="flex items-center space-x-1">
                        <button
                            type="button"
                            onClick={() => setActiveTab('live')}
                            className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                                activeTab === 'live'
                                    ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-950'
                                    : 'text-slate-400 hover:text-white'
                            }`}
                        >
                            <span>Live Multi-Customer Feed</span>
                            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-900/60 font-mono">
                                {liveTickets.length}
                            </span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveTab('history')}
                            className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                                activeTab === 'history'
                                    ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-950'
                                    : 'text-slate-400 hover:text-white'
                            }`}
                        >
                            <span>Won Trades &amp; Receipts</span>
                            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-900/60 font-mono">
                                {historyRecords.length}
                            </span>
                        </button>
                    </div>

                    {/* Filter and Search */}
                    <div className="flex items-center space-x-2 w-full sm:w-auto">
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

                {/* TAB 2: EXECUTION BLOTTER & WON RECEIPTS */}
                {!loading && activeTab === 'history' && (
                    <div className="space-y-3">
                        {historyRecords.length === 0 ? (
                            <div className="text-center py-16 bg-[#0f172a] rounded-2xl border border-slate-800">
                                <Trophy className="w-10 h-10 text-slate-600 mx-auto mb-3" />
                                <h3 className="text-sm font-bold text-white">No Concluded Deals in Blotter</h3>
                                <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                                    Executed and concluded transactions won by {dealer?.bank_name || 'your desk'} will appear here with tamper-proof cryptographic receipts.
                                </p>
                            </div>
                        ) : (
                            historyRecords.map((item) => (
                                <div
                                    key={item.rfq_id}
                                    className={`bg-[#0f172a] border rounded-2xl p-4 sm:p-5 transition-all ${
                                        item.is_won
                                            ? 'border-emerald-500/40 bg-emerald-950/5'
                                            : 'border-slate-800'
                                    }`}
                                >
                                    <div className="flex flex-wrap items-center justify-between gap-3">
                                        <div className="flex items-center space-x-3">
                                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold ${
                                                item.is_won ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-500'
                                            }`}>
                                                {item.is_won ? <Award className="w-5 h-5" /> : <Building2 className="w-5 h-5" />}
                                            </div>

                                            <div>
                                                <div className="flex items-center space-x-2">
                                                    <span className="text-sm font-bold text-white">{item.customer_name}</span>
                                                    <span className="text-xs font-mono text-slate-500">{item.ref_no}</span>
                                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                                        item.outcome?.includes('WON')
                                                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                                                            : 'bg-slate-800 text-slate-400'
                                                    }`}>
                                                        {item.outcome?.replace('_', ' ')}
                                                    </span>
                                                </div>

                                                <div className="text-xs text-slate-400 mt-0.5">
                                                    Concluded: {new Date(item.concluded_at).toLocaleString()}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Cryptographic Receipt Seal Badge */}
                                        {item.receipt && (
                                            <div className="bg-slate-900 border border-emerald-500/30 rounded-xl p-2.5 flex items-center space-x-3">
                                                <div>
                                                    <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                                                        Cryptographic Receipt Seal
                                                    </div>
                                                    <div className="font-mono text-xs font-extrabold text-emerald-400">
                                                        {item.receipt.receipt_id}
                                                    </div>
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

                                    {/* Executed Legs Details */}
                                    {item.executed_legs && item.executed_legs.length > 0 && (
                                        <div className="mt-3 pt-3 border-t border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                                            {item.executed_legs.map((leg, lIdx) => (
                                                <div key={lIdx} className="bg-slate-900/60 p-2 rounded-lg flex justify-between items-center">
                                                    <span className="font-medium text-slate-300">{leg.direction} {Number(leg.amount).toLocaleString()} {leg.pair}</span>
                                                    <span className="font-mono font-bold text-emerald-400">@ {leg.rate} ({leg.value_date})</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                )}
            </main>
        </div>
    );
}
