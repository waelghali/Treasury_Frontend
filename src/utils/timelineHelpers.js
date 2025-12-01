import { 
    differenceInDays, 
    parseISO, 
    format, 
    isAfter,
    isValid 
} from 'date-fns';
import {
    FileText, CheckCircle, AlertCircle, Clock, DollarSign,
    Briefcase, Truck, Building, Mail, User, PlayCircle,
    RotateCcw, Info, Repeat, Edit, FileMinus, MinusCircle, Users
} from 'lucide-react';

// Helper to format currency
const formatAmount = (amount, currencyCode) => {
    if (!amount || isNaN(parseFloat(amount))) return 'N/A';
    return `${currencyCode || ''} ${parseFloat(amount).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
};

// Helper to format dates (for Excel readability)
const formatDate = (dateString) => {
    if (!dateString) return '';
    try { 
        const dateObj = parseISO(dateString);
        return isValid(dateObj) ? format(dateObj, 'MMM dd, yyyy') : dateString; 
    } catch { 
        return dateString; 
    }
};

// ==========================================
// 1. Icon Helper (Existing - kept for completeness)
// ==========================================
export const getEventIcon = (actionType, size = 16) => {
    switch (actionType) {
        // --- Positive / Creation ---
        case 'LG_CREATED': return <FileText size={size} className="text-green-600" />;
        case 'LG_RELEASED': case 'APPROVAL_REQUEST_APPROVED': return <CheckCircle size={size} className="text-teal-600" />;
        case 'LG_ACTIVATED': return <PlayCircle size={size} className="text-teal-600" />;

        // --- Changes / Amendments ---
        case 'LG_EXTENDED': return <Repeat size={size} className="text-blue-600" />;
        case 'LG_AMENDED': case 'UPDATE': return <Briefcase size={size} className="text-purple-600" />;
        case 'LG_DECREASED_AMOUNT': return <MinusCircle size={size} className="text-orange-600" />;
        case 'LG_LIQUIDATED_FULL': case 'LG_LIQUIDATED_PARTIAL': return <FileMinus size={size} className="text-red-600" />;
        
        // --- Logistics ---
        case 'LG_INSTRUCTION_DELIVERED': 
        case 'LG_RECORD_DELIVERY':
            return <Truck size={size} className="text-indigo-600" />;
        case 'LG_BANK_REPLY_RECORDED': 
        case 'LG_RECORD_BANK_REPLY':
            return <Building size={size} className="text-gray-600" />;
        case 'LG_REMINDER_SENT_TO_BANK': 
        case 'LG_REMINDER_TO_BANKS':
            return <Mail size={size} className="text-yellow-600" />;
        
        // --- System/Admin ---
        case 'LG_OWNER_DETAILS_UPDATED': 
        case 'INTERNAL_OWNER_CHANGE':
            return <Users size={size} className="text-pink-600" />;
        case 'NOTIFICATION_SENT': 
        case 'NOTIFICATION_FAILED': 
            return <Mail size={size} className="text-blue-400" />;
        case 'APPROVAL_REQUEST_SUBMITTED':
            return <Clock size={size} className="text-blue-400" />;
        case 'MIGRATION_IMPORT_RECORD': 
            return <RotateCcw size={size} className="text-gray-400" />;

        default: return <Info size={size} className="text-gray-400" />;
    }
};

// ==========================================
// 2. Label Helper (Existing)
// ==========================================
export const formatActionTypeLabel = (type) => {
    if (!type) return 'Unknown Action';
    return type
        .replace(/_/g, ' ')
        .toLowerCase()
        .replace(/\b\w/g, c => c.toUpperCase())
        .replace(/\bLg\b/g, 'LG'); // Fix specific casing for LG
};

// ==========================================
// 3. NEW: Structured Export Details Extractor
// ==========================================
export const getExportDetails = (actionType, details) => {
    const data = {
        'Instruction Serial': details.instruction_serial || details.serial_number || details.original_instruction_serial || '',
        'Old Expiry Date': '',
        'New Expiry Date': '',
        'Old Amount': '',
        'New Amount': '',
        'Amount Change': '',
        'Delivery Date': '',
        'Bank Reply Date': '',
        'Notification Subject': '',
        'Notification Status': '',
    };

    const currencyCode = details.lg_currency || details.currency || '';

    if (actionType === 'LG_EXTENDED') {
        data['Old Expiry Date'] = formatDate(details.old_expiry_date);
        data['New Expiry Date'] = formatDate(details.new_expiry_date);
    } else if (actionType.includes('LIQUIDATED') || actionType === 'LG_DECREASED_AMOUNT') {
        data['Old Amount'] = formatAmount(details.old_amount, currencyCode);
        data['New Amount'] = formatAmount(details.new_amount, currencyCode);
        data['Amount Change'] = formatAmount(details.decrease_amount || details.liquidation_amount, currencyCode);
    } else if (actionType === 'LG_INSTRUCTION_DELIVERED' || actionType === 'LG_RECORD_DELIVERY') {
        data['Delivery Date'] = formatDate(details.delivery_date);
    } else if (actionType === 'LG_BANK_REPLY_RECORDED' || actionType === 'LG_RECORD_BANK_REPLY') {
        data['Bank Reply Date'] = formatDate(details.bank_reply_date);
    } else if (actionType.includes('NOTIFICATION')) {
        // Extract subject, handling missing or double-quoted keys from raw JSON
        data['Notification Subject'] = details.subject || details.reason || '';
        data['Notification Status'] = actionType.includes('FAILED') ? 'FAILED' : 'SENT';
    }

    return data;
};

// ==========================================
// 4. MODIFIED: The Logic Extractor (Simplified Notifications)
// ==========================================
export const formatEventDetails = (actionType, details) => {
    if (!details) return '';
    
    let detailString = '';

    switch (actionType) {
        case 'LG_CREATED':
            detailString = `Created LG for ${details.beneficiary || 'N/A'}. Amount: ${formatAmount(details.amount, details.currency)}.`;
            break;
        case 'LG_EXTENDED':
            detailString = `Extended expiry from ${formatDate(details.old_expiry_date)} to ${formatDate(details.new_expiry_date)}.`;
            break;
        case 'LG_RELEASED':
            detailString = `LG Released. Serial: ${details.instruction_serial || details.serial_number || 'N/A'}.`;
            break;
        case 'LG_LIQUIDATED_FULL':
        case 'LG_LIQUIDATED_PARTIAL':
            const currency = details.lg_currency || details.currency;
            detailString = `Liquidation (${details.liquidation_type || 'N/A'}). Amount: ${formatAmount(details.liquidation_amount, currency)}. New Total: ${formatAmount(details.new_amount, currency)}.`;
            break;
        case 'LG_DECREASED_AMOUNT':
            const curr = details.lg_currency || details.currency;
            detailString = `Decreased by ${formatAmount(details.decrease_amount, curr)}. New Total: ${formatAmount(details.new_amount, curr)}.`;
            break;
        case 'LG_INSTRUCTION_DELIVERED':
        case 'LG_RECORD_DELIVERY':
            detailString = `Instruction Delivered on ${formatDate(details.delivery_date)}. Serial: ${details.serial_number || 'N/A'}.`;
            break;
        case 'LG_BANK_REPLY_RECORDED':
        case 'LG_RECORD_BANK_REPLY':
            detailString = `Bank Replied on ${formatDate(details.bank_reply_date)}. Remarks: ${details.reply_details || 'None'}.`;
            break;
        case 'LG_REMINDER_SENT_TO_BANK':
            detailString = `Reminder sent for Instruction ${details.original_instruction_serial || 'N/A'}. Days overdue: ${details.days_overdue || 'N/A'}.`;
            break;
        case 'LG_OWNER_DETAILS_UPDATED':
        case 'INTERNAL_OWNER_CHANGE':
            detailString = `Owner changed from ${details.old_owner_email || 'N/A'} to ${details.new_owner_email || 'N/A'}.`;
            break;
        case 'LG_AMENDED':
            const changes = details.amended_fields || details.diff || details.changes;
            const changeList = changes ? Object.keys(changes).join(', ') : 'fields';
            detailString = `Amended ${changeList}. Reason: ${details.reason || 'N/A'}.`;
            break;
        case 'NOTIFICATION_SENT':
        case 'NOTIFICATION_FAILED':
            // SIMPLIFIED DESCRIPTION FOR EXPORT READABILITY
            const status = actionType === 'NOTIFICATION_SENT' ? 'SENT' : 'FAILED';
            detailString = `${status} notification: ${details.subject || details.reason || 'Unknown Subject/Reason'}.`;
            break;
        default:
             detailString = Object.entries(details)
                .filter(([_, v]) => typeof v !== 'object')
                .map(([k, v]) => `${k}: ${v}`).join(', ');
    }
    return detailString;
};

// ==========================================
// 5. Status Bar Logic (Refactored to date-fns)
// ==========================================
export const getExpiryBarProps = (lgRecord) => {
    const defaultProps = {
        barColorClass: 'bg-gray-200',
        fillColorClass: 'bg-gray-500',
        labelText: 'Status Unavailable',
        percentage: 100,
        indicatorColor: 'text-gray-800',
        glowShadow: 'none'
    };

    if (!lgRecord || !lgRecord.lg_status) {
        return defaultProps;
    }

    const statusName = lgRecord.lg_status.name;
    const expiryDate = lgRecord.expiry_date ? parseISO(lgRecord.expiry_date) : null;
    const issuanceDate = lgRecord.issuance_date ? parseISO(lgRecord.issuance_date) : null;
    const today = new Date();

    if (statusName === 'Valid' && expiryDate) {
        const remainingDays = differenceInDays(expiryDate, today);
        const CRITICAL_DAYS = 30;
        const MODERATE_DAYS = 60;

        let fillColor = '';
        let label = '';
        let calculatedPercentage = 0;
        let glowRgb = '';

        // Calculate ratios
        let completionRatio = 1;
        if (issuanceDate && isValid(issuanceDate)) {
             const totalDuration = differenceInDays(expiryDate, issuanceDate);
             const elapsedDays = differenceInDays(today, issuanceDate);
             completionRatio = totalDuration > 0 ? elapsedDays / totalDuration : 1;
        }

        if (remainingDays <= 0) {
            fillColor = 'bg-red-500';
            label = 'Expired';
            calculatedPercentage = 100;
        } else if (remainingDays <= CRITICAL_DAYS) {
            fillColor = 'bg-red-500';
            label = `${remainingDays} days remaining (Critical)`;
            calculatedPercentage = completionRatio * 100;
        } else if (remainingDays <= MODERATE_DAYS) {
            fillColor = 'bg-orange-500';
            label = `${remainingDays} days remaining (Approaching expiry)`;
            calculatedPercentage = completionRatio * 100;
        } else {
            // GREEN BAR: Percentage represents ELAPSED time
            fillColor = 'bg-green-500';
            label = `${remainingDays} days remaining`;
            calculatedPercentage = completionRatio * 100;
        }

        const getRgbFromTailwind = (colorClass) => {
            switch (colorClass) {
                case 'bg-green-500': return '59, 201, 107';
                case 'bg-orange-500': return '255, 165, 0';
                case 'bg-red-500': return '239, 68, 68';
                default: return '255, 255, 255';
            }
        };

        glowRgb = getRgbFromTailwind(fillColor);
        const glowShadow = `0 0 8px rgba(${glowRgb}, 0.7), 0 0 15px rgba(${glowRgb}, 0.4)`;

        return {
            barColorClass: 'bg-gray-200',
            fillColorClass: fillColor,
            labelText: label,
            percentage: Math.min(100, Math.max(0, calculatedPercentage)),
            indicatorColor: 'text-gray-800',
            glowShadow: glowShadow
        };
    } else {
        // Non-Valid Statuses (Released, Liquidated, etc)
        let barFillColor = '';
        if (statusName === 'Expired') barFillColor = 'bg-red-500';
        else if (statusName === 'Released') barFillColor = 'bg-gray-500';
        else if (statusName === 'Liquidated') barFillColor = 'bg-purple-500';
        else barFillColor = 'bg-gray-500';

        // Helper for glow
        const getRgbFromTailwind = (c) => {
            if (c.includes('red')) return '239, 68, 68';
            if (c.includes('purple')) return '168, 85, 247';
            return '107, 114, 128'; // gray
        };
        const barGlowRgb = getRgbFromTailwind(barFillColor);

        return {
            barColorClass: 'bg-gray-200',
            fillColorClass: barFillColor,
            labelText: statusName,
            percentage: 100,
            indicatorColor: 'text-gray-800',
            glowShadow: `0 0 8px rgba(${barGlowRgb}, 0.7), 0 0 15px rgba(${barGlowRgb}, 0.4)`
        };
    }
};

export const getDaysRemaining = (lgRecord) => {
    if (!lgRecord?.expiry_date) return null;
    return differenceInDays(parseISO(lgRecord.expiry_date), new Date());
};