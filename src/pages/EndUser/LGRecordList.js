// frontend/src/pages/EndUser/LGRecordList.js
// This component is now designed to be reusable by Corporate Admin for read-only view.

import React, { useState, useEffect, useMemo, useCallback, Fragment } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { apiRequest, API_BASE_URL, getAuthToken } from 'services/apiService.js';
// Added History to the lucide-react import
import { PlusCircle, Eye, Loader2, AlertCircle, ChevronUp, ChevronDown, Download, XCircle, History, Search } from 'lucide-react';
import moment from 'moment';
import ExtendLGModal from 'components/Modals/ExtendLGModal';
import ChangeLGOwnerModal from 'components/Modals/ChangeLGOwnerModal';
import ChangeLGCategoryModal from 'components/Modals/ChangeLGCategoryModal';
import LGActionsMenu from 'components/LGActionsMenu';
import ReleaseLGModal from 'components/Modals/ReleaseLGModal';
import LiquidateLGModal from 'components/Modals/LiquidateLGModal';
import DecreaseAmountModal from 'components/Modals/DecreaseAmountModal';
import LGAmendModal from 'components/Modals/LGAmendModal';
import LGActivateNonOperativeModal from 'components/Modals/LGActivateNonOperativeModal';
import CancelLiquidationModal from 'components/Modals/CancelLiquidationModal';
import RecordLiquidationFundsModal from 'components/Modals/RecordLiquidationFundsModal';
import FormattedDateInput from 'components/FormattedDateInput';
import { Switch } from '@headlessui/react';
import { toast } from 'react-toastify';
import { Listbox, Transition, Menu } from '@headlessui/react';
import * as XLSX from 'xlsx';

// Added HistoryExportModal import
import HistoryExportModal from 'components/Modals/HistoryExportModal';
import { SkeletonTable } from 'components/SkeletonLoader';

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

const buttonBaseClassNames = "inline-flex items-center px-3.5 py-2 text-xs sm:text-sm font-semibold rounded-xl transition-all duration-200";

