import React, { useState, useEffect } from 'react';
import { X, AlertTriangle, Loader2 } from 'lucide-react';
import { toast } from 'react-toastify';
import moment from 'moment';

import { cancelLGInstruction } from '../../services/apiService';
import { apiRequest } from '../../services/apiService';

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

const CancelInstructionModal = ({ instruction, onClose, onSuccess, isGracePeriod }) => {
    const [reason, setReason] = useState('');
    const [declarationConfirmed, setDeclarationConfirmed] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [cancellationWindowHours, setCancellationWindowHours] = useState(24);
    const [timeRemaining, setTimeRemaining] = useState(null);

    useEffect(() => {
		const fetchCancellationWindow = async () => {
			try {
				const response = await apiRequest('/end-user/customer-configurations/MAX_DAYS_FOR_LAST_INSTRUCTION_CANCELLATION', 'GET');
				setCancellationWindowHours(parseInt(response.effective_value, 10) * 24);
			} catch (error) {
				console.error("Failed to fetch cancellation window config:", error);
				setCancellationWindowHours(24); 
			}
		};

        fetchCancellationWindow();
    }, []);
    
    useEffect(() => {
        if (!instruction || !instruction.created_at) return;

        const interval = setInterval(() => {
            const now = moment();
            const created = moment(instruction.created_at);
            const cutoff = created.add(cancellationWindowHours, 'hours');
            const diff = cutoff.diff(now);

            if (diff > 0) {
                const duration = moment.duration(diff);
                const hours = Math.floor(duration.asHours());
                const minutes = duration.minutes();
                const seconds = duration.seconds();
                setTimeRemaining(`${hours}h ${minutes}m ${seconds}s`);
            } else {
                setTimeRemaining('0h 0m 0s');
                clearInterval(interval);
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [instruction, cancellationWindowHours]);


    const handleCancel = async () => {
        if (isGracePeriod) { // NEW: Grace period check
            toast.warn("This action is disabled during your subscription's grace period.");
            return;
        }

        if (!reason.trim()) {
            toast.error("Please provide a reason for cancellation.");
            return;
        }
        if (!declarationConfirmed) {
            toast.error("You must confirm the declaration to proceed.");
            return;
        }

        setIsLoading(true);
        try {
            const response = await cancelLGInstruction(instruction.id, reason, declarationConfirmed);
            toast.success(
                response?.message ||
                (response?.status === 'PENDING'
                    ? 'Cancellation request submitted for Corporate Admin approval.'
                    : 'Instruction canceled successfully.')
            );
            if (onSuccess) {
                await onSuccess(response?.lg_record, response?.instruction?.id);
            }
            if (onClose) {
                onClose();
            }
        } catch (error) {
            console.error("Failed to cancel instruction:", error);
            toast.error(`Failed to cancel instruction: ${error.message || 'An unexpected error occurred.'}`);
        } finally {
            setIsLoading(false);
        }
    };

    const isButtonDisabled = isLoading || !reason.trim() || !declarationConfirmed || timeRemaining === '0h 0m 0s' || isGracePeriod; // NEW: Added isGracePeriod

    const formatActionTypeLabel = (actionType) => {
        if (!actionType) return '';
        return actionType.replace(/_/g, ' ').split(' ').map(word => {
            const upper = word.toUpperCase();
            if (upper === 'LG' || upper === 'ID' || upper === 'RFQ') return upper;
            return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
        }).join(' ');
    };

    return (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="px-5 py-3.5 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-2.5">
                        <div className="p-2 rounded-xl bg-rose-50 text-rose-600 border border-rose-100">
                            <AlertTriangle className="h-5 w-5" />
                        </div>
                        <h3 className="text-base font-bold text-slate-900">
                            Cancel Last Instruction
                        </h3>
                    </div>
                    <button
                        type="button"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                        onClick={onClose}
                    >
                        <span className="sr-only">Close</span>
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Body */}
                <div className="px-5 py-4 space-y-4 overflow-y-auto flex-1">
                    <p className="text-sm text-slate-600">
                        You are about to cancel the following instruction. This action will roll back the LG to its previous state.
                    </p>
                    <div className="p-3.5 border border-slate-200/80 rounded-xl bg-slate-50 text-xs text-slate-700 space-y-1">
                        <p><strong className="text-slate-900">Instruction Type:</strong> {formatActionTypeLabel(instruction.instruction_type)}</p>
                        <p><strong className="text-slate-900">Instruction Serial:</strong> <span className="font-mono">{instruction.serial_number}</span></p>
                        <p><strong className="text-slate-900">LG Number:</strong> {instruction.lg_record?.lg_number || 'N/A'}</p>
                        <p><strong className="text-slate-900">Issued On:</strong> {moment(instruction.created_at).format('DD-MMM-YYYY HH:mm')}</p>
                        <p className="pt-1.5 text-rose-600 font-bold">
                            Time left to cancel: {timeRemaining || 'Loading...'}
                        </p>
                    </div>

                    <div className={isGracePeriod ? 'opacity-50' : ''}>
                        <label htmlFor="reason" className="block text-xs font-semibold text-slate-700 mb-1">Reason for Cancellation</label>
                        <textarea
                            id="reason"
                            name="reason"
                            rows="3"
                            className="block w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-sm text-slate-800 shadow-xs focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-rose-500"
                            placeholder="e.g., Incorrect amount was entered"
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            disabled={isGracePeriod}
                        ></textarea>
                    </div>

                    <div className={isGracePeriod ? 'opacity-50' : ''}>
                        <div className="flex items-start gap-2.5 bg-slate-50/70 p-3 rounded-xl border border-slate-200/80">
                            <input
                                id="declaration"
                                name="declaration"
                                type="checkbox"
                                className="mt-0.5 focus:ring-rose-500 h-4 w-4 text-rose-600 border-slate-300 rounded"
                                checked={declarationConfirmed}
                                onChange={(e) => setDeclarationConfirmed(e.target.checked)}
                                disabled={isGracePeriod}
                            />
                            <label htmlFor="declaration" className="text-xs leading-relaxed font-medium text-slate-700">
                                I confirm that this instruction is to be considered null and void,
                                that it has not been delivered to the bank, or if delivered, all necessary
                                steps have been taken to stop its use, including shredding physical copies
                                and ensuring it will not be used in any way. I take full responsibility for this action.
                            </label>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex flex-col-reverse sm:flex-row sm:justify-end gap-2.5 shrink-0">
                    <button
                        type="button"
                        className="w-full sm:w-auto inline-flex justify-center items-center rounded-xl border border-slate-300 shadow-xs px-4 py-2 bg-white text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                        onClick={onClose}
                        disabled={isLoading}
                    >
                        Back
                    </button>
                    <GracePeriodTooltip isGracePeriod={isGracePeriod}>
                        <button
                            type="button"
                            className={`w-full sm:w-auto inline-flex justify-center items-center rounded-xl border border-transparent shadow-sm px-4 py-2 text-sm font-semibold text-white transition-colors
                                ${isButtonDisabled ? 'bg-rose-300 cursor-not-allowed' : 'bg-rose-600 hover:bg-rose-700 focus:outline-none focus:ring-2 focus:ring-rose-500'}`}
                            onClick={handleCancel}
                            disabled={isButtonDisabled}
                        >
                            {isLoading ? (
                                <Loader2 className="animate-spin h-4 w-4 text-white mr-1.5" />
                            ) : null}
                            {isLoading ? 'Canceling...' : 'Confirm Cancellation'}
                        </button>
                    </GracePeriodTooltip>
                </div>
            </div>
        </div>
    );
};

export default CancelInstructionModal;