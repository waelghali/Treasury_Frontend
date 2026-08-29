import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiRequest } from 'services/apiService.js';
import { Edit, Save, AlertCircle, Mail, Trash2, Globe, Plus, Filter, ChevronDown, ChevronUp, Loader2, Activity, Calendar, User, FileText, CheckCircle, XCircle, X, Shield, Layers, Cpu, HardDrive, Settings, Clock, Server, Lock, MessageSquare, FileCheck, Building, LayoutTemplate, Sparkles, Sliders, KeyRound, Check } from 'lucide-react';
import { toast } from 'react-toastify';
import QuotationBanksModal from '../../components/Modals/QuotationBanksModal';

// Email Provider Preset Auto-Detector
const detectEmailProvider = (email) => {
  if (!email || !email.includes('@')) return null;
  const domain = email.split('@')[1].toLowerCase();
  
  if (domain === 'yahoo.com' || domain.endsWith('.yahoo.com')) {
    return {
      name: 'Yahoo Mail',
      smtp_host: 'smtp.mail.yahoo.com',
      smtp_port: 465,
      imap_host: 'imap.mail.yahoo.com',
      imap_port: 993,
      imap_use_ssl: true
    };
  }
  if (domain === 'gmail.com' || domain === 'googlemail.com') {
    return {
      name: 'Google Workspace / Gmail',
      smtp_host: 'smtp.gmail.com',
      smtp_port: 587,
      imap_host: 'imap.gmail.com',
      imap_port: 993,
      imap_use_ssl: true
    };
  }
  if (domain === 'outlook.com' || domain === 'hotmail.com' || domain === 'live.com' || domain === 'office365.com') {
    return {
      name: 'Microsoft 365 / Outlook',
      smtp_host: 'smtp.office365.com',
      smtp_port: 587,
      imap_host: 'outlook.office365.com',
      imap_port: 993,
      imap_use_ssl: true
    };
  }
  if (domain === 'zoho.com') {
    return {
      name: 'Zoho Mail',
      smtp_host: 'smtp.zoho.com',
      smtp_port: 465,
      imap_host: 'imap.zoho.com',
      imap_port: 993,
      imap_use_ssl: true
    };
  }
  if (domain === 'icloud.com' || domain === 'me.com' || domain === 'mac.com') {
    return {
      name: 'Apple iCloud',
      smtp_host: 'smtp.mail.me.com',
      smtp_port: 587,
      imap_host: 'imap.mail.me.com',
      imap_port: 993,
      imap_use_ssl: true
    };
  }
  return null;
};

// --- 5-GROUP MASTER SETTINGS ARCHITECTURE ---
const settingGroups = {
  'Operational Timers, Expiries & Bank Reminder Windows': { icon: Clock },
  'Document Compliance & Mandatory Evidence Policies': { icon: FileCheck },
  'Smart Bank Facility Scoring & Recommendation': { icon: Layers },
  'Operational Governance, Controls & Position Reconciliation': { icon: Shield },
  'Security, Authentication & Platform Policies': { icon: Lock }
};

// Helper function to dynamically determine a config's group based on 5-pillar domain architecture
const getGroupKey = (configKey) => {
  const key = (configKey || '').toUpperCase();

  // Group 2: Document Compliance & Mandatory Evidence Policies
  if (key.startsWith('DOC_MANDATORY_') || key.includes('DOC_') || key.includes('ATTACHMENT')) {
    return 'Document Compliance & Mandatory Evidence Policies';
  }

  // Group 3: Smart Bank Facility Scoring & Recommendation
  if (key.includes('FACILITY_SCORE') || key.includes('RESERVATION_TTL') || key.includes('PUBLIC_ISSUANCE_SESSION')) {
    return 'Smart Bank Facility Scoring & Recommendation';
  }

  // Group 4: Operational Governance, Controls & Position Reconciliation
  if (
    key.includes('ALLOW_SIMULTANEOUS_MAINTENANCE') ||
    key.includes('APPROVAL_REQUEST_MAX_PENDING_DAYS') ||
    key.includes('DAYS_FOR_RECONCILIATION_REMINDER') ||
    key.includes('QUOTATION_APPROVAL_REQUIRED') ||
    key.includes('COMMON_COMMUNICATION_LIST') ||
    key.includes('REFERENCE_EXPIRY_REMINDER_DAYS')
  ) {
    return 'Operational Governance, Controls & Position Reconciliation';
  }

  // Group 5: Security, Authentication & Platform Policies
  if (
    key.includes('PASSWORD') ||
    key.includes('AUTH') ||
    key.includes('LOCKOUT') ||
    key.includes('SESSION') ||
    key.includes('GRACE_PERIOD') ||
    key.includes('STORAGE_BUCKET') ||
    key.includes('TC_VERSION') ||
    key.includes('PP_VERSION')
  ) {
    return 'Security, Authentication & Platform Policies';
  }

  // Group 1: Operational Timers, Expiries & Bank Reminder Windows (Default for all reminder, print, cancellation, renewal timers)
  return 'Operational Timers, Expiries & Bank Reminder Windows';
};

// --- Toggle Switch Component ---
const ToggleSwitch = ({ checked, onChange, disabled }) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    onClick={onChange}
    disabled={disabled}
    className={`
      relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent 
      transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
      ${checked ? 'bg-blue-600' : 'bg-gray-200'}
      ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
    `}
  >
    <span
      className={`
        pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 
        transition duration-200 ease-in-out
        ${checked ? 'translate-x-5' : 'translate-x-0'}
      `}
    />
  </button>
);

// Usage Progress Bar Component
const UsageProgressBar = ({ current, max, label, icon: Icon }) => {
  const percentage = max > 0 ? Math.min((current / max) * 100, 100) : 0;

  let barColor = "bg-blue-500";
  if (percentage > 90) barColor = "bg-red-500";
  else if (percentage > 75) barColor = "bg-yellow-500";

  return (
    <div className="mb-4">
      <div className="flex justify-between mb-1">
        <span className="text-sm font-medium text-gray-700 flex items-center">
          {Icon && <Icon className="h-4 w-4 mr-2 text-gray-500" />}
          {label}
        </span>
        <span className="text-sm font-medium text-gray-700">
          {current} / {max} ({Math.round(percentage)}%)
        </span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2.5">
        <div
          className={`${barColor} h-2.5 rounded-full transition-all duration-500`}
          style={{ width: `${percentage}%` }}
        ></div>
      </div>
    </div>
  );
};

// Feature Item Component
const FeatureItem = ({ label, isEnabled, icon: Icon }) => (
  <div className="flex items-center justify-between p-2 rounded-md hover:bg-gray-100 transition-colors">
    <div className="flex items-center overflow-hidden">
      <Icon className={`h-4 w-4 mr-2 flex-shrink-0 ${isEnabled ? 'text-blue-600' : 'text-gray-400'}`} />
      <span className={`text-sm font-medium truncate ${isEnabled ? 'text-gray-700' : 'text-gray-400'}`}>{label}</span>
    </div>
    {isEnabled ? (
      <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0 ml-2" />
    ) : (
      <XCircle className="h-4 w-4 text-gray-300 flex-shrink-0 ml-2" />
    )}
  </div>
);

// Grace Period Tooltip Component
const GracePeriodTooltip = ({ children, isGracePeriod }) => {
  if (isGracePeriod) {
    return (
      <div className="relative group inline-block">
        {children}
        <div className="opacity-0 w-max bg-gray-800 text-white text-xs rounded-lg py-2 px-3 absolute z-10 bottom-full left-1/2 -translate-x-1/2 pointer-events-none group-hover:opacity-100 transition-opacity duration-200">
          This action is disabled during your subscription's grace period.
          <svg className="absolute text-gray-800 h-2 w-full left-0 top-full" x="0px" y="0px" viewBox="0 0 255 255">
            <polygon className="fill-current" points="0,0 127.5,127.5 255,0" />
          </svg>
        </div>
      </div>
    );
  }
  return children;
};

// Common input field styling classes
const inputClassNames = "mt-1 block w-full text-base px-3 py-2 rounded-md border border-gray-300 bg-white shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200";
const labelClassNames = "block text-sm font-medium text-gray-700";
const buttonBaseClassNames = "px-3 py-1 text-sm font-medium rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors duration-200";

