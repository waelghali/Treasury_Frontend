// frontend/src/pages/EndUser/LGRecordList.js
// This component is now designed to be reusable by Corporate Admin for read-only view.

import React, { useState, useEffect, useMemo, useCallback, Fragment } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { apiRequest, API_BASE_URL, getAuthToken } from 'services/apiService.js';
// Added History to the lucide-react import
import { PlusCircle, Edit, Eye, Loader2, AlertCircle, CalendarPlus, ChevronUp, ChevronDown, Users, FileText, Filter as FilterIcon, Download, XCircle, History } from 'lucide-react';
import moment from 'moment';
import ExtendLGModal from 'components/Modals/ExtendLGModal';
import ChangeLGOwnerModal from 'components/Modals/ChangeLGOwnerModal';
import LGActionsMenu from 'components/LGActionsMenu';
import ReleaseLGModal from 'components/Modals/ReleaseLGModal';
import LiquidateLGModal from 'components/Modals/LiquidateLGModal';
import DecreaseAmountModal from 'components/Modals/DecreaseAmountModal';
import LGAmendModal from 'components/Modals/LGAmendModal';
import LGActivateNonOperativeModal from 'components/Modals/LGActivateNonOperativeModal';
import { Switch } from '@headlessui/react';
import { toast } from 'react-toastify';
import { Listbox, Transition, Menu } from '@headlessui/react';
import * as XLSX from 'xlsx';

// Added HistoryExportModal import
import HistoryExportModal from 'components/Modals/HistoryExportModal';

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

const buttonBaseClassNames = "inline-flex items-center px-4 py-2 text-sm font-medium rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors duration-200";

