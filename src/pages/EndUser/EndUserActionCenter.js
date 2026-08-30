// frontend/src/pages/EndUser/EndUserActionCenter.js
import React, { useState, useEffect, useCallback } from 'react';
import { apiRequest, API_BASE_URL, getAuthToken } from '../../services/apiService';
import { 
    Loader2, AlertCircle, Clock, FileText, Repeat, CalendarPlus, 
    Truck, Building, Mail, Printer, CheckCircle2, ArrowRight, Eye, ChevronDown, ChevronUp,
    ClipboardCheck, Wrench
} from 'lucide-react';
import { toast } from 'react-toastify';
import moment from 'moment';
import { useNavigate } from 'react-router-dom';

import ExtendLGModal from '../../components/Modals/ExtendLGModal';
import RecordDeliveryModal from '../../components/Modals/RecordDeliveryModal';
import RecordBankReplyModal from '../../components/Modals/RecordBankReplyModal';
import BulkRemindersModal from '../../components/Modals/BulkRemindersModal';
import RunAutoRenewalModal from '../../components/Modals/RunAutoRenewalModal';

// --- UI COMPONENTS ---
const GracePeriodTooltip = ({ children, isGracePeriod }) => {
    if (!isGracePeriod) return children;
    return (
        <div className="relative group inline-flex flex-col items-center">
            {children}
            <div className="absolute bottom-full mb-2 hidden group-hover:flex flex-col items-center z-50 w-64">
                <div className="bg-gray-900 text-white text-xs rounded shadow-lg p-3 text-center leading-relaxed">
                    Subscription Grace Period Active. <br/> This action is temporarily restricted.
                </div>
                <div className="w-3 h-3 -mt-2 rotate-45 bg-gray-900"></div>
            </div>
        </div>
    );
};

const EmptyState = ({ icon: Icon, title, description }) => (
    <div className="flex flex-col items-center justify-center py-8 px-4 text-center border-2 border-dashed border-gray-200 rounded-xl bg-gray-50/50">
        <div className="bg-white p-3 rounded-full shadow-sm mb-3">
            <Icon className="h-6 w-6 text-gray-400" />
        </div>
        <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
        <p className="text-sm text-gray-500 max-w-sm mt-1">{description}</p>
    </div>
);

const StatCard = ({ title, count, icon: Icon, colorClass, bgClass, onClick }) => (
    <div 
        onClick={onClick}
        className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between transition-all duration-200 hover:shadow-md cursor-pointer hover:-translate-y-1 group select-none"
    >
        <div>
            <p className="text-sm font-medium text-gray-500 mb-1 group-hover:text-gray-700 transition-colors">{title}</p>
            <h3 className="text-2xl font-bold text-gray-900">{count}</h3>
        </div>
        <div className={`p-3 rounded-lg ${bgClass} group-hover:scale-110 transition-transform duration-200`}>
            <Icon className={`h-6 w-6 ${colorClass}`} />
        </div>
    </div>
);

