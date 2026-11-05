// src/components/MobileAlertsControl.jsx
// Phone alerts control & UX (Notifications Q3 + Q5).
import React, { useCallback, useEffect, useState } from 'react';
import { Smartphone, BellRing, BellOff, Info, Settings2, HelpCircle, AlertTriangle, QrCode, Fingerprint } from 'lucide-react';
import {
    disablePushOnThisDevice,
    enablePush,
    getPushStatus,
    listPushDevices,
    SWITCHED_OWNER_KEY,
} from '../services/pushService';
import {
    isBiometricSupported,
    getBiometricDisplayLabel,
    getStoredBiometricInfo,
    clearStoredBiometricInfo,
    fetchBiometricRegistrationOptions,
    enrollBiometricWithOptions,
} from '../services/biometricService';
import PushDevicesModal from './Modals/PushDevicesModal';
import PushInstallGuideModal from './Modals/PushInstallGuideModal';
import PushPairQrModal from './Modals/PushPairQrModal';

const HINTS = {
    'needs-install': 'On iPhone/iPad: tap Share, then "Add to Home Screen", open Grow from the new icon and enable here.',
    denied: 'Notifications are blocked for this site. Allow them in your browser or phone settings, then reload.',
    unsupported: 'This browser cannot receive phone alerts.',
};

