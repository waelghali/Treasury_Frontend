// src/components/Modals/PushDevicesModal.jsx
// Phase Q5: Manage Registered Mobile Alert Devices.
import React, { useEffect, useState } from 'react';
import { Smartphone, Trash2, X, AlertCircle, RefreshCw, CheckCircle2, Shield, Fingerprint } from 'lucide-react';
import { listPushDevices, removePushDevice } from '../../services/pushService';

export default function PushDevicesModal({ isOpen, onClose, onDeviceRemoved }) {
    const [devices, setDevices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [actionMsg, setActionMsg] = useState('');
    const [deletingId, setDeletingId] = useState(null);

    const loadDevices = async () => {
        setLoading(true);
        setError('');
        try {
            const data = await listPushDevices();
            setDevices(data);
        } catch (e) {
            setError(e?.response?.data?.detail || e?.message || 'Failed to load devices.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isOpen) {
            setActionMsg('');
            loadDevices();
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleRemove = async (id, label) => {
        if (!window.confirm(`Revoke mobile alerts for "${label || 'this device'}"? It will no longer receive alerts.`)) {
            return;
        }
        setDeletingId(id);
        setError('');
        setActionMsg('');
        try {
            await removePushDevice(id);
            setDevices(prev => prev.filter(d => d.id !== id));
            setActionMsg(`Device "${label || 'Device'}" removed successfully.`);
            if (onDeviceRemoved) onDeviceRemoved(id);
        } catch (e) {
            setError(e?.response?.data?.detail || e?.message || 'Failed to remove device.');
        } finally {
            setDeletingId(null);
        }
    };

    const formatTimestamp = (ts) => {
        if (!ts) return 'Never';
        try {
            return new Date(ts).toLocaleString([], {
                year: 'numeric', month: 'short', day: 'numeric',
                hour: '2-digit', minute: '2-digit'
            });
        } catch {
            return String(ts);
        }
    };

    return (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs animate-fadeIn">
            <div
                className="w-full max-w-md bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col max-h-[85vh]"
                role="dialog"
                aria-modal="true"
            >
                {/* Header */}
                <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between bg-gray-50/70 dark:bg-gray-800/80">
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 flex items-center justify-center">
                            <Smartphone size={18} />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-gray-900 dark:text-white">Active Alert Devices</h3>
                            <p className="text-[11px] text-gray-500 dark:text-gray-400">Manage phones receiving quotation alerts</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                        aria-label="Close"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-5 overflow-y-auto space-y-3.5 flex-1">
                    {actionMsg && (
                        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center gap-2">
                            <CheckCircle2 size={15} className="shrink-0 text-emerald-600" />
                            <span>{actionMsg}</span>
                        </div>
                    )}

                    {error && (
                        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center gap-2">
                            <AlertCircle size={15} className="shrink-0 text-rose-600" />
                            <span>{error}</span>
                        </div>
                    )}

                    {loading ? (
                        <div className="py-8 text-center text-xs text-gray-500 flex flex-col items-center justify-center gap-2">
                            <RefreshCw size={18} className="animate-spin text-emerald-600" />
                            <span>Loading registered devices...</span>
                        </div>
                    ) : devices.length === 0 ? (
                        <div className="py-8 text-center space-y-2">
                            <Smartphone size={32} className="mx-auto text-gray-300 dark:text-gray-600" />
                            <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">No active devices</p>
                            <p className="text-[11px] text-gray-500 dark:text-gray-400 max-w-xs mx-auto">
                                Enable phone alerts from the bell on any phone or browser to receive real-time quotation alerts.
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-2.5">
                            {devices.map((d) => (
                                <div
                                    key={d.id}
                                    className="p-3.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/80 shadow-2xs hover:border-gray-300 transition-all flex items-start justify-between gap-3"
                                >
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className="text-xs font-bold text-gray-900 dark:text-white truncate">
                                                {d.device_label || 'Browser / Phone'}
                                            </span>
                                            <span className="text-[10px] font-bold uppercase px-1.5 py-0.2 rounded-md bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                                                {d.platform || 'web'}
                                            </span>
                                            {d.has_biometric && (
                                                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.2 rounded-md bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                                                    <Fingerprint size={10} />
                                                    <span>Face ID / Fingerprint</span>
                                                </span>
                                            )}
                                        </div>
                                        <div className="mt-1 text-[11px] text-gray-500 dark:text-gray-400 space-y-0.5">
                                            <p>Added: {formatTimestamp(d.created_at)}</p>
                                            {d.last_success_at && (
                                                <p className="text-emerald-700 dark:text-emerald-400 font-medium">
                                                    Last alert delivered: {formatTimestamp(d.last_success_at)}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => handleRemove(d.id, d.device_label)}
                                        disabled={deletingId === d.id}
                                        title="Revoke and remove this device"
                                        className="text-xs font-medium text-rose-600 hover:text-rose-700 p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors disabled:opacity-50 shrink-0 flex items-center gap-1"
                                    >
                                        <Trash2 size={14} />
                                        <span className="hidden sm:inline">Remove</span>
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}

                    <div className="pt-2 border-t border-gray-100 dark:border-gray-700 flex items-start gap-2 text-[11px] text-gray-500 dark:text-gray-400">
                        <Shield size={13} className="shrink-0 text-emerald-600 mt-0.5" />
                        <span>
                            If you lost a phone or switch to a new handset, remove the old device here to immediately stop alert delivery.
                        </span>
                    </div>
                </div>

                {/* Footer */}
                <div className="px-5 py-3 border-t border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50 flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-4 py-1.5 text-xs font-semibold text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 border border-gray-200 dark:border-gray-600 rounded-xl transition-colors cursor-pointer"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
}
