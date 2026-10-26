// src/components/Modals/PushInstallGuideModal.jsx
// Phase Q5: Mobile PWA & Push Notification Installation Guide.
import React from 'react';
import { Smartphone, Share, PlusSquare, MoreVertical, Download, BellRing, X, CheckCircle2 } from 'lucide-react';
import { isIos } from '../../services/pushService';

export default function PushInstallGuideModal({ isOpen, onClose }) {
    if (!isOpen) return null;

    const onApple = isIos();

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
                        <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400 flex items-center justify-center">
                            <Smartphone size={18} />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-gray-900 dark:text-white">Mobile Alert Setup Guide</h3>
                            <p className="text-[11px] text-gray-500 dark:text-gray-400">
                                {onApple ? 'iPhone & iPad Installation' : 'Android & Desktop Setup'}
                            </p>
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
                <div className="p-5 overflow-y-auto space-y-4 flex-1 text-xs text-gray-600 dark:text-gray-300">
                    {onApple ? (
                        <>
                            <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl text-amber-900 dark:text-amber-200 text-[11px]">
                                <strong>Apple iOS Requirement:</strong> Apple requires adding Grow to your Home Screen to enable lock-screen notifications (iOS 16.4+).
                            </div>

                            <ol className="space-y-3">
                                <li className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-100 dark:border-gray-700">
                                    <div className="w-6 h-6 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center shrink-0 text-xs">
                                        1
                                    </div>
                                    <div>
                                        <p className="font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                                            Tap the Share button <Share size={14} className="text-blue-600" />
                                        </p>
                                        <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                                            In Safari, tap the Share icon at the bottom of the screen (or top on iPad).
                                        </p>
                                    </div>
                                </li>

                                <li className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-100 dark:border-gray-700">
                                    <div className="w-6 h-6 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center shrink-0 text-xs">
                                        2
                                    </div>
                                    <div>
                                        <p className="font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                                            Select "Add to Home Screen" <PlusSquare size={14} className="text-emerald-600" />
                                        </p>
                                        <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                                            Scroll down the share sheet and tap <strong>Add to Home Screen</strong>, then tap <strong>Add</strong> at top right.
                                        </p>
                                    </div>
                                </li>

                                <li className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-100 dark:border-gray-700">
                                    <div className="w-6 h-6 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center shrink-0 text-xs">
                                        3
                                    </div>
                                    <div>
                                        <p className="font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                                            Open Grow from Home Screen &amp; Enable <BellRing size={14} className="text-indigo-600" />
                                        </p>
                                        <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                                            Open the newly added <strong>Grow</strong> app icon, sign in, open the notification bell, and tap <strong>Enable</strong>.
                                        </p>
                                    </div>
                                </li>
                            </ol>
                        </>
                    ) : (
                        <>
                            <div className="p-3 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-xl text-blue-900 dark:text-blue-200 text-[11px]">
                                <strong>Android &amp; Desktop Chrome / Edge:</strong> Instant alerts directly in your browser or installed app.
                            </div>

                            <ol className="space-y-3">
                                <li className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-100 dark:border-gray-700">
                                    <div className="w-6 h-6 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center shrink-0 text-xs">
                                        1
                                    </div>
                                    <div>
                                        <p className="font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                                            Tap "Enable" in the Notification Bell <BellRing size={14} className="text-emerald-600" />
                                        </p>
                                        <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                                            Open the bell at the bottom of the sidebar and click <strong>Enable</strong>.
                                        </p>
                                    </div>
                                </li>

                                <li className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-100 dark:border-gray-700">
                                    <div className="w-6 h-6 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center shrink-0 text-xs">
                                        2
                                    </div>
                                    <div>
                                        <p className="font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                                            Select "Allow" in Browser Prompt <CheckCircle2 size={14} className="text-emerald-600" />
                                        </p>
                                        <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                                            When Chrome or Edge prompts to show notifications, tap <strong>Allow</strong>.
                                        </p>
                                    </div>
                                </li>

                                <li className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-100 dark:border-gray-700">
                                    <div className="w-6 h-6 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center shrink-0 text-xs">
                                        3
                                    </div>
                                    <div>
                                        <p className="font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                                            Optional: Install App <Download size={14} className="text-blue-600" />
                                        </p>
                                        <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                                            Tap browser menu <MoreVertical size={12} className="inline" /> → <strong>Install app</strong> or <strong>Add to Home Screen</strong> for a dedicated standalone app icon.
                                        </p>
                                    </div>
                                </li>
                            </ol>
                        </>
                    )}
                </div>

                {/* Footer */}
                <div className="px-5 py-3 border-t border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50 flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-4 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors cursor-pointer"
                    >
                        Got it
                    </button>
                </div>
            </div>
        </div>
    );
}
