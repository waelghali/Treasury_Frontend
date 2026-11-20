// frontend/src/pages/EndUser/LGDetailsPage.js
// This component is now designed to be reusable by Corporate Admin for read-only view.

import { toast } from 'react-toastify';
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { apiRequest, API_BASE_URL, getAuthToken } from '../../services/apiService';
import { Loader2, AlertCircle, ArrowLeft, Users, CalendarPlus, FileMinus, CheckCircle, MinusCircle, Eye, Edit, PlayCircle, Sparkles, Clock, Truck, Building, FileText, ShieldCheck, Tag } from 'lucide-react';
import moment from 'moment';
import LGLifecycleHistoryComponent from '../../components/LGLifecycleHistoryComponent';
import ChangeLGOwnerModal from '../../components/Modals/ChangeLGOwnerModal';
import ChangeLGCategoryModal from '../../components/Modals/ChangeLGCategoryModal';
import ExtendLGModal from '../../components/Modals/ExtendLGModal';
import ReleaseLGModal from '../../components/Modals/ReleaseLGModal';
import LiquidateLGModal from '../../components/Modals/LiquidateLGModal';
import DecreaseAmountModal from '../../components/Modals/DecreaseAmountModal';
import RecordDeliveryModal from '../../components/Modals/RecordDeliveryModal';
import RecordBankReplyModal from '../../components/Modals/RecordBankReplyModal';
import LGAmendModal from '../../components/Modals/LGAmendModal';
import LGActivateNonOperativeModal from '../../components/Modals/LGActivateNonOperativeModal';
import { Switch } from '@headlessui/react';
import CopyBadge from '../../components/CopyBadge';
import LgTimelineBar from '../../components/LgTimelineBar';
import { openInNewTab } from '../../utils/navUtils';

