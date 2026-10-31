// src/components/Modals/PushPairQrModal.jsx
import React, { useEffect, useState, useRef } from 'react';
import { Smartphone, QrCode, X, Copy, Check, CheckCircle2, ShieldCheck, RefreshCw, AlertCircle, ExternalLink } from 'lucide-react';
import apiClient from '../../services/apiClient';

export default function PushPairQrModal({ isOpen, onClose, onSuccess }) {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [qrData, setQrData] = useState(null);
    const [isCopied, setIsCopied] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [successDevice, setSuccessDevice] = useState('');
    const pollRef = useRef(null);

    const initiatePair = async () => {
        setLoading(true);
        setError('');
        setIsSuccess(false);
        try {
            const res = await apiClient.post('/notifications/push/mobile-pair/initiate');
            setQrData(res.data);
        } catch (e) {
            setError(e?.response?.data?.detail || e?.message || 'Failed to generate mobile pairing QR code.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isOpen) {
            initiatePair();
        } else {
            if (pollRef.current) {
                clearInterval(pollRef.current);
                pollRef.current = null;
            }
        }
        return () => {
            if (pollRef.current) {
                clearInterval(pollRef.current);
                pollRef.current = null;
            }
        };
    }, [isOpen]);

    // Live polling for device authorization
    useEffect(() => {
        if (!isOpen || !qrData?.pairing_token || isSuccess) {
            if (pollRef.current) {
                clearInterval(pollRef.current);
                pollRef.current = null;
            }
            return;
        }

        pollRef.current = setInterval(async () => {
            try {
                const res = await apiClient.get(`/notifications/push/mobile-pair/status/${qrData.pairing_token}`);
                if (res.data?.is_paired) {
                    setIsSuccess(true);
                    setSuccessDevice(res.data.device_label || 'Your Smartphone');
                    if (pollRef.current) {
                        clearInterval(pollRef.current);
                        pollRef.current = null;
                    }
                    if (onSuccess) onSuccess();
                    setTimeout(() => {
                        onClose();
                    }, 2500);
                }
            } catch (err) {
                // Silently continue polling
            }
        }, 2500);

        return () => {
            if (pollRef.current) {
                clearInterval(pollRef.current);
                pollRef.current = null;
            }
        };
    }, [isOpen, qrData?.pairing_token, isSuccess]);

    if (!isOpen) return null;

    const handleCopy = async () => {
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
        setTimeout(() => setIsCopied(false), 2500);
    };

    return (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-fadeIn">
            <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-3xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col animate-scaleUp">
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between bg-slate-50 dark:bg-gray-800/80">
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 flex items-center justify-center">
                            <Smartphone size={16} />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100">Pair Your Smartphone</h3>
                            <p className="text-[11px] text-gray-500 dark:text-gray-400">Lock-screen alerts for RFQs & approvals</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1.5 rounded-full hover:bg-gray-200/50 dark:hover:bg-gray-700 transition-colors cursor-pointer"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 flex flex-col items-center text-center">
                    {loading && (
                        <div className="py-12 flex flex-col items-center gap-3">
                            <RefreshCw size={28} className="animate-spin text-emerald-600" />
                            <p className="text-xs text-gray-500 font-medium">Generating secure pairing handshake...</p>
                        </div>
                    )}

                    {error && (
                        <div className="py-8 flex flex-col items-center gap-3">
                            <AlertCircle size={32} className="text-rose-500" />
                            <p className="text-xs text-rose-600 font-medium max-w-xs">{error}</p>
                            <button
                                onClick={initiatePair}
                                className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 transition-colors"
                            >
                                Try Again
                            </button>
                        </div>
                    )}

                    {!loading && !error && isSuccess && (
                        <div className="py-10 flex flex-col items-center gap-3 animate-fadeIn">
                            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center animate-bounce">
                                <CheckCircle2 size={36} />
                            </div>
                            <h4 className="text-base font-bold text-gray-900 dark:text-gray-100 mt-2">Smartphone Successfully Paired!</h4>
                            <p className="text-xs text-gray-500 dark:text-gray-400 max-w-xs">
                                <strong>{successDevice}</strong> is now linked. You will receive instant lock-screen alerts for urgent quotation events and approvals.
                            </p>
                        </div>
                    )}

                    {!loading && !error && !isSuccess && qrData && (
                        <>
                            {/* QR Code Container */}
                            <div className="relative p-4 bg-white rounded-2xl border-2 border-slate-200/80 shadow-md mb-4">
                                <img
                                    src={qrData.qr_code_base64}
                                    alt="Pairing QR Code"
                                    className="w-52 h-52 object-contain"
                                />
                                <div className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[10px] font-bold px-3 py-0.5 rounded-full shadow-xs whitespace-nowrap flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                                    <span>Scan with Camera</span>
                                </div>
                            </div>

                            {/* Instructions */}
                            <div className="text-left w-full space-y-2.5 mt-2 bg-slate-50 dark:bg-gray-700/40 p-3.5 rounded-xl border border-slate-200/70 dark:border-gray-700 text-xs text-gray-600 dark:text-gray-300">
                                <div className="flex items-start gap-2">
                                    <span className="w-5 h-5 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center shrink-0 text-[10px]">1</span>
                                    <span>Open your phone's native camera app and scan the QR code.</span>
                                </div>
                                <div className="flex items-start gap-2">
                                    <span className="w-5 h-5 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center shrink-0 text-[10px]">2</span>
                                    <span>Enter your <strong>Grow corporate password</strong> on your phone to authorize this device.</span>
                                </div>
                            </div>

                            {/* Security Notice */}
                            <div className="mt-3 flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                                <ShieldCheck size={14} className="text-emerald-600 shrink-0" />
                                <span>Zero-trust walk-up protection: password verification required on phone.</span>
                            </div>

                            {/* Copy Link Alternative */}
                            <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-700 w-full flex items-center justify-between">
                                <span className="text-[11px] text-gray-400">Can't scan right now?</span>
                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={handleCopy}
                                        className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer"
                                    >
                                        {isCopied ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                                        <span>{isCopied ? 'Link Copied!' : 'Copy Pairing Link'}</span>
                                    </button>
                                    <a
                                        href={qrData.setup_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 flex items-center gap-1"
                                        title="Open pairing ceremony in a new tab"
                                    >
                                        <ExternalLink size={12} />
                                        <span>Open</span>
                                    </a>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
