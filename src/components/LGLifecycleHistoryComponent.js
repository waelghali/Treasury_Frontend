// frontend/src/components/LGLifecycleHistoryComponent.js
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { apiRequest, getAuthToken } from '../services/apiService';
import { format, differenceInDays, startOfDay, endOfDay } from 'date-fns';
import { 
    Loader, AlertCircle, Truck, Building, RotateCcw, FileText, ChevronDown, 
    Mail, Eye, Filter, Calendar, CheckSquare, Square, Check, Activity, ShieldCheck, Bell,
    CheckCircle2, AlertTriangle, ArrowLeftRight
} from 'lucide-react';
import CancelInstructionModal from 'components/Modals/CancelInstructionModal';
import DocumentInspectorModal from './Modals/DocumentInspectorModal';
import FormattedDateInput from 'components/FormattedDateInput';
import { toast } from 'react-toastify';
import { getEventIcon, formatActionTypeLabel } from '../utils/timelineHelpers';

// --- CONFIGURATION: Categories for Filtering (Updated for accuracy) ---

const ACTION_CATEGORIES = {
    'Core Milestones': [
        'LG_CREATED', 'LG_EXTENDED', 'LG_LIQUIDATED_FULL', 'LG_LIQUIDATED_PARTIAL', 
        'LG_RELEASED', 'LG_DECREASED_AMOUNT', 'LG_AMENDED', 'MIGRATION_IMPORT_RECORD', 
        'LG_ACTIVATED', 'LG_ACTIVATE_NON_OPERATIVE', 'AUDIT_ACTION_TYPE_LG_AMENDED',
        'LG_EXPIRY_ALIGNED_TO_BANK_CONVENTION', 'LG_INSTRUCTION_CANCELED'
    ],
    'Logistics': [
        'LG_INSTRUCTION_DELIVERED', 'LG_RECORD_DELIVERY', 'LG_BANK_REPLY_RECORDED', 
        'LG_RECORD_BANK_REPLY', 'INSTRUCTION_ACCESSED_FOR_PRINT',
        'LG_BANK_REPLY_REDIRECTED_BY_AI'
    ],
    'Approvals': [
        'APPROVAL_REQUEST_SUBMITTED', 'APPROVAL_REQUEST_APPROVED', 'APPROVAL_REQUEST_REJECTED', 
        'APPROVAL_REQUEST_WITHDRAWN', 'APPROVAL_REQUEST_AUTO_REJECTED', 
        'APPROVAL_INVALIDATED_BY_OTHER_APPROVAL', 'LG_BANK_REPLY_TERMS_REJECTED'
    ],
    'System Logs': [
        'NOTIFICATION_SENT', 'NOTIFICATION_FAILED', 'LG_REMINDER_SENT_TO_BANK', 
        'LG_BULK_REMINDER_INITIATED', 'LG_RENEWAL_REMINDER_FIRST_SENT', 
        'LG_RENEWAL_REMINDER_SECOND_SENT', 'LG_OWNER_RENEWAL_REMINDER_SENT', 
        'LG_OWNER_RENEWAL_REMINDER_SKIPPED_RECENTLY_SENT', 'LG_OWNER_DETAILS_UPDATED', 
        'LG_SINGLE_OWNER_CHANGED', 'LG_BULK_OWNER_CHANGED', 'LG_TOGGLE_AUTO_RENEWAL',
        'LG_SINGLE_CATEGORY_CHANGED', 'LG_BULK_CATEGORY_CHANGED',
        'CREATE', 'UPDATE', 'SOFT_DELETE', 'RESTORE', 'DOCUMENT_VIEWED_SECURELY' 
    ]
};

const INITIAL_SELECTED_TYPES = new Set([
    ...ACTION_CATEGORIES['Core Milestones'],
    ...ACTION_CATEGORIES['Logistics'],
    ...ACTION_CATEGORIES['Approvals'],
]);

const ALL_MAPPED_TYPES = new Set(Object.values(ACTION_CATEGORIES).flat());

// Helper: Visual Styles for differentiation (Fixing point 4)
const getCardStyle = (actionType) => {
    // System Logs -> Subtle Slate background
    if (ACTION_CATEGORIES['System Logs'].includes(actionType)) {
        return {
            cardClass: 'bg-slate-50/80 border-slate-200/80',
            iconClass: 'text-slate-500',
            isSystem: true
        };
    }
    if (ACTION_CATEGORIES['Core Milestones'].includes(actionType)) {
        return {
            cardClass: 'bg-white border-slate-200/90 shadow-sm',
            iconClass: 'text-slate-700',
            isSystem: true
        };
    }    // Default/Core Events -> Crisp White card
    return {
        cardClass: 'bg-white shadow-sm border-slate-200/90',
        iconClass: 'text-indigo-600',
        isSystem: false
    };
};

// A reusable component to provide a tooltip for disabled elements during the grace period.
const GracePeriodTooltip = ({ children, isGracePeriod }) => {
    if (isGracePeriod) {
        return (
            <div className="relative group inline-block">
                {children}
                <div className="opacity-0 w-max bg-slate-900 text-white text-xs rounded-xl py-2 px-3 absolute z-10 bottom-full left-1/2 -translate-x-1/2 pointer-events-none group-hover:opacity-100 transition-opacity duration-200 shadow-lg">
                    This action is disabled during your subscription's grace period.
                    <svg className="absolute text-slate-900 h-2 w-full left-0 top-full" x="0px" y="0px" viewBox="0 0 255 255">
                        <polygon className="fill-current" points="0,0 127.5,127.5 255,0"/>
                    </svg>
                </div>
            </div>
        );
    }
    return children;
};

// --- Quick Filter Button Component ---
const QuickFilterButton = ({ label, icon: Icon, isActive, onClick }) => (
    <button
        onClick={onClick}
        className={`flex items-center text-xs sm:text-sm font-medium px-3.5 py-1.5 rounded-full border transition-all duration-200 ${
            isActive 
            ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm' 
            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:border-slate-300'
        }`}
    >
        {Icon && <Icon className={`h-3.5 w-3.5 mr-1.5 ${isActive ? 'text-white' : 'text-slate-500'}`} />}
        {label}
    </button>
);


