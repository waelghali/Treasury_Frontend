import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiRequest } from 'services/apiService.js';
import { PlusCircle, MinusCircle, ShieldCheck, Mail, KeyRound, AlertTriangle, Loader2 } from 'lucide-react';

// Common input field styling classes
const inputClassNames = "mt-1 block w-full text-sm px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-800 shadow-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors";
const labelClassNames = "block text-xs font-semibold text-slate-700 mb-0.5";
const requiredSpan = <span className="text-rose-500">*</span>;

// Custom Toggle Switch Component (reusable)
const ToggleSwitch = ({ id, name, checked, onChange, label }) => (
  <label htmlFor={id} className="relative inline-flex items-center cursor-pointer mb-2">
    <input
      type="checkbox"
      name={name}
      id={id}
      checked={checked}
      onChange={onChange}
      className="sr-only peer"
    />
    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-indigo-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
    <span className="ml-3 text-sm font-medium text-slate-900">{label}</span>
  </label>
);

function CustomerOnboardingForm({ onLogout }) {
  const navigate = useNavigate();

  const [customerData, setCustomerData] = useState({
    name: '',
    address: '',
    contact_email: '',
    contact_phone: '',
    subscription_plan_id: '',
    initial_corporate_admin: {
	  email: '',
	  password: '',
	  role: 'corporate_admin',
	  has_all_entity_access: true,
	  entity_ids: [],
	},
    initial_entities: [{
      entity_name: '',
      code: '',
      contact_person: '',
      contact_email: '',
      is_active: true,
      address: '', // New field
      commercial_register_number: '', // New field
      tax_id: '', // New field
    }],
  });

  const [subscriptionPlans, setSubscriptionPlans] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [selectedPlanCanMultiEntity, setSelectedPlanCanMultiEntity] = useState(false);
  const [useManualPassword, setUseManualPassword] = useState(false);

  // Fetch subscription plans on component mount
  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const plans = await apiRequest('/system-owner/subscription-plans', 'GET');
        setSubscriptionPlans(plans);
        // Pre-select first plan if available
        if (plans.length > 0) {
          setCustomerData((prev) => ({
            ...prev,
            subscription_plan_id: plans[0].id,
          }));
          setSelectedPlanCanMultiEntity(plans[0].can_multi_entity);
        }
      } catch (err) {
        console.error('Failed to fetch subscription plans for form:', err);
        setError('Failed to load subscription plans. Cannot onboard customer.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchPlans();
  }, []);

  // Effect to update canMultiEntity flag when subscription_plan_id changes
  useEffect(() => {
    const currentPlan = subscriptionPlans.find(
      (plan) => plan.id === customerData.subscription_plan_id
    );
    setSelectedPlanCanMultiEntity(currentPlan ? currentPlan.can_multi_entity : false);
  }, [customerData.subscription_plan_id, subscriptionPlans]);


  // Handle change for main customer fields
  const handleCustomerChange = (e) => {
    const { name, value } = e.target;
    setCustomerData((prev) => ({ ...prev, [name]: value }));
  };

  // Handle change for initial corporate admin fields
  const handleAdminChange = (e) => {
    const { name, value } = e.target;
    setCustomerData((prev) => ({
      ...prev,
      initial_corporate_admin: {
        ...prev.initial_corporate_admin,
        [name]: value,
      },
    }));
  };

  // Handle adding a new entity field
  const handleAddEntity = () => {
    setCustomerData((prev) => ({
      ...prev,
      initial_entities: [
        ...prev.initial_entities, 
        { 
          entity_name: '', 
          code: '', 
          contact_person: '', 
          contact_email: '', 
          is_active: true,
          address: '',
          commercial_register_number: '',
          tax_id: ''
        }
      ],
    }));
  };

  // Auto-generate a 4-char code from entity name
  const generateCodeFromName = (name) => {
    const cleaned = name.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    if (cleaned.length <= 4) return cleaned.padEnd(4, 'X').slice(0, 4);
    // Take first 2 chars + last 2 chars for uniqueness
    return (cleaned.slice(0, 2) + cleaned.slice(-2)).slice(0, 4);
  };

  // Handle changing an entity's name or other fields
  const handleEntityChange = (index, e) => {
    const { name, value, type, checked } = e.target;
    const newEntities = [...customerData.initial_entities];
    if (name === 'code') {
      // Force uppercase and strip non-alphanumeric
      newEntities[index][name] = value.replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 4);
    } else {
      newEntities[index][name] = type === 'checkbox' ? checked : value;
    }
    // Auto-suggest code when entity_name changes and code is empty
    if (name === 'entity_name' && !newEntities[index].code && value.trim()) {
      newEntities[index].code = generateCodeFromName(value);
    }
    setCustomerData((prev) => ({ ...prev, initial_entities: newEntities }));
  };

  // Handle removing an entity field
  const handleRemoveEntity = (index) => {
    if (customerData.initial_entities.length > 1) {
      const newEntities = [...customerData.initial_entities];
      newEntities.splice(index, 1);
      setCustomerData((prev) => ({ ...prev, initial_entities: newEntities }));
    } else {
      setError("Every customer must have at least one entity.");
    }
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    setError('');

    try {
      if (customerData.initial_entities.length === 0 || customerData.initial_entities.some(entity => !entity.entity_name.trim())) {
        setError("Every customer must have at least one entity with a name.");
        setIsSaving(false);
        return;
      }
      // Validate entity codes
      const codeRegex = /^[A-Z0-9]{4}$/;
      const invalidCode = customerData.initial_entities.find(entity => !codeRegex.test(entity.code));
      if (invalidCode) {
        setError(`Entity "${invalidCode.entity_name}" has an invalid code. Code must be exactly 4 uppercase alphanumeric characters (e.g., TCMN).`);
        setIsSaving(false);
        return;
      }
      // Check for duplicate codes
      const codes = customerData.initial_entities.map(e => e.code);
      if (new Set(codes).size !== codes.length) {
        setError("Entity codes must be unique. Please use different codes for each entity.");
        setIsSaving(false);
        return;
      }
      if (!selectedPlanCanMultiEntity && customerData.initial_entities.length > 1) {
        setError("Selected subscription plan does not support multiple entities.");
        setIsSaving(false);
        return;
      }

      // --- CLEAN DATA: strip empty optional fields but ALWAYS keep required ones ---
      const requiredEntityFields = ['entity_name', 'code', 'is_active', 'address'];
      const cleanedEntities = customerData.initial_entities.map(entity => {
          const cleanedEntity = {};
          for (const key in entity) {
              // Always include required fields, strip empty optional ones
              if (requiredEntityFields.includes(key) || (entity[key] !== '' && entity[key] !== null && entity[key] !== undefined)) {
                  cleanedEntity[key] = entity[key];
              }
          }
          return cleanedEntity;
      });

      if (useManualPassword && (!customerData.initial_corporate_admin.password || customerData.initial_corporate_admin.password.length < 8)) {
        setError("Manual initial password must be at least 8 characters.");
        setIsSaving(false);
        return;
      }

      const payload = {
          ...customerData,
          // Ensure all required nested fields are explicitly set
          initial_corporate_admin: {
              ...customerData.initial_corporate_admin,
              password: useManualPassword ? customerData.initial_corporate_admin.password : '',
              // These fields are required by the backend schema
              has_all_entity_access: true, 
              entity_ids: [],
          },
          initial_entities: cleanedEntities,
      };

      await apiRequest('/system-owner/customers/onboard', 'POST', payload);
      alert('Customer onboarded successfully!');
      navigate('/system-owner/customers');
    } catch (err) {
      console.error('Error onboarding customer:', err);
      setError(`Onboarding failed: ${err.message || 'An unexpected error occurred.'}`);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <Loader2 className="h-8 w-8 text-indigo-600 animate-spin" />
        <p className="text-sm text-slate-500 mt-3">Loading data...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      <div>
        <h2 className="text-xl font-bold text-slate-900">Onboard New Customer</h2>
        <p className="text-xs text-slate-500 mt-0.5">Provision an organization, initial corporate administrator, and legal entities.</p>
      </div>

      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-xl text-sm" role="alert">
          <span className="block sm:inline">{error}</span>
        </div>
      )}

      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Customer Details Section */}
          <div className="border border-slate-200 bg-slate-50/50 rounded-xl p-4">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-3">Customer Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              <div>
                <label htmlFor="name" className={labelClassNames}>Organization Name {requiredSpan}</label>
                <input type="text" name="name" id="name" value={customerData.name} onChange={handleCustomerChange} required className={inputClassNames} />
              </div>
              <div>
                <label htmlFor="address" className={labelClassNames}>Address</label>
                <input type="text" name="address" id="address" value={customerData.address} onChange={handleCustomerChange} className={inputClassNames} />
              </div>
              <div>
                <label htmlFor="contact_email" className={labelClassNames}>Contact Email {requiredSpan}</label>
                <input type="email" name="contact_email" id="contact_email" value={customerData.contact_email} onChange={handleCustomerChange} required className={inputClassNames} />
              </div>
              <div>
                <label htmlFor="contact_phone" className={labelClassNames}>Contact Phone</label>
                <input type="text" name="contact_phone" id="contact_phone" value={customerData.contact_phone} onChange={handleCustomerChange} className={inputClassNames} />
              </div>
              <div className="md:col-span-2">
                <label htmlFor="subscription_plan_id" className={labelClassNames}>Subscription Plan {requiredSpan}</label>
                <select
                  name="subscription_plan_id"
                  id="subscription_plan_id"
                  value={customerData.subscription_plan_id}
                  onChange={handleCustomerChange}
                  required
                  className={inputClassNames}
                >
                  {subscriptionPlans.map((plan) => (
                    <option key={plan.id} value={plan.id}>
                      {plan.name} (Max Users: {plan.max_users}, Max Records: {plan.max_records}, Multi-Entity: {plan.can_multi_entity ? 'Yes' : 'No'})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Initial Corporate Admin Section with Zero-Touch Onboarding */}
          <div className="border border-indigo-200/80 bg-indigo-50/40 rounded-xl p-4 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-3 gap-2">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-xl bg-indigo-100 flex items-center justify-center text-indigo-600 flex-shrink-0">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Initial Corporate Admin User</h3>
                  <p className="text-xs text-slate-500">Primary administrator account for this organization</p>
                </div>
              </div>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 self-start sm:self-auto">
                🛡️ Zero-Knowledge Protected
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
              <div>
                <label htmlFor="admin_email" className={labelClassNames}>Admin Corporate Email {requiredSpan}</label>
                <input
                  type="email"
                  name="email"
                  id="admin_email"
                  value={customerData.initial_corporate_admin.email}
                  onChange={handleAdminChange}
                  required
                  placeholder="admin@organization.com"
                  className={inputClassNames}
                />
              </div>

              {!useManualPassword ? (
                <div className="bg-white border border-emerald-200 rounded-xl p-3.5 shadow-xs">
                  <div className="flex items-start space-x-2.5">
                    <Mail className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-xs font-bold text-emerald-900 uppercase tracking-wide">Automated Zero-Touch Invitation</h4>
                      <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                        A private, single-use 24-hour activation link will be automatically emailed to this address. The Corporate Admin sets their confidential password directly in their browser.
                      </p>
                      <p className="text-[11px] text-slate-400 mt-1 italic">
                        ⚡ SendOnly mode: never saved to Sent Items. As System Owner, you will never see or know their password.
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5">
                  <div className="flex items-center space-x-1.5 text-amber-800 text-xs font-bold mb-1.5">
                    <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                    <span>Manual Password Entry (Testing / Diagnostic Mode)</span>
                  </div>
                  <label htmlFor="admin_password" className={labelClassNames}>Set Initial Password {requiredSpan}</label>
                  <input
                    type="password"
                    name="password"
                    id="admin_password"
                    value={customerData.initial_corporate_admin.password}
                    onChange={handleAdminChange}
                    required
                    minLength="8"
                    placeholder="Minimum 8 characters"
                    className={inputClassNames}
                  />
                  <p className="text-[11px] text-amber-700 mt-1">
                    ⚠️ Manual entry bypasses Zero-Touch. The user will still be required to change password on first login.
                  </p>
                </div>
              )}
            </div>

            {/* Toggle for manual password */}
            <div className="mt-3 flex justify-end">
              <button
                type="button"
                onClick={() => {
                  setUseManualPassword(!useManualPassword);
                  if (useManualPassword) {
                    setCustomerData(prev => ({
                      ...prev,
                      initial_corporate_admin: { ...prev.initial_corporate_admin, password: '' }
                    }));
                  }
                }}
                className="text-xs font-medium text-indigo-600 hover:text-indigo-800 hover:underline flex items-center space-x-1"
              >
                <KeyRound className="w-3.5 h-3.5 mr-1" />
                <span>{useManualPassword ? '← Return to Zero-Touch Automated Invitation (Recommended)' : '⚙️ Set Initial Password Manually (Testing Only)'}</span>
              </button>
            </div>
          </div>

          {/* Initial Entities Section */}
          <div className="border border-slate-200 bg-slate-50/50 rounded-xl p-4">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-1">Customer Entities</h3>
            <p className="text-xs text-slate-500 mb-3">Every customer must have at least one entity. More entities can be added if the selected subscription plan supports multi-entity.</p>
            <div className="space-y-3">
              {customerData.initial_entities.map((entity, index) => (
                <div key={index} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5 items-center border border-slate-200 bg-white p-3.5 rounded-xl">
                  <div>
                    <label htmlFor={`entity_name_${index}`} className={labelClassNames}>Entity Name {requiredSpan}</label>
                    <input
                      type="text"
                      name="entity_name"
                      id={`entity_name_${index}`}
                      value={entity.entity_name}
                      onChange={(e) => handleEntityChange(index, e)}
                      required
                      className={inputClassNames}
                      placeholder={`Main Entity` + (index > 0 ? ` ${index+1}` : '')}
                    />
                  </div>
                  <div>
                    <label htmlFor={`code_${index}`} className={labelClassNames}>Entity Code {requiredSpan}</label>
                    <input
                      type="text"
                      name="code"
                      id={`code_${index}`}
                      value={entity.code}
                      onChange={(e) => handleEntityChange(index, e)}
                      required
                      maxLength="4"
                      minLength="4"
                      pattern="[A-Z0-9]{4}"
                      title="Exactly 4 uppercase letters or digits (e.g., TCMN)"
                      placeholder="e.g., TCMN"
                      className={inputClassNames}
                    />
                  </div>
                  <div>
                    <label htmlFor={`address_${index}`} className={labelClassNames}>Address {requiredSpan}</label>
                    <input
                      type="text"
                      name="address"
                      id={`address_${index}`}
                      value={entity.address}
                      onChange={(e) => handleEntityChange(index, e)}
                      required
                      className={inputClassNames}
                    />
                  </div>
                  <div>
                    <label htmlFor={`commercial_register_number_${index}`} className={labelClassNames}>Commercial Register Number</label>
                    <input
                      type="text"
                      name="commercial_register_number"
                      id={`commercial_register_number_${index}`}
                      value={entity.commercial_register_number}
                      onChange={(e) => handleEntityChange(index, e)}
                      className={inputClassNames}
                    />
                  </div>
                  <div>
                    <label htmlFor={`tax_id_${index}`} className={labelClassNames}>Tax ID</label>
                    <input
                      type="text"
                      name="tax_id"
                      id={`tax_id_${index}`}
                      value={entity.tax_id}
                      onChange={(e) => handleEntityChange(index, e)}
                      className={inputClassNames}
                    />
                  </div>
                  <div>
                    <label htmlFor={`contact_person_${index}`} className={labelClassNames}>Contact Person (Optional)</label>
                    <input
                      type="text"
                      name="contact_person"
                      id={`contact_person_${index}`}
                      value={entity.contact_person}
                      onChange={(e) => handleEntityChange(index, e)}
                      className={inputClassNames}
                    />
                  </div>
                  <div className="flex items-end h-full">
                    <div className="flex-grow">
                      <label htmlFor={`contact_email_${index}`} className={labelClassNames}>Contact Email (Optional)</label>
                      <input
                        type="email"
                        name="contact_email"
                        id={`contact_email_${index}`}
                        value={entity.contact_email}
                        onChange={(e) => handleEntityChange(index, e)}
                        className={inputClassNames}
                      />
                    </div>
                    {(selectedPlanCanMultiEntity && customerData.initial_entities.length > 1) && (
                      <button
                        type="button"
                        onClick={() => handleRemoveEntity(index)}
                        className="ml-2 p-2 rounded-lg text-rose-600 hover:bg-rose-50 focus:outline-none transition-colors"
                        title="Remove entity"
                      >
                        <MinusCircle className="h-5 w-5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
            {selectedPlanCanMultiEntity && (
              <button
                type="button"
                onClick={handleAddEntity}
                className="mt-3 inline-flex items-center px-3.5 py-2 border border-transparent text-xs font-semibold rounded-xl shadow-xs text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
              >
                <PlusCircle className="h-4 w-4 mr-1.5" /> Add Another Entity
              </button>
            )}
            {!selectedPlanCanMultiEntity && customerData.initial_entities.length === 1 && (
               <p className="mt-3 text-xs text-slate-500 italic">Your selected plan supports only one entity. To add more, please upgrade your subscription plan.</p>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2.5 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => navigate('/system-owner/customers')}
              className="w-full sm:w-auto inline-flex items-center justify-center px-4 py-2 border border-slate-300 text-sm font-semibold rounded-xl shadow-xs text-slate-700 bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
              disabled={isSaving}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="w-full sm:w-auto inline-flex items-center justify-center px-5 py-2 border border-transparent text-sm font-semibold rounded-xl shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
              disabled={isSaving}
            >
              {isSaving && (
                <Loader2 className="animate-spin -ml-0.5 mr-2 h-4 w-4 text-white" />
              )}
              {isSaving ? 'Onboarding...' : 'Onboard Customer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default CustomerOnboardingForm;