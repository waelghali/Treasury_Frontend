import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { apiRequest } from 'services/apiService.js';
import RangeBarController from '../../../components/RangeBarController';
import { Loader2 } from 'lucide-react';

function GlobalConfigurationForm({ onLogout }) {
  const { id } = useParams(); // Get config ID from URL for editing (will be undefined for new)
  const navigate = useNavigate();

  // State for form fields
  const [formData, setFormData] = useState({
    key: '',
    value_min: '',
    value_max: '',
    value_default: '',
    unit: '',
    description: '',
    config_scope: 'CUSTOMER_CONFIGURABLE',
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [formTitle, setFormTitle] = useState('Create New Global Configuration');

  // Fetch config data if in edit mode
  useEffect(() => {
    const fetchConfig = async () => {
      if (id) { // If ID exists, we are in edit mode
        setFormTitle('Edit Global Configuration');
        setIsLoading(true);
        setError('');
        try {
          const config = await apiRequest(`/system-owner/global-configurations/${id}`, 'GET');
          setFormData({
            key: config.key ?? '',
            value_min: config.value_min != null && config.value_min !== 'null' ? String(config.value_min) : '',
            value_max: config.value_max != null && config.value_max !== 'null' ? String(config.value_max) : '',
            value_default: config.value_default != null && config.value_default !== 'null' ? String(config.value_default) : '',
            unit: config.unit ?? '',
            description: config.description ?? '',
            config_scope: config.config_scope ?? 'CUSTOMER_CONFIGURABLE',
          });
        } catch (err) {
          console.error('Failed to fetch config for editing:', err);
          setError('Failed to load configuration details for editing. Please try again.');
        } finally {
          setIsLoading(false);
        }
      } else {
        // Not in edit mode, so no data to fetch, just set loading to false
        setIsLoading(false);
        setFormTitle('Create New Global Configuration');
      }
    };

    fetchConfig();
  }, [id]); // Re-run effect if ID changes (e.g., navigating from new to edit)

  // Handle form field changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prevData) => ({
      ...prevData,
      [name]: value,
    }));
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    setError('');

    // Validate min <= default <= max for numeric settings
    const numMin = parseFloat(formData.value_min);
    const numMax = parseFloat(formData.value_max);
    const numDef = parseFloat(formData.value_default);

    if (!isNaN(numMin) && !isNaN(numMax)) {
      if (numMin > numMax) {
        setError(`Minimum value (${numMin}) cannot exceed Maximum value (${numMax}).`);
        setIsSaving(false);
        return;
      }
      if (!isNaN(numDef)) {
        if (numDef < numMin || numDef > numMax) {
          setError(`Default value (${numDef}) must be between Minimum (${numMin}) and Maximum (${numMax}).`);
          setIsSaving(false);
          return;
        }
      }
    }

    try {
      if (id) {
        // Update existing config
        await apiRequest(`/system-owner/global-configurations/${id}`, 'PUT', formData);
        alert('Global configuration updated successfully!');
      } else {
        // Create new config
        await apiRequest('/system-owner/global-configurations', 'POST', formData);
        alert('Global configuration created successfully!');
      }
      navigate('/system-owner/global-configurations'); // Go back to the list after success
    } catch (err) {
      console.error('Error saving configuration:', err);
      setError(`Error saving configuration: ${err.message || 'An unexpected error occurred.'}`);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <Loader2 className="h-8 w-8 text-indigo-600 animate-spin" />
        <p className="text-sm text-slate-500 mt-3">Loading configuration data...</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <div>
        <h2 className="text-xl font-bold text-slate-900">{formTitle}</h2>
        <p className="text-xs text-slate-500 mt-0.5">Define platform limits, default bounds, and visibility scope.</p>
      </div>

      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-xl text-sm" role="alert">
          <span className="block sm:inline">{error}</span>
        </div>
      )}

      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Key */}
          <div>
            <label htmlFor="key" className="block text-xs font-semibold text-slate-700 mb-1">Configuration Key</label>
            <input
              type="text"
              name="key"
              id="key"
              value={formData.key}
              onChange={handleChange}
              required
              readOnly={!!id}
              className={`block w-full text-sm px-3 py-2 rounded-xl border border-slate-300 shadow-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors ${id ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : 'bg-white text-slate-800'}`}
            />
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className="block text-xs font-semibold text-slate-700 mb-1">Description</label>
            <textarea
              name="description"
              id="description"
              rows="3"
              value={formData.description}
              onChange={handleChange}
              className="block w-full text-sm px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-800 shadow-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
            ></textarea>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Min Value */}
            <div>
              <label htmlFor="value_min" className="block text-xs font-semibold text-slate-700 mb-1">Minimum Value (as string)</label>
              <input
                type="text"
                name="value_min"
                id="value_min"
                value={formData.value_min}
                onChange={handleChange}
                className="block w-full text-sm px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-800 shadow-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
              />
            </div>

            {/* Max Value */}
            <div>
              <label htmlFor="value_max" className="block text-xs font-semibold text-slate-700 mb-1">Maximum Value (as string)</label>
              <input
                type="text"
                name="value_max"
                id="value_max"
                value={formData.value_max}
                onChange={handleChange}
                className="block w-full text-sm px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-800 shadow-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
              />
            </div>

            {/* Default Value */}
            <div>
              <label htmlFor="value_default" className="block text-xs font-semibold text-slate-700 mb-1">Default Value (as string)</label>
              {formData.unit === 'json' || formData.unit === 'emails_json_array' || (typeof formData.value_default === 'string' && formData.value_default.startsWith('{')) ? (
                <textarea
                  name="value_default"
                  id="value_default"
                  rows={4}
                  value={formData.value_default}
                  onChange={handleChange}
                  className="block w-full text-sm font-mono px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-800 shadow-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                />
              ) : (
                <input
                  type="text"
                  name="value_default"
                  id="value_default"
                  value={formData.value_default}
                  onChange={handleChange}
                  className="block w-full text-sm px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-800 shadow-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                />
              )}
            </div>
          </div>

          {/* Visual Range Bar Controller Preview (For numeric settings) */}
          {!isNaN(parseFloat(formData.value_min)) && !isNaN(parseFloat(formData.value_max)) && parseFloat(formData.value_max) > parseFloat(formData.value_min) && (
            <div className="p-4 bg-slate-50/80 rounded-xl border border-slate-200">
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                Range Bar Controller Preview (Min / Default / Max)
              </label>
              <RangeBarController
                min={parseFloat(formData.value_min)}
                max={parseFloat(formData.value_max)}
                defaultVal={parseFloat(formData.value_default || formData.value_min)}
                value={parseFloat(formData.value_default || formData.value_min)}
                onChange={(v) => setFormData(prev => ({ ...prev, value_default: String(v) }))}
                unit={formData.unit || ''}
                compact={false}
                showLabels={true}
              />
              <p className="text-[11px] text-slate-500 mt-2">
                Drag the slider or click along the track to adjust the default value within the specified [Min - Max] bounds.
              </p>
            </div>
          )}

          {/* Unit */}
          <div>
            <label htmlFor="unit" className="block text-xs font-semibold text-slate-700 mb-1">Unit (e.g., days, percentage)</label>
            <input
              type="text"
              name="unit"
              id="unit"
              value={formData.unit}
              onChange={handleChange}
              className="block w-full text-sm px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-800 shadow-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
            />
          </div>

          {/* Ownership Scope */}
          <div>
            <label htmlFor="config_scope" className="block text-xs font-semibold text-slate-700 mb-1">Ownership &amp; Visibility Scope</label>
            <select
              name="config_scope"
              id="config_scope"
              value={formData.config_scope}
              onChange={handleChange}
              className="block w-full text-sm px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-800 shadow-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
            >
              <option value="CUSTOMER_CONFIGURABLE">Customer Configurable (Corporate Admins can adjust within [Min - Max])</option>
              <option value="SYSTEM_CUSTOMER_OVERRIDE">System Owner Only — Per-Customer Override (Hidden from Corporate Admins)</option>
              <option value="PLATFORM_GLOBAL">Platform Global Only (Single platform-wide setting, hidden from Corporate Admins)</option>
            </select>
            <p className="text-xs text-slate-500 mt-1.5">
              Controls whether Corporate Admins can view/edit this setting or if it is reserved for the System Owner.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2.5 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => navigate('/system-owner/global-configurations')}
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
                <Loader2 className="animate-spin -ml-0.5 mr-2 h-4 w-4 text-white" />
              )}
              {id ? (isSaving ? 'Updating...' : 'Update Configuration') : (isSaving ? 'Creating...' : 'Create Configuration')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default GlobalConfigurationForm;
