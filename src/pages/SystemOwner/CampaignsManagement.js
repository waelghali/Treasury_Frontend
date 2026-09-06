// frontend/src/pages/SystemOwner/CampaignsManagement.js
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  Gift,
  Plus,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  DollarSign,
  AlertCircle,
  Percent,
  XCircle,
  ExternalLink,
  Filter,
  RefreshCw,
  Download,
  Search,
  FileText,
  Check,
  Users,
  Eye,
  ShieldCheck,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Pencil
} from 'lucide-react';
import apiClient from '../../services/apiClient';

/**
 * Searchable Select Component for Partner Banks
 * Mirrors the search experience in RecordNewLGPage with keyboard navigation and instant filtering.
 */
const SearchableBankSelect = ({
  name,
  id,
  value,
  onChange,
  options,
  placeholder,
  required,
  className,
  disabled
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const wrapperRef = useRef(null);
  const inputRef = useRef(null);

  const selectedOption = options.find((opt) => String(opt.value) === String(value));

  const isSearchActive =
    searchTerm.length > 0 && !(selectedOption && selectedOption.label === searchTerm);

  const filteredOptions = isSearchActive
    ? options.filter((option) =>
        option.label.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : options;

  const handleSelect = (option) => {
    const syntheticEvent = {
      target: {
        name,
        value: option.value,
        type: 'select-one'
      },
      preventDefault: () => {},
      stopPropagation: () => {}
    };
    onChange(syntheticEvent);
    setSearchTerm(option.value === '' ? '' : option.label);
    setIsOpen(false);
    setHighlightedIndex(-1);
    inputRef.current?.focus();
  };

  const handleInputChange = (e) => {
    const newTerm = e.target.value;
    setSearchTerm(newTerm);
    setIsOpen(true);
    setHighlightedIndex(-1);

    if (String(value).length > 0 && (selectedOption ? selectedOption.label !== newTerm : true)) {
      const syntheticEvent = {
        target: {
          name,
          value: '',
          type: 'select-one'
        }
      };
      onChange(syntheticEvent);
    }
  };

  const handleBlur = () => {
    setTimeout(() => {
      if (wrapperRef.current && !wrapperRef.current.contains(document.activeElement)) {
        setIsOpen(false);
        if (selectedOption && selectedOption.value !== '') {
          setSearchTerm(selectedOption.label);
        } else {
          setSearchTerm('');
        }
      }
    }, 150);
  };

  const handleFocus = () => {
    setIsOpen(true);
    if (!selectedOption || selectedOption.value === '') {
      setSearchTerm('');
    }
  };

  const handleKeyDown = useCallback(
    (e) => {
      if (!isOpen) {
        if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          setIsOpen(true);
        }
        return;
      }

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setHighlightedIndex((prev) => (prev < filteredOptions.length - 1 ? prev + 1 : 0));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : filteredOptions.length - 1));
          break;
        case 'Enter':
          e.preventDefault();
          if (highlightedIndex >= 0 && filteredOptions[highlightedIndex]) {
            handleSelect(filteredOptions[highlightedIndex]);
          } else if (
            filteredOptions.length === 1 &&
            filteredOptions[0].label.toLowerCase().includes(searchTerm.toLowerCase())
          ) {
            handleSelect(filteredOptions[0]);
          } else if (selectedOption && selectedOption.label === searchTerm) {
            setIsOpen(false);
          }
          break;
        case 'Escape':
          e.preventDefault();
          setIsOpen(false);
          break;
        default:
          break;
      }
    },
    [isOpen, highlightedIndex, filteredOptions, selectedOption, searchTerm]
  );

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    if (selectedOption && selectedOption.value !== '') {
      setSearchTerm(selectedOption.label);
    } else {
      setSearchTerm('');
    }
  }, [value, selectedOption]);

  const displayPlaceholder =
    selectedOption && selectedOption.value === ''
      ? '🌐 All Banks (Platform-Wide Promotion)'
      : placeholder;

  return (
    <div className="relative" ref={wrapperRef}>
      <div className={`relative ${disabled ? 'opacity-50 pointer-events-none' : ''}`}>
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
        <input
          type="text"
          ref={inputRef}
          id={id}
          name={name}
          value={searchTerm}
          onChange={handleInputChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          placeholder={displayPlaceholder}
          required={required}
          className={`${className} pl-9 pr-8`}
          disabled={disabled}
          autoComplete="off"
        />
        <div
          className="absolute right-2.5 top-1/2 transform -translate-y-1/2 cursor-pointer p-0.5 text-slate-400 hover:text-slate-600"
          onClick={() => setIsOpen(!isOpen)}
        >
          {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </div>
      </div>

      {isOpen && (
        <ul className="absolute z-50 w-full bg-white border border-slate-200 rounded-lg shadow-xl mt-1 max-h-56 overflow-y-auto divide-y divide-slate-100">
          {filteredOptions.length > 0 ? (
            filteredOptions.map((option, index) => {
              const isSelected = String(option.value) === String(value);
              const isHighlighted = index === highlightedIndex;
              return (
                <li
                  key={option.value || 'all-banks'}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    handleSelect(option);
                  }}
                  className={`px-3.5 py-2.5 cursor-pointer text-xs transition-all duration-100 flex items-center justify-between ${
                    isHighlighted ? 'bg-indigo-50 text-indigo-900' : 'hover:bg-slate-50 text-slate-800'
                  } ${isSelected ? 'bg-indigo-50/70 font-semibold text-indigo-900' : ''}`}
                >
                  <span className="truncate">{option.label}</span>
                  {isSelected && <Check className="w-4 h-4 text-indigo-600 shrink-0 ml-2" />}
                </li>
              );
            })
          ) : (
            <li className="px-3.5 py-3 text-xs text-slate-400 text-center">
              No matching banks found
            </li>
          )}
        </ul>
      )}
    </div>
  );
};