function LGRecordList({ onLogout, isCorporateAdminView = false, isGracePeriod }) {
  const navigate = useNavigate();
  const location = useLocation();
  const queryParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const filterByOwnerId = queryParams.get('ownerId');
  const filterByCategory = queryParams.get('category');
  const [lgRecords, setLgRecords] = useState([]);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState('');

  // Added state for History Modal
  const [showHistoryModal, setShowHistoryModal] = useState(false);

  const [showExtendModal, setShowExtendModal] = useState(false);
  const [selectedLgRecordForExtension, setSelectedLgRecordForExtension] = useState(null);

  const [showChangeOwnerModal, setShowChangeOwnerModal] = useState(false);
  const [selectedLgRecordForOwnerChange, setSelectedLgRecordForOwnerChange] = useState(null);

  const [showReleaseModal, setShowReleaseModal] = useState(false);
  const [selectedLgRecordForRelease, setSelectedLgRecordForRelease] = useState(null);

  const [showLiquidateModal, setShowLiquidateModal] = useState(false);
  const [selectedLgRecordForLiquidate, setSelectedLgRecordForLiquidate] = useState(null);

  const [showDecreaseAmountModal, setShowDecreaseAmountModal] = useState(false);
  const [selectedLgRecordForDecreaseAmount, setSelectedLgRecordForDecreaseAmount] = useState(null);

  const [showAmendModal, setShowAmendModal] = useState(false);
  const [selectedLgRecordForAmend, setSelectedLgRecordForAmend] = useState(null);

  const [showActivateModal, setShowActivateModal] = useState(false);
  const [selectedLgRecordForActivate, setSelectedLgRecordForActivate] = useState(null);

  const [showCancelLiquidationModal, setShowCancelLiquidationModal] = useState(false);
  const [selectedLgForCancelLiquidation, setSelectedLgForCancelLiquidation] = useState(null);

  const [showRecordFundsModal, setShowRecordFundsModal] = useState(false);
  const [selectedLgForRecordFunds, setSelectedLgForRecordFunds] = useState(null);

  const [sortColumn, setSortColumn] = useState('custody_serial');
  const [sortDirection, setSortDirection] = useState('asc');

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatuses, setSelectedStatuses] = useState([]);
  const [showCriticalOnly, setShowCriticalOnly] = useState(false);

  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTypes, setSelectedTypes] = useState([]);
  const [selectedCategories, setSelectedCategories] = useState(
    filterByCategory ? [filterByCategory] : []
  );
  const [lgCategories, setLgCategories] = useState([]);
  const [categoryModalState, setCategoryModalState] = useState({
    isOpen: false,
    lgRecord: null,
  });

  useEffect(() => {
    if (filterByCategory) {
      setSelectedCategories([filterByCategory]);
    }
  }, [filterByCategory]);

  const [allLgRecords, setAllLgRecords] = useState([]);

  const fetchLgRecords = useCallback(async (isBackgroundRefresh = false) => {
    if (!isBackgroundRefresh) {
      setIsInitialLoading(true);
    } else {
      setIsRefreshing(true);
    }
    setError('');
    try {
      let url = '/end-user/lg-records/';
      if (filterByOwnerId) {
          url += `?internal_owner_contact_id=${filterByOwnerId}`;
      }
      const [response, catsResponse] = await Promise.all([
        apiRequest(url, 'GET'),
        apiRequest('/end-user/lg-categories/', 'GET').catch(() => []),
      ]);
      setLgRecords(response);
      setAllLgRecords(response);
      if (Array.isArray(catsResponse)) {
        setLgCategories(catsResponse);
      }
    } catch (err) {
      console.error('Failed to fetch LG records:', err);
      setError(`Failed to load LG Records. ${err.message || 'An unexpected error occurred.'}`);
    } finally {
      if (!isBackgroundRefresh) {
        setIsInitialLoading(false);
      }
      setIsRefreshing(false);
    }
  }, [filterByOwnerId]);

  useEffect(() => {
    fetchLgRecords(false);
  }, [fetchLgRecords]);

  const handleActionSuccess = (updatedRecordFromBackend, latestInstructionId = null) => {
    setShowExtendModal(false);
    setSelectedLgRecordForExtension(null);
    setShowChangeOwnerModal(false);
    setSelectedLgRecordForOwnerChange(null);
    setShowReleaseModal(false);
    setSelectedLgRecordForRelease(null);
    setShowLiquidateModal(false);
    setSelectedLgRecordForLiquidate(null);
    setShowDecreaseAmountModal(false);
    setSelectedLgRecordForDecreaseAmount(null);
    setShowAmendModal(false);
    setSelectedLgRecordForAmend(null);
    setShowActivateModal(false);
    setSelectedLgRecordForActivate(null);

    setLgRecords(prevRecords => {
        if (!updatedRecordFromBackend || !updatedRecordFromBackend.id) {
            console.error("Action success handler called without a valid updated LG record from backend.");
            return prevRecords;
        }

        return prevRecords.map(rec => {
            if (!rec || typeof rec.id === 'undefined') {
                return rec;
            }
            return rec.id === updatedRecordFromBackend.id ? updatedRecordFromBackend : rec;
        });
    });

    toast.success("LG action completed successfully!");

    if (latestInstructionId) {
        const recordToView = updatedRecordFromBackend;
        setTimeout(() => {
            handleViewLetter(recordToView);
        }, 50);
    }
  };

  const handleViewDetails = (lgRecordId) => {
    const detailsPath = isCorporateAdminView ? `/corporate-admin/lg-records/${lgRecordId}` : `/end-user/lg-records/${lgRecordId}`;
    navigate(detailsPath);
  };

  // Helper to stop propagation for interactive elements inside the clickable row
  const handleInteractiveClick = (e, callback) => {
    e.stopPropagation();
    if (callback) callback();
  };

  const handleExtend = (record) => {
    if (!isCorporateAdminView && !isGracePeriod) {
      setSelectedLgRecordForExtension(record);
      setShowExtendModal(true);
    }
  };

  const handleChangeOwner = (record) => {
    if (!isCorporateAdminView && !isGracePeriod) {
      setSelectedLgRecordForOwnerChange(record);
      setShowChangeOwnerModal(true);
    }
  };

  const handleRelease = (record) => {
    if (!isCorporateAdminView && !isGracePeriod) {
      setSelectedLgRecordForRelease(record);
      setShowReleaseModal(true);
    }
  };

  const handleLiquidate = (record) => {
    if (!isCorporateAdminView && !isGracePeriod) {
      setSelectedLgRecordForLiquidate(record);
      setShowLiquidateModal(true);
    }
  };

  const handleDecreaseAmount = (record) => {
    if (!isCorporateAdminView && !isGracePeriod) {
      setSelectedLgRecordForDecreaseAmount(record);
      setShowDecreaseAmountModal(true);
    }
  };

  const handleAmend = (record) => {
    if (!isCorporateAdminView && !isGracePeriod) {
      setSelectedLgRecordForAmend(record);
      setShowAmendModal(true);
    }
  };

  const handleActivate = (record) => {
    if (!isCorporateAdminView && !isGracePeriod) {
      setSelectedLgRecordForActivate(record);
      setShowActivateModal(true);
    }
  };

  const handleCancelLiquidation = (record) => {
    if (!isCorporateAdminView && !isGracePeriod) {
      setSelectedLgForCancelLiquidation(record);
      setShowCancelLiquidationModal(true);
    }
  };

  const handleRecordFunds = (record) => {
    if (!isCorporateAdminView && !isGracePeriod) {
      setSelectedLgForRecordFunds(record);
      setShowRecordFundsModal(true);
    }
  };

  const handleOpenSingleCategoryModal = (record) => {
    if (!isCorporateAdminView && !isGracePeriod) {
      setCategoryModalState({ isOpen: true, lgRecord: record });
    }
  };

  const handleCategoryChangeSuccess = () => {
    setCategoryModalState({ isOpen: false, lgRecord: null });
    fetchLgRecords(true);
  };

  const handleToggleAutoRenewal = useCallback(async (record, newStatus) => {
    if (isCorporateAdminView || isGracePeriod) {
      if (isGracePeriod) toast.warn("This action is disabled during your subscription's grace period.");
      return;
    }

    const originalLgRecords = lgRecords;

    setLgRecords(prevRecords =>
        prevRecords.map(rec =>
            rec.id === record.id ? { ...rec, auto_renewal: newStatus } : rec
        )
    );

    try {
        const payload = {
            auto_renewal: newStatus,
            reason: `Auto-renewal toggled to ${newStatus ? 'ON' : 'OFF'} from list view.`
        };
        const response = await apiRequest(`/end-user/lg-records/${record.id}/toggle-auto-renewal`, 'POST', payload);
        toast.success(response.message);
        setLgRecords(prevRecords =>
            prevRecords.map(rec =>
                rec.id === response.lg_record.id ? response.lg_record : rec
            )
        );
    } catch (err) {
        console.error("Failed to toggle auto-renewal:", err);
        setLgRecords(originalLgRecords);
        setError(`Failed to toggle auto-renewal. ${err.message || 'An unexpected error occurred.'}`);
        toast.error(`Failed to toggle auto-renewal. ${err.message || 'An unexpected error occurred.'}`);
    }
  }, [lgRecords, isCorporateAdminView, isGracePeriod]);

  const getLatestInstruction = (record) => {
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
    const latest = sortedInstructions[sortedInstructions.length - 1];
    return latest;
  };

  const handleViewLetter = async (record) => {
    const latestInstruction = getLatestInstruction(record);

    if (latestInstruction && latestInstruction.id) {
      try {
        if (!isCorporateAdminView) {
            await apiRequest(
              `/end-user/lg-records/instructions/${latestInstruction.id}/mark-as-accessed-for-print`,
              'POST'
            );
        }

        const authToken = getAuthToken();
        let letterUrl = `${API_BASE_URL}/end-user/lg-records/instructions/${latestInstruction.id}/view-letter`;

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

  const formatCustodySerial = (record) => {
    if (record?.custody_serial) return record.custody_serial;
    const seq = record?.lg_sequence_number || 1;
    return `01-${String(seq).padStart(4, '0')}`;
  };

  const getRecordVisualMeta = (record) => {
    const statusName = record?.lg_status?.name || 'N/A';
    const isValidStatus = statusName === 'Valid';
    const isInactive = !isValidStatus; // Expired, Released, Liquidated, etc.
    const daysLeft = record?.expiry_date
      ? moment(record.expiry_date).startOf('day').diff(moment().startOf('day'), 'days')
      : null;
    const isCritical = isValidStatus && daysLeft !== null && daysLeft <= 30;
    const isApproaching = isValidStatus && daysLeft !== null && daysLeft > 30 && daysLeft <= 60;

    const statusPillClass =
      statusName === 'Valid'
        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
        : statusName === 'Expired'
          ? 'bg-rose-50/80 text-rose-600 border border-rose-200/80'
          : statusName === 'Liquidated'
            ? 'bg-purple-50 text-purple-700 border border-purple-200'
            : 'bg-slate-100 text-slate-600 border border-slate-200'; // Released & others

    return { statusName, isValidStatus, isInactive, daysLeft, isCritical, isApproaching, statusPillClass };
  };

  const handleSort = (column) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const handleClearFilters = () => {
    setSearchTerm('');
    setSelectedStatuses([]);
    setShowCriticalOnly(false);
    setSelectedDate('');
    setSelectedTypes([]);
    setSelectedCategories([]);
    if (filterByCategory) {
      navigate(
        filterByOwnerId ? `${location.pathname}?ownerId=${filterByOwnerId}` : location.pathname,
        { replace: true }
      );
    }
  };

  const criticalCount = useMemo(
    () =>
      lgRecords.filter(
        (r) =>
          r?.lg_status?.name === 'Valid' &&
          r?.expiry_date &&
          moment(r.expiry_date).startOf('day').diff(moment().startOf('day'), 'days') <= 30
      ).length,
    [lgRecords]
  );

  const uniqueStatuses = useMemo(() => {
    const statuses = new Set();
    lgRecords.forEach(record => {
      if (record.lg_status?.name) {
        statuses.add(record.lg_status.name);
      }
    });
    return Array.from(statuses).sort();
  }, [lgRecords]);

  const uniqueTypes = useMemo(() => {
    const types = new Set();
    lgRecords.forEach(record => {
      if (record.lg_type?.name) {
        types.add(record.lg_type.name);
      }
    });
    return Array.from(types).sort();
  }, [lgRecords]);

  const uniqueCategories = useMemo(() => {
    const cats = new Set();
    lgRecords.forEach(record => {
      if (record.lg_category?.name) {
        cats.add(record.lg_category.name);
      }
    });
    return Array.from(cats).sort();
  }, [lgRecords]);

  const filteredAndSortedRecords = useMemo(() => {
    if (!lgRecords || lgRecords.length === 0) return [];

    const trimmedSearchTerm = searchTerm.trim().toLowerCase();

    const filteredRecords = lgRecords.filter(record => {
        const matchesSearchTerm = !trimmedSearchTerm || (
          formatCustodySerial(record).toLowerCase().includes(trimmedSearchTerm) ||
          formatCustodySerial(record).replace('-', '').toLowerCase().includes(trimmedSearchTerm) ||
          (record.lg_number || '').toLowerCase().includes(trimmedSearchTerm) ||
          (record.issuer_name || '').toLowerCase().includes(trimmedSearchTerm) || 
          (record.beneficiary_corporate?.entity_name || '').toLowerCase().includes(trimmedSearchTerm) ||
          (record.issuing_bank?.name || '').toLowerCase().includes(trimmedSearchTerm) ||
          (record.foreign_bank_name || '').toLowerCase().includes(trimmedSearchTerm) ||
          (record.lg_category?.name || '').toLowerCase().includes(trimmedSearchTerm) ||
          formatAmount(record.lg_amount, record.lg_currency?.iso_code).toLowerCase().includes(trimmedSearchTerm) ||
          formatDate(record.expiry_date).toLowerCase().includes(trimmedSearchTerm)
        );

        const matchesStatus = selectedStatuses.length === 0 ||
                              (record.lg_status?.name && selectedStatuses.includes(record.lg_status.name));
        
        const matchesDate = !selectedDate || 
            (record.issuance_date && record.expiry_date && 
             new Date(record.issuance_date) < new Date(selectedDate) && 
             new Date(selectedDate) < new Date(record.expiry_date));

        const matchesType = selectedTypes.length === 0 ||
                            (record.lg_type?.name && selectedTypes.includes(record.lg_type.name));

        const matchesCategory = selectedCategories.length === 0 ||
                                (record.lg_category?.name && selectedCategories.includes(record.lg_category.name));

        const matchesCritical = !showCriticalOnly || (
          record.lg_status?.name === 'Valid' &&
          record.expiry_date &&
          moment(record.expiry_date).startOf('day').diff(moment().startOf('day'), 'days') <= 30
        );

        return matchesSearchTerm && matchesStatus && matchesDate && matchesType && matchesCategory && matchesCritical;
    });

    const sortableRecords = [...filteredRecords];

    sortableRecords.sort((a, b) => {
      let aValue;
      let bValue;

      switch (sortColumn) {
        case 'custody_serial':
          aValue = formatCustodySerial(a);
          bValue = formatCustodySerial(b);
          break;
        case 'lg_number':
          aValue = a.lg_number;
          bValue = b.lg_number;
          break;
        case 'issuer_name':
            aValue = a.issuer_name || '';
            bValue = b.issuer_name || '';
            break;
        case 'beneficiary_corporate':
          aValue = a.beneficiary_corporate?.entity_name || '';
          bValue = b.beneficiary_corporate?.entity_name || '';
          break;
        case 'lg_amount':
          aValue = parseFloat(a.lg_amount || 0);
          bValue = parseFloat(b.lg_amount || 0);
          break;
        case 'issuing_bank':
          const aBankName = (a.issuing_bank?.name === 'Foreign Bank' ? a.foreign_bank_name : a.issuing_bank?.name) || '';
          const bBankName = (b.issuing_bank?.name === 'Foreign Bank' ? b.foreign_bank_name : b.issuing_bank?.name) || '';
          aValue = aBankName;
          bValue = bBankName;
          break;
        case 'lg_category':
            aValue = a.lg_category?.name || '';
            bValue = b.lg_category?.name || '';
            break;
        case 'expiry_date':
          aValue = new Date(a.expiry_date);
          bValue = new Date(b.expiry_date);
          break;
        case 'lg_status':
          aValue = a.lg_status?.name || '';
          bValue = b.lg_status?.name || '';
          break;
        default:
          aValue = a[sortColumn];
          bValue = b[sortColumn];
      }

      if (typeof aValue === 'string' || typeof bValue === 'string') {
        return sortDirection === 'asc'
          ? String(aValue).localeCompare(String(bValue))
          : String(bValue).localeCompare(String(aValue));
      } else {
        if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
        return 0;
      }
    });

    return sortableRecords;
  }, [lgRecords, sortColumn, sortDirection, searchTerm, selectedStatuses, showCriticalOnly, selectedDate, selectedTypes, selectedCategories]);

  const handleExportToExcel = (dataToExport) => {
    const exportData = dataToExport.map(record => {
      // Logic to determine Bank Details (Foreign vs Local) based on LGDetailsPage logic
      const isForeignBank = record.issuing_bank?.name === 'Foreign Bank';
      const bankName = isForeignBank ? record.foreign_bank_name : record.issuing_bank?.name;
      const bankAddress = isForeignBank ? record.foreign_bank_address : record.issuing_bank_address;
      const bankPhoneOrCountry = isForeignBank ? record.foreign_bank_country : record.issuing_bank_phone;

      // Logic for Dynamic Category Extra Field
      const extraFieldName = record.lg_category?.extra_field_name;
      const extraFieldValue = extraFieldName && record.additional_field_values 
        ? record.additional_field_values[extraFieldName] 
        : 'N/A';

      return {
        // --- Core Information ---
        'SN': formatCustodySerial(record),
        'LG Number': record.lg_number,
        'Issuer Name': record.issuer_name || 'N/A',
        'Beneficiary': record.beneficiary_corporate?.entity_name || 'N/A',
        'Amount': record.lg_amount,
        'Currency': record.lg_currency?.iso_code || 'N/A',
        'LG Type': record.lg_type?.name || 'N/A',
        'Status': record.lg_status?.name || 'N/A',
        'Operational Status': record.lg_operational_status?.name || 'N/A',
        'Issuance Date': formatDate(record.issuance_date),
        'Expiry Date': formatDate(record.expiry_date),
        'Period (Months)': record.lg_period_months || 'N/A',
        'Auto Renewal': record.auto_renewal ? 'Yes' : 'No',
        'Purpose': record.description_purpose || 'N/A',

        // --- Bank & Rules Information ---
        'Issuing Bank': bankName || 'N/A',
        'Bank Address': bankAddress || 'N/A',
        'Bank Phone/Country': bankPhoneOrCountry || 'N/A',
        'Issuing Method': record.issuing_method?.name || 'N/A',
        'Applicable Rule': record.applicable_rule?.name || 'N/A',
        'Rules Text': record.applicable_rules_text || 'N/A',
        'Advising Status': record.advising_status || 'N/A',
        // Note: Advising Bank Name requires a separate lookup not present in the list view, 
        // so we export the ID if available or the raw field.
        'Communication Bank ID': record.communication_bank_id || 'N/A', 
        'Other Conditions': record.other_conditions || 'N/A',

        // --- Internal & Category Details ---
        'Category': record.lg_category?.name || 'N/A',
        'Category Extra Field Name': extraFieldName || 'N/A',
        'Category Extra Field Value': extraFieldValue,
        'Internal Project ID': record.internal_contract_project_id || 'N/A',
        'Internal Owner Email': record.internal_owner_contact?.email || 'N/A',
        'Internal Owner Phone': record.internal_owner_contact?.phone_number || 'N/A',
        'Internal Owner Manager': record.internal_owner_contact?.manager_email || 'N/A',
        'Notes': record.notes || 'N/A'
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    // Auto-adjust column width (optional, but makes the excel nicer)
    const wscols = Object.keys(exportData[0] || {}).map(() => ({ wch: 20 }));
    worksheet['!cols'] = wscols;

    XLSX.utils.book_append_sheet(workbook, worksheet, "LG Records");
    XLSX.writeFile(workbook, `LG_Records_Export_${moment().format('YYYY-MM-DD')}.xlsx`);
  };

  const renderSortIcon = (column) => {
    if (sortColumn === column) {
      return sortDirection === 'asc' ? <ChevronUp className="ml-1 h-4 w-4" /> : <ChevronDown className="ml-1 h-4 w-4" />;
    }
    return null;
  };

  return (
    <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              {filterByOwnerId ? `LGs for Owner ID: ${filterByOwnerId}` : `Manage LG Records`}
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">View, filter, and manage your Letters of Guarantee portfolio.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
            {(searchTerm.length > 0 || selectedStatuses.length > 0 || showCriticalOnly || selectedDate || selectedTypes.length > 0 || selectedCategories.length > 0) && (
              <button
                  onClick={handleClearFilters}
                  className={`${buttonBaseClassNames} bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 shadow-2xs`}
              >
                  <XCircle className="h-4 w-4 mr-1.5 text-slate-500" />
                  Clear Filters
              </button>
            )}
            <Menu as="div" className="relative inline-block text-left">
              <Menu.Button className={`${buttonBaseClassNames} bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 shadow-2xs`}>
                <Download className="h-4 w-4 mr-1.5 text-slate-500" />
                Export
              </Menu.Button>
              <Transition
                as={Fragment}
                enter="transition ease-out duration-100"
                enterFrom="transform opacity-0 scale-95"
                enterTo="transform opacity-100 scale-100"
                leave="transition ease-in duration-75"
                leaveFrom="transform opacity-100 scale-100"
                leaveTo="transform opacity-0 scale-95"
              >
                <Menu.Items className="absolute right-0 z-50 mt-2 w-56 origin-top-right rounded-xl bg-white border border-slate-200 shadow-xl py-1 focus:outline-none">
                  <div className="py-1">
                    <Menu.Item>
                      {({ active }) => (
                        <a
                          href="#"
                          onClick={() => handleExportToExcel(filteredAndSortedRecords)}
                          className={`
                            ${active ? 'bg-slate-50 text-slate-900' : 'text-slate-700'}
                            block px-4 py-2 text-xs sm:text-sm
                          `}
                        >
                          Export Filtered Data ({filteredAndSortedRecords.length})
                        </a>
                      )}
                    </Menu.Item>
                    <Menu.Item>
                      {({ active }) => (
                        <a
                          href="#"
                          onClick={() => handleExportToExcel(allLgRecords)}
                          className={`
                            ${active ? 'bg-slate-50 text-slate-900' : 'text-slate-700'}
                            block px-4 py-2 text-xs sm:text-sm
                          `}
                        >
                          Export All Data ({allLgRecords.length})
                        </a>
                      )}
                    </Menu.Item>
                  </div>
                </Menu.Items>
              </Transition>
            </Menu>

            <button
                onClick={() => setShowHistoryModal(true)}
                className={`${buttonBaseClassNames} bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 shadow-2xs`}
                title="Export full audit history of actions"
            >
                <History className="h-4 w-4 mr-1.5 text-slate-500" />
                History
            </button>

            {!isCorporateAdminView && (
              <GracePeriodTooltip isGracePeriod={isGracePeriod}>
                <button
                    onClick={() => navigate('/end-user/lg-records/new')}
                    className={`${buttonBaseClassNames} bg-blue-600 text-white hover:bg-blue-700 shadow-sm ${isGracePeriod ? 'opacity-50 cursor-not-allowed' : ''}`}
                    disabled={isGracePeriod}
                >
                    <PlusCircle className="h-4 w-4 mr-1.5" />
                    Record New LG
                </button>
              </GracePeriodTooltip>
            )}
        </div>
      </div>

      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-xl relative mb-4 flex items-center text-sm" role="alert">
          <AlertCircle className="h-5 w-5 mr-2 shrink-0" />
          <span className="block sm:inline">{error}</span>
        </div>
      )}

      {isInitialLoading ? (
        <SkeletonTable rows={6} cols={8} className="my-4" />
      ) : lgRecords.length === 0 ? (
        <div className="bg-slate-50 p-6 rounded-2xl text-center border border-slate-200">
          <p className="text-slate-500 text-sm">No LG records found for your customer.</p>
        </div>
      ) : (
        <>
          <div className="mb-3 p-2.5 bg-slate-50/70 rounded-xl border border-slate-200/80 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-2.5">
            <div className="relative flex-1 min-w-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Search by LG No., Issuer, Beneficiary, Bank, Category..."
                className="block w-full border border-slate-200 bg-white pl-9 pr-3 py-1.5 text-xs sm:text-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div className="flex flex-wrap sm:flex-nowrap items-center gap-2">
              {(criticalCount > 0 || showCriticalOnly) && (
                <button
                  type="button"
                  onClick={() => setShowCriticalOnly((prev) => !prev)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs sm:text-sm font-semibold border transition-all shrink-0 ${
                    showCriticalOnly
                      ? 'bg-rose-600 text-white border-rose-600 shadow-sm'
                      : 'bg-white text-rose-700 border-rose-200 hover:bg-rose-50'
                  }`}
                  title="Show only Valid LGs expiring within 30 days"
                >
                  <span className={`w-2 h-2 rounded-full ${showCriticalOnly ? 'bg-white' : 'bg-rose-500'}`} />
                  <span>Critical ({criticalCount})</span>
                </button>
              )}
              <div className="w-full sm:w-36 shrink-0">
                <FormattedDateInput
                  className="w-full cursor-pointer rounded-xl border border-slate-200 bg-white py-1.5 px-3 text-xs sm:text-sm shadow-2xs focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  placeholder="Filter by date"
                  title="Show LGs where: Issuance Date < Selected Date < Expiry Date"
                />
              </div>

              <Listbox value={selectedStatuses} onChange={setSelectedStatuses} multiple>
                {({ open }) => (
                  <div className="relative w-full sm:w-36 shrink-0">
                    <Listbox.Button className="w-full cursor-default rounded-xl border border-slate-200 bg-white py-1.5 pl-3 pr-8 text-left shadow-2xs focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-xs sm:text-sm">
                      <span className="block truncate">
                        {selectedStatuses.length === 0
                          ? 'Status: All'
                          : selectedStatuses.length === uniqueStatuses.length
                            ? 'All Statuses'
                            : selectedStatuses.join(', ')}
                      </span>
                      <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                        <ChevronDown className="h-4 w-4 text-slate-400" aria-hidden="true" />
                      </span>
                    </Listbox.Button>

                    <Transition
                      show={open}
                      as={Fragment}
                      leave="transition ease-in duration-100"
                      leaveFrom="opacity-100"
                      leaveTo="opacity-0"
                    >
                      <Listbox.Options className="absolute z-50 mt-1 max-h-60 w-48 overflow-auto rounded-xl bg-white py-1 text-xs sm:text-sm shadow-xl border border-slate-200 focus:outline-none">
                        {uniqueStatuses.map((status) => (
                          <Listbox.Option
                            key={status}
                            className={({ active }) =>
                              `relative cursor-default select-none py-2 pl-8 pr-4 ${
                                active ? 'bg-blue-600 text-white' : 'text-slate-900'
                              }`
                            }
                            value={status}
                          >
                            {({ selected, active }) => (
                              <>
                                <span className={`block truncate ${selected ? 'font-semibold' : 'font-normal'}`}>
                                  {status}
                                </span>
                                {selected ? (
                                  <span
                                    className={`absolute inset-y-0 left-0 flex items-center pl-2 ${
                                      active ? 'text-white' : 'text-blue-600'
                                    }`}
                                  >
                                    ✓
                                  </span>
                                ) : null}
                              </>
                            )}
                          </Listbox.Option>
                        ))}
                      </Listbox.Options>
                    </Transition>
                  </div>
                )}
              </Listbox>

              <Listbox value={selectedTypes} onChange={setSelectedTypes} multiple>
                {({ open }) => (
                  <div className="relative w-full sm:w-36 shrink-0">
                    <Listbox.Button className="w-full cursor-default rounded-xl border border-slate-200 bg-white py-1.5 pl-3 pr-8 text-left shadow-2xs focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-xs sm:text-sm">
                      <span className="block truncate">
                        {selectedTypes.length === 0
                          ? 'Type: All'
                          : selectedTypes.length === uniqueTypes.length
                            ? 'All Types'
                            : selectedTypes.join(', ')}
                      </span>
                      <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                        <ChevronDown className="h-4 w-4 text-slate-400" aria-hidden="true" />
                      </span>
                    </Listbox.Button>

                    <Transition
                      show={open}
                      as={Fragment}
                      leave="transition ease-in duration-100"
                      leaveFrom="opacity-100"
                      leaveTo="opacity-0"
                    >
                      <Listbox.Options className="absolute z-50 mt-1 max-h-60 w-48 overflow-auto rounded-xl bg-white py-1 text-xs sm:text-sm shadow-xl border border-slate-200 focus:outline-none">
                        {uniqueTypes.map((type) => (
                          <Listbox.Option
                            key={type}
                            className={({ active }) =>
                              `relative cursor-default select-none py-2 pl-8 pr-4 ${
                                active ? 'bg-blue-600 text-white' : 'text-slate-900'
                              }`
                            }
                            value={type}
                          >
                            {({ selected, active }) => (
                              <>
                                <span className={`block truncate ${selected ? 'font-semibold' : 'font-normal'}`}>
                                  {type}
                                </span>
                                {selected ? (
                                  <span
                                    className={`absolute inset-y-0 left-0 flex items-center pl-2 ${
                                      active ? 'text-white' : 'text-blue-600'
                                    }`}
                                  >
                                    ✓
                                  </span>
                                ) : null}
                              </>
                            )}
                          </Listbox.Option>
                        ))}
                      </Listbox.Options>
                    </Transition>
                  </div>
                )}
              </Listbox>

              <Listbox value={selectedCategories} onChange={setSelectedCategories} multiple>
                {({ open }) => (
                  <div className="relative w-full sm:w-36 shrink-0">
                    <Listbox.Button className="w-full cursor-default rounded-xl border border-slate-200 bg-white py-1.5 pl-3 pr-8 text-left shadow-2xs focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-xs sm:text-sm">
                      <span className="block truncate">
                        {selectedCategories.length === 0
                          ? 'Category: All'
                          : selectedCategories.length === uniqueCategories.length
                            ? 'All Categories'
                            : selectedCategories.join(', ')}
                      </span>
                      <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                        <ChevronDown className="h-4 w-4 text-slate-400" aria-hidden="true" />
                      </span>
                    </Listbox.Button>

                    <Transition
                      show={open}
                      as={Fragment}
                      leave="transition ease-in duration-100"
                      leaveFrom="opacity-100"
                      leaveTo="opacity-0"
                    >
                      <Listbox.Options className="absolute right-0 z-50 mt-1 max-h-60 w-52 overflow-auto rounded-xl bg-white py-1 text-xs sm:text-sm shadow-xl border border-slate-200 focus:outline-none">
                        {uniqueCategories.map((catName) => (
                          <Listbox.Option
                            key={catName}
                            className={({ active }) =>
                              `relative cursor-default select-none py-2 pl-8 pr-4 ${
                                active ? 'bg-blue-600 text-white' : 'text-gray-900'
                              }`
                            }
                            value={catName}
                          >
                            {({ selected, active }) => (
                              <>
                                <span className={`block truncate ${selected ? 'font-semibold' : 'font-normal'}`}>
                                  {catName}
                                </span>
                                {selected ? (
                                  <span
                                    className={`absolute inset-y-0 left-0 flex items-center pl-2 ${
                                      active ? 'text-white' : 'text-blue-600'
                                    }`}
                                  >
                                    ✓
                                  </span>
                                ) : null}
                              </>
                            )}
                          </Listbox.Option>
                        ))}
                      </Listbox.Options>
                    </Transition>
                  </div>
                )}
              </Listbox>
            </div>
          </div>

          {/* MOBILE VIEW: Cards for Small Screens (< md) */}
          <div className="md:hidden space-y-3">
            {filteredAndSortedRecords.length === 0 ? (
              <div className="p-6 text-center text-gray-500 bg-gray-50 rounded-xl border border-gray-200">
                No matching LG records found.
              </div>
            ) : (
              filteredAndSortedRecords.map((record) => {
                const {
                  statusName,
                  isValidStatus,
                  isInactive,
                  daysLeft,
                  isCritical,
                  isApproaching,
                  statusPillClass,
                } = getRecordVisualMeta(record);
                const isClosedLock = statusName === 'Released' || statusName === 'Liquidated';

                return (
                <div
                  key={`mobile-${record.id}`}
                  className={`p-4 rounded-xl border shadow-sm hover:shadow-md transition-all flex flex-col gap-2.5 ${
                    isCritical
                      ? 'bg-white border-rose-200 border-l-4 border-l-rose-500'
                      : isInactive
                        ? 'bg-slate-50/70 border-slate-200 opacity-85'
                        : 'bg-white border-gray-200'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <button
                        onClick={() => handleViewDetails(record.id)}
                        className={`font-bold text-base text-left truncate ${
                          isInactive ? 'text-slate-600 hover:text-blue-600' : 'text-blue-600 hover:text-blue-800'
                        }`}
                      >
                        <span className="inline-flex items-center gap-2">
                          <span className="px-1.5 py-0.5 text-[11px] font-mono font-semibold bg-slate-100 text-slate-600 rounded border border-slate-200">{formatCustodySerial(record)}</span>
                          <span>{record.lg_number}</span>
                        </span>
                      </button>
                    </div>
                    <span className={`px-2.5 py-0.5 text-xs font-bold rounded-full ${statusPillClass}`}>
                      {statusName}
                    </span>
                  </div>

                  <div className={`text-lg font-extrabold ${isInactive ? 'text-slate-600' : 'text-gray-900'}`}>
                    {formatAmount(record.lg_amount, record.lg_currency?.iso_code)}
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs text-gray-600 bg-gray-50 p-2.5 rounded-lg">
                    <div>
                      <span className="text-gray-400 block text-[10px] uppercase font-semibold">Beneficiary</span>
                      <span className="font-medium text-gray-800 truncate block">{record.beneficiary_corporate?.entity_name || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-gray-400 block text-[10px] uppercase font-semibold">Issuing Bank</span>
                      <span className="font-medium text-gray-800 truncate block">
                        {record.issuing_bank?.name === 'Foreign Bank' ? record.foreign_bank_name || 'Foreign' : record.issuing_bank?.name || 'N/A'}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-400 block text-[10px] uppercase font-semibold">Category</span>
                      <span className="font-medium text-gray-800 truncate block">{record.lg_category?.name || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-gray-400 block text-[10px] uppercase font-semibold">Expiry Date</span>
                      <div className="flex items-center flex-wrap gap-1">
                        <span className={`font-medium ${isCritical ? 'text-rose-700 font-semibold' : 'text-gray-800'}`}>
                          {formatDate(record.expiry_date)}
                        </span>
                        {isCritical && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                            {daysLeft <= 0 ? 'Due' : `${daysLeft}d left`}
                          </span>
                        )}
                        {isApproaching && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                            {daysLeft}d
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-gray-100">
                    {!isCorporateAdminView && (
                      <div className="flex items-center space-x-2">
                        <span className="text-xs text-gray-500">Auto Renew:</span>
                        <Switch
                          checked={record.auto_renewal}
                          onChange={(newStatus) => handleToggleAutoRenewal(record, newStatus)}
                          disabled={isGracePeriod || isClosedLock}
                          className={`${
                            record.auto_renewal
                              ? isValidStatus
                                ? 'bg-blue-600'
                                : 'bg-slate-400'
                              : 'bg-gray-200'
                          } relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                            isInactive ? 'opacity-55' : ''
                          } ${isGracePeriod || isClosedLock ? 'cursor-not-allowed' : ''}`}
                        >
                          <span className={`${
                            record.auto_renewal ? 'translate-x-4' : 'translate-x-1'
                          } inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform`} />
                        </Switch>
                      </div>
                    )}
                    <div className="flex items-center space-x-2 ml-auto">
                      {!isCorporateAdminView && !isGracePeriod && (
                        <LGActionsMenu
                          lgRecord={record}
                          onExtend={handleExtend}
                          onChangeOwner={handleChangeOwner}
                          onChangeCategory={handleOpenSingleCategoryModal}
                          onRelease={handleRelease}
                          onLiquidate={handleLiquidate}
                          onDecreaseAmount={handleDecreaseAmount}
                          onAmend={handleAmend}
                          onActivate={handleActivate}
                          onCancelLiquidation={handleCancelLiquidation}
                          onRecordFunds={handleRecordFunds}
                        />
                      )}
                      <button
                        onClick={() => handleViewDetails(record.id)}
                        className="px-2.5 py-1 text-xs font-medium bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-md transition-colors"
                      >
                        View Details
                      </button>
                    </div>
                  </div>
                </div>
                );
              })
            )}
          </div>

          {/* DESKTOP VIEW: Multi-Column Table (>= md) */}
          <div className="hidden md:block overflow-auto rounded-2xl border border-slate-200/90 shadow-sm relative max-h-[72vh]">
            {isRefreshing && (
                <div className="absolute inset-x-0 top-0 flex items-center justify-center py-1 bg-blue-50 text-blue-700 text-xs font-medium z-10 rounded-t-2xl">
                  <Loader2 className="animate-spin h-4 w-4 mr-2" /> Refreshing data...
                </div>
            )}
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  {[
                      { key: 'custody_serial', label: 'SN' },
                      { key: 'lg_number', label: 'LG No.' },
                      { key: 'issuer_name', label: 'Issuer' },
                      { key: 'beneficiary_corporate', label: 'Beneficiary' },
                      { key: 'lg_amount', label: 'Amount' },
                      { key: 'issuing_bank', label: 'Bank' },
                      { key: 'lg_category', label: 'Category' },
                      { key: 'expiry_date', label: 'Expiry' },
                      { key: 'lg_status', label: 'Status' },
                  ].map((header) => (
                    <th
                      key={header.key}
                      scope="col"
                      className="sticky top-0 z-20 bg-slate-50 px-2.5 py-2.5 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider cursor-pointer select-none hover:bg-slate-100 whitespace-nowrap"
                      onClick={() => handleSort(header.key)}
                    >
                      <div className="flex items-center">
                        {header.label} {renderSortIcon(header.key)}
                      </div>
                    </th>
                  ))}
                  
                  {!isCorporateAdminView && (
                    <th scope="col" className="sticky top-0 z-20 bg-slate-50 px-2 py-2.5 text-center text-[11px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">
					  Auto
					</th>
                  )}
				  <th scope="col" className="sticky top-0 right-0 z-30 bg-slate-50 border-l border-slate-200/80 px-2.5 py-2.5 text-right text-[11px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-100">
                {filteredAndSortedRecords.map((record) => {
                  const {
                    statusName,
                    isValidStatus,
                    isInactive,
                    daysLeft,
                    isCritical,
                    isApproaching,
                    statusPillClass,
                  } = getRecordVisualMeta(record);
                  const isClosedLock = statusName === 'Released' || statusName === 'Liquidated';

                  return (
                  <tr 
                      key={record.id} 
                      className={`group transition-colors cursor-pointer ${
                        record.is_deleted
                          ? 'bg-slate-50 opacity-60'
                          : isCritical
                            ? 'bg-rose-50/25 hover:bg-rose-50/50'
                            : isInactive
                              ? 'bg-slate-50/60 hover:bg-slate-100/70'
                              : 'bg-white hover:bg-slate-50/90'
                      }`}
                      onClick={() => handleViewDetails(record.id)}
                  >
                    <td className={`px-2.5 py-2.5 whitespace-nowrap text-xs font-mono font-semibold border-l-[3px] ${
                      isCritical ? 'border-l-rose-500' : isApproaching ? 'border-l-amber-400' : 'border-l-transparent'
                    } ${isInactive ? 'text-slate-400' : 'text-slate-500'}`}>
                      {formatCustodySerial(record)}
                    </td>
                    <td className={`px-2.5 py-2.5 max-w-[120px] truncate text-xs ${
                      isInactive ? 'text-slate-500 font-medium group-hover:text-blue-600' : 'text-blue-600 font-semibold'
                    }`} title={record.lg_number}>
                      {record.lg_number}
                    </td>
                    <td className={`px-2.5 py-2.5 max-w-[135px] truncate text-xs ${isInactive ? 'text-slate-400' : 'text-slate-700'}`} title={record.issuer_name || 'N/A'}>{record.issuer_name || 'N/A'}</td>
                    <td className={`px-2.5 py-2.5 max-w-[135px] truncate text-xs ${isInactive ? 'text-slate-400' : 'text-slate-700'}`} title={record.beneficiary_corporate?.entity_name || 'N/A'}>{record.beneficiary_corporate?.entity_name || 'N/A'}</td>
                    <td className={`px-2.5 py-2.5 whitespace-nowrap text-xs tabular-nums ${
                      isInactive ? 'text-slate-500 font-medium' : 'text-slate-900 font-semibold'
                    }`}>
                      {formatAmount(record.lg_amount, record.lg_currency?.iso_code)}
                    </td>
                    <td className={`px-2.5 py-2.5 max-w-[125px] truncate text-xs ${isInactive ? 'text-slate-400' : 'text-slate-600'}`} title={record.issuing_bank?.name === 'Foreign Bank' ? record.foreign_bank_name || 'N/A' : record.issuing_bank?.name || 'N/A'}>
                      {record.issuing_bank?.name === 'Foreign Bank' ? record.foreign_bank_name || 'N/A' : record.issuing_bank?.name || 'N/A'}
                    </td>
                    <td className={`px-2.5 py-2.5 max-w-[110px] truncate text-xs ${isInactive ? 'text-slate-400' : 'text-slate-600'}`} title={record.lg_category?.name || 'N/A'}>{record.lg_category?.name || 'N/A'}</td>
                    <td className="px-2.5 py-2.5 whitespace-nowrap text-xs tabular-nums">
                      <span className={isCritical ? 'text-rose-700 font-semibold' : isInactive ? 'text-slate-400' : 'text-slate-600'}>
                        {formatDate(record.expiry_date)}
                      </span>
                      {isCritical && (
                        <span className="ml-1.5 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                          {daysLeft <= 0 ? 'Due' : `${daysLeft}d left`}
                        </span>
                      )}
                      {isApproaching && (
                        <span className="ml-1.5 inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                          {daysLeft}d
                        </span>
                      )}
                    </td>
                    <td className="px-2.5 py-2.5 whitespace-nowrap text-xs">
                      <span className={`px-2 py-0.5 inline-flex text-[11px] leading-4 font-semibold rounded-full ${statusPillClass}`}>
                        {statusName}
                      </span>
                    </td>
                    {!isCorporateAdminView && (
                      <td className="px-2 py-2.5 whitespace-nowrap text-center text-xs">
                        <GracePeriodTooltip isGracePeriod={isGracePeriod}>
                          <div onClick={(e) => handleInteractiveClick(e)}>
                              <Switch
                                  checked={record.auto_renewal}
                                  onChange={(newStatus) => handleToggleAutoRenewal(record, newStatus)}
                                  disabled={isGracePeriod || isClosedLock}
                                  className={`${
                                      record.auto_renewal
                                        ? isValidStatus
                                          ? 'bg-blue-600'
                                          : 'bg-slate-400'
                                        : 'bg-slate-200'
                                  } relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 ${
                                      isInactive ? 'opacity-55' : ''
                                  } ${isGracePeriod || isClosedLock ? 'opacity-50 cursor-not-allowed' : ''}`}
                              >
                                  <span className="sr-only">Enable auto-renewal</span>
                                  <span
                                      className={`${
                                          record.auto_renewal ? 'translate-x-4' : 'translate-x-1'
                                      } inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform`}
                                  />
                              </Switch>
                          </div>
                        </GracePeriodTooltip>
                      </td>
                    )}
                    
                    <td className={`sticky right-0 z-10 border-l border-slate-100 px-2.5 py-2 whitespace-nowrap text-right text-xs font-medium transition-colors ${
                      isInactive ? 'bg-slate-50 group-hover:bg-slate-100' : 'bg-white group-hover:bg-slate-50'
                    }`}>
                      <div className="flex justify-end items-center">
                          
                          {!isCorporateAdminView && !isGracePeriod && (
                              <div onClick={(e) => handleInteractiveClick(e)}>
                                  <LGActionsMenu
                                      lgRecord={record}
                                      onExtend={handleExtend}
                                      onChangeOwner={handleChangeOwner}
                                      onChangeCategory={handleOpenSingleCategoryModal}
                                      onRelease={handleRelease}
                                      onLiquidate={handleLiquidate}
                                      onDecreaseAmount={handleDecreaseAmount}
                                      onAmend={handleAmend}
                                      onActivate={handleActivate}
                                      onCancelLiquidation={handleCancelLiquidation}
                                      onRecordFunds={handleRecordFunds}
                                  />
                              </div>
                          )}
                          
                          <button
                            onClick={() => handleViewDetails(record.id)}
                            className="text-slate-400 hover:text-blue-600 p-1 rounded-lg hover:bg-blue-50 transition-colors ml-1.5"
                            title="View Details"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                      </div>
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Added HistoryExportModal Rendering */}
      <HistoryExportModal 
          isOpen={showHistoryModal} 
          onClose={() => setShowHistoryModal(false)}
          filteredLgIds={filteredAndSortedRecords.map(r => r.id)} 
      />

      {!isCorporateAdminView && (
        <>
          {showExtendModal && selectedLgRecordForExtension && (
            <ExtendLGModal
              lgRecord={selectedLgRecordForExtension}
              onClose={() => setShowExtendModal(false)}
              onSuccess={handleActionSuccess}
              isGracePeriod={isGracePeriod}
            />
          )}
          {showChangeOwnerModal && selectedLgRecordForOwnerChange && (
            <ChangeLGOwnerModal
                lgRecord={selectedLgRecordForOwnerChange}
                onClose={() => setShowChangeOwnerModal(false)}
                onSuccess={handleActionSuccess}
                isGracePeriod={isGracePeriod}
            />
          )}
          {showReleaseModal && selectedLgRecordForRelease && (
            <ReleaseLGModal
                lgRecord={selectedLgRecordForRelease}
                onClose={() => setShowReleaseModal(false)}
                onSuccess={handleActionSuccess}
                isGracePeriod={isGracePeriod}
            />
          )}
          {showLiquidateModal && selectedLgRecordForLiquidate && (
            <LiquidateLGModal
                lgRecord={selectedLgRecordForLiquidate}
                onClose={() => setShowLiquidateModal(false)}
                onSuccess={handleActionSuccess}
                isGracePeriod={isGracePeriod}
            />
          )}
          {showDecreaseAmountModal && selectedLgRecordForDecreaseAmount && (
            <DecreaseAmountModal
                lgRecord={selectedLgRecordForDecreaseAmount}
                onClose={() => setShowDecreaseAmountModal(false)}
                onSuccess={handleActionSuccess}
                isGracePeriod={isGracePeriod}
            />
          )}
          {showAmendModal && selectedLgRecordForAmend && (
            <LGAmendModal
                lgRecord={selectedLgRecordForAmend}
                onClose={() => setShowAmendModal(false)}
                onSuccess={handleActionSuccess}
            />
          )}
          {showActivateModal && selectedLgRecordForActivate && (
            <LGActivateNonOperativeModal
                lgRecord={selectedLgRecordForActivate}
                onClose={() => setShowActivateModal(false)}
                onSuccess={handleActionSuccess}
            />
          )}
          {showCancelLiquidationModal && selectedLgForCancelLiquidation && (
            <CancelLiquidationModal
                lg={selectedLgForCancelLiquidation}
                onClose={() => setShowCancelLiquidationModal(false)}
                onSuccess={handleActionSuccess}
            />
          )}
          {showRecordFundsModal && selectedLgForRecordFunds && (
            <RecordLiquidationFundsModal
                lg={selectedLgForRecordFunds}
                onClose={() => setShowRecordFundsModal(false)}
                onSuccess={handleActionSuccess}
            />
          )}
          {categoryModalState.isOpen && (
            <ChangeLGCategoryModal
              initialScope="single"
              lgRecord={categoryModalState.lgRecord}
              categories={lgCategories.length > 0 ? lgCategories : null}
              onClose={() => setCategoryModalState({ isOpen: false, lgRecord: null })}
              onSuccess={handleCategoryChangeSuccess}
              isGracePeriod={isGracePeriod}
            />
          )}
        </>
      )}
    </div>
  );
}

export default LGRecordList;