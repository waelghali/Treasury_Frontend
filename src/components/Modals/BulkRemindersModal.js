// frontend/src/components/Modals/BulkRemindersModal.js
import React, { useState } from 'react';
import { X, Mail, AlertCircle, Loader2 } from 'lucide-react';
import { apiRequest, API_BASE_URL, getAuthToken } from '../../services/apiService';
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

const buttonBaseClassNames = "inline-flex items-center px-4 py-2 text-sm font-medium rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors duration-200";

const BulkRemindersModal = ({ onClose, onSuccess, isGracePeriod }) => {
    const [isProcessing, setIsProcessing] = useState(false);
    const [processError, setProcessError] = useState('');

    const handleGenerateBulkReminders = async () => {
        if (isGracePeriod) {
            toast.warn("This action is disabled during your subscription's grace period.");
            return;
        }
        setIsProcessing(true);
        setProcessError('');
        try {
            // Corrected to use the centralized apiRequest function
            const response = await apiRequest(
                '/end-user/lg-records/instructions/generate-all-bank-reminders-pdf',
                'GET'
            );
            
            if (response && response.combined_pdf_base64) {
                // Decode the base64 string
                const pdfData = atob(response.combined_pdf_base64);
                const pdfBytes = new Uint8Array(pdfData.length);
                for (let i = 0; i < pdfData.length; i++) {
                    pdfBytes[i] = pdfData.charCodeAt(i);
                }

                // Create a blob and a URL to open the PDF in a new tab
                const pdfBlob = new Blob([pdfBytes], { type: 'application/pdf' });
                const pdfUrl = URL.createObjectURL(pdfBlob);

                const newWindow = window.open(pdfUrl, '_blank', 'noopener,noreferrer');
            
                if (newWindow) {
                    toast.info("Generating and opening consolidated reminder PDF in a new tab. Please ensure pop-ups are allowed.");
                    setTimeout(() => {
                        onSuccess();
                    }, 1000);
                } else {
                    setProcessError("Failed to open new tab. Please ensure your browser allows pop-ups.");
                    toast.error("Failed to open new tab. Check pop-up blocker.");
                }
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
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex justify-center items-center">
            <div className="bg-white p-6 rounded-lg shadow-xl w-11/12 md:w-2/3 lg:w-1/2">
                <h2 className="text-2xl font-bold text-gray-800 mb-4 border-b pb-2">Generate Bulk Bank Reminders</h2>
                
                {processError && (
                    <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-md relative mb-4 flex items-center" role="alert">
                        <X className="h-5 w-5 mr-2" />
                        <span className="block sm:inline">{processError}</span>
                    </div>
                )}
                
                <p className="text-gray-700 mb-4">
                    This action will automatically identify all eligible LG instructions for a bank reminder, which may extend beyond the list below. It will then generate a consolidated PDF document containing all such reminders. The PDF will open in a new tab for printing.
                </p>
                <p className="text-gray-700 mb-6">
                    Eligible instructions are those where a bank reply has not been recorded, and they fall
                    within configured time thresholds (e.g., days since issuance/delivery).
                </p>

                <div className="flex justify-end space-x-4">
                    <button
                        type="button"
                        onClick={onClose}
                        className={`inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
                        disabled={isProcessing}
                    >
                        Cancel
                    </button>
                    <GracePeriodTooltip isGracePeriod={isGracePeriod}>
                        <button
                            type="button"
                            onClick={handleGenerateBulkReminders}
                            disabled={isProcessing || isGracePeriod}
                            className={`inline-flex items-center px-4 py-2 text-sm font-medium rounded-md shadow-sm bg-teal-100 text-teal-700 hover:bg-teal-200 ${isProcessing || isGracePeriod ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            {isProcessing ? (
                                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                            ) : (
                                <Mail className="h-5 w-5 mr-2" />
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