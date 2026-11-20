// src/pages/SystemOwner/Customers/CustomerDetailsPage.js
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiRequest } from 'services/apiService.js';
import { Edit, PlusCircle, Trash, RotateCcw, ToggleLeft, ToggleRight, Loader2, RefreshCw, Calendar, User, FileText, X, Globe, Mail, ShieldCheck, KeyRound, AlertTriangle, Save, Lock } from 'lucide-react';
import { toast } from 'react-toastify';
import FormattedDateInput from 'components/FormattedDateInput';
import { formatDate as formatDisplayDate } from 'utils/dateFormat';

// ... [Keep existing UserForm component exactly as it is] ...
// (I am omitting UserForm code here for brevity, keep it exactly as it was in your file)
const UserForm = ({ customerId, userToEdit, onUserSaved, onCancel, customerEntities }) => {
  // ... UserForm implementation ...
  // (Copy the UserForm code from your previous file here)
    const [formData, setFormData] = useState({
    email: '',
    password: '',
    role: 'end_user',
    has_all_entity_access: true,
    entity_ids: [],
    must_change_password: true,
  });
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isSendingReset, setIsSendingReset] = useState(false);
  const [useManualPassword, setUseManualPassword] = useState(false);

  useEffect(() => {
    if (userToEdit) {
      setFormData({
        email: userToEdit.email,
        role: userToEdit.role,
        has_all_entity_access: userToEdit.has_all_entity_access,
        entity_ids: userToEdit.entities_with_access.map(e => e.id),
        must_change_password: userToEdit.must_change_password,
        password: '',
      });
    } else {
      setFormData({
        email: '',
        password: '',
        role: 'end_user',
        has_all_entity_access: true,
        entity_ids: [],
        must_change_password: true,
      });
      setUseManualPassword(false);
    }
  }, [userToEdit]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleEntityAccessChange = (e) => {
    const { value } = e.target;
    setFormData(prev => ({
      ...prev,
      has_all_entity_access: value === 'all',
      entity_ids: value === 'all' ? [] : prev.entity_ids
    }));
  };

  const handleEntitySelection = (e) => {
    const entityId = parseInt(e.target.value, 10);
    setFormData(prev => {
      const newEntityIds = e.target.checked ? [...prev.entity_ids, entityId] : prev.entity_ids.filter(id => id !== entityId);
      return { ...prev, entity_ids: newEntityIds };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    setError('');

    try {
      const isNewUser = !userToEdit;

      if (isNewUser && (!formData.email || !formData.role)) {
        setError('Email and Role are required.');
        setIsSaving(false);
        return;
      }
      
      // Password validation only for new users with manual password enabled
      if (isNewUser && useManualPassword) {
        if (!formData.password || formData.password.length < 8) {
          setError('Manual password must be at least 8 characters long.');
          setIsSaving(false);
          return;
        }
        if (formData.password !== confirmPassword) {
          setError('Passwords do not match.');
          setIsSaving(false);
          return;
        }
      }

      if (!formData.has_all_entity_access && formData.entity_ids.length === 0) {
        setError('Please select at least one entity or grant access to all entities.');
        setIsSaving(false);
        return;
      }

      const payload = { ...formData };
      // NEVER allow password in payload when updating an existing customer user (Host-Blind Protection)
      if (!isNewUser || !useManualPassword || !formData.password) {
        delete payload.password;
      }
      if (payload.has_all_entity_access) {
        delete payload.entity_ids;
      }
      
      if (isNewUser) {
        await apiRequest(`/system-owner/customers/${customerId}/users/`, 'POST', payload);
        toast.success(useManualPassword ? 'User created successfully!' : 'User created and private activation link dispatched!');
      } else {
        await apiRequest(`/system-owner/users/${userToEdit.id}`, 'PUT', payload);
        toast.success('User updated successfully!');
      }
      
      onUserSaved();
      onCancel();
    } catch (err) {
      console.error("Failed to save user:", err);
      setError(`Failed to save user: ${err.message || 'An unexpected error occurred.'}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3.5 p-4 border border-slate-200 rounded-xl bg-slate-50/80 mb-4">
      <h4 className="text-sm font-bold text-slate-900">{userToEdit ? 'Edit User' : 'Add New User'}</h4>
      {error && <div className="bg-rose-50 border border-rose-200 text-rose-700 px-3.5 py-2.5 rounded-xl text-xs font-medium">{error}</div>}
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        <div>
          <label htmlFor="user-email" className="block text-xs font-semibold text-slate-700 mb-1">Email</label>
          <input type="email" name="email" id="user-email" value={formData.email} onChange={handleChange} required className="block w-full text-sm px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-800 shadow-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors disabled:bg-slate-100 disabled:text-slate-500" disabled={!!userToEdit} />
        </div>
        <div>
          <label htmlFor="user-role" className="block text-xs font-semibold text-slate-700 mb-1">Role</label>
          <select name="role" id="user-role" value={formData.role} onChange={handleChange} required className="block w-full text-sm px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-800 shadow-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors">
            <option value="corporate_admin">Corporate Admin</option>
            <option value="end_user">End User</option>
            <option value="checker">Checker</option>
            <option value="viewer">Viewer</option>
          </select>
        </div>
      </div>
      
      {/* Password section: Host-Blind Protection */}
      <div className="border-t border-slate-200 pt-3.5 mt-3.5">
        {userToEdit ? (
          <div className="bg-white border border-slate-200 rounded-xl p-3.5">
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center space-x-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide">Password &amp; Credentials</h4>
              </div>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                🔒 Host-Blind Protected
              </span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Customer user passwords are encrypted end-to-end and strictly inaccessible to the System Owner. To protect tenant confidentiality, passwords cannot be viewed or manually altered here.
            </p>
            <div className="mt-3 pt-2.5 border-t border-slate-200 flex items-center justify-between">
              <span className="text-[11px] text-slate-500">Need to help this user reset their credentials?</span>
              <button
                type="button"
                disabled={isSendingReset}
                onClick={async () => {
                  setIsSendingReset(true);
                  try {
                    const res = await apiRequest(`/system-owner/users/${userToEdit.id}/resend-invitation`, 'POST');
                    toast.success(res?.message || `Private activation / reset link dispatched to "${userToEdit.email}"!`);
                  } catch (err) {
                    console.error('Failed to send reset link:', err);
                    toast.error(`Failed to send link: ${err.message || 'Error occurred'}`);
                  } finally {
                    setIsSendingReset(false);
                  }
                }}
                className="inline-flex items-center space-x-1 text-xs font-semibold text-emerald-700 hover:text-emerald-800 bg-white hover:bg-emerald-50 border border-emerald-300 px-3 py-1.5 rounded-xl shadow-xs transition-colors"
              >
                {isSendingReset ? (
                  <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin text-emerald-600" />
                ) : (
                  <Mail className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                )}
                <span>Dispatch Private Reset Link</span>
              </button>
            </div>
          </div>
        ) : (
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-bold text-slate-800">Account Access &amp; Authentication</h4>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                🛡️ Zero-Touch Active
              </span>
            </div>

            {!useManualPassword ? (
              <div className="bg-white border border-emerald-200 rounded-xl p-3.5 shadow-xs">
                <div className="flex items-start space-x-2.5">
                  <Mail className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h5 className="text-xs font-bold text-emerald-900 uppercase tracking-wide">Automated Zero-Touch Invitation</h5>
                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                      A private, single-use 24-hour activation link will be automatically dispatched to this user with &apos;SendOnly&apos; privacy (never saved to Sent Items). The user will set their confidential password in their browser.
                    </p>
                    <p className="text-[11px] text-slate-400 mt-1 italic">
                      ⚡ As System Owner, you will never see or know their password.
                    </p>
                  </div>
                </div>
                <div className="mt-2.5 flex justify-end">
                  <button
                    type="button"
                    onClick={() => setUseManualPassword(true)}
                    className="text-xs font-medium text-indigo-600 hover:text-indigo-800 hover:underline flex items-center space-x-1"
                  >
                    <KeyRound className="w-3.5 h-3.5 mr-1" />
                    <span>⚙️ Set Initial Password Manually (Testing Only)</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5">
                <div className="flex items-center space-x-1.5 text-amber-800 text-xs font-bold mb-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                  <span>Manual Password Entry (Testing / Diagnostic Mode)</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="user-password" className="block text-xs font-semibold text-slate-700 mb-1">Initial Password <span className="text-rose-500">*</span></label>
                    <input type="password" name="password" id="user-password" value={formData.password} onChange={handleChange} required minLength="8" placeholder="Minimum 8 characters" className="block w-full text-sm px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-800 shadow-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors" />
                  </div>
                  <div>
                    <label htmlFor="confirm-password" className="block text-xs font-semibold text-slate-700 mb-1">Confirm Initial Password <span className="text-rose-500">*</span></label>
                    <input type="password" name="confirm-password" id="confirm-password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required minLength="8" placeholder="Re-enter password" className="block w-full text-sm px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-800 shadow-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors" />
                  </div>
                </div>
                <div className="mt-2 flex justify-between items-center">
                  <p className="text-[11px] text-amber-700">
                    ⚠️ Manual entry bypasses Zero-Touch. The user will still be required to change password on first login.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setUseManualPassword(false);
                      setFormData(prev => ({ ...prev, password: '' }));
                      setConfirmPassword('');
                    }}
                    className="text-xs font-medium text-indigo-600 hover:text-indigo-800 hover:underline"
                  >
                    ← Return to Zero-Touch
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="border-t border-slate-200 pt-3.5 mt-3.5">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">Entity Access</h4>
        <div className="flex flex-wrap gap-4">
            <div className="flex items-center">
              <input
                id="access_all_entities"
                name="entity_access_type"
                type="radio"
                value="all"
                checked={formData.has_all_entity_access}
                onChange={handleEntityAccessChange}
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-slate-300"
              />
              <label htmlFor="access_all_entities" className="ml-2 block text-sm text-slate-800">
                Access all entities
              </label>
            </div>
            <div className="flex items-center">
              <input
                id="access_specific_entities"
                name="entity_access_type"
                type="radio"
                value="specific"
                checked={!formData.has_all_entity_access}
                onChange={handleEntityAccessChange}
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-slate-300"
              />
              <label htmlFor="access_specific_entities" className="ml-2 block text-sm text-slate-800">
                Access specific entities
              </label>
            </div>
          </div>
        
        {!formData.has_all_entity_access && (
          <div className="mt-2.5 pl-4 space-y-1.5">
            {customerEntities.map(entity => (
              <div key={entity.id} className="flex items-center">
                <input
                  id={`entity-access-${entity.id}`}
                  type="checkbox"
                  value={entity.id}
                  checked={formData.entity_ids.includes(entity.id)}
                  onChange={handleEntitySelection}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-slate-300 rounded"
                />
                <label htmlFor={`entity-access-${entity.id}`} className="ml-2 text-sm text-slate-800">
                  {entity.entity_name} ({entity.code})
                </label>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-200/80">
        <button type="button" onClick={onCancel} className="px-3.5 py-2 text-xs font-semibold rounded-xl border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 transition-colors">Cancel</button>
        <button type="submit" className="px-4 py-2 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm flex items-center transition-colors">
          {isSaving && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
          {userToEdit ? 'Update User' : 'Add User'}
        </button>
      </div>
    </form>
  );
};

// --- NEW: Usage Progress Bar Component ---
const UsageProgressBar = ({ current, max, label, icon: Icon }) => {
  // Avoid division by zero
  const percentage = max > 0 ? Math.min((current / max) * 100, 100) : 0;
  
  // Color logic: Green (<75%), Yellow (75-90%), Red (>90%)
  let barColor = "bg-emerald-500";
  if (percentage > 90) barColor = "bg-rose-500";
  else if (percentage > 75) barColor = "bg-amber-500";

  return (
    <div className="mb-3.5 last:mb-0">
      <div className="flex justify-between mb-1">
        <span className="text-xs font-semibold text-slate-700 flex items-center">
          {Icon && <Icon className="h-3.5 w-3.5 mr-1.5 text-slate-500" />}
          {label}
        </span>
        <span className="text-xs font-semibold text-slate-700">
          {current} / {max} ({Math.round(percentage)}%)
        </span>
      </div>
      <div className="w-full bg-slate-200 rounded-full h-2">
        <div 
          className={`${barColor} h-2 rounded-full transition-all duration-500`} 
          style={{ width: `${percentage}%` }}
        ></div>
      </div>
    </div>
  );
};

function CustomerDetailsPage({ onLogout }) {
  // ... [Keep existing state variables: id, navigate, customer, entities, users, loading, error...]
  const { id } = useParams();
  const navigate = useNavigate();

  const [customer, setCustomer] = useState(null);
  const [entities, setEntities] = useState([]);
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // State for Customer Core Details Editing
  const [showEditCustomerForm, setShowEditCustomerForm] = useState(false);
  const [customerEditFormData, setCustomerEditFormData] = useState({
    name: '',
    address: '',
    contact_email: '',
    contact_phone: '',
    subscription_plan_id: '',
    domains: [],
  });
  const [newDomainInput, setNewDomainInput] = useState('');
  const [availableSubscriptionPlans, setAvailableSubscriptionPlans] = useState([]);
  const [isUpdatingCustomer, setIsUpdatingCustomer] = useState(false);

  // State for Customer Entity Management
  const [showAddEditEntityForm, setShowAddEditEntityForm] = useState(false);
  const [currentEntityFormData, setCurrentEntityFormData] = useState({
    entity_name: '',
    code: '',
    contact_person: '',
    contact_email: '',
    is_active: true,
    address: '',
    commercial_register_number: '',
    tax_id: '',
  });
  const [editingEntityId, setEditingEntityId] = useState(null);
  const [editingUser, setEditingUser] = useState(null);

  // State for User Management
  const [showUserForm, setShowUserForm] = useState(false);

  // NEW: State for Renewal
  const [isRenewing, setIsRenewing] = useState(false);
  const [customExpiryDate, setCustomExpiryDate] = useState('');

  // State for System-Owner Security & Platform Overrides + Emergency Password Change
  const [securityConfigs, setSecurityConfigs] = useState([]);
  const [isSecurityConfigsLoading, setIsSecurityConfigsLoading] = useState(false);
  const [editingSecurityKey, setEditingSecurityKey] = useState(null);
  const [editingSecurityValue, setEditingSecurityValue] = useState('');
  const [savingSecurityKey, setSavingSecurityKey] = useState(null);
  const [showEmergencyModal, setShowEmergencyModal] = useState(false);
  const [emergencyReason, setEmergencyReason] = useState('');
  const [isForcingPasswordReset, setIsForcingPasswordReset] = useState(false);

  const fetchSecurityConfigs = async () => {
    setIsSecurityConfigsLoading(true);
    try {
      const data = await apiRequest(`/system-owner/customers/${id}/security-configurations`, 'GET');
      setSecurityConfigs(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load customer security configurations:', err);
    } finally {
      setIsSecurityConfigsLoading(false);
    }
  };

  const fetchCustomerDetails = async () => {
    setIsLoading(true);
    setError('');
    try {
      const customerResponse = await apiRequest(`/system-owner/customers/${id}`, 'GET');
      setCustomer(customerResponse);
      setEntities(customerResponse.entities);
      setUsers(customerResponse.users);
      
      setCustomerEditFormData({
        name: customerResponse.name,
        address: customerResponse.address || '',
        contact_email: customerResponse.contact_email,
        contact_phone: customerResponse.contact_phone || '',
        subscription_plan_id: customerResponse.subscription_plan?.id || '',
        domains: customerResponse.domains || [],
      });
    } catch (err) {
      console.error('Failed to fetch customer details:', err);
      setError(`Failed to load customer details. ${err.message || ''}`);
    } finally {
      setIsLoading(false);
    }
  };

  // ... [Keep fetchPlans useEffect] ...
    useEffect(() => {
    const fetchPlans = async () => {
      try {
        const plans = await apiRequest('/system-owner/subscription-plans', 'GET');
        setAvailableSubscriptionPlans(plans);
      } catch (err) {
        console.error('Failed to fetch subscription plans:', err);
        setError('Failed to load subscription plans for customer editing.');
      }
    };
    fetchPlans();
  }, []);

  useEffect(() => {
    if (id) {
      fetchCustomerDetails();
      fetchSecurityConfigs();
    }
  }, [id]);

  const handleToggleSecurityBool = async (cfg, nextVal) => {
    setSavingSecurityKey(cfg.global_config_key);
    try {
      await apiRequest(`/system-owner/customers/${id}/security-configurations/${cfg.global_config_key}`, 'PUT', {
        configured_value: nextVal ? 'true' : 'false',
      });
      toast.success(`${cfg.global_config_key} override updated.`);
      await fetchSecurityConfigs();
    } catch (err) {
      toast.error(`Failed to update ${cfg.global_config_key}: ${err.message || 'Unknown error'}`);
    } finally {
      setSavingSecurityKey(null);
    }
  };

  const handleSaveSecurityConfig = async (cfg) => {
    const valStr = String(editingSecurityValue ?? '').trim();
    if (!valStr) {
      toast.warn('Please enter a valid value.');
      return;
    }
    setSavingSecurityKey(cfg.global_config_key);
    try {
      await apiRequest(`/system-owner/customers/${id}/security-configurations/${cfg.global_config_key}`, 'PUT', {
        configured_value: valStr,
      });
      toast.success(`${cfg.global_config_key} override saved.`);
      setEditingSecurityKey(null);
      setEditingSecurityValue('');
      await fetchSecurityConfigs();
    } catch (err) {
      toast.error(`Failed to save ${cfg.global_config_key}: ${err.message || 'Unknown error'}`);
    } finally {
      setSavingSecurityKey(null);
    }
  };

  const handleResetSecurityConfig = async (cfg) => {
    setSavingSecurityKey(cfg.global_config_key);
    try {
      await apiRequest(`/system-owner/customers/${id}/security-configurations/${cfg.global_config_key}`, 'DELETE');
      toast.info(`${cfg.global_config_key} reset to global default.`);
      if (editingSecurityKey === cfg.global_config_key) {
        setEditingSecurityKey(null);
        setEditingSecurityValue('');
      }
      await fetchSecurityConfigs();
    } catch (err) {
      toast.error(`Failed to reset ${cfg.global_config_key}: ${err.message || 'Unknown error'}`);
    } finally {
      setSavingSecurityKey(null);
    }
  };

  const handleCustomerForcePasswordChange = async () => {
    setIsForcingPasswordReset(true);
    try {
      const res = await apiRequest('/system-owner/security/force-password-change', 'POST', {
        customer_id: Number(id),
        reason: emergencyReason.trim() || null,
      });
      toast.success(res?.message || `Forced password change enforced for ${customer?.name || 'this customer'}.`);
      setShowEmergencyModal(false);
      setEmergencyReason('');
      fetchCustomerDetails();
    } catch (err) {
      toast.error(`Failed to enforce password change: ${err.message || 'Unknown error'}`);
    } finally {
      setIsForcingPasswordReset(false);
    }
  };

  // ... [Keep all existing handler functions: handleEditUser, handleCancelUserForm, etc.] ...
    // Handler to initiate edit mode for a user
  const handleEditUser = (user) => {
    setEditingUser(user);
    setShowUserForm(true);
  };
  
  // Handler to clear the user form state
  const handleCancelUserForm = () => {
    setShowUserForm(false);
    setEditingUser(null);
  };

  // Handle change for customer core details form
  const handleCustomerEditFormChange = (e) => {
    const { name, value } = e.target;
    setCustomerEditFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Handle submission for customer core details update
  const handleUpdateCustomerSubmit = async (e) => {
    e.preventDefault();
    setIsUpdatingCustomer(true);
    setError('');

    try {
      await apiRequest(`/system-owner/customers/${id}`, 'PUT', customerEditFormData);
      toast.success('Customer details updated successfully!');
      setShowEditCustomerForm(false);
      fetchCustomerDetails();
    } catch (err) {
      console.error('Error updating customer:', err);
      setError(`Error updating customer: ${err.message || 'An unexpected error occurred.'}`);
    } finally {
      setIsUpdatingCustomer(false);
    }
  };

  // Handle form field changes for add/edit entity form
  const handleEntityFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    setCurrentEntityFormData((prevData) => ({
      ...prevData,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  // Handle Add/Update Entity Submission
	const handleAddUpdateEntity = async (e) => {
		e.preventDefault();
		setError('');

		const cleanedFormData = { ...currentEntityFormData };
		for (const key of ['contact_person', 'contact_email', 'address', 'commercial_register_number', 'tax_id', 'code']) {
			if (cleanedFormData[key] === '') {
				cleanedFormData[key] = null;
			}
		}

		if (!cleanedFormData.entity_name.trim()) {
			setError('Entity name cannot be empty.');
			return;
		}

		if (cleanedFormData.contact_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanedFormData.contact_email)) {
			setError('Invalid contact email format.');
			return;
		}

		try {
			if (editingEntityId) {
				await apiRequest(`/system-owner/customer-entities/${editingEntityId}`, 'PUT', cleanedFormData);
				toast.success('Entity updated successfully!');
			} else {
				if (customer && !customer.subscription_plan.can_multi_entity) {
					const activeEntitiesCount = entities.filter(e => !e.is_deleted && e.is_active).length;
					if (activeEntitiesCount >= 1) {
						setError(`Customer's plan does not support adding more entities. Max 1 active entity allowed.`);
						return;
					}
				}
				await apiRequest(`/system-owner/customers/${customer.id}/entities/`, 'POST', cleanedFormData);
				toast.success('Entity added successfully!');
			}
			setCurrentEntityFormData({
				entity_name: '',
				code: '',
				contact_person: '',
				contact_email: '',
				is_active: true,
				address: '',
				commercial_register_number: '',
				tax_id: '',
			});
			setEditingEntityId(null);
			setShowAddEditEntityForm(false);
			fetchCustomerDetails();
		} catch (err) {
			console.error('Failed to save entity:', err);
			setError(`Failed to save entity: ${err.message || 'An unexpected error occurred.'}`);
		}
	};

  // Handle Edit Entity (initiate edit mode)
  const handleEditEntityClick = (entity) => {
    setEditingEntityId(entity.id);
    setCurrentEntityFormData({
      entity_name: entity.entity_name,
      code: entity.code || '',
      contact_person: entity.contact_person || '',
      contact_email: entity.contact_email || '',
      is_active: entity.is_active,
      address: entity.address || '',
      commercial_register_number: entity.commercial_register_number || '',
      tax_id: entity.tax_id || '',
    });
    setShowAddEditEntityForm(true);
  };

  // Handle Delete (Soft Delete) Entity
  const handleDeleteEntity = async (entityId, entityName) => {
    if (window.confirm(`Are you sure you want to soft-delete the entity "${entityName}"?`)) {
      try {
        await apiRequest(`/system-owner/customer-entities/${entityId}`, 'DELETE');
        fetchCustomerDetails();
        toast.success(`Entity "${entityName}" soft-deleted successfully.`);
      } catch (err) {
        console.error('Failed to soft-delete entity:', err);
        setError(`Failed to soft-delete entity "${entityName}". ${err.message || ''}`);
      }
    }
  };

  // Handle Restore Entity
  const handleRestoreEntity = async (entityId, entityName) => {
    if (window.confirm(`Are you sure you want to restore the entity "${entityName}"?`)) {
      try {
        await apiRequest(`/system-owner/customer-entities/${entityId}/restore`, 'POST');
        fetchCustomerDetails();
        toast.success(`Entity "${entityName}" restored successfully.`);
      } catch (err) {
        console.error('Failed to restore entity:', err);
        setError(`Failed to restore entity "${entityName}". ${err.message || ''}`);
      }
    }
  };

  // Handle Toggle Active Status
  const handleToggleActive = async (entityId, entityName, currentStatus) => {
    if (!customer.subscription_plan?.can_multi_entity && currentStatus === true) {
      const activeEntitiesCount = entities.filter(e => !e.is_deleted && e.is_active && e.id !== entityId).length;
      if (activeEntitiesCount === 0) {
        setError("Cannot deactivate the last active entity for a customer on a single-entity plan.");
        return;
      }
    }

    if (window.confirm(`Are you sure you want to ${currentStatus ? 'deactivate' : 'activate'} the entity "${entityName}"?`)) {
        try {
            await apiRequest(`/system-owner/customer-entities/${entityId}`, 'PUT', { is_active: !currentStatus });
            toast.success(`Entity "${entityName}" status updated successfully.`);
            fetchCustomerDetails();
        }
        catch (err) {
            console.error('Failed to toggle entity active status:', err);
            setError(`Failed to change status for "${entityName}". ${err.message || ''}`);
        }
    }
  };

  const handleUserAction = async (action, userId, userEmail) => {
    if (action === 'delete') {
      if (window.confirm(`Are you sure you want to soft-delete the user "${userEmail}"?`)) {
        try {
          await apiRequest(`/system-owner/users/${userId}`, 'DELETE');
          toast.success(`User "${userEmail}" soft-deleted successfully.`);
          fetchCustomerDetails();
        } catch (err) {
          console.error('Failed to delete user:', err);
          setError(`Failed to delete user: ${err.message || ''}`);
        }
      }
    } else if (action === 'restore') {
      if (window.confirm(`Are you sure you want to restore the user "${userEmail}"?`)) {
        try {
          await apiRequest(`/system-owner/users/${userId}/restore`, 'POST');
          toast.success(`User "${userEmail}" restored successfully.`);
          fetchCustomerDetails();
        } catch (err) {
          console.error('Failed to restore user:', err);
          setError(`Failed to restore user: ${err.message || ''}`);
        }
      }
    } else if (action === 'resend-invitation') {
      try {
        const res = await apiRequest(`/system-owner/users/${userId}/resend-invitation`, 'POST');
        toast.success(res?.message || `Private activation invitation resent to "${userEmail}" successfully.`);
      } catch (err) {
        console.error('Failed to resend invitation:', err);
        toast.error(`Failed to resend invitation: ${err.message || 'Error occurred'}`);
      }
    }
  };

  const handleRenewSubscription = async () => {
    const confirmMsg = customExpiryDate 
      ? `Are you sure you want to set the expiry date to ${customExpiryDate}?` 
      : `Are you sure you want to renew for ${customer.subscription_plan.duration_months} months?`;

    if (!window.confirm(confirmMsg)) return;

    setIsRenewing(true);
    try {
      // Send the date using the key 'new_subscription_end_date' to match backend RenewRequest
      await apiRequest(`/system-owner/customers/${id}/renew`, 'POST', {
        new_subscription_end_date: customExpiryDate || null
      });
      
      toast.success('Subscription updated successfully!');
      setCustomExpiryDate(''); // Reset the input
      fetchCustomerDetails(); 
    } catch (err) {
      console.error('Renew failed:', err);
      toast.error(`Renewal failed: ${err.message}`);
    } finally {
      setIsRenewing(false);
    }
  };

  // Helper to format dates
  const formatDate = (dateString) => formatDisplayDate(dateString, 'N/A');

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <Loader2 className="h-8 w-8 text-indigo-600 animate-spin" />
        <p className="text-sm text-slate-500 mt-3">Loading customer details...</p>
      </div>
    );
  }

  if (error && !customer) {
    return (
      <div className="bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-xl text-sm font-medium" role="alert">
        <span className="block sm:inline">{error}</span>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="text-center py-12 text-sm text-slate-500">Customer not found.</div>
    );
  }


  return (
    <div className="space-y-4">
      <div className="flex flex-wrap justify-between items-center gap-3 bg-white px-5 py-3.5 rounded-2xl border border-slate-200/80 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Customer Details: {customer.name}</h2>
          <p className="text-xs text-slate-500 mt-0.5">Manage subscription health, security overrides, entities, and customer users.</p>
        </div>
        <button
          onClick={() => navigate('/system-owner/customers')}
          className="px-4 py-2 text-sm font-semibold rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition-colors shadow-xs"
        >
          Back to Customers
        </button>
      </div>

      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-xl text-xs font-medium" role="alert">
          <span className="block sm:inline">{error}</span>
        </div>
      )}

      {/* --- NEW SECTION: Subscription Health & Usage --- */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5 mb-5 border-l-4 border-l-indigo-500">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center">
              <RefreshCw className="h-4 w-4 mr-2 text-indigo-600" />
              Subscription Health
            </h3>
            <p className="text-sm text-slate-500 mt-0.5">
              Current Plan: <span className="font-semibold text-slate-800">{customer.subscription_plan.name}</span>
            </p>
          </div>
          
          <div className="text-right">
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
              customer.status === 'active' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 
              customer.status === 'grace' ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-rose-50 text-rose-700 border-rose-200'
            }`}>
              {customer.status.toUpperCase()}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Date Information */}
          <div className="bg-slate-50/80 border border-slate-200/60 p-4 rounded-xl">
            <h4 className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-3 flex items-center">
              <Calendar className="h-3.5 w-3.5 mr-1.5 text-slate-500" /> Period Details
            </h4>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-slate-500">Start Date:</span>
              <span className="font-semibold text-slate-800">{formatDate(customer.start_date)}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-500">Expiry Date:</span>
              <span className={`font-semibold ${new Date(customer.end_date) < new Date() ? 'text-rose-600' : 'text-slate-900'}`}>
                {formatDate(customer.end_date)}
              </span>
            </div>
            
			{/* Renew & Custom Expiry UI */}
            <div className="mt-4 pt-3 border-t border-slate-200">
              <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wider">
                Custom Expiry Date (Optional)
              </label>
              <FormattedDateInput 
                value={customExpiryDate}
                onChange={(e) => setCustomExpiryDate(e.target.value)}
                className="w-full mb-3 px-3 py-2 text-sm border border-slate-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                min={new Date().toISOString().split("T")[0]} 
              />
              
              <button
                onClick={handleRenewSubscription}
                disabled={isRenewing}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm py-2 px-4 rounded-xl shadow-sm flex items-center justify-center transition-colors disabled:opacity-50"
              >
                {isRenewing ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Processing...</>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2" /> 
                    {customExpiryDate ? 'Set Custom Expiry' : 'Renew Standard Duration'}
                  </>
                )}
              </button>
              {!customExpiryDate && (
                <p className="text-xs text-slate-500 mt-2 text-center italic">
                  No date selected: will extend for {customer.subscription_plan.duration_months} months.
                </p>
              )}
            </div>
          </div>

          {/* Usage Statistics */}
          <div className="bg-slate-50/80 border border-slate-200/60 p-4 rounded-xl">
             <h4 className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-3">
              Usage Limits
            </h4>
            
            <UsageProgressBar 
              current={customer.active_user_count} 
              max={customer.subscription_plan.max_users} 
              label="Active Users" 
              icon={User}
            />

            <UsageProgressBar 
              current={customer.active_lg_count} 
              max={customer.subscription_plan.max_records} 
              label="Active LG Records" 
              icon={FileText}
            />
          </div>
        </div>
      </div>
      {/* --- END NEW SECTION --- */}

      {/* Customer Information Section (Existing) */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5 mb-5">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-base font-bold text-slate-900">Basic Information</h3>
          <button
            onClick={() => setShowEditCustomerForm(!showEditCustomerForm)}
            className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 shadow-sm transition-colors"
          >
            {showEditCustomerForm ? 'Hide Edit Form' : <><Edit className="h-4 w-4 mr-1.5" /> Edit Customer Details</>}
          </button>
        </div>
        {/* ... Keep existing logic for showEditCustomerForm / display ... */}
        {/* (I am keeping the existing form logic below for completeness, but hiding it in snippet for brevity if you copy-paste) */}
        {showEditCustomerForm ? (
          <form onSubmit={handleUpdateCustomerSubmit} className="space-y-4 p-4 border border-indigo-200/80 rounded-xl bg-slate-50/80 mb-4">
             <h4 className="text-sm font-bold text-slate-800 mb-2">Edit Customer: {customer.name}</h4>
            <div>
              <label htmlFor="edit_customer_name" className="block text-xs font-semibold uppercase tracking-wider text-slate-600">Organization Name</label>
              <input type="text" name="name" id="edit_customer_name" value={customerEditFormData.name} onChange={handleCustomerEditFormChange} required className="mt-1 block w-full px-3 py-2 text-sm rounded-xl border border-slate-300 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" />
            </div>
            <div>
              <label htmlFor="edit_address" className="block text-xs font-semibold uppercase tracking-wider text-slate-600">Address</label>
              <input type="text" name="address" id="edit_address" value={customerEditFormData.address} onChange={handleCustomerEditFormChange} className="mt-1 block w-full px-3 py-2 text-sm rounded-xl border border-slate-300 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" />
            </div>
            <div>
              <label htmlFor="edit_contact_email" className="block text-xs font-semibold uppercase tracking-wider text-slate-600">Contact Email</label>
              <input type="email" name="contact_email" id="edit_contact_email" value={customerEditFormData.contact_email} onChange={handleCustomerEditFormChange} required className="mt-1 block w-full px-3 py-2 text-sm rounded-xl border border-slate-300 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" />
            </div>
            <div>
              <label htmlFor="edit_contact_phone" className="block text-xs font-semibold uppercase tracking-wider text-slate-600">Contact Phone</label>
              <input type="text" name="contact_phone" id="edit_contact_phone" value={customerEditFormData.contact_phone} onChange={handleCustomerEditFormChange} className="mt-1 block w-full px-3 py-2 text-sm rounded-xl border border-slate-300 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" />
            </div>
            <div>
              <label htmlFor="edit_subscription_plan_id" className="block text-xs font-semibold uppercase tracking-wider text-slate-600">Subscription Plan</label>
              <select name="subscription_plan_id" id="edit_subscription_plan_id" value={customerEditFormData.subscription_plan_id} onChange={handleCustomerEditFormChange} required className="mt-1 block w-full px-3 py-2 text-sm rounded-xl border border-slate-300 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500">
                {availableSubscriptionPlans.map((plan) => (
                  <option key={plan.id} value={plan.id}>
                    {plan.name} (Max Users: {plan.max_users}, Max Records: {plan.max_records}, Multi-Entity: {plan.can_multi_entity ? 'Yes' : 'No'})
                  </option>
                ))}
              </select>
            </div>
            {/* Domains Editor */}
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">Email Domains</label>
              <p className="text-xs text-slate-500 mb-2">Domains used to verify public issuance portal access (e.g., acmecorp.com)</p>
              <div className="flex flex-wrap gap-2 mb-2">
                {(customerEditFormData.domains || []).map((d, i) => (
                  <span key={i} className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-200">
                    @{d}
                    <button type="button" onClick={() => setCustomerEditFormData(prev => ({...prev, domains: prev.domains.filter((_, idx) => idx !== i)}))} className="ml-1.5 text-indigo-500 hover:text-rose-600 focus:outline-none">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Add domain (e.g., acme-group.com)"
                  value={newDomainInput}
                  onChange={(e) => setNewDomainInput(e.target.value.toLowerCase().trim())}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      const val = newDomainInput.replace(/^@/, '').trim();
                      if (val && !customerEditFormData.domains.includes(val)) {
                        setCustomerEditFormData(prev => ({...prev, domains: [...(prev.domains || []), val]}));
                        setNewDomainInput('');
                      }
                    }
                  }}
                  className="flex-grow px-3 py-2 rounded-xl border border-slate-300 bg-white shadow-sm text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
                <button type="button" onClick={() => {
                  const val = newDomainInput.replace(/^@/, '').trim();
                  if (val && !customerEditFormData.domains.includes(val)) {
                    setCustomerEditFormData(prev => ({...prev, domains: [...(prev.domains || []), val]}));
                    setNewDomainInput('');
                  }
                }} className="inline-flex items-center px-3 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 shadow-sm">
                  <PlusCircle className="h-4 w-4 mr-1" /> Add
                </button>
              </div>
            </div>
            <div className="flex justify-end space-x-2.5 mt-4 pt-3 border-t border-slate-200">
              <button type="button" onClick={() => setShowEditCustomerForm(false)} className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 shadow-sm" disabled={isUpdatingCustomer}>Cancel</button>
              <button type="submit" className="px-4 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-sm flex items-center justify-center disabled:opacity-50" disabled={isUpdatingCustomer}>
                {isUpdatingCustomer && <Loader2 className="h-4 w-4 mr-2 animate-spin text-white" />}
                {isUpdatingCustomer ? 'Updating...' : 'Update Customer'}
              </button>
            </div>
          </form>
        ) : (
          <div className="space-y-2 text-sm text-slate-700">
            <p><span className="font-semibold text-slate-900">Organization Name:</span> {customer.name}</p>
            <p><span className="font-semibold text-slate-900">Address:</span> {customer.address || 'N/A'}</p>
            <p><span className="font-semibold text-slate-900">Contact Email:</span> {customer.contact_email}</p>
            <p><span className="font-semibold text-slate-900">Contact Phone:</span> {customer.contact_phone || 'N/A'}</p>
            <div className="pt-1">
              <span className="font-semibold text-slate-900 flex items-center mb-1.5"><Globe className="h-4 w-4 mr-1.5 text-indigo-600" />Email Domains:</span>
              <div className="flex flex-wrap gap-2 mt-1">
                {(customer.domains && customer.domains.length > 0) ? customer.domains.map((d, i) => (
                  <span key={i} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-200">
                    @{d}
                  </span>
                )) : <span className="text-slate-400 text-sm italic">No domains configured</span>}
              </div>
            </div>
            <p className="pt-1"><span className="font-semibold text-slate-900">Created At:</span> {formatDate(customer.created_at)}</p>
          </div>
        )}
      </div>

      {/* Security & Platform Policy Overrides (System Owner Only) */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5 mb-5 border-l-4 border-l-indigo-500">
        <div className="flex flex-wrap justify-between items-start gap-3 mb-4">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center">
              <Lock className="h-4 w-4 mr-2 text-indigo-600" />
              Security & Platform Policy Overrides
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Optional per-customer overrides for security, authentication, OTP, and grace-period policies. Unset items automatically inherit platform global defaults. Policy edits are forward-only; use the emergency action below to enforce an immediate rotation.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowEmergencyModal(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl shadow-sm text-white bg-rose-600 hover:bg-rose-700 transition-colors"
          >
            <AlertTriangle className="h-3.5 w-3.5" />
            <span>Emergency: Force Password Change</span>
          </button>
        </div>

        {isSecurityConfigsLoading ? (
          <div className="py-6 text-center text-sm text-slate-500 flex items-center justify-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin text-indigo-600" />
            <span>Loading security policy settings...</span>
          </div>
        ) : securityConfigs.length === 0 ? (
          <p className="text-sm text-slate-500 italic">No customer-overridable security policies found.</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200/80">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50/80">
                <tr>
                  <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Policy Parameter</th>
                  <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Global Default</th>
                  <th className="px-3 py-2.5 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">Source</th>
                  <th className="px-3 py-2.5 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">Effective Value</th>
                  <th className="px-3 py-2.5 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {securityConfigs.map((cfg) => {
                  const isOverridden = cfg.configured_value !== null && cfg.configured_value !== undefined;
                  const isBool = cfg.global_unit === 'boolean' || ['true', 'false'].includes(String(cfg.effective_value).toLowerCase());
                  const isChecked = String(cfg.effective_value).toLowerCase() === 'true';
                  const isEditing = editingSecurityKey === cfg.global_config_key;
                  const isSavingThis = savingSecurityKey === cfg.global_config_key;
                  const label = cfg.global_config_key.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());

                  return (
                    <tr key={cfg.global_config_id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-3 py-2.5 text-sm">
                        <div className="font-semibold text-slate-900">{label}</div>
                        <div className="text-[11px] font-mono text-slate-400">{cfg.global_config_key}</div>
                        {cfg.global_description && (
                          <div className="text-xs text-slate-500 mt-0.5 max-w-md">{cfg.global_description}</div>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-sm text-slate-600 whitespace-nowrap">
                        <span className="font-medium text-slate-800">{cfg.global_value_default ?? '-'}</span>
                        {cfg.global_unit && cfg.global_unit !== 'boolean' ? ` ${cfg.global_unit}` : ''}
                        {(cfg.global_value_min !== null || cfg.global_value_max !== null) && (
                          <div className="text-[11px] text-slate-400">
                            Allowed: [{cfg.global_value_min ?? '∞'} – {cfg.global_value_max ?? '∞'}]
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-center whitespace-nowrap">
                        {isOverridden ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                            Custom Override
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">
                            Global Default
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-center text-sm">
                        {isEditing && !isBool ? (
                          <input
                            type="text"
                            value={editingSecurityValue}
                            onChange={(e) => setEditingSecurityValue(e.target.value)}
                            className="w-24 text-center text-sm px-2 py-1 border border-indigo-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            disabled={isSavingThis}
                            autoFocus
                          />
                        ) : isBool ? (
                          <span className={`font-semibold ${isChecked ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {isChecked ? 'True' : 'False'}
                          </span>
                        ) : (
                          <span className={`font-semibold ${isOverridden ? 'text-indigo-700' : 'text-slate-800'}`}>
                            {cfg.effective_value} {cfg.global_unit && cfg.global_unit !== 'boolean' ? cfg.global_unit : ''}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-center whitespace-nowrap">
                        <div className="inline-flex items-center justify-center gap-2">
                          {isBool ? (
                            <button
                              type="button"
                              onClick={() => handleToggleSecurityBool(cfg, !isChecked)}
                              disabled={isSavingThis}
                              className={`relative inline-flex h-5 w-10 items-center rounded-full transition-colors ${isChecked ? 'bg-indigo-600' : 'bg-slate-300'} ${isSavingThis ? 'opacity-50 cursor-not-allowed' : ''}`}
                              title="Toggle customer override"
                            >
                              <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition ${isChecked ? 'translate-x-5' : 'translate-x-1'}`} />
                            </button>
                          ) : isEditing ? (
                            <>
                              <button
                                type="button"
                                onClick={() => handleSaveSecurityConfig(cfg)}
                                disabled={isSavingThis}
                                className="p-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors"
                                title="Save override"
                              >
                                {isSavingThis ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingSecurityKey(null);
                                  setEditingSecurityValue('');
                                }}
                                disabled={isSavingThis}
                                className="p-1.5 rounded-lg bg-slate-200 text-slate-700 hover:bg-slate-300 transition-colors"
                                title="Cancel"
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            </>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                setEditingSecurityKey(cfg.global_config_key);
                                setEditingSecurityValue(String(cfg.effective_value ?? cfg.global_value_default ?? ''));
                              }}
                              disabled={isSavingThis}
                              className="p-1.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                              title="Override for this customer"
                            >
                              <Edit className="h-3.5 w-3.5" />
                            </button>
                          )}
                          {isOverridden && (
                            <button
                              type="button"
                              onClick={() => handleResetSecurityConfig(cfg)}
                              disabled={isSavingThis}
                              className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition-colors"
                              title="Remove override and revert to global default"
                            >
                              <RotateCcw className="h-3 w-3" />
                              <span>Reset</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ... [Rest of the file: Entities and Users sections remain unchanged] ... */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5 mb-5">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-base font-bold text-slate-900">Customer Entities</h3>
          {customer.subscription_plan?.can_multi_entity && (
            <button
              onClick={() => {
                setShowAddEditEntityForm(!showAddEditEntityForm);
                if (!showAddEditEntityForm) {
                  setEditingEntityId(null);
                  setCurrentEntityFormData({
                    entity_name: '',
                    code: '',
                    contact_person: '',
                    contact_email: '',
                    is_active: true,
                    address: '',
                    commercial_register_number: '',
                    tax_id: ''
                  });
                  setError('');
                }
              }}
              className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 shadow-sm transition-colors"
            >
              {showAddEditEntityForm ? 'Hide Form' : <><PlusCircle className="h-4 w-4 mr-1.5" /> Add New Entity</>}
            </button>
          )}
          {!customer.subscription_plan?.can_multi_entity && (
            <p className="text-sm text-slate-500">Only one active entity allowed per plan.</p>
          )}
        </div>

        {showAddEditEntityForm && (
          <form onSubmit={handleAddUpdateEntity} className="space-y-4 p-4 border border-indigo-200/80 rounded-xl bg-slate-50/80 mb-4">
            <h4 className="text-sm font-bold text-slate-800 mb-2">{editingEntityId ? `Edit Entity: ${currentEntityFormData.entity_name}` : 'Add New Entity'}</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              <div>
                <label htmlFor="entity_name" className="block text-xs font-semibold uppercase tracking-wider text-slate-600">Entity Name</label>
                <input
                  type="text"
                  name="entity_name"
                  id="entity_name"
                  value={currentEntityFormData.entity_name}
                  onChange={handleEntityFormChange}
                  required
                  className="mt-1 block w-full px-3 py-2 text-sm rounded-xl border border-slate-300 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              <div>
                <label htmlFor="code" className="block text-xs font-semibold uppercase tracking-wider text-slate-600">Code (Optional)</label>
                <input
                  type="text"
                  name="code"
                  id="code"
                  value={currentEntityFormData.code}
                  onChange={handleEntityFormChange}
                  maxLength="4"
                  className="mt-1 block w-full px-3 py-2 text-sm rounded-xl border border-slate-300 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              <div>
                <label htmlFor="address" className="block text-xs font-semibold uppercase tracking-wider text-slate-600">Address <span className="text-rose-500">*</span></label>
                <input
                  type="text"
                  name="address"
                  id="address"
                  value={currentEntityFormData.address}
                  onChange={handleEntityFormChange}
                  className="mt-1 block w-full px-3 py-2 text-sm rounded-xl border border-slate-300 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              <div>
                <label htmlFor="commercial_register_number" className="block text-xs font-semibold uppercase tracking-wider text-slate-600">Commercial Register Number (Optional)</label>
                <input
                  type="text"
                  name="commercial_register_number"
                  id="commercial_register_number"
                  value={currentEntityFormData.commercial_register_number}
                  onChange={handleEntityFormChange}
                  className="mt-1 block w-full px-3 py-2 text-sm rounded-xl border border-slate-300 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              <div>
                <label htmlFor="tax_id" className="block text-xs font-semibold uppercase tracking-wider text-slate-600">Tax ID (Optional)</label>
                <input
                  type="text"
                  name="tax_id"
                  id="tax_id"
                  value={currentEntityFormData.tax_id}
                  onChange={handleEntityFormChange}
                  className="mt-1 block w-full px-3 py-2 text-sm rounded-xl border border-slate-300 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              <div>
                <label htmlFor="contact_person" className="block text-xs font-semibold uppercase tracking-wider text-slate-600">Contact Person (Optional)</label>
                <input
                  type="text"
                  name="contact_person"
                  id="contact_person"
                  value={currentEntityFormData.contact_person}
                  onChange={handleEntityFormChange}
                  className="mt-1 block w-full px-3 py-2 text-sm rounded-xl border border-slate-300 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              <div>
                <label htmlFor="contact_email" className="block text-xs font-semibold uppercase tracking-wider text-slate-600">Contact Email (Optional)</label>
                <input
                  type="email"
                  name="contact_email"
                  id="contact_email"
                  value={currentEntityFormData.contact_email}
                  onChange={handleEntityFormChange}
                  className="mt-1 block w-full px-3 py-2 text-sm rounded-xl border border-slate-300 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
            </div>
            <div className="flex items-center mt-2">
              <input
                id="is_active"
                name="is_active"
                type="checkbox"
                checked={currentEntityFormData.is_active}
                onChange={handleEntityFormChange}
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-slate-300 rounded"
              />
              <label htmlFor="is_active" className="ml-2 block text-sm font-medium text-slate-700">
                Is Active
              </label>
            </div>

            <div className="flex justify-end space-x-2.5 mt-4 pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => {
                  setShowAddEditEntityForm(false);
                  setEditingEntityId(null);
                  setCurrentEntityFormData({
                    entity_name: '',
                    code: '',
                    contact_person: '',
                    contact_email: '',
                    is_active: true,
                    address: '',
                    commercial_register_number: '',
                    tax_id: ''
                  });
                  setError('');
                }}
                className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 shadow-sm"
              >
                Cancel
              </button>
              <button type="submit" className="px-4 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-sm">
                {editingEntityId ? 'Update Entity' : 'Create Entity'}
              </button>
            </div>
          </form>
        )}

        {entities.length === 0 && !showAddEditEntityForm ? (
          <p className="text-slate-500 italic text-sm">No entities found for this customer.</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200/80">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50/80">
                <tr>
                  <th scope="col" className="px-3 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Entity Name
                  </th>
                  <th scope="col" className="px-3 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Code
                  </th>
                  <th scope="col" className="px-3 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Address
                  </th>
                  <th scope="col" className="px-3 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Commercial Register No.
                  </th>
                  <th scope="col" className="px-3 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Tax ID
                  </th>
                  <th scope="col" className="px-3 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Contact Person
                  </th>
                  <th scope="col" className="px-3 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Contact Email
                  </th>
                  <th scope="col" className="px-3 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th scope="col" className="px-3 py-2.5 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {entities.map((entity) => (
                  <tr key={entity.id} className={`hover:bg-slate-50/80 transition-colors ${entity.is_deleted ? 'bg-slate-50 opacity-60' : ''}`}>
                    <td className="px-3 py-2.5 text-sm font-medium text-slate-900 max-w-[180px] truncate" title={entity.entity_name}>
                      {entity.entity_name} {entity.is_deleted && <span className="ml-2 px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-rose-50 text-rose-700 border border-rose-200">Deleted</span>}
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap text-sm text-slate-600">{entity.code || 'N/A'}</td>
                    <td className="px-3 py-2.5 text-sm text-slate-600 max-w-[180px] truncate" title={entity.address || ''}>{entity.address || 'N/A'}</td>
                    <td className="px-3 py-2.5 whitespace-nowrap text-sm text-slate-600">{entity.commercial_register_number || 'N/A'}</td>
                    <td className="px-3 py-2.5 whitespace-nowrap text-sm text-slate-600">{entity.tax_id || 'N/A'}</td>
                    <td className="px-3 py-2.5 whitespace-nowrap text-sm text-slate-600">{entity.contact_person || 'N/A'}</td>
                    <td className="px-3 py-2.5 text-sm text-slate-600 max-w-[180px] truncate" title={entity.contact_email || ''}>{entity.contact_email || 'N/A'}</td>
                    <td className="px-3 py-2.5 whitespace-nowrap text-sm text-slate-600">
                      {entity.is_active ? (
                        <span className="px-2 py-0.5 inline-flex text-xs font-semibold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                          Active
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 inline-flex text-xs font-semibold rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                          Inactive
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap text-right text-sm font-medium">
                      {/* Toggle Active/Inactive */}
                      {!entity.is_deleted && (
                        <button
                          onClick={() => handleToggleActive(entity.id, entity.entity_name, entity.is_active)}
                          className={`p-1.5 rounded-lg hover:bg-slate-100 mr-1.5 transition-colors ${entity.is_active ? 'text-slate-500 hover:text-slate-700' : 'text-indigo-600 hover:text-indigo-800'}`}
                          title={entity.is_active ? 'Deactivate' : 'Activate'}
                        >
                          {entity.is_active ? <ToggleRight className="h-4 w-4" /> : <ToggleLeft className="h-4 w-4" />}
                        </button>
                      )}
                      {entity.is_deleted ? (
                        <button
                          onClick={() => handleRestoreEntity(entity.id, entity.entity_name)}
                          className="text-emerald-600 hover:text-emerald-800 p-1.5 rounded-lg hover:bg-emerald-50 transition-colors"
                          title="Restore Entity"
                        >
                          <RotateCcw className="h-4 w-4" />
                        </button>
                      ) : (
                        <>
                          <button
                            onClick={() => handleEditEntityClick(entity)}
                            className="text-indigo-600 hover:text-indigo-800 mr-1.5 p-1.5 rounded-lg hover:bg-indigo-50 transition-colors"
                            title="Edit Entity"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteEntity(entity.id, entity.entity_name)}
                            className="text-rose-600 hover:text-rose-800 p-1.5 rounded-lg hover:bg-rose-50 transition-colors"
                            title="Delete Entity"
                          >
                            <Trash className="h-4 w-4" />
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Customer Users Section (with actions) */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-base font-bold text-slate-900">Customer Users ({users.length})</h3>
          <button
            onClick={() => {
              setShowUserForm(!showUserForm);
              setEditingUser(null);
            }}
            className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 shadow-sm transition-colors"
          >
            {showUserForm ? 'Hide Form' : <><PlusCircle className="h-4 w-4 mr-1.5" /> Add New User</>}
          </button>
        </div>

        {showUserForm && (
          <UserForm 
            customerId={id} 
            userToEdit={editingUser}
            onUserSaved={fetchCustomerDetails} 
            onCancel={handleCancelUserForm} 
            customerEntities={entities} 
          />
        )}
        
        {users.length === 0 && !showUserForm ? (
          <p className="text-slate-500 italic text-sm">No users found for this customer.</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200/80">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50/80">
                <tr>
                  <th scope="col" className="px-3 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Email
                  </th>
                  <th scope="col" className="px-3 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Role
                  </th>
                  <th scope="col" className="px-3 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Entity Access
                  </th>
                  <th scope="col" className="px-3 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th scope="col" className="px-3 py-2.5 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {users.map((user) => (
                  <tr key={user.id} className={`hover:bg-slate-50/80 transition-colors ${user.is_deleted ? 'bg-slate-50 opacity-60' : ''}`}>
                    <td className="px-3 py-2.5 text-sm font-medium text-slate-900 max-w-[220px] truncate" title={user.email}>{user.email}</td>
                    <td className="px-3 py-2.5 whitespace-nowrap text-sm text-slate-600 capitalize">{user.role}</td>
                    <td className="px-3 py-2.5 text-sm text-slate-600 max-w-[220px] truncate" title={user.has_all_entity_access ? 'All Entities' : user.entities_with_access.map(e => e.entity_name).join(', ')}>
                      {user.has_all_entity_access ? 'All Entities' : user.entities_with_access.map(e => e.entity_name).join(', ')}
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap text-sm text-slate-600">
                      {user.is_deleted ? (
                        <span className="px-2 py-0.5 inline-flex text-xs font-semibold rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                          Deleted
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 inline-flex text-xs font-semibold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                          Active
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap text-right text-sm font-medium">
                      {user.is_deleted ? (
                        <button onClick={() => handleUserAction('restore', user.id, user.email)} className="text-emerald-600 hover:text-emerald-800 p-1.5 rounded-lg hover:bg-emerald-50 transition-colors" title="Restore User">
                          <RotateCcw className="h-4 w-4" />
                        </button>
                      ) : (
                        <>
                          <button 
                            onClick={() => handleUserAction('resend-invitation', user.id, user.email)} 
                            className="text-blue-600 hover:text-blue-800 mr-1.5 p-1.5 rounded-lg hover:bg-blue-50 transition-colors" 
                            title="Resend Activation Invitation Email (SendOnly)"
                          >
                            <Mail className="h-4 w-4" />
                          </button>
                          <button onClick={() => handleEditUser(user)} className="text-indigo-600 hover:text-indigo-800 mr-1.5 p-1.5 rounded-lg hover:bg-indigo-50 transition-colors" title="Edit User">
                            <Edit className="h-4 w-4" />
                          </button>
                          <button onClick={() => handleUserAction('delete', user.id, user.email)} className="text-rose-600 hover:text-rose-800 p-1.5 rounded-lg hover:bg-rose-50 transition-colors" title="Delete User">
                            <Trash className="h-4 w-4" />
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showEmergencyModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-rose-200 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3.5 bg-rose-50/80 border-b border-rose-200">
              <div className="flex items-center gap-2 text-rose-800">
                <AlertTriangle className="h-5 w-5 text-rose-600" />
                <h3 className="text-base font-bold">Emergency: Force Password Change</h3>
              </div>
              <button
                type="button"
                onClick={() => !isForcingPasswordReset && setShowEmergencyModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-rose-100/60 transition-colors"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <p className="text-sm text-slate-700 leading-relaxed">
                This will immediately require <strong>all active users of {customer.name}</strong> to set a new password (matching the active policy) on their next action or login.
              </p>
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
                  Reason / Audit Note (Optional)
                </label>
                <textarea
                  rows={2}
                  value={emergencyReason}
                  onChange={(e) => setEmergencyReason(e.target.value)}
                  placeholder="e.g., Customer IT requested immediate password rotation after policy increase"
                  className="w-full text-sm px-3 py-2 border border-slate-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-rose-500"
                  disabled={isForcingPasswordReset}
                />
              </div>
            </div>
            <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setShowEmergencyModal(false)}
                disabled={isForcingPasswordReset}
                className="px-4 py-2 text-sm font-medium rounded-xl border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 shadow-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCustomerForcePasswordChange}
                disabled={isForcingPasswordReset}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-xl bg-rose-600 text-white hover:bg-rose-700 disabled:opacity-50 shadow-sm"
              >
                {isForcingPasswordReset ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
                <span>Confirm Force Change</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default CustomerDetailsPage;