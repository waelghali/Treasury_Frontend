// frontend/src/components/Modals/BulkPrintModal.js
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { apiRequest, API_BASE_URL, getAuthToken } from '../../services/apiService';
import { openPendingTab } from '../../utils/navUtils';
import {
    Loader2, XCircle, CheckCircle, Download, Printer, History,
    ChevronDown, ChevronUp, ExternalLink, FileText, RefreshCw, AlertTriangle, Filter
} from 'lucide-react';
import { toast } from 'react-toastify';
import moment from 'moment';

const SOURCE_BADGE = {
    custody: { label: 'Custody', classes: 'bg-purple-100 text-purple-700 border border-purple-200' },
    custody_discrepancy: { label: 'Discrepancy Notice', classes: 'bg-rose-100 text-rose-700 border border-rose-200' },
    issuance_maintenance: { label: 'Issuance', classes: 'bg-violet-100 text-violet-700 border border-violet-200' },
};

const formatActionLabel = (actionType) => {
    if (!actionType) return 'N/A';
    if (actionType === 'BANK_DISCREPANCY_NOTICE') return 'Discrepancy Notice';
    return actionType
        .replace(/_/g, ' ')
        .split(' ')
        .map((w) => (w.toUpperCase() === 'LG' ? 'LG' : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()))
        .join(' ');
};

