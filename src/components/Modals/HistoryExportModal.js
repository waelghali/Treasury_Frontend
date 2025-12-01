import React, { useState } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { X, Download, Loader2, Calendar } from 'lucide-react';
import { apiRequest } from 'services/apiService';
import { formatEventDetails, formatActionTypeLabel, getExportDetails } from 'utils/timelineHelpers';
import * as XLSX from 'xlsx';
import moment from 'moment';
import { toast } from 'react-toastify';

// Grouping types (unchanged)
const ACTION_GROUPS = {
  'FINANCIAL': {
    label: 'Financials (Liquidations, Decreases)',
    types: ['LG_LIQUIDATED_FULL', 'LG_LIQUIDATED_PARTIAL', 'LG_DECREASED_AMOUNT']
  },
  'TIME': {
    label: 'Extensions & Validity',
    types: ['LG_EXTENDED', 'LG_RENEWAL_REMINDER_FIRST_SENT']
  },
  'STATUS': {
    label: 'Status Changes (Release, Activate)',
    types: ['LG_RELEASED', 'LG_ACTIVATED', 'LG_ACTIVATE_NON_OPERATIVE']
  },
  'LOGISTICS': {
    label: 'Logistics (Delivery, Replies, Reminders)',
    types: ['LG_INSTRUCTION_DELIVERED', 'LG_BANK_REPLY_RECORDED', 'LG_REMINDER_SENT_TO_BANK']
  },
  'ADMIN': {
    label: 'Administrative (Amendments, Owners)',
    types: ['LG_AMENDED', 'LG_OWNER_DETAILS_UPDATED', 'LG_CREATED']
  },
  'NOTIFICATIONS': {
    label: 'System Notifications',
    types: ['NOTIFICATION_SENT', 'NOTIFICATION_FAILED']
  }
};

// --- REMOVING the complex helper to directly read the array from the response ---

