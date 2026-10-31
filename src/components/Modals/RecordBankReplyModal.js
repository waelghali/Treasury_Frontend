// frontend/src/components/Modals/RecordBankReplyModal.js
import React, { useState, useEffect, useRef, Fragment } from 'react';
import { Dialog, DialogPanel, DialogTitle, Transition, TransitionChild } from '@headlessui/react';
import { X, Building, AlertCircle, Loader2, Eye, Calendar, ArrowLeftRight, CheckCircle2, ShieldCheck } from 'lucide-react';
import { Formik, Form, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';
import { apiRequest } from '../../services/apiService';
import { toast } from 'react-toastify';
import moment from 'moment';
import DocumentInspectorModal from './DocumentInspectorModal';

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

const RecordBankReplyModal = ({ instruction, onClose, onSuccess, isGracePeriod, apiUrl }) => {
    const fileInputRef = useRef(null);
    const [activeInstruction, setActiveInstruction] = useState(instruction);
    const [switchedFromInstructionId, setSwitchedFromInstructionId] = useState(null);
    const [replyFile, setReplyFile] = useState(null);
    const [verificationResult, setVerificationResult] = useState(null);
    const [overrideReason, setOverrideReason] = useState('');
    const [alignDateOnOverride, setAlignDateOnOverride] = useState(true);
    const [isActionLoading, setIsActionLoading] = useState(false);

    useEffect(() => {
        setActiveInstruction(instruction);
        setSwitchedFromInstructionId(null);
    }, [instruction]);

    const isCancelLiquidation = activeInstruction.action_type === 'CANCEL_LIQUIDATION' || activeInstruction.instruction_type === 'CANCEL_LIQUIDATION';
    const [confirmOriginalReturned, setConfirmOriginalReturned] = useState(false);
    const [selectedBankReplyDate, setSelectedBankReplyDate] = useState(moment().format('YYYY-MM-DD'));
    const [selectedReplyDetails, setSelectedReplyDetails] = useState('');
    const [isInspectorOpen, setIsInspectorOpen] = useState(false);
    const [previewUrl, setPreviewUrl] = useState(null);

    useEffect(() => {
        if (replyFile) {
            const url = URL.createObjectURL(replyFile);
            setPreviewUrl(url);
            return () => {
                URL.revokeObjectURL(url);
            };
        } else {
            setPreviewUrl(null);
        }
    }, [replyFile]);

    const instructionIssueDate = moment(activeInstruction.instruction_date || activeInstruction.created_at).format('YYYY-MM-DD');

    const initialValues = {
        bankReplyDate: moment().format('YYYY-MM-DD'),
        replyDetails: '',
    };

    const BankReplySchema = Yup.object().shape({
        bankReplyDate: Yup.date()
            .required('Bank reply date is required')
            .max(new Date(), 'Bank reply date cannot be in the future')
            .min(instructionIssueDate, 'Bank reply date cannot be earlier than the instruction issue date'),
        replyDetails: Yup.string().nullable().max(500, 'Reply details cannot exceed 500 characters'),
    });

    const getTargetUrl = (instId) => {
        if (apiUrl && instId === instruction.id) {
            return apiUrl;
        }
        return `/end-user/lg-records/instructions/${instId}/record-bank-reply`;
    };

    const handleSubmit = async (values, { setSubmitting, setErrors }) => {
        if (isGracePeriod) {
            toast.warn("This action is disabled during your subscription's grace period.");
            setSubmitting(false);
            return;
        }

        if (isCancelLiquidation && !confirmOriginalReturned) {
            toast.error("You must confirm that the original physical LG document has been retrieved/received back from the bank before completing this action.");
            setSubmitting(false);
            return;
        }

        setSelectedBankReplyDate(values.bankReplyDate);
        setSelectedReplyDetails(values.replyDetails || '');

        try {
            const formData = new FormData();
            formData.append('bank_reply_date', values.bankReplyDate);
            formData.append('reply_details', values.replyDetails || '');
            if (isCancelLiquidation) {
                formData.append('original_lg_returned_from_bank', 'true');
            }
            if (switchedFromInstructionId) {
                formData.append('switched_from_instruction_id', String(switchedFromInstructionId));
            }
            if (replyFile) {
                const documentMetadata = {
                    document_type: "BANK_REPLY",
                    file_name: replyFile.name,
                    mime_type: replyFile.type,
                    lg_instruction_id: activeInstruction.id,
                };
                formData.append('bank_reply_document_file', replyFile);
                formData.append('bank_reply_document_metadata', JSON.stringify(documentMetadata));
            }

            const url = getTargetUrl(activeInstruction.id);
            const response = await apiRequest(
                url,
                'POST',
                formData,
                'multipart/form-data'
            );

            const aiVerification = response?.action_data?.ai_verification || response?.ai_verification;
            if (response?.status === 'date_variance' || (aiVerification && aiVerification.status === 'date_variance')) {
                setVerificationResult(aiVerification);
                toast.info('Bank confirmed expiry date with minor calendar convention variance — please confirm alignment.');
                setSubmitting(false);
                return;
            }

            if (response?.status === 'mismatch' || (aiVerification && aiVerification.status === 'mismatch')) {
                setVerificationResult(aiVerification);
                if (aiVerification?.instruction_disambiguation) {
                    toast.warn(`This bank reply belongs to your ${aiVerification.instruction_disambiguation.matched_type_label} instruction (${aiVerification.instruction_disambiguation.matched_serial}).`);
                } else {
                    toast.warn('AI verification found discrepancies — please review.');
                }
                setSubmitting(false);
                return;
            }

            toast.success(`Bank reply recorded successfully for Instruction ${activeInstruction.serial_number}!`);
            onSuccess();
        } catch (error) {
            console.error("Failed to record bank reply:", error);
            toast.error(`Failed to record bank reply: ${error.message || 'An unexpected error occurred.'}`);
            setErrors({ general: error.message || 'An unexpected error occurred.' });
        } finally {
            setSubmitting(false);
        }
    };

    // Item 1: Handle "Accept & Align to Bank's Confirmed Date" (Step 1: align in-place in 0ms; Step 2: user clicks Confirm & Record Reply)
    const handleAcceptDateAlignment = (confirmedDateStr) => {
        const targetAlignedDate =
            confirmedDateStr ||
            verificationResult?.date_convention_variance?.bank_confirmed_expiry_date ||
            verificationResult?.bank_terms_modification?.bank_confirmed_expiry_date;
        if (!targetAlignedDate) return;
        const isFavorableExt = !!(
            verificationResult?.bank_terms_modification?.is_favorable_extension ||
            verificationResult?.date_convention_variance?.favorable_to_beneficiary
        );
        setAlignDateOnOverride(true);
        setVerificationResult(prev => {
            if (!prev) return prev;
            const remainingMismatches = (prev.mismatches || []).filter(
                m => !m.includes('Favorable Extended Expiry') && !m.includes('Expiry date mismatch')
            );
            const alignMsg = isFavorableExt
                ? `Favorable further expiry date accepted and aligned to ${targetAlignedDate} (Corporate Admin will be notified automatically).`
                : `Expiry date aligned to bank calendar convention: ${targetAlignedDate}.`;
            const existingMatches = (prev.matches || []).filter(
                m => !m.includes('Expiry date aligned') && !m.includes('Favorable further expiry date accepted')
            );
            return {
                ...prev,
                status: remainingMismatches.length === 0 ? 'verified' : 'mismatch',
                mismatches: remainingMismatches,
                matches: [alignMsg, ...existingMatches],
                date_convention_variance: null,
                bank_terms_modification: prev.bank_terms_modification?.is_favorable_extension ? null : prev.bank_terms_modification,
                aligned_expiry_date: targetAlignedDate,
            };
        });
        toast.info(`Expiry date aligned to ${targetAlignedDate}. Click "Confirm & Record Reply" to save.`);
    };

    // Item 2: Handle "Switch to Instruction" (Step 1: switch in-place in 0ms without calling AI or auto-recording; Step 2: user reviews and clicks Confirm/Submit/Proceed)
    const handleSwitchAndRecord = async (disambiguation) => {
        if (!disambiguation?.matched_instruction_id) return;
        const origId = switchedFromInstructionId || activeInstruction.id;
        const matchedId = disambiguation.matched_instruction_id;

        // Update active instruction context in modal immediately (0ms)
        setSwitchedFromInstructionId(origId);
        setActiveInstruction(prev => ({
            ...prev,
            id: matchedId,
            serial_number: disambiguation.matched_serial || prev.serial_number,
            instruction_type: disambiguation.matched_type || prev.instruction_type,
            global_seq_per_lg: disambiguation.matched_seq || prev.global_seq_per_lg,
        }));

        if (disambiguation.matched_verification) {
            setVerificationResult(disambiguation.matched_verification);
            const nextStatus = disambiguation.matched_verification.status;
            if (nextStatus === 'verified') {
                toast.info(`Switched to ${disambiguation.matched_type_label} (${disambiguation.matched_serial}). Click "Confirm & Record Reply" to save.`);
            } else if (nextStatus === 'date_variance') {
                toast.info(`Switched to ${disambiguation.matched_type_label} (${disambiguation.matched_serial}). Please review calendar date variance.`);
            } else {
                toast.warn(`Switched to ${disambiguation.matched_type_label} (${disambiguation.matched_serial}) — please review the remaining AI findings before recording.`);
            }
            return;
        }

        // Fallback if matched_verification was not pre-computed
        setVerificationResult(prev => {
            if (!prev) return prev;
            const remaining = (prev.mismatches || []).filter(m => m !== disambiguation.prompt_message);
            return {
                ...prev,
                status: remaining.length === 0 ? 'verified' : 'mismatch',
                mismatches: remaining,
                instruction_disambiguation: null,
                matches: [
                    `Switched target instruction to ${disambiguation.matched_type_label} (${disambiguation.matched_serial}).`,
                    ...(prev.matches || []),
                ],
            };
        });
        toast.info(`Switched to ${disambiguation.matched_type_label} (${disambiguation.matched_serial}). Click "Confirm & Record Reply" to save.`);
    };

    // Handle "Confirm & Record Reply" / "Proceed Anyway"
    const handleProceedAnyway = async () => {
        setIsActionLoading(true);
        try {
            const url = getTargetUrl(activeInstruction.id);
            const hasRemainingMismatches = (verificationResult?.mismatches?.length || 0) > 0;
            const formData = new FormData();
            formData.append('bank_reply_date', selectedBankReplyDate || moment().format('YYYY-MM-DD'));
            if (selectedReplyDetails) {
                formData.append('reply_details', selectedReplyDetails);
            }
            if (isCancelLiquidation) {
                formData.append('original_lg_returned_from_bank', 'true');
            }
            if (switchedFromInstructionId) {
                formData.append('switched_from_instruction_id', String(switchedFromInstructionId));
            }
            if (replyFile) {
                const documentMetadata = {
                    document_type: "BANK_REPLY",
                    file_name: replyFile.name,
                    mime_type: replyFile.type,
                    lg_instruction_id: activeInstruction.id,
                };
                formData.append('bank_reply_document_file', replyFile);
                formData.append('bank_reply_document_metadata', JSON.stringify(documentMetadata));
            }
            if (hasRemainingMismatches) {
                formData.append('force_override', 'true');
                formData.append('override_reason', overrideReason || 'User approved bank reply despite AI discrepancies');
            }
            const alignedExpiry = verificationResult?.aligned_expiry_date || (verificationResult?.date_convention_variance && alignDateOnOverride ? verificationResult.date_convention_variance.bank_confirmed_expiry_date : null);
            if (alignedExpiry) {
                formData.append('accept_date_alignment', 'true');
                formData.append('aligned_expiry_date', alignedExpiry);
            }
            if (verificationResult) {
                formData.append('ai_verification_json', JSON.stringify(verificationResult));
            }

            await apiRequest(url, 'POST', formData, 'multipart/form-data');
            toast.success(
                hasRemainingMismatches
                    ? 'Bank reply recorded with user override and document saved!'
                    : `Bank reply recorded successfully for ${activeInstruction.serial_number}!`
            );
            onSuccess();
        } catch (error) {
            toast.error(`Failed to record bank reply: ${error.message || 'An unexpected error occurred.'}`);
        } finally {
            setIsActionLoading(false);
        }
    };

    // Enhancement A: Submit Bank-Modified Terms (>3 days date variance or amount difference) for Corporate Admin Maker-Checker Approval
    const handleRequestAdminTermsApproval = async () => {
        setIsActionLoading(true);
        try {
            const url = getTargetUrl(activeInstruction.id);
            const formData = new FormData();
            formData.append('bank_reply_date', selectedBankReplyDate || moment().format('YYYY-MM-DD'));
            if (selectedReplyDetails) {
                formData.append('reply_details', selectedReplyDetails);
            }
            if (isCancelLiquidation) {
                formData.append('original_lg_returned_from_bank', 'true');
            }
            if (switchedFromInstructionId) {
                formData.append('switched_from_instruction_id', String(switchedFromInstructionId));
            }
            if (replyFile) {
                const documentMetadata = {
                    document_type: "BANK_REPLY",
                    file_name: replyFile.name,
                    mime_type: replyFile.type,
                    lg_instruction_id: activeInstruction.id,
                };
                formData.append('bank_reply_document_file', replyFile);
                formData.append('bank_reply_document_metadata', JSON.stringify(documentMetadata));
            }
            formData.append('request_admin_terms_approval', 'true');
            if (overrideReason) {
                formData.append('override_reason', overrideReason);
            }
            if (verificationResult) {
                formData.append('ai_verification_json', JSON.stringify(verificationResult));
            }

            await apiRequest(url, 'POST', formData, 'multipart/form-data');
            toast.success('Bank reply recorded and bank-modified terms submitted for Corporate Admin approval!');
            onSuccess();
        } catch (error) {
            toast.error(`Failed to submit bank-modified terms for admin approval: ${error.message || 'An unexpected error occurred.'}`);
        } finally {
            setIsActionLoading(false);
        }
    };

    // Handle "Cancel & Re-upload"
    const handleCancelReupload = () => {
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
            fileInputRef.current.click();
        }
        const cancelUrl = apiUrl
            ? apiUrl.replace('/bank-reply', '/cancel-bank-reply')
            : `/end-user/lg-records/instructions/${activeInstruction.id}/cancel-bank-reply`;
        apiRequest(cancelUrl, 'POST').catch(() => {});
        setVerificationResult(null);
        setReplyFile(null);
    };

    const handleCancelClose = async () => {
        if (verificationResult) {
            try {
                const cancelUrl = apiUrl
                    ? apiUrl.replace('/bank-reply', '/cancel-bank-reply')
                    : `/end-user/lg-records/instructions/${activeInstruction.id}/cancel-bank-reply`;
                await apiRequest(cancelUrl, 'POST').catch(() => {});
            } catch (e) {}
        }
        onClose();
    };

    const dateVariance = verificationResult?.date_convention_variance;
    const disambiguation = verificationResult?.instruction_disambiguation;
    const termsModification = verificationResult?.bank_terms_modification;
    const extractedLetterDate = verificationResult?.bank_reply_letter_date || verificationResult?.extracted_data?.cited_effective_date;
    const isDateVarianceOnly = verificationResult?.status === 'date_variance' && !!dateVariance;

    return (
        <Transition show={true} as={Fragment}>
            <Dialog as="div" className="relative z-10" onClose={handleCancelClose}>
                <TransitionChild
                    as={Fragment}
                    enter="ease-out duration-300"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="ease-in duration-200"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                >
                    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
                </TransitionChild>

                <div className="fixed inset-0 z-10 w-screen overflow-y-auto">
                    <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
                        <TransitionChild
                            as={Fragment}
                            enter="ease-out duration-300"
                            enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
                            enterTo="opacity-100 translate-y-0 sm:scale-100"
                            leave="ease-in duration-200"
                            leaveFrom="opacity-100"
                            leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
                        >
                            <DialogPanel className={`relative transform overflow-hidden rounded-2xl bg-white text-left shadow-2xl transition-all sm:w-full ${verificationResult ? 'p-4 sm:p-5 sm:my-3 sm:max-w-4xl' : 'p-6 sm:my-8 sm:max-w-lg'}`}>
                                <div className={`flex items-start justify-between border-b ${verificationResult ? 'pb-2.5 mb-3' : 'pb-3 mb-4'}`}>
                                    <div>
                                        <DialogTitle as="h3" className="text-lg font-bold text-gray-900 tracking-tight">
                                            Record Bank Reply for Instruction: <span className="text-blue-700 font-mono">{activeInstruction.serial_number}</span>
                                        </DialogTitle>
                                        {!verificationResult && (
                                            <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
                                                Record the bank's formal response and attach advice or correspondence.
                                            </p>
                                        )}
                                    </div>
                                    <button
                                        type="button"
                                        className="rounded-md bg-white text-gray-400 hover:text-gray-600 focus:outline-none p-1"
                                        onClick={handleCancelClose}
                                    >
                                        <span className="sr-only">Close</span>
                                        <X className="h-5 w-5" aria-hidden="true" />
                                    </button>
                                </div>

                                <Formik
                                    initialValues={initialValues}
                                    validationSchema={BankReplySchema}
                                    onSubmit={handleSubmit}
                                >
                                    {({ isSubmitting, errors, touched }) => (
                                        <Form className={`${verificationResult ? 'space-y-2.5' : 'space-y-4'} ${isGracePeriod ? 'opacity-50' : ''}`}>
                                            {/* Info Banner */}
                                            <div className={`flex flex-wrap items-center gap-x-3 gap-y-1 bg-blue-50 border border-blue-200 text-blue-900 px-3.5 rounded-lg text-xs sm:text-sm font-medium ${verificationResult ? 'py-1.5' : 'py-2'}`}>
                                                <span><strong>LG:</strong> {activeInstruction.lg_record?.lg_number || activeInstruction.lg_number || 'N/A'}</span>
                                                <span className="text-blue-300">•</span>
                                                <span><strong>Type:</strong> {activeInstruction.instruction_type || activeInstruction.action_type?.replace(/_/g, ' ') || 'N/A'}</span>
                                                <span className="text-blue-300">•</span>
                                                <span><strong>Instruction Date:</strong> {new Date(activeInstruction.instruction_date || activeInstruction.created_at).toLocaleDateString()}</span>
                                                {activeInstruction.delivery_date && (
                                                    <>
                                                        <span className="text-blue-300">•</span>
                                                        <span><strong>Delivered:</strong> {new Date(activeInstruction.delivery_date).toLocaleDateString()}</span>
                                                    </>
                                                )}
                                            </div>

                                            {/* Bank Reply Inputs: Stacked normally, Side-by-Side when AI Verification is open */}
                                            <div className={verificationResult ? 'grid grid-cols-1 sm:grid-cols-12 gap-3 items-start' : 'space-y-4'}>
                                                <div className={verificationResult ? 'sm:col-span-3' : ''}>
                                                    <label htmlFor="bankReplyDate" className="block text-sm font-medium text-gray-700 mb-1">
                                                        Bank Reply Date <span className="text-red-500">*</span>
                                                    </label>
                                                    <Field
                                                        type="date"
                                                        id="bankReplyDate"
                                                        name="bankReplyDate"
                                                        className={`block w-full px-3 ${verificationResult ? 'py-1.5' : 'py-2'} text-sm rounded-lg border shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${errors.bankReplyDate && touched.bankReplyDate ? 'border-red-500 bg-red-50' : 'border-gray-300'}`}
                                                        max={moment().format('YYYY-MM-DD')}
                                                        min={instructionIssueDate}
                                                        disabled={isGracePeriod}
                                                    />
                                                    <ErrorMessage name="bankReplyDate" component="div" className="text-red-600 text-xs mt-1" />
                                                </div>

                                                <div className={verificationResult ? 'sm:col-span-5' : ''}>
                                                    <div className="flex items-center justify-between mb-1">
                                                        <label htmlFor="replyFile" className="block text-sm font-medium text-gray-700">
                                                            Bank Reply Document (Optional)
                                                        </label>
                                                        <span className="text-xs text-gray-500">Max 5MB</span>
                                                    </div>
                                                    <input
                                                        ref={fileInputRef}
                                                        id="replyFile"
                                                        name="replyFile"
                                                        type="file"
                                                        accept="image/*,application/pdf"
                                                        onChange={async (event) => {
                                                            const rawFile = event.currentTarget.files?.[0];
                                                            setVerificationResult(null);
                                                            if (rawFile) {
                                                                try {
                                                                    const buf = await rawFile.arrayBuffer();
                                                                    setReplyFile(new File([buf], rawFile.name, { type: rawFile.type || 'application/pdf' }));
                                                                } catch (e) {
                                                                    setReplyFile(rawFile);
                                                                }
                                                            } else {
                                                                setReplyFile(null);
                                                            }
                                                        }}
                                                        className={`block w-full text-sm text-gray-500
                                                                   file:mr-4 ${verificationResult ? 'file:py-1.5' : 'file:py-2'} file:px-4
                                                                   file:rounded-md file:border-0
                                                                   file:text-sm file:font-semibold
                                                                   file:bg-blue-50 file:text-blue-700
                                                                   hover:file:bg-blue-100
                                                                   border border-gray-300 rounded-lg bg-white cursor-pointer`}
                                                        disabled={isGracePeriod}
                                                    />
                                                </div>

                                                <div className={verificationResult ? 'sm:col-span-4' : ''}>
                                                    <label htmlFor="replyDetails" className="block text-sm font-medium text-gray-700 mb-1">
                                                        Reply Details / Notes (Optional)
                                                    </label>
                                                    <Field
                                                        as={verificationResult ? 'input' : 'textarea'}
                                                        rows={verificationResult ? undefined : '2'}
                                                        type={verificationResult ? 'text' : undefined}
                                                        id="replyDetails"
                                                        name="replyDetails"
                                                        placeholder="e.g. Bank accepted extension request, updated validity confirmed"
                                                        className={`block w-full px-3 ${verificationResult ? 'py-1.5' : 'py-2'} text-sm rounded-lg border border-gray-300 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500`}
                                                        disabled={isGracePeriod}
                                                    />
                                                    <ErrorMessage name="replyDetails" component="div" className="text-red-600 text-xs mt-1" />
                                                </div>
                                            </div>

                                            {/* Cancel Liquidation Confirmation (if applicable) */}
                                            {isCancelLiquidation && (
                                                <div className="p-2.5 bg-amber-50 border border-amber-300 rounded-lg flex items-start gap-2.5 mb-3">
                                                    <input
                                                        type="checkbox"
                                                        id="confirmOriginalReturned"
                                                        checked={confirmOriginalReturned}
                                                        onChange={(e) => setConfirmOriginalReturned(e.target.checked)}
                                                        className="mt-0.5 h-4 w-4 text-amber-600 focus:ring-amber-500 border-gray-300 rounded cursor-pointer shrink-0"
                                                    />
                                                    <div>
                                                        <label htmlFor="confirmOriginalReturned" className="text-xs sm:text-sm font-bold text-amber-900 leading-snug cursor-pointer">
                                                            I confirm that the original physical LG document has been retrieved / received back from the bank. <span className="text-red-500">*</span>
                                                        </label>
                                                        <p className="text-xs text-amber-700 font-medium mt-0.5">
                                                            Required: Physical retrieval must be confirmed to complete liquidation cancellation.
                                                        </p>
                                                    </div>
                                                </div>
                                            )}

                                            {errors.general && (
                                                <div className="text-red-600 text-sm mt-1 mb-2 flex items-center gap-1.5">
                                                    <AlertCircle className="h-4 w-4 shrink-0" />
                                                    {errors.general}
                                                </div>
                                            )}

                                            {/* ─── ITEM 1: STREAMLINED DATE CONVENTION VARIANCE MODAL BOX (when only variance is <= 3 days) ─── */}
                                            {isDateVarianceOnly && (
                                                <div className="p-4 bg-blue-50 border-2 border-blue-300 rounded-xl space-y-3 shadow-sm">
                                                    <div className="flex items-start justify-between gap-2">
                                                        <div className="flex items-center gap-2">
                                                            <Calendar className="h-5 w-5 text-blue-600 shrink-0" />
                                                            <div>
                                                                <h4 className="text-sm font-bold text-blue-950">
                                                                    Bank Expiry Date Tolerance Alignment
                                                                </h4>
                                                                <span className="inline-block text-[11px] font-mono font-semibold px-2 py-0.5 rounded bg-blue-100 text-blue-800 border border-blue-200 mt-0.5">
                                                                    DATE_CONVENTION_VARIANCE (≤ {dateVariance.tolerance_days || 3} Calendar Days)
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <p className="text-xs sm:text-sm text-blue-900 leading-relaxed bg-white/80 p-3 rounded-lg border border-blue-200 font-medium">
                                                        {dateVariance.prompt_message}
                                                    </p>

                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                                                        <div className="bg-white p-2.5 rounded-lg border border-blue-200 flex items-center justify-between">
                                                            <span className="text-gray-600 font-medium">Requested Expiry:</span>
                                                            <span className="font-mono font-bold text-gray-800">{dateVariance.requested_expiry_date}</span>
                                                        </div>
                                                        <div className="bg-blue-100/70 p-2.5 rounded-lg border border-blue-300 flex items-center justify-between">
                                                            <span className="text-blue-900 font-semibold">Bank Confirmed Date:</span>
                                                            <span className="font-mono font-bold text-blue-800">
                                                                {dateVariance.bank_confirmed_expiry_date} ({dateVariance.variance_days > 0 ? `+${dateVariance.variance_days}` : dateVariance.variance_days}d)
                                                            </span>
                                                        </div>
                                                    </div>

                                                    {verificationResult.matches?.length > 0 && (
                                                        <div className="bg-emerald-50 border border-emerald-200 p-2.5 rounded-lg">
                                                            <p className="text-xs font-bold text-emerald-800 mb-1">✓ Verified Checks:</p>
                                                            <ul className="list-disc list-inside text-xs text-emerald-700 space-y-0.5 leading-snug">
                                                                {verificationResult.matches.map((m, i) => (
                                                                    <li key={i}>{m}</li>
                                                                ))}
                                                            </ul>
                                                        </div>
                                                    )}

                                                    <div className="flex items-center justify-between flex-wrap gap-2 pt-2 border-t border-blue-200">
                                                        <button
                                                            type="button"
                                                            onClick={() => setIsInspectorOpen(true)}
                                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-cyan-300 border border-slate-700 rounded-lg text-xs font-semibold shadow-sm transition-colors"
                                                        >
                                                            <Eye className="h-3.5 w-3.5 text-cyan-400" />
                                                            <span>🔍 Inspect Scan</span>
                                                        </button>

                                                        <div className="flex items-center gap-2 flex-wrap">
                                                            <button
                                                                type="button"
                                                                onClick={handleCancelClose}
                                                                disabled={isActionLoading}
                                                                className="px-3 py-1.5 bg-white hover:bg-gray-100 text-gray-700 border border-gray-300 text-xs font-medium rounded-lg transition-colors"
                                                            >
                                                                Cancel
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={handleCancelReupload}
                                                                disabled={isActionLoading}
                                                                className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-medium rounded-lg transition-colors"
                                                            >
                                                                🔄 Re-upload
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={handleProceedAnyway}
                                                                disabled={isActionLoading}
                                                                className="px-3 py-1.5 bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 text-xs font-medium rounded-lg transition-colors"
                                                            >
                                                                Keep {dateVariance.requested_expiry_date}
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleAcceptDateAlignment(dateVariance.bank_confirmed_expiry_date)}
                                                                disabled={isActionLoading}
                                                                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-bold rounded-lg shadow-sm flex items-center gap-1.5 transition-colors"
                                                            >
                                                                {isActionLoading ? (
                                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                                ) : (
                                                                    <CheckCircle2 className="h-4 w-4" />
                                                                )}
                                                                <span>Accept & Align to {dateVariance.bank_confirmed_expiry_date}</span>
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            {/* ─── AI Verification Discrepancy & Disambiguation Box (when status === 'mismatch' or 'verified' after switch/align) ─── */}
                                            {verificationResult && !isDateVarianceOnly && (
                                                <div className={`p-3 border rounded-xl space-y-2.5 ${(verificationResult.mismatches?.length || 0) === 0 ? 'bg-emerald-50 border-emerald-300' : 'bg-amber-50 border-amber-300'}`}>
                                                    <div className="flex items-center justify-between flex-wrap gap-2">
                                                        <div className="flex items-center gap-2">
                                                            {(verificationResult.mismatches?.length || 0) === 0 ? (
                                                                <>
                                                                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                                                                    <h4 className="text-sm font-bold text-emerald-900">AI Verification: All Checks Verified — Ready to Record</h4>
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <AlertCircle className="h-4 w-4 text-amber-600 shrink-0" />
                                                                    <h4 className="text-sm font-bold text-amber-900">AI Verification: Review Detected Discrepancies</h4>
                                                                </>
                                                            )}
                                                        </div>
                                                        <span className={`text-xs ${(verificationResult.mismatches?.length || 0) === 0 ? 'text-emerald-800' : 'text-amber-800'}`}>
                                                            {(verificationResult.mismatches?.length || 0) === 0
                                                                ? 'Click Confirm & Record Reply below to complete.'
                                                                : termsModification && !disambiguation
                                                                    ? 'Core LG terms were modified by the bank — submit for Corporate Admin approval or re-upload.'
                                                                    : 'Review below and choose whether to switch instruction, proceed, or re-upload.'}
                                                        </span>
                                                    </div>

                                                    {/* ─── ITEM 2: 2-STEP MULTI-INSTRUCTION DISAMBIGUATION BANNER ─── */}
                                                    {disambiguation && (
                                                        <div className="p-3 bg-purple-50 border-2 border-purple-300 rounded-xl space-y-2 shadow-sm">
                                                            <div className="flex items-center justify-between flex-wrap gap-2">
                                                                <div className="flex items-center gap-2">
                                                                    <ArrowLeftRight className="h-4 w-4 text-purple-700 shrink-0" />
                                                                    <span className="text-xs sm:text-sm font-bold text-purple-950">
                                                                        Wrong Instruction Selected
                                                                    </span>
                                                                </div>
                                                                <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded bg-purple-100 text-purple-800 border border-purple-200">
                                                                    Target: {disambiguation.matched_serial} ({disambiguation.matched_type_label})
                                                                </span>
                                                            </div>

                                                            <p className="text-xs sm:text-sm text-purple-900 font-medium bg-white/90 p-2 rounded-lg border border-purple-200">
                                                                {disambiguation.prompt_message}
                                                            </p>

                                                            <div className="flex items-center justify-end">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleSwitchAndRecord(disambiguation)}
                                                                    disabled={isActionLoading}
                                                                    className="w-full sm:w-auto px-3.5 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-lg shadow-sm flex items-center justify-center gap-1.5 transition-colors"
                                                                >
                                                                    <ArrowLeftRight className="h-3.5 w-3.5" />
                                                                    <span>{disambiguation.action_label || `Switch to ${disambiguation.matched_type_label} (${disambiguation.matched_serial})`}</span>
                                                                </button>
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Optional Date Convention Variance inside Mismatch Panel (only when not already covered by Favorable Extension card) */}
                                                    {dateVariance && !termsModification?.is_favorable_extension && (
                                                        <div className="p-2.5 bg-blue-50 border border-blue-200 rounded-lg space-y-1">
                                                            <p className="text-xs font-bold text-blue-900 flex items-center gap-1.5">
                                                                <Calendar className="h-3.5 w-3.5 text-blue-600" />
                                                                <span>Calendar Convention Variance Detected ({dateVariance.variance_days > 0 ? `+${dateVariance.variance_days}` : dateVariance.variance_days}d):</span>
                                                            </p>
                                                            <p className="text-xs text-blue-800">{dateVariance.prompt_message}</p>
                                                            <label className="inline-flex items-center gap-2 text-xs font-semibold text-blue-900 cursor-pointer pt-1">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={alignDateOnOverride}
                                                                    onChange={(e) => setAlignDateOnOverride(e.target.checked)}
                                                                    className="h-3.5 w-3.5 rounded text-blue-600 border-gray-300"
                                                                />
                                                                <span>Align record expiry date to {dateVariance.bank_confirmed_expiry_date} when proceeding</span>
                                                            </label>
                                                        </div>
                                                    )}

                                                    {/* Enhancement A: Bank-Modified Terms (>3 Days or Amount Change) */}
                                                    {termsModification && (
                                                        termsModification.is_favorable_extension ? (
                                                            <div className="p-3 bg-emerald-50 border-2 border-emerald-300 rounded-xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 shadow-sm">
                                                                <div className="space-y-0.5">
                                                                    <p className="text-xs sm:text-sm font-bold text-emerald-950 flex items-center gap-1.5">
                                                                        <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                                                                        <span>Favorable Further Extension (+{termsModification.variance_days} Days Extra Coverage — Recommended to Accept)</span>
                                                                    </p>
                                                                    <p className="text-xs text-emerald-800 leading-snug">
                                                                        {termsModification.prompt_message}
                                                                    </p>
                                                                </div>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleAcceptDateAlignment(termsModification.bank_confirmed_expiry_date)}
                                                                    disabled={isActionLoading}
                                                                    className="shrink-0 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-sm flex items-center justify-center gap-1.5 transition-colors"
                                                                >
                                                                    <CheckCircle2 className="h-3.5 w-3.5" />
                                                                    <span>Accept Further Date ({termsModification.bank_confirmed_expiry_date})</span>
                                                                </button>
                                                            </div>
                                                        ) : (
                                                            <div className="p-2.5 bg-amber-100/90 border border-amber-300 rounded-lg space-y-0.5">
                                                                <p className="text-xs font-bold text-amber-950 flex items-center gap-1.5">
                                                                    <ShieldCheck className="h-4 w-4 text-amber-700 shrink-0" />
                                                                    <span>Bank-Modified Terms Require Corporate Admin Approval</span>
                                                                </p>
                                                                <p className="text-xs text-amber-900 leading-snug">
                                                                    {termsModification.prompt_message}
                                                                </p>
                                                            </div>
                                                        )
                                                    )}

                                                    {/* Enhancement B: Informational Bank Reply Letter Date */}
                                                    {extractedLetterDate && (
                                                        <div className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between text-xs text-slate-700">
                                                            <span className="font-semibold flex items-center gap-1.5">
                                                                <Calendar className="h-3.5 w-3.5 text-slate-500" />
                                                                <span>Detected Bank Reply Letter Date:</span>
                                                            </span>
                                                            <span className="font-mono font-bold text-slate-900">{extractedLetterDate}</span>
                                                        </div>
                                                    )}

                                                    {/* Discrepancies and Matches */}
                                                    {(() => {
                                                        const displayedMismatches = (verificationResult.mismatches || []).filter(
                                                            m => !disambiguation || m !== disambiguation.prompt_message
                                                        );
                                                        return (
                                                            <div className={`gap-2.5 ${displayedMismatches.length > 0 && verificationResult.matches?.length > 0 ? 'grid grid-cols-1 sm:grid-cols-2' : 'space-y-2'}`}>
                                                                {displayedMismatches.length > 0 && (
                                                                    <div className="bg-red-50 border border-red-200 p-2.5 rounded-lg">
                                                                        <p className="text-xs font-bold text-red-800 mb-1">⚠️ Discrepancies Detected:</p>
                                                                        <ul className="list-disc list-inside text-xs text-red-700 space-y-0.5 leading-snug">
                                                                            {displayedMismatches.map((m, i) => (
                                                                                <li key={i}>{m}</li>
                                                                            ))}
                                                                        </ul>
                                                                    </div>
                                                                )}

                                                                {verificationResult.matches?.length > 0 && (
                                                                    <div className="bg-emerald-50 border border-emerald-200 p-2.5 rounded-lg">
                                                                        <p className="text-xs font-bold text-emerald-800 mb-1">✓ Verified Checks:</p>
                                                                        <ul className="list-disc list-inside text-xs text-emerald-700 space-y-0.5 leading-snug">
                                                                            {verificationResult.matches.map((m, i) => (
                                                                                <li key={i}>{m}</li>
                                                                            ))}
                                                                        </ul>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        );
                                                    })()}

                                                    {/* Override Note (only shown when discrepancies remain and NOT a mandatory Admin Terms Approval case) */}
                                                    {(verificationResult.mismatches?.length || 0) > 0 && !termsModification && (
                                                        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                                                            <label className="text-xs font-semibold text-amber-900 shrink-0">
                                                                Override Note (Optional):
                                                            </label>
                                                            <input
                                                                type="text"
                                                                value={overrideReason}
                                                                onChange={(e) => setOverrideReason(e.target.value)}
                                                                placeholder="e.g. Bank advice confirmed by branch phone / Stamped on last page"
                                                                className="w-full text-xs px-2.5 py-1.5 border border-amber-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                                                            />
                                                        </div>
                                                    )}

                                                    {/* Action Buttons */}
                                                    <div className="flex items-center justify-between flex-wrap gap-2 pt-1.5 border-t border-amber-200/70">
                                                        <button
                                                            type="button"
                                                            onClick={() => setIsInspectorOpen(true)}
                                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-cyan-300 border border-slate-700 rounded-lg text-xs font-semibold shadow-sm transition-colors"
                                                        >
                                                            <Eye className="h-3.5 w-3.5 text-cyan-400" />
                                                            <span>🔍 Inspect Scan & AI Details</span>
                                                        </button>
                                                        <div className="flex items-center gap-2 flex-wrap">
                                                            <button
                                                                type="button"
                                                                onClick={handleCancelClose}
                                                                disabled={isActionLoading}
                                                                className="px-3 py-1.5 bg-white hover:bg-gray-100 text-gray-700 border border-gray-300 text-xs font-medium rounded-lg transition-colors"
                                                            >
                                                                Cancel
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={handleCancelReupload}
                                                                disabled={isActionLoading}
                                                                className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-medium rounded-lg transition-colors"
                                                            >
                                                                🔄 Re-upload
                                                            </button>
                                                            {termsModification && !disambiguation ? (
                                                                <button
                                                                    type="button"
                                                                    onClick={handleRequestAdminTermsApproval}
                                                                    disabled={isActionLoading}
                                                                    className="px-3.5 py-1.5 bg-amber-700 hover:bg-amber-800 text-white text-xs font-bold rounded-lg shadow-sm flex items-center justify-center gap-1.5 transition-colors"
                                                                >
                                                                    {isActionLoading ? (
                                                                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                                    ) : (
                                                                        <ShieldCheck className="h-3.5 w-3.5" />
                                                                    )}
                                                                    <span>🛡️ Submit Terms for Admin Approval</span>
                                                                </button>
                                                            ) : (
                                                                <button
                                                                    type="button"
                                                                    onClick={handleProceedAnyway}
                                                                    disabled={isActionLoading}
                                                                    className="px-3.5 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors"
                                                                >
                                                                    {isActionLoading
                                                                        ? 'Saving...'
                                                                        : (verificationResult.mismatches?.length || 0) === 0
                                                                            ? '✅ Confirm & Record Reply'
                                                                            : '✅ Proceed Anyway'}
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Normal Action Buttons (when no verificationResult) */}
                                            {!verificationResult && (
                                                <div className="mt-5 pt-3 border-t border-gray-100 flex items-center justify-end gap-3">
                                                    <button
                                                        type="button"
                                                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                                                        onClick={onClose}
                                                        disabled={isSubmitting}
                                                    >
                                                        Cancel
                                                    </button>
                                                    <GracePeriodTooltip isGracePeriod={isGracePeriod}>
                                                        <button
                                                            type="submit"
                                                            className={`px-4 py-2 text-sm font-semibold rounded-lg shadow-sm bg-green-600 hover:bg-green-700 text-white flex items-center justify-center gap-2 transition-colors ${isSubmitting || isGracePeriod ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                            disabled={isSubmitting || isGracePeriod}
                                                        >
                                                            {isSubmitting ? (
                                                                <>
                                                                    <Loader2 className="animate-spin h-4 w-4" />
                                                                    <span>Processing...</span>
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <Building className="h-4 w-4" />
                                                                    <span>Record Bank Reply</span>
                                                                </>
                                                            )}
                                                        </button>
                                                    </GracePeriodTooltip>
                                                </div>
                                            )}
                                        </Form>
                                    )}
                                </Formik>
                            </DialogPanel>
                        </TransitionChild>
                    </div>
                </div>
            </Dialog>

            {isInspectorOpen && (
                <DocumentInspectorModal
                    isOpen={isInspectorOpen}
                    onClose={() => setIsInspectorOpen(false)}
                    fileUrl={previewUrl}
                    fileName={replyFile ? replyFile.name : 'Bank_Reply_Scan.pdf'}
                    instruction={activeInstruction}
                    lgRecord={activeInstruction?.lg_record}
                    docType="bank_reply"
                    aiVerification={verificationResult}
                    mode="inspect_pre_submit"
                    onAcceptDateAlignment={dateVariance ? (dt) => {
                        setIsInspectorOpen(false);
                        handleAcceptDateAlignment(dt);
                    } : null}
                    onSwitchInstruction={disambiguation ? (dis) => {
                        setIsInspectorOpen(false);
                        handleSwitchAndRecord(dis);
                    } : null}
                    onRequestAdminTermsApproval={termsModification ? () => {
                        setIsInspectorOpen(false);
                        handleRequestAdminTermsApproval();
                    } : null}
                    onProceedAnyway={termsModification && !disambiguation ? null : () => {
                        setIsInspectorOpen(false);
                        handleProceedAnyway();
                    }}
                    onReupload={() => {
                        setIsInspectorOpen(false);
                        handleCancelReupload();
                    }}
                />
            )}
        </Transition>
    );
};

export default RecordBankReplyModal;
