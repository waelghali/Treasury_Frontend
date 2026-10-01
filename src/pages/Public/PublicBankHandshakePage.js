import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { 
    Landmark, Shield, CheckCircle2, AlertCircle, Loader2, Users, 
    ArrowRight, Check, RefreshCw, Mail, Calendar, Building2
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
                const res = await axios.get(`${API_BASE_URL}/api/v1/public-quotation/bank-handshake/${token}`);
                setData(res.data);
                if (res.data.handshake_confirmed_at) {
                    setConfirmedAt(res.data.handshake_confirmed_at);
                }
            } catch (err) {
                console.error("Failed to load handshake details:", err);
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
            const res = await axios.post(`${API_BASE_URL}/api/v1/public-quotation/bank-handshake/${token}/confirm`, {});
            setConfirmedAt(res.data.confirmed_at || new Date().toISOString());
        } catch (err) {
            console.error("Failed to confirm handshake:", err);
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
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    ⚡ Execution Dealer (Firm Bidding)
                </span>
            );
        }
        if (r === 'APPROVER') {
            return (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    🛡️ Approver
                </span>
            );
        }
        return (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-500/10 text-slate-400 border border-slate-500/20">
                👁️ View Only
            </span>
        );
    };

    return (
        <div className="min-h-screen bg-[#070d1e] text-slate-100 flex flex-col justify-between selection:bg-emerald-500 selection:text-white font-sans antialiased">
            {/* Top Bar */}
            <header className="border-b border-slate-800/80 bg-[#0b132b]/80 backdrop-blur-md px-6 py-4 sticky top-0 z-50">
                <div className="max-w-4xl mx-auto flex items-center justify-between">
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
                            <p className="text-xs text-slate-400">Institutional Governance &amp; Trading Roster Confirmation</p>
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
            <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-8">
                {loading ? (
                    <div className="py-24 flex flex-col items-center justify-center gap-4 text-center">
                        <Loader2 className="w-10 h-10 text-emerald-400 animate-spin" />
                        <p className="text-sm text-slate-300 font-medium">Validating secure counterparty verification link...</p>
                    </div>
                ) : error ? (
                    <div className="max-w-lg mx-auto bg-rose-950/30 border border-rose-500/40 rounded-2xl p-8 text-center space-y-4 shadow-2xl backdrop-blur-sm">
                        <div className="w-14 h-14 rounded-2xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center mx-auto text-rose-400">
                            <AlertCircle className="w-8 h-8" />
                        </div>
                        <h2 className="text-xl font-bold text-white">Verification Link Expired or Invalid</h2>
                        <p className="text-sm text-slate-300 leading-relaxed">{error}</p>
                        <p className="text-xs text-slate-400 pt-2 border-t border-rose-500/20">
                            Please contact the treasury administration team of your corporate counterparty to request a refreshed confirmation link.
                        </p>
                    </div>
                ) : data && (
                    <div className="space-y-6">
                        {/* Hero Card */}
                        <div className="bg-gradient-to-br from-[#0e1a38] via-[#0b142c] to-[#070d1e] border border-slate-700/80 rounded-2xl p-6 sm:p-8 shadow-xl">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-6 mb-6">
                                <div>
                                    <span className="text-xs font-bold text-emerald-400 uppercase tracking-widest flex items-center gap-1.5 mb-2">
                                        <Shield className="w-3.5 h-3.5" /> Bilateral Counterparty Handshake
                                    </span>
                                    <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                                        {data.bank_name}
                                    </h2>
                                    <p className="text-sm text-slate-300 mt-1">
                                        Trading Desk Representatives for <strong className="text-white">{data.customer_name}</strong>
                                    </p>
                                </div>

                                {confirmedAt ? (
                                    <div className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-bold shadow-lg">
                                        <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                                        <div>
                                            <div className="text-emerald-300 font-extrabold">Handshake Confirmed</div>
                                            <div className="text-[11px] text-emerald-400/80 font-normal">
                                                {new Date(confirmedAt).toLocaleString()}
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-bold">
                                        <RefreshCw className="w-4 h-4 animate-spin text-amber-400" />
                                        <span>Confirmation Pending</span>
                                    </div>
                                )}
                            </div>

                            {/* Authorized Officer Badge */}
                            <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-300">
                                <div>
                                    <span className="text-slate-400 font-medium block text-[11px] uppercase tracking-wider mb-0.5">
                                        Designated Authorized Contact
                                    </span>
                                    <div className="font-semibold text-white text-sm flex items-center gap-2">
                                        <Mail className="w-3.5 h-3.5 text-emerald-400" />
                                        <span>{data.authorized_contact_email}</span>
                                        {data.authorized_contact_name && (
                                            <span className="text-slate-400 font-normal">({data.authorized_contact_name})</span>
                                        )}
                                    </div>
                                </div>
                                <div className="text-slate-400 text-[11px] max-w-xs leading-relaxed">
                                    Official contact designated for approving trading access and dealer roster changes.
                                </div>
                            </div>
                        </div>

                        {/* Roster Table Card */}
                        <div className="bg-[#0b142c] border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
                            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
                                <div className="flex items-center gap-2.5">
                                    <Users className="w-4 h-4 text-emerald-400" />
                                    <h3 className="text-sm font-bold uppercase tracking-wider text-slate-200">
                                        Registered Trading Representatives ({data.contacts?.length || 0})
                                    </h3>
                                </div>
                                <span className="text-xs text-slate-400">
                                    Authorized on {data.customer_name} Treasury Portal
                                </span>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse text-xs">
                                    <thead>
                                        <tr className="bg-slate-900/80 border-b border-slate-800 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                                            <th className="py-3 px-6">Representative Email</th>
                                            <th className="py-3 px-6">Name / Title</th>
                                            <th className="py-3 px-6">Quoting Authority</th>
                                            <th className="py-3 px-6 text-right">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-800/60 font-medium">
                                        {data.contacts && data.contacts.length > 0 ? (
                                            data.contacts.map((contact, idx) => (
                                                <tr key={idx} className="hover:bg-slate-800/40 transition-colors">
                                                    <td className="py-3.5 px-6 font-mono text-white text-xs font-semibold">
                                                        {contact.email}
                                                    </td>
                                                    <td className="py-3.5 px-6 text-slate-300">
                                                        {contact.name || '—'}
                                                    </td>
                                                    <td className="py-3.5 px-6">
                                                        {getRoleBadge(contact.role)}
                                                    </td>
                                                    <td className="py-3.5 px-6 text-right">
                                                        <span className="inline-flex items-center gap-1 text-emerald-400 font-semibold text-xs">
                                                            <Check className="w-3.5 h-3.5" /> Active
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan="4" className="py-8 text-center text-slate-400">
                                                    No trading representatives configured yet.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Action Box */}
                        <div className="bg-gradient-to-r from-slate-900/90 via-[#0e1a38] to-slate-900/90 border border-slate-700/80 rounded-2xl p-6 sm:p-8 text-center space-y-4 shadow-xl">
                            {confirmedAt ? (
                                <div className="space-y-2">
                                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 mb-2">
                                        <CheckCircle2 className="w-6 h-6" />
                                    </div>
                                    <h4 className="text-lg font-bold text-white">Trading Roster Confirmed</h4>
                                    <p className="text-xs text-slate-300 max-w-md mx-auto leading-relaxed">
                                        Thank you. The trading representatives listed above are formally verified to represent <strong>{data.bank_name}</strong> for treasury quotes and firm execution with <strong>{data.customer_name}</strong>.
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <div>
                                        <h4 className="text-lg font-bold text-white">Confirm Counterparty Roster</h4>
                                        <p className="text-xs text-slate-300 max-w-lg mx-auto mt-1 leading-relaxed">
                                            By clicking confirm, you verify that the personnel and quoting authorities listed above are accurate and approved by {data.bank_name}.
                                        </p>
                                    </div>

                                    <button
                                        onClick={handleConfirm}
                                        disabled={submitting}
                                        className="inline-flex items-center gap-2.5 px-8 py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-sm shadow-xl shadow-emerald-500/20 hover:shadow-emerald-500/30 transition-all transform active:scale-95 disabled:opacity-50 disabled:pointer-events-none"
                                    >
                                        {submitting ? (
                                            <>
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                                <span>Recording Confirmation...</span>
                                            </>
                                        ) : (
                                            <>
                                                <CheckCircle2 className="w-5 h-5" />
                                                <span>Confirm &amp; Complete Handshake</span>
                                                <ArrowRight className="w-4 h-4" />
                                            </>
                                        )}
                                    </button>
                                </div>
                            )}

                            <p className="text-[11px] text-slate-400 pt-3 border-t border-slate-800">
                                Need to add new dealers, remove departed staff, or modify roles? Simply reply directly to the roster email or contact {data.customer_name} Treasury.
                            </p>
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
