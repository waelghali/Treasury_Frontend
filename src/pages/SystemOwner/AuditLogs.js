import React, { useState, useEffect } from 'react';
// --- CORRECTED IMPORT: Added API_BASE_URL ---
import { apiRequest, API_BASE_URL } from 'services/apiService.js';
// --- END CORRECTION ---
import { RefreshCcw, Filter, XCircle, ChevronDown, ChevronUp, Loader2, AlertCircle, Download } from 'lucide-react';
import moment from 'moment';
import { toast } from 'react-toastify';

// --- NEW: Masking Logic Helper ---
const maskSensitiveData = (obj) => {
    if (typeof obj !== 'object' || obj === null) {
        return obj;
    }

    const sensitiveKeys = [
        'name', 'first_name', 'last_name', 'full_name', // Names
        'email', 'sender_email', 'recipient_email', // Emails
        'amount', 'value', 'price', 'fee', // Amounts/Values
        'password', 'token', 'secret', // Credentials
        'address', 'account_number', 'phone', // Personal/Financial identifiers
        'configured_value', // Often holds sensitive configuration data
    ];

    const maskedObj = Array.isArray(obj) ? [] : {};

    for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
            const lowerKey = key.toLowerCase();
            const value = obj[key];

            // Explicitly exempt the 'reason' field from masking
            if (lowerKey === 'reason') {
                maskedObj[key] = value;
            } else if (sensitiveKeys.includes(lowerKey)) {
                // Mask the value directly
                maskedObj[key] = '***MASKED***';
            } else if (typeof value === 'object' && value !== null) {
                // Recurse into nested objects/arrays
                maskedObj[key] = maskSensitiveData(value);
            } else {
                // Keep non-sensitive data as is
                maskedObj[key] = value;
            }
        }
    }

    return maskedObj;
};
// --- END NEW MASKING LOGIC ---