function CustomerConfigurationManagementPage({ onLogout, isGracePeriod, customerId }) {
  const navigate = useNavigate();
  // --- Existing State ---
  const [configurations, setConfigurations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [editingConfigId, setEditingConfigId] = useState(null);
  const [showQuotationBanksModal, setShowQuotationBanksModal] = useState(false);
  const [editValue, setEditValue] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState('');



  // --- Email Settings State ---
  const [showEmailSettingsModal, setShowEmailSettingsModal] = useState(false);
  const [emailSettings, setEmailSettings] = useState(null);
  const [isEmailSettingsLoading, setIsEmailSettingsLoading] = useState(true);
  const [emailSettingsError, setEmailSettingsError] = useState('');
  const [isEmailSettingsSaving, setIsEmailSettingsSaving] = useState(false);
  const [emailSettingsForm, setEmailSettingsForm] = useState({
    smtp_host: '',
    smtp_port: 587,
    smtp_username: '',
    smtp_password: '',
    sender_email: '',
    sender_display_name: '',
    is_active: true,
    imap_host: '',
    imap_port: 993,
    imap_username: '',
    imap_password: '',
    imap_use_ssl: true,
    imap_inbox_folder: 'INBOX',
    imap_is_active: false
  });
  const [isNewSettings, setIsNewSettings] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showImapPassword, setShowImapPassword] = useState(false);
  const [showAdvancedEmailSettings, setShowAdvancedEmailSettings] = useState(false);
  const [useSeparateImapCredentials, setUseSeparateImapCredentials] = useState(false);

  // --- Email List Modal State ---
  const [showEmailListModal, setShowEmailListModal] = useState(false);
  const [editEmailList, setEditEmailList] = useState([]);
  const [newEmail, setNewEmail] = useState('');
  const [emailListError, setEmailListError] = useState('');
  const [currentConfigToEdit, setCurrentConfigToEdit] = useState(null);

  // --- Sort/Filter State ---
  const [sortKey, setSortKey] = useState(null);
  const [sortDirection, setSortDirection] = useState('asc');
  const [filterText, setFilterText] = useState('');
  const [selectedGroup, setSelectedGroup] = useState('All Groups');

  // --- Subscription State ---
  const [subscriptionData, setSubscriptionData] = useState(null);
  const [isSubscriptionLoading, setIsSubscriptionLoading] = useState(true);
  const [isSubscriptionExpanded, setIsSubscriptionExpanded] = useState(false);

  // --- Fetch Logic ---
  // UPDATED: Now accepts 'isBackground' to prevent showing the loading spinner on updates
  const fetchConfigurations = async (isBackground = false) => {
    if (!isBackground) setIsLoading(true);
    setError('');
    try {
      const response = await apiRequest('/corporate-admin/customer-configurations/', 'GET');
      const groupedConfigurations = response.map(config => ({
        ...config,
        group: getGroupKey(config.global_config_key)
      }));
      setConfigurations(groupedConfigurations);
    } catch (err) {
      console.error('Failed to fetch customer configurations:', err);
      setError(`Failed to load configurations. ${err.message || 'An unexpected error occurred.'}`);
    } finally {
      if (!isBackground) setIsLoading(false);
    }
  };

  const fetchEmailSettings = async () => {
    setIsEmailSettingsLoading(true);
    setEmailSettingsError('');
    try {
      const response = await apiRequest('/corporate-admin/email-settings/', 'GET');
      if (response) {
        setEmailSettings(response);
        setEmailSettingsForm({
          smtp_host: response.smtp_host || '',
          smtp_port: response.smtp_port || 587,
          smtp_username: response.smtp_username || '',
          smtp_password: '',
          sender_email: response.sender_email || '',
          sender_display_name: response.sender_display_name || '',
          is_active: response.is_active ?? true,
          imap_host: response.imap_host || '',
          imap_port: response.imap_port || 993,
          imap_username: response.imap_username || '',
          imap_password: '',
          imap_use_ssl: response.imap_use_ssl ?? true,
          imap_inbox_folder: response.imap_inbox_folder || 'INBOX',
          imap_is_active: response.imap_is_active ?? false
        });
        setIsNewSettings(false);
        setShowAdvancedEmailSettings(false); // Collapsed if it has existing details/data
        if (response.imap_username && response.imap_username !== response.smtp_username) {
          setUseSeparateImapCredentials(true);
        }
      } else {
        setEmailSettings(null);
        setIsNewSettings(true);
        setEmailSettingsForm({
          smtp_host: '',
          smtp_port: 587,
          smtp_username: '',
          smtp_password: '',
          sender_email: '',
          sender_display_name: '',
          is_active: true
        });
        setShowAdvancedEmailSettings(true); // Expanded by default when there are no settings at all
      }
    } catch (err) {
      console.error('Failed to fetch email settings:', err);
      setEmailSettingsError(`Failed to load email settings. ${err.message || 'An unexpected error occurred.'}`);
    } finally {
      setIsEmailSettingsLoading(false);
    }
  };

  const fetchSubscription = async () => {
    setIsSubscriptionLoading(true);
    try {
      const response = await apiRequest('/corporate-admin/my-subscription', 'GET');
      setSubscriptionData(response);
    } catch (err) {
      console.error("Failed to fetch subscription details:", err);
    } finally {
      setIsSubscriptionLoading(false);
    }
  };

  useEffect(() => {
    fetchConfigurations(); // Initial load (shows spinner)
    fetchEmailSettings();
    fetchSubscription();
  }, []);

  // Handle ESC key to dismiss active modals
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (showEmailSettingsModal && !isEmailSettingsSaving) {
          setShowEmailSettingsModal(false);
        }
        if (showEmailListModal && !isSaving) {
          setShowEmailListModal(false);
          setEditEmailList([]);
          setNewEmail('');
          setEmailListError('');
          setCurrentConfigToEdit(null);
        }
        if (showQuotationBanksModal) {
          setShowQuotationBanksModal(false);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showEmailSettingsModal, showEmailListModal, showQuotationBanksModal, isEmailSettingsSaving, isSaving]);


  const handleEditClick = (config) => {
    if (isGracePeriod) {
      toast.warn("This action is disabled during your subscription's grace period.");
      return;
    }
    if (config.global_config_key === 'COMMON_COMMUNICATION_LIST') {
      setCurrentConfigToEdit(config);
      try {
        const parsed = JSON.parse(config.effective_value);
        setEditEmailList(Array.isArray(parsed) ? parsed : []);
      } catch (e) {
        setEditEmailList([]);
      }
      setShowEmailListModal(true);
    } else {
      setEditingConfigId(config.global_config_id);
      setEditValue(config.configured_value !== null ? String(config.configured_value) : String(config.global_value_default));
      setSaveError('');
    }
  };

  const handleCancelEdit = () => {
    setEditingConfigId(null);
    setEditValue('');
    setSaveError('');
    setEditEmailList([]);
  };

  // UPDATED: handleSave now accepts a second argument 'directValue' for toggles
  const handleSave = async (config, directValue = null) => {
    if (isGracePeriod) {
      toast.warn("This action is disabled during your subscription's grace period.");
      return;
    }
    setIsSaving(true);
    setSaveError('');

    let valueToSave;

    // Logic for direct toggle save (Boolean Switch)
    if (directValue !== null) {
      valueToSave = String(directValue).toLowerCase();
    }
    // Logic for standard edit mode (Input/Select)
    else if (config.global_config_key === 'COMMON_COMMUNICATION_LIST') {
      if (editEmailList.length === 0) {
        setSaveError('The communication list cannot be empty.');
        setIsSaving(false);
        return;
      }
      valueToSave = JSON.stringify(editEmailList);
    } else {
      valueToSave = editValue;
      if (config.global_unit === 'days' || config.global_unit === 'percentage' || config.global_unit === 'minutes' || config.global_unit === 'hours') {
        const parsedValue = parseFloat(editValue);
        if (isNaN(parsedValue)) {
          setSaveError('Value must be a valid number.');
          setIsSaving(false);
          return;
        }
        if (config.global_value_min !== null && parsedValue < parseFloat(config.global_value_min)) {
          setSaveError(`Value must be at least ${config.global_value_min} ${config.global_unit}.`);
          setIsSaving(false);
          return;
        }
        if (config.global_value_max !== null && parsedValue > parseFloat(config.global_value_max)) {
          setSaveError(`Value must be at most ${config.global_value_max} ${config.global_unit}.`);
          setIsSaving(false);
          return;
        }
        valueToSave = String(parsedValue);
      } else if (config.global_unit === 'boolean') {
        // Fallback validation for standard edits
        if (!['true', 'false'].includes(String(editValue).toLowerCase())) {
          setSaveError('Value must be either "true" or "false".');
          setIsSaving(false);
          return;
        }
        valueToSave = String(editValue).toLowerCase();
      } else {
        valueToSave = String(editValue);
      }
    }

    try {
      const result = await apiRequest(`/corporate-admin/customer-configurations/${config.global_config_key}`, 'PUT', {
        configured_value: valueToSave,
      });

      const readableName = config.global_config_key.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase());

      // Handle dual-control: backend returns { status: "PENDING" } when a second admin must approve
      if (result && result.status === 'PENDING') {
        toast.info(`${readableName} — change submitted for approval by a second administrator.`, { autoClose: 6000 });
      } else {
        const msg = directValue !== null
          ? `${readableName} set to ${valueToSave}!`
          : `${readableName} updated successfully!`;
        toast.success(msg);
      }

      setEditingConfigId(null);
      setEditValue('');
      setEditEmailList([]);

      // UPDATED: Trigger background refresh (keeps scroll position)
      fetchConfigurations(true);
    } catch (err) {
      console.error('Failed to save configuration:', err);
      setSaveError(err.message || 'Failed to save configuration.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleEmailSettingsChange = (e) => {
    const { name, value, type, checked } = e.target;
    const newVal = type === 'checkbox' ? checked : value;

    setEmailSettingsForm(prev => {
      const next = {
        ...prev,
        [name]: newVal,
      };

      if (name === 'sender_email') {
        const rawEmail = newVal || '';
        const trimmedEmail = rawEmail.trim();

        // If not using separate IMAP credentials, sync usernames automatically
        if (!useSeparateImapCredentials) {
          next.smtp_username = trimmedEmail;
          next.imap_username = trimmedEmail;
        }

        // Auto-detect provider preset if available
        const preset = detectEmailProvider(trimmedEmail);
        if (preset) {
          next.smtp_host = preset.smtp_host;
          next.smtp_port = preset.smtp_port;
          next.imap_host = preset.imap_host;
          next.imap_port = preset.imap_port;
          next.imap_use_ssl = preset.imap_use_ssl;
        }
      }

      return next;
    });
  };

  const handleSaveEmailSettings = async () => {
    if (isGracePeriod) {
      toast.warn("This action is disabled during your subscription's grace period.");
      return;
    }
    setIsEmailSettingsSaving(true);
    setEmailSettingsError('');

    try {
      const url = emailSettings?.id ? `/corporate-admin/email-settings/${emailSettings.id}` : '/corporate-admin/email-settings/';
      const method = emailSettings?.id ? 'PUT' : 'POST';

      const email = emailSettingsForm.sender_email?.trim() || '';
      const smtpUsername = emailSettingsForm.smtp_username?.trim() || email;
      const imapUsername = useSeparateImapCredentials
        ? (emailSettingsForm.imap_username?.trim() || email)
        : smtpUsername;

      const smtpPassword = emailSettingsForm.smtp_password ? emailSettingsForm.smtp_password : null;
      const imapPassword = useSeparateImapCredentials
        ? (emailSettingsForm.imap_password ? emailSettingsForm.imap_password : null)
        : smtpPassword;

      // Auto-fallback hosts if user left them blank
      const preset = detectEmailProvider(email);
      const smtpHost = emailSettingsForm.smtp_host?.trim() || preset?.smtp_host || 'smtp.office365.com';
      const imapHost = emailSettingsForm.imap_host?.trim() || preset?.imap_host || 'outlook.office365.com';

      const payload = {
        ...emailSettingsForm,
        sender_email: email,
        smtp_host: smtpHost,
        smtp_username: smtpUsername,
        smtp_password: smtpPassword,
        imap_host: imapHost,
        imap_username: imapUsername,
        imap_password: imapPassword,
        imap_inbox_folder: emailSettingsForm.imap_inbox_folder?.trim() || 'INBOX',
        smtp_port: parseInt(emailSettingsForm.smtp_port, 10) || preset?.smtp_port || 587,
        imap_port: parseInt(emailSettingsForm.imap_port, 10) || preset?.imap_port || 993,
      };

      const response = await apiRequest(url, method, payload);
      if (response && response.status === 'PENDING') {
        toast.info('Email settings change submitted for approval by a second administrator.', { autoClose: 6000 });
      } else {
        toast.success('Email settings saved successfully!');
      }
      setShowEmailSettingsModal(false);
      fetchEmailSettings();
    } catch (err) {
      console.error('Failed to save email settings:', err);
      setEmailSettingsError(err.message || 'Failed to save email settings.');
    } finally {
      setIsEmailSettingsSaving(false);
    }
  };

  const handleDeleteEmailSettings = async () => {
    if (isGracePeriod) {
      toast.warn("This action is disabled during your subscription's grace period.");
      return;
    }
    if (!emailSettings || !window.confirm("Are you sure you want to delete these email settings? The system will revert to using global settings.")) {
      return;
    }
    setIsEmailSettingsSaving(true);
    setEmailSettingsError('');
    try {
      const response = await apiRequest(`/corporate-admin/email-settings/${emailSettings.id}`, 'DELETE');
      if (response && response.status === 'PENDING') {
        toast.info('Email settings deletion submitted for approval by a second administrator.', { autoClose: 6000 });
      } else {
        toast.info('Email settings deleted successfully! The system will now use global settings.');
      }
      setShowEmailSettingsModal(false);
      fetchEmailSettings();
    } catch (err) {
      console.error('Failed to delete email settings:', err);
      setEmailSettingsError(err.message || 'Failed to delete email settings.');
    } finally {
      setIsEmailSettingsSaving(false);
    }
  };

  const handleAddEmail = () => {
    if (isGracePeriod) {
      toast.warn("This action is disabled during your subscription's grace period.");
      return;
    }
    const emailRegex = /^\S+@\S+\.\S+$/;
    if (newEmail && emailRegex.test(newEmail) && !editEmailList.includes(newEmail)) {
      setEditEmailList([...editEmailList, newEmail]);
      setNewEmail('');
      setEmailListError('');
    } else if (editEmailList.includes(newEmail)) {
      setEmailListError('Email is already in the list.');
    } else {
      setEmailListError('Please enter a valid email address.');
    }
  };

  const handleRemoveEmail = (emailToRemove) => {
    if (isGracePeriod) {
      toast.warn("This action is disabled during your subscription's grace period.");
      return;
    }
    setEditEmailList(editEmailList.filter(email => email !== emailToRemove));
    setEmailListError('');
  };

  const handleSaveEmailList = async () => {
    if (isGracePeriod) {
      toast.warn("This action is disabled during your subscription's grace period.");
      return;
    }
    setIsSaving(true);
    setEmailListError('');

    if (editEmailList.length === 0) {
      setEmailListError('The communication list cannot be empty.');
      setIsSaving(false);
      return;
    }

    try {
      const result = await apiRequest(`/corporate-admin/customer-configurations/${currentConfigToEdit.global_config_key}`, 'PUT', {
        configured_value: JSON.stringify(editEmailList),
      });

      const readableName = currentConfigToEdit.global_config_key.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
      if (result && result.status === 'PENDING') {
        toast.info(`${readableName} — change submitted for approval by a second administrator.`, { autoClose: 6000 });
      } else {
        toast.success(`${readableName} updated successfully!`);
      }

      setShowEmailListModal(false);
      setEditEmailList([]);
      setNewEmail('');
      setCurrentConfigToEdit(null);

      // UPDATED: Trigger background refresh (keeps scroll position)
      fetchConfigurations(true);
    } catch (err) {
      console.error('Failed to save configuration:', err);
      setEmailListError(err.message || 'Failed to save configuration.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSort = (key) => {
    if (sortKey === key) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDirection('asc');
    }
  };

  const handleFilterChange = (e) => {
    setFilterText(e.target.value);
  };

  const getSortIcon = (key) => {
    if (sortKey !== key) {
      return null;
    }
    return sortDirection === 'asc' ? <ChevronUp className="h-4 w-4 ml-1" /> : <ChevronDown className="h-4 w-4 ml-1" />;
  };

  // ... [Helpers] ...
  const getEffectiveValue = (config) => {
    if (config.global_config_key === 'COMMON_COMMUNICATION_LIST') {
      try {
        const parsed = JSON.parse(config.effective_value);
        if (Array.isArray(parsed)) {
          return parsed.join(', ');
        }
      } catch (e) {
      }
    }
    return String(config.effective_value);
  };

  const getPlaceholderText = (config) => {
    if (config.global_unit === 'boolean') return "true or false";
    if (config.global_unit === 'days') return "e.g., 30";
    if (config.global_unit === 'percentage') return "e.g., 10";
    if (config.global_unit === 'minutes') return "e.g., 60";
    if (config.global_unit === 'hours') return "e.g., 24";
    return "";
  };

  const groupedAndSortedConfigurations = useMemo(() => {
    // Build a set of active module tags from the subscription plan
    const activeModules = new Set(['quotation', 'quotations']);
    if (subscriptionData?.subscription_plan?.has_custody_module) activeModules.add('custody');
    if (subscriptionData?.subscription_plan?.has_issuance_module) activeModules.add('issuance');

    let filtered = [...configurations]
      .filter(config => {
        // Module-based filtering: null/undefined = system (always shown)
        const tags = config.global_module_tags;
        if (tags && Array.isArray(tags) && tags.length > 0) {
          // Show only if customer has at least one of the required modules
          const hasAccess = tags.some(tag => activeModules.has(tag));
          if (!hasAccess) return false;
        }
        // Existing group and text filters
        const search = filterText.toLowerCase();
        const humanizedKey = config.global_config_key.replace(/_/g, ' ').toLowerCase();
        return (
          (selectedGroup === 'All Groups' || config.group === selectedGroup) &&
          (config.global_config_key.toLowerCase().includes(search) ||
            humanizedKey.includes(search) ||
            (config.global_description && config.global_description.toLowerCase().includes(search)) ||
            (config.effective_value && String(config.effective_value).toLowerCase().includes(search)))
        );
      })
      .sort((a, b) => {
        const aHasUnit = a.global_unit !== null && a.global_unit !== undefined && a.global_unit !== '';
        const bHasUnit = b.global_unit !== null && b.global_unit !== undefined && b.global_unit !== '';

        if (aHasUnit && !bHasUnit) return -1; // 'a' has a unit, so it goes up
        if (!aHasUnit && bHasUnit) return 1;  // 'b' has a unit, so it goes up

        if (!sortKey) return 0;
        const aValue = a[sortKey];
        const bValue = b[sortKey];
        if (aValue === null || aValue === undefined) return sortDirection === 'asc' ? 1 : -1;
        if (bValue === null || bValue === undefined) return sortDirection === 'asc' ? -1 : 1;
        if (typeof aValue === 'string' && typeof bValue === 'string') {
          return sortDirection === 'asc' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
        }
        return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
      });

    // Group the filtered and sorted list
    const grouped = {};
    // Use the explicit keys from settingGroups for consistent display order
    const groupKeys = Object.keys(settingGroups);

    groupKeys.forEach(groupKey => {
      const configsInGroup = filtered.filter(config => config.group === groupKey);
      if (configsInGroup.length > 0) {
        grouped[groupKey] = configsInGroup;
      }
    });

    return grouped;
  }, [configurations, filterText, sortKey, sortDirection, selectedGroup, subscriptionData]);

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
  };

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <Loader2 className="animate-spin h-8 w-8 text-blue-600 mx-auto" />
        <p className="text-gray-600 mt-2">Loading settings...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* --- UPDATED: Subscription & Usage Section (Collapsible) --- */}
      {subscriptionData && (
        <div className="bg-white rounded-lg shadow-md border-l-4 border-blue-500 overflow-hidden transition-all duration-300">
          {/* Header - Clickable to Toggle */}
          <div
            className="p-6 flex justify-between items-center cursor-pointer hover:bg-gray-50 transition-colors"
            onClick={() => setIsSubscriptionExpanded(!isSubscriptionExpanded)}
          >
            <div>
              <h3 className="text-lg font-semibold text-gray-800 flex items-center">
                <Activity className="h-5 w-5 mr-2 text-blue-600" />
                Subscription & Usage
              </h3>
              {!isSubscriptionExpanded && (
                <p className="text-sm text-gray-500 mt-1">
                  {subscriptionData.subscription_plan.name} • <span className={subscriptionData.status === 'active' ? 'text-green-600' : 'text-red-600'}>{subscriptionData.status.toUpperCase()}</span>
                </p>
              )}
              {isSubscriptionExpanded && (
                <p className="text-sm text-gray-500 mt-1">
                  Plan: <span className="font-semibold text-gray-700">{subscriptionData.subscription_plan.name}</span>
                </p>
              )}
            </div>

            <div className="flex items-center space-x-4">
              {isSubscriptionExpanded && (
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${subscriptionData.status === 'active' ? 'bg-green-100 text-green-800' :
                  subscriptionData.status === 'grace' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'
                  }`}>
                  {subscriptionData.status.toUpperCase()}
                </span>
              )}
              {isSubscriptionExpanded ? (
                <ChevronUp className="h-5 w-5 text-gray-400" />
              ) : (
                <ChevronDown className="h-5 w-5 text-gray-400" />
              )}
            </div>
          </div>

          {/* Collapsible Content */}
          {isSubscriptionExpanded && (
            <div className="px-6 pb-6 pt-0 border-t border-gray-100 mt-2">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-4">
                {/* Period Info */}
                <div className="bg-gray-50 p-4 rounded-md">
                  <h4 className="text-sm font-semibold text-gray-600 uppercase tracking-wider mb-3 flex items-center">
                    <Calendar className="h-4 w-4 mr-2" /> Current Term
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Start Date:</span>
                      <span className="font-medium text-gray-900">{formatDate(subscriptionData.start_date)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Renewal Date:</span>
                      <span className={`font-medium ${new Date(subscriptionData.end_date) < new Date() ? 'text-red-600' : 'text-gray-900'}`}>
                        {formatDate(subscriptionData.end_date)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Usage Limits */}
                <div className="bg-gray-50 p-4 rounded-md">
                  <h4 className="text-sm font-semibold text-gray-600 uppercase tracking-wider mb-3 flex items-center">
                    <Activity className="h-4 w-4 mr-2" /> Usage Limits
                  </h4>
                  <UsageProgressBar
                    current={subscriptionData.active_user_count}
                    max={subscriptionData.subscription_plan.max_users}
                    label="Active Users"
                    icon={User}
                  />
                  <UsageProgressBar
                    current={subscriptionData.active_lg_count}
                    max={subscriptionData.subscription_plan.max_records}
                    label="Active LG Records"
                    icon={FileText}
                  />
                </div>

                {/* Plan Features */}
                <div className="bg-gray-50 p-4 rounded-md">
                  <h4 className="text-sm font-semibold text-gray-600 uppercase tracking-wider mb-3 flex items-center">
                    <Shield className="h-4 w-4 mr-2" /> Plan Features
                  </h4>
                  <div className="space-y-2">
                    <FeatureItem
                      label="Maker-Checker"
                      isEnabled={subscriptionData.subscription_plan.can_maker_checker}
                      icon={Shield}
                    />
                    <FeatureItem
                      label="Multi-Entity"
                      isEnabled={subscriptionData.subscription_plan.can_multi_entity}
                      icon={Layers}
                    />
                    <FeatureItem
                      label="AI Scan"
                      isEnabled={subscriptionData.subscription_plan.can_ai_integration}
                      icon={Cpu}
                    />
                    <FeatureItem
                      label="Doc Storage"
                      isEnabled={subscriptionData.subscription_plan.can_image_storage}
                      icon={HardDrive}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* --- Configuration Settings Section --- */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-semibold text-gray-800">Module Settings (Customer Configurations)</h2>
          <div className="flex space-x-3">
            <GracePeriodTooltip isGracePeriod={isGracePeriod}>
              <button
                onClick={() => {
                  const hasExistingData = Boolean(emailSettings?.id || emailSettingsForm.sender_email?.trim());
                  setShowAdvancedEmailSettings(!hasExistingData);
                  setShowEmailSettingsModal(true);
                }}
                className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isGracePeriod}
              >
                <Mail className="h-4 w-4 mr-2" />
                Manage Email Settings
              </button>
            </GracePeriodTooltip>
            {(customerId === 1 || customerId === "1") && (
              <GracePeriodTooltip isGracePeriod={isGracePeriod}>
                <button
                  onClick={() => setShowQuotationBanksModal(true)}
                  className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-md shadow-sm text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={isGracePeriod}
                >
                  <Building className="h-4 w-4 mr-2" />
                  Quotation Banks
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

        {/* Combined Filters */}
        <div className="mb-6 flex flex-col sm:flex-row sm:space-x-4 space-y-3 sm:space-y-0">
          <div className="flex items-center space-x-2 w-full sm:w-auto">
            <Filter className="h-5 w-5 text-gray-500" />
            <input
              type="text"
              placeholder="Filter by setting, description, or value..."
              value={filterText}
              onChange={handleFilterChange}
              className={`${inputClassNames} flex-1`}
              disabled={isGracePeriod}
            />
          </div>

          <div className="flex items-center space-x-2 w-full sm:w-auto">
            <Settings className="h-5 w-5 text-gray-500" />
            <select
              value={selectedGroup}
              onChange={(e) => setSelectedGroup(e.target.value)}
              className={`${inputClassNames} flex-1`}
              disabled={isGracePeriod}
            >
              <option value="All Groups">All Groups</option>
              {Object.keys(settingGroups).map(groupName => (
                <option key={groupName} value={groupName}>{groupName}</option>
              ))}
            </select>
          </div>
        </div>

        {Object.keys(groupedAndSortedConfigurations).length === 0 && !isLoading ? (
          <div className="bg-gray-50 p-6 rounded-lg text-center border border-gray-200">
            <p className="text-gray-500">No configurable settings found matching your filters.</p>
          </div>
        ) : (
          <div className="space-y-8">
            {Object.keys(groupedAndSortedConfigurations).map(groupName => {
              const configs = groupedAndSortedConfigurations[groupName];
              const GroupIcon = settingGroups[groupName]?.icon || Settings;
              return (
                <div key={groupName} className="border border-gray-200 rounded-lg shadow-sm">
                  <div className="bg-gray-100 px-4 py-3 rounded-t-lg flex items-center">
                    <GroupIcon className="h-5 w-5 mr-2 text-gray-600" />
                    <h3 className="text-lg font-semibold text-gray-800">{groupName} ({configs.length})</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200" style={{ tableLayout: 'fixed', width: '100%' }}>
                      <colgroup>
                        <col style={{ width: '21%' }} /> {/* Setting (3 units) */}
                        <col style={{ width: '28%' }} /> {/* Description (4 units) */}
                        <col style={{ width: '7%' }} />  {/* Min Value (1 unit) */}
                        <col style={{ width: '7%' }} />  {/* Max Value (1 unit) */}
                        <col style={{ width: '7%' }} />  {/* Default Value (1 unit) */}
                        <col style={{ width: '14%' }} /> {/* Current Value (2 units) */}
                        <col style={{ width: '7%' }} />  {/* Unit (1 unit) */}
                        <col style={{ width: '9%' }} />  {/* Actions (1 unit) */}
                      </colgroup>
                      <thead className="bg-white">
                        <tr>
                          <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer" onClick={() => handleSort('global_config_key')}>
                            <div className="flex items-center">
                              Setting
                              {getSortIcon('global_config_key')}
                            </div>
                          </th>
                          <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer" onClick={() => handleSort('global_description')}>
                            <div className="flex items-center">
                              Description
                              {getSortIcon('global_description')}
                            </div>
                          </th>
                          <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer" onClick={() => handleSort('global_value_min')}>
                            <div className="flex items-center">
                              Min Value
                              {getSortIcon('global_value_min')}
                            </div>
                          </th>
                          <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer" onClick={() => handleSort('global_value_max')}>
                            <div className="flex items-center">
                              Max Value
                              {getSortIcon('global_value_max')}
                            </div>
                          </th>
                          <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer" onClick={() => handleSort('global_value_default')}>
                            <div className="flex items-center">
                              Default Value
                              {getSortIcon('global_value_default')}
                            </div>
                          </th>
                          <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer" onClick={() => handleSort('effective_value')}>
                            <div className="flex items-center">
                              Current Value
                              {getSortIcon('effective_value')}
                            </div>
                          </th>
                          <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer" onClick={() => handleSort('global_unit')}>
                            <div className="flex items-center">
                              Unit
                              {getSortIcon('global_unit')}
                            </div>
                          </th>
                          {/* CHANGED: 'text-left' to 'text-center' for Actions header */}
                          <th scope="col" className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {configs.filter(c =>
                          // Hide weight configs from table — they're managed by the slider panel below
                          !c.global_config_key.startsWith('FACILITY_SCORE_WEIGHT_')
                        ).map((config) => {
                          // Determine if this config is a boolean and check its state
                          const isBoolean = config.global_unit === 'boolean';
                          const isChecked = String(config.effective_value).toLowerCase() === 'true';

                          return (
                            <tr key={config.global_config_id} className="hover:bg-gray-50">
                              <td className="px-3 py-2 text-sm font-medium text-gray-900">
                                {config.global_config_key.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase())}
                              </td>
                              <td className="px-3 py-2 text-sm text-gray-500 max-w-xs" title={config.global_description}>
                                {config.global_description || 'N/A'}
                              </td>
                              <td className="px-3 py-2 text-sm text-gray-500 text-center">
                                {config.global_value_min !== null ? config.global_value_min : 'N/A'}
                              </td>
                              <td className="px-3 py-2 text-sm text-gray-500 text-center">
                                {config.global_value_max !== null ? config.global_value_max : 'N/A'}
                              </td>
                              <td className="px-3 py-2 text-sm text-gray-500 text-center">
                                {config.global_value_default !== null ? config.global_value_default : 'N/A'}
                              </td>

                              {/* --- Current Value Column (Always Text) --- */}
                              <td className="px-3 py-2 text-sm text-gray-900 text-center">
                                {editingConfigId === config.global_config_id && config.global_config_key !== 'COMMON_COMMUNICATION_LIST' && !isBoolean ? (
                                  /* EDIT MODE (TEXT INPUT) - Only for non-boolean */
                                  <input
                                    type="text"
                                    value={editValue}
                                    onChange={(e) => setEditValue(e.target.value)}
                                    className={`${inputClassNames} w-24 text-center`}
                                    placeholder={getPlaceholderText(config)}
                                    autoFocus
                                    disabled={isGracePeriod}
                                  />
                                ) : (
                                  /* VIEW MODE (TEXT) - For ALL types, including boolean */
                                  <span className={`font-semibold ${isBoolean ? (isChecked ? 'text-green-600' : 'text-red-600') : ''}`}>
                                    {getEffectiveValue(config)}
                                  </span>
                                )}
                              </td>

                              <td className="px-3 py-2 text-sm text-gray-500 text-center">
                                {config.global_unit || 'N/A'}
                              </td>

                              {/* --- Actions Column (Edit Btn OR Toggle) --- */}
                              {/* CHANGED: 'text-right' to 'text-center' to center content in cell */}
                              <td className="px-3 py-2 text-center text-sm font-medium">
                                {editingConfigId === config.global_config_id && config.global_config_key !== 'COMMON_COMMUNICATION_LIST' ? (
                                  /* SAVE/CANCEL Buttons (Only for non-booleans in edit mode) */
                                  /* CHANGED: 'justify-end' to 'justify-center' */
                                  <div className="flex items-center justify-center space-x-1">
                                    <GracePeriodTooltip isGracePeriod={isGracePeriod}>
                                      <button
                                        type="button"
                                        onClick={() => handleSave(config)}
                                        className={`${buttonBaseClassNames} bg-green-600 text-white hover:bg-green-700 ${isSaving || isGracePeriod ? 'opacity-50 cursor-not-allowed' : ''}`}
                                        disabled={isSaving || isGracePeriod}
                                      >
                                        {isSaving ? <Loader2 className="animate-spin h-4 w-4" /> : <Save className="h-4 w-4" />}
                                      </button>
                                    </GracePeriodTooltip>
                                    <button
                                      type="button"
                                      onClick={handleCancelEdit}
                                      className={`${buttonBaseClassNames} bg-gray-200 text-gray-700 hover:bg-gray-300 ${isSaving ? 'opacity-50 cursor-not-allowed' : ''}`}
                                      disabled={isSaving}
                                    >
                                      <XCircle className="h-4 w-4" />
                                    </button>
                                  </div>
                                ) : isBoolean ? (
                                  /* TOGGLE SWITCH - For Boolean types (Replaces Edit Button) */
                                  /* CHANGED: 'justify-end' to 'justify-center' */
                                  <div className="flex justify-center">
                                    <GracePeriodTooltip isGracePeriod={isGracePeriod}>
                                      <ToggleSwitch
                                        checked={isChecked}
                                        onChange={() => handleSave(config, !isChecked)}
                                        disabled={isGracePeriod || isSaving}
                                      />
                                    </GracePeriodTooltip>
                                  </div>
                                ) : (
                                  /* EDIT BUTTON - For Non-Boolean types */
                                  /* CONDITION UPDATED: && config.global_unit - if unit is null/missing, button is hidden */
                                  config.global_unit && (
                                    <GracePeriodTooltip isGracePeriod={isGracePeriod}>
                                      <button
                                        type="button"
                                        onClick={() => handleEditClick(config)}
                                        /* UPDATED: px-4 for wider button */
                                        className="inline-flex items-center justify-center px-4 py-1 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                        disabled={isGracePeriod}
                                      >
                                        <Edit className="h-4 w-4" />
                                      </button>
                                    </GracePeriodTooltip>
                                  )
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Linked Weight Editor — only for Issuance & Facilities group */}
                  {groupName === 'Issuance & Facilities' && (() => {
                    const WEIGHT_DEFS = [
                      { label: 'Cost', color: '#3b82f6', key: 'FACILITY_SCORE_WEIGHT_COST', urgentKey: 'FACILITY_SCORE_WEIGHT_URGENT_COST', desc: 'Commission & fees' },
                      { label: 'Margin', color: '#8b5cf6', key: 'FACILITY_SCORE_WEIGHT_MARGIN', urgentKey: 'FACILITY_SCORE_WEIGHT_URGENT_MARGIN', desc: 'Cash margin impact' },
                      { label: 'SLA', color: '#f59e0b', key: 'FACILITY_SCORE_WEIGHT_SLA', urgentKey: 'FACILITY_SCORE_WEIGHT_URGENT_SLA', desc: 'Bank turnaround' },
                      { label: 'Capacity', color: '#10b981', key: 'FACILITY_SCORE_WEIGHT_CAPACITY', urgentKey: 'FACILITY_SCORE_WEIGHT_URGENT_CAPACITY', desc: 'Available headroom' },
                      { label: 'Currency', color: '#ec4899', key: 'FACILITY_SCORE_WEIGHT_CURRENCY_MATCH', urgentKey: 'FACILITY_SCORE_WEIGHT_URGENT_CURRENCY_MATCH', desc: 'FX match bonus' },
                    ];

                    const getVal = (cfgKey) => {
                      const c = configs.find(x => x.global_config_key === cfgKey);
                      return c ? parseFloat(c.effective_value || c.global_value_default || 0) : 0;
                    };

                    // Render a weight editor panel for one weight set (Normal or Urgent)
                    const WeightPanel = ({ title, keyProp }) => {
                      const [editing, setEditing] = React.useState(false);
                      const [saving, setSaving] = React.useState(false);
                      const [weights, setWeights] = React.useState(() =>
                        WEIGHT_DEFS.map(w => ({ ...w, val: getVal(w[keyProp]) }))
                      );

                      // Sync from configs when not editing
                      React.useEffect(() => {
                        if (!editing) {
                          setWeights(WEIGHT_DEFS.map(w => ({ ...w, val: getVal(w[keyProp]) })));
                        }
                      }, [configs, editing]);

                      const total = weights.reduce((s, w) => s + w.val, 0);
                      const isBalanced = total === 100;

                      // Simple: set one value (snapped to nearest 5), no redistribution
                      const snap5 = (v) => Math.round(v / 5) * 5;
                      const handleChange = (idx, newVal) => {
                        newVal = Math.max(0, Math.min(100, snap5(newVal || 0)));
                        setWeights(prev => prev.map((w, i) => i === idx ? { ...w, val: newVal } : w));
                      };

                      // Balance: proportionally scale all values to sum to 100 (in steps of 5)
                      const handleBalance = () => {
                        if (total === 0) {
                          setWeights(prev => prev.map(w => ({ ...w, val: 20 })));
                          return;
                        }
                        const scale = 100 / total;
                        const updated = weights.map(w => ({ ...w, val: snap5(w.val * scale) }));
                        // Fix rounding error on the largest weight
                        const newTotal = updated.reduce((s, w) => s + w.val, 0);
                        if (newTotal !== 100) {
                          const largest = updated.reduce((best, w, i) => w.val > updated[best].val ? i : best, 0);
                          updated[largest].val += (100 - newTotal);
                        }
                        setWeights(updated);
                      };

                      const handleSave = async () => {
                        if (!isBalanced) {
                          toast.warn('Weights must sum to exactly 100% before saving. Use the Balance button.');
                          return;
                        }
                        setSaving(true);
                        try {
                          let hasPending = false;
                          for (const w of weights) {
                            const result = await apiRequest(`/corporate-admin/customer-configurations/${w[keyProp]}`, 'PUT', {
                              configured_value: String(w.val),
                            });
                            if (result && result.status === 'PENDING') hasPending = true;
                          }
                          if (hasPending) {
                            toast.info(`${title.replace(/[⚖️🚨]/g, '').trim()} — changes submitted for approval by a second administrator.`, { autoClose: 6000 });
                          } else {
                            toast.success(`${title.replace(/[⚖️🚨]/g, '').trim()} weights saved!`);
                          }
                          setEditing(false);
                          fetchConfigurations(true);
                        } catch (err) {
                          toast.error(`Failed to save weights: ${err.message}`);
                        } finally {
                          setSaving(false);
                        }
                      };

                      const handleCancel = () => {
                        setWeights(WEIGHT_DEFS.map(w => ({ ...w, val: getVal(w[keyProp]) })));
                        setEditing(false);
                      };

                      const totalColor = isBalanced
                        ? 'bg-green-100 text-green-700 border-green-300'
                        : total > 90 && total < 110
                        ? 'bg-yellow-100 text-yellow-700 border-yellow-300'
                        : 'bg-red-100 text-red-700 border-red-300';

                      return (
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-semibold text-gray-700">{title}</span>
                            {!editing ? (
                              <button
                                onClick={() => setEditing(true)}
                                disabled={isGracePeriod}
                                className="text-xs px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 font-medium"
                              >
                                <Edit className="h-3 w-3 inline mr-1" />Edit Weights
                              </button>
                            ) : (
                              <div className="flex gap-2 items-center">
                                <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${totalColor}`}>
                                  {total}%
                                </span>
                                {!isBalanced && (
                                  <button onClick={handleBalance} className="text-xs px-2 py-1 bg-amber-500 text-white rounded-md hover:bg-amber-600 font-medium">
                                    Balance to 100%
                                  </button>
                                )}
                                <button
                                  onClick={handleSave}
                                  disabled={saving || !isBalanced}
                                  className="text-xs px-3 py-1 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 font-medium"
                                  title={!isBalanced ? 'Balance to 100% first' : ''}
                                >
                                  {saving ? <Loader2 className="h-3 w-3 inline animate-spin mr-1" /> : <Save className="h-3 w-3 inline mr-1" />}
                                  Save
                                </button>
                                <button onClick={handleCancel} disabled={saving} className="text-xs px-2 py-1 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 font-medium">
                                  Cancel
                                </button>
                              </div>
                            )}
                          </div>

                          {/* Color distribution bar — always visible */}
                          <div className="flex h-6 rounded-lg overflow-hidden bg-gray-100 shadow-inner mb-2">
                            {weights.map((seg, i) => {
                              const pct = total > 0 ? (seg.val / total) * 100 : 20;
                              return (
                                <div
                                  key={i}
                                  style={{ width: `${pct}%`, backgroundColor: seg.color }}
                                  className="flex items-center justify-center transition-all duration-200"
                                  title={`${seg.label}: ${seg.val}%`}
                                >
                                  {pct > 10 && <span className="text-[10px] font-bold text-white drop-shadow">{seg.val}%</span>}
                                </div>
                              );
                            })}
                          </div>

                          {/* Edit mode: number inputs per weight */}
                          {editing ? (
                            <div className="grid grid-cols-5 gap-2">
                              {weights.map((w, i) => (
                                <div key={i} className="text-center">
                                  <div className="flex items-center justify-center gap-1 mb-1">
                                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: w.color }} />
                                    <span className="text-[11px] font-semibold text-gray-700">{w.label}</span>
                                  </div>
                                  <input
                                    type="number"
                                    min="0" max="100" step="5"
                                    value={w.val}
                                    onChange={e => handleChange(i, parseInt(e.target.value, 10))}
                                    className="w-full text-sm text-center border border-gray-300 rounded-md px-1 py-1.5 font-bold focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                  />
                                  <span className="text-[9px] text-gray-400">{w.desc}</span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            /* Read-only legend */
                            <div className="flex gap-3">
                              {weights.map((seg, i) => (
                                <div key={i} className="flex items-center gap-1">
                                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: seg.color }} />
                                  <span className="text-[10px] text-gray-500">{seg.label}: {seg.val}%</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    };

                    return (
                      <div className="px-4 py-4 bg-gray-50 border-t border-gray-200 rounded-b-lg">
                        <div className="flex gap-8">
                          <WeightPanel title="⚖️ Normal Requests" keyProp="key" />
                          <WeightPanel title="🚨 Urgent Requests" keyProp="urgentKey" />
                        </div>
                      </div>
                    );
                  })()}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modals */}
      {
        showQuotationBanksModal && (
          <QuotationBanksModal
            onClose={() => setShowQuotationBanksModal(false)}
          />
        )
      }
      {
        showEmailListModal && (
          <div 
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 md:p-6 z-50 animate-fadeIn"
            onClick={(e) => {
              if (e.target === e.currentTarget && !isSaving) {
                setShowEmailListModal(false);
                setEditEmailList([]);
                setNewEmail('');
                setEmailListError('');
                setCurrentConfigToEdit(null);
              }
            }}
          >
            <div className="relative bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] flex flex-col overflow-hidden border border-slate-200">
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/80">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                    <Mail className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-900 tracking-tight">
                      Edit {currentConfigToEdit?.global_config_key.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase())}
                    </h3>
                    <p className="text-xs text-slate-500 line-clamp-1">{currentConfigToEdit?.global_description}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowEmailListModal(false);
                    setEditEmailList([]);
                    setNewEmail('');
                    setEmailListError('');
                    setCurrentConfigToEdit(null);
                  }}
                  disabled={isSaving}
                  className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-full transition-colors focus:outline-none"
                  title="Close (Esc)"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Body */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {emailListError && (
                  <div className="bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-xl text-xs flex items-center gap-2" role="alert">
                    <AlertCircle className="h-4 w-4 flex-shrink-0" />
                    <span>{emailListError}</span>
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Configured Email Recipients</label>
                  <div className={`min-h-[60px] max-h-48 overflow-y-auto border border-slate-200 bg-slate-50/50 rounded-xl p-3 flex flex-wrap gap-2 ${isGracePeriod ? 'opacity-50' : ''}`}>
                    {editEmailList.length === 0 ? (
                      <span className="text-xs text-slate-400 italic py-2">No email recipients added yet.</span>
                    ) : (
                      editEmailList.map((email, index) => (
                        <span key={index} className="inline-flex items-center text-xs font-semibold bg-blue-100/80 text-blue-900 rounded-lg py-1 pl-2.5 pr-1.5 border border-blue-200/60">
                          {email}
                          <button 
                            type="button" 
                            onClick={() => handleRemoveEmail(email)} 
                            className="ml-1.5 p-0.5 text-blue-500 hover:text-rose-600 hover:bg-blue-200/50 rounded transition-colors" 
                            disabled={isGracePeriod}
                            title="Remove recipient"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </span>
                      ))
                    )}
                  </div>
                </div>

                <div className={`space-y-1.5 ${isGracePeriod ? 'opacity-50' : ''}`}>
                  <label className="text-xs font-bold text-slate-700">Add New Recipient</label>
                  <div className="flex gap-2">
                    <input
                      type="email"
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddEmail();
                        }
                      }}
                      className={`${inputClassNames} flex-1`}
                      placeholder="e.g. treasury.team@company.com"
                      disabled={isGracePeriod}
                    />
                    <GracePeriodTooltip isGracePeriod={isGracePeriod}>
                      <button
                        type="button"
                        onClick={handleAddEmail}
                        className="inline-flex items-center px-4 py-2 text-xs font-bold rounded-xl text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={isGracePeriod}
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        <span>Add</span>
                      </button>
                    </GracePeriodTooltip>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/90 flex justify-between items-center">
                <button
                  type="button"
                  onClick={() => {
                    setShowEmailListModal(false);
                    setEditEmailList([]);
                    setNewEmail('');
                    setEmailListError('');
                    setCurrentConfigToEdit(null);
                  }}
                  className="px-4 py-2 text-xs font-bold rounded-xl text-slate-700 bg-slate-200 hover:bg-slate-300 transition-colors disabled:opacity-50"
                  disabled={isSaving}
                >
                  Cancel (Esc)
                </button>
                <GracePeriodTooltip isGracePeriod={isGracePeriod}>
                  <button
                    type="button"
                    onClick={handleSaveEmailList}
                    className="px-5 py-2 text-xs font-bold rounded-xl text-white bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-200 flex items-center gap-1.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={isSaving || isGracePeriod}
                  >
                    {isSaving ? <Loader2 className="animate-spin h-4 w-4" /> : <Save className="h-4 w-4" />}
                    <span>Save List</span>
                  </button>
                </GracePeriodTooltip>
              </div>
            </div>
          </div>
        )
      }

      {
        showEmailSettingsModal && (
          <div 
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 md:p-6 z-50 animate-fadeIn"
            onClick={(e) => {
              if (e.target === e.currentTarget && !isEmailSettingsSaving) {
                setShowEmailSettingsModal(false);
              }
            }}
          >
            <div className="relative bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-slate-200">
              
              {/* Modal Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/80">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
                    <Mail className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-900 tracking-tight">Company Mailbox & Smart Inbox</h3>
                    <p className="text-xs text-slate-500">Connect your corporate email for notifications and smart inbound processing</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowEmailSettingsModal(false)}
                  disabled={isEmailSettingsSaving}
                  className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-full transition-colors focus:outline-none"
                  title="Close (Esc)"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Modal Scrollable Body */}
              <div className="flex-1 overflow-y-auto p-6 space-y-5">
                {isEmailSettingsLoading ? (
                  <div className="text-center py-12">
                    <Loader2 className="animate-spin h-8 w-8 text-indigo-600 mx-auto" />
                    <p className="text-xs font-semibold text-slate-500 mt-2">Loading email configurations...</p>
                  </div>
                ) : (
                  <form className={`space-y-5 ${isGracePeriod ? 'opacity-50 pointer-events-none' : ''}`}>
                    {emailSettingsError && (
                      <div className="bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-xl text-xs flex items-center gap-2" role="alert">
                        <AlertCircle className="h-4 w-4 flex-shrink-0" />
                        <span>{emailSettingsError}</span>
                      </div>
                    )}

                    {/* MAIN SECTION: 3 CORE INPUTS */}
                    <div className="space-y-4">
                      {/* Row 1: Email Address & Sender Name */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <label htmlFor="sender_email" className={labelClassNames}>Company Email Address</label>
                            {(() => {
                              const preset = detectEmailProvider(emailSettingsForm.sender_email);
                              return preset ? (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-indigo-600 bg-indigo-50 border border-indigo-200/60 px-2 py-0.5 rounded-full">
                                  <Sparkles className="h-2.5 w-2.5" />
                                  {preset.name}
                                </span>
                              ) : null;
                            })()}
                          </div>
                          <input
                            type="email"
                            id="sender_email"
                            name="sender_email"
                            value={emailSettingsForm.sender_email}
                            onChange={handleEmailSettingsChange}
                            placeholder="e.g. treasury@company.com"
                            className={inputClassNames}
                            required
                            disabled={isGracePeriod}
                          />
                          <p className="text-[11px] text-slate-400 mt-1">Used as your default sender & inbox login</p>
                        </div>

                        <div>
                          <label htmlFor="sender_display_name" className={`${labelClassNames} mb-1`}>Sender Display Name (Optional)</label>
                          <input
                            type="text"
                            id="sender_display_name"
                            name="sender_display_name"
                            value={emailSettingsForm.sender_display_name}
                            onChange={handleEmailSettingsChange}
                            placeholder="e.g. Grow Business Treasury"
                            className={inputClassNames}
                            disabled={isGracePeriod}
                          />
                          <p className="text-[11px] text-slate-400 mt-1">Name visible to recipients in email headers</p>
                        </div>
                      </div>

                      {/* Row 2: Mailbox Password / App Password */}
                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <label htmlFor="smtp_password" className={labelClassNames}>
                            Mailbox / App Password {isNewSettings ? '' : '(Leave blank to keep existing)'}
                          </label>
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800"
                            disabled={isGracePeriod}
                          >
                            {showPassword ? 'Hide' : 'Show'}
                          </button>
                        </div>
                        <input
                          type={showPassword ? "text" : "password"}
                          id="smtp_password"
                          name="smtp_password"
                          value={emailSettingsForm.smtp_password}
                          onChange={handleEmailSettingsChange}
                          placeholder={isNewSettings ? "Enter password or App Password" : "••••••••••••••••"}
                          className={inputClassNames}
                          {...(isNewSettings ? { required: true } : {})}
                          disabled={isGracePeriod}
                        />
                        <p className="text-[11px] text-slate-400 mt-1">
                          For Gmail/Yahoo/Outlook 2FA accounts, generate an <strong>App Password</strong> in your provider's security settings.
                        </p>
                      </div>

                      {/* Row 3: Active Service Switches */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                        {/* Outbound SMTP Toggle Card */}
                        <div 
                          onClick={() => {
                            if (!isGracePeriod) {
                              setEmailSettingsForm(prev => ({ ...prev, is_active: !prev.is_active }));
                            }
                          }}
                          className={`p-3.5 rounded-xl border transition-all cursor-pointer select-none flex items-start justify-between gap-3 ${
                            emailSettingsForm.is_active 
                              ? 'bg-indigo-50/40 border-indigo-200' 
                              : 'bg-slate-50 border-slate-200 opacity-60'
                          }`}
                        >
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-black text-slate-900">Outbound Emails</span>
                              <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${emailSettingsForm.is_active ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-200 text-slate-600'}`}>
                                SMTP
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-500 mt-0.5">Send alerts & reminders from this email</p>
                          </div>
                          <input
                            type="checkbox"
                            checked={emailSettingsForm.is_active}
                            onChange={(e) => {
                              e.stopPropagation();
                              setEmailSettingsForm(prev => ({ ...prev, is_active: e.target.checked }));
                            }}
                            className="h-4 w-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500 mt-0.5"
                            disabled={isGracePeriod}
                          />
                        </div>

                        {/* Inbound IMAP Toggle Card */}
                        <div 
                          onClick={() => {
                            if (!isGracePeriod) {
                              setEmailSettingsForm(prev => ({ ...prev, imap_is_active: !prev.imap_is_active }));
                            }
                          }}
                          className={`p-3.5 rounded-xl border transition-all cursor-pointer select-none flex items-start justify-between gap-3 ${
                            emailSettingsForm.imap_is_active 
                              ? 'bg-indigo-50/40 border-indigo-200' 
                              : 'bg-slate-50 border-slate-200 opacity-60'
                          }`}
                        >
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-black text-slate-900">Smart Inbox Polling</span>
                              <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${emailSettingsForm.imap_is_active ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-200 text-slate-600'}`}>
                                IMAP
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-500 mt-0.5">Auto-parse incoming guarantee emails</p>
                          </div>
                          <input
                            type="checkbox"
                            checked={emailSettingsForm.imap_is_active}
                            onChange={(e) => {
                              e.stopPropagation();
                              setEmailSettingsForm(prev => ({ ...prev, imap_is_active: e.target.checked }));
                            }}
                            className="h-4 w-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500 mt-0.5"
                            disabled={isGracePeriod}
                          />
                        </div>
                      </div>
                    </div>

                    {/* SECTION 4: ADVANCED SERVER SETTINGS ACCORDION (COLLAPSED BY DEFAULT) */}
                    <div className="pt-2 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => setShowAdvancedEmailSettings(!showAdvancedEmailSettings)}
                        className="w-full flex items-center justify-between py-2 text-xs font-bold text-slate-600 hover:text-slate-900 transition-colors focus:outline-none"
                      >
                        <span className="flex items-center gap-1.5">
                          <Sliders className="h-3.5 w-3.5 text-slate-500" />
                          Advanced Server Settings (Hosts, Custom Ports & Separate Logins)
                        </span>
                        {showAdvancedEmailSettings ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
                      </button>

                      {showAdvancedEmailSettings && (
                        <div className="mt-3 p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-4 animate-fadeIn">
                          {/* SMTP Server Details */}
                          <div className="space-y-2">
                            <h5 className="text-[11px] font-black uppercase tracking-wider text-slate-600">Outbound SMTP Server</h5>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                              <div className="sm:col-span-2">
                                <label htmlFor="smtp_host" className="block text-[11px] font-semibold text-slate-600 mb-0.5">SMTP Host</label>
                                <input
                                  type="text"
                                  id="smtp_host"
                                  name="smtp_host"
                                  value={emailSettingsForm.smtp_host}
                                  onChange={handleEmailSettingsChange}
                                  placeholder="e.g. smtp.mail.yahoo.com"
                                  className={inputClassNames}
                                  disabled={isGracePeriod}
                                />
                              </div>
                              <div>
                                <label htmlFor="smtp_port" className="block text-[11px] font-semibold text-slate-600 mb-0.5">SMTP Port</label>
                                <input
                                  type="number"
                                  id="smtp_port"
                                  name="smtp_port"
                                  value={emailSettingsForm.smtp_port}
                                  onChange={handleEmailSettingsChange}
                                  placeholder="587 or 465"
                                  className={inputClassNames}
                                  disabled={isGracePeriod}
                                />
                              </div>
                            </div>
                          </div>

                          {/* IMAP Server Details */}
                          <div className="space-y-2 pt-2 border-t border-slate-200/60">
                            <h5 className="text-[11px] font-black uppercase tracking-wider text-slate-600">Inbound IMAP Server</h5>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                              <div className="sm:col-span-2">
                                <label htmlFor="imap_host" className="block text-[11px] font-semibold text-slate-600 mb-0.5">IMAP Host</label>
                                <input
                                  type="text"
                                  id="imap_host"
                                  name="imap_host"
                                  value={emailSettingsForm.imap_host}
                                  onChange={handleEmailSettingsChange}
                                  placeholder="e.g. imap.mail.yahoo.com"
                                  className={inputClassNames}
                                  disabled={isGracePeriod}
                                />
                              </div>
                              <div>
                                <label htmlFor="imap_port" className="block text-[11px] font-semibold text-slate-600 mb-0.5">IMAP Port</label>
                                <input
                                  type="number"
                                  id="imap_port"
                                  name="imap_port"
                                  value={emailSettingsForm.imap_port}
                                  onChange={handleEmailSettingsChange}
                                  placeholder="993"
                                  className={inputClassNames}
                                  disabled={isGracePeriod}
                                />
                              </div>
                            </div>
                          </div>

                          {/* Separate Credentials Toggle */}
                          <div className="pt-2 border-t border-slate-200/60">
                            <label className="flex items-center gap-2 cursor-pointer select-none mb-2">
                              <input
                                type="checkbox"
                                checked={useSeparateImapCredentials}
                                onChange={(e) => setUseSeparateImapCredentials(e.target.checked)}
                                className="h-3.5 w-3.5 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500"
                                disabled={isGracePeriod}
                              />
                              <span className="text-[11px] font-bold text-slate-700">Use separate username/password for Inbound IMAP</span>
                            </label>

                            {useSeparateImapCredentials && (
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-white rounded-lg border border-slate-200 mt-2">
                                <div>
                                  <label htmlFor="imap_username" className="block text-[11px] font-semibold text-slate-600 mb-0.5">IMAP Username</label>
                                  <input
                                    type="text"
                                    id="imap_username"
                                    name="imap_username"
                                    value={emailSettingsForm.imap_username}
                                    onChange={handleEmailSettingsChange}
                                    placeholder="e.g. inbox@company.com"
                                    className={inputClassNames}
                                    disabled={isGracePeriod}
                                  />
                                </div>
                                <div>
                                  <label htmlFor="imap_password" className="block text-[11px] font-semibold text-slate-600 mb-0.5">IMAP Password</label>
                                  <input
                                    type="password"
                                    id="imap_password"
                                    name="imap_password"
                                    value={emailSettingsForm.imap_password}
                                    onChange={handleEmailSettingsChange}
                                    placeholder="Separate IMAP password"
                                    className={inputClassNames}
                                    disabled={isGracePeriod}
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </form>
                )}
              </div>

              {/* Modal Pinned Footer */}
              <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/90 flex justify-between items-center">
                <button
                  type="button"
                  onClick={() => setShowEmailSettingsModal(false)}
                  className="px-4 py-2 text-xs font-bold rounded-xl text-slate-700 bg-slate-200 hover:bg-slate-300 transition-colors disabled:opacity-50"
                  disabled={isEmailSettingsSaving}
                >
                  Cancel (Esc)
                </button>

                <div className="flex items-center gap-2">
                  {emailSettings && (
                    <GracePeriodTooltip isGracePeriod={isGracePeriod}>
                      <button
                        type="button"
                        onClick={handleDeleteEmailSettings}
                        className="px-3.5 py-2 text-xs font-bold rounded-xl text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-colors flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={isEmailSettingsSaving || isGracePeriod}
                        title="Delete Custom Email Settings"
                      >
                        <Trash2 className="h-4 w-4" />
                        <span>Delete</span>
                      </button>
                    </GracePeriodTooltip>
                  )}

                  <GracePeriodTooltip isGracePeriod={isGracePeriod}>
                    <button
                      type="button"
                      onClick={handleSaveEmailSettings}
                      className="px-5 py-2 text-xs font-bold rounded-xl text-white bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-200 flex items-center gap-1.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={isEmailSettingsSaving || isGracePeriod}
                    >
                      {isEmailSettingsSaving ? (
                        <>
                          <Loader2 className="animate-spin h-4 w-4" />
                          <span>Saving...</span>
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4" />
                          <span>Save Email Settings</span>
                        </>
                      )}
                    </button>
                  </GracePeriodTooltip>
                </div>
              </div>

            </div>
          </div>
        )
      }



      {showQuotationBanksModal && (
        <QuotationBanksModal
          isOpen={showQuotationBanksModal}
          onClose={() => setShowQuotationBanksModal(false)}
        />
      )}
    </div >
  );
}

export default CustomerConfigurationManagementPage;