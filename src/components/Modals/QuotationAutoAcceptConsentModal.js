import React, { useState } from 'react';
import { ShieldAlert, AlertTriangle, X, Check, Lock } from 'lucide-react';

export default function QuotationAutoAcceptConsentModal({
    isOpen,
    configKey,
    companyName,
    onConfirm,
    onClose
}) {
    const [acknowledged, setAcknowledged] = useState(false);

    if (!isOpen) return null;

    const isSingleQuote = configKey === 'AUTO_ACCEPT_SINGLE_QUOTE';

    const handleConfirm = () => {
        if (!acknowledged) return;
        onConfirm();
        setAcknowledged(false);
    };

    const handleCancel = () => {
        setAcknowledged(false);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
            <div 
                className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className={`px-6 py-4.5 border-b flex items-center justify-between ${
                    isSingleQuote ? 'bg-gradient-to-r from-amber-50 to-orange-50/80 border-amber-200' : 'bg-gradient-to-r from-indigo-50 to-blue-50/80 border-indigo-200'
                }`}>
                    <div className="flex items-center gap-3">
                        <div className={`p-2.5 rounded-xl shadow-xs border shrink-0 ${
                            isSingleQuote 
                                ? 'bg-amber-100 text-amber-700 border-amber-300' 
                                : 'bg-indigo-100 text-indigo-700 border-indigo-300'
                        }`}>
                            <ShieldAlert className="h-5 w-5" />
                        </div>
                        <div>
                            <h3 className="text-base font-bold text-slate-900">
                                {isSingleQuote 
                                    ? 'Uncontested Single-Quote Execution Consent' 
                                    : 'Automated Quotation Execution Consent'}
                            </h3>
                            <p className="text-xs text-slate-500 font-medium mt-0.5">
                                Institutional Legal Delegation & Responsibility Notice
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={handleCancel}
                        className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-white/60 transition-colors"
                        title="Close without saving"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Body Content */}
                <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto custom-scrollbar text-xs leading-relaxed text-slate-600">
                    {/* Notice of Administrative Delegation */}
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
                        <div className="flex items-center gap-2 font-bold text-slate-900 text-xs uppercase tracking-wide">
                            <Lock className="h-3.5 w-3.5 text-indigo-600" />
                            <span>Administrative Execution Delegation Policy</span>
                        </div>
                        <p className="text-slate-700">
                            Enabling automated execution constitutes strictly an <strong>administrative delegation of executing the acceptance action upon countdown timeout</strong> according to your pre-configured parameters. This is <strong>NOT</strong> a delegation of commercial, financial, or trading decision-making.
                        </p>
                        <p className="text-slate-700">
                            The corporate user and <strong>{companyName || 'your organization'}</strong> acknowledge and agree that the Grow platform acts solely as an automated processing assistant, and that all trading decisions, counterparty selections, pricing acceptance, and financial risks remain solely the commercial and legal responsibility of the corporate organization.
                        </p>
                    </div>

                    {/* Single-Quote Monopoly Warning (if applicable) */}
                    {isSingleQuote && (
                        <div className="bg-amber-50 border border-amber-300 rounded-xl p-4 space-y-2 text-amber-950">
                            <div className="flex items-center gap-2 font-bold text-amber-900 text-xs">
                                <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                                <span>High-Risk Sole-Source Pricing Warning</span>
                            </div>
                            <p className="text-amber-900 leading-normal">
                                Uncontested quotes have <strong>no competing market bids</strong> to establish fair value spread. Enabling this setting permits binding corporate execution of sole-source monopoly rates upon countdown expiry without manual spread verification.
                            </p>
                        </div>
                    )}

                    {/* Checkbox Acknowledgment (Mandatory, non-prechecked) */}
                    <label className="flex items-start gap-3 p-3.5 rounded-xl border border-slate-300 bg-slate-50/60 hover:bg-slate-50 cursor-pointer transition-colors group">
                        <input
                            type="checkbox"
                            checked={acknowledged}
                            onChange={(e) => setAcknowledged(e.target.checked)}
                            className="mt-0.5 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer shrink-0"
                        />
                        <span className="text-xs font-semibold text-slate-800 select-none">
                            I confirm on behalf of <strong>{companyName || 'my organization'}</strong> that enabling automated execution is strictly a procedural execution delegation, and that our organization retains full, sole commercial, financial, and legal responsibility for all trade executions, counterparty selections, and price risks.
                        </span>
                    </label>
                </div>

                {/* Footer Actions */}
                <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-3">
                    <button
                        type="button"
                        onClick={handleCancel}
                        className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:text-slate-900 bg-white border border-slate-300 hover:bg-slate-100 transition-colors cursor-pointer"
                    >
                        Cancel / Keep Safe
                    </button>
                    <button
                        type="button"
                        onClick={handleConfirm}
                        disabled={!acknowledged}
                        className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white transition-all shadow-sm cursor-pointer ${
                            acknowledged
                                ? isSingleQuote 
                                    ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-600/20' 
                                    : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-600/20'
                                : 'bg-slate-300 text-slate-500 cursor-not-allowed'
                        }`}
                    >
                        <Check className="h-4 w-4" />
                        <span>Acknowledge & Enable Auto-Accept</span>
                    </button>
                </div>
            </div>
        </div>
    );
}
