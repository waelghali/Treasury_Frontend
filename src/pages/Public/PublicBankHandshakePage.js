import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { 
    Landmark, Shield, CheckCircle2, AlertCircle, Loader2, Users, 
    ArrowRight, Check, RefreshCw, Mail, Calendar, Building2, UserCheck
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
    if (url) return url.replace(/\/api\/v1\/?$/, '');
    return DIRECT_BACKEND_URL;
};

const API_BASE_URL = getApiBaseUrl();

export default function PublicBankHandshakePage() {
    const { token } = useParams();
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [data, setData] = useState(null);
    const [error, setError] = useState(null);
    const [confirmedAt, setConfirmedAt] = useState(null);
    const [isDealerMode, setIsDealerMode] = useState(true);

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

    const handleConfirm = async () => {
        try {
            setSubmitting(true);
            const endpoint = isDealerMode 
                ? `${API_BASE_URL}/api/v1/public-quotation/dealer-handshake/${token}/accept`
                : `${API_BASE_URL}/api/v1/public-quotation/bank-handshake/${token}/confirm`;

            const res = await axios.post(endpoint, {});
            setConfirmedAt(res.data.accepted_at || res.data.confirmed_at || new Date().toISOString());
        } catch (err) {
            console.error("Failed to complete handshake:", err);
            const msg = err.response?.data?.detail || "Could not complete handshake confirmation. Please try again or contact support.";
            alert(msg);
        } finally {
            setSubmitting(false);
        }
    };

    const getRoleBadge = (role) => {
        const r = (role || 'EXECUTION').toUpperCase();
        if (r === 'EXECUTION') {
            return (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    ⚡ Execution Dealer (Firm Bidding)
                </span>
            );
        }
        if (r === 'APPROVER') {
            return (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    🛡️ Approver
                </span>
            );
        }
        return (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-500/10 text-slate-400 border border-slate-500/20">
                👁️ View Only
            </span>
        );
    };

    return (
        <div className="min-h-screen bg-[#070d1e] text-slate-100 flex flex-col justify-between selection:bg-emerald-500 selection:text-white font-sans antialiased">
            {/* Top Bar */}
            <header className="border-b border-slate-800/80 bg-[#0b132b]/80 backdrop-blur-md px-6 py-4 sticky top-0 z-50">
                <div className="max-w-3xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                            <Landmark className="w-5 h-5 text-slate-950 font-bold" />
                        </div>
                        <div>
                            <h1 className="font-extrabold text-base tracking-tight text-white flex items-center gap-2">
                                Grow Treasury Platform
                                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                    Counterparty Verification
                                </span>
                            </h1>
                            <p className="text-xs text-slate-400">Institutional Treasury &amp; Trading Access Confirmation</p>
                        </div>
                    </div>
                    {data?.customer_name && (
                        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800/60 border border-slate-700/60 text-xs text-slate-300">
                            <Building2 className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Client: <strong className="text-white">{data.customer_name}</strong></span>
                        </div>
                    )}
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 max-w-3xl w-full mx-auto px-4 sm:px-6 py-10">
                {loading ? (
                    <div className="py-24 flex flex-col items-center justify-center gap-4 text-center">
                        <Loader2 className="w-10 h-10 text-emerald-400 animate-spin" />
                        <p className="text-sm text-slate-300 font-medium">Validating secure invitation token...</p>
                    </div>
                ) : error ? (
                    <div className="max-w-lg mx-auto bg-rose-950/30 border border-rose-500/40 rounded-2xl p-8 text-center space-y-4 shadow-2xl backdrop-blur-sm">
                        <div className="w-14 h-14 rounded-2xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center mx-auto text-rose-400">
                            <AlertCircle className="w-8 h-8" />
                        </div>
                        <h2 className="text-xl font-bold text-white">Invitation Expired or Invalid</h2>
                        <p className="text-sm text-slate-300 leading-relaxed">{error}</p>
                        <p className="text-xs text-slate-400 pt-2 border-t border-rose-500/20">
                            Please contact the corporate treasury team to request a refreshed invitation.
                        </p>
                    </div>
                ) : data && isDealerMode ? (
                    /* Dealer Handshake Experience */
                    <div className="space-y-6">
                        <div className="bg-gradient-to-br from-[#0e1a38] via-[#0b142c] to-[#070d1e] border border-slate-700/80 rounded-2xl p-6 sm:p-8 shadow-xl">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-6 mb-6">
                                <div>
                                    <span className="text-xs font-bold text-emerald-400 uppercase tracking-widest flex items-center gap-1.5 mb-2">
                                        <Shield className="w-3.5 h-3.5" /> Counterparty Access Invitation
                                    </span>
                                    <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                                        {data.bank_name}
                                    </h2>
                                    <p className="text-sm text-slate-300 mt-1">
                                        Treasury Counterparty Desk for <strong className="text-white">{data.customer_name}</strong>
                                    </p>
                                </div>

                                {confirmedAt ? (
                                    <div className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-bold shadow-lg">
                                        <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                                        <div>
                                            <div className="text-emerald-300 font-extrabold">Access Active</div>
                                            <div className="text-[11px] text-emerald-400/80 font-normal">
                                                {new Date(confirmedAt).toLocaleString()}
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-bold">
                                        <RefreshCw className="w-4 h-4 animate-spin text-amber-400" />
                                        <span>Acceptance Pending</span>
                                    </div>
                                )}
                            </div>

                            {/* Representative Profile Card */}
                            <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 space-y-3">
                                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                                    Your Designated Trading Profile
                                </h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                                    <div>
                                        <span className="text-slate-400 block text-[11px]">Representative Email</span>
                                        <span className="font-mono text-white text-sm font-semibold">{data.email}</span>
                                    </div>
                                    <div>
                                        <span className="text-slate-400 block text-[11px]">Name / Title</span>
                                        <span className="text-white text-sm font-semibold">{data.title || 'Desk Representative'}</span>
                                    </div>
                                    <div className="sm:col-span-2">
                                        <span className="text-slate-400 block text-[11px] mb-1">Quoting Authority Role</span>
                                        <div>{getRoleBadge(data.role)}</div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Action Card */}
                        <div className="bg-gradient-to-r from-slate-900/90 via-[#0e1a38] to-slate-900/90 border border-slate-700/80 rounded-2xl p-6 sm:p-8 text-center space-y-4 shadow-xl">
                            {confirmedAt ? (
                                <div className="space-y-2">
                                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 mb-2">
                                        <CheckCircle2 className="w-6 h-6" />
                                    </div>
                                    <h4 className="text-lg font-bold text-white">Welcome Aboard!</h4>
                                    <p className="text-xs text-slate-300 max-w-md mx-auto leading-relaxed">
                                        Your trading access has been confirmed. You will now receive RFQs and quoting invitations dispatched by <strong>{data.customer_name}</strong>'s treasury desk.
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <div>
                                        <h4 className="text-lg font-bold text-white">Accept Invitation &amp; Activate Trading Access</h4>
                                        <p className="text-xs text-slate-300 max-w-lg mx-auto mt-1 leading-relaxed">
                                            By clicking accept, you confirm your contact details and agree to represent {data.bank_name} for transactions on {data.customer_name}'s treasury platform.
                                        </p>
                                    </div>

                                    <button
                                        onClick={handleConfirm}
                                        disabled={submitting}
                                        className="inline-flex items-center gap-2.5 px-8 py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-sm shadow-xl shadow-emerald-500/20 hover:shadow-emerald-500/30 transition-all transform active:scale-95 disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
                                    >
                                        {submitting ? (
                                            <>
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                                <span>Activating Access...</span>
                                            </>
                                        ) : (
                                            <>
                                                <UserCheck className="w-5 h-5" />
                                                <span>🤝 Accept Invitation &amp; Activate</span>
                                                <ArrowRight className="w-4 h-4" />
                                            </>
                                        )}
                                    </button>
                                </div>
                            )}

                            <p className="text-[11px] text-slate-400 pt-3 border-t border-slate-800">
                                Need to modify your role or have questions? Simply reply to your invitation email.
                            </p>
                        </div>
                    </div>
                ) : (
                    /* Fallback Bank Roster Mode */
                    <div className="space-y-6">
                        <div className="bg-[#0e1a38] border border-slate-700/80 rounded-2xl p-6 shadow-xl text-center">
                            <h2 className="text-xl font-bold text-white">{data.bank_name}</h2>
                            <p className="text-xs text-slate-400 mt-1">Trading Counterparty for {data.customer_name}</p>
                        </div>
                    </div>
                )}
            </main>

            {/* Footer */}
            <footer className="border-t border-slate-800/80 bg-[#070d1e] py-6 px-4 text-center text-xs text-slate-400">
                <p>Grow Treasury Platform &bull; Secure Institutional Counterparty Network</p>
            </footer>
        </div>
    );
}
