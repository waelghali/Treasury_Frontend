import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { apiRequest } from 'services/apiService.js';
import { Loader2 } from 'lucide-react'; // Added Loader2

// Common input field styling classes
const inputClassNames = "mt-1 block w-full text-sm px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-800 shadow-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors";
const labelClassNames = "block text-xs font-semibold text-slate-700";
const requiredSpan = <span className="text-rose-500">*</span>;

// Custom Toggle Switch Component (reusable)
const ToggleSwitch = ({ id, name, checked, onChange, label }) => (
  <label htmlFor={id} className="relative inline-flex items-center cursor-pointer py-1">
    <input
      type="checkbox"
      name={name}
      id={id}
      checked={checked}
      onChange={onChange}
      className="sr-only peer"
    />
    <div className="w-11 h-6 bg-slate-200 shrink-0 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-indigo-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[6px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
    <span className="ml-3 text-sm font-medium text-slate-800">{label}</span>
  </label>
);


function SubscriptionPlanForm({ onLogout }) {
  const { id } = useParams();
  const navigate = useNavigate();

  // State for form fields
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    duration_months: 12,
    monthly_price: 0.00,
    annual_price: 0.00,
    max_users: 1,
    max_records: 0,
    can_maker_checker: false,
    can_multi_entity: false,
    can_ai_integration: false,
    can_image_storage: false,
    // Module Access
    has_custody_module: true,
    has_issuance_module: false,
    has_quotation_module: true,
    has_reconciliation_module: true,
    // Limits
    max_checker_users: 0,
    max_issuance_records: 0,
    grace_period_days: 30,
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [formTitle, setFormTitle] = useState('Create New Subscription Plan');

  // Fetch plan data if in edit mode
  useEffect(() => {
    const fetchPlan = async () => {
      if (id) { // If ID exists, we are in edit mode
        setFormTitle('Edit Subscription Plan');
        setIsLoading(true);
        setError('');
        try {
          const plan = await apiRequest(`/system-owner/subscription-plans/${id}`, 'GET');
          setFormData({
            name: plan.name || '',
            description: plan.description || '',
            duration_months: plan.duration_months || 12,
            monthly_price: plan.monthly_price || 0.00,
            annual_price: plan.annual_price || 0.00,
            max_users: plan.max_users || 1,
            max_records: plan.max_records || 0,
            can_maker_checker: plan.can_maker_checker || false,
            can_multi_entity: plan.can_multi_entity || false,
            can_ai_integration: plan.can_ai_integration || false,
            can_image_storage: plan.can_image_storage || false,
            // Module Access
            has_custody_module: plan.has_custody_module !== undefined ? plan.has_custody_module : true,
            has_issuance_module: plan.has_issuance_module || false,
            has_quotation_module: plan.has_quotation_module !== undefined ? plan.has_quotation_module : true,
            has_reconciliation_module: plan.has_reconciliation_module !== undefined ? plan.has_reconciliation_module : true,
            // Limits
            max_checker_users: plan.max_checker_users || 0,
            max_issuance_records: plan.max_issuance_records || 0,
            grace_period_days: plan.grace_period_days !== undefined ? plan.grace_period_days : 30,
          });
        } catch (err) {
          console.error('Failed to fetch plan for editing:', err);
          setError('Failed to load plan details for editing. Please try again.');
        } finally {
          setIsLoading(false);
        }
      } else {
        // Not in edit mode, so no data to fetch, just set loading to false
        setIsLoading(false);
        setFormTitle('Create New Subscription Plan');
      }
    };

    fetchPlan();
  }, [id]); // Re-run effect if ID changes (e.g., navigating from new to edit)

  // Handle form field changes
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prevData) => ({
      ...prevData,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    setError('');

    try {
      if (id) {
        // Update existing plan
        await apiRequest(`/system-owner/subscription-plans/${id}`, 'PUT', formData);
        alert('Subscription plan updated successfully!');
      } else {
        // Create new plan
        await apiRequest('/system-owner/subscription-plans', 'POST', formData);
        alert('Subscription plan created successfully!');
      }
      navigate('/system-owner/subscription-plans'); // Go back to the list after success
    } catch (err) {
      console.error('Error saving plan:', err);
      setError(`Error saving plan: ${err.message || 'An unexpected error occurred.'}`);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <Loader2 className="h-8 w-8 text-indigo-600 animate-spin" />
        <p className="text-sm text-slate-500 mt-3">Loading plan data...</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <div>
        <h2 className="text-xl font-bold text-slate-900">{formTitle}</h2>
        <p className="text-xs text-slate-500 mt-0.5">Configure pricing, usage quotas, feature entitlements, and module access.</p>
      </div>

      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-xl text-sm" role="alert">
          <span className="block sm:inline">{error}</span>
        </div>
      )}

      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Plan Name */}
          <div>
            <label htmlFor="name" className={labelClassNames}>Plan Name {requiredSpan}</label>
            <input
              type="text"
              name="name"
              id="name"
              value={formData.name}
              onChange={handleChange}
              required
              className={inputClassNames}
            />
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className={labelClassNames}>Description</label>
            <textarea
              name="description"
              id="description"
              rows="3"
              value={formData.description}
              onChange={handleChange}
              className={inputClassNames}
            ></textarea>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Duration Months */}
            <div>
              <label htmlFor="duration_months" className={labelClassNames}>Duration (Months) {requiredSpan}</label>
              <input
                type="number"
                name="duration_months"
                id="duration_months"
                value={formData.duration_months}
                onChange={handleChange}
                required
                min="1"
                className={inputClassNames}
              />
            </div>

            {/* Monthly Price */}
            <div>
              <label htmlFor="monthly_price" className={labelClassNames}>Monthly Price {requiredSpan}</label>
              <input
                type="number"
                name="monthly_price"
                id="monthly_price"
                value={formData.monthly_price}
                onChange={handleChange}
                required
                min="0"
                step="0.01"
                className={inputClassNames}
              />
            </div>

            {/* Annual Price */}
            <div>
              <label htmlFor="annual_price" className={labelClassNames}>Annual Price {requiredSpan}</label>
              <input
                type="number"
                name="annual_price"
                id="annual_price"
                value={formData.annual_price}
                onChange={handleChange}
                required
                min="0"
                step="0.01"
                className={inputClassNames}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Max Users */}
            <div>
              <label htmlFor="max_users" className={labelClassNames}>Max Users {requiredSpan}</label>
              <input
                type="number"
                name="max_users"
                id="max_users"
                value={formData.max_users}
                onChange={handleChange}
                required
                min="1"
                className={inputClassNames}
              />
            </div>

            {/* Max Records */}
            <div>
              <label htmlFor="max_records" className={labelClassNames}>Max Records {requiredSpan}</label>
              <input
                type="number"
                name="max_records"
                id="max_records"
                value={formData.max_records}
                onChange={handleChange}
                required
                min="0"
                className={inputClassNames}
              />
            </div>
          </div>

          {/* Feature Checkboxes (now using ToggleSwitch) */}
          <div className="bg-slate-50/80 border border-slate-200 rounded-xl p-4">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-3">Features</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <ToggleSwitch
                id="can_maker_checker"
                name="can_maker_checker"
                checked={formData.can_maker_checker}
                onChange={handleChange}
                label="Maker/Checker Workflow"
              />
              <ToggleSwitch
                id="can_multi_entity"
                name="can_multi_entity"
                checked={formData.can_multi_entity}
                onChange={handleChange}
                label="Multi-Entity Support"
              />
              <ToggleSwitch
                id="can_ai_integration"
                name="can_ai_integration"
                checked={formData.can_ai_integration}
                onChange={handleChange}
                label="AI Integration"
              />
              <ToggleSwitch
                id="can_image_storage"
                name="can_image_storage"
                checked={formData.can_image_storage}
                onChange={handleChange}
                label="Image Storage"
              />
            </div>
          </div>

          {/* Module Access Section */}
          <div className="border border-indigo-200/80 rounded-xl p-4 bg-indigo-50/40">
            <p className="text-xs font-bold uppercase tracking-wider text-indigo-800 mb-3">Module Access</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <ToggleSwitch
                id="has_custody_module"
                name="has_custody_module"
                checked={formData.has_custody_module}
                onChange={handleChange}
                label="LG Custody Module (Phase 1)"
              />
              <ToggleSwitch
                id="has_issuance_module"
                name="has_issuance_module"
                checked={formData.has_issuance_module}
                onChange={handleChange}
                label="LG Issuance Module (Phase 2)"
              />
              <ToggleSwitch
                id="has_quotation_module"
                name="has_quotation_module"
                checked={formData.has_quotation_module}
                onChange={handleChange}
                label="FX & T-Bill Quotation Module"
              />
              <ToggleSwitch
                id="has_reconciliation_module"
                name="has_reconciliation_module"
                checked={formData.has_reconciliation_module}
                onChange={handleChange}
                label="Bank Reconciliation Module"
              />
            </div>
          </div>

          {/* Additional Limits */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label htmlFor="max_checker_users" className={labelClassNames}>Max Checker Users</label>
              <input
                type="number"
                name="max_checker_users"
                id="max_checker_users"
                value={formData.max_checker_users}
                onChange={handleChange}
                min="0"
                className={inputClassNames}
              />
            </div>
            <div>
              <label htmlFor="max_issuance_records" className={labelClassNames}>Max Issuance Records</label>
              <input
                type="number"
                name="max_issuance_records"
                id="max_issuance_records"
                value={formData.max_issuance_records}
                onChange={handleChange}
                min="0"
                className={inputClassNames}
              />
            </div>
            <div>
              <label htmlFor="grace_period_days" className={labelClassNames}>Grace Period (Days)</label>
              <input
                type="number"
                name="grace_period_days"
                id="grace_period_days"
                value={formData.grace_period_days}
                onChange={handleChange}
                min="0"
                className={inputClassNames}
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2.5 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => navigate('/system-owner/subscription-plans')}
              className="inline-flex items-center justify-center px-4 py-2 border border-slate-300 text-sm font-semibold rounded-xl shadow-xs text-slate-700 bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
              disabled={isSaving}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-semibold rounded-xl shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
              disabled={isSaving}
            >
              {isSaving && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              {id ? (isSaving ? 'Updating...' : 'Update Plan') : (isSaving ? 'Creating...' : 'Create Plan')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default SubscriptionPlanForm;
