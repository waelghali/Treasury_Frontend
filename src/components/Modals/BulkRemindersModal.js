import React, { useState } from 'react';
import { X, Mail, Loader2, AlertTriangle } from 'lucide-react';
import { apiRequest } from '../../services/apiService';
import { toast } from 'react-toastify';

// NEW: A reusable component to provide a tooltip for disabled elements during the grace period.
const GracePeriodTooltip = ({ children, isGracePeriod }) => {
    if (isGracePeriod) {
        return (
            <div className="relative group inline-block">
                {children}
                <div className="opacity-0 w-max bg-gray-800 text-white text-xs rounded-lg py-2 px-3 absolute z-10 bottom-full left-1/2 -translate-x-1/2 pointer-events-none group-hover:opacity-100 transition-opacity duration-200">
                    This action is disabled during your subscription's grace period.
                    <svg className="absolute text-gray-800 h-2 w-full left-0 top-full" x="0px" y="0px" viewBox="0 0 255 255">
                        <polygon className="fill-current" points="0,0 127.5,127.5 255,0"/>
                    </svg>
                </div>
            </div>
        );
    }
    return children;
};

// const buttonBaseClassNames = "inline-flex items-center px-4 py-2 text-sm font-medium rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors duration-200";

const BulkRemindersModal = ({ onClose, onSuccess, isGracePeriod }) => {
    const [isProcessing, setIsProcessing] = useState(false);
    const [processError, setProcessError] = useState('');
    const [padForDuplex, setPadForDuplex] = useState(false);

    const handleGenerateBulkReminders = async () => {
        if (isGracePeriod) {
            toast.warn("This action is disabled during your subscription's grace period.");
            return;
        }
        setIsProcessing(true);
        setProcessError('');
        try {
            const response = await apiRequest(
                `/end-user/lg-records/instructions/generate-all-bank-reminders-pdf?pad_for_duplex=${padForDuplex ? 'true' : 'false'}`,
                'GET'
            );
            
            if (response && response.combined_pdf_base64) {
                const pdfData = atob(response.combined_pdf_base64);
                const pdfBytes = new Uint8Array(pdfData.length);
                for (let i = 0; i < pdfData.length; i++) {
                    pdfBytes[i] = pdfData.charCodeAt(i);
                }

                const pdfBlob = new Blob([pdfBytes], { type: 'application/pdf' });
                const pdfUrl = URL.createObjectURL(pdfBlob);

                const win = window.open(pdfUrl, '_blank', 'noopener,noreferrer');
                if (!win) {
                    const link = document.createElement('a');
                    link.href = pdfUrl;
                    link.download = 'Bank_Reminders.pdf';
                    link.target = '_blank';
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                }
                setTimeout(() => URL.revokeObjectURL(pdfUrl), 120000);

                toast.info("Generating and opening consolidated reminder PDF in a new tab. Please ensure pop-ups are allowed.");
                onSuccess();
            } else {
                 setProcessError("No eligible reminders found to generate a PDF.");
                 toast.error("No eligible reminders found.");
            }

        } catch (error) {
            console.error("Failed to generate bulk reminders:", error);
            setProcessError(`Failed to generate bulk reminders: ${error.message || 'An unexpected error occurred.'}`);
            toast.error(`Failed to generate bulk reminders: ${error.message || 'An unexpected error occurred.'}`);
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm overflow-y-auto h-full w-full z-50 flex justify-center items-center p-4">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="px-5 py-3.5 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-2.5">
                        <div className="p-2 rounded-xl bg-teal-50 text-teal-600 border border-teal-100">
                            <Mail className="h-5 w-5" />
                        </div>
                        <h2 className="text-base font-bold text-slate-900">Generate Bulk Bank Reminders</h2>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={isProcessing}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Body */}
                <div className="px-5 py-4 space-y-3.5 overflow-y-auto flex-1">
                    {processError && (
                        <div className="bg-rose-50 border border-rose-200 text-rose-700 px-3.5 py-2.5 rounded-xl text-xs font-medium flex items-center" role="alert">
                            <X className="h-4 w-4 mr-2 shrink-0" />
                            <span>{processError}</span>
                        </div>
                    )}

                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 flex flex-col gap-3">
                        <div className="flex items-start gap-2.5 text-xs text-amber-900 leading-relaxed">
                            <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                            <div>
                                <strong>Single-Sided Letterhead Printing:</strong> Each reminder letter is formatted on 1 A4 page with top letterhead clearance and its own QR security seal. Please print <strong>Single-Sided (1-Sided)</strong> on corporate letterhead.
                            </div>
                        </div>
                        <label className="inline-flex items-center gap-2 text-xs font-semibold text-amber-900 bg-white border border-amber-200 px-3 py-2 rounded-lg cursor-pointer self-start select-none">
                            <input
                                type="checkbox"
                                checked={padForDuplex}
                                onChange={(e) => setPadForDuplex(e.target.checked)}
                                disabled={isProcessing}
                                className="rounded border-amber-300 text-teal-600 focus:ring-teal-500"
                            />
                            <span>Duplex (2-sided) protection: insert blank back-page</span>
                        </label>
                    </div>

                    <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 space-y-2 text-sm text-slate-700 leading-relaxed">
                        <p>
                            This action will automatically identify all eligible LG instructions for a bank reminder, which may extend beyond the list below. It will then generate a consolidated PDF document containing all such reminders. The PDF will open in a new tab for printing.
                        </p>
                        <p className="text-xs text-slate-500">
                            Eligible instructions are those where a bank reply has not been recorded, and they fall within configured time thresholds (e.g., days since issuance/delivery).
                        </p>
                    </div>
                </div>

                {/* Footer */}
                <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex flex-col-reverse sm:flex-row sm:justify-end gap-2.5 shrink-0">
                    <button
                        type="button"
                        onClick={onClose}
                        className={`inline-flex items-center justify-center px-4 py-2 border border-slate-300 text-sm font-semibold rounded-xl text-slate-700 bg-white hover:bg-slate-50 transition-colors shadow-xs ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
                        disabled={isProcessing}
                    >
                        Cancel
                    </button>
                    <GracePeriodTooltip isGracePeriod={isGracePeriod}>
                        <button
                            type="button"
                            onClick={handleGenerateBulkReminders}
                            disabled={isProcessing || isGracePeriod}
                            className={`inline-flex items-center justify-center px-4 py-2 text-sm font-semibold rounded-xl shadow-sm bg-teal-600 text-white hover:bg-teal-700 transition-colors ${isProcessing || isGracePeriod ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            {isProcessing ? (
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                                <Mail className="h-4 w-4 mr-2" />
                            )}
                            {isProcessing ? 'Generating...' : 'Generate & Print Reminders'}
                        </button>
                    </GracePeriodTooltip>
                </div>
            </div>
        </div>
    );
};

export default BulkRemindersModal;
