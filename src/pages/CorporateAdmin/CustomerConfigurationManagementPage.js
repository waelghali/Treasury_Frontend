import React, { useState, useEffect, useMemo } from 'react';
import { apiRequest } from 'services/apiService.js';
import { Edit, Save, AlertCircle, Mail, Trash2, Globe, Plus, Filter, ChevronDown, ChevronUp, Loader2, Activity, Calendar, User, FileText, CheckCircle, XCircle, Shield, Layers, Cpu, HardDrive, Settings, Clock, Server, Lock, MessageSquare, FileCheck } from 'lucide-react';
import { toast } from 'react-toastify';

// --- REVISED: Configuration Groupings Mapping ---
const settingGroups = {
    'Security & Authentication': { icon: Lock },
    'System Limits & Timers': { icon: Clock },
    'Communication & Alerts': { icon: MessageSquare },
    'Document Compliance & Requirements': { icon: FileCheck },
    'General': { icon: Settings }
};

// Helper function to dynamically determine a config's group based on keywords
const getGroupKey = (configKey) => {
    const key = configKey.toUpperCase();
    
    // Group 1: Security & Authentication
    if (key.includes('PASSWORD') || key.includes('AUTH') || key.includes('LOCKOUT') || key.includes('LOGIN') || key.includes('ENFORCE') || key.includes('ACCOUNT_LOCKOUT') || key.includes('SESSION')) {
        return 'Security & Authentication';
    }

    // Group 2: System Limits & Timers
    if (key.includes('TIMEOUT') || key.includes('IDLE') || key.includes('EXPIRY') || key.includes('DURATION') || key.includes('FREQUENCY') || key.includes('RETENTION') || key.includes('MAX') || key.includes('LIMIT') || key.includes('COUNT')) {
        return 'System Limits & Timers';
    }
    
    // Group 3: Communication & Alerts
    if (key.includes('EMAIL') || key.includes('COMMUNICATION') || key.includes('NOTIFICATION') || key.includes('SENDER') || key.includes('SMS')) {
        return 'Communication & Alerts';
    }

    // Group 4: Document Compliance & Requirements
    if (key.includes('REQUIRED') || key.includes('MANDATORY') || key.includes('OPTIONAL') || key.includes('DOC') || key.includes('ATTACHMENT') || key.includes('FILE')) {
        return 'Document Compliance & Requirements';
    }

    // Default Group
    return 'General';
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
                        <polygon className="fill-current" points="0,0 127.5,127.5 255,0"/>
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

function CustomerConfigurationManagementPage({ onLogout, isGracePeriod }) { 
  // --- Existing State ---
  const [configurations, setConfigurations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [editingConfigId, setEditingConfigId] = useState(null);
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
    is_active: true
  });
  const [isNewSettings, setIsNewSettings] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

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
          smtp_host: response.smtp_host,
          smtp_port: response.smtp_port,
          smtp_username: response.smtp_username,
          smtp_password: '', 
          sender_email: response.sender_email,
          sender_display_name: response.sender_display_name || '',
          is_active: response.is_active,
        });
        setIsNewSettings(false);
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
      await apiRequest(`/corporate-admin/customer-configurations/${config.global_config_key}`, 'PUT', {
        configured_value: valueToSave,
      });
      
      const readableName = config.global_config_key.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
      const msg = directValue !== null 
        ? `${readableName} set to ${valueToSave}!`
        : `${readableName} updated successfully!`;

      toast.success(msg);
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
    setEmailSettingsForm(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
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

      const payload = emailSettingsForm.smtp_password 
        ? emailSettingsForm 
        : { ...emailSettingsForm, smtp_password: null };

      await apiRequest(url, method, payload);
      toast.success('Email settings saved successfully!');
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
      await apiRequest(`/corporate-admin/email-settings/${emailSettings.id}`, 'DELETE');
      toast.info('Email settings deleted successfully! The system will now use global settings.');
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
      await apiRequest(`/corporate-admin/customer-configurations/${currentConfigToEdit.global_config_key}`, 'PUT', {
        configured_value: JSON.stringify(editEmailList),
      });
      toast.success(`Configuration "${currentConfigToEdit.global_config_key.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase())}" updated successfully!`);
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
    let filtered = [...configurations]
        .filter(config => 
            (selectedGroup === 'All Groups' || config.group === selectedGroup) && // Group Filter
            (config.global_config_key.toLowerCase().includes(filterText.toLowerCase()) ||
            (config.global_description && config.global_description.toLowerCase().includes(filterText.toLowerCase())) ||
            (config.effective_value && String(config.effective_value).toLowerCase().includes(filterText.toLowerCase()))) // Text Filter
        )
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
  }, [configurations, filterText, sortKey, sortDirection, selectedGroup]);

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
                 <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                    subscriptionData.status === 'active' ? 'bg-green-100 text-green-800' : 
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
          <GracePeriodTooltip isGracePeriod={isGracePeriod}>
              <button
                onClick={() => setShowEmailSettingsModal(true)}
                className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isGracePeriod}
              >
                <Mail className="h-4 w-4 mr-2" />
                Manage Email Settings
              </button>
          </GracePeriodTooltip>
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
                                    {configs.map((config) => {
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
                    </div>
                );
            })}
          </div>
        )}
      </div>
      
      {/* Modals */}
      {showEmailListModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full flex items-center justify-center z-50">
          <div className="relative bg-white p-6 rounded-lg shadow-xl max-w-md w-full">
            <h3 className="text-xl font-semibold mb-4 text-gray-800">
              Edit {currentConfigToEdit?.global_config_key.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase())}
            </h3>
            
            <p className="text-sm text-gray-600 mb-4">{currentConfigToEdit?.global_description}</p>
            
            {emailListError && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-md relative mb-4 flex items-center" role="alert">
                <AlertCircle className="h-5 w-5 mr-2" />
                <span className="block sm:inline">{emailListError}</span>
              </div>
            )}
            
            <div className={`border border-gray-300 rounded-md p-3 flex flex-wrap gap-2 mb-4 ${isGracePeriod ? 'opacity-50' : ''}`}>
              {editEmailList.map((email, index) => (
                <span key={index} className="inline-flex items-center text-sm font-medium bg-blue-100 text-blue-800 rounded-full py-1 pl-3 pr-2">
                  {email}
                  <button type="button" onClick={() => handleRemoveEmail(email)} className="ml-2 text-blue-500 hover:text-blue-700" disabled={isGracePeriod}>
                    <XCircle className="h-4 w-4" />
                  </button>
                </span>
              ))}
            </div>

            <div className={`flex space-x-2 ${isGracePeriod ? 'opacity-50' : ''}`}>
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
                placeholder="Enter new email address"
                disabled={isGracePeriod}
              />
              <GracePeriodTooltip isGracePeriod={isGracePeriod}>
                <button
                  type="button"
                  onClick={handleAddEmail}
                  className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={isGracePeriod}
                >
                  <Plus className="h-4 w-4" />
                </button>
              </GracePeriodTooltip>
            </div>

            <div className="mt-6 flex justify-end space-x-2">
              <button
                type="button"
                onClick={() => {
                  setShowEmailListModal(false);
                  setEditEmailList([]);
                  setNewEmail('');
                  setEmailListError('');
                  setCurrentConfigToEdit(null);
                }}
                className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-gray-200 hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isSaving}
              >
                Cancel
              </button>
              <GracePeriodTooltip isGracePeriod={isGracePeriod}>
                <button
                  type="button"
                  onClick={handleSaveEmailList}
                  className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={isSaving || isGracePeriod}
                >
                  {isSaving ? <Loader2 className="animate-spin h-4 w-4" /> : <Save className="h-4 w-4 mr-1" />}
                  Save List
                </button>
              </GracePeriodTooltip>
            </div>
          </div>
        </div>
      )}

      {showEmailSettingsModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full flex items-center justify-center z-50">
          <div className="relative bg-white p-6 rounded-lg shadow-xl max-w-md w-full">
            <h3 className="text-xl font-semibold mb-4 text-gray-800">Manage Email Settings</h3>
            <div className="text-sm text-gray-600 mb-4 flex items-center p-3 border border-blue-200 rounded-md bg-blue-50">
              <Globe className="h-5 w-5 mr-2 text-blue-500" />
              <span>
                These settings override the global defaults. If inactive or not configured, the system will use global settings.
              </span>
            </div>
            
            {isEmailSettingsLoading ? (
              <div className="text-center py-8">
                <Loader2 className="animate-spin h-8 w-8 text-blue-600 mx-auto" />
                <p className="text-gray-600 mt-2">Loading settings...</p>
              </div>
            ) : (
              <form className={isGracePeriod ? 'opacity-50 pointer-events-none' : ''}>
                {emailSettingsError && (
                  <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-md relative mb-4 flex items-center" role="alert">
                    <AlertCircle className="h-5 w-5 mr-2" />
                    <span className="block sm:inline">{emailSettingsError}</span>
                  </div>
                )}
                <div className="space-y-4">
                  <div>
                    <label htmlFor="sender_email" className={labelClassNames}>Sender Email</label>
                    <input
                      type="email"
                      id="sender_email"
                      name="sender_email"
                      value={emailSettingsForm.sender_email}
                      onChange={handleEmailSettingsChange}
                      className={inputClassNames}
                      required
                      disabled={isGracePeriod}
                    />
                  </div>
                  <div>
                    <label htmlFor="sender_display_name" className={labelClassNames}>Sender Display Name (Optional)</label>
                    <input
                      type="text"
                      id="sender_display_name"
                      name="sender_display_name"
                      value={emailSettingsForm.sender_display_name}
                      onChange={handleEmailSettingsChange}
                      className={inputClassNames}
                      disabled={isGracePeriod}
                    />
                  </div>
                  <div>
                    <label htmlFor="smtp_host" className={labelClassNames}>SMTP Host</label>
                    <input
                      type="text"
                      id="smtp_host"
                      name="smtp_host"
                      value={emailSettingsForm.smtp_host}
                      onChange={handleEmailSettingsChange}
                      className={inputClassNames}
                      required
                      disabled={isGracePeriod}
                    />
                  </div>
                  <div>
                    <label htmlFor="smtp_port" className={labelClassNames}>SMTP Port</label>
                    <input
                      type="number"
                      id="smtp_port"
                      name="smtp_port"
                      value={emailSettingsForm.smtp_port}
                      onChange={handleEmailSettingsChange}
                      className={inputClassNames}
                      required
                      disabled={isGracePeriod}
                    />
                  </div>
				  <div>
                    <label htmlFor="smtp_username" className={labelClassNames}>SMTP Username</label>
                    <input
                      type="text"
                      id="smtp_username"
                      name="smtp_username"
                      value={emailSettingsForm.smtp_username}
                      onChange={handleEmailSettingsChange}
                      className={inputClassNames}
                      required
                      disabled={isGracePeriod}
                    />
                  </div>
                  <div>
                    <div className="flex justify-between items-center">
                        <label htmlFor="smtp_password" className={labelClassNames}>SMTP Password {isNewSettings ? '' : '(Leave blank to keep existing)'}</label>
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="text-xs text-blue-500 hover:text-blue-700"
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
                      className={inputClassNames}
                      {...(isNewSettings ? { required: true } : {})}
                      disabled={isGracePeriod}
                    />
                  </div>
                  <div className="flex items-center">
                    <input
                      id="is_active"
                      name="is_active"
                      type="checkbox"
                      checked={emailSettingsForm.is_active}
                      onChange={handleEmailSettingsChange}
                      className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      disabled={isGracePeriod}
                    />
                    <label htmlFor="is_active" className="ml-2 block text-sm text-gray-900">
                      Activate Custom Settings
                    </label>
                  </div>
                </div>
              </form>
            )}

            <div className="mt-6 flex justify-between items-center">
              <button
                type="button"
                onClick={() => setShowEmailSettingsModal(false)}
                className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-gray-200 hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isEmailSettingsSaving}
              >
                Cancel
              </button>
              <div className="flex space-x-2">
                {emailSettings && (
                  <GracePeriodTooltip isGracePeriod={isGracePeriod}>
                    <button
                      type="button"
                      onClick={handleDeleteEmailSettings}
                      className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={isEmailSettingsSaving || isGracePeriod}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </GracePeriodTooltip>
                )}
                <GracePeriodTooltip isGracePeriod={isGracePeriod}>
                  <button
                    type="button"
                    onClick={handleSaveEmailSettings}
                    className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={isEmailSettingsSaving || isGracePeriod}
                  >
                    {isEmailSettingsSaving ? <Loader2 className="animate-spin h-4 w-4" /> : <Save className="h-4 w-4 mr-1" />}
                    Save Settings
                  </button>
                </GracePeriodTooltip>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default CustomerConfigurationManagementPage;