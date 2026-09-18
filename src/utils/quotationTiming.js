/**
 * Institutional Quotation Status & Timing Resolver
 * Accurately determines whether an RFQ is Scheduled, Upcoming, Imminent, Live, or Window Closed
 * based on rfq.window_start, rfq.window_end, and rfq.status.
 */

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export const formatRfqDateTime = (d) => {
    if (!d) return '—';
    try {
        const date = new Date(d);
        if (isNaN(date.getTime())) return String(d);
        const day = String(date.getDate()).padStart(2, '0');
        const month = MONTHS[date.getMonth()];
        const year = date.getFullYear();
        const time = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        return `${day} ${month} ${year}, ${time}`;
    } catch {
        return String(d);
    }
};

export const formatRfqDate = (d) => {
    if (!d) return '—';
    try {
        const date = new Date(d);
        if (isNaN(date.getTime())) return String(d);
        const day = String(date.getDate()).padStart(2, '0');
        const month = MONTHS[date.getMonth()];
        const year = date.getFullYear();
        return `${day} ${month} ${year}`;
    } catch {
        return String(d);
    }
};

export function getRfqTimingState(rfq) {
    if (!rfq) {
        return {
            badge: '—',
            label: '—',
            counterpartyLabel: '—',
            style: 'bg-gray-100 text-gray-600',
            isLive: false,
            isScheduled: false
        };
    }

    // 1. Explicit / Non-temporal statuses take absolute precedence
    if (rfq.status === 'PENDING_APPROVAL') {
        return {
            badge: 'PENDING_APPROVAL',
            label: 'Needs Approval',
            counterpartyLabel: 'Pending Approval',
            style: 'bg-orange-100 text-orange-700',
            isLive: false,
            isScheduled: false
        };
    }
    if (rfq.status === 'NEEDS_REVISION') {
        return {
            badge: 'NEEDS_REVISION',
            label: 'Needs Revision',
            counterpartyLabel: 'Returned for Revision',
            style: 'bg-amber-100 text-amber-900 border border-amber-300',
            isLive: false,
            isScheduled: false
        };
    }
    if (rfq.status === 'CANCEL_REQUESTED') {
        return {
            badge: 'CANCEL_REQUESTED',
            label: 'Cancel Requested',
            counterpartyLabel: 'Cancellation Requested',
            style: 'bg-rose-100 text-rose-800 border border-rose-300 animate-pulse',
            isLive: false,
            isScheduled: false
        };
    }
    if (rfq.status === 'CANCELLED') {
        return {
            badge: 'CANCELLED',
            label: 'Withdrawn / Cancelled',
            counterpartyLabel: 'Quotation Cancelled',
            style: 'bg-gray-200 text-gray-700',
            isLive: false,
            isScheduled: false
        };
    }
    if (rfq.status === 'REJECTED') {
        return {
            badge: 'REJECTED',
            label: 'Rejected',
            counterpartyLabel: 'Rejected',
            style: 'bg-red-100 text-red-700',
            isLive: false,
            isScheduled: false
        };
    }
    if (rfq.status === 'EXPIRED') {
        return {
            badge: 'EXPIRED',
            label: 'Expired',
            counterpartyLabel: 'Window Expired',
            style: 'bg-gray-100 text-gray-500',
            isLive: false,
            isScheduled: false
        };
    }
    if (rfq.status === 'COMPLETED' || rfq.status === 'TRADED') {
        return {
            badge: 'COMPLETED',
            label: 'Completed',
            counterpartyLabel: rfq.winner_bank_name ? `@ ${typeof rfq.winner_rate === 'number' ? rfq.winner_rate.toFixed(4) : rfq.winner_rate}` : 'Trade Finalized',
            style: 'bg-emerald-100 text-emerald-800',
            isLive: false,
            isScheduled: false
        };
    }

    // 2. Temporal calculation against window_start and window_end
    const now = Date.now();
    const start = rfq.window_start ? new Date(rfq.window_start).getTime() : null;
    const end = rfq.window_end ? new Date(rfq.window_end).getTime() : null;

    // A. Future Window: SCHEDULED / UPCOMING / IMMINENT
    if (start && now < start) {
        const diffMs = start - now;
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffDays = Math.floor(diffHours / 24);

        if (diffDays >= 1) {
            return {
                badge: 'SCHEDULED',
                label: `Scheduled (${diffDays}d)`,
                counterpartyLabel: `Starts ${formatRfqDate(rfq.window_start)}`,
                style: 'bg-blue-50 text-blue-700 border border-blue-200',
                isLive: false,
                isScheduled: true
            };
        } else if (diffHours >= 2) {
            return {
                badge: 'UPCOMING',
                label: `Starts in ${diffHours}h`,
                counterpartyLabel: `Starts in ${diffHours}h`,
                style: 'bg-indigo-50 text-indigo-700 border border-indigo-200',
                isLive: false,
                isScheduled: true
            };
        } else {
            const diffMins = Math.max(1, Math.floor(diffMs / (1000 * 60)));
            return {
                badge: 'IMMINENT',
                label: `Starts in ${diffMins}m`,
                counterpartyLabel: `Opens in ${diffMins}m`,
                style: 'bg-amber-100 text-amber-900 border border-amber-300 font-bold',
                isLive: false,
                isScheduled: true
            };
        }
    }

    // B. Active Window: LIVE BIDDING (Strictly between window_start and window_end)
    if (start && end && now >= start && now <= end) {
        return {
            badge: 'LIVE',
            label: 'Live',
            counterpartyLabel: '• Live Bidding',
            style: 'bg-emerald-600 text-white font-bold animate-pulse shadow-xs',
            isLive: true,
            isScheduled: false
        };
    }

    // C. Past Window: EVALUATING / WINDOW CLOSED
    if (end && now > end) {
        return {
            badge: 'WINDOW_CLOSED',
            label: 'Window Closed',
            counterpartyLabel: 'Evaluating quotes...',
            style: 'bg-purple-50 text-purple-700 border border-purple-200',
            isLive: false,
            isScheduled: false
        };
    }

    // Fallback if dates are missing
    return {
        badge: rfq.status || 'PENDING',
        label: rfq.status || 'Pending',
        counterpartyLabel: 'Awaiting Bidding',
        style: 'bg-gray-100 text-gray-600',
        isLive: false,
        isScheduled: false
    };
}
