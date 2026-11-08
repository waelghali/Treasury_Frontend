// frontend/src/components/Modals/RecordDeliveryModal.js
import React, { useState, useEffect, useRef, Fragment } from 'react';
import { Dialog, DialogPanel, DialogTitle, Transition, TransitionChild } from '@headlessui/react';
import { X, Truck, AlertCircle, Loader2, Eye, Calendar } from 'lucide-react';
import { Formik, Form, ErrorMessage, Field } from 'formik';
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

const buttonBaseClassNames = "inline-flex items-center px-4 py-2 text-sm font-medium rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors duration-200";

const RecordDeliveryModal = ({ instruction, onClose, onSuccess, isGracePeriod, apiUrl }) => {
    const fileInputRef = useRef(null);
    const [deliveryFile, setDeliveryFile] = useState(null);
    const [verificationResult, setVerificationResult] = useState(null);
    const [overrideReason, setOverrideReason] = useState('');
    const [isOverriding, setIsOverriding] = useState(false);
    const [selectedDeliveryDate, setSelectedDeliveryDate] = useState(moment().format('YYYY-MM-DD'));
    const [isInspectorOpen, setIsInspectorOpen] = useState(false);
    const [previewUrl, setPreviewUrl] = useState(null);
    const [isDocMandatory, setIsDocMandatory] = useState(false);

    useEffect(() => {
        if (apiUrl) return;
        const fetchConfig = async () => {
            try {
                const res = await apiRequest('/end-user/customer-configurations/DOC_MANDATORY_RECORD_DELIVERY', 'GET');
                if (res && res.effective_value !== undefined) {
                    setIsDocMandatory(String(res.effective_value).toLowerCase() === 'true');
                }
            } catch (err) {
                console.warn('Could not fetch DOC_MANDATORY_RECORD_DELIVERY config, defaulting to optional.', err);
            }
        };
        fetchConfig();
    }, [apiUrl]);

    // Explicit memory cleanup for uploaded file object URLs
    useEffect(() => {
        if (deliveryFile) {
            const url = URL.createObjectURL(deliveryFile);
            setPreviewUrl(url);
            return () => {
                URL.revokeObjectURL(url);
            };
        } else {
            setPreviewUrl(null);
        }
    }, [deliveryFile]);
    
    // --- Calculate Instruction Issue Date (fallback to created_at for maintenance actions) ---
    const instructionIssueDate = moment(instruction.instruction_date || instruction.created_at).format('YYYY-MM-DD');

    const initialValues = {
        deliveryDate: moment().format('YYYY-MM-DD'),
    };

    const DeliverySchema = Yup.object().shape({
        deliveryDate: Yup.date()
            .required('Delivery date is required')
            .max(moment().toDate(), 'Delivery date cannot be in the future'),
    });

    const handleSubmit = async (values, { setSubmitting, setErrors }) => {
        if (isGracePeriod) {
            toast.warn("This action is disabled during your subscription's grace period.");
            setSubmitting(false);
            return;
        }

        if (isDocMandatory && !deliveryFile) {
            toast.error("Supporting delivery document is mandatory for Recording Delivery as per Corporate Admin settings.");
            setErrors({ general: "Supporting delivery document is mandatory for Recording Delivery." });
            setSubmitting(false);
            return;
        }

        setSelectedDeliveryDate(values.deliveryDate);

        try {
            const formData = new FormData();
            formData.append('delivery_date', values.deliveryDate);

            if (deliveryFile) {
                const documentMetadata = {
                    document_type: "DELIVERY_PROOF",
                    file_name: deliveryFile.name,
                    mime_type: deliveryFile.type,
                    lg_instruction_id: instruction.id,
                };
                formData.append('delivery_document_file', deliveryFile);
                formData.append('delivery_document_metadata', JSON.stringify(documentMetadata));
            }

            const url = apiUrl || `/end-user/lg-records/instructions/${instruction.id}/record-delivery`;
            const response = await apiRequest(
                url,
                'POST',
                formData,
                'multipart/form-data'
            );

            // Check if AI verification flagged mismatches
            if (response?.status === 'mismatch' && response?.ai_verification) {
                setVerificationResult(response.ai_verification);
                toast.warn('AI verification detected discrepancies in the delivery document.');
                setSubmitting(false);
                return;
            }

            toast.success(`Delivery recorded successfully for Instruction ${instruction.serial_number}!`);
            onSuccess();
        } catch (error) {
            console.error("Failed to record delivery:", error);
            toast.error(`Failed to record delivery: ${error.message || 'An unexpected error occurred.'}`);
            setErrors({ general: error.message || 'An unexpected error occurred.' });
        } finally {
            setSubmitting(false);
        }
    };

    const handleProceedAnyway = async () => {
        setIsOverriding(true);
        try {
            const url = apiUrl || `/end-user/lg-records/instructions/${instruction.id}/record-delivery`;
            const hasRemainingMismatches = (verificationResult?.mismatches?.length || 0) > 0;

            const formData = new FormData();
            formData.append('delivery_date', selectedDeliveryDate || moment().format('YYYY-MM-DD'));
            if (deliveryFile) {
                const documentMetadata = {
                    document_type: "DELIVERY_PROOF",
                    file_name: deliveryFile.name,
                    mime_type: deliveryFile.type,
                    lg_instruction_id: instruction.id,
                };
                formData.append('delivery_document_file', deliveryFile);
                formData.append('delivery_document_metadata', JSON.stringify(documentMetadata));
            }
            if (hasRemainingMismatches) {
                formData.append('force_override', 'true');
                formData.append('override_reason', overrideReason || 'User confirmed delivery despite AI discrepancies');
            }
            if (verificationResult) {
                formData.append('ai_verification_json', JSON.stringify(verificationResult));
            }
            
            await apiRequest(url, 'POST', formData, 'multipart/form-data');
            toast.success(
                hasRemainingMismatches
                    ? 'Delivery recorded with user override and document attached!'
                    : `Delivery recorded successfully (${selectedDeliveryDate})!`
            );
            onSuccess();
        } catch (error) {
            toast.error(`Failed to record delivery: ${error.message || 'An unexpected error occurred.'}`);
        } finally {
            setIsOverriding(false);
        }
    };

    const handleAlignStampDateAndRecord = (stampDateStr, setFieldValue) => {
        if (!stampDateStr) return;
        setSelectedDeliveryDate(stampDateStr);
        if (typeof setFieldValue === 'function') {
            setFieldValue('deliveryDate', stampDateStr);
        }

        // Only align the date in-place (never auto-submit so the user can review all points first)
        const remainingMismatches = (verificationResult?.mismatches || []).filter(
            (m) => !m.toLowerCase().startsWith('delivery date mismatch:')
        );
        const updatedMatches = [
            ...(verificationResult?.matches || []).filter(
                (m) => !m.toLowerCase().includes('delivery date')
            ),
            `Delivery date aligned to bank stamp (${stampDateStr}).`,
        ];
        const updatedVerification = {
            ...verificationResult,
            status: remainingMismatches.length === 0 ? 'verified' : 'mismatch',
            mismatches: remainingMismatches,
            matches: updatedMatches,
            delivery_date_variance: null,
            aligned_stamp_date: stampDateStr,
        };

        setVerificationResult(updatedVerification);
        toast.info(`Delivery date updated to ${stampDateStr}. Click Confirm when ready.`);
    };

    const handleCancelReupload = () => {
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
            fileInputRef.current.click();
        }
        const cancelUrl = apiUrl
            ? apiUrl.replace('/record-delivery', '/cancel-delivery')
            : `/end-user/lg-records/instructions/${instruction.id}/cancel-delivery`;
        apiRequest(cancelUrl, 'POST').catch(() => {});
        setVerificationResult(null);
        setDeliveryFile(null);
    };

    const handleCancelClose = async () => {
        if (verificationResult) {
            try {
                const cancelUrl = apiUrl
                    ? apiUrl.replace('/record-delivery', '/cancel-delivery')
                    : `/end-user/lg-records/instructions/${instruction.id}/cancel-delivery`;
                await apiRequest(cancelUrl, 'POST').catch(() => {});
            } catch (e) {}
        }
        onClose();
    };

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
                                            Record Delivery for Instruction: <span className="text-blue-700 font-mono">{instruction.serial_number}</span>
                                        </DialogTitle>
                                        {!verificationResult && (
                                            <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
                                                Confirm when this instruction was delivered to the bank and attach the bank-stamped copy or courier slip.
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
                                    validationSchema={DeliverySchema}
                                    onSubmit={handleSubmit}
                                >
                                    {({ isSubmitting, errors, touched, setFieldValue }) => (
                                        <Form className={`${verificationResult ? 'space-y-2.5' : 'space-y-4'} ${isGracePeriod ? 'opacity-50' : ''}`}>
                                            {/* Info Banner */}
                                            <div className={`flex flex-wrap items-center gap-x-3 gap-y-1 bg-blue-50 border border-blue-200 text-blue-900 px-3.5 rounded-lg text-xs sm:text-sm font-medium ${verificationResult ? 'py-1.5' : 'py-2'}`}>
                                                <span><strong>LG:</strong> {instruction.lg_record?.lg_number || instruction.lg_number || 'N/A'}</span>
                                                <span className="text-blue-300">•</span>
                                                <span><strong>Type:</strong> {instruction.instruction_type || instruction.action_type?.replace(/_/g, ' ') || 'N/A'}</span>
                                                <span className="text-blue-300">•</span>
                                                <span><strong>Instruction Date:</strong> {new Date(instruction.instruction_date || instruction.created_at).toLocaleDateString()}</span>
                                            </div>

                                            {/* Delivery Date & File Input: Stacked normally, Side-by-Side when AI Verification is open */}
                                            <div className={verificationResult ? 'grid grid-cols-1 sm:grid-cols-12 gap-3 items-start' : 'space-y-4'}>
                                                <div className={verificationResult ? 'sm:col-span-4' : ''}>
                                                    <label htmlFor="deliveryDate" className="block text-sm font-medium text-gray-700 mb-1">
                                                        Delivery Date <span className="text-red-500">*</span>
                                                    </label>
                                                    <Field
                                                        type="date"
                                                        id="deliveryDate"
                                                        name="deliveryDate"
                                                        className={`block w-full px-3 ${verificationResult ? 'py-1.5' : 'py-2'} text-sm rounded-lg border shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${errors.deliveryDate && touched.deliveryDate ? 'border-red-500 bg-red-50' : 'border-gray-300'}`}
                                                        max={moment().format('YYYY-MM-DD')}
                                                        disabled={isGracePeriod}
                                                    />
                                                    <ErrorMessage name="deliveryDate" component="div" className="text-red-600 text-xs mt-1" />
                                                </div>

                                                <div className={verificationResult ? 'sm:col-span-8' : ''}>
                                                    <div className="flex items-center justify-between mb-1">
                                                        <label htmlFor="deliveryFile" className="block text-sm font-medium text-gray-700">
                                                            Bank-Stamped Copy / Courier Slip {isDocMandatory ? <span className="text-red-500">*</span> : '(Optional)'}
                                                        </label>
                                                        <span className="text-xs text-gray-500">Max 5MB</span>
                                                    </div>
                                                    <input
                                                        ref={fileInputRef}
                                                        id="deliveryFile"
                                                        name="deliveryFile"
                                                        type="file"
                                                        accept="image/*,application/pdf"
                                                        onChange={async (event) => {
                                                            const rawFile = event.currentTarget.files?.[0];
                                                            setVerificationResult(null);
                                                            if (rawFile) {
                                                                try {
                                                                    const buf = await rawFile.arrayBuffer();
                                                                    setDeliveryFile(new File([buf], rawFile.name, { type: rawFile.type || 'application/pdf' }));
                                                                } catch (e) {
                                                                    setDeliveryFile(rawFile);
                                                                }
                                                            } else {
                                                                setDeliveryFile(null);
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
                                            </div>

                                            {errors.general && (
                                                <div className="text-red-600 text-xs flex items-center gap-1.5">
                                                    <AlertCircle className="h-4 w-4 shrink-0" />
                                                    {errors.general}
                                                </div>
                                            )}

                                            {/* AI Verification Card (Compact Single-Screen Layout) */}
                                            {verificationResult && (
                                                <div className="p-3 bg-amber-50/90 border border-amber-300 rounded-xl space-y-2">
                                                    <div className="flex items-center justify-between flex-wrap gap-2">
                                                        <div className="flex items-center gap-1.5">
                                                            <AlertCircle className="h-4 w-4 text-amber-600 shrink-0" />
                                                            <h4 className="text-xs sm:text-sm font-bold text-amber-900">
                                                                {(verificationResult.mismatches?.length || 0) > 0
                                                                    ? 'AI Inspection: Discrepancies Detected'
                                                                    : 'AI Inspection: Ready to Confirm'}
                                                            </h4>
                                                        </div>
                                                        <span className="text-[11px] text-amber-800">
                                                            {(verificationResult.mismatches?.length || 0) > 0
                                                                ? 'Review findings below before proceeding.'
                                                                : 'All checks verified after date alignment.'}
                                                        </span>
                                                    </div>

                                                    {/* Compact 1-Line Bank Stamp Date Alignment Bar */}
                                                    {verificationResult.delivery_date_variance?.detected_stamp_date && (
                                                        <div className="px-3 py-2 bg-teal-50 border border-teal-300 rounded-lg flex items-center justify-between flex-wrap gap-2">
                                                            <div className="flex items-center gap-2 text-xs text-teal-950">
                                                                <Calendar className="h-4 w-4 text-teal-700 shrink-0" />
                                                                <span>
                                                                    <strong>Bank Stamp Date:</strong>{' '}
                                                                    <span className="font-mono font-bold">{verificationResult.delivery_date_variance.detected_stamp_date}</span>
                                                                    <span className="text-teal-700 ml-1.5">
                                                                        (entered: <span className="font-mono">{verificationResult.delivery_date_variance.user_delivery_date}</span>)
                                                                    </span>
                                                                </span>
                                                            </div>
                                                            {verificationResult.delivery_date_variance.can_align !== false ? (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleAlignStampDateAndRecord(verificationResult.delivery_date_variance.detected_stamp_date, setFieldValue)}
                                                                    disabled={isOverriding}
                                                                    className="px-3 py-1 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-md shadow-sm flex items-center gap-1.5 transition-colors"
                                                                >
                                                                    <Calendar className="h-3.5 w-3.5" />
                                                                    <span>Align Date to {verificationResult.delivery_date_variance.detected_stamp_date}</span>
                                                                </button>
                                                            ) : (
                                                                <span className="text-[11px] font-semibold text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded">
                                                                    ⚠️ {verificationResult.delivery_date_variance.invalid_reason || `Cannot align to ${verificationResult.delivery_date_variance.detected_stamp_date}`}
                                                                </span>
                                                            )}
                                                        </div>
                                                    )}

                                                    {verificationResult.aligned_stamp_date && (
                                                        <div className="px-3 py-1.5 bg-emerald-50 border border-emerald-300 rounded-lg flex items-center justify-between text-xs font-bold text-emerald-900">
                                                            <span className="flex items-center gap-1.5">
                                                                <Calendar className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                                                                <span>✓ Delivery Date Aligned to Bank Stamp: <span className="font-mono">{verificationResult.aligned_stamp_date}</span></span>
                                                            </span>
                                                        </div>
                                                    )}

                                                    {/* Discrepancies and Matches */}
                                                    <div className={`gap-2.5 ${verificationResult.mismatches?.length > 0 && verificationResult.matches?.length > 0 ? 'grid grid-cols-1 sm:grid-cols-2' : 'space-y-1.5'}`}>
                                                        {verificationResult.mismatches?.length > 0 && (
                                                            <div className="bg-red-50 border border-red-200 p-2 rounded-lg">
                                                                <p className="text-xs font-bold text-red-800 mb-0.5">⚠️ Discrepancies ({verificationResult.mismatches.length}):</p>
                                                                <ul className="list-disc list-inside text-xs text-red-700 space-y-0.5 leading-tight">
                                                                    {verificationResult.mismatches.map((m, i) => (
                                                                        <li key={i}>{m}</li>
                                                                    ))}
                                                                </ul>
                                                            </div>
                                                        )}

                                                        {verificationResult.matches?.length > 0 && (
                                                            <div className="bg-emerald-50 border border-emerald-200 p-2 rounded-lg">
                                                                <p className="text-xs font-bold text-emerald-800 mb-0.5">✓ Verified Checks ({verificationResult.matches.length}):</p>
                                                                <ul className="list-disc list-inside text-xs text-emerald-700 space-y-0.5 leading-tight">
                                                                    {verificationResult.matches.map((m, i) => (
                                                                        <li key={i}>{m}</li>
                                                                    ))}
                                                                </ul>
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Override Note (only shown when discrepancies remain) */}
                                                    {(verificationResult.mismatches?.length || 0) > 0 && (
                                                        <div className="flex items-center gap-2">
                                                            <label className="text-xs font-semibold text-amber-900 whitespace-nowrap">
                                                                Override Note:
                                                            </label>
                                                            <input
                                                                type="text"
                                                                value={overrideReason}
                                                                onChange={(e) => setOverrideReason(e.target.value)}
                                                                placeholder="Optional explanation (e.g. Courier slip attached / Teller stamped on reverse)"
                                                                className="w-full text-xs px-2.5 py-1 border border-amber-300 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                                                            />
                                                        </div>
                                                    )}

                                                    {/* Action Buttons */}
                                                    <div className="flex items-center justify-between flex-wrap gap-2 pt-1.5 border-t border-amber-200/70">
                                                        <button
                                                            type="button"
                                                            onClick={() => setIsInspectorOpen(true)}
                                                            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-cyan-300 border border-slate-700 rounded-lg text-xs font-semibold shadow-sm transition-colors"
                                                        >
                                                            <Eye className="h-3.5 w-3.5 text-cyan-400" />
                                                            <span>🔍 Inspect Scan & AI Details</span>
                                                        </button>
                                                        <div className="flex items-center gap-2 flex-wrap">
                                                            <button
                                                                type="button"
                                                                onClick={handleCancelClose}
                                                                disabled={isOverriding}
                                                                className="px-3 py-1.5 bg-white hover:bg-gray-100 text-gray-700 border border-gray-300 text-xs font-medium rounded-lg transition-colors"
                                                            >
                                                                Cancel
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={handleCancelReupload}
                                                                disabled={isOverriding}
                                                                className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-medium rounded-lg transition-colors"
                                                            >
                                                                🔄 Re-upload
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={handleProceedAnyway}
                                                                disabled={isOverriding}
                                                                className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors"
                                                            >
                                                                {isOverriding
                                                                    ? 'Recording...'
                                                                    : (verificationResult.mismatches?.length || 0) > 0
                                                                        ? '✅ Proceed Anyway'
                                                                        : '✅ Confirm & Record Delivery'}
                                                            </button>
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
                                                                className={`px-4 py-2 text-sm font-semibold rounded-lg shadow-sm bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center gap-2 transition-colors ${isSubmitting || isGracePeriod ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                                disabled={isSubmitting || isGracePeriod}
                                                            >
                                                                {isSubmitting ? (
                                                                    <>
                                                                        <Loader2 className="animate-spin h-4 w-4" />
                                                                        <span>Verifying & Recording...</span>
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        <Truck className="h-4 w-4" />
                                                                        <span>Record Delivery</span>
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
                    fileName={deliveryFile ? deliveryFile.name : 'Delivery_Scan.pdf'}
                    instruction={instruction}
                    lgRecord={instruction?.lg_record}
                    docType="delivery"
                    aiVerification={verificationResult}
                    mode="inspect_pre_submit"
                    onAlignDeliveryStampDate={verificationResult?.delivery_date_variance?.detected_stamp_date ? (dt) => {
                        setIsInspectorOpen(false);
                        handleAlignStampDateAndRecord(dt);
                    } : null}
                    onProceedAnyway={() => {
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

export default RecordDeliveryModal;