const StatusBadge = ({ children, type }) => {
    let classes = "bg-gray-100 text-gray-800"; 
    if (type === 'critical') classes = "bg-red-100 text-red-700 border border-red-200";
    if (type === 'warning') classes = "bg-orange-100 text-orange-800 border border-orange-200";
    if (type === 'success') classes = "bg-green-100 text-green-700 border border-green-200";
    if (type === 'neutral') classes = "bg-gray-100 text-gray-600 border border-gray-200";

    return (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${classes}`}>
            {children}
        </span>
    );
};

// --- MAIN COMPONENT ---

function EndUserActionCenter({ isGracePeriod, isCorporateAdminView = false }) {
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    // Subscription module flags (decoded from JWT)
    const [hasIssuanceModule, setHasIssuanceModule] = useState(false);
    const [hasCustodyModule, setHasCustodyModule] = useState(true); // default true for backward compat
    
    const [lgRenewalList, setLgRenewalList] = useState([]);
    const [instructionsUndelivered, setInstructionsUndelivered] = useState([]);
    const [instructionsNoReply, setInstructionsNoReply] = useState([]);
    const [approvedPendingPrints, setApprovedPendingPrints] = useState([]);

	// Accordion States
    const [isPrintingOpen, setIsPrintingOpen] = useState(true);
    const [isRenewalsOpen, setIsRenewalsOpen] = useState(true);
    const [isDeliveryOpen, setIsDeliveryOpen] = useState(true);
    const [isRepliesOpen, setIsRepliesOpen] = useState(true);

    // Issuance Module Data (module-gated — only populated if subscribed)
    const [issuanceApprovedRequests, setIssuanceApprovedRequests] = useState([]);
    const [issuanceApprovedMaintenance, setIssuanceApprovedMaintenance] = useState([]);
    const [issuanceApproachingExpiry, setIssuanceApproachingExpiry] = useState([]);
    const [isApprovedRequestsOpen, setIsApprovedRequestsOpen] = useState(true);
    const [isApprovedMaintenanceOpen, setIsApprovedMaintenanceOpen] = useState(true);
    const [isIssuanceApproachingExpiryOpen, setIsIssuanceApproachingExpiryOpen] = useState(true);

    // Modal States
    const [showExtendModal, setShowExtendModal] = useState(false);
    const [selectedLgRecordForExtend, setSelectedLgRecordForExtend] = useState(null);
    const [showRecordDeliveryModal, setShowRecordDeliveryModal] = useState(false);
    const [selectedInstructionForDelivery, setSelectedInstructionForDelivery] = useState(null);
    const [showRecordBankReplyModal, setShowRecordBankReplyModal] = useState(false);
    const [selectedInstructionForReply, setSelectedInstructionForReply] = useState(null);
    const [showBulkRemindersModal, setShowBulkRemindersModal] = useState(false);
    const [showRunAutoRenewalModal, setShowRunAutoRenewalModal] = useState(false);

    const scrollToSection = (id) => {
        const element = document.getElementById(id);
        if (element) {
            // Scroll within the closest scrollable ancestor (the <main> element)
            // instead of using scrollIntoView which can shift the entire viewport
            // and displace the sidebar on some browsers (Edge).
            const scrollParent = element.closest('main') || element.closest('[class*="overflow-y"]');
            if (scrollParent) {
                const offset = element.offsetTop - scrollParent.offsetTop - 24; // 24px top padding
                scrollParent.scrollTo({ top: offset, behavior: 'smooth' });
            } else {
                element.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        }
    };

    const formatActionTypeLabel = useCallback((actionType) => {
        if (!actionType) return '';
        return actionType.replace(/_/g, ' ').split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ');
    }, []);

    const formatAmount = (amount, currencyCode) => {
        if (amount === null || currencyCode === null || currencyCode === undefined || isNaN(parseFloat(amount))) return 'N/A';
        try {
            return `${currencyCode} ${parseFloat(amount).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
        } catch (e) {
            return `${currencyCode} ${parseFloat(amount).toFixed(2)}`;
        }
    };

    const formatDate = (dateString) => dateString ? moment(dateString).format('DD-MMM-YYYY') : 'N/A';

    const getUrgencyStatus = (days, type) => {
        if (type === 'expiry') {
            if (days <= 0) return 'critical';
            if (days <= 30) return 'warning';
            return 'success';
        }
        if (type === 'undelivered') {
            if (days > 7) return 'critical';
            if (days > 3) return 'warning';
            return 'neutral';
        }
        return 'neutral';
    };

    // --- API Interactions ---

    const handleViewLetter = useCallback(async (instructionId, lgNumber = 'N/A') => {
        if (!instructionId) return toast.error('Instruction ID is missing.');
        try {
            if (!isCorporateAdminView) {
                await apiRequest(`/end-user/lg-records/instructions/${instructionId}/mark-as-accessed-for-print`, 'POST');
            }
            toast.success(`Opening letter for LG ${lgNumber}...`);
            const authToken = getAuthToken();
            let letterUrl = `${API_BASE_URL}/end-user/lg-records/instructions/${instructionId}/view-letter`;
            if (authToken) letterUrl += `?token=${authToken}&print=true`;
            window.open(letterUrl, '_blank');
        } catch (error) {
            console.error(error);
            toast.error(`Error opening letter: ${error.message}`);
        }
    }, [isCorporateAdminView]);

    const fetchAllActionCenterData = useCallback(async (isBackground = false) => {
        if (!isBackground) setIsLoading(true);
        setError('');
        try {
            // FIX: Explicitly define URLs because naming conventions differ between endpoints
            const urls = {
                renewal: isCorporateAdminView 
                    ? '/corporate-admin/action-center/lg-for-renewal' 
                    : '/end-user/action-center/lg-for-renewal',
                
                undelivered: isCorporateAdminView 
                    ? '/corporate-admin/action-center/instructions/undelivered' 
                    : '/end-user/action-center/instructions-undelivered', // Note: dash vs slash
                
                awaitingReply: isCorporateAdminView 
                    ? '/corporate-admin/action-center/instructions/awaiting-reply' 
                    : '/end-user/action-center/instructions-awaiting-reply', // Note: dash vs slash
                
                pendingPrint: isCorporateAdminView 
                    ? '/corporate-admin/action-center/requests/pending-print' 
                    : '/end-user/action-center/approved-requests-pending-print' // Note: completely different name
            };

            // Fetch custody data + issuance unified data in parallel (silent catch for issuance — module may not be subscribed)
            const [renewal, undelivered, noReply, pendingPrints, maintPendingPrints,
                   issUnifiedDelivery, issUnifiedBankReply,
                   issApprovedReqs, issApprovedMaint, issExpiry] = await Promise.all([
                apiRequest(urls.renewal, 'GET'),
                apiRequest(urls.undelivered, 'GET'),
                apiRequest(urls.awaitingReply, 'GET'),
                apiRequest(urls.pendingPrint, 'GET'),
                apiRequest('/issuance/maintenance/pending-print', 'GET').catch(() => []),
                // Unified issuance action center
                apiRequest('/issuance/action-center/unified-pending-delivery', 'GET').catch(() => []),
                apiRequest('/issuance/action-center/unified-pending-bank-reply', 'GET').catch(() => []),
                apiRequest('/issuance/action-center/approved-requests', 'GET').catch(() => []),
                apiRequest('/issuance/action-center/approved-maintenance', 'GET').catch(() => []),
                apiRequest('/issuance/action-center/approaching-expiry?days_threshold=30', 'GET').catch(() => []),
            ]);
            
            // Merge custody + issuance maintenance pending prints into one list
            const normalizedMaint = (maintPendingPrints || []).map(m => ({
                ...m,
                _source: 'issuance_maintenance',
                _display_lg_number: m.lg_ref_number || 'N/A',
                _display_serial: m.letter_serial_number || '',
                _display_action_type: m.action_type,
                _display_date: m.executed_at || m.created_at,
            }));
            const normalizedCustody = (pendingPrints || []).map(p => ({
                ...p,
                _source: 'custody',
                _display_lg_number: p.lg_record?.lg_number || 'N/A',
                _display_serial: p.related_instruction?.serial_number || '',
                _display_action_type: p.action_type,
                _display_date: p.updated_at,
            }));

            // Merge issuance pending-delivery into custody undelivered
            const normalizedIssDelivery = (issUnifiedDelivery || []).map(d => ({
                ...d,
                _source: d.source === 'maintenance' ? 'issuance_maintenance' : 'issuance_lg',
                _issuance: true,
            }));

            // Merge issuance pending-bank-reply into custody awaiting-reply
            const normalizedIssBankReply = (issUnifiedBankReply || []).map(r => ({
                ...r,
                _source: r.source === 'maintenance' ? 'issuance_maintenance' : 'issuance_lg',
                _issuance: true,
            }));
            
            setLgRenewalList(renewal);
            setInstructionsUndelivered([...(undelivered || []).map(u => ({ ...u, _issuance: false })), ...normalizedIssDelivery]);
            setInstructionsNoReply([...(noReply || []).map(r => ({ ...r, _issuance: false })), ...normalizedIssBankReply]);
            setApprovedPendingPrints([...normalizedCustody, ...normalizedMaint]);

            // Module-gated issuance sections
            setIssuanceApprovedRequests(issApprovedReqs || []);
            setIssuanceApprovedMaintenance(issApprovedMaint || []);
            setIssuanceApproachingExpiry(issExpiry || []); 
        } catch (err) {
            console.error(err);
            setError(`Failed to load tasks: ${err.message}`);
        } finally {
            if (!isBackground) setIsLoading(false);
        }
    }, [isCorporateAdminView]);

    const handleActionSuccess = useCallback((updatedRecord = null, latestInstructionId = null) => {
        setShowExtendModal(false); setSelectedLgRecordForExtend(null);
        setShowRecordDeliveryModal(false); setSelectedInstructionForDelivery(null);
        setShowRecordBankReplyModal(false); setSelectedInstructionForReply(null);
        setShowBulkRemindersModal(false); setShowRunAutoRenewalModal(false);
        
        fetchAllActionCenterData(true); 

        if (latestInstructionId) {
            const lgNumber = selectedLgRecordForExtend?.lg_number || 'N/A';
            setTimeout(() => handleViewLetter(latestInstructionId, lgNumber), 100);
        }
    }, [fetchAllActionCenterData, selectedLgRecordForExtend, handleViewLetter]);

    useEffect(() => {
        // Decode module flags from JWT
        try {
            const token = localStorage.getItem('jwt_token');
            if (token) {
                const payload = JSON.parse(atob(token.split('.')[1]));
                setHasIssuanceModule(!!payload.has_issuance_module);
                // has_custody_module defaults true in token (see SecurityPy), treat undefined as true
                setHasCustodyModule(payload.has_custody_module !== false);
            }
        } catch (e) { /* ignore */ }
        fetchAllActionCenterData();
    }, [fetchAllActionCenterData]);

    const handleViewDetails = (lgRecordId) => {
        const path = isCorporateAdminView 
            ? `/corporate-admin/lg-records/${lgRecordId}` 
            : `/end-user/lg-records/${lgRecordId}`;
        navigate(path);
    };

    const handlePrintApprovedLetter = async (instructionId, lgNumber) => {
        if (isGracePeriod) return toast.warn("Subscription Grace Period: Action disabled.");
        await handleViewLetter(instructionId, lgNumber);
        fetchAllActionCenterData(true);
    };

    const handlePrintMaintenanceLetter = async (actionId) => {
        if (isGracePeriod) return toast.warn("Subscription Grace Period: Action disabled.");
        try {
            const blob = await apiRequest(`/issuance/maintenance/${actionId}/document/letter`, 'GET', null, 'application/json', 'blob');
            const url = window.URL.createObjectURL(blob);
            window.open(url, '_blank');
            // Mark as printed
            await apiRequest(`/issuance/maintenance/${actionId}/mark-printed`, 'POST').catch(() => {});
            toast.success('Letter opened for printing.');
            fetchAllActionCenterData(true);
        } catch (err) {
            console.error(err);
            toast.error(`Failed to open letter: ${err.message}`);
        }
    };

    const handleSendReminder = async (instructionId, serialNumber) => {
        if (isGracePeriod) return toast.warn("Subscription Grace Period: Action disabled.");
        try {
            const authToken = getAuthToken();
            if (!authToken) return toast.error("Authentication required.");
            const response = await apiRequest(`/end-user/lg-records/instructions/${instructionId}/send-reminder-to-bank`, 'POST', null, 'application/json', 'text');
            if (response) {
                const newWindow = window.open('', '_blank');
                if (newWindow) {
                    newWindow.document.write(response);
                    newWindow.document.close();
                    toast.info(`Reminder generated for #${serialNumber}.`);
                    setTimeout(() => fetchAllActionCenterData(true), 1000);
                } else {
                    toast.error("Popup blocked.");
                }
            } else {
                toast.error("Server returned no content.");
            }
        } catch (error) {
            console.error(error);
            toast.error(`Failed to send reminder: ${error.message}`);
        }
    };

    // --- RENDER ---

    return (
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 max-w-7xl">
            
            {/* Header Section */}
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-gray-900">
                    Action Center {isCorporateAdminView && <span className="text-sm font-normal text-gray-500 ml-2">(Read Only)</span>}
                </h1>
                <p className="mt-1 text-sm text-gray-500">Overview of pending tasks, renewals, and bank communications.</p>
            </div>

            {error && (
                <div className="mb-6 bg-red-50 border-l-4 border-red-500 p-4 rounded-r-md flex items-start">
                    <AlertCircle className="h-5 w-5 text-red-500 mr-3 mt-0.5" />
                    <div>
                        <h3 className="text-sm font-medium text-red-800">Error loading data</h3>
                        <p className="text-sm text-red-700 mt-1">{error}</p>
                    </div>
                </div>
            )}

            {isLoading ? (
                <div className="flex flex-col justify-center items-center py-20">
                    <Loader2 className="animate-spin h-10 w-10 text-indigo-600 mb-4" />
                    <p className="text-gray-500 font-medium">Synchronizing with records...</p>
                </div>
            ) : (
                <>
                    {/* Stats Dashboard — module-aware */}
                    <div className={`grid grid-cols-1 md:grid-cols-2 gap-6 mb-10 ${
                        (hasIssuanceModule && hasCustodyModule) ? 'lg:grid-cols-5' : 'lg:grid-cols-4'
                    }`}>
                        <StatCard 
                            title="Pending Prints" 
                            count={approvedPendingPrints.length} 
                            icon={Printer} 
                            bgClass="bg-purple-100" 
                            colorClass="text-purple-600"
                            onClick={() => scrollToSection('section-printing')}
                        />
                        {/* Pending Issuances — issuance module only, shown BEFORE Due Renewals */}
                        {hasIssuanceModule && (
                            <StatCard 
                                title="Pending Issuances" 
                                count={issuanceApprovedRequests.length} 
                                icon={ClipboardCheck} 
                                bgClass="bg-green-100" 
                                colorClass="text-green-600"
                                onClick={() => scrollToSection('section-iss-approved-req')}
                            />
                        )}
                        {/* Due Renewals — custody module only */}
                        {hasCustodyModule && (
                            <StatCard 
                                title="Due Renewals" 
                                count={lgRenewalList.length} 
                                icon={Clock} 
                                bgClass="bg-orange-100" 
                                colorClass="text-orange-600"
                                onClick={() => scrollToSection('section-renewals')}
                            />
                        )}
                        <StatCard 
                            title="Awaiting Delivery" 
                            count={instructionsUndelivered.length} 
                            icon={Truck} 
                            bgClass="bg-blue-100" 
                            colorClass="text-blue-600" 
                            onClick={() => scrollToSection('section-delivery')}
                        />
                        <StatCard 
                            title="Bank Replies" 
                            count={instructionsNoReply.length} 
                            icon={Building} 
                            bgClass="bg-teal-100" 
                            colorClass="text-teal-600" 
                            onClick={() => scrollToSection('section-replies')}
                        />
                    </div>

                    <div className="space-y-10">
         {/* 1. Printing Section */}
<div id="section-printing" className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden scroll-mt-24">
    {/* Header: Consistent Flex Layout */}
    <div 
        className="px-6 py-4 border-b border-gray-100 flex items-center bg-gray-50/50 cursor-pointer gap-4"
        onClick={() => setIsPrintingOpen(!isPrintingOpen)}
    >
        <div className="flex items-center space-x-3 flex-1">
            <div className="p-2 bg-purple-100 rounded-lg">
                <Printer className="h-5 w-5 text-purple-600" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900 flex-1">Approved Requests Pending Print</h2>
        </div>

        {/* Bulk Print Action */}
        {!isCorporateAdminView && approvedPendingPrints.length > 0 && (
            <div className="flex-shrink-0">
                <GracePeriodTooltip isGracePeriod={isGracePeriod}>
                    <button 
                        onClick={(e) => {
                            e.stopPropagation(); 
                            toast.info("Bulk Print functionality coming soon!");
                        }}
                        disabled={isGracePeriod}
                        className={`inline-flex items-center justify-center px-4 py-2 text-sm font-medium rounded-lg text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 transition-all active:scale-95 ${isGracePeriod ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                        <Printer className="h-4 w-4 mr-2" /> Bulk Print
                    </button>
                </GracePeriodTooltip>
            </div>
        )}

        {/* Chevron always last */}
        {isPrintingOpen ? <ChevronUp className="h-6 w-6 text-gray-400 flex-shrink-0" /> : <ChevronDown className="h-6 w-6 text-gray-400 flex-shrink-0" />}
    </div>
    
    {/* Content: Conditional rendering based on isPrintingOpen */}
    {isPrintingOpen && (
        approvedPendingPrints.length === 0 ? (
            <EmptyState icon={CheckCircle2} title="All Caught Up" description="No approved requests are waiting to be printed." />
        ) : (
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">LG Number</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Type & Maker</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Approval Date</th>
                            {!isCorporateAdminView && <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Action</th>}
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {approvedPendingPrints.map((req) => {
                            const isMaint = req._source === 'issuance_maintenance';
                            return (
                            <tr key={`${req._source || 'custody'}-${req.id}`} className="hover:bg-gray-50 transition-colors">
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <span className="text-sm font-bold text-indigo-600">
                                        {req._display_lg_number}
                                    </span>
                                    <div className="text-xs text-gray-500 mt-0.5">
                                        {isMaint ? `Instruction: ${req._display_serial}` : `Ref: ${req._display_serial}`}
                                    </div>
                                    {isMaint && <span className="inline-block mt-1 text-[10px] px-1.5 py-0.5 bg-violet-100 text-violet-700 rounded font-medium">Issuance</span>}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="text-sm font-medium text-gray-900">{formatActionTypeLabel(req._display_action_type)}</div>
                                    <div className="text-xs text-gray-500">{isMaint ? '' : (req.maker_user?.email || '')}</div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatDate(req._display_date)}</td>
                                {!isCorporateAdminView && (
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                                        <GracePeriodTooltip isGracePeriod={isGracePeriod}>
                                            <button 
                                                onClick={(e) => { 
                                                    e.stopPropagation();
                                                    if (isMaint) {
                                                        handlePrintMaintenanceLetter(req.id);
                                                    } else {
                                                        req.related_instruction?.id && req.lg_record?.lg_number ? handlePrintApprovedLetter(req.related_instruction.id, req.lg_record.lg_number) : toast.error("Data missing.");
                                                    }
                                                }}
                                                disabled={isGracePeriod}
                                                className={`inline-flex items-center px-3 py-1.5 border border-purple-200 text-sm font-medium rounded-md text-purple-700 bg-purple-50 hover:bg-purple-100 transition-all active:scale-95 ${isGracePeriod ? 'opacity-50 cursor-not-allowed' : ''}`}
                                            >
                                                <Printer className="h-4 w-4 mr-1.5" /> Print Letter
                                            </button>
                                        </GracePeriodTooltip>
                                    </td>
                                )}
                            </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        )
    )}
</div>

{/* 2. Renewals Section — custody module only */}
{hasCustodyModule && <div id="section-renewals" className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden scroll-mt-24">
    {/* Header: Consistent Flex Layout */}
    <div 
        className="px-6 py-4 border-b border-gray-100 flex items-center bg-gray-50/50 cursor-pointer gap-4"
        onClick={() => setIsRenewalsOpen(!isRenewalsOpen)}
    >
        <div className="flex items-center space-x-3 flex-1">
            <div className="p-2 bg-orange-100 rounded-lg">
                <Clock className="h-5 w-5 text-orange-600" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900 flex-1">Approaching Expiry / Renewal</h2>
        </div>

        {!isCorporateAdminView && (
            <div className="flex-shrink-0">
                <GracePeriodTooltip isGracePeriod={isGracePeriod}>
                    <button 
                        onClick={(e) => {
                            e.stopPropagation();
                            setShowRunAutoRenewalModal(true);
                        }}
                        disabled={isGracePeriod}
                        className={`inline-flex items-center justify-center px-4 py-2 text-sm font-medium rounded-lg text-white bg-orange-600 hover:bg-orange-700 shadow-sm transition-all active:scale-95 ${isGracePeriod ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                        <Repeat className="h-4 w-4 mr-2" /> Auto Renewal
                    </button>
                </GracePeriodTooltip>
            </div>
        )}

        {/* Chevron always last */}
        {isRenewalsOpen ? <ChevronUp className="h-6 w-6 text-gray-400 flex-shrink-0" /> : <ChevronDown className="h-6 w-6 text-gray-400 flex-shrink-0" />}
    </div>

    {/* Content: Conditional based on isRenewalsOpen */}
    {isRenewalsOpen && (
        lgRenewalList.length === 0 ? (
            <EmptyState icon={CheckCircle2} title="No Immediate Risks" description="There are no LGs approaching expiry or requiring renewal." />
        ) : (
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">LG Details</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Expiry</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                            {!isCorporateAdminView && <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Action</th>}
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {lgRenewalList.map((lg) => {
                            const daysLeft = moment(lg.expiry_date).diff(moment(), 'days');
                            const urgencyStatus = getUrgencyStatus(daysLeft, 'expiry');
                            return (
                                <tr key={lg.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <button 
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleViewDetails(lg.id);
                                            }}
                                            className="text-sm font-bold text-indigo-600 hover:text-indigo-900 hover:underline block"
                                        >
                                            {lg.lg_number}
                                        </button>
                                        <span className="text-xs text-gray-500">{lg.issuer_name || 'N/A'}</span>
                                        <div className="text-xs font-medium text-gray-700 mt-1">
                                            {formatAmount(lg.lg_amount, lg.lg_currency?.iso_code)}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{formatDate(lg.expiry_date)}</td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <StatusBadge type={urgencyStatus}>{daysLeft} Days Left</StatusBadge>
                                    </td>
                                    {!isCorporateAdminView && (
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                                            <GracePeriodTooltip isGracePeriod={isGracePeriod}>
                                                <button 
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        if (!isGracePeriod) { 
                                                            setSelectedLgRecordForExtend(lg); 
                                                            setShowExtendModal(true); 
                                                        } else { 
                                                            toast.warn("Action disabled during grace period."); 
                                                        }
                                                    }}
                                                    disabled={isGracePeriod}
                                                    className={`inline-flex items-center px-3 py-1.5 border border-indigo-200 text-sm font-medium rounded-md text-indigo-700 bg-indigo-50 hover:bg-indigo-100 transition-all active:scale-95 ${isGracePeriod ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                >
                                                    <CalendarPlus className="h-4 w-4 mr-1.5" /> Renew
                                                </button>
                                            </GracePeriodTooltip>
                                        </td>
                                    )}
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        )
    )}
</div>}

{/* 3. Delivery Confirmation Section */}
<div id="section-delivery" className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden scroll-mt-24">
    {/* Header: Clickable to toggle */}
    <div 
        className="px-6 py-4 border-b border-gray-100 flex items-center bg-gray-50/50 cursor-pointer gap-4"
        onClick={() => setIsDeliveryOpen(!isDeliveryOpen)}
    >
        <div className="p-2 bg-blue-100 rounded-lg">
            <Truck className="h-5 w-5 text-blue-600" />
        </div>
        <h2 className="text-lg font-semibold text-gray-900 flex-1">Awaiting Delivery Confirmation</h2>
        {/* Chevron always last */}
        {isDeliveryOpen ? <ChevronUp className="h-6 w-6 text-gray-400 flex-shrink-0" /> : <ChevronDown className="h-6 w-6 text-gray-400 flex-shrink-0" />}
    </div>

    {/* Content: Conditional based on isDeliveryOpen */}
    {isDeliveryOpen && (
        instructionsUndelivered.length === 0 ? (
            <EmptyState icon={CheckCircle2} title="Deliveries Up to Date" description="All dispatched instructions have been marked as delivered." />
        ) : (
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Instruction</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Dates</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Delay</th>
                            {!isCorporateAdminView && <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Action</th>}
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {instructionsUndelivered.map((inst, idx) => {
                            const isIss = inst._issuance;
                            const lgNum = isIss ? (inst.lg_number || '—') : (inst.lg_record?.lg_number || '—');
                            const lgId = isIss ? null : inst.lg_record?.id;
                            const issLgId = isIss ? (inst._source === 'issuance_maintenance' ? inst.issued_lg_id : inst.id) : null;
                            const actionLabel = isIss ? formatActionTypeLabel(inst.action_type) : formatActionTypeLabel(inst.instruction_type);
                            const serialNum = isIss ? (inst.serial_number || '') : inst.serial_number;
                            const issuedDate = isIss ? inst.created_at : inst.instruction_date;
                            const daysStuck = Math.round(moment().diff(moment(issuedDate), 'days', true));
                            const urgencyStatus = getUrgencyStatus(daysStuck, 'undelivered');
                            return (
                                <tr key={`${isIss ? 'iss' : 'cust'}-${inst.id}-${idx}`} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center">
                                            <FileText className="h-4 w-4 text-gray-400 mr-2" />
                                            {lgId ? (
                                                <button onClick={(e) => { e.stopPropagation(); handleViewDetails(lgId); }} className="text-sm font-bold text-indigo-600 hover:underline">{lgNum}</button>
                                            ) : issLgId ? (
                                                <button onClick={(e) => { e.stopPropagation(); navigate(isCorporateAdminView ? '/corporate-admin/issuance/issued-lgs' : '/end-user/issuance/issued-lgs', { state: { openLgId: issLgId } }); }} className="text-sm font-bold text-indigo-600 hover:underline">{lgNum}</button>
                                            ) : (
                                                <span className="text-sm font-bold text-gray-900">{lgNum}</span>
                                            )}
                                        </div>
                                        <div className="text-xs text-gray-500 mt-1 ml-6">{actionLabel} {serialNum && `#${serialNum}`}</div>
                                        {isIss && <span className={`inline-block mt-1 ml-6 text-[10px] px-1.5 py-0.5 rounded font-medium ${inst._source === 'issuance_maintenance' ? 'bg-violet-100 text-violet-700' : 'bg-indigo-100 text-indigo-700'}`}>{inst._source === 'issuance_maintenance' ? 'Maintenance' : 'Issuance'}</span>}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">Created: {formatDate(issuedDate)}</td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <StatusBadge type={urgencyStatus}>{daysStuck} Days Pending</StatusBadge>
                                    </td>
                                    {!isCorporateAdminView && (
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                                            <GracePeriodTooltip isGracePeriod={isGracePeriod}>
                                                    <button 
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            if (!isGracePeriod) { 
                                                                setSelectedInstructionForDelivery(inst); 
                                                                setShowRecordDeliveryModal(true); 
                                                            } else { 
                                                                toast.warn("Action disabled during grace period."); 
                                                            }
                                                        }}
                                                        disabled={isGracePeriod}
                                                        className={`inline-flex items-center px-3 py-1.5 border border-blue-200 text-sm font-medium rounded-md text-blue-700 bg-blue-50 hover:bg-blue-100 transition-all active:scale-95 ${isGracePeriod ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                    >
                                                        <CheckCircle2 className="h-4 w-4 mr-1.5" /> Confirm Delivery
                                                    </button>
                                                </GracePeriodTooltip>
                                        </td>
                                    )}
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        )
    )}
</div>
{/* 4. Awaiting Reply Section */}
<div id="section-replies" className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden scroll-mt-24">
    {/* Header: Clickable to toggle */}
    <div 
        className="px-6 py-4 border-b border-gray-100 flex items-center bg-gray-50/50 cursor-pointer gap-4"
        onClick={() => setIsRepliesOpen(!isRepliesOpen)}
    >
        <div className="flex items-center space-x-3 flex-1">
            <div className="p-2 bg-teal-100 rounded-lg">
                <Building className="h-5 w-5 text-teal-600" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900 flex-1">Awaiting Bank Reply</h2>
        </div>

        {!isCorporateAdminView && (
            <div className="flex-shrink-0">
                <GracePeriodTooltip isGracePeriod={isGracePeriod}>
                    <button 
                        onClick={(e) => {
                            e.stopPropagation();
                            setShowBulkRemindersModal(true);
                        }}
                        disabled={isGracePeriod}
                        className={`inline-flex items-center justify-center px-4 py-2 text-sm font-medium rounded-lg text-teal-700 bg-teal-50 hover:bg-teal-100 border border-teal-200 transition-all active:scale-95 ${isGracePeriod ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                        <Mail className="h-4 w-4 mr-2" /> Bulk Reminders
                    </button>
                </GracePeriodTooltip>
            </div>
        )}

        {/* Chevron always last */}
        {isRepliesOpen ? <ChevronUp className="h-6 w-6 text-gray-400 flex-shrink-0" /> : <ChevronDown className="h-6 w-6 text-gray-400 flex-shrink-0" />}
    </div>

    {/* Content: Conditional based on isRepliesOpen */}
    {isRepliesOpen && (
        instructionsNoReply.length === 0 ? (
            <EmptyState icon={CheckCircle2} title="No Pending Replies" description="The bank has responded to all your instructions." />
        ) : (
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">LG Number</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Instruction</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Timeline</th>
                            {!isCorporateAdminView && <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>}
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {instructionsNoReply.map((inst, idx) => {
                            const isIss = inst._issuance;
                            const lgNum = isIss ? (inst.lg_number || 'N/A') : (inst.lg_record?.lg_number || 'N/A');
                            const lgId = isIss ? null : inst.lg_record?.id;
                            const issLgId = isIss ? (inst._source === 'issuance_maintenance' ? inst.issued_lg_id : inst.id) : null;
                            const actionLabel = isIss ? formatActionTypeLabel(inst.action_type) : formatActionTypeLabel(inst.instruction_type);
                            const serialNum = isIss ? (inst.serial_number || '') : inst.serial_number;
                            const delivDate = inst.delivery_date;
                            return (
                            <tr key={`${isIss ? 'iss' : 'cust'}-${inst.id}-${idx}`} className="hover:bg-gray-50 transition-colors">
                                <td className="px-6 py-4 whitespace-nowrap">
                                    {lgId ? (
                                        <button onClick={(e) => { e.stopPropagation(); handleViewDetails(lgId); }} className="text-sm font-bold text-indigo-600 hover:underline">{lgNum}</button>
                                    ) : issLgId ? (
                                        <button onClick={(e) => { e.stopPropagation(); navigate(isCorporateAdminView ? '/corporate-admin/issuance/issued-lgs' : '/end-user/issuance/issued-lgs', { state: { openLgId: issLgId } }); }} className="text-sm font-bold text-indigo-600 hover:underline">{lgNum}</button>
                                    ) : (
                                        <span className="text-sm font-bold text-gray-900">{lgNum}</span>
                                    )}
                                    {isIss && <span className={`inline-block ml-2 text-[10px] px-1.5 py-0.5 rounded font-medium ${inst._source === 'issuance_maintenance' ? 'bg-violet-100 text-violet-700' : 'bg-indigo-100 text-indigo-700'}`}>{inst._source === 'issuance_maintenance' ? 'Maint.' : 'Issuance'}</span>}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="text-sm text-gray-900">{actionLabel}</div>
                                    {serialNum && <div className="text-xs text-gray-500">#{serialNum}</div>}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="text-xs text-gray-500 flex flex-col space-y-1">
                                        {delivDate && (
                                            <span className="text-green-600 flex items-center">
                                                <CheckCircle2 className="w-3 h-3 mr-1"/> Delivered: {formatDate(delivDate)}
                                            </span>
                                        )}
                                        {isIss && inst.days_waiting != null && (
                                            <StatusBadge type={inst.days_waiting > 7 ? 'critical' : inst.days_waiting > 3 ? 'warning' : 'neutral'}>{inst.days_waiting} Days Waiting</StatusBadge>
                                        )}
                                    </div>
                                </td>
                                {!isCorporateAdminView && (
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                                        <GracePeriodTooltip isGracePeriod={isGracePeriod}>
                                                <button 
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        if (!isGracePeriod) { 
                                                            setSelectedInstructionForReply(inst); 
                                                            setShowRecordBankReplyModal(true); 
                                                        } else { 
                                                            toast.warn("Action disabled during grace period."); 
                                                        }
                                                    }}
                                                    disabled={isGracePeriod}
                                                    className={`inline-flex items-center px-3 py-1.5 border border-green-200 text-sm font-medium rounded-md text-green-700 bg-green-50 hover:bg-green-100 transition-all active:scale-95 ${isGracePeriod ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                >
                                                    <ArrowRight className="h-4 w-4 mr-1.5" /> Record Reply
                                                </button>
                                            </GracePeriodTooltip>
                                            
                                            {!isIss && (
                                            <>
                                            {inst.has_reminder_sent ? (
                                                <button 
                                                    onClick={(e) => { e.stopPropagation(); handleViewLetter(inst.id, inst.lg_record?.lg_number || 'N/A'); }}
                                                    className="inline-flex items-center px-3 py-1.5 border border-yellow-200 text-sm font-medium rounded-md text-yellow-700 bg-yellow-50 hover:bg-yellow-100 transition-all active:scale-95"
                                                >
                                                    <Eye className="h-4 w-4 mr-1.5" /> View Reminder
                                                </button>
                                            ) : (
                                                <GracePeriodTooltip isGracePeriod={isGracePeriod}>
                                                    <button 
                                                        onClick={(e) => { e.stopPropagation(); handleSendReminder(inst.id, inst.serial_number); }}
                                                        disabled={isGracePeriod}
                                                        className={`inline-flex items-center px-3 py-1.5 border border-gray-200 text-sm font-medium rounded-md text-gray-700 bg-gray-50 hover:bg-gray-100 transition-all active:scale-95 ${isGracePeriod ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                    >
                                                        <Mail className="h-4 w-4 mr-1.5" /> Remind
                                                    </button>
                                                </GracePeriodTooltip>
                                            )}
                                            </>
                                            )}
                                    </td>
                                )}
                            </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        )
    )}
</div>

{/* ============== ISSUANCE MODULE SECTIONS (module-gated) ============== */}
{(issuanceApprovedRequests.length > 0 || issuanceApprovedMaintenance.length > 0 || issuanceApproachingExpiry.length > 0) && (
    <>
    {/* Section Divider */}
    <div className="flex items-center gap-3 mt-6 mb-2">
        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-indigo-300 to-transparent" />
        <span className="text-xs font-semibold uppercase tracking-wider text-indigo-500">LG Issuance Actions</span>
        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-indigo-300 to-transparent" />
    </div>

    {/* Issuance: Approved Requests Ready to Process */}
    {issuanceApprovedRequests.length > 0 && (
        <div id="section-iss-approved-req" className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden scroll-mt-24">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center bg-gray-50/50 cursor-pointer gap-4"
                 onClick={() => setIsApprovedRequestsOpen(!isApprovedRequestsOpen)}>
                <div className="flex items-center space-x-3 flex-1">
                    <div className="p-2 bg-green-100 rounded-lg"><ClipboardCheck className="h-5 w-5 text-green-600" /></div>
                    <h2 className="text-lg font-semibold text-gray-900 flex-1">Approved Requests — Ready to Process ({issuanceApprovedRequests.length})</h2>
                </div>
                {isApprovedRequestsOpen ? <ChevronUp className="h-6 w-6 text-gray-400" /> : <ChevronDown className="h-6 w-6 text-gray-400" />}
            </div>
            {isApprovedRequestsOpen && (
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Serial #</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Beneficiary</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Department</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Approved</th>
                                {!isCorporateAdminView && <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Action</th>}
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {issuanceApprovedRequests.map(r => (
                                <tr key={r.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => navigate(isCorporateAdminView ? '/corporate-admin/issuance/requests' : '/end-user/issuance/requests', { state: { openRequestId: r.id } })}>
                                    <td className="px-6 py-4 text-sm font-bold text-indigo-600">{r.serial_number}</td>
                                    <td className="px-6 py-4 text-sm text-gray-700">{r.beneficiary_name || '—'}</td>
                                    <td className="px-6 py-4 text-sm text-gray-600">{r.department || '—'}</td>
                                    <td className="px-6 py-4 text-sm text-gray-500">{formatDate(r.approved_at)}</td>
                                    {!isCorporateAdminView && (
                                        <td className="px-6 py-4 text-right" onClick={e => e.stopPropagation()}>
                                            <button onClick={() => navigate(isCorporateAdminView ? '/corporate-admin/issuance/requests' : '/end-user/issuance/requests', { state: { openRequestId: r.id } })}
                                                className="inline-flex items-center px-3 py-1.5 border border-green-200 text-sm font-medium rounded-md text-green-700 bg-green-50 hover:bg-green-100 transition-all active:scale-95">
                                                <ArrowRight className="h-4 w-4 mr-1.5" /> Process
                                            </button>
                                        </td>
                                    )}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    )}

    {/* Issuance: Approved Maintenance Ready to Execute */}
    {issuanceApprovedMaintenance.length > 0 && (
        <div id="section-iss-approved-maint" className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden scroll-mt-24">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center bg-gray-50/50 cursor-pointer gap-4"
                 onClick={() => setIsApprovedMaintenanceOpen(!isApprovedMaintenanceOpen)}>
                <div className="flex items-center space-x-3 flex-1">
                    <div className="p-2 bg-rose-100 rounded-lg"><Wrench className="h-5 w-5 text-rose-600" /></div>
                    <h2 className="text-lg font-semibold text-gray-900 flex-1">Approved Maintenance — Ready to Execute ({issuanceApprovedMaintenance.length})</h2>
                </div>
                {isApprovedMaintenanceOpen ? <ChevronUp className="h-6 w-6 text-gray-400" /> : <ChevronDown className="h-6 w-6 text-gray-400" />}
            </div>
            {isApprovedMaintenanceOpen && (
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">LG Number</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action Type</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Beneficiary</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Approved</th>
                                {!isCorporateAdminView && <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Action</th>}
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {issuanceApprovedMaintenance.map(a => (
                                <tr key={a.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{a.lg_number || '—'}</td>
                                    <td className="px-6 py-4 text-sm text-gray-600">{formatActionTypeLabel(a.action_type)}</td>
                                    <td className="px-6 py-4 text-sm text-gray-600">{a.beneficiary || '—'}</td>
                                    <td className="px-6 py-4 text-sm text-gray-500">{formatDate(a.approved_at)}</td>
                                    {!isCorporateAdminView && (
                                        <td className="px-6 py-4 text-right">
                                            <button onClick={() => navigate(isCorporateAdminView ? '/corporate-admin/issuance/issued-lgs' : '/end-user/issuance/issued-lgs', { state: { openLgNumber: a.lg_number, actionId: a.id } })}
                                                className="inline-flex items-center px-3 py-1.5 border border-rose-200 text-sm font-medium rounded-md text-rose-700 bg-rose-50 hover:bg-rose-100 transition-all active:scale-95">
                                                <ArrowRight className="h-4 w-4 mr-1.5" /> Execute
                                            </button>
                                        </td>
                                    )}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    )}

    {/* Issuance: Approaching Expiry */}
    {issuanceApproachingExpiry.length > 0 && (
        <div id="section-iss-expiry" className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden scroll-mt-24">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center bg-gray-50/50 cursor-pointer gap-4"
                 onClick={() => setIsIssuanceApproachingExpiryOpen(!isIssuanceApproachingExpiryOpen)}>
                <div className="flex items-center space-x-3 flex-1">
                    <div className="p-2 bg-amber-100 rounded-lg"><AlertCircle className="h-5 w-5 text-amber-600" /></div>
                    <h2 className="text-lg font-semibold text-gray-900 flex-1">Issuance — Approaching Expiry ({issuanceApproachingExpiry.length})</h2>
                </div>
                {isIssuanceApproachingExpiryOpen ? <ChevronUp className="h-6 w-6 text-gray-400" /> : <ChevronDown className="h-6 w-6 text-gray-400" />}
            </div>
            {isIssuanceApproachingExpiryOpen && (
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">LG Number</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Beneficiary</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Expiry Date</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Days Left</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Suggestion</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {issuanceApproachingExpiry.map(lg => (
                                <tr key={lg.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{lg.lg_number || '—'}</td>
                                    <td className="px-6 py-4 text-sm text-gray-600">{lg.beneficiary_name || '—'}</td>
                                    <td className="px-6 py-4 text-sm text-gray-600">{lg.amount ? `${lg.currency || ''} ${parseFloat(lg.amount).toLocaleString()}` : '—'}</td>
                                    <td className="px-6 py-4 text-sm text-gray-600">{formatDate(lg.bank_lg_expiry_date)}</td>
                                    <td className="px-6 py-4 text-sm">
                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                            lg.days_to_expiry <= 7 ? 'bg-red-100 text-red-700' :
                                            lg.days_to_expiry <= 14 ? 'bg-amber-100 text-amber-700' :
                                            'bg-green-100 text-green-700'
                                        }`}>{lg.days_to_expiry} days</span>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-indigo-600">{lg.suggestion}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    )}
    </>
)}

{/* Modals - Only render if NOT corporate admin view */}
{!isCorporateAdminView && (
    <>
        {showExtendModal && selectedLgRecordForExtend && (
            <ExtendLGModal
                lgRecord={selectedLgRecordForExtend}
                onClose={() => setShowExtendModal(false)}
                onSuccess={handleActionSuccess}
                isGracePeriod={isGracePeriod}
            />
        )}
        {showRecordDeliveryModal && selectedInstructionForDelivery && (
            <RecordDeliveryModal
                instruction={selectedInstructionForDelivery}
                onClose={() => setShowRecordDeliveryModal(false)}
                onSuccess={handleActionSuccess}
                isGracePeriod={isGracePeriod}
                apiUrl={selectedInstructionForDelivery._issuance
                    ? selectedInstructionForDelivery._source === 'issuance_maintenance'
                        ? `/issuance/lg-records/${selectedInstructionForDelivery.issued_lg_id}/record-delivery`
                        : `/issuance/lg-records/${selectedInstructionForDelivery.id}/record-delivery`
                    : undefined}
            />
        )}
        {showRecordBankReplyModal && selectedInstructionForReply && (
            <RecordBankReplyModal
                instruction={selectedInstructionForReply}
                onClose={() => setShowRecordBankReplyModal(false)}
                onSuccess={handleActionSuccess}
                isGracePeriod={isGracePeriod}
                apiUrl={selectedInstructionForReply._issuance ? `/issuance/maintenance/${selectedInstructionForReply.id}/bank-reply` : undefined}
            />
        )}
        {showBulkRemindersModal && (
            <BulkRemindersModal
                onClose={() => setShowBulkRemindersModal(false)}
                onSuccess={handleActionSuccess}
                isGracePeriod={isGracePeriod}
            />
        )}
        {showRunAutoRenewalModal && (
            <RunAutoRenewalModal
                onClose={() => setShowRunAutoRenewalModal(false)}
                onSuccess={handleActionSuccess}
                isGracePeriod={isGracePeriod}
            />
        )}
    </>
)}
        </div> 
    </> 
)}
</div> 
    );
};

export default EndUserActionCenter;