const CampaignsManagement = () => {
  const [activeTab, setActiveTab] = useState('campaigns'); // 'campaigns' | 'claims'
  const [campaigns, setCampaigns] = useState([]);
  const [claims, setClaims] = useState([]);
  const [banks, setBanks] = useState([]);
  const [stats, setStats] = useState({
    total_active_campaigns: 0,
    total_claims: 0,
    total_accrued_cashback: 0,
    total_paid_cashback: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters State for Claims
  const [customerFilter, setCustomerFilter] = useState('');
  const [bankFilter, setBankFilter] = useState('');
  const [claimStatusFilter, setClaimStatusFilter] = useState('');

  // Customer Breakdown & Manual Audit States
  const [selectedCustomerBreakdown, setSelectedCustomerBreakdown] = useState(null);
  const [manualVerifyClaimModal, setManualVerifyClaimModal] = useState(null);
  const [manualVerifyNotes, setManualVerifyNotes] = useState('');
  const [verifying, setVerifying] = useState(false);

  // Modal State for Campaign (Create or Edit)
  const initialFormData = {
    name: '',
    description: '',
    bank_id: '',
    cashback_percentage: '',
    max_cashback_per_lg: '',
    max_lgs_per_customer: '',
    start_date: '',
    end_date: '',
    is_active: true
  };
  const [showModal, setShowModal] = useState(false);
  const [editingCampaignId, setEditingCampaignId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState(initialFormData);

  const handleOpenCreateModal = () => {
    setEditingCampaignId(null);
    setFormData(initialFormData);
    setShowModal(true);
  };

  const handleOpenEditModal = (camp) => {
    setEditingCampaignId(camp.id);
    setFormData({
      name: camp.name || '',
      description: camp.description || '',
      bank_id: camp.bank_id ? String(camp.bank_id) : '',
      cashback_percentage: camp.cashback_percentage ? (Number(camp.cashback_percentage) * 100).toString() : '',
      max_cashback_per_lg: camp.max_cashback_per_lg ? String(Number(camp.max_cashback_per_lg)) : '',
      max_lgs_per_customer: camp.max_lgs_per_customer ? String(camp.max_lgs_per_customer) : '',
      start_date: camp.start_date || '',
      end_date: camp.end_date || '',
      is_active: camp.is_active !== undefined ? camp.is_active : true
    });
    setShowModal(true);
  };

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [campRes, claimsRes, banksRes, statsRes] = await Promise.all([
        apiClient.get('/system-owner/campaigns'),
        apiClient.get('/system-owner/cashback-claims'),
        apiClient
          .get('/system-owner/campaigns/banks')
          .catch(() => apiClient.get('/system-owner/banks/'))
          .catch(() => apiClient.get('/system-owner/banks'))
          .catch(() => apiClient.get('/end-user/banks/'))
          .catch(() => ({ data: [] })),
        apiClient.get('/system-owner/campaigns-stats').catch(() => ({ data: {} }))
      ]);

      setCampaigns(campRes.data || []);
      setClaims(claimsRes.data || []);
      const rawBanks = banksRes.data;
      const parsedBanks = Array.isArray(rawBanks) ? rawBanks : (rawBanks?.items || []);
      setBanks(parsedBanks);
      if (statsRes.data) setStats(statsRes.data);
    } catch (err) {
      console.error('Failed to load campaigns data:', err);
      setError('Could not load campaigns data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Formatted bank options for SearchableBankSelect dropdown
  const bankOptions = useMemo(() => {
    const opts = [
      { value: '', label: '🌐 All Banks (Platform-Wide Promotion)' }
    ];
    (banks || []).forEach((b) => {
      const tag = b.short_name || b.swift_code ? ` (${b.short_name || b.swift_code})` : '';
      opts.push({
        value: String(b.id),
        label: `${b.name}${tag}`
      });
    });
    return opts;
  }, [banks]);

  const handleSaveCampaign = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const pctDecimal = parseFloat(formData.cashback_percentage) / 100;
      const payload = {
        name: formData.name,
        description: formData.description || null,
        bank_id: formData.bank_id ? parseInt(formData.bank_id, 10) : null,
        cashback_percentage: pctDecimal,
        max_cashback_per_lg: parseFloat(formData.max_cashback_per_lg),
        max_lgs_per_customer: parseInt(formData.max_lgs_per_customer, 10),
        start_date: formData.start_date,
        end_date: formData.end_date,
        is_active: formData.is_active
      };

      if (editingCampaignId) {
        await apiClient.put(`/system-owner/campaigns/${editingCampaignId}`, payload);
      } else {
        await apiClient.post('/system-owner/campaigns', payload);
      }
      setShowModal(false);
      setEditingCampaignId(null);
      setFormData(initialFormData);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to save campaign');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (campaign) => {
    try {
      await apiClient.put(`/system-owner/campaigns/${campaign.id}`, {
        is_active: !campaign.is_active
      });
      fetchData();
    } catch (err) {
      alert('Failed to update campaign status');
    }
  };

  const handleUpdateClaimStatus = async (claimId, newStatus) => {
    const notes = window.prompt(`Enter optional note for setting status to ${newStatus}:`, '');
    if (notes === null) return;
    try {
      await apiClient.patch(`/system-owner/cashback-claims/${claimId}/status`, {
        status: newStatus,
        notes: notes || undefined
      });
      fetchData();
    } catch (err) {
      alert('Failed to update claim status');
    }
  };

  const handleManualVerify = async () => {
    if (!manualVerifyClaimModal) return;
    setVerifying(true);
    try {
      await apiClient.post(`/system-owner/cashback-claims/${manualVerifyClaimModal.id}/manual-verify`, {
        notes: manualVerifyNotes
      });
      setManualVerifyClaimModal(null);
      setManualVerifyNotes('');
      fetchData();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to manually verify claim');
    } finally {
      setVerifying(false);
    }
  };

  const handleExportCSV = async (targetCustomerId = null) => {
    try {
      let url = '/system-owner/campaigns/export-partner-report?';
      if (bankFilter) url += `bank_id=${bankFilter}&`;
      if (claimStatusFilter) url += `status=${claimStatusFilter}&`;
      const custId = targetCustomerId || customerFilter;
      if (custId) url += `customer_id=${custId}&`;

      const res = await apiClient.get(url, { responseType: 'blob' });
      const blob = new Blob([res.data], { type: 'text/csv' });
      const link = document.createElement('a');
      link.href = window.URL.createObjectURL(blob);
      link.download = `cashback_audit_report_${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
    } catch (err) {
      alert('Failed to download audit CSV report');
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Gift className="w-7 h-7 text-indigo-600" />
            Partner Campaigns & Cashback
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Configure partner promotional offers, manage cashback rules, and settle monthly claims.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchData}
            className="p-2 text-slate-600 hover:text-slate-900 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition"
            title="Refresh Data"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
          <button
            onClick={handleOpenCreateModal}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white font-medium text-sm rounded-lg hover:bg-indigo-700 transition shadow-sm"
          >
            <Plus className="w-4 h-4" />
            New Campaign
          </button>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Active Campaigns</span>
            <span className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
              <Gift className="w-5 h-5" />
            </span>
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2">{stats.total_active_campaigns || 0}</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Claims</span>
            <span className="p-2 bg-blue-50 text-blue-600 rounded-lg">
              <Clock className="w-5 h-5" />
            </span>
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2">{stats.total_claims || 0}</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Accrued Cashback</span>
            <span className="p-2 bg-amber-50 text-amber-600 rounded-lg">
              <DollarSign className="w-5 h-5" />
            </span>
          </div>
          <p className="text-2xl font-bold text-amber-600 mt-2">
            EGP {Number(stats.total_accrued_cashback || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Settled & Paid</span>
            <span className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
              <CheckCircle2 className="w-5 h-5" />
            </span>
          </div>
          <p className="text-2xl font-bold text-emerald-600 mt-2">
            EGP {Number(stats.total_paid_cashback || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 gap-6">
        <button
          onClick={() => setActiveTab('campaigns')}
          className={`pb-3 text-sm font-semibold border-b-2 transition ${
            activeTab === 'campaigns'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Active Offers ({campaigns.length})
        </button>
        <button
          onClick={() => setActiveTab('claims')}
          className={`pb-3 text-sm font-semibold border-b-2 transition ${
            activeTab === 'claims'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Claims Settlement Ledger ({claims.length})
        </button>
      </div>

      {/* Tab 1: Campaigns List */}
      {activeTab === 'campaigns' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {campaigns.length === 0 ? (
            <div className="col-span-full text-center py-12 bg-white rounded-xl border border-slate-200 p-8">
              <Gift className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="text-base font-semibold text-slate-800">No campaigns launched yet</h3>
              <p className="text-sm text-slate-500 mt-1 max-w-sm mx-auto">
                Create your first partner promotional offer to incentivize corporate customers to route LGs.
              </p>
              <button
                onClick={handleOpenCreateModal}
                className="mt-4 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700"
              >
                Create Campaign
              </button>
            </div>
          ) : (
            campaigns.map((camp) => (
              <div
                key={camp.id}
                className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col justify-between"
              >
                <div className="p-5 space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 mb-2">
                        <Building2 className="w-3.5 h-3.5" />
                        {camp.bank ? camp.bank.name : '🌐 All Banks Offer'}
                      </span>
                      <h3 className="font-bold text-slate-900 text-lg leading-tight">{camp.name}</h3>
                    </div>
                    <span
                      className={`px-2.5 py-1 text-xs font-bold rounded-full ${
                        camp.is_active ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {camp.is_active ? 'ACTIVE' : 'PAUSED'}
                    </span>
                  </div>

                  {camp.description && (
                    <p className="text-sm text-slate-600 line-clamp-2">{camp.description}</p>
                  )}

                  <div className="grid grid-cols-2 gap-3 py-3 border-y border-slate-100 text-xs">
                    <div>
                      <span className="text-slate-400 block font-medium">Cashback Rate</span>
                      <span className="font-bold text-slate-800 text-sm">
                        {(Number(camp.cashback_percentage) * 100).toFixed(2)}%
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block font-medium">Max Cap per LG</span>
                      <span className="font-bold text-slate-800 text-sm">
                        EGP {Number(camp.max_cashback_per_lg).toLocaleString()}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block font-medium">Quota per Customer</span>
                      <span className="font-bold text-slate-800 text-sm">{camp.max_lgs_per_customer} LGs</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block font-medium">Claims Count</span>
                      <span className="font-bold text-indigo-600 text-sm">{camp.total_claims_count || 0} claims</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>
                      {camp.start_date} &rarr; {camp.end_date}
                    </span>
                  </div>
                </div>

                <div className="bg-slate-50 px-5 py-3 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-600">
                    Accrued: EGP {Number(camp.total_cashback_accrued || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleOpenEditModal(camp)}
                      className="text-xs font-semibold px-2.5 py-1.5 rounded-md border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 transition flex items-center gap-1 shadow-2xs"
                      title="Edit Campaign Parameters"
                    >
                      <Pencil className="w-3.5 h-3.5 text-indigo-600" />
                      Edit
                    </button>
                    <button
                      onClick={() => handleToggleActive(camp)}
                      className={`text-xs font-semibold px-3 py-1.5 rounded-md transition ${
                        camp.is_active
                          ? 'bg-amber-100 text-amber-800 hover:bg-amber-200'
                          : 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                      }`}
                    >
                      {camp.is_active ? 'Pause Campaign' : 'Activate Campaign'}
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Tab 2: Claims Ledger */}
      {activeTab === 'claims' && (
        <div className="space-y-4">
          {/* Controls & Filter Bar */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1">
                <Filter className="w-3.5 h-3.5" /> Filter:
              </span>

              {/* Customer Filter */}
              <select
                value={customerFilter}
                onChange={(e) => setCustomerFilter(e.target.value)}
                className="text-xs border border-slate-200 rounded-lg p-2 bg-slate-50 font-medium text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                <option value="">All Customers</option>
                {Array.from(new Map(claims.map(c => [c.customer_id, { id: c.customer_id, name: c.customer_name }])).values()).map(cust => (
                  <option key={cust.id} value={cust.id}>{cust.name || `Customer #${cust.id}`}</option>
                ))}
              </select>

              {/* Bank Filter */}
              <select
                value={bankFilter}
                onChange={(e) => setBankFilter(e.target.value)}
                className="text-xs border border-slate-200 rounded-lg p-2 bg-slate-50 font-medium text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                <option value="">All Partner Banks</option>
                {banks.map(b => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>

              {/* Status Filter */}
              <select
                value={claimStatusFilter}
                onChange={(e) => setClaimStatusFilter(e.target.value)}
                className="text-xs border border-slate-200 rounded-lg p-2 bg-slate-50 font-medium text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                <option value="">All Claim Statuses</option>
                <option value="CALCULATED">CALCULATED (Pending Review)</option>
                <option value="SCAN_VERIFIED">SCAN_VERIFIED (Copy Attached)</option>
                <option value="RECONCILED">RECONCILED (Bank Matched)</option>
                <option value="VERIFIED">VERIFIED (Manual Audit)</option>
                <option value="PAID">PAID (Disbursed)</option>
                <option value="REJECTED">REJECTED</option>
              </select>

              {(customerFilter || bankFilter || claimStatusFilter) && (
                <button
                  onClick={() => { setCustomerFilter(''); setBankFilter(''); setClaimStatusFilter(''); }}
                  className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold px-2 py-1"
                >
                  Clear Filters
                </button>
              )}
            </div>

            {/* Export Audit Report */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => handleExportCSV()}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white border border-slate-200 text-slate-700 text-xs font-semibold rounded-lg hover:bg-slate-50 transition shadow-2xs"
              >
                <Download className="w-3.5 h-3.5 text-indigo-600" />
                Export Partner Audit (CSV)
              </button>
            </div>
          </div>

          {/* Claims Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Monthly Claims Verification & Disbursement Ledger</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Click on any customer name to inspect their individual breakdown, quota usage, and perform audit verification.
                </p>
              </div>
              <span className="text-xs font-bold text-slate-600 bg-white border border-slate-200 px-3 py-1.5 rounded-lg shadow-sm">
                Target Settlement: Before 10th of following month
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-100/70 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    <th className="p-3.5">Customer</th>
                    <th className="p-3.5">LG Reference / Bank #</th>
                    <th className="p-3.5">Partner Bank</th>
                    <th className="p-3.5">LG Amount</th>
                    <th className="p-3.5">Cashback Amount</th>
                    <th className="p-3.5">Status & Audit</th>
                    <th className="p-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(() => {
                    const filtered = claims.filter(c => {
                      if (customerFilter && String(c.customer_id) !== String(customerFilter)) return false;
                      if (bankFilter && String(c.issued_lg_record?.bank_id || c.bank_id) !== String(bankFilter)) return false;
                      if (claimStatusFilter && c.status !== claimStatusFilter) return false;
                      return true;
                    });

                    if (filtered.length === 0) {
                      return (
                        <tr>
                          <td colSpan="7" className="text-center py-10 text-slate-400 text-sm">
                            No cashback claims matching the selected filters.
                          </td>
                        </tr>
                      );
                    }

                    return filtered.map((claim) => {
                      const statusColors = {
                        CALCULATED: 'bg-blue-100 text-blue-800',
                        SCAN_VERIFIED: 'bg-teal-100 text-teal-800',
                        RECONCILED: 'bg-indigo-100 text-indigo-800',
                        VERIFIED: 'bg-emerald-100 text-emerald-800',
                        PAID: 'bg-emerald-200 text-emerald-900',
                        REJECTED: 'bg-rose-100 text-rose-800'
                      };

                      return (
                        <tr key={claim.id} className="hover:bg-slate-50 transition">
                          <td className="p-3.5">
                            <button
                              onClick={() => setSelectedCustomerBreakdown({ id: claim.customer_id, name: claim.customer_name })}
                              className="font-bold text-slate-900 hover:text-indigo-600 hover:underline flex items-center gap-1.5 text-left"
                            >
                              {claim.customer_name || `Customer #${claim.customer_id}`}
                              <ExternalLink className="w-3 h-3 text-slate-400" />
                            </button>
                            <span className="text-[11px] text-slate-400 block">{claim.campaign_name}</span>
                          </td>
                          <td className="p-3.5 font-mono text-xs font-bold text-indigo-700">
                            {claim.lg_number || 'N/A'}
                          </td>
                          <td className="p-3.5 text-slate-700 font-medium">{claim.bank_name || 'All Banks Partner'}</td>
                          <td className="p-3.5 font-semibold text-slate-800">
                            {claim.currency_symbol} {Number(claim.lg_amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </td>
                          <td className="p-3.5 font-bold text-emerald-600">
                            {claim.currency_symbol} {Number(claim.cashback_amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </td>
                          <td className="p-3.5">
                            <span className={`px-2.5 py-1 text-[11px] font-bold rounded-full ${statusColors[claim.status] || 'bg-slate-100 text-slate-600'}`}>
                              {claim.status}
                            </span>
                            {claim.verification_source && (
                              <span className="block text-[10px] text-slate-400 mt-0.5">
                                Source: {claim.verification_source}
                              </span>
                            )}
                          </td>
                          <td className="p-3.5 text-right space-x-1.5 whitespace-nowrap">
                            {claim.status !== 'VERIFIED' && claim.status !== 'RECONCILED' && claim.status !== 'PAID' && (
                              <button
                                onClick={() => { setManualVerifyClaimModal(claim); setManualVerifyNotes(''); }}
                                className="px-2.5 py-1 bg-teal-600 text-white text-xs font-semibold rounded hover:bg-teal-700 transition"
                                title="Manually verify this claim with audit reason"
                              >
                                Manual Verify
                              </button>
                            )}
                            {claim.status !== 'PAID' && claim.status !== 'REJECTED' && (
                              <button
                                onClick={() => handleUpdateClaimStatus(claim.id, 'PAID')}
                                className="px-2.5 py-1 bg-emerald-600 text-white text-xs font-semibold rounded hover:bg-emerald-700 transition"
                              >
                                Mark Paid
                              </button>
                            )}
                            {claim.status !== 'REJECTED' && claim.status !== 'PAID' && (
                              <button
                                onClick={() => handleUpdateClaimStatus(claim.id, 'REJECTED')}
                                className="px-2.5 py-1 bg-rose-50 text-rose-700 border border-rose-200 text-xs font-semibold rounded hover:bg-rose-100 transition"
                              >
                                Reject
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    });
                  })()}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Customer Breakdown Audit Drawer / Modal */}
      {selectedCustomerBreakdown && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2.5">
                <Users className="w-5 h-5 text-indigo-600" />
                <div>
                  <h3 className="font-bold text-slate-900 text-base">
                    {selectedCustomerBreakdown.name || `Customer #${selectedCustomerBreakdown.id}`}
                  </h3>
                  <p className="text-xs text-slate-500">Partner Promotional & Cashback Utilization Audit</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleExportCSV(selectedCustomerBreakdown.id)}
                  className="px-3 py-1.5 bg-white border border-slate-200 text-slate-700 text-xs font-semibold rounded-lg hover:bg-slate-50 flex items-center gap-1.5 shadow-2xs"
                >
                  <Download className="w-3.5 h-3.5 text-indigo-600" />
                  Export Customer Statement
                </button>
                <button
                  onClick={() => setSelectedCustomerBreakdown(null)}
                  className="text-slate-400 hover:text-slate-600 text-xl font-bold p-1"
                >
                  &times;
                </button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto space-y-5">
              {/* Customer Stats Row */}
              {(() => {
                const custClaims = claims.filter(c => c.customer_id === selectedCustomerBreakdown.id);
                const validClaims = custClaims.filter(c => c.status !== 'REJECTED');
                const totalAccrued = validClaims.reduce((sum, c) => sum + Number(c.cashback_amount || 0), 0);
                const totalPaid = custClaims.filter(c => c.status === 'PAID').reduce((sum, c) => sum + Number(c.cashback_amount || 0), 0);
                const verifiedCount = custClaims.filter(c => ['RECONCILED', 'VERIFIED', 'PAID'].includes(c.status)).length;

                return (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                      <span className="text-[11px] font-bold text-slate-500 uppercase">Claims Used</span>
                      <p className="text-xl font-black text-slate-900 mt-1">{validClaims.length} LGs</p>
                    </div>
                    <div className="bg-emerald-50 p-3.5 rounded-xl border border-emerald-200">
                      <span className="text-[11px] font-bold text-emerald-700 uppercase">Total Accrued</span>
                      <p className="text-xl font-black text-emerald-800 mt-1">EGP {totalAccrued.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                    </div>
                    <div className="bg-indigo-50 p-3.5 rounded-xl border border-indigo-200">
                      <span className="text-[11px] font-bold text-indigo-700 uppercase">Verified LGs</span>
                      <p className="text-xl font-black text-indigo-800 mt-1">{verifiedCount} / {validClaims.length}</p>
                    </div>
                    <div className="bg-purple-50 p-3.5 rounded-xl border border-purple-200">
                      <span className="text-[11px] font-bold text-purple-700 uppercase">Paid Cashback</span>
                      <p className="text-xl font-black text-purple-800 mt-1">EGP {totalPaid.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                    </div>
                  </div>
                );
              })()}

              {/* Customer Claims Breakdown Table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-100 border-b border-slate-200 text-slate-600 uppercase font-semibold">
                      <th className="p-3">LG Reference / Bank #</th>
                      <th className="p-3">Bank</th>
                      <th className="p-3">LG Amount</th>
                      <th className="p-3">Cashback</th>
                      <th className="p-3">Status</th>
                      <th className="p-3 text-right">Audit Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {claims.filter(c => c.customer_id === selectedCustomerBreakdown.id).map(claim => (
                      <tr key={claim.id} className="hover:bg-slate-50">
                        <td className="p-3 font-mono font-bold text-indigo-700">{claim.lg_number || 'N/A'}</td>
                        <td className="p-3 text-slate-700">{claim.bank_name || 'Partner Bank'}</td>
                        <td className="p-3 font-semibold text-slate-800">
                          {claim.currency_symbol} {Number(claim.lg_amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                        <td className="p-3 font-bold text-emerald-600">
                          {claim.currency_symbol} {Number(claim.cashback_amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                        <td className="p-3">
                          <span className="px-2 py-0.5 rounded-full font-bold text-[10px] bg-slate-100 text-slate-700">
                            {claim.status}
                          </span>
                        </td>
                        <td className="p-3 text-right">
                          {claim.status !== 'VERIFIED' && claim.status !== 'RECONCILED' && claim.status !== 'PAID' && (
                            <button
                              onClick={() => { setManualVerifyClaimModal(claim); setManualVerifyNotes(''); }}
                              className="px-2.5 py-1 bg-teal-600 text-white text-[11px] font-semibold rounded hover:bg-teal-700 transition"
                            >
                              Verify
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex justify-end">
              <button
                onClick={() => setSelectedCustomerBreakdown(null)}
                className="px-4 py-2 bg-slate-200 text-slate-700 text-xs font-bold rounded-lg hover:bg-slate-300"
              >
                Close Audit View
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manual Verification Modal */}
      {manualVerifyClaimModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <h3 className="font-bold text-slate-900 flex items-center gap-2 text-sm">
                <ShieldCheck className="w-5 h-5 text-teal-600" />
                Manual Verification & Audit Confirmation
              </h3>
              <button onClick={() => setManualVerifyClaimModal(null)} className="text-slate-400 hover:text-slate-600">
                &times;
              </button>
            </div>

            <div className="p-6 space-y-4 text-sm">
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Customer:</span>
                  <strong className="text-slate-800">{manualVerifyClaimModal.customer_name || `Customer #${manualVerifyClaimModal.customer_id}`}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">LG Number:</span>
                  <strong className="font-mono text-indigo-700">{manualVerifyClaimModal.lg_number || 'N/A'}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Cashback Reward:</span>
                  <strong className="text-emerald-700 font-bold">{manualVerifyClaimModal.currency_symbol} {Number(manualVerifyClaimModal.cashback_amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Audit Rationale / Verification Note (Optional)
                </label>
                <textarea
                  rows="3"
                  placeholder="e.g. Verified with bank statement & client email request on 2026-09-05"
                  value={manualVerifyNotes}
                  onChange={(e) => setManualVerifyNotes(e.target.value)}
                  className="w-full text-xs border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-teal-500 focus:outline-none"
                ></textarea>
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setManualVerifyClaimModal(null)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 text-xs font-semibold rounded-lg hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleManualVerify}
                  disabled={verifying}
                  className="px-4 py-2 bg-teal-600 text-white text-xs font-bold rounded-lg hover:bg-teal-700 disabled:opacity-50 flex items-center gap-1.5"
                >
                  <Check className="w-3.5 h-3.5" />
                  {verifying ? 'Verifying...' : 'Confirm Verification'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Create Campaign */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <h3 className="font-bold text-slate-900 flex items-center gap-2">
                <Gift className="w-5 h-5 text-indigo-600" />
                {editingCampaignId ? 'Edit Promotional Campaign' : 'Launch Promotional Campaign'}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                &times;
              </button>
            </div>

            <form onSubmit={handleSaveCampaign} className="p-6 space-y-4">
              {editingCampaignId && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs text-blue-900 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                  <span>
                    <strong>Ledger Integrity Note:</strong> Edits apply to future LG transactions. Existing claims and already accrued historical cashback remain preserved to maintain financial audit integrity.
                  </span>
                </div>
              )}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Campaign Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Emirates NBD Corporate Acquisition Offer"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full text-sm border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Applicable Partner Bank</label>
                <SearchableBankSelect
                  name="bank_id"
                  id="campaign_bank_id"
                  value={formData.bank_id}
                  onChange={(e) => setFormData((prev) => ({ ...prev, bank_id: e.target.value }))}
                  options={bankOptions}
                  placeholder="Search partner bank or leave for All Banks"
                  className="w-full text-sm border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Cashback Rate (%) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    placeholder="e.g. 0.10"
                    value={formData.cashback_percentage}
                    onChange={(e) => setFormData({ ...formData, cashback_percentage: e.target.value })}
                    className="w-full text-sm border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Max Cap per LG (EGP) *</label>
                  <input
                    type="number"
                    step="100"
                    min="0"
                    required
                    placeholder="e.g. 3,000"
                    value={formData.max_cashback_per_lg}
                    onChange={(e) => setFormData({ ...formData, max_cashback_per_lg: e.target.value })}
                    className="w-full text-sm border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Max Eligible LGs per Customer *</label>
                <input
                  type="number"
                  min="1"
                  required
                  placeholder="e.g. 10"
                  value={formData.max_lgs_per_customer}
                  onChange={(e) => setFormData({ ...formData, max_lgs_per_customer: e.target.value })}
                  className="w-full text-sm border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Start Date *</label>
                  <input
                    type="date"
                    required
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    className="w-full text-sm border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">End Date *</label>
                  <input
                    type="date"
                    required
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                    className="w-full text-sm border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Offer Terms / Description</label>
                <textarea
                  rows="2"
                  placeholder="e.g. Terms, promotional rules, or internal notes"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full text-sm border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                ></textarea>
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                >
                  {saving
                    ? (editingCampaignId ? 'Saving Changes...' : 'Launching...')
                    : (editingCampaignId ? 'Save Changes' : 'Launch Campaign')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CampaignsManagement;
