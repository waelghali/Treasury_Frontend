import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    X, Save, Sparkles, Move, Plus, Trash2, Eye, EyeOff, ZoomIn, ZoomOut,
    ChevronLeft, ChevronRight, Check, AlertCircle, Loader2, Maximize2, RefreshCw
} from 'lucide-react';
import { apiRequest, API_BASE_URL, getAuthToken } from '../../services/apiService';
import { toast } from 'react-toastify';

const AVAILABLE_MAPPED_FIELDS = [
    { key: 'applicant_name', label: 'Applicant / Company Name' },
    { key: 'applicant_cr', label: 'Applicant CR Number' },
    { key: 'applicant_address', label: 'Applicant Address' },
    { key: 'applicant_phone', label: 'Applicant Phone' },
    { key: 'applicant_email', label: 'Applicant Email' },
    { key: 'facility_account_number', label: 'Bank Account Number' },
    { key: 'iban', label: 'IBAN Number' },
    { key: 'facility_holder_name', label: 'Facility Holder Name' },
    { key: 'facility_holder_cr', label: 'Facility Holder CR' },
    { key: 'beneficiary_name', label: 'Beneficiary Name' },
    { key: 'beneficiary_cr', label: 'Beneficiary CR / ID' },
    { key: 'beneficiary_address', label: 'Beneficiary Address' },
    { key: 'beneficiary_country', label: 'Beneficiary Country' },
    { key: 'amount', label: 'LG Amount (e.g. 500,000.00)' },
    { key: 'amount_with_currency', label: 'Amount + Currency (e.g. SAR 500,000.00)' },
    { key: 'amount_in_words', label: 'Amount in Words (Spelled out)' },
    { key: 'currency_code', label: 'Currency Code (SAR, EGP, USD)' },
    { key: 'currency_name', label: 'Currency Name (Saudi Riyal)' },
    { key: 'lg_type_name', label: 'LG Type Name' },
    { key: 'lg_type_is_bid_bond', label: 'Checkbox: Bid Bond / Tender' },
    { key: 'lg_type_is_performance', label: 'Checkbox: Performance Bond' },
    { key: 'lg_type_is_advance_payment', label: 'Checkbox: Advance Payment' },
    { key: 'lg_type_is_retention', label: 'Checkbox: Retention' },
    { key: 'lg_type_is_maintenance', label: 'Checkbox: Maintenance' },
    { key: 'lg_type_is_payment', label: 'Checkbox: Payment / Financial' },
    { key: 'issue_date', label: 'Issue Date' },
    { key: 'expiry_date', label: 'Expiry Date' },
    { key: 'tenor_days', label: 'Tenor (Days)' },
    { key: 'tenor_months', label: 'Tenor (Months)' },
    { key: 'is_third_party', label: 'Checkbox: Is Third Party' },
    { key: 'third_party_name', label: 'Third Party Name' },
    { key: 'third_party_cr', label: 'Third Party Commercial Reg. (CR)' },
    { key: 'third_party_address', label: 'Third Party Address' },
    { key: 'third_party_relationship', label: 'Third Party Relationship' },
    { key: 'reference_number', label: 'Reference / Contract Number' },
    { key: 'project_name', label: 'Project Name' },
    { key: 'applicable_rules', label: 'Applicable Rules (URDG 758)' },
    { key: 'additional_conditions', label: 'Special Wording / Conditions' },
];

