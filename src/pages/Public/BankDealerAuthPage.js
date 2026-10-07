import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import {
    ShieldCheck, Lock, Mail, KeyRound, Smartphone,
    ArrowRight, CheckCircle2, AlertCircle, Loader2,
    RefreshCw, ChevronLeft, Building2, User
} from 'lucide-react';

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

export default function BankDealerAuthPage({ initialMode = 'login' }) {
    const navigate = useNavigate();
    const location = useLocation();

    // Mode: 'login' vs 'enroll'
    const [mode, setMode] = useState(location.pathname.includes('enroll') ? 'enroll' : initialMode);

    // Enrolment sub-steps: 1 = Email domain proof, 2 = Verify email OTP, 3 = Scan QR & Set Password
    const [enrollStep, setEnrollStep] = useState(1);

    // Form inputs
    const [email, setEmail] = useState('');
    const [fullName, setFullName] = useState('');
    const [title, setTitle] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [totpCode, setTotpCode] = useState('');
    const [emailOtp, setEmailOtp] = useState('');

    // Handover state from backend
    const [enrollmentToken, setEnrollmentToken] = useState(null);
    const [qrCodeBase64, setQrCodeBase64] = useState(null);
    const [totpSecret, setTotpSecret] = useState(null);
    const [bankName, setBankName] = useState(null);

    // UI state
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [successMsg, setSuccessMsg] = useState(null);

    // Auto-redirect if already authenticated
    useEffect(() => {
        const token = localStorage.getItem('grow_bank_dealer_token');
        if (token) {
            // Check token validity via /auth/me
            axios.get(`${API_BASE_URL}/api/v1/bank-dealer/auth/me`, {
                headers: { Authorization: `Bearer ${token}` }
            }).then(res => {
                if (res.data?.success) {
                    navigate('/dealer/desk', { replace: true });
                }
            }).catch(() => {
                localStorage.removeItem('grow_bank_dealer_token');
                localStorage.removeItem('grow_bank_dealer_profile');
            });
        }
    }, [navigate]);

    const resetMessages = () => {
        setError(null);
        setSuccessMsg(null);
    };

    // -------------------------------------------------------------------------
    // HANDLERS: LOGIN
    // -------------------------------------------------------------------------
    const handleLogin = async (e) => {
        e.preventDefault();
        resetMessages();

        if (!email.trim() || !password || !totpCode.trim()) {
            setError('Please provide corporate email, password, and 6-digit Authenticator code.');
            return;
        }

        setLoading(true);
        try {
            const res = await axios.post(`${API_BASE_URL}/api/v1/bank-dealer/auth/login`, {
                email: email.trim().toLowerCase(),
                password: password,
                totp_code: totpCode.trim()
            });

            if (res.data?.success && res.data?.access_token) {
                localStorage.setItem('grow_bank_dealer_token', res.data.access_token);
                localStorage.setItem('grow_bank_dealer_profile', JSON.stringify(res.data.dealer));
                navigate('/dealer/desk', { replace: true });
            } else {
                setError(res.data?.message || 'Login failed. Please check credentials.');
            }
        } catch (err) {
            const msg = err.response?.data?.detail || err.response?.data?.message || 'Authentication failed. Please verify credentials.';
            setError(msg);
        } finally {
            setLoading(false);
        }
    };

    // -------------------------------------------------------------------------
    // HANDLERS: ENROLMENT (GATE 1 - INITIATE)
    // -------------------------------------------------------------------------
    const handleInitiateEnroll = async (e) => {
        e.preventDefault();
        resetMessages();

        if (!email.trim() || !fullName.trim()) {
            setError('Corporate email and full name are required.');
            return;
        }

        setLoading(true);
        try {
            const res = await axios.post(`${API_BASE_URL}/api/v1/bank-dealer/auth/enroll/initiate`, {
                email: email.trim().toLowerCase(),
                full_name: fullName.trim(),
                title: title.trim() || undefined,
                role: 'EXECUTION'
            });

            if (res.data?.already_enrolled) {
                setSuccessMsg('Account already enrolled. Switching to Login...');
                setTimeout(() => {
                    setMode('login');
                    resetMessages();
                }, 1500);
            } else if (res.data?.success) {
                setBankName(res.data.bank_name);
                setSuccessMsg(`Verification code sent to ${email.trim()}`);
                setEnrollStep(2);
            }
        } catch (err) {
            setError(err.response?.data?.detail || 'Could not verify corporate email domain.');
        } finally {
            setLoading(false);
        }
    };

    // -------------------------------------------------------------------------
    // HANDLERS: ENROLMENT (GATE 1 - VERIFY EMAIL OTP)
    // -------------------------------------------------------------------------
    const handleVerifyEmailOtp = async (e) => {
        e.preventDefault();
        resetMessages();

        if (!emailOtp.trim() || emailOtp.trim().length !== 6) {
            setError('Please enter the full 6-digit code received by email.');
            return;
        }

        setLoading(true);
        try {
            const res = await axios.post(`${API_BASE_URL}/api/v1/bank-dealer/auth/enroll/verify-email`, {
                email: email.trim().toLowerCase(),
                otp_code: emailOtp.trim()
            });

            if (res.data?.success) {
                setEnrollmentToken(res.data.enrollment_token);
                setQrCodeBase64(res.data.qr_code_base64);
                setTotpSecret(res.data.totp_secret);
                setBankName(res.data.bank_name);
                setSuccessMsg('Email verified. Scan the QR code below.');
                setEnrollStep(3);
            }
        } catch (err) {
            setError(err.response?.data?.detail || 'Invalid or expired verification code.');
        } finally {
            setLoading(false);
        }
    };

    // -------------------------------------------------------------------------
    // HANDLERS: ENROLMENT (GATE 2 - CONFIRM TOTP & PASSWORD)
    // -------------------------------------------------------------------------
    const handleConfirmTotpAndActivate = async (e) => {
        e.preventDefault();
        resetMessages();

        if (!totpCode.trim() || totpCode.trim().length !== 6) {
            setError('Please enter the active 6-digit code from Microsoft Authenticator.');
            return;
        }

        if (password.length < 8) {
            setError('Password must be at least 8 characters long.');
            return;
        }

        if (password !== confirmPassword) {
            setError('Passwords do not match.');
            return;
        }

        setLoading(true);
        try {
            const res = await axios.post(`${API_BASE_URL}/api/v1/bank-dealer/auth/enroll/confirm-totp`, {
                enrollment_token: enrollmentToken,
                totp_code: totpCode.trim(),
                password: password
            });

            if (res.data?.success && res.data?.access_token) {
                localStorage.setItem('grow_bank_dealer_token', res.data.access_token);
                localStorage.setItem('grow_bank_dealer_profile', JSON.stringify(res.data.dealer));
                navigate('/dealer/desk', { replace: true });
            }
        } catch (err) {
            setError(err.response?.data?.detail || 'Cryptographic handshake failed. Verify 6-digit code.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#070b12] text-slate-100 flex flex-col justify-center items-center p-4 selection:bg-emerald-500 selection:text-white">
            {/* Header Brand */}
            <div className="mb-8 text-center">
                <div className="inline-flex items-center space-x-2.5 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold tracking-wider uppercase mb-3">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Permanent Institutional Trading Desk</span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
                    Bank Counterparty Portal
                </h1>
                <p className="text-slate-400 text-sm mt-1 max-w-sm mx-auto">
                    Unified multi-customer RFQ execution desk secured by Microsoft Authenticator (RFC 6238 TOTP).
                </p>
            </div>

            {/* Main Auth Card */}
            <div className="w-full max-w-md bg-[#0f172a] border border-slate-800 rounded-2xl shadow-2xl p-6 sm:p-8 backdrop-blur-xl relative overflow-hidden">
                {/* Glow Accent */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-500" />

                {/* Mode Selector Tabs */}
                <div className="flex bg-slate-900/80 p-1 rounded-xl mb-6 border border-slate-800">
                    <button
                        type="button"
                        onClick={() => { setMode('login'); resetMessages(); }}
                        className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                            mode === 'login'
                                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/40'
                                : 'text-slate-400 hover:text-white'
                        }`}
                    >
                        Trader Login
                    </button>
                    <button
                        type="button"
                        onClick={() => { setMode('enroll'); setEnrollStep(1); resetMessages(); }}
                        className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                            mode === 'enroll'
                                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/40'
                                : 'text-slate-400 hover:text-white'
                        }`}
                    >
                        2FA Enrolment
                    </button>
                </div>

                {/* Alert Messages */}
                {error && (
                    <div className="mb-5 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-start space-x-2.5 text-xs text-rose-300 animate-fadeIn">
                        <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
                        <span className="leading-relaxed">{error}</span>
                    </div>
                )}
                {successMsg && (
                    <div className="mb-5 p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-start space-x-2.5 text-xs text-emerald-300 animate-fadeIn">
                        <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400 mt-0.5" />
                        <span className="leading-relaxed">{successMsg}</span>
                    </div>
                )}

                {/* ================================================================= */}
                {/* MODE A: INSTANT TRADER LOGIN                                      */}
                {/* ================================================================= */}
                {mode === 'login' && (
                    <form onSubmit={handleLogin} className="space-y-4">
                        <div>
                            <label className="block text-xs font-medium text-slate-300 mb-1.5">
                                Official Bank Corporate Email
                            </label>
                            <div className="relative">
                                <Mail className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="dealer@bank.com"
                                    required
                                    className="w-full pl-9 pr-3 py-2.5 bg-slate-900/90 border border-slate-700/80 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-slate-300 mb-1.5">
                                Permanent Password
                            </label>
                            <div className="relative">
                                <Lock className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••••••"
                                    required
                                    className="w-full pl-9 pr-3 py-2.5 bg-slate-900/90 border border-slate-700/80 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
                                />
                            </div>
                        </div>

                        <div>
                            <div className="flex justify-between items-center mb-1.5">
                                <label className="text-xs font-medium text-slate-300">
                                    6-Digit Authenticator Rolling Code
                                </label>
                                <span className="text-[10px] text-emerald-400 font-mono">RFC 6238 TOTP</span>
                            </div>
                            <div className="relative">
                                <Smartphone className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
                                <input
                                    type="text"
                                    maxLength={6}
                                    value={totpCode}
                                    onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ''))}
                                    placeholder="123456"
                                    required
                                    className="w-full pl-9 pr-3 py-2.5 bg-slate-900/90 border border-slate-700/80 rounded-xl text-base tracking-widest font-mono font-bold text-emerald-400 placeholder-slate-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
                                />
                            </div>
                            <p className="text-[11px] text-slate-500 mt-1">
                                Open Microsoft Authenticator or Google Authenticator on your phone.
                            </p>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full mt-2 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-sm font-bold rounded-xl shadow-lg shadow-emerald-950 flex items-center justify-center space-x-2 transition-all disabled:opacity-50"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    <span>Authenticating Desk...</span>
                                </>
                            ) : (
                                <>
                                    <span>Enter Unified Trading Desk</span>
                                    <ArrowRight className="w-4 h-4" />
                                </>
                            )}
                        </button>

                        <div className="pt-2 text-center">
                            <button
                                type="button"
                                onClick={() => { setMode('enroll'); setEnrollStep(1); resetMessages(); }}
                                className="text-xs text-slate-400 hover:text-emerald-400 transition-colors"
                            >
                                First time trading? <span className="underline font-semibold">Enrol Authenticator 2FA</span>
                            </button>
                        </div>
                    </form>
                )}

                {/* ================================================================= */}
                {/* MODE B: 2-FACTOR ENROLMENT HANDSHAKE                              */}
                {/* ================================================================= */}
                {mode === 'enroll' && (
                    <div>
                        {/* Step Progress Pills */}
                        <div className="flex items-center justify-between mb-6 px-1">
                            <div className={`flex items-center space-x-1.5 text-[11px] font-bold ${enrollStep >= 1 ? 'text-emerald-400' : 'text-slate-600'}`}>
                                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${enrollStep >= 1 ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-300' : 'bg-slate-800 text-slate-500'}`}>1</span>
                                <span>Domain</span>
                            </div>
                            <div className="w-6 h-[1px] bg-slate-800" />
                            <div className={`flex items-center space-x-1.5 text-[11px] font-bold ${enrollStep >= 2 ? 'text-emerald-400' : 'text-slate-600'}`}>
                                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${enrollStep >= 2 ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-300' : 'bg-slate-800 text-slate-500'}`}>2</span>
                                <span>Email OTP</span>
                            </div>
                            <div className="w-6 h-[1px] bg-slate-800" />
                            <div className={`flex items-center space-x-1.5 text-[11px] font-bold ${enrollStep >= 3 ? 'text-emerald-400' : 'text-slate-600'}`}>
                                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${enrollStep >= 3 ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-300' : 'bg-slate-800 text-slate-500'}`}>3</span>
                                <span>Bind Phone</span>
                            </div>
                        </div>

                        {/* STEP 1: DOMAIN PROOF */}
                        {enrollStep === 1 && (
                            <form onSubmit={handleInitiateEnroll} className="space-y-4">
                                <div>
                                    <label className="block text-xs font-medium text-slate-300 mb-1.5">
                                        Corporate Bank Email
                                    </label>
                                    <div className="relative">
                                        <Mail className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
                                        <input
                                            type="email"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            placeholder="karim.fathy@cibeg.com"
                                            required
                                            className="w-full pl-9 pr-3 py-2.5 bg-slate-900/90 border border-slate-700/80 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
                                        />
                                    </div>
                                    <p className="text-[11px] text-slate-500 mt-1">
                                        Must be an authorized corporate domain (e.g. @cibeg.com, @banquemisr.com).
                                    </p>
                                </div>

                                <div>
                                    <label className="block text-xs font-medium text-slate-300 mb-1.5">
                                        Full Name
                                    </label>
                                    <div className="relative">
                                        <User className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
                                        <input
                                            type="text"
                                            value={fullName}
                                            onChange={(e) => setFullName(e.target.value)}
                                            placeholder="Karim Fathy"
                                            required
                                            className="w-full pl-9 pr-3 py-2.5 bg-slate-900/90 border border-slate-700/80 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-medium text-slate-300 mb-1.5">
                                        Trading Desk Title (Optional)
                                    </label>
                                    <input
                                        type="text"
                                        value={title}
                                        onChange={(e) => setTitle(e.target.value)}
                                        placeholder="Senior FX Dealer / Treasury Sales"
                                        className="w-full px-3 py-2.5 bg-slate-900/90 border border-slate-700/80 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
                                    />
                                </div>

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full mt-2 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-sm font-bold rounded-xl shadow-lg shadow-emerald-950 flex items-center justify-center space-x-2 transition-all disabled:opacity-50"
                                >
                                    {loading ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            <span>Verifying Bank Domain...</span>
                                        </>
                                    ) : (
                                        <>
                                            <span>Dispatch 6-Digit Email Code</span>
                                            <ArrowRight className="w-4 h-4" />
                                        </>
                                    )}
                                </button>
                            </form>
                        )}

                        {/* STEP 2: VERIFY EMAIL CODE */}
                        {enrollStep === 2 && (
                            <form onSubmit={handleVerifyEmailOtp} className="space-y-4">
                                <div className="text-center pb-2">
                                    <div className="w-12 h-12 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center justify-center mx-auto mb-3">
                                        <Mail className="w-6 h-6 text-emerald-400" />
                                    </div>
                                    <h3 className="text-sm font-bold text-white">Check Your Corporate Inbox</h3>
                                    <p className="text-xs text-slate-400 mt-1">
                                        We sent a single-use 6-digit code to <strong className="text-slate-200">{email}</strong>.
                                    </p>
                                </div>

                                <div>
                                    <input
                                        type="text"
                                        maxLength={6}
                                        value={emailOtp}
                                        onChange={(e) => setEmailOtp(e.target.value.replace(/\D/g, ''))}
                                        placeholder="••••••"
                                        autoFocus
                                        required
                                        className="w-full text-center py-3 bg-slate-900 border border-slate-700 rounded-xl text-2xl font-mono tracking-[0.3em] font-extrabold text-emerald-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                                    />
                                </div>

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-sm font-bold rounded-xl shadow-lg shadow-emerald-950 flex items-center justify-center space-x-2 transition-all disabled:opacity-50"
                                >
                                    {loading ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            <span>Verifying Code...</span>
                                        </>
                                    ) : (
                                        <>
                                            <span>Verify & Proceed to Phone Setup</span>
                                            <ArrowRight className="w-4 h-4" />
                                        </>
                                    )}
                                </button>

                                <div className="flex justify-between items-center pt-2">
                                    <button
                                        type="button"
                                        onClick={() => setEnrollStep(1)}
                                        className="text-xs text-slate-500 hover:text-slate-300 flex items-center space-x-1"
                                    >
                                        <ChevronLeft className="w-3.5 h-3.5" />
                                        <span>Change Email</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleInitiateEnroll}
                                        disabled={loading}
                                        className="text-xs text-emerald-400 hover:underline"
                                    >
                                        Resend Code
                                    </button>
                                </div>
                            </form>
                        )}

                        {/* STEP 3: SCAN QR & SET PASSWORD */}
                        {enrollStep === 3 && (
                            <form onSubmit={handleConfirmTotpAndActivate} className="space-y-4">
                                <div className="text-center pb-2">
                                    <h3 className="text-sm font-bold text-white">Scan with Microsoft Authenticator</h3>
                                    <p className="text-xs text-slate-400 mt-0.5">
                                        Open Microsoft Authenticator or Google Authenticator on your smartphone and scan this code.
                                    </p>
                                </div>

                                {/* QR Code Display */}
                                {qrCodeBase64 && (
                                    <div className="bg-white p-3 rounded-2xl w-44 h-44 mx-auto flex items-center justify-center shadow-xl border-4 border-slate-800">
                                        <img src={qrCodeBase64} alt="Authenticator QR Code" className="w-full h-full object-contain" />
                                    </div>
                                )}

                                {totpSecret && (
                                    <div className="bg-slate-900/80 border border-slate-800 p-2 rounded-lg text-center">
                                        <span className="text-[10px] text-slate-500 block uppercase font-mono">Manual Secret Key</span>
                                        <code className="text-xs font-mono font-bold text-emerald-400 tracking-wider select-all">{totpSecret}</code>
                                    </div>
                                )}

                                <div>
                                    <label className="block text-xs font-medium text-slate-300 mb-1.5">
                                        6-Digit Rolling Code from Phone
                                    </label>
                                    <input
                                        type="text"
                                        maxLength={6}
                                        value={totpCode}
                                        onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ''))}
                                        placeholder="123456"
                                        required
                                        className="w-full text-center py-2 bg-slate-900 border border-slate-700 rounded-xl text-lg font-mono tracking-widest font-extrabold text-emerald-400 focus:outline-none focus:border-emerald-500"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <label className="block text-[11px] font-medium text-slate-300 mb-1">
                                            Create Password
                                        </label>
                                        <input
                                            type="password"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            placeholder="Min 8 chars"
                                            required
                                            className="w-full px-2.5 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[11px] font-medium text-slate-300 mb-1">
                                            Confirm Password
                                        </label>
                                        <input
                                            type="password"
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            placeholder="Confirm"
                                            required
                                            className="w-full px-2.5 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
                                        />
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-sm font-bold rounded-xl shadow-lg shadow-emerald-950 flex items-center justify-center space-x-2 transition-all disabled:opacity-50"
                                >
                                    {loading ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            <span>Binding Authenticator...</span>
                                        </>
                                    ) : (
                                        <>
                                            <ShieldCheck className="w-4 h-4" />
                                            <span>Bind & Activate Permanent Desk</span>
                                        </>
                                    )}
                                </button>
                            </form>
                        )}
                    </div>
                )}
            </div>

            {/* Footer Trust Shield */}
            <div className="mt-8 text-center text-xs text-slate-500 flex items-center space-x-3">
                <span>RFC 6238 Standard</span>
                <span>&bull;</span>
                <span>Zero Plaintext Passwords</span>
                <span>&bull;</span>
                <span>HMAC-SHA256 Signed</span>
            </div>
        </div>
    );
}
