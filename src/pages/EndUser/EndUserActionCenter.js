// frontend/src/pages/EndUser/EndUserActionCenter.js
import React, { useState, useEffect, useCallback } from 'react';
import { apiRequest, API_BASE_URL, getAuthToken } from '../../services/apiService';
import { 
    Loader2, AlertCircle, Clock, FileText, Repeat, CalendarPlus, 
    Truck, Building, Mail, Printer, Eye, CheckCircle2, ArrowRight 
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
    let classes = "bg-gray-100 text-gray-800"; // Default
    
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

function EndUserActionCenter({ isGracePeriod }) {
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    
    const [lgRenewalList, setLgRenewalList] = useState([]);
    const [instructionsUndelivered, setInstructionsUndelivered] = useState([]);
    const [instructionsNoReply, setInstructionsNoReply] = useState([]);
    const [approvedPendingPrints, setApprovedPendingPrints] = useState([]);

    // Modal States
    const [showExtendModal, setShowExtendModal] = useState(false);
    const [selectedLgRecordForExtend, setSelectedLgRecordForExtend] = useState(null);
    const [showRecordDeliveryModal, setShowRecordDeliveryModal] = useState(false);
    const [selectedInstructionForDelivery, setSelectedInstructionForDelivery] = useState(null);
    const [showRecordBankReplyModal, setShowRecordBankReplyModal] = useState(false);
    const [selectedInstructionForReply, setSelectedInstructionForReply] = useState(null);
    const [showBulkRemindersModal, setShowBulkRemindersModal] = useState(false);
    const [showRunAutoRenewalModal, setShowRunAutoRenewalModal] = useState(false);

    // --- Helpers ---

    const scrollToSection = (id) => {
        const element = document.getElementById(id);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'start' });
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
            await apiRequest(`/end-user/lg-records/instructions/${instructionId}/mark-as-accessed-for-print`, 'POST');
            toast.success(`Opening letter for LG ${lgNumber}...`);
            const authToken = getAuthToken();
            let letterUrl = `${API_BASE_URL}/end-user/lg-records/instructions/${instructionId}/view-letter`;
            if (authToken) letterUrl += `?token=${authToken}&print=true`;
            window.open(letterUrl, '_blank');
        } catch (error) {
            console.error(error);
            toast.error(`Error opening letter: ${error.message}`);
        }
    }, []);

    // UPDATED: Added isBackground parameter (default false)
    // If true, we do NOT set isLoading, preserving the user's scroll position
    const fetchAllActionCenterData = useCallback(async (isBackground = false) => {
        if (!isBackground) setIsLoading(true);
        setError('');
        try {
            const [renewal, undelivered, noReply, pendingPrints] = await Promise.all([
                apiRequest('/end-user/action-center/lg-for-renewal', 'GET'),
                apiRequest('/end-user/action-center/instructions-undelivered', 'GET'),
                apiRequest('/end-user/action-center/instructions-awaiting-reply', 'GET'),
                apiRequest('/end-user/action-center/approved-requests-pending-print', 'GET')
            ]);
            setLgRenewalList(renewal);
            setInstructionsUndelivered(undelivered);
            setInstructionsNoReply(noReply);
            setApprovedPendingPrints(pendingPrints);
        } catch (err) {
            console.error(err);
            setError(`Failed to load tasks: ${err.message}`);
        } finally {
            if (!isBackground) setIsLoading(false);
        }
    }, []);

    const handleActionSuccess = useCallback((updatedRecord = null, latestInstructionId = null) => {
        setShowExtendModal(false); setSelectedLgRecordForExtend(null);
        setShowRecordDeliveryModal(false); setSelectedInstructionForDelivery(null);
        setShowRecordBankReplyModal(false); setSelectedInstructionForReply(null);
        setShowBulkRemindersModal(false); setShowRunAutoRenewalModal(false);
        
        // UPDATED: Pass true to background refresh without spinner
        fetchAllActionCenterData(true); 

        if (latestInstructionId) {
            const lgNumber = selectedLgRecordForExtend?.lg_number || 'N/A';
            setTimeout(() => handleViewLetter(latestInstructionId, lgNumber), 100);
        }
    }, [fetchAllActionCenterData, selectedLgRecordForExtend, handleViewLetter]);

    useEffect(() => {
        // Initial load: isBackground is undefined/false, so we show spinner
        fetchAllActionCenterData();
    }, [fetchAllActionCenterData]);

    const handleViewDetails = (lgRecordId) => navigate(`/end-user/lg-records/${lgRecordId}`);

    const handlePrintApprovedLetter = async (instructionId, lgNumber) => {
        if (isGracePeriod) return toast.warn("Subscription Grace Period: Action disabled.");
        await handleViewLetter(instructionId, lgNumber);
        // UPDATED: Background refresh
        fetchAllActionCenterData(true);
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
                    // UPDATED: Background refresh
                    setTimeout(() => fetchAllActionCenterData(true), 1000);
                } else {
                    toast.error("Popup blocked.");
                }
            } else {
                toast.error("Server returned no content.");
            }
        } catch (error) {
            console.error(error);
            if (error.message && error.message.includes("Unexpected token '<'")) {
                toast.error("Server error. Please try again.");
            } else {
                toast.error(`Failed to send reminder: ${error.message}`);
            }
        }
    };

    // --- RENDER ---

    return (
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 max-w-7xl">
            
            {/* Header Section */}
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-gray-900">Action Center</h1>
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
                    {/* Stats Dashboard */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
                        <StatCard 
                            title="Pending Prints" 
                            count={approvedPendingPrints.length} 
                            icon={Printer} 
                            bgClass="bg-purple-100" 
                            colorClass="text-purple-600"
                            onClick={() => scrollToSection('section-printing')}
                        />
                        <StatCard 
                            title="Due Renewals" 
                            count={lgRenewalList.length} 
                            icon={Clock} 
                            bgClass="bg-orange-100" 
                            colorClass="text-orange-600"
                            onClick={() => scrollToSection('section-renewals')}
                        />
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
                            <div className="px-6 py-4 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-center bg-gray-50/50">
                                <div className="flex items-center space-x-2">
                                    <div className="p-2 bg-purple-100 rounded-lg"><Printer className="h-5 w-5 text-purple-600" /></div>
                                    <h2 className="text-lg font-semibold text-gray-900">Approved Requests Pending Print</h2>
                                </div>
                                {approvedPendingPrints.length > 0 && (
                                    <GracePeriodTooltip isGracePeriod={isGracePeriod}>
                                        <button 
                                            onClick={() => toast.info("Bulk Print functionality coming soon!")}
                                            disabled={isGracePeriod}
                                            className={`mt-2 sm:mt-0 inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg text-purple-700 bg-purple-50 hover:bg-purple-100 transition-colors active:scale-95 ${isGracePeriod ? 'opacity-50 cursor-not-allowed' : ''}`}
                                        >
                                            <Printer className="h-4 w-4 mr-2" /> Bulk Print
                                        </button>
                                    </GracePeriodTooltip>
                                )}
                            </div>
                            
                            {approvedPendingPrints.length === 0 ? (
                                <EmptyState icon={CheckCircle2} title="All Caught Up" description="No approved requests are waiting to be printed." />
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="min-w-full divide-y divide-gray-200">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">LG Number</th>
                                                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Type & Maker</th>
                                                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Approval Date</th>
                                                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Action</th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-gray-200">
                                            {approvedPendingPrints.map((req) => (
                                                <tr key={req.id} className="hover:bg-gray-50 transition-colors">
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <button 
                                                            onClick={() => req.lg_record?.id && handleViewDetails(req.lg_record.id)}
                                                            className="text-sm font-bold text-indigo-600 hover:text-indigo-900 hover:underline"
                                                        >
                                                            {req.lg_record?.lg_number || 'N/A'}
                                                        </button>
                                                        <div className="text-xs text-gray-400 mt-0.5">Ref: {req.related_instruction?.serial_number}</div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div className="text-sm font-medium text-gray-900">{formatActionTypeLabel(req.action_type)}</div>
                                                        <div className="text-xs text-gray-500">{req.maker_user?.email}</div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatDate(req.updated_at)}</td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                                                        <GracePeriodTooltip isGracePeriod={isGracePeriod}>
                                                            <button 
                                                                onClick={() => req.related_instruction?.id && req.lg_record?.lg_number ? handlePrintApprovedLetter(req.related_instruction.id, req.lg_record.lg_number) : toast.error("Data missing.")}
                                                                disabled={isGracePeriod}
                                                                className={`inline-flex items-center px-3 py-1.5 border border-purple-200 text-sm font-medium rounded-md text-purple-700 bg-purple-50 hover:bg-purple-100 transition-all active:scale-95 ${isGracePeriod ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                            >
                                                                <Printer className="h-4 w-4 mr-1.5" /> Print Letter
                                                            </button>
                                                        </GracePeriodTooltip>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>

                        {/* 2. Renewals Section */}
                        <div id="section-renewals" className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden scroll-mt-24">
                            <div className="px-6 py-4 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-center bg-gray-50/50">
                                <div className="flex items-center space-x-2">
                                    <div className="p-2 bg-orange-100 rounded-lg"><Clock className="h-5 w-5 text-orange-600" /></div>
                                    <h2 className="text-lg font-semibold text-gray-900">Approaching Expiry / Renewal</h2>
                                </div>
                                <GracePeriodTooltip isGracePeriod={isGracePeriod}>
                                    <button 
                                        onClick={() => setShowRunAutoRenewalModal(true)}
                                        disabled={isGracePeriod}
                                        className={`mt-2 sm:mt-0 inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg text-white bg-orange-600 hover:bg-orange-700 shadow-sm transition-all active:scale-95 ${isGracePeriod ? 'opacity-50 cursor-not-allowed' : ''}`}
                                    >
                                        <Repeat className="h-4 w-4 mr-2" /> Auto Renewal
                                    </button>
                                </GracePeriodTooltip>
                            </div>

                            {lgRenewalList.length === 0 ? (
                                <EmptyState icon={CheckCircle2} title="No Immediate Risks" description="There are no LGs approaching expiry or requiring renewal." />
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="min-w-full divide-y divide-gray-200">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">LG Details</th>
                                                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Expiry</th>
                                                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                                                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Action</th>
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
                                                                onClick={() => handleViewDetails(lg.id)}
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
                                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                                                            <GracePeriodTooltip isGracePeriod={isGracePeriod}>
                                                                <button 
                                                                    onClick={() => {
                                                                        if (!isGracePeriod) { setSelectedLgRecordForExtend(lg); setShowExtendModal(true); } 
                                                                        else { toast.warn("Action disabled during grace period."); }
                                                                    }}
                                                                    disabled={isGracePeriod}
                                                                    className={`inline-flex items-center px-3 py-1.5 border border-indigo-200 text-sm font-medium rounded-md text-indigo-700 bg-indigo-50 hover:bg-indigo-100 transition-all active:scale-95 ${isGracePeriod ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                                >
                                                                    <CalendarPlus className="h-4 w-4 mr-1.5" /> Renew
                                                                </button>
                                                            </GracePeriodTooltip>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>

                        {/* 3. Delivery Confirmation Section */}
                        <div id="section-delivery" className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden scroll-mt-24">
                            <div className="px-6 py-4 border-b border-gray-100 flex items-center bg-gray-50/50">
                                <div className="p-2 bg-blue-100 rounded-lg mr-3"><Truck className="h-5 w-5 text-blue-600" /></div>
                                <h2 className="text-lg font-semibold text-gray-900">Awaiting Delivery Confirmation</h2>
                            </div>

                            {instructionsUndelivered.length === 0 ? (
                                <EmptyState icon={CheckCircle2} title="Deliveries Up to Date" description="All dispatched instructions have been marked as delivered." />
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="min-w-full divide-y divide-gray-200">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Instruction</th>
                                                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Dates</th>
                                                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Delay</th>
                                                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Action</th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-gray-200">
                                            {instructionsUndelivered.map((inst) => {
                                                const daysStuck = moment().diff(moment(inst.instruction_date), 'days');
                                                const urgencyStatus = getUrgencyStatus(daysStuck, 'undelivered');
                                                return (
                                                    <tr key={inst.id} className="hover:bg-gray-50 transition-colors">
                                                        <td className="px-6 py-4 whitespace-nowrap">
                                                            <div className="flex items-center">
                                                                <FileText className="h-4 w-4 text-gray-400 mr-2" />
                                                                <button onClick={() => inst.lg_record?.id && handleViewDetails(inst.lg_record.id)} className="text-sm font-bold text-indigo-600 hover:underline">{inst.lg_record?.lg_number}</button>
                                                            </div>
                                                            <div className="text-xs text-gray-500 mt-1 ml-6">{formatActionTypeLabel(inst.instruction_type)} #{inst.serial_number}</div>
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">Issued: {formatDate(inst.instruction_date)}</td>
                                                        <td className="px-6 py-4 whitespace-nowrap">
                                                            <StatusBadge type={urgencyStatus}>{daysStuck} Days Pending</StatusBadge>
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                                                            <GracePeriodTooltip isGracePeriod={isGracePeriod}>
                                                                <button 
                                                                    onClick={() => {
                                                                        if (!isGracePeriod) { setSelectedInstructionForDelivery(inst); setShowRecordDeliveryModal(true); } 
                                                                        else { toast.warn("Action disabled during grace period."); }
                                                                    }}
                                                                    disabled={isGracePeriod}
                                                                    className={`inline-flex items-center px-3 py-1.5 border border-blue-200 text-sm font-medium rounded-md text-blue-700 bg-blue-50 hover:bg-blue-100 transition-all active:scale-95 ${isGracePeriod ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                                >
                                                                    <CheckCircle2 className="h-4 w-4 mr-1.5" /> Confirm Delivery
                                                                </button>
                                                            </GracePeriodTooltip>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>

                        {/* 4. Awaiting Reply Section */}
                        <div id="section-replies" className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden scroll-mt-24">
                            <div className="px-6 py-4 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-center bg-gray-50/50">
                                <div className="flex items-center space-x-2">
                                    <div className="p-2 bg-teal-100 rounded-lg"><Building className="h-5 w-5 text-teal-600" /></div>
                                    <h2 className="text-lg font-semibold text-gray-900">Awaiting Bank Reply</h2>
                                </div>
                                <GracePeriodTooltip isGracePeriod={isGracePeriod}>
                                    <button 
                                        onClick={() => setShowBulkRemindersModal(true)}
                                        disabled={isGracePeriod}
                                        className={`mt-2 sm:mt-0 inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg text-teal-700 bg-teal-50 hover:bg-teal-100 border border-teal-200 transition-colors active:scale-95 ${isGracePeriod ? 'opacity-50 cursor-not-allowed' : ''}`}
                                    >
                                        <Mail className="h-4 w-4 mr-2" /> Bulk Reminders
                                    </button>
                                </GracePeriodTooltip>
                            </div>

                            {instructionsNoReply.length === 0 ? (
                                <EmptyState icon={CheckCircle2} title="No Pending Replies" description="The bank has responded to all your instructions." />
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="min-w-full divide-y divide-gray-200">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">LG Number</th>
                                                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Instruction</th>
                                                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Timeline</th>
                                                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-gray-200">
                                            {instructionsNoReply.map((inst) => (
                                                <tr key={inst.id} className="hover:bg-gray-50 transition-colors">
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <button 
                                                            onClick={() => inst.lg_record?.id && handleViewDetails(inst.lg_record.id)}
                                                            className="text-sm font-bold text-indigo-600 hover:underline"
                                                        >
                                                            {inst.lg_record?.lg_number || 'N/A'}
                                                        </button>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div className="text-sm text-gray-900">{formatActionTypeLabel(inst.instruction_type)}</div>
                                                        <div className="text-xs text-gray-500">#{inst.serial_number}</div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div className="text-xs text-gray-500 flex flex-col space-y-1">
                                                            <span>Issued: {formatDate(inst.instruction_date)}</span>
                                                            {inst.delivery_date && <span className="text-green-600 flex items-center"><CheckCircle2 className="w-3 h-3 mr-1"/> Delivered: {formatDate(inst.delivery_date)}</span>}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                                                        <GracePeriodTooltip isGracePeriod={isGracePeriod}>
                                                            <button 
                                                                onClick={() => {
                                                                    if (!isGracePeriod) { setSelectedInstructionForReply(inst); setShowRecordBankReplyModal(true); } 
                                                                    else { toast.warn("Action disabled during grace period."); }
                                                                }}
                                                                disabled={isGracePeriod}
                                                                className={`inline-flex items-center px-3 py-1.5 border border-green-200 text-sm font-medium rounded-md text-green-700 bg-green-50 hover:bg-green-100 transition-all active:scale-95 ${isGracePeriod ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                            >
                                                                <ArrowRight className="h-4 w-4 mr-1.5" /> Record Reply
                                                            </button>
                                                        </GracePeriodTooltip>
                                                        
                                                        {inst.has_reminder_sent ? (
                                                            <button 
                                                                onClick={() => handleViewLetter(inst.id, inst.lg_record?.lg_number || 'N/A')}
                                                                className="inline-flex items-center px-3 py-1.5 border border-yellow-200 text-sm font-medium rounded-md text-yellow-700 bg-yellow-50 hover:bg-yellow-100 transition-all active:scale-95"
                                                            >
                                                                <Eye className="h-4 w-4 mr-1.5" /> View Reminder
                                                            </button>
                                                        ) : (
                                                            <GracePeriodTooltip isGracePeriod={isGracePeriod}>
                                                                <button 
                                                                    onClick={() => handleSendReminder(inst.id, inst.serial_number)}
                                                                    disabled={isGracePeriod}
                                                                    className={`inline-flex items-center px-3 py-1.5 border border-gray-200 text-sm font-medium rounded-md text-gray-700 bg-gray-50 hover:bg-gray-100 transition-all active:scale-95 ${isGracePeriod ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                                >
                                                                    <Mail className="h-4 w-4 mr-1.5" /> Remind
                                                                </button>
                                                            </GracePeriodTooltip>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>
                </>
            )}

            {/* Modals - Logic preserved completely */}
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
                />
            )}
            {showRecordBankReplyModal && selectedInstructionForReply && (
                <RecordBankReplyModal
                    instruction={selectedInstructionForReply}
                    onClose={() => setShowRecordBankReplyModal(false)}
                    onSuccess={handleActionSuccess}
                    isGracePeriod={isGracePeriod}
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
        </div>
    );
}

export default EndUserActionCenter;