const LGLifecycleHistoryComponent = ({
    lgRecordId,
    lgRecord = null,
    lgInstructions = [],
    lgDocuments = [],
    onRecordDelivery,
    onRecordBankReply,
    onSendReminder,
    onViewInstructionLetter,
    onViewInstructionDocument,
    onRefreshLgRecord = null,
    isCorporateAdminView = false,
    isGracePeriod
}) => {
    const [events, setEvents] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    // --- Split-Screen Document Inspector State ---
    const [inspectorState, setInspectorState] = useState({
        isOpen: false,
        documentId: null,
        fileName: null,
        instruction: null,
        docType: 'delivery',
    });
    
    // --- FILTER STATE ---
    const [dateRange, setDateRange] = useState({ from: '', to: '' });
    const [selectedFilters, setSelectedFilters] = useState(new Set()); 
    const [availableTypes, setAvailableTypes] = useState(new Set());
    const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false);
    const filterRef = useRef(null);

    const [reminderThresholds, setReminderThresholds] = useState({
        daysSinceDelivery: 7,
        daysSinceIssuance: 3,
        maxDaysSinceIssuance: 90,
    });
    const [showCancelModal, setShowCancelModal] = useState(false);
    const [selectedInstructionToCancel, setSelectedInstructionToCancel] = useState(null);
    const [uploadingEventId, setUploadingEventId] = useState(null);
    const eventDocInputRef = useRef(null);
    const [pendingDocEvent, setPendingDocEvent] = useState(null);

    const handleTriggerEventDocUpload = (eventItem) => {
        if (isGracePeriod) {
            toast.warn("This action is disabled during your subscription's grace period.");
            return;
        }
        setPendingDocEvent(eventItem);
        if (eventDocInputRef.current) {
            eventDocInputRef.current.value = '';
            eventDocInputRef.current.click();
        }
    };

    const handleEventDocFileSelected = async (e) => {
        const files = Array.from(e.target.files || []);
        if (!files.length || !pendingDocEvent) return;
        const targetEvent = pendingDocEvent;
        setPendingDocEvent(null);
        setUploadingEventId(targetEvent.id);
        try {
            const formData = new FormData();
            files.forEach(file => formData.append('files', file));
            const defaultDocType =
                targetEvent.action_type === 'MIGRATION_IMPORT_RECORD'
                    ? 'ORIGINAL_LG_DOCUMENT'
                    : 'AMENDMENT_LETTER';
            formData.append('document_type', defaultDocType);
            if (targetEvent.id) {
                formData.append('audit_log_id', String(targetEvent.id));
            }
            await apiRequest(
                `/end-user/lg-records/${lgRecordId}/documents`,
                'POST',
                formData,
                'multipart/form-data'
            );
            toast.success(`Attached ${files.length} document(s) successfully.`);
            await fetchLifecycleHistoryAndConfig(true);
            if (onRefreshLgRecord) {
                await onRefreshLgRecord();
            }
        } catch (err) {
            toast.error(`Failed to attach document: ${err.message || 'Unexpected error'}`);
        } finally {
            setUploadingEventId(null);
        }
    };

    // Close filter menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (filterRef.current && !filterRef.current.contains(event.target)) {
                setIsFilterMenuOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);


    const instructionsMap = useMemo(() => {
        return new Map(lgInstructions.map(inst => [Number(inst.id), inst]));
    }, [lgInstructions]);

    const instructionsBySerialMap = useMemo(() => {
        return new Map(lgInstructions.filter(inst => inst.serial_number).map(inst => [inst.serial_number, inst]));
    }, [lgInstructions]);

    const findLatestCancellableInstruction = useCallback(() => {
        const cancellableTypes = [
            'LG_EXTENSION', 'LG_LIQUIDATION', 'LG_RELEASE', 
            'LG_DECREASE_AMOUNT', 'LG_ACTIVATE_NON_OPERATIVE',
        ];
        
        const sortedInstructions = [...lgInstructions].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        
        const latestCancellable = sortedInstructions.find(inst => cancellableTypes.includes(inst.instruction_type));
        
        return latestCancellable || null;
    }, [lgInstructions]);

    const latestCancellableInstruction = findLatestCancellableInstruction();

    const fetchLifecycleHistoryAndConfig = useCallback(async (isBackgroundRefresh = false) => {
        if (!isBackgroundRefresh) {
            setIsLoading(true);
        }
        setError(null);
        try {
            const allEventsResponse = await apiRequest(`/end-user/lg-records/${lgRecordId}/lifecycle-history`, 'GET');
            const filteredEvents = allEventsResponse.filter(event => event.action_type !== 'DOCUMENT_UPLOADED');
            const sortedEvents = filteredEvents.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
            
            // Filter State Initialization
            const uniqueTypes = new Set(sortedEvents.map(e => e.action_type));
            setAvailableTypes(uniqueTypes);

            if (!isBackgroundRefresh) {
                // Default: Select only Core, Logistics, and Approvals
                const initialSelection = new Set();
                uniqueTypes.forEach(type => {
                    if (INITIAL_SELECTED_TYPES.has(type)) {
                        initialSelection.add(type);
                    }
                });
                setSelectedFilters(initialSelection);
            } else {
                // Add any newly appeared Core/Logistics/Approvals event types to active filters
                setSelectedFilters(prev => {
                    const next = new Set(prev);
                    uniqueTypes.forEach(type => {
                        if (INITIAL_SELECTED_TYPES.has(type) && !availableTypes.has(type)) {
                            next.add(type);
                        }
                    });
                    return next;
                });
            }
            
            setEvents(sortedEvents);

            if (!isCorporateAdminView) {
                const configKeys = [
                    "REMINDER_TO_BANKS_DAYS_SINCE_DELIVERY",
                    "REMINDER_TO_BANKS_DAYS_SINCE_ISSUANCE",
                    "REMINDER_TO_BANKS_MAX_DAYS_SINCE_ISSUANCE"
                ];
                const fetchedThresholdsPromises = configKeys.map(key =>
                    apiRequest(`/end-user/customer-configurations/${key}`, 'GET').catch(e => null)
                );
                const configResponses = await Promise.all(fetchedThresholdsPromises);
                const fetchedThresholds = {};
                configResponses.forEach((res, index) => {
                    if (res && res.effective_value !== undefined) {
                        fetchedThresholds[configKeys[index]] = parseInt(res.effective_value, 10);
                    }
                });
                setReminderThresholds(prev => ({
                    ...prev,
                    daysSinceDelivery: fetchedThresholds["REMINDER_TO_BANKS_DAYS_SINCE_DELIVERY"] ?? prev.daysSinceDelivery,
                    daysSinceIssuance: fetchedThresholds["REMINDER_TO_BANKS_DAYS_SINCE_ISSUANCE"] ?? prev.daysSinceIssuance,
                    maxDaysSinceIssuance: fetchedThresholds["REMINDER_TO_BANKS_MAX_DAYS_SINCE_ISSUANCE"] ?? prev.maxDaysSinceIssuance,
                }));
            }
        } catch (err) {
            console.error("Failed to fetch LG lifecycle history or configurations:", err);
            setError("Failed to load lifecycle history. Please try again.");
        } finally {
            setIsLoading(false);
        }
    }, [lgRecordId, isCorporateAdminView]);

    useEffect(() => {
        if (lgRecordId) {
            fetchLifecycleHistoryAndConfig(false);
        }
    }, [lgRecordId, fetchLifecycleHistoryAndConfig]);

    // Refresh lifecycle events in background when instructions or documents update (e.g. after recording delivery/reply)
    const instructionsSignature = useMemo(
        () => lgInstructions.map(i => `${i.id}:${i.status}:${i.delivery_date || ''}:${i.bank_reply_date || ''}`).join('|'),
        [lgInstructions]
    );
    useEffect(() => {
        if (lgRecordId && !isLoading) {
            fetchLifecycleHistoryAndConfig(true);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [instructionsSignature, lgDocuments.length]);

    const getInstructionForEvent = useCallback((eventItem) => {
        if (eventItem.entity_type === "LGInstruction" && eventItem.entity_id) {
            const byEntity = instructionsMap.get(Number(eventItem.entity_id));
            if (byEntity) return byEntity;
        }
        if (eventItem.details) {
            const instructionIdFromDetails =
                eventItem.details.generated_instruction_id ||
                eventItem.details.instruction_id ||
                eventItem.details.new_instruction_id ||
                eventItem.details.target_instruction_id;
            if (instructionIdFromDetails) {
                const byId = instructionsMap.get(Number(instructionIdFromDetails));
                if (byId) return byId;
            }
            const serialFromDetails =
                eventItem.details.instruction_serial ||
                eventItem.details.serial_number ||
                eventItem.details.instruction_serial_number;
            if (serialFromDetails) {
                const bySerial = instructionsBySerialMap.get(serialFromDetails);
                if (bySerial) return bySerial;
            }
        }
        return null;
    }, [instructionsMap, instructionsBySerialMap]);

    const hasReminderBeenSent = useCallback((originalInstructionId) => {
        if (originalInstructionId === null || originalInstructionId === undefined) return false;
        const sentInAuditLog = events.some(eventItem =>
            eventItem.action_type === 'LG_REMINDER_SENT_TO_BANK' &&
            eventItem.details &&
            String(eventItem.details.original_instruction_id) === String(originalInstructionId)
        );
        const instructionObject = instructionsMap.get(originalInstructionId);
        const sentInObjectFlag = instructionObject ? instructionObject.has_reminder_sent : false;
        return sentInAuditLog || sentInObjectFlag;
    }, [events, instructionsMap]);


    // --- Smart Formatting to Remove "N/A" Clutter (Preserved) ---
    const formatEventDetails = (actionType, details, userEmail) => {
        let detailString = '';

        const formatAmount = (amount, currencyCode) => {
            if (amount == null || currencyCode == null || currencyCode === undefined || isNaN(parseFloat(amount))) return null;
            try { return `${currencyCode} ${parseFloat(amount).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`; } catch { return null; }
        };
        const formatDate = (dateString) => {
            if (!dateString) return null;
            try { return format(new Date(dateString), 'dd-MMM-yyyy'); } catch { return null; }
        };
        const addPart = (label, value) => {
            if (value !== null && value !== undefined && value !== 'N/A' && value !== '') {
                if (detailString) detailString += ', ';
                detailString += `${label ? `${label}: ${value}` : value}`;
            }
        };

        switch (actionType) {
            case 'MIGRATION_IMPORT_RECORD':
                addPart(null, `Record imported`);
                addPart("Instruction Serial", details.instruction_serial);
                if (details.initial_values) {
                    addPart("Issuance Date", formatDate(details.initial_values.issuance_date));
                    addPart("Initial Expiry", formatDate(details.initial_values.expiry_date));
                    addPart("Amount", formatAmount(details.initial_values.amount, details.initial_values.currency));
                }
                addPart("Details", details.reason);
                break;
            case 'LG_CREATED':
                addPart(null, `Created LG #${details.lg_number || ''}`);
                addPart("Beneficiary", details.beneficiary);
                addPart("Amount", formatAmount(details.amount, details.currency));
                break;
            case 'LG_EXTENDED':
                if(details.old_expiry_date && details.new_expiry_date) addPart(null, `Extended expiry: ${formatDate(details.old_expiry_date)} → ${formatDate(details.new_expiry_date)}`);
                else addPart(null, "LG Expiry Extended.");
                addPart("Instruction Serial", details.instruction_serial);
                break;
            case 'LG_AMENDED':
            case 'AUDIT_ACTION_TYPE_LG_AMENDED':
                addPart(null, details.note === 'Applied historical amendment' ? "Historical Adjustment" : "LG amended");
                addPart("Reason", details.reason);
                addPart("Instruction Serial", details.instruction_serial || details.instruction_serial_number);
                
                const changes = details.amended_fields || details.diff || details.changes;
                if (changes) {
                    const changeDescriptions = Object.entries(changes).map(([field, val]) => {
                        const label = formatActionTypeLabel(field);
                        if (val && typeof val === 'object' && ('old' in val || 'new' in val)) {
                            const oldVal = val.old ? (field.includes('date') ? formatDate(val.old) : val.old) : '—';
                            const newVal = val.new ? (field.includes('date') ? formatDate(val.new) : val.new) : '—';
                            return `${label}: ${oldVal} → ${newVal}`;
                        } else if (val !== null && val !== undefined && typeof val !== 'object') {
                            const rawOld = details.old_values ? details.old_values[field] : null;
                            const oldVal = rawOld ? (field.includes('date') ? formatDate(rawOld) : rawOld) : '—';
                            const newVal = field.includes('date') ? formatDate(val) : val;
                            return rawOld !== null && rawOld !== undefined ? `${label}: ${oldVal} → ${newVal}` : `${label}: ${newVal}`;
                        }
                        return null; 
                    }).filter(Boolean);
                    if (changeDescriptions.length > 0) addPart(null, `Changes: ${changeDescriptions.join('; ')}`);
                }
                break;
            case 'LG_RELEASED':
            case 'LG_RELEASE':
                addPart(null, "LG released");
                addPart("Serial", details.instruction_serial || details.serial_number);
                addPart("Approved by", details.approved_by_user_email);
                break;
            case 'LG_LIQUIDATED_FULL':
            case 'LG_LIQUIDATED_PARTIAL':
            case 'LG_LIQUIDATE':
                addPart(null, `LG liquidated (${details.liquidation_type})`);
                addPart("New Amount", formatAmount(details.new_amount, details.lg_currency));
                addPart("Serial", details.instruction_serial || details.serial_number);
                break;
            case 'LG_INSTRUCTION_DELIVERED':
            case 'LG_RECORD_DELIVERY':
                 addPart(null, `Delivery confirmed for instruction ${details.serial_number || ''}`);
                 addPart("Delivered on", formatDate(details.delivery_date));
                 addPart("Document stored", details.document_stored ? 'Yes' : null);
                break;
            case 'LG_BANK_REPLY_RECORDED':
            case 'LG_RECORD_BANK_REPLY':
                 addPart(null, `Bank reply recorded`);
                 addPart("Replied on", formatDate(details.bank_reply_date));
                 addPart("Letter Date", formatDate(details.bank_reply_letter_date));
                 addPart("Details", details.reply_details);
                 addPart("Document stored", details.document_stored ? 'Yes' : null);
                 if (details.admin_terms_approval_request_id) {
                     addPart("Admin Terms Approval", `Request #${details.admin_terms_approval_request_id}`);
                 }
                break;
            case 'LG_BANK_REPLY_TERMS_REJECTED':
                addPart(null, details.message || `Corporate Admin rejected bank-modified terms — instruction re-opened`);
                addPart("Instruction", details.instruction_serial);
                addPart("Rejection Reason", details.rejection_reason);
                break;
            case 'LG_INSTRUCTION_CANCELED':
                addPart(null, `Instruction ${details.canceled_instruction_serial || ''} (${formatActionTypeLabel(details.canceled_instruction_type || '')}) canceled — LG state rolled back to pre-instruction values`);
                addPart("Reason", details.reason);
                break;
            case 'NOTIFICATION_SENT':
                 addPart(null, "Notification sent");
                 addPart("To", details.recipient);
                 addPart("Subject", details.subject);
                break;
            case 'LG_RENEWAL_REMINDER_FIRST_SENT':
            case 'LG_RENEWAL_REMINDER_SECOND_SENT':
            case 'LG_OWNER_RENEWAL_REMINDER_SENT':
                addPart(null, `Renewal reminder sent`);
                addPart("Days until expiry", details.days_until_expiry);
                addPart("Recipients", details.recipients?.join(', '));
                break;
            default:
                Object.entries(details || {}).forEach(([key, value]) => {
                     if (typeof value !== 'object' && key.toLowerCase() !== 'id' && key.toLowerCase() !== 'user_id' && key.toLowerCase() !== 'lg_id') {
                        addPart(formatActionTypeLabel(key), value);
                     }
                });
                break;
        }
        
        return detailString.trim() || 'No specific details available.';
    };
    // --- END: Smart Formatting ---


    const isReminderApplicableByTime = useCallback((instr) => {
        if (isCorporateAdminView) return false;
        if (!instr || (!instr.instruction_date && !instr.delivery_date)) return false;

        const now = new Date();
        const instructionDate = new Date(instr.instruction_date);
        const deliveryDate = instr.delivery_date ? new Date(instr.delivery_date) : null;

        const daysSinceIssuance = differenceInDays(now, instructionDate);
        const daysSinceDelivery = deliveryDate ? differenceInDays(now, deliveryDate) : null;

        const isWithinMaxIssuance = daysSinceIssuance >= 0 && daysSinceIssuance <= reminderThresholds.maxDaysSinceIssuance;

        const conditionA = deliveryDate && daysSinceDelivery >= reminderThresholds.daysSinceDelivery && isWithinMaxIssuance;
        const conditionB = !deliveryDate && daysSinceIssuance >= reminderThresholds.daysSinceIssuance && isWithinMaxIssuance;

        return conditionA || conditionB;
    }, [reminderThresholds, isCorporateAdminView]);

    const handleCancelInstruction = (instruction) => {
        if (!isCorporateAdminView && !isGracePeriod) {
            setSelectedInstructionToCancel(instruction);
            setShowCancelModal(true);
        }
    };

    const handleSendReminderLocal = async (instructionId, serialNumber) => {
        if (isGracePeriod) { toast.warn("This action is disabled during your subscription's grace period."); return; }
        try {
            const authToken = getAuthToken();
            if (!authToken) { toast.error("Authentication required to send reminder."); return; }
            const response = await apiRequest(`/end-user/lg-records/instructions/${instructionId}/send-reminder-to-bank`, 'POST', null, 'text/html', 'text');
            if (response) {
                const newWindow = window.open('', '_blank');
                if (newWindow) {
                    newWindow.document.write(response);
                    newWindow.document.close();
                    toast.info(`Generating reminder PDF for instruction ${serialNumber}.`);
                    setTimeout(() => { fetchLifecycleHistoryAndConfig(); }, 1000);
                } else {
                    toast.error("Failed to open new tab. Please ensure your browser allows pop-ups.");
                }
            } else {
                toast.error("Failed to generate reminder content from the server.");
            }
        } catch (error) {
            toast.error(`Failed to send reminder: ${error.message || 'An unexpected error occurred.'}`);
        }
    };
    
    // --- FILTERING LOGIC ---
    
    // Toggle a single filter
    const toggleFilter = (type) => {
        const next = new Set(selectedFilters);
        if (next.has(type)) next.delete(type);
        else next.add(type);
        setSelectedFilters(next);
    };

    // Toggle a whole category
    const toggleCategory = (categoryName) => {
        const typesInCategory = categoryName === 'Other_Unmapped' ? unmappedTypes : ACTION_CATEGORIES[categoryName];
        const availableInCat = typesInCategory.filter(t => availableTypes.has(t));
        
        // Determine if we should select or deselect the category.
        const allSelected = availableInCat.every(t => selectedFilters.has(t));

        const next = new Set(selectedFilters);
        
        // Handle "Other" separately because it's a single filter chip named 'Other_Unmapped'
        if (categoryName === 'Other_Unmapped') {
            if (selectedFilters.has('Other_Unmapped')) {
                next.delete('Other_Unmapped');
            } else {
                next.add('Other_Unmapped');
            }
        } else {
             // Handle regular categories
            availableInCat.forEach(t => {
                if (allSelected) next.delete(t); // Deselect all
                else next.add(t); // Select all
            });
        }
       
        setSelectedFilters(next);
    };

    // Helper: Is a category active? (used for Quick Filters)
    const isCategoryActive = (categoryName) => {
        const typesInCategory = ACTION_CATEGORIES[categoryName];
        const availableInCat = typesInCategory.filter(t => availableTypes.has(t));
        if (availableInCat.length === 0) return false;
        return availableInCat.some(t => selectedFilters.has(t));
    };
    
    // Helper to list unmapped types
    const unmappedTypes = useMemo(() => {
        const allMapped = new Set(Object.values(ACTION_CATEGORIES).flat());
        return [...availableTypes].filter(t => !allMapped.has(t));
    }, [availableTypes]);

    const filteredEvents = useMemo(() => {
        return events.filter(event => {
            // 1. Check Date
            if (dateRange.from) {
                if (new Date(event.timestamp) < startOfDay(new Date(dateRange.from))) return false;
            }
            if (dateRange.to) {
                if (new Date(event.timestamp) > endOfDay(new Date(dateRange.to))) return false;
            }

            // 2. Check Type (Multi-Select)
            const eventType = event.action_type;
            const isUnmapped = !ALL_MAPPED_TYPES.has(eventType);

            // FIX: If no type filters are selected, show ALL events.
            if (selectedFilters.size === 0) {
                 return true;
            }
            
            // Check for unmapped events
            if (isUnmapped) {
                return selectedFilters.has('Other_Unmapped'); 
            }
            
            // Check for mapped events
            return selectedFilters.has(eventType);
        });
    }, [events, dateRange, selectedFilters]);

    // Count of active non-type filters (Date Range)
    const activeFilterCount = useMemo(() => {
        let count = 0;
        if (dateRange.from || dateRange.to) count++;
        // Check if selection size differs from available size
        if (selectedFilters.size !== availableTypes.size) count++; 
        return count;
    }, [dateRange, selectedFilters, availableTypes]);

    // Helper for simple date formatting for status badges
    const formatDateSimple = (dateString) => {
        if (!dateString) return '';
        try { return format(new Date(dateString), 'dd-MMM-yyyy'); } catch { return ''; }
    };


    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-48">
                <Loader className="animate-spin text-blue-500" size={32} />
                <p className="ml-2 text-gray-600">Loading lifecycle history...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-xl flex items-center text-sm">
                <AlertCircle className="mr-2 shrink-0" size={18} />
                {error}
            </div>
        );
    }

    if (filteredEvents.length === 0) {
        return (
            <div className="bg-slate-50 border border-slate-200 text-slate-500 px-4 py-8 rounded-xl text-center text-sm">
                <p>No lifecycle events found matching your filters.</p>
            </div>
        );
    }

    return (
        <div className="relative border-l-2 border-slate-200 pl-6 py-4">
            <input
                type="file"
                ref={eventDocInputRef}
                onChange={handleEventDocFileSelected}
                accept=".pdf,.png,.jpg,.jpeg"
                multiple
                className="hidden"
            />
            
            {/* --- FILTER BAR --- */}
            <div className="mb-5 bg-slate-50/80 p-3.5 rounded-2xl border border-slate-200/80 shadow-sm">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                    
                    {/* Quick Filters (Flex wrap for responsive design) */}
                    <div className="flex flex-wrap gap-2">
                        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider mr-1.5 self-center hidden sm:inline">Quick Views:</span>
                        
                        <QuickFilterButton 
                            label="Core Milestones" 
                            icon={Activity} 
                            isActive={isCategoryActive('Core Milestones')} 
                            onClick={() => toggleCategory('Core Milestones')} 
                        />
                        <QuickFilterButton 
                            label="Logistics" 
                            icon={Truck} 
                            isActive={isCategoryActive('Logistics')} 
                            onClick={() => toggleCategory('Logistics')} 
                        />
                        <QuickFilterButton 
                            label="Approvals" 
                            icon={ShieldCheck} 
                            isActive={isCategoryActive('Approvals')} 
                            onClick={() => toggleCategory('Approvals')} 
                        />
                        <QuickFilterButton 
                            label="System Logs" 
                            icon={Bell} 
                            isActive={isCategoryActive('System Logs')} 
                            onClick={() => toggleCategory('System Logs')} 
                        />
                    </div>

                    {/* Detailed Filter Dropdown */}
                    <div className="relative" ref={filterRef}>
                        <button
                            onClick={() => setIsFilterMenuOpen(!isFilterMenuOpen)}
                            className={`flex items-center px-3.5 py-1.5 text-xs sm:text-sm font-medium rounded-full border shadow-sm transition-colors ${
                                activeFilterCount > 0 
                                    ? 'bg-indigo-600 text-white border-indigo-600 hover:bg-indigo-700' 
                                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                            }`}
                        >
                            <Filter className="h-3.5 w-3.5 mr-1.5" />
                            Detailed Filter
                            {activeFilterCount > 0 && (
                                <span className="ml-2 bg-white text-indigo-600 text-xs font-bold px-1.5 py-0.5 rounded-full">
                                    {activeFilterCount}
                                </span>
                            )}
                            <ChevronDown className="h-3.5 w-3.5 ml-1.5" />
                        </button>

                        {/* DROPDOWN CONTENT (Multi-Select & Date Range) */}
                        {isFilterMenuOpen && (
                            <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-xl border border-slate-200 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
                                {/* Date Range */}
                                <div className="p-4 border-b border-slate-100 bg-slate-50/80">
                                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center"><Calendar className="h-3.5 w-3.5 mr-1.5" />Date Range</h4>
                                    <div className="flex gap-2">
                                        <div className="flex-1"><FormattedDateInput className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded-xl shadow-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500" value={dateRange.from} onChange={(e) => setDateRange(prev => ({ ...prev, from: e.target.value }))} /></div>
                                        <span className="text-slate-400 self-center">-</span>
                                        <div className="flex-1"><FormattedDateInput className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded-xl shadow-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500" value={dateRange.to} onChange={(e) => setDateRange(prev => ({ ...prev, to: e.target.value }))} /></div>
                                    </div>
                                </div>

                                {/* Categories */}
                                <div className="max-h-80 overflow-y-auto p-2">
                                    {Object.entries(ACTION_CATEGORIES).map(([category, types]) => {
                                        const availableInCat = types.filter(t => availableTypes.has(t));
                                        if (availableInCat.length === 0) return null;
                                        const allSelected = availableInCat.every(t => selectedFilters.has(t));
                                        const someSelected = availableInCat.some(t => selectedFilters.has(t));

                                        return (
                                            <div key={category} className="mb-2">
                                                <div className="flex items-center px-2 py-2 hover:bg-slate-50 rounded-lg cursor-pointer transition-colors" onClick={() => toggleCategory(category)}>
                                                    {allSelected ? <CheckSquare className="h-5 w-5 text-indigo-600 mr-2" /> : someSelected ? <div className="h-5 w-5 bg-indigo-600 mr-2 rounded flex items-center justify-center"><div className="h-0.5 w-3 bg-white" /></div> : <Square className="h-5 w-5 text-slate-400 mr-2" />}
                                                    <span className="text-sm font-semibold text-slate-800">{category}</span>
                                                </div>
                                                <div className="ml-9 mt-1 space-y-1 border-l-2 border-slate-100 pl-2">
                                                    {availableInCat.map(type => (
                                                        <div key={type} className="flex items-center cursor-pointer hover:text-indigo-600 py-1" onClick={() => toggleFilter(type)}>
                                                            <div className={`w-4 h-4 rounded border mr-2 flex items-center justify-center ${selectedFilters.has(type) ? 'bg-indigo-600 border-indigo-600' : 'border-slate-300'}`}>{selectedFilters.has(type) && <Check className="h-3 w-3 text-white" />}</div>
                                                            <span className="text-sm text-slate-600 truncate">{formatActionTypeLabel(type)}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        );
                                    })}
                                    
                                    {/* --- NEW: Other Category (for unmapped events) --- */}
                                    {unmappedTypes.length > 0 && (
                                        <div className="mb-2">
                                            <div className="flex items-center px-2 py-2 hover:bg-slate-50 rounded-lg cursor-pointer transition-colors" onClick={() => toggleFilter('Other_Unmapped')}>
                                                {selectedFilters.has('Other_Unmapped') ? <CheckSquare className="h-5 w-5 text-indigo-600 mr-2" /> : <Square className="h-5 w-5 text-slate-400 mr-2" />}
                                                <span className="text-sm font-semibold text-slate-800">Other ({unmappedTypes.length})</span>
                                            </div>
                                            <div className="ml-9 mt-1 space-y-1 border-l-2 border-slate-100 pl-2">
                                                {unmappedTypes.map(type => (
                                                    <div key={type} className="flex items-center cursor-pointer hover:text-indigo-600 py-1" onClick={() => toggleFilter('Other_Unmapped')}>
                                                        <div className={`w-4 h-4 rounded border mr-2 flex items-center justify-center ${selectedFilters.has('Other_Unmapped') ? 'bg-indigo-600 border-indigo-600' : 'border-slate-300'}`}>{selectedFilters.has('Other_Unmapped') && <Check className="h-3 w-3 text-white" />}</div>
                                                        <span className="text-sm text-slate-600 truncate">{formatActionTypeLabel(type)}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                </div>
                                
                                {/* Footer Actions */}
                                <div className="p-3 border-t border-slate-200 bg-slate-50 flex justify-between">
                                    <button className="text-xs font-semibold text-indigo-600 hover:underline" onClick={() => setSelectedFilters(new Set(availableTypes))}>Select All</button>
                                    <button className="text-xs font-semibold text-slate-500 hover:underline" onClick={() => setSelectedFilters(new Set())}>Clear</button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
            {/* --- END: NEW FILTER BAR --- */}


            {filteredEvents.map((eventItem, index) => {
                const instruction = getInstructionForEvent(eventItem);

                // --- VISUAL STYLE CHECK (FIX) ---
                const styles = getCardStyle(eventItem.action_type); 

                // Look in lgDocuments (Prop) for documents
                const deliveryDoc = lgDocuments.find(doc => doc.document_type === 'DELIVERY_PROOF' && doc.lg_instruction_id === instruction?.id);
                const bankReplyDoc = lgDocuments.find(doc => doc.document_type === 'BANK_REPLY' && doc.lg_instruction_id === instruction?.id);
                const rejectedReplyDoc = lgDocuments.find(doc => doc.document_type === 'REJECTED_BANK_REPLY' && doc.lg_instruction_id === instruction?.id);
                const eventDocId = eventItem.details?.amendment_document_id || eventItem.details?.document_id || (eventItem.entity_type === 'LGDocument' ? eventItem.entity_id : null);
                const eventAssociatedDoc = eventDocId
                    ? lgDocuments.find(doc => !doc.is_deleted && Number(doc.id) === Number(eventDocId))
                    : (eventItem.action_type === 'MIGRATION_IMPORT_RECORD' ? lgDocuments.find(doc => !doc.is_deleted && doc.document_type === 'ORIGINAL_LG_DOCUMENT') : null);
                const isTermsRejectedByAdmin = instruction?.details?.bank_terms_admin_approval?.status === 'REJECTED_BY_ADMIN';

                const hasDeliveryDate = instruction && (instruction.delivery_date !== null && instruction.delivery_date !== "");
                const hasBankReplyDate = instruction && (instruction.bank_reply_date !== null && instruction.bank_reply_date !== "");
                const isReminderInstruction = instruction && instruction.instruction_type === 'LG_REMINDER_TO_BANKS';
                const hasBeenRemindedPreviously = hasReminderBeenSent(instruction?.id);

                const showSendReminderButtonForEndUser = !isCorporateAdminView && instruction && Number.isInteger(instruction.id) && (instruction.bank_reply_date === null || instruction.bank_reply_date === "") && !isReminderInstruction && isReminderApplicableByTime(instruction) && !hasBeenRemindedPreviously && !!onSendReminder;
                const showViewIssuedReminderButton = instruction && Number.isInteger(instruction.id) && (hasBeenRemindedPreviously || isReminderInstruction);
                
                const isDeliveryLogisticsEvent = ['LG_RECORD_DELIVERY', 'LG_INSTRUCTION_DELIVERED'].includes(eventItem.action_type);
                const isBankReplyLogisticsEvent = ['LG_RECORD_BANK_REPLY', 'LG_BANK_REPLY_RECORDED', 'LG_BANK_REPLY_REDIRECTED_BY_AI', 'LG_EXPIRY_ALIGNED_TO_BANK_CONVENTION'].includes(eventItem.action_type);
                const isCoreInstructionEvent = [
                    'LG_EXTENDED', 'LG_LIQUIDATED_FULL', 'LG_LIQUIDATED_PARTIAL', 'LG_LIQUIDATE',
                    'LG_RELEASED', 'LG_RELEASE', 'LG_DECREASED_AMOUNT', 'LG_DECREASE_AMOUNT',
                    'LG_AMENDED', 'AUDIT_ACTION_TYPE_LG_AMENDED', 'LG_ACTIVATED', 'LG_ACTIVATE_NON_OPERATIVE',
                    'LG_REMINDER_SENT_TO_BANK', 'LG_REMINDER_TO_BANKS'
                ].includes(eventItem.action_type);

                const isLatestInstruction = isCoreInstructionEvent && latestCancellableInstruction && instruction?.id === latestCancellableInstruction.id;
                const isCancellableStatus = instruction?.status === 'Instruction Issued' || instruction?.status === 'Reminder Issued';
                const isCancellableType = ['LG_EXTENSION', 'LG_LIQUIDATION', 'LG_RELEASE', 'LG_DECREASE_AMOUNT', 'LG_ACTIVATE_NON_OPERATIVE'].includes(instruction?.instruction_type);
                const hasPendingCancelRequest = Boolean(
                    instruction && (
                        instruction.details?.pending_cancellation_request_id ||
                        events.some(ev =>
                            ev.action_type === 'APPROVAL_REQUEST_SUBMITTED' &&
                            (ev.details?.action_type === 'LG_CANCEL_LAST_INSTRUCTION' || ev.details?.action_type_requested === 'LG_CANCEL_LAST_INSTRUCTION') &&
                            (Number(ev.details?.instruction_id) === Number(instruction.id) || String(ev.details?.request_details_summary || '').includes(`'instruction_id': ${instruction.id}`))
                        )
                    ) && !events.some(ev =>
                        ['APPROVAL_REQUEST_APPROVED', 'APPROVAL_REQUEST_REJECTED', 'APPROVAL_REQUEST_WITHDRAWN'].includes(ev.action_type) &&
                        (ev.details?.action_type === 'LG_CANCEL_LAST_INSTRUCTION' || ev.details?.action_type_approved === 'LG_CANCEL_LAST_INSTRUCTION' || ev.details?.action_type_rejected === 'LG_CANCEL_LAST_INSTRUCTION') &&
                        new Date(ev.timestamp) > new Date(instruction.created_at)
                    )
                );
                const isInstructionCanceled = Boolean(isCoreInstructionEvent && instruction?.status === 'Canceled');
                const showAllActionButtons = Boolean(!isInstructionCanceled && isCoreInstructionEvent && instruction && (instruction.generated_content_path || instruction.template_id || instruction.id));

                return (
                    <div key={eventItem.id || `event-${index}`} className="mb-4 relative">
                        {/* ORIGINAL ICON STYLE */}
                        <div className={`absolute -left-3.5 top-0 flex items-center justify-center w-7 h-7 rounded-full bg-white border-2 border-slate-200 shadow-sm ${styles.iconClass}`}>
                            {getEventIcon(eventItem.action_type)}
                        </div>
                        
                        {/* CARD STYLE (Fixed to apply system log background) */}
                        <div
                            id={isCoreInstructionEvent && instruction ? `lifecycle-instruction-${instruction.id}` : undefined}
                            className={`${isInstructionCanceled ? 'bg-slate-50/80 border-slate-300 opacity-85' : styles.cardClass} rounded-xl p-4 ml-4 border transition-all duration-300`}
                        >
                            <div className="flex justify-between items-center mb-1.5 gap-2">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <h3 className={`font-bold text-base ${isInstructionCanceled ? 'text-slate-500 line-through' : (styles.isSystem ? 'text-slate-700' : 'text-slate-900')}`}>
                                        {formatActionTypeLabel(eventItem.action_type)}
                                    </h3>
                                    {isInstructionCanceled && (
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-700 border border-rose-200">
                                            🚫 Canceled &amp; Rolled Back
                                        </span>
                                    )}
                                </div>
                                <span className="text-xs sm:text-sm text-slate-500 tabular-nums shrink-0">
                                    {format(new Date(eventItem.timestamp), 'dd-MMM-yyyy HH:mm')}
                                </span>
                            </div>
                            <p className="text-sm text-slate-700 mb-1">
                                <span className="font-medium text-slate-900">User:</span> {eventItem.user_email || 'System'}
                            </p>
                            
                            {/* DETAILS (NOW CLEAN) */}
                            <p className={`text-sm ${isInstructionCanceled ? 'text-slate-400 line-through' : 'text-slate-600'}`}>
                                {formatEventDetails(eventItem.action_type, eventItem.details, eventItem.user_email)}
                            </p>

                            {!instruction && (eventAssociatedDoc || ['MIGRATION_IMPORT_RECORD', 'LG_AMENDED', 'AUDIT_ACTION_TYPE_LG_AMENDED', 'LG_CREATED'].includes(eventItem.action_type)) && (
                                <div className="mt-3 flex flex-wrap gap-2">
                                    {eventAssociatedDoc && onViewInstructionDocument && (
                                        <button
                                            onClick={() => onViewInstructionDocument(eventAssociatedDoc.id)}
                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-blue-200 text-xs sm:text-sm font-medium rounded-lg shadow-sm text-blue-700 bg-blue-50 hover:bg-blue-100 transition-colors"
                                            title={`View ${eventAssociatedDoc.file_name}`}
                                        >
                                            <Eye className="h-4 w-4 text-blue-600 shrink-0" />
                                            <span>View Attached Document ({eventAssociatedDoc.file_name})</span>
                                        </button>
                                    )}
                                    {['MIGRATION_IMPORT_RECORD', 'LG_AMENDED', 'AUDIT_ACTION_TYPE_LG_AMENDED', 'LG_CREATED'].includes(eventItem.action_type) && !isGracePeriod && (
                                        <button
                                            type="button"
                                            onClick={() => handleTriggerEventDocUpload(eventItem)}
                                            disabled={uploadingEventId === eventItem.id}
                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-teal-200 text-xs sm:text-sm font-medium rounded-lg shadow-sm text-teal-700 bg-teal-50 hover:bg-teal-100 disabled:opacity-50 transition-colors"
                                            title="Upload supporting PDF/image document (e.g. Original LG copy, Amendment Letter, or Bank Advice) and link it to this record"
                                        >
                                            {uploadingEventId === eventItem.id ? (
                                                <Loader className="h-4 w-4 animate-spin text-teal-600 shrink-0" />
                                            ) : (
                                                <FileText className="h-4 w-4 text-teal-600 shrink-0" />
                                            )}
                                            <span>
                                                {uploadingEventId === eventItem.id
                                                    ? 'Uploading...'
                                                    : eventAssociatedDoc
                                                        ? '+ Add / Replace Document'
                                                        : '+ Attach Supporting Document'}
                                            </span>
                                        </button>
                                    )}
                                </div>
                            )}

                            {instruction && (
                                <div className="mt-3 flex flex-wrap gap-2">
                                    {isInstructionCanceled && (
                                        <>
                                            <button
                                                onClick={() => onViewInstructionLetter(instruction.id)}
                                                className="inline-flex items-center px-3 py-1.5 border border-slate-300 text-xs font-medium rounded-lg text-slate-600 bg-white hover:bg-slate-50 shadow-sm transition-colors"
                                                title="View Canceled Instruction Letter"
                                            >
                                                <FileText className="h-3.5 w-3.5 mr-1.5 text-slate-500" />
                                                View Letter (Canceled)
                                            </button>
                                            <span className="inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-lg bg-rose-50 text-rose-700 border border-rose-200">
                                                Instruction Canceled — LG State Rolled Back{instruction.details?.old_expiry_date ? ` to ${formatDateSimple(instruction.details.old_expiry_date)}` : ''}
                                            </span>
                                        </>
                                    )}
                                    {!isCorporateAdminView && !isGracePeriod && isLatestInstruction && isCancellableStatus && isCancellableType && (
                                        hasPendingCancelRequest ? (
                                            <span className="inline-flex items-center px-3 py-1.5 text-xs font-semibold rounded-lg bg-amber-50 text-amber-800 border border-amber-200">
                                                <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
                                                Cancellation Pending Approval
                                            </span>
                                        ) : (
                                            <GracePeriodTooltip isGracePeriod={isGracePeriod}>
                                                <button
                                                    onClick={() => handleCancelInstruction(instruction)}
                                                    className="inline-flex items-center px-3 py-1.5 text-xs sm:text-sm font-medium rounded-lg shadow-sm bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 transition-colors"
                                                    title="Cancel Last Instruction"
                                                    disabled={isGracePeriod}
                                                >
                                                    <RotateCcw className="h-4 w-4 mr-1.5" />
                                                    Cancel
                                                </button>
                                            </GracePeriodTooltip>
                                        )
                                    )}

                                    {/* On Delivery Logistics events (LG Record Delivery), show the Delivery Evidence button directly */}
                                    {isDeliveryLogisticsEvent && deliveryDoc && (
                                        <button
                                            onClick={() => setInspectorState({
                                                isOpen: true,
                                                documentId: deliveryDoc.id,
                                                fileName: deliveryDoc.file_name,
                                                instruction: instruction,
                                                docType: 'delivery',
                                            })}
                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 text-xs sm:text-sm font-medium rounded-lg shadow-sm text-slate-700 bg-slate-100 hover:bg-slate-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-400 transition-colors"
                                            title={`Inspect Delivery Evidence (${formatDateSimple(instruction.delivery_date)})`}
                                        >
                                            <Eye className="h-4 w-4 text-cyan-600 shrink-0" />
                                            <span>Delivery Evid. ({formatDateSimple(instruction.delivery_date)})</span>
                                            {instruction?.details?.delivery_override ? (
                                                <span
                                                    className="inline-flex items-center justify-center ml-0.5 p-0.5 rounded bg-amber-200/80 text-amber-800"
                                                    title={`Confirmed with Override: ${instruction.details.delivery_override.reason || 'Discrepancies overridden'}`}
                                                >
                                                    <AlertTriangle className="h-3.5 w-3.5" />
                                                </span>
                                            ) : instruction?.details?.delivery_ai_verification?.status === 'verified' ? (
                                                <span
                                                    className="inline-flex items-center justify-center ml-0.5 p-0.5 rounded bg-emerald-100 text-emerald-700"
                                                    title="AI Verified"
                                                >
                                                    <CheckCircle2 className="h-3.5 w-3.5" />
                                                </span>
                                            ) : null}
                                        </button>
                                    )}

                                    {/* On Bank Reply Logistics events (LG Record Bank Reply / Redirected), show the Bank Reply Evidence button directly */}
                                    {isBankReplyLogisticsEvent && bankReplyDoc && (
                                        <button
                                            onClick={() => setInspectorState({
                                                isOpen: true,
                                                documentId: bankReplyDoc.id,
                                                fileName: bankReplyDoc.file_name,
                                                instruction: instruction,
                                                docType: 'bank_reply',
                                            })}
                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 text-xs sm:text-sm font-medium rounded-lg shadow-sm text-slate-700 bg-slate-100 hover:bg-slate-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-400 transition-colors"
                                            title={`Inspect Bank Reply (${formatDateSimple(instruction.bank_reply_date)})`}
                                        >
                                            <Eye className="h-4 w-4 text-teal-600 shrink-0" />
                                            <span>Bank Reply Evid. ({formatDateSimple(instruction.bank_reply_date)})</span>
                                            {instruction?.details?.bank_reply_override ? (
                                                <span
                                                    className="inline-flex items-center justify-center ml-0.5 p-0.5 rounded bg-amber-200/80 text-amber-800"
                                                    title={`Confirmed with Override: ${instruction.details.bank_reply_override.reason || 'Discrepancies overridden'}`}
                                                >
                                                    <AlertTriangle className="h-3.5 w-3.5" />
                                                </span>
                                            ) : (instruction?.details?.bank_reply_ai_verification?.status === 'verified' || instruction?.details?.date_convention_alignment?.status === 'ACCEPTED_BY_USER') ? (
                                                <span
                                                    className="inline-flex items-center justify-center ml-0.5 p-0.5 rounded bg-emerald-100 text-emerald-700"
                                                    title="AI Verified"
                                                >
                                                    <CheckCircle2 className="h-3.5 w-3.5" />
                                                </span>
                                            ) : null}
                                            {instruction?.details?.disambiguation_redirect && (
                                                <span
                                                    className="inline-flex items-center justify-center p-0.5 rounded bg-purple-100 text-purple-700"
                                                    title={`Redirected via AI from ${instruction.details.disambiguation_redirect.switched_from_serial || `Instruction #${instruction.details.disambiguation_redirect.switched_from_instruction_id}`}`}
                                                >
                                                    <ArrowLeftRight className="h-3.5 w-3.5" />
                                                </span>
                                            )}
                                            {instruction?.details?.bank_terms_admin_approval && (
                                                <span
                                                    className="inline-flex items-center justify-center p-0.5 rounded bg-indigo-100 text-indigo-700"
                                                    title={`Bank-modified terms submitted for Admin approval (#${instruction.details.bank_terms_admin_approval.approval_request_id})`}
                                                >
                                                    <ShieldCheck className="h-3.5 w-3.5" />
                                                </span>
                                            )}
                                        </button>
                                    )}

                                    {showAllActionButtons && (
                                        <>
                                            <button
                                                onClick={() => onViewInstructionLetter(instruction.id)}
                                                className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs sm:text-sm font-semibold rounded-lg shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
                                                title="View Instruction Letter"
                                            >
                                                <FileText className="h-4 w-4 mr-1.5" />
                                                View Letter
                                            </button>

                                            {/* --- ORIGINAL BUTTON STYLES PRESERVED --- */}
                                            
                                            {!isCorporateAdminView && !hasDeliveryDate ? (
                                                <GracePeriodTooltip isGracePeriod={isGracePeriod}>
                                                    <button
                                                        onClick={() => onRecordDelivery(instruction)}
                                                        className="inline-flex items-center px-3 py-1.5 border border-blue-200 text-xs sm:text-sm font-medium rounded-lg shadow-sm text-blue-700 bg-blue-50 hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                                                        title="Record Delivery"
                                                        disabled={isGracePeriod}
                                                    >
                                                        <Truck className="h-4 w-4 mr-1.5" />
                                                        Record Delivery
                                                    </button>
                                                </GracePeriodTooltip>
                                            ) : hasDeliveryDate ? (
                                                <>
                                                    {deliveryDoc ? (
                                                        <button
                                                            onClick={() => setInspectorState({
                                                                isOpen: true,
                                                                documentId: deliveryDoc.id,
                                                                fileName: deliveryDoc.file_name,
                                                                instruction: instruction,
                                                                docType: 'delivery',
                                                            })}
                                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 text-xs sm:text-sm font-medium rounded-lg shadow-sm text-slate-700 bg-slate-100 hover:bg-slate-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-400 transition-colors"
                                                            title={`Inspect Delivery Evidence (${formatDateSimple(instruction.delivery_date)})`}
                                                        >
                                                            <Eye className="h-4 w-4 text-cyan-600 shrink-0" />
                                                            <span>Delivery Evid. ({formatDateSimple(instruction.delivery_date)})</span>
                                                            {instruction?.details?.delivery_override ? (
                                                                <span
                                                                    className="inline-flex items-center justify-center ml-0.5 p-0.5 rounded bg-amber-200/80 text-amber-800"
                                                                    title={`Confirmed with Override: ${instruction.details.delivery_override.reason || 'Discrepancies overridden'}`}
                                                                >
                                                                    <AlertTriangle className="h-3.5 w-3.5" />
                                                                </span>
                                                            ) : instruction?.details?.delivery_ai_verification?.status === 'verified' ? (
                                                                <span
                                                                    className="inline-flex items-center justify-center ml-0.5 p-0.5 rounded bg-emerald-100 text-emerald-700"
                                                                    title="AI Verified"
                                                                >
                                                                    <CheckCircle2 className="h-3.5 w-3.5" />
                                                                </span>
                                                            ) : null}
                                                        </button>
                                                    ) : (
                                                        <span className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-slate-500 bg-slate-50 border border-slate-200 rounded-lg">
                                                            Delivered {formatDateSimple(instruction.delivery_date)} (No Doc)
                                                        </span>
                                                    )}
                                                </>
                                            ) : (
                                                isCorporateAdminView && (
                                                    <span className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-slate-500 bg-slate-50 border border-slate-200 rounded-lg">
                                                        Delivery Not Recorded
                                                    </span>
                                                )
                                            )}

                                            {!isCorporateAdminView && !hasBankReplyDate ? (
                                                <>
                                                    {isTermsRejectedByAdmin && (
                                                        <>
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    const authToken = getAuthToken();
                                                                    const baseUrl = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8000/api/v1';
                                                                    const url = `${baseUrl}/end-user/lg-records/instructions/${instruction.id}/view-discrepancy-letter${authToken ? `?token=${authToken}&print=true` : '?print=true'}`;
                                                                    window.open(url, '_blank');
                                                                }}
                                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-rose-300 text-xs sm:text-sm font-medium rounded-lg shadow-sm text-rose-800 bg-rose-50 hover:bg-rose-100 focus:outline-none transition-colors"
                                                                title={`Corporate Admin rejected bank-modified terms (${instruction?.details?.bank_terms_admin_approval?.rejection_reason || 'Discrepancy'}). Click to print Discrepancy Notice Letter for the bank.`}
                                                            >
                                                                <FileText className="h-4 w-4 text-rose-600" />
                                                                <span>Print Discrepancy Letter</span>
                                                            </button>
                                                            {rejectedReplyDoc && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setInspectorState({
                                                                        isOpen: true,
                                                                        documentId: rejectedReplyDoc.id,
                                                                        fileName: rejectedReplyDoc.file_name,
                                                                        instruction: instruction,
                                                                        docType: 'bank_reply',
                                                                    })}
                                                                    className="inline-flex items-center gap-1 px-2.5 py-1.5 border border-slate-200 text-xs font-medium rounded-lg text-slate-600 bg-slate-50 hover:bg-slate-100 transition-colors"
                                                                    title="Inspect previously rejected Bank Reply advice"
                                                                >
                                                                    <Eye className="h-3.5 w-3.5 text-rose-500" />
                                                                    <span>Rejected Reply</span>
                                                                </button>
                                                            )}
                                                        </>
                                                    )}
                                                    <GracePeriodTooltip isGracePeriod={isGracePeriod}>
                                                        <button
                                                            onClick={() => onRecordBankReply(instruction)}
                                                            className="inline-flex items-center px-3 py-1.5 border border-teal-200 text-xs sm:text-sm font-medium rounded-lg shadow-sm text-teal-700 bg-teal-50 hover:bg-teal-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 transition-colors"
                                                            title="Record Bank Reply"
                                                            disabled={isGracePeriod}
                                                        >
                                                            <Building className="h-4 w-4 mr-1.5" />
                                                            {isTermsRejectedByAdmin ? 'Record Corrected Reply' : 'Record Reply'}
                                                        </button>
                                                    </GracePeriodTooltip>
                                                </>
                                            ) : hasBankReplyDate ? (
                                                <>
                                                    {bankReplyDoc ? (
                                                        <button
                                                            onClick={() => setInspectorState({
                                                                isOpen: true,
                                                                documentId: bankReplyDoc.id,
                                                                fileName: bankReplyDoc.file_name,
                                                                instruction: instruction,
                                                                docType: 'bank_reply',
                                                            })}
                                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 text-xs sm:text-sm font-medium rounded-lg shadow-sm text-slate-700 bg-slate-100 hover:bg-slate-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-400 transition-colors"
                                                            title={`Inspect Bank Reply (${formatDateSimple(instruction.bank_reply_date)})`}
                                                        >
                                                            <Eye className="h-4 w-4 text-teal-600 shrink-0" />
                                                            <span>Bank Reply Evid. ({formatDateSimple(instruction.bank_reply_date)})</span>
                                                            {instruction?.details?.bank_reply_override ? (
                                                                <span
                                                                    className="inline-flex items-center justify-center ml-0.5 p-0.5 rounded bg-amber-200/80 text-amber-800"
                                                                    title={`Confirmed with Override: ${instruction.details.bank_reply_override.reason || 'Discrepancies overridden'}`}
                                                                >
                                                                    <AlertTriangle className="h-3.5 w-3.5" />
                                                                </span>
                                                            ) : (instruction?.details?.bank_reply_ai_verification?.status === 'verified' || instruction?.details?.date_convention_alignment?.status === 'ACCEPTED_BY_USER') ? (
                                                                <span
                                                                    className="inline-flex items-center justify-center ml-0.5 p-0.5 rounded bg-emerald-100 text-emerald-700"
                                                                    title="AI Verified"
                                                                >
                                                                    <CheckCircle2 className="h-3.5 w-3.5" />
                                                                </span>
                                                            ) : null}
                                                            {instruction?.details?.disambiguation_redirect && (
                                                                <span
                                                                    className="inline-flex items-center justify-center p-0.5 rounded bg-purple-100 text-purple-700"
                                                                    title={`Redirected via AI from ${instruction.details.disambiguation_redirect.switched_from_serial || `Instruction #${instruction.details.disambiguation_redirect.switched_from_instruction_id}`}`}
                                                                >
                                                                    <ArrowLeftRight className="h-3.5 w-3.5" />
                                                                </span>
                                                            )}
                                                            {instruction?.details?.bank_terms_admin_approval && (
                                                                <span
                                                                    className="inline-flex items-center justify-center p-0.5 rounded bg-indigo-100 text-indigo-700"
                                                                    title={`Bank-modified terms submitted for Admin approval (#${instruction.details.bank_terms_admin_approval.approval_request_id})`}
                                                                >
                                                                    <ShieldCheck className="h-3.5 w-3.5" />
                                                                </span>
                                                            )}
                                                        </button>
                                                    ) : (
                                                        <span className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-slate-500 bg-slate-50 border border-slate-200 rounded-lg">
                                                            Replied {formatDateSimple(instruction.bank_reply_date)} (No Doc)
                                                        </span>
                                                    )}
                                                </>
                                            ) : (
                                                isCorporateAdminView && (
                                                    <span className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-slate-500 bg-slate-50 border border-slate-200 rounded-lg">
                                                        Bank Reply Not Recorded
                                                    </span>
                                                )
                                            )}

                                            {showSendReminderButtonForEndUser ? (
                                                <GracePeriodTooltip isGracePeriod={isGracePeriod}>
                                                    <button
                                                        onClick={() => handleSendReminderLocal(instruction.id, instruction.serial_number)}
                                                        className="inline-flex items-center px-3 py-1.5 border border-orange-200 text-xs sm:text-sm font-medium rounded-lg shadow-sm bg-orange-50 text-orange-700 hover:bg-orange-100 transition-colors"
                                                        title="Send Reminder to Bank"
                                                        disabled={isGracePeriod}
                                                    >
                                                        <Mail className="h-4 w-4 mr-1.5" /> Send Reminder
                                                    </button>
                                                </GracePeriodTooltip>
                                            ) : showViewIssuedReminderButton ? (
                                                <button
                                                    onClick={() => onViewInstructionLetter(instruction.id)}
                                                    className="inline-flex items-center px-3 py-1.5 border border-amber-200 text-xs sm:text-sm font-medium rounded-lg shadow-sm bg-amber-50 text-amber-800 hover:bg-amber-100 transition-colors"
                                                    title="View Issued Reminder"
                                                >
                                                    <Eye className="h-4 w-4 mr-1.5" /> View Issued Reminder
                                                </button>
                                            ) : (
                                                showAllActionButtons && (
                                                    <span className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-slate-500 bg-slate-50 border border-slate-200 rounded-lg">
                                                        No Reminder Needed
                                                    </span>
                                                )
                                            )}
                                        </>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                );
            })}
            
            {showCancelModal && selectedInstructionToCancel && (
                <CancelInstructionModal
                    instruction={selectedInstructionToCancel}
                    onClose={() => {
                        setShowCancelModal(false);
                        setSelectedInstructionToCancel(null);
                    }}
                    onSuccess={async () => {
                        setShowCancelModal(false);
                        setSelectedInstructionToCancel(null);
                        await fetchLifecycleHistoryAndConfig();
                        if (onRefreshLgRecord) {
                            await onRefreshLgRecord();
                        }
                    }}
                    isGracePeriod={isGracePeriod}
                />
            )}

            {inspectorState.isOpen && (
                <DocumentInspectorModal
                    isOpen={inspectorState.isOpen}
                    onClose={() => setInspectorState(prev => ({ ...prev, isOpen: false }))}
                    documentId={inspectorState.documentId}
                    fileName={inspectorState.fileName}
                    instruction={inspectorState.instruction}
                    lgRecord={lgRecord}
                    docType={inspectorState.docType}
                    mode="view"
                />
            )}
        </div>
    );
};

export default LGLifecycleHistoryComponent;