const DUMMY_PREVIEW_VALUES = {
    // Basic / Applicant
    applicant_name: 'Smart Village Tech SAE',
    entity_name: 'Smart Village Tech SAE',
    applicant_cr: '1010998877',
    customer_cif_number: 'CIF-80765',
    applicant_address: 'Building B12, Smart Village, Giza',
    entity_address: 'Building B12, Smart Village, Giza',
    applicant_phone: '+20 2 3456 7890',
    customer_phone: '+20 2 3456 7890',
    applicant_email: 'treasury@smartvillage.com',
    bank_account_number: '1234567890123',
    facility_account_number: '1234567890123',
    iban: 'EG380002000100000012345678901',
    bank_branch: 'New Cairo',

    // Beneficiary
    beneficiary_name: 'ACME Construction Co. LLC',
    beneficiary_cr: 'ID-0987654321',
    beneficiary_address: '12 Nile Avenue, Giza, Egypt',
    beneficiary_country: 'Egypt',

    // Amount & Currency
    amount: '250,000.00',
    amount_with_currency: 'EGP 250,000.00',
    amount_in_words: 'Two Hundred Fifty Thousand Egyptian Pounds Only',
    currency_code: 'EGP',
    currency_name: 'Egyptian Pounds',
    reference_amount: '10%',

    // LG Types & Checkboxes
    lg_type_name: 'Performance Guarantee',
    lg_type: 'Performance Guarantee',
    guarantee_type: 'Performance Guarantee',
    lg_type_is_bid_bond: true,
    lg_type_is_performance: true,
    lg_type_is_advance_payment: true,
    lg_type_is_retention: false,
    has_facility_at_bank: true,
    operational_status: true,

    // Dates
    current_date: '26/08/2026',
    issue_date: '26/08/2026',
    requested_issue_date: '26/08/2026',
    expiry_date: '26/08/2027',
    requested_expiry_date: '26/08/2027',
    tenor_days: '365',
    tenor_months: '12',

    // Third Party
    is_third_party: true,
    third_party_name: 'Delta Subcontractors Ltd.',
    third_party_cr: '2050112233',
    third_party_address: '78 Industrial Zone, 10th of Ramadan, Egypt',
    third_party_relationship: 'SUBSIDIARY',
    third_party_id_number: 'TP-998877',

    // Other
    reference_number: 'CON-2026-SEC-098',
    project_name: 'Highway Construction Phase 2',
    lg_purpose: 'Supply and installation of HVAC systems - Phase 2',
    purpose: 'Supply and installation of HVAC systems - Phase 2',
    applicable_rules: 'URDG 758',
    additional_conditions: 'As per attached special wording / Cross-border Letter of Guarantee',
};

