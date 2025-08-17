import { CheckCircle, Repeat, Edit, FileMinus, MinusCircle, Truck, Building, Mail, Clock, AlertCircle, Info, Users } from 'lucide-react';
import moment from 'moment';

/**
 * Returns the appropriate Lucide icon for a given action type.
 * @param {string} actionType - The type of action from the backend.
 * @param {string} size - The size of the icon (e.g., '20').
 * @returns {JSX.Element} The Lucide icon component.
 */
export const getEventIcon = (actionType, size = '20') => {
    switch (actionType) {
        case 'LG_CREATED':
        case 'APPROVAL_REQUEST_APPROVED':
        case 'LG_RELEASED':
        case 'LG_ACTIVATED':
            return <CheckCircle size={size} />;
        case 'LG_EXTENDED':
            return <Repeat size={size} />;
        case 'LG_AMENDED':
        case 'UPDATE':
            return <Edit size={size} />;
        case 'LG_LIQUIDATED_FULL':
        case 'LG_LIQUIDATED_PARTIAL':
            return <FileMinus size={size} />;
        case 'LG_DECREASED_AMOUNT':
            return <MinusCircle size={size} />;
        case 'LG_INSTRUCTION_DELIVERED':
            return <Truck size={size} />;
        case 'LG_BANK_REPLY_RECORDED':
            return <Building size={size} />;
        case 'LG_REMINDER_SENT_TO_BANK':
        case 'LG_REMINDER_TO_BANKS':
            return <Mail size={size} />;
        case 'APPROVAL_REQUEST_SUBMITTED':
            return <Clock size={size} />;
        case 'APPROVAL_REQUEST_REJECTED':
        case 'NOTIFICATION_FAILED':
            return <AlertCircle size={size} />;
        case 'INTERNAL_OWNER_CHANGE':
            return <Users size={size} />;
        default:
            return <Info size={size} />;
    }
};

/**
 * Formats an action type string into a human-readable label.
 * @param {string} actionType - The action type string.
 * @returns {string} The formatted label.
 */
export const formatActionTypeLabel = (actionType) => {
    if (!actionType) return '';
    return actionType.replace(/_/g, ' ').split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ');
};

/**
 * Calculates and returns props for the expiry status bar.
 * @param {object} lgRecord - The LG record object.
 * @returns {object} Props for the status bar.
 */
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
    const expiryDate = moment(lgRecord.expiry_date);
    const today = moment();

    if (statusName === 'Valid') {
        const remainingDays = expiryDate.diff(today, 'days');
        const CRITICAL_DAYS = 30;
        const MODERATE_DAYS = 60;

        let fillColor = '';
        let label = '';
        let calculatedPercentage = 0;
        let glowRgb = '';
        const issuanceDate = moment(lgRecord.issuance_date);
        const totalDuration = expiryDate.diff(issuanceDate, 'days');
        const elapsedDays = today.diff(issuanceDate, 'days');
        const completionRatio = totalDuration > 0 ? elapsedDays / totalDuration : 1;

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
            // GREEN BAR: The count-down scenario. Percentage represents REAMAINING time.
            fillColor = 'bg-green-500';
            label = `${remainingDays} days remaining`;
            calculatedPercentage = (1 - completionRatio) * 100;
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
        let barFillColor = '';
        let barGlowRgb = '';
        if (statusName === 'Expired') {
            barFillColor = 'bg-red-500';
        } else if (statusName === 'Released') {
            barFillColor = 'bg-gray-500';
        } else if (statusName === 'Liquidated') {
            barFillColor = 'bg-purple-500';
        } else {
            barFillColor = 'bg-gray-500';
        }
        const getRgbFromTailwind = (colorClass) => {
            switch (colorClass) {
                case 'bg-green-500': return '59, 201, 107';
                case 'bg-orange-500': return '255, 165, 0';
                case 'bg-red-500': return '239, 68, 68';
                case 'bg-gray-500': return '107, 114, 128';
                case 'bg-purple-500': return '168, 85, 247';
                default: return '255, 255, 255';
            }
        };
        barGlowRgb = getRgbFromTailwind(barFillColor);
        const glowShadow = `0 0 8px rgba(${barGlowRgb}, 0.7), 0 0 15px rgba(${barGlowRgb}, 0.4)`;

        return {
            barColorClass: 'bg-gray-200',
            fillColorClass: barFillColor,
            labelText: statusName,
            percentage: 100,
            indicatorColor: 'text-gray-800',
            glowShadow: glowShadow
        };
    }
};

/**
 * Calculates remaining days until expiry.
 * @param {object} lgRecord - The LG record.
 * @returns {number|null} Days remaining, or null if invalid.
 */
export const getDaysRemaining = (lgRecord) => {
    if (!lgRecord?.expiry_date) return null;
    const expiryDate = moment(lgRecord.expiry_date);
    const today = moment();
    const remainingDays = expiryDate.diff(today, 'days');
    return remainingDays;
};