const formatAmountText = (amount, currency) => {
    if (amount === null || amount === undefined || isNaN(parseFloat(amount))) return '—';
    const num = Number(amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return currency ? `${currency} ${num}` : num;
};

const BulkPrintModal = ({
    pendingItems = [],
    onClose,
    onBatchComplete,
    isGracePeriod,
    initialTab = 'pending',
}) => {
    const [activeTab, setActiveTab] = useState(initialTab || 'pending');
    const [selectedMap, setSelectedMap] = useState(() => {
        const init = {};
        (pendingItems || []).forEach((item) => {
            if (item._bulk_item_id) {
                init[`${item._source}:${item._bulk_item_id}`] = true;
            }
        });
        return init;
    });
    const [entityFilter, setEntityFilter] = useState('ALL');
    const [bankFilter, setBankFilter] = useState('ALL');
    const [sortOrder, setSortOrder] = useState('grouped');
    const [padForDuplex, setPadForDuplex] = useState(false);

    const [isProcessing, setIsProcessing] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState('');
    const justCompletedRef = useRef(false);

    // History tab state
    const [isLoadingHistory, setIsLoadingHistory] = useState(false);
    const [historyBatches, setHistoryBatches] = useState([]);
    const [expandedBatches, setExpandedBatches] = useState({});
    const [reprintingBatchId, setReprintingBatchId] = useState(null);
    const [historyPadForDuplex, setHistoryPadForDuplex] = useState(false);

    const getItemKey = (item) => `${item._source}:${item._bulk_item_id || item.id}`;

    const uniqueEntities = useMemo(() => {
        const set = new Set();
        (pendingItems || []).forEach((item) => {
            if (item._display_entity_name) set.add(item._display_entity_name);
        });
        return Array.from(set).sort((a, b) => a.localeCompare(b));
    }, [pendingItems]);

    const uniqueBanks = useMemo(() => {
        const set = new Set();
        (pendingItems || []).forEach((item) => {
            if (item._display_bank_name) set.add(item._display_bank_name);
        });
        return Array.from(set).sort((a, b) => a.localeCompare(b));
    }, [pendingItems]);

    const filteredAndSortedItems = useMemo(() => {
        const filtered = (pendingItems || []).filter((item) => {
            if (entityFilter !== 'ALL' && (item._display_entity_name || '') !== entityFilter) return false;
            if (bankFilter !== 'ALL' && (item._display_bank_name || '') !== bankFilter) return false;
            return true;
        });

        return [...filtered].sort((a, b) => {
            if (sortOrder === 'grouped') {
                const entCmp = (a._display_entity_name || 'ZZZ').localeCompare(b._display_entity_name || 'ZZZ');
                if (entCmp !== 0) return entCmp;
                const bankCmp = (a._display_bank_name || 'ZZZ').localeCompare(b._display_bank_name || 'ZZZ');
                if (bankCmp !== 0) return bankCmp;
                const lgCmp = (a._display_lg_number || '').localeCompare(b._display_lg_number || '');
                if (lgCmp !== 0) return lgCmp;
            } else {
                const parseDisplayTimestamp = (raw) => {
                    if (!raw) return 0;
                    const normalized = String(raw).trim().replace(/^(\d{4}-\d{2}-\d{2})\s+(\d{2}:\d{2})/, '$1T$2');
                    const ts = new Date(normalized).getTime();
                    return Number.isFinite(ts) ? ts : 0;
                };
                const timeA = parseDisplayTimestamp(a._display_date);
                const timeB = parseDisplayTimestamp(b._display_date);
                if (timeA !== timeB) return timeA - timeB;
                const lgCmp = (a._display_lg_number || '').localeCompare(b._display_lg_number || '');
                if (lgCmp !== 0) return lgCmp;
            }
            const dateCmp = String(a._display_date || '').localeCompare(String(b._display_date || ''));
            if (dateCmp !== 0) return dateCmp;
            return (a._display_serial || '').localeCompare(b._display_serial || '');
        });
    }, [pendingItems, entityFilter, bankFilter, sortOrder]);

    const selectableFilteredItems = useMemo(
        () => filteredAndSortedItems.filter((item) => Boolean(item._bulk_item_id)),
        [filteredAndSortedItems]
    );

    const orderedSelectedItems = useMemo(
        () => selectableFilteredItems.filter((item) => Boolean(selectedMap[getItemKey(item)])),
        [selectableFilteredItems, selectedMap]
    );

    const allFilteredSelected =
        selectableFilteredItems.length > 0 && orderedSelectedItems.length === selectableFilteredItems.length;

    useEffect(() => {
        if (entityFilter !== 'ALL' && !uniqueEntities.includes(entityFilter)) {
            setEntityFilter('ALL');
        }
    }, [uniqueEntities, entityFilter]);

    useEffect(() => {
        if (bankFilter !== 'ALL' && !uniqueBanks.includes(bankFilter)) {
            setBankFilter('ALL');
        }
    }, [uniqueBanks, bankFilter]);

    useEffect(() => {
        setSelectedMap((prev) => {
            const validKeys = new Set();
            (pendingItems || []).forEach((item) => {
                if (item._bulk_item_id) validKeys.add(`${item._source}:${item._bulk_item_id}`);
            });
            const next = {};
            let selectedCount = 0;
            validKeys.forEach((k) => {
                if (prev[k]) {
                    next[k] = true;
                    selectedCount++;
                }
            });
            if (justCompletedRef.current) {
                justCompletedRef.current = false;
                if (validKeys.size > 0 && selectedCount === 0) {
                    validKeys.forEach((k) => {
                        next[k] = true;
                    });
                }
            }
            return next;
        });
    }, [pendingItems]);

    const fetchHistory = useCallback(async () => {
        setIsLoadingHistory(true);
        try {
            const data = await apiRequest('/end-user/action-center/bulk-print-history', 'GET');
            const list = Array.isArray(data) ? data : [];
            setHistoryBatches(list);
            if (list.length > 0) {
                setExpandedBatches((prev) => (Object.keys(prev).length === 0 ? { [list[0].batch_id]: true } : prev));
            }
        } catch (err) {
            console.error('Failed to load bulk print history:', err);
            toast.error(`Failed to load previous bulk print runs: ${err.message || 'Unexpected error'}`);
        } finally {
            setIsLoadingHistory(false);
        }
    }, []);

    useEffect(() => {
        if (activeTab === 'history') {
            fetchHistory();
        }
    }, [activeTab, fetchHistory]);

    const base64ToPdfBlob = (base64Str) => {
        const byteCharacters = atob(base64Str);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        return new Blob([byteArray], { type: 'application/pdf' });
    };

    const openBase64PdfInNewTab = (base64Str, existingTab = null) => {
        const tab = existingTab || openPendingTab('Opening Consolidated Print PDF...');
        try {
            const blob = base64ToPdfBlob(base64Str);
            const fileURL = tab.setBlob(blob);
            if (fileURL) {
                setTimeout(() => URL.revokeObjectURL(fileURL), 120000);
            }
            if (tab.isBlocked) {
                toast.warn('Popup blocked by browser. Please allow pop-ups or use the Download button.');
            } else {
                toast.info('Consolidated print batch PDF opened in a new tab.');
            }
        } catch (blobError) {
            tab.close();
            console.error('Error opening PDF:', blobError);
            toast.error('Failed to open PDF automatically. Please use the Download button.');
        }
    };

    const downloadBase64Pdf = (base64Str, fileNamePrefix = 'bulk_print_letters') => {
        try {
            const blob = base64ToPdfBlob(base64Str);
            const fileURL = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = fileURL;
            link.download = `${fileNamePrefix}_${moment().format('YYYYMMDD_HHmmss')}.pdf`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            setTimeout(() => URL.revokeObjectURL(fileURL), 60000);
            toast.info('Consolidated PDF download initiated.');
        } catch (dlError) {
            console.error('Error downloading PDF:', dlError);
            toast.error('Failed to prepare PDF download.');
        }
    };

    const handlePrintSingleBatchItem = async (item) => {
        if (!item?.id || !item?.source) {
            toast.error('Letter reference is missing.');
            return;
        }
        try {
            const authToken = getAuthToken();
            if (item.source === 'custody') {
                let url = `${API_BASE_URL}/end-user/lg-records/instructions/${item.id}/view-letter`;
                if (authToken) url += `?token=${authToken}&print=true`;
                window.open(url, '_blank');
                toast.info(`Opening letter for LG ${item.lg_number || ''}...`);
            } else if (item.source === 'custody_discrepancy') {
                let url = `${API_BASE_URL}/end-user/lg-records/instructions/${item.id}/view-discrepancy-letter`;
                if (authToken) url += `?token=${authToken}&print=true`;
                window.open(url, '_blank');
                toast.info(`Opening Discrepancy Notice for LG ${item.lg_number || ''}...`);
            } else if (item.source === 'issuance_maintenance') {
                const tab = openPendingTab('Loading Maintenance Letter...');
                try {
                    const blob = await apiRequest(
                        `/issuance/maintenance/${item.id}/document/letter`,
                        'GET',
                        null,
                        'application/json',
                        'blob'
                    );
                    const fileURL = tab.setBlob(blob);
                    if (fileURL) {
                        setTimeout(() => URL.revokeObjectURL(fileURL), 120000);
                    }
                    toast.info(`Opening Issuance Maintenance letter for ${item.lg_number || ''}...`);
                } catch (innerErr) {
                    tab.close();
                    throw innerErr;
                }
            }
        } catch (err) {
            console.error('Single letter reprint error:', err);
            toast.error(`Failed to open letter: ${err.message || 'Unexpected error'}`);
        }
    };

    const handleToggleItem = (item) => {
        if (!item._bulk_item_id) return;
        const key = getItemKey(item);
        setSelectedMap((prev) => ({ ...prev, [key]: !prev[key] }));
    };

    const handleToggleAllFiltered = () => {
        const nextVal = !allFilteredSelected;
        setSelectedMap((prev) => {
            const updated = { ...prev };
            selectableFilteredItems.forEach((item) => {
                updated[getItemKey(item)] = nextVal;
            });
            return updated;
        });
    };

    const handleExecuteBulkPrint = async () => {
        if (isGracePeriod) {
            toast.warn("This action is disabled during your subscription's grace period.");
            return;
        }
        if (orderedSelectedItems.length === 0) {
            toast.warn('Please select at least one letter to print.');
            return;
        }

        const tab = openPendingTab('Generating Consolidated Print Batch...');
        setIsProcessing(true);
        setError('');
        setResult(null);

        try {
            const payload = {
                items: orderedSelectedItems.map((item) => ({
                    source: item._source,
                    id: item._bulk_item_id,
                })),
                pad_for_duplex: padForDuplex,
            };
            const response = await apiRequest('/end-user/action-center/bulk-print', 'POST', payload);
            justCompletedRef.current = true;
            setResult(response);
            setActiveTab('result');
            toast.success(response.message || 'Bulk print PDF generated.');
            if (onBatchComplete) onBatchComplete();

            if (response.combined_pdf_base64) {
                openBase64PdfInNewTab(response.combined_pdf_base64, tab);
            } else {
                tab.close();
            }
        } catch (err) {
            tab.close();
            console.error('Bulk print execution failed:', err);
            const msg = err.message || 'An unexpected error occurred.';
            setError(`Failed to generate bulk print batch: ${msg}`);
            toast.error(`Bulk print failed: ${msg}`);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleReprintBatch = async (batch, mode = 'open') => {
        const batchItems = (batch.items || [])
            .filter((item) => item.source && item.id)
            .map((item) => ({ source: item.source, id: item.id }));

        if (batchItems.length === 0) {
            toast.warn('No accessible letters found in this batch to reprint.');
            return;
        }

        const tab = mode === 'open' ? openPendingTab('Regenerating Batch PDF...') : null;
        setReprintingBatchId(`${batch.batch_id}-${mode}`);
        try {
            const response = await apiRequest('/end-user/action-center/bulk-print-reprint', 'POST', {
                items: batchItems,
                pad_for_duplex: historyPadForDuplex,
            });
            if (response?.combined_pdf_base64) {
                if (mode === 'download') {
                    downloadBase64Pdf(response.combined_pdf_base64, `reprint_${batch.batch_id}`);
                } else {
                    openBase64PdfInNewTab(response.combined_pdf_base64, tab);
                }
            } else {
                if (tab) tab.close();
                toast.warn('No PDF content returned from server.');
            }
        } catch (err) {
            if (tab) tab.close();
            console.error('Failed to reprint batch:', err);
            toast.error(`Failed to regenerate batch PDF: ${err.message || 'Unexpected error'}`);
        } finally {
            setReprintingBatchId(null);
        }
    };

    const handleReturnToPendingQueue = () => {
        setEntityFilter('ALL');
        setBankFilter('ALL');
        setSelectedMap(() => {
            const next = {};
            (pendingItems || []).forEach((item) => {
                if (item._bulk_item_id) {
                    next[`${item._source}:${item._bulk_item_id}`] = true;
                }
            });
            return next;
        });
        setActiveTab('pending');
    };

    const toggleExpandBatch = (batchId) => {
        setExpandedBatches((prev) => ({
            ...prev,
            [batchId]: !prev[batchId],
        }));
    };

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm overflow-y-auto h-full w-full z-50 flex justify-center items-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden border border-slate-200">
                {/* Modal Header */}
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-purple-50/70 via-white to-slate-50/60">
                    <div className="flex items-center space-x-3">
                        <div className="p-2.5 bg-purple-100 text-purple-600 rounded-xl shadow-xs">
                            <Printer className="h-5 w-5" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-slate-900">Bulk Print Pending Letters &amp; Batch History</h2>
                            <p className="text-xs text-slate-500 mt-0.5">
                                Merge unrelated pending instruction letters into a single grouped PDF or re-print previous batches.
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={isProcessing}
                        className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
                    >
                        <XCircle className="h-5 w-5" />
                    </button>
                </div>

                {/* Top Tabs */}
                <div className="px-6 pt-2 border-b border-slate-200 bg-slate-50/60 flex items-center justify-between">
                    <div className="flex space-x-6">
                        <button
                            type="button"
                            onClick={() => setActiveTab('pending')}
                            className={`pb-3 pt-2 text-sm font-semibold border-b-2 flex items-center space-x-2 transition-colors ${
                                activeTab === 'pending'
                                    ? 'border-purple-600 text-purple-600'
                                    : 'border-transparent text-slate-500 hover:text-slate-800'
                            }`}
                        >
                            <Printer className="h-4 w-4" />
                            <span>Pending Print Queue</span>
                            <span
                                className={`ml-1.5 px-2 py-0.5 text-xs rounded-full font-bold ${
                                    pendingItems.length > 0
                                        ? 'bg-purple-100 text-purple-700'
                                        : 'bg-slate-200 text-slate-600'
                                }`}
                            >
                                {pendingItems.length}
                            </span>
                        </button>
                        {result && (
                            <button
                                type="button"
                                onClick={() => setActiveTab('result')}
                                className={`pb-3 pt-2 text-sm font-semibold border-b-2 flex items-center space-x-2 transition-colors ${
                                    activeTab === 'result'
                                        ? 'border-emerald-600 text-emerald-700'
                                        : 'border-transparent text-slate-500 hover:text-slate-800'
                                }`}
                            >
                                <CheckCircle className="h-4 w-4" />
                                <span>Completed Batch</span>
                                <span className="ml-1.5 px-2 py-0.5 text-xs rounded-full bg-emerald-100 text-emerald-700 font-bold">
                                    {result.printed_count}
                                </span>
                            </button>
                        )}
                        <button
                            type="button"
                            onClick={() => setActiveTab('history')}
                            className={`pb-3 pt-2 text-sm font-semibold border-b-2 flex items-center space-x-2 transition-colors ${
                                activeTab === 'history'
                                    ? 'border-indigo-600 text-indigo-600'
                                    : 'border-transparent text-slate-500 hover:text-slate-800'
                            }`}
                        >
                            <History className="h-4 w-4" />
                            <span>Previous Bulk Prints (Re-print)</span>
                        </button>
                    </div>
                    {activeTab === 'history' && (
                        <button
                            type="button"
                            onClick={fetchHistory}
                            disabled={isLoadingHistory}
                            className="inline-flex items-center px-2.5 py-1 text-xs font-medium text-slate-600 hover:text-slate-900 bg-white border border-slate-200 rounded-lg shadow-xs hover:bg-slate-50 mb-1"
                        >
                            <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${isLoadingHistory ? 'animate-spin' : ''}`} />
                            Refresh
                        </button>
                    )}
                </div>

                {/* Modal Body */}
                <div className="p-6 overflow-y-auto flex-1 space-y-4">
                    {error && activeTab === 'pending' && (
                        <div className="bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-xl flex items-center space-x-3" role="alert">
                            <XCircle className="h-5 w-5 flex-shrink-0 text-rose-500" />
                            <span className="text-sm font-medium">{error}</span>
                        </div>
                    )}

                    {activeTab === 'history' ? (
                        isLoadingHistory ? (
                            <div className="py-16 text-center space-y-4">
                                <Loader2 className="h-10 w-10 text-indigo-500 animate-spin mx-auto" />
                                <p className="text-sm font-medium text-slate-600">Loading previous bulk print batches...</p>
                            </div>
                        ) : historyBatches.length === 0 ? (
                            <div className="py-12 text-center space-y-3">
                                <div className="w-14 h-14 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto">
                                    <History className="h-7 w-7 text-slate-400" />
                                </div>
                                <h3 className="text-lg font-bold text-slate-800">No Previous Bulk Print Batches Found</h3>
                                <p className="text-sm text-slate-500 max-w-md mx-auto">
                                    Once you print a batch from the Pending Print Queue, it is recorded here so you can safely re-open or download the consolidated PDF at any time.
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div className="bg-indigo-50/70 border border-indigo-200 rounded-xl p-3.5 text-xs text-indigo-900 flex flex-wrap items-center justify-between gap-3">
                                    <span>
                                        Need to re-print a batch after a paper jam or closed tab? Expand any batch below to <strong>re-open/download the merged PDF</strong> or <strong>print individual letters</strong> without altering delivery status.
                                    </span>
                                    <label className="inline-flex items-center gap-2 font-medium text-indigo-900 cursor-pointer select-none">
                                        <input
                                            type="checkbox"
                                            checked={historyPadForDuplex}
                                            onChange={(e) => setHistoryPadForDuplex(e.target.checked)}
                                            className="rounded border-indigo-300 text-indigo-600 focus:ring-indigo-500"
                                        />
                                        <span>Duplex protection (blank back-pages)</span>
                                    </label>
                                </div>

                                {historyBatches.map((batch) => {
                                    const isExpanded = !!expandedBatches[batch.batch_id];
                                    const isOpeningBatch = reprintingBatchId === `${batch.batch_id}-open`;
                                    const isDownloadingBatch = reprintingBatchId === `${batch.batch_id}-download`;

                                    return (
                                        <div key={batch.batch_id} className="border border-slate-200 rounded-xl overflow-hidden shadow-xs bg-white">
                                            <div
                                                onClick={() => toggleExpandBatch(batch.batch_id)}
                                                className="px-4 py-3.5 bg-slate-50/80 hover:bg-slate-100/70 cursor-pointer flex flex-wrap items-center justify-between gap-3 border-b border-slate-100"
                                            >
                                                <div className="flex items-center space-x-3">
                                                    <div className="p-2 bg-purple-100 text-purple-700 rounded-lg">
                                                        <FileText className="h-4 w-4" />
                                                    </div>
                                                    <div>
                                                        <div className="flex flex-wrap items-center gap-2">
                                                            <span className="font-bold text-sm text-slate-900">
                                                                {moment(batch.created_at).format('DD-MMM-YYYY hh:mm A')}
                                                            </span>
                                                            <span className="text-xs font-mono bg-white border border-slate-200 text-slate-600 px-2 py-0.5 rounded">
                                                                {batch.batch_id}
                                                            </span>
                                                            <span className="text-xs font-semibold bg-purple-100 text-purple-800 px-2.5 py-0.5 rounded-full">
                                                                {batch.printed_count} Letter(s)
                                                            </span>
                                                        </div>
                                                        <div className="text-xs text-slate-500 mt-0.5">
                                                            Printed by: <strong className="text-slate-700">{batch.triggered_by_email || 'Authorized User'}</strong>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="flex items-center space-x-2" onClick={(e) => e.stopPropagation()}>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleReprintBatch(batch, 'open')}
                                                        disabled={isOpeningBatch || isDownloadingBatch || (batch.items || []).length === 0}
                                                        className="inline-flex items-center px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors disabled:opacity-50"
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
                                                        className="inline-flex items-center px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 text-xs font-semibold rounded-lg shadow-xs transition-colors disabled:opacity-50"
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
                                                        className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg"
                                                    >
                                                        {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                                                    </button>
                                                </div>
                                            </div>

                                            {isExpanded && (
                                                <div className="overflow-x-auto">
                                                    {(batch.items || []).length === 0 ? (
                                                        <div className="p-4 text-xs text-slate-500 text-center">
                                                            No accessible letter records remain in this batch.
                                                        </div>
                                                    ) : (
                                                        <table className="min-w-full divide-y divide-slate-100 text-left text-xs">
                                                            <thead className="bg-slate-50/60 text-slate-500 uppercase font-semibold">
                                                                <tr>
                                                                    <th className="px-4 py-2.5">LG &amp; Source</th>
                                                                    <th className="px-4 py-2.5">Entity &amp; Bank</th>
                                                                    <th className="px-4 py-2.5">Action &amp; Amount</th>
                                                                    <th className="px-4 py-2.5">Live Tracking Status</th>
                                                                    <th className="px-4 py-2.5 text-right">Letter Action</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody className="divide-y divide-slate-100 bg-white">
                                                                {batch.items.map((item, idx) => {
                                                                    const badge = SOURCE_BADGE[item.source] || SOURCE_BADGE.custody;
                                                                    return (
                                                                        <tr key={`${batch.batch_id}-${item.source}-${item.id}-${idx}`} className="hover:bg-slate-50/80">
                                                                            <td className="px-4 py-3">
                                                                                <div className="font-bold text-slate-900 text-sm">{item.lg_number}</div>
                                                                                <div className="font-mono text-slate-500 mt-0.5">
                                                                                    {item.serial_number || `#${item.id}`}
                                                                                </div>
                                                                                <span className={`inline-block mt-1 text-[10px] px-1.5 py-0.5 rounded font-semibold ${badge.classes}`}>
                                                                                    {badge.label}
                                                                                </span>
                                                                            </td>
                                                                            <td className="px-4 py-3">
                                                                                <div className="font-medium text-slate-800">{item.entity_name || 'N/A'}</div>
                                                                                <div className="text-slate-500 mt-0.5">{item.bank_name || 'N/A'}</div>
                                                                            </td>
                                                                            <td className="px-4 py-3 whitespace-nowrap">
                                                                                <div className="font-semibold text-slate-800">{formatActionLabel(item.action_type)}</div>
                                                                                <div className="text-slate-500 mt-0.5 tabular-nums">
                                                                                    {formatAmountText(item.amount, item.currency_code)}
                                                                                </div>
                                                                            </td>
                                                                            <td className="px-4 py-3 whitespace-nowrap">
                                                                                {item.bank_reply_date ? (
                                                                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800">
                                                                                        Bank Replied ({moment(item.bank_reply_date).format('DD-MMM-YYYY')})
                                                                                    </span>
                                                                                ) : item.delivery_date ? (
                                                                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-100 text-blue-800">
                                                                                        Delivered ({moment(item.delivery_date).format('DD-MMM-YYYY')})
                                                                                    </span>
                                                                                ) : (
                                                                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-800">
                                                                                        Printed • Awaiting Delivery
                                                                                    </span>
                                                                                )}
                                                                            </td>
                                                                            <td className="px-4 py-3 whitespace-nowrap text-right">
                                                                                <button
                                                                                    type="button"
                                                                                    onClick={() => handlePrintSingleBatchItem(item)}
                                                                                    className="inline-flex items-center px-2.5 py-1.5 border border-indigo-200 text-xs font-semibold rounded-lg text-indigo-700 bg-indigo-50 hover:bg-indigo-100 transition-colors"
                                                                                >
                                                                                    <Printer className="h-3.5 w-3.5 mr-1" />
                                                                                    Print Letter
                                                                                </button>
                                                                            </td>
                                                                        </tr>
                                                                    );
                                                                })}
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
                    ) : activeTab === 'result' && result ? (
                        /* Result Screen */
                        <div className="py-4 px-2 space-y-6">
                            <div className="text-center">
                                <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-3 shadow-xs">
                                    <CheckCircle className="h-8 w-8" />
                                </div>
                                <h3 className="text-2xl font-bold text-slate-900 mb-1">Bulk Print Batch Ready</h3>
                                <p className="text-slate-600 max-w-lg mx-auto mb-4 text-sm">{result.message}</p>

                                <div className="inline-flex flex-wrap items-center justify-center gap-2 bg-slate-50 border border-slate-200 px-4 py-2 rounded-xl text-sm text-slate-700 mb-5">
                                    <span>Letters Merged &amp; Marked Printed:</span>
                                    <span className="font-bold text-slate-900 bg-white px-2.5 py-0.5 rounded-md border border-slate-200">
                                        {result.printed_count} Letter(s)
                                    </span>
                                    {result.batch_id && (
                                        <>
                                            <span className="text-slate-300">|</span>
                                            <span>Batch: <strong className="font-mono text-xs text-purple-700">{result.batch_id}</strong></span>
                                        </>
                                    )}
                                </div>

                                <div className="flex flex-wrap justify-center gap-3">
                                    {result.combined_pdf_base64 && (
                                        <>
                                            <button
                                                type="button"
                                                onClick={() => openBase64PdfInNewTab(result.combined_pdf_base64)}
                                                className="inline-flex items-center px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold rounded-xl shadow-xs transition-all"
                                            >
                                                <ExternalLink className="h-4 w-4 mr-2" /> Open &amp; Print Combined PDF
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => downloadBase64Pdf(result.combined_pdf_base64, result.batch_id || 'bulk_print')}
                                                className="inline-flex items-center px-4 py-2.5 bg-white hover:bg-slate-50 text-purple-700 border border-purple-200 text-sm font-semibold rounded-xl shadow-xs transition-all"
                                            >
                                                <Download className="h-4 w-4 mr-2" /> Download Combined PDF
                                            </button>
                                        </>
                                    )}
                                    {pendingItems.length > 0 && (
                                        <button
                                            type="button"
                                            onClick={handleReturnToPendingQueue}
                                            className="inline-flex items-center px-4 py-2.5 border border-purple-300 text-sm font-semibold rounded-xl text-purple-700 bg-purple-50 hover:bg-purple-100 shadow-xs transition-all"
                                        >
                                            <Printer className="h-4 w-4 mr-2" /> Back to Pending Queue ({pendingItems.length} remaining)
                                        </button>
                                    )}
                                    <button
                                        type="button"
                                        onClick={() => setActiveTab('history')}
                                        className="inline-flex items-center px-4 py-2.5 border border-slate-300 text-sm font-medium rounded-xl text-slate-700 bg-white hover:bg-slate-50 shadow-xs transition-all"
                                    >
                                        <History className="h-4 w-4 mr-2" /> View Previous Bulk Prints
                                    </button>
                                </div>
                            </div>

                            {Array.isArray(result.printed_items) && result.printed_items.length > 0 && (
                                <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                                    <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                                        <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                                            Letters in This Batch ({result.printed_items.length})
                                        </span>
                                        <span className="text-xs text-slate-500">
                                            Saved under &ldquo;Previous Bulk Prints&rdquo; for future re-printing.
                                        </span>
                                    </div>
                                    <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
                                        <thead className="bg-slate-50/60 text-slate-500 uppercase font-semibold">
                                            <tr>
                                                <th className="px-4 py-2.5">LG Number</th>
                                                <th className="px-4 py-2.5">Entity / Bank</th>
                                                <th className="px-4 py-2.5">Action Type</th>
                                                <th className="px-4 py-2.5">Serial / Ref</th>
                                                <th className="px-4 py-2.5 text-right">Individual Letter</th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-slate-100">
                                            {result.printed_items.map((item, idx) => {
                                                const badge = SOURCE_BADGE[item.source] || SOURCE_BADGE.custody;
                                                return (
                                                    <tr key={`${item.source}-${item.id}-${idx}`} className="hover:bg-slate-50">
                                                        <td className="px-4 py-2.5">
                                                            <div className="font-bold text-slate-900 text-sm">{item.lg_number}</div>
                                                            <span className={`inline-block mt-0.5 text-[10px] px-1.5 py-0.5 rounded font-semibold ${badge.classes}`}>
                                                                {badge.label}
                                                            </span>
                                                        </td>
                                                        <td className="px-4 py-2.5 text-slate-600">
                                                            <div className="font-medium text-slate-800">{item.entity_name || 'N/A'}</div>
                                                            <div>{item.bank_name || 'N/A'}</div>
                                                        </td>
                                                        <td className="px-4 py-2.5 font-medium text-slate-800">
                                                            {formatActionLabel(item.action_type)}
                                                        </td>
                                                        <td className="px-4 py-2.5 font-mono text-slate-700">
                                                            {item.serial_number || `#${item.id}`}
                                                        </td>
                                                        <td className="px-4 py-2.5 text-right">
                                                            <button
                                                                type="button"
                                                                onClick={() => handlePrintSingleBatchItem(item)}
                                                                className="inline-flex items-center px-2.5 py-1 border border-purple-200 text-xs font-semibold rounded-lg text-purple-700 bg-purple-50 hover:bg-purple-100"
                                                            >
                                                                <Printer className="h-3.5 w-3.5 mr-1" /> Print Letter
                                                            </button>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    ) : pendingItems.length === 0 ? (
                        <div className="py-12 text-center space-y-2">
                            <CheckCircle className="h-10 w-10 text-emerald-500 mx-auto" />
                            <h3 className="text-base font-bold text-slate-800">No Pending Letters to Print</h3>
                            <p className="text-sm text-slate-500">All approved letters have already been printed.</p>
                        </div>
                    ) : (
                        /* Selection Queue */
                        <div className="space-y-4">
                            {/* Single-sided & Duplex Protection Banner */}
                            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 flex flex-col gap-3">
                                <div className="flex items-start gap-2.5 text-xs text-amber-900 leading-relaxed">
                                    <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                                    <div>
                                        <strong>Single-Sided Letterhead Printing:</strong> Each unrelated letter is formatted on 1 A4 page with top letterhead clearance and its own QR security seal. Please print <strong>Single-Sided (1-Sided)</strong> on corporate letterhead.
                                    </div>
                                </div>
                                <label className="inline-flex items-center gap-2 text-xs font-semibold text-amber-900 bg-white border border-amber-200 px-3 py-2 rounded-lg cursor-pointer self-start select-none">
                                    <input
                                        type="checkbox"
                                        checked={padForDuplex}
                                        onChange={(e) => setPadForDuplex(e.target.checked)}
                                        className="rounded border-amber-300 text-purple-600 focus:ring-purple-500"
                                    />
                                    <span>Duplex (2-sided) protection: insert blank back-page</span>
                                </label>
                            </div>

                            {/* Filters & Sort Controls */}
                            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3">
                                <div className="flex flex-wrap items-center gap-2.5">
                                    <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600">
                                        <Filter className="h-3.5 w-3.5" />
                                        <span>Filter:</span>
                                    </div>
                                    <select
                                        value={entityFilter}
                                        onChange={(e) => setEntityFilter(e.target.value)}
                                        className="text-xs border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white text-slate-700 focus:ring-purple-500 focus:border-purple-500"
                                    >
                                        <option value="ALL">All Entities ({uniqueEntities.length})</option>
                                        {uniqueEntities.map((ent) => (
                                            <option key={ent} value={ent}>{ent}</option>
                                        ))}
                                    </select>
                                    <select
                                        value={bankFilter}
                                        onChange={(e) => setBankFilter(e.target.value)}
                                        className="text-xs border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white text-slate-700 focus:ring-purple-500 focus:border-purple-500"
                                    >
                                        <option value="ALL">All Banks ({uniqueBanks.length})</option>
                                        {uniqueBanks.map((bank) => (
                                            <option key={bank} value={bank}>{bank}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="flex items-center gap-2 text-xs">
                                    <span className="font-semibold text-slate-600">Order:</span>
                                    <select
                                        value={sortOrder}
                                        onChange={(e) => setSortOrder(e.target.value)}
                                        className="text-xs border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white text-slate-700 focus:ring-purple-500 focus:border-purple-500"
                                    >
                                        <option value="grouped">Group by Entity &amp; Bank (Recommended)</option>
                                        <option value="date">Approval / Creation Date</option>
                                    </select>
                                </div>
                            </div>

                            {/* Selection Table */}
                            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                                <div className="overflow-x-auto">
                                    <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
                                        <thead className="bg-slate-50 text-slate-500 uppercase font-bold">
                                            <tr>
                                                <th className="px-3.5 py-2.5 w-10">
                                                    <input
                                                        type="checkbox"
                                                        checked={allFilteredSelected}
                                                        onChange={handleToggleAllFiltered}
                                                        disabled={selectableFilteredItems.length === 0}
                                                        className="rounded border-slate-300 text-purple-600 focus:ring-purple-500"
                                                    />
                                                </th>
                                                <th className="px-3.5 py-2.5">LG &amp; Serial Ref</th>
                                                <th className="px-3.5 py-2.5">Source</th>
                                                <th className="px-3.5 py-2.5">Corporate Entity</th>
                                                <th className="px-3.5 py-2.5">Recipient Bank</th>
                                                <th className="px-3.5 py-2.5">Action &amp; Amount</th>
                                                <th className="px-3.5 py-2.5">Date</th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-slate-100">
                                            {filteredAndSortedItems.length === 0 ? (
                                                <tr>
                                                    <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                                                        No pending letters match the selected Entity / Bank filters.
                                                    </td>
                                                </tr>
                                            ) : (
                                                filteredAndSortedItems.map((item) => {
                                                    const key = getItemKey(item);
                                                    const isSelectable = Boolean(item._bulk_item_id);
                                                    const isChecked = isSelectable && Boolean(selectedMap[key]);
                                                    const badge = SOURCE_BADGE[item._source] || SOURCE_BADGE.custody;

                                                    return (
                                                        <tr
                                                            key={key}
                                                            onClick={() => isSelectable && handleToggleItem(item)}
                                                            className={`${isSelectable ? 'cursor-pointer' : 'opacity-60'} ${
                                                                isChecked ? 'bg-purple-50/35 hover:bg-purple-50/60' : 'hover:bg-slate-50'
                                                            } transition-colors`}
                                                        >
                                                            <td className="px-3.5 py-2.5" onClick={(e) => e.stopPropagation()}>
                                                                <input
                                                                    type="checkbox"
                                                                    checked={isChecked}
                                                                    disabled={!isSelectable}
                                                                    onChange={() => handleToggleItem(item)}
                                                                    className="rounded border-slate-300 text-purple-600 focus:ring-purple-500"
                                                                />
                                                            </td>
                                                            <td className="px-3.5 py-2.5 whitespace-nowrap">
                                                                <div className="font-bold text-indigo-700 text-sm">{item._display_lg_number}</div>
                                                                <div className="font-mono text-slate-500 mt-0.5">{item._display_serial || 'N/A'}</div>
                                                            </td>
                                                            <td className="px-3.5 py-2.5 whitespace-nowrap">
                                                                <span className={`inline-block text-[10px] px-2 py-0.5 rounded font-semibold ${badge.classes}`}>
                                                                    {badge.label}
                                                                </span>
                                                            </td>
                                                            <td className="px-3.5 py-2.5">
                                                                <div className="font-medium text-slate-800">{item._display_entity_name || 'N/A'}</div>
                                                            </td>
                                                            <td className="px-3.5 py-2.5">
                                                                <div className="font-medium text-slate-700">{item._display_bank_name || 'N/A'}</div>
                                                            </td>
                                                            <td className="px-3.5 py-2.5 whitespace-nowrap">
                                                                <div className="font-semibold text-slate-900">{formatActionLabel(item._display_action_type)}</div>
                                                                <div className="text-slate-500 mt-0.5 tabular-nums">
                                                                    {formatAmountText(item._display_amount, item._display_currency)}
                                                                </div>
                                                            </td>
                                                            <td className="px-3.5 py-2.5 whitespace-nowrap text-slate-500 tabular-nums">
                                                                {item._display_date ? moment(item._display_date).format('DD-MMM-YYYY') : 'N/A'}
                                                            </td>
                                                        </tr>
                                                    );
                                                })
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Modal Footer */}
                <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
                    <div className="text-xs text-slate-500">
                        {activeTab === 'pending' && pendingItems.length > 0 && (
                            <span>
                                <strong className="text-slate-800">{orderedSelectedItems.length}</strong> of{' '}
                                <strong className="text-slate-800">{selectableFilteredItems.length}</strong> visible letter(s) selected
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-2.5">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={isProcessing}
                            className="px-4 py-2 border border-slate-300 text-sm font-semibold rounded-xl text-slate-700 bg-white hover:bg-slate-50 transition-colors disabled:opacity-50"
                        >
                            {activeTab === 'pending' && !result && pendingItems.length > 0 ? 'Cancel' : 'Close'}
                        </button>
                        {activeTab === 'pending' && pendingItems.length > 0 && (
                            <button
                                type="button"
                                onClick={handleExecuteBulkPrint}
                                disabled={isProcessing || isGracePeriod || orderedSelectedItems.length === 0}
                                className="inline-flex items-center px-4 py-2 text-sm font-semibold rounded-xl shadow-xs bg-purple-600 text-white hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isProcessing ? (
                                    <>
                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Generating PDF...
                                    </>
                                ) : (
                                    <>
                                        <Printer className="h-4 w-4 mr-2" /> Generate &amp; Print Selected ({orderedSelectedItems.length})
                                    </>
                                )}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BulkPrintModal;
