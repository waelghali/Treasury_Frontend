// frontend/src/pages/SystemOwner/Customers/CustomerList.js
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiRequest } from 'services/apiService.js';
import {
  PlusCircle,
  Trash2,
  RotateCcw,
  Eye,
  Building2,
  Users,
  Search,
  Download,
  Layers,
  CheckCircle2,
  RefreshCw,
  Briefcase
} from 'lucide-react';

function CustomerList({ onLogout }) {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showDeleted, setShowDeleted] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [planFilter, setPlanFilter] = useState('ALL');
  const [error, setError] = useState('');

  const fetchCustomers = async () => {
    setIsLoading(true);
    setError('');
    try {
      const response = await apiRequest('/system-owner/customers', 'GET');
      setCustomers(response || []);
    } catch (err) {
      console.error('Failed to fetch customers:', err);
      setError(`Failed to load customers. ${err.message || ''}`);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  const handleDelete = async (customerId, customerName) => {
    if (window.confirm(`Are you sure you want to soft-delete "${customerName}"?`)) {
      try {
        setIsLoading(true);
        await apiRequest(`/system-owner/customers/${customerId}`, 'DELETE');
        alert(`Customer "${customerName}" soft-deleted successfully.`);
        fetchCustomers();
      } catch (err) {
        console.error('Failed to soft-delete customer:', err);
        setError(`Failed to soft-delete customer "${customerName}".`);
        setIsLoading(false);
      }
    }
  };

  const handleRestore = async (customerId, customerName) => {
    if (window.confirm(`Are you sure you want to restore "${customerName}"?`)) {
      try {
        setIsLoading(true);
        await apiRequest(`/system-owner/customers/${customerId}/restore`, 'POST');
        alert(`Customer "${customerName}" restored successfully.`);
        fetchCustomers();
      } catch (err) {
        console.error('Failed to restore customer:', err);
        setError(`Failed to restore customer "${customerName}".`);
        setIsLoading(false);
      }
    }
  };

  const handleViewDetails = (customerId) => {
    navigate(`/system-owner/customers/${customerId}/details`);
  };

  const planOptions = useMemo(() => {
    const set = new Set();
    customers.forEach((c) => {
      if (c.subscription_plan?.name) set.add(c.subscription_plan.name);
    });
    return Array.from(set);
  }, [customers]);

  const filteredCustomers = useMemo(() => {
    return customers.filter((c) => {
      if (!showDeleted && c.is_deleted) return false;

      const matchesSearch =
        !searchTerm ||
        c.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.tax_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.subscription_plan?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        String(c.id).includes(searchTerm);

      const matchesPlan = planFilter === 'ALL' || c.subscription_plan?.name === planFilter;

      return matchesSearch && matchesPlan;
    });
  }, [customers, showDeleted, searchTerm, planFilter]);

  const activeCount = useMemo(() => customers.filter((c) => !c.is_deleted).length, [customers]);
  const deletedCount = useMemo(() => customers.filter((c) => c.is_deleted).length, [customers]);
  const totalEntities = useMemo(() => customers.reduce((sum, c) => sum + (c.entities?.length || 0), 0), [customers]);
  const totalUsers = useMemo(() => customers.reduce((sum, c) => sum + (c.users?.length || 0), 0), [customers]);

  const exportToCSV = () => {
    if (filteredCustomers.length === 0) return;
    const headers = ['Customer ID', 'Company Name', 'Tax ID', 'Subscription Plan', 'Entities Count', 'Users Count', 'Status'];
    const rows = filteredCustomers.map((c) => [
      c.id,
      `"${(c.name || '').replace(/"/g, '""')}"`,
      c.tax_id || '',
      `"${(c.subscription_plan?.name || '').replace(/"/g, '""')}"`,
      c.entities?.length || 0,
      c.users?.length || 0,
      c.is_deleted ? 'Soft Deleted' : 'Active'
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Grow_Customers_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getPlanBadge = (planName) => {
    if (!planName) return <span className="text-slate-400 text-[11px] italic">No Plan</span>;
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-purple-100 text-purple-800 border border-purple-200">
        <Briefcase className="w-2.5 h-2.5 text-purple-600" />
        {planName}
      </span>
    );
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 space-y-3">
        <RefreshCw className="h-8 w-8 text-indigo-600 animate-spin" />
        <p className="text-xs font-medium text-slate-500">Loading Customer Tenants...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full space-y-3 overflow-y-auto">
      {/* Compact Header */}
      <div className="flex-shrink-0 flex items-center justify-between bg-white dark:bg-slate-800 px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-blue-600 text-white rounded-lg">
            <Building2 className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-base font-black text-slate-900 dark:text-white tracking-tight">
              Customer Tenants Management
            </h1>
            <p className="text-[11px] text-slate-400">
              Multi-entity organizations, user seats, and subscription plan assignments.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={exportToCSV}
            disabled={filteredCustomers.length === 0}
            className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-all"
          >
            <Download className="w-3 h-3" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={() => navigate('/system-owner/customers/onboard')}
            className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg transition-all"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Onboard Customer</span>
          </button>
        </div>
      </div>

      {/* Compact KPI Mini Tiles */}
      <div className="flex-shrink-0 grid grid-cols-4 gap-2">
        <div className="bg-white dark:bg-slate-800 p-2.5 rounded-xl border border-slate-200 text-center">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Organizations</span>
          <span className="text-lg font-black text-slate-900 block">{customers.length}</span>
        </div>
        <div className="bg-emerald-50/40 p-2.5 rounded-xl border border-emerald-200 text-center">
          <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider block">Active Tenants</span>
          <span className="text-lg font-black text-emerald-700 block">{activeCount}</span>
        </div>
        <div className="bg-white dark:bg-slate-800 p-2.5 rounded-xl border border-slate-200 text-center">
          <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-wider block">Entities</span>
          <span className="text-lg font-black text-indigo-600 block">{totalEntities}</span>
        </div>
        <div className="bg-white dark:bg-slate-800 p-2.5 rounded-xl border border-slate-200 text-center">
          <span className="text-[10px] font-bold text-purple-500 uppercase tracking-wider block">User Seats</span>
          <span className="text-lg font-black text-purple-600 block">{totalUsers}</span>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex-shrink-0 bg-white dark:bg-slate-800 p-2.5 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-2">
        <div className="flex-1 min-w-[220px] relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search organizations by name, Tax ID, plan..."
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="flex items-center gap-1.5">
          <select
            value={planFilter}
            onChange={(e) => setPlanFilter(e.target.value)}
            className="px-2 py-1.5 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-lg"
          >
            <option value="ALL">All Plans</option>
            {planOptions.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>

          {deletedCount > 0 && (
            <label className="flex items-center gap-1 cursor-pointer select-none text-[11px] font-semibold text-slate-600 bg-slate-50 px-2 py-1.5 rounded-lg border border-slate-200">
              <input
                type="checkbox"
                checked={showDeleted}
                onChange={() => setShowDeleted(!showDeleted)}
                className="rounded text-indigo-600"
              />
              <span>Deleted ({deletedCount})</span>
            </label>
          )}
        </div>
      </div>

      {/* Main Customers Table (Viewport-Fit Container with Sticky Header) */}
      <div className="flex-1 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 shadow-xs overflow-hidden flex flex-col min-h-0">
        {filteredCustomers.length === 0 ? (
          <div className="p-8 text-center text-slate-400 space-y-1">
            <p className="text-xs font-bold text-slate-600">No organizations matching search.</p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="sticky top-0 bg-slate-50 z-10 shadow-2xs">
                <tr className="border-b border-slate-100 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  <th className="py-2.5 px-3">Organization</th>
                  <th className="py-2.5 px-3">Tax ID</th>
                  <th className="py-2.5 px-3">Subscription Plan</th>
                  <th className="py-2.5 px-3">Entities</th>
                  <th className="py-2.5 px-3">Users</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredCustomers.map((customer) => (
                  <tr
                    key={customer.id}
                    className={`hover:bg-slate-50 transition-colors ${
                      customer.is_deleted ? 'bg-rose-50/30 opacity-70' : ''
                    }`}
                  >
                    <td className="py-2 px-3">
                      <div className="font-bold text-xs text-slate-900">
                        {customer.name}
                      </div>
                      <span className="text-[9px] font-mono text-slate-400">ID #{customer.id}</span>
                    </td>
                    <td className="py-2 px-3 font-mono text-slate-600">
                      {customer.tax_id || 'N/A'}
                    </td>
                    <td className="py-2 px-3">
                      {getPlanBadge(customer.subscription_plan?.name)}
                    </td>
                    <td className="py-2 px-3">
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-700">
                        <Layers className="w-2.5 h-2.5 text-slate-400" />
                        {customer.entities?.length || 0}
                      </span>
                    </td>
                    <td className="py-2 px-3">
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-700">
                        <Users className="w-2.5 h-2.5 text-slate-400" />
                        {customer.users?.length || 0}
                      </span>
                    </td>
                    <td className="py-2 px-3">
                      {customer.is_deleted ? (
                        <span className="text-[10px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                          Deleted
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                          Active
                        </span>
                      )}
                    </td>
                    <td className="py-2 px-3 text-right space-x-1 whitespace-nowrap">
                      <button
                        onClick={() => handleViewDetails(customer.id)}
                        className="p-1 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded"
                        title="View Details"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>

                      {!customer.is_deleted ? (
                        <button
                          onClick={() => handleDelete(customer.id, customer.name)}
                          className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded"
                          title="Soft Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      ) : (
                        <button
                          onClick={() => handleRestore(customer.id, customer.name)}
                          className="p-1 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded"
                          title="Restore"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                        </button>
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
  );
}

export default CustomerList;
