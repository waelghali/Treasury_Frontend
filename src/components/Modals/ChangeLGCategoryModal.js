// frontend/src/components/Modals/ChangeLGCategoryModal.js
import React, { useState, useEffect, useMemo, useRef, Fragment } from 'react';
import { Dialog, DialogPanel, DialogTitle, Transition, TransitionChild } from '@headlessui/react';
import { X, Tag, Loader2, AlertCircle, ArrowRight, CheckCircle2, Info, Search } from 'lucide-react';
import { apiRequest } from '../../services/apiService';
import { toast } from 'react-toastify';

const EMPTY_ARRAY = [];

const getOldExtraFieldSummary = (lg) => {
    if (!lg || !lg.additional_field_values || typeof lg.additional_field_values !== 'object') {
        return { fieldName: lg?.lg_category?.extra_field_name || null, value: '' };
    }
    const catField = lg.lg_category?.extra_field_name;
    if (catField && lg.additional_field_values[catField] !== undefined && lg.additional_field_values[catField] !== null) {
        return { fieldName: catField, value: String(lg.additional_field_values[catField]) };
    }
    const entries = Object.entries(lg.additional_field_values).filter(([, v]) => v !== null && v !== undefined && String(v).trim() !== '');
    if (entries.length > 0) {
        return { fieldName: entries[0][0], value: String(entries[0][1]) };
    }
    return { fieldName: catField || null, value: '' };
};

const ChangeLGCategoryModal = ({
    initialScope = 'single',
    lgRecord = null,
    selectedRecords = EMPTY_ARRAY,
    allRecords = EMPTY_ARRAY,
    categories: preloadedCategories = null,
    preselectedSourceCategoryId = '',
    preselectSourceRecords = false,
    onClose,
    onSuccess,
    isGracePeriod = false,
}) => {
    const isSingleMode = initialScope === 'single' && Boolean(lgRecord);
    const [categories, setCategories] = useState(Array.isArray(preloadedCategories) ? preloadedCategories : []);
    const [isLoadingCategories, setIsLoadingCategories] = useState(!Array.isArray(preloadedCategories));
    const [targetCategoryId, setTargetCategoryId] = useState('');

    // Record pool & in-modal multi-select state
    const [recordsPool, setRecordsPool] = useState(Array.isArray(allRecords) ? allRecords : EMPTY_ARRAY);
    const [isLoadingRecords, setIsLoadingRecords] = useState(
        !(initialScope === 'single' && Boolean(lgRecord)) && !(Array.isArray(allRecords) && allRecords.length > 0)
    );
    const hasFetchedRecordsRef = useRef(Array.isArray(allRecords) && allRecords.length > 0);
    const [pickedLgIds, setPickedLgIds] = useState(() =>
        selectedRecords.length > 0
            ? selectedRecords.map((r) => r.id)
            : lgRecord?.id
            ? [lgRecord.id]
            : []
    );
    const [pickerSearch, setPickerSearch] = useState('');
    const [pickerCategoryFilter, setPickerCategoryFilter] = useState(
        preselectedSourceCategoryId ? String(preselectedSourceCategoryId) : ''
    );
    const hasAppliedInitialPreselect = useRef(false);
    const headerCheckboxRef = useRef(null);

    // Extra field state
    const [singleExtraValue, setSingleExtraValue] = useState('');
    const [uniformExtraValue, setUniformExtraValue] = useState('');
    const [carryOverOldExtraField, setCarryOverOldExtraField] = useState(false);
    const [perLgExtraValues, setPerLgExtraValues] = useState({});
    const [reason, setReason] = useState('');

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (isSingleMode) {
            setIsLoadingRecords(false);
            return;
        }
        if (Array.isArray(allRecords) && allRecords.length > 0) {
            setRecordsPool(allRecords);
            hasFetchedRecordsRef.current = true;
            setIsLoadingRecords(false);
            return;
        }
        if (hasFetchedRecordsRef.current) {
            return;
        }
        let cancelled = false;
        const fetchAllLgs = async () => {
            setIsLoadingRecords(true);
            try {
                const res = await apiRequest('/end-user/lg-records/', 'GET');
                if (!cancelled) {
                    hasFetchedRecordsRef.current = true;
                    setRecordsPool(Array.isArray(res) ? res : EMPTY_ARRAY);
                }
            } catch (err) {
                console.error('Failed to load LG records for category migration:', err);
                if (!cancelled) {
                    hasFetchedRecordsRef.current = true;
                    setError(err.message || 'Failed to load LG records.');
                }
            } finally {
                if (!cancelled) {
                    setIsLoadingRecords(false);
                }
            }
        };
        fetchAllLgs();
        return () => {
            cancelled = true;
        };
    }, [isSingleMode, allRecords]);

    useEffect(() => {
        if (Array.isArray(preloadedCategories) && preloadedCategories.length > 0) {
            setCategories(preloadedCategories);
            setIsLoadingCategories(false);
            return;
        }
        const fetchCategories = async () => {
            setIsLoadingCategories(true);
            try {
                const res = await apiRequest('/end-user/lg-categories/', 'GET');
                setCategories(Array.isArray(res) ? res : []);
            } catch (err) {
                console.error('Failed to load LG categories:', err);
                setError(err.message || 'Failed to load LG categories.');
            } finally {
                setIsLoadingCategories(false);
            }
        };
        fetchCategories();
    }, [preloadedCategories]);

    const mergedRecordsById = useMemo(() => {
        const map = new Map();
        (recordsPool || []).forEach((r) => {
            if (r && r.id !== undefined) map.set(r.id, r);
        });
        (selectedRecords || []).forEach((r) => {
            if (r && r.id !== undefined && !map.has(r.id)) map.set(r.id, r);
        });
        if (lgRecord && lgRecord.id !== undefined && !map.has(lgRecord.id)) {
            map.set(lgRecord.id, lgRecord);
        }
        return map;
    }, [recordsPool, selectedRecords, lgRecord]);

    const availableRecords = useMemo(() => Array.from(mergedRecordsById.values()), [mergedRecordsById]);

    useEffect(() => {
        if (
            isSingleMode ||
            !preselectSourceRecords ||
            !preselectedSourceCategoryId ||
            hasAppliedInitialPreselect.current ||
            availableRecords.length === 0
        ) {
            return;
        }
        hasAppliedInitialPreselect.current = true;
        const matchingIds = availableRecords
            .filter((r) => String(r.lg_category?.id || r.lg_category_id || '') === String(preselectedSourceCategoryId))
            .map((r) => r.id);
        setPickedLgIds(matchingIds);
    }, [isSingleMode, preselectSourceRecords, preselectedSourceCategoryId, availableRecords]);

    const pickerFilteredRecords = useMemo(() => {
        const term = pickerSearch.trim().toLowerCase();
        return availableRecords.filter((r) => {
            if (pickerCategoryFilter) {
                const cid = r.lg_category?.id || r.lg_category_id || '';
                if (String(cid) !== String(pickerCategoryFilter)) {
                    return false;
                }
            }
            if (!term) return true;
            const fields = [
                r.lg_number,
                r.custody_serial,
                r.beneficiary_corporate?.entity_name,
                r.issuer_name,
                r.issuing_bank?.name,
                r.foreign_bank_name,
            ];
            return fields.some((val) => val && String(val).toLowerCase().includes(term));
        });
    }, [availableRecords, pickerCategoryFilter, pickerSearch]);

    const affectedRecords = useMemo(() => {
        if (isSingleMode) {
            return lgRecord ? [lgRecord] : [];
        }
        return pickedLgIds.map((id) => mergedRecordsById.get(id)).filter(Boolean);
    }, [isSingleMode, lgRecord, pickedLgIds, mergedRecordsById]);

    const sourceCategoryCounts = useMemo(() => {
        const counts = {};
        availableRecords.forEach((r) => {
            const cid = r.lg_category?.id || r.lg_category_id;
            if (cid) {
                counts[cid] = (counts[cid] || 0) + 1;
            }
        });
        return counts;
    }, [availableRecords]);

    const pickedIdSet = useMemo(() => new Set(pickedLgIds), [pickedLgIds]);
    const allShownSelected = useMemo(
        () => pickerFilteredRecords.length > 0 && pickerFilteredRecords.every((r) => pickedIdSet.has(r.id)),
        [pickerFilteredRecords, pickedIdSet]
    );
    const someShownSelected = useMemo(
        () => pickerFilteredRecords.some((r) => pickedIdSet.has(r.id)),
        [pickerFilteredRecords, pickedIdSet]
    );

    useEffect(() => {
        if (headerCheckboxRef.current) {
            headerCheckboxRef.current.indeterminate = someShownSelected && !allShownSelected;
        }
    }, [someShownSelected, allShownSelected]);

    const togglePickedLg = (id) => {
        setPickedLgIds((prev) =>
            prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
        );
    };

    const handleToggleSelectAllShown = () => {
        if (pickerFilteredRecords.length === 0) return;
        if (allShownSelected) {
            const shownSet = new Set(pickerFilteredRecords.map((r) => r.id));
            setPickedLgIds((prev) => prev.filter((id) => !shownSet.has(id)));
        } else {
            const ids = pickerFilteredRecords.map((r) => r.id);
            setPickedLgIds((prev) => Array.from(new Set([...prev, ...ids])));
        }
    };

    const handleClearPicked = () => {
        setPickedLgIds([]);
    };

    const targetCategory = useMemo(
        () => categories.find((c) => String(c.id) === String(targetCategoryId)) || null,
        [categories, targetCategoryId]
    );

    // Pre-populate singleExtraValue when target category changes in single mode
    useEffect(() => {
        if (!isSingleMode || !lgRecord || !targetCategory) return;
        const targetField = targetCategory.extra_field_name;
        if (!targetField) {
            setSingleExtraValue('');
            return;
        }
        const oldExtra = lgRecord.additional_field_values;
        if (oldExtra && typeof oldExtra === 'object' && oldExtra[targetField] !== undefined && oldExtra[targetField] !== null) {
            setSingleExtraValue(String(oldExtra[targetField]));
        } else {
            setSingleExtraValue('');
        }
    }, [isSingleMode, lgRecord, targetCategory]);

    // Reset per-LG values if target category changes
    useEffect(() => {
        setPerLgExtraValues({});
        setUniformExtraValue('');
        setError('');
    }, [targetCategoryId, isSingleMode]);

    // Check beneficiary entity compatibility when target category is restricted
    const incompatibleRecords = useMemo(() => {
        if (!targetCategory || targetCategory.customer_id === null || targetCategory.has_all_entity_access) {
            return [];
        }
        const allowedIds = new Set((targetCategory.entities_with_access || []).map((e) => Number(e.id)));
        return affectedRecords.filter((lg) => {
            const entId = lg.beneficiary_corporate_id || lg.beneficiary_corporate?.id;
            return entId && !allowedIds.has(Number(entId));
        });
    }, [targetCategory, affectedRecords]);

    const recordsWithOldExtra = useMemo(
        () => affectedRecords.filter((lg) => Boolean(getOldExtraFieldSummary(lg).value.trim())),
        [affectedRecords]
    );

    const resolveRowValue = (lg) => {
        const targetField = targetCategory?.extra_field_name;
        if (!targetField) return '';
        if (Object.prototype.hasOwnProperty.call(perLgExtraValues, lg.id) && perLgExtraValues[lg.id] !== undefined) {
            const explicit = String(perLgExtraValues[lg.id]).trim();
            if (explicit) return explicit;
        }
        if (uniformExtraValue.trim()) {
            return uniformExtraValue.trim();
        }
        const oldExtra = lg.additional_field_values;
        if (oldExtra && typeof oldExtra === 'object' && oldExtra[targetField] !== undefined && oldExtra[targetField] !== null) {
            const matchingVal = String(oldExtra[targetField]).trim();
            if (matchingVal) return matchingVal;
        }
        if (carryOverOldExtraField) {
            const oldSummary = getOldExtraFieldSummary(lg);
            if (oldSummary.value.trim()) return oldSummary.value.trim();
        }
        return '';
    };

    const unresolvedMandatoryRecords = useMemo(() => {
        if (!targetCategory || !targetCategory.extra_field_name || !targetCategory.is_mandatory) {
            return [];
        }
        if (isSingleMode) {
            return singleExtraValue.trim() ? [] : affectedRecords;
        }
        return affectedRecords.filter((lg) => !resolveRowValue(lg));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [targetCategory, isSingleMode, singleExtraValue, affectedRecords, perLgExtraValues, uniformExtraValue, carryOverOldExtraField]);

    const handleApplyUniformToAllRows = () => {
        if (!uniformExtraValue.trim()) return;
        const next = {};
        affectedRecords.forEach((lg) => {
            next[lg.id] = uniformExtraValue.trim();
        });
        setPerLgExtraValues(next);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (isGracePeriod) {
            toast.warn("This action is disabled during your subscription's grace period.");
            return;
        }
        if (!targetCategoryId || !targetCategory) {
            setError('Please select a target category.');
            return;
        }
        if (affectedRecords.length === 0) {
            setError('No LG records match the selected scope.');
            return;
        }
        if (incompatibleRecords.length > 0) {
            setError(
                `Target category '${targetCategory.name}' does not apply to the beneficiary entity of: ${incompatibleRecords
                    .slice(0, 5)
                    .map((r) => r.lg_number)
                    .join(', ')}.`
            );
            return;
        }
        if (unresolvedMandatoryRecords.length > 0) {
            setError(
                `Custom field '${targetCategory.extra_field_name}' is mandatory. Please provide a value for all ${unresolvedMandatoryRecords.length} affected LG(s).`
            );
            return;
        }

        const payload = {
            change_scope: isSingleMode ? 'single' : 'multiple',
            new_lg_category_id: parseInt(targetCategoryId, 10),
            carry_over_old_extra_field: Boolean(carryOverOldExtraField),
            reason: reason.trim() || null,
        };

        if (isSingleMode) {
            payload.lg_record_id = lgRecord.id;
            if (targetCategory.extra_field_name) {
                payload.extra_field_value = singleExtraValue.trim() || null;
                if (!singleExtraValue.trim() && !targetCategory.is_mandatory) {
                    payload.per_lg_extra_field_values = { [String(lgRecord.id)]: '' };
                }
            }
        } else {
            payload.lg_record_ids = affectedRecords.map((r) => r.id);
        }

        if (!isSingleMode && targetCategory.extra_field_name) {
            if (uniformExtraValue.trim()) {
                payload.extra_field_value = uniformExtraValue.trim();
            }
            const affectedIdSet = new Set(affectedRecords.map((r) => String(r.id)));
            const cleanedPerLg = {};
            Object.entries(perLgExtraValues).forEach(([k, v]) => {
                if (affectedIdSet.has(String(k)) && v !== undefined && v !== null && String(v).trim() !== '') {
                    cleanedPerLg[String(k)] = String(v).trim();
                }
            });
            if (Object.keys(cleanedPerLg).length > 0) {
                payload.per_lg_extra_field_values = cleanedPerLg;
            }
        }

        setIsSubmitting(true);
        try {
            const response = await apiRequest('/end-user/lg-records/change-category', 'POST', payload);
            toast.success(response.message || 'LG category updated successfully.');
            if (onSuccess) {
                onSuccess(response);
            }
        } catch (err) {
            console.error('Failed to change LG category:', err);
            const msg = err.message || 'An unexpected error occurred.';
            setError(msg);
            toast.error(msg);
        } finally {
            setIsSubmitting(false);
        }
    };

    const singleOldExtra = isSingleMode ? getOldExtraFieldSummary(lgRecord) : null;

    const canSubmit =
        !isSubmitting &&
        !isGracePeriod &&
        Boolean(targetCategory) &&
        affectedRecords.length > 0 &&
        incompatibleRecords.length === 0 &&
        unresolvedMandatoryRecords.length === 0;

    return (
        <Transition show={true} as={Fragment}>
            <Dialog as="div" className="relative z-[100]" onClose={onClose}>
                <TransitionChild
                    as={Fragment}
                    enter="ease-out duration-300"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="ease-in duration-200"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                >
                    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" />
                </TransitionChild>

                <div className="fixed inset-0 z-10 w-screen overflow-y-auto">
                    <div className="flex min-h-full items-center justify-center p-3 text-center sm:p-4">
                        <TransitionChild
                            as={Fragment}
                            enter="ease-out duration-300"
                            enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
                            enterTo="opacity-100 translate-y-0 sm:scale-100"
                            leave="ease-in duration-200"
                            leaveFrom="opacity-100"
                            leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
                        >
                            <DialogPanel className="relative transform overflow-hidden rounded-2xl bg-white border border-slate-200/80 text-left shadow-2xl transition-all my-auto w-full max-w-2xl flex flex-col max-h-[90vh]">
                                {/* Sticky Header */}
                                <div className="px-5 py-3.5 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between gap-3 shrink-0">
                                    <div className="flex items-center gap-2.5 min-w-0">
                                        <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100 shrink-0">
                                            <Tag className="h-4 w-4" />
                                        </div>
                                        <DialogTitle as="h3" className="text-base sm:text-lg font-bold leading-6 text-slate-900 tracking-tight truncate">
                                            {isSingleMode && lgRecord
                                                ? `Change Category: ${lgRecord.lg_number}`
                                                : 'Change / Migrate LG Category'}
                                        </DialogTitle>
                                    </div>
                                    <button
                                        type="button"
                                        className="rounded-lg p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-300 shrink-0"
                                        onClick={onClose}
                                    >
                                        <span className="sr-only">Close</span>
                                        <X className="h-5 w-5" aria-hidden="true" />
                                    </button>
                                </div>

                                {isLoadingCategories ? (
                                    <div className="py-12 flex flex-col items-center justify-center text-slate-500">
                                        <Loader2 className="h-7 w-7 animate-spin text-indigo-600 mb-2" />
                                        <span className="text-sm font-medium">Loading categories...</span>
                                    </div>
                                ) : (
                                    <form onSubmit={handleSubmit} className={`flex flex-col flex-1 min-h-0 ${isGracePeriod ? 'opacity-60' : ''}`}>
                                        <div className="px-5 py-4 space-y-3.5 overflow-y-auto flex-1">
                                            {error && (
                                                <div className="bg-rose-50 border border-rose-200 text-rose-700 px-3.5 py-2.5 rounded-xl flex items-start gap-2 text-xs sm:text-sm">
                                                    <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                                                    <span>{error}</span>
                                                </div>
                                            )}

                                            {/* Unified Bulk Selection UI (No Tabs) */}
                                            {!isSingleMode && (
                                                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2.5">
                                                    <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">
                                                        Select LG Records
                                                    </label>
                                                    {isLoadingRecords ? (
                                                        <div className="py-4 flex items-center justify-center gap-2 text-xs text-slate-500">
                                                            <Loader2 className="h-4 w-4 animate-spin text-indigo-600" />
                                                            <span>Loading LG records...</span>
                                                        </div>
                                                    ) : (
                                                        <>
                                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                                <div className="relative">
                                                                    <Search className="h-3.5 w-3.5 text-slate-400 pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2" />
                                                                    <input
                                                                        type="text"
                                                                        value={pickerSearch}
                                                                        onChange={(e) => setPickerSearch(e.target.value)}
                                                                        placeholder="Search LG #, beneficiary, issuer, bank..."
                                                                        className="w-full rounded-xl border border-slate-300 bg-white pl-8 pr-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                                                    />
                                                                </div>
                                                                <select
                                                                    value={pickerCategoryFilter}
                                                                    onChange={(e) => setPickerCategoryFilter(e.target.value)}
                                                                    className="w-full rounded-xl border border-slate-300 bg-white px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                                                >
                                                                    <option value="">All Current Categories ({availableRecords.length})</option>
                                                                    {categories.map((cat) => (
                                                                        <option key={`pcat-${cat.id}`} value={String(cat.id)}>
                                                                            {cat.name} ({sourceCategoryCounts[cat.id] || 0})
                                                                        </option>
                                                                    ))}
                                                                </select>
                                                            </div>

                                                            <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
                                                                <div className="bg-slate-100 border-b border-slate-200 px-3 py-2 flex items-center justify-between gap-2 text-xs">
                                                                    <label className="inline-flex items-center gap-2.5 font-semibold text-slate-700 cursor-pointer select-none">
                                                                        <input
                                                                            ref={headerCheckboxRef}
                                                                            type="checkbox"
                                                                            checked={allShownSelected}
                                                                            onChange={handleToggleSelectAllShown}
                                                                            disabled={pickerFilteredRecords.length === 0}
                                                                            className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                                                        />
                                                                        <span>Select All ({pickerFilteredRecords.length})</span>
                                                                    </label>
                                                                    <div className="flex items-center gap-2 text-slate-600">
                                                                        <span>
                                                                            <strong className="text-indigo-700">{pickedLgIds.length}</strong> selected
                                                                        </span>
                                                                        {pickedLgIds.length > 0 && (
                                                                            <button
                                                                                type="button"
                                                                                onClick={handleClearPicked}
                                                                                className="text-slate-500 hover:text-slate-800 underline font-medium"
                                                                            >
                                                                                Clear
                                                                            </button>
                                                                        )}
                                                                    </div>
                                                                </div>

                                                                <div className="max-h-48 overflow-y-auto divide-y divide-slate-100">
                                                                    {pickerFilteredRecords.length === 0 ? (
                                                                        <div className="p-3 text-center text-xs text-slate-500">
                                                                            No LG records match your search/filter.
                                                                        </div>
                                                                    ) : (
                                                                        pickerFilteredRecords.map((rec) => {
                                                                            const isChecked = pickedIdSet.has(rec.id);
                                                                            return (
                                                                                <label
                                                                                    key={`pick-${rec.id}`}
                                                                                    className={`flex items-center justify-between gap-2 px-3 py-2 text-xs cursor-pointer transition-colors ${
                                                                                        isChecked ? 'bg-indigo-50/60 hover:bg-indigo-50' : 'hover:bg-slate-50'
                                                                                    }`}
                                                                                >
                                                                                    <div className="flex items-center gap-2.5 min-w-0">
                                                                                        <input
                                                                                            type="checkbox"
                                                                                            checked={isChecked}
                                                                                            onChange={() => togglePickedLg(rec.id)}
                                                                                            className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 shrink-0"
                                                                                        />
                                                                                        <div className="min-w-0">
                                                                                            <div className="font-mono font-semibold text-slate-900 truncate">
                                                                                                {rec.lg_number}
                                                                                            </div>
                                                                                            <div className="text-[11px] text-slate-500 truncate">
                                                                                                {rec.beneficiary_corporate?.entity_name || rec.issuer_name || 'N/A'}
                                                                                            </div>
                                                                                        </div>
                                                                                    </div>
                                                                                    <div className="flex items-center gap-1.5 shrink-0">
                                                                                        <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-700 border border-slate-200 max-w-[110px] truncate">
                                                                                            {rec.lg_category?.name || 'N/A'}
                                                                                        </span>
                                                                                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-white text-slate-600 border border-slate-200">
                                                                                            {rec.lg_status?.name || 'N/A'}
                                                                                        </span>
                                                                                    </div>
                                                                                </label>
                                                                            );
                                                                        })
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </>
                                                    )}
                                                </div>
                                            )}

                                            {/* Single LG Current Summary */}
                                            {isSingleMode && lgRecord && (
                                                <div className="p-3 border border-indigo-200/80 rounded-xl bg-indigo-50/60 text-xs sm:text-sm space-y-1">
                                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                                        <span className="font-bold text-indigo-950">
                                                            Current Category: {lgRecord.lg_category?.name || 'N/A'} {lgRecord.lg_category?.code ? `(${lgRecord.lg_category.code})` : ''}
                                                        </span>
                                                        <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-white text-indigo-800 border border-indigo-200">
                                                            Status: {lgRecord.lg_status?.name || 'N/A'}
                                                        </span>
                                                    </div>
                                                    <p className="text-indigo-900/80 text-xs">
                                                        Beneficiary: <strong>{lgRecord.beneficiary_corporate?.entity_name || 'N/A'}</strong>
                                                        {singleOldExtra?.fieldName && (
                                                            <>
                                                                {' · '}
                                                                Current Field ({singleOldExtra.fieldName}):{' '}
                                                                <strong>{singleOldExtra.value || 'Empty'}</strong>
                                                            </>
                                                        )}
                                                    </p>
                                                </div>
                                            )}

                                            {/* Target Category Selection */}
                                            <div>
                                                <label htmlFor="new_lg_category_id" className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1">
                                                    New Target Category <span className="text-rose-500">*</span>
                                                </label>
                                                <select
                                                    id="new_lg_category_id"
                                                    value={targetCategoryId}
                                                    onChange={(e) => setTargetCategoryId(e.target.value)}
                                                    required
                                                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                                >
                                                    <option value="">Select target category...</option>
                                                    {categories.map((cat) => {
                                                        const extraLabel = cat.extra_field_name
                                                            ? `${cat.is_mandatory ? 'Mandatory' : 'Optional'}: ${cat.extra_field_name}`
                                                            : 'No extra field';
                                                        return (
                                                            <option key={`tgt-${cat.id}`} value={String(cat.id)}>
                                                                {cat.name} ({cat.code || '—'}) {cat.is_default ? '★ Default ' : ''}— {extraLabel}
                                                            </option>
                                                        );
                                                    })}
                                                </select>
                                            </div>

                                            {/* Incompatible Entity Warning */}
                                            {incompatibleRecords.length > 0 && (
                                                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 space-y-1">
                                                    <div className="font-bold flex items-center gap-1.5">
                                                        <AlertCircle className="h-4 w-4 shrink-0" />
                                                        Entity Scope Conflict ({incompatibleRecords.length} LG(s))
                                                    </div>
                                                    <p>
                                                        Target category <strong>{targetCategory?.name}</strong> is restricted to specific entities and cannot be assigned to:{' '}
                                                        <strong>{incompatibleRecords.slice(0, 5).map((r) => r.lg_number).join(', ')}</strong>
                                                        {incompatibleRecords.length > 5 ? ` and ${incompatibleRecords.length - 5} more` : ''}.
                                                    </p>
                                                </div>
                                            )}

                                            {/* Bidirectional Extra Field Migration Section */}
                                            {targetCategory && (
                                                <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/80 space-y-3">
                                                    <div className="flex items-center justify-between flex-wrap gap-2">
                                                        <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                                                            <ArrowRight className="h-3.5 w-3.5 text-indigo-600" />
                                                            Extra Field Migration
                                                        </span>
                                                        {targetCategory.extra_field_name ? (
                                                            <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                                                                targetCategory.is_mandatory
                                                                    ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                                                    : 'bg-blue-100 text-blue-800 border border-blue-200'
                                                            }`}>
                                                                {targetCategory.is_mandatory ? 'Mandatory' : 'Optional'}: {targetCategory.extra_field_name}
                                                            </span>
                                                        ) : (
                                                            <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-200 text-slate-700">
                                                                Target has no extra field
                                                            </span>
                                                        )}
                                                    </div>

                                                    {!targetCategory.extra_field_name ? (
                                                        recordsWithOldExtra.length > 0 ? (
                                                            <div className="p-2.5 rounded-xl bg-blue-50 border border-blue-200 text-xs text-blue-900 flex items-start gap-2">
                                                                <Info className="h-4 w-4 shrink-0 mt-0.5 text-blue-600" />
                                                                <span>
                                                                    {isSingleMode
                                                                        ? `The existing custom field value ('${singleOldExtra?.fieldName}: ${singleOldExtra?.value}') will be cleared on the active LG record and preserved in Audit History.`
                                                                        : `${recordsWithOldExtra.length} affected LG(s) currently have custom field values that will be cleared on the active records and preserved in Audit History.`}
                                                                </span>
                                                            </div>
                                                        ) : (
                                                            <p className="text-xs text-slate-600">
                                                                No custom field migration needed — neither the target category nor the affected LG(s) require custom fields.
                                                            </p>
                                                        )
                                                    ) : isSingleMode ? (
                                                        <div className="space-y-2">
                                                            <div className="flex items-center justify-between gap-2">
                                                                <label htmlFor="singleExtraValue" className="block text-xs sm:text-sm font-medium text-slate-700">
                                                                    {targetCategory.extra_field_name}{' '}
                                                                    {targetCategory.is_mandatory ? (
                                                                        <span className="text-rose-500">*</span>
                                                                    ) : (
                                                                        <span className="text-slate-400 text-xs">(Optional)</span>
                                                                    )}
                                                                </label>
                                                                {singleOldExtra?.value && singleOldExtra.fieldName !== targetCategory.extra_field_name && (
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => setSingleExtraValue(singleOldExtra.value)}
                                                                        className="text-xs font-medium text-indigo-600 hover:text-indigo-800 underline"
                                                                    >
                                                                        Use previous value (&ldquo;{singleOldExtra.value}&rdquo;)
                                                                    </button>
                                                                )}
                                                            </div>
                                                            <input
                                                                id="singleExtraValue"
                                                                type="text"
                                                                value={singleExtraValue}
                                                                onChange={(e) => setSingleExtraValue(e.target.value)}
                                                                required={targetCategory.is_mandatory}
                                                                placeholder={`Enter ${targetCategory.extra_field_name}...`}
                                                                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                                            />
                                                        </div>
                                                    ) : (
                                                        <div className="space-y-3">
                                                            <div className="flex flex-col sm:flex-row sm:items-end gap-2">
                                                                <div className="flex-1">
                                                                    <label htmlFor="uniformExtraValue" className="block text-xs font-medium text-slate-700 mb-1">
                                                                        Default / Uniform Value for <strong>{targetCategory.extra_field_name}</strong>
                                                                    </label>
                                                                    <input
                                                                        id="uniformExtraValue"
                                                                        type="text"
                                                                        value={uniformExtraValue}
                                                                        onChange={(e) => setUniformExtraValue(e.target.value)}
                                                                        placeholder={`Enter value to apply across LGs...`}
                                                                        className="w-full rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                                                    />
                                                                </div>
                                                                <button
                                                                    type="button"
                                                                    onClick={handleApplyUniformToAllRows}
                                                                    disabled={!uniformExtraValue.trim()}
                                                                    className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 disabled:opacity-50"
                                                                >
                                                                    Apply to all rows
                                                                </button>
                                                            </div>

                                                            {recordsWithOldExtra.length > 0 && (
                                                                <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={carryOverOldExtraField}
                                                                        onChange={(e) => setCarryOverOldExtraField(e.target.checked)}
                                                                        className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-slate-300 rounded"
                                                                    />
                                                                    <span>
                                                                        Carry over existing custom field value where available ({recordsWithOldExtra.length} LG(s) have prior values)
                                                                    </span>
                                                                </label>
                                                            )}

                                                            {affectedRecords.length > 0 && (
                                                                <div className="border border-slate-200 rounded-xl bg-white overflow-hidden">
                                                                    <div className="max-h-52 overflow-y-auto">
                                                                        <table className="min-w-full divide-y divide-slate-200 text-xs">
                                                                            <thead className="bg-slate-100 sticky top-0 z-10">
                                                                                <tr>
                                                                                    <th className="px-2.5 py-2 text-left font-semibold text-slate-600">LG Number</th>
                                                                                    <th className="px-2.5 py-2 text-left font-semibold text-slate-600">Current Category</th>
                                                                                    <th className="px-2.5 py-2 text-left font-semibold text-slate-600">Previous Field</th>
                                                                                    <th className="px-2.5 py-2 text-left font-semibold text-slate-600">
                                                                                        New: {targetCategory.extra_field_name}
                                                                                        {targetCategory.is_mandatory && <span className="text-rose-500"> *</span>}
                                                                                    </th>
                                                                                </tr>
                                                                            </thead>
                                                                            <tbody className="divide-y divide-slate-100">
                                                                                {affectedRecords.map((lg) => {
                                                                                    const oldSum = getOldExtraFieldSummary(lg);
                                                                                    const resolved = resolveRowValue(lg);
                                                                                    const missing = targetCategory.is_mandatory && !resolved;
                                                                                    return (
                                                                                        <tr key={`mig-row-${lg.id}`} className={missing ? 'bg-amber-50/50' : ''}>
                                                                                            <td className="px-2.5 py-1.5 font-mono font-semibold text-slate-800 whitespace-nowrap">
                                                                                                {lg.lg_number}
                                                                                            </td>
                                                                                            <td className="px-2.5 py-1.5 text-slate-600 truncate max-w-[120px]">
                                                                                                {lg.lg_category?.name || 'N/A'}
                                                                                            </td>
                                                                                            <td className="px-2.5 py-1.5 text-slate-500 truncate max-w-[130px]" title={oldSum.value ? `${oldSum.fieldName}: ${oldSum.value}` : ''}>
                                                                                                {oldSum.value ? `${oldSum.fieldName}: ${oldSum.value}` : '—'}
                                                                                            </td>
                                                                                            <td className="px-2.5 py-1.5">
                                                                <input
                                                                    type="text"
                                                                    value={perLgExtraValues[lg.id] ?? ''}
                                                                    onChange={(e) =>
                                                                        setPerLgExtraValues((prev) => ({
                                                                            ...prev,
                                                                            [lg.id]: e.target.value,
                                                                        }))
                                                                    }
                                                                    placeholder={
                                                                        resolved
                                                                            ? `Auto: ${resolved}`
                                                                            : targetCategory.is_mandatory
                                                                            ? 'Required'
                                                                            : 'Optional'
                                                                    }
                                                                    className={`w-full rounded-lg border px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 ${
                                                                        missing ? 'border-amber-400 bg-white' : 'border-slate-300'
                                                                    }`}
                                                                />
                                                                                            </td>
                                                                                        </tr>
                                                                                    );
                                                                                })}
                                                                            </tbody>
                                                                        </table>
                                                                    </div>
                                                                </div>
                                                            )}

                                                            {targetCategory.is_mandatory && (
                                                                <div className="flex items-center gap-1.5 text-xs">
                                                                    {unresolvedMandatoryRecords.length > 0 ? (
                                                                        <span className="text-amber-700 font-medium">
                                                                            {unresolvedMandatoryRecords.length} of {affectedRecords.length} LG(s) still need a value for &ldquo;{targetCategory.extra_field_name}&rdquo;.
                                                                        </span>
                                                                    ) : (
                                                                        <span className="text-emerald-700 font-medium flex items-center gap-1">
                                                                            <CheckCircle2 className="h-3.5 w-3.5" />
                                                                            All {affectedRecords.length} LG(s) have a valid value for &ldquo;{targetCategory.extra_field_name}&rdquo;.
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {/* Reason */}
                                            <div>
                                                <label htmlFor="categoryChangeReason" className="block text-xs sm:text-sm font-medium text-slate-700 mb-1">
                                                    Reason <span className="text-slate-400 text-xs">(Optional)</span>
                                                </label>
                                                <textarea
                                                    id="categoryChangeReason"
                                                    rows={2}
                                                    value={reason}
                                                    onChange={(e) => setReason(e.target.value)}
                                                    placeholder="e.g., Reclassifying from default category or consolidating categories..."
                                                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                                />
                                            </div>
                                        </div>

                                        {/* Sticky Footer */}
                                        <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex flex-col-reverse sm:flex-row sm:justify-end gap-2.5 shrink-0">
                                            <button
                                                type="button"
                                                onClick={onClose}
                                                disabled={isSubmitting}
                                                className="inline-flex justify-center items-center px-4 py-2 text-sm font-semibold rounded-xl text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 shadow-sm transition-colors"
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                type="submit"
                                                disabled={!canSubmit}
                                                className={`inline-flex justify-center items-center px-5 py-2 text-sm font-semibold rounded-xl text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm transition-colors ${
                                                    !canSubmit ? 'opacity-50 cursor-not-allowed' : ''
                                                }`}
                                            >
                                                {isSubmitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Tag className="h-4 w-4 mr-2" />}
                                                {isSubmitting
                                                    ? 'Updating...'
                                                    : isSingleMode
                                                    ? 'Update Category'
                                                    : `Migrate ${affectedRecords.length} LG(s)`}
                                            </button>
                                        </div>
                                    </form>
                                )}
                            </DialogPanel>
                        </TransitionChild>
                    </div>
                </div>
            </Dialog>
        </Transition>
    );
};

export default ChangeLGCategoryModal;