// NEW: A reusable component to provide a tooltip for disabled elements during the grace period.
const GracePeriodTooltip = ({ children, isGracePeriod }) => {
    if (isGracePeriod) {
        return (
            <div className="relative group inline-block">
                {children}
                <div className="opacity-0 w-max bg-slate-900 text-white text-xs rounded-lg py-2 px-3 absolute z-10 bottom-full left-1/2 -translate-x-1/2 pointer-events-none group-hover:opacity-100 transition-opacity duration-200 shadow-lg">
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

// Reusable styling for lifecycle action bar buttons
const actionBarButtonClassNames = () => `
    inline-flex items-center justify-center px-3 py-1.5 text-xs sm:text-sm font-semibold rounded-lg border border-slate-200
    bg-white hover:bg-slate-50 hover:border-slate-300 shadow-sm transition-all duration-150
    text-slate-700
`;

// Reusable styling for secondary admin buttons
const secondaryActionButtonClassNames = () => `
    inline-flex items-center justify-center px-2.5 py-1.5 text-xs font-semibold rounded-lg border border-slate-200
    bg-slate-100/70 hover:bg-slate-200/70 hover:border-slate-300 transition-all duration-150
    text-slate-600 hover:text-slate-800
`;

// Add isCorporateAdminView and isGracePeriod props
function LGDetailsPage({ isCorporateAdminView = false, isGracePeriod }) {
    const { id } = useParams();
    const navigateToLgList = isCorporateAdminView ? '/corporate-admin/lg-records' : '/end-user/lg-records';
    const navigate = useNavigate();
    const location = useLocation();
    const [lgRecord, setLgRecord] = useState(null);
    const [isInitialLoading, setIsInitialLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [error, setError] = useState('');
    const [activeTab, setActiveTab] = useState('details');
    const [isExpiredWithinGrace, setIsExpiredWithinGrace] = useState(false);
    const [supportingDocType, setSupportingDocType] = useState('INTERNAL_SUPPORTING');
    const [supportingFiles, setSupportingFiles] = useState([]);
    const [isUploadingSupportingDoc, setIsUploadingSupportingDoc] = useState(false);
    const [showChangeOwnerModal, setShowChangeOwnerModal] = useState(false);
    const [showChangeCategoryModal, setShowChangeCategoryModal] = useState(false);
    const [showExtendModal, setShowExtendModal] = useState(false);
    const [showReleaseModal, setShowReleaseModal] = useState(false);
    const [showLiquidateModal, setShowLiquidateModal] = useState(false);
    const [showDecreaseAmountModal, setShowDecreaseAmountModal] = useState(false);
    const [showRecordDeliveryModal, setShowRecordDeliveryModal] = useState(false);
    const [showRecordBankReplyModal, setShowRecordBankReplyModal] = useState(false);
    const [selectedInstructionForAction, setSelectedInstructionForAction] = useState(null);
    const [showAmendModal, setShowAmendModal] = useState(false);
    const [showActivateModal, setShowActivateModal] = useState(false);

    // NEW: State for all banks
    const [allBanks, setAllBanks] = useState([]);
    const [custodyWordingScan, setCustodyWordingScan] = useState(null);
    const [scanningCustodyDocId, setScanningCustodyDocId] = useState(null);
    const [showPasteVendorWording, setShowPasteVendorWording] = useState(false);
    const [pastedVendorWording, setPastedVendorWording] = useState('');

    const handleScanCustodyWording = async (docIdOrMode = null, textOverride = null) => {
        if (!lgRecord?.id) return;
        const isNumericDoc = typeof docIdOrMode === 'number';
        setScanningCustodyDocId(docIdOrMode || 'CONDITIONS');
        try {
            const formData = new FormData();
            if (isNumericDoc) formData.append('document_id', docIdOrMode);
            if (textOverride && textOverride.trim()) {
                formData.append('wording_text', textOverride.trim());
            }
            const res = await apiRequest(`/end-user/lg-records/${lgRecord.id}/analyze-special-wording`, 'POST', formData, true);
            setCustodyWordingScan(res);
            if (res?.status === 'OK') {
                toast.success('Beneficiary Protection Check complete');
                setShowPasteVendorWording(false);
            } else if (res?.message) {
                toast.warning(res.message);
            }
        } catch (err) {
            toast.error(err?.message || 'Could not run Beneficiary Protection Check');
        } finally {
            setScanningCustodyDocId(null);
        }
    };

    const fetchLgRecord = useCallback(async (isBackgroundRefresh = false) => {
        if (!isBackgroundRefresh) {
            setIsInitialLoading(true);
        } else {
            setIsRefreshing(true);
        }
        setError('');
        try {
            const response = await apiRequest(`/end-user/lg-records/${id}`, 'GET');
            setLgRecord(response);

            const isExpired = response.lg_status?.name === 'Expired';
            if (isExpired && response.expiry_date) {
              const thirtyDaysAgo = moment().subtract(30, 'days').startOf('day');
              const expiryDateMoment = moment(response.expiry_date).startOf('day');
              setIsExpiredWithinGrace(expiryDateMoment.isSameOrAfter(thirtyDaysAgo));
            } else {
              setIsExpiredWithinGrace(false);
            }

        } catch (err) {
            console.error("Failed to fetch LG record details:", err);
            setError(`Failed to load LG record details. ${err.message || 'An unexpected error occurred.'}`);
        } finally {
            if (!isBackgroundRefresh) {
                setIsInitialLoading(false);
            }
            setIsRefreshing(false);
        }
    }, [id]);

    // NEW: Fetch all banks on component mount
    useEffect(() => {
        const fetchBanks = async () => {
            try {
                const banks = await apiRequest('/end-user/banks/', 'GET');
                setAllBanks(banks);
            } catch (err) {
                console.error("Failed to fetch banks:", err);
            }
        };

        fetchBanks();
        fetchLgRecord(false);
    }, [fetchLgRecord]);

    const getLatestInstruction = useCallback((record) => {
        if (!record || !record.instructions || record.instructions.length === 0) {
            return null;
        }
        const sortedInstructions = [...record.instructions].sort((a, b) => {
            const dateA = new Date(a.created_at);
            const dateB = new Date(b.created_at);
            if (dateA.getTime() > dateB.getTime()) return 1;
            if (dateA.getTime() < dateB.getTime()) return -1;
            return a.id - b.id;
        });
        return sortedInstructions[sortedInstructions.length - 1];
    }, []);

    const handleViewLetter = useCallback(async (lgRecordToView, instructionIdFromModal = null) => {
        let instructionToUse = null;

        if (instructionIdFromModal) {
            instructionToUse = { id: instructionIdFromModal };
        } else {
            instructionToUse = getLatestInstruction(lgRecordToView);
        }

        if (instructionToUse && instructionToUse.id) {
            try {
                if (!isCorporateAdminView) {
                    await apiRequest(
                        `/end-user/lg-records/instructions/${instructionToUse.id}/mark-as-accessed-for-print`,
                        'POST'
                    );
                }

                const authToken = getAuthToken();
                let letterUrl = `${API_BASE_URL}/end-user/lg-records/instructions/${instructionToUse.id}/view-letter`;
                if (authToken) {
                    letterUrl += `?token=${authToken}&print=true`;
                }
                window.open(letterUrl, '_blank');
                toast.info("Opening letter in new tab. Please check for pop-up blockers.");
            } catch (error) {
                console.error("Failed to mark instruction as accessed for print or open letter:", error);
                setError("Could not open letter. Please try again later.");
                toast.error(`Could not open letter. ${error.message || 'An unexpected error occurred.'}`);
            }
        } else {
            setError('No generated letter found for this LG, or instruction ID is missing.');
            toast.error('No generated letter found for this LG, or instruction ID is missing.');
        }
    }, [getLatestInstruction, isCorporateAdminView]);

    const handleActionSuccess = useCallback((updatedRecordFromBackend, latestInstructionId = null) => {
        setShowChangeOwnerModal(false);
        setShowExtendModal(false);
        setShowReleaseModal(false);
        setShowLiquidateModal(false);
        setShowDecreaseAmountModal(false);
        setShowRecordDeliveryModal(false);
        setShowRecordBankReplyModal(false);
        setSelectedInstructionForAction(null);
        setShowAmendModal(false);
        setShowActivateModal(false);

        if (updatedRecordFromBackend && updatedRecordFromBackend.lg_number) {
            setLgRecord(updatedRecordFromBackend);
        }

        if (latestInstructionId) {
            setTimeout(() => {
                handleViewLetter(updatedRecordFromBackend || lgRecord, latestInstructionId);
            }, 50);
        } else {
            fetchLgRecord(true);
        }
        toast.success("LG action completed successfully!");
    }, [fetchLgRecord, handleViewLetter]);

    const handleExtend = () => {
        if (!isCorporateAdminView && lgRecord && !isGracePeriod) {
            setShowExtendModal(true);
        } else if (isGracePeriod) {
            toast.warn("This action is disabled during your subscription's grace period.");
        }
    };

    const handleRelease = () => {
        if (!isCorporateAdminView && lgRecord && !isGracePeriod) {
            setShowReleaseModal(true);
        } else if (isGracePeriod) {
            toast.warn("This action is disabled during your subscription's grace period.");
        }
    };

    const handleLiquidate = () => {
        if (!isCorporateAdminView && lgRecord && !isGracePeriod) {
            setShowLiquidateModal(true);
        } else if (isGracePeriod) {
            toast.warn("This action is disabled during your subscription's grace period.");
        }
    };

    const handleDecreaseAmount = () => {
        if (!isCorporateAdminView && lgRecord && !isGracePeriod) {
            setShowDecreaseAmountModal(true);
        } else if (isGracePeriod) {
            toast.warn("This action is disabled during your subscription's grace period.");
        }
    };

    const handleChangeOwner = () => {
        if (!isCorporateAdminView && lgRecord && !isGracePeriod) {
            setShowChangeOwnerModal(true);
        } else if (isGracePeriod) {
            toast.warn("This action is disabled during your subscription's grace period.");
        }
    };

    const handleChangeCategory = () => {
        if (!isCorporateAdminView && lgRecord && !isGracePeriod) {
            setShowChangeCategoryModal(true);
        } else if (isGracePeriod) {
            toast.warn("This action is disabled during your subscription's grace period.");
        }
    };

    const handleCategoryChangeSuccess = useCallback((response) => {
        setShowChangeCategoryModal(false);
        if (response?.lg_record && response.lg_record.lg_number) {
            setLgRecord(response.lg_record);
        } else {
            fetchLgRecord(true);
        }
    }, [fetchLgRecord]);

    const handleAmend = () => {
      if (!isCorporateAdminView && lgRecord && !isGracePeriod) {
        setShowAmendModal(true);
      } else if (isGracePeriod) {
        toast.warn("This action is disabled during your subscription's grace period.");
      }
    };

    const handleActivate = () => {
      if (!isCorporateAdminView && lgRecord && !isGracePeriod) {
        setShowActivateModal(true);
      } else if (isGracePeriod) {
        toast.warn("This action is disabled during your subscription's grace period.");
      }
    };

    const handleToggleAutoRenewal = useCallback(async (newStatus) => {
        if (isCorporateAdminView || !lgRecord || isGracePeriod) {
            if (isGracePeriod) toast.warn("This action is disabled during your subscription's grace period.");
            return;
        }

        const originalLgRecord = { ...lgRecord };

        setLgRecord(prevRecord => ({
            ...prevRecord,
            auto_renewal: newStatus,
        }));

        try {
            const payload = {
                auto_renewal: newStatus,
                reason: `Auto-renewal toggled to ${newStatus ? 'ON' : 'OFF'} from details page.`
            };
            const response = await apiRequest(`/end-user/lg-records/${lgRecord.id}/toggle-auto-renewal`, 'POST', payload);
            toast.success(response.message);
            setLgRecord(prevRecord => ({
                ...prevRecord,
                ...response.lg_record
            }));
        } catch (err) {
            console.error("Failed to toggle auto-renewal:", err);
            setLgRecord(originalLgRecord);
            toast.error(`Failed to toggle auto-renewal. ${err.message || 'An unexpected error occurred.'}`);
        }
    }, [lgRecord, isCorporateAdminView, isGracePeriod]);

    const handleRecordDelivery = (instruction) => {
        if (!isCorporateAdminView && !isGracePeriod) {
            setSelectedInstructionForAction(instruction);
            setShowRecordDeliveryModal(true);
        } else if (isGracePeriod) {
            toast.warn("This action is disabled during your subscription's grace period.");
        }
    };

    const handleRecordBankReply = (instruction) => {
        if (!isCorporateAdminView && !isGracePeriod) {
            setSelectedInstructionForAction(instruction);
            setShowRecordBankReplyModal(true);
        } else if (isGracePeriod) {
            toast.warn("This action is disabled during your subscription's grace period.");
        }
    };

    const handleSendReminderToBank = async (instruction) => {
        if (isCorporateAdminView || isGracePeriod) {
            if (isGracePeriod) toast.warn("This action is disabled during your subscription's grace period.");
            return;
        }

        setIsRefreshing(true);
        try {
            const response = await apiRequest(`/end-user/lg-records/instructions/${instruction.id}/send-reminder-to-bank`, 'POST');
            toast.success(response.message);

            const authToken = getAuthToken();
            if (authToken && response.new_instruction_id) {
                const letterUrl = `${API_BASE_URL}/end-user/lg-records/instructions/${response.new_instruction_id}/view-letter?token=${authToken}&print=true`;
                window.open(letterUrl, '_blank');
            }
            fetchLgRecord(true);
        } catch (error) {
            console.error("Failed to send reminder:", error);
            toast.error(`Failed to send reminder: ${error.message || 'An unexpected error occurred.'}`);
        } finally {
            setIsRefreshing(false);
        }
    };

	const handleViewInstructionDocument = useCallback(async (documentId) => {
		if (!documentId) {
			toast.error("Document ID not found.");
			return;
		}

		try {
			const response = await apiRequest(`/end-user/lg-documents/${documentId}/view`, 'GET');
			const targetUrl = response.download_url || response.signed_url;

			if (targetUrl) {
				openInNewTab(targetUrl);
				toast.info("Opening document securely in a new tab.");
			} else {
				toast.error("Failed to retrieve secure document link.");
			}
		} catch (error) {
			console.error("Failed to view document securely:", error);
			toast.error(`Could not open document: ${error.message || 'An unexpected error occurred.'}`);
		}
	}, []);

    const handleViewInstructionLetterFromHistory = async (instructionId) => {
        try {
            if (!isCorporateAdminView) {
                await apiRequest(
                    `/end-user/lg-records/instructions/${instructionId}/mark-as-accessed-for-print`,
                    'POST'
                );
            }

            const authToken = getAuthToken();
            let letterUrl = `${API_BASE_URL}/end-user/lg-records/instructions/${instructionId}/view-letter`;
            if (authToken) {
                letterUrl += `?token=${authToken}&print=true`;
            }
            window.open(letterUrl, '_blank');

        } catch (error) {
            console.error("Failed to mark instruction as accessed for print or open letter:", error);
            toast.error("Could not open letter. Please try again later.");
        }
    };

    const handleViewDiscrepancyLetter = (instructionId) => {
        const authToken = getAuthToken();
        let letterUrl = `${API_BASE_URL}/end-user/lg-records/instructions/${instructionId}/view-discrepancy-letter`;
        if (authToken) {
            letterUrl += `?token=${authToken}&print=true`;
        }
        window.open(letterUrl, '_blank');
    };


    const formatAmount = (amount, currencyCode) => {
        if (amount === null || currencyCode === null || currencyCode === undefined || isNaN(parseFloat(amount))) {
            return 'N/A';
        }
        try {
            const num = parseFloat(amount);
            const formattedNumber = num.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
            return `${currencyCode} ${formattedNumber}`;
        } catch (e) {
            console.error("Error formatting currency:", e);
            return `${currencyCode} ${parseFloat(amount).toFixed(2)}`;
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        return moment(dateString).format('DD-MMM-YYYY');
    };

    if (isInitialLoading) {
        return (
            <div className="flex justify-center items-center py-16">
                <Loader2 className="animate-spin h-8 w-8 text-blue-600" />
                <p className="ml-3 text-slate-600 text-sm font-medium">Loading LG record details...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-xl relative m-4 text-sm flex items-center" role="alert">
                <AlertCircle className="h-5 w-5 mr-2 shrink-0" />
                <span className="block sm:inline">{error}</span>
            </div>
        );
    }

    if (!lgRecord) {
        return (
            <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-xl relative m-4 text-sm" role="alert">
                <span className="block sm:inline">LG Record not found.</span>
            </div>
        );
    }

    const isLgValid = lgRecord.lg_status?.name === 'Valid';
    const canAmend = isLgValid || isExpiredWithinGrace;
    
    const LG_TYPE_ADVANCE_PAYMENT_GUARANTEE = 3;
    const LG_OPERATIONAL_STATUS_NON_OPERATIVE = 2;

    const canActivate = lgRecord.lg_type?.id === LG_TYPE_ADVANCE_PAYMENT_GUARANTEE && lgRecord.lg_operational_status?.id === LG_OPERATIONAL_STATUS_NON_OPERATIVE;

    // NEW: Find the communication bank details using the fetched banks list
    const communicationBank = lgRecord.communication_bank_id 
        ? allBanks.find(bank => bank.id === lgRecord.communication_bank_id) 
        : null;

    // Determine if the bank name is "Foreign Bank"
    const isForeignBank = lgRecord.issuing_bank?.name === 'Foreign Bank';

    // Enhancement D: Compute open / in-flight instructions awaiting delivery or bank reply
    const inFlightInstructions = (lgRecord.instructions || []).filter(
        (inst) =>
            !inst.is_deleted &&
            inst.instruction_type !== 'LG_REMINDER_TO_BANKS' &&
            inst.status !== 'Canceled' &&
            inst.status !== 'Confirmed by Bank' &&
            (!inst.delivery_date || !inst.bank_reply_date)
    );

    const daysRemaining = lgRecord.expiry_date
        ? moment(lgRecord.expiry_date).startOf('day').diff(moment().startOf('day'), 'days')
        : null;
    const hasInFlightExtension = inFlightInstructions.some((inst) =>
        (inst.instruction_type || '').includes('EXTENSION')
    );
    const isCriticalForExtend =
        isLgValid &&
        daysRemaining !== null &&
        daysRemaining <= 30 &&
        !isGracePeriod;
    const isExtensionPendingCalm =
        isLgValid &&
        !isCriticalForExtend &&
        hasInFlightExtension &&
        !isGracePeriod;

    const handleJumpToHistory = (instructionId = null) => {
        setActiveTab('history');
        setTimeout(() => {
            const el =
                (instructionId && document.getElementById(`lifecycle-instruction-${instructionId}`)) ||
                document.getElementById('lifecycle-history-section');
            if (el) {
                el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                el.classList.add('ring-2', 'ring-amber-400');
                setTimeout(() => el.classList.remove('ring-2', 'ring-amber-400'), 2200);
            }
        }, 120);
    };

    const statusName = lgRecord.lg_status?.name || 'N/A';
    const statusBadgeClass =
        statusName === 'Valid'
            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
            : statusName === 'Expired'
                ? 'bg-rose-50 text-rose-700 border-rose-200'
                : statusName === 'Liquidated'
                    ? 'bg-purple-50 text-purple-700 border-purple-200'
                    : 'bg-slate-100 text-slate-700 border-slate-200';

    const opStatusName = lgRecord.lg_operational_status?.name;
    const isNonOperative =
        lgRecord.lg_operational_status?.id === LG_OPERATIONAL_STATUS_NON_OPERATIVE ||
        opStatusName === 'Non-Operative';

    const bankPrimaryName = isForeignBank
        ? lgRecord.foreign_bank_name || 'Foreign Bank'
        : lgRecord.issuing_bank?.name || 'N/A';
    const bankSubtext =
        (lgRecord.advising_status === 'Advised' || lgRecord.advising_status === 'Confirmed') &&
        communicationBank?.name
            ? `Via ${communicationBank.name}`
            : lgRecord.issuing_method?.name || 'Direct';

    return (
        <div className="w-full min-w-0 p-4 sm:p-5 bg-white rounded-2xl border border-slate-200/90 shadow-sm relative">
            {isRefreshing && (
                <div className="absolute inset-x-0 top-0 flex items-center justify-center py-1 bg-blue-50 text-blue-700 text-xs font-medium z-10 rounded-t-2xl">
                    <Loader2 className="animate-spin h-4 w-4 mr-2" /> Refreshing data...
                </div>
            )}

            {/* Section A: Top Navigation & Identity + Amount Hero Header */}
            <div className="mb-2.5">
                <button
                    type="button"
                    onClick={() => navigate(location.state?.returnTo || navigateToLgList)}
                    className="inline-flex items-center text-slate-500 hover:text-slate-900 transition-colors duration-150 text-sm font-medium shadow-none"
                >
                    <ArrowLeft className="h-4 w-4 mr-1.5" />
                    <span>Back to LG Records</span>
                </button>
            </div>

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3.5 mb-3.5 border-b border-slate-200/80">
                <div className="flex items-center flex-wrap gap-2 min-w-0">
                    <span className="px-2.5 py-0.5 text-xs sm:text-sm font-mono font-semibold bg-slate-100 text-slate-700 rounded-md border border-slate-200">
                        {lgRecord.custody_serial || `01-${String(lgRecord.lg_sequence_number || 1).padStart(4, '0')}`}
                    </span>
                    <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight break-all">
                        {lgRecord.lg_number}
                    </h1>
                    <CopyBadge text={lgRecord.lg_number} variant="icon" size="md" />
                    <span className={`px-2.5 py-0.5 inline-flex items-center text-xs font-semibold rounded-full border ${statusBadgeClass}`}>
                        {statusName}
                    </span>
                    {opStatusName && (
                        <span
                            className={`px-2.5 py-0.5 inline-flex items-center text-xs font-semibold rounded-full border ${
                                isNonOperative
                                    ? 'bg-amber-50 text-amber-800 border-amber-200'
                                    : 'bg-teal-50 text-teal-700 border-teal-200'
                            }`}
                        >
                            {opStatusName}
                        </span>
                    )}
                    {!isCorporateAdminView ? (
                        <GracePeriodTooltip isGracePeriod={isGracePeriod}>
                            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-slate-50 border border-slate-200">
                                <span className="text-xs font-semibold text-slate-600">Auto-Renew</span>
                                <Switch
                                    checked={Boolean(lgRecord.auto_renewal)}
                                    onChange={handleToggleAutoRenewal}
                                    disabled={isGracePeriod}
                                    className={`${
                                        lgRecord.auto_renewal ? 'bg-blue-600' : 'bg-slate-300'
                                    } relative inline-flex h-4 w-8 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 ${
                                        isGracePeriod ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                                    }`}
                                >
                                    <span className="sr-only">Enable auto-renewal</span>
                                    <span
                                        className={`${
                                            lgRecord.auto_renewal ? 'translate-x-4' : 'translate-x-0.5'
                                        } inline-block h-3 w-3 transform rounded-full bg-white transition-transform shadow-sm`}
                                    />
                                </Switch>
                            </div>
                        </GracePeriodTooltip>
                    ) : (
                        <span
                            className={`px-2.5 py-0.5 inline-flex items-center text-xs font-semibold rounded-full border ${
                                lgRecord.auto_renewal
                                    ? 'bg-blue-50 text-blue-700 border-blue-200'
                                    : 'bg-slate-100 text-slate-600 border-slate-200'
                            }`}
                        >
                            Auto-Renew: {lgRecord.auto_renewal ? 'ON' : 'OFF'}
                        </span>
                    )}
                </div>

                <div className="flex flex-col md:items-end shrink-0">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Current LG Amount
                    </span>
                    <span className="text-xl sm:text-2xl font-extrabold text-slate-900 tabular-nums tracking-tight">
                        {formatAmount(lgRecord.lg_amount, lgRecord.lg_currency?.iso_code)}
                    </span>
                    {lgRecord.lg_period_months ? (
                        <span className="text-xs text-slate-500 font-medium">
                            {lgRecord.lg_period_months} mos period
                        </span>
                    ) : null}
                </div>
            </div>

            {/* Section B: 4-Card Vital Signs Strip */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 mb-4">
                <div className="px-3 py-2.5 rounded-xl bg-slate-50/80 border border-slate-200/80 min-w-0">
                    <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-0.5">
                        <Building className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                        <span>Issuing Bank</span>
                    </div>
                    <p className="text-sm font-bold text-slate-800 truncate" title={bankPrimaryName}>
                        {bankPrimaryName}
                    </p>
                    <p className="text-xs text-slate-500 truncate" title={bankSubtext}>
                        {bankSubtext}
                    </p>
                </div>

                <div className="px-3 py-2.5 rounded-xl bg-slate-50/80 border border-slate-200/80 min-w-0">
                    <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-0.5">
                        <ShieldCheck className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                        <span>Beneficiary</span>
                    </div>
                    <p
                        className="text-sm font-bold text-slate-800 truncate"
                        title={lgRecord.beneficiary_corporate?.entity_name || 'N/A'}
                    >
                        {lgRecord.beneficiary_corporate?.entity_name || 'N/A'}
                    </p>
                    <p
                        className="text-xs text-slate-500 truncate"
                        title={`Issuer: ${lgRecord.issuer_name || 'N/A'}`}
                    >
                        Issuer: {lgRecord.issuer_name || 'N/A'}
                    </p>
                </div>

                <div className="px-3 py-2.5 rounded-xl bg-slate-50/80 border border-slate-200/80 min-w-0">
                    <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-0.5">
                        <FileText className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
                        <span>Guarantee Type</span>
                    </div>
                    <p
                        className="text-sm font-bold text-slate-800 truncate"
                        title={lgRecord.lg_type?.name || 'N/A'}
                    >
                        {lgRecord.lg_type?.name || 'N/A'}
                    </p>
                    <p
                        className="text-xs text-slate-500 truncate"
                        title={`Rule: ${lgRecord.applicable_rule?.name || 'Standard'}`}
                    >
                        Rule: {lgRecord.applicable_rule?.name || 'Standard'}
                    </p>
                </div>

                <div className="px-3 py-2.5 rounded-xl bg-slate-50/80 border border-slate-200/80 min-w-0">
                    <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-0.5">
                        <Users className="h-3.5 w-3.5 text-purple-500 shrink-0" />
                        <span>Owner &amp; Category</span>
                    </div>
                    <p
                        className="text-sm font-bold text-slate-800 truncate"
                        title={lgRecord.internal_owner_contact?.email || 'Unassigned'}
                    >
                        {lgRecord.internal_owner_contact?.email || 'Unassigned'}
                    </p>
                    <p
                        className="text-xs text-slate-500 truncate"
                        title={`Category: ${lgRecord.lg_category?.name || 'Default'}`}
                    >
                        Category: {lgRecord.lg_category?.name || 'Default'}
                    </p>
                </div>
            </div>

            {/* Section C: Unified Lifecycle Timeline Bar */}
            <div className="p-3.5 sm:p-4 rounded-xl bg-slate-50/60 border border-slate-200/80 mb-4">
                <LgTimelineBar
                    lgRecord={lgRecord}
                    inFlightInstructions={inFlightInstructions}
                    onViewLetter={handleViewInstructionLetterFromHistory}
                    onViewDocument={handleViewInstructionDocument}
                    onJumpToHistory={handleJumpToHistory}
                />
            </div>

            {/* Section D: Grouped Action Toolbar */}
            {!isCorporateAdminView && (
                <div className="flex flex-wrap items-center justify-between gap-2 p-2 bg-slate-50/90 rounded-xl border border-slate-200/80 mb-4">
                    <div className="flex flex-wrap items-center gap-2">
                        {isLgValid && (
                            <GracePeriodTooltip isGracePeriod={isGracePeriod}>
                                <button
                                    type="button"
                                    onClick={handleExtend}
                                    className={
                                        isCriticalForExtend
                                            ? 'inline-flex items-center justify-center px-3.5 py-1.5 text-xs sm:text-sm font-semibold rounded-lg border border-blue-300 bg-blue-50 hover:bg-blue-100 text-blue-700 ring-2 ring-blue-200/70 shadow-sm transition-all duration-150'
                                            : isExtensionPendingCalm
                                                ? 'inline-flex items-center justify-center px-3 py-1.5 text-xs sm:text-sm font-semibold rounded-lg border border-amber-200 bg-amber-50/80 hover:bg-amber-100 text-amber-800 shadow-sm transition-all duration-150'
                                                : `${actionBarButtonClassNames()} ${isGracePeriod ? 'opacity-50 cursor-not-allowed' : ''}`
                                    }
                                    title={
                                        isCriticalForExtend
                                            ? 'Critical expiry — Extend LG'
                                            : isExtensionPendingCalm
                                                ? 'Extension already in progress — click to extend further'
                                                : 'Extend LG'
                                    }
                                    disabled={isGracePeriod}
                                >
                                    {isCriticalForExtend && (
                                        <span className="relative flex h-2 w-2 mr-2 shrink-0">
                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                                            <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500" />
                                        </span>
                                    )}
                                    {isExtensionPendingCalm ? (
                                        <>
                                            <Clock className="h-4 w-4 mr-1.5 text-amber-600 shrink-0" />
                                            Extension Open
                                        </>
                                    ) : (
                                        <>
                                            <CalendarPlus className="h-4 w-4 mr-1.5 text-blue-600 shrink-0" />
                                            Extend
                                        </>
                                    )}
                                </button>
                            </GracePeriodTooltip>
                        )}
                        {canAmend && (
                            <GracePeriodTooltip isGracePeriod={isGracePeriod}>
                                <button
                                    type="button"
                                    onClick={handleAmend}
                                    className={`${actionBarButtonClassNames()} ${isGracePeriod ? 'opacity-50 cursor-not-allowed' : ''}`}
                                    title="Amend LG"
                                    disabled={isGracePeriod}
                                >
                                    <Edit className="h-4 w-4 mr-1.5 text-amber-600 shrink-0" />
                                    Amend LG
                                </button>
                            </GracePeriodTooltip>
                        )}
                        {isLgValid && (
                            <GracePeriodTooltip isGracePeriod={isGracePeriod}>
                                <button
                                    type="button"
                                    onClick={handleDecreaseAmount}
                                    className={`${actionBarButtonClassNames()} ${isGracePeriod ? 'opacity-50 cursor-not-allowed' : ''}`}
                                    title="Decrease LG Amount"
                                    disabled={isGracePeriod}
                                >
                                    <MinusCircle className="h-4 w-4 mr-1.5 text-orange-600 shrink-0" />
                                    Decrease Amt
                                </button>
                            </GracePeriodTooltip>
                        )}
                        {canActivate && (
                            <GracePeriodTooltip isGracePeriod={isGracePeriod}>
                                <button
                                    type="button"
                                    onClick={handleActivate}
                                    className={`${actionBarButtonClassNames()} ${isGracePeriod ? 'opacity-50 cursor-not-allowed' : ''}`}
                                    title="Activate LG"
                                    disabled={isGracePeriod}
                                >
                                    <PlayCircle className="h-4 w-4 mr-1.5 text-teal-600 shrink-0" />
                                    Activate
                                </button>
                            </GracePeriodTooltip>
                        )}
                        {isLgValid && (
                            <GracePeriodTooltip isGracePeriod={isGracePeriod}>
                                <button
                                    type="button"
                                    onClick={handleRelease}
                                    className={`${actionBarButtonClassNames()} ${isGracePeriod ? 'opacity-50 cursor-not-allowed' : ''}`}
                                    title="Release LG"
                                    disabled={isGracePeriod}
                                >
                                    <CheckCircle className="h-4 w-4 mr-1.5 text-emerald-600 shrink-0" />
                                    Release
                                </button>
                            </GracePeriodTooltip>
                        )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        {isLgValid && (
                            <GracePeriodTooltip isGracePeriod={isGracePeriod}>
                                <button
                                    type="button"
                                    onClick={handleChangeOwner}
                                    className={`${secondaryActionButtonClassNames()} ${isGracePeriod ? 'opacity-50 cursor-not-allowed' : ''}`}
                                    title="Change LG Owner"
                                    disabled={isGracePeriod}
                                >
                                    <Users className="h-3.5 w-3.5 mr-1.5 text-purple-600 shrink-0" />
                                    Owner
                                </button>
                            </GracePeriodTooltip>
                        )}
                        <GracePeriodTooltip isGracePeriod={isGracePeriod}>
                            <button
                                type="button"
                                onClick={handleChangeCategory}
                                className={`${secondaryActionButtonClassNames()} ${isGracePeriod ? 'opacity-50 cursor-not-allowed' : ''}`}
                                title="Change LG Category"
                                disabled={isGracePeriod}
                            >
                                <Tag className="h-3.5 w-3.5 mr-1.5 text-indigo-600 shrink-0" />
                                Category
                            </button>
                        </GracePeriodTooltip>
                        {isLgValid && (
                            <>
                                <div className="hidden sm:block h-5 w-px bg-slate-200" />
                                <GracePeriodTooltip isGracePeriod={isGracePeriod}>
                                    <button
                                        type="button"
                                        onClick={handleLiquidate}
                                        className={`inline-flex items-center justify-center px-3 py-1.5 text-xs sm:text-sm font-semibold rounded-lg border border-rose-200 bg-rose-50/80 text-rose-700 hover:bg-rose-100 hover:border-rose-300 shadow-sm transition-all duration-150 ${isGracePeriod ? 'opacity-50 cursor-not-allowed' : ''}`}
                                        title="Liquidate LG"
                                        disabled={isGracePeriod}
                                    >
                                        <FileMinus className="h-4 w-4 mr-1.5 text-rose-600 shrink-0" />
                                        Liquidate
                                    </button>
                                </GracePeriodTooltip>
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* Enhancement D: In-Flight Instruction Visual Indicator Banner */}
            {inFlightInstructions.length > 0 && (
                <div className="mb-6 p-3.5 bg-amber-50/90 border border-amber-200 rounded-xl shadow-sm">
                    <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
                        <div className="flex items-center gap-2 text-amber-900 font-bold text-xs uppercase tracking-wider">
                            <Clock className="h-4 w-4 text-amber-600 animate-pulse" />
                            <span>In-Flight Instruction{inFlightInstructions.length > 1 ? 's' : ''} ({inFlightInstructions.length} Open)</span>
                        </div>
                        <button
                            type="button"
                            onClick={() => {
                                setActiveTab('history');
                                const targetId = inFlightInstructions[0]?.id;
                                setTimeout(() => {
                                    const el =
                                        (targetId && document.getElementById(`lifecycle-instruction-${targetId}`)) ||
                                        document.getElementById('lifecycle-history-section');
                                    if (el) {
                                        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                        el.classList.add('ring-2', 'ring-amber-400');
                                        setTimeout(() => el.classList.remove('ring-2', 'ring-amber-400'), 2200);
                                    }
                                }, 120);
                            }}
                            className="text-xs font-semibold text-amber-800 hover:text-amber-950 underline cursor-pointer"
                        >
                            View in Lifecycle History →
                        </button>
                    </div>
                    <div className="space-y-2">
                        {inFlightInstructions.map((inst) => {
                            const needsDelivery = !inst.delivery_date;
                            const needsReply = !!inst.delivery_date && !inst.bank_reply_date;
                            const isTermsRejected = inst?.details?.bank_terms_admin_approval?.status === 'REJECTED_BY_ADMIN';
                            const typeLabel = (inst.instruction_type || '').replace(/^LG_/, '').replace(/_/g, ' ');
                            return (
                                <div
                                    key={inst.id}
                                    className="flex items-center justify-between flex-wrap gap-2 bg-white/90 px-3 py-2 rounded-lg border border-amber-200/80 text-xs"
                                >
                                    <div className="flex items-center flex-wrap gap-2">
                                        <span className="font-mono font-bold text-gray-900">
                                            {inst.serial_number || `Instruction #${inst.id}`}
                                        </span>
                                        <span className="px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 font-semibold border border-indigo-200">
                                            {typeLabel}
                                        </span>
                                        {needsDelivery ? (
                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-semibold border border-blue-200">
                                                <Truck className="h-3 w-3" />
                                                Awaiting Bank Delivery
                                            </span>
                                        ) : isTermsRejected ? (
                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-50 text-red-700 font-semibold border border-red-200">
                                                <AlertCircle className="h-3 w-3" />
                                                Admin Rejected Bank Terms — Send Discrepancy Letter & Record Corrected Reply
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 font-semibold border border-teal-200">
                                                <Building className="h-3 w-3" />
                                                Delivered ({formatDate(inst.delivery_date)}) — Awaiting Bank Reply
                                            </span>
                                        )}
                                    </div>
                                    {!isCorporateAdminView && !isGracePeriod && (
                                        <div className="flex items-center gap-2 flex-wrap">
                                            {needsDelivery && (
                                                <button
                                                    type="button"
                                                    onClick={() => handleRecordDelivery(inst)}
                                                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-blue-600 hover:bg-blue-700 text-white font-semibold transition-colors shadow-sm"
                                                >
                                                    <Truck className="h-3.5 w-3.5" />
                                                    <span>Record Delivery</span>
                                                </button>
                                            )}
                                            {isTermsRejected && (
                                                <button
                                                    type="button"
                                                    onClick={() => handleViewDiscrepancyLetter(inst.id)}
                                                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-rose-600 hover:bg-rose-700 text-white font-semibold transition-colors shadow-sm"
                                                    title="Print formal Discrepancy Notice letter to send to the bank"
                                                >
                                                    <FileText className="h-3.5 w-3.5" />
                                                    <span>Print Discrepancy Letter</span>
                                                </button>
                                            )}
                                            {needsReply && (
                                                <button
                                                    type="button"
                                                    onClick={() => handleRecordBankReply(inst)}
                                                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-teal-600 hover:bg-teal-700 text-white font-semibold transition-colors shadow-sm"
                                                >
                                                    <Building className="h-3.5 w-3.5" />
                                                    <span>{isTermsRejected ? 'Record Corrected Reply' : 'Record Bank Reply'}</span>
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            <div className="border-b border-slate-200 mb-4">
                <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                    <button
                        onClick={() => setActiveTab('details')}
                        className={`${
                            activeTab === 'details'
                                ? 'border-blue-600 text-blue-600'
                                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                        } whitespace-nowrap py-2.5 px-1 border-b-2 shadow-none rounded-none font-semibold text-sm transition-colors duration-200`}
                    >
                        Details
                    </button>
                    <button
                        onClick={() => setActiveTab('documents')}
                        className={`${
                            activeTab === 'documents'
                                ? 'border-blue-600 text-blue-600'
                                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                        } whitespace-nowrap py-2.5 px-1 border-b-2 shadow-none rounded-none font-semibold text-sm transition-colors duration-200`}
                    >
                        Documents
                    </button>
                    <button
                        onClick={() => setActiveTab('history')}
                        className={`${
                            activeTab === 'history'
                                ? 'border-blue-600 text-blue-600'
                                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                        } whitespace-nowrap py-2.5 px-1 border-b-2 shadow-none rounded-none font-semibold text-sm transition-colors duration-200`}
                    >
                        Lifecycle History
                    </button>
                </nav>
            </div>

            <div>
                {activeTab === 'details' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-1.5 text-slate-700">
                        <div className="col-span-1 md:col-span-2 border-b border-slate-200 pb-1.5">
                            <p className="text-xs font-bold text-blue-600 uppercase tracking-widest">LG Core Information</p>
                        </div>
                        <div className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-2 py-1 border-b border-slate-100">
                            <span className="font-semibold text-slate-900 text-sm shrink-0 min-w-[130px]">Custody Serial:</span>
                            <span className="text-slate-700 text-sm font-mono font-semibold">{lgRecord.custody_serial || `01-${String(lgRecord.lg_sequence_number || 1).padStart(4, '0')}`}</span>
                        </div>
                        <div className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-2 py-1 border-b border-slate-100">
                            <span className="font-semibold text-slate-900 text-sm shrink-0 min-w-[130px]">LG Number:</span>
                            <span className="text-slate-700 text-sm break-all font-mono">{lgRecord.lg_number}</span>
                        </div>
                        <div className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-2 py-1 border-b border-slate-100">
                            <span className="font-semibold text-slate-900 text-sm shrink-0 min-w-[130px]">Issuer Name:</span>
                            <span className="text-slate-700 text-sm break-words">{lgRecord.issuer_name || 'N/A'}</span>
                        </div>
                        <div className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-2 py-1 border-b border-slate-100">
                            <span className="font-semibold text-slate-900 text-sm shrink-0 min-w-[130px]">Beneficiary:</span>
                            <span className="text-slate-700 text-sm break-words">{lgRecord.beneficiary_corporate?.entity_name || 'N/A'}</span>
                        </div>
                        <div className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-2 py-1 border-b border-slate-100">
                            <span className="font-semibold text-slate-900 text-sm shrink-0 min-w-[130px]">Amount:</span>
                            <span className="text-slate-900 font-bold text-sm tabular-nums break-words">{formatAmount(lgRecord.lg_amount, lgRecord.lg_currency?.iso_code)}</span>
                        </div>
                        <div className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-2 py-1 border-b border-slate-100">
                            <span className="font-semibold text-slate-900 text-sm shrink-0 min-w-[130px]">Issuance Date:</span>
                            <span className="text-slate-700 text-sm tabular-nums">{formatDate(lgRecord.issuance_date)}</span>
                        </div>
                        <div className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-2 py-1 border-b border-slate-100">
                            <span className="font-semibold text-slate-900 text-sm shrink-0 min-w-[130px]">Expiry Date:</span>
                            <span className="text-slate-700 text-sm font-semibold tabular-nums">{formatDate(lgRecord.expiry_date)}</span>
                        </div>
                        <div className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-2 py-1 border-b border-slate-100">
                            <span className="font-semibold text-slate-900 text-sm shrink-0 min-w-[130px]">LG Type:</span>
                            <span className="text-slate-700 text-sm">{lgRecord.lg_type?.name || 'N/A'}</span>
                        </div>
                        <div className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-2 py-1 border-b border-slate-100">
                            <span className="font-semibold text-slate-900 text-sm shrink-0 min-w-[130px]">Status:</span>
                            <span className={`px-2 py-0.5 inline-flex text-xs leading-4 font-semibold rounded-full w-fit ${
                                lgRecord.lg_status?.name === 'Valid' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                                lgRecord.lg_status?.name === 'Expired' ? 'bg-rose-50 text-rose-700 border border-rose-200' :
                                'bg-slate-100 text-slate-700 border border-slate-200'
                            }`}>{lgRecord.lg_status?.name || 'N/A'}</span>
                        </div>
                        <div className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-2 py-1 border-b border-slate-100">
                            <span className="font-semibold text-slate-900 text-sm shrink-0 min-w-[130px]">Operational Status:</span>
                            <span className="text-slate-700 text-sm">{lgRecord.lg_operational_status?.name || 'N/A'}</span>
                        </div>
                        <div className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-2 py-1 border-b border-slate-100">
                            <span className="font-semibold text-slate-900 text-sm shrink-0 min-w-[130px]">Purpose:</span>
                            <span className="text-slate-700 text-sm break-words">{lgRecord.description_purpose || 'N/A'}</span>
                        </div>
                        {!isCorporateAdminView && (
                            <div className="flex items-center justify-between sm:justify-start gap-3 py-1 border-b border-slate-100">
                                <span className="font-semibold text-slate-900 text-sm shrink-0 min-w-[130px]">Auto Renewal:</span>
                                <GracePeriodTooltip isGracePeriod={isGracePeriod}>
                                    <Switch
                                        checked={lgRecord.auto_renewal}
                                        onChange={handleToggleAutoRenewal}
                                        disabled={isGracePeriod}
                                        className={`${
                                            lgRecord.auto_renewal ? 'bg-blue-600' : 'bg-slate-200'
                                        } relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 ${isGracePeriod ? 'opacity-50 cursor-not-allowed' : ''}`}
                                    >
                                        <span className="sr-only">Enable auto-renewal</span>
                                        <span
                                            className={`${
                                                lgRecord.auto_renewal ? 'translate-x-4' : 'translate-x-1'
                                            } inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform`}
                                        />
                                    </Switch>
                                </GracePeriodTooltip>
                            </div>
                        )}
                        <div className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-2 py-1 border-b border-slate-100">
                            <span className="font-semibold text-slate-900 text-sm shrink-0 min-w-[130px]">Period (Months):</span>
                            <span className="text-slate-700 text-sm">{lgRecord.lg_period_months}</span>
                        </div>

                        <div className="col-span-1 md:col-span-2 border-b border-slate-200 pb-1.5 mt-3">
                            <p className="text-xs font-bold text-blue-600 uppercase tracking-widest">Bank & Rule Information</p>
                        </div>
                        <div className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-2 py-1 border-b border-slate-100">
                            <span className="font-semibold text-slate-900 text-sm shrink-0 min-w-[130px]">Issuing Bank:</span>
                            <span className="text-slate-700 text-sm break-words">{isForeignBank ? lgRecord.foreign_bank_name || 'N/A' : lgRecord.issuing_bank?.name || 'N/A'}</span>
                        </div>
                        <div className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-2 py-1 border-b border-slate-100">
                            <span className="font-semibold text-slate-900 text-sm shrink-0 min-w-[130px]">Bank Address:</span>
                            <span className="text-slate-700 text-sm break-words">{isForeignBank ? lgRecord.foreign_bank_address || 'N/A' : lgRecord.issuing_bank_address || 'N/A'}</span>
                        </div>
                        <div className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-2 py-1 border-b border-slate-100">
                            <span className="font-semibold text-slate-900 text-sm shrink-0 min-w-[130px]">Bank Phone:</span>
                            <span className="text-slate-700 text-sm break-words">{isForeignBank ? lgRecord.foreign_bank_country || 'N/A' : lgRecord.issuing_bank_phone || 'N/A'}</span>
                        </div>
                        <div className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-2 py-1 border-b border-slate-100">
                            <span className="font-semibold text-slate-900 text-sm shrink-0 min-w-[130px]">Issuing Method:</span>
                            <span className="text-slate-700 text-sm">{lgRecord.issuing_method?.name || 'N/A'}</span>
                        </div>
                        <div className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-2 py-1 border-b border-slate-100">
                            <span className="font-semibold text-slate-900 text-sm shrink-0 min-w-[130px]">Applicable Rule:</span>
                            <span className="text-slate-700 text-sm">{lgRecord.applicable_rule?.name || 'N/A'}</span>
                        </div>
                        <div className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-2 py-1 border-b border-slate-100">
                            <span className="font-semibold text-slate-900 text-sm shrink-0 min-w-[130px]">Rules Text:</span>
                            <span className="text-slate-700 text-sm break-words">{lgRecord.applicable_rules_text || 'N/A'}</span>
                        </div>
                        <div className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-2 py-1 border-b border-slate-100">
                            <span className="font-semibold text-slate-900 text-sm shrink-0 min-w-[130px]">Advising Status:</span>
                            <span className="text-slate-700 text-sm">{lgRecord.advising_status || 'N/A'}</span>
                        </div>
                        {(lgRecord.advising_status === 'Advised' || lgRecord.advising_status === 'Confirmed') && (
                            <div className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-2 py-1 border-b border-slate-100">
                                <span className="font-semibold text-slate-900 text-sm shrink-0 min-w-[130px]">Advising Bank:</span>
                                <span className="text-slate-700 text-sm break-words">{communicationBank?.name || 'N/A'}</span>
                            </div>
                        )}
                        <div className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-2 py-1 border-b border-slate-100">
                            <span className="font-semibold text-slate-900 text-sm shrink-0 min-w-[130px]">Other Conditions:</span>
                            <span className="text-slate-700 text-sm break-words">{lgRecord.other_conditions || 'N/A'}</span>
                        </div>
                        {lgRecord.mandatory_claim_statement && (
                            <div className="col-span-1 md:col-span-2 py-2.5 px-3.5 bg-amber-50/70 border border-amber-200/80 rounded-xl my-1">
                                <div className="flex items-center justify-between mb-1">
                                    <div className="flex items-center gap-1.5 text-amber-950 font-bold text-xs uppercase tracking-wide">
                                        <Sparkles className="w-4 h-4 text-amber-600" />
                                        Mandatory Liquidation / Claim Statement
                                    </div>
                                    <span className="text-[10px] font-semibold bg-amber-200/80 text-amber-900 px-2 py-0.5 rounded-full border border-amber-300">
                                        Required by Original LG
                                    </span>
                                </div>
                                <p className="text-gray-800 text-xs italic font-mono bg-white/90 p-2.5 rounded-lg border border-amber-200/70 leading-relaxed break-words">
                                    "{lgRecord.mandatory_claim_statement}"
                                </p>
                            </div>
                        )}

                        <div className="col-span-1 md:col-span-2 border-b border-slate-200 pb-1.5 mt-3">
                            <p className="text-xs font-bold text-blue-600 uppercase tracking-widest">Internal & Category Details</p>
                        </div>
                        <div className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-2 py-1 border-b border-slate-100">
                            <span className="font-semibold text-slate-900 text-sm shrink-0 min-w-[130px]">Internal Owner:</span>
                            <span className="text-slate-700 text-sm break-all">{lgRecord.internal_owner_contact?.email || 'N/A'}</span>
                        </div>
                        <div className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-2 py-1 border-b border-slate-100">
                            <span className="font-semibold text-slate-900 text-sm shrink-0 min-w-[130px]">Owner Phone:</span>
                            <span className="text-slate-700 text-sm">{lgRecord.internal_owner_contact?.phone_number || 'N/A'}</span>
                        </div>
                        <div className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-2 py-1 border-b border-slate-100">
                            <span className="font-semibold text-slate-900 text-sm shrink-0 min-w-[130px]">Owner Manager:</span>
                            <span className="text-slate-700 text-sm break-all">{lgRecord.internal_owner_contact?.manager_email || 'N/A'}</span>
                        </div>
                        <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 py-1 border-b border-slate-100">
                            <span className="font-semibold text-slate-900 text-sm shrink-0 min-w-[130px]">LG Category:</span>
                            <span className="text-slate-700 text-sm inline-flex items-center gap-2 flex-wrap">
                                <span>{lgRecord.lg_category?.name || 'N/A'}</span>
                                {!isCorporateAdminView && !isGracePeriod && (
                                    <button
                                        type="button"
                                        onClick={handleChangeCategory}
                                        className="inline-flex items-center gap-1 ml-1 px-2.5 py-1 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg shadow-2xs transition-colors"
                                    >
                                        <Edit className="h-3 w-3" />
                                        Change
                                    </button>
                                )}
                            </span>
                        </div>
                        {lgRecord.lg_category?.extra_field_name && (
                            <div className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-2 py-1 border-b border-slate-100">
                                <span className="font-semibold text-slate-900 text-sm shrink-0 min-w-[130px]">{lgRecord.lg_category.extra_field_name}:</span>
                                <span className="text-slate-700 text-sm break-words">{lgRecord.additional_field_values?.[lgRecord.lg_category.extra_field_name] || 'N/A'}</span>
                            </div>
                        )}
                        <div className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-2 py-1 border-b border-slate-100">
                            <span className="font-semibold text-slate-900 text-sm shrink-0 min-w-[130px]">Contract/Project ID:</span>
                            <span className="text-slate-700 text-sm break-words">{lgRecord.internal_contract_project_id || 'N/A'}</span>
                        </div>
                        <div className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-2 py-1 border-b border-slate-100">
                            <span className="font-semibold text-slate-900 text-sm shrink-0 min-w-[130px]">Notes:</span>
                            <span className="text-slate-700 text-sm break-words">{lgRecord.notes || 'N/A'}</span>
                        </div>
                    </div>
                )}
				{activeTab === 'documents' && (
					<div className="p-4 bg-slate-50/60 rounded-2xl border border-slate-200/80 space-y-4">
						<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
							<div>
								<p className="text-xs font-bold text-blue-600 uppercase tracking-widest">Associated Documents &amp; Beneficiary Protection Check</p>
								<p className="text-[11px] text-slate-500 mt-0.5">
									Check incoming vendor guarantee wording (Arabic / English) for hidden conditions that could block or delay your right to claim.
								</p>
							</div>
							<div className="flex items-center flex-wrap gap-2">
								{(lgRecord.payment_conditions || lgRecord.other_conditions || lgRecord.mandatory_claim_statement) && (
									<button
										type="button"
										onClick={() => handleScanCustodyWording('CONDITIONS')}
										disabled={scanningCustodyDocId !== null}
										className="px-3 py-1.5 text-xs font-semibold rounded-xl shadow-2xs text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 flex items-center"
										title="Run Beneficiary Protection Check on recorded payment & claim conditions"
									>
										{scanningCustodyDocId === 'CONDITIONS' ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <ShieldCheck className="h-3.5 w-3.5 mr-1" />}
										Check Recorded Conditions
									</button>
								)}
								<button
									type="button"
									onClick={() => setShowPasteVendorWording((prev) => !prev)}
									className="px-3 py-1.5 text-xs font-semibold rounded-xl shadow-2xs text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 flex items-center"
								>
									<Sparkles className="h-3.5 w-3.5 mr-1" />
									{showPasteVendorWording ? 'Hide Text Box' : 'Paste Vendor LG Text (AR/EN)'}
								</button>
							</div>
						</div>

						{showPasteVendorWording && (
							<div className="p-3 bg-white rounded-xl border border-indigo-200 shadow-2xs space-y-2">
								<label className="block text-xs font-semibold text-slate-700">
									Paste Incoming Vendor / Bank Guarantee Wording (Arabic or English)
								</label>
								<textarea
									dir="auto"
									rows={4}
									value={pastedVendorWording}
									onChange={(e) => setPastedVendorWording(e.target.value)}
									placeholder="Paste draft or issued vendor LG wording here (e.g. 'نتعهد بأن ندفع لكم بمجرد أول طلب...' or 'We undertake to pay upon your first written demand...')..."
									className="w-full text-xs border border-slate-200 rounded-xl p-2.5 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:outline-none"
								/>
								<div className="flex justify-end gap-2">
									<button
										type="button"
										onClick={() => setShowPasteVendorWording(false)}
										className="px-3 py-1 text-xs text-slate-600 hover:text-slate-800"
									>
										Cancel
									</button>
									<button
										type="button"
										disabled={!pastedVendorWording.trim() || scanningCustodyDocId !== null}
										onClick={() => handleScanCustodyWording('PASTE', pastedVendorWording)}
										className="px-3 py-1.5 text-xs font-semibold rounded-xl text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 flex items-center"
									>
										{scanningCustodyDocId === 'PASTE' ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <ShieldCheck className="h-3.5 w-3.5 mr-1" />}
										Run Beneficiary Protection Check
									</button>
								</div>
							</div>
						)}

						{!isGracePeriod && (
							<div className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs flex flex-col md:flex-row md:items-center gap-3">
								<select
									value={supportingDocType}
									onChange={(e) => setSupportingDocType(e.target.value)}
									className="text-sm border border-slate-200 rounded-xl px-3 py-1.5 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
								>
									<option value="INTERNAL_SUPPORTING">Supporting Document</option>
									<option value="ORIGINAL_LG_DOCUMENT">Original LG Copy</option>
									<option value="AMENDMENT_LETTER">Amendment / Extension Letter</option>
									<option value="DELIVERY_PROOF">Delivery Proof</option>
									<option value="BANK_REPLY">Bank Reply</option>
								</select>
								<input
									type="file"
									multiple
									accept=".pdf,.png,.jpg,.jpeg"
									onChange={(e) => setSupportingFiles(Array.from(e.target.files || []))}
									className="text-sm text-slate-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 flex-1"
								/>
								<button
									type="button"
									disabled={isUploadingSupportingDoc || supportingFiles.length === 0}
									onClick={async () => {
										if (!supportingFiles.length) return;
										setIsUploadingSupportingDoc(true);
										try {
											const formData = new FormData();
											supportingFiles.forEach((f) => formData.append('files', f));
											formData.append('document_type', supportingDocType);
											await apiRequest(
												`/end-user/lg-records/${lgRecord.id}/documents`,
												'POST',
												formData,
												'multipart/form-data'
											);
											toast.success(`Uploaded ${supportingFiles.length} supporting document(s) successfully.`);
											setSupportingFiles([]);
											await fetchLgRecord(true);
										} catch (err) {
											toast.error(`Failed to upload document(s): ${err.message || 'Unexpected error'}`);
										} finally {
											setIsUploadingSupportingDoc(false);
										}
									}}
									className="px-4 py-1.5 text-sm font-semibold rounded-xl shadow-2xs text-white bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed flex items-center justify-center shrink-0"
								>
									{isUploadingSupportingDoc ? (
										<>
											<Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
											Uploading...
										</>
									) : (
										<>
											<FileText className="h-4 w-4 mr-1.5" />
											Upload Document{supportingFiles.length > 1 ? `s (${supportingFiles.length})` : ''}
										</>
									)}
								</button>
							</div>
						)}
						{/* Filter out documents where is_deleted is true */}
						{lgRecord.documents && lgRecord.documents.filter(doc => !doc.is_deleted).length > 0 ? (
							<div className="space-y-2">
								{lgRecord.documents
									.filter(doc => !doc.is_deleted) // Apply the filter here
									.map(doc => (
										<div key={doc.id} className="bg-white px-3.5 py-2.5 rounded-xl border border-slate-200 flex items-center justify-between flex-wrap gap-2">
											<div className="flex items-center gap-2 min-w-0 flex-1">
												<FileText className="h-4 w-4 text-blue-600 shrink-0" />
												<span className="text-sm font-medium text-slate-800 truncate" title={doc.file_name}>
													{doc.file_name}
												</span>
												<span className="px-2 py-0.5 text-[10px] font-semibold rounded-md bg-slate-100 text-slate-600 shrink-0">
													{doc.document_type}
												</span>
											</div>
											<div className="flex items-center gap-2 shrink-0">
												<button
													type="button"
													onClick={() => handleScanCustodyWording(doc.id)}
													disabled={scanningCustodyDocId !== null}
													className="px-3 py-1.5 text-xs font-semibold rounded-xl shadow-2xs text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 focus:outline-none flex items-center"
													title="Beneficiary Protection Check — inspect this incoming LG for claim hurdles (Arabic / English)"
												>
													{scanningCustodyDocId === doc.id ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <ShieldCheck className="h-3.5 w-3.5 mr-1" />}
													Beneficiary Protection Check
												</button>
												<button
													onClick={() => handleViewInstructionDocument(doc.id)}
													className="px-3 py-1.5 text-xs font-semibold rounded-xl shadow-2xs text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 focus:outline-none flex items-center"
													title="View Document Securely"
												>
													<Eye className="h-3.5 w-3.5 mr-1" /> View
												</button>
											</div>
										</div>
									))
								}
							</div>
						) : (
							<p className="text-slate-500 text-sm">No documents associated with this LG record.</p>
						)}

						{custodyWordingScan?.status === 'OK' && (
							<div className={`mt-4 p-4 rounded-xl border space-y-3 ${
								custodyWordingScan.risk_level === 'RED' ? 'bg-rose-50/70 border-rose-200' :
								custodyWordingScan.risk_level === 'AMBER' ? 'bg-amber-50/70 border-amber-200' :
								'bg-emerald-50/70 border-emerald-200'
							}`}>
								<div className="flex items-center justify-between flex-wrap gap-2">
									<div className="flex items-center flex-wrap gap-2">
										<span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-slate-800 text-white">
											<ShieldCheck className="h-3.5 w-3.5" />
											Beneficiary Protection Check (Incoming LG)
										</span>
										<span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase text-white ${
											custodyWordingScan.risk_level === 'RED' ? 'bg-rose-600' :
											custodyWordingScan.risk_level === 'AMBER' ? 'bg-amber-500' :
											'bg-emerald-600'
										}`}>
											{custodyWordingScan.risk_level}
										</span>
										<span className="text-sm font-bold text-slate-900">{custodyWordingScan.risk_label}</span>
										{custodyWordingScan.detected_language && (
											<span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded bg-white/90 border border-slate-200 text-slate-600">
												{custodyWordingScan.detected_language}
											</span>
										)}
									</div>
									<button type="button" onClick={() => setCustodyWordingScan(null)} className="text-xs text-slate-500 hover:text-slate-800">Dismiss</button>
								</div>
								{custodyWordingScan.executive_summary && (
									<p className="text-xs text-slate-700 bg-white/90 p-2.5 rounded-lg border border-slate-200">{custodyWordingScan.executive_summary}</p>
								)}
								{custodyWordingScan.positive_protections?.length > 0 && (
									<div className="p-2.5 rounded-lg bg-emerald-50/90 border border-emerald-200 space-y-1">
										<p className="text-[11px] font-bold text-emerald-900 uppercase tracking-wide">Confirmed Beneficiary Protections</p>
										<ul className="space-y-0.5">
											{custodyWordingScan.positive_protections.map((p, pIdx) => (
												<li key={pIdx} className="text-xs text-emerald-900 flex items-start gap-1.5">
													<CheckCircle className="h-3.5 w-3.5 text-emerald-600 shrink-0 mt-0.5" />
													<span>{p}</span>
												</li>
											))}
										</ul>
									</div>
								)}
								{custodyWordingScan.findings?.map((f, idx) => (
									<div key={idx} className="p-3 rounded-lg bg-white border border-slate-200 space-y-1">
										<div className="flex items-center justify-between">
											<span className="text-xs font-bold text-slate-900">{f.title}</span>
											<span className={`text-[10px] font-bold px-2 py-0.5 rounded-full text-white ${f.severity === 'RED' ? 'bg-rose-600' : 'bg-amber-500'}`}>{f.severity}</span>
										</div>
										<p className="text-xs text-slate-700">{f.plain_explanation}</p>
										{f.quoted_excerpt && <div dir="auto" className="text-[11px] italic text-slate-600 bg-slate-50 p-2 rounded">"{f.quoted_excerpt}"</div>}
										{f.suggested_protective_rewording && (
											<div dir="auto" className="text-[11px] text-emerald-900 bg-emerald-50 p-2 rounded">
												<strong>Amendment to Request from Vendor / Issuing Bank: </strong>
												{f.suggested_protective_rewording}
											</div>
										)}
									</div>
								))}
								<p className="text-[10px] text-slate-400 italic">Advisory check only — evaluates your company&apos;s right to claim as Beneficiary without altering LG custody status.</p>
							</div>
						)}
					</div>
				)}
                {activeTab === 'history' && (
                    <div id="lifecycle-history-section">
                        <LGLifecycleHistoryComponent
                            lgRecordId={lgRecord.id}
                            lgRecord={lgRecord}
                            lgInstructions={lgRecord.instructions || []}
                            lgDocuments={lgRecord.documents || []}
                            onRecordDelivery={isCorporateAdminView || isGracePeriod ? null : handleRecordDelivery}
                            onRecordBankReply={isCorporateAdminView || isGracePeriod ? null : handleRecordBankReply}
                            onSendReminder={isCorporateAdminView || isGracePeriod ? null : handleSendReminderToBank}
                            onViewInstructionLetter={handleViewInstructionLetterFromHistory}
                            onViewInstructionDocument={handleViewInstructionDocument}
                            onRefreshLgRecord={() => fetchLgRecord(true)}
                            isCorporateAdminView={isCorporateAdminView}
                        />
                    </div>
                )}
            </div>

            {/* Modals outside the conditional rendering blocks for availability */}
            {showChangeOwnerModal && lgRecord && (
                <ChangeLGOwnerModal
                    lgRecord={lgRecord}
                    onClose={() => setShowChangeOwnerModal(false)}
                    onSuccess={handleActionSuccess}
                    isGracePeriod={isGracePeriod}
                />
            )}
            {showChangeCategoryModal && lgRecord && (
                <ChangeLGCategoryModal
                    initialScope="single"
                    lgRecord={lgRecord}
                    onClose={() => setShowChangeCategoryModal(false)}
                    onSuccess={handleCategoryChangeSuccess}
                    isGracePeriod={isGracePeriod}
                />
            )}
            {showExtendModal && lgRecord && (
                <ExtendLGModal
                    lgRecord={lgRecord}
                    onClose={() => setShowExtendModal(false)}
                    onSuccess={handleActionSuccess}
                    isGracePeriod={isGracePeriod}
                />
            )}
            {showReleaseModal && lgRecord && (
                <ReleaseLGModal
                    lgRecord={lgRecord}
                    onClose={() => setShowReleaseModal(false)}
                    onSuccess={handleActionSuccess}
                    isGracePeriod={isGracePeriod}
                />
            )}
            {showLiquidateModal && lgRecord && (
                <LiquidateLGModal
                    lgRecord={lgRecord}
                    onClose={() => setShowLiquidateModal(false)}
                    onSuccess={handleActionSuccess}
                    isGracePeriod={isGracePeriod}
                />
            )}
            {showDecreaseAmountModal && lgRecord && (
                <DecreaseAmountModal
                    lgRecord={lgRecord}
                    onClose={() => setShowDecreaseAmountModal(false)}
                    onSuccess={handleActionSuccess}
                    isGracePeriod={isGracePeriod}
                />
            )}
            {showAmendModal && lgRecord && (
                <LGAmendModal
                    lgRecord={lgRecord}
                    onClose={() => setShowAmendModal(false)}
                    onSuccess={handleActionSuccess}
                />
            )}
            {showActivateModal && lgRecord && (
                <LGActivateNonOperativeModal
                    lgRecord={lgRecord}
                    onClose={() => setShowActivateModal(false)}
                    onSuccess={handleActionSuccess}
                />
            )}
            {/* The problematic modals, now outside the conditional block */}
            {showRecordDeliveryModal && selectedInstructionForAction && (
                <RecordDeliveryModal
                    instruction={selectedInstructionForAction}
                    onClose={() => setShowRecordDeliveryModal(false)}
                    onSuccess={handleActionSuccess}
                    isGracePeriod={isGracePeriod}
                />
            )}
            {showRecordBankReplyModal && selectedInstructionForAction && (
                <RecordBankReplyModal
                    instruction={selectedInstructionForAction}
                    onClose={() => setShowRecordBankReplyModal(false)}
                    onSuccess={handleActionSuccess}
                    isGracePeriod={isGracePeriod}
                />
            )}
        </div>
    );
}

export default LGDetailsPage;