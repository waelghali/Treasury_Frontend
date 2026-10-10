import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { jwtDecode } from 'jwt-decode';
import {
    Clock, ShieldCheck, Zap, ArrowUpRight, ArrowDownLeft, RefreshCw, Volume2, VolumeX,
    LogOut, ExternalLink, ChevronDown, ChevronUp, Copy, Check,
    AlertCircle, CheckCircle2, TrendingUp, Layers, Building2,
    Calendar, Trophy, Award, Search, Filter, Loader2, Info,
    FileText, CheckCircle, XCircle, BarChart3, LayoutList, LayoutGrid, X,
    Lock, Unlock, Crown, Flame, Landmark, Eye, Shield, Globe, Sparkles, Medal,
    Users, UserCheck, User
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
    const [activeTab, setActiveTab] = useState('won'); // Default landing: Won Trades & Receipts
    const [blotterViewMode, setBlotterViewMode] = useState('table'); // 'table' vs 'cards'
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState(null);

    // Inactivity & Session Expiry State (15-min idle timeout, 60-sec warning)
    const INACTIVITY_TIMEOUT_MS = 15 * 60 * 1000;
    const INACTIVITY_WARNING_MS = 60 * 1000;
    const [showIdleWarning, setShowIdleWarning] = useState(false);
    const [idleCountdown, setIdleCountdown] = useState(60);
    const lastActivityRef = useRef(Date.now());
    const showIdleWarningRef = useRef(false);
    showIdleWarningRef.current = showIdleWarning;

    // Audio & Clock
    const [audioMuted, setAudioMuted] = useState(false);
    const [currentTimeUtc, setCurrentTimeUtc] = useState('');
    const [currentTimeLocal, setCurrentTimeLocal] = useState('');

    // Blotter Data & Accolades
    const [liveTickets, setLiveTickets] = useState([]);
    const [historyRecords, setHistoryRecords] = useState([]);
    const [achievements, setAchievements] = useState(null);
    const [blotterStats, setBlotterStats] = useState({
        won_deals_count: 0,
        my_won_deals_count: 0,
        total_volume_won: 0,
        win_rate_percent: 0,
        my_win_rate_percent: 0,
        avg_dealer_rank: null
    });

    // Filters & Search
    const [searchQuery, setSearchQuery] = useState('');
    const [scopeFilter, setScopeFilter] = useState('ALL_DESK'); // 'ALL_DESK' (All Bank Traders) or 'MY_TRADES' (My Executions)
    const [outcomeFilter, setOutcomeFilter] = useState('ALL'); // 'ALL', 'WON', 'LOST', 'QUOTED'
    const [dateFilter, setDateFilter] = useState('ALL'); // 'ALL', 'TODAY', '7D', '30D'
    const [currencyFilter, setCurrencyFilter] = useState('ALL'); // 'ALL', 'USD', 'EUR', etc.
    const [customerFilter, setCustomerFilter] = useState('ALL'); // 'ALL' or specific customer_name
    const [sortBy, setSortBy] = useState('NEWEST'); // 'NEWEST', 'OLDEST'

    // UI state & Modal
    const [expandedRowIds, setExpandedRowIds] = useState(new Set());
    const [selectedDealSlip, setSelectedDealSlip] = useState(null);
    const [copiedReceiptId, setCopiedReceiptId] = useState(null);
    const prevLiveCountRef = useRef(0);

    const toggleRowExpand = (rfqId) => {
        setExpandedRowIds(prev => {
            const next = new Set(prev);
            if (next.has(rfqId)) {
                next.delete(rfqId);
            } else {
                next.add(rfqId);
            }
            return next;
        });
    };

    const getAuthHeaders = useCallback(() => {
        const token = localStorage.getItem('grow_bank_dealer_token');
        return token ? { Authorization: `Bearer ${token}` } : {};
    }, []);

    // Logout Handler with Optional Reason
    const handleLogout = useCallback((reason = null) => {
        localStorage.removeItem('grow_bank_dealer_token');
        localStorage.removeItem('grow_bank_dealer_profile');
        if (reason) {
            navigate(`/dealer/login?reason=${encodeURIComponent(reason)}`, { replace: true });
        } else {
            navigate('/dealer/login', { replace: true });
        }
    }, [navigate]);

    // Keep Active Handler for Inactivity Warning Modal
    const handleStayActive = useCallback(() => {
        lastActivityRef.current = Date.now();
        setShowIdleWarning(false);
        setIdleCountdown(60);
    }, []);

    // Global Activity Listeners (mousedown, keydown, click, scroll, touch, throttled mousemove)
    useEffect(() => {
        let lastThrottle = 0;
        const recordActivity = (e) => {
            const now = Date.now();
            if (e.type === 'mousemove') {
                if (now - lastThrottle < 1000) return;
                lastThrottle = now;
            }
            if (!showIdleWarningRef.current) {
                lastActivityRef.current = now;
            }
        };

        const events = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'click'];
        events.forEach(ev => window.addEventListener(ev, recordActivity, { passive: true }));
        return () => {
            events.forEach(ev => window.removeEventListener(ev, recordActivity));
        };
    }, []);

    // Desk Clock Tick & Session / Inactivity Sentinel
    useEffect(() => {
        const updateClockAndSecurity = () => {
            const now = new Date();
            setCurrentTimeUtc(now.toUTCString().slice(17, 25) + ' UTC');
            setCurrentTimeLocal(now.toLocaleTimeString());

            // 1. Session Token Expiry Validation (cryptographic exp claim)
            const token = localStorage.getItem('grow_bank_dealer_token');
            if (token) {
                try {
                    const decoded = jwtDecode(token);
                    if (decoded.exp && Date.now() >= decoded.exp * 1000) {
                        handleLogout('Trading session expired. Please log in again.');
                        return;
                    }
                } catch (e) {}
            }

            // 2. Desk Inactivity Check
            const idleMs = Date.now() - lastActivityRef.current;
            const remainingMs = INACTIVITY_TIMEOUT_MS - idleMs;
            if (remainingMs <= 0) {
                handleLogout('Trading desk automatically locked due to inactivity.');
            } else if (remainingMs <= INACTIVITY_WARNING_MS) {
                setShowIdleWarning(true);
                setIdleCountdown(Math.max(1, Math.ceil(remainingMs / 1000)));
            } else {
                if (showIdleWarningRef.current) {
                    setShowIdleWarning(false);
                }
            }

            // 3. Local Countdown Ticker for Live Tickets (No network polling needed)
            setLiveTickets(prev => {
                if (!prev || !prev.length) return prev;
                let hasChanges = false;
                const next = prev.map(t => {
                    if (t.seconds_remaining && t.seconds_remaining > 0) {
                        hasChanges = true;
                        return { ...t, seconds_remaining: t.seconds_remaining - 1 };
                    }
                    return t;
                });
                return hasChanges ? next : prev;
            });
        };

        updateClockAndSecurity();
        const clockTimer = setInterval(updateClockAndSecurity, 1000);
        return () => clearInterval(clockTimer);
    }, [handleLogout]);

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
                handleLogout('Failed to load dealer credentials.');
            }
        }).catch((err) => {
            const detail = err.response?.data?.detail || 'Session expired or portal access revoked.';
            handleLogout(detail);
        });
    }, [navigate, handleLogout]);

    // Fetch Blotter Feeds
    const fetchBlotterData = useCallback(async (isSilent = false) => {
        if (!isSilent) setRefreshing(true);
        const headers = getAuthHeaders();
        try {
            const [liveRes, histRes, achRes] = await Promise.all([
                axios.get(`${API_BASE_URL}/api/v1/bank-dealer/blotter/live-rfqs`, { headers }),
                axios.get(`${API_BASE_URL}/api/v1/bank-dealer/blotter/history`, { headers }),
                axios.get(`${API_BASE_URL}/api/v1/bank-dealer/achievements`, { headers }).catch(() => ({ data: null }))
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
                    my_won_deals_count: histRes.data.my_won_deals_count || 0,
                    quoted_deals_count: histRes.data.quoted_deals_count || 0,
                    my_quoted_deals_count: histRes.data.my_quoted_deals_count || 0,
                    total_volume_won: histRes.data.total_volume_won || 0,
                    won_volume_by_currency: histRes.data.won_volume_by_currency || {},
                    win_rate_percent: histRes.data.win_rate_percent || 0,
                    my_win_rate_percent: histRes.data.my_win_rate_percent || 0,
                    avg_dealer_rank: histRes.data.avg_dealer_rank
                });
            }

            if (achRes?.data?.success && achRes.data.achievements) {
                setAchievements(achRes.data.achievements);
            }
            setError(null);
        } catch (err) {
            if (err.response?.status === 401) {
                handleLogout('Session expired. Please log in again.');
            } else if (err.response?.status === 403) {
                const detail = err.response?.data?.detail || 'Desk access suspended.';
                handleLogout(detail);
            } else {
                setError('Could not refresh trading blotter feeds.');
            }
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [getAuthHeaders, audioMuted, handleLogout]);

    // Initial Load (Manual Refresh via header button or tab navigation)
    useEffect(() => {
        fetchBlotterData();
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

    // Unique Currencies for Filter Dropdown
    const availableCurrencies = useMemo(() => {
        const currs = new Set();
        historyRecords.forEach(h => {
            if (h.summary_currency) currs.add(h.summary_currency);
            if (h.all_legs_detail) {
                h.all_legs_detail.forEach(l => {
                    if (l.currency) currs.add(l.currency);
                });
            }
        });
        return Array.from(currs).filter(Boolean).sort();
    }, [historyRecords]);

    // Unique Customers for Filter Dropdown
    const availableCustomers = useMemo(() => {
        const custs = new Set();
        historyRecords.forEach(h => {
            if (h.customer_name) custs.add(h.customer_name.trim());
        });
        return Array.from(custs).filter(Boolean).sort();
    }, [historyRecords]);

    const myWonCount = useMemo(() => {
        const cleanEmail = (dealer?.email || '').trim().toLowerCase();
        return historyRecords.filter(h => h.is_won && (h.is_won_by_me || (cleanEmail && h.dealer_submitted_by && h.dealer_submitted_by.trim().toLowerCase() === cleanEmail))).length;
    }, [historyRecords, dealer]);

    const myAllCount = useMemo(() => {
        const cleanEmail = (dealer?.email || '').trim().toLowerCase();
        return historyRecords.filter(h => h.quoted_by_me || h.is_won_by_me || (cleanEmail && h.dealer_submitted_by && h.dealer_submitted_by.trim().toLowerCase() === cleanEmail)).length;
    }, [historyRecords, dealer]);

    const applyHistoryFilters = useCallback((records, filterWonOnly = false) => {
        const cleanEmail = (dealer?.email || '').trim().toLowerCase();
        return records.filter(h => {
            // Scope filter: ALL_DESK vs MY_TRADES
            if (scopeFilter === 'MY_TRADES') {
                const isMine = filterWonOnly
                    ? (h.is_won_by_me || (cleanEmail && h.dealer_submitted_by && h.dealer_submitted_by.trim().toLowerCase() === cleanEmail))
                    : (h.quoted_by_me || h.is_won_by_me || (cleanEmail && h.dealer_submitted_by && h.dealer_submitted_by.trim().toLowerCase() === cleanEmail));
                if (!isMine) return false;
            }

            if (filterWonOnly && !h.is_won) return false;
            if (!filterWonOnly) {
                if (outcomeFilter === 'WON' && !h.is_won) return false;
                if (outcomeFilter === 'LOST' && (h.is_won || h.outcome === 'EXPIRED' || h.outcome === 'CANCELLED')) return false;
                if (outcomeFilter === 'QUOTED' && !h.has_quoted) return false;
            }

            // Customer filter
            if (customerFilter !== 'ALL') {
                if (h.customer_name?.trim() !== customerFilter) return false;
            }

            // Currency filter
            if (currencyFilter !== 'ALL') {
                const matchSummary = h.summary_currency === currencyFilter;
                const matchLegs = h.all_legs_detail && h.all_legs_detail.some(l => l.currency === currencyFilter);
                if (!matchSummary && !matchLegs) return false;
            }

            // Date Range filter
            if (dateFilter !== 'ALL' && h.concluded_at) {
                const itemDate = new Date(h.concluded_at);
                const now = new Date();
                if (dateFilter === 'TODAY') {
                    if (itemDate.toDateString() !== now.toDateString()) return false;
                } else if (dateFilter === '7D') {
                    const diffDays = (now - itemDate) / (1000 * 60 * 60 * 24);
                    if (diffDays > 7) return false;
                } else if (dateFilter === '30D') {
                    const diffDays = (now - itemDate) / (1000 * 60 * 60 * 24);
                    if (diffDays > 30) return false;
                }
            }

            // Search query
            if (!searchQuery) return true;
            const q = searchQuery.toLowerCase();
            return (
                h.customer_name?.toLowerCase().includes(q) ||
                h.ref_no?.toLowerCase().includes(q) ||
                h.summary_pair?.toLowerCase().includes(q) ||
                h.dealer_submitted_by?.toLowerCase().includes(q) ||
                (h.all_legs_detail && h.all_legs_detail.some(l => 
                    l.pair?.toLowerCase().includes(q) || 
                    l.currency?.toLowerCase().includes(q)
                ))
            );
        }).sort((a, b) => {
            if (sortBy === 'OLDEST') {
                return new Date(a.concluded_at || 0) - new Date(b.concluded_at || 0);
            }
            return new Date(b.concluded_at || 0) - new Date(a.concluded_at || 0);
        });
    }, [outcomeFilter, customerFilter, currencyFilter, dateFilter, searchQuery, sortBy, scopeFilter, dealer]);

    const wonHistoryRecords = useMemo(() => applyHistoryFilters(historyRecords, true), [applyHistoryFilters, historyRecords]);
    const filteredHistoryRecords = useMemo(() => applyHistoryFilters(historyRecords, false), [applyHistoryFilters, historyRecords]);

    const liveOpenCount = useMemo(() => liveTickets.filter(t => t.status === 'LIVE_OPEN').length, [liveTickets]);
    const scheduledCount = useMemo(() => liveTickets.filter(t => t.status === 'SCHEDULED').length, [liveTickets]);
    const evaluatingCount = useMemo(() => liveTickets.filter(t => t.status === 'EVALUATING').length, [liveTickets]);
    const activeTendersCount = useMemo(() => liveTickets.filter(t => t.status === 'LIVE_OPEN' || t.status === 'SCHEDULED').length, [liveTickets]);

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

    const getTrophyIcon = (iconName) => {
        switch (iconName) {
            case 'Crown': return <Crown className="w-5 h-5 text-amber-400" />;
            case 'Landmark': return <Landmark className="w-5 h-5 text-cyan-400" />;
            case 'Zap': return <Zap className="w-5 h-5 text-yellow-400" />;
            case 'Eye': return <Eye className="w-5 h-5 text-teal-400" />;
            case 'Shield': return <Shield className="w-5 h-5 text-emerald-400" />;
            case 'Clock': return <Clock className="w-5 h-5 text-indigo-400" />;
            case 'Globe': return <Globe className="w-5 h-5 text-blue-400" />;
            case 'Flame': return <Flame className="w-5 h-5 text-rose-400" />;
            case 'Award': return <Award className="w-5 h-5 text-purple-400" />;
            default: return <Trophy className="w-5 h-5 text-amber-400" />;
        }
    };

    const getTierBadgeStyle = (tier) => {
        switch (tier) {
            case 'PLATINUM':
                return 'bg-purple-500/20 text-purple-300 border-purple-500/40 shadow-xs shadow-purple-500/20';
            case 'GOLD':
                return 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-xs shadow-amber-500/20';
            case 'SILVER':
                return 'bg-slate-400/20 text-slate-200 border-slate-400/40 shadow-xs shadow-slate-400/20';
            case 'BRONZE':
                return 'bg-orange-500/20 text-orange-300 border-orange-500/40 shadow-xs shadow-orange-500/20';
            default:
                return 'bg-slate-800 text-slate-400 border-slate-700';
        }
    };

    const getTierProgressBar = (tier) => {
        switch (tier) {
            case 'PLATINUM': return 'bg-gradient-to-r from-purple-500 to-indigo-400';
            case 'GOLD': return 'bg-gradient-to-r from-amber-500 to-yellow-300';
            case 'SILVER': return 'bg-gradient-to-r from-slate-400 to-slate-200';
            case 'BRONZE': return 'bg-gradient-to-r from-orange-600 to-amber-500';
            default: return 'bg-gradient-to-r from-emerald-600 to-teal-400';
        }
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

                                {/* Header Tier Pill */}
                                {achievements?.dealer_tier && (
                                    <>
                                        <span>&bull;</span>
                                        <button
                                            type="button"
                                            onClick={() => setActiveTab('trophies')}
                                            title="View Trader Accolades & Trophies"
                                            className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded-md text-[11px] font-bold border transition-transform hover:scale-105 ${
                                                achievements.dealer_tier.includes('Diamond') ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400' :
                                                achievements.dealer_tier.includes('Platinum') ? 'bg-purple-500/10 border-purple-500/30 text-purple-400' :
                                                achievements.dealer_tier.includes('Gold') ? 'bg-amber-500/10 border-amber-500/30 text-amber-400' :
                                                achievements.dealer_tier.includes('Silver') ? 'bg-slate-400/10 border-slate-400/30 text-slate-300' :
                                                'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                                            }`}
                                        >
                                            <Trophy className="w-3 h-3 text-amber-400" />
                                            <span>{achievements.dealer_tier}</span>
                                            <span className="text-[10px] opacity-75 font-mono">({achievements.earned_trophy_count || 0}/8)</span>
                                        </button>
                                    </>
                                )}
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
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 mb-6">
                    <div className="bg-[#0f172a] border border-slate-800 rounded-2xl p-4 relative overflow-hidden">
                        <div className="flex justify-between items-start">
                            <span className="text-xs text-slate-400 font-medium">Active Live Tenders</span>
                            {liveOpenCount > 0 ? (
                                <span className="flex items-center space-x-1.5 px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                                    <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">Live</span>
                                </span>
                            ) : scheduledCount > 0 ? (
                                <span className="flex items-center space-x-1.5 px-2 py-0.5 rounded-full bg-indigo-500/15 border border-indigo-500/30">
                                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                                    <span className="text-[10px] text-indigo-300 font-bold uppercase tracking-wider">Upcoming</span>
                                </span>
                            ) : null}
                        </div>
                        <div className="text-2xl font-black text-white mt-1 font-mono flex items-baseline space-x-2">
                            <span>{activeTendersCount}</span>
                            {scheduledCount > 0 && liveOpenCount > 0 && (
                                <span className="text-xs font-semibold text-slate-400 font-sans">
                                    ({liveOpenCount} Live, {scheduledCount} Upcoming)
                                </span>
                            )}
                        </div>
                        <span className="text-[11px] text-emerald-400">
                            {liveOpenCount > 0 && scheduledCount > 0
                                ? `${liveOpenCount} live now • ${scheduledCount} scheduled to open`
                                : liveOpenCount > 0
                                    ? `${liveOpenCount} actionable live client RFQ${liveOpenCount > 1 ? 's' : ''}`
                                    : scheduledCount > 0
                                        ? `${scheduledCount} scheduled tender (starts shortly)`
                                        : 'Actionable live client RFQs'}
                        </span>
                    </div>

                    <div className="bg-[#0f172a] border border-slate-800 rounded-2xl p-4">
                        <span className="text-xs text-slate-400 font-medium">Client Evaluating</span>
                        <div className="text-2xl font-black text-white mt-1 font-mono">
                            {evaluatingCount}
                        </div>
                        <span className="text-[11px] text-amber-400">Quotes pending award decision</span>
                    </div>

                    <div className="bg-[#0f172a] border border-slate-800 rounded-2xl p-4">
                        <div className="flex justify-between items-start">
                            <span className="text-xs text-slate-400 font-medium">Desk Win Ratio</span>
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-slate-800 text-slate-400 border border-slate-700">
                                Desk
                            </span>
                        </div>
                        <div className="text-2xl font-black text-emerald-400 mt-1 font-mono flex items-baseline space-x-1">
                            <span>{blotterStats.win_rate_percent}%</span>
                            {blotterStats.avg_dealer_rank && (
                                <span className="text-xs text-slate-400 font-normal ml-1.5">
                                    (Avg #{blotterStats.avg_dealer_rank})
                                </span>
                            )}
                        </div>
                        <span className="text-[11px] text-slate-400">Institutional desk competitiveness</span>
                    </div>

                    <div className="bg-[#0f172a] border border-slate-800 rounded-2xl p-4">
                        <div className="flex justify-between items-start">
                            <span className="text-xs text-slate-400 font-medium">Bank Desk Flow Won</span>
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                                Desk Total
                            </span>
                        </div>
                        <div className="text-2xl font-black text-cyan-400 mt-1 font-mono flex items-baseline space-x-1.5">
                            <span>{blotterStats.won_deals_count} Won</span>
                            <span className="text-xs font-semibold text-emerald-400 font-sans" title="Won personally by this trader login">
                                ({achievements?.personal_bests?.total_deals_won ?? blotterStats.my_won_deals_count ?? myWonCount} by You)
                            </span>
                        </div>
                        <span className="text-[11px] text-cyan-400 truncate block mt-0.5" title={blotterStats.won_volume_by_currency ? Object.entries(blotterStats.won_volume_by_currency).map(([c, v]) => `${formatCurrency(v)} ${c}`).join(' • ') : ''}>
                            {blotterStats.won_volume_by_currency && Object.keys(blotterStats.won_volume_by_currency).length > 0
                                ? Object.entries(blotterStats.won_volume_by_currency).map(([c, v]) => `${formatCurrency(v)} ${c}`).join(' • ')
                                : `${blotterStats.won_deals_count} cryptographically sealed`}
                        </span>
                    </div>

                    {/* CARD 5: TRADER TROPHIES & TIER */}
                    <div
                        onClick={() => setActiveTab('trophies')}
                        className="bg-[#0f172a] border border-amber-500/30 hover:border-amber-500/60 rounded-2xl p-4 cursor-pointer transition-all hover:bg-slate-900 group"
                    >
                        <div className="flex justify-between items-start">
                            <span className="text-xs text-amber-400 font-semibold flex items-center">
                                <Trophy className="w-3.5 h-3.5 mr-1 text-amber-400" /> Trader Accolades
                            </span>
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                                Personal
                            </span>
                        </div>
                        <div className="text-2xl font-black text-white mt-1 font-mono flex items-baseline space-x-1.5">
                            <span className="text-amber-400">{achievements?.earned_trophy_count || 0}</span>
                            <span className="text-slate-500 text-sm font-normal">/ {achievements?.total_trophies || 8} Badges</span>
                            <span className="text-xs font-semibold text-emerald-400 font-sans ml-1">
                                &bull; {achievements?.personal_bests?.total_deals_won ?? blotterStats.my_won_deals_count ?? myWonCount} Wins
                            </span>
                        </div>
                        <span className="text-[11px] text-slate-400 truncate block mt-0.5">
                            Tier: <strong className="text-slate-200">{achievements?.dealer_tier || 'Active Dealer'}</strong>
                        </span>
                    </div>
                </div>

                {/* Sub-Navigation Tabs & Search Bar */}
                <div className="flex flex-wrap items-center justify-between gap-3 mb-4 bg-[#0f172a] p-2 rounded-2xl border border-slate-800">
                    {/* Tabs: Won Trades & History First */}
                    <div className="flex flex-wrap items-center gap-1">
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
                            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-900/80 font-mono text-emerald-400 font-bold" title={scopeFilter === 'MY_TRADES' ? 'My Won Trades' : 'All Desk Won Trades'}>
                                {scopeFilter === 'MY_TRADES' ? wonHistoryRecords.length : blotterStats.won_deals_count}
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
                                {scopeFilter === 'MY_TRADES' ? filteredHistoryRecords.length : historyRecords.length}
                            </span>
                        </button>

                        <button
                            type="button"
                            onClick={() => setActiveTab('live')}
                            className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                                activeTab === 'live'
                                    ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-950'
                                    : 'text-slate-400 hover:text-white'
                            }`}
                        >
                            <Zap className="w-3.5 h-3.5 text-amber-400" />
                            <span>Live Multi-Customer Feed</span>
                            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-900/80 font-mono">
                                {activeTendersCount}
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

                        <button
                            type="button"
                            onClick={() => setActiveTab('trophies')}
                            className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                                activeTab === 'trophies'
                                    ? 'bg-amber-500 text-slate-950 font-black shadow-lg shadow-amber-950'
                                    : 'text-amber-400/90 hover:text-amber-300'
                            }`}
                        >
                            <Trophy className="w-3.5 h-3.5 text-amber-400" />
                            <span>Trader Accolades &amp; Trophies</span>
                            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-900/80 font-mono text-amber-300 font-bold">
                                {achievements?.earned_trophy_count || 0}/8
                            </span>
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
                            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search client, pair, ref..."
                                className="w-full !pl-10 pr-3 py-1.5 bg-slate-900 border border-slate-700/80 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                            />
                        </div>
                    </div>
                </div>

                {/* Sub-Filters for History & Won Tabs */}
                {(activeTab === 'history' || activeTab === 'won') && (
                    <div className="flex flex-wrap items-center justify-between gap-3 mb-4 px-2 py-2 bg-[#0b101b] border border-slate-800/80 rounded-xl">
                        <div className="flex flex-wrap items-center gap-2">
                            {/* Scope Switcher: All Desk vs My Executions */}
                            <div className="flex items-center space-x-1 border-r border-slate-800 pr-3 mr-1">
                                <span className="text-[11px] text-slate-500 font-semibold mr-1 flex items-center">
                                    <Users className="w-3 h-3 mr-1" /> View:
                                </span>
                                <button
                                    type="button"
                                    onClick={() => setScopeFilter('ALL_DESK')}
                                    className={`px-2.5 py-0.5 rounded-lg text-xs font-semibold transition-all ${
                                        scopeFilter === 'ALL_DESK'
                                            ? 'bg-slate-800 text-cyan-400 border border-cyan-500/40 shadow-sm font-bold'
                                            : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 border border-slate-800'
                                    }`}
                                >
                                    All Desk ({activeTab === 'won' ? blotterStats.won_deals_count : historyRecords.length})
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setScopeFilter('MY_TRADES')}
                                    className={`px-2.5 py-0.5 rounded-lg text-xs font-semibold transition-all flex items-center space-x-1 ${
                                        scopeFilter === 'MY_TRADES'
                                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/50 shadow-sm font-bold'
                                            : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 border border-slate-800'
                                    }`}
                                >
                                    <UserCheck className="w-3 h-3 text-emerald-400" />
                                    <span>My Trades ({activeTab === 'won' ? (achievements?.personal_bests?.total_deals_won ?? blotterStats.my_won_deals_count ?? myWonCount) : myAllCount})</span>
                                </button>
                            </div>
                            {/* Outcome Filter (History Tab only) */}
                            {activeTab === 'history' && (
                                <div className="flex items-center space-x-1 border-r border-slate-800 pr-3 mr-1">
                                    <span className="text-[11px] text-slate-500 font-semibold mr-1 flex items-center">
                                        <Filter className="w-3 h-3 mr-1" /> Outcome:
                                    </span>
                                    {['ALL', 'WON', 'LOST', 'QUOTED'].map((filter) => (
                                        <button
                                            key={filter}
                                            type="button"
                                            onClick={() => setOutcomeFilter(filter)}
                                            className={`px-2 py-0.5 rounded-lg text-xs font-semibold transition-all ${
                                                outcomeFilter === filter
                                                    ? 'bg-slate-800 text-emerald-400 border border-emerald-500/30'
                                                    : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 border border-slate-800'
                                            }`}
                                        >
                                            {filter === 'ALL' && 'All'}
                                            {filter === 'WON' && 'Won'}
                                            {filter === 'LOST' && 'Lost'}
                                            {filter === 'QUOTED' && 'Quoted'}
                                        </button>
                                    ))}
                                </div>
                            )}

                            {/* Date Range Filter */}
                            <div className="flex items-center space-x-1">
                                <span className="text-[11px] text-slate-500 font-semibold mr-1 flex items-center">
                                    <Calendar className="w-3 h-3 mr-1" /> Date:
                                </span>
                                {[
                                    { id: 'ALL', label: 'All Time' },
                                    { id: 'TODAY', label: 'Today' },
                                    { id: '7D', label: '7D' },
                                    { id: '30D', label: '30D' }
                                ].map((d) => (
                                    <button
                                        key={d.id}
                                        type="button"
                                        onClick={() => setDateFilter(d.id)}
                                        className={`px-2 py-0.5 rounded-lg text-xs font-semibold transition-all ${
                                            dateFilter === d.id
                                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                                                : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 border border-slate-800'
                                        }`}
                                    >
                                        {d.label}
                                    </button>
                                ))}
                            </div>

                            {/* Currency Filter Dropdown */}
                            {availableCurrencies.length > 0 && (
                                <div className="flex items-center space-x-1 pl-2 border-l border-slate-800">
                                    <span className="text-[11px] text-slate-500 font-semibold">Currency:</span>
                                    <select
                                        value={currencyFilter}
                                        onChange={(e) => setCurrencyFilter(e.target.value)}
                                        className="bg-slate-900 border border-slate-700 text-xs text-white rounded-lg px-2 py-0.5 focus:outline-none focus:border-emerald-500 font-mono"
                                    >
                                        <option value="ALL">All Currencies</option>
                                        {availableCurrencies.map(c => (
                                            <option key={c} value={c}>{c}</option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            {/* Customer / Client Filter Dropdown */}
                            {availableCustomers.length > 0 && (
                                <div className="flex items-center space-x-1 pl-2 border-l border-slate-800">
                                    <span className="text-[11px] text-slate-500 font-semibold flex items-center">
                                        <Building2 className="w-3 h-3 mr-1 text-slate-400" /> Client:
                                    </span>
                                    <select
                                        value={customerFilter}
                                        onChange={(e) => setCustomerFilter(e.target.value)}
                                        className="bg-slate-900 border border-slate-700 text-xs text-white rounded-lg px-2 py-0.5 focus:outline-none focus:border-emerald-500 max-w-[150px] truncate"
                                    >
                                        <option value="ALL">All Clients ({availableCustomers.length})</option>
                                        {availableCustomers.map(c => (
                                            <option key={c} value={c}>{c}</option>
                                        ))}
                                    </select>
                                </div>
                            )}
                        </div>

                        {/* Sort Order Dropdown */}
                        <div className="flex items-center space-x-1">
                            <span className="text-[11px] text-slate-500 font-semibold">Sort:</span>
                            <select
                                value={sortBy}
                                onChange={(e) => setSortBy(e.target.value)}
                                className="bg-slate-900 border border-slate-700 text-xs text-white rounded-lg px-2 py-0.5 focus:outline-none focus:border-emerald-500"
                            >
                                <option value="NEWEST">Newest Concluded</option>
                                <option value="OLDEST">Oldest Concluded</option>
                            </select>
                        </div>
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

                                                    {ticket.visible_legs && ticket.visible_legs.length > 1 ? (
                                                        <div className="mt-2.5 space-y-2">
                                                            <div className="flex flex-wrap items-center gap-2 text-xs">
                                                                <span className="px-2 py-0.5 rounded text-[11px] font-black uppercase tracking-wider bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                                                                    {ticket.visible_legs.length} Legs Package
                                                                </span>
                                                                <span className="text-slate-400 font-medium text-xs">{ticket.summary_value_date}</span>
                                                                <span className="text-slate-600">&bull;</span>
                                                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                                                                    ticket.quotation_base?.toLowerCase() === 'indicative'
                                                                        ? 'bg-purple-500/15 text-purple-300 border border-purple-500/30'
                                                                        : 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                                                                }`}>
                                                                    {ticket.quotation_base || 'Execution'}
                                                                </span>
                                                            </div>
                                                            <div className="flex flex-wrap gap-2.5">
                                                                {ticket.visible_legs.map((leg, idx) => (
                                                                    <div key={leg.leg_id || idx} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700/80 text-xs shadow-xs">
                                                                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-400 font-mono">
                                                                            L{idx + 1}
                                                                        </span>
                                                                        <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
                                                                            leg.direction === 'BUY'
                                                                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                                                                : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                                                                        }`}>
                                                                            {leg.direction}
                                                                        </span>
                                                                        <span className="font-mono font-black text-white text-xs">
                                                                            {formatCurrency(leg.amount)} {leg.currency}
                                                                        </span>
                                                                        <span className="text-slate-400 font-semibold text-xs font-mono">
                                                                            ({leg.currency_pair})
                                                                        </span>
                                                                        <span className="text-slate-500 text-[11px]">
                                                                            &bull; {leg.value_date}
                                                                        </span>
                                                                        {leg.allow_alternative_value_date && (
                                                                            <span className="ml-1 px-1.5 py-0.2 rounded text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30" title="Client allows alternative value date">
                                                                                Alt Date
                                                                            </span>
                                                                        )}
                                                                        {leg.has_quote && (
                                                                            <span className="ml-1 px-1.5 py-0.2 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                                                                Quoted
                                                                            </span>
                                                                        )}
                                                                        {leg.is_passed && (
                                                                            <span className="ml-1 px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                                                                Passed
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div className="flex flex-wrap items-center gap-2.5 mt-2 text-xs">
                                                            <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
                                                                ticket.summary_direction === 'BUY'
                                                                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                                                    : 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                                                            }`}>
                                                                {ticket.summary_direction}
                                                            </span>
                                                            <span className="font-mono font-black text-white text-sm">
                                                                {ticket.summary_amount ? formatCurrency(ticket.summary_amount) : ''} {ticket.summary_currency ? ticket.summary_currency + ' ' : ''}{ticket.summary_pair}
                                                            </span>
                                                            <span className="text-slate-600">&bull;</span>
                                                            <span className="text-slate-400 font-medium text-xs">{ticket.summary_value_date}</span>
                                                            {ticket.allow_alternative_value_date && (
                                                                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30" title="Client allows alternative value date">
                                                                    Alt Date Allowed
                                                                </span>
                                                            )}
                                                            <span className="text-slate-600">&bull;</span>
                                                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                                                                ticket.quotation_base?.toLowerCase() === 'indicative'
                                                                    ? 'bg-purple-500/15 text-purple-300 border border-purple-500/30'
                                                                    : 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                                                            }`}>
                                                                {ticket.quotation_base || 'Execution'}
                                                            </span>
                                                        </div>
                                                    )}
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
                                                ) : ticket.status === 'SCHEDULED' ? (
                                                    <div className="px-3 py-1.5 rounded-xl font-mono text-xs font-bold flex items-center space-x-1.5 bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
                                                        <Clock className="w-3.5 h-3.5 text-indigo-400" />
                                                        <span>
                                                            {ticket.seconds_remaining && ticket.seconds_remaining > 0
                                                                ? `Starts in ${formatSeconds(ticket.seconds_remaining)}`
                                                                : 'SCHEDULED'}
                                                        </span>
                                                    </div>
                                                ) : (
                                                    <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-800 text-slate-400">
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
                                            {wonHistoryRecords.map((item) => {
                                                const isMultiLeg = Boolean(item.all_legs_detail && item.all_legs_detail.length > 1);
                                                const isExpanded = expandedRowIds.has(item.rfq_id);

                                                return (
                                                    <React.Fragment key={item.rfq_id}>
                                                        <tr className="hover:bg-emerald-950/10 transition-colors">
                                                            <td className="py-3 px-4">
                                                                <div className="font-bold text-white font-mono">{item.ref_no}</div>
                                                                <div className="text-[10px] text-slate-500 font-sans mt-0.5">
                                                                    {new Date(item.concluded_at).toLocaleDateString()} {new Date(item.concluded_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                                </div>
                                                                <div className="mt-1">
                                                                    {item.is_won_by_me || (item.dealer_submitted_by && dealer?.email && item.dealer_submitted_by.trim().toLowerCase() === dealer.email.trim().toLowerCase()) ? (
                                                                        <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                                                                            <UserCheck className="w-2.5 h-2.5 mr-1" /> Won by You
                                                                        </span>
                                                                    ) : (
                                                                        <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[9px] font-medium bg-slate-800 text-slate-400 border border-slate-700/60" title={item.dealer_submitted_by ? `Quoted by: ${item.dealer_submitted_by}` : 'Desk colleague'}>
                                                                            <Users className="w-2.5 h-2.5 mr-1" /> Desk Win
                                                                        </span>
                                                                    )}
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
                                                                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-extrabold ${
                                                                        item.summary_direction === 'BUY'
                                                                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                                                            : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                                                                    }`}>
                                                                        {item.summary_direction}
                                                                    </span>
                                                                    <span className="font-bold text-slate-200 font-mono">{item.summary_pair}</span>
                                                                    {isMultiLeg && (
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => toggleRowExpand(item.rfq_id)}
                                                                            className="ml-1.5 px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30 border border-cyan-500/40 inline-flex items-center space-x-1 font-sans"
                                                                        >
                                                                            <span>{item.all_legs_detail.length} Legs</span>
                                                                            {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            </td>
                                                            <td className="py-3 px-4 font-mono">
                                                                {isMultiLeg ? (
                                                                    <div className="space-y-0.5">
                                                                        {item.all_legs_detail.map((leg, idx) => (
                                                                            <div key={idx} className="text-xs whitespace-nowrap">
                                                                                <span className="font-bold text-white">{formatCurrency(leg.amount)}</span>{' '}
                                                                                <span className="text-[10px] text-slate-400 font-sans">{leg.currency}</span>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                ) : (
                                                                    <div className="font-bold text-white text-xs">
                                                                        {formatCurrency(item.summary_amount)}{' '}
                                                                        <span className="text-[10px] text-slate-400 font-normal">{item.summary_currency}</span>
                                                                    </div>
                                                                )}
                                                            </td>
                                                            <td className="py-3 px-4 font-mono font-extrabold text-emerald-400 text-sm">
                                                                {isMultiLeg ? (
                                                                    <div className="space-y-1">
                                                                        {item.all_legs_detail.map((leg, idx) => (
                                                                            <div key={idx} className="text-xs whitespace-nowrap flex items-center space-x-1.5 font-mono">
                                                                                <span className="text-[10px] text-slate-500 font-sans">L{leg.leg_index || idx + 1}:</span>
                                                                                <span className="font-extrabold text-emerald-400">{formatRate(leg.my_rate || leg.winning_rate)}</span>
                                                                                <span className="text-[9px] px-1 py-0.2 rounded font-sans font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">WON</span>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                ) : (
                                                                    formatRate(item.dealer_rate || item.winning_rate)
                                                                )}
                                                            </td>
                                                            <td className="py-3 px-4 text-slate-300 font-sans text-xs">
                                                                {isMultiLeg ? 'Multiple Dates' : (item.summary_value_date || 'Spot')}
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

                                                        {/* Expanded Sub-Table for Multi-Leg RFQ */}
                                                        {isExpanded && isMultiLeg && (
                                                            <tr className="bg-slate-950/90 border-b border-slate-800">
                                                                <td colSpan={8} className="p-3 pl-8">
                                                                    <div className="bg-[#0f172a] rounded-xl border border-slate-800 p-3.5 space-y-2">
                                                                        <div className="flex items-center justify-between text-xs font-bold text-slate-300">
                                                                            <div className="flex items-center space-x-2">
                                                                                <Layers className="w-4 h-4 text-cyan-400" />
                                                                                <span>Package Legs Breakdown ({item.all_legs_detail.length} Legs)</span>
                                                                            </div>
                                                                            <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                                                                {item.outcome_badge?.replace('_', ' ') || 'CLEAN SWEEP'}
                                                                            </span>
                                                                        </div>
                                                                        <div className="overflow-x-auto">
                                                                            <table className="w-full text-xs font-mono text-left">
                                                                                <thead>
                                                                                    <tr className="text-slate-500 border-b border-slate-800/80 text-[10px]">
                                                                                        <th className="pb-1.5 px-2">Leg #</th>
                                                                                        <th className="pb-1.5 px-2">Side &amp; Pair</th>
                                                                                        <th className="pb-1.5 px-2">Notional</th>
                                                                                        <th className="pb-1.5 px-2">Value Date</th>
                                                                                        <th className="pb-1.5 px-2">Your Rate</th>
                                                                                        <th className="pb-1.5 px-2">Winning Execution</th>
                                                                                        <th className="pb-1.5 px-2 text-right">Status</th>
                                                                                    </tr>
                                                                                </thead>
                                                                                <tbody className="divide-y divide-slate-800/40">
                                                                                    {item.all_legs_detail.map((leg, idx) => (
                                                                                        <tr key={leg.leg_id || idx} className={leg.is_won ? 'bg-emerald-950/20' : ''}>
                                                                                            <td className="py-2 px-2 text-slate-400 font-bold">#{leg.leg_index || idx + 1}</td>
                                                                                            <td className="py-2 px-2 font-sans font-bold">
                                                                                                <span className={`px-1.5 py-0.2 rounded text-[10px] mr-1.5 ${leg.direction === 'BUY' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'}`}>
                                                                                                    {leg.direction}
                                                                                                </span>
                                                                                                <span className="text-slate-200">{leg.pair}</span>
                                                                                            </td>
                                                                                            <td className="py-2 px-2 text-white font-bold">
                                                                                                {formatCurrency(leg.amount)} <span className="text-[10px] text-slate-400">{leg.currency}</span>
                                                                                            </td>
                                                                                            <td className="py-2 px-2 text-slate-300 font-sans text-[11px]">{leg.value_date || 'Spot'}</td>
                                                                                            <td className="py-2 px-2">
                                                                                                <span className="text-emerald-400 font-extrabold">
                                                                                                    {formatRate(leg.my_rate || leg.winning_rate)}
                                                                                                </span>
                                                                                            </td>
                                                                                            <td className="py-2 px-2">
                                                                                                <span className="text-white font-bold">{formatRate(leg.winning_rate || leg.my_rate)}</span>
                                                                                            </td>
                                                                                            <td className="py-2 px-2 text-right">
                                                                                                <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                                                                                                    {leg.is_won ? 'WON' : 'AWARDED'}
                                                                                                </span>
                                                                                            </td>
                                                                                        </tr>
                                                                                    ))}
                                                                                </tbody>
                                                                            </table>
                                                                        </div>
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        )}
                                                    </React.Fragment>
                                                );
                                            })}
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
                                                    <div className="text-xs font-mono text-slate-400 mt-0.5 flex flex-wrap items-center gap-2">
                                                        <span>{item.ref_no} &bull; {new Date(item.concluded_at).toLocaleString()}</span>
                                                        {item.is_won_by_me || (item.dealer_submitted_by && dealer?.email && item.dealer_submitted_by.trim().toLowerCase() === dealer.email.trim().toLowerCase()) ? (
                                                            <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                                                                <UserCheck className="w-2.5 h-2.5 mr-1" /> Won by You
                                                            </span>
                                                        ) : (
                                                            <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[9px] font-medium bg-slate-800 text-slate-400 border border-slate-700/60">
                                                                <Users className="w-2.5 h-2.5 mr-1" /> Desk Win
                                                            </span>
                                                        )}
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

                                        {Boolean(item.all_legs_detail && item.all_legs_detail.length > 1) ? (
                                            <div className="mt-4 pt-3 border-t border-slate-800/80">
                                                <div className="flex items-center justify-between mb-2">
                                                    <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1.5">
                                                        <Layers className="w-3.5 h-3.5 text-cyan-400" />
                                                        <span>Package Legs ({item.all_legs_detail.length} Allocations)</span>
                                                    </span>
                                                    <span className="text-[10px] font-mono text-cyan-400 font-bold bg-cyan-950/40 border border-cyan-800/60 px-2 py-0.5 rounded">
                                                        Awarded Flow
                                                    </span>
                                                </div>
                                                <div className="space-y-1.5">
                                                    {item.all_legs_detail.map((leg, idx) => (
                                                        <div key={leg.leg_id || idx} className="bg-slate-900/90 border border-slate-800/80 rounded-xl px-3 py-2 flex flex-wrap items-center justify-between gap-2 text-xs">
                                                            <div className="flex items-center space-x-2">
                                                                <span className="text-[10px] font-mono font-bold text-slate-500">#{leg.leg_index || idx + 1}</span>
                                                                <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${leg.direction === 'BUY' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'}`}>
                                                                    {leg.direction}
                                                                </span>
                                                                <span className="font-mono font-black text-white">
                                                                    {formatCurrency(leg.amount)} {leg.currency}
                                                                </span>
                                                                <span className="text-slate-400 font-sans text-[11px]">({leg.pair})</span>
                                                                <span className="text-slate-500 text-[10px] font-sans">&bull; {leg.value_date || 'Spot'}</span>
                                                            </div>
                                                            <div className="flex items-center space-x-2.5 font-mono text-xs">
                                                                <span className="text-emerald-400 font-extrabold text-sm">
                                                                    {formatRate(leg.my_rate || leg.winning_rate)}
                                                                </span>
                                                                <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                                                                    AWARDED
                                                                </span>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        ) : (
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
                                        )}

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
                                                <th className="py-3 px-4">Instrument &amp; Pair</th>
                                                <th className="py-3 px-4">Notional Volume</th>
                                                <th className="py-3 px-4">Execution / Rates</th>
                                                <th className="py-3 px-4">Outcome</th>
                                                <th className="py-3 px-4 text-right">Ticket</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-800/60 font-mono">
                                            {filteredHistoryRecords.map((item) => {
                                                const isMultiLeg = Boolean(item.all_legs_detail && item.all_legs_detail.length > 1);
                                                const isExpanded = expandedRowIds.has(item.rfq_id);

                                                return (
                                                    <React.Fragment key={item.rfq_id}>
                                                        <tr
                                                            className={`hover:bg-slate-900/50 transition-colors ${
                                                                item.is_won ? 'bg-emerald-950/10' : ''
                                                            }`}
                                                        >
                                                            <td className="py-3 px-4">
                                                                <div className="font-bold text-white font-mono">{item.ref_no}</div>
                                                                <div className="text-[10px] text-slate-500 font-sans mt-0.5">
                                                                    {new Date(item.concluded_at).toLocaleDateString()} {new Date(item.concluded_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                                </div>
                                                                <div className="mt-1">
                                                                    {item.quoted_by_me || item.is_won_by_me || (item.dealer_submitted_by && dealer?.email && item.dealer_submitted_by.trim().toLowerCase() === dealer.email.trim().toLowerCase()) ? (
                                                                        <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                                                                            <UserCheck className="w-2.5 h-2.5 mr-1" /> Quoted by You
                                                                        </span>
                                                                    ) : item.dealer_submitted_by ? (
                                                                        <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[9px] font-medium bg-slate-800 text-slate-400 border border-slate-700/60" title={`Quoted by: ${item.dealer_submitted_by}`}>
                                                                            <Users className="w-2.5 h-2.5 mr-1" /> Desk Trader
                                                                        </span>
                                                                    ) : (
                                                                        <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[9px] text-slate-500 font-sans">
                                                                            Unquoted
                                                                        </span>
                                                                    )}
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
                                                                    {isMultiLeg && (
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => toggleRowExpand(item.rfq_id)}
                                                                            className="ml-1.5 px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30 border border-cyan-500/40 inline-flex items-center space-x-1 font-sans"
                                                                        >
                                                                            <span>{item.all_legs_detail.length} Legs</span>
                                                                            {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            </td>
                                                            <td className="py-3 px-4 font-mono">
                                                                {isMultiLeg ? (
                                                                    <div className="space-y-0.5">
                                                                        {item.all_legs_detail.map((leg, idx) => (
                                                                            <div key={idx} className="text-xs whitespace-nowrap">
                                                                                <span className="font-bold text-white">{formatCurrency(leg.amount)}</span>{' '}
                                                                                <span className="text-[10px] text-slate-400 font-sans">{leg.currency}</span>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                ) : (
                                                                    <div className="font-bold text-white text-xs">
                                                                        {formatCurrency(item.summary_amount)}{' '}
                                                                        <span className="text-[10px] text-slate-400 font-normal">{item.summary_currency}</span>
                                                                    </div>
                                                                )}
                                                            </td>
                                                            <td className="py-3 px-4 font-mono">
                                                                {item.is_won && !isMultiLeg ? (
                                                                    <span className="font-extrabold text-emerald-400 text-sm">
                                                                        {formatRate(item.dealer_rate || item.winning_rate)}
                                                                    </span>
                                                                ) : isMultiLeg ? (
                                                                    <div className="space-y-1">
                                                                        {item.all_legs_detail.map((leg, idx) => (
                                                                            <div key={idx} className="text-xs whitespace-nowrap flex items-center space-x-1.5 font-mono">
                                                                                <span className="text-[10px] text-slate-500 font-sans">L{leg.leg_index || idx + 1}:</span>
                                                                                {leg.is_won ? (
                                                                                    <>
                                                                                        <span className="font-extrabold text-emerald-400">{formatRate(leg.my_rate || leg.winning_rate)}</span>
                                                                                        <span className="text-[9px] px-1 py-0.2 rounded font-sans font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">WON</span>
                                                                                    </>
                                                                                ) : leg.winning_rate ? (
                                                                                    <>
                                                                                        <span className="font-bold text-slate-200">{formatRate(leg.winning_rate)}</span>
                                                                                        {leg.my_rate && (
                                                                                            <span className="text-[10px] text-slate-500 font-sans"> (Desk: {formatRate(leg.my_rate)})</span>
                                                                                        )}
                                                                                        <span className="text-[9px] px-1 py-0.2 rounded font-sans font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30">LOST</span>
                                                                                    </>
                                                                                ) : (
                                                                                    <span className="text-[10px] text-slate-500 italic font-sans">Unawarded</span>
                                                                                )}
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                ) : item.has_quoted ? (
                                                                    <div className="text-xs">
                                                                        <div className="text-white font-bold">
                                                                            {formatRate(item.winning_rate)}{' '}
                                                                            {item.winning_bank_name && (
                                                                                <span className="text-slate-400 font-sans text-[10px]">
                                                                                    ({item.winning_bank_name})
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                        <div className="text-slate-400 text-[10px]">Desk: {formatRate(item.dealer_rate)}</div>
                                                                    </div>
                                                                ) : (
                                                                    <div className="text-xs text-slate-400">
                                                                        {item.winning_rate ? formatRate(item.winning_rate) : '—'}
                                                                        {item.winning_bank_name && (
                                                                            <span className="text-slate-500 font-sans text-[10px] ml-1">
                                                                                ({item.winning_bank_name})
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                )}
                                                            </td>
                                                            <td className="py-3 px-4 font-sans">
                                                                {item.is_won ? (
                                                                    <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 uppercase">
                                                                        {item.outcome_badge?.replace('_', ' ') || 'WON'}
                                                                    </span>
                                                                ) : item.has_quoted ? (
                                                                    <div className="inline-flex items-center space-x-1.5">
                                                                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
                                                                            LOST
                                                                        </span>
                                                                        {item.dealer_rank && (
                                                                            <span className="font-mono text-[10px] text-slate-400">
                                                                                Rank #{item.dealer_rank}
                                                                                {item.spread_delta ? ` (+${formatRate(item.spread_delta)})` : ''}
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                ) : item.outcome === 'CANCELLED' ? (
                                                                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                                                        CANCELLED
                                                                    </span>
                                                                ) : (
                                                                    <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-900 text-slate-500 border border-slate-800">
                                                                        UNQUOTED
                                                                    </span>
                                                                )}
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

                                                        {/* Expanded Sub-Table for Multi-Leg RFQ */}
                                                        {isExpanded && isMultiLeg && (
                                                            <tr className="bg-slate-950/90 border-b border-slate-800">
                                                                <td colSpan={7} className="p-3 pl-8">
                                                                    <div className="bg-[#0f172a] rounded-xl border border-slate-800 p-3.5 space-y-2">
                                                                        <div className="flex items-center justify-between text-xs font-bold text-slate-300">
                                                                            <div className="flex items-center space-x-2">
                                                                                <Layers className="w-4 h-4 text-cyan-400" />
                                                                                <span>Package Legs Breakdown ({item.all_legs_detail.length} Legs)</span>
                                                                            </div>
                                                                            {item.outcome_badge && (
                                                                                <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
                                                                                    {item.outcome_badge.replace('_', ' ')}
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                        <div className="overflow-x-auto">
                                                                            <table className="w-full text-xs font-mono text-left">
                                                                                <thead>
                                                                                    <tr className="text-slate-500 border-b border-slate-800/80 text-[10px]">
                                                                                        <th className="pb-1.5 px-2">Leg #</th>
                                                                                        <th className="pb-1.5 px-2">Side &amp; Pair</th>
                                                                                        <th className="pb-1.5 px-2">Notional</th>
                                                                                        <th className="pb-1.5 px-2">Value Date</th>
                                                                                        <th className="pb-1.5 px-2">Your Quote</th>
                                                                                        <th className="pb-1.5 px-2">Winning Execution</th>
                                                                                        <th className="pb-1.5 px-2 text-right">Result</th>
                                                                                    </tr>
                                                                                </thead>
                                                                                <tbody className="divide-y divide-slate-800/40">
                                                                                    {item.all_legs_detail.map((leg, idx) => (
                                                                                        <tr key={leg.leg_id || idx} className={leg.is_won ? 'bg-emerald-950/20' : ''}>
                                                                                            <td className="py-2 px-2 text-slate-400 font-bold">#{leg.leg_index || idx + 1}</td>
                                                                                            <td className="py-2 px-2 font-sans font-bold">
                                                                                                <span className={`px-1.5 py-0.2 rounded text-[10px] mr-1.5 ${leg.direction === 'BUY' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'}`}>
                                                                                                    {leg.direction}
                                                                                                </span>
                                                                                                <span className="text-slate-200">{leg.pair}</span>
                                                                                            </td>
                                                                                            <td className="py-2 px-2 text-white font-bold">
                                                                                                {formatCurrency(leg.amount)} <span className="text-[10px] text-slate-400">{leg.currency}</span>
                                                                                            </td>
                                                                                            <td className="py-2 px-2 text-slate-300 font-sans text-[11px]">{leg.value_date || 'Spot'}</td>
                                                                                            <td className="py-2 px-2">
                                                                                                {leg.my_rate ? (
                                                                                                    <span className={leg.is_won ? 'text-emerald-400 font-extrabold' : 'text-slate-300'}>
                                                                                                        {formatRate(leg.my_rate)}
                                                                                                    </span>
                                                                                                ) : (
                                                                                                    <span className="text-slate-600 font-sans text-[10px]">Unquoted</span>
                                                                                                )}
                                                                                            </td>
                                                                                            <td className="py-2 px-2">
                                                                                                {leg.winning_rate ? (
                                                                                                    <div>
                                                                                                        <span className="text-white font-bold">{formatRate(leg.winning_rate)}</span>
                                                                                                        {leg.winning_bank_name && !leg.is_won && (
                                                                                                            <span className="text-slate-400 text-[10px] font-sans ml-1.5">
                                                                                                                ({leg.winning_bank_name})
                                                                                                            </span>
                                                                                                        )}
                                                                                                    </div>
                                                                                                ) : (
                                                                                                    <span className="text-slate-600">—</span>
                                                                                                )}
                                                                                            </td>
                                                                                            <td className="py-2 px-2 text-right">
                                                                                                <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                                                                                                    leg.is_won
                                                                                                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                                                                                        : leg.winning_rate
                                                                                                        ? 'bg-slate-800 text-slate-400'
                                                                                                        : 'bg-slate-900 text-slate-600'
                                                                                                }`}>
                                                                                                    {leg.is_won ? 'WON' : leg.winning_rate ? 'LOST' : 'UNAWARDED'}
                                                                                                </span>
                                                                                            </td>
                                                                                        </tr>
                                                                                    ))}
                                                                                </tbody>
                                                                            </table>
                                                                        </div>
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        )}
                                                    </React.Fragment>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        ) : (
                            /* Card Grid - All */
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {filteredHistoryRecords.map((item) => {
                                    const isMultiLeg = Boolean(item.all_legs_detail && item.all_legs_detail.length > 1);

                                    return (
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
                                                                {item.is_won ? (item.outcome_badge?.replace('_', ' ') || 'WON') : item.outcome?.replace('_', ' ')}
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

                                            {isMultiLeg ? (
                                                <div className="mt-4 pt-3 border-t border-slate-800/80">
                                                    <div className="flex items-center justify-between mb-2">
                                                        <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1.5">
                                                            <Layers className="w-3.5 h-3.5 text-cyan-400" />
                                                            <span>Package Legs ({item.all_legs_detail.length} Allocations)</span>
                                                        </span>
                                                        <span className="text-[10px] font-mono text-cyan-400 font-bold bg-cyan-950/40 border border-cyan-800/60 px-2 py-0.5 rounded">
                                                            Multi-Currency
                                                        </span>
                                                    </div>
                                                    <div className="space-y-1.5">
                                                        {item.all_legs_detail.map((leg, idx) => (
                                                            <div key={leg.leg_id || idx} className="bg-slate-900/90 border border-slate-800/80 rounded-xl px-3 py-2 flex flex-wrap items-center justify-between gap-2 text-xs">
                                                                <div className="flex items-center space-x-2">
                                                                    <span className="text-[10px] font-mono font-bold text-slate-500">#{leg.leg_index || idx + 1}</span>
                                                                    <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${leg.direction === 'BUY' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'}`}>
                                                                        {leg.direction}
                                                                    </span>
                                                                    <span className="font-mono font-black text-white">
                                                                        {formatCurrency(leg.amount)} {leg.currency}
                                                                    </span>
                                                                    <span className="text-slate-400 font-sans text-[11px]">({leg.pair})</span>
                                                                    <span className="text-slate-500 text-[10px] font-sans">&bull; {leg.value_date || 'Spot'}</span>
                                                                </div>
                                                                <div className="flex items-center space-x-2.5 font-mono text-xs">
                                                                    {leg.my_rate ? (
                                                                        <span className="text-slate-300 text-[11px]">
                                                                            Your: <strong className={leg.is_won ? 'text-emerald-400' : 'text-white'}>{formatRate(leg.my_rate)}</strong>
                                                                        </span>
                                                                    ) : (
                                                                        <span className="text-slate-500 italic text-[11px] font-sans">Unquoted</span>
                                                                    )}
                                                                    {leg.winning_rate ? (
                                                                        <span className="text-emerald-400 font-bold">
                                                                            Win: {formatRate(leg.winning_rate)}
                                                                        </span>
                                                                    ) : null}
                                                                    <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                                                                        leg.is_won
                                                                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                                                            : leg.winning_rate
                                                                            ? 'bg-slate-800 text-slate-400'
                                                                            : 'bg-slate-900 text-slate-600'
                                                                    }`}>
                                                                        {leg.is_won ? 'WON' : leg.winning_rate ? 'LOST' : 'UNAWARDED'}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            ) : (
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
                                                        <div className="text-[10px] uppercase font-bold text-slate-500">
                                                            {item.is_won ? 'Executed Rate' : 'Winning Execution'}
                                                        </div>
                                                        <div className="font-mono font-bold mt-0.5">
                                                            {item.is_won ? (
                                                                <span className="text-emerald-400 font-extrabold">
                                                                    {formatRate(item.dealer_rate || item.winning_rate)}
                                                                </span>
                                                            ) : item.winning_rate ? (
                                                                <span className="text-white font-bold">
                                                                    {formatRate(item.winning_rate)}
                                                                </span>
                                                            ) : (
                                                                <span className="text-slate-500">—</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <div className="text-[10px] uppercase font-bold text-slate-500">
                                                            {item.is_won ? 'Settlement' : 'Your Quote'}
                                                        </div>
                                                        <div className="font-mono text-white mt-0.5">
                                                            {item.is_won ? (
                                                                <span className="text-slate-300 font-sans">{item.summary_value_date || 'Spot'}</span>
                                                            ) : item.dealer_rate ? (
                                                                <span className="text-slate-300 font-bold">{formatRate(item.dealer_rate)}</span>
                                                            ) : (
                                                                <span className="text-slate-500 italic text-[11px] font-sans">Unquoted</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            {item.dealer_rank && !item.is_won && (
                                                <div className="mt-3 pt-3 border-t border-slate-800/60 flex items-center justify-between text-xs">
                                                    <div className="flex items-center space-x-2">
                                                        <span className="text-slate-400 text-[11px]">Rank &amp; Spread:</span>
                                                        <span className="px-2 py-0.5 rounded font-mono font-bold text-[11px] bg-slate-800 text-slate-300">
                                                            #{item.dealer_rank}
                                                        </span>
                                                        {item.spread_delta !== null && item.spread_delta !== undefined && (
                                                            <span className="text-slate-500 font-mono text-[11px]">
                                                                (+{formatRate(item.spread_delta)} vs winner)
                                                            </span>
                                                        )}
                                                    </div>
                                                    {item.winning_bank_name && (
                                                        <span className="text-[11px] text-slate-400">
                                                            Won by: {item.winning_bank_name}
                                                        </span>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
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
                                <div className="flex justify-between items-start">
                                    <span className="text-emerald-400 text-xs font-semibold uppercase tracking-wider">Executed &amp; Won</span>
                                    <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                                        Desk Total
                                    </span>
                                </div>
                                <div className="text-2xl font-black text-emerald-400 font-mono mt-2 flex items-baseline space-x-2">
                                    <span>{blotterStats.won_deals_count}</span>
                                    <span className="text-xs text-slate-400 font-sans font-normal">
                                        ({achievements?.personal_bests?.total_deals_won ?? blotterStats.my_won_deals_count ?? myWonCount} by You)
                                    </span>
                                </div>
                                <div className="text-xs text-slate-400 mt-1">
                                    Desk Win Rate:{' '}
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

                {/* TAB 5: TRADER ACCOLADES & TROPHIES */}
                {!loading && activeTab === 'trophies' && (
                    <div className="space-y-6">
                        {/* Trader Showcase Hero Banner */}
                        <div className="bg-gradient-to-br from-[#0c1527] via-[#0b0f17] to-[#141d2e] border border-amber-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

                            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 relative z-10">
                                <div className="flex items-center space-x-4 sm:space-x-5">
                                    <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-amber-500 via-amber-600 to-yellow-600 p-0.5 shadow-xl shadow-amber-950 flex items-center justify-center shrink-0">
                                        <div className="w-full h-full bg-[#0b0f17] rounded-2xl flex items-center justify-center">
                                            <Trophy className="w-9 h-9 sm:w-11 sm:h-11 text-amber-400" />
                                        </div>
                                    </div>

                                    <div>
                                        <div className="flex flex-wrap items-center gap-2">
                                            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                                                {dealer?.full_name || 'Active Bank Trader'}
                                            </h2>
                                            <span className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider border ${
                                                achievements?.dealer_tier?.includes('Diamond') ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50 shadow-lg shadow-cyan-950' :
                                                achievements?.dealer_tier?.includes('Platinum') ? 'bg-purple-500/20 text-purple-300 border-purple-500/50 shadow-lg shadow-purple-950' :
                                                achievements?.dealer_tier?.includes('Gold') ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-lg shadow-amber-950' :
                                                achievements?.dealer_tier?.includes('Silver') ? 'bg-slate-400/20 text-slate-200 border-slate-400/50 shadow-lg shadow-slate-950' :
                                                'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 shadow-lg shadow-emerald-950'
                                            }`}>
                                                {achievements?.dealer_tier || 'Bronze Trader'}
                                            </span>
                                        </div>

                                        <p className="text-xs sm:text-sm text-slate-300 mt-1 font-medium max-w-xl">
                                            {achievements?.dealer_perk || 'Sovereign institutional liquidity provider with verified cryptographic execution track record.'}
                                        </p>

                                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400 mt-2 font-mono">
                                            <span>Bank: <strong className="text-white font-sans">{dealer?.bank_name || 'Partner Bank'}</strong></span>
                                            <span>&bull;</span>
                                            <span>Unlocked: <strong className="text-amber-400">{achievements?.earned_trophy_count || 0}</strong> / {achievements?.total_trophies || 8} Badges</span>
                                            <span>&bull;</span>
                                            <span className="text-emerald-400 font-bold">{achievements?.personal_bests?.total_deals_won ?? blotterStats.my_won_deals_count ?? myWonCount} Personal Wins</span>
                                            <span className="text-slate-500 font-sans">({blotterStats.won_deals_count || 27} Bank Desk Total)</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Quick Highlights Pill Grid - Personal Trader Milestones */}
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 w-full lg:w-auto">
                                    <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 text-center">
                                        <div className="text-[10px] uppercase font-bold text-slate-400">Win Streak</div>
                                        <div className="text-lg font-black text-rose-400 font-mono mt-0.5 flex items-center justify-center">
                                            <Flame className="w-4 h-4 mr-1 text-rose-400" />
                                            {achievements?.personal_bests?.current_streak || 0}
                                        </div>
                                        <div className="text-[9px] text-slate-500 font-mono">Best: {achievements?.personal_bests?.longest_winning_streak || 0}</div>
                                    </div>

                                    <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 text-center">
                                        <div className="text-[10px] uppercase font-bold text-emerald-400">Personal Won</div>
                                        <div className="text-lg font-black text-emerald-400 font-mono mt-0.5">
                                            {achievements?.personal_bests?.total_deals_won ?? blotterStats.my_won_deals_count ?? myWonCount}
                                        </div>
                                        <div className="text-[9px] text-slate-400">of {blotterStats.won_deals_count || 27} Desk Wins</div>
                                    </div>

                                    <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 text-center">
                                        <div className="text-[10px] uppercase font-bold text-cyan-400">Personal Volume</div>
                                        <div className="text-lg font-black text-cyan-400 font-mono mt-0.5">
                                            ${((achievements?.personal_bests?.total_volume_won_usd || 0) / 1000000).toFixed(1)}M
                                        </div>
                                        <div className="text-[9px] text-slate-400 font-mono">USD Eqv (Desk: $9M+)</div>
                                    </div>

                                    <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 text-center">
                                        <div className="text-[10px] uppercase font-bold text-teal-400">Personal Bids</div>
                                        <div className="text-lg font-black text-teal-400 font-mono mt-0.5">
                                            {achievements?.personal_bests?.total_quotes_submitted || 0}
                                        </div>
                                        <div className="text-[9px] text-slate-400">Live Submitted</div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Scope & Distinction Notice */}
                        <div className="bg-[#0b101b] border border-amber-500/30 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3 text-xs shadow-lg">
                            <div className="flex items-center space-x-2.5 text-slate-300">
                                <Info className="w-4 h-4 text-amber-400 shrink-0" />
                                <span>
                                    <strong>Personal Scorecard Scope:</strong> Badges and accolades track individual milestones for <strong>{dealer?.full_name || 'Active Trader'}</strong> (<strong className="text-emerald-400">{achievements?.personal_bests?.total_deals_won ?? blotterStats.my_won_deals_count ?? myWonCount} winning deals</strong> personally executed, ${((achievements?.personal_bests?.total_volume_won_usd || 0) / 1000000).toFixed(1)}M USD Equiv). The institutional desk total across all {dealer?.bank_name || 'CIB'} dealers is <strong className="text-cyan-400">{blotterStats.won_deals_count || 27} won deals</strong>.
                                </span>
                            </div>
                            <button
                                type="button"
                                onClick={() => { setActiveTab('won'); setScopeFilter('MY_TRADES'); }}
                                className="px-3 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold transition-colors inline-flex items-center space-x-1.5 shrink-0"
                            >
                                <Trophy className="w-3.5 h-3.5 text-amber-400" />
                                <span>Filter Blotter to My {achievements?.personal_bests?.total_deals_won ?? blotterStats.my_won_deals_count ?? myWonCount} Wins</span>
                            </button>
                        </div>

                        {/* 8 Multi-Metal Institutional Trophies Grid */}
                        <div className="space-y-3">
                            <div className="flex items-center justify-between px-1">
                                <div>
                                    <h3 className="text-sm font-bold text-white flex items-center">
                                        <Award className="w-4 h-4 mr-2 text-amber-400" />
                                        Institutional Multi-Metal Accolades (8 Calibrated Badges)
                                    </h3>
                                    <p className="text-xs text-slate-400 mt-0.5">
                                        Progress dynamically updates with every firm quote submitted and tender awarded on Grow Treasury.
                                    </p>
                                </div>

                                <div className="hidden sm:flex items-center space-x-1.5 text-xs text-slate-400">
                                    <span className="w-2.5 h-2.5 rounded-full bg-orange-600 inline-block" /> <span className="text-[11px] mr-2">Bronze</span>
                                    <span className="w-2.5 h-2.5 rounded-full bg-slate-300 inline-block" /> <span className="text-[11px] mr-2">Silver</span>
                                    <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block" /> <span className="text-[11px] mr-2">Gold</span>
                                    <span className="w-2.5 h-2.5 rounded-full bg-purple-400 inline-block" /> <span className="text-[11px]">Platinum</span>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                {(achievements?.trophies || []).map((trophy) => {
                                    const isEarned = trophy.current_tier && trophy.current_tier !== 'NONE';
                                    return (
                                        <div
                                            key={trophy.trophy_id}
                                            className={`bg-[#0b0f17] rounded-2xl p-5 border transition-all flex flex-col justify-between ${
                                                isEarned
                                                    ? 'border-amber-500/40 shadow-lg shadow-amber-950/20 bg-gradient-to-b from-[#0e1626] to-[#0b0f17]'
                                                    : 'border-slate-800 opacity-90 hover:border-slate-700'
                                            }`}
                                        >
                                            <div>
                                                {/* Header Icon + Tier Badge */}
                                                <div className="flex items-start justify-between gap-2 mb-3">
                                                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center border ${
                                                        isEarned
                                                            ? 'bg-amber-500/10 border-amber-500/30 text-amber-400 shadow-md shadow-amber-950'
                                                            : 'bg-slate-900 border-slate-800 text-slate-500'
                                                    }`}>
                                                        {getTrophyIcon(trophy.icon)}
                                                    </div>

                                                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${getTierBadgeStyle(trophy.current_tier)}`}>
                                                        {trophy.current_tier === 'NONE' ? 'In Progress' : trophy.current_tier}
                                                    </span>
                                                </div>

                                                <h4 className="text-sm font-bold text-white leading-snug">
                                                    {trophy.title}
                                                </h4>
                                                {trophy.current_tier_title && trophy.current_tier !== 'NONE' && (
                                                    <div className="text-[11px] font-semibold text-amber-400 mt-0.5 font-mono">
                                                        ✦ {trophy.current_tier_title}
                                                    </div>
                                                )}
                                                <p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                                                    {trophy.description}
                                                </p>
                                            </div>

                                            {/* Progress Section */}
                                            <div className="mt-4 pt-3 border-t border-slate-800/80 space-y-2">
                                                <div className="flex items-baseline justify-between text-xs">
                                                    <span className="text-slate-400 text-[11px]">
                                                        {trophy.unit === 'streak' ? 'Active Streak:' : 'Current Score:'}
                                                    </span>
                                                    <span className="font-mono font-bold text-white">
                                                        {trophy.is_currency
                                                            ? `$${(trophy.current_value / 1000000).toFixed(2)}M`
                                                            : trophy.unit === 'streak'
                                                                ? `${trophy.current_value} in a row${trophy.best_record && trophy.best_record > trophy.current_value ? ` (Best: ${trophy.best_record})` : ''}`
                                                                : `${trophy.current_value} ${trophy.unit}`}
                                                    </span>
                                                </div>

                                                {/* Progress Bar */}
                                                <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden border border-slate-800">
                                                    <div
                                                        className={`h-full rounded-full transition-all duration-700 ${getTierProgressBar(trophy.current_tier)}`}
                                                        style={{ width: `${Math.min(100, Math.max(trophy.progress_pct || trophy.progress_percent || 0, isEarned ? 15 : 0))}%` }}
                                                    />
                                                </div>

                                                <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                                                    <span>
                                                        {(trophy.next_milestone || (trophy.next_tier && trophy.next_tier !== 'MAX' ? trophy.target_value : null))
                                                            ? `Next: ${trophy.is_currency ? `$${((trophy.next_milestone || trophy.target_value) / 1000000).toFixed(1)}M` : (trophy.next_milestone || trophy.target_value)} ${trophy.unit} (${trophy.next_tier || 'Next'})`
                                                            : 'Max Tier Unlocked'}
                                                    </span>
                                                    <span className="font-bold text-amber-400">
                                                        {Math.round(trophy.progress_pct || trophy.progress_percent || 0)}%
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Collective Bank Desk Standing Section */}
                        {achievements?.bank_desk && (
                            <div className="bg-[#0b0f17] border border-slate-800 rounded-2xl p-6 shadow-xl space-y-3">
                                <div className="flex flex-wrap items-center justify-between gap-3">
                                    <div className="flex items-center space-x-3">
                                        <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 font-bold">
                                            <Building2 className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <h4 className="text-sm font-bold text-white">
                                                Collective Bank Desk Standing: {achievements.bank_desk.bank_name || dealer?.bank_name}
                                            </h4>
                                            <p className="text-xs text-slate-400 mt-0.5">
                                                All traders belonging to your institution aggregate into this institutional market profile.
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-center space-x-2">
                                        <span className="px-3 py-1 rounded-full text-xs font-bold bg-cyan-500/10 border border-cyan-500/30 text-cyan-300">
                                            Desk Tier: {achievements.bank_desk.desk_tier || 'Active Desk'}
                                        </span>
                                        <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-slate-800 text-amber-400 border border-amber-500/20">
                                            🏆 {achievements.bank_desk.earned_trophy_count || 0}/8 Unlocked
                                        </span>
                                    </div>
                                </div>
                            </div>
                        )}
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
                                        <div className="text-[10px] uppercase font-bold text-slate-500">Notional Allocation</div>
                                        <div className="font-mono font-bold text-white text-sm mt-0.5">
                                            {selectedDealSlip.all_legs_detail && selectedDealSlip.all_legs_detail.length > 1
                                                ? `${selectedDealSlip.all_legs_detail.length} Legs Package (Multi-Currency)`
                                                : `${formatCurrency(selectedDealSlip.summary_amount)} ${selectedDealSlip.summary_currency}`
                                            }
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

                                {/* Pricing Breakdown or Multi-Leg Package Table */}
                                {selectedDealSlip.all_legs_detail && selectedDealSlip.all_legs_detail.length > 1 ? (
                                    <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 space-y-3">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center space-x-2 text-white font-bold text-xs uppercase tracking-wider">
                                                <Layers className="w-4 h-4 text-cyan-400" />
                                                <span>Package Legs Breakdown ({selectedDealSlip.all_legs_detail.length} Legs)</span>
                                            </div>
                                            <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                                                {selectedDealSlip.outcome_badge?.replace('_', ' ') || 'MULTI-LEG PACKAGE'}
                                            </span>
                                        </div>
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-xs font-mono text-left">
                                                <thead>
                                                    <tr className="text-slate-500 border-b border-slate-800 text-[10px]">
                                                        <th className="pb-1.5 px-2">Leg #</th>
                                                        <th className="pb-1.5 px-2">Side &amp; Pair</th>
                                                        <th className="pb-1.5 px-2">Notional</th>
                                                        <th className="pb-1.5 px-2">Value Date</th>
                                                        <th className="pb-1.5 px-2">Your Quote</th>
                                                        <th className="pb-1.5 px-2">Winning Execution</th>
                                                        <th className="pb-1.5 px-2 text-right">Award Status</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-800/40">
                                                    {selectedDealSlip.all_legs_detail.map((leg, idx) => (
                                                        <tr key={leg.leg_id || idx} className={leg.is_won ? 'bg-emerald-950/20' : ''}>
                                                            <td className="py-2 px-2 text-slate-400 font-bold">#{leg.leg_index || idx + 1}</td>
                                                            <td className="py-2 px-2 font-sans font-bold">
                                                                <span className={`px-1.5 py-0.2 rounded text-[10px] mr-1.5 ${leg.direction === 'BUY' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'}`}>
                                                                    {leg.direction}
                                                                </span>
                                                                <span className="text-slate-200">{leg.pair}</span>
                                                            </td>
                                                            <td className="py-2 px-2 text-white font-bold">
                                                                {formatCurrency(leg.amount)} <span className="text-[10px] text-slate-400">{leg.currency}</span>
                                                            </td>
                                                            <td className="py-2 px-2 text-slate-300 font-sans text-[11px]">{leg.value_date || 'Spot'}</td>
                                                            <td className="py-2 px-2">
                                                                {leg.my_rate ? (
                                                                    <span className={leg.is_won ? 'text-emerald-400 font-extrabold' : 'text-slate-300'}>
                                                                        {formatRate(leg.my_rate)}
                                                                    </span>
                                                                ) : (
                                                                    <span className="text-slate-600 font-sans text-[10px]">Unquoted</span>
                                                                )}
                                                            </td>
                                                            <td className="py-2 px-2">
                                                                {leg.winning_rate ? (
                                                                    <div>
                                                                        <span className="text-white font-bold">{formatRate(leg.winning_rate)}</span>
                                                                        {leg.winning_bank_name && !leg.is_won && (
                                                                            <span className="text-slate-400 text-[10px] font-sans ml-1.5">
                                                                                ({leg.winning_bank_name})
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                ) : (
                                                                    <span className="text-slate-600">—</span>
                                                                )}
                                                            </td>
                                                            <td className="py-2 px-2 text-right">
                                                                <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                                                                    leg.is_won
                                                                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                                                        : leg.winning_rate
                                                                        ? 'bg-slate-800 text-slate-400'
                                                                        : 'bg-slate-900 text-slate-600'
                                                                }`}>
                                                                    {leg.is_won ? 'WON' : leg.winning_rate ? 'LOST' : 'UNAWARDED'}
                                                                </span>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                ) : selectedDealSlip.is_won ? (
                                    <div className="bg-slate-900 border border-emerald-500/40 p-4 rounded-xl flex items-center justify-between">
                                        <div>
                                            <div className="text-[10px] uppercase font-bold text-slate-500">Executed &amp; Awarded Rate</div>
                                            <div className="text-2xl font-black font-mono text-emerald-400 mt-1">
                                                {formatRate(selectedDealSlip.dealer_rate || selectedDealSlip.winning_rate)}
                                            </div>
                                            <div className="text-xs text-slate-400 mt-0.5">
                                                Confirmed Execution Rate for {selectedDealSlip.customer_name}
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <span className="px-2.5 py-1 rounded-lg text-xs font-black bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 uppercase">
                                                AWARDED #1
                                            </span>
                                            {selectedDealSlip.dealer_submitted_at && (
                                                <div className="text-[10px] text-slate-500 mt-1.5 font-mono">
                                                    Quoted: {new Date(selectedDealSlip.dealer_submitted_at).toLocaleTimeString()}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-xl">
                                            <div className="text-[10px] uppercase font-bold text-slate-500">Winning Execution Rate</div>
                                            <div className="text-lg font-extrabold font-mono text-white mt-1">
                                                {selectedDealSlip.winning_rate ? formatRate(selectedDealSlip.winning_rate) : '—'}
                                            </div>
                                            <div className="text-xs text-slate-400 mt-0.5 truncate">
                                                Winner: <strong className="text-slate-200">{selectedDealSlip.winning_bank_name || 'Counterparty Bank'}</strong>
                                            </div>
                                        </div>
                                        <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-xl">
                                            <div className="text-[10px] uppercase font-bold text-slate-500">Your Quote &amp; Relative Spread</div>
                                            <div className="text-lg font-extrabold font-mono text-slate-200 mt-1 flex items-baseline space-x-2">
                                                <span>{selectedDealSlip.dealer_rate ? formatRate(selectedDealSlip.dealer_rate) : 'No Quote'}</span>
                                                {selectedDealSlip.dealer_rank && (
                                                    <span className="text-xs font-mono text-amber-400 font-bold">
                                                        (Rank #{selectedDealSlip.dealer_rank})
                                                    </span>
                                                )}
                                            </div>
                                            <div className="text-xs text-slate-400 mt-0.5 font-mono">
                                                {selectedDealSlip.spread_delta !== null && selectedDealSlip.spread_delta !== undefined
                                                    ? `Spread: +${formatRate(selectedDealSlip.spread_delta)} vs winner`
                                                    : 'Unranked / Expired'}
                                            </div>
                                        </div>
                                    </div>
                                )}

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

                {/* Inactivity Security Warning Modal */}
                {showIdleWarning && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
                        <div className="bg-slate-900 border-2 border-amber-500/80 rounded-2xl p-6 sm:p-8 max-w-md w-full shadow-2xl shadow-amber-500/10 text-center relative overflow-hidden">
                            <div className="absolute -top-16 -left-16 w-32 h-32 bg-amber-500/15 rounded-full blur-2xl pointer-events-none" />
                            <div className="absolute -bottom-16 -right-16 w-32 h-32 bg-rose-500/15 rounded-full blur-2xl pointer-events-none" />

                            <div className="w-16 h-16 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto mb-4">
                                <Lock className="w-8 h-8 text-amber-400 animate-pulse" />
                            </div>

                            <div className="inline-block bg-amber-500/10 text-amber-400 text-[10px] font-mono font-bold uppercase tracking-wider px-3 py-1 rounded-full mb-3 border border-amber-500/20">
                                Institutional Security Inactivity Lock
                            </div>

                            <h3 className="text-xl font-black text-white mb-2">
                                Trading Desk Inactive
                            </h3>

                            <p className="text-xs text-slate-300 mb-6 leading-relaxed">
                                No interaction detected for 14 minutes. To prevent unauthorized quotation activity and maintain market confidentiality, this desk will lock in:
                            </p>

                            <div className="bg-slate-950/80 border border-amber-500/30 rounded-xl py-4 px-6 mb-6">
                                <span className="text-4xl font-black font-mono text-amber-400 tracking-wider">
                                    {idleCountdown}s
                                </span>
                                <span className="block text-[11px] text-slate-400 mt-1 uppercase font-semibold">
                                    Seconds Remaining Before Auto-Lock
                                </span>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    type="button"
                                    onClick={() => handleLogout('Desk locked by trader.')}
                                    className="px-4 py-2.5 rounded-xl border border-slate-700 hover:bg-slate-800 text-slate-300 hover:text-white text-xs font-bold transition-all cursor-pointer"
                                >
                                    Lock Desk Now
                                </button>
                                <button
                                    type="button"
                                    onClick={handleStayActive}
                                    className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-lg shadow-emerald-600/30 active:scale-95 transition-all cursor-pointer"
                                >
                                    Keep Desk Active
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
