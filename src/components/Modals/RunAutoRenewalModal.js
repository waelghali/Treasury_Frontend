// frontend/src/components/Modals/RunAutoRenewalModal.js
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { apiRequest, API_BASE_URL, getAuthToken } from '../../services/apiService';
import {
    Loader2, XCircle, CheckCircle, Download, Repeat, Lock, ShieldAlert,
    Printer, History, ChevronDown, ChevronUp, ExternalLink, FileText, RefreshCw
} from 'lucide-react';
import { toast } from 'react-toastify';
import moment from 'moment';

const GracePeriodTooltip = ({ children, isGracePeriod }) => {
    if (isGracePeriod) {
        return (
            <div className="relative group inline-block">
                {children}
                <div className="opacity-0 w-max bg-gray-800 text-white text-xs rounded-lg py-2 px-3 absolute z-10 bottom-full left-1/2 -translate-x-1/2 pointer-events-none group-hover:opacity-100 transition-opacity duration-200 shadow-lg">
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

const RunAutoRenewalModal = ({ onClose, onSuccess, isGracePeriod, initialTab = 'candidates' }) => {
    const [activeTab, setActiveTab] = useState(initialTab || 'candidates');
    const [isLoadingPreview, setIsLoadingPreview] = useState(true);
    const [previewData, setPreviewData] = useState(null);
    const [selectedLgIds, setSelectedLgIds] = useState({});
    const [customDates, setCustomDates] = useState({});
    const [isProcessing, setIsProcessing] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState('');

    // History state
    const [isLoadingHistory, setIsLoadingHistory] = useState(false);
    const [historyBatches, setHistoryBatches] = useState([]);
    const [expandedBatches, setExpandedBatches] = useState({});
    const [reprintingBatchId, setReprintingBatchId] = useState(null);

    // Fetch candidate preview on modal mount
    useEffect(() => {
        let isMounted = true;
        const fetchPreview = async () => {
            setIsLoadingPreview(true);
            setError('');
            try {
                const data = await apiRequest('/end-user/lg-records/auto-renewal-preview', 'GET');
                if (!isMounted) return;
                setPreviewData(data);

                // Initialize all candidate selections & suggested dates
                const initialSelected = {};
                const initialDates = {};
                (data.candidates || []).forEach(cand => {
                    initialSelected[cand.id] = true; // All candidates pre-checked by default
                    initialDates[cand.id] = cand.suggested_new_expiry_date;
                });
                setSelectedLgIds(initialSelected);
                setCustomDates(initialDates);
            } catch (err) {
                if (!isMounted) return;
                console.error("Failed to fetch renewal preview:", err);
                setError(err.message || 'Failed to load renewal candidates. Please try again.');
            } finally {
                if (isMounted) setIsLoadingPreview(false);
            }
        };

        fetchPreview();
        return () => { isMounted = false; };
    }, []);

    const fetchHistory = useCallback(async () => {
        setIsLoadingHistory(true);
        try {
            const data = await apiRequest('/end-user/lg-records/auto-renewal-history', 'GET');
            const list = Array.isArray(data) ? data : [];
            setHistoryBatches(list);
            if (list.length > 0) {
                setExpandedBatches(prev => (Object.keys(prev).length === 0 ? { [list[0].batch_id]: true } : prev));
            }
        } catch (err) {
            console.error("Failed to fetch auto-renewal history:", err);
            toast.error(`Failed to load previous renewal runs: ${err.message || 'Unexpected error'}`);
        } finally {
            setIsLoadingHistory(false);
        }
    }, []);

    useEffect(() => {
        if (activeTab === 'history') {
            fetchHistory();
        }
    }, [activeTab, fetchHistory]);

    const openBase64PdfInNewTab = (base64Str) => {
        try {
            const byteCharacters = atob(base64Str);
            const byteNumbers = new Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) {
                byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);
            const blob = new Blob([byteArray], { type: 'application/pdf' });
            const fileURL = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = fileURL;
            link.target = '_blank';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            setTimeout(() => URL.revokeObjectURL(fileURL), 5000);
            toast.info("Consolidated instruction letter opened in a new tab for printing.");
        } catch (blobError) {
            console.error("Error opening PDF:", blobError);
            toast.error("Failed to open PDF automatically. Please use the download button.");
        }
    };

    const downloadBase64Pdf = (base64Str, fileNamePrefix = 'bulk_lg_renewal') => {
        const link = document.createElement('a');
        link.href = `data:application/pdf;base64,${base64Str}`;
        link.download = `${fileNamePrefix}_${moment().format('YYYYMMDD_HHmmss')}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.info("Consolidated PDF download initiated.");
    };

    const handlePrintSingleInstruction = (instructionId, lgNumber = 'N/A') => {
        if (!instructionId) {
            toast.error("Instruction ID is not available.");
            return;
        }
        const authToken = getAuthToken();
        let letterUrl = `${API_BASE_URL}/end-user/lg-records/instructions/${instructionId}/view-letter`;
        if (authToken) {
            letterUrl += `?token=${authToken}&print=true`;
        }
        window.open(letterUrl, '_blank');
        toast.info(`Opening extension instruction letter for LG ${lgNumber}...`);
    };

    const handleReprintBatch = async (batch, mode = 'open') => {
        const instructionIds = (batch.items || [])
            .map(item => item.instruction_id)
            .filter(Boolean);

        if (instructionIds.length === 0) {
            toast.warn("No instruction letters found in this batch to reprint.");
            return;
        }

        setReprintingBatchId(`${batch.batch_id}-${mode}`);
        try {
            const response = await apiRequest('/end-user/lg-records/auto-renewal-reprint', 'POST', {
                instruction_ids: instructionIds,
            });
            if (response?.combined_pdf_base64) {
                if (mode === 'download') {
                    downloadBase64Pdf(response.combined_pdf_base64, `reprint_${batch.batch_id}`);
                } else {
                    openBase64PdfInNewTab(response.combined_pdf_base64);
                }
            } else {
                toast.warn("No PDF content returned from server.");
            }
        } catch (err) {
            console.error("Failed to reprint batch:", err);
            toast.error(`Failed to regenerate batch PDF: ${err.message || 'Unexpected error'}`);
        } finally {
            setReprintingBatchId(null);
        }
    };

    // Toggle individual non-forced candidate
    const handleToggleCandidate = (candidate) => {
        if (candidate.is_forced) return; // Cannot deselect forced renewals
        setSelectedLgIds(prev => ({
            ...prev,
            [candidate.id]: !prev[candidate.id]
        }));
    };

    // Date change handler
    const handleDateChange = (candidateId, newDateStr) => {
        setCustomDates(prev => ({
            ...prev,
            [candidateId]: newDateStr
        }));
    };

    // Bulk select / deselect proactive items
    const handleSelectAllProactive = (selectState) => {
        if (!previewData?.candidates) return;
        setSelectedLgIds(prev => {
            const updated = { ...prev };
            previewData.candidates.forEach(cand => {
                if (!cand.is_forced) {
                    updated[cand.id] = selectState;
                }
            });
            return updated;
        });
    };

    // Calculate selected counts
    const candidateStats = useMemo(() => {
        if (!previewData?.candidates) return { total: 0, selected: 0, forced: 0, proactiveSelected: 0, proactiveTotal: 0 };
        const total = previewData.candidates.length;
        let selected = 0;
        let forced = 0;
        let proactiveSelected = 0;
        let proactiveTotal = 0;

        previewData.candidates.forEach(c => {
            if (c.is_forced) {
                forced++;
                selected++; // forced is always selected
            } else {
                proactiveTotal++;
                if (selectedLgIds[c.id]) {
                    selected++;
                    proactiveSelected++;
                }
            }
        });

        return { total, selected, forced, proactiveSelected, proactiveTotal };
    }, [previewData, selectedLgIds]);

    const handleRunRenewal = async () => {
        if (isGracePeriod) {
            toast.warn("This action is disabled during your subscription's grace period.");
            return;
        }

        if (candidateStats.selected === 0) {
            toast.warn("Please select at least one LG to renew.");
            return;
        }

        // Build execution payload
        const renewals = [];
        const candidates = previewData?.candidates || [];
        for (const cand of candidates) {
            const isSelected = cand.is_forced || selectedLgIds[cand.id];
            if (isSelected) {
                const targetDate = customDates[cand.id] || cand.suggested_new_expiry_date;
                if (!targetDate || moment(targetDate).isSameOrBefore(moment(cand.current_expiry_date))) {
                    toast.error(`New expiry date for LG ${cand.lg_number} must be after ${moment(cand.current_expiry_date).format('DD-MMM-YYYY')}.`);
                    return;
                }
                renewals.push({
                    lg_record_id: cand.id,
                    new_expiry_date: targetDate
                });
            }
        }

        setIsProcessing(true);
        setError('');
        setResult(null);

        try {
            const response = await apiRequest('/end-user/lg-records/run-auto-renewal', 'POST', { renewals });
            setResult(response);
            toast.success(response.message);
            if (onSuccess) onSuccess();

            if (response.combined_pdf_base64) {
                openBase64PdfInNewTab(response.combined_pdf_base64);
            }
        } catch (err) {
            console.error("Failed to run renewal:", err);
            setError(`Failed to run renewal: ${err.message || 'An unexpected error occurred.'}`);
            toast.error(`Failed to run renewal: ${err.message || 'An unexpected error occurred.'}`);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleDownloadPdf = () => {
        if (result && result.combined_pdf_base64) {
            downloadBase64Pdf(result.combined_pdf_base64, result.batch_id || 'bulk_lg_renewal');
        } else {
            toast.warn("No PDF available for download.");
        }
    };

    const toggleExpandBatch = (batchId) => {
        setExpandedBatches(prev => ({
            ...prev,
            [batchId]: !prev[batchId]
        }));
    };

    return (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-60 backdrop-blur-sm overflow-y-auto h-full w-full z-50 flex justify-center items-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden border border-gray-100 animate-in fade-in zoom-in-95 duration-200">
                
                {/* Modal Header */}
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-orange-50/50 via-white to-gray-50/50">
                    <div className="flex items-center space-x-3">
                        <div className="p-2.5 bg-orange-100 text-orange-600 rounded-xl shadow-sm">
                            <Repeat className="h-5 w-5" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-gray-900">Auto / Forced LG Renewal & Batch History</h2>
                            <p className="text-xs text-gray-500 mt-0.5">Extend eligible LGs or view & re-print extension letters from previous auto-renewal runs.</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        disabled={isProcessing}
                        className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                        <XCircle className="h-5 w-5" />
                    </button>
                </div>

                {/* Top Tabs */}
                <div className="px-6 pt-2 border-b border-gray-200 bg-gray-50/60 flex items-center justify-between">
                    <div className="flex space-x-6">
                        <button
                            type="button"
                            onClick={() => setActiveTab('candidates')}
                            className={`pb-3 pt-2 text-sm font-semibold border-b-2 flex items-center space-x-2 transition-colors ${
                                activeTab === 'candidates'
                                    ? 'border-orange-600 text-orange-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-800'
                            }`}
                        >
                            <Repeat className="h-4 w-4" />
                            <span>New Renewal Run</span>
                            {previewData?.candidates?.length > 0 && (
                                <span className="ml-1.5 px-2 py-0.5 text-xs rounded-full bg-orange-100 text-orange-700 font-bold">
                                    {previewData.candidates.length}
                                </span>
                            )}
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveTab('history')}
                            className={`pb-3 pt-2 text-sm font-semibold border-b-2 flex items-center space-x-2 transition-colors ${
                                activeTab === 'history'
                                    ? 'border-indigo-600 text-indigo-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-800'
                            }`}
                        >
                            <History className="h-4 w-4" />
                            <span>Previous Auto-Renewal Runs (Re-print Letters)</span>
                        </button>
                    </div>
                    {activeTab === 'history' && (
                        <button
                            type="button"
                            onClick={fetchHistory}
                            disabled={isLoadingHistory}
                            className="inline-flex items-center px-2.5 py-1 text-xs font-medium text-gray-600 hover:text-gray-900 bg-white border border-gray-200 rounded-lg shadow-sm hover:bg-gray-50 mb-1"
                        >
                            <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${isLoadingHistory ? 'animate-spin' : ''}`} />
                            Refresh
                        </button>
                    )}
                </div>

                {/* Modal Body */}
                <div className="p-6 overflow-y-auto flex-1 space-y-4">
                    
                    {error && activeTab === 'candidates' && (
                        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl flex items-center space-x-3" role="alert">
                            <XCircle className="h-5 w-5 flex-shrink-0 text-red-500" />
                            <span className="text-sm font-medium">{error}</span>
                        </div>
                    )}

                    {activeTab === 'history' ? (
                        /* PREVIOUS AUTO-RENEWAL RUNS TAB */
                        isLoadingHistory ? (
                            <div className="py-16 text-center space-y-4">
                                <Loader2 className="h-10 w-10 text-indigo-500 animate-spin mx-auto" />
                                <p className="text-sm font-medium text-gray-600">Loading previous auto-renewal batches...</p>
                            </div>
                        ) : historyBatches.length === 0 ? (
                            <div className="py-12 text-center space-y-3">
                                <div className="w-14 h-14 bg-gray-100 text-gray-400 rounded-full flex items-center justify-center mx-auto">
                                    <History className="h-7 w-7 text-gray-400" />
                                </div>
                                <h3 className="text-lg font-bold text-gray-800">No Previous Bulk Renewal Runs Found</h3>
                                <p className="text-sm text-gray-500 max-w-md mx-auto">
                                    Once you run an Auto / Forced Renewal batch, the full list of extended LGs and their combined or individual instruction letters will appear here for easy re-printing at any time.
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div className="bg-indigo-50/70 border border-indigo-200 rounded-xl p-3.5 text-xs text-indigo-900 flex items-center justify-between">
                                    <span>
                                        Need to re-print extension letters after closing the window? Expand any batch below to <strong>re-open/download the combined PDF</strong> or <strong>print individual LG extension letters</strong>.
                                    </span>
                                </div>

                                {historyBatches.map(batch => {
                                    const isExpanded = !!expandedBatches[batch.batch_id];
                                    const isOpeningBatch = reprintingBatchId === `${batch.batch_id}-open`;
                                    const isDownloadingBatch = reprintingBatchId === `${batch.batch_id}-download`;

                                    return (
                                        <div key={batch.batch_id} className="border border-gray-200 rounded-xl overflow-hidden shadow-sm bg-white">
                                            {/* Batch Header */}
                                            <div
                                                onClick={() => toggleExpandBatch(batch.batch_id)}
                                                className="px-4 py-3.5 bg-gray-50/80 hover:bg-gray-100/70 cursor-pointer flex flex-wrap items-center justify-between gap-3 border-b border-gray-100"
                                            >
                                                <div className="flex items-center space-x-3">
                                                    <div className="p-2 bg-indigo-100 text-indigo-700 rounded-lg">
                                                        <FileText className="h-4 w-4" />
                                                    </div>
                                                    <div>
                                                        <div className="flex items-center space-x-2">
                                                            <span className="font-bold text-sm text-gray-900">
                                                                {moment(batch.created_at).format('DD-MMM-YYYY hh:mm A')}
                                                            </span>
                                                            <span className="text-xs font-mono bg-white border border-gray-200 text-gray-600 px-2 py-0.5 rounded">
                                                                {batch.batch_id}
                                                            </span>
                                                            <span className="text-xs font-semibold bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full">
                                                                {batch.renewed_count} LG(s) Extended
                                                            </span>
                                                        </div>
                                                        <div className="text-xs text-gray-500 mt-0.5">
                                                            Run by: <strong className="text-gray-700">{batch.triggered_by_email || 'System / Authorized User'}</strong>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="flex items-center space-x-2" onClick={e => e.stopPropagation()}>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleReprintBatch(batch, 'open')}
                                                        disabled={isOpeningBatch || isDownloadingBatch || (batch.items || []).length === 0}
                                                        className="inline-flex items-center px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors disabled:opacity-50"
                                                    >
                                                        {isOpeningBatch ? (
                                                            <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                                                        ) : (
                                                            <Printer className="h-3.5 w-3.5 mr-1.5" />
                                                        )}
                                                        Re-Print Combined PDF
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleReprintBatch(batch, 'download')}
                                                        disabled={isOpeningBatch || isDownloadingBatch || (batch.items || []).length === 0}
                                                        className="inline-flex items-center px-3 py-1.5 bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 text-xs font-semibold rounded-lg shadow-sm transition-colors disabled:opacity-50"
                                                    >
                                                        {isDownloadingBatch ? (
                                                            <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                                                        ) : (
                                                            <Download className="h-3.5 w-3.5 mr-1.5" />
                                                        )}
                                                        Download All
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => toggleExpandBatch(batch.batch_id)}
                                                        className="p-1.5 text-gray-400 hover:text-gray-700 rounded-lg"
                                                    >
                                                        {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Batch Items Table */}
                                            {isExpanded && (
                                                <div className="overflow-x-auto">
                                                    {(batch.items || []).length === 0 ? (
                                                        <div className="p-4 text-xs text-gray-500 text-center">
                                                            Detailed instruction records are not available for this run.
                                                        </div>
                                                    ) : (
                                                        <table className="min-w-full divide-y divide-gray-100 text-left text-xs">
                                                            <thead className="bg-gray-50/60 text-gray-500 uppercase font-semibold">
                                                                <tr>
                                                                    <th className="px-4 py-2.5">LG Number & Counterparty</th>
                                                                    <th className="px-4 py-2.5">Amount</th>
                                                                    <th className="px-4 py-2.5">Expiry Extension</th>
                                                                    <th className="px-4 py-2.5">Instruction Serial & Status</th>
                                                                    <th className="px-4 py-2.5 text-right">Letter Action</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody className="divide-y divide-gray-100 bg-white">
                                                                {batch.items.map((item, idx) => (
                                                                    <tr key={`${batch.batch_id}-${item.instruction_id || idx}`} className="hover:bg-gray-50/80">
                                                                        <td className="px-4 py-3">
                                                                            <div className="font-bold text-gray-900 text-sm">{item.lg_number}</div>
                                                                            <div className="text-gray-500 mt-0.5">
                                                                                {item.beneficiary_name || 'N/A'} • {item.bank_name || 'N/A'}
                                                                            </div>
                                                                        </td>
                                                                        <td className="px-4 py-3 whitespace-nowrap font-semibold text-gray-800">
                                                                            {item.amount != null
                                                                                ? `${item.currency_code || ''} ${Number(item.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                                                                                : '—'}
                                                                        </td>
                                                                        <td className="px-4 py-3 whitespace-nowrap">
                                                                            <div className="flex items-center space-x-1.5">
                                                                                <span className="text-gray-500 line-through">
                                                                                    {item.old_expiry_date ? moment(item.old_expiry_date).format('DD-MMM-YYYY') : '—'}
                                                                                </span>
                                                                                <span className="text-gray-400">→</span>
                                                                                <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                                                                    {item.new_expiry_date ? moment(item.new_expiry_date).format('DD-MMM-YYYY') : '—'}
                                                                                </span>
                                                                            </div>
                                                                        </td>
                                                                        <td className="px-4 py-3 whitespace-nowrap">
                                                                            <div className="font-mono font-semibold text-gray-800">
                                                                                {item.instruction_serial || `INST-${item.instruction_id}`}
                                                                            </div>
                                                                            <div className="mt-0.5 flex items-center gap-1.5">
                                                                                {item.bank_reply_date ? (
                                                                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800">
                                                                                        Bank Replied ({moment(item.bank_reply_date).format('DD-MMM')})
                                                                                    </span>
                                                                                ) : item.delivery_date ? (
                                                                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-100 text-blue-800">
                                                                                        Delivered ({moment(item.delivery_date).format('DD-MMM')})
                                                                                    </span>
                                                                                ) : (
                                                                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-800">
                                                                                        Awaiting Delivery
                                                                                    </span>
                                                                                )}
                                                                            </div>
                                                                        </td>
                                                                        <td className="px-4 py-3 whitespace-nowrap text-right">
                                                                            {item.instruction_id && (
                                                                                <button
                                                                                    type="button"
                                                                                    onClick={() => handlePrintSingleInstruction(item.instruction_id, item.lg_number)}
                                                                                    className="inline-flex items-center px-2.5 py-1.5 border border-indigo-200 text-xs font-semibold rounded-lg text-indigo-700 bg-indigo-50 hover:bg-indigo-100 transition-colors"
                                                                                >
                                                                                    <Printer className="h-3.5 w-3.5 mr-1" />
                                                                                    Print Letter
                                                                                </button>
                                                                            )}
                                                                        </td>
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </table>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )
                    ) : result ? (
                        /* Result View after Running Renewal */
                        <div className="py-4 px-2 space-y-6">
                            <div className="text-center">
                                <div className="w-14 h-14 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-3 shadow-sm">
                                    <CheckCircle className="h-8 w-8" />
                                </div>
                                <h3 className="text-2xl font-bold text-gray-900 mb-1">Renewal Process Completed</h3>
                                <p className="text-gray-600 max-w-lg mx-auto mb-4 text-sm">{result.message}</p>

                                <div className="inline-flex flex-wrap items-center justify-center gap-2 bg-gray-50 border border-gray-200 px-4 py-2 rounded-xl text-sm text-gray-700 mb-5">
                                    <span>Successfully Extended:</span>
                                    <span className="font-bold text-gray-900 bg-white px-2.5 py-0.5 rounded-md border border-gray-200">{result.renewed_count} LG(s)</span>
                                    {result.batch_id && (
                                        <>
                                            <span className="text-gray-300">|</span>
                                            <span>Batch: <strong className="font-mono text-xs text-indigo-700">{result.batch_id}</strong></span>
                                        </>
                                    )}
                                </div>

                                <div className="flex flex-wrap justify-center gap-3">
                                    {result.combined_pdf_base64 && (
                                        <>
                                            <button
                                                type="button"
                                                onClick={() => openBase64PdfInNewTab(result.combined_pdf_base64)}
                                                className="inline-flex items-center px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl shadow-sm transition-all"
                                            >
                                                <ExternalLink className="h-4 w-4 mr-2" /> Open & Print Combined PDF
                                            </button>
                                            <button
                                                type="button"
                                                onClick={handleDownloadPdf}
                                                className="inline-flex items-center px-4 py-2.5 bg-white hover:bg-gray-50 text-indigo-700 border border-indigo-200 text-sm font-semibold rounded-xl shadow-sm transition-all"
                                            >
                                                <Download className="h-4 w-4 mr-2" /> Download Combined PDF
                                            </button>
                                        </>
                                    )}
                                    <button
                                        type="button"
                                        onClick={() => setActiveTab('history')}
                                        className="inline-flex items-center px-4 py-2.5 border border-gray-300 text-sm font-medium rounded-xl text-gray-700 bg-white hover:bg-gray-50 shadow-sm transition-all"
                                    >
                                        <History className="h-4 w-4 mr-2" /> View All Previous Runs
                                    </button>
                                </div>
                            </div>

                            {/* Table of Renewed LGs in this batch so user can see and print each individually */}
                            {Array.isArray(result.renewed_items) && result.renewed_items.length > 0 && (
                                <div className="border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                                    <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
                                        <span className="text-xs font-bold uppercase tracking-wider text-gray-700">
                                            Extended LGs in This Run ({result.renewed_items.length})
                                        </span>
                                        <span className="text-xs text-gray-500">
                                            This batch is saved under "Previous Auto-Renewal Runs" for future re-printing.
                                        </span>
                                    </div>
                                    <table className="min-w-full divide-y divide-gray-200 text-left text-xs">
                                        <thead className="bg-gray-50/60 text-gray-500 uppercase font-semibold">
                                            <tr>
                                                <th className="px-4 py-2.5">LG Number</th>
                                                <th className="px-4 py-2.5">Bank / Beneficiary</th>
                                                <th className="px-4 py-2.5">Expiry Extension</th>
                                                <th className="px-4 py-2.5">Instruction Serial</th>
                                                <th className="px-4 py-2.5 text-right">Individual Letter</th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-gray-100">
                                            {result.renewed_items.map((item, idx) => (
                                                <tr key={item.instruction_id || idx} className="hover:bg-gray-50">
                                                    <td className="px-4 py-2.5 font-bold text-gray-900 text-sm">{item.lg_number}</td>
                                                    <td className="px-4 py-2.5 text-gray-600">
                                                        {item.bank_name || 'N/A'} • {item.beneficiary_name || 'N/A'}
                                                    </td>
                                                    <td className="px-4 py-2.5 whitespace-nowrap">
                                                        <span className="text-gray-500 line-through mr-1.5">
                                                            {item.old_expiry_date ? moment(item.old_expiry_date).format('DD-MMM-YYYY') : '—'}
                                                        </span>
                                                        →
                                                        <span className="ml-1.5 font-bold text-emerald-700">
                                                            {item.new_expiry_date ? moment(item.new_expiry_date).format('DD-MMM-YYYY') : '—'}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-2.5 font-mono text-gray-800">{item.instruction_serial || '—'}</td>
                                                    <td className="px-4 py-2.5 text-right">
                                                        {item.instruction_id && (
                                                            <button
                                                                type="button"
                                                                onClick={() => handlePrintSingleInstruction(item.instruction_id, item.lg_number)}
                                                                className="inline-flex items-center px-2.5 py-1 border border-indigo-200 text-xs font-semibold rounded-lg text-indigo-700 bg-indigo-50 hover:bg-indigo-100"
                                                            >
                                                                <Printer className="h-3.5 w-3.5 mr-1" /> Print Letter
                                                            </button>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    ) : isLoadingPreview ? (
                        /* Loading Skeleton */
                        <div className="py-16 text-center space-y-4">
                            <Loader2 className="h-10 w-10 text-orange-500 animate-spin mx-auto" />
                            <p className="text-sm font-medium text-gray-600">Analyzing upcoming expiries & corporate renewal rules...</p>
                        </div>
                    ) : !previewData?.candidates || previewData.candidates.length === 0 ? (
                        /* Empty State */
                        <div className="py-12 text-center space-y-3">
                            <div className="w-14 h-14 bg-gray-100 text-gray-400 rounded-full flex items-center justify-center mx-auto">
                                <CheckCircle className="h-7 w-7 text-green-500" />
                            </div>
                            <h3 className="text-lg font-bold text-gray-800">No LGs Require Immediate Renewal</h3>
                            <p className="text-sm text-gray-500 max-w-md mx-auto">
                                There are currently no Letters of Guarantee approaching the critical forced cutoff ({previewData?.forced_renew_days_threshold || 15} days) or marked for proactive auto-renewal ({previewData?.auto_renewal_days_threshold || 30} days).
                            </p>
                            <div className="pt-2">
                                <button
                                    type="button"
                                    onClick={() => setActiveTab('history')}
                                    className="inline-flex items-center px-4 py-2 text-xs font-semibold rounded-xl text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 transition-colors"
                                >
                                    <History className="h-4 w-4 mr-1.5" />
                                    View Previous Auto-Renewal Runs & Re-print Letters
                                </button>
                            </div>
                        </div>
                    ) : (
                        /* Candidate Review Table */
                        <>
                            {/* Standard Disclaimer & Process Explanation */}
                            <div className="bg-gray-50/80 border border-gray-200 rounded-xl p-4 space-y-1.5 text-sm text-gray-700 leading-relaxed">
                                <p>
                                    This process will identify all your eligible Letters of Guarantee for <strong>auto-renewal</strong> and for <strong>forced renewal</strong>.
                                </p>
                                <p className="text-gray-500 text-xs">
                                    For each eligible LG, the system will automatically extend its expiry date, generate an individual instruction letter, and send an individual email notification. A single, combined PDF containing all generated instruction letters will be provided for download and printing, and saved under <strong>Previous Auto-Renewal Runs</strong>.
                                </p>
                            </div>

                            {/* Policy Banner */}
                            <div className="bg-amber-50/80 border border-amber-200/80 rounded-xl p-3.5 flex items-start space-x-3 text-xs text-amber-900">
                                <ShieldAlert className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                                <div className="space-y-0.5">
                                    <p className="font-semibold text-amber-950">Corporate Risk & Compliance Control Active</p>
                                    <p>
                                        LGs in the <strong className="text-amber-950 font-bold">Mandatory Forced Zone (≤ {previewData.forced_renew_days_threshold} days to expiry)</strong> are locked and cannot be deselected to prevent default risk. You may adjust extension dates as needed.
                                    </p>
                                </div>
                            </div>

                            {/* Summary Counter Pills */}
                            <div className="flex items-center justify-between pt-1">
                                <div className="text-xs text-gray-700 font-medium flex items-center space-x-2">
                                    <span className="bg-gray-100 text-gray-800 px-3 py-1 rounded-lg border border-gray-200">
                                        Total Candidates: <strong className="text-gray-900">{candidateStats.total}</strong>
                                    </span>
                                    <span className="bg-orange-50 text-orange-800 px-3 py-1 rounded-lg border border-orange-200">
                                        Selected: <strong className="text-orange-950">{candidateStats.selected}</strong>
                                    </span>
                                    {candidateStats.forced > 0 && (
                                        <span className="bg-red-50 text-red-700 px-3 py-1 rounded-lg border border-red-200 flex items-center">
                                            <Lock className="h-3 w-3 mr-1" /> Mandatory: <strong className="ml-1 text-red-800">{candidateStats.forced}</strong>
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Candidates Table */}
                            <div className="border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                                <table className="min-w-full divide-y divide-gray-200 text-left">
                                    <thead className="bg-gray-50 text-xs font-bold text-gray-600 uppercase tracking-wider">
                                        <tr>
                                            <th className="px-4 py-3.5 w-14 text-center">
                                                {candidateStats.proactiveTotal > 0 ? (
                                                    <div className="relative group flex items-center justify-center">
                                                        <input
                                                            type="checkbox"
                                                            checked={candidateStats.proactiveSelected === candidateStats.proactiveTotal}
                                                            onChange={(e) => handleSelectAllProactive(e.target.checked)}
                                                            className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                                            title="Toggle select all optional LGs"
                                                        />
                                                    </div>
                                                ) : (
                                                    <Lock className="h-4 w-4 text-amber-600 mx-auto" title="All candidates are mandatory" />
                                                )}
                                            </th>
                                            <th className="px-4 py-3.5">LG Details</th>
                                            <th className="px-4 py-3.5">Current Expiry</th>
                                            <th className="px-4 py-3.5">Renewal Tier</th>
                                            <th className="px-4 py-3.5">Suggested Extension Date</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-100 text-sm">
                                        {previewData.candidates.map(cand => {
                                            const isSelected = cand.is_forced || !!selectedLgIds[cand.id];
                                            const currentDateStr = cand.current_expiry_date;
                                            const minAllowedDate = moment(currentDateStr).add(1, 'day').format('YYYY-MM-DD');
                                            const targetDateValue = customDates[cand.id] || cand.suggested_new_expiry_date;

                                            return (
                                                <tr
                                                    key={cand.id}
                                                    className={`transition-colors ${
                                                        cand.is_forced
                                                            ? 'bg-amber-50/30 hover:bg-amber-50/50'
                                                            : isSelected
                                                            ? 'hover:bg-blue-50/30'
                                                            : 'opacity-60 bg-gray-50/50 hover:bg-gray-50'
                                                    }`}
                                                >
                                                    {/* Checkbox / Locked Icon */}
                                                    <td className="px-4 py-3.5 text-center align-middle">
                                                        {cand.is_forced ? (
                                                            <div className="relative group inline-block">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={true}
                                                                    disabled={true}
                                                                    className="h-4 w-4 rounded border-amber-300 text-amber-600 cursor-not-allowed opacity-80"
                                                                />
                                                                <div className="opacity-0 w-60 bg-gray-900 text-white text-[11px] rounded-lg py-1.5 px-2.5 absolute z-20 -top-8 left-1/2 -translate-x-1/2 pointer-events-none group-hover:opacity-100 transition-opacity shadow-lg">
                                                                    {cand.forced_reason || 'Mandatory renewal: Cannot be deselected per safety policy.'}
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <input
                                                                type="checkbox"
                                                                checked={isSelected}
                                                                onChange={() => handleToggleCandidate(cand)}
                                                                className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                                            />
                                                        )}
                                                    </td>

                                                    {/* LG Details */}
                                                    <td className="px-4 py-3.5">
                                                        <div className="font-bold text-gray-900 text-sm flex items-center space-x-1.5">
                                                            <span>{cand.lg_number}</span>
                                                            {cand.is_forced && (
                                                                <Lock className="h-3.5 w-3.5 text-amber-600 flex-shrink-0" title="Locked forced renewal" />
                                                            )}
                                                        </div>
                                                        <div className="text-gray-600 text-xs mt-1 flex flex-col space-y-0.5">
                                                            <span>Beneficiary: <strong className="text-gray-800 font-medium">{cand.beneficiary_name || 'N/A'}</strong></span>
                                                            <span>Bank: <strong className="text-gray-800 font-medium">{cand.bank_name || 'N/A'}</strong></span>
                                                        </div>
                                                    </td>

                                                    {/* Current Expiry & Days Left */}
                                                    <td className="px-4 py-3.5 whitespace-nowrap">
                                                        <div className="font-semibold text-gray-900 text-sm">
                                                            {moment(cand.current_expiry_date).format('DD-MMM-YYYY')}
                                                        </div>
                                                        <span className={`inline-block text-xs font-semibold px-2.5 py-0.5 rounded-full mt-1.5 ${
                                                            cand.days_to_expiry <= 7
                                                                ? 'bg-red-100 text-red-700 border border-red-200'
                                                                : cand.days_to_expiry <= 15
                                                                ? 'bg-amber-100 text-amber-700 border border-amber-200'
                                                                : 'bg-blue-100 text-blue-700 border border-blue-200'
                                                        }`}>
                                                            {cand.days_to_expiry <= 0 ? 'Expired Today' : `${cand.days_to_expiry} day(s) left`}
                                                        </span>
                                                    </td>

                                                    {/* Status Badge */}
                                                    <td className="px-4 py-3.5 whitespace-nowrap">
                                                        {cand.is_forced ? (
                                                            <span className="inline-flex items-center px-3 py-1 rounded-lg text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
                                                                <ShieldAlert className="h-3.5 w-3.5 mr-1 text-amber-600" />
                                                                Mandatory Forced
                                                            </span>
                                                        ) : (
                                                            <span className="inline-flex items-center px-3 py-1 rounded-lg text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-200">
                                                                <Repeat className="h-3.5 w-3.5 mr-1 text-blue-600" />
                                                                Proactive Auto-Renew
                                                            </span>
                                                        )}
                                                    </td>

                                                    {/* Editable Date Input */}
                                                    <td className="px-4 py-3.5 whitespace-nowrap">
                                                        <div className="flex items-center space-x-2">
                                                            <div className="relative">
                                                                <input
                                                                    type="date"
                                                                    min={minAllowedDate}
                                                                    value={targetDateValue}
                                                                    disabled={!isSelected || isProcessing}
                                                                    onChange={(e) => handleDateChange(cand.id, e.target.value)}
                                                                    className={`px-3 py-1.5 text-sm rounded-lg border focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all ${
                                                                        !isSelected
                                                                            ? 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed'
                                                                            : 'bg-white border-gray-300 text-gray-900 font-medium shadow-sm'
                                                                    }`}
                                                                />
                                                            </div>
                                                            <span className="text-xs text-gray-500 font-medium">
                                                                (+{cand.lg_period_months}m)
                                                            </span>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </>
                    )}
                </div>

                {/* Modal Footer */}
                <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex items-center justify-between">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={isProcessing}
                        className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-xl text-gray-700 bg-white hover:bg-gray-50 transition-all"
                    >
                        Close
                    </button>

                    {activeTab === 'candidates' && !result && (
                        <div className="flex items-center space-x-3">
                            <GracePeriodTooltip isGracePeriod={isGracePeriod}>
                                <button
                                    type="button"
                                    onClick={handleRunRenewal}
                                    disabled={isProcessing || isGracePeriod || isLoadingPreview || candidateStats.selected === 0}
                                    className={`inline-flex items-center px-5 py-2.5 text-sm font-semibold rounded-xl text-white shadow-md transition-all ${
                                        isProcessing || isGracePeriod || isLoadingPreview || candidateStats.selected === 0
                                            ? 'bg-orange-400 opacity-60 cursor-not-allowed'
                                            : 'bg-orange-600 hover:bg-orange-700 active:scale-95 shadow-orange-200'
                                    }`}
                                >
                                    {isProcessing ? (
                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    ) : (
                                        <Repeat className="h-4 w-4 mr-2" />
                                    )}
                                    {isProcessing ? 'Processing Renewals...' : `Confirm & Extend ${candidateStats.selected} LG(s)`}
                                </button>
                            </GracePeriodTooltip>
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
};

export default RunAutoRenewalModal;
