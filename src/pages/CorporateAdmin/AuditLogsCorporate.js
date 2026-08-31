import React, { useState, useEffect, useMemo } from 'react';
import { apiRequest, API_BASE_URL } from 'services/apiService.js';
import {
  RefreshCw, Search, SlidersHorizontal, X, Download, Loader2,
  AlertCircle, Shield, User, Building, Eye, Copy, Check
} from 'lucide-react';
import moment from 'moment';
import { toast } from 'react-toastify';

// Known Action Types for quick filter select
const ACTION_TYPES = [
  'ALL',
  'CREATE',
  'UPDATE',
  'DELETE',
  'LOGIN_SUCCESS',
  'LOGIN_FAILURE',
  'LG_AMEND',
  'LG_EXTENSION',
  'LG_RELEASE',
  'LG_CANCEL',
  'TEMPLATE_UPDATE',
  'SETTING_UPDATE',
  'ONBOARD',
  'RESTORE',
];

// Known Entity Types for Corporate scope
const ENTITY_TYPES = [
  'ALL',
  'User',
  'CustomerEntity',
  'LGRecord',
  'Facility',
  'LGCategory',
  'ApprovalRequest',
  'LGInstruction',
  'CorporateProject',
];

// Mask sensitive keys helper
const maskSensitiveData = (obj) => {
  if (typeof obj !== 'object' || obj === null) return obj;

  const sensitiveKeys = [
    'password', 'token', 'secret', 'password_hash', 'smtp_password',
    'smtp_password_encrypted', 'credit_card', 'cvv'
  ];

  const maskedObj = Array.isArray(obj) ? [] : {};

  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const lowerKey = key.toLowerCase();
      const value = obj[key];

      if (lowerKey === 'reason' || lowerKey === 'action_type' || lowerKey === 'entity_type') {
        maskedObj[key] = value;
      } else if (sensitiveKeys.some(sk => lowerKey.includes(sk))) {
        maskedObj[key] = '••••••••';
      } else if (typeof value === 'object' && value !== null) {
        maskedObj[key] = maskSensitiveData(value);
      } else {
        maskedObj[key] = value;
      }
    }
  }

  return maskedObj;
};

