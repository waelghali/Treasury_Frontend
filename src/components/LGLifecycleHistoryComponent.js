// frontend/src/components/LGLifecycleHistoryComponent.js
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { apiRequest, getAuthToken } from '../services/apiService';
import { format, differenceInDays, startOfDay, endOfDay } from 'date-fns';
import { 
    Loader, AlertCircle, Truck, Building, RotateCcw, FileText, ChevronDown, 
    Download, Mail, Eye, Filter, Calendar, CheckSquare, Square, Check, Activity, ShieldCheck, Bell 
} from 'lucide-react';
import CancelInstructionModal from 'components/Modals/CancelInstructionModal';
import { toast } from 'react-toastify';
import { getEventIcon, formatActionTypeLabel } from '../utils/timelineHelpers';

// --- CONFIGURATION: Categories for Filtering (Updated for accuracy) ---

const ACTION_CATEGORIES = {
    'Core Milestones': [
        'LG_CREATED', 'LG_EXTENDED', 'LG_LIQUIDATED_FULL', 'LG_LIQUIDATED_PARTIAL', 
        'LG_RELEASED', 'LG_DECREASED_AMOUNT', 'LG_AMENDED', 'MIGRATION_IMPORT_RECORD', 
        'LG_ACTIVATED', 'LG_ACTIVATE_NON_OPERATIVE', 'AUDIT_ACTION_TYPE_LG_AMENDED'
    ],
    'Logistics': [
        'LG_INSTRUCTION_DELIVERED', 'LG_RECORD_DELIVERY', 'LG_BANK_REPLY_RECORDED', 
        'LG_RECORD_BANK_REPLY', 'INSTRUCTION_ACCESSED_FOR_PRINT'
    ],
    'Approvals': [
        'APPROVAL_REQUEST_SUBMITTED', 'APPROVAL_REQUEST_APPROVED', 'APPROVAL_REQUEST_REJECTED', 
        'APPROVAL_REQUEST_WITHDRAWN', 'APPROVAL_REQUEST_AUTO_REJECTED', 
        'APPROVAL_INVALIDATED_BY_OTHER_APPROVAL'
    ],
    'System Logs': [
        'NOTIFICATION_SENT', 'NOTIFICATION_FAILED', 'LG_REMINDER_SENT_TO_BANK', 
        'LG_BULK_REMINDER_INITIATED', 'LG_RENEWAL_REMINDER_FIRST_SENT', 
        'LG_RENEWAL_REMINDER_SECOND_SENT', 'LG_OWNER_RENEWAL_REMINDER_SENT', 
        'LG_OWNER_RENEWAL_REMINDER_SKIPPED_RECENTLY_SENT', 'LG_OWNER_DETAILS_UPDATED', 
        'LG_SINGLE_OWNER_CHANGED', 'LG_BULK_OWNER_CHANGED', 'LG_TOGGLE_AUTO_RENEWAL',
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
    // System Logs -> Subtle Gray background
    if (ACTION_CATEGORIES['System Logs'].includes(actionType)) {
        return {
            cardClass: 'bg-gray-100 border-gray-200', 
            iconClass: 'text-gray-500', // Use gray for system icons
            isSystem: true
        };
    }
    if (ACTION_CATEGORIES['Core Milestones'].includes(actionType)) {
        return {
            cardClass: 'bg-white border-gray-500', 
            iconClass: 'text-gray-500',
            isSystem: true
        };
    }    // Default/Core Events -> Original White background
    return {
        cardClass: 'bg-white shadow-md border-gray-200',
        iconClass: 'text-indigo-600', // Default color for event icon
        isSystem: false
    };
};

// A reusable component to provide a tooltip for disabled elements during the grace period.
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

// --- Quick Filter Button Component ---
const QuickFilterButton = ({ label, icon: Icon, isActive, onClick }) => (
    <button
        onClick={onClick}
        className={`flex items-center text-sm font-medium px-4 py-2 rounded-full border transition-all duration-200 ${
            isActive 
            ? 'bg-blue-600 text-white border-blue-600 shadow-sm' 
            : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50 hover:border-gray-300'
        }`}
    >
        {Icon && <Icon className={`h-4 w-4 mr-2 ${isActive ? 'text-white' : 'text-gray-500'}`} />}
        {label}
    </button>
);


const LGLifecycleHistoryComponent = ({
    lgRecordId,
    lgInstructions = [],
    lgDocuments = [],
    onRecordDelivery,
    onRecordBankReply,
    onSendReminder,
    onViewInstructionLetter,
    onViewInstructionDocument,
    isCorporateAdminView = false,
    isGracePeriod
}) => {
    const [events, setEvents] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    
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
        return new Map(lgInstructions.map(inst => [inst.id, inst]));
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

    const fetchLifecycleHistoryAndConfig = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const allEventsResponse = await apiRequest(`/end-user/lg-records/${lgRecordId}/lifecycle-history`, 'GET');
            const filteredEvents = allEventsResponse.filter(event => event.action_type !== 'DOCUMENT_UPLOADED');
            const sortedEvents = filteredEvents.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
            
            // Filter State Initialization
            const uniqueTypes = new Set(sortedEvents.map(e => e.action_type));
            setAvailableTypes(uniqueTypes);

            // Default: Select only Core, Logistics, and Approvals
            const initialSelection = new Set();
            uniqueTypes.forEach(type => {
                if (INITIAL_SELECTED_TYPES.has(type)) {
                    initialSelection.add(type);
                }
            });
            setSelectedFilters(initialSelection);
            
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
            fetchLifecycleHistoryAndConfig();
        }
    }, [lgRecordId, fetchLifecycleHistoryAndConfig]);

    const getInstructionForEvent = useCallback((eventItem) => {
        if (eventItem.entity_type === "LGInstruction" && eventItem.entity_id) {
            return instructionsMap.get(eventItem.entity_id);
        }
        if (eventItem.details) {
            const instructionIdFromDetails = eventItem.details.generated_instruction_id || eventItem.details.instruction_id || eventItem.details.new_instruction_id;
            if (instructionIdFromDetails) {
                return instructionsMap.get(instructionIdFromDetails);
            }
        }
        return null;
    }, [instructionsMap]);

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
            try { return format(new Date(dateString), 'MMM dd, yyyy'); } catch { return null; }
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
                if (details.initial_values) {
                    addPart("Initial Expiry", formatDate(details.initial_values.expiry_date));
                    addPart("Amount", formatAmount(details.initial_values.amount, details.initial_values.currency));
                }
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
                 addPart("Details", details.reply_details);
                 addPart("Document stored", details.document_stored ? 'Yes' : null);
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
        try { return format(new Date(dateString), 'MMM dd, yyyy'); } catch { return ''; }
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
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-md flex items-center">
                <AlertCircle className="mr-2" size={20} />
                {error}
            </div>
        );
    }

    if (filteredEvents.length === 0) {
        return (
            <div className="bg-gray-50 border border-gray-200 text-gray-500 px-4 py-8 rounded-md text-center">
                <p>No lifecycle events found matching your filters.</p>
            </div>
        );
    }

    return (
        <div className="relative border-l-2 border-gray-200 pl-6 py-4">
            
            {/* --- FILTER BAR --- */}
            <div className="mb-6 bg-gray-50 p-4 rounded-xl border border-gray-200">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    
                    {/* Quick Filters (Flex wrap for responsive design) */}
                    <div className="flex flex-wrap gap-2">
                        <span className="text-sm font-semibold text-gray-500 uppercase tracking-wide mr-2 self-center hidden sm:inline">Quick Views:</span>
                        
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
                            className={`flex items-center px-4 py-2 text-sm font-medium rounded-full border shadow-sm transition-colors ${
                                activeFilterCount > 0 
                                    ? 'bg-blue-600 text-white border-blue-600 hover:bg-blue-700' 
                                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                            }`}
                        >
                            <Filter className="h-4 w-4 mr-2" />
                            Detailed Filter
                            {activeFilterCount > 0 && (
                                <span className="ml-2 bg-white text-blue-600 text-xs font-bold px-1.5 py-0.5 rounded-full">
                                    {activeFilterCount}
                                </span>
                            )}
                            <ChevronDown className="h-4 w-4 ml-2" />
                        </button>

                        {/* DROPDOWN CONTENT (Multi-Select & Date Range) */}
                        {isFilterMenuOpen && (
                            <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-xl border border-gray-200 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
                                {/* Date Range */}
                                <div className="p-4 border-b border-gray-100 bg-gray-50">
                                    <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2 flex items-center"><Calendar className="h-3 w-3 mr-1" />Date Range</h4>
                                    <div className="flex gap-2">
                                        <div className="flex-1"><input type="date" className="w-full text-sm border-gray-300 rounded-md shadow-sm" value={dateRange.from} onChange={(e) => setDateRange(prev => ({ ...prev, from: e.target.value }))} /></div>
                                        <span className="text-gray-400 self-center">-</span>
                                        <div className="flex-1"><input type="date" className="w-full text-sm border-gray-300 rounded-md shadow-sm" value={dateRange.to} onChange={(e) => setDateRange(prev => ({ ...prev, to: e.target.value }))} /></div>
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
                                                <div className="flex items-center px-2 py-2 hover:bg-gray-100 rounded cursor-pointer transition-colors" onClick={() => toggleCategory(category)}>
                                                    {allSelected ? <CheckSquare className="h-5 w-5 text-blue-600 mr-2" /> : someSelected ? <div className="h-5 w-5 bg-blue-600 mr-2 rounded flex items-center justify-center"><div className="h-0.5 w-3 bg-white" /></div> : <Square className="h-5 w-5 text-gray-400 mr-2" />}
                                                    <span className="text-sm font-semibold text-gray-800">{category}</span>
                                                </div>
                                                <div className="ml-9 mt-1 space-y-1 border-l-2 border-gray-100 pl-2">
                                                    {availableInCat.map(type => (
                                                        <div key={type} className="flex items-center cursor-pointer hover:text-blue-600 py-1" onClick={() => toggleFilter(type)}>
                                                            <div className={`w-4 h-4 rounded border mr-2 flex items-center justify-center ${selectedFilters.has(type) ? 'bg-blue-500 border-blue-500' : 'border-gray-300'}`}>{selectedFilters.has(type) && <Check className="h-3 w-3 text-white" />}</div>
                                                            <span className="text-sm text-gray-600 truncate">{formatActionTypeLabel(type)}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        );
                                    })}
                                    
                                    {/* --- NEW: Other Category (for unmapped events) --- */}
                                    {unmappedTypes.length > 0 && (
                                        <div className="mb-2">
                                            <div className="flex items-center px-2 py-2 hover:bg-gray-100 rounded cursor-pointer transition-colors" onClick={() => toggleFilter('Other_Unmapped')}>
                                                {selectedFilters.has('Other_Unmapped') ? <CheckSquare className="h-5 w-5 text-blue-600 mr-2" /> : <Square className="h-5 w-5 text-gray-400 mr-2" />}
                                                <span className="text-sm font-semibold text-gray-800">Other ({unmappedTypes.length})</span>
                                            </div>
                                            <div className="ml-9 mt-1 space-y-1 border-l-2 border-gray-100 pl-2">
                                                {unmappedTypes.map(type => (
                                                    <div key={type} className="flex items-center cursor-pointer hover:text-blue-600 py-1" onClick={() => toggleFilter('Other_Unmapped')}>
                                                        <div className={`w-4 h-4 rounded border mr-2 flex items-center justify-center ${selectedFilters.has('Other_Unmapped') ? 'bg-blue-500 border-blue-500' : 'border-gray-300'}`}>{selectedFilters.has('Other_Unmapped') && <Check className="h-3 w-3 text-white" />}</div>
                                                        <span className="text-sm text-gray-600 truncate">{formatActionTypeLabel(type)}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                </div>
                                
                                {/* Footer Actions */}
                                <div className="p-3 border-t border-gray-100 bg-gray-50 flex justify-between">
                                    <button className="text-sm text-blue-600 font-medium hover:underline" onClick={() => setSelectedFilters(new Set(availableTypes))}>Select All</button>
                                    <button className="text-sm text-gray-500 font-medium hover:underline" onClick={() => setSelectedFilters(new Set())}>Clear</button>
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

                const hasDeliveryDate = instruction && (instruction.delivery_date !== null && instruction.delivery_date !== "");
                const hasBankReplyDate = instruction && (instruction.bank_reply_date !== null && instruction.bank_reply_date !== "");
                const isReminderInstruction = instruction && instruction.instruction_type === 'LG_REMINDER_TO_BANKS';
                const hasBeenRemindedPreviously = hasReminderBeenSent(instruction?.id);

                const showSendReminderButtonForEndUser = !isCorporateAdminView && instruction && Number.isInteger(instruction.id) && (instruction.bank_reply_date === null || instruction.bank_reply_date === "") && !isReminderInstruction && isReminderApplicableByTime(instruction) && !hasBeenRemindedPreviously && !!onSendReminder;
                const showViewIssuedReminderButton = instruction && Number.isInteger(instruction.id) && (hasBeenRemindedPreviously || isReminderInstruction);
                
                const isLatestInstruction = latestCancellableInstruction && instruction?.id === latestCancellableInstruction.id;
                const isCancellableStatus = instruction?.status === 'Instruction Issued' || instruction?.status === 'Reminder Issued';
                const isCancellableType = ['LG_EXTENSION', 'LG_LIQUIDATION', 'LG_RELEASE', 'LG_DECREASE_AMOUNT', 'LG_ACTIVATE_NON_OPERATIVE'].includes(instruction?.instruction_type);
                const showAllActionButtons = instruction && instruction.generated_content_path;

                return (
                    <div key={eventItem.id || `event-${index}`} className="mb-8 relative">
                        {/* ORIGINAL ICON STYLE */}
                        <div className={`absolute -left-3.5 top-0 flex items-center justify-center w-7 h-7 rounded-full bg-white border-2 border-gray-200 shadow-sm ${styles.iconClass}`}>
                            {getEventIcon(eventItem.action_type)}
                        </div>
                        
                        {/* CARD STYLE (Fixed to apply system log background) */}
                        <div className={`${styles.cardClass} rounded-lg p-4 ml-4 border`}>
                            <div className="flex justify-between items-center mb-2">
                                <h3 className={`font-semibold text-lg ${styles.isSystem ? 'text-gray-700' : 'text-gray-800'}`}>{formatActionTypeLabel(eventItem.action_type)}</h3>
                                <span className="text-sm text-gray-500">
                                    {format(new Date(eventItem.timestamp), 'MMM dd, yyyy HH:mm')}
                                </span>
                            </div>
                            <p className="text-gray-700 mb-1">
                                <span className="font-medium">User:</span> {eventItem.user_email || 'System'}
                            </p>
                            
                            {/* DETAILS (NOW CLEAN) */}
                            <p className="text-gray-600 text-sm">
                                {formatEventDetails(eventItem.action_type, eventItem.details, eventItem.user_email)}
                            </p>

                            {instruction && (
                                <div className="mt-3 flex flex-wrap gap-2">
                                    {!isCorporateAdminView && !isGracePeriod && isLatestInstruction && isCancellableStatus && isCancellableType && (
                                        <GracePeriodTooltip isGracePeriod={isGracePeriod}>
                                            <button
                                                onClick={() => handleCancelInstruction(instruction)}
                                                className="inline-flex items-center px-3 py-1 text-sm font-medium rounded-md shadow-sm bg-red-100 text-red-700 hover:bg-red-200"
                                                title="Cancel Last Instruction"
                                                disabled={isGracePeriod}
                                            >
                                                <RotateCcw className="h-4 w-4 mr-2" />
                                                Cancel
                                            </button>
                                        </GracePeriodTooltip>
                                    )}

                                    {showAllActionButtons && (
                                        <>
                                            <button
                                                onClick={() => onViewInstructionLetter(instruction.id)}
                                                className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                                                title="View Instruction Letter"
                                            >
                                                <FileText className="h-4 w-4 mr-2" />
                                                View Letter
                                            </button>

                                            {/* --- ORIGINAL BUTTON STYLES PRESERVED --- */}
                                            
                                            {!isCorporateAdminView && !hasDeliveryDate ? (
                                                <GracePeriodTooltip isGracePeriod={isGracePeriod}>
                                                    <button
                                                        onClick={() => onRecordDelivery(instruction)}
                                                        className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md shadow-sm text-blue-600 bg-blue-100 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                                        title="Record Delivery"
                                                        disabled={isGracePeriod}
                                                    >
                                                        <Truck className="h-4 w-4 mr-2" />
                                                        Record Delivery
                                                    </button>
                                                </GracePeriodTooltip>
                                            ) : hasDeliveryDate ? (
                                                deliveryDoc ? (
                                                    <button
                                                        onClick={() => onViewInstructionDocument(deliveryDoc.id)}
                                                        className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md shadow-sm text-gray-700 bg-gray-100 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                                                        title={`View Delivery Evidence (${formatDateSimple(instruction.delivery_date)})`}
                                                    >
                                                        <Download className="h-4 w-4 mr-2" />
                                                        Delivery Evid.
                                                    </button>
                                                ) : (
                                                    <span className="inline-flex items-center px-3 py-1 text-xs font-medium text-gray-500 bg-gray-50 rounded-md">
                                                        Delivered {formatDateSimple(instruction.delivery_date)} (No Doc)
                                                    </span>
                                                )
                                            ) : (
                                                isCorporateAdminView && (
                                                    <span className="inline-flex items-center px-3 py-1 text-xs font-medium text-gray-500 bg-gray-50 rounded-md">
                                                        Delivery Not Recorded
                                                    </span>
                                                )
                                            )}

                                            {!isCorporateAdminView && !hasBankReplyDate ? (
                                                <GracePeriodTooltip isGracePeriod={isGracePeriod}>
                                                    <button
                                                        onClick={() => onRecordBankReply(instruction)}
                                                        className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md shadow-sm text-teal-600 bg-teal-100 hover:bg-teal-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500"
                                                        title="Record Bank Reply"
                                                        disabled={isGracePeriod}
                                                    >
                                                        <Building className="h-4 w-4 mr-2" />
                                                        Record Reply
                                                    </button>
                                                </GracePeriodTooltip>
                                            ) : hasBankReplyDate ? (
                                                bankReplyDoc ? (
                                                    <button
                                                        onClick={() => onViewInstructionDocument(bankReplyDoc.id)}
                                                        className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md shadow-sm text-gray-700 bg-gray-100 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                                                        title={`View Bank Reply (${formatDateSimple(instruction.bank_reply_date)})`}
                                                    >
                                                        <Download className="h-4 w-4 mr-2" />
                                                        Bank Reply Evid.
                                                    </button>
                                                ) : (
                                                    <span className="inline-flex items-center px-3 py-1 text-xs font-medium text-gray-500 bg-gray-50 rounded-md">
                                                        Replied {formatDateSimple(instruction.bank_reply_date)} (No Doc)
                                                    </span>
                                                )
                                            ) : (
                                                isCorporateAdminView && (
                                                    <span className="inline-flex items-center px-3 py-1 text-xs font-medium text-gray-500 bg-gray-50 rounded-md">
                                                        Bank Reply Not Recorded
                                                    </span>
                                                )
                                            )}

                                            {showSendReminderButtonForEndUser ? (
                                                <GracePeriodTooltip isGracePeriod={isGracePeriod}>
                                                    <button
                                                        onClick={() => handleSendReminderLocal(instruction.id, instruction.serial_number)}
                                                        className="inline-flex items-center px-3 py-1 text-sm font-medium rounded-md shadow-sm bg-orange-100 text-orange-700 hover:bg-orange-200"
                                                        title="Send Reminder to Bank"
                                                        disabled={isGracePeriod}
                                                    >
                                                        <Mail className="h-4 w-4 mr-1" /> Send Reminder
                                                    </button>
                                                </GracePeriodTooltip>
                                            ) : showViewIssuedReminderButton ? (
                                                <button
                                                    onClick={() => onViewInstructionLetter(instruction.id)}
                                                    className="inline-flex items-center px-3 py-1 text-sm font-medium rounded-md shadow-sm bg-yellow-100 text-yellow-800 hover:bg-yellow-200"
                                                    title="View Issued Reminder"
                                                >
                                                    <Eye className="h-4 w-4 mr-1" /> View Issued Reminder
                                                </button>
                                            ) : (
                                                showAllActionButtons && (
                                                    <span className="inline-flex items-center px-3 py-1 text-xs font-medium text-gray-500 bg-gray-50 rounded-md">
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
                    onClose={() => setShowCancelModal(false)}
                    onSuccess={fetchLifecycleHistoryAndConfig}
                    isGracePeriod={isGracePeriod}
                />
            )}
        </div>
    );
};

export default LGLifecycleHistoryComponent;