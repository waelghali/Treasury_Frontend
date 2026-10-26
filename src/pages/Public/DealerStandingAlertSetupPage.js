// src/pages/Public/DealerStandingAlertSetupPage.js
import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { Smartphone, CheckCircle, Bell, BellOff, AlertCircle, Share2, PlusSquare, ShieldCheck, Zap } from 'lucide-react';
import { toast } from 'react-toastify';
import {
    isPushSupported,
    isIosDevice,
    isStandalone,
    getStandingSetup,
    subscribeStandingSetup,
    optOutStandingSetup
} from '../../services/dealerPushService';

export default function DealerStandingAlertSetupPage() {
    const { setupToken } = useParams();
    const [searchParams] = useSearchParams();
    const isOptOutRequested = searchParams.get('optout') === 'true';

    const [loading, setLoading] = useState(true);
    const [subscribing, setSubscribing] = useState(false);
    const [info, setInfo] = useState(null);
    const [error, setError] = useState(null);
    const [isSuccess, setIsSuccess] = useState(false);
    const [optedOut, setOptedOut] = useState(false);

    useEffect(() => {
        loadSetupData();
    }, [setupToken]);

    const loadSetupData = async () => {
        try {
            setLoading(true);
            const data = await getStandingSetup(setupToken);
            setInfo(data);
            if (data.opted_out || isOptOutRequested) {
                setOptedOut(true);
                if (isOptOutRequested && !data.opted_out) {
                    await optOutStandingSetup(setupToken);
                }
            }
        } catch (err) {
            console.error('Failed to load setup data:', err);
            setError(err.response?.data?.detail || 'This standing setup link is invalid or has expired.');
        } finally {
            setLoading(false);
        }
    };

    const handleEnablePush = async () => {
        if (!isPushSupported() && isIosDevice() && !isStandalone()) {
            toast.info('Please add this page to your Home Screen first to enable push on iOS.');
            return;
        }

        try {
            setSubscribing(true);
            await subscribeStandingSetup(setupToken);
            setIsSuccess(true);
            toast.success('Mobile alerts successfully enabled for your dealer desk!');
        } catch (err) {
            console.error('Failed to enable standing push:', err);
            toast.error(err.response?.data?.detail || err.message || 'Could not enable mobile alerts.');
        } finally {
            setSubscribing(false);
        }
    };

    const handleOptOut = async () => {
        if (!window.confirm('Are you sure you want to stop receiving mobile alert reminders?')) return;
        try {
            await optOutStandingSetup(setupToken);
            setOptedOut(true);
            toast.info('You will no longer receive reminders to enable mobile alerts.');
        } catch (err) {
            toast.error('Failed to update preference.');
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
                <div className="text-center text-slate-300">
                    <div className="w-10 h-10 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                    <p className="text-xs font-medium">Loading institutional desk configuration...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
                <div className="max-w-md w-full bg-white rounded-2xl p-6 text-center shadow-xl">
                    <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mx-auto mb-3">
                        <AlertCircle size={24} />
                    </div>
                    <h2 className="text-base font-bold text-slate-900">Setup Link Invalid</h2>
                    <p className="text-xs text-slate-600 mt-2 leading-relaxed">{error}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-4 sm:p-6">
            <div className="max-w-lg w-full bg-slate-900 rounded-3xl border border-slate-800 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="p-6 bg-gradient-to-r from-emerald-950 via-slate-900 to-indigo-950 border-b border-slate-800">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-emerald-500/20 text-emerald-400 rounded-2xl border border-emerald-500/30">
                            <Smartphone size={24} />
                        </div>
                        <div>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 block">Grow Treasury Desk</span>
                            <h1 className="text-lg font-bold text-white">Instant Quotation Mobile Alerts</h1>
                        </div>
                    </div>
                </div>

                {/* Body */}
                <div className="p-6 space-y-5">
                    {optedOut ? (
                        <div className="text-center py-6">
                            <div className="w-12 h-12 rounded-2xl bg-slate-800 text-slate-400 flex items-center justify-center mx-auto mb-3">
                                <BellOff size={22} />
                            </div>
                            <h3 className="font-bold text-sm text-slate-200">Reminder Opt-Out Confirmed</h3>
                            <p className="text-xs text-slate-400 mt-1 leading-relaxed max-w-sm mx-auto">
                                You will not receive any further email invitations to enable mobile alerts for <strong>{info?.email}</strong>.
                            </p>
                        </div>
                    ) : isSuccess ? (
                        <div className="text-center py-6 space-y-3">
                            <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center mx-auto shadow-lg shadow-emerald-950">
                                <CheckCircle size={28} />
                            </div>
                            <h3 className="font-bold text-base text-white">Mobile Alerts Activated!</h3>
                            <p className="text-xs text-slate-300 leading-relaxed max-w-sm mx-auto">
                                Your phone will now receive real-time lock-screen vibration and sound alerts whenever your desk ({info?.email}) is invited to an RFQ by <strong>any corporate client</strong>.
                            </p>
                            <div className="p-3 bg-slate-800/80 rounded-xl border border-slate-700 text-[11px] text-slate-300 inline-block">
                                ✓ One-time enable covers all future RFQ invitations
                            </div>
                        </div>
                    ) : (
                        <>
                            <div className="p-3.5 bg-slate-800/60 border border-slate-800 rounded-2xl flex items-center justify-between text-xs">
                                <div>
                                    <span className="text-[10px] text-slate-400 block uppercase tracking-wide">Registered Counterparty</span>
                                    <span className="font-bold text-white">{info?.bank_name}</span>
                                </div>
                                <span className="font-mono text-emerald-300 text-[11px] bg-emerald-950/60 px-2.5 py-1 rounded-lg border border-emerald-800/50">
                                    {info?.email}
                                </span>
                            </div>

                            <div className="space-y-2.5 text-xs text-slate-300">
                                <div className="flex items-start gap-2.5">
                                    <Zap size={16} className="text-emerald-400 shrink-0 mt-0.5" />
                                    <span><strong>Never miss a tight window:</strong> Get alerted the second an RFQ is released (30–120s windows).</span>
                                </div>
                                <div className="flex items-start gap-2.5">
                                    <ShieldCheck size={16} className="text-emerald-400 shrink-0 mt-0.5" />
                                    <span><strong>Universal coverage:</strong> Works for all corporate clients inviting your bank. Zero app store installs.</span>
                                </div>
                            </div>

                            {/* iOS instructions if not standalone */}
                            {isIosDevice() && !isStandalone() && (
                                <div className="p-4 bg-indigo-950/50 border border-indigo-800/50 rounded-2xl space-y-2 text-xs text-indigo-200">
                                    <p className="font-bold flex items-center gap-1.5 text-white">
                                        <Smartphone size={14} className="text-indigo-400" /> iPhone / iPad Setup Required:
                                    </p>
                                    <p className="text-[11px] text-indigo-300 leading-relaxed">
                                        Apple requires saving this page to your Home Screen before alerts can be enabled:
                                    </p>
                                    <ol className="list-decimal pl-4 space-y-1 text-[11px] text-white">
                                        <li>Tap Safari's <strong>Share</strong> button (bottom square with arrow up).</li>
                                        <li>Select <strong>Add to Home Screen</strong>.</li>
                                        <li>Open Grow from your Home Screen to finish setup.</li>
                                    </ol>
                                </div>
                            )}

                            <button
                                type="button"
                                onClick={handleEnablePush}
                                disabled={subscribing}
                                className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-2xl text-xs transition-all shadow-lg shadow-emerald-950 cursor-pointer flex items-center justify-center gap-2 active:scale-98 disabled:opacity-50"
                            >
                                <Bell size={16} />
                                <span>{subscribing ? 'Activating Alerts...' : 'Enable Phone Alerts on this Device'}</span>
                            </button>
                        </>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 bg-slate-900 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500">
                    <span>Grow Treasury Platform</span>
                    {!optedOut && !isSuccess && (
                        <button
                            type="button"
                            onClick={handleOptOut}
                            className="hover:text-slate-400 underline cursor-pointer"
                        >
                            Don't remind me again
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
