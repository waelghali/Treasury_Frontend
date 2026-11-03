import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { apiRequest } from 'services/apiService.js';
import {
  Save,
  Loader2,
  Upload,
  CheckCircle2,
  AlertTriangle,
  Eye,
  Code2,
  ShieldCheck,
  Sparkles,
  Globe,
  Building2,
  FileCode,
  ArrowLeft,
} from 'lucide-react';

const inputClassNames =
  "mb-2 mt-1 block w-full text-sm px-3 py-2 rounded-md border border-gray-300 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200";
const labelClassNames = "block text-xs font-semibold uppercase tracking-wider text-gray-600";
const requiredSpan = <span className="text-red-500">*</span>;

const ToggleSwitch = ({ id, name, checked, onChange, label, description }) => (
  <label htmlFor={id} className="relative flex items-start cursor-pointer py-1">
    <div className="flex items-center h-6">
      <input
        type="checkbox"
        name={name}
        id={id}
        checked={checked}
        onChange={onChange}
        className="sr-only peer"
      />
      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
    </div>
    <div className="ml-3">
      <span className="text-sm font-semibold text-gray-900 block">{label}</span>
      {description && <span className="text-xs text-gray-500 block">{description}</span>}
    </div>
  </label>
);

function TemplateForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const contentTextAreaRef = useRef(null);
  const fileInputRef = useRef(null);

  const [formData, setFormData] = useState({
    name: '',
    template_type: 'LETTER',
    action_type: 'LG_EXTENSION',
    subject: '',
    content: '',
    is_global: false,
    customer_id: null,
    is_notification_template: false,
  });

  // Dynamic Metadata States
  const [templateTypes, setTemplateTypes] = useState([]);
  const [actionTypes, setActionTypes] = useState([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isReviewing, setIsReviewing] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [formTitle, setFormTitle] = useState('Template Studio — Upload, Revise & Assign');
  const [customers, setCustomers] = useState([]);
  const [placeholders, setPlaceholders] = useState([]);
  const [reviewReport, setReviewReport] = useState(null);
  const [activeTab, setActiveTab] = useState('editor'); // 'editor' | 'preview'
  const [uploadedFileName, setUploadedFileName] = useState('');

  // 1. Fetch Metadata & Customers on Load
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const [metaData, customerList] = await Promise.all([
          apiRequest('/system-owner/template-metadata', 'GET'),
          apiRequest('/system-owner/customers', 'GET'),
        ]);
        setTemplateTypes(metaData.template_types || ['LETTER', 'EMAIL', 'PDF_ATTACHMENT']);
        setActionTypes(metaData.action_types || []);
        setCustomers(customerList || []);

        if (!id) {
          fetchPlaceholders('LG_EXTENSION');
        }
      } catch (err) {
        console.error("Metadata fetch error:", err);
        setError('Failed to load system configuration constants.');
      }
    };
    fetchInitialData();
  }, [id]);

  // 2. Fetch Existing Template Data if Editing
  useEffect(() => {
    const fetchTemplate = async () => {
      if (id) {
        setFormTitle('Edit & Revise Template');
        setIsLoading(true);
        try {
          const template = await apiRequest(`/system-owner/templates/${id}`, 'GET');
          setFormData({
            name: template.name || '',
            template_type: template.template_type || 'LETTER',
            action_type: template.action_type || '',
            subject: template.subject || '',
            content: template.content || '',
            is_global: template.is_global,
            customer_id: template.customer_id || null,
            is_notification_template: template.is_notification_template ?? false,
          });
          fetchPlaceholders(template.action_type);
        } catch (err) {
          setError('Failed to load template details.');
        } finally {
          setIsLoading(false);
        }
      } else {
        setIsLoading(false);
      }
    };
    fetchTemplate();
  }, [id]);

  const fetchPlaceholders = async (actionType) => {
    if (!actionType) return;
    try {
      const fetchedPlaceholders = await apiRequest(
        `/system-owner/template-placeholders?action_type=${actionType}`,
        'GET'
      );
      setPlaceholders(fetchedPlaceholders || []);
    } catch (err) {
      setPlaceholders([]);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    const val = type === 'checkbox' ? checked : value;

    setFormData((prev) => {
      const next = {
        ...prev,
        [name]: name === 'customer_id' ? (val ? Number(val) : null) : val,
      };
      if (name === 'is_global' && checked) {
        next.customer_id = null;
      }
      if (name === 'template_type') {
        if (val === 'LETTER') next.is_notification_template = false;
        if (val === 'EMAIL') next.is_notification_template = true;
      }
      return next;
    });

    if (name === 'action_type') {
      fetchPlaceholders(value);
      setReviewReport(null);
    }
  };

  // Handle File Upload (.html / .txt) and auto-detect Customer ID & Action Type from filename if applicable
  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadedFileName(file.name);
    setError('');
    setSuccessMsg('');

    const reader = new FileReader();
    reader.onload = async (event) => {
      const fileText = event.target?.result || '';

      // Detect pattern: CustomerID_1_LG_EXTENSION_template.html or LG_EXTENSION_template.html
      const custMatch = file.name.match(/^CustomerID_(\d+)_([A-Za-z0-9_]+)_template\.html$/i);
      const globalMatch = file.name.match(/^([A-Za-z0-9_]+)_template\.html$/i);

      let detectedAction = formData.action_type;
      let detectedCustomerId = formData.customer_id;
      let detectedIsGlobal = formData.is_global;
      let suggestedName = formData.name;

      if (custMatch) {
        detectedCustomerId = Number(custMatch[1]);
        detectedAction = custMatch[2].toUpperCase();
        detectedIsGlobal = false;
        const matchedCustomer = customers.find((c) => c.id === detectedCustomerId);
        const custLabel = matchedCustomer ? matchedCustomer.name : `Customer ${detectedCustomerId}`;
        suggestedName = `${custLabel} — ${detectedAction.replace(/_/g, ' ')} Letter`;
      } else if (globalMatch) {
        detectedAction = globalMatch[1].toUpperCase();
        detectedIsGlobal = true;
        detectedCustomerId = null;
        suggestedName = `Global — ${detectedAction.replace(/_/g, ' ')} Letter`;
      } else if (!suggestedName) {
        suggestedName = file.name.replace(/\.[^/.]+$/, '').replace(/_/g, ' ');
      }

      setFormData((prev) => ({
        ...prev,
        name: suggestedName,
        template_type: 'LETTER',
        is_notification_template: false,
        action_type: detectedAction || prev.action_type,
        is_global: detectedIsGlobal,
        customer_id: detectedCustomerId,
        content: fileText,
      }));

      if (detectedAction) {
        fetchPlaceholders(detectedAction);
      }

      // Automatically run template revision & preview
      await triggerReview(fileText, detectedAction || formData.action_type, detectedCustomerId);
    };
    reader.readAsText(file);
  };

  const triggerReview = async (
    contentToReview = formData.content,
    actionToReview = formData.action_type,
    customerToReview = formData.customer_id
  ) => {
    if (!contentToReview || !contentToReview.trim()) {
      setError('Please upload a file or enter template HTML content before running revision.');
      return;
    }
    setIsReviewing(true);
    setError('');
    const selectedCustomer = customers.find((c) => String(c.id) === String(customerToReview));
    const sampleCustName = selectedCustomer
      ? selectedCustomer.name
      : 'Orange Egypt for Telecommunications S.A.E.';
    const sampleCustAddr =
      selectedCustomer?.address ||
      'Smart Village, KM 28 Cairo-Alexandria Desert Road, Giza, Egypt';
    const sampleCustEmail = selectedCustomer?.contact_email || 'treasury.lg@orange.com';

    // Build client-side fallback preview & audit in case backend hasn't been restarted yet
    const buildClientSideReview = () => {
      const officialMap = {};
      placeholders.forEach((p) => {
        const cleanKey = p.name.replace(/\{|\}/g, '').trim();
        officialMap[cleanKey] = p.description;
      });
      const regex = /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g;
      const counts = {};
      let m;
      while ((m = regex.exec(contentToReview)) !== null) {
        counts[m[1]] = (counts[m[1]] || 0) + 1;
      }
      const uniqueKeys = Object.keys(counts).sort();
      const recognized = uniqueKeys
        .filter((k) => officialMap[k] !== undefined || Object.keys(officialMap).length === 0)
        .map((k) => ({
          placeholder: `{{${k}}}`,
          description: officialMap[k] || 'Template field',
          count: counts[k],
        }));
      const unknown =
        Object.keys(officialMap).length > 0
          ? uniqueKeys
              .filter((k) => officialMap[k] === undefined)
              .map((k) => ({ placeholder: `{{${k}}}`, count: counts[k] }))
          : [];

      const essentialByAction = {
        LG_EXTENSION: ['lg_number', 'old_expiry_date', 'new_expiry_date', 'lg_amount_formatted'],
        LG_DECREASE_AMOUNT: ['lg_number', 'original_lg_amount_formatted', 'new_lg_amount_formatted'],
        LG_RELEASE: ['lg_number', 'lg_amount_formatted', 'lg_issuer_name'],
        LG_LIQUIDATE: ['lg_number', 'original_lg_amount_formatted', 'lg_issuer_name'],
        LG_ACTIVATE_NON_OPERATIVE: ['lg_number', 'payment_amount_formatted', 'payment_date', 'payment_reference'],
        LG_REMINDER_TO_BANKS: ['lg_number', 'original_instruction_serial', 'days_overdue'],
        LG_CANCEL_LIQUIDATION: ['lg_number', 'liquidation_date', 'target_outcome_label'],
      };
      const reqKeys = essentialByAction[actionToReview] || ['lg_number'];
      const missing_essential_placeholders = reqKeys
        .filter((k) => !counts[k])
        .map((k) => ({
          placeholder: `{{${k}}}`,
          description: officialMap[k] || 'Core action field',
        }));

      const sampleData = {
        customer_name: sampleCustName,
        company_name: sampleCustName,
        entity_name: sampleCustName,
        customer_address: sampleCustAddr,
        customer_contact_email: sampleCustEmail,
        customer_phone: '+20 2 3535 0000',
        current_date: new Date().toISOString().slice(0, 10),
        platform_name: 'Grow BD Treasury Management Platform',
        instruction_serial: 'ORG-PF-0042-EXT-0001-001-O',
        serial_number: 'ORG-PF-0042-EXT-0001-001-O',
        lg_number: 'LG/2026/984120',
        lg_serial_number: 'LG/2026/984120',
        lg_amount: '2,500,000.00',
        lg_amount_formatted: 'EGP 2,500,000.00',
        lg_currency: 'EGP',
        currency_code: 'EGP',
        issuing_bank_name: 'Commercial International Bank (CIB)',
        bank_name: 'Commercial International Bank (CIB)',
        recipient_name: 'Commercial International Bank (CIB) — Trade Finance & LG Dept.',
        recipient_address: '21/23 Charles De Gaulle St., Giza, Egypt',
        lg_beneficiary_name: sampleCustName,
        beneficiary_name: sampleCustName,
        lg_issuer_name: 'Al-Futtaim Engineering & Technologies SAE',
        issuance_date: '2026-01-15',
        issue_date: '2026-01-15',
        expiry_date: '2026-12-31',
        maturity_date: '2026-12-31',
        old_expiry_date: '2026-12-31',
        new_expiry_date: '2027-06-30',
        extension_period: '6 Month(s)',
        original_lg_amount: '2,500,000.00',
        original_lg_amount_formatted: 'EGP 2,500,000.00',
        decrease_amount: '500,000.00',
        decrease_amount_formatted: 'EGP 500,000.00',
        new_lg_amount: '2,000,000.00',
        new_lg_amount_formatted: 'EGP 2,000,000.00',
        liquidation_type: 'Full',
        liquidation_amount: '2,500,000.00',
        liquidation_amount_formatted: 'EGP 2,500,000.00',
        settlement_instruction: `Kindly arrange to transfer the liquidated LG proceeds to our corporate account held under the name of ${sampleCustName}, in accordance with our standing banking instructions.`,
        enclosed_documents_clause:
          'Kindly find the original Letter of Guarantee attached herewith along with all its extension confirmation(s) received from your esteemed bank for your records and cancellation.',
        total_documents_received: '1',
        pending_replies_count: '0',
        payment_method: 'Wire Transfer',
        payment_amount: '2,500,000.00',
        payment_amount_formatted: 'EGP 2,500,000.00',
        payment_currency_code: 'EGP',
        payment_date: '2026-11-01',
        payment_reference: 'TRX-994827104',
        payment_issuing_bank_name: 'QNB ALAHLI',
        original_instruction_serial: 'ORG-PF-0042-EXT-0001-001-O',
        original_instruction_date: '2026-10-15',
        original_instruction_delivery_date: '2026-10-17',
        original_instruction_type: 'LG_EXTENSION',
        days_overdue: '17',
        delivery_clause: '(or delivered on 2026-10-17)',
        liquidation_date: '2026-10-20',
        internal_ref: 'LG-INT-0042',
        target_outcome_label: 'Re-Activate Guarantee (Active)',
        settlement_reference: 'STL-2026-881',
        settlement_date: '2026-11-02',
        notes_section: '',
      };

      let rendered_preview = contentToReview;
      Object.entries(sampleData).forEach(([k, v]) => {
        const r = new RegExp(`\\{\\{\\s*${k}\\s*\\}\\}`, 'g');
        rendered_preview = rendered_preview.replace(r, v);
      });

      const lower = contentToReview.toLowerCase();
      const checks = [
        {
          id: 'html_structure',
          label: 'Valid HTML Document Structure (<html> & <body>)',
          passed: lower.includes('<html') && lower.includes('<body'),
        },
        {
          id: 'page_rule',
          label: 'WeasyPrint A4 Print Page Rule (@page)',
          passed: lower.includes('@page'),
        },
        {
          id: 'details_table',
          label: 'Structured Specification Table (<table>)',
          passed: lower.includes('<table'),
        },
        {
          id: 'essential_fields',
          label: `All Core Action Placeholders Present (${reqKeys.length - missing_essential_placeholders.length}/${reqKeys.length})`,
          passed: missing_essential_placeholders.length === 0,
        },
        {
          id: 'no_unknown_fields',
          label: 'No Unrecognized / Typo Placeholders',
          passed: unknown.length === 0,
        },
      ];

      return {
        is_ready: missing_essential_placeholders.length === 0,
        action_type: actionToReview,
        recognized_placeholders: recognized,
        unknown_placeholders: unknown,
        missing_essential_placeholders,
        checks,
        rendered_preview,
      };
    };

    try {
      const report = await apiRequest('/system-owner/template-review', 'POST', {
        content: contentToReview,
        action_type: actionToReview,
        customer_id: customerToReview,
      });
      setReviewReport(report);
      setActiveTab('preview');
    } catch (err) {
      // Fallback seamlessly to client-side audit & preview so it works even before backend restart
      const fallbackReport = buildClientSideReview();
      setReviewReport(fallbackReport);
      setActiveTab('preview');
    } finally {
      setIsReviewing(false);
    }
  };

  const handleInsertPlaceholder = (placeholderName) => {
    setActiveTab('editor');
    setTimeout(() => {
      const textarea = contentTextAreaRef.current;
      if (!textarea) return;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newContent =
        formData.content.substring(0, start) + placeholderName + formData.content.substring(end);
      setFormData((prev) => ({ ...prev, content: newContent }));
      setTimeout(() => {
        textarea.focus();
        textarea.selectionStart = textarea.selectionEnd = start + placeholderName.length;
      }, 0);
    }, 30);
  };

  const handleSaveAndDeploy = async (targetScope = null) => {
    setError('');
    setSuccessMsg('');

    const payload = { ...formData };
    if (targetScope === 'global') {
      payload.is_global = true;
      payload.customer_id = null;
    } else if (targetScope === 'customer') {
      payload.is_global = false;
      if (!payload.customer_id) {
        setError('Please select a target Customer before approving & assigning to a specific customer.');
        return;
      }
    }

    if (!payload.name?.trim()) {
      setError('Template Name is required.');
      return;
    }
    if (!payload.action_type) {
      setError('Action Type is required.');
      return;
    }
    if (!payload.is_global && !payload.customer_id) {
      setError('Please select a Customer or switch scope to Global Template.');
      return;
    }

    setIsSaving(true);
    try {
      let targetId = id;
      if (!targetId) {
        // Check if a template already exists for this scope + action_type + purpose so we can seamlessly update it
        try {
          const allTemplates = await apiRequest('/system-owner/templates/', 'GET');
          const match = (allTemplates || []).find(
            (t) =>
              t.action_type === payload.action_type &&
              Boolean(t.is_notification_template) === Boolean(payload.is_notification_template) &&
              Boolean(t.is_global) === Boolean(payload.is_global) &&
              (payload.is_global ? true : Number(t.customer_id) === Number(payload.customer_id))
          );
          if (match) {
            targetId = match.id;
          }
        } catch (_) {
          // ignore lookup failure and fall back to POST
        }
      }
      const method = targetId ? 'PUT' : 'POST';
      const url = targetId ? `/system-owner/templates/${targetId}` : '/system-owner/templates/';
      await apiRequest(url, method, payload);
      setSuccessMsg(
        payload.is_global
          ? 'Template approved and deployed as a GLOBAL template!'
          : `Template approved and assigned to Customer ID #${payload.customer_id}!`
      );
      setTimeout(() => {
        navigate('/system-owner/global-configurations/templates');
      }, 900);
    } catch (err) {
      setError(`Error saving template: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <Loader2 className="animate-spin mx-auto h-8 w-8 text-blue-600" />
      </div>
    );
  }

  return (
    <div className="p-4 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-wrap justify-between items-center mb-6 gap-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/system-owner/global-configurations/templates')}
            className="p-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-gray-600"
            title="Back to Templates"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{formTitle}</h2>
            <p className="text-xs text-gray-500">
              Upload an HTML template file, revise placeholders &amp; A4 print layout with sample data, and approve for a specific customer or globally.
            </p>
          </div>
        </div>

        {/* File Upload Drop/Button Banner */}
        <div className="flex items-center gap-3">
          <input
            ref={fileInputRef}
            type="file"
            accept=".html,.htm,.txt"
            onChange={handleFileUpload}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center px-4 py-2.5 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-lg text-sm font-semibold hover:bg-indigo-100 transition-colors shadow-sm"
          >
            <Upload className="h-4 w-4 mr-2" />
            Upload Template File (.html)
          </button>
          <button
            type="button"
            onClick={() => triggerReview()}
            disabled={isReviewing || !formData.content}
            className="inline-flex items-center px-4 py-2.5 bg-amber-500 text-white rounded-lg text-sm font-semibold hover:bg-amber-600 disabled:opacity-50 transition-colors shadow-sm"
          >
            {isReviewing ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4 mr-2" />
            )}
            Revise &amp; Preview Template
          </button>
        </div>
      </div>

      {uploadedFileName && (
        <div className="mb-4 bg-indigo-50 border border-indigo-200 text-indigo-900 px-4 py-2.5 rounded-lg text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileCode className="h-4 w-4 text-indigo-600" />
            <span>
              Loaded file: <strong>{uploadedFileName}</strong> — fields and scope auto-populated. Review the audit report below before approving.
            </span>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-300 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm font-medium">
          {error}
        </div>
      )}

      {successMsg && (
        <div className="bg-emerald-50 border border-emerald-300 text-emerald-800 px-4 py-3 rounded-lg mb-4 text-sm font-semibold flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-emerald-600" />
          {successMsg}
        </div>
      )}

      {/* Revision & Audit Banner (Appears when Revise & Preview is clicked or file uploaded) */}
      {reviewReport && (
        <div className="mb-6 bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <div
            className={`px-5 py-3 flex flex-wrap items-center justify-between border-b ${
              reviewReport.is_ready
                ? 'bg-emerald-50/80 border-emerald-200'
                : 'bg-amber-50/80 border-amber-200'
            }`}
          >
            <div className="flex items-center gap-2.5">
              {reviewReport.is_ready ? (
                <ShieldCheck className="h-5 w-5 text-emerald-600" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-amber-600" />
              )}
              <div>
                <span className="text-sm font-bold text-gray-900">
                  Template Revision Audit —{' '}
                  {reviewReport.is_ready
                    ? 'Ready for Approval & Deployment'
                    : 'Attention Needed Before Deployment'}
                </span>
                <span className="ml-3 text-xs text-gray-600">
                  ({reviewReport.recognized_placeholders?.length || 0} recognized fields,{' '}
                  {reviewReport.missing_essential_placeholders?.length || 0} missing core fields,{' '}
                  {reviewReport.unknown_placeholders?.length || 0} unknown fields)
                </span>
              </div>
            </div>

            {/* One-Click Approve & Deploy Buttons */}
            <div className="flex items-center gap-2 mt-2 sm:mt-0">
              {!formData.is_global && formData.customer_id && (
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={() => handleSaveAndDeploy('customer')}
                  className="inline-flex items-center px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-md shadow-sm transition-colors"
                >
                  <Building2 className="h-3.5 w-3.5 mr-1.5" />
                  Approve &amp; Assign to Selected Customer
                </button>
              )}
              <button
                type="button"
                disabled={isSaving}
                onClick={() => handleSaveAndDeploy('global')}
                className="inline-flex items-center px-3.5 py-1.5 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-md shadow-sm transition-colors"
              >
                <Globe className="h-3.5 w-3.5 mr-1.5" />
                Approve &amp; Move to Global
              </button>
            </div>
          </div>

          <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            {/* Structural Checks */}
            <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
              <div className="font-bold text-gray-700 uppercase mb-2">Structural &amp; Print Checks</div>
              <ul className="space-y-1.5">
                {(reviewReport.checks || []).map((chk) => (
                  <li key={chk.id} className="flex items-center gap-2">
                    {chk.passed ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                    ) : (
                      <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
                    )}
                    <span className={chk.passed ? 'text-gray-700' : 'text-amber-800 font-semibold'}>
                      {chk.label}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Recognized Placeholders */}
            <div className="bg-gray-50 p-3 rounded-lg border border-gray-100 max-h-40 overflow-y-auto">
              <div className="font-bold text-gray-700 uppercase mb-2">
                Verified Fields ({reviewReport.recognized_placeholders?.length || 0})
              </div>
              <div className="flex flex-wrap gap-1.5">
                {(reviewReport.recognized_placeholders || []).map((item) => (
                  <span
                    key={item.placeholder}
                    title={item.description}
                    className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded font-mono text-[11px] font-semibold"
                  >
                    {item.placeholder}
                  </span>
                ))}
              </div>
            </div>

            {/* Missing / Unknown Warnings */}
            <div className="bg-gray-50 p-3 rounded-lg border border-gray-100 max-h-40 overflow-y-auto">
              <div className="font-bold text-gray-700 uppercase mb-2">Warnings &amp; Missing Fields</div>
              {reviewReport.missing_essential_placeholders?.length === 0 &&
              reviewReport.unknown_placeholders?.length === 0 ? (
                <p className="text-emerald-700 font-medium">
                  All core placeholders for {reviewReport.action_type} are present and valid!
                </p>
              ) : (
                <div className="space-y-2">
                  {reviewReport.missing_essential_placeholders?.map((m) => (
                    <div
                      key={m.placeholder}
                      onClick={() => handleInsertPlaceholder(m.placeholder)}
                      className="text-amber-800 bg-amber-100/70 px-2 py-1 rounded cursor-pointer hover:bg-amber-200"
                    >
                      Missing core field: <strong className="font-mono">{m.placeholder}</strong> (click to insert)
                    </div>
                  ))}
                  {reviewReport.unknown_placeholders?.map((u) => (
                    <div key={u.placeholder} className="text-red-700 bg-red-100/70 px-2 py-1 rounded">
                      Unrecognized placeholder: <strong className="font-mono">{u.placeholder}</strong>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Form & Editor / Preview Area */}
        <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSaveAndDeploy();
            }}
            className="space-y-4"
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <label className={labelClassNames}>Template Name {requiredSpan}</label>
                <input
                  type="text"
                  name="name"
                  placeholder="e.g., Orange Egypt — LG Extension Instruction"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  className={inputClassNames}
                />
              </div>

              <div>
                <label className={labelClassNames}>Template Type {requiredSpan}</label>
                <select
                  name="template_type"
                  value={formData.template_type}
                  onChange={handleChange}
                  required
                  className={inputClassNames}
                >
                  {templateTypes.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-lg border border-slate-200">
              <div>
                <label className={labelClassNames}>Instruction / Action Type {requiredSpan}</label>
                <select
                  name="action_type"
                  value={formData.action_type}
                  onChange={handleChange}
                  required
                  className={inputClassNames}
                >
                  <option value="">Select Action</option>
                  {actionTypes.map((a) => (
                    <option key={a} value={a}>
                      {a} ({a.replace(/_/g, ' ')})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className={labelClassNames}>Target Assignment Scope {requiredSpan}</label>
                <div className="mt-1 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setFormData((prev) => ({ ...prev, is_global: false }))
                    }
                    className={`flex-1 py-2 px-3 rounded-md text-xs font-bold border flex items-center justify-center gap-1.5 transition-all ${
                      !formData.is_global
                        ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <Building2 className="h-4 w-4" />
                    Specific Customer
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setFormData((prev) => ({ ...prev, is_global: true, customer_id: null }))
                    }
                    className={`flex-1 py-2 px-3 rounded-md text-xs font-bold border flex items-center justify-center gap-1.5 transition-all ${
                      formData.is_global
                        ? 'bg-slate-800 text-white border-slate-800 shadow-sm'
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <Globe className="h-4 w-4" />
                    Global Default
                  </button>
                </div>
              </div>

              {!formData.is_global && (
                <div className="md:col-span-2">
                  <label className={labelClassNames}>Assign to Customer {requiredSpan}</label>
                  <select
                    name="customer_id"
                    value={formData.customer_id || ''}
                    onChange={handleChange}
                    required={!formData.is_global}
                    className={inputClassNames}
                  >
                    <option value="">-- Select Target Customer --</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        [ID #{c.id}] {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="md:col-span-2 pt-1 border-t border-slate-200 flex flex-wrap items-center justify-between gap-4">
                <ToggleSwitch
                  id="is_notification_template"
                  name="is_notification_template"
                  checked={formData.is_notification_template}
                  onChange={handleChange}
                  label="Email Notification Template"
                  description="Leave OFF for printable Bank Instruction Letters (PDF). Turn ON only for system email notifications."
                />
              </div>
            </div>

            {formData.is_notification_template && (
              <div>
                <label className={labelClassNames}>Email Subject</label>
                <input
                  type="text"
                  name="subject"
                  value={formData.subject || ''}
                  onChange={handleChange}
                  placeholder="e.g. Reminder: LG #{{lg_number}} Expiring Soon"
                  className={inputClassNames}
                />
              </div>
            )}

            {/* Tabs for HTML Code Editor vs Rendered Live Preview */}
            <div>
              <div className="flex items-center justify-between border-b border-gray-200 mb-2">
                <div className="flex space-x-2">
                  <button
                    type="button"
                    onClick={() => setActiveTab('editor')}
                    className={`py-2 px-4 text-xs font-bold border-b-2 flex items-center gap-1.5 ${
                      activeTab === 'editor'
                        ? 'border-blue-600 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    <Code2 className="h-4 w-4" />
                    HTML Template Source {requiredSpan}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (!reviewReport && formData.content) {
                        triggerReview();
                      } else {
                        setActiveTab('preview');
                      }
                    }}
                    className={`py-2 px-4 text-xs font-bold border-b-2 flex items-center gap-1.5 ${
                      activeTab === 'preview'
                        ? 'border-blue-600 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    <Eye className="h-4 w-4" />
                    Live A4 Print Preview
                  </button>
                </div>
                <span className="text-[11px] text-gray-400">
                  {formData.content?.length || 0} characters
                </span>
              </div>

              {activeTab === 'editor' ? (
                <textarea
                  ref={contentTextAreaRef}
                  name="content"
                  rows="18"
                  value={formData.content}
                  onChange={handleChange}
                  required
                  placeholder="Paste HTML template content here or click 'Upload Template File (.html)' above..."
                  className={`${inputClassNames} font-mono text-xs leading-relaxed bg-slate-900 text-slate-100 p-4`}
                />
              ) : (
                <div className="border border-gray-300 rounded-lg bg-gray-100 p-4">
                  <div className="text-xs text-gray-500 mb-2 flex justify-between items-center">
                    <span>
                      Simulated A4 Print Output with sample data for{' '}
                      <strong>{formData.action_type}</strong>
                    </span>
                    <button
                      type="button"
                      onClick={() => triggerReview()}
                      className="text-blue-600 hover:underline font-semibold"
                    >
                      Refresh Preview
                    </button>
                  </div>
                  <iframe
                    title="Template Live Preview"
                    srcDoc={reviewReport?.rendered_preview || formData.content}
                    className="w-full h-[640px] bg-white shadow-md rounded border border-gray-200"
                  />
                </div>
              )}
            </div>

            <div className="flex justify-end space-x-3 pt-4 border-t border-gray-100">
              <button
                type="button"
                onClick={() => navigate('/system-owner/global-configurations/templates')}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold shadow-sm transition-colors"
              >
                {isSaving ? (
                  <Loader2 className="animate-spin inline mr-2 h-4 w-4" />
                ) : (
                  <Save className="inline mr-2 h-4 w-4" />
                )}
                {id
                  ? 'Update & Save Template'
                  : formData.is_global
                  ? 'Approve & Save as Global Template'
                  : 'Approve & Assign to Customer'}
              </button>
            </div>
          </form>
        </div>

        {/* Right Sidebar: Official Placeholders Dictionary */}
        <div className="bg-gray-50 p-4 rounded-xl shadow-sm border border-gray-200 max-h-[820px] flex flex-col">
          <h3 className="font-bold text-sm text-gray-800 mb-1">
            Official Placeholders ({placeholders.length})
          </h3>
          <p className="text-xs text-gray-500 mb-3">
            For <strong>{formData.action_type || 'Selected Action'}</strong> — click any field to insert at cursor position.
          </p>
          <div className="space-y-2 overflow-y-auto pr-1 flex-1">
            {placeholders.length > 0 ? (
              placeholders.map((p) => {
                const isUsed = formData.content?.includes(p.name);
                return (
                  <div
                    key={p.name}
                    onClick={() => handleInsertPlaceholder(p.name)}
                    className={`p-2.5 bg-white border rounded-lg cursor-pointer transition-all ${
                      isUsed
                        ? 'border-emerald-300 bg-emerald-50/30 hover:bg-emerald-50'
                        : 'border-gray-200 hover:bg-blue-50 hover:border-blue-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <code className="text-blue-700 text-xs font-bold">{p.name}</code>
                      {isUsed && (
                        <span className="text-[10px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded font-semibold">
                          Used
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-gray-500 mt-1">{p.description}</p>
                  </div>
                );
              })
            ) : (
              <p className="text-gray-400 italic text-xs">
                Select an Action Type to see available placeholders.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default TemplateForm;
