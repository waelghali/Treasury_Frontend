// src/components/DealerMobileAlertsBanner.jsx
import React, { useState, useEffect, useRef } from 'react';
import { Smartphone, CheckCircle, Bell, BellOff, X, HelpCircle, Share2, PlusSquare, AlertTriangle, RefreshCw, QrCode, Copy, Check, ExternalLink } from 'lucide-react';
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

export default function DealerMobileAlertsBanner({ token, defaultEmail = '', onAlertsToggled = null }) {
    const [supported, setSupported] = useState(false);
    const [isActive, setIsActive] = useState(false);
    const [activeEmail, setActiveEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [showSetupModal, setShowSetupModal] = useState(false);
    const [showIosGuide, setShowIosGuide] = useState(false);
    const [showBlockedModal, setShowBlockedModal] = useState(false);
    const [showQrModal, setShowQrModal] = useState(false);
    const [qrData, setQrData] = useState(null);
    const [qrLoading, setQrLoading] = useState(false);
    const [isPairedSuccess, setIsPairedSuccess] = useState(false);
    const [isCopied, setIsCopied] = useState(false);
    const [dealerEmail, setDealerEmail] = useState(defaultEmail || '');
    const [endpoint, setEndpoint] = useState(null);
    const pollingTimerRef = useRef(null);

    useEffect(() => {
        setSupported(isPushSupported());
        checkCurrentStatus();
    }, [token]);

    useEffect(() => {
        if (defaultEmail && !dealerEmail) {
            setDealerEmail(defaultEmail);
        }
    }, [defaultEmail]);

    const checkCurrentStatus = async () => {
        try {
            const sub = await getExistingSubscription();
            if (sub && sub.endpoint) {
                setEndpoint(sub.endpoint);
                const status = await getDealerPushStatus(sub.endpoint, token, defaultEmail);
                if (status && status.is_active) {
                    setIsActive(true);
                    setActiveEmail(status.email || '');
                } else {
                    setIsActive(false);
                }
            }
        } catch (e) {
            console.warn('Could not verify push status:', e);
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
            if (data.is_paired) {
                setIsPairedSuccess(true);
                setIsActive(true);
                setActiveEmail(data.email);
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
                    setIsActive(true);
                    setActiveEmail(status.email || qrData.email);
                    if (onAlertsToggled) onAlertsToggled(true);
                    toast.success('Mobile phone paired successfully! Lock-screen alerts are now active.');
                    if (pollingTimerRef.current) {
                        clearInterval(pollingTimerRef.current);
                        pollingTimerRef.current = null;
                    }
                    setTimeout(() => {
                        setShowQrModal(false);
                    }, 2400);
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

    const handleCopySetupUrl = () => {
        if (!qrData?.setup_url) return;
        navigator.clipboard.writeText(qrData.setup_url);
        setIsCopied(true);
        toast.info('Mobile setup link copied! You can send it to your phone via WhatsApp or Email.');
        setTimeout(() => setIsCopied(false), 2500);
    };

    const handleOpenEnable = () => {
        if (isPermissionDenied()) {
            setShowBlockedModal(true);
            return;
        }
        if (isIosDevice() && !isStandalone()) {
            setShowIosGuide(true);
            return;
        }
        setShowSetupModal(true);
    };

    const handleConfirmSubscribe = async () => {
        if (!dealerEmail || !dealerEmail.includes('@')) {
            toast.error('Please enter your official corporate bank email.');
            return;
        }

        try {
            setLoading(true);
            const res = await subscribeDealerPush({
                token,
                email: dealerEmail.trim().toLowerCase(),
            });
            setIsActive(true);
            setActiveEmail(dealerEmail.trim().toLowerCase());
            setShowSetupModal(false);
            toast.success(res.message || 'Phone alerts enabled! You will now receive lock-screen alerts for all RFQs.');
            if (onAlertsToggled) onAlertsToggled(true);
            checkCurrentStatus();
        } catch (err) {
            console.error('Failed to enable dealer push:', err);
            if (err.code === 'PERMISSION_DENIED' || isPermissionDenied()) {
                setShowSetupModal(false);
                setShowBlockedModal(true);
                toast.warn('Notifications are currently blocked in your browser settings.');
            } else {
                toast.error(err.response?.data?.detail || err.message || 'Failed to enable mobile alerts.');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleUnsubscribe = async () => {
        if (!window.confirm('Turn off phone alerts on this device? You will no longer receive lock-screen notifications for incoming RFQs.')) {
            return;
        }
        try {
            setLoading(true);
            await unsubscribeDealerPush(endpoint, token);
            setIsActive(false);
            setActiveEmail('');
            toast.info('Phone alerts have been turned off for this device.');
            if (onAlertsToggled) onAlertsToggled(false);
        } catch (err) {
            console.error('Failed to turn off dealer push:', err);
            toast.error('Failed to turn off alerts.');
        } finally {
            setLoading(false);
        }
    };

    if (!supported && !isIosDevice()) {
        return null;
    }

    return (
        <>
            <div className="mb-4 bg-gradient-to-r from-slate-900 to-indigo-950 text-white rounded-2xl p-3.5 sm:p-4 shadow-md border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-in fade-in duration-200">
                <div className="flex items-center gap-3">
                    <div className={`p-2.5 rounded-xl border shrink-0 ${isActive ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30'}`}>
                        {isActive ? <CheckCircle size={18} /> : <Smartphone size={18} />}
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-bold uppercase tracking-wider text-indigo-200">Institutional Phone Alerts</span>
                            {isActive && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span> Active on this phone
                                </span>
                            )}
                        </div>
                        <p className="text-xs text-slate-300 mt-0.5">
                            {isActive
                                ? `Receiving instant lock-screen alerts for ${activeEmail || 'your desk'}. One setup covers all RFQs from all corporate clients.`
                                : 'Get instant lock-screen alerts whenever your desk is invited to quote. Covers all RFQs with zero app-store download.'}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                    {isActive ? (
                        <button
                            type="button"
                            onClick={handleUnsubscribe}
                            disabled={loading}
                            className="min-h-[38px] px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 rounded-xl text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5"
                        >
                            <BellOff size={13} />
                            <span>{loading ? 'Updating...' : 'Turn Off Alerts'}</span>
                        </button>
                    ) : (
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={handleOpenQrModal}
                                disabled={loading}
                                className="min-h-[38px] px-3.5 sm:px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-sm shadow-emerald-950 cursor-pointer flex items-center gap-1.5 active:scale-98"
                                title="Pair your smartphone by scanning a QR code with your phone camera"
                            >
                                <QrCode size={14} />
                                <span>Pair Phone via QR</span>
                            </button>
                            <button
                                type="button"
                                onClick={handleOpenEnable}
                                disabled={loading}
                                className="min-h-[38px] px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 rounded-xl text-xs font-medium transition-colors cursor-pointer flex items-center gap-1.5"
                                title="Enable alerts directly on this computer browser"
                            >
                                <Bell size={13} />
                                <span className="hidden md:inline">Alert this Browser</span>
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Email Confirmation & Setup Modal */}
            {showSetupModal && (
                <div
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="dealer-alert-modal-title"
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150"
                >
                    <div className="bg-white rounded-2xl max-w-md w-full overflow-hidden shadow-2xl border border-slate-200">
                        <div className="p-5 bg-gradient-to-r from-emerald-900 to-slate-900 text-white flex justify-between items-center">
                            <div className="flex items-center gap-2.5">
                                <div className="p-2 bg-emerald-500/20 text-emerald-300 rounded-xl border border-emerald-500/30">
                                    <Smartphone size={18} />
                                </div>
                                <div>
                                    <h3 id="dealer-alert-modal-title" className="font-bold text-sm">Enable Dealer Phone Alerts</h3>
                                    <p className="text-[11px] text-emerald-200/80">Covers all RFQs from all corporate clients</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setShowSetupModal(false)}
                                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
                            >
                                <X size={16} />
                            </button>
                        </div>
                        <div className="p-5 space-y-3.5">
                            <p className="text-xs text-slate-600 leading-relaxed">
                                Enter your official corporate bank email. Your phone will receive instant sound and vibration alerts whenever your desk is invited to an RFQ by <strong>any corporate client</strong>.
                            </p>
                            <div>
                                <label className="text-xs font-bold text-slate-700 block mb-1">
                                    Official Bank Email
                                </label>
                                <input
                                    type="email"
                                    value={dealerEmail}
                                    onChange={(e) => setDealerEmail(e.target.value)}
                                    placeholder="dealer@bank.com"
                                    className="w-full text-xs p-3 rounded-xl border border-slate-300 bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 font-medium"
                                />
                            </div>
                            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-[11px] text-slate-600 space-y-1">
                                <p className="font-semibold text-slate-800">🔒 Confidential & Safe</p>
                                <p>Trade amounts, bank identities, and currencies are strictly redacted on your phone lock screen.</p>
                            </div>
                        </div>
                        <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-2.5">
                            <button
                                type="button"
                                onClick={() => setShowSetupModal(false)}
                                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl text-xs"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleConfirmSubscribe}
                                disabled={loading || !dealerEmail}
                                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow-sm flex items-center gap-1.5 disabled:opacity-50"
                            >
                                <Bell size={13} />
                                <span>{loading ? 'Activating...' : 'Activate Alerts'}</span>
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
                                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
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
                                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs"
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
                                Your browser has blocked notifications for this platform. To enable instant RFQ sound & vibration alerts, please allow notifications in your address bar:
                            </p>

                            <div className="p-4 bg-amber-50/70 border border-amber-200/80 rounded-2xl space-y-3">
                                <div className="flex items-start gap-3">
                                    <div className="w-6 h-6 rounded-full bg-amber-200 text-amber-900 font-bold flex items-center justify-center shrink-0 text-xs">
                                        1
                                    </div>
                                    <div>
                                        <p className="font-bold text-slate-900">Click the Site Settings / Lock Icon</p>
                                        <p className="text-[11px] text-slate-600 mt-0.5">
                                            Look at the top left of your browser window, directly to the left of the website address (URL). Click the <strong className="text-slate-800">Lock 🔒</strong> or <strong className="text-slate-800">Tune / Sliders 🎛️</strong> icon.
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
                                    <p className="text-[11px] text-emerald-200/80">Scan with your phone camera · No app download</p>
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
                                        ✓ Your phone will ring & vibrate on every incoming RFQ invitation
                                    </div>
                                </div>
                            ) : (
                                <>
                                    {/* Email indicator / selector */}
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
                                            <span>Tap the banner that pops up on your phone.</span>
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
                                        <button
                                            type="button"
                                            onClick={handleCopySetupUrl}
                                            className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
                                            title="Copy mobile link"
                                        >
                                            {isCopied ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                                            <span>{isCopied ? 'Copied!' : 'Copy Link'}</span>
                                        </button>
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