function LGRecordList({ onLogout, isCorporateAdminView = false, isGracePeriod }) {
  const navigate = useNavigate();
  const location = useLocation();
  const queryParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const filterByOwnerId = queryParams.get('ownerId');
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

  const [sortColumn, setSortColumn] = useState('expiry_date');
  const [sortDirection, setSortDirection] = useState('asc');

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatuses, setSelectedStatuses] = useState([]);

  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTypes, setSelectedTypes] = useState([]);

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
      const response = await apiRequest(url, 'GET');
      setLgRecords(response);
      setAllLgRecords(response);
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
    setSelectedDate('');
    setSelectedTypes([]);
  };

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

  const filteredAndSortedRecords = useMemo(() => {
    if (!lgRecords || lgRecords.length === 0) return [];

    const lowerCaseSearchTerm = searchTerm.toLowerCase();

    const filteredRecords = lgRecords.filter(record => {
        const matchesSearchTerm = (
          record.lg_number.toLowerCase().includes(lowerCaseSearchTerm) ||
          (record.issuer_name || '').toLowerCase().includes(lowerCaseSearchTerm) || 
          (record.beneficiary_corporate?.entity_name || '').toLowerCase().includes(lowerCaseSearchTerm) ||
          (record.issuing_bank?.name || '').toLowerCase().includes(lowerCaseSearchTerm) ||
          (record.foreign_bank_name || '').toLowerCase().includes(lowerCaseSearchTerm) ||
          (record.lg_category?.name || '').toLowerCase().includes(lowerCaseSearchTerm) ||
          formatAmount(record.lg_amount, record.lg_currency?.iso_code).toLowerCase().includes(lowerCaseSearchTerm) ||
          formatDate(record.expiry_date).toLowerCase().includes(lowerCaseSearchTerm)
        );

        const matchesStatus = selectedStatuses.length === 0 ||
                              (record.lg_status?.name && selectedStatuses.includes(record.lg_status.name));
        
        const matchesDate = !selectedDate || 
            (record.issuance_date && record.expiry_date && 
             new Date(record.issuance_date) < new Date(selectedDate) && 
             new Date(selectedDate) < new Date(record.expiry_date));

        const matchesType = selectedTypes.length === 0 ||
                            (record.lg_type?.name && selectedTypes.includes(record.lg_type.name));

        return matchesSearchTerm && matchesStatus && matchesDate && matchesType;
    });

    const sortableRecords = [...filteredRecords];

    sortableRecords.sort((a, b) => {
      let aValue;
      let bValue;

      switch (sortColumn) {
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
  }, [lgRecords, sortColumn, sortDirection, searchTerm, selectedStatuses, selectedDate, selectedTypes]);

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
    <div className="bg-white p-6 rounded-lg shadow-md">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-semibold text-gray-800">
            {filterByOwnerId ? `LGs for Owner ID: ${filterByOwnerId}` : `Manage LG Records`}
        </h2>
        <div className="flex space-x-3">
            {(searchTerm.length > 0 || selectedStatuses.length > 0 || selectedDate || selectedTypes.length > 0) && (
              <button
                  onClick={handleClearFilters}
                  className={`${buttonBaseClassNames} bg-gray-600 text-white hover:bg-gray-700`}
              >
                  <XCircle className="h-5 w-5 mr-2" />
                  Clear Filters
              </button>
            )}
            <Menu as="div" className="relative inline-block text-left">
              <Menu.Button className={`${buttonBaseClassNames} bg-teal-600 text-white hover:bg-teal-700`}>
                <Download className="h-5 w-5 mr-2" />
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
                {/* FIX: Added z-50 to ensure dropdown appears above sticky table content */}
                <Menu.Items className="absolute right-0 z-50 mt-2 w-56 origin-top-right rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                  <div className="py-1">
                    <Menu.Item>
                      {({ active }) => (
                        <a
                          href="#"
                          onClick={() => handleExportToExcel(filteredAndSortedRecords)}
                          className={`
                            ${active ? 'bg-gray-100 text-gray-900' : 'text-gray-700'}
                            block px-4 py-2 text-sm
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
                            ${active ? 'bg-gray-100 text-gray-900' : 'text-gray-700'}
                            block px-4 py-2 text-sm
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

            {/* ADDED: Action History Button */}
            <button
                onClick={() => setShowHistoryModal(true)}
                className={`${buttonBaseClassNames} bg-indigo-600 text-white hover:bg-indigo-700 ml-2`}
                title="Export full audit history of actions"
            >
                <History className="h-5 w-5 mr-2" />
                Action History
            </button>

            {!isCorporateAdminView && (
              <GracePeriodTooltip isGracePeriod={isGracePeriod}>
                <button
                    onClick={() => navigate('/end-user/lg-records/new')}
                    className={`${buttonBaseClassNames} bg-blue-600 text-white hover:bg-blue-700 ${isGracePeriod ? 'opacity-50 cursor-not-allowed' : ''}`}
                    disabled={isGracePeriod}
                >
                    <PlusCircle className="h-5 w-5 mr-2" />
                    Record New LG
                </button>
              </GracePeriodTooltip>
            )}
        </div>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-md relative mb-4 flex items-center" role="alert">
          <AlertCircle className="h-5 w-5 mr-2" />
          <span className="block sm:inline">{error}</span>
        </div>
      )}

      {isInitialLoading ? (
        <div className="text-center py-8">
          <Loader2 className="animate-spin h-8 w-8 text-blue-600 mx-auto" />
          <p className="text-gray-600 mt-2">Loading LG records...</p>
        </div>
      ) : lgRecords.length === 0 ? (
        <div className="bg-gray-50 p-6 rounded-lg text-center border border-gray-200">
          <p className="text-gray-500">No LG records found for your customer.</p>
        </div>
      ) : (
        <>
          <div className="mb-4 flex items-center justify-between space-x-4 flex-wrap gap-2">
            <input
              type="text"
              placeholder="Search by LG No., Issuer, Beneficiary, Bank, Category..."
              className="mt-1 block flex-grow border border-gray-300 pl-3 pr-10 py-2 text-base rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-md"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />

            <div className="relative w-64 shrink-0">
              <input
                type="date"
                className="mt-1 w-full cursor-pointer rounded-md border border-gray-300 bg-white py-2 pl-3 pr-10 text-left shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-md"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                placeholder="Filter by date"
                title="Show LGs where: Issuance Date < Selected Date < Expiry Date"
              />
            </div>

            <Listbox value={selectedStatuses} onChange={setSelectedStatuses} multiple>
              {({ open }) => (
                <div className="relative w-64 shrink-0">
                  <Listbox.Button className="mt-1 w-full cursor-default rounded-md border border-gray-300 bg-white py-2 pl-3 pr-10 text-left shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-md">
                    <span className="block truncate text-md">
                      {selectedStatuses.length === 0
                        ? 'Filter by Status'
                        : selectedStatuses.length === uniqueStatuses.length
                          ? 'All Statuses'
                          : selectedStatuses.join(', ')}
                    </span>
                    <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                      <ChevronDown className="h-4 w-4 text-gray-400" aria-hidden="true" />
                    </span>
                  </Listbox.Button>

                  <Transition
                    show={open}
                    as={Fragment}
                    leave="transition ease-in duration-100"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                  >
                     {/* FIX: Added z-50 to ensure dropdown appears above sticky table content */}
                    <Listbox.Options className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
                      {uniqueStatuses.map((status) => (
                        <Listbox.Option
                          key={status}
                          className={({ active }) =>
                            `relative cursor-default select-none py-2 pl-8 pr-4 ${
                              active ? 'bg-blue-600 text-white' : 'text-gray-900'
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
                                  className={`absolute inset-y-0 left-0 flex items-center pl-1.5 ${
                                    active ? 'text-white' : 'text-blue-600'
                                  }`}
                                >
                                  <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                    <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.052-.143z" clipRule="evenodd" />
                                  </svg>
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
                <div className="relative w-64 shrink-0">
                  <Listbox.Button className="mt-1 w-full cursor-default rounded-md border border-gray-300 bg-white py-2 pl-3 pr-10 text-left shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-md">
                    <span className="block truncate text-md">
                      {selectedTypes.length === 0
                        ? 'Filter by Type'
                        : selectedTypes.length === uniqueTypes.length
                          ? 'All Types'
                          : selectedTypes.join(', ')}
                    </span>
                    <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                      <ChevronDown className="h-4 w-4 text-gray-400" aria-hidden="true" />
                    </span>
                  </Listbox.Button>

                  <Transition
                    show={open}
                    as={Fragment}
                    leave="transition ease-in duration-100"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                  >
                     {/* FIX: Added z-50 to ensure dropdown appears above sticky table content */}
                    <Listbox.Options className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
                      {uniqueTypes.map((type) => (
                        <Listbox.Option
                          key={type}
                          className={({ active }) =>
                            `relative cursor-default select-none py-2 pl-8 pr-4 ${
                              active ? 'bg-blue-600 text-white' : 'text-gray-900'
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
                                  className={`absolute inset-y-0 left-0 flex items-center pl-1.5 ${
                                    active ? 'text-white' : 'text-blue-600'
                                  }`}
                                >
                                  <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                    <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.052-.143z" clipRule="evenodd" />
                                  </svg>
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

          <div className="overflow-x-auto rounded-lg shadow relative">
            {isRefreshing && (
                <div className="absolute inset-x-0 top-0 flex items-center justify-center py-1 bg-blue-100 text-blue-700 text-sm font-medium z-10 rounded-t-lg">
                  <Loader2 className="animate-spin h-4 w-4 mr-2" /> Refreshing data...
                </div>
            )}
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {/* Standard Headers */}
                  {[
                      { key: 'lg_number', label: 'LG Number' },
                      { key: 'issuer_name', label: 'Issuer Name' },
                      { key: 'beneficiary_corporate', label: 'Beneficiary' },
                      { key: 'lg_amount', label: 'Amount' },
                      { key: 'issuing_bank', label: 'Issuing Bank' },
                      { key: 'lg_category', label: 'Category' },
                      { key: 'expiry_date', label: 'Expiry Date' },
                      { key: 'lg_status', label: 'Status' },
                  ].map((header) => (
                    <th
                      key={header.key}
                      scope="col"
                      className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer select-none hover:bg-gray-100"
                      onClick={() => handleSort(header.key)}
                    >
                      <div className="flex items-center">
                        {header.label} {renderSortIcon(header.key)}
                      </div>
                    </th>
                  ))}
                  
                  {!isCorporateAdminView && (
                    <th scope="col" className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Auto Renew
                    </th>
                  )}
                  {/* STICKY ACTION HEADER */}
                  <th scope="col" className="sticky right-0 z-10 bg-gray-50 border-l border-gray-200 px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider shadow-sm">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredAndSortedRecords.map((record) => (
                  <tr 
                      key={record.id} 
                      className={`group hover:bg-blue-50 transition-colors cursor-pointer ${record.is_deleted ? 'bg-gray-50 opacity-60' : ''}`}
                      onClick={() => handleViewDetails(record.id)}
                  >
                    <td className="px-3 py-3 whitespace-nowrap text-sm font-medium text-blue-600">
                      {record.lg_number}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-500">{record.issuer_name || 'N/A'}</td>
                    <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-500">{record.beneficiary_corporate?.entity_name || 'N/A'}</td>
                    <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-500">
                      {formatAmount(record.lg_amount, record.lg_currency?.iso_code)}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-500">
                      {record.issuing_bank?.name === 'Foreign Bank' ? record.foreign_bank_name || 'N/A' : record.issuing_bank?.name || 'N/A'}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-500">{record.lg_category?.name || 'N/A'}</td>
                    <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-500">{formatDate(record.expiry_date)}</td>
                    <td className="px-3 py-3 whitespace-nowrap text-sm">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        record.lg_status?.name === 'Valid' ? 'bg-green-100 text-green-800' :
                        record.lg_status?.name === 'Expired' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {record.lg_status?.name || 'N/A'}
                      </span>
                    </td>
                    {!isCorporateAdminView && (
                      <td className="px-3 py-3 whitespace-nowrap text-center text-sm">
                        <GracePeriodTooltip isGracePeriod={isGracePeriod}>
                          <div onClick={(e) => handleInteractiveClick(e)}>
                              <Switch
                                  checked={record.auto_renewal}
                                  onChange={(newStatus) => handleToggleAutoRenewal(record, newStatus)}
                                  disabled={isGracePeriod}
                                  className={`${
                                      record.auto_renewal ? 'bg-blue-600' : 'bg-gray-200'
                                  } relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${isGracePeriod ? 'opacity-50 cursor-not-allowed' : ''}`}
                              >
                                  <span className="sr-only">Enable auto-renewal</span>
                                  <span
                                      className={`${
                                          record.auto_renewal ? 'translate-x-6' : 'translate-x-1'
                                      } inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}
                                  />
                              </Switch>
                          </div>
                        </GracePeriodTooltip>
                      </td>
                    )}
                    
                    {/* STICKY ACTION COLUMN */}
                    <td className="sticky right-0 z-10 bg-white group-hover:bg-blue-50 border-l border-gray-200 px-4 py-4 whitespace-nowrap text-right text-sm font-medium transition-colors shadow-sm">
                      <div className="flex justify-end items-center">
                          <button
                            onClick={(e) => handleInteractiveClick(e, () => handleViewLetter(record))}
                            className="text-teal-600 hover:text-teal-900 mr-2 p-1 rounded-md hover:bg-white"
                            title="View Latest Letter"
                          >
                            <FileText className="h-5 w-5" />
                          </button>
                          
                          {!isCorporateAdminView && !isGracePeriod && (
                              <div onClick={(e) => handleInteractiveClick(e)}>
                                  <LGActionsMenu
                                      lgRecord={record}
                                      onExtend={handleExtend}
                                      onChangeOwner={handleChangeOwner}
                                      onRelease={handleRelease}
                                      onLiquidate={handleLiquidate}
                                      onDecreaseAmount={handleDecreaseAmount}
                                      onViewDetails={handleViewDetails}
                                      onAmend={handleAmend}
                                      onActivate={handleActivate}
                                  />
                              </div>
                          )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredAndSortedRecords.length === 0 && (
              <div className="bg-gray-50 p-6 rounded-lg text-center border border-gray-200 mt-4">
                <p className="text-gray-500">No LG records match your filter criteria.</p>
              </div>
            )}
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
        </>
      )}
    </div>
  );
}

export default LGRecordList;