function AuditLogsCorporate({ onLogout, isGracePeriod }) {
  const [logs, setLogs] = useState([]);
  const [corporateUsers, setCorporateUsers] = useState([]);
  const [customerEntities, setCustomerEntities] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [userFilter, setUserFilter] = useState('ALL');
  const [actionFilter, setActionFilter] = useState('ALL');
  const [entityFilter, setEntityFilter] = useState('ALL');
  const [entityIdFilter, setEntityIdFilter] = useState('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const [showFilters, setShowFilters] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [selectedLog, setSelectedLog] = useState(null);
  const [copiedKey, setCopiedKey] = useState(false);

  // Load Corporate Users and Entities for dropdowns
  useEffect(() => {
    apiRequest('/corporate-admin/users/', 'GET')
      .then((data) => setCorporateUsers(data || []))
      .catch(() => {});

    apiRequest('/corporate-admin/customer-entities/', 'GET')
      .then((data) => setCustomerEntities(data || []))
      .catch(() => {});
  }, []);

  // Fetch audit logs from backend with all parameters
  const fetchAuditLogs = async () => {
    setIsLoading(true);
    setError('');
    try {
      const queryParams = new URLSearchParams();
      if (searchTerm.trim()) queryParams.append('search', searchTerm.trim());
      if (userFilter !== 'ALL') queryParams.append('user_id', userFilter);
      if (actionFilter !== 'ALL') queryParams.append('action_type', actionFilter);
      if (entityFilter !== 'ALL') queryParams.append('entity_type', entityFilter);
      if (entityIdFilter !== 'ALL' && entityFilter === 'CustomerEntity') {
        queryParams.append('entity_id', entityIdFilter);
      }
      if (startDate) queryParams.append('start_date', startDate);
      if (endDate) queryParams.append('end_date', endDate);

      const fetchedLogs = await apiRequest(`/corporate-admin/audit-logs/?${queryParams.toString()}`, 'GET');
      setLogs(fetchedLogs || []);
    } catch (err) {
      console.error('Failed to fetch audit logs:', err);
      setError(`Failed to load audit logs. ${err.message || 'An unexpected error occurred.'}`);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAuditLogs();
  }, [userFilter, actionFilter, entityFilter, entityIdFilter, startDate, endDate]);

  const handleSearchKeyDown = (e) => {
    if (e.key === 'Enter') {
      fetchAuditLogs();
    }
  };

  const handleClearAllFilters = () => {
    if (isGracePeriod) {
      toast.warn("Filtering is disabled during your subscription's grace period.");
      return;
    }
    setSearchTerm('');
    setUserFilter('ALL');
    setActionFilter('ALL');
    setEntityFilter('ALL');
    setEntityIdFilter('ALL');
    setStartDate('');
    setEndDate('');
  };

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (userFilter !== 'ALL') count++;
    if (actionFilter !== 'ALL') count++;
    if (entityFilter !== 'ALL') count++;
    if (entityIdFilter !== 'ALL') count++;
    if (startDate) count++;
    if (endDate) count++;
    return count;
  }, [userFilter, actionFilter, entityFilter, entityIdFilter, startDate, endDate]);

  // CSV Export handler
  const handleExportCSV = async () => {
    if (isGracePeriod) {
      toast.warn("Exporting is disabled during your subscription's grace period.");
      return;
    }

    setIsExporting(true);
    try {
      const queryParams = new URLSearchParams();
      if (searchTerm.trim()) queryParams.append('search', searchTerm.trim());
      if (userFilter !== 'ALL') queryParams.append('user_id', userFilter);
      if (actionFilter !== 'ALL') queryParams.append('action_type', actionFilter);
      if (entityFilter !== 'ALL') queryParams.append('entity_type', entityFilter);
      if (entityIdFilter !== 'ALL' && entityFilter === 'CustomerEntity') {
        queryParams.append('entity_id', entityIdFilter);
      }
      if (startDate) queryParams.append('start_date', startDate);
      if (endDate) queryParams.append('end_date', endDate);

      const token = localStorage.getItem('jwt_token');
      if (!token) {
        toast.error('Authentication token not found. Please log in again.');
        setIsExporting(false);
        return;
      }

      const fullUrl = `${API_BASE_URL}/corporate-admin/audit-logs/export-csv?${queryParams.toString()}`;
      const response = await fetch(fullUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'text/csv',
        },
      });

      if (!response.ok) {
        throw new Error(`Export failed (${response.status})`);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `corporate_audit_logs_${moment().format('YYYY-MM-DD')}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      toast.success('Corporate audit logs exported successfully.');
    } catch (err) {
      console.error('Failed to export audit logs:', err);
      toast.error(`Export failed: ${err.message || 'Error downloading CSV'}`);
    } finally {
      setIsExporting(false);
    }
  };

  // Stats calculation
  const stats = useMemo(() => {
    const total = logs.length;
    const creates = logs.filter(l => ['CREATE', 'LOGIN_SUCCESS', 'RESTORE', 'ONBOARD'].includes(l.action_type?.toUpperCase())).length;
    const updates = logs.filter(l => ['UPDATE', 'SETTING_UPDATE', 'TEMPLATE_UPDATE', 'LG_AMEND', 'LG_EXTENSION'].includes(l.action_type?.toUpperCase())).length;
    const critical = logs.filter(l => ['DELETE', 'LOGIN_FAILURE', 'SUSPEND', 'LG_CANCEL'].includes(l.action_type?.toUpperCase())).length;
    return { total, creates, updates, critical };
  }, [logs]);

  // Action badge styling helper
  const getActionBadge = (actionType = '') => {
    const act = actionType.toUpperCase();
    if (act.includes('CREATE') || act.includes('SUCCESS') || act.includes('RESTORE') || act.includes('ONBOARD')) {
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    }
    if (act.includes('UPDATE') || act.includes('SETTING') || act.includes('TEMPLATE')) {
      return 'bg-blue-50 text-blue-700 border-blue-200';
    }
    if (act.includes('DELETE') || act.includes('FAIL') || act.includes('SUSPEND') || act.includes('CANCEL')) {
      return 'bg-red-50 text-red-700 border-red-200';
    }
    if (act.includes('LG_') || act.includes('APPROVAL')) {
      return 'bg-indigo-50 text-indigo-700 border-indigo-200';
    }
    return 'bg-slate-100 text-slate-700 border-slate-200';
  };

  const copyDetailsToClipboard = (details) => {
    navigator.clipboard.writeText(JSON.stringify(details, null, 2));
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
    toast.success('Log details copied to clipboard');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900">Corporate Audit Logs</h1>
          <p className="text-sm text-slate-500 mt-1">
            Activity and change records across users, entities, and Letters of Guarantee in your organization
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            disabled={isExporting || isGracePeriod}
            className={`flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 rounded-xl text-sm font-medium hover:bg-emerald-100 transition-colors border border-emerald-200 shadow-sm ${
              isExporting || isGracePeriod ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            Export CSV
          </button>
          <button
            onClick={fetchAuditLogs}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-sm font-medium hover:bg-slate-200 transition-colors shadow-sm"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl flex items-center shadow-sm">
          <AlertCircle className="h-5 w-5 mr-2 shrink-0 text-red-500" />
          <span className="text-sm">{error}</span>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-xs text-slate-500 font-bold uppercase">Total Events</p>
          <p className="text-2xl font-black text-slate-900 mt-1">{stats.total}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-emerald-200 shadow-sm">
          <p className="text-xs text-emerald-600 font-bold uppercase">Creates & Logins</p>
          <p className="text-2xl font-black text-emerald-700 mt-1">{stats.creates}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-blue-200 shadow-sm">
          <p className="text-xs text-blue-600 font-bold uppercase">Updates & Changes</p>
          <p className="text-2xl font-black text-blue-700 mt-1">{stats.updates}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-red-200 shadow-sm">
          <p className="text-xs text-red-600 font-bold uppercase">Deletes & Alerts</p>
          <p className="text-2xl font-black text-red-700 mt-1">{stats.critical}</p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="space-y-3">
        <div className="flex gap-3 flex-wrap items-center">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[220px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              placeholder="Search action, details, user, IP, or LG number..."
              className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* User Dropdown */}
          <select
            value={userFilter}
            onChange={(e) => setUserFilter(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="ALL">👤 All Users</option>
            {corporateUsers.map((u) => (
              <option key={u.id} value={u.id}>
                {u.email || u.full_name || `User #${u.id}`}
              </option>
            ))}
          </select>

          {/* Action Type Dropdown */}
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="ALL">⚡ All Actions</option>
            {ACTION_TYPES.filter(a => a !== 'ALL').map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>

          {/* Entity Type Dropdown */}
          <select
            value={entityFilter}
            onChange={(e) => {
              setEntityFilter(e.target.value);
              setEntityIdFilter('ALL');
            }}
            className="px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="ALL">📦 All Entities</option>
            {ENTITY_TYPES.filter(et => et !== 'ALL').map((et) => (
              <option key={et} value={et}>{et}</option>
            ))}
          </select>

          {/* Specific Subsidiary/Entity Dropdown (if CustomerEntity selected) */}
          {entityFilter === 'CustomerEntity' && customerEntities.length > 0 && (
            <select
              value={entityIdFilter}
              onChange={(e) => setEntityIdFilter(e.target.value)}
              className="px-3 py-2 border border-blue-200 bg-blue-50 rounded-xl text-sm font-medium text-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">🏢 All Subsidiaries</option>
              {customerEntities.map((ce) => (
                <option key={ce.id} value={ce.id}>
                  {ce.entity_name}
                </option>
              ))}
            </select>
          )}

          {/* Advanced Filters Button */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-3 py-2 border rounded-xl text-sm font-medium transition-colors ${
              showFilters || activeFilterCount > 0
                ? 'border-blue-300 bg-blue-50 text-blue-700'
                : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
            }`}
          >
            <SlidersHorizontal className="w-4 h-4" />
            Date Range
            {activeFilterCount > 0 && (
              <span className="bg-blue-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                {activeFilterCount}
              </span>
            )}
          </button>

          {/* Search Trigger */}
          <button
            onClick={fetchAuditLogs}
            className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl shadow-sm transition-colors"
          >
            Search
          </button>

          {/* Clear All Button */}
          {(activeFilterCount > 0 || searchTerm) && (
            <button
              onClick={handleClearAllFilters}
              className="flex items-center gap-1 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-xl transition-colors font-medium"
            >
              <X className="w-3.5 h-3.5" /> Clear All
            </button>
          )}
        </div>

        {/* Expandable Date Filter Drawer */}
        {showFilters && (
          <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-wrap gap-4 items-end shadow-sm">
            <div className="min-w-[150px]">
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                Start Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white"
              />
            </div>
            <div className="min-w-[150px]">
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                End Date
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white"
              />
            </div>
          </div>
        )}
      </div>

      {/* Results Header */}
      {!isLoading && (
        <div className="flex items-center justify-between text-xs text-slate-500">
          <span>
            Showing <strong className="text-slate-700">{logs.length}</strong> audit event(s)
          </span>
        </div>
      )}

      {/* Main Table / Cards */}
      {isLoading ? (
        <div className="text-center py-16 bg-white rounded-xl border border-slate-200 shadow-sm">
          <Loader2 className="h-8 w-8 text-blue-600 mx-auto animate-spin" />
          <p className="text-slate-500 mt-2 text-sm">Loading corporate audit logs...</p>
        </div>
      ) : logs.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-slate-200 shadow-sm p-6 text-slate-500">
          <Shield className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <p className="text-sm font-medium">No audit logs found matching the selected filters.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th scope="col" className="px-4 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">Timestamp</th>
                  <th scope="col" className="px-4 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">User</th>
                  <th scope="col" className="px-4 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">Action</th>
                  <th scope="col" className="px-4 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">Entity Affected</th>
                  <th scope="col" className="px-4 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">IP Address</th>
                  <th scope="col" className="px-4 py-3 text-right text-[10px] font-bold text-slate-500 uppercase tracking-wider">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-blue-50/40 transition-colors">
                    {/* Timestamp */}
                    <td className="px-4 py-3 whitespace-nowrap text-slate-500 font-mono text-[11px]">
                      {moment(log.timestamp).format('YYYY-MM-DD HH:mm:ss')}
                    </td>

                    {/* User */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="font-semibold text-slate-900 truncate max-w-[200px]" title={log.user_name}>
                          {log.user_name || (log.user_id ? `User #${log.user_id}` : 'System')}
                        </span>
                      </div>
                    </td>

                    {/* Action Type */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${getActionBadge(log.action_type)}`}>
                        {log.action_type}
                      </span>
                    </td>

                    {/* Entity Affected */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div>
                        <span className="font-medium text-slate-900">
                          {log.entity_name || log.lg_number || (log.entity_id ? `#${log.entity_id}` : '—')}
                        </span>
                        <span className="ml-1.5 text-[10px] text-slate-400 uppercase tracking-wider">
                          ({log.entity_type})
                        </span>
                      </div>
                    </td>

                    {/* IP Address */}
                    <td className="px-4 py-3 whitespace-nowrap font-mono text-slate-400 text-[11px]">
                      {log.ip_address || '—'}
                    </td>

                    {/* Details Action */}
                    <td className="px-4 py-3 whitespace-nowrap text-right">
                      {log.details ? (
                        <button
                          onClick={() => setSelectedLog(log)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
                        >
                          <Eye className="w-3 h-3" /> View
                        </button>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Details Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full p-6 space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                  <Shield className="w-5 h-5 text-blue-600" />
                  Audit Event Details
                </h3>
                <p className="text-xs text-slate-500 mt-0.5 font-mono">
                  {moment(selectedLog.timestamp).format('YYYY-MM-DD HH:mm:ss')} • {selectedLog.action_type}
                </p>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 p-3 rounded-xl border border-slate-100">
              <div>
                <span className="text-slate-400 block text-[10px] font-bold uppercase">Actor</span>
                <span className="font-semibold text-slate-800">{selectedLog.user_name || selectedLog.user_id || 'System'}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] font-bold uppercase">Entity</span>
                <span className="font-semibold text-slate-800">{selectedLog.entity_name || selectedLog.entity_id || 'N/A'} ({selectedLog.entity_type})</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] font-bold uppercase">Action Type</span>
                <span className="font-mono text-slate-800">{selectedLog.action_type}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] font-bold uppercase">IP Address</span>
                <span className="font-mono text-slate-800">{selectedLog.ip_address || 'N/A'}</span>
              </div>
            </div>

            <div className="flex-1 overflow-auto space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Payload Details</span>
                <button
                  onClick={() => copyDetailsToClipboard(maskSensitiveData(selectedLog.details))}
                  className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium"
                >
                  {copiedKey ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedKey ? 'Copied' : 'Copy JSON'}
                </button>
              </div>
              <pre className="bg-slate-900 text-emerald-400 p-4 rounded-xl text-xs font-mono overflow-auto max-h-72 leading-relaxed">
                {JSON.stringify(maskSensitiveData(selectedLog.details), null, 2)}
              </pre>
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setSelectedLog(null)}
                className="px-4 py-2 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-xl text-xs font-bold transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AuditLogsCorporate;