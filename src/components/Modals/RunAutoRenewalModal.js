// frontend/src/components/Modals/RunAutoRenewalModal.js
import React, { useState, useEffect, useMemo } from 'react';
import { apiRequest } from '../../services/apiService';
import { Loader2, XCircle, CheckCircle, Download, Repeat, Lock, ShieldAlert, Calendar, CheckSquare, Square, Info } from 'lucide-react';
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

const RunAutoRenewalModal = ({ onClose, onSuccess, isGracePeriod }) => {
    const [isLoadingPreview, setIsLoadingPreview] = useState(true);
    const [previewData, setPreviewData] = useState(null);
    const [selectedLgIds, setSelectedLgIds] = useState({});
    const [customDates, setCustomDates] = useState({});
    const [isProcessing, setIsProcessing] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState('');

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
                try {
                    const byteCharacters = atob(response.combined_pdf_base64);
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

                    setTimeout(() => URL.revokeObjectURL(fileURL), 100);
                    toast.info("Consolidated instruction letter opened in a new tab for printing.");
                } catch (blobError) {
                    console.error("Error opening PDF:", blobError);
                    toast.error("Failed to open PDF automatically. Please use the download button.");
                }
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
            const link = document.createElement('a');
            link.href = `data:application/pdf;base64,${result.combined_pdf_base64}`;
            link.download = `bulk_lg_renewal_${moment().format('YYYYMMDD_HHmmss')}.pdf`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            toast.info("Consolidated PDF download initiated.");
        } else {
            toast.warn("No PDF available for download.");
        }
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
                            <h2 className="text-xl font-bold text-gray-900">Run Auto / Forced LG Renewal</h2>
                            <p className="text-xs text-gray-500 mt-0.5">Review candidate LGs, verify forced risk cutoffs, and customize new extension dates.</p>
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

                {/* Modal Body */}
                <div className="p-6 overflow-y-auto flex-1 space-y-4">
                    
                    {error && (
                        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl flex items-center space-x-3" role="alert">
                            <XCircle className="h-5 w-5 flex-shrink-0 text-red-500" />
                            <span className="text-sm font-medium">{error}</span>
                        </div>
                    )}

                    {/* Result View */}
                    {result ? (
                        <div className="text-center py-8 px-4">
                            <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
                                <CheckCircle className="h-8 w-8" />
                            </div>
                            <h3 className="text-2xl font-bold text-gray-900 mb-2">Renewal Process Completed</h3>
                            <p className="text-gray-600 max-w-md mx-auto mb-6 text-sm">{result.message}</p>

                            <div className="inline-flex items-center space-x-2 bg-gray-50 border border-gray-200 px-4 py-2 rounded-xl text-sm text-gray-700 mb-8">
                                <span>Successfully Extended:</span>
                                <span className="font-bold text-gray-900 bg-white px-2 py-0.5 rounded-md border border-gray-200">{result.renewed_count} LG(s)</span>
                            </div>

                            <div className="flex justify-center space-x-3">
                                {result.combined_pdf_base64 && (
                                    <button
                                        type="button"
                                        onClick={handleDownloadPdf}
                                        className="inline-flex items-center px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-xl shadow-sm transition-all"
                                    >
                                        <Download className="h-4 w-4 mr-2" /> Download Instruction Letter
                                    </button>
                                )}
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="inline-flex items-center px-5 py-2.5 border border-gray-300 text-sm font-medium rounded-xl text-gray-700 bg-white hover:bg-gray-50 shadow-sm transition-all"
                                >
                                    Close
                                </button>
                            </div>
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
                                    For each eligible LG, the system will automatically extend its expiry date, generate an individual instruction letter, and send an individual email notification. A single, combined PDF containing all generated instruction letters will be provided for download and printing.
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
                        Cancel
                    </button>

                    {!result && (
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