export default function VisualBankFormDesignerModal({
    isOpen,
    onClose,
    formTemplate,
    onSaveSuccess
}) {
    const [currentPage, setCurrentPage] = useState(0);
    const [totalPages, setTotalPages] = useState(1);
    const [pageImageUrl, setPageImageUrl] = useState(null);
    const [loadingImage, setLoadingImage] = useState(true);
    const [saving, setSaving] = useState(false);
    
    // Zoom: scale multiplier (1.0 = 100%)
    const [zoom, setZoom] = useState(1.0);
    const [previewMode, setPreviewMode] = useState(false); // false = Design/Drag, true = Live Preview
    
    // Working mapping array
    const [mapping, setMapping] = useState([]);
    const [selectedFieldIdx, setSelectedFieldIdx] = useState(null);

    // Mouse drag state
    const [draggingIdx, setDraggingIdx] = useState(null);
    const [resizingIdx, setResizingIdx] = useState(null);
    const [dragStartPos, setDragStartPos] = useState({ x: 0, y: 0 });
    const [fieldStartPos, setFieldStartPos] = useState({ x_pct: 0, y_pct: 0, width_pct: 0 });

    const canvasRef = useRef(null);
    const imageContainerRef = useRef(null);

    // Initialize mapping from template with smart 2-column fallback positioning if unpositioned
    useEffect(() => {
        if (!formTemplate) return;
        const initial = Array.isArray(formTemplate.field_mapping)
            ? formTemplate.field_mapping.map((f, i) => {
                const hasExplicitX = f.x_pct !== undefined && f.x_pct !== null && Number(f.x_pct) > 0;
                const hasExplicitY = f.y_pct !== undefined && f.y_pct !== null && Number(f.y_pct) > 0;
                
                const defaultX = 8 + (i % 2) * 46;
                const defaultY = 6 + Math.floor(i / 2) * 5.2;
                
                return {
                    id: f.id || `field_${i}_${Date.now()}`,
                    pdf_field_name: f.pdf_field_name || `field_${i + 1}`,
                    label: f.label || f.pdf_field_name || `Field ${i + 1}`,
                    mapped_to: f.mapped_to || 'applicant_name',
                    field_type: f.field_type || 'text',
                    page: f.page !== undefined && f.page !== null ? Number(f.page) : 0,
                    x_pct: hasExplicitX ? Number(f.x_pct) : parseFloat(defaultX.toFixed(2)),
                    y_pct: hasExplicitY ? Number(f.y_pct) : parseFloat(defaultY.toFixed(2)),
                    width_pct: f.width_pct !== undefined && f.width_pct !== null ? Number(f.width_pct) : 40,
                    font_size: f.font_size || 10,
                    char_spacing: f.char_spacing !== undefined && f.char_spacing !== null ? Number(f.char_spacing) : 0,
                    form_language: f.form_language || 'BILINGUAL',
                };
            })
            : [];
        setMapping(initial);
        setSelectedFieldIdx(initial.length > 0 ? 0 : null);
        setCurrentPage(0);
    }, [formTemplate]);

    // Fetch page image when form or page changes
    const fetchPageImage = useCallback(async () => {
        if (!formTemplate?.id) return;
        setLoadingImage(true);
        try {
            const token = getAuthToken();
            const url = `${API_BASE_URL}/issuance/bank-forms/${formTemplate.id}/page-image?page_num=${currentPage}&dpi=150`;
            const res = await fetch(url, {
                headers: token ? { Authorization: `Bearer ${token}` } : {}
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}: Failed to load page image`);
            
            const total = res.headers.get('X-Total-Pages');
            if (total) setTotalPages(parseInt(total, 10));

            const blob = await res.blob();
            const objectUrl = URL.createObjectURL(blob);
            setPageImageUrl(objectUrl);
        } catch (err) {
            console.error("Failed to render page image:", err);
            toast.error(err.message || 'Could not render bank form page');
        } finally {
            setLoadingImage(false);
        }
    }, [formTemplate?.id, currentPage]);

    useEffect(() => {
        if (isOpen && formTemplate?.id) {
            fetchPageImage();
        }
        return () => {
            if (pageImageUrl) URL.revokeObjectURL(pageImageUrl);
        };
    }, [isOpen, formTemplate?.id, currentPage, fetchPageImage]);

    // Handle mouse down on a field box (Start dragging)
    const handleBoxMouseDown = (e, index) => {
        e.stopPropagation();
        setSelectedFieldIdx(index);
        setDraggingIdx(index);
        setDragStartPos({ x: e.clientX, y: e.clientY });
        const f = mapping[index];
        setFieldStartPos({
            x_pct: f.x_pct || 0,
            y_pct: f.y_pct || 0,
            width_pct: f.width_pct || 25,
        });
    };

    // Handle mouse down on resize handle
    const handleResizeMouseDown = (e, index) => {
        e.stopPropagation();
        setSelectedFieldIdx(index);
        setResizingIdx(index);
        setDragStartPos({ x: e.clientX, y: e.clientY });
        const f = mapping[index];
        setFieldStartPos({
            x_pct: f.x_pct || 0,
            y_pct: f.y_pct || 0,
            width_pct: f.width_pct || 25,
        });
    };

    // Mouse move tracking over container
    const handleMouseMove = useCallback((e) => {
        if (draggingIdx === null && resizingIdx === null) return;
        if (!imageContainerRef.current) return;

        const rect = imageContainerRef.current.getBoundingClientRect();
        const containerWidth = rect.width;
        const containerHeight = rect.height;

        const deltaX = e.clientX - dragStartPos.x;
        const deltaY = e.clientY - dragStartPos.y;

        const deltaXPct = (deltaX / containerWidth) * 100;
        const deltaYPct = (deltaY / containerHeight) * 100;

        if (draggingIdx !== null) {
            setMapping(prev => {
                const updated = [...prev];
                const current = updated[draggingIdx];
                const newX = Math.max(0, Math.min(95, fieldStartPos.x_pct + deltaXPct));
                const newY = Math.max(0, Math.min(95, fieldStartPos.y_pct + deltaYPct));
                updated[draggingIdx] = {
                    ...current,
                    x_pct: parseFloat(newX.toFixed(2)),
                    y_pct: parseFloat(newY.toFixed(2)),
                };
                return updated;
            });
        } else if (resizingIdx !== null) {
            setMapping(prev => {
                const updated = [...prev];
                const current = updated[resizingIdx];
                const newWidth = Math.max(3, Math.min(80, fieldStartPos.width_pct + deltaXPct));
                updated[resizingIdx] = {
                    ...current,
                    width_pct: parseFloat(newWidth.toFixed(2)),
                };
                return updated;
            });
        }
    }, [draggingIdx, resizingIdx, dragStartPos, fieldStartPos]);

    // End dragging/resizing
    const handleMouseUp = useCallback(() => {
        setDraggingIdx(null);
        setResizingIdx(null);
    }, []);

    useEffect(() => {
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [handleMouseMove, handleMouseUp]);

    // Add new field
    const handleAddNewField = () => {
        const newId = `field_${Date.now()}`;
        const newEntry = {
            id: newId,
            pdf_field_name: `custom_field_${mapping.length + 1}`,
            label: `New Field ${mapping.length + 1}`,
            mapped_to: 'beneficiary_name',
            field_type: 'text',
            page: currentPage,
            x_pct: 20,
            y_pct: 20,
            width_pct: 25,
            font_size: 10,
            form_language: 'BILINGUAL',
        };
        setMapping(prev => [...prev, newEntry]);
        setSelectedFieldIdx(mapping.length);
        toast.info('New field added. Drag it into the correct position.');
    };

    // Delete field
    const handleDeleteField = (index) => {
        setMapping(prev => prev.filter((_, i) => i !== index));
        if (selectedFieldIdx === index) {
            setSelectedFieldIdx(null);
        } else if (selectedFieldIdx > index) {
            setSelectedFieldIdx(selectedFieldIdx - 1);
        }
    };

    // Update field properties in inspector
    const handleUpdateSelectedField = (key, value) => {
        if (selectedFieldIdx === null || !mapping[selectedFieldIdx]) return;
        setMapping(prev => {
            const updated = [...prev];
            updated[selectedFieldIdx] = {
                ...updated[selectedFieldIdx],
                [key]: value,
            };
            return updated;
        });
    };

    // Save mappings to backend
    const handleSave = async () => {
        if (!formTemplate?.id) return;
        setSaving(true);
        try {
            // Clean up mappings payload for API
            const payload = mapping.map(f => ({
                pdf_field_name: f.pdf_field_name,
                label: f.label || f.pdf_field_name,
                mapped_to: f.mapped_to,
                field_type: f.field_type || 'text',
                page: f.page || 0,
                x_pct: Number(f.x_pct) || 0,
                y_pct: Number(f.y_pct) || 0,
                width_pct: Number(f.width_pct) || 25,
                font_size: Number(f.font_size) || 10,
                char_spacing: Number(f.char_spacing) || 0,
                form_language: f.form_language || 'BILINGUAL',
            }));

            await apiRequest(`/issuance/bank-forms/${formTemplate.id}/mapping`, 'PUT', payload);
            toast.success('Visual field positions saved successfully!');
            if (typeof onSaveSuccess === 'function') {
                onSaveSuccess(payload);
            }
            onClose();
        } catch (err) {
            toast.error(err.message || 'Failed to save mapping');
        } finally {
            setSaving(false);
        }
    };

    if (!isOpen) return null;

    const selectedField = selectedFieldIdx !== null ? mapping[selectedFieldIdx] : null;
    const pageFields = mapping.filter(f => (f.page || 0) === currentPage);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-2 sm:p-4 animate-in fade-in duration-200">
            <div className="bg-slate-900 text-slate-100 rounded-2xl shadow-2xl border border-slate-800 flex flex-col w-full max-w-7xl h-[94vh] overflow-hidden">
                
                {/* TOP HEADER */}
                <div className="px-5 py-3 border-b border-slate-800 flex items-center justify-between bg-slate-950/80 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-purple-500/10 border border-purple-500/20 rounded-xl text-purple-400">
                            <Sparkles className="w-5 h-5" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h2 className="text-base font-bold text-white tracking-wide">
                                    Visual Field Designer
                                </h2>
                                <span className="text-xs bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full font-mono">
                                    {formTemplate?.name} (v{formTemplate?.version})
                                </span>
                                <span className={`text-[11px] px-2 py-0.5 rounded-full font-semibold ${
                                    formTemplate?.form_role === 'THIRD_PARTY_INDEMNITY'
                                        ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                                        : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                                }`}>
                                    {formTemplate?.form_role === 'THIRD_PARTY_INDEMNITY' ? 'Third-Party Indemnity Form' : 'Primary Issuance Form'}
                                </span>
                            </div>
                            <p className="text-xs text-slate-400 mt-0.5">
                                Click & drag fields with mouse to align with bank form lines. Toggle Live Preview to test data fit.
                            </p>
                        </div>
                    </div>

                    {/* ACTIONS & CONTROLS */}
                    <div className="flex items-center gap-2">
                        {/* Page Navigation */}
                        {totalPages > 1 && (
                            <div className="flex items-center gap-1 bg-slate-800/80 px-2 py-1 rounded-xl border border-slate-700">
                                <button
                                    onClick={() => setCurrentPage(p => Math.max(0, p - 1))}
                                    disabled={currentPage === 0}
                                    className="p-1 hover:bg-slate-700 rounded disabled:opacity-30"
                                >
                                    <ChevronLeft className="w-4 h-4" />
                                </button>
                                <span className="text-xs font-medium px-1">
                                    Page {currentPage + 1} of {totalPages}
                                </span>
                                <button
                                    onClick={() => setCurrentPage(p => Math.min(totalPages - 1, p + 1))}
                                    disabled={currentPage >= totalPages - 1}
                                    className="p-1 hover:bg-slate-700 rounded disabled:opacity-30"
                                >
                                    <ChevronRight className="w-4 h-4" />
                                </button>
                            </div>
                        )}

                        {/* Zoom Controls */}
                        <div className="flex items-center gap-1 bg-slate-800/80 px-2 py-1 rounded-xl border border-slate-700">
                            <button
                                onClick={() => setZoom(z => Math.max(0.6, z - 0.15))}
                                className="p-1 hover:bg-slate-700 rounded"
                                title="Zoom Out"
                            >
                                <ZoomOut className="w-4 h-4" />
                            </button>
                            <span className="text-xs font-mono px-1 min-w-[40px] text-center">
                                {Math.round(zoom * 100)}%
                            </span>
                            <button
                                onClick={() => setZoom(z => Math.min(1.8, z + 0.15))}
                                className="p-1 hover:bg-slate-700 rounded"
                                title="Zoom In"
                            >
                                <ZoomIn className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => setZoom(1.0)}
                                className="p-1 hover:bg-slate-700 rounded text-slate-400 hover:text-white"
                                title="Reset Zoom"
                            >
                                <Maximize2 className="w-3.5 h-3.5" />
                            </button>
                        </div>

                        {/* Preview Toggle */}
                        <button
                            onClick={() => setPreviewMode(!previewMode)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors ${
                                previewMode
                                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30'
                                    : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                            }`}
                        >
                            {previewMode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            {previewMode ? 'Exit Preview' : 'Live Data Preview'}
                        </button>

                        {/* Add Field */}
                        <button
                            onClick={handleAddNewField}
                            className="flex items-center gap-1 px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold transition-all shadow-md"
                        >
                            <Plus className="w-4 h-4" /> Add Field
                        </button>

                        {/* Save Button */}
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="flex items-center gap-1.5 px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-md disabled:opacity-50"
                        >
                            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                            Save Positions
                        </button>

                        {/* Close */}
                        <button
                            onClick={onClose}
                            className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* WORKSPACE BODY */}
                <div className="flex-1 flex overflow-hidden">
                    
                    {/* CANVAS AREA */}
                    <div
                        ref={canvasRef}
                        className="flex-1 overflow-auto p-6 flex justify-center items-start bg-slate-950/60 select-none"
                    >
                        <div
                            ref={imageContainerRef}
                            style={{
                                width: '850px',
                                minHeight: '1150px',
                                transform: `scale(${zoom})`,
                                transformOrigin: 'top center',
                                transition: 'transform 0.1s ease-out',
                            }}
                            className="relative shadow-2xl rounded-lg border border-slate-700 bg-white"
                        >
                            {/* Loading State Overlay */}
                            {loadingImage && (
                                <div className="absolute inset-0 z-40 bg-white/80 backdrop-blur-[2px] flex flex-col items-center justify-center gap-3 text-slate-600">
                                    <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
                                    <p className="text-sm font-semibold">Rendering bank form scan...</p>
                                </div>
                            )}

                            {/* Bank Form Page Render */}
                            {pageImageUrl && (
                                <img
                                    src={pageImageUrl}
                                    alt={`Bank Form Page ${currentPage + 1}`}
                                    className="w-full h-auto block pointer-events-none select-none rounded-lg"
                                    style={{ width: '850px', display: 'block' }}
                                />
                            )}

                                {/* Interactive Overlay Boxes */}
                                {pageFields.map((field) => {
                                    const actualIndex = mapping.findIndex(m => m.id === field.id);
                                    const isSelected = selectedFieldIdx === actualIndex;
                                    const isDragging = draggingIdx === actualIndex;
                                    
                                    // Sample preview text
                                    const previewText = DUMMY_PREVIEW_VALUES[field.mapped_to] || `[${field.label}]`;

                                    if (previewMode) {
                                        // Interactive Live Fill Print Preview mode
                                        return (
                                            <div
                                                key={field.id}
                                                onMouseDown={(e) => handleBoxMouseDown(e, actualIndex)}
                                                style={{
                                                    position: 'absolute',
                                                    left: `${field.x_pct}%`,
                                                    top: `${field.y_pct}%`,
                                                    width: `${field.width_pct || 25}%`,
                                                    fontSize: `${(field.font_size || 10) * 1.39}px`,
                                                    lineHeight: '1.0',
                                                    color: '#0f172a',
                                                    fontFamily: 'Helvetica, Arial, sans-serif',
                                                    fontWeight: '600',
                                                    letterSpacing: field.char_spacing ? `${field.char_spacing * 1.39}px` : 'normal',
                                                    whiteSpace: 'nowrap',
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis',
                                                    cursor: isDragging ? 'grabbing' : 'grab',
                                                    zIndex: isSelected ? 30 : 10,
                                                    padding: 0,
                                                    margin: 0,
                                                }}
                                                className={`group rounded px-0.5 transition-all ${
                                                    isSelected
                                                        ? 'ring-2 ring-purple-500 bg-purple-500/10'
                                                        : 'hover:ring-1 hover:ring-blue-400 hover:bg-blue-50/20'
                                                }`}
                                            >
                                                {field.field_type === 'checkbox' ? (
                                                    <span className="font-bold text-slate-900 text-xs">X</span>
                                                ) : (
                                                    previewText
                                                )}

                                                {/* Resize / Stretch Handle in Live Preview */}
                                                <div
                                                    onMouseDown={(e) => handleResizeMouseDown(e, actualIndex)}
                                                    className={`absolute -right-1.5 top-1/2 -translate-y-1/2 w-3 h-5 bg-purple-600 hover:bg-purple-400 rounded-sm cursor-ew-resize border border-white shadow-sm flex items-center justify-center ${
                                                        isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                                                    } transition-opacity`}
                                                    title="Drag right edge to stretch width"
                                                >
                                                    <div className="w-0.5 h-2.5 bg-white/90 rounded" />
                                                </div>
                                            </div>
                                        );
                                    }

                                    // Design & Drag Mode
                                    return (
                                        <div
                                            key={field.id}
                                            onMouseDown={(e) => handleBoxMouseDown(e, actualIndex)}
                                            style={{
                                                position: 'absolute',
                                                left: `${field.x_pct}%`,
                                                top: `${field.y_pct}%`,
                                                width: `${field.width_pct || 25}%`,
                                                cursor: isDragging ? 'grabbing' : 'grab',
                                                zIndex: isSelected ? 30 : 10,
                                            }}
                                            className={`group border-2 rounded p-1 transition-shadow ${
                                                isSelected
                                                    ? 'border-purple-500 bg-purple-500/20 ring-2 ring-purple-400/50 shadow-lg'
                                                    : 'border-blue-500/70 bg-blue-500/10 hover:border-blue-400 hover:bg-blue-500/20'
                                            }`}
                                        >
                                            <div className="flex items-center justify-between gap-1 overflow-hidden pointer-events-none">
                                                <span className="text-[10px] font-bold text-slate-900 bg-white/90 px-1 py-0.5 rounded shadow-sm truncate">
                                                    {field.label || field.pdf_field_name}
                                                </span>
                                                <span className="text-[9px] font-mono text-purple-900 bg-purple-100/90 px-1 rounded truncate">
                                                    {field.mapped_to}
                                                </span>
                                            </div>

                                            {/* Resize / Stretch Handle in Design Mode */}
                                            <div
                                                onMouseDown={(e) => handleResizeMouseDown(e, actualIndex)}
                                                className="absolute -right-1.5 top-1/2 -translate-y-1/2 w-3 h-6 bg-purple-600 hover:bg-purple-400 rounded-sm cursor-ew-resize border border-white shadow-sm flex items-center justify-center"
                                                title="Drag right edge to stretch width"
                                            >
                                                <div className="w-0.5 h-3 bg-white/80 rounded" />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                    {/* RIGHT PROPERTY INSPECTOR */}
                    <div className="w-80 bg-slate-950 border-l border-slate-800 flex flex-col shrink-0">
                        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
                            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                                <Move className="w-4 h-4 text-purple-400" />
                                Field Inspector
                            </h3>
                            {selectedField && (
                                <button
                                    onClick={() => handleDeleteField(selectedFieldIdx)}
                                    className="text-red-400 hover:text-red-300 text-xs flex items-center gap-1 p-1 rounded hover:bg-red-500/10"
                                    title="Delete Field"
                                >
                                    <Trash2 className="w-3.5 h-3.5" /> Delete
                                </button>
                            )}
                        </div>

                        {selectedField ? (
                            <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
                                <div>
                                    <label className="block text-slate-400 mb-1 font-semibold">Field Label</label>
                                    <input
                                        type="text"
                                        value={selectedField.label || ''}
                                        onChange={e => handleUpdateSelectedField('label', e.target.value)}
                                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-xs focus:ring-1 focus:ring-purple-500 outline-none"
                                        placeholder="e.g. Beneficiary Name"
                                    />
                                </div>

                                <div>
                                    <label className="block text-slate-400 mb-1 font-semibold">System Mapping Key</label>
                                    <select
                                        value={selectedField.mapped_to || ''}
                                        onChange={e => handleUpdateSelectedField('mapped_to', e.target.value)}
                                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-xs focus:ring-1 focus:ring-purple-500 outline-none"
                                    >
                                        {AVAILABLE_MAPPED_FIELDS.map(f => (
                                            <option key={f.key} value={f.key}>
                                                {f.label} ({f.key})
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <label className="block text-slate-400 mb-1 font-semibold">Field Type</label>
                                        <select
                                            value={selectedField.field_type || 'text'}
                                            onChange={e => handleUpdateSelectedField('field_type', e.target.value)}
                                            className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-white text-xs outline-none"
                                        >
                                            <option value="text">Text</option>
                                            <option value="number">Number</option>
                                            <option value="date">Date</option>
                                            <option value="checkbox">Checkbox</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-slate-400 mb-1 font-semibold">Font Size</label>
                                        <select
                                            value={selectedField.font_size || 10}
                                            onChange={e => handleUpdateSelectedField('font_size', Number(e.target.value))}
                                            className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-white text-xs outline-none"
                                        >
                                            <option value={8}>8 pt (Small)</option>
                                            <option value={9}>9 pt</option>
                                            <option value={10}>10 pt (Standard)</option>
                                            <option value={11}>11 pt</option>
                                            <option value={12}>12 pt (Large)</option>
                                            <option value={14}>14 pt (Title)</option>
                                        </select>
                                    </div>
                                </div>

                                {/* Precision Coordinates Controls */}
                                <div className="border border-slate-800 bg-slate-900/60 p-3 rounded-xl space-y-3">
                                    <span className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider">
                                        Coordinates (% of Page)
                                    </span>
                                    
                                    <div className="grid grid-cols-3 gap-2 text-center">
                                        <div>
                                            <span className="text-[10px] text-slate-400 block mb-1">X Pos (Left)</span>
                                            <input
                                                type="number" step="0.1" min="0" max="100"
                                                value={selectedField.x_pct || 0}
                                                onChange={e => handleUpdateSelectedField('x_pct', parseFloat(e.target.value) || 0)}
                                                className="w-full px-1.5 py-1 bg-slate-800 border border-slate-700 rounded text-center text-white text-xs"
                                            />
                                        </div>
                                        <div>
                                            <span className="text-[10px] text-slate-400 block mb-1">Y Pos (Top)</span>
                                            <input
                                                type="number" step="0.1" min="0" max="100"
                                                value={selectedField.y_pct || 0}
                                                onChange={e => handleUpdateSelectedField('y_pct', parseFloat(e.target.value) || 0)}
                                                className="w-full px-1.5 py-1 bg-slate-800 border border-slate-700 rounded text-center text-white text-xs"
                                            />
                                        </div>
                                        <div>
                                            <span className="text-[10px] text-slate-400 block mb-1">Width</span>
                                            <input
                                                type="number" step="0.5" min="2" max="100"
                                                value={selectedField.width_pct || 25}
                                                onChange={e => handleUpdateSelectedField('width_pct', parseFloat(e.target.value) || 25)}
                                                className="w-full px-1.5 py-1 bg-slate-800 border border-slate-700 rounded text-center text-white text-xs"
                                            />
                                        </div>
                                    </div>

                                    {/* Nudge Steppers */}
                                    <div className="flex items-center justify-between pt-1">
                                        <span className="text-[10px] text-slate-400">Nudge:</span>
                                        <div className="flex items-center gap-1">
                                            <button
                                                onClick={() => handleUpdateSelectedField('x_pct', parseFloat(Math.max(0, (selectedField.x_pct || 0) - 0.2).toFixed(2)))}
                                                className="w-6 h-6 bg-slate-800 hover:bg-slate-700 text-white rounded text-xs font-bold"
                                                title="Move Left 0.2%"
                                            >←</button>
                                            <button
                                                onClick={() => handleUpdateSelectedField('x_pct', parseFloat(Math.min(100, (selectedField.x_pct || 0) + 0.2).toFixed(2)))}
                                                className="w-6 h-6 bg-slate-800 hover:bg-slate-700 text-white rounded text-xs font-bold"
                                                title="Move Right 0.2%"
                                            >→</button>
                                            <button
                                                onClick={() => handleUpdateSelectedField('y_pct', parseFloat(Math.max(0, (selectedField.y_pct || 0) - 0.2).toFixed(2)))}
                                                className="w-6 h-6 bg-slate-800 hover:bg-slate-700 text-white rounded text-xs font-bold"
                                                title="Move Up 0.2%"
                                            >↑</button>
                                            <button
                                                onClick={() => handleUpdateSelectedField('y_pct', parseFloat(Math.min(100, (selectedField.y_pct || 0) + 0.2).toFixed(2)))}
                                                className="w-6 h-6 bg-slate-800 hover:bg-slate-700 text-white rounded text-xs font-bold"
                                                title="Move Down 0.2%"
                                            >↓</button>
                                        </div>
                                    </div>

                                    {/* Stretch Width Slider & Presets */}
                                    <div className="pt-2 border-t border-slate-800">
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="text-[10px] text-slate-400 font-semibold">Stretch Width:</span>
                                            <span className="text-[10px] font-mono text-purple-400">{selectedField.width_pct || 25}%</span>
                                        </div>
                                        <input
                                            type="range" min="3" max="95" step="0.5"
                                            value={selectedField.width_pct || 25}
                                            onChange={e => handleUpdateSelectedField('width_pct', parseFloat(e.target.value))}
                                            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-purple-500"
                                        />
                                        <div className="flex items-center gap-1 mt-1.5">
                                            {[15, 30, 45, 65, 85].map(w => (
                                                <button
                                                    key={w}
                                                    type="button"
                                                    onClick={() => handleUpdateSelectedField('width_pct', w)}
                                                    className={`flex-1 py-0.5 text-[9px] font-mono rounded border transition-colors ${
                                                        Math.round(selectedField.width_pct || 25) === w
                                                            ? 'bg-purple-600/30 text-purple-300 border-purple-500 font-bold'
                                                            : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
                                                    }`}
                                                >
                                                    {w}%
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {/* Letter / Digit Spacing (Tracking) */}
                                <div className="border border-slate-800 bg-slate-900/60 p-3 rounded-xl space-y-2">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">
                                            Character / Digit Spacing
                                        </span>
                                        <span className="text-[10px] font-mono text-purple-400">
                                            {selectedField.char_spacing ? `+${selectedField.char_spacing}pt` : 'Standard (0)'}
                                        </span>
                                    </div>
                                    <p className="text-[10px] text-slate-400 leading-tight">
                                        Stretch characters across wide lines or fit digits into individual box grids (Account #, Dates, CIF).
                                    </p>
                                    <input
                                        type="range" min="0" max="16" step="0.5"
                                        value={selectedField.char_spacing || 0}
                                        onChange={e => handleUpdateSelectedField('char_spacing', parseFloat(e.target.value) || 0)}
                                        className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-purple-500"
                                    />
                                    <div className="flex items-center gap-1 mt-1">
                                        {[
                                            { label: 'Normal', val: 0 },
                                            { label: '+2pt', val: 2 },
                                            { label: '+4pt', val: 4 },
                                            { label: 'Boxed (+8)', val: 8 },
                                            { label: 'Wide (+12)', val: 12 }
                                        ].map(p => (
                                            <button
                                                key={p.val}
                                                type="button"
                                                onClick={() => handleUpdateSelectedField('char_spacing', p.val)}
                                                className={`flex-1 py-1 text-[9px] font-mono rounded border transition-colors ${
                                                    (selectedField.char_spacing || 0) === p.val
                                                        ? 'bg-purple-600/30 text-purple-300 border-purple-500 font-bold'
                                                        : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
                                                }`}
                                            >
                                                {p.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Preview Sample Box */}
                                <div className="border border-slate-800 bg-slate-900/40 p-3 rounded-xl">
                                    <span className="block text-[10px] text-slate-400 mb-1 font-semibold uppercase">
                                        Live Sample Value
                                    </span>
                                    <p className="text-xs font-medium text-emerald-400 font-mono break-all">
                                        {DUMMY_PREVIEW_VALUES[selectedField.mapped_to] || '[No sample data]'}
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-slate-500">
                                <Move className="w-8 h-8 mb-2 opacity-30" />
                                <p className="text-xs">Click any field box on the canvas to inspect and fine-tune its properties.</p>
                            </div>
                        )}

                        {/* All Fields Quick List */}
                        <div className="p-3 border-t border-slate-800 bg-slate-900/40">
                            <span className="text-[10px] text-slate-400 uppercase font-bold block mb-1.5">
                                All Page Fields ({pageFields.length})
                            </span>
                            <div className="max-h-32 overflow-y-auto space-y-1">
                                {pageFields.map((f) => {
                                    const aIdx = mapping.findIndex(m => m.id === f.id);
                                    const isSel = selectedFieldIdx === aIdx;
                                    return (
                                        <button
                                            key={f.id}
                                            onClick={() => setSelectedFieldIdx(aIdx)}
                                            className={`w-full text-left px-2 py-1 rounded text-[11px] truncate flex items-center justify-between ${
                                                isSel ? 'bg-purple-600 text-white font-bold' : 'text-slate-400 hover:bg-slate-800'
                                            }`}
                                        >
                                            <span className="truncate">{f.label || f.pdf_field_name}</span>
                                            <span className="text-[9px] opacity-75 font-mono">({Math.round(f.x_pct)}%, {Math.round(f.y_pct)}%)</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}
