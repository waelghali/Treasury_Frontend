// src/components/DealerMobileAlertsBanner.jsx
import React, { useState, useEffect } from 'react';
import { Smartphone, CheckCircle, Bell, BellOff, X, HelpCircle, Share2, PlusSquare } from 'lucide-react';
import { toast } from 'react-toastify';
import {
    isPushSupported,
    isIosDevice,
    isStandalone,
    getExistingSubscription,
    getDealerPushStatus,
    subscribeDealerPush,
    unsubscribeDealerPush
} from '../services/dealerPushService';

export default function DealerMobileAlertsBanner({ token, defaultEmail = '', onAlertsToggled = null }) {
    const [supported, setSupported] = useState(false);
    const [isActive, setIsActive] = useState(false);
    const [activeEmail, setActiveEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [showSetupModal, setShowSetupModal] = useState(false);
    const [showIosGuide, setShowIosGuide] = useState(false);
    const [dealerEmail, setDealerEmail] = useState(defaultEmail || '');
    const [endpoint, setEndpoint] = useState(null);

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

    const handleOpenEnable = () => {
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
            toast.error(err.response?.data?.detail || err.message || 'Failed to enable mobile alerts.');
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
                        <button
                            type="button"
                            onClick={handleOpenEnable}
                            disabled={loading}
                            className="min-h-[38px] px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-sm shadow-emerald-950 cursor-pointer flex items-center gap-1.5 active:scale-98"
                        >
                            <Bell size={13} />
                            <span>Enable Phone Alerts</span>
                        </button>
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
        </>
    );
}
