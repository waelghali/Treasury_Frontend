// src/components/CorporateMobileAlertsBanner.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { Smartphone, QrCode, Bell, CheckCircle2, X, BellOff, Sparkles, Fingerprint } from 'lucide-react';
import { toast } from 'react-toastify';
import {
    getPushStatus,
    enablePush,
    disablePushOnThisDevice
} from '../services/pushService';
import {
    isBiometricSupported,
    getBiometricDisplayLabel,
    getStoredBiometricInfo,
    fetchBiometricRegistrationOptions,
    enrollBiometricWithOptions,
} from '../services/biometricService';
import PushPairQrModal from './Modals/PushPairQrModal';
import PushInstallGuideModal from './Modals/PushInstallGuideModal';

export default function CorporateMobileAlertsBanner({
    title = 'Stay Ahead with Instant Mobile Alerts',
    description = 'Receive real-time lock-screen notifications for incoming bank quotations, RFQ approval requests, and countdown timeouts — even when your laptop is closed.',
    dismissKey = 'corporate_mobile_alerts_dismissed_until',
    className = 'mb-6'
}) {
    const [status, setStatus] = useState('loading');
    const [busy, setBusy] = useState(false);
    const [bioActive, setBioActive] = useState(() => getStoredBiometricInfo().hasBiometric);
    const [preloadedBioRegOpts, setPreloadedBioRegOpts] = useState(null);
    const [showPairQrModal, setShowPairQrModal] = useState(false);
    const [showGuideModal, setShowGuideModal] = useState(false);
    const [isDismissed, setIsDismissed] = useState(() => {
        try {
            const until = localStorage.getItem(dismissKey);
            return Boolean(until && Date.now() < Number(until));
        } catch {
            return false;
        }
    });

    const refreshStatus = useCallback(async () => {
        try {
            setStatus(await getPushStatus());
            setBioActive(getStoredBiometricInfo().hasBiometric);
        } catch {
            setStatus('unsupported');
        }
    }, []);

    useEffect(() => {
        refreshStatus();
        if (isBiometricSupported() && !getStoredBiometricInfo().hasBiometric) {
            fetchBiometricRegistrationOptions()
                .then((opts) => setPreloadedBioRegOpts(opts))
                .catch(() => {});
        }
    }, [refreshStatus]);

    const handleEnableBiometric = async () => {
        setBusy(true);
        try {
            const opts = preloadedBioRegOpts || (await fetchBiometricRegistrationOptions());
            await enrollBiometricWithOptions(opts);
            setBioActive(true);
            toast.success(`${getBiometricDisplayLabel()} login enabled on this device!`);
        } catch (err) {
            const isCancel = err?.name === 'NotAllowedError' || err?.name === 'AbortError';
            if (!isCancel) {
                toast.error(err?.response?.data?.detail || err?.message || 'Could not enable biometric login.');
            }
        } finally {
            setBusy(false);
        }
    };

    const handleDismiss = () => {
        try {
            const fourteenDaysMs = 14 * 24 * 60 * 60 * 1000;
            localStorage.setItem(dismissKey, String(Date.now() + fourteenDaysMs));
            setIsDismissed(true);
        } catch (e) {
            console.warn('Could not store touchpoint dismissal:', e);
            setIsDismissed(true);
        }
    };

    const handleEnableBrowser = async () => {
        if (status === 'needs-install') {
            setShowGuideModal(true);
            return;
        }
        if (status === 'denied') {
            toast.warn('Notifications are currently blocked in your browser settings. Please allow notifications for this site.');
            return;
        }
        setBusy(true);
        try {
            const userId = localStorage.getItem('user_id');
            await enablePush(userId);
            toast.success('Mobile alerts enabled for this browser!');
            refreshStatus();
        } catch (err) {
            toast.error(err?.response?.data?.detail || err?.message || 'Could not enable alerts.');
        } finally {
            setBusy(false);
        }
    };

    const handleTurnOffBrowser = async () => {
        if (!window.confirm('Turn off phone alerts on this device?')) return;
        setBusy(true);
        try {
            await disablePushOnThisDevice();
            toast.info('Alerts turned off for this browser.');
            refreshStatus();
        } catch (err) {
            toast.error('Failed to turn off alerts.');
        } finally {
            setBusy(false);
        }
    };

    // If dismissed and not active on this device, hide the banner
    if (isDismissed && status !== 'enabled') {
        return null;
    }

    const isEnabled = status === 'enabled';

    return (
        <>
            <div className={`relative bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-4 sm:p-5 shadow-lg border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 animate-in fade-in duration-200 overflow-hidden ${className}`}>
                {/* Background ambient decorative glow */}
                <div className="absolute -right-16 -top-16 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute -left-16 -bottom-16 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

                {/* Dismiss Button */}
                {!isEnabled && (
                    <button
                        type="button"
                        onClick={handleDismiss}
                        className="absolute top-3 right-3 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
                        title="Dismiss for 14 days"
                        aria-label="Dismiss banner"
                    >
                        <X size={15} />
                    </button>
                )}

                {/* Left side content */}
                <div className="flex items-start sm:items-center gap-3.5 pr-6 md:pr-0 z-10">
                    <div className={`p-3 rounded-2xl border shrink-0 ${
                        isEnabled 
                            ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' 
                            : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30 shadow-inner'
                    }`}>
                        {isEnabled ? <CheckCircle2 size={22} /> : <Smartphone size={22} />}
                    </div>
                    <div>
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-bold uppercase tracking-wider text-emerald-300 flex items-center gap-1">
                                <Sparkles size={12} className="text-emerald-400" />
                                {title}
                            </span>
                            {isEnabled && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> Active on this device
                                </span>
                            )}
                        </div>
                        <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
                            {isEnabled
                                ? 'Your device is actively receiving real-time lock-screen alerts. RFQ details and trade amounts are strictly redacted for privacy.'
                                : description}
                        </p>
                    </div>
                </div>

                {/* Right side CTA actions */}
                <div className="flex items-center gap-2 self-stretch sm:self-auto shrink-0 z-10 justify-end flex-wrap">
                    {isBiometricSupported() && !bioActive && (
                        <button
                            type="button"
                            onClick={handleEnableBiometric}
                            disabled={busy}
                            className="min-h-[38px] px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-blue-950/40 cursor-pointer flex items-center gap-1.5"
                            title={`Enable one-tap ${getBiometricDisplayLabel()} login on this device`}
                        >
                            <Fingerprint size={15} />
                            <span>Enable {getBiometricDisplayLabel()}</span>
                        </button>
                    )}
                    {isEnabled ? (
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={() => setShowPairQrModal(true)}
                                className="min-h-[38px] px-3.5 py-1.5 bg-slate-800/80 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5"
                                title="Pair an additional smartphone"
                            >
                                <QrCode size={13} className="text-emerald-400" />
                                <span>Pair Another Phone</span>
                            </button>
                            <button
                                type="button"
                                onClick={handleTurnOffBrowser}
                                disabled={busy}
                                className="min-h-[38px] px-3 py-1.5 bg-slate-900/60 hover:bg-rose-950/40 text-slate-400 hover:text-rose-300 border border-slate-800 hover:border-rose-800/50 rounded-xl text-xs font-medium transition-colors cursor-pointer flex items-center gap-1.5"
                                title="Turn off alerts on this browser"
                            >
                                <BellOff size={13} />
                                <span className="hidden sm:inline">Turn Off</span>
                            </button>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
                            <button
                                type="button"
                                onClick={() => setShowPairQrModal(true)}
                                className="min-h-[38px] px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-emerald-950/40 cursor-pointer flex items-center gap-2 active:scale-98"
                                title="Scan with your phone camera to pair your smartphone"
                            >
                                <QrCode size={15} />
                                <span>Pair Phone via QR</span>
                            </button>
                            {status === 'available' && (
                                <button
                                    type="button"
                                    onClick={handleEnableBrowser}
                                    disabled={busy}
                                    className="min-h-[38px] px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 rounded-xl text-xs font-medium transition-colors cursor-pointer flex items-center gap-1.5"
                                    title="Enable notifications directly on this computer"
                                >
                                    <Bell size={13} />
                                    <span className="hidden lg:inline">{busy ? 'Enabling...' : 'Alert this Browser'}</span>
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Desktop QR Modal */}
            <PushPairQrModal
                isOpen={showPairQrModal}
                onClose={() => setShowPairQrModal(false)}
                onSuccess={() => {
                    refreshStatus();
                    toast.success('Smartphone linked successfully! Lock-screen alerts are now active.');
                }}
            />

            {/* iOS Safari Guide Modal */}
            <PushInstallGuideModal
                isOpen={showGuideModal}
                onClose={() => setShowGuideModal(false)}
            />
        </>
    );
}
