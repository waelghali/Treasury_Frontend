// src/components/DealerMobileAlertsBanner.jsx
import React, { useState, useEffect, useRef } from 'react';
import {
    Smartphone,
    Monitor,
    CheckCircle,
    Bell,
    BellOff,
    X,
    Share2,
    PlusSquare,
    AlertTriangle,
    RefreshCw,
    QrCode,
    Copy,
    Check,
    ShieldCheck,
    Volume2,
    VolumeX,
    ExternalLink
} from 'lucide-react';
import { toast } from 'react-toastify';
import {
    isPushSupported,
    isIosDevice,
    isStandalone,
    isPermissionDenied,
    getExistingSubscription,
    getDealerPushStatus,
    subscribeDealerPush,
    unsubscribeDealerPush,
    generateDealerQrPair,
    getDealerQrStatus
} from '../services/dealerPushService';



export default function DealerMobileAlertsBanner({
    token,
    defaultEmail = '',
    onAlertsToggled = null,
    allowMobileAlerts = true,
    mode = 'header-chip',
    soundEnabled = true,
    onToggleSound = null
}) {
    const [supported, setSupported] = useState(false);
    const [isBrowserActive, setIsBrowserActive] = useState(false);
    const [isPhoneActive, setIsPhoneActive] = useState(false);
    const [isActive, setIsActive] = useState(false);
    const [activeEmail, setActiveEmail] = useState('');
    const [browserLabel, setBrowserLabel] = useState('');
    const [phoneLabel, setPhoneLabel] = useState('');
    const [dealerEmail, setDealerEmail] = useState(defaultEmail || '');
    const [endpoint, setEndpoint] = useState(null);
    const [loading, setLoading] = useState(false);
    const [loadingTarget, setLoadingTarget] = useState(null); // 'browser' | 'phone' | null

    const [showSetupModal, setShowSetupModal] = useState(false);
    const [showIosGuide, setShowIosGuide] = useState(false);
    const [showBlockedModal, setShowBlockedModal] = useState(false);
    const [showQrModal, setShowQrModal] = useState(false);


    const [qrData, setQrData] = useState(null);
    const [qrLoading, setQrLoading] = useState(false);
    const [isPairedSuccess, setIsPairedSuccess] = useState(false);
    const [isCopied, setIsCopied] = useState(false);
    const pollingTimerRef = useRef(null);

    useEffect(() => {
        try { localStorage.removeItem('dealer_inactive_alert_theme'); } catch (_) {}
        setSupported(isPushSupported());
        checkCurrentStatus();
    }, [token, defaultEmail]);

    useEffect(() => {
        const handleOpen = () => setShowSetupModal(true);
        window.addEventListener('open-dealer-alert-modal', handleOpen);
        return () => window.removeEventListener('open-dealer-alert-modal', handleOpen);
    }, []);

    useEffect(() => {
        if (defaultEmail && !dealerEmail) {
            setDealerEmail(defaultEmail);
        }
    }, [defaultEmail]);

    const checkCurrentStatus = async () => {
        try {
            const sub = await getExistingSubscription();
            const curEndpoint = sub?.endpoint || null;
            if (curEndpoint) {
                setEndpoint(curEndpoint);
            }
            const status = await getDealerPushStatus(curEndpoint, token, defaultEmail || dealerEmail);
            if (status) {
                const bActive = Boolean(status.is_browser_active);
                const pActive = Boolean(status.is_phone_active);
                setIsBrowserActive(bActive);
                setIsPhoneActive(pActive);
                const activeState = bActive || pActive || Boolean(status.is_active);
                setIsActive(activeState);
                if (onAlertsToggled) onAlertsToggled(activeState);
                if (status.email) {
                    setActiveEmail(status.email);
                    if (!dealerEmail) setDealerEmail(status.email);
                }
                if (status.browser_label) setBrowserLabel(status.browser_label);
                if (status.phone_label) setPhoneLabel(status.phone_label);
            } else {
                setIsBrowserActive(false);
                setIsPhoneActive(false);
                setIsActive(false);
                if (onAlertsToggled) onAlertsToggled(false);
            }
        } catch (e) {
            console.warn('Could not verify push status:', e);
        }
    };

    const handleToggleBrowserAlerts = async () => {
        const targetEmail = dealerEmail || activeEmail || defaultEmail;
        if (!isBrowserActive && (!targetEmail || !targetEmail.includes('@'))) {
            toast.error('Please enter your official bank email.');
            return;
        }

        try {
            setLoading(true);
            setLoadingTarget('browser');
            if (isBrowserActive) {
                await unsubscribeDealerPush(endpoint, token, targetEmail, 'browser');
                setIsBrowserActive(false);
                const remaining = isPhoneActive;
                setIsActive(remaining);
                if (onAlertsToggled) onAlertsToggled(remaining);
                toast.info('Windows desktop alerts turned off for this browser.');
            } else {
                if (isPermissionDenied()) {
                    setShowBlockedModal(true);
                    return;
                }
                if (isIosDevice() && !isStandalone()) {
                    setShowIosGuide(true);
                    return;
                }
                const res = await subscribeDealerPush({
                    token,
                    email: targetEmail.trim().toLowerCase(),
                    deviceLabel: 'Windows Desktop / Browser'
                });
                setIsBrowserActive(true);
                setIsActive(true);
                setActiveEmail(targetEmail.trim().toLowerCase());
                if (onAlertsToggled) onAlertsToggled(true);
                toast.success(res.message || 'Windows desktop alerts enabled for this browser!');
            }
            await checkCurrentStatus();
        } catch (err) {
            console.error('Failed to toggle browser push:', err);
            if (err.code === 'PERMISSION_DENIED' || isPermissionDenied()) {
                setShowBlockedModal(true);
                toast.warn('Notifications are currently blocked in your browser settings.');
            } else {
                toast.error(err.response?.data?.detail || err.message || 'Failed to update desktop alerts.');
            }
        } finally {
            setLoading(false);
            setLoadingTarget(null);
        }
    };

    const handleUnlinkPhone = async () => {
        if (!window.confirm('Unlink paired mobile phone? This phone will no longer receive lock-screen alerts.')) {
            return;
        }
        try {
            setLoading(true);
            setLoadingTarget('phone');
            const targetEmail = activeEmail || dealerEmail || defaultEmail;
            await unsubscribeDealerPush(endpoint, token, targetEmail, 'phone');
            setIsPhoneActive(false);
            setPhoneLabel('');
            const remaining = isBrowserActive;
            setIsActive(remaining);
            if (onAlertsToggled) onAlertsToggled(remaining);
            toast.info('Mobile phone unlinked successfully.');
            await checkCurrentStatus();
        } catch (err) {
            console.error('Failed to unlink phone push:', err);
            toast.error('Failed to unlink phone.');
        } finally {
            setLoading(false);
            setLoadingTarget(null);
        }
    };

    const handleOpenQrModal = async () => {
        setShowQrModal(true);
        setIsPairedSuccess(false);
        setQrLoading(true);
        try {
            const data = await generateDealerQrPair(token, dealerEmail || defaultEmail);
            setQrData(data);
            if (data.email && !dealerEmail) {
                setDealerEmail(data.email);
            }
        } catch (err) {
            console.error('Failed to generate QR pair token:', err);
            toast.error(err.response?.data?.detail || 'Could not generate mobile pairing QR code.');
        } finally {
            setQrLoading(false);
        }
    };

    // Live polling when QR modal is open to auto-detect when phone is paired
    useEffect(() => {
        if (!showQrModal || !qrData?.setup_token || isPairedSuccess) {
            if (pollingTimerRef.current) {
                clearInterval(pollingTimerRef.current);
                pollingTimerRef.current = null;
            }
            return;
        }

        pollingTimerRef.current = setInterval(async () => {
            try {
                const status = await getDealerQrStatus(qrData.setup_token);
                if (status.is_paired) {
                    setIsPairedSuccess(true);
                    setIsPhoneActive(true);
                    setIsActive(true);
                    setActiveEmail(status.email || qrData.email);
                    if (onAlertsToggled) onAlertsToggled(true);
                    toast.success('Mobile phone paired successfully! Lock-screen alerts are now active.');
                    if (pollingTimerRef.current) {
                        clearInterval(pollingTimerRef.current);
                        pollingTimerRef.current = null;
                    }
                    await checkCurrentStatus();
                    setTimeout(() => {
                        setShowQrModal(false);
                    }, 2200);
                }
            } catch (e) {
                // Silent catch during background poll
            }
        }, 2500);

        return () => {
            if (pollingTimerRef.current) {
                clearInterval(pollingTimerRef.current);
                pollingTimerRef.current = null;
            }
        };
    }, [showQrModal, qrData?.setup_token, isPairedSuccess]);

    const handleCopySetupUrl = async () => {
        if (!qrData?.setup_url) return;
        let success = false;
        try {
            if (navigator.clipboard && navigator.clipboard.writeText) {
                await navigator.clipboard.writeText(qrData.setup_url);
                success = true;
            }
        } catch (e) {
            console.warn('navigator.clipboard failed, using fallback:', e);
        }
        if (!success) {
            try {
                const textArea = document.createElement('textarea');
                textArea.value = qrData.setup_url;
                textArea.style.position = 'fixed';
                textArea.style.left = '-9999px';
                textArea.style.top = '-9999px';
                document.body.appendChild(textArea);
                textArea.focus();
                textArea.select();
                document.execCommand('copy');
                document.body.removeChild(textArea);
            } catch (err) {
                console.error('execCommand copy failed:', err);
            }
        }
        setIsCopied(true);
        toast.info('Mobile setup link copied! You can send it to your phone via WhatsApp or Email.');
        setTimeout(() => setIsCopied(false), 2500);
    };

    if (allowMobileAlerts === false) {
        return null;
    }

    if (!supported && !isIosDevice()) {
        return null;
    }


    return (
        <>
            {mode === 'header-chip' ? (
                <div className="relative inline-flex items-center group">
                    {/* Glowing Obsidian Titanium Halo ONLY when alerts are INACTIVE */}
                    {!isActive && (
                        <span className="absolute -inset-0.5 rounded-xl bg-gradient-to-r from-slate-200 via-white to-slate-400 opacity-75 blur-xs animate-pulse group-hover:opacity-100 transition duration-300 pointer-events-none"></span>
                    )}

                    <button
                        type="button"
                        onClick={() => setShowSetupModal(true)}
                        className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
                            isActive
                                ? 'bg-emerald-50 text-emerald-800 border border-emerald-300 hover:bg-emerald-100 shadow-2xs'
                                : 'bg-slate-950 text-slate-100 border-2 border-slate-300/85 shadow-md shadow-white/15 hover:bg-slate-900 active:scale-95'
                        }`}
                        title="Configure Trading Desk Alerts for Audio, Windows PC, and Mobile Phone"
                    >
                        {isActive ? (
                            <>
                                {/* Steady solid dot: NO ping, NO glow when active */}
                                <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0"></span>
                                {isBrowserActive && isPhoneActive ? (
                                    <>
                                        <Bell size={13} className="text-emerald-700 shrink-0" />
                                        <span className="hidden sm:inline">Alerts: PC + Phone Active</span>
                                        <span className="sm:hidden">Alerts Active</span>
                                    </>
                                ) : isBrowserActive ? (
                                    <>
                                        <Monitor size={13} className="text-emerald-700 shrink-0" />
                                        <span className="hidden sm:inline">PC Alert: Active</span>
                                        <span className="sm:hidden">PC Active</span>
                                    </>
                                ) : (
                                    <>
                                        <Smartphone size={13} className="text-emerald-700 shrink-0" />
                                        <span className="hidden sm:inline">Phone Alert: Active</span>
                                        <span className="sm:hidden">Phone Active</span>
                                    </>
                                )}
                            </>
                        ) : (
                            <>
                                {/* Glowing animated Titanium radar ping dot when INACTIVE */}
                                <span className="relative flex h-2.5 w-2.5 shrink-0">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-90"></span>
                                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-white shadow-xs"></span>
                                </span>
                                <Bell size={13} className="text-white shrink-0 drop-shadow-xs" />
                                <span className="hidden sm:inline font-extrabold text-white tracking-tight drop-shadow-xs">Turn On RFQ Alerts</span>
                                <span className="sm:hidden font-extrabold text-white">Alerts</span>
                            </>
                        )}
                    </button>
                </div>
            ) : null}

            {/* UNIFIED 3-CHANNEL DESK ALERTS MODAL: Audio Chimes + Windows PC + Mobile Phone */}
            {showSetupModal && (
                <div
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="dealer-alert-modal-title"
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150"
                >
                    <div className="bg-white rounded-3xl max-w-2xl sm:max-w-3xl w-full overflow-hidden shadow-2xl border border-slate-200">
                        {/* Modal Header with Verified Desk Badge */}
                        <div className="p-5 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex justify-between items-center">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 bg-indigo-500/20 text-indigo-300 rounded-2xl border border-indigo-500/30">
                                    <Bell size={20} />
                                </div>
                                <div>
                                    <h3 id="dealer-alert-modal-title" className="font-bold text-base text-white">Trading Desk Alerts & Audio</h3>
                                    <p className="text-xs text-indigo-200/80">
                                        Verified Desk: <span className="font-mono text-emerald-300 font-semibold">{activeEmail || dealerEmail || 'Bank Dealer'}</span>
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => setShowSetupModal(false)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer transition-colors"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {/* Modal Body: 3 Clean Compact Channels */}
                        <div className="p-5 space-y-3.5 max-h-[75vh] overflow-y-auto">
                            {/* CHANNEL 1: 🔊 Trading Desk Audio Chimes */}
                            <div className="p-4 rounded-2xl border transition-all bg-white border-slate-200 hover:border-slate-300">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                    <div className="flex items-start gap-3">
                                        <div className={`p-2.5 rounded-xl shrink-0 ${soundEnabled ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-500 border border-slate-200'}`}>
                                            {soundEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <h4 className="font-bold text-sm text-slate-900">Trading Desk Chimes</h4>
                                                {soundEnabled ? (
                                                    <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full border border-emerald-300">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> AUDIO ON
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 text-[10px] font-medium bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full border border-slate-200">
                                                        ○ MUTED
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
                                                In-terminal audio cues for incoming quotation requests and closing countdowns.
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                                        <button
                                            type="button"
                                            onClick={onToggleSound ? onToggleSound : () => {}}
                                            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs ${soundEnabled
                                                ? 'bg-emerald-50 text-emerald-800 border border-emerald-300 hover:bg-emerald-100'
                                                : 'bg-slate-100 text-slate-700 border border-slate-300 hover:bg-slate-200'
                                            }`}
                                        >
                                            {soundEnabled ? <Volume2 size={14} className="text-emerald-700" /> : <VolumeX size={14} className="text-slate-500" />}
                                            <span>{soundEnabled ? 'Sound: On' : 'Sound: Muted'}</span>
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* CHANNEL 2: 💻 Windows Desktop Notifications */}
                            <div className={`p-4 rounded-2xl border transition-all ${
                                isBrowserActive 
                                    ? 'bg-emerald-50/40 border-emerald-300/80 shadow-2xs' 
                                    : 'bg-white border-slate-200 hover:border-slate-300'
                            }`}>
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                    <div className="flex items-start gap-3">
                                        <div className={`p-2.5 rounded-xl shrink-0 ${
                                            isBrowserActive 
                                                ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' 
                                                : 'bg-slate-100 text-slate-600 border border-slate-200'
                                        }`}>
                                            <Monitor size={20} />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <h4 className="font-bold text-sm text-slate-900">Windows Desktop Notifications</h4>
                                                {isBrowserActive ? (
                                                    <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full border border-emerald-300">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> ACTIVE ON THIS PC
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 text-[10px] font-medium bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full border border-slate-200">
                                                        ○ INACTIVE ON THIS PC
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
                                                Pop-up toast alerts on your PC even when the browser is minimized.
                                            </p>
                                            {isBrowserActive && browserLabel && (
                                                <p className="text-[11px] font-medium text-emerald-800 mt-0.5">
                                                    Connected: {browserLabel}
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    <div className="self-end sm:self-center shrink-0">
                                        {isBrowserActive ? (
                                            <button
                                                type="button"
                                                onClick={handleToggleBrowserAlerts}
                                                disabled={loading}
                                                className="px-4 py-2 bg-white hover:bg-rose-50 text-rose-700 hover:text-rose-800 border border-rose-300 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
                                            >
                                                <BellOff size={14} />
                                                <span>{loading && loadingTarget === 'browser' ? 'Deactivating...' : 'Deactivate PC Alert'}</span>
                                            </button>
                                        ) : (
                                            <button
                                                type="button"
                                                onClick={handleToggleBrowserAlerts}
                                                disabled={loading || !dealerEmail}
                                                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                                            >
                                                <Monitor size={14} />
                                                <span>{loading && loadingTarget === 'browser' ? 'Activating...' : 'Activate on this PC'}</span>
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* CHANNEL 3: 📱 Mobile Smartphone */}
                            <div className={`p-4 rounded-2xl border transition-all ${
                                isPhoneActive 
                                    ? 'bg-emerald-50/40 border-emerald-300/80 shadow-2xs' 
                                    : 'bg-white border-slate-200 hover:border-slate-300'
                            }`}>
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                    <div className="flex items-start gap-3">
                                        <div className={`p-2.5 rounded-xl shrink-0 ${
                                            isPhoneActive 
                                                ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' 
                                                : 'bg-slate-100 text-slate-600 border border-slate-200'
                                        }`}>
                                            <Smartphone size={20} />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <h4 className="font-bold text-sm text-slate-900">Mobile Smartphone</h4>
                                                {isPhoneActive ? (
                                                    <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full border border-emerald-300">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> ACTIVE ON MOBILE
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 text-[10px] font-medium bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full border border-slate-200">
                                                        ○ NO PHONE LINKED
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
                                                Sound & vibration lock-screen push alerts when you are away from your desk.
                                            </p>
                                            {isPhoneActive && phoneLabel && (
                                                <p className="text-[11px] font-medium text-emerald-800 mt-0.5">
                                                    Linked Device: {phoneLabel}
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    <div className="self-end sm:self-center shrink-0">
                                        {isPhoneActive ? (
                                            <button
                                                type="button"
                                                onClick={handleUnlinkPhone}
                                                disabled={loading}
                                                className="px-4 py-2 bg-white hover:bg-rose-50 text-rose-700 hover:text-rose-800 border border-rose-300 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
                                            >
                                                <BellOff size={14} />
                                                <span>{loading && loadingTarget === 'phone' ? 'Deactivating...' : 'Deactivate / Unlink Phone'}</span>
                                            </button>
                                        ) : (
                                            <button
                                                type="button"
                                                onClick={handleOpenQrModal}
                                                disabled={loading}
                                                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
                                            >
                                                <QrCode size={14} />
                                                <span>Pair Phone via QR</span>
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Privacy and Security Seal */}
                            <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl flex items-center gap-2.5 text-[11px] text-slate-600">
                                <ShieldCheck size={16} className="text-indigo-600 shrink-0" />
                                <span>
                                    <strong>Redacted & Confidential:</strong> Trade amounts, bank identities, and currencies are strictly concealed on lock screens.
                                </span>
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end">
                            <button
                                type="button"
                                onClick={() => setShowSetupModal(false)}
                                className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl text-xs cursor-pointer transition-colors"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* iOS Safari Home Screen Guide Modal */}
            {showIosGuide && (
                <div
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="ios-guide-title"
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150"
                >
                    <div className="bg-white rounded-2xl max-w-md w-full overflow-hidden shadow-2xl border border-slate-200">
                        <div className="p-5 bg-gradient-to-r from-indigo-900 to-slate-900 text-white flex justify-between items-center">
                            <div className="flex items-center gap-2.5">
                                <div className="p-2 bg-indigo-500/20 text-indigo-300 rounded-xl border border-indigo-500/30">
                                    <Smartphone size={18} />
                                </div>
                                <div>
                                    <h3 id="ios-guide-title" className="font-bold text-sm">Apple iOS Web Push Setup</h3>
                                    <p className="text-[11px] text-indigo-200/80">iOS 16.4+ requires Home Screen installation</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setShowIosGuide(false)}
                                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
                            >
                                <X size={16} />
                            </button>
                        </div>
                        <div className="p-5 space-y-3 text-xs text-slate-600">
                            <p className="leading-relaxed">
                                Apple requires web applications to be saved to your iPhone/iPad Home Screen before enabling lock-screen notifications:
                            </p>
                            <ol className="list-decimal pl-5 space-y-2 font-medium text-slate-800">
                                <li className="flex items-start gap-2">
                                    <Share2 size={16} className="text-indigo-600 shrink-0 mt-0.5" />
                                    <span>Tap the <strong>Share</strong> button at the bottom of Safari (square with arrow up).</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <PlusSquare size={16} className="text-indigo-600 shrink-0 mt-0.5" />
                                    <span>Scroll down and tap <strong>Add to Home Screen</strong>.</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <Smartphone size={16} className="text-emerald-600 shrink-0 mt-0.5" />
                                    <span>Open <strong>Grow Treasury</strong> from your Home Screen, then tap <strong>Enable Phone Alerts</strong>.</span>
                                </li>
                            </ol>
                        </div>
                        <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
                            <button
                                type="button"
                                onClick={() => setShowIosGuide(false)}
                                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs cursor-pointer"
                            >
                                Got it
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Browser Blocked Guide Modal */}
            {showBlockedModal && (
                <div
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="blocked-modal-title"
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150"
                >
                    <div className="bg-white rounded-2xl max-w-md w-full overflow-hidden shadow-2xl border border-amber-200">
                        <div className="p-5 bg-gradient-to-r from-amber-950 via-slate-900 to-amber-900 text-white flex justify-between items-center">
                            <div className="flex items-center gap-2.5">
                                <div className="p-2 bg-amber-500/20 text-amber-300 rounded-xl border border-amber-500/30">
                                    <AlertTriangle size={18} />
                                </div>
                                <div>
                                    <h3 id="blocked-modal-title" className="font-bold text-sm">Notifications Blocked in Browser</h3>
                                    <p className="text-[11px] text-amber-200/80">Permission is currently denied by your browser</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setShowBlockedModal(false)}
                                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
                            >
                                <X size={16} />
                            </button>
                        </div>

                        <div className="p-5 space-y-4 text-xs text-slate-700">
                            <p className="leading-relaxed">
                                Your browser has blocked notifications for this platform. To enable instant RFQ sound & notifications on this computer:
                            </p>

                            <div className="p-4 bg-amber-50/70 border border-amber-200/80 rounded-2xl space-y-3">
                                <div className="flex items-start gap-3">
                                    <div className="w-6 h-6 rounded-full bg-amber-200 text-amber-900 font-bold flex items-center justify-center shrink-0 text-xs">
                                        1
                                    </div>
                                    <div>
                                        <p className="font-bold text-slate-900">Click the Site Settings / Lock Icon</p>
                                        <p className="text-[11px] text-slate-600 mt-0.5">
                                            Look directly to the left of the website address (URL) in your browser address bar. Click the <strong className="text-slate-800">Lock 🔒</strong> or <strong className="text-slate-800">Sliders 🎛️</strong> icon.
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-start gap-3">
                                    <div className="w-6 h-6 rounded-full bg-amber-200 text-amber-900 font-bold flex items-center justify-center shrink-0 text-xs">
                                        2
                                    </div>
                                    <div>
                                        <p className="font-bold text-slate-900">Change Notifications to "Allow"</p>
                                        <p className="text-[11px] text-slate-600 mt-0.5">
                                            Find <strong className="text-slate-800">Notifications</strong> in the permissions popup and switch it from <em>Block</em> to <strong className="text-emerald-700 font-semibold">Allow</strong>.
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-start gap-3">
                                    <div className="w-6 h-6 rounded-full bg-amber-200 text-amber-900 font-bold flex items-center justify-center shrink-0 text-xs">
                                        3
                                    </div>
                                    <div>
                                        <p className="font-bold text-slate-900">Confirm Permission</p>
                                        <p className="text-[11px] text-slate-600 mt-0.5">
                                            Click the button below to verify that notifications are unblocked.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-2.5">
                            <button
                                type="button"
                                onClick={() => setShowBlockedModal(false)}
                                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl text-xs cursor-pointer"
                            >
                                Dismiss
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    if (!isPermissionDenied()) {
                                        setShowBlockedModal(false);
                                        setShowSetupModal(true);
                                        toast.success('Permission unblocked! You can now activate your alerts.');
                                    } else {
                                        toast.info('Notifications are still blocked. Please toggle Notifications to "Allow" in the address bar lock icon.');
                                    }
                                }}
                                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-sm cursor-pointer"
                            >
                                <RefreshCw size={13} />
                                <span>Check Permission Again</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* QR Code Phone Pairing Modal */}
            {showQrModal && (
                <div
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="qr-pair-modal-title"
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-150"
                >
                    <div className="bg-white rounded-3xl max-w-md w-full overflow-hidden shadow-2xl border border-slate-200">
                        {/* Header */}
                        <div className="p-5 bg-gradient-to-r from-emerald-950 via-slate-900 to-indigo-950 text-white flex justify-between items-center">
                            <div className="flex items-center gap-2.5">
                                <div className="p-2.5 bg-emerald-500/20 text-emerald-300 rounded-2xl border border-emerald-500/30">
                                    <QrCode size={20} />
                                </div>
                                <div>
                                    <h3 id="qr-pair-modal-title" className="font-bold text-sm">Pair Phone for Lock-Screen Alerts</h3>
                                    <p className="text-[11px] text-emerald-200/80">Scan with phone camera · No app store download</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setShowQrModal(false)}
                                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
                            >
                                <X size={16} />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="p-5 space-y-4">
                            {qrLoading ? (
                                <div className="py-12 text-center text-slate-500">
                                    <div className="w-10 h-10 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                                    <p className="text-xs font-semibold">Generating secure smartphone pairing token...</p>
                                </div>
                            ) : isPairedSuccess ? (
                                <div className="py-8 text-center space-y-3 animate-in zoom-in-95 duration-200">
                                    <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-600 border border-emerald-500/30 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20">
                                        <CheckCircle size={32} />
                                    </div>
                                    <h3 className="font-bold text-base text-slate-900">Phone Paired Successfully!</h3>
                                    <p className="text-xs text-slate-600 max-w-xs mx-auto leading-relaxed">
                                        Lock-screen alerts are now active for <strong className="text-slate-900">{activeEmail || dealerEmail}</strong>.
                                    </p>
                                    <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl text-[11px] text-emerald-800 font-medium inline-block">
                                        ✓ Your phone will chime & vibrate on every incoming RFQ invitation
                                    </div>
                                </div>
                            ) : (
                                <>
                                    {/* Email indicator */}
                                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between text-xs">
                                        <div>
                                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Registered Bank Desk</span>
                                            <span className="font-semibold text-slate-800">{qrData?.bank_name || 'Treasury Desk'}</span>
                                        </div>
                                        <span className="font-mono text-emerald-700 bg-emerald-100/70 border border-emerald-300/50 px-2 py-0.5 rounded-lg text-[11px]">
                                            {qrData?.email || dealerEmail || 'Bank Dealer'}
                                        </span>
                                    </div>

                                    {/* QR Code Graphic Container */}
                                    <div className="p-4 bg-slate-50/80 border border-slate-200 rounded-2xl flex flex-col items-center justify-center">
                                        {qrData?.qr_code_base64 ? (
                                            <div className="p-2 bg-white rounded-xl shadow-xs border border-slate-200">
                                                <img
                                                    src={qrData.qr_code_base64}
                                                    alt="Scan to pair smartphone"
                                                    className="w-48 h-48 sm:w-52 sm:h-52 object-contain rounded-lg"
                                                />
                                            </div>
                                        ) : (
                                            <div className="w-48 h-48 flex items-center justify-center text-slate-400 text-xs">
                                                QR code unavailable
                                            </div>
                                        )}

                                        <p className="text-[11px] font-semibold text-slate-700 mt-2.5 flex items-center gap-1.5">
                                            <Smartphone size={13} className="text-emerald-600" />
                                            <span>Point your phone camera at the screen</span>
                                        </p>
                                    </div>

                                    {/* Steps Guide */}
                                    <div className="space-y-1.5 text-[11px] text-slate-600">
                                        <div className="flex items-start gap-2">
                                            <span className="w-4 h-4 rounded-full bg-slate-200 text-slate-700 font-bold flex items-center justify-center text-[10px] shrink-0 mt-0.5">1</span>
                                            <span>Open your <strong>Camera</strong> app on iPhone or Android and scan this code.</span>
                                        </div>
                                        <div className="flex items-start gap-2">
                                            <span className="w-4 h-4 rounded-full bg-slate-200 text-slate-700 font-bold flex items-center justify-center text-[10px] shrink-0 mt-0.5">2</span>
                                            <span>Tap the link banner that appears on your phone screen.</span>
                                        </div>
                                        <div className="flex items-start gap-2">
                                            <span className="w-4 h-4 rounded-full bg-slate-200 text-slate-700 font-bold flex items-center justify-center text-[10px] shrink-0 mt-0.5">3</span>
                                            <span>Tap <strong>Enable Phone Alerts</strong> on your phone (iOS: Add to Home Screen first).</span>
                                        </div>
                                    </div>

                                    {/* Live detection banner */}
                                    <div className="flex items-center justify-between p-2.5 bg-slate-100/80 border border-slate-200 rounded-xl text-[11px] text-slate-600">
                                        <div className="flex items-center gap-2">
                                            <span className="relative flex h-2 w-2">
                                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                                            </span>
                                            <span>Waiting for phone scan (auto-detects)...</span>
                                        </div>
                                        <div className="flex items-center gap-2.5">
                                            <button
                                                type="button"
                                                onClick={handleCopySetupUrl}
                                                className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
                                                title="Copy mobile link"
                                            >
                                                {isCopied ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                                                <span>{isCopied ? 'Copied!' : 'Copy Link'}</span>
                                            </button>
                                            <a
                                                href={qrData?.setup_url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-xs font-semibold text-slate-500 hover:text-slate-800 flex items-center gap-1"
                                                title="Open setup link in new tab"
                                            >
                                                <ExternalLink size={12} />
                                                <span>Open</span>
                                            </a>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-between items-center">
                            <span className="text-[11px] text-slate-400">Covers all RFQs from all clients</span>
                            <button
                                type="button"
                                onClick={() => setShowQrModal(false)}
                                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl text-xs cursor-pointer"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
