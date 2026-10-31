import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { 
    Landmark, Shield, CheckCircle2, AlertCircle, Loader2, Users, 
    ArrowRight, Check, RefreshCw, Mail, Calendar, Building2, UserCheck,
    KeyRound, Lock, Send, AlertTriangle, ShieldCheck, Timer
} from 'lucide-react';
import HoneypotField from '../../components/Security/HoneypotField';

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
    if (url) return url.replace(/\/api\/v1\/?$/, '');
    return DIRECT_BACKEND_URL;
};

const API_BASE_URL = getApiBaseUrl();

export default function PublicBankHandshakePage() {
    const { token } = useParams();
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState(null);
    const [error, setError] = useState(null);
    const [confirmedAt, setConfirmedAt] = useState(null);
    const [isDealerMode, setIsDealerMode] = useState(true);

    // Interactive OTP Gate State
    const [otp, setOtp] = useState('');
    const [otpSent, setOtpSent] = useState(false);
    const [isSendingOtp, setIsSendingOtp] = useState(false);
    const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
    const [cooldown, setCooldown] = useState(0);
    const [otpExpiresIn, setOtpExpiresIn] = useState(0);
    const [failedAttempts, setFailedAttempts] = useState(0);
    const [isLocked, setIsLocked] = useState(false);
    const [otpError, setOtpError] = useState(null);
    const [otpSuccessMessage, setOtpSuccessMessage] = useState(null);
    const [websiteUrl, setWebsiteUrl] = useState('');
    const otpInputRef = useRef(null);

    // Cooldown countdown timer
    useEffect(() => {
        if (cooldown <= 0) return;
        const timer = setInterval(() => {
            setCooldown(prev => (prev > 1 ? prev - 1 : 0));
        }, 1000);
        return () => clearInterval(timer);
    }, [cooldown]);

    // OTP validity expiration countdown timer
    useEffect(() => {
        if (otpExpiresIn <= 0) return;
        const timer = setInterval(() => {
            setOtpExpiresIn(prev => (prev > 1 ? prev - 1 : 0));
        }, 1000);
        return () => clearInterval(timer);
    }, [otpExpiresIn]);

    useEffect(() => {
        if (!token) {
            setError("No verification token provided in the link.");
            setLoading(false);
            return;
        }

        const fetchDetails = async () => {
            try {
                setLoading(true);
                setError(null);
                
                // Try dealer handshake endpoint first
                try {
                    const res = await axios.get(`${API_BASE_URL}/api/v1/public-quotation/dealer-handshake/${token}`);
                    setData(res.data);
                    setIsDealerMode(true);
                    setFailedAttempts(res.data.failed_otp_attempts || 0);

                    if (res.data.is_locked || res.data.status === 'LOCKED' || res.data.status === 'REVOKED') {
                        setIsLocked(true);
                    }
                    if (res.data.cooldown_remaining > 0) {
                        setCooldown(res.data.cooldown_remaining);
                        setOtpSent(true);
                    }
                    if (res.data.otp_active_seconds > 0) {
                        setOtpExpiresIn(res.data.otp_active_seconds);
                        setOtpSent(true);
                    }
                    if (res.data.accepted_at || res.data.already_accepted) {
                        setConfirmedAt(res.data.accepted_at || new Date().toISOString());
                    }
                    return;
                } catch (dealerErr) {
                    // Fallback to bank roster handshake
                    if (dealerErr.response?.status === 404) {
                        const fallbackRes = await axios.get(`${API_BASE_URL}/api/v1/public-quotation/bank-handshake/${token}`);
                        setData(fallbackRes.data);
                        setIsDealerMode(false);
                        if (fallbackRes.data.handshake_confirmed_at) {
                            setConfirmedAt(fallbackRes.data.handshake_confirmed_at);
                        }
                        return;
                    }
                    throw dealerErr;
                }
            } catch (err) {
                console.error("Failed to load verification details:", err);
                const msg = err.response?.data?.detail || "This verification link is invalid, expired, or has already been revoked.";
                setError(msg);
            } finally {
                setLoading(false);
            }
        };

        fetchDetails();
    }, [token]);

    const handleRequestOtp = async () => {
        if (cooldown > 0 || isLocked) return;
        setOtpError(null);
        setOtpSuccessMessage(null);
        try {
            setIsSendingOtp(true);
            const trap = websiteUrl ? websiteUrl.trim().toLowerCase() : '';
            const isAutofill = trap && (data?.email && trap === data.email.trim().toLowerCase());
            const safeWebsiteUrl = isAutofill ? '' : websiteUrl;
            const otpUrl = `${API_BASE_URL}/api/v1/public-quotation/dealer-handshake/${token}/request-otp${safeWebsiteUrl ? `?website_url=${encodeURIComponent(safeWebsiteUrl)}` : ''}`;
            const res = await axios.post(otpUrl);
            setOtpSent(true);
            setCooldown(res.data.cooldown_seconds || 60);
            setOtpExpiresIn(res.data.expires_in_seconds || 300);
            setOtpSuccessMessage(res.data.message || "Verification code sent to your registered institutional email.");
            // Focus on OTP input
            setTimeout(() => {
                if (otpInputRef.current) otpInputRef.current.focus();
            }, 100);
        } catch (err) {
            console.error("Failed to request OTP:", err);
            const msg = err.response?.data?.detail || "Could not dispatch verification code. Please try again.";
            setOtpError(msg);
        } finally {
            setIsSendingOtp(false);
        }
    };

    const handleVerifyOtp = async (e) => {
        if (e && e.preventDefault) e.preventDefault();
        const cleanOtp = otp.trim().replace(/\D/g, '');
        if (cleanOtp.length !== 6) {
            setOtpError("Please enter the complete 6-digit verification code.");
            return;
        }

        setOtpError(null);
        try {
            setIsVerifyingOtp(true);
            const endpoint = isDealerMode 
                ? `${API_BASE_URL}/api/v1/public-quotation/dealer-handshake/${token}/verify-otp`
                : `${API_BASE_URL}/api/v1/public-quotation/bank-handshake/${token}/confirm`;

            const trap = websiteUrl ? websiteUrl.trim().toLowerCase() : '';
            const isAutofill = trap && (
                (cleanOtp && trap === cleanOtp) ||
                (data?.email && trap === data.email.trim().toLowerCase())
            );
            const safeWebsiteUrl = isAutofill ? '' : websiteUrl;

            const res = await axios.post(endpoint, { otp: cleanOtp, website_url: safeWebsiteUrl });
            setConfirmedAt(res.data.accepted_at || res.data.confirmed_at || new Date().toISOString());
            setOtpSuccessMessage("Verification successful! Access confirmed and one-time link burned.");
        } catch (err) {
            console.error("Failed to verify OTP:", err);
            const msg = err.response?.data?.detail || "Verification failed. Please check the code and try again.";
            setOtpError(msg);
            
            // Check if locked
            if (msg.includes("Maximum") || msg.includes("permanently locked") || msg.includes("revoked")) {
                setIsLocked(true);
            } else {
                setFailedAttempts(prev => prev + 1);
            }
        } finally {
            setIsVerifyingOtp(false);
        }
    };

    const getRoleBadge = (role) => {
        const r = (role || 'EXECUTION').toUpperCase();
        if (r === 'EXECUTION') {
            return (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    ⚡ Execution Dealer (Firm Bidding)
                </span>
            );
        }
        if (r === 'APPROVER') {
            return (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    🛡️ Approver
                </span>
            );
        }
        return (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-500/10 text-slate-400 border border-slate-500/20">
                👁️ View Only
            </span>
        );
    };

    return (
        <div className="min-h-screen lg:h-screen lg:overflow-hidden bg-[#070d1e] text-slate-100 flex flex-col justify-between selection:bg-emerald-500 selection:text-white font-sans antialiased">
            {/* Top Bar */}
            <header className="border-b border-slate-800/80 bg-[#0b132b]/80 backdrop-blur-md px-6 py-2.5 sticky top-0 z-50 shrink-0">
                <div className="max-w-6xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                            <Landmark className="w-4 h-4 text-slate-950 font-bold" />
                        </div>
                        <div>
                            <h1 className="font-extrabold text-sm tracking-tight text-white flex items-center gap-2">
                                Grow Treasury Platform
                                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                    Counterparty Verification
                                </span>
                            </h1>
                            <p className="text-[11px] text-slate-400">Institutional Treasury &amp; Trading Access Confirmation</p>
                        </div>
                    </div>
                    {data?.customer_name && (
                        <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-lg bg-slate-800/60 border border-slate-700/60 text-xs text-slate-300">
                            <Building2 className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Corporate Group: <strong className="text-white">{data.customer_name}</strong></span>
                        </div>
                    )}
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-4 flex flex-col justify-center overflow-y-auto">
                {loading ? (
                    <div className="py-12 flex flex-col items-center justify-center gap-3 text-center">
                        <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
                        <p className="text-sm text-slate-300 font-medium">Validating secure invitation token...</p>
                    </div>
                ) : error ? (
                    <div className="max-w-lg mx-auto bg-rose-950/30 border border-rose-500/40 rounded-2xl p-6 text-center space-y-3 shadow-2xl backdrop-blur-sm">
                        <div className="w-12 h-12 rounded-2xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center mx-auto text-rose-400">
                            <AlertCircle className="w-6 h-6" />
                        </div>
                        <h2 className="text-lg font-bold text-white">Invitation Expired or Invalid</h2>
                        <p className="text-xs text-slate-300 leading-relaxed">{error}</p>
                        <p className="text-[11px] text-slate-400 pt-2 border-t border-rose-500/20">
                            Please contact the corporate treasury team to request a refreshed invitation.
                        </p>
                    </div>
                ) : data && isDealerMode ? (
                    /* Dealer Handshake Experience - Side by Side Layout */
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
                        {/* Left Column: Counterparty & Profile Details */}
                        <div className="lg:col-span-7 bg-gradient-to-br from-[#0e1a38] via-[#0b142c] to-[#070d1e] border border-slate-700/80 rounded-2xl p-5 shadow-xl flex flex-col justify-between space-y-4">
                            <div>
                                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 border-b border-slate-800 pb-4 mb-4">
                                    <div>
                                        <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-widest flex items-center gap-1.5 mb-1">
                                            <Shield className="w-3.5 h-3.5" /> Counterparty Access Invitation
                                        </span>
                                        <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight leading-tight">
                                            {data.bank_name}
                                        </h2>
                                        <p className="text-xs text-slate-300 mt-1">
                                            Treasury Counterparty Desk for <strong className="text-white">{data.customer_name} (Group)</strong>
                                        </p>
                                    </div>

                                    {confirmedAt ? (
                                        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-bold shadow-lg shrink-0">
                                            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                                            <div>
                                                <div className="text-emerald-300 font-extrabold text-[11px]">Access Active</div>
                                                <div className="text-[10px] text-emerald-400/80 font-normal">
                                                    {new Date(confirmedAt).toLocaleString()}
                                                </div>
                                            </div>
                                        </div>
                                    ) : isLocked ? (
                                        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-bold shrink-0">
                                            <Lock className="w-3.5 h-3.5 text-rose-400" />
                                            <span>Invitation Locked</span>
                                        </div>
                                    ) : (
                                        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-bold shrink-0">
                                            <RefreshCw className="w-3.5 h-3.5 text-amber-400" />
                                            <span>Handshake Pending</span>
                                        </div>
                                    )}
                                </div>

                                {/* Representative Profile Card */}
                                <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3.5 space-y-2.5">
                                    <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                                        Your Designated Trading Profile
                                    </h3>
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs items-center">
                                        <div className="min-w-0">
                                            <span className="text-slate-400 block text-[10px]">Representative Email</span>
                                            <span className="font-mono text-emerald-300 text-xs font-semibold truncate block" title={data.masked_email || data.email}>
                                                {data.masked_email || data.email}
                                            </span>
                                        </div>
                                        <div>
                                            <span className="text-slate-400 block text-[10px]">Name / Title</span>
                                            <span className="text-white text-xs font-semibold">{data.title || 'Desk Representative'}</span>
                                        </div>
                                        <div>
                                            <span className="text-slate-400 block text-[10px] mb-0.5">Quoting Authority Role</span>
                                            <div>{getRoleBadge(data.role)}</div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Authorized Legal Entities Scope */}
                            <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3.5 space-y-2">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                    <h3 className="text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                                        <Building2 className="w-3.5 h-3.5 text-emerald-400" />
                                        Authorized Legal Entities In Scope
                                    </h3>
                                    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 w-fit">
                                        {data.entity_scope === 'ALL_ENTITIES' ? '🌐 All Group Entities' : '🏢 Specific Group Entities'}
                                    </span>
                                </div>

                                <p className="text-[11px] text-slate-400">
                                    Your desk trading authority applies to the following legal {data.entities && data.entities.length === 1 ? 'entity' : 'entities'} within <strong>{data.customer_name}</strong>:
                                </p>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-0.5 max-h-32 overflow-y-auto pr-1">
                                    {data.entities && data.entities.length > 0 ? (
                                        data.entities.map((ent, idx) => (
                                            <div
                                                key={ent.id || idx}
                                                className="flex items-center justify-between p-2 rounded-lg bg-slate-950/70 border border-slate-800/90 text-xs hover:border-slate-700 transition-colors"
                                            >
                                                <div className="flex items-center gap-2 min-w-0">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                                                    <span className="font-semibold text-white truncate">{ent.name || ent.entity_name}</span>
                                                </div>
                                                {ent.code && (
                                                    <span className="font-mono text-[10px] text-slate-400 bg-slate-800/80 px-1.5 py-0.5 rounded ml-2 shrink-0 border border-slate-700/50">
                                                        {ent.code}
                                                    </span>
                                                )}
                                            </div>
                                        ))
                                    ) : (
                                        <div className="p-2.5 bg-slate-950/50 border border-slate-800 rounded-lg text-xs text-slate-400 sm:col-span-2">
                                            All legal entities under {data.customer_name}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Right Column: Interactive Verification Gate Card */}
                        <div className="lg:col-span-5 bg-gradient-to-r from-slate-900/90 via-[#0e1a38] to-slate-900/90 border border-slate-700/80 rounded-2xl p-5 text-center flex flex-col justify-between shadow-xl">
                            <div className="flex-1 flex flex-col justify-center">
                                {confirmedAt ? (
                                    /* Confirmed State */
                                    <div className="space-y-2.5 py-2">
                                        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 mb-1 border border-emerald-500/30">
                                            <CheckCircle2 className="w-6 h-6" />
                                        </div>
                                        <h4 className="text-lg font-extrabold text-white">Trading Access Active &amp; Verified!</h4>
                                        <p className="text-xs text-slate-300 max-w-md mx-auto leading-relaxed">
                                            Your trading identity has been verified via one-time authorization code. This single-activation link has now been permanently burned. You will receive live RFQs and quoting invitations dispatched by <strong>{data.customer_name}</strong>'s treasury desk.
                                        </p>
                                    </div>
                                ) : isLocked ? (
                                    /* Locked State */
                                    <div className="space-y-2.5 py-2 text-center">
                                        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-rose-500/20 text-rose-400 mb-1 border border-rose-500/30">
                                            <Lock className="w-6 h-6" />
                                        </div>
                                        <h4 className="text-lg font-extrabold text-white">Invitation Permanently Locked</h4>
                                        <p className="text-xs text-rose-300 max-w-md mx-auto leading-relaxed">
                                            For institutional security, this single-activation invitation has been locked because the maximum of 3 verification attempts was exceeded.
                                        </p>
                                        <p className="text-[11px] text-slate-400">
                                            Please contact <strong>{data.customer_name}</strong>'s corporate treasury team to request a new invitation.
                                        </p>
                                    </div>
                                ) : (
                                    /* Interactive Gate (OTP Flow) */
                                    <div className="space-y-4 max-w-md mx-auto w-full">
                                        <div>
                                            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 flex items-center justify-center gap-1.5 mb-1">
                                                <ShieldCheck size={13} /> Two-Channel Security Handshake
                                            </span>
                                            <h4 className="text-lg font-extrabold text-white">Identity Verification</h4>
                                            <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                                                To complete authorization, a single-use 6-digit verification code must be dispatched to your corporate banking email.
                                            </p>
                                        </div>

                                        {!otpSent ? (
                                            /* Step 1: Request OTP */
                                            <div className="space-y-3 pt-1">
                                                <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 text-xs text-slate-300 text-left flex items-start gap-2.5">
                                                    <Mail className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                                                    <div className="min-w-0">
                                                        <span className="text-slate-400 text-[11px]">Verification code will be dispatched to:</span>
                                                        <div className="font-mono text-white font-bold text-xs mt-0.5 truncate">{data.masked_email || data.email}</div>
                                                    </div>
                                                </div>

                                                <button
                                                    type="button"
                                                    onClick={handleRequestOtp}
                                                    disabled={isSendingOtp}
                                                    className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs sm:text-sm shadow-xl shadow-emerald-500/20 hover:shadow-emerald-500/30 transition-all transform active:scale-95 disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
                                                >
                                                    {isSendingOtp ? (
                                                        <>
                                                            <Loader2 className="w-4 h-4 animate-spin" />
                                                            <span>Sending Verification Code...</span>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Send className="w-4 h-4" />
                                                            <span>Send 6-Digit Verification Code</span>
                                                        </>
                                                    )}
                                                </button>

                                                {/* Zero-friction perimeter anti-bot honeypot trap positioned after form controls to prevent autofill heuristic collisions */}
                                                <HoneypotField name="website_url" value={websiteUrl} onChange={(e) => setWebsiteUrl(e.target.value)} />
                                            </div>
                                        ) : (
                                            /* Step 2: Enter & Verify 6-digit OTP */
                                            <form onSubmit={handleVerifyOtp} className="space-y-3 pt-1">
                                                {otpSuccessMessage && (
                                                    <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-[11px] font-medium">
                                                        {otpSuccessMessage}
                                                    </div>
                                                )}

                                                {otpError && (
                                                    <div className="p-2 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-[11px] font-semibold flex items-center justify-center gap-1.5">
                                                        <AlertTriangle size={13} className="shrink-0" />
                                                        <span>{otpError}</span>
                                                    </div>
                                                )}

                                                <div>
                                                    <label className="text-[10px] font-bold text-slate-300 uppercase tracking-wider block mb-1.5">
                                                        Enter 6-Digit Verification Code
                                                    </label>
                                                    <input
                                                        ref={otpInputRef}
                                                        type="text"
                                                        inputMode="numeric"
                                                        pattern="[0-9]*"
                                                        maxLength={6}
                                                        value={otp}
                                                        onChange={(e) => {
                                                            const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                                                            setOtp(val);
                                                            setOtpError(null);
                                                        }}
                                                        placeholder="&bull;&bull;&bull;&bull;&bull;&bull;"
                                                        className="w-full px-3 py-2 text-center text-2xl font-mono font-black tracking-[10px] bg-slate-950/80 border-2 border-emerald-500/50 focus:border-emerald-400 focus:outline-none rounded-xl text-white shadow-inner"
                                                        autoComplete="one-time-code"
                                                    />
                                                </div>

                                                <div className="flex items-center justify-between text-[11px] text-slate-400 px-1">
                                                    <span className="flex items-center gap-1">
                                                        <Timer size={12} className="text-amber-400" />
                                                        {otpExpiresIn > 0 ? (
                                                            <span>Code expires in: <strong className="text-amber-300">{Math.floor(otpExpiresIn / 60)}:{(otpExpiresIn % 60).toString().padStart(2, '0')}</strong></span>
                                                        ) : (
                                                            <span className="text-rose-400">Code expired. Please resend.</span>
                                                        )}
                                                    </span>
                                                    <span className="text-[10px] text-slate-500">
                                                        Attempt: <strong>{Math.min(3, failedAttempts + 1)}</strong>/3
                                                    </span>
                                                </div>

                                                <button
                                                    type="submit"
                                                    disabled={isVerifyingOtp || otp.length !== 6}
                                                    className="w-full inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs sm:text-sm shadow-xl shadow-emerald-500/20 hover:shadow-emerald-500/30 transition-all transform active:scale-95 disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
                                                >
                                                    {isVerifyingOtp ? (
                                                        <>
                                                            <Loader2 className="w-4 h-4 animate-spin" />
                                                            <span>Verifying Code &amp; Activating...</span>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <UserCheck className="w-4 h-4" />
                                                            <span>Verify &amp; Activate Access &rarr;</span>
                                                        </>
                                                    )}
                                                </button>

                                                {/* Resend Cooldown Button */}
                                                <div>
                                                    <button
                                                        type="button"
                                                        onClick={handleRequestOtp}
                                                        disabled={cooldown > 0 || isSendingOtp}
                                                        className="text-[11px] text-slate-400 hover:text-emerald-400 transition-colors disabled:opacity-40 disabled:hover:text-slate-400 cursor-pointer"
                                                    >
                                                        {cooldown > 0 ? (
                                                            <span>Resend code in {cooldown}s</span>
                                                        ) : (
                                                            <span>Didn't receive the code? <strong>Resend Code</strong></span>
                                                        )}
                                                    </button>
                                                </div>

                                                {/* Zero-friction perimeter anti-bot honeypot trap positioned after form controls to prevent autofill heuristic collisions */}
                                                <HoneypotField name="website_url" value={websiteUrl} onChange={(e) => setWebsiteUrl(e.target.value)} />
                                            </form>
                                        )}
                                    </div>
                                )}
                            </div>

                            <div className="text-[10.5px] text-slate-400 pt-3 mt-4 border-t border-slate-800 space-y-0.5">
                                <p>🔒 Single-Activation Guarantee: This link is automatically burned upon verification.</p>
                                <p>Need to modify your role or have questions? Simply reply to your corporate invitation email.</p>
                            </div>
                        </div>
                    </div>
                ) : (
                    /* Fallback Bank Roster Mode */
                    <div className="space-y-4">
                        <div className="bg-[#0e1a38] border border-slate-700/80 rounded-2xl p-6 shadow-xl text-center">
                            <h2 className="text-xl font-bold text-white">{data.bank_name}</h2>
                            <p className="text-xs text-slate-400 mt-1">Trading Counterparty for {data.customer_name}</p>
                        </div>
                    </div>
                )}
            </main>

            {/* Footer */}
            <footer className="border-t border-slate-800/80 bg-[#070d1e] py-2.5 px-4 text-center text-[11px] text-slate-400 shrink-0">
                <p>Grow Treasury Platform &bull; Zero-Knowledge Institutional Counterparty Network</p>
            </footer>
        </div>
    );
}
