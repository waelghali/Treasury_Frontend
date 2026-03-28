import React, { useState, useEffect } from 'react';
import { apiRequest } from '../../services/apiService';
import COUNTRIES from '../../constants/countries';
import {
  X, Plus, Trash2, ShieldCheck, Loader2, Building2,
  Calendar, Hash, Percent, Clock, Globe, Search,
  ChevronDown, ChevronUp, AlertCircle, MapPin, Info,
  Settings2, Landmark, FileText, Coins, Paperclip
} from 'lucide-react';

const getCustomerIdFromToken = () => {
  const token = localStorage.getItem('jwt_token');
  if (!token) return 1; // Fallback
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const payload = JSON.parse(window.atob(base64));
    return payload.customer_id || 1;
  } catch (e) {
    return 1;
  }
};

// Searchable multi-select dropdown for countries
function CountryMultiSelect({ selected = [], onChange, ruleType }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const filtered = COUNTRIES.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.code.toLowerCase().includes(search.toLowerCase())
  );

  const toggle = (code) => {
    const next = selected.includes(code)
      ? selected.filter(c => c !== code)
      : [...selected, code];
    onChange(next);
  };

  const label = (code) => {
    const c = COUNTRIES.find(x => x.code === code);
    return c ? `${c.name} (${c.code})` : code;
  };

  return (
    <div className="relative">
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-1.5">
          {selected.map(code => (
            <span key={code} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold ${ruleType === 'ALLOW' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
              {label(code)}
              <button type="button" onClick={() => toggle(code)} className="hover:opacity-70">×</button>
            </span>
          ))}
        </div>
      )}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full px-3 py-1.5 border border-slate-200 rounded-xl text-[12px] font-bold text-left bg-white hover:border-blue-300 flex items-center justify-between"
      >
        <span className="text-slate-400">{selected.length === 0 ? 'Select countries...' : `${selected.length} selected`}</span>
        <ChevronDown size={14} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute z-50 w-full bottom-full mb-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-52 overflow-hidden">
          <div className="p-2 border-b sticky top-0 bg-white">
            <div className="flex items-center gap-2 px-2 py-1 bg-slate-50 rounded-lg border">
              <Search size={12} className="text-slate-400" />
              <input
                autoFocus
                className="flex-1 text-[11px] bg-transparent outline-none"
                placeholder="Search countries..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
          </div>
          <div className="max-h-36 overflow-y-auto p-1">
            {filtered.map(c => (
              <button
                type="button"
                key={c.code}
                onClick={() => toggle(c.code)}
                className={`w-full text-left px-3 py-1.5 text-[11px] font-bold rounded-lg transition-all ${selected.includes(c.code) ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50'
                  }`}
              >
                <span className="font-mono text-slate-400 mr-2">{c.code}</span>
                {c.name}
                {selected.includes(c.code) && <span className="float-right text-blue-500">✓</span>}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function FacilityFormModal({ facility, onClose, onSuccess }) {
  const isEdit = !!facility;
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('basic');
  const [selectedFile, setSelectedFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [banks, setBanks] = useState([]);
  const [currencies, setCurrencies] = useState([]);
  const [lgTypes, setLgTypes] = useState([]);
  const [customerEntities, setCustomerEntities] = useState([]);
  const [expandedSubLimit, setExpandedSubLimit] = useState(null);
  const [projects, setProjects] = useState([]);
  const [bankAccounts, setBankAccounts] = useState([]);

  const [formData, setFormData] = useState({
    facility_name: '',
    facility_type: 'LG',
    bank_id: '',
    bank_account_id: '',
    customer_id: getCustomerIdFromToken(),
    entity_ids: [],
    currency_id: '',
    total_limit_amount: '',
    reference_number: '',
    status: 'ACTIVE',
    start_date: '',
    expiry_date: '',
    review_date: '',
    review_required_flag: false,

    // Multi-Currency & Risk Suite
    multi_currency_allowed: false,
    fx_breach_auto_suspend: false,
    margin_reduces_exposure: false,
    exposure_start_trigger: 'ON_ISSUANCE',
    facility_default_margin_pct: '',

    sla_agreement_days: '',
    required_cash_margin_days: '', // Start empty for clean input
    allow_cross_border: false,
    allow_third_party_issuance: false,
    internal_notes: '',
    contract_document_path: '',

    foreign_bank_name: '',
    foreign_bank_country: '',
    foreign_bank_address: '',
    foreign_bank_swift_code: '',

    sub_limits: []
  });

  // Load bank accounts when bank_id changes
  useEffect(() => {
    if (formData.bank_id) {
      apiRequest(`/issuance/bank-accounts?bank_id=${formData.bank_id}`, 'GET')
        .then(data => setBankAccounts(data || []))
        .catch(() => setBankAccounts([]));
    } else {
      setBankAccounts([]);
    }
  }, [formData.bank_id]);


  useEffect(() => {
    async function loadMetadata() {
      try {
        const [b, c, t, ce, proj] = await Promise.all([
          apiRequest('/end-user/banks/', 'GET'),
          apiRequest('/end-user/currencies/', 'GET'),
          apiRequest('/end-user/lg-types/', 'GET'),
          apiRequest('/corporate-admin/customer-entities/', 'GET'),
          apiRequest('/corporate-admin/projects/', 'GET')
        ]);
        setBanks(b || []);
        setCurrencies(c || []);
        setLgTypes(t || []);
        setCustomerEntities(ce || []);
        setProjects(proj || []);

        // Auto-select entity if customer has only 1 entity (new facility only)
        if (!isEdit && ce && ce.length === 1) {
          setFormData(prev => ({ ...prev, entity_ids: [ce[0].id] }));
        }

        if (isEdit && facility) {
          setFormData({
            ...facility,
            bank_id: facility.bank_id ? String(facility.bank_id) : '',
            bank_account_id: facility.bank_account_id ? String(facility.bank_account_id) : '',
            currency_id: facility.currency_id ? String(facility.currency_id) : '',
            customer_id: facility.customer_id || getCustomerIdFromToken(),
            entity_ids: facility.entities ? facility.entities.map(e => e.id) : [],

            // Map Booleans
            multi_currency_allowed: Boolean(facility.multi_currency_allowed),
            fx_breach_auto_suspend: Boolean(facility.fx_breach_auto_suspend),
            margin_reduces_exposure: Boolean(facility.margin_reduces_exposure),
            allow_cross_border: Boolean(facility.allow_cross_border),
            allow_third_party_issuance: Boolean(facility.allow_third_party_issuance),
            review_required_flag: Boolean(facility.review_required_flag),

            // Ensure Governance fields are loaded correctly
            sla_agreement_days: facility.sla_agreement_days ?? '',
            required_cash_margin_days: facility.required_cash_margin_days ?? '',

            // Formatting Dates
            tenor_months: facility.tenor_months || 12, // Match the new name
            start_date: facility.start_date?.split('T')[0] || '',
            expiry_date: facility.expiry_date?.split('T')[0] || '',
            review_date: facility.review_date?.split('T')[0] || '',

            sub_limits: (facility.sub_limits || []).map(sl => ({
              ...sl,
              lg_type_ids: sl.lg_types ? sl.lg_types.map(t => t.id) : (sl.lg_type_ids || []),
              allows_confirmation: Boolean(sl.allows_confirmation),
              max_tenor_days: sl.max_tenor_days ?? '',
              // Pricing
              default_commission_rate: sl.default_commission_rate || '0',
              default_min_commission: sl.default_min_commission || '0',
              default_flat_fee: sl.default_flat_fee || '0',
              default_cash_margin_pct: sl.default_cash_margin_pct || '0',
              // Geography logic - match backend "list" key
              country_rule_type: sl.allowed_countries?.type || 'ALLOW',
              allowed_countries_input: sl.allowed_countries?.list || [],
              dedicated_project_ids: sl.dedicated_project_ids || [],
              initial_utilization: sl.initial_utilization || '0'
            }))
          });
        }
      } catch (err) { console.error("Metadata load failed", err); }
    }
    loadMetadata();
  }, [facility, isEdit]);

  const addSubLimit = () => {
    const newSub = {
      lg_type_ids: [],
      limit_name: '',
      limit_amount: '',
      max_amount_per_lg: '',
      max_tenor_days: '',
      country_rule_type: 'ALLOW',
      allowed_countries_input: [],
      allows_confirmation: false,
      default_commission_rate: '0',
      default_flat_fee: '0',
      default_cash_margin_pct: '0',
      default_min_commission: '0',
      dedicated_project_ids: [],
      initial_utilization: '0'
    };
    setFormData(prev => ({ ...prev, sub_limits: [...prev.sub_limits, newSub] }));
    setExpandedSubLimit(formData.sub_limits.length);
  };

  const updateSubLimit = (index, field, value) => {
    const newList = [...formData.sub_limits];
    newList[index][field] = value;
    setFormData({ ...formData, sub_limits: newList });
  };

  // Helper to handle multiple selections from the dropdown
  const handleMultiSelectChange = (index, options) => {
    const selectedValues = Array.from(options).filter(opt => opt.selected).map(opt => opt.value);
    updateSubLimit(index, 'lg_type_ids', selectedValues);
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (formData.sub_limits.length === 0) {
      alert('At least one sub-limit is required.');
      return;
    }
    if (loading) return;
    setLoading(true);

    try {
      setIsUploading(true); // Ensure this state setter exists in your component
      let attachmentUrl = formData.attachment_url;

      if (selectedFile) {
        const fileData = new FormData();
        fileData.append('file', selectedFile);
        const uploadRes = await apiRequest('/facilities/upload-attachment', 'POST', fileData, true);
        attachmentUrl = uploadRes.gcs_uri;
      }

      const payload = {
        ...formData,
        attachment_url: attachmentUrl,
        bank_id: parseInt(formData.bank_id) || 0,
        bank_account_id: formData.bank_account_id ? parseInt(formData.bank_account_id) : null,
        currency_id: parseInt(formData.currency_id) || 0,
        entities: formData.entity_ids || [],
        total_limit_amount: parseFloat(formData.total_limit_amount) || 0,

        start_date: formData.start_date || null,
        expiry_date: formData.expiry_date || null,
        review_date: formData.review_date || null,

        sla_agreement_days: formData.sla_agreement_days !== '' ? parseInt(formData.sla_agreement_days) : null,
        required_cash_margin_days: formData.required_cash_margin_days !== '' ? parseInt(formData.required_cash_margin_days) : 0,
        facility_default_margin_pct: formData.facility_default_margin_pct !== '' ? parseFloat(formData.facility_default_margin_pct) : null,

        sub_limits: formData.sub_limits.map(sl => ({
          ...sl,
          lg_type_ids: sl.lg_type_ids.map(id => parseInt(id)),
          limit_amount: parseFloat(sl.limit_amount) || 0,
          max_tenor_days: sl.max_tenor_days !== '' ? parseInt(sl.max_tenor_days) : null,
          max_amount_per_lg: sl.max_amount_per_lg !== '' ? parseFloat(sl.max_amount_per_lg) : null,
          allows_confirmation: Boolean(sl.allows_confirmation),

          default_commission_rate: parseFloat(sl.default_commission_rate) || 0,
          default_cash_margin_pct: parseFloat(sl.default_cash_margin_pct) || 0,
          default_min_commission: parseFloat(sl.default_min_commission) || 0,
          default_flat_fee: parseFloat(sl.default_flat_fee) || 0,

          allowed_countries: {
            type: sl.country_rule_type,
            list: Array.isArray(sl.allowed_countries_input)
              ? sl.allowed_countries_input.map(s => s.toUpperCase())
              : (typeof sl.allowed_countries_input === 'string'
                ? sl.allowed_countries_input.split(',').map(s => s.trim().toUpperCase()).filter(Boolean)
                : [])
          },
          dedicated_project_ids: (sl.dedicated_project_ids || []).map(Number).filter(Boolean),
          initial_utilization: parseFloat(sl.initial_utilization) || 0
        }))
      };

      const url = isEdit ? `/facilities/${facility.id}/` : '/facilities/';
      await apiRequest(url, isEdit ? 'PUT' : 'POST', payload);
      onSuccess();
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
      setIsUploading(false);
    }
  };
  const TabButton = ({ id, label, icon: Icon }) => (
    <button
      type="button"
      onClick={() => setActiveTab(id)}
      className={`flex items-center gap-2 px-6 py-3 border-b-2 font-bold text-[12px] transition-all ${activeTab === id ? 'border-blue-600 text-blue-600 bg-blue-50/50' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
    >
      <Icon size={14} /> {label.toUpperCase()}
    </button>
  );

  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full h-full flex flex-col overflow-hidden">

        {/* HEADER */}
        <div className="p-4 bg-slate-900 text-white flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-700 rounded-2xl shadow-lg"><Landmark size={24} /></div>
            <div>
              <h2 className="text-xl font-black tracking-tight">{isEdit ? 'Update Facility' : 'Create Issuance Facility'}</h2>
              <p className="text-slate-400 text-[12px] font-bold uppercase tracking-widest">Model Version: Issuance-v2.1 (Multi-CCY Enabled)</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-full transition-colors"><X size={20} /></button>
        </div>

        {/* TABS NAVIGATION */}
        <div className="flex bg-slate-50 border-b border-slate-200 px-4">
          <TabButton id="basic" label="Basic Info" icon={Building2} />
          <TabButton id="risk" label="Risk & Governance" icon={ShieldCheck} />
          <TabButton id="sublimits" label="Sub-Limits & Pricing" icon={Settings2} />
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6">

          {/* TAB 1: BASIC INFO */}
          {activeTab === 'basic' && (
            <div className="space-y-4 animate-in fade-in duration-300">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                <div className="md:col-span-3 space-y-2 pb-1">

                  <label className="text-[12px] font-black text-slate-500 uppercase flex items-center gap-2">
                    <Building2 size={12} /> Permitted Customer Entities (Multiple Choice)
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {customerEntities.map(entity => (
                      <button
                        key={entity.id}
                        type="button"
                        onClick={() => {
                          const current = formData.entity_ids || [];
                          const next = current.includes(entity.id)
                            ? current.filter(id => id !== entity.id)
                            : [...current, entity.id];
                          setFormData({ ...formData, entity_ids: next });
                        }}
                        className={`px-3 py-1 rounded-lg text-[12px] font-bold transition-all border ${(formData.entity_ids || []).includes(entity.id)
                          ? 'bg-slate-900 text-white border-slate-900 shadow-md'
                          : 'bg-white text-slate-500 border-slate-200 hover:border-slate-400'
                          }`}
                      >
                        {entity.entity_name}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="md:col-span-3 space-y-2">
                  <label className="text-[12px] font-black text-slate-500 uppercase flex items-center gap-2">
                    <Paperclip size={12} /> Facility Attachment
                  </label>
                  <div className="flex items-center gap-4 p-2 border-2 border-slate-200 rounded-2xl bg-slate-50/50">
                    <input
                      type="file"
                      id="file-upload"
                      className="hidden"
                      onChange={(e) => setSelectedFile(e.target.files[0])}
                      accept=".pdf,.png,.jpg,.jpeg"
                    />
                    <label
                      htmlFor="file-upload"
                      className="px-4 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold cursor-pointer hover:bg-slate-100 transition-all shadow-sm"
                    >
                      {selectedFile ? 'Change File' : 'Choose File'}
                    </label>
                    <span className="text-xs text-slate-600 truncate">
                      {selectedFile ? selectedFile.name : (formData.attachment_url ? "Existing attachment saved" : "No file selected")}
                    </span>
                  </div>
                </div>

                {/* This wrapper ensures the whole component spans the full width of your form */}
                <div className="md:col-span-full w-full">

                  {/* This internal grid divides that full width into 3 equal columns */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full items-end">

                    {/* 1. Facility Name */}
                    <div className="flex flex-col space-y-1">
                      <label className="text-[12px] px-3 font-black text-slate-500 uppercase">Facility Name *</label>
                      <input
                        required
                        className="text-[14px] w-full px-3 py-1 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-bold text-slate-700"
                        value={formData.facility_name}
                        onChange={e => setFormData({ ...formData, facility_name: e.target.value })}
                        placeholder="e.g. Master Facility"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[12px] px-3 font-black text-slate-500 uppercase">Total Facility Amount *</label>
                      <input type="number" required className="text-[14px] w-full px-3 py-1 border border-slate-200 rounded-xl font-black text-blue-700"
                        value={formData.total_limit_amount} onChange={e => setFormData({ ...formData, total_limit_amount: e.target.value })} />
                    </div>

                    {/* 2. Facility Tenor with "Months" inside */}
                    <div className="flex flex-col space-y-1 text-slate-700">
                      <label className="text-[12px] px-3 font-black text-slate-500 uppercase">Facility Tenor *</label>
                      <div className="relative">
                        <input
                          className="text-[14px] w-full pl-3 pr-16 py-1 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-bold"
                          type="number"
                          placeholder="0"
                          value={formData.tenor_months}
                          onChange={(e) => setFormData({ ...formData, tenor_months: parseInt(e.target.value) || '' })}
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-400 uppercase pointer-events-none">
                          Months
                        </span>
                      </div>
                    </div>


                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="space-y-1">
                  <label className="text-[12px] px-3 font-black text-slate-500 uppercase">Bank Partner *</label>
                  <select required className="text-[14px] w-full px-2 py-1 border border-slate-200 rounded-xl outline-none bg-slate-50 font-medium"
                    value={formData.bank_id} onChange={e => setFormData({ ...formData, bank_id: e.target.value, bank_account_id: '' })}>
                    <option value="">Select Bank...</option>
                    {banks.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[12px] px-3 font-black text-slate-500 uppercase">Bank Account</label>
                  <select className="text-[14px] w-full px-2 py-1 border border-slate-200 rounded-xl outline-none bg-slate-50 font-medium"
                    value={formData.bank_account_id} onChange={e => setFormData({ ...formData, bank_account_id: e.target.value })}
                    disabled={!formData.bank_id}
                  >
                    <option value="">Auto (Default)</option>
                    {bankAccounts.map(a => <option key={a.id} value={a.id}>{a.account_name} — {a.account_number}{a.is_default ? ' ★' : ''}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[12px] px-3 font-black text-slate-500 uppercase">Base Currency *</label>
                  <select className="text-[14px] w-full px-2 py-1 border border-slate-200 rounded-xl outline-none bg-slate-50 font-medium"
                    value={formData.currency_id} onChange={e => setFormData({ ...formData, currency_id: e.target.value })} required>
                    <option value="">Select CCY...</option>
                    {currencies.map(c => <option key={c.id} value={c.id}>{c.iso_code} - {c.name}</option>)}
                  </select>
                </div>
                {/* 4. Status */}
                <div className="flex flex-col space-y-1">
                  <label className="text-[12px] px-3 font-black text-slate-500 uppercase">Status</label>
                  <select
                    className="text-[14px] w-full px-2 py-1 border border-slate-200 rounded-xl outline-none bg-slate-50 font-bold text-slate-700 cursor-pointer"
                    value={formData.status}
                    onChange={e => setFormData({ ...formData, status: e.target.value })}
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="SUSPENDED">SUSPENDED</option>
                  </select>
                </div>


              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 pt-4 border-t">
                <div className="space-y-1"><label className="text-[12px] px-3 font-black text-slate-500 uppercase">Reference #</label>
                  <input className="text-[14px] w-full px-3 py-1  border rounded-xl text-sm" value={formData.reference_number} onChange={e => setFormData({ ...formData, reference_number: e.target.value })} /></div>
                <div className="space-y-1"><label className="text-[12px] px-3 font-black text-slate-500 uppercase">Start Date</label>
                  <input type="date" className="text-[14px] w-full px-3 py-1 border rounded-xl text-sm" value={formData.start_date} onChange={e => setFormData({ ...formData, start_date: e.target.value })} /></div>
                <div className="space-y-1"><label className="text-[12px] px-3 font-black text-slate-500 uppercase">Expiry Date</label>
                  <input type="date" className="text-[14px] w-full px-3 py-1  border rounded-xl text-sm" value={formData.expiry_date} onChange={e => setFormData({ ...formData, expiry_date: e.target.value })} /></div>
                <div className="space-y-1"><label className="text-[12px] px-3 font-black text-slate-500 uppercase">Next Review</label>
                  <input type="date" className="text-[14px] w-full px-3 py-1  border rounded-xl text-sm" value={formData.review_date} onChange={e => setFormData({ ...formData, review_date: e.target.value })} /></div>
              </div>

              {/* FOREIGN BANK BLOCK */}
              {banks.find(b => String(b.id) === String(formData.bank_id))?.name === 'Foreign Bank' && (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl grid grid-cols-2 gap-4">
                  <div className="col-span-2 text-[12px] font-black text-amber-800 uppercase flex items-center gap-2"><Globe size={14} /> Foreign Correspondent Details</div>
                  <input placeholder="Bank Name" className="px-4 py-2 border rounded-xl bg-white" value={formData.foreign_bank_name} onChange={e => setFormData({ ...formData, foreign_bank_name: e.target.value })} />
                  <input placeholder="SWIFT" className="px-4 py-2 border rounded-xl bg-white" value={formData.foreign_bank_swift_code} onChange={e => setFormData({ ...formData, foreign_bank_swift_code: e.target.value })} />
                  <input placeholder="Country" className="px-4 py-2 border rounded-xl bg-white" value={formData.foreign_bank_country} onChange={e => setFormData({ ...formData, foreign_bank_country: e.target.value })} />
                  <input placeholder="Full Address" className="px-4 py-2 border rounded-xl bg-white" value={formData.foreign_bank_address} onChange={e => setFormData({ ...formData, foreign_bank_address: e.target.value })} />
                </div>
              )}
            </div>
          )}

          {/* TAB 2: RISK & GOVERNANCE */}
          {activeTab === 'risk' && (
            <div className="space-y-8 animate-in slide-in-from-right-4 duration-300">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

                {/* Exposure & Multi-Currency */}
                <div className="space-y-4">
                  <h4 className="text-[12px] font-black text-blue-600 flex items-center gap-2 border-b pb-2 uppercase tracking-tighter">
                    <ShieldCheck size={16} /> Risk & Multi-Currency Settings
                  </h4>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center p-3 hover:bg-slate-50 rounded-xl transition-all border border-transparent hover:border-blue-100">
                      <div className="flex flex-col">
                        <span className="text-[12px] font-bold text-slate-700 flex items-center gap-2"><Coins size={12} className="text-blue-500" /> Multi-Currency Allowed</span>
                        <span className="text-[12px] text-slate-400 italic">Enable issuance in currencies other than base currency</span>
                      </div>
                      <input type="checkbox" className="w-5 h-5 accent-blue-600" checked={formData.multi_currency_allowed} onChange={e => setFormData({ ...formData, multi_currency_allowed: e.target.checked })} />
                    </div>

                    <div className="flex justify-between items-center p-3 hover:bg-slate-50 rounded-xl transition-all border border-transparent hover:border-blue-100">
                      <div className="flex flex-col">
                        <span className="text-[12px] font-bold text-slate-700">FX Breach Auto-Suspend</span>
                        <span className="text-[12px] text-slate-400">Lock facility if currency revaluation hits total limit</span>
                      </div>
                      <input type="checkbox" className="w-5 h-5 accent-blue-600" checked={formData.fx_breach_auto_suspend} onChange={e => setFormData({ ...formData, fx_breach_auto_suspend: e.target.checked })} />
                    </div>

                    <div className="flex justify-between items-center p-3 hover:bg-slate-50 rounded-xl transition-all border border-transparent hover:border-blue-100">
                      <div className="flex flex-col"><span className="text-[12px] font-bold text-slate-700">Margin Reduces Exposure</span><span className="text-[12px] text-slate-400">Deduct cash margin from utilized limit</span></div>
                      <input type="checkbox" className="w-5 h-5 accent-blue-600" checked={formData.margin_reduces_exposure} onChange={e => setFormData({ ...formData, margin_reduces_exposure: e.target.checked })} />
                    </div>
                  </div>
                </div>

                {/* Operational SLA */}
                <div className="space-y-1">
                  <h4 className="text-[12px] font-black text-emerald-600 flex items-center gap-2 border-b pb-2 uppercase tracking-tighter">
                    <Clock size={16} /> Governance & SLA
                  </h4>
                  <div className="grid grid-cols-2 gap-4 p-3">
                    <div className="space-y-1">
                      <label className="text-[12px] font-bold text-slate-500 uppercase">SLA Agreement (Days)</label>
                      <input type="number" className="w-full px-4 py-2 border rounded-xl font-bold" value={formData.sla_agreement_days} onChange={e => setFormData({ ...formData, sla_agreement_days: e.target.value })} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[12px] font-bold text-slate-500 uppercase">Margin Lead Time (Days)</label>
                      <input type="number" className="w-full px-4 py-2 border rounded-xl font-bold" value={formData.required_cash_margin_days} onChange={e => setFormData({ ...formData, required_cash_margin_days: e.target.value })} />
                    </div>
                  </div>
                  <div className="flex justify-between items-center p-3 border-t">
                    <div className="flex flex-col">
                      <span className="text-[12px] font-bold text-slate-700 uppercase">Allow Cross-Border</span>
                      <span className="text-[12px] text-slate-400 italic">Master switch for multi-country beneficiary issuance</span>
                    </div>
                    <input type="checkbox" className="w-5 h-5 accent-emerald-600" checked={formData.allow_cross_border} onChange={e => setFormData({ ...formData, allow_cross_border: e.target.checked })} />
                  </div>
                  <div className="flex justify-between items-center p-3 border-t">
                    <div className="flex flex-col">
                      <span className="text-[12px] font-bold text-slate-700 uppercase">Allow Third Party Issuance</span>
                      <span className="text-[12px] text-slate-400 italic">Allow issuance on behalf of third parties</span>
                    </div>
                    <input type="checkbox" className="w-5 h-5 accent-emerald-600" checked={formData.allow_third_party_issuance} onChange={e => setFormData({ ...formData, allow_third_party_issuance: e.target.checked })} />
                  </div>
                </div>

                <div className="md:col-span-2 space-y-1 pt-3 border-t">
                  <label className="text-[12px] font-black text-slate-500 uppercase flex items-center gap-2"><FileText size={14} /> Internal Notes & Special Conditions</label>
                  <textarea className="w-full p-4 border rounded-2xl h-24 text-sm bg-slate-50" placeholder="Paste credit committee approval notes..." value={formData.internal_notes} onChange={e => setFormData({ ...formData, internal_notes: e.target.value })} />
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: SUB-LIMITS */}
          {activeTab === 'sublimits' && (
            <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
              <div className="flex justify-between items-center bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <div className="flex items-center gap-3">
                  <Settings2 className="text-blue-600" />
                  <div className="text-[12px] font-black text-slate-700 uppercase tracking-tight">Allocation of Sub-Limits</div>
                </div>
                <button type="button" onClick={addSubLimit} className="px-4 py-2 bg-slate-900 text-white text-[12px] font-bold rounded-xl hover:bg-slate-800 shadow-lg">+ NEW ALLOCATION</button>
              </div>

              <div className="space-y-4">
                {formData.sub_limits.map((sl, index) => (
                  <div key={index} className="border border-slate-200 rounded-2xl shadow-sm hover:shadow-md transition-all overflow-visible">
                    <div className={`p-4 flex items-center justify-between ${expandedSubLimit === index ? 'bg-blue-50/50' : 'bg-white'}`}>
                      <div className="flex items-center gap-3 flex-1">
                        {/* LG TYPES TOGGLE GRID */}
                        <div className="space-y-4 w-full">

                          {/* ROW 1: LG TYPES */}
                          <div className="flex flex-row items-start gap-4">
                            {/* Consistent Title Width (w-32) ensures all titles align vertically */}
                            <div className="w-32 pt-2">
                              <label className="text-[12px] font-black text-slate-500 uppercase tracking-tight">LG Types</label>
                            </div>
                            <div className="flex-1 flex flex-wrap gap-2">
                              {lgTypes.map(t => {
                                const isSelected = sl.lg_type_ids.includes(t.id);
                                return (
                                  <button
                                    key={t.id}
                                    type="button"
                                    onClick={() => {
                                      const newVal = isSelected
                                        ? sl.lg_type_ids.filter(id => id !== t.id)
                                        : [...sl.lg_type_ids, t.id];
                                      updateSubLimit(index, 'lg_type_ids', newVal);
                                    }}
                                    className={`px-3 py-1.5 rounded-xl text-[12px] font-bold transition-all border ${isSelected
                                      ? 'bg-blue-600 border-blue-600 text-white shadow-sm ring-2 ring-blue-100'
                                      : 'bg-white border-slate-200 text-slate-600 hover:border-blue-300'
                                      }`}
                                  >
                                    {t.name}
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          {/* ROW 2: AMOUNT & LABEL */}
                          <div className="flex flex-row items-center gap-6">

                            {/* Amount Section */}
                            <div className="flex flex-row items-center gap-4">
                              <label className="w-32 text-[12px] font-black text-slate-500 uppercase tracking-tight">Limit Amount</label>
                              <div className="bg-white border border-slate-200 px-4 py-1 rounded-xl shadow-sm focus-within:ring-2 focus-within:ring-blue-500 h-[34px]">
                                <input
                                  type="number"
                                  className="w-48 outline-none font-black text-[12px] text-blue-700 bg-transparent"
                                  placeholder="0.00"
                                  value={sl.limit_amount}
                                  onChange={e => updateSubLimit(index, 'limit_amount', e.target.value)}
                                />
                              </div>
                            </div>

                            {/* Label Section */}
                            <div className="flex flex-row items-center gap-4 flex-1">
                              <label className="text-[12px] font-black text-slate-500 uppercase tracking-tight whitespace-nowrap">Allocation Label</label>
                              <input
                                placeholder="Enter label..."
                                className="flex-1 px-4 py-2 border border-slate-200 rounded-xl text-[12px] font-bold shadow-sm focus:ring-2 focus:ring-blue-500 outline-none h-[34px]"
                                value={sl.limit_name}
                                onChange={e => updateSubLimit(index, 'limit_name', e.target.value)}
                              />
                            </div>

                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 ml-4">
                        <button type="button" onClick={() => setExpandedSubLimit(expandedSubLimit === index ? null : index)} className="p-2 hover:bg-slate-200 rounded-lg transition-colors">
                          {expandedSubLimit === index ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                        </button>
                        <button type="button" onClick={() => { const nl = [...formData.sub_limits]; nl.splice(index, 1); setFormData({ ...formData, sub_limits: nl }); }} className="p-2 text-slate-300 hover:text-red-500 transition-colors"><Trash2 size={18} /></button>
                      </div>
                    </div>

                    {expandedSubLimit === index && (
                      <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-8 bg-white border-t border-slate-100 overflow-visible">
                        {/* Pricing & Commission */}
                        <div className="space-y-4">
                          <div className="text-[12px] font-black text-blue-600 flex items-center gap-1 uppercase border-b pb-1">
                            <Percent size={12} /> Commission Structure
                          </div>
                          <div className="grid grid-cols-2 gap-y-3 gap-x-2 pt-2">
                            <label className="text-[12px] font-bold text-slate-500 self-center">Comm. Rate (%)</label>
                            <input type="number" step="0.001"
                              className="px-2 py-1.5 border rounded-lg text-[12px] font-bold text-right text-blue-700"
                              value={sl.default_commission_rate}
                              onChange={e => updateSubLimit(index, 'default_commission_rate', e.target.value)}
                            />

                            <label className="text-[12px] font-bold text-slate-500 self-center">Min. Fees (Floor)</label>
                            <input type="number"
                              className="px-2 py-1.5 border rounded-lg text-[12px] font-bold text-right"
                              value={sl.default_min_commission}
                              onChange={e => updateSubLimit(index, 'default_min_commission', e.target.value)}
                            />

                            <label className="text-[12px] font-bold text-slate-500 self-center">Flat Processing Fee</label>
                            <input type="number"
                              className="px-2 py-1.5 border rounded-lg text-[12px] font-bold text-right"
                              value={sl.default_flat_fee}
                              onChange={e => updateSubLimit(index, 'default_flat_fee', e.target.value)}
                            />

                            <label className="text-[12px] font-bold text-amber-600 self-center">Initial Bal. Used</label>
                            <input type="number"
                              className="px-2 py-1.5 border rounded-lg text-[12px] font-bold text-right text-amber-700 bg-amber-50/30"
                              placeholder="0"
                              value={sl.initial_utilization}
                              onChange={e => updateSubLimit(index, 'initial_utilization', e.target.value)}
                            />

                          </div>
                        </div>

                        {/* Validation Rules */}
                        <div className="space-y-4">
                          <div className="text-[12px] font-black text-emerald-600 flex items-center gap-1 uppercase border-b pb-1">
                            <AlertCircle size={12} /> Rules
                          </div>

                          <div className="grid grid-cols-2 gap-y-3 gap-x-2 pt-2">
                            {/* Cash Margin */}
                            <label className="text-[12px] font-bold text-emerald-600 italic flex items-center h-8">
                              Cash Margin (%)
                            </label>
                            <input
                              type="number"
                              step="0.1"
                              className="px-2 py-1.5 border border-slate-200 rounded-lg text-[12px] font-bold text-right text-emerald-700 bg-emerald-50/30 h-8 outline-none focus:ring-1 focus:ring-emerald-500"
                              value={sl.default_cash_margin_pct}
                              onChange={e => updateSubLimit(index, 'default_cash_margin_pct', e.target.value)}
                            />

                            {/* Max Tenor */}
                            <label className="text-[12px] font-bold text-slate-500 flex items-center h-8">
                              Max Tenor (Days)
                            </label>
                            <input
                              type="number"
                              className="px-2 py-1.5 border border-slate-200 rounded-lg text-[12px] font-bold text-right h-8 outline-none focus:ring-1 focus:ring-blue-500"
                              value={sl.max_tenor_days}
                              onChange={e => updateSubLimit(index, 'max_tenor_days', e.target.value)}
                            />

                            {/* Max Amount Per LG */}
                            <label className="text-[12px] font-bold text-blue-600 flex items-center h-8">
                              Max Per LG
                            </label>
                            <input
                              type="number"
                              className="px-2 py-1.5 border border-slate-200 rounded-lg text-[12px] font-bold text-right text-blue-700 bg-blue-50/30 h-8 outline-none focus:ring-1 focus:ring-blue-500"
                              placeholder="No limit"
                              value={sl.max_amount_per_lg}
                              onChange={e => updateSubLimit(index, 'max_amount_per_lg', e.target.value)}
                            />

                            {/* Allows Confirmation - Vertically Centered Fix */}
                            <label className="text-[12px] font-bold text-slate-500 flex items-center h-8">
                              Allows Confirm.
                            </label>
                            <div className="flex items-center justify-end h-8">
                              <input
                                type="checkbox"
                                className="w-4 h-4 accent-emerald-600 cursor-pointer shadow-sm"
                                checked={sl.allows_confirmation}
                                onChange={e => updateSubLimit(index, 'allows_confirmation', e.target.checked)}
                              />
                            </div>
                          </div>
                        </div>

                        {/* Geography */}
                        <div className="space-y-4">
                          <div className="text-[12px] font-black text-purple-600 flex items-center gap-1 uppercase border-b pb-1"><MapPin size={12} /> Geography</div>
                          <div className="space-y-2 pt-2">
                            <select className={`w-full px-2 py-1.5 border rounded-lg text-[12px] font-bold ${sl.country_rule_type === 'ALLOW' ? 'text-emerald-700' : 'text-red-700'}`}
                              value={sl.country_rule_type} onChange={e => updateSubLimit(index, 'country_rule_type', e.target.value)}>
                              <option value="ALLOW">ALLOW ONLY (+)</option>
                              <option value="EXCLUDE">EXCLUDE THESE (-)</option>
                            </select>
                            {/* Country Multi-Select Dropdown */}
                            <CountryMultiSelect
                              selected={sl.allowed_countries_input || []}
                              onChange={(newList) => updateSubLimit(index, 'allowed_countries_input', newList)}
                              ruleType={sl.country_rule_type}
                            />
                            {!formData.allow_cross_border && <div className="text-[8px] text-amber-600 italic font-bold">Facility cross-border switch is OFF.</div>}
                          </div>
                          {/* Dedication — Project Multi-Select */}
                          <div className="mt-4">
                            <div className="text-[12px] font-black text-orange-600 flex items-center gap-1 uppercase border-b pb-1"><Paperclip size={12} /> Dedication</div>
                            <p className="text-[9px] text-slate-400 mt-1">Earmark this sub-limit for specific projects/contracts. Leave empty for open allocation.</p>
                            {projects.length === 0 ? (
                              <p className="text-[10px] text-slate-400 italic mt-2">No projects created yet. Add projects from the Facilities page.</p>
                            ) : (
                              <div className="space-y-1 mt-2 max-h-32 overflow-y-auto">
                                {projects.filter(p => p.status === 'ACTIVE').map(p => (
                                  <label key={p.id} className="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-orange-50 cursor-pointer">
                                    <input
                                      type="checkbox"
                                      className="w-3.5 h-3.5 accent-orange-600"
                                      checked={(sl.dedicated_project_ids || []).includes(p.id)}
                                      onChange={e => {
                                        const ids = sl.dedicated_project_ids || [];
                                        if (e.target.checked) {
                                          updateSubLimit(index, 'dedicated_project_ids', [...ids, p.id]);
                                        } else {
                                          updateSubLimit(index, 'dedicated_project_ids', ids.filter(id => id !== p.id));
                                        }
                                      }}
                                    />
                                    <span className="text-[11px] font-bold text-slate-700">{p.name}</span>
                                    <span className="text-[9px] text-slate-400">({p.project_type}{p.reference_number ? ` · ${p.reference_number}` : ''})</span>
                                  </label>
                                ))}
                              </div>
                            )}
                            <div className="flex flex-wrap gap-1 mt-1">
                              {(sl.dedicated_project_ids || []).map(pid => {
                                const proj = projects.find(p => p.id === pid);
                                return proj ? (
                                  <span key={pid} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold bg-orange-100 text-orange-700">
                                    {proj.name}
                                    <button type="button" onClick={() => updateSubLimit(index, 'dedicated_project_ids', (sl.dedicated_project_ids || []).filter(id => id !== pid))} className="hover:opacity-70">×</button>
                                  </span>
                                ) : null;
                              })}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </form>

        {/* FOOTER */}
        <div className="p-6 border-t bg-slate-50 flex justify-between items-center">
          <div className="flex items-center gap-2 text-slate-400 font-bold text-[9px] uppercase tracking-widest"><Info size={12} /> Issuance-v2.1 Full Schema Compliant</div>
          <div className="flex gap-3">
            <button onClick={onClose} className="px-6 py-2.5 text-[12px] font-black text-slate-500 hover:bg-slate-200 rounded-xl transition-all uppercase tracking-tighter">Discard</button>
            <button onClick={handleSubmit} disabled={loading || isUploading} className="px-10 py-2.5 bg-slate-900 text-white text-[12px] font-black rounded-xl shadow-xl hover:shadow-blue-500/20 disabled:opacity-50 flex items-center gap-2 transition-all uppercase tracking-tighter">
              {(loading || isUploading) ? <Loader2 className="animate-spin" size={16} /> : <ShieldCheck size={16} />}
              {isUploading ? 'UPLOADING...' : (isEdit ? 'AUTHORIZE & UPDATE FACILITY' : 'AUTHORIZE & SAVE FACILITY')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}