export default function HistoryExportModal({ isOpen, onClose, filteredLgIds }) {
  const [loading, setLoading] = useState(false);
  const [dateFrom, setDateFrom] = useState(moment().subtract(1, 'year').format('YYYY-MM-DD'));
  const [dateTo, setDateTo] = useState(moment().format('YYYY-MM-DD'));
  
  const [selectedGroups, setSelectedGroups] = useState(['FINANCIAL', 'TIME', 'STATUS', 'LOGISTICS', 'ADMIN']);

  const toggleGroup = (groupKey) => {
    setSelectedGroups(prev => 
      prev.includes(groupKey) ? prev.filter(k => k !== groupKey) : [...prev, groupKey]
    );
  };

  const handleExport = async () => {
    setLoading(true);
    try {
      // 1. Compile filters (No change)
      let actionTypesToFetch = [];
      selectedGroups.forEach(group => {
        actionTypesToFetch = [...actionTypesToFetch, ...ACTION_GROUPS[group].types];
      });

      const lgIdList = filteredLgIds && filteredLgIds.length > 0 ? filteredLgIds.join(',') : '';

      // --- STEP 1: FETCH STATIC LG DATA (The known-working data source) ---
      const listQuery = `/end-user/lg-records/?skip=0&limit=9999${lgIdList ? `&lg_record_ids=${lgIdList}` : ''}`;
      const lgListResponse = await apiRequest(listQuery, 'GET'); 
      
      // CRITICAL FIX: Robustly get the records array (either the array itself or under lg_records key)
      const lgRecordsArray = Array.isArray(lgListResponse) ? lgListResponse : lgListResponse.lg_records || [];
      
      const lgDetailsMap = {};
      lgRecordsArray.forEach(lg => {
          // lg.id is guaranteed to be present on the LG record object
          lgDetailsMap[lg.id] = { 
              issuer_name: lg.issuer_name || 'N/A',
              lg_amount: lg.lg_amount,
              lg_currency_code: lg.lg_currency?.iso_code || 'N/A',
              lg_type_name: lg.lg_type?.name || 'N/A',
              lg_category_name: lg.lg_category?.name || 'N/A',
              internal_owner_email: lg.internal_owner_contact?.email || 'N/A',
              original_issuance_date: lg.issuance_date,
              issuing_bank_name: lg.issuing_bank?.name || lg.foreign_bank_name || 'N/A',
          };
      });

      // --- STEP 2: FETCH HISTORY DATA (No change) ---
      let historyQueryUrl = `?start_date=${dateFrom}&end_date=${dateTo}`;
      if (actionTypesToFetch.length > 0) {
        historyQueryUrl += `&action_types=${actionTypesToFetch.join(',')}`;
      }
      if (lgIdList) {
        historyQueryUrl += `&lg_record_ids=${lgIdList}`;
      }
      
      const historyData = await apiRequest(`/end-user/reports/lg-lifecycle-history${historyQueryUrl}`, 'GET');

      if (!historyData || historyData.length === 0) {
        toast.info("No history found for the selected criteria.");
        setLoading(false);
        return;
      }
      
      // --- STEP 3: MERGE DATA AND FORMAT FOR EXCEL ---
      const excelRows = historyData.map(event => {
        // CRITICAL: This is where the lookup happens. If the backend is fixed, lg_record_id will be there.
        const lg_id = event.lg_record_id; 
        const staticLg = lgDetailsMap[lg_id] || {}; 

        const readableDescription = formatEventDetails(event.action_type, event.details, event.user_email);
        const structuredDetails = getExportDetails(event.action_type, event.details);

        return {
            // --- STATIC LG CORE FIELDS (SHOULD NOW BE POPULATED) ---
            'LG Number': event.lg_number || 'N/A',
            'Issuer Name': staticLg.issuer_name || 'N/A',
            'Beneficiary': event.beneficiary_name || 'N/A',
            'Amount': staticLg.lg_amount || 'N/A',
            'Currency': staticLg.lg_currency_code || 'N/A',
            'LG Type': staticLg.lg_type_name || 'N/A',
            'Category': staticLg.lg_category_name || 'N/A',
            'Original Issuance Date': moment(staticLg.original_issuance_date).isValid() ? moment(staticLg.original_issuance_date).format('YYYY-MM-DD') : 'N/A',
            'Internal Owner': staticLg.internal_owner_email || 'N/A',
            'Issuing Bank': staticLg.issuing_bank_name || event.issuing_bank_name || 'N/A',

            // --- HISTORY FIELDS ---
            'Date/Time': moment(event.timestamp).format('YYYY-MM-DD HH:mm:ss'),
            'Action Type': formatActionTypeLabel(event.action_type),
            'Performed By (Email)': event.user_email || 'System',

            // --- Extracted Logistics & Key Fields ---
            'Instruction Serial': structuredDetails['Instruction Serial'],
            'Delivery Date': structuredDetails['Delivery Date'],     
            'Bank Reply Date': structuredDetails['Bank Reply Date'], 
            
            // --- Extracted Financial/Expiry Changes ---
            'Old Expiry Date': structuredDetails['Old Expiry Date'], 
            'New Expiry Date': structuredDetails['New Expiry Date'], 
            'Old Amount': structuredDetails['Old Amount'],           
            'New Amount': structuredDetails['New Amount'],           
            'Amount Change': structuredDetails['Amount Change'],     
            
            // --- Extracted Notification Details ---
            'Notification Subject': structuredDetails['Notification Subject'],
            'Notification Status': structuredDetails['Notification Status'],   
            
            // --- Narrative ---
            'Summary Description': readableDescription,
        };
      });

      // 4. Generate File (Widths remain the same)
      const worksheet = XLSX.utils.json_to_sheet(excelRows);
      
      const wscols = [
          {wch: 15}, {wch: 25}, {wch: 25}, {wch: 15}, {wch: 10}, {wch: 20}, {wch: 20}, {wch: 20}, {wch: 30}, {wch: 20}, 
          {wch: 22}, {wch: 25}, {wch: 25}, 
          {wch: 20}, {wch: 15}, {wch: 15}, {wch: 15}, {wch: 15}, {wch: 18}, {wch: 18}, {wch: 18}, 
          {wch: 35}, {wch: 15}, {wch: 60}, 
      ];
      worksheet['!cols'] = wscols;

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "LG History");
      XLSX.writeFile(workbook, `LG_History_Export_${moment().format('YYYYMMDD')}.xlsx`);
      
      toast.success(`Successfully exported ${excelRows.length} history events.`);
      onClose();

    } catch (err) {
      console.error(err);
      toast.error("Failed to export history. Please ensure you are logged in and the list data is accessible.");
    } finally {
      setLoading(false);
    }
  };

  // ... (rest of the component remains the same)
  return (
    <Transition appear show={isOpen} as={React.Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
            <div className="flex justify-between items-center mb-4">
              <Dialog.Title as="h3" className="text-lg font-medium leading-6 text-gray-900">
                Export LG Action History
              </Dialog.Title>
              <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Date Selection */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">From</label>
                  <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">To</label>
                  <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm" />
                </div>
              </div>

              {/* Checkboxes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Include Actions:</label>
                <div className="space-y-2 max-h-48 overflow-y-auto border p-2 rounded-md">
                  {Object.entries(ACTION_GROUPS).map(([key, group]) => (
                    <label key={key} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={selectedGroups.includes(key)}
                        onChange={() => toggleGroup(key)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">{group.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-6 flex justify-end space-x-3">
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleExport}
                  disabled={loading}
                  className="inline-flex justify-center items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
                >
                  {loading ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : <Download className="h-4 w-4 mr-2" />}
                  Export History
                </button>
              </div>
            </div>
          </Dialog.Panel>
        </div>
      </Dialog>
    </Transition>
  );
}