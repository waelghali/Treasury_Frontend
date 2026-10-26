// src/components/MobileAlertsControl.jsx
// Minimal "Phone alerts" control (Notifications Q3). The full Mobile Alerts
// page (device list, quotation on/off switch, install guide) arrives in Q5.
import React, { useCallback, useEffect, useState } from 'react';
import { Smartphone, BellRing, BellOff, Info } from 'lucide-react';
import { disablePushOnThisDevice, enablePush, getPushStatus } from '../services/pushService';

const HINTS = {
    'needs-install': 'On iPhone/iPad: tap Share, then "Add to Home Screen", open Grow from the new icon and enable here.',
    denied: 'Notifications are blocked for this site. Allow them in your browser or phone settings, then reload.',
    unsupported: 'This browser cannot receive phone alerts.',
};

export default function MobileAlertsControl() {
    const [status, setStatus] = useState('loading');
    const [busy, setBusy] = useState(false);
    const [message, setMessage] = useState('');

    const refresh = useCallback(async () => {
        try {
            setStatus(await getPushStatus());
        } catch (e) {
            setStatus('unsupported');
        }
    }, []);

    useEffect(() => { refresh(); }, [refresh]);

    const run = async (fn, okText) => {
        setBusy(true);
        setMessage('');
        try {
            await fn();
            setMessage(okText);
        } catch (e) {
            setMessage(e?.response?.data?.detail || e?.message || 'Something went wrong.');
        } finally {
            setBusy(false);
            refresh();
        }
    };

    const userId = localStorage.getItem('user_id');

    return (
        <div id="mobile-alerts-control" className="px-4 py-3 border-t border-gray-100 dark:border-gray-800 bg-gray-50/60 dark:bg-gray-800/40">
            <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-gray-700 dark:text-gray-200">
                    <Smartphone size={14} />
                    Phone alerts
                    {status === 'enabled' && <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded-full">On</span>}
                </div>
                <div className="flex items-center gap-2">
                    {status === 'available' && (
                        <button
                            id="mobile-alerts-enable"
                            disabled={busy}
                            onClick={() => run(() => enablePush(userId), 'Phone alerts are on. You will be alerted here when a quotation needs approval, is decided, is about to close, has quotes ready, or is resolved.')}
                            className="text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 px-2.5 py-1 rounded-md flex items-center gap-1"
                        >
                            <BellRing size={12} /> Enable
                        </button>
                    )}
                    {status === 'enabled' && (
                        <button
                            id="mobile-alerts-disable"
                            disabled={busy}
                            onClick={() => run(() => disablePushOnThisDevice(), 'Phone alerts are off for this device.')}
                            className="text-xs font-medium text-gray-500 hover:text-red-600 disabled:opacity-50 flex items-center gap-1"
                        >
                            <BellOff size={12} /> Turn off
                        </button>
                    )}
                </div>
            </div>
            {HINTS[status] && (
                <p className="mt-1.5 text-[11px] text-gray-500 dark:text-gray-400 flex gap-1"><Info size={12} className="shrink-0 mt-0.5" />{HINTS[status]}</p>
            )}
            {message && <p className="mt-1.5 text-[11px] text-gray-600 dark:text-gray-300">{message}</p>}
        </div>
    );
}