export default function MobileAlertsControl() {
    const [status, setStatus] = useState('loading');
    const [busy, setBusy] = useState(false);
    const [message, setMessage] = useState('');
    const [showDevicesModal, setShowDevicesModal] = useState(false);
    const [showGuideModal, setShowGuideModal] = useState(false);
    const [showPairQrModal, setShowPairQrModal] = useState(false);
    const [switchedNotice, setSwitchedNotice] = useState(false);
    const [bioActive, setBioActive] = useState(() => getStoredBiometricInfo().hasBiometric);
    const [preloadedBioRegOpts, setPreloadedBioRegOpts] = useState(null);
    const [pairedDevicesCount, setPairedDevicesCount] = useState(0);

    const refresh = useCallback(async () => {
        try {
            const [s, devs] = await Promise.all([
                getPushStatus(),
                listPushDevices().catch(() => []),
            ]);
            setStatus(s);
            setPairedDevicesCount(Array.isArray(devs) ? devs.length : 0);
            setBioActive(getStoredBiometricInfo().hasBiometric);
        } catch (e) {
            setStatus('unsupported');
        }
    }, []);

    useEffect(() => {
        refresh();
        try {
            if (sessionStorage.getItem(SWITCHED_OWNER_KEY)) {
                setSwitchedNotice(true);
            }
        } catch {}
        if (isBiometricSupported() && !getStoredBiometricInfo().hasBiometric) {
            fetchBiometricRegistrationOptions()
                .then((opts) => setPreloadedBioRegOpts(opts))
                .catch(() => {});
        }
    }, [refresh]);

    const dismissSwitchedNotice = () => {
        setSwitchedNotice(false);
        try {
            sessionStorage.removeItem(SWITCHED_OWNER_KEY);
        } catch {}
    };

    const run = async (fn, okText) => {
        setBusy(true);
        setMessage('');
        try {
            await fn();
            setMessage(okText);
            dismissSwitchedNotice();
        } catch (e) {
            setMessage(e?.response?.data?.detail || e?.message || 'Something went wrong.');
        } finally {
            setBusy(false);
            refresh();
        }
    };

    const userId = localStorage.getItem('user_id');

    return (
        <>
            <div id="mobile-alerts-control" className="px-3.5 py-2.5 border-t border-gray-100 dark:border-gray-800 bg-gray-50/70 dark:bg-gray-800/40">
                {/* Notice if previous user's push alerts were safely deactivated on this shared browser */}
                {switchedNotice && (
                    <div className="mb-2 p-2 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-lg text-[10px] text-amber-900 dark:text-amber-200 flex items-start justify-between gap-1.5 animate-fadeIn">
                        <div className="flex items-start gap-1 min-w-0">
                            <AlertTriangle size={12} className="text-amber-600 shrink-0 mt-0.5" />
                            <span>Phone alerts were turned off because another account was active on this browser. Click Enable to turn them on for your account.</span>
                        </div>
                        <button
                            onClick={dismissSwitchedNotice}
                            className="text-amber-700 dark:text-amber-300 font-bold hover:underline shrink-0 text-[10px]"
                        >
                            Dismiss
                        </button>
                    </div>
                )}

                <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-700 dark:text-gray-200">
                        <Smartphone size={13} className="text-gray-500" />
                        <span>Phone alerts</span>
                        {status === 'enabled' && (
                            <span className="text-[9px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.2 rounded-full">On (This device)</span>
                        )}
                        {status !== 'enabled' && pairedDevicesCount > 0 && (
                            <span className="text-[9px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.2 rounded-full">
                                {pairedDevicesCount === 1 ? '1 Device Active' : `${pairedDevicesCount} Devices Active`}
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-1.5">
                        {status === 'available' && (
                            <button
                                id="mobile-alerts-enable"
                                disabled={busy}
                                onClick={() => run(() => enablePush(userId), 'Phone alerts are on. You will be alerted here for urgent quotation events, approvals, and critical LG Custody escalations.')}
                                className="text-[11px] font-medium text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 px-2 py-0.8 rounded-md flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                            >
                                <BellRing size={11} /> {pairedDevicesCount > 0 ? 'Enable here' : 'Enable'}
                            </button>
                        )}
                        {status === 'enabled' && (
                            <button
                                id="mobile-alerts-disable"
                                disabled={busy}
                                onClick={() => run(() => disablePushOnThisDevice(), 'Phone alerts are off for this device.')}
                                className="text-[11px] font-medium text-gray-500 hover:text-rose-600 disabled:opacity-50 flex items-center gap-1 cursor-pointer transition-colors"
                            >
                                <BellOff size={11} /> Turn off
                            </button>
                        )}
                        <button
                            type="button"
                            onClick={() => setShowPairQrModal(true)}
                            title="Pair smartphone via QR code"
                            className="p-1 text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300 rounded-md hover:bg-emerald-50 dark:hover:bg-emerald-950/60 transition-colors cursor-pointer flex items-center gap-1"
                        >
                            <QrCode size={12} />
                            <span className="text-[10px] font-bold hidden sm:inline">Pair Phone</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setShowDevicesModal(true)}
                            title="Manage registered devices"
                            className="p-1 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 rounded-md hover:bg-gray-200/60 dark:hover:bg-gray-700 transition-colors cursor-pointer"
                        >
                            <Settings2 size={12} />
                        </button>
                        <button
                            type="button"
                            onClick={() => setShowGuideModal(true)}
                            title="How to install & enable phone alerts"
                            className="p-1 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 rounded-md hover:bg-gray-200/60 dark:hover:bg-gray-700 transition-colors cursor-pointer"
                        >
                            <HelpCircle size={12} />
                        </button>
                    </div>
                </div>

                {/* Dedicated Biometric Login Row */}
                {isBiometricSupported() && (
                    <div className="mt-2 pt-2 border-t border-gray-200/60 dark:border-gray-700/60 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-700 dark:text-gray-200">
                            <Fingerprint size={13} className="text-blue-600 dark:text-blue-400" />
                            <span>{getBiometricDisplayLabel()} Login</span>
                            {bioActive && (
                                <span className="text-[9px] font-bold text-blue-700 bg-blue-100 dark:bg-blue-950 dark:text-blue-300 px-1.5 py-0.2 rounded-full">
                                    Active
                                </span>
                            )}
                        </div>
                        <div className="flex items-center gap-2">
                            {!bioActive ? (
                                <button
                                    type="button"
                                    disabled={busy}
                                    onClick={() =>
                                        run(async () => {
                                            const opts = preloadedBioRegOpts || (await fetchBiometricRegistrationOptions());
                                            await enrollBiometricWithOptions(opts);
                                            setBioActive(true);
                                        }, `${getBiometricDisplayLabel()} login is now active on this device.`)
                                    }
                                    className="text-[11px] font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 px-2.5 py-0.8 rounded-md flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                                >
                                    <Fingerprint size={11} /> Enable {getBiometricDisplayLabel()}
                                </button>
                            ) : (
                                <button
                                    type="button"
                                    disabled={busy}
                                    onClick={() => {
                                        clearStoredBiometricInfo();
                                        setBioActive(false);
                                        setMessage(`${getBiometricDisplayLabel()} login turned off on this browser.`);
                                    }}
                                    className="text-[11px] font-medium text-gray-500 hover:text-rose-600 cursor-pointer transition-colors"
                                >
                                    Turn off
                                </button>
                            )}
                        </div>
                    </div>
                )}

                {HINTS[status] && (
                    <p className="mt-1 text-[10px] text-gray-500 dark:text-gray-400 flex gap-1 leading-tight">
                        <Info size={11} className="shrink-0 mt-0.5" />
                        <span>{HINTS[status]}</span>
                    </p>
                )}
                {message && <p className="mt-1 text-[10px] text-gray-600 dark:text-gray-300 font-medium">{message}</p>}
            </div>

            {/* Modals */}
            <PushPairQrModal
                isOpen={showPairQrModal}
                onClose={() => setShowPairQrModal(false)}
                onSuccess={() => refresh()}
            />
            <PushDevicesModal
                isOpen={showDevicesModal}
                onClose={() => {
                    setShowDevicesModal(false);
                    refresh();
                }}
                onDeviceRemoved={() => refresh()}
            />
            <PushInstallGuideModal
                isOpen={showGuideModal}
                onClose={() => setShowGuideModal(false)}
            />
        </>
    );
}
