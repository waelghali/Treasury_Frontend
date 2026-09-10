import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { 
    Clock, Landmark, AlertCircle, CheckCircle2, TrendingUp, FileText, 
    ShieldCheck, Lock, Mail, KeyRound, UserCheck, Eye, History, ArrowLeft, RefreshCw, MessageSquare
} from 'lucide-react';
import './quotation-animations.css';

const getApiBaseUrl = () => {
    let url = process.env.REACT_APP_API_BASE_URL || process.env.REACT_APP_API_URL;
    if (url) {
        return url.replace(/\/api\/v1\/?$/, '');
    }
    if (typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
        return window.location.origin;
    }
    return 'http://localhost:8000';
};

const API_BASE_URL = getApiBaseUrl();

export default function QuotationBankOfferPage() {
    const { token } = useParams();
    const [searchParams] = useSearchParams();
    const magicTokenParam = searchParams.get('magic_token');

    const [rfq, setRfq] = useState(null);
    const [error, setError] = useState(null);
    const [price, setPrice] = useState('');
    const [traderNotes, setTraderNotes] = useState('');
    const [tbillLines, setTbillLines] = useState([{ settlementDate: '', maturityDate: '', discountRate: '', maxAmount: '' }]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [timeLeft, setTimeLeft] = useState({ label: '', status: 'PRE' });
    const [resultStatus, setResultStatus] = useState(null);
    const [timeOffset, setTimeOffset] = useState(0);

    // Active View Tab: 'LIVE' or 'HISTORY'
    const [activeTab, setActiveTab] = useState('LIVE');
    const [historyData, setHistoryData] = useState([]);
    const [isLoadingHistory, setIsLoadingHistory] = useState(false);

    // Authentication / OTP State
    const [authSession, setAuthSession] = useState(null);
    const [inputEmail, setInputEmail] = useState('');
    const [otpCode, setOtpCode] = useState('');
    const [otpSent, setOtpSent] = useState(false);
    const [isRequestingOtp, setIsRequestingOtp] = useState(false);
    const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
    const [otpError, setOtpError] = useState('');

    const storageKey = `quotation_auth_${token}`;

    // 1. Fetch RFQ
    const fetchRfq = useCallback(async () => {
        try {
            const res = await axios.get(`${API_BASE_URL}/api/v1/public-quotation/${token}`);
            const data = res.data;

            const serverTime = new Date(data.serverTime).getTime();
            const localTime = Date.now();
            setTimeOffset(serverTime - localTime);
            setRfq(data);
        } catch (err) {
            setError(err.response?.data?.detail || err.message || 'Failed to load RFQ');
        }
    }, [token]);

    // 2. Fetch Result
    const checkResult = useCallback(async () => {
        if (!rfq) return null;
        try {
            const res = await axios.get(`${API_BASE_URL}/api/v1/public-quotation/${token}/result`);
            const status = res.data.status;

            if (status === 'WINNER') {
                setResultStatus('WINNER');
            } else if (status === 'AWAITING_MANUAL_SELECTION' || status === 'INCONCLUSIVE') {
                setResultStatus('AWAITING_SELECTION');
            } else if (status === 'NOT_SELECTED') {
                setResultStatus('NOT_SELECTED');
            } else if (status === 'INDICATIVE_ONLY' || status === 'COMPLETED') {
                setResultStatus(status);
            }
            return status;
        } catch (err) {
            console.error(err);
            return null;
        }
    }, [rfq, token]);

    // 3. Auto-Auth via Magic Link or SessionStorage
    useEffect(() => {
        const stored = sessionStorage.getItem(storageKey);
        if (stored) {
            try {
                setAuthSession(JSON.parse(stored));
            } catch (e) {
                sessionStorage.removeItem(storageKey);
            }
        }

        if (magicTokenParam) {
            const verifyMagic = async () => {
                setIsVerifyingOtp(true);
                try {
                    const res = await axios.post(`${API_BASE_URL}/api/v1/public-quotation/verify-otp`, {
                        token,
                        magic_token: magicTokenParam
                    });
                    const session = res.data;
                    setAuthSession(session);
                    sessionStorage.setItem(storageKey, JSON.stringify(session));
                } catch (err) {
                    setOtpError('The magic link has expired or is invalid. Please request a new code.');
                } finally {
                    setIsVerifyingOtp(false);
                }
            };
            verifyMagic();
        }
    }, [token, magicTokenParam, storageKey]);

    useEffect(() => {
        fetchRfq();
    }, [fetchRfq]);

    // 4. Polling for results when closed
    useEffect(() => {
        let interval = null;
        if (timeLeft.status === 'CLOSED' && !resultStatus) {
            const startPolling = async () => {
                const initialStatus = await checkResult();
                if (initialStatus && initialStatus !== 'PENDING') return;
                interval = setInterval(async () => {
                    const status = await checkResult();
                    if (status && status !== 'PENDING') {
                        if (interval) clearInterval(interval);
                    }
                }, 10000);
            };
            startPolling();
        }
        return () => {
            if (interval) clearInterval(interval);
        };
    }, [timeLeft.status, resultStatus, checkResult]);

    // 5. Live Countdown Timer
    useEffect(() => {
        if (!rfq) return;

        const timer = setInterval(() => {
            const now = new Date(Date.now() + timeOffset);
            const start = new Date(rfq.window_start);
            const end = new Date(rfq.window_end);

            if (now < start) {
                const diff = Math.floor((start.getTime() - now.getTime()) / 1000);
                const mins = Math.floor(diff / 60);
                const secs = diff % 60;
                setTimeLeft({ label: `Starts in ${mins}:${secs.toString().padStart(2, '0')}`, status: 'PRE' });
            } else if (now >= start && now <= end) {
                const diff = Math.floor((end.getTime() - now.getTime()) / 1000);
                const mins = Math.floor(diff / 60);
                const secs = diff % 60;
                setTimeLeft({ label: `Window Closes in ${mins}:${secs.toString().padStart(2, '0')}`, status: 'OPEN' });
            } else {
                setTimeLeft({ label: 'Window Closed', status: 'CLOSED' });
                clearInterval(timer);
            }
        }, 1000);

        return () => clearInterval(timer);
    }, [rfq, timeOffset]);

    // 6. Pre-fill existing offers
    useEffect(() => {
        if (!rfq) return;

        if (rfq.type === 'TBILL') {
            const isSettlementFixed = rfq.settlement_date_start && (!rfq.settlement_date_end || rfq.settlement_date_start === rfq.settlement_date_end);
            const isMaturityFixed = rfq.maturity_date_start && (!rfq.maturity_date_end || rfq.maturity_date_start === rfq.maturity_date_end);

            if (rfq.offers && rfq.offers.length > 0) {
                setTbillLines(rfq.offers.map((o) => ({
                    settlementDate: o.settlement_date,
                    maturityDate: o.maturity_date,
                    discountRate: o.discount_rate.toString(),
                    maxAmount: o.max_amount.toString()
                })));
                if (rfq.offers[0].notes) {
                    setTraderNotes(rfq.offers[0].notes);
                }
                setSubmitted(true);
            } else {
                setTbillLines([{
                    settlementDate: isSettlementFixed ? rfq.settlement_date_start : '',
                    maturityDate: isMaturityFixed ? rfq.maturity_date_start : '',
                    discountRate: '',
                    maxAmount: ''
                }]);
            }
        } else if (rfq.type === 'FX_SPOT' && rfq.offers && rfq.offers.length > 0) {
            setPrice(rfq.offers[0].price.toString());
            if (rfq.offers[0].notes) {
                setTraderNotes(rfq.offers[0].notes);
            }
            setSubmitted(true);
        }
    }, [rfq]);

    // 7. Fetch Quotation History
    const fetchHistory = async () => {
        setIsLoadingHistory(true);
        try {
            const res = await axios.get(`${API_BASE_URL}/api/v1/public-quotation/${token}/history`);
            setHistoryData(res.data.history || []);
        } catch (err) {
            console.error('Failed to fetch quotation history:', err);
        } finally {
            setIsLoadingHistory(false);
        }
    };

    const handleTabSwitch = (tab) => {
        setActiveTab(tab);
        if (tab === 'HISTORY' && historyData.length === 0) {
            fetchHistory();
        }
    };

    // 8. OTP Actions (Blind Work Email Verification)
    const handleRequestOtp = async (e) => {
        e?.preventDefault();
        const targetEmail = inputEmail.trim();
        if (!targetEmail) {
            setOtpError('Please enter your official bank desk email address.');
            return;
        }

        setIsRequestingOtp(true);
        setOtpError('');
        try {
            await axios.post(`${API_BASE_URL}/api/v1/public-quotation/request-otp`, {
                token,
                email: targetEmail
            });
            setOtpSent(true);
        } catch (err) {
            setOtpError(err.response?.data?.detail || 'Verification failed. Please ensure your email is registered for this quotation desk.');
        } finally {
            setIsRequestingOtp(false);
        }
    };

    const handleVerifyOtp = async (e) => {
        e?.preventDefault();
        const targetEmail = inputEmail.trim();
        if (!otpCode || otpCode.trim().length !== 6) {
            setOtpError('Please enter the 6-digit access code.');
            return;
        }

        setIsVerifyingOtp(true);
        setOtpError('');
        try {
            const res = await axios.post(`${API_BASE_URL}/api/v1/public-quotation/verify-otp`, {
                token,
                email: targetEmail,
                otp_code: otpCode.trim()
            });
            const session = res.data;
            setAuthSession(session);
            sessionStorage.setItem(storageKey, JSON.stringify(session));
        } catch (err) {
            setOtpError(err.response?.data?.detail || 'Invalid or expired code.');
        } finally {
            setIsVerifyingOtp(false);
        }
    };

    const handleLogout = () => {
        sessionStorage.removeItem(storageKey);
        setAuthSession(null);
        setOtpSent(false);
        setOtpCode('');
        setInputEmail('');
    };

    // 9. Submit Offer
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (timeLeft.status !== 'OPEN') return;
        if (!authSession) {
            alert('Please authenticate first.');
            return;
        }
        if (authSession.role === 'VIEW_ONLY') {
            alert('You have View-Only observer permissions. Quotes can only be submitted by authorized Execution dealers.');
            return;
        }

        setIsSubmitting(true);
        try {
            const isTBill = rfq.type === 'TBILL';
            const endpoint = isTBill ? '/api/v1/public-quotation/tbill-offer' : '/api/v1/public-quotation/offer';

            const body = isTBill
                ? { 
                    token, 
                    lines: tbillLines.map(l => ({ ...l, discountRate: parseFloat(l.discountRate), maxAmount: parseFloat(l.maxAmount) })),
                    notes: traderNotes.trim() || undefined,
                    session_token: authSession.session_token,
                    email: authSession.email
                }
                : { 
                    token, 
                    price: parseFloat(price),
                    notes: traderNotes.trim() || undefined,
                    session_token: authSession.session_token,
                    email: authSession.email
                };

            await axios.post(`${API_BASE_URL}${endpoint}`, body);
            setSubmitted(true);
        } catch (err) {
            console.error(err);
            alert(err.response?.data?.detail || "Submission failed. Please try again.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const addTbillLine = () => {
        const isSettlementFixed = rfq.settlement_date_start && (!rfq.settlement_date_end || rfq.settlement_date_start === rfq.settlement_date_end);
        const isMaturityFixed = rfq.maturity_date_start && (!rfq.maturity_date_end || rfq.maturity_date_start === rfq.maturity_date_end);

        setTbillLines([...tbillLines, {
            settlementDate: isSettlementFixed ? rfq.settlement_date_start : '',
            maturityDate: isMaturityFixed ? rfq.maturity_date_start : '',
            discountRate: '',
            maxAmount: ''
        }]);
    };

    const removeTbillLine = (index) => {
        setTbillLines(tbillLines.filter((_, i) => i !== index));
    };

    const updateTbillLine = (index, field, value) => {
        const newLines = [...tbillLines];
        newLines[index] = { ...newLines[index], [field]: value };
        setTbillLines(newLines);
    };

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center p-4 sm:p-8 bg-slate-50">
                <div className="bg-white p-8 sm:p-12 rounded-3xl shadow-xl border border-red-100 text-center max-w-md w-full animate-fade-in-up">
                    <AlertCircle className="mx-auto text-red-500 mb-6" size={48} />
                    <h2 className="text-xl sm:text-2xl font-bold mb-2 text-gray-900">Access Denied</h2>
                    <p className="text-gray-500 text-sm sm:text-base break-words leading-relaxed">{error}</p>
                </div>
            </div>
        );
    }

    if (!rfq) return <div className="p-8 text-center text-gray-500 animate-pulse mt-20">Loading Secure Quotation Link...</div>;

    const isViewOnly = authSession?.role === 'VIEW_ONLY';

    return (
        <div className="relative min-h-screen bg-slate-100/50">
            {/* 1. Security Gate Modal Overlay (Displayed whenever unauthenticated) */}
            {!authSession && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-2xl p-4 sm:p-6 overflow-y-auto animate-fade-in">
                    <div className="max-w-md w-full p-6 sm:p-8 bg-gradient-to-br from-slate-900 via-slate-900 to-gray-950 text-white rounded-3xl shadow-2xl border border-slate-700/80 relative animate-fade-in-up">
                        <div className="text-center">
                            <div className="w-12 h-12 rounded-2xl bg-blue-500/20 text-blue-400 flex items-center justify-center mx-auto mb-4 border border-blue-500/30 shadow-lg shadow-blue-500/10">
                                <KeyRound size={24} />
                            </div>

                            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800/80 border border-slate-700 text-[11px] font-bold uppercase tracking-wider text-slate-300 mb-2">
                                <Landmark size={13} className="text-blue-400" />
                                {rfq.bank_name} • Treasury Desk
                            </div>

                            <h3 className="text-lg sm:text-xl font-bold tracking-tight mb-2 text-white">
                                Trader Identity Verification
                            </h3>
                            <p className="text-slate-300 text-xs mb-6 leading-relaxed">
                                Enter your registered work email for <strong>{rfq.bank_name}</strong> to receive a secure 6-digit access code and unlock deal specifications.
                            </p>

                            {!otpSent ? (
                                <form onSubmit={handleRequestOtp} className="space-y-4">
                                    <div className="text-left">
                                        <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 flex items-center gap-1.5">
                                            <Mail size={13} className="text-blue-400" />
                                            Registered Desk Email
                                        </label>
                                        <input
                                            type="email"
                                            required
                                            placeholder="e.g. name@bank.com"
                                            className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 text-white text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 font-medium placeholder:text-slate-500"
                                            value={inputEmail}
                                            onChange={(e) => setInputEmail(e.target.value)}
                                            autoFocus
                                        />
                                    </div>

                                    {otpError && (
                                        <div className="p-3 bg-red-500/10 border border-red-500/30 text-red-400 text-xs rounded-xl text-left flex items-center gap-2">
                                            <AlertCircle size={14} className="shrink-0" />
                                            <span>{otpError}</span>
                                        </div>
                                    )}

                                    <button
                                        type="submit"
                                        disabled={isRequestingOtp || !inputEmail.trim()}
                                        className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm rounded-xl transition-all shadow-lg shadow-blue-600/20 disabled:opacity-50 cursor-pointer"
                                    >
                                        {isRequestingOtp ? 'Sending Access Code...' : 'Send Access Code'}
                                    </button>
                                </form>
                            ) : (
                                <form onSubmit={handleVerifyOtp} className="space-y-4">
                                    <div className="bg-slate-800/60 p-3.5 rounded-xl border border-slate-700 text-left">
                                        <p className="text-xs text-slate-300">
                                            Access code sent to <strong className="text-white font-mono">{inputEmail}</strong>.
                                        </p>
                                        <p className="text-[11px] text-slate-400 mt-0.5">Check your inbox or click the 1-click magic link in the email.</p>
                                    </div>

                                    <div className="text-left">
                                        <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                                            Enter 6-Digit Code
                                        </label>
                                        <input
                                            type="text"
                                            required
                                            maxLength={6}
                                            placeholder="123456"
                                            autoFocus
                                            className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 text-white text-center text-xl font-mono tracking-widest outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                                            value={otpCode}
                                            onChange={(e) => setOtpCode(e.target.value)}
                                        />
                                    </div>

                                    {otpError && (
                                        <div className="p-3 bg-red-500/10 border border-red-500/30 text-red-400 text-xs rounded-xl text-left flex items-center gap-2">
                                            <AlertCircle size={14} className="shrink-0" />
                                            <span>{otpError}</span>
                                        </div>
                                    )}

                                    <div className="flex gap-2">
                                        <button
                                            type="button"
                                            onClick={() => { setOtpSent(false); setOtpError(''); }}
                                            className="w-1/3 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl transition-all cursor-pointer"
                                        >
                                            Change Email
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={isVerifyingOtp || otpCode.length !== 6}
                                            className="w-2/3 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm rounded-xl transition-all shadow-lg shadow-emerald-600/20 disabled:opacity-50 cursor-pointer"
                                        >
                                            {isVerifyingOtp ? 'Verifying...' : 'Unlock Workspace'}
                                        </button>
                                    </div>
                                </form>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* 2. Main Portal Workspace (Completely blurred & locked until verified) */}
            <div className={`w-full max-w-[1380px] mx-auto px-4 py-3 sm:py-4 font-sans transition-all duration-500 ${
                !authSession ? 'filter blur-2xl opacity-10 pointer-events-none select-none overflow-hidden max-h-[85vh]' : ''
            }`}>
                
                {/* Top Navigation & Brand Header */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-3 gap-3">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-slate-950 text-white rounded-xl flex items-center justify-center shadow-md shrink-0">
                            <Landmark size={20} />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="text-lg sm:text-xl font-bold text-gray-900 tracking-tight">{rfq.bank_name}</h1>
                                <span className="text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full border border-slate-200">
                                    Treasury Desk
                                </span>
                            </div>
                            <p className="text-gray-400 text-[11px]">Counterparty Quotation Bidding & Execution System</p>
                        </div>
                    </div>

                    {/* View Tabs & Countdown */}
                    <div className="flex items-center gap-2.5 w-full sm:w-auto justify-between sm:justify-end">
                        <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold">
                            <button
                                onClick={() => handleTabSwitch('LIVE')}
                                className={`px-3 py-1 rounded-lg transition-all ${activeTab === 'LIVE' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-500 hover:text-gray-900'}`}
                            >
                                ⚡ Live RFQ
                            </button>
                            <button
                                onClick={() => handleTabSwitch('HISTORY')}
                                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg transition-all ${activeTab === 'HISTORY' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-500 hover:text-gray-900'}`}
                            >
                                <History size={13} /> Desk History
                            </button>
                        </div>

                        <div className={`px-3.5 py-1.5 rounded-xl font-mono text-xs sm:text-sm font-bold shadow-xs border shrink-0 transition-colors ${
                            timeLeft.status === 'OPEN' ? 'bg-emerald-50 text-emerald-700 border-emerald-200 animate-pulse' :
                            timeLeft.status === 'PRE' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                            'bg-slate-100 text-slate-500 border-slate-200'
                        }`}>
                            {timeLeft.label}
                        </div>
                    </div>
                </div>

                {/* Authenticated User Status Bar */}
                {authSession && (
                    <div className="mb-3 p-2.5 sm:p-3 rounded-xl bg-white border border-slate-200 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 animate-fade-in">
                        <div className="flex items-center gap-2.5">
                            <div className={`p-1.5 rounded-lg ${authSession.role === 'EXECUTION' ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600'}`}>
                                {authSession.role === 'EXECUTION' ? <UserCheck size={16} /> : <Eye size={16} />}
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-bold text-gray-900 font-mono">{authSession.email}</span>
                                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold tracking-wide border ${
                                        authSession.role === 'EXECUTION' 
                                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                                            : 'bg-blue-50 text-blue-700 border-blue-200'
                                    }`}>
                                        {authSession.role === 'EXECUTION' ? '⚡ AUTHORIZED EXECUTION DEALER' : '👁️ VIEW-ONLY OBSERVER'}
                                    </span>
                                </div>
                                <p className="text-[10px] text-gray-400">
                                    {authSession.role === 'EXECUTION' 
                                        ? 'Your quote submissions are binding and logged with your verified identity.' 
                                        : 'You are viewing this RFQ in read-only mode.'}
                                </p>
                            </div>
                        </div>

                        <button
                            onClick={handleLogout}
                            className="text-[11px] text-gray-400 hover:text-red-600 transition-colors font-medium self-end sm:self-center cursor-pointer"
                        >
                            Switch Identity / Sign Out
                        </button>
                    </div>
                )}

                {/* TAB 1: LIVE RFQ VIEW */}
                {activeTab === 'LIVE' && (
                    <>
                        {/* Trade Execution / Outcome Result Banner */}
                        {resultStatus && (
                            <div
                                className={`mb-3 p-3.5 sm:p-4 rounded-2xl border text-center animate-fade-in-up ${
                                    resultStatus === 'WINNER' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-gray-50 border-gray-200 text-gray-600'
                                }`}
                            >
                                {resultStatus === 'WINNER' ? (
                                    <div className="flex flex-col items-center">
                                        <CheckCircle2 className="mb-1 text-emerald-500" size={24} />
                                        <h2 className="text-base sm:text-lg font-bold">Trade Execution Confirmed!</h2>
                                        <p className="text-xs">Congratulations, your quote was selected as the winning offer. Our treasury team will contact you shortly.</p>
                                    </div>
                                ) : resultStatus === 'AWAITING_SELECTION' ? (
                                    <div className="flex flex-col items-center">
                                        <Clock className="mb-1 text-amber-500 animate-spin-slow" size={24} />
                                        <h2 className="text-base sm:text-lg font-bold">Selection in Progress</h2>
                                        <p className="text-xs">Thank you for your quote. The corporate treasury team is currently evaluating all counterparties.</p>
                                    </div>
                                ) : resultStatus === 'INDICATIVE_ONLY' ? (
                                    <div className="flex flex-col items-center">
                                        <h2 className="text-base sm:text-lg font-bold text-gray-800">Indicative Quotation Completed</h2>
                                        <p className="text-xs text-gray-500 mt-0.5">Thank you for providing market sounding pricing for this request.</p>
                                    </div>
                                ) : resultStatus === 'INCONCLUSIVE' ? (
                                    <div className="flex flex-col items-center">
                                        <h2 className="text-base sm:text-lg font-bold text-gray-800">Quotation Closed Without Winner</h2>
                                        <p className="text-xs text-gray-500 mt-0.5">This request closed without trade execution due to tolerance limits or market conditions.</p>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center">
                                        <h2 className="text-base sm:text-lg font-bold">Quotation Completed</h2>
                                        <p className="text-xs">Thank you for your prompt quote. Another counterparty was executed for this deal.</p>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Corporate Client & RFQ Reference Card */}
                        <div className="mb-3 p-3 sm:p-3.5 bg-white rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
                            <div>
                                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Corporate Client</p>
                                <h2 className="text-base sm:text-lg font-bold text-gray-900">{rfq.customer_name}</h2>
                            </div>
                            <div className="text-right">
                                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">RFQ Reference</p>
                                <p className="text-xs font-mono font-bold text-black bg-slate-50 px-2.5 py-1 rounded-md border border-slate-200">{rfq.ref_no}</p>
                            </div>
                        </div>

                        {/* Symmetrical 2-Column Grid */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5 items-start">
                            
                            {/* COLUMN 1: Trade Specifications & Complete Trading Guidelines */}
                            <div className="space-y-3.5">
                                <section className="bg-white p-4 sm:p-5 rounded-2xl shadow-xs border border-slate-200">
                                    <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100">
                                        <h3 className="text-[11px] font-bold uppercase tracking-widest text-gray-400 flex items-center gap-1.5">
                                            <TrendingUp size={13} className="text-blue-600" /> Trade Specifications
                                        </h3>
                                        <span className="text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-200">
                                            {rfq.quotation_base || 'Execution'}
                                        </span>
                                    </div>

                                    <div className="grid grid-cols-2 gap-y-3 gap-x-4 sm:gap-x-8">
                                        {rfq.type === 'TBILL' ? (
                                            <>
                                                <div>
                                                    <label className="block text-[9px] font-bold text-gray-400 uppercase mb-0.5">Direction</label>
                                                    <p className="text-lg sm:text-xl font-bold text-gray-900">{rfq.direction}</p>
                                                </div>
                                                <div>
                                                    <label className="block text-[9px] font-bold text-gray-400 uppercase mb-0.5">Min Ticket Amount</label>
                                                    <p className="text-lg sm:text-xl font-bold text-gray-900">{new Intl.NumberFormat().format(rfq.min_ticket_amount)}</p>
                                                </div>
                                                <div className="col-span-2 sm:col-span-1">
                                                    <label className="block text-[9px] font-bold text-gray-400 uppercase mb-0.5">Settlement Date</label>
                                                    <p className="text-xs sm:text-sm font-semibold text-gray-900">
                                                        {new Date(rfq.settlement_date_start).toLocaleDateString()}
                                                        {rfq.settlement_date_end ? ` to ${new Date(rfq.settlement_date_end).toLocaleDateString()}` : ''}
                                                    </p>
                                                </div>
                                                <div className="col-span-2 sm:col-span-1">
                                                    <label className="block text-[9px] font-bold text-gray-400 uppercase mb-0.5">Maturity Date</label>
                                                    <p className="text-xs sm:text-sm font-semibold text-gray-900">
                                                        {new Date(rfq.maturity_date_start).toLocaleDateString()}
                                                        {rfq.maturity_date_end ? ` to ${new Date(rfq.maturity_date_end).toLocaleDateString()}` : ''}
                                                    </p>
                                                </div>
                                            </>
                                        ) : (
                                            <>
                                                <div>
                                                    <label className="block text-[9px] font-bold text-gray-400 uppercase mb-0.5">Currency Pair</label>
                                                    <p className="text-lg font-bold text-emerald-900 bg-emerald-50 px-2.5 py-0.5 rounded-lg inline-block border border-emerald-200">
                                                        {rfq.buy_currency} / {rfq.sell_currency}
                                                    </p>
                                                </div>
                                                <div>
                                                    <label className="block text-[9px] font-bold text-gray-400 uppercase mb-0.5">Amount to {rfq.direction || 'Trade'}</label>
                                                    <p className="text-lg sm:text-xl font-bold text-gray-900">{new Intl.NumberFormat().format(rfq.amount)} <span className="text-xs font-normal text-gray-500">{rfq.buy_currency}</span></p>
                                                </div>
                                                <div>
                                                    <label className="block text-[9px] font-bold text-gray-400 uppercase mb-0.5">Value Date</label>
                                                    <p className="text-xs sm:text-sm font-semibold text-gray-900">{new Date(rfq.value_date).toLocaleDateString()}</p>
                                                </div>
                                                <div>
                                                    <label className="block text-[9px] font-bold text-gray-400 uppercase mb-0.5">Quotation Base</label>
                                                    <p className="text-xs sm:text-sm font-semibold text-gray-900">{rfq.quotation_base}</p>
                                                </div>
                                            </>
                                        )}
                                    </div>

                                    {((rfq.documents && rfq.documents.length > 0) || rfq.document_path) && (
                                        <div className="mt-3 pt-2.5 border-t border-slate-100 space-y-1.5">
                                            <label className="block text-[9px] font-bold text-gray-400 uppercase tracking-widest">Supporting Documents</label>
                                            <div className="space-y-1.5">
                                                {(rfq.documents && rfq.documents.length > 0 ? rfq.documents : [{ name: 'Attached Supporting Document', path: rfq.document_path }]).map((doc, idx) => (
                                                    <a
                                                        key={idx}
                                                        href={doc.path?.startsWith('http') ? doc.path : `${API_BASE_URL}${doc.path?.startsWith('/') ? '' : '/'}${doc.path}`}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="flex items-center justify-between p-2 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 transition-all text-xs font-medium text-gray-800"
                                                    >
                                                        <span className="flex items-center gap-2 truncate">
                                                            <FileText size={14} className="text-slate-500 shrink-0" />
                                                            <span className="truncate">{doc.name || `Document ${idx + 1}`}</span>
                                                        </span>
                                                        <span className="text-[9px] font-bold bg-white text-slate-800 border border-slate-200 px-2 py-0.5 rounded uppercase tracking-wider shrink-0 hover:bg-black hover:text-white transition-colors">
                                                            Download
                                                        </span>
                                                    </a>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </section>

                                {/* Complete Trading Guidelines Card (All conditions preserved) */}
                                <section className="bg-white p-4 sm:p-5 rounded-2xl shadow-xs border border-slate-200">
                                    <h3 className="text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-3 flex items-center gap-1.5">
                                        <Clock size={13} className="text-blue-600" /> Trading Guidelines
                                    </h3>
                                    <ul className="space-y-2.5 text-xs text-gray-600 leading-relaxed">
                                        <li className="flex gap-2.5">
                                            <span className="w-4 h-4 bg-black text-white rounded-full shrink-0 flex items-center justify-center text-[9px] font-bold mt-0.5">!</span>
                                            <span className="font-semibold text-gray-900">
                                                {rfq.quotation_base === 'Execution'
                                                    ? 'This is an EXECUTION request. Your submitted quote is binding upon window close.'
                                                    : 'This is an INDICATIVE request for market pricing sounding.'}
                                            </span>
                                        </li>
                                        <li className="flex gap-2.5">
                                            <span className="w-4 h-4 bg-slate-100 rounded-full shrink-0 flex items-center justify-center text-[9px] font-bold text-slate-600 mt-0.5">1</span>
                                            <span>Review currency volume, value dates, and document attachments thoroughly.</span>
                                        </li>
                                        <li className="flex gap-2.5">
                                            <span className="w-4 h-4 bg-slate-100 rounded-full shrink-0 flex items-center justify-center text-[9px] font-bold text-slate-600 mt-0.5">2</span>
                                            <span>You may amend your quote in real-time as market conditions change until the window closes.</span>
                                        </li>
                                        <li className="flex gap-2.5">
                                            <span className="w-4 h-4 bg-slate-100 rounded-full shrink-0 flex items-center justify-center text-[9px] font-bold text-slate-600 mt-0.5">3</span>
                                            <span>Trade confirmations will be dispatched to all registered desk contacts upon execution.</span>
                                        </li>
                                    </ul>
                                </section>
                            </div>

                            {/* COLUMN 2: Bidding & Execution Console */}
                            <div className="space-y-3.5">
                                {submitted && (
                                    <div className="bg-emerald-50 p-3.5 rounded-2xl border border-emerald-200 text-center animate-fade-in-up">
                                        <CheckCircle2 className="mx-auto text-emerald-500 mb-1" size={24} />
                                        <h2 className="text-sm font-bold text-emerald-900">Quote Recorded Successfully</h2>
                                        <p className="text-[11px] text-emerald-700">Your {rfq.type === 'TBILL' ? 'multi-line quote' : 'spot price'} is actively registered with the client.</p>
                                    </div>
                                )}

                                <section
                                    className={`p-4 sm:p-5 rounded-2xl shadow-xs border transition-all ${
                                        isViewOnly
                                            ? 'bg-slate-50 border-slate-200 opacity-80'
                                            : timeLeft.status === 'OPEN' 
                                                ? 'bg-white border-2 border-slate-950 shadow-md' 
                                                : 'bg-white border-slate-200'
                                    }`}
                                >
                                    <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100">
                                        <h3 className="text-[11px] font-bold uppercase tracking-widest text-gray-500 flex items-center gap-1.5">
                                            <TrendingUp size={13} /> {rfq.type === 'TBILL' ? 'T-Bill Quotation Lines' : 'Your Price Quote'}
                                        </h3>
                                        {isViewOnly && (
                                            <span className="px-2.5 py-0.5 bg-blue-100 text-blue-800 text-[9px] font-bold rounded-full border border-blue-200">
                                                👁️ View-Only Observer
                                            </span>
                                        )}
                                    </div>

                                    {isViewOnly ? (
                                        <div className="p-3.5 rounded-xl bg-blue-50/60 border border-blue-200 text-blue-900 text-xs leading-relaxed">
                                            <strong>View-Only Notice:</strong> Your registered account has observer permissions. You can inspect trade parameters and history, but only dealers tagged for <strong>Execution</strong> can enter binding quotes.
                                        </div>
                                    ) : (
                                        <form onSubmit={handleSubmit}>
                                            {rfq.type === 'TBILL' ? (
                                                <div className="space-y-3 mb-3">
                                                    {tbillLines.map((line, index) => (
                                                        <div key={index} className="p-3 bg-slate-50 rounded-xl border border-slate-200 relative group">
                                                            {tbillLines.length > 1 && timeLeft.status === 'OPEN' && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => removeTbillLine(index)}
                                                                    className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-xs font-bold shadow-sm cursor-pointer"
                                                                >
                                                                    ×
                                                                </button>
                                                            )}
                                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                                                <div>
                                                                    <label className="block text-[9px] font-bold text-gray-500 uppercase mb-0.5">Settlement Date</label>
                                                                    <input
                                                                        type="date"
                                                                        required
                                                                        disabled={timeLeft.status !== 'OPEN'}
                                                                        className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold outline-none focus:border-black"
                                                                        value={line.settlementDate}
                                                                        onChange={e => updateTbillLine(index, 'settlementDate', e.target.value)}
                                                                    />
                                                                </div>
                                                                <div>
                                                                    <label className="block text-[9px] font-bold text-gray-500 uppercase mb-0.5">Maturity Date</label>
                                                                    <input
                                                                        type="date"
                                                                        required
                                                                        disabled={timeLeft.status !== 'OPEN'}
                                                                        className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold outline-none focus:border-black"
                                                                        value={line.maturityDate}
                                                                        onChange={e => updateTbillLine(index, 'maturityDate', e.target.value)}
                                                                    />
                                                                </div>
                                                                <div>
                                                                    <label className="block text-[9px] font-bold text-gray-500 uppercase mb-0.5">Discount Rate (%)</label>
                                                                    <input
                                                                        type="number"
                                                                        step="0.0001"
                                                                        required
                                                                        disabled={timeLeft.status !== 'OPEN'}
                                                                        onWheel={(e) => e.currentTarget.blur()}
                                                                        placeholder="e.g. 18.50"
                                                                        className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-bold outline-none focus:border-black"
                                                                        value={line.discountRate}
                                                                        onChange={e => updateTbillLine(index, 'discountRate', e.target.value)}
                                                                    />
                                                                </div>
                                                                <div>
                                                                    <label className="block text-[9px] font-bold text-gray-500 uppercase mb-0.5">Max Amount</label>
                                                                    <input
                                                                        type="number"
                                                                        required
                                                                        disabled={timeLeft.status !== 'OPEN'}
                                                                        onWheel={(e) => e.currentTarget.blur()}
                                                                        placeholder="0.00"
                                                                        className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-bold outline-none focus:border-black"
                                                                        value={line.maxAmount}
                                                                        onChange={e => updateTbillLine(index, 'maxAmount', e.target.value)}
                                                                    />
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}

                                                    {timeLeft.status === 'OPEN' && (
                                                        <button
                                                            type="button"
                                                            onClick={addTbillLine}
                                                            className="text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-800 px-3 py-1.5 rounded-xl transition-all cursor-pointer"
                                                        >
                                                            + Add Line Item
                                                        </button>
                                                    )}
                                                </div>
                                            ) : (
                                                <div className="relative mb-3">
                                                    <input
                                                        type="number"
                                                        step="0.00001"
                                                        required
                                                        disabled={timeLeft.status !== 'OPEN' || isSubmitting}
                                                        onWheel={(e) => e.currentTarget.blur()}
                                                        placeholder="Enter spot rate (e.g. 48.6500)"
                                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-lg font-bold focus:bg-white focus:ring-2 focus:ring-black/5 transition-all outline-none"
                                                        value={price}
                                                        onChange={e => setPrice(e.target.value)}
                                                    />
                                                    <div className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-sm">
                                                        {rfq.sell_currency}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Trader Comments / Notes */}
                                            <div className="mb-3">
                                                <label className="block text-[9px] font-bold text-gray-500 uppercase mb-1 flex items-center gap-1.5">
                                                    <MessageSquare size={12} className="text-gray-400" />
                                                    Trader Comments / Execution Notes (Optional)
                                                </label>
                                                <textarea
                                                    rows={2}
                                                    disabled={timeLeft.status !== 'OPEN' || isSubmitting}
                                                    placeholder="Add any settlement notes or execution remarks for the client..."
                                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-gray-800 focus:bg-white focus:ring-2 focus:ring-black/5 transition-all outline-none resize-none"
                                                    value={traderNotes}
                                                    onChange={(e) => setTraderNotes(e.target.value)}
                                                />
                                            </div>

                                            <button
                                                type="submit"
                                                disabled={timeLeft.status !== 'OPEN' || isSubmitting || !authSession || (rfq.type === 'TBILL' ? tbillLines.some(l => !l.discountRate || !l.maxAmount) : !price)}
                                                className="w-full py-3 bg-slate-950 text-white rounded-xl font-bold text-xs sm:text-sm hover:bg-slate-800 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed transition-all shadow-md cursor-pointer"
                                            >
                                                {isSubmitting ? 'Submitting Quote...' : timeLeft.status === 'PRE' ? 'Waiting for Window' : timeLeft.status === 'CLOSED' ? 'Window Closed' : (submitted ? 'Update Quote' : 'Submit Binding Quote')}
                                            </button>
                                        </form>
                                    )}
                                </section>
                            </div>
                        </div>
                    </>
                )}

                {/* TAB 2: COUNTERPARTY QUOTATION HISTORY */}
                {activeTab === 'HISTORY' && (
                    <div className="bg-white p-4 sm:p-6 rounded-2xl shadow-xs border border-slate-200 animate-fade-in-up">
                        <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
                            <div>
                                <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                                    <History className="text-blue-600" size={18} />
                                    Desk Quotation History with {rfq.customer_name}
                                </h2>
                                <p className="text-[11px] text-gray-400">Past request submissions, win rates, and execution status records for {rfq.bank_name}.</p>
                            </div>
                            <button
                                onClick={fetchHistory}
                                disabled={isLoadingHistory}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                            >
                                <RefreshCw size={13} className={isLoadingHistory ? 'animate-spin' : ''} /> Refresh
                            </button>
                        </div>

                        {isLoadingHistory ? (
                            <div className="py-12 text-center text-slate-400 text-xs">Loading quotation history...</div>
                        ) : historyData.length === 0 ? (
                            <div className="py-12 text-center text-slate-400 text-xs">No previous quotations found for this desk.</div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-slate-50 border-b border-slate-200 text-slate-600">
                                            <th className="py-2.5 px-3 text-[10px] font-bold uppercase tracking-wider">RFQ Reference</th>
                                            <th className="py-2.5 px-3 text-[10px] font-bold uppercase tracking-wider">Product & Direction</th>
                                            <th className="py-2.5 px-3 text-[10px] font-bold uppercase tracking-wider">Deal Volume</th>
                                            <th className="py-2.5 px-3 text-[10px] font-bold uppercase tracking-wider">Your Submitted Rate</th>
                                            <th className="py-2.5 px-3 text-[10px] font-bold uppercase tracking-wider">Submitted By</th>
                                            <th className="py-2.5 px-3 text-[10px] font-bold uppercase tracking-wider text-right">Outcome</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 text-xs">
                                        {historyData.map((h, idx) => (
                                            <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
                                                <td className="py-2.5 px-3 font-mono font-bold text-gray-900">{h.ref_no}</td>
                                                <td className="py-2.5 px-3">
                                                    <span className="font-semibold text-gray-800">{h.type}</span> &bull; <span className="text-gray-500">{h.direction || 'N/A'}</span>
                                                </td>
                                                <td className="py-2.5 px-3 font-semibold text-gray-900">
                                                    {h.amount ? `${new Intl.NumberFormat().format(h.amount)}` : 'N/A'} {h.currency_pair ? `(${h.currency_pair})` : ''}
                                                </td>
                                                <td className="py-2.5 px-3 font-mono font-bold text-blue-600">
                                                    {h.best_quote !== null ? h.best_quote : <span className="text-gray-400 font-sans font-normal">No Quote</span>}
                                                </td>
                                                <td className="py-2.5 px-3 text-gray-500 font-mono">
                                                    <div>{h.submitted_by || '—'}</div>
                                                    {h.notes && (
                                                        <div className="text-[11px] font-sans text-slate-600 bg-slate-100 px-2 py-0.5 rounded mt-0.5 max-w-xs truncate" title={h.notes}>
                                                            💬 {h.notes}
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="py-2.5 px-3 text-right">
                                                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                                                        h.outcome === 'WON' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' :
                                                        h.outcome === 'NOT_SELECTED' ? 'bg-slate-100 text-slate-600 border-slate-200' :
                                                        h.outcome === 'SUBMITTED' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                                        'bg-gray-100 text-gray-600 border-gray-200'
                                                    }`}>
                                                        {h.outcome === 'WON' ? '🏆 Won Trade' :
                                                         h.outcome === 'NOT_SELECTED' ? 'Not Selected' :
                                                         h.outcome === 'SUBMITTED' ? '⏳ Submitted' : h.outcome}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}

            </div>
        </div>
    );
}
