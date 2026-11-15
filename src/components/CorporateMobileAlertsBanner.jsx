// src/components/CorporateMobileAlertsBanner.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { Smartphone, QrCode, Bell, X, Sparkles, Fingerprint } from 'lucide-react';
import { toast } from 'react-toastify';
import {
    getPushStatus,
    enablePush,
    listPushDevices,
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

export const ALERTS_BANNER_SYNC_EVENT = 'grow-push-alerts-updated';

const getUnifiedDismissKey = () => {
    try {
        const uid = localStorage.getItem('user_id') || 'default';
        return `grow_mobile_alerts_banner_snoozed_${uid}`;
    } catch {
        return 'grow_mobile_alerts_banner_snoozed_default';
    }
};

const readIsDismissed = (legacyKey) => {
    try {
        const now = Date.now();
        const unifiedUntil = Number(localStorage.getItem(getUnifiedDismissKey()) || 0);
        if (unifiedUntil && now < unifiedUntil) return true;
        if (legacyKey) {
            const legacyUntil = Number(localStorage.getItem(legacyKey) || 0);
            if (legacyUntil && now < legacyUntil) return true;
        }
        return false;
    } catch {
        return false;
    }
};

export default function CorporateMobileAlertsBanner({
    title = 'Stay Ahead with Instant Mobile Alerts',
    description = 'Receive real-time lock-screen notifications for incoming bank quotations, RFQ approval requests, and countdown timeouts — even when your laptop is closed.',
    dismissKey = 'corporate_mobile_alerts_dismissed_until',
    className = 'mb-6'
}) {
    const [status, setStatus] = useState('loading');
    const [pairedDevicesCount, setPairedDevicesCount] = useState(0);
    const [busy, setBusy] = useState(false);
    const [bioBusy, setBioBusy] = useState(false);
    const [bioActive, setBioActive] = useState(() => getStoredBiometricInfo().hasBiometric);
    const [preloadedBioRegOpts, setPreloadedBioRegOpts] = useState(null);
    const [showPairQrModal, setShowPairQrModal] = useState(false);
    const [showGuideModal, setShowGuideModal] = useState(false);
    const [isDismissed, setIsDismissed] = useState(() => readIsDismissed(dismissKey));

    const refreshStatus = useCallback(async () => {
        try {
            const [pushState, devices] = await Promise.all([
                getPushStatus().catch(() => 'unsupported'),
                listPushDevices().catch(() => []),
            ]);
            setStatus(pushState);
            setPairedDevicesCount(Array.isArray(devices) ? devices.length : 0);
            setBioActive(getStoredBiometricInfo().hasBiometric);
            setIsDismissed(readIsDismissed(dismissKey));
        } catch {
            setStatus('unsupported');
        }
    }, [dismissKey]);

    useEffect(() => {
        refreshStatus();
        if (isBiometricSupported() && !getStoredBiometricInfo().hasBiometric) {
            fetchBiometricRegistrationOptions()
                .then((opts) => setPreloadedBioRegOpts(opts))
                .catch(() => {});
        }

        const handleSync = () => {
            refreshStatus();
        };
        window.addEventListener(ALERTS_BANNER_SYNC_EVENT, handleSync);
        window.addEventListener('focus', handleSync);
        return () => {
            window.removeEventListener(ALERTS_BANNER_SYNC_EVENT, handleSync);
            window.removeEventListener('focus', handleSync);
        };
    }, [refreshStatus]);

    const handleEnableBiometric = async () => {
        setBioBusy(true);
        try {
            const opts = preloadedBioRegOpts || (await fetchBiometricRegistrationOptions());
            await enrollBiometricWithOptions(opts);
            setBioActive(true);
            toast.success(`${getBiometricDisplayLabel()} login enabled on this device!`);
            window.dispatchEvent(new Event(ALERTS_BANNER_SYNC_EVENT));
        } catch (err) {
            const isCancel = err?.name === 'NotAllowedError' || err?.name === 'AbortError';
            if (!isCancel) {
                toast.error(err?.response?.data?.detail || err?.message || 'Could not enable biometric login.');
            }
        } finally {
            setBioBusy(false);
        }
    };

    const handleDismiss = () => {
        try {
            const fourteenDaysUntil = String(Date.now() + 14 * 24 * 60 * 60 * 1000);
            localStorage.setItem(getUnifiedDismissKey(), fourteenDaysUntil);
            if (dismissKey) {
                localStorage.setItem(dismissKey, fourteenDaysUntil);
            }
        } catch (e) {
            console.warn('Could not store banner dismissal:', e);
        }
        setIsDismissed(true);
        window.dispatchEvent(new Event(ALERTS_BANNER_SYNC_EVENT));
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
            toast.success('Alerts enabled for this browser!');
            await refreshStatus();
            window.dispatchEvent(new Event(ALERTS_BANNER_SYNC_EVENT));
        } catch (err) {
            toast.error(err?.response?.data?.detail || err?.message || 'Could not enable alerts.');
        } finally {
            setBusy(false);
        }
    };

    // Wait for status check so the bar never flashes on screen when already active
    if (status === 'loading') {
        return null;
    }

    const hasActiveAlerts = status === 'enabled' || pairedDevicesCount > 0;

    // Auto-hide once alerts are active (on browser or paired phone) or when dismissed,
    // while keeping modals mounted if a pairing celebration is currently visible
    if ((isDismissed || hasActiveAlerts) && !showPairQrModal && !showGuideModal) {
        return null;
    }

    const showBiometricOption = isBiometricSupported() && !bioActive;
    const showBrowserOption = status === 'available' || status === 'needs-install';

    return (
        <>
            {!isDismissed && !hasActiveAlerts && (
                <div className={`relative bg-gradient-to-r from-slate-900 via-[#16203b] to-slate-900 text-white rounded-2xl px-4 py-3.5 sm:px-5 shadow-md border border-slate-800/90 flex flex-col xl:flex-row xl:items-center justify-between gap-3.5 overflow-hidden ${className}`}>
                    {/* Subtle ambient glow */}
                    <div className="absolute -right-16 -top-16 w-44 h-44 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
                    <div className="absolute -left-16 -bottom-16 w-44 h-44 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

                    {/* Top / Left section: Icon + Message + Mobile/Compact Dismiss */}
                    <div className="flex items-start justify-between gap-3 flex-1 min-w-0 z-10">
                        <div className="flex items-start sm:items-center gap-3.5 min-w-0">
                            <div className="p-2.5 rounded-xl border bg-emerald-500/15 text-emerald-400 border-emerald-500/30 shrink-0">
                                <Smartphone size={20} />
                            </div>
                            <div className="min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-300 flex items-center gap-1">
                                        <Sparkles size={12} className="text-emerald-400 shrink-0" />
                                        {title}
                                    </span>
                                </div>
                                <p className="text-xs text-slate-300 mt-0.5 leading-relaxed">
                                    {description}
                                </p>
                            </div>
                        </div>

                        {/* Dismiss button on stacked (< xl) viewports — dedicated slot, never overlaps buttons */}
                        <button
                            type="button"
                            onClick={handleDismiss}
                            className="xl:hidden shrink-0 inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white/[0.07] hover:bg-white/[0.15] text-slate-300 hover:text-white border border-white/10 text-[11px] font-medium transition-colors cursor-pointer"
                            title="Hide for 14 days"
                            aria-label="Dismiss banner"
                        >
                            <X size={13} />
                            <span className="hidden sm:inline">Dismiss</span>
                        </button>
                    </div>

                    {/* Bottom / Right section: Balanced Action Buttons + Desktop Dismiss */}
                    <div className="flex items-center gap-2 flex-wrap sm:pl-[46px] xl:pl-0 shrink-0 z-10">
                        {/* Primary recommended action */}
                        <button
                            type="button"
                            onClick={() => setShowPairQrModal(true)}
                            className="h-9 px-3.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold transition-all shadow-sm cursor-pointer inline-flex items-center gap-1.5"
                            title="Scan with your phone camera to receive lock-screen alerts"
                        >
                            <QrCode size={14} className="shrink-0" />
                            <span>Pair Phone via QR</span>
                        </button>

                        {/* Secondary alert action */}
                        {showBrowserOption && (
                            <button
                                type="button"
                                onClick={handleEnableBrowser}
                                disabled={busy}
                                className="h-9 px-3 bg-white/[0.07] hover:bg-white/[0.14] text-slate-200 hover:text-white border border-white/15 rounded-xl text-xs font-medium transition-colors cursor-pointer inline-flex items-center gap-1.5 disabled:opacity-50"
                                title="Enable notifications directly on this browser"
                            >
                                <Bell size={13} className="text-slate-300 shrink-0" />
                                <span>{busy ? 'Enabling...' : status === 'needs-install' ? 'Enable on iPhone' : 'Alert this Browser'}</span>
                            </button>
                        )}

                        {/* Secondary quick-login option — visually calm & distinct, kept accessible */}
                        {showBiometricOption && (
                            <button
                                type="button"
                                onClick={handleEnableBiometric}
                                disabled={bioBusy}
                                className="h-9 px-3 bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-200 hover:text-white border border-indigo-400/30 rounded-xl text-xs font-medium transition-colors cursor-pointer inline-flex items-center gap-1.5 disabled:opacity-50"
                                title={`Enable one-tap ${getBiometricDisplayLabel()} sign-in on this device`}
                            >
                                <Fingerprint size={14} className="text-indigo-300 shrink-0" />
                                <span>{bioBusy ? 'Setting up...' : `Enable ${getBiometricDisplayLabel()}`}</span>
                            </button>
                        )}

                        {/* Dedicated Desktop Dismiss slot (xl+) — separated by divider so it never touches buttons */}
                        <div className="hidden xl:flex items-center pl-1.5 ml-0.5 border-l border-white/10">
                            <button
                                type="button"
                                onClick={handleDismiss}
                                className="h-9 px-2.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.14] text-slate-300 hover:text-white border border-white/10 text-xs font-medium transition-colors cursor-pointer inline-flex items-center gap-1"
                                title="Hide for 14 days"
                                aria-label="Dismiss banner"
                            >
                                <X size={14} />
                                <span>Dismiss</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Desktop QR Modal */}
            <PushPairQrModal
                isOpen={showPairQrModal}
                onClose={() => setShowPairQrModal(false)}
                onSuccess={() => {
                    refreshStatus();
                    window.dispatchEvent(new Event(ALERTS_BANNER_SYNC_EVENT));
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
