import React, { useState, useEffect, Fragment } from 'react';
import { Dialog, DialogPanel, DialogTitle, Transition, TransitionChild } from '@headlessui/react';
import {
    X,
    Download,
    ExternalLink,
    ZoomIn,
    ZoomOut,
    RotateCw,
    Maximize2,
    ShieldCheck,
    AlertCircle,
    CheckCircle2,
    FileText,
    Calendar,
    Check,
    AlertTriangle,
    FileQuestion,
    ArrowRight,
    Loader2,
    ArrowLeftRight
} from 'lucide-react';
import { apiRequest } from '../../services/apiService';
import { toast } from 'react-toastify';
import moment from 'moment';

const DocumentInspectorModal = ({
    isOpen,
    onClose,
    documentId = null,
    fileUrl = null,
    fileName = null,
    instruction = null,
    lgRecord = null,
    docType = 'delivery', // 'delivery' | 'bank_reply' | 'general'
    aiVerification = null,
    overrideDetails = null,
    mode = 'view', // 'view' | 'inspect_pre_submit'
    onProceedAnyway = null,
    onAcceptDateAlignment = null,
    onAlignDeliveryStampDate = null,
    onRequestAdminTermsApproval = null,
    onSwitchInstruction = null,
    onReupload = null
}) => {
    const [resolvedUrl, setResolvedUrl] = useState(fileUrl);
    const [resolvedFileName, setResolvedFileName] = useState(fileName || 'Document.pdf');
    const [isLoadingUrl, setIsLoadingUrl] = useState(false);
    const [urlError, setUrlError] = useState(null);

    const [zoom, setZoom] = useState(100);
    const [rotation, setRotation] = useState(0);

    useEffect(() => {
        let isMounted = true;

        if (fileUrl) {
            setResolvedUrl(fileUrl);
            if (fileName) setResolvedFileName(fileName);
            setIsLoadingUrl(false);
            setUrlError(null);
            return;
        }

        let createdBlobUrl = null;

        if (documentId && isOpen) {
            setIsLoadingUrl(true);
            setUrlError(null);

            apiRequest(`/end-user/lg-documents/${documentId}/view`, 'GET')
                .then(async (res) => {
                    if (!isMounted) return;
                    const streamUrl = res?.download_url || res?.signed_url;
                    if (streamUrl) {
                        try {
                            const blobResp = await fetch(streamUrl);
                            if (blobResp.ok) {
                                const rawBlob = await blobResp.blob();
                                const pdfBlob = new Blob([rawBlob], { type: rawBlob.type || 'application/pdf' });
                                createdBlobUrl = URL.createObjectURL(pdfBlob);
                                if (isMounted) setResolvedUrl(createdBlobUrl);
                                return;
                            }
                        } catch (fetchErr) {
                            // Fallback to direct streamUrl if fetch fails
                        }
                        if (isMounted) setResolvedUrl(streamUrl);
                    } else {
                        setUrlError("Unable to acquire secure document URL.");
                    }
                })
                .catch(err => {
                    if (!isMounted) return;
                    console.error("Failed to load document signed url:", err);
                    setUrlError(err.message || "Failed to load document.");
                })
                .finally(() => {
                    if (isMounted) setIsLoadingUrl(false);
                });
        }

        return () => {
            isMounted = false;
            if (createdBlobUrl) {
                URL.revokeObjectURL(createdBlobUrl);
            }
        };
    }, [documentId, fileUrl, isOpen, fileName]);

    useEffect(() => {
        if (isOpen) {
            setZoom(100);
            setRotation(0);
        }
    }, [isOpen]);

    const activeAiVerification = aiVerification || (
        docType === 'bank_reply'
            ? instruction?.details?.bank_reply_ai_verification
            : instruction?.details?.delivery_ai_verification
    );

    const activeOverride = overrideDetails || (
        docType === 'bank_reply'
            ? instruction?.details?.bank_reply_override
            : instruction?.details?.delivery_override
    );

    const isBankReply = docType === 'bank_reply';
    const isDelivery = docType === 'delivery';

    const activeDateAlignment = isBankReply ? instruction?.details?.date_convention_alignment : null;
    const activeDateVariance = isBankReply ? activeAiVerification?.date_convention_variance : null;
    const activeDeliveryVariance = isDelivery ? activeAiVerification?.delivery_date_variance : null;
    const activeTermsModification = isBankReply ? activeAiVerification?.bank_terms_modification : null;
    const activeAdminTermsApproval = isBankReply ? instruction?.details?.bank_terms_admin_approval : null;
    const activeDisambiguation = isBankReply ? activeAiVerification?.instruction_disambiguation : null;
    const activeRedirect = isBankReply ? instruction?.details?.disambiguation_redirect : null;

    const isOverridden = !!activeOverride;
    const isDateAligned = activeDateAlignment?.status === 'ACCEPTED_BY_USER';
    const isVerified = activeAiVerification?.status === 'verified';
    const isMismatch = activeAiVerification?.status === 'mismatch';
    const extractedData = activeAiVerification?.extracted_data || {};
    const bankReplyLetterDate = isBankReply
        ? (activeAiVerification?.bank_reply_letter_date || instruction?.details?.bank_reply_letter_date || extractedData.cited_effective_date || null)
        : null;

    const expectedBankName = lgRecord?.issuing_bank?.name || instruction?.details?.issuing_bank_name || 'N/A';
    const expectedLgNumber = lgRecord?.lg_number || instruction?.details?.lg_number || 'N/A';
    const recordedDate = isBankReply ? instruction?.bank_reply_date : instruction?.delivery_date;

    const isPdf = (resolvedFileName?.toLowerCase().endsWith('.pdf') || resolvedUrl?.toLowerCase().includes('.pdf') || resolvedUrl?.startsWith('blob:')) && !resolvedFileName?.match(/\.(jpg|jpeg|png|webp|gif)$/i);

    const handleZoomIn = () => setZoom(prev => Math.min(prev + 25, 200));
    const handleZoomOut = () => setZoom(prev => Math.max(prev - 25, 50));
    const handleResetZoom = () => {
        setZoom(100);
        setRotation(0);
    };
    const handleRotate = () => setRotation(prev => (prev + 90) % 360);

    const handleDownload = () => {
        if (!resolvedUrl) {
            toast.error("Document link not available.");
            return;
        }
        const a = document.createElement('a');
        a.href = resolvedUrl;
        a.download = resolvedFileName || 'document.pdf';
        a.target = '_blank';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    };

    const formatDateSafe = (dt) => {
        if (!dt) return 'N/A';
        return moment(dt).format('DD-MMM-YYYY');
    };

    return (
        <Transition show={isOpen} as={Fragment}>
            <Dialog as="div" className="relative z-50" onClose={onClose}>
                <TransitionChild
                    as={Fragment}
                    enter="ease-out duration-200"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="ease-in duration-150"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                >
                    <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-xs transition-opacity" />
                </TransitionChild>

                <div className="fixed inset-0 z-10 overflow-hidden flex items-center justify-center p-2 sm:p-4">
                    <TransitionChild
                        as={Fragment}
                        enter="ease-out duration-200"
                        enterFrom="opacity-0 scale-95"
                        enterTo="opacity-100 scale-100"
                        leave="ease-in duration-150"
                        leaveFrom="opacity-100 scale-100"
                        leaveTo="opacity-0 scale-95"
                    >
                        <DialogPanel className="w-full max-w-6xl h-[88vh] bg-white border border-gray-200 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-gray-900 font-sans">
                            {/* --- 1. CLEAN LIGHT HEADER --- */}
                            <div className="px-5 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between gap-4 shrink-0">
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 ${isBankReply ? 'bg-teal-100 text-teal-700' : 'bg-blue-100 text-blue-700'}`}>
                                        <FileText className="h-5 w-5" />
                                    </div>
                                    <div className="truncate">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <DialogTitle as="h2" className="text-base font-bold text-gray-900 tracking-tight truncate">
                                                {isBankReply ? 'Bank Reply Document' : 'Delivery Evidence Document'}
                                            </DialogTitle>
                                            <span className="px-2 py-0.5 rounded-md text-xs font-mono font-semibold bg-gray-200/80 text-gray-700">
                                                {instruction?.serial_number || 'N/A'}
                                            </span>
                                            {recordedDate && (
                                                <span className="text-xs text-gray-500">
                                                    • Recorded: <strong className="text-gray-700">{formatDateSafe(recordedDate)}</strong>
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-xs text-gray-500 truncate mt-0.5">
                                            LG: <strong className="text-gray-800">{expectedLgNumber}</strong> • Bank: <span className="text-gray-700">{expectedBankName}</span>
                                            {bankReplyLetterDate && ` • Letter Date: ${formatDateSafe(bankReplyLetterDate)}`}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 shrink-0">
                                    {resolvedUrl && (
                                        <>
                                            <button
                                                type="button"
                                                onClick={handleDownload}
                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-white hover:bg-gray-100 text-gray-700 border border-gray-300 transition-colors shadow-2xs"
                                                title="Download Document"
                                            >
                                                <Download className="h-3.5 w-3.5" />
                                                <span className="hidden sm:inline">Download</span>
                                            </button>
                                            <a
                                                href={resolvedUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-white hover:bg-gray-100 text-gray-700 border border-gray-300 transition-colors shadow-2xs"
                                                title="Open in new tab"
                                            >
                                                <ExternalLink className="h-3.5 w-3.5" />
                                            </a>
                                        </>
                                    )}
                                    <button
                                        type="button"
                                        onClick={onClose}
                                        className="rounded-lg p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-200/60 transition-colors"
                                        title="Close"
                                    >
                                        <X className="h-5 w-5" />
                                    </button>
                                </div>
                            </div>

                            {/* --- 2. BODY: COMPACT AI SUMMARY + LARGE DOCUMENT VIEWER --- */}
                            <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 min-h-0 overflow-hidden">
                                {/* LEFT SIDEBAR: CLEAN AI VERIFICATION & REDIRECTION SUMMARY */}
                                <div className="lg:col-span-4 h-full overflow-y-auto p-4 border-b lg:border-b-0 lg:border-r border-gray-200 space-y-3 bg-gray-50/50">
                                    {/* 1. Primary Verification / Override Status */}
                                    {isOverridden ? (
                                        <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 space-y-2">
                                            <div className="flex items-center gap-2">
                                                <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                                                <h4 className="text-xs font-bold uppercase tracking-wide text-amber-800">Confirmed with User Override</h4>
                                            </div>
                                            {activeOverride.reason && (
                                                <div className="bg-white p-2.5 rounded-lg border border-amber-200 text-xs">
                                                    <span className="font-semibold text-gray-700">Note: </span>
                                                    <span className="text-gray-800 italic">"{activeOverride.reason}"</span>
                                                </div>
                                            )}
                                            {activeOverride.timestamp && (
                                                <div className="text-[11px] text-amber-700">
                                                    Recorded {formatDateSafe(activeOverride.timestamp)} at {moment(activeOverride.timestamp).format('HH:mm')}
                                                </div>
                                            )}
                                        </div>
                                    ) : isVerified || isDateAligned ? (
                                        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900">
                                            <div className="flex items-center gap-2">
                                                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                                                <h4 className="text-xs font-bold uppercase tracking-wide text-emerald-800">AI Verification Confirmed</h4>
                                            </div>
                                            <p className="text-xs text-emerald-700 mt-1 leading-relaxed">
                                                Document parameters matched the instruction record.
                                            </p>
                                        </div>
                                    ) : isMismatch ? (
                                        <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-900">
                                            <div className="flex items-center gap-2">
                                                <AlertCircle className="h-4 w-4 text-red-600 shrink-0" />
                                                <h4 className="text-xs font-bold uppercase tracking-wide text-red-800">Discrepancies Flagged</h4>
                                            </div>
                                            <p className="text-xs text-red-700 mt-1 leading-relaxed">
                                                Please review the flagged items below before proceeding.
                                            </p>
                                        </div>
                                    ) : null}

                                    {/* 2. Redirection / Disambiguation Info (Bank Reply only) */}
                                    {activeRedirect && (
                                        <div className="p-3 rounded-xl bg-purple-50 border border-purple-200 text-purple-900 flex items-start gap-2.5">
                                            <ArrowLeftRight className="h-4 w-4 text-purple-600 shrink-0 mt-0.5" />
                                            <div className="text-xs leading-relaxed">
                                                <div className="font-bold text-purple-900">Redirected via AI Disambiguation</div>
                                                <div className="text-purple-700 mt-0.5">
                                                    Originally uploaded under Instruction <span className="font-mono font-semibold">{activeRedirect.switched_from_serial || `#${activeRedirect.switched_from_instruction_id}`}</span> and matched here.
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {activeDisambiguation && mode === 'inspect_pre_submit' && (
                                        <div className="p-3 rounded-xl bg-purple-50 border border-purple-200 text-purple-900 space-y-2">
                                            <div className="flex items-center gap-2">
                                                <ArrowLeftRight className="h-4 w-4 text-purple-600 shrink-0" />
                                                <h4 className="text-xs font-bold text-purple-900">Wrong Instruction Selected</h4>
                                            </div>
                                            <p className="text-xs text-purple-800 leading-relaxed">
                                                {activeDisambiguation.prompt_message}
                                            </p>
                                            {onSwitchInstruction && (
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        onClose();
                                                        onSwitchInstruction(activeDisambiguation);
                                                    }}
                                                    className="w-full py-1.5 px-3 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold shadow-xs flex items-center justify-center gap-1.5 transition-colors"
                                                >
                                                    <ArrowLeftRight className="h-3.5 w-3.5" />
                                                    <span>{activeDisambiguation.action_label || `Switch to ${activeDisambiguation.matched_type_label}`}</span>
                                                </button>
                                            )}
                                        </div>
                                    )}

                                    {/* 3. Date Alignment / Variance Info */}
                                    {(isDateAligned || activeDateVariance) && (
                                        <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 space-y-2">
                                            <div className="flex items-center gap-2">
                                                <Calendar className="h-4 w-4 text-blue-600 shrink-0" />
                                                <h4 className="text-xs font-bold text-blue-900">
                                                    {isDateAligned ? 'Expiry Date Aligned' : 'Calendar Convention Variance (≤ 3 Days)'}
                                                </h4>
                                            </div>
                                            <p className="text-xs text-blue-800 leading-relaxed">
                                                {isDateAligned
                                                    ? `Aligned from ${activeDateAlignment.requested_expiry_date} to bank-confirmed date ${activeDateAlignment.bank_confirmed_expiry_date}.`
                                                    : activeDateVariance?.prompt_message}
                                            </p>
                                            {onAcceptDateAlignment && mode === 'inspect_pre_submit' && activeDateVariance && (
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        onClose();
                                                        onAcceptDateAlignment(activeDateVariance.bank_confirmed_expiry_date);
                                                    }}
                                                    className="w-full py-1.5 px-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs flex items-center justify-center gap-1.5 transition-colors"
                                                >
                                                    <Check className="h-3.5 w-3.5" />
                                                    <span>Accept & Align to {activeDateVariance.bank_confirmed_expiry_date}</span>
                                                </button>
                                            )}
                                        </div>
                                    )}

                                    {activeDeliveryVariance?.detected_stamp_date && mode === 'inspect_pre_submit' && (
                                        <div className="p-3 rounded-xl bg-teal-50 border border-teal-200 text-teal-900 space-y-2">
                                            <div className="flex items-center gap-2">
                                                <Calendar className="h-4 w-4 text-teal-600 shrink-0" />
                                                <h4 className="text-xs font-bold text-teal-900">
                                                    Bank Stamp Date: {activeDeliveryVariance.detected_stamp_date}
                                                </h4>
                                            </div>
                                            <p className="text-xs text-teal-800 leading-relaxed">
                                                {activeDeliveryVariance.prompt_message}
                                            </p>
                                            {onAlignDeliveryStampDate && (
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        onClose();
                                                        onAlignDeliveryStampDate(activeDeliveryVariance.detected_stamp_date);
                                                    }}
                                                    className="w-full py-1.5 px-3 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold shadow-xs flex items-center justify-center gap-1.5 transition-colors"
                                                >
                                                    <Check className="h-3.5 w-3.5" />
                                                    <span>Align Delivery Date to {activeDeliveryVariance.detected_stamp_date}</span>
                                                </button>
                                            )}
                                        </div>
                                    )}

                                    {(activeTermsModification || activeAdminTermsApproval) && (
                                        <div className="p-3 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-900 space-y-2">
                                            <div className="flex items-center gap-2">
                                                <ShieldCheck className="h-4 w-4 text-indigo-600 shrink-0" />
                                                <h4 className="text-xs font-bold text-indigo-900">
                                                    {activeAdminTermsApproval
                                                        ? `Submitted for Admin Approval (#${activeAdminTermsApproval.approval_request_id})`
                                                        : 'Bank-Modified Terms Detected'}
                                                </h4>
                                            </div>
                                            <p className="text-xs text-indigo-800 leading-relaxed">
                                                {activeAdminTermsApproval
                                                    ? `Corporate Admin approval request #${activeAdminTermsApproval.approval_request_id} created for bank-modified terms.`
                                                    : activeTermsModification?.prompt_message}
                                            </p>
                                            {onRequestAdminTermsApproval && mode === 'inspect_pre_submit' && activeTermsModification && (
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        onClose();
                                                        onRequestAdminTermsApproval(activeTermsModification);
                                                    }}
                                                    className="w-full py-1.5 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs flex items-center justify-center gap-1.5 transition-colors"
                                                >
                                                    <ShieldCheck className="h-3.5 w-3.5" />
                                                    <span>Submit for Admin Approval</span>
                                                </button>
                                            )}
                                        </div>
                                    )}

                                    {/* 4. Flagged Discrepancies (Plain English) */}
                                    {activeAiVerification?.mismatches?.length > 0 && (
                                        <div className="p-3 rounded-xl bg-white border border-red-200 space-y-1.5 shadow-2xs">
                                            <div className="flex items-center gap-1.5 text-xs font-bold text-red-700">
                                                <AlertCircle className="h-3.5 w-3.5 text-red-600 shrink-0" />
                                                <span>Discrepancies ({activeAiVerification.mismatches.length})</span>
                                            </div>
                                            <ul className="space-y-1 pl-4 text-xs text-red-800 list-disc">
                                                {activeAiVerification.mismatches.map((m, i) => (
                                                    <li key={i} className="leading-snug">{m}</li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}

                                    {/* 5. Verified Checks (Plain English) */}
                                    {activeAiVerification?.matches?.length > 0 && (
                                        <div className="p-3 rounded-xl bg-white border border-gray-200 space-y-1.5 shadow-2xs">
                                            <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-700">
                                                <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                                                <span>Verified Checks ({activeAiVerification.matches.length})</span>
                                            </div>
                                            <ul className="space-y-1 pl-4 text-xs text-gray-700 list-disc">
                                                {activeAiVerification.matches.map((m, i) => (
                                                    <li key={i} className="leading-snug">{m}</li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}

                                    {!activeAiVerification && !isOverridden && !activeRedirect && (
                                        <div className="p-4 rounded-xl bg-white border border-gray-200 text-xs text-gray-500 text-center">
                                            No automated AI verification log was recorded for this document.
                                        </div>
                                    )}
                                </div>

                                {/* RIGHT COLUMN: CLEAN DOCUMENT VIEWER (MAIN STAGE) */}
                                <div className="lg:col-span-8 h-full flex flex-col bg-gray-100 min-h-[360px] lg:min-h-0 relative overflow-hidden">
                                    {/* Minimal Zoom/Rotate Toolbar */}
                                    <div className="px-4 py-2 bg-white border-b border-gray-200 flex items-center justify-between gap-2 shrink-0 z-10">
                                        <span className="text-xs font-medium text-gray-600 truncate">
                                            {resolvedFileName}
                                        </span>
                                        <div className="flex items-center gap-1">
                                            <button
                                                type="button"
                                                onClick={handleZoomOut}
                                                disabled={zoom <= 50}
                                                className="p-1 rounded-md text-gray-500 hover:text-gray-900 hover:bg-gray-100 disabled:opacity-40 transition-colors"
                                                title="Zoom Out"
                                            >
                                                <ZoomOut className="h-4 w-4" />
                                            </button>
                                            <span className="text-xs font-mono text-gray-600 px-1.5 min-w-[44px] text-center">
                                                {zoom}%
                                            </span>
                                            <button
                                                type="button"
                                                onClick={handleZoomIn}
                                                disabled={zoom >= 200}
                                                className="p-1 rounded-md text-gray-500 hover:text-gray-900 hover:bg-gray-100 disabled:opacity-40 transition-colors"
                                                title="Zoom In"
                                            >
                                                <ZoomIn className="h-4 w-4" />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={handleResetZoom}
                                                className="p-1 rounded-md text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors"
                                                title="Reset View"
                                            >
                                                <Maximize2 className="h-4 w-4" />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={handleRotate}
                                                className="p-1 rounded-md text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors"
                                                title="Rotate 90°"
                                            >
                                                <RotateCw className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Document Canvas */}
                                    <div className="flex-1 relative overflow-auto p-3 flex items-center justify-center bg-gray-100">
                                        {isLoadingUrl ? (
                                            <div className="flex flex-col items-center justify-center p-8 text-center space-y-2">
                                                <Loader2 className="h-7 w-7 animate-spin text-blue-600" />
                                                <p className="text-xs font-medium text-gray-600">Loading document...</p>
                                            </div>
                                        ) : urlError ? (
                                            <div className="flex flex-col items-center justify-center p-8 text-center max-w-md space-y-2">
                                                <AlertCircle className="h-8 w-8 text-red-500" />
                                                <h4 className="text-sm font-bold text-gray-900">Unable to Display Document</h4>
                                                <p className="text-xs text-gray-500">{urlError}</p>
                                            </div>
                                        ) : !resolvedUrl ? (
                                            <div className="flex flex-col items-center justify-center p-8 text-center space-y-2">
                                                <FileQuestion className="h-8 w-8 text-gray-400" />
                                                <p className="text-xs text-gray-500">No document attached.</p>
                                            </div>
                                        ) : isPdf ? (
                                            <div className="w-full h-full bg-white rounded-lg overflow-hidden border border-gray-200 shadow-xs">
                                                <iframe
                                                    src={`${resolvedUrl}#view=FitH`}
                                                    title={resolvedFileName}
                                                    className="w-full h-full border-0 bg-white"
                                                    style={{
                                                        transform: `scale(${zoom / 100}) rotate(${rotation}deg)`,
                                                        transformOrigin: 'center center',
                                                        transition: 'transform 0.15s ease-out'
                                                    }}
                                                />
                                            </div>
                                        ) : (
                                            <div className="relative flex items-center justify-center min-w-full min-h-full">
                                                <img
                                                    src={resolvedUrl}
                                                    alt={resolvedFileName}
                                                    style={{
                                                        transform: `scale(${zoom / 100}) rotate(${rotation}deg)`,
                                                        transformOrigin: 'center center',
                                                        transition: 'transform 0.15s ease-out',
                                                        maxHeight: '76vh'
                                                    }}
                                                    className="rounded-lg shadow-md object-contain border border-gray-200 bg-white"
                                                />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* --- 3. CLEAN FOOTER --- */}
                            <div className="px-5 py-2.5 bg-gray-50 border-t border-gray-200 flex items-center justify-end gap-2.5 shrink-0">
                                {mode === 'inspect_pre_submit' ? (
                                    <>
                                        {onReupload && (
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    onClose();
                                                    onReupload();
                                                }}
                                                className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-white hover:bg-gray-100 text-gray-700 border border-gray-300 transition-colors"
                                            >
                                                🔄 Re-upload Document
                                            </button>
                                        )}
                                        {onProceedAnyway && (
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    onClose();
                                                    onProceedAnyway();
                                                }}
                                                className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-colors flex items-center gap-1.5"
                                            >
                                                <span>{(activeAiVerification?.mismatches?.length || 0) > 0 ? 'Proceed Anyway' : 'Confirm'}</span>
                                                <ArrowRight className="h-3.5 w-3.5" />
                                            </button>
                                        )}
                                    </>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={onClose}
                                        className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-gray-900 hover:bg-gray-800 text-white transition-colors"
                                    >
                                        Close
                                    </button>
                                )}
                            </div>
                        </DialogPanel>
                    </TransitionChild>
                </div>
            </Dialog>
        </Transition>
    );
};

export default DocumentInspectorModal;
