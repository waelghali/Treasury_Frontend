import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { apiRequest, API_BASE_URL, getAuthToken } from '../../services/apiService';
import {
  Activity, ShieldCheck, Search, RefreshCw, Download, Eye, ExternalLink,
  ChevronDown, ChevronRight, AlertTriangle, CheckCircle2, FileText,
  Send, Layers, Inbox, BarChart2, Settings, User, Building, X,
  ClipboardCheck, Sparkles, CheckSquare, Square, Loader2, AlertCircle
} from 'lucide-react';
import moment from 'moment';
import * as XLSX from 'xlsx';
import { toast } from 'react-toastify';

const MODULE_META = {
  ALL: { label: 'All Modules', icon: Activity, pill: 'bg-slate-100 text-slate-700 border-slate-200' },
  CUSTODY: { label: 'LG Custody', icon: FileText, pill: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  ISSUANCE: { label: 'LG Issuance & Facilities', icon: Send, pill: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  QUOTATIONS: { label: 'RFQ Quotations', icon: BarChart2, pill: 'bg-amber-50 text-amber-700 border-amber-200' },
  RECONCILIATION: { label: 'Bank Reconciliation', icon: Layers, pill: 'bg-cyan-50 text-cyan-700 border-cyan-200' },
  SMART_INBOX: { label: 'Smart Inbox', icon: Inbox, pill: 'bg-purple-50 text-purple-700 border-purple-200' },
  GOVERNANCE: { label: 'Governance & Admin', icon: Settings, pill: 'bg-slate-100 text-slate-700 border-slate-300' },
};

const CATEGORY_LABELS = {
  RENEWAL: 'Renewals / Extensions',
  RELEASE: 'Releases & Closures',
  NEW_LG: 'New LGs & Issuance Requests',
  AMENDMENT: 'Amendments & Amount Changes',
  LIQUIDATION: 'Liquidations',
  RFQ_DEAL: 'RFQ Quotations & Deals',
  RECON: 'Reconciliations & Statements',
  INBOX: 'Smart Inbox & Bank Requests',
  APPROVAL: 'Approvals & Rejections',
  LOGISTICS: 'Bank Reminders & Logistics',
  ADMIN: 'Governance, Facilities & Config',
};

const PILE_CATEGORY_LABELS = {
  RENEWAL: 'Renewals',
  RELEASE: 'Releases / Closures',
  AMENDMENT: 'Amendments & Amounts',
  LIQUIDATION: 'Liquidations',
  NEW_LG: 'New Issuances',
  LOGISTICS: 'Bank Reminders',
};

const COHORT_BUCKET_LABELS = {
  UNACTIONED_AT_RISK: 'Unactioned / At Risk',
  READY_TO_SIGN: 'In Signatory Pile',
  DELIVERED_OR_CONFIRMED: 'Delivered / Confirmed',
  RELEASING_OR_CLOSED: 'Releasing / Closed',
};

const getLifecycleBadgeStyle = (stage) => {
  switch (stage) {
    case 'BANK_CONFIRMED':
    case 'COMPLETED':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    case 'DELIVERED_AWAITING_REPLY':
    case 'APPROVED':
      return 'bg-blue-50 text-blue-700 border-blue-200';
    case 'ISSUED_PENDING_PRINT':
    case 'PRINTED_PENDING_DELIVERY':
    case 'PENDING_APPROVAL':
      return 'bg-amber-50 text-amber-800 border-amber-200';
    case 'REJECTED':
    case 'CANCELED':
      return 'bg-red-50 text-red-700 border-red-200';
    default:
      return 'bg-slate-100 text-slate-700 border-slate-200';
  }
};

const formatMoney = (amount, currency) => {
  if (amount === null || amount === undefined || isNaN(Number(amount))) return '—';
  return `${currency || ''} ${Number(amount).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`.trim();
};

function ActivityAndControlsPage({
  isGracePeriod = false,
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const isCheckerRoute = location.pathname.startsWith('/checker');

  const initialMainTab = searchParams.get('tab') === 'controls' ? 'controls' : 'feed';
  const [mainTab, setMainTab] = useState(initialMainTab);

  // ── TAB 1: Platform Activity Feed State ───────────────────────────────────
  const [feedLoading, setFeedLoading] = useState(true);
  const [feedError, setFeedError] = useState('');
  const [feedData, setFeedData] = useState({ total: 0, stats: {}, facets: {}, items: [] });

  const [moduleFilter, setModuleFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [lifecycleFilter, setLifecycleFilter] = useState('ALL');
  const [actorFilter, setActorFilter] = useState('ALL');
  const [entityFilter, setEntityFilter] = useState('ALL');
  const [bankFilter, setBankFilter] = useState('ALL');
  const [datePreset, setDatePreset] = useState('ALL'); // ALL, TODAY, 7D, 30D, CUSTOM
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedBatchIds, setExpandedBatchIds] = useState({});

  // ── TAB 2: Signatory & Controls Workspace State ───────────────────────────
  const [controlSubTab, setControlSubTab] = useState('signatory'); // signatory | verify-list | cohort | exceptions
  const [controlsLoading, setControlsLoading] = useState(false);
  const [controlsError, setControlsError] = useState('');
  const [controlsData, setControlsData] = useState({
    window: {},
    summary: {},
    pending_bank_letters: [],
    expiry_cohort: [],
    cross_module_exceptions: [],
  });

  // Signatory Pile dynamic filters & physical sign-off checklist
  const [pileCategoryFilter, setPileCategoryFilter] = useState('ALL');
  const [pileMakerFilter, setPileMakerFilter] = useState('ALL');
  const [pileBankFilter, setPileBankFilter] = useState('ALL');
  const [pileFlaggedOnly, setPileFlaggedOnly] = useState(false);
  const [pileSearch, setPileSearch] = useState('');
  const [signedChecklist, setSignedChecklist] = useState({});

  // Expiry Cohort dynamic filters
  const [cohortWindowDays, setCohortWindowDays] = useState(45);
  const [cohortBucketFilter, setCohortBucketFilter] = useState('ALL');
  const [cohortModuleFilter, setCohortModuleFilter] = useState('ALL');
  const [cohortBankFilter, setCohortBankFilter] = useState('ALL');
  const [cohortSearch, setCohortSearch] = useState('');

  // Verify Handed List state
  const [rawListText, setRawListText] = useState('');
  const [verifyingList, setVerifyingList] = useState(false);
  const [verifyResult, setVerifyResult] = useState(null);

  // Exceptions dynamic filters
  const [excModuleFilter, setExcModuleFilter] = useState('ALL');
  const [excTypeFilter, setExcTypeFilter] = useState('ALL');

  const switchMainTab = (nextTab) => {
    setMainTab(nextTab);
    setSearchParams(nextTab === 'controls' ? { tab: 'controls' } : {});
  };

  // Apply Date Preset helper
  const applyDatePreset = (preset) => {
    setDatePreset(preset);
    const today = moment().format('YYYY-MM-DD');
    if (preset === 'ALL') {
      setStartDate('');
      setEndDate('');
    } else if (preset === 'TODAY') {
      setStartDate(today);
      setEndDate(today);
    } else if (preset === '7D') {
      setStartDate(moment().subtract(7, 'days').format('YYYY-MM-DD'));
      setEndDate(today);
    } else if (preset === '30D') {
      setStartDate(moment().subtract(30, 'days').format('YYYY-MM-DD'));
      setEndDate(today);
    }
  };

  // Fetch Tab 1: Platform Activity Feed (returns cross-filtered dynamic facets)
  const fetchFeed = useCallback(async () => {
    setFeedLoading(true);
    setFeedError('');
    try {
      const params = new URLSearchParams();
      params.append('module', moduleFilter);
      params.append('category', categoryFilter);
      params.append('lifecycle', lifecycleFilter);
      if (actorFilter !== 'ALL') params.append('actor_key', actorFilter);
      if (entityFilter !== 'ALL') params.append('entity_id', entityFilter);
      if (bankFilter !== 'ALL') params.append('bank', bankFilter);
      if (startDate) params.append('start_date', startDate);
      if (endDate) params.append('end_date', endDate);
      if (searchTerm.trim()) params.append('search', searchTerm.trim());
      params.append('limit', '300');

      const data = await apiRequest(`/corporate-admin/activity/feed?${params.toString()}`, 'GET');
      setFeedData(data || { total: 0, stats: {}, facets: {}, items: [] });
    } catch (err) {
      console.error('Failed to load platform activity feed:', err);
      setFeedError(err.message || 'Failed to load platform activity.');
    } finally {
      setFeedLoading(false);
    }
  }, [moduleFilter, categoryFilter, lifecycleFilter, actorFilter, entityFilter, bankFilter, startDate, endDate, searchTerm]);

  useEffect(() => {
    if (mainTab === 'feed') {
      fetchFeed();
    }
  }, [mainTab, fetchFeed]);

  // Fetch Tab 2: Control & Verification Workspace
  const fetchControls = useCallback(async () => {
    setControlsLoading(true);
    setControlsError('');
    try {
      const data = await apiRequest(
        `/corporate-admin/activity/controls?window_days=${cohortWindowDays}`,
        'GET'
      );
      setControlsData(
        data || {
          window: {},
          summary: {},
          pending_bank_letters: [],
          expiry_cohort: [],
          cross_module_exceptions: [],
        }
      );
    } catch (err) {
      console.error('Failed to load control verification workspace:', err);
      setControlsError(err.message || 'Failed to load control workspace.');
    } finally {
      setControlsLoading(false);
    }
  }, [cohortWindowDays]);

  useEffect(() => {
    if (mainTab === 'controls') {
      fetchControls();
    }
  }, [mainTab, fetchControls]);

  // Read-only Signatory Preview for Custody or Issuance Maintenance letters
  const handlePreviewLetter = async ({ instructionId, maintenanceActionId }) => {
    if (instructionId) {
      const token = getAuthToken();
      let url = `${API_BASE_URL}/corporate-admin/activity/instructions/${instructionId}/preview-letter`;
      if (token) url += `?token=${token}`;
      window.open(url, '_blank');
      return;
    }
    if (maintenanceActionId) {
      try {
        const blob = await apiRequest(
          `/issuance/maintenance/${maintenanceActionId}/document/letter`,
          'GET',
          null,
          'application/json',
          'blob'
        );
        const blobUrl = window.URL.createObjectURL(blob);
        window.open(blobUrl, '_blank');
      } catch (err) {
        toast.error(`Could not preview maintenance letter: ${err.message || 'Not available'}`);
      }
    }
  };

  const handleSmartNavigate = (targetPath) => {
    if (!targetPath) return;
    if (isCheckerRoute) {
      if (targetPath.includes('/issuance/issued-lgs')) {
        navigate('/checker/issuance/issued-lgs');
      } else {
        navigate('/checker/approval-requests');
      }
      return;
    }
    navigate(targetPath);
  };

  // Run Handed-List Verification
  const handleRunListVerify = async (overrideText = null) => {
    const textToVerify = overrideText !== null ? overrideText : rawListText;
    if (!textToVerify || !textToVerify.trim()) {
      toast.info('Paste one or more LG numbers or Instruction Serials first.');
      return;
    }
    setVerifyingList(true);
    try {
      const res = await apiRequest('/corporate-admin/activity/verify-list', 'POST', {
        raw_text: textToVerify,
        window_days: cohortWindowDays,
      });
      setVerifyResult(res);
    } catch (err) {
      toast.error(`Verification failed: ${err.message || 'Unexpected error'}`);
    } finally {
      setVerifyingList(false);
    }
  };

  const handleFillSampleFromQueue = () => {
    const renewPile = (controlsData.pending_bank_letters || []).filter((x) => x.category === 'RENEWAL');
    const sourceList = renewPile.length > 0 ? renewPile : (controlsData.pending_bank_letters || []);
    const cohortSample = (controlsData.expiry_cohort || []).slice(0, 5);

    const sampleRefs = [
      ...sourceList.slice(0, 6).map((x) => x.lg_number),
      ...cohortSample
        .filter((c) => c.bucket === 'UNACTIONED_AT_RISK')
        .slice(0, 2)
        .map((c) => c.lg_number),
      'LG-MISSING-DEMO-999',
    ].filter(Boolean);

    const uniqueRefs = Array.from(new Set(sampleRefs));
    const joined = uniqueRefs.join('\n');
    setRawListText(joined);
    handleRunListVerify(joined);
  };

  // Export Activity Feed to Excel
  const handleExportActivityExcel = () => {
    if (isGracePeriod) {
      toast.warn('Export is disabled during subscription grace period.');
      return;
    }
    const rows = [];
    (feedData.items || []).forEach((item) => {
      if (item.is_batch && item.children?.length) {
        item.children.forEach((child) => {
          rows.push({
            'Date / Time': child.timestamp ? moment(child.timestamp).format('YYYY-MM-DD HH:mm') : '',
            Module: child.module,
            Category: child.category,
            Action: `${item.action_label} → ${child.action_label}`,
            Actor: child.actor_name,
            Approver: child.approver_name || '',
            Entity: child.entity_name || '',
            Bank: child.bank_name || '',
            'LG / Reference': child.reference || '',
            'Serial / Batch': `${child.secondary_ref || ''} (${item.reference})`,
            Beneficiary: child.beneficiary_name || '',
            Currency: child.currency || '',
            Amount: child.amount ?? '',
            Summary: child.summary || '',
            'Control Stage': child.lifecycle_label || '',
            Flags: (child.warning_badges || []).join(', '),
          });
        });
      } else {
        rows.push({
          'Date / Time': item.timestamp ? moment(item.timestamp).format('YYYY-MM-DD HH:mm') : '',
          Module: item.module,
          Category: item.category,
          Action: item.action_label,
          Actor: item.actor_name,
          Approver: item.approver_name || '',
          Entity: item.entity_name || '',
          Bank: item.bank_name || '',
          'LG / Reference': item.reference || '',
          'Serial / Secondary Ref': item.secondary_ref || '',
          Beneficiary: item.beneficiary_name || '',
          Currency: item.currency || '',
          Amount: item.amount ?? '',
          Summary: item.summary || '',
          'Control Stage': item.lifecycle_label || '',
          Flags: (item.warning_badges || []).join(', '),
        });
      }
    });

    if (!rows.length) {
      toast.info('No activity rows to export.');
      return;
    }
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Platform Activity');
    XLSX.writeFile(wb, `platform_activity_${moment().format('YYYY-MM-DD')}.xlsx`);
    toast.success('Platform activity exported to Excel.');
  };

  // Export Verification Report to Excel
  const handleExportVerifyExcel = () => {
    if (!verifyResult) return;
    const wb = XLSX.utils.book_new();

    if (verifyResult.verified_items?.length) {
      XLSX.utils.book_append_sheet(
        wb,
        XLSX.utils.json_to_sheet(
          verifyResult.verified_items.map((v) => ({
            'Submitted Ref': v.input_token,
            Module: v.module,
            'LG Number': v.lg_number,
            'Instruction Serial': v.serial_number || '',
            Bank: v.bank_name || '',
            Entity: v.entity_name || '',
            Currency: v.currency || '',
            Amount: v.amount ?? '',
            Action: v.action_label,
            'Change Summary': v.change_summary,
            'Old Expiry': v.old_expiry_date || '',
            'New Expiry': v.new_expiry_date || '',
            'Executed By': v.actor_name,
            'Control Status': v.lifecycle_label,
            'Risk Flags': (v.control_flags || []).join(', '),
          }))
        ),
        '1_Verified_Actioned'
      );
    }
    if (verifyResult.unactioned_matches?.length) {
      XLSX.utils.book_append_sheet(
        wb,
        XLSX.utils.json_to_sheet(verifyResult.unactioned_matches),
        '2_On_List_Not_Actioned'
      );
    }
    if (verifyResult.omitted_items?.length) {
      XLSX.utils.book_append_sheet(
        wb,
        XLSX.utils.json_to_sheet(
          verifyResult.omitted_items.map((o) => ({
            Module: o.module,
            'LG Number': o.lg_number,
            Bank: o.bank_name || '',
            Entity: o.entity_name || '',
            Currency: o.currency || '',
            Amount: o.amount ?? '',
            'Cohort Expiry Date': o.cohort_expiry_date || '',
            'Days Remaining': o.days_remaining ?? '',
            'Cohort Status': o.bucket_label,
            'Internal Owner': o.internal_owner || '',
            'Auto Renewal': o.auto_renewal ? 'ON' : 'OFF',
          }))
        ),
        '3_Omitted_From_List'
      );
    }
    if (verifyResult.unknown_references?.length) {
      XLSX.utils.book_append_sheet(
        wb,
        XLSX.utils.json_to_sheet(verifyResult.unknown_references.map((r) => ({ 'Unknown Reference': r }))),
        '4_Not_Found'
      );
    }
    XLSX.writeFile(wb, `signatory_verification_${moment().format('YYYY-MM-DD_HHmm')}.xlsx`);
    toast.success('Verification report exported to Excel.');
  };

  // ── TAB 1 DYNAMIC FACET OPTIONS (Strictly > 0 available options + active selection) ──
  const dynamicModules = useMemo(() => {
    const modCounts = feedData.facets?.modules || feedData.stats?.module_counts || {};
    const orderedKeys = ['CUSTODY', 'ISSUANCE', 'QUOTATIONS', 'RECONCILIATION', 'SMART_INBOX', 'GOVERNANCE'];
    const activeNonZero = orderedKeys.filter((k) => (modCounts[k] || 0) > 0 || moduleFilter === k);
    return ['ALL', ...activeNonZero];
  }, [feedData.facets, feedData.stats, moduleFilter]);

  const dynamicCategories = useMemo(() => {
    const list = [...(feedData.facets?.categories || [])];
    if (categoryFilter !== 'ALL' && !list.some((c) => c.value === categoryFilter)) {
      list.unshift({ value: categoryFilter, count: 0 });
    }
    return list;
  }, [feedData.facets, categoryFilter]);

  const dynamicActors = useMemo(() => {
    const list = [...(feedData.facets?.actors || [])];
    if (actorFilter !== 'ALL' && !list.some((a) => a.value === actorFilter)) {
      list.unshift({ value: actorFilter, label: actorFilter.replace(/^(id|name):/, ''), count: 0 });
    }
    return list;
  }, [feedData.facets, actorFilter]);

  const dynamicEntities = useMemo(() => {
    const list = [...(feedData.facets?.entities || [])];
    if (entityFilter !== 'ALL' && !list.some((e) => String(e.id) === String(entityFilter))) {
      list.unshift({ id: entityFilter, name: `Entity #${entityFilter}`, count: 0 });
    }
    return list;
  }, [feedData.facets, entityFilter]);

  const dynamicBanks = useMemo(() => {
    const list = [...(feedData.facets?.banks || [])];
    if (bankFilter !== 'ALL' && !list.some((b) => b.name === bankFilter)) {
      list.unshift({ name: bankFilter, count: 0 });
    }
    return list;
  }, [feedData.facets, bankFilter]);

  // ── TAB 2.1 SIGNATORY PILE DYNAMIC FACETS (Cross-Filtered!) ───────────────
  const pileDynamicState = useMemo(() => {
    const raw = controlsData.pending_bank_letters || [];
    const q = pileSearch.trim().toLowerCase();

    const base = raw.filter((item) => {
      if (!q) return true;
      const hay = `${item.lg_number || ''} ${item.serial_number || ''} ${item.bank_name || ''} ${item.beneficiary_name || ''} ${item.entity_name || ''} ${item.batch_id || ''} ${item.maker_name || ''}`.toLowerCase();
      return hay.includes(q);
    });

    const catCounts = {};
    const makerCounts = new Map();
    const bankCounts = {};
    let flaggedCount = 0;
    const filtered = [];

    base.forEach((item) => {
      const mCat = pileCategoryFilter === 'ALL' || item.category === pileCategoryFilter;
      const mMaker = pileMakerFilter === 'ALL' || String(item.maker_id) === String(pileMakerFilter);
      const mBank = pileBankFilter === 'ALL' || item.bank_name === pileBankFilter;
      const hasFlag = item.control_flags && item.control_flags.length > 0;
      const mFlag = !pileFlaggedOnly || hasFlag;

      if (mMaker && mBank && mFlag) {
        catCounts[item.category] = (catCounts[item.category] || 0) + 1;
      }
      if (mCat && mBank && mFlag && item.maker_id) {
        const prev = makerCounts.get(String(item.maker_id)) || { id: String(item.maker_id), name: item.maker_name, count: 0 };
        prev.count += 1;
        makerCounts.set(String(item.maker_id), prev);
      }
      if (mCat && mMaker && mFlag && item.bank_name) {
        bankCounts[item.bank_name] = (bankCounts[item.bank_name] || 0) + 1;
      }
      if (mCat && mMaker && mBank && hasFlag) {
        flaggedCount += 1;
      }
      if (mCat && mMaker && mBank && mFlag) {
        filtered.push(item);
      }
    });

    const categories = Object.entries(catCounts)
      .filter(([, c]) => c > 0)
      .map(([k, count]) => ({ value: k, label: PILE_CATEGORY_LABELS[k] || k, count }));
    if (pileCategoryFilter !== 'ALL' && !categories.some((c) => c.value === pileCategoryFilter)) {
      categories.unshift({ value: pileCategoryFilter, label: PILE_CATEGORY_LABELS[pileCategoryFilter] || pileCategoryFilter, count: 0 });
    }

    const makers = Array.from(makerCounts.values()).sort((a, b) => b.count - a.count);
    const banks = Object.entries(bankCounts)
      .filter(([, c]) => c > 0)
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => ({ name, count }));

    return { filtered, categories, makers, banks, flaggedCount, totalInSearch: base.length };
  }, [controlsData.pending_bank_letters, pileCategoryFilter, pileMakerFilter, pileBankFilter, pileFlaggedOnly, pileSearch]);

  // ── TAB 2.3 EXPIRY COHORT DYNAMIC FACETS (Cross-Filtered!) ────────────────
  const cohortDynamicState = useMemo(() => {
    const raw = controlsData.expiry_cohort || [];
    const q = cohortSearch.trim().toLowerCase();

    const base = raw.filter((c) => {
      if (!q) return true;
      const hay = `${c.lg_number || ''} ${c.bank_name || ''} ${c.beneficiary_name || ''} ${c.entity_name || ''} ${c.internal_owner || ''} ${c.serial_number || ''}`.toLowerCase();
      return hay.includes(q);
    });

    const bucketCounts = {};
    const moduleCounts = {};
    const bankCounts = {};
    const filtered = [];

    base.forEach((c) => {
      const mBucket = cohortBucketFilter === 'ALL' || c.bucket === cohortBucketFilter;
      const mMod = cohortModuleFilter === 'ALL' || c.module === cohortModuleFilter;
      const mBank = cohortBankFilter === 'ALL' || c.bank_name === cohortBankFilter;

      if (mMod && mBank) {
        bucketCounts[c.bucket] = (bucketCounts[c.bucket] || 0) + 1;
      }
      if (mBucket && mBank) {
        moduleCounts[c.module] = (moduleCounts[c.module] || 0) + 1;
      }
      if (mBucket && mMod && c.bank_name) {
        bankCounts[c.bank_name] = (bankCounts[c.bank_name] || 0) + 1;
      }
      if (mBucket && mMod && mBank) {
        filtered.push(c);
      }
    });

    const orderedBuckets = ['UNACTIONED_AT_RISK', 'READY_TO_SIGN', 'DELIVERED_OR_CONFIRMED', 'RELEASING_OR_CLOSED'];
    const buckets = orderedBuckets
      .filter((b) => (bucketCounts[b] || 0) > 0 || cohortBucketFilter === b)
      .map((b) => ({ value: b, label: COHORT_BUCKET_LABELS[b] || b, count: bucketCounts[b] || 0 }));

    const modules = ['CUSTODY', 'ISSUANCE']
      .filter((m) => (moduleCounts[m] || 0) > 0 || cohortModuleFilter === m)
      .map((m) => ({ value: m, label: MODULE_META[m]?.label || m, count: moduleCounts[m] || 0 }));

    const banks = Object.entries(bankCounts)
      .filter(([, cnt]) => cnt > 0)
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => ({ name, count }));

    return { filtered, buckets, modules, banks, totalBase: base.length };
  }, [controlsData.expiry_cohort, cohortBucketFilter, cohortModuleFilter, cohortBankFilter, cohortSearch]);

  // ── TAB 2.4 PLATFORM EXCEPTIONS DYNAMIC FACETS (Cross-Filtered!) ──────────
  const exceptionsDynamicState = useMemo(() => {
    const raw = controlsData.cross_module_exceptions || [];
    const modCounts = {};
    const typeCounts = {};
    const filtered = [];

    raw.forEach((ex) => {
      const mMod = excModuleFilter === 'ALL' || ex.module === excModuleFilter;
      const mType = excTypeFilter === 'ALL' || ex.exception_type === excTypeFilter;

      if (mType) {
        modCounts[ex.module] = (modCounts[ex.module] || 0) + 1;
      }
      if (mMod) {
        typeCounts[ex.exception_type] = (typeCounts[ex.exception_type] || 0) + 1;
      }
      if (mMod && mType) {
        filtered.push(ex);
      }
    });

    const modules = Object.entries(modCounts)
      .filter(([, c]) => c > 0)
      .sort((a, b) => b[1] - a[1])
      .map(([mod, count]) => ({ value: mod, label: MODULE_META[mod]?.label || mod, count }));

    const types = Object.entries(typeCounts)
      .filter(([, c]) => c > 0)
      .sort((a, b) => b[1] - a[1])
      .map(([type, count]) => ({ value: type, count }));

    return { filtered, modules, types, totalAll: raw.length };
  }, [controlsData.cross_module_exceptions, excModuleFilter, excTypeFilter]);

  const toggleBatchExpand = (id) => {
    setExpandedBatchIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleChecklist = (id) => {
    setSignedChecklist((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const checkedInPileCount = pileDynamicState.filtered.filter((x) => signedChecklist[x.id]).length;

  return (
    <div className="space-y-6">
      {/* ── PAGE HEADER & TOP MODE SWITCHER ── */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-black text-slate-900">Activity &amp; Controls</h1>
            <span className="px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider rounded-full bg-blue-50 text-blue-700 border border-blue-200">
              Platform Oversight
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Clean, noise-free business activity across all modules &amp; pre-bank signatory verification controls
          </p>
        </div>

        {/* Main 2-Tab Switcher */}
        <div className="inline-flex p-1 bg-slate-200/75 rounded-xl border border-slate-200 self-start lg:self-auto">
          <button
            type="button"
            onClick={() => switchMainTab('feed')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
              mainTab === 'feed'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Activity className="w-4 h-4 text-blue-600" />
            <span>Platform Activity</span>
          </button>
          <button
            type="button"
            onClick={() => switchMainTab('controls')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
              mainTab === 'controls'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Signatory &amp; Control Desk</span>
            {(controlsData.summary?.pending_sign_or_delivery_count > 0 ||
              feedData.stats?.pending_sign_or_delivery > 0) && (
              <span className="px-1.5 py-0.5 text-[10px] font-extrabold rounded-full bg-amber-100 text-amber-800 border border-amber-300">
                {controlsData.summary?.pending_sign_or_delivery_count ||
                  feedData.stats?.pending_sign_or_delivery}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════════════════
          TAB 1: PLATFORM ACTIVITY FEED ("WHO DID WHAT ACROSS ALL MODULES")
         ════════════════════════════════════════════════════════════════════════ */}
      {mainTab === 'feed' && (
        <div className="space-y-5">
          {/* Interactive Control KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <button
              type="button"
              onClick={() => setLifecycleFilter('ALL')}
              className={`text-left bg-white p-4 rounded-xl border transition-all shadow-sm ${
                lifecycleFilter === 'ALL'
                  ? 'border-blue-500 ring-2 ring-blue-500/15'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <p className="text-[11px] text-slate-500 font-bold uppercase tracking-wider">
                Business Activities
              </p>
              <p className="text-2xl font-black text-slate-900 mt-1">
                {feedData.stats?.total_activities ?? 0}
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">Logins &amp; email noise stripped</p>
            </button>

            <button
              type="button"
              disabled={(feedData.stats?.pending_sign_or_delivery ?? 0) === 0 && lifecycleFilter !== 'NEEDS_SIGN_OR_DELIVERY'}
              onClick={() =>
                setLifecycleFilter(
                  lifecycleFilter === 'NEEDS_SIGN_OR_DELIVERY' ? 'ALL' : 'NEEDS_SIGN_OR_DELIVERY'
                )
              }
              className={`text-left bg-white p-4 rounded-xl border transition-all shadow-sm ${
                lifecycleFilter === 'NEEDS_SIGN_OR_DELIVERY'
                  ? 'border-amber-500 ring-2 ring-amber-500/15'
                  : (feedData.stats?.pending_sign_or_delivery ?? 0) === 0
                  ? 'border-slate-100 opacity-55 cursor-default'
                  : 'border-amber-200 hover:border-amber-300'
              }`}
            >
              <p className="text-[11px] text-amber-700 font-bold uppercase tracking-wider">
                Awaiting Sign / Delivery
              </p>
              <p className="text-2xl font-black text-amber-700 mt-1">
                {feedData.stats?.pending_sign_or_delivery ?? 0}
              </p>
              <p className="text-[11px] text-amber-600/80 mt-0.5">Letters generated, not at bank yet</p>
            </button>

            <button
              type="button"
              disabled={(feedData.stats?.awaiting_bank_reply ?? 0) === 0 && lifecycleFilter !== 'AWAITING_BANK_REPLY'}
              onClick={() =>
                setLifecycleFilter(
                  lifecycleFilter === 'AWAITING_BANK_REPLY' ? 'ALL' : 'AWAITING_BANK_REPLY'
                )
              }
              className={`text-left bg-white p-4 rounded-xl border transition-all shadow-sm ${
                lifecycleFilter === 'AWAITING_BANK_REPLY'
                  ? 'border-blue-500 ring-2 ring-blue-500/15'
                  : (feedData.stats?.awaiting_bank_reply ?? 0) === 0
                  ? 'border-slate-100 opacity-55 cursor-default'
                  : 'border-blue-200 hover:border-blue-300'
              }`}
            >
              <p className="text-[11px] text-blue-700 font-bold uppercase tracking-wider">
                In Bank Loop
              </p>
              <p className="text-2xl font-black text-blue-700 mt-1">
                {feedData.stats?.awaiting_bank_reply ?? 0}
              </p>
              <p className="text-[11px] text-blue-600/80 mt-0.5">Delivered · awaiting confirmation</p>
            </button>

            <button
              type="button"
              disabled={(feedData.stats?.flagged_items ?? 0) === 0 && lifecycleFilter !== 'FLAGGED'}
              onClick={() => setLifecycleFilter(lifecycleFilter === 'FLAGGED' ? 'ALL' : 'FLAGGED')}
              className={`text-left bg-white p-4 rounded-xl border transition-all shadow-sm ${
                lifecycleFilter === 'FLAGGED'
                  ? 'border-red-500 ring-2 ring-red-500/15'
                  : (feedData.stats?.flagged_items ?? 0) === 0
                  ? 'border-slate-100 opacity-55 cursor-default'
                  : 'border-red-200 hover:border-red-300'
              }`}
            >
              <p className="text-[11px] text-red-600 font-bold uppercase tracking-wider">
                Flagged / Attention
              </p>
              <p className="text-2xl font-black text-red-600 mt-1">
                {feedData.stats?.flagged_items ?? 0}
              </p>
              <p className="text-[11px] text-red-500/80 mt-0.5">Overdue, rejected, or policy warning</p>
            </button>
          </div>

          {/* Dynamic Module Selector Pills (Only renders modules that actually have > 0 activities!) */}
          {dynamicModules.length > 2 && (
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              {dynamicModules.map((modKey) => {
                const meta = MODULE_META[modKey] || MODULE_META.ALL;
                const Icon = meta.icon;
                const isSelected = moduleFilter === modKey;
                const modCounts = feedData.facets?.modules || feedData.stats?.module_counts || {};
                const modCount =
                  modKey === 'ALL'
                    ? Object.values(modCounts).reduce((a, b) => a + b, 0)
                    : modCounts[modKey] || 0;

                return (
                  <button
                    key={modKey}
                    type="button"
                    onClick={() => setModuleFilter(modKey)}
                    className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold border whitespace-nowrap transition-all ${
                      isSelected
                        ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{meta.label}</span>
                    <span
                      className={`px-1.5 py-0.5 text-[10px] rounded-full ${
                        isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {modCount}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Dynamic Faceted Filter Bar (Only renders dropdowns & options present in the current dataset) */}
          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm space-y-3">
            <div className="flex flex-wrap items-center gap-2.5">
              {/* Search */}
              <div className="relative flex-1 min-w-[220px]">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search LG #, serial, batch, RFQ, facility, bank, or user..."
                  className="w-full !pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-xs bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Dynamic Action Category */}
              {(dynamicCategories.length > 1 || categoryFilter !== 'ALL') && (
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="px-3 py-2 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="ALL">All Available Actions ({dynamicCategories.reduce((s, c) => s + c.count, 0)})</option>
                  {dynamicCategories.map((cat) => (
                    <option key={cat.value} value={cat.value}>
                      {CATEGORY_LABELS[cat.value] || cat.value} ({cat.count})
                    </option>
                  ))}
                </select>
              )}

              {/* Dynamic Actor / Team Member */}
              {(dynamicActors.length > 1 || actorFilter !== 'ALL') && (
                <select
                  value={actorFilter}
                  onChange={(e) => setActorFilter(e.target.value)}
                  className="px-3 py-2 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 max-w-[230px]"
                >
                  <option value="ALL">All Active Actors ({dynamicActors.length})</option>
                  {dynamicActors.map((act) => (
                    <option key={act.value} value={act.value}>
                      {act.label} ({act.count})
                    </option>
                  ))}
                </select>
              )}

              {/* Dynamic Subsidiary / Entity */}
              {(dynamicEntities.length > 1 || entityFilter !== 'ALL') && (
                <select
                  value={entityFilter}
                  onChange={(e) => setEntityFilter(e.target.value)}
                  className="px-3 py-2 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 max-w-[200px]"
                >
                  <option value="ALL">All Active Entities ({dynamicEntities.length})</option>
                  {dynamicEntities.map((ent) => (
                    <option key={ent.id} value={ent.id}>
                      {ent.name} ({ent.count})
                    </option>
                  ))}
                </select>
              )}

              {/* Dynamic Bank */}
              {(dynamicBanks.length > 1 || bankFilter !== 'ALL') && (
                <select
                  value={bankFilter}
                  onChange={(e) => setBankFilter(e.target.value)}
                  className="px-3 py-2 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 max-w-[190px]"
                >
                  <option value="ALL">All Active Banks ({dynamicBanks.length})</option>
                  {dynamicBanks.map((bnk) => (
                    <option key={bnk.name} value={bnk.name}>
                      {bnk.name} ({bnk.count})
                    </option>
                  ))}
                </select>
              )}

              {/* Actions */}
              <button
                type="button"
                onClick={handleExportActivityExcel}
                disabled={isGracePeriod}
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-bold hover:bg-emerald-100 transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                Export Excel
              </button>

              <button
                type="button"
                onClick={fetchFeed}
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 text-slate-700 rounded-lg text-xs font-bold hover:bg-slate-200 transition-colors"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${feedLoading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>

            {/* Quick Date Presets Row */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] font-bold text-slate-400 uppercase mr-1">When:</span>
                {[
                  { key: 'ALL', label: 'All Time' },
                  { key: 'TODAY', label: 'Today' },
                  { key: '7D', label: 'Last 7 Days' },
                  { key: '30D', label: 'Last 30 Days' },
                  { key: 'CUSTOM', label: 'Custom Dates' },
                ].map((p) => (
                  <button
                    key={p.key}
                    type="button"
                    onClick={() => applyDatePreset(p.key)}
                    className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors ${
                      datePreset === p.key
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}

                {datePreset === 'CUSTOM' && (
                  <div className="flex items-center gap-2 ml-2">
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="px-2 py-1 border border-slate-200 rounded-md text-xs"
                    />
                    <span className="text-slate-400 text-xs">to</span>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="px-2 py-1 border border-slate-200 rounded-md text-xs"
                    />
                  </div>
                )}
              </div>

              {(moduleFilter !== 'ALL' ||
                categoryFilter !== 'ALL' ||
                lifecycleFilter !== 'ALL' ||
                actorFilter !== 'ALL' ||
                entityFilter !== 'ALL' ||
                bankFilter !== 'ALL' ||
                startDate ||
                endDate ||
                searchTerm) && (
                <button
                  type="button"
                  onClick={() => {
                    setModuleFilter('ALL');
                    setCategoryFilter('ALL');
                    setLifecycleFilter('ALL');
                    setActorFilter('ALL');
                    setEntityFilter('ALL');
                    setBankFilter('ALL');
                    applyDatePreset('ALL');
                    setSearchTerm('');
                  }}
                  className="inline-flex items-center gap-1 text-xs font-bold text-red-600 hover:text-red-700"
                >
                  <X className="w-3.5 h-3.5" /> Reset Filters
                </button>
              )}
            </div>
          </div>

          {feedError && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl flex items-center gap-2 text-sm">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{feedError}</span>
            </div>
          )}

          {/* Activity Stream Table */}
          {feedLoading ? (
            <div className="bg-white rounded-xl border border-slate-200 p-16 text-center shadow-sm">
              <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto" />
              <p className="text-sm text-slate-500 mt-3">Aggregating business activity across platform modules...</p>
            </div>
          ) : (feedData.items || []).length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 p-12 text-center shadow-sm">
              <Activity className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-bold text-slate-700">No matching business activities</p>
              <p className="text-xs text-slate-500 mt-1">Try resetting or broadening your active filters.</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-100">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">When</th>
                      <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">Who (Maker / Approver)</th>
                      <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">Module &amp; Action</th>
                      <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">Reference &amp; Bank</th>
                      <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">Business Summary &amp; Amount</th>
                      <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">Live Control Stage</th>
                      <th className="px-4 py-3 text-right text-[10px] font-bold text-slate-500 uppercase tracking-wider">Verify</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {feedData.items.map((ev) => {
                      const modMeta = MODULE_META[ev.module] || MODULE_META.ALL;
                      const isExpanded = !!expandedBatchIds[ev.id];
                      const hasChildren = ev.is_batch && Array.isArray(ev.children) && ev.children.length > 0;

                      return (
                        <React.Fragment key={ev.id}>
                          <tr
                            className={`transition-colors ${
                              hasChildren ? 'bg-indigo-50/20 hover:bg-indigo-50/50 cursor-pointer' : 'hover:bg-slate-50/80'
                            }`}
                            onClick={hasChildren ? () => toggleBatchExpand(ev.id) : undefined}
                          >
                            {/* When */}
                            <td className="px-4 py-3.5 whitespace-nowrap align-top">
                              <div className="font-semibold text-slate-800">
                                {ev.timestamp ? moment(ev.timestamp).format('DD MMM YYYY') : '—'}
                              </div>
                              <div className="text-[11px] text-slate-400 font-mono">
                                {ev.timestamp ? moment(ev.timestamp).format('HH:mm') : ''}
                              </div>
                            </td>

                            {/* Who */}
                            <td className="px-4 py-3.5 align-top max-w-[210px]">
                              <div className="flex items-center gap-1.5">
                                <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                <span className="font-semibold text-slate-900 truncate" title={ev.actor_name}>
                                  {ev.actor_name}
                                </span>
                              </div>
                              {ev.approver_name && (
                                <div className="text-[11px] text-emerald-700 mt-0.5 truncate" title={ev.approver_name}>
                                  Approved: {ev.approver_name}
                                </div>
                              )}
                              {ev.entity_name && (
                                <div className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1 truncate">
                                  <Building className="w-3 h-3 shrink-0" /> {ev.entity_name}
                                </div>
                              )}
                            </td>

                            {/* Module & Action */}
                            <td className="px-4 py-3.5 align-top whitespace-nowrap">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold border ${modMeta.pill}`}>
                                {modMeta.label}
                              </span>
                              <div className="font-bold text-slate-900 mt-1 flex items-center gap-1.5">
                                {hasChildren && (
                                  isExpanded ? <ChevronDown className="w-4 h-4 text-indigo-600" /> : <ChevronRight className="w-4 h-4 text-indigo-600" />
                                )}
                                <span>{ev.action_label}</span>
                              </div>
                            </td>

                            {/* Reference & Bank */}
                            <td className="px-4 py-3.5 align-top">
                              <div className="font-bold text-slate-900 font-mono text-[11px]">
                                {ev.reference || '—'}
                              </div>
                              {ev.secondary_ref && (
                                <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                                  {ev.secondary_ref}
                                </div>
                              )}
                              {ev.bank_name && (
                                <div className="text-[11px] text-slate-600 font-medium mt-0.5">
                                  {ev.bank_name}
                                </div>
                              )}
                            </td>

                            {/* Summary & Amount */}
                            <td className="px-4 py-3.5 align-top max-w-[320px]">
                              {ev.amount !== null && ev.amount !== undefined && (
                                <div className="font-extrabold text-slate-900 mb-0.5">
                                  {formatMoney(ev.amount, ev.currency)}
                                </div>
                              )}
                              <div className="text-slate-600 leading-snug">{ev.summary}</div>
                              {ev.beneficiary_name && (
                                <div className="text-[10px] text-slate-400 mt-0.5 truncate">
                                  Counterparty: {ev.beneficiary_name}
                                </div>
                              )}
                            </td>

                            {/* Live Control Stage */}
                            <td className="px-4 py-3.5 align-top whitespace-nowrap">
                              <span
                                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${getLifecycleBadgeStyle(
                                  ev.lifecycle_stage
                                )}`}
                              >
                                {ev.lifecycle_label}
                              </span>
                              {ev.warning_badges?.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-1.5">
                                  {ev.warning_badges.map((w, idx) => (
                                    <span
                                      key={idx}
                                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-red-50 text-red-700 border border-red-200"
                                    >
                                      <AlertTriangle className="w-3 h-3" /> {w}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </td>

                            {/* Verify / Open */}
                            <td
                              className="px-4 py-3.5 align-top whitespace-nowrap text-right"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <div className="inline-flex items-center gap-1.5">
                                {(ev.links?.instruction_id || ev.links?.maintenance_action_id) && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handlePreviewLetter({
                                        instructionId: ev.links.instruction_id,
                                        maintenanceActionId: ev.links.maintenance_action_id,
                                      })
                                    }
                                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100"
                                    title="Preview generated bank letter (read-only)"
                                  >
                                    <Eye className="w-3 h-3" /> Letter
                                  </button>
                                )}
                                {ev.links?.navigate_to && (
                                  <button
                                    type="button"
                                    onClick={() => handleSmartNavigate(ev.links.navigate_to)}
                                    className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200"
                                    title="Open module record"
                                  >
                                    <ExternalLink className="w-3 h-3" />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>

                          {/* Expanded Batch Children */}
                          {hasChildren &&
                            isExpanded &&
                            ev.children.map((child) => (
                              <tr key={child.id} className="bg-slate-50/90 border-l-4 border-l-indigo-500">
                                <td className="px-4 py-2.5 pl-8 text-[11px] text-slate-400 font-mono">
                                  ↳ Item
                                </td>
                                <td className="px-4 py-2.5 text-[11px] text-slate-600">
                                  {child.entity_name || child.actor_name}
                                </td>
                                <td className="px-4 py-2.5 text-[11px] font-semibold text-slate-700">
                                  {child.action_label}
                                </td>
                                <td className="px-4 py-2.5">
                                  <div className="font-mono font-bold text-slate-800 text-[11px]">
                                    {child.reference}
                                  </div>
                                  <div className="font-mono text-[10px] text-slate-400">
                                    {child.secondary_ref} · {child.bank_name}
                                  </div>
                                </td>
                                <td className="px-4 py-2.5">
                                  <span className="font-bold text-slate-900 mr-2">
                                    {formatMoney(child.amount, child.currency)}
                                  </span>
                                  <span className="text-slate-600 text-[11px]">{child.summary}</span>
                                </td>
                                <td className="px-4 py-2.5">
                                  <span
                                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${getLifecycleBadgeStyle(
                                      child.lifecycle_stage
                                    )}`}
                                  >
                                    {child.lifecycle_label}
                                  </span>
                                </td>
                                <td className="px-4 py-2.5 text-right">
                                  <div className="inline-flex items-center gap-1.5">
                                    {child.links?.instruction_id && (
                                      <button
                                        type="button"
                                        onClick={() =>
                                          handlePreviewLetter({ instructionId: child.links.instruction_id })
                                        }
                                        className="inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] font-bold bg-white text-blue-700 border border-blue-200 hover:bg-blue-50"
                                      >
                                        <Eye className="w-3 h-3" /> Letter
                                      </button>
                                    )}
                                    {child.links?.navigate_to && (
                                      <button
                                        type="button"
                                        onClick={() => handleSmartNavigate(child.links.navigate_to)}
                                        className="p-1 rounded bg-white border border-slate-200 text-slate-600 hover:bg-slate-100"
                                      >
                                        <ExternalLink className="w-3 h-3" />
                                      </button>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            ))}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════════
          TAB 2: SIGNATORY & CONTROL VERIFICATION DESK
         ════════════════════════════════════════════════════════════════════════ */}
      {mainTab === 'controls' && (
        <div className="space-y-5">
          {/* Sub-Navigation Cards for the 4 Control Lenses */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <button
              type="button"
              onClick={() => setControlSubTab('signatory')}
              className={`text-left p-4 rounded-xl border transition-all bg-white shadow-sm ${
                controlSubTab === 'signatory'
                  ? 'border-blue-600 ring-2 ring-blue-600/15'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-blue-700">
                  1. Signatory Pile
                </span>
                <ClipboardCheck className="w-4 h-4 text-blue-600" />
              </div>
              <p className="text-2xl font-black text-slate-900 mt-1">
                {controlsData.summary?.pending_sign_or_delivery_count ?? 0}
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Generated bank letters awaiting delivery ({controlsData.summary?.pending_renewals_to_sign_count ?? 0} renewals)
              </p>
            </button>

            <button
              type="button"
              onClick={() => setControlSubTab('verify-list')}
              className={`text-left p-4 rounded-xl border transition-all bg-white shadow-sm ${
                controlSubTab === 'verify-list'
                  ? 'border-indigo-600 ring-2 ring-indigo-600/15'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-700">
                  2. Verify Handed List
                </span>
                <Sparkles className="w-4 h-4 text-indigo-600" />
              </div>
              <p className="text-lg font-black text-slate-900 mt-1.5">Cross-Check List</p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Paste LG #s from Excel/email to check system match &amp; omissions
              </p>
            </button>

            <button
              type="button"
              onClick={() => setControlSubTab('cohort')}
              className={`text-left p-4 rounded-xl border transition-all bg-white shadow-sm ${
                controlSubTab === 'cohort'
                  ? 'border-emerald-600 ring-2 ring-emerald-600/15'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">
                  3. Expiry Cohort ({cohortWindowDays}d)
                </span>
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-black text-slate-900">
                  {controlsData.summary?.cohort_total ?? 0}
                </span>
                {(controlsData.summary?.cohort_unactioned_at_risk ?? 0) > 0 && (
                  <span className="text-xs font-extrabold text-red-600">
                    ({controlsData.summary.cohort_unactioned_at_risk} unactioned!)
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                100% completeness across Custody &amp; Issuance
              </p>
            </button>

            <button
              type="button"
              onClick={() => setControlSubTab('exceptions')}
              className={`text-left p-4 rounded-xl border transition-all bg-white shadow-sm ${
                controlSubTab === 'exceptions'
                  ? 'border-red-600 ring-2 ring-red-600/15'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-red-600">
                  4. Platform Exceptions
                </span>
                <AlertTriangle className="w-4 h-4 text-red-600" />
              </div>
              <p className="text-2xl font-black text-slate-900 mt-1">
                {controlsData.summary?.cross_module_exceptions_count ?? 0}
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Stuck letters, LG discrepancies, RFQ &amp; Recon alerts
              </p>
            </button>
          </div>

          {controlsError && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
              {controlsError}
            </div>
          )}

          {/* ── SUB-TAB 1: SIGNATORY PILE (100% DYNAMIC OPTIONS) ── */}
          {controlSubTab === 'signatory' && (
            <div className="space-y-4">
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative min-w-[220px]">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={pileSearch}
                      onChange={(e) => setPileSearch(e.target.value)}
                      placeholder="Filter pile by LG #, serial, bank, or batch..."
                      className="w-full !pl-9 pr-3 py-1.5 border border-slate-200 rounded-lg text-xs"
                    />
                  </div>

                  {/* Dynamic Category Pills — only renders categories actually present in the pile */}
                  {pileDynamicState.categories.length > 1 && (
                    <>
                      <button
                        type="button"
                        onClick={() => setPileCategoryFilter('ALL')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
                          pileCategoryFilter === 'ALL'
                            ? 'bg-slate-900 text-white border-slate-900'
                            : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        All Letters ({pileDynamicState.categories.reduce((s, c) => s + c.count, 0)})
                      </button>
                      {pileDynamicState.categories.map((cat) => (
                        <button
                          key={cat.value}
                          type="button"
                          onClick={() => setPileCategoryFilter(cat.value)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
                            pileCategoryFilter === cat.value
                              ? 'bg-slate-900 text-white border-slate-900'
                              : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          {cat.label} ({cat.count})
                        </button>
                      ))}
                    </>
                  )}

                  {/* Dynamic Makers Dropdown */}
                  {(pileDynamicState.makers.length > 1 || pileMakerFilter !== 'ALL') && (
                    <select
                      value={pileMakerFilter}
                      onChange={(e) => setPileMakerFilter(e.target.value)}
                      className="px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold bg-white"
                    >
                      <option value="ALL">All Makers ({pileDynamicState.makers.length})</option>
                      {pileDynamicState.makers.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name} ({m.count})
                        </option>
                      ))}
                    </select>
                  )}

                  {/* Dynamic Banks Dropdown */}
                  {(pileDynamicState.banks.length > 1 || pileBankFilter !== 'ALL') && (
                    <select
                      value={pileBankFilter}
                      onChange={(e) => setPileBankFilter(e.target.value)}
                      className="px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold bg-white"
                    >
                      <option value="ALL">All Banks ({pileDynamicState.banks.length})</option>
                      {pileDynamicState.banks.map((b) => (
                        <option key={b.name} value={b.name}>
                          {b.name} ({b.count})
                        </option>
                      ))}
                    </select>
                  )}

                  {/* Dynamic Flagged Toggle — only shown if flagged letters exist */}
                  {(pileDynamicState.flaggedCount > 0 || pileFlaggedOnly) && (
                    <button
                      type="button"
                      onClick={() => setPileFlaggedOnly(!pileFlaggedOnly)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border ${
                        pileFlaggedOnly
                          ? 'bg-red-600 text-white border-red-600'
                          : 'bg-white text-red-700 border-red-200 hover:bg-red-50'
                      }`}
                    >
                      <AlertTriangle className="w-3.5 h-3.5" />
                      Flagged ({pileDynamicState.flaggedCount})
                    </button>
                  )}

                  {(pileCategoryFilter !== 'ALL' ||
                    pileMakerFilter !== 'ALL' ||
                    pileBankFilter !== 'ALL' ||
                    pileFlaggedOnly ||
                    pileSearch) && (
                    <button
                      type="button"
                      onClick={() => {
                        setPileCategoryFilter('ALL');
                        setPileMakerFilter('ALL');
                        setPileBankFilter('ALL');
                        setPileFlaggedOnly(false);
                        setPileSearch('');
                      }}
                      className="inline-flex items-center gap-1 px-2 py-1.5 text-xs font-bold text-red-600 hover:text-red-700"
                    >
                      <X className="w-3.5 h-3.5" /> Clear
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  {pileDynamicState.filtered.length > 0 && (
                    <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-lg">
                      Sign-Off Ticklist: {checkedInPileCount} / {pileDynamicState.filtered.length}
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={fetchControls}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 text-slate-700 rounded-lg text-xs font-bold hover:bg-slate-200"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${controlsLoading ? 'animate-spin' : ''}`} />
                    Refresh
                  </button>
                </div>
              </div>

              {controlsLoading ? (
                <div className="bg-white rounded-xl border border-slate-200 p-14 text-center">
                  <Loader2 className="w-7 h-7 text-blue-600 animate-spin mx-auto" />
                  <p className="text-xs text-slate-500 mt-2">Loading pending bank letters...</p>
                </div>
              ) : pileDynamicState.filtered.length === 0 ? (
                <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
                  <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-2" />
                  <p className="text-sm font-bold text-slate-800">No pending undelivered bank letters</p>
                  <p className="text-xs text-slate-500 mt-1">
                    All generated instructions have been delivered to the bank or cleared.
                  </p>
                </div>
              ) : (
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-100 text-xs">
                      <thead className="bg-slate-50 border-b border-slate-200">
                        <tr>
                          <th className="px-3 py-3 text-center text-[10px] font-bold text-slate-500 uppercase">Tick</th>
                          <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-500 uppercase">LG # &amp; Official Serial</th>
                          <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-500 uppercase">Bank &amp; Entity</th>
                          <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-500 uppercase">Amount</th>
                          <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-500 uppercase">Instruction Terms (Old → New)</th>
                          <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-500 uppercase">Maker &amp; Print State</th>
                          <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-500 uppercase">Control Flags</th>
                          <th className="px-4 py-3 text-right text-[10px] font-bold text-slate-500 uppercase">Inspect</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {pileDynamicState.filtered.map((row) => {
                          const isChecked = !!signedChecklist[row.id];
                          return (
                            <tr
                              key={row.id}
                              className={`transition-colors ${
                                isChecked ? 'bg-emerald-50/40' : 'hover:bg-slate-50'
                              }`}
                            >
                              <td className="px-3 py-3 text-center">
                                <button
                                  type="button"
                                  onClick={() => toggleChecklist(row.id)}
                                  className="text-slate-400 hover:text-emerald-600"
                                  title="Tick off as verified on desk"
                                >
                                  {isChecked ? (
                                    <CheckSquare className="w-4 h-4 text-emerald-600" />
                                  ) : (
                                    <Square className="w-4 h-4" />
                                  )}
                                </button>
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-1.5">
                                  <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-slate-100 text-slate-700">
                                    {row.module}
                                  </span>
                                  <span className="font-mono font-bold text-slate-900">{row.lg_number}</span>
                                </div>
                                <div className="font-mono text-[10px] text-blue-700 mt-0.5">
                                  Serial: {row.serial_number || '—'}
                                </div>
                                {row.batch_id && (
                                  <div className="font-mono text-[10px] text-indigo-600">
                                    Batch: {row.batch_id}
                                  </div>
                                )}
                              </td>
                              <td className="px-4 py-3">
                                <div className="font-semibold text-slate-800">{row.bank_name || '—'}</div>
                                <div className="text-[11px] text-slate-500">{row.entity_name || row.beneficiary_name}</div>
                              </td>
                              <td className="px-4 py-3 font-extrabold text-slate-900 whitespace-nowrap">
                                {formatMoney(row.amount, row.currency)}
                              </td>
                              <td className="px-4 py-3 max-w-[260px]">
                                <div className="font-bold text-slate-800">{row.action_label}</div>
                                <div className="text-slate-600 mt-0.5">{row.change_summary}</div>
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap">
                                <div className="font-semibold text-slate-800">{row.maker_name}</div>
                                <div className="text-[10px] text-slate-500 mt-0.5">
                                  {row.created_at ? moment(row.created_at).format('DD MMM YYYY') : ''} ·{' '}
                                  <span className={row.is_printed ? 'text-emerald-700 font-bold' : 'text-amber-700 font-bold'}>
                                    {row.is_printed ? 'Printed' : 'Unprinted'}
                                  </span>
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                {row.control_flags?.length > 0 ? (
                                  <div className="flex flex-wrap gap-1">
                                    {row.control_flags.map((f, i) => (
                                      <span
                                        key={i}
                                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-red-50 text-red-700 border border-red-200"
                                      >
                                        <AlertTriangle className="w-3 h-3" /> {f}
                                      </span>
                                    ))}
                                  </div>
                                ) : (
                                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700">
                                    <CheckCircle2 className="w-3.5 h-3.5" /> Clean
                                  </span>
                                )}
                              </td>
                              <td className="px-4 py-3 text-right whitespace-nowrap">
                                <div className="inline-flex items-center gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handlePreviewLetter({
                                        instructionId: row.instruction_id,
                                        maintenanceActionId: row.maintenance_action_id,
                                      })
                                    }
                                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-blue-600 text-white hover:bg-blue-700 shadow-xs"
                                  >
                                    <Eye className="w-3 h-3" /> Preview Letter
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleSmartNavigate(row.navigate_to)}
                                    className="p-1.5 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200"
                                    title="Open LG Record"
                                  >
                                    <ExternalLink className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── SUB-TAB 2: VERIFY HANDED LIST (PASTE FROM EXCEL / EMAIL) ── */}
          {controlSubTab === 'verify-list' && (
            <div className="space-y-5">
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div>
                    <h3 className="text-base font-black text-slate-900">
                      Verify a Team Member&apos;s Renewal / Instruction List
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Paste LG numbers or Instruction Serials (from Excel, email, or a cover sheet). Grow checks system authenticity, terms, risk flags, and expiring LGs they left off the list.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleFillSampleFromQueue}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 self-start"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    Try Sample from Current Queue
                  </button>
                </div>

                <textarea
                  rows={4}
                  value={rawListText}
                  onChange={(e) => setRawListText(e.target.value)}
                  placeholder="Paste LG numbers or serials here (one per line, comma-separated, or copied directly from Excel)..."
                  className="w-full p-3 border border-slate-200 rounded-xl text-xs font-mono bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />

                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-xs text-slate-600">
                    <span className="font-semibold">Check omissions against expiry window:</span>
                    <select
                      value={cohortWindowDays}
                      onChange={(e) => setCohortWindowDays(Number(e.target.value))}
                      className="px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs font-bold bg-white"
                    >
                      <option value={30}>Next 30 Days</option>
                      <option value={45}>Next 45 Days</option>
                      <option value={60}>Next 60 Days</option>
                      <option value={90}>Next 90 Days</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-2">
                    {verifyResult && (
                      <button
                        type="button"
                        onClick={handleExportVerifyExcel}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100"
                      >
                        <Download className="w-3.5 h-3.5" />
                        Export Verification Report
                      </button>
                    )}
                    {rawListText && (
                      <button
                        type="button"
                        onClick={() => {
                          setRawListText('');
                          setVerifyResult(null);
                        }}
                        className="px-3 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100"
                      >
                        Clear
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleRunListVerify()}
                      disabled={verifyingList}
                      className="inline-flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm"
                    >
                      {verifyingList ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <ShieldCheck className="w-4 h-4" />
                      )}
                      Verify Against System
                    </button>
                  </div>
                </div>
              </div>

              {/* Verification Results */}
              {verifyResult && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    <div className="bg-emerald-50/70 border border-emerald-200 p-3.5 rounded-xl">
                      <p className="text-[10px] font-extrabold uppercase text-emerald-700">
                        Verified &amp; Actioned
                      </p>
                      <p className="text-2xl font-black text-emerald-800 mt-0.5">
                        {verifyResult.verified_count}
                      </p>
                      <p className="text-[11px] text-emerald-700/80">Matched official instruction in Grow</p>
                    </div>
                    <div className="bg-amber-50/70 border border-amber-200 p-3.5 rounded-xl">
                      <p className="text-[10px] font-extrabold uppercase text-amber-800">
                        On List · NOT Actioned
                      </p>
                      <p className="text-2xl font-black text-amber-900 mt-0.5">
                        {verifyResult.unactioned_count}
                      </p>
                      <p className="text-[11px] text-amber-800/80">LG exists, but no renewal generated</p>
                    </div>
                    <div className="bg-red-50/70 border border-red-200 p-3.5 rounded-xl">
                      <p className="text-[10px] font-extrabold uppercase text-red-700">
                        Not Found in System
                      </p>
                      <p className="text-2xl font-black text-red-800 mt-0.5">
                        {verifyResult.unknown_count}
                      </p>
                      <p className="text-[11px] text-red-700/80">Unrecognized LG # or typo</p>
                    </div>
                    <div className="bg-purple-50/70 border border-purple-200 p-3.5 rounded-xl">
                      <p className="text-[10px] font-extrabold uppercase text-purple-800">
                        Omitted From List!
                      </p>
                      <p className="text-2xl font-black text-purple-900 mt-0.5">
                        {verifyResult.omitted_from_list_count}
                      </p>
                      <p className="text-[11px] text-purple-800/80">
                        Due/pending in {cohortWindowDays}d window, missing from list
                      </p>
                    </div>
                  </div>

                  {verifyResult.verified_items?.length > 0 && (
                    <div className="bg-white rounded-xl border border-emerald-200 shadow-sm overflow-hidden">
                      <div className="px-4 py-2.5 bg-emerald-50 border-b border-emerald-200 flex items-center justify-between">
                        <span className="text-xs font-extrabold text-emerald-900">
                          Verified in System ({verifyResult.verified_items.length})
                        </span>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-slate-100 text-xs">
                          <thead className="bg-slate-50">
                            <tr>
                              <th className="px-4 py-2 text-left text-[10px] font-bold text-slate-500 uppercase">LG # &amp; Serial</th>
                              <th className="px-4 py-2 text-left text-[10px] font-bold text-slate-500 uppercase">Bank &amp; Amount</th>
                              <th className="px-4 py-2 text-left text-[10px] font-bold text-slate-500 uppercase">System Terms (Old → New)</th>
                              <th className="px-4 py-2 text-left text-[10px] font-bold text-slate-500 uppercase">Maker &amp; Stage</th>
                              <th className="px-4 py-2 text-left text-[10px] font-bold text-slate-500 uppercase">Flags</th>
                              <th className="px-4 py-2 text-right text-[10px] font-bold text-slate-500 uppercase">Letter</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {verifyResult.verified_items.map((v, idx) => (
                              <tr key={idx} className="hover:bg-slate-50">
                                <td className="px-4 py-2.5">
                                  <div className="font-mono font-bold text-slate-900">{v.lg_number}</div>
                                  <div className="font-mono text-[10px] text-blue-700">{v.serial_number || v.module}</div>
                                </td>
                                <td className="px-4 py-2.5">
                                  <div className="font-bold text-slate-900">{formatMoney(v.amount, v.currency)}</div>
                                  <div className="text-[11px] text-slate-500">{v.bank_name}</div>
                                </td>
                                <td className="px-4 py-2.5">
                                  <div className="font-semibold text-slate-800">{v.action_label}</div>
                                  <div className="text-slate-600">{v.change_summary}</div>
                                </td>
                                <td className="px-4 py-2.5">
                                  <div className="font-medium text-slate-800">{v.actor_name}</div>
                                  <span
                                    className={`inline-flex mt-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold border ${getLifecycleBadgeStyle(
                                      v.lifecycle_stage
                                    )}`}
                                  >
                                    {v.lifecycle_label}
                                  </span>
                                </td>
                                <td className="px-4 py-2.5">
                                  {v.control_flags?.length ? (
                                    v.control_flags.map((f, i) => (
                                      <span
                                        key={i}
                                        className="inline-block mr-1 px-2 py-0.5 rounded text-[10px] font-bold bg-red-50 text-red-700 border border-red-200"
                                      >
                                        {f}
                                      </span>
                                    ))
                                  ) : (
                                    <span className="text-emerald-700 font-semibold">OK</span>
                                  )}
                                </td>
                                <td className="px-4 py-2.5 text-right">
                                  {(v.instruction_id || v.maintenance_action_id) && (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handlePreviewLetter({
                                          instructionId: v.instruction_id,
                                          maintenanceActionId: v.maintenance_action_id,
                                        })
                                      }
                                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100"
                                    >
                                      <Eye className="w-3 h-3" /> Letter
                                    </button>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {(verifyResult.unactioned_matches?.length > 0 ||
                    verifyResult.unknown_references?.length > 0) && (
                    <div className="bg-white rounded-xl border border-amber-300 shadow-sm p-4 space-y-3">
                      <h4 className="text-xs font-extrabold uppercase text-amber-900 flex items-center gap-1.5">
                        <AlertTriangle className="w-4 h-4 text-amber-600" />
                        Discrepancies on Handed List
                      </h4>
                      {verifyResult.unactioned_matches?.map((u, idx) => (
                        <div
                          key={idx}
                          className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-lg bg-amber-50/70 border border-amber-200 text-xs"
                        >
                          <div>
                            <span className="font-mono font-bold text-slate-900">{u.lg_number}</span>{' '}
                            <span className="text-slate-600">
                              ({u.bank_name} · {formatMoney(u.amount, u.currency)} · Expires {u.current_expiry_date})
                            </span>
                            <div className="text-amber-800 font-semibold mt-0.5">{u.reason}</div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleSmartNavigate(u.navigate_to)}
                            className="px-2.5 py-1 rounded bg-white border border-amber-300 text-amber-900 font-bold text-[11px]"
                          >
                            Inspect LG
                          </button>
                        </div>
                      ))}
                      {verifyResult.unknown_references?.length > 0 && (
                        <div className="p-2.5 rounded-lg bg-red-50 border border-red-200 text-xs text-red-800">
                          <strong>Not Found in System ({verifyResult.unknown_references.length}):</strong>{' '}
                          <span className="font-mono">{verifyResult.unknown_references.join(', ')}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {verifyResult.omitted_items?.length > 0 && (
                    <div className="bg-white rounded-xl border border-purple-200 shadow-sm overflow-hidden">
                      <div className="px-4 py-2.5 bg-purple-50 border-b border-purple-200">
                        <span className="text-xs font-extrabold text-purple-900">
                          Omitted From Team Member&apos;s List ({verifyResult.omitted_items.length}) — Expiring or Pending in {cohortWindowDays}d Window
                        </span>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-slate-100 text-xs">
                          <thead className="bg-slate-50">
                            <tr>
                              <th className="px-4 py-2 text-left text-[10px] font-bold text-slate-500 uppercase">LG #</th>
                              <th className="px-4 py-2 text-left text-[10px] font-bold text-slate-500 uppercase">Bank &amp; Entity</th>
                              <th className="px-4 py-2 text-left text-[10px] font-bold text-slate-500 uppercase">Amount</th>
                              <th className="px-4 py-2 text-left text-[10px] font-bold text-slate-500 uppercase">Expiry Date</th>
                              <th className="px-4 py-2 text-left text-[10px] font-bold text-slate-500 uppercase">Cohort Status</th>
                              <th className="px-4 py-2 text-left text-[10px] font-bold text-slate-500 uppercase">Internal Owner</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {verifyResult.omitted_items.map((o) => (
                              <tr key={o.id} className="hover:bg-slate-50">
                                <td className="px-4 py-2.5 font-mono font-bold text-slate-900">
                                  <span className="px-1.5 py-0.5 mr-1.5 rounded text-[9px] bg-slate-100 text-slate-600">
                                    {o.module}
                                  </span>
                                  {o.lg_number}
                                </td>
                                <td className="px-4 py-2.5">
                                  <div className="font-semibold text-slate-800">{o.bank_name || '—'}</div>
                                  <div className="text-[11px] text-slate-500">{o.entity_name || o.beneficiary_name}</div>
                                </td>
                                <td className="px-4 py-2.5 font-bold text-slate-900">
                                  {formatMoney(o.amount, o.currency)}
                                </td>
                                <td className="px-4 py-2.5 font-mono text-slate-700">
                                  {o.cohort_expiry_date || '—'}
                                </td>
                                <td className="px-4 py-2.5">
                                  <span
                                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                                      o.bucket === 'UNACTIONED_AT_RISK'
                                        ? 'bg-red-50 text-red-700 border-red-200'
                                        : 'bg-amber-50 text-amber-800 border-amber-200'
                                    }`}
                                  >
                                    {o.bucket_label}
                                  </span>
                                </td>
                                <td className="px-4 py-2.5 text-slate-600">
                                  {o.internal_owner || '—'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ── SUB-TAB 3: EXPIRY COHORT COMPLETENESS (100% DYNAMIC OPTIONS) ── */}
          {controlSubTab === 'cohort' && (
            <div className="space-y-4">
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-bold text-slate-600">Window:</span>
                  {[30, 45, 60, 90].map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setCohortWindowDays(d)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold border ${
                        cohortWindowDays === d
                          ? 'bg-slate-900 text-white border-slate-900'
                          : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {d} Days
                    </button>
                  ))}

                  {/* Dynamic Bucket Dropdown — only shows buckets with > 0 LGs */}
                  {(cohortDynamicState.buckets.length > 1 || cohortBucketFilter !== 'ALL') && (
                    <select
                      value={cohortBucketFilter}
                      onChange={(e) => setCohortBucketFilter(e.target.value)}
                      className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-bold bg-white"
                    >
                      <option value="ALL">
                        All Cohort Buckets ({cohortDynamicState.buckets.reduce((s, b) => s + b.count, 0)})
                      </option>
                      {cohortDynamicState.buckets.map((b) => (
                        <option key={b.value} value={b.value}>
                          {b.label} ({b.count})
                        </option>
                      ))}
                    </select>
                  )}

                  {/* Dynamic Module Selector — only shown if BOTH Custody and Issuance have items */}
                  {(cohortDynamicState.modules.length > 1 || cohortModuleFilter !== 'ALL') && (
                    <select
                      value={cohortModuleFilter}
                      onChange={(e) => setCohortModuleFilter(e.target.value)}
                      className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-bold bg-white"
                    >
                      <option value="ALL">All Modules ({cohortDynamicState.modules.reduce((s, m) => s + m.count, 0)})</option>
                      {cohortDynamicState.modules.map((m) => (
                        <option key={m.value} value={m.value}>
                          {m.label} ({m.count})
                        </option>
                      ))}
                    </select>
                  )}

                  {/* Dynamic Bank Selector */}
                  {(cohortDynamicState.banks.length > 1 || cohortBankFilter !== 'ALL') && (
                    <select
                      value={cohortBankFilter}
                      onChange={(e) => setCohortBankFilter(e.target.value)}
                      className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-bold bg-white"
                    >
                      <option value="ALL">All Banks ({cohortDynamicState.banks.length})</option>
                      {cohortDynamicState.banks.map((b) => (
                        <option key={b.name} value={b.name}>
                          {b.name} ({b.count})
                        </option>
                      ))}
                    </select>
                  )}

                  {(cohortBucketFilter !== 'ALL' ||
                    cohortModuleFilter !== 'ALL' ||
                    cohortBankFilter !== 'ALL' ||
                    cohortSearch) && (
                    <button
                      type="button"
                      onClick={() => {
                        setCohortBucketFilter('ALL');
                        setCohortModuleFilter('ALL');
                        setCohortBankFilter('ALL');
                        setCohortSearch('');
                      }}
                      className="inline-flex items-center gap-1 px-2 py-1.5 text-xs font-bold text-red-600 hover:text-red-700"
                    >
                      <X className="w-3.5 h-3.5" /> Clear
                    </button>
                  )}
                </div>

                <div className="relative min-w-[220px]">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={cohortSearch}
                    onChange={(e) => setCohortSearch(e.target.value)}
                    placeholder="Search cohort LG #, bank, owner..."
                    className="w-full !pl-9 pr-3 py-1.5 border border-slate-200 rounded-lg text-xs"
                  />
                </div>
              </div>

              {cohortDynamicState.filtered.length === 0 ? (
                <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-xs text-slate-500">
                  No LGs in this {cohortWindowDays}-day expiry cohort window.
                </div>
              ) : (
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-100 text-xs">
                      <thead className="bg-slate-50 border-b border-slate-200">
                        <tr>
                          <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-500 uppercase">LG # &amp; Module</th>
                          <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-500 uppercase">Bank &amp; Entity</th>
                          <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-500 uppercase">Amount</th>
                          <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-500 uppercase">Cohort Expiry → New Expiry</th>
                          <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-500 uppercase">Cohort Control Bucket</th>
                          <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-500 uppercase">Owner &amp; Policy</th>
                          <th className="px-4 py-3 text-right text-[10px] font-bold text-slate-500 uppercase">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {cohortDynamicState.filtered.map((c) => (
                          <tr key={c.id} className="hover:bg-slate-50">
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-1.5">
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-slate-100 text-slate-700">
                                  {c.module}
                                </span>
                                <span className="font-mono font-bold text-slate-900">{c.lg_number}</span>
                              </div>
                              {c.serial_number && (
                                <div className="font-mono text-[10px] text-blue-700 mt-0.5">
                                  {c.serial_number}
                                </div>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <div className="font-semibold text-slate-800">{c.bank_name || '—'}</div>
                              <div className="text-[11px] text-slate-500">{c.entity_name || c.beneficiary_name}</div>
                            </td>
                            <td className="px-4 py-3 font-bold text-slate-900 whitespace-nowrap">
                              {formatMoney(c.amount, c.currency)}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap font-mono">
                              <span className="text-slate-700">{c.cohort_expiry_date || '—'}</span>
                              {c.new_expiry_date && (
                                <span className="text-emerald-700 font-bold"> → {c.new_expiry_date}</span>
                              )}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <span
                                className={`inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                                  c.bucket === 'UNACTIONED_AT_RISK'
                                    ? 'bg-red-50 text-red-700 border-red-200'
                                    : c.bucket === 'READY_TO_SIGN'
                                    ? 'bg-amber-50 text-amber-800 border-amber-200'
                                    : c.bucket === 'DELIVERED_OR_CONFIRMED'
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                    : 'bg-slate-100 text-slate-700 border-slate-200'
                                }`}
                              >
                                {c.bucket_label}
                              </span>
                              {c.actor_name && (
                                <div className="text-[10px] text-slate-500 mt-0.5">By {c.actor_name}</div>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <div className="text-[11px] text-slate-700 truncate max-w-[160px]">
                                {c.internal_owner || '—'}
                              </div>
                              {c.module === 'CUSTODY' && (
                                <span
                                  className={`text-[10px] font-bold ${
                                    c.auto_renewal ? 'text-emerald-600' : 'text-amber-700'
                                  }`}
                                >
                                  Auto-Renew: {c.auto_renewal ? 'ON' : 'OFF'}
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-right whitespace-nowrap">
                              <div className="inline-flex items-center gap-1.5">
                                {(c.instruction_id || c.maintenance_action_id) && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handlePreviewLetter({
                                        instructionId: c.instruction_id,
                                        maintenanceActionId: c.maintenance_action_id,
                                      })
                                    }
                                    className="inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200"
                                  >
                                    <Eye className="w-3 h-3" /> Letter
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => handleSmartNavigate(c.navigate_to)}
                                  className="p-1.5 rounded bg-slate-100 text-slate-600 hover:bg-slate-200"
                                >
                                  <ExternalLink className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── SUB-TAB 4: CROSS-MODULE CONTROL EXCEPTIONS (100% DYNAMIC OPTIONS) ── */}
          {controlSubTab === 'exceptions' && (
            <div className="space-y-4">
              {exceptionsDynamicState.totalAll > 0 && (
                <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    {exceptionsDynamicState.modules.length > 1 && (
                      <>
                        <button
                          type="button"
                          onClick={() => setExcModuleFilter('ALL')}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold border ${
                            excModuleFilter === 'ALL'
                              ? 'bg-slate-900 text-white border-slate-900'
                              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          All Modules ({exceptionsDynamicState.modules.reduce((s, m) => s + m.count, 0)})
                        </button>
                        {exceptionsDynamicState.modules.map((m) => (
                          <button
                            key={m.value}
                            type="button"
                            onClick={() => setExcModuleFilter(m.value)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold border ${
                              excModuleFilter === m.value
                                ? 'bg-slate-900 text-white border-slate-900'
                                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                            }`}
                          >
                            {m.label} ({m.count})
                          </button>
                        ))}
                      </>
                    )}

                    {(exceptionsDynamicState.types.length > 1 || excTypeFilter !== 'ALL') && (
                      <select
                        value={excTypeFilter}
                        onChange={(e) => setExcTypeFilter(e.target.value)}
                        className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-bold bg-white"
                      >
                        <option value="ALL">All Exception Types ({exceptionsDynamicState.types.length})</option>
                        {exceptionsDynamicState.types.map((t) => (
                          <option key={t.value} value={t.value}>
                            {t.value} ({t.count})
                          </option>
                        ))}
                      </select>
                    )}
                  </div>

                  {(excModuleFilter !== 'ALL' || excTypeFilter !== 'ALL') && (
                    <button
                      type="button"
                      onClick={() => {
                        setExcModuleFilter('ALL');
                        setExcTypeFilter('ALL');
                      }}
                      className="inline-flex items-center gap-1 text-xs font-bold text-red-600 hover:text-red-700"
                    >
                      <X className="w-3.5 h-3.5" /> Reset
                    </button>
                  )}
                </div>
              )}

              {exceptionsDynamicState.filtered.length === 0 ? (
                <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
                  <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-2" />
                  <p className="text-sm font-bold text-slate-800">Zero Control Exceptions Found</p>
                  <p className="text-xs text-slate-500 mt-1">
                    No stuck deliveries, unresolved copy discrepancies, balance gaps, or RFQ anomalies detected.
                  </p>
                </div>
              ) : (
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-100 text-xs">
                      <thead className="bg-slate-50 border-b border-slate-200">
                        <tr>
                          <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-500 uppercase">Severity</th>
                          <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-500 uppercase">Module</th>
                          <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-500 uppercase">Control Exception</th>
                          <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-500 uppercase">Reference &amp; Bank</th>
                          <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-500 uppercase">Why It Was Flagged</th>
                          <th className="px-4 py-3 text-right text-[10px] font-bold text-slate-500 uppercase">Inspect</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {exceptionsDynamicState.filtered.map((ex) => (
                          <tr key={ex.id} className="hover:bg-slate-50">
                            <td className="px-4 py-3 whitespace-nowrap">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold border ${
                                  ex.severity === 'HIGH'
                                    ? 'bg-red-50 text-red-700 border-red-200'
                                    : 'bg-amber-50 text-amber-800 border-amber-200'
                                }`}
                              >
                                {ex.severity}
                              </span>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                                  MODULE_META[ex.module]?.pill || 'bg-slate-100 text-slate-700'
                                }`}
                              >
                                {MODULE_META[ex.module]?.label || ex.module}
                              </span>
                            </td>
                            <td className="px-4 py-3 font-bold text-slate-900">
                              {ex.exception_type}
                              <div className="text-[10px] font-normal text-slate-400">
                                {ex.actor_name} · {ex.timestamp ? moment(ex.timestamp).format('DD MMM YYYY') : ''}
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <div className="font-mono font-bold text-slate-800">{ex.reference}</div>
                              <div className="text-[11px] text-slate-500">{ex.bank_name || ex.secondary_ref}</div>
                            </td>
                            <td className="px-4 py-3 text-slate-600 max-w-[340px]">{ex.detail}</td>
                            <td className="px-4 py-3 text-right">
                              {ex.navigate_to && (
                                <button
                                  type="button"
                                  onClick={() => handleSmartNavigate(ex.navigate_to)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-slate-100 text-slate-700 hover:bg-slate-200"
                                >
                                  Open <ExternalLink className="w-3 h-3" />
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default ActivityAndControlsPage;
