// frontend/src/pages/SystemOwner/SubscriptionPlans/SubscriptionPlanList.js
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiRequest } from 'services/apiService.js';
import {
  Edit,
  Trash2,
  PlusCircle,
  RotateCcw,
  Briefcase,
  Search,
  Download,
  CheckCircle2,
  RefreshCw,
  Sparkles
} from 'lucide-react';

function SubscriptionPlanList({ onLogout }) {
  const [plans, setPlans] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [showDeleted, setShowDeleted] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();

  const fetchSubscriptionPlans = async () => {
    setIsLoading(true);
    setError('');
    try {
      const response = await apiRequest('/system-owner/subscription-plans?include_deleted=true', 'GET');
      setPlans(response || []);
    } catch (err) {
      console.error('Failed to fetch subscription plans:', err);
      setError('Failed to load subscription plans.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSubscriptionPlans();
  }, []);

  const handleEdit = (planId) => {
    navigate(`/system-owner/subscription-plans/edit/${planId}`);
  };

  const handleDelete = async (planId, planName) => {
    if (window.confirm(`Are you sure you want to soft-delete "${planName}"?`)) {
      try {
        setIsLoading(true);
        await apiRequest(`/system-owner/subscription-plans/${planId}`, 'DELETE');
        fetchSubscriptionPlans();
        alert(`Subscription plan "${planName}" soft-deleted successfully.`);
      } catch (err) {
        console.error('Failed to soft-delete subscription plan:', err);
        setError(`Failed to soft-delete plan "${planName}".`);
        setIsLoading(false);
      }
    }
  };

  const handleRestore = async (planId, planName) => {
    if (window.confirm(`Are you sure you want to restore "${planName}"?`)) {
      try {
        setIsLoading(true);
        await apiRequest(`/system-owner/subscription-plans/${planId}/restore`, 'POST');
        fetchSubscriptionPlans();
        alert(`Subscription plan "${planName}" restored successfully.`);
      } catch (err) {
        console.error('Failed to restore subscription plan:', err);
        setError(`Failed to restore plan "${planName}".`);
        setIsLoading(false);
      }
    }
  };

  const filteredPlans = useMemo(() => {
    return plans.filter((p) => {
      if (!showDeleted && p.is_deleted) return false;

      const matchesSearch =
        !searchTerm ||
        p.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        String(p.price).includes(searchTerm);

      return matchesSearch;
    });
  }, [plans, showDeleted, searchTerm]);

  const activeCount = useMemo(() => plans.filter((p) => !p.is_deleted).length, [plans]);
  const deletedCount = useMemo(() => plans.filter((p) => p.is_deleted).length, [plans]);

  const exportToCSV = () => {
    if (filteredPlans.length === 0) return;
    const headers = ['Plan ID', 'Plan Name', 'Price', 'Billing Frequency', 'Max Users', 'Max LGs', 'Status'];
    const rows = filteredPlans.map((p) => [
      p.id,
      `"${(p.name || '').replace(/"/g, '""')}"`,
      p.price || 0,
      p.billing_frequency || 'MONTHLY',
      p.max_users || 'Unlimited',
      p.max_lgs || 'Unlimited',
      p.is_deleted ? 'Soft Deleted' : 'Active'
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Grow_Subscription_Plans_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 space-y-3">
        <RefreshCw className="h-8 w-8 text-indigo-600 animate-spin" />
        <p className="text-xs font-medium text-slate-500">Loading Subscription Plans...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full space-y-3 overflow-hidden">
      {/* Compact Header */}
      <div className="flex-shrink-0 flex items-center justify-between bg-white dark:bg-slate-800 px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-purple-600 text-white rounded-lg">
            <Briefcase className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-base font-black text-slate-900 dark:text-white tracking-tight">
              Subscription Plans & Pricing Tiers
            </h1>
            <p className="text-[11px] text-slate-400">
              Define SaaS billing tiers, user quotas, and guarantee volume limits.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={exportToCSV}
            disabled={filteredPlans.length === 0}
            className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-all"
          >
            <Download className="w-3 h-3" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={() => navigate('/system-owner/subscription-plans/new')}
            className="flex items-center gap-1 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-lg transition-all"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Create Plan</span>
          </button>
        </div>
      </div>

      {/* Compact KPI Mini Tiles */}
      <div className="flex-shrink-0 grid grid-cols-3 gap-2">
        <div className="bg-white dark:bg-slate-800 p-2.5 rounded-xl border border-slate-200 text-center">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Tiers</span>
          <span className="text-lg font-black text-slate-900 block">{plans.length}</span>
        </div>
        <div className="bg-emerald-50/40 p-2.5 rounded-xl border border-emerald-200 text-center">
          <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider block">Active Tiers</span>
          <span className="text-lg font-black text-emerald-700 block">{activeCount}</span>
        </div>
        <div className="bg-white dark:bg-slate-800 p-2.5 rounded-xl border border-slate-200 text-center">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Archived</span>
          <span className="text-lg font-black text-slate-600 block">{deletedCount}</span>
        </div>
      </div>

      {/* Search Bar */}
      <div className="flex-shrink-0 bg-white dark:bg-slate-800 p-2.5 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-2">
        <div className="flex-1 min-w-[220px] relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search plans by name, price, or description..."
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>

        {deletedCount > 0 && (
          <label className="flex items-center gap-1 cursor-pointer select-none text-[11px] font-semibold text-slate-600 bg-slate-50 px-2 py-1.5 rounded-lg border border-slate-200">
            <input
              type="checkbox"
              checked={showDeleted}
              onChange={() => setShowDeleted(!showDeleted)}
              className="rounded text-purple-600"
            />
            <span>Show Archived ({deletedCount})</span>
          </label>
        )}
      </div>

      {/* Main Plans Table (Viewport-Fit Container with Sticky Header) */}
      <div className="flex-1 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 shadow-xs overflow-hidden flex flex-col min-h-0">
        {filteredPlans.length === 0 ? (
          <div className="p-8 text-center text-slate-400 space-y-1">
            <p className="text-xs font-bold text-slate-600">No subscription plans found.</p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="sticky top-0 bg-slate-50 z-10 shadow-2xs">
                <tr className="border-b border-slate-100 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  <th className="py-2.5 px-3">Plan Name</th>
                  <th className="py-2.5 px-3">Price & Frequency</th>
                  <th className="py-2.5 px-3">User Limits</th>
                  <th className="py-2.5 px-3">LG Capacity</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredPlans.map((plan) => (
                  <tr
                    key={plan.id}
                    className={`hover:bg-slate-50 transition-colors ${
                      plan.is_deleted ? 'bg-rose-50/30 opacity-70' : ''
                    }`}
                  >
                    <td className="py-2 px-3">
                      <div className="font-bold text-xs text-slate-900 flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-purple-600" />
                        {plan.name}
                      </div>
                      <span className="text-[9px] text-slate-400 block truncate max-w-xs">{plan.description || 'Standard tier'}</span>
                    </td>
                    <td className="py-2 px-3">
                      <span className="font-mono font-bold text-xs text-slate-900">
                        ${Number(plan.price || 0).toLocaleString()}
                      </span>
                      <span className="text-[9px] text-slate-400 block uppercase">
                        / {plan.billing_frequency || 'Month'}
                      </span>
                    </td>
                    <td className="py-2 px-3 font-medium text-slate-700">
                      {plan.max_users ? `${plan.max_users} Users` : 'Unlimited'}
                    </td>
                    <td className="py-2 px-3 font-medium text-slate-700">
                      {plan.max_lgs ? `${plan.max_lgs} LGs` : 'Unlimited'}
                    </td>
                    <td className="py-2 px-3">
                      {plan.is_deleted ? (
                        <span className="text-[10px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                          Archived
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                          Active
                        </span>
                      )}
                    </td>
                    <td className="py-2 px-3 text-right space-x-1 whitespace-nowrap">
                      <button
                        onClick={() => handleEdit(plan.id)}
                        className="p-1 text-slate-500 hover:text-purple-600 hover:bg-purple-50 rounded"
                        title="Edit Plan"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>

                      {!plan.is_deleted ? (
                        <button
                          onClick={() => handleDelete(plan.id, plan.name)}
                          className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded"
                          title="Archive"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      ) : (
                        <button
                          onClick={() => handleRestore(plan.id, plan.name)}
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

export default SubscriptionPlanList;