function AuditLogs() {
  const [logs, setLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({
    user_id: '',
    action_type: '',
    entity_type: '',
    entity_id: '',
    start_date: '',
    end_date: '',
    customer_id: '', // Added customer_id filter for System Owner
  });
  const [showFilters, setShowFilters] = useState(false);
  const [isExporting, setIsExporting] = useState(false); // Export loading state

  const fetchAuditLogs = async () => {
    setIsLoading(true);
    setError('');
    try {
      const queryParams = new URLSearchParams();
      for (const key in filters) {
        if (filters[key]) {
          queryParams.append(key, filters[key]);
        }
      }
      // Assuming apiRequest correctly prepends the base URL
      const fetchedLogs = await apiRequest(`/system-owner/audit-logs/?${queryParams.toString()}`, 'GET');
      setLogs(fetchedLogs);
    } catch (err) {
      console.error('Failed to fetch audit logs:', err);
      setError(`Failed to load audit logs. ${err.message || 'An unexpected error occurred.'}`);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAuditLogs();
  }, [filters]); // Refetch when filters change

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const handleClearFilters = () => {
    setFilters({
      user_id: '',
      action_type: '',
      entity_type: '',
      entity_id: '',
      start_date: '',
      end_date: '',
      customer_id: '', // Reset customer_id filter
    });
  };

  const handleExportCSV = async () => {
    setIsExporting(true);
    try {
      const queryParams = new URLSearchParams();
      for (const key in filters) {
        if (filters[key]) {
          queryParams.append(key, filters[key]);
        }
      }

      const token = localStorage.getItem('jwt_token');

      if (!token) {
          toast.error('Authentication token not found. Please log in again.');
          setIsExporting(false);
          return;
      }

      // --- CORRECTED URL CONSTRUCTION ---
      const exportPath = `/system-owner/audit-logs/export-csv?${queryParams.toString()}`;
      const fullUrl = `${API_BASE_URL}${exportPath}`; // Prepend the base URL
      // --- END CORRECTION ---


      const response = await fetch(
        fullUrl, // Use the full URL
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'text/csv',
          },
        }
      );

      if (!response.ok) {
        let errorMsg = `Failed to download file (${response.status})`;
        try {
          const errData = await response.json();
          errorMsg = errData.detail || errorMsg;
        } catch (e) {
          errorMsg = response.statusText || errorMsg;
        }
        throw new Error(errorMsg);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `system_audit_logs_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      toast.success('Export started successfully.');

    } catch (err) {
      console.error('Failed to export audit logs:', err);
      toast.error(`Export failed. ${err.message || 'An unexpected error occurred.'}`);
    } finally {
      setIsExporting(false);
    }
  };

  const formatTimestamp = (timestamp) => {
    return moment(timestamp).format('YYYY-MM-DD HH:mm:ss');
  };

  const renderDetails = (details) => {
    if (!details) return 'N/A';
    try {
      const parsedDetails = typeof details === 'string' ? JSON.parse(details) : details;
      
      // --- START NEW MASKING AND RENDERING LOGIC ---
      const maskedDetails = maskSensitiveData(parsedDetails);

      if (maskedDetails.ai_token_usage) {
        const usage = maskedDetails.ai_token_usage;
        return (
          <div className="text-xs bg-gray-50 p-2 rounded-md font-mono">
            <p><strong>Action:</strong> {maskedDetails.action_type || 'N/A'}</p>
            {maskedDetails.file_name && <p><strong>File:</strong> {maskedDetails.file_name}</p>}
            <p><strong>OCR Chars:</strong> {usage.ocr_characters}</p>
            <p><strong>Gemini Prompt:</strong> {usage.gemini_prompt_tokens} tokens</p>
            <p><strong>Gemini Completion:</strong> {usage.gemini_completion_tokens} tokens</p>
            {usage.total_pages_processed > 0 && <p><strong>Pages:</strong> {usage.total_pages_processed}</p>}
            {maskedDetails.reason && <p className="text-red-600"><strong>Reason:</strong> {maskedDetails.reason}</p>}
          </div>
        );
      }
      // New: Display Failure Reason for Notifications or other non-AI events
      if (maskedDetails.reason && !maskedDetails.ai_token_usage) {
        return (
          <div className="text-xs bg-gray-50 p-2 rounded-md font-mono border-l-4 border-red-500">
            <p className="text-red-600 font-bold uppercase text-[10px] mb-1">Failure Reason:</p>
            <p className="text-red-800 italic mb-2">{maskedDetails.reason}</p>
            <div className="mt-2 pt-2 border-t border-gray-200">
              <p className="text-[10px] text-gray-400 font-semibold mb-1">Log Metadata:</p>
              <pre className="text-[10px] overflow-auto max-h-20 opacity-60">
                {JSON.stringify(maskedDetails, null, 2)}
              </pre>
            </div>
          </div>
        );
      }
      // Default JSON rendering path uses masked data
      return (
        <pre className="text-xs bg-gray-50 p-2 rounded-md overflow-auto max-h-24">
          {JSON.stringify(maskedDetails, null, 2)}
        </pre>
      );
      // --- END NEW MASKING AND RENDERING LOGIC ---

    } catch (e) {
      console.error("Failed to parse audit log details:", e, details);
      return String(details);
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-2xl font-semibold text-gray-800 mb-6">Audit Logs</h2>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-md relative mb-4 flex items-center" role="alert">
          <AlertCircle className="h-5 w-5 mr-2" />
          <span className="block sm:inline">{error}</span>
        </div>
      )}

      {/* Filter Section */}
      <div className="bg-gray-50 p-4 rounded-lg shadow-sm mb-6">
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center text-blue-600 hover:text-blue-800 font-medium mb-4"
        >
          <Filter className="h-5 w-5 mr-2" />
          {showFilters ? 'Hide Filters' : 'Show Filters'}
          {showFilters ? <ChevronUp className="w-4 h-4 ml-2" /> : <ChevronDown className="w-4 h-4 ml-2" />}
        </button>

        {showFilters && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
            <div>
              <label htmlFor="user_id" className="block text-sm font-medium text-gray-700">User ID</label>
              <input
                type="text"
                name="user_id"
                id="user_id"
                value={filters.user_id}
                onChange={handleFilterChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                placeholder="e.g., 1"
              />
            </div>
            <div>
              <label htmlFor="action_type" className="block text-sm font-medium text-gray-700">Action Type</label>
              <input
                type="text"
                name="action_type"
                id="action_type"
                value={filters.action_type}
                onChange={handleFilterChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                placeholder="e.g., LOGIN_SUCCESS"
              />
            </div>
            <div>
              <label htmlFor="entity_type" className="block text-sm font-medium text-gray-700">Entity Type</label>
              <input
                type="text"
                name="entity_type"
                id="entity_type"
                value={filters.entity_type}
                onChange={handleFilterChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                placeholder="e.g., Customer"
              />
            </div>
            <div>
              <label htmlFor="entity_id" className="block text-sm font-medium text-gray-700">Entity ID</label>
              <input
                type="text"
                name="entity_id"
                id="entity_id"
                value={filters.entity_id}
                onChange={handleFilterChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                placeholder="e.g., 5"
              />
            </div>
            <div>
              <label htmlFor="start_date" className="block text-sm font-medium text-gray-700">Start Date</label>
              <input
                type="date"
                name="start_date"
                id="start_date"
                value={filters.start_date}
                onChange={handleFilterChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              />
            </div>
            <div>
              <label htmlFor="end_date" className="block text-sm font-medium text-gray-700">End Date</label>
              <input
                type="date"
                name="end_date"
                id="end_date"
                value={filters.end_date}
                onChange={handleFilterChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              />
            </div>
            {/* Customer ID Filter for System Owner */}
            <div>
              <label htmlFor="customer_id" className="block text-sm font-medium text-gray-700">Customer ID</label>
              <input
                type="text"
                name="customer_id"
                id="customer_id"
                value={filters.customer_id}
                onChange={handleFilterChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                placeholder="e.g., 2"
              />
            </div>
          </div>
        )}

        <div className="flex flex-wrap justify-end gap-2">
          {showFilters && (
            <button
              onClick={handleClearFilters}
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-xs sm:text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <XCircle className="h-4 w-4 mr-1.5" />
              Clear Filters
            </button>
          )}
          <button
            onClick={fetchAuditLogs}
            className="inline-flex items-center px-4 py-2 border border-transparent text-xs sm:text-sm font-semibold rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 shadow-sm"
            disabled={isLoading}
          >
            <RefreshCcw className="h-4 w-4 mr-1.5" />
            Apply Filters
          </button>

          {/* --- EXPORT BUTTON --- */}
          <button
            onClick={handleExportCSV}
            className={`inline-flex items-center px-4 py-2 border border-transparent text-xs sm:text-sm font-semibold rounded-lg text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 shadow-sm ${isExporting ? 'opacity-50 cursor-not-allowed' : ''}`}
            disabled={isExporting}
          >
            {isExporting ? (
              <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
            ) : (
              <Download className="h-4 w-4 mr-1.5" />
            )}
            Export CSV
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-8">
          <Loader2 className="h-8 w-8 text-blue-600 mx-auto animate-spin" />
          <p className="text-gray-600 mt-2 text-sm">Loading audit logs...</p>
        </div>
      ) : logs.length === 0 ? (
        <div className="text-center py-8 text-gray-500 text-sm bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          No audit logs found for the selected filters.
        </div>
      ) : (
        <>
          {/* MOBILE CARDS (screen < md) */}
          <div className="md:hidden space-y-3">
            {logs.map((log) => (
              <div key={log.id} className="bg-white rounded-xl p-4 shadow-sm border border-gray-200 space-y-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="font-bold text-gray-900 text-xs">{log.action_type}</span>
                    <p className="text-[11px] text-gray-500 mt-0.5">{formatTimestamp(log.timestamp)}</p>
                  </div>
                  <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-blue-50 text-blue-700 border border-blue-200 shrink-0">
                    {log.entity_type || 'System'}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs bg-gray-50 p-2.5 rounded-lg text-gray-700">
                  <div>
                    <span className="text-gray-400 block text-[10px] uppercase">User</span>
                    <span className="font-medium truncate block">{log.user_name || log.user_id || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 block text-[10px] uppercase">LG Number</span>
                    <span className="font-medium truncate block">{log.lg_number || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 block text-[10px] uppercase">Entity ID</span>
                    <span className="font-medium truncate block">{log.entity_id || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 block text-[10px] uppercase">IP Address</span>
                    <span className="font-medium truncate block">{log.ip_address || 'N/A'}</span>
                  </div>
                </div>

                {log.details && (
                  <div className="pt-2 border-t border-gray-100 text-xs">
                    <span className="text-gray-400 block text-[10px] uppercase mb-1">Details</span>
                    {renderDetails(log.details)}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* DESKTOP TABLE (screen >= md) */}
          <div className="hidden md:block overflow-x-auto rounded-xl shadow-sm border border-gray-200 bg-white">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Timestamp</th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">User Name</th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Customer ID</th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Action Type</th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Entity Type</th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Entity ID</th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">LG Number</th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Details</th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">IP Address</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-blue-50/40 transition-colors">
                    <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-900">{formatTimestamp(log.timestamp)}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-900">{log.user_name || log.user_id || 'N/A'}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-900">{log.customer_id || 'N/A'}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-xs font-semibold text-gray-900">{log.action_type}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-900">{log.entity_type}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-900">{log.entity_id || 'N/A'}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-900 font-mono">{log.lg_number || 'N/A'}</td>
                    <td className="px-4 py-3 text-xs text-gray-900 max-w-xs truncate">
                      {renderDetails(log.details)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-500">{log.ip_address || 'N/A'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

export default AuditLogs;