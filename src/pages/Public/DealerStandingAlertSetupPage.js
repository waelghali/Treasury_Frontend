// src/pages/Public/DealerStandingAlertSetupPage.js
import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { Smartphone, CheckCircle, Bell, BellOff, AlertCircle, Share2, PlusSquare, ShieldCheck, Zap, AlertTriangle, RefreshCw } from 'lucide-react';
import { toast } from 'react-toastify';
import {
    isPushSupported,
    isIosDevice,
    isStandalone,
    isPermissionDenied,
    getStandingSetup,
    subscribeStandingSetup,
    sendDealerSetupOtp,
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
    const [isBlocked, setIsBlocked] = useState(false);

    // OTP Verification for unattended laptop protection
    const [otpCode, setOtpCode] = useState('');
    const [otpSent, setOtpSent] = useState(false);
    const [sendingOtp, setSendingOtp] = useState(false);

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
            } else {
                // Auto-send verification code to bank email on load
                triggerSendOtp(false);
            }
        } catch (err) {
            console.error('Failed to load setup data:', err);
            setError(err.response?.data?.detail || 'This standing setup link is invalid or has expired.');
        } finally {
            setLoading(false);
        }
    };

    const triggerSendOtp = async (isManual = false) => {
        setSendingOtp(true);
        try {
            const res = await sendDealerSetupOtp(setupToken);
            setOtpSent(true);
            if (isManual) {
                toast.success(res?.message || 'Verification code sent to your bank email.');
            } else {
                toast.info(`Verification code sent to ${info?.email || 'your bank email'}. Check your inbox.`);
            }
        } catch (err) {
            console.error('Failed to send OTP:', err);
            const msg = err.response?.data?.detail || err.message || 'Could not send verification code.';
            toast.error(msg);
        } finally {
            setSendingOtp(false);
        }
    };

    const handleEnablePush = async (e) => {
        if (e && e.preventDefault) e.preventDefault();

        if (!otpCode.trim() || otpCode.trim().length < 4) {
            toast.error('Please enter the 6-digit verification code sent to your bank email.');
            return;
        }

        if (isPermissionDenied()) {
            setIsBlocked(true);
            toast.warn('Notifications are blocked by your browser settings.');
            return;
        }

        if (!isPushSupported() && isIosDevice() && !isStandalone()) {
            toast.info('Please add this page to your Home Screen first to enable push on iOS.');
            return;
        }

        try {
            setSubscribing(true);
            await subscribeStandingSetup(setupToken, null, otpCode.trim());
            setIsSuccess(true);
            toast.success('Mobile alerts successfully enabled for your dealer desk!');
        } catch (err) {
            console.error('Failed to enable standing push:', err);
            if (err.code === 'PERMISSION_DENIED' || isPermissionDenied()) {
                setIsBlocked(true);
                toast.warn('Notifications are currently blocked by your browser.');
            } else {
                toast.error(err.response?.data?.detail || err.message || 'Could not enable mobile alerts.');
            }
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
                    {info?.allow_dealer_mobile_alerts === false ? (
                        <div className="text-center py-6">
                            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center mx-auto mb-3">
                                <ShieldCheck size={22} />
                            </div>
                            <h3 className="font-bold text-sm text-slate-200">Mobile Alerts Disabled by Institutional Policy</h3>
                            <p className="text-xs text-slate-400 mt-2 leading-relaxed max-w-sm mx-auto">
                                Your institution (<strong>{info?.bank_name}</strong>) has disabled mobile alerts by administrator compliance policy.
                            </p>
                            <div className="mt-4 p-3 bg-slate-800/80 rounded-xl border border-slate-700 text-[11px] text-slate-400 inline-block">
                                Quotations will continue to reach your desk via secure email invitation.
                            </div>
                        </div>
                    ) : optedOut ? (
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

                            {/* Browser Blocked Guide */}
                            {isBlocked && (
                                <div className="p-4 bg-amber-950/40 border border-amber-500/40 rounded-2xl space-y-3 text-xs text-amber-200">
                                    <div className="flex items-center gap-2 text-amber-400 font-bold">
                                        <AlertTriangle size={16} />
                                        <span>Notifications are Blocked in Your Browser</span>
                                    </div>
                                    <p className="text-[11px] text-amber-300/90 leading-relaxed">
                                        To enable lock-screen alerts, you need to unblock notifications in your browser's address bar:
                                    </p>
                                    <ol className="list-decimal pl-4 space-y-1.5 text-[11px] text-white font-medium">
                                        <li>Click the <strong>Lock 🔒</strong> or <strong>Site Settings 🎛️</strong> icon at the top left of your browser address bar.</li>
                                        <li>Find <strong>Notifications</strong> and change it to <strong className="text-emerald-400">Allow</strong>.</li>
                                        <li>Click <strong>Check Again</strong> below.</li>
                                    </ol>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            if (!isPermissionDenied()) {
                                                setIsBlocked(false);
                                                toast.success('Permission unblocked! Tap the button below to activate alerts.');
                                            } else {
                                                toast.info('Still blocked. Please toggle Notifications to "Allow" in the lock icon.');
                                            }
                                        }}
                                        className="w-full py-2 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                                    >
                                        <RefreshCw size={13} />
                                        <span>Check Permission Again</span>
                                    </button>
                                </div>
                            )}

                            {/* Physical Security OTP Verification (Unattended Laptop Protection) */}
                            <div className="p-4 bg-slate-900/90 border border-emerald-500/30 rounded-2xl space-y-2.5">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-1.5 text-xs font-bold text-white">
                                        <ShieldCheck size={14} className="text-emerald-400" />
                                        <span>Confirm Device Ownership</span>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => triggerSendOtp(true)}
                                        disabled={sendingOtp}
                                        className="text-[11px] font-semibold text-emerald-400 hover:text-emerald-300 underline disabled:opacity-50 cursor-pointer"
                                    >
                                        {sendingOtp ? 'Sending...' : 'Resend Code'}
                                    </button>
                                </div>
                                <p className="text-[11px] text-slate-400 leading-relaxed">
                                    Enter the 6-digit confirmation code sent to <strong className="text-slate-200">{info?.email}</strong>:
                                </p>
                                <input
                                    type="text"
                                    inputMode="numeric"
                                    pattern="[0-9]*"
                                    maxLength={6}
                                    value={otpCode}
                                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                                    placeholder="000000"
                                    className="w-full text-center tracking-[8px] font-mono text-xl py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-emerald-400 font-bold placeholder-slate-600 focus:outline-none focus:border-emerald-500"
                                />
                            </div>

                            <button
                                type="button"
                                onClick={handleEnablePush}
                                disabled={subscribing || !otpCode.trim()}
                                className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-2xl text-xs transition-all shadow-lg shadow-emerald-950 cursor-pointer flex items-center justify-center gap-2 active:scale-98 disabled:opacity-50"
                            >
                                <Bell size={16} />
                                <span>{subscribing ? 'Activating Alerts...' : 'Verify Code & Enable Phone Alerts'}</span>
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
