import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { apiRequest } from 'services/apiService.js';
import { Save, XCircle, Loader2 } from 'lucide-react';

const inputClassNames = "mb-2 mt-1 block w-full text-base px-3 py-2 rounded-md border border-gray-300 bg-white shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200";
const labelClassNames = "block text-sm font-medium text-gray-700";
const requiredSpan = <span className="text-red-500">*</span>;

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
    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
    <span className="ml-3 text-sm font-medium text-gray-900">{label}</span>
  </label>
);

function TemplateForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const contentTextAreaRef = useRef(null);

  const [formData, setFormData] = useState({
    name: '',
    template_type: '', 
    action_type: '',
    subject: '', 
    content: '',
    is_global: true,
    customer_id: null,
    is_notification_template: true 
  });

  // Dynamic Metadata States
  const [templateTypes, setTemplateTypes] = useState([]);
  const [actionTypes, setActionTypes] = useState([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [formTitle, setFormTitle] = useState('Create New Template');
  const [customers, setCustomers] = useState([]);
  const [placeholders, setPlaceholders] = useState([]);

  // 1. Fetch Metadata (Dropdown Options) on Load
  useEffect(() => {
    const fetchMetadata = async () => {
      try {
        const data = await apiRequest('/system-owner/template-metadata', 'GET');
        setTemplateTypes(data.template_types || []);
        setActionTypes(data.action_types || []);
        
        // Default the type if creating new
        if (!id && data.template_types?.length > 0) {
          setFormData(prev => ({ ...prev, template_type: data.template_types[0] }));
        }
      } catch (err) {
        console.error("Metadata fetch error:", err);
        setError('Failed to load system configuration constants.');
      }
    };
    fetchMetadata();
  }, [id]);

  // 2. Fetch Existing Template Data if Editing
  useEffect(() => {
    const fetchTemplate = async () => {
      if (id) {
        setFormTitle('Edit Template');
        setIsLoading(true);
        try {
          const template = await apiRequest(`/system-owner/templates/${id}`, 'GET');
          setFormData({
            name: template.name || '',
            template_type: template.template_type || '',
            action_type: template.action_type || '',
            subject: template.subject || '',
            content: template.content || '',
            is_global: template.is_global,
            customer_id: template.customer_id || null,
            is_notification_template: template.is_notification_template ?? true,
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

  // 3. Fetch Customers for non-global templates
  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        if (!formData.is_global) {
          const fetchedCustomers = await apiRequest('/system-owner/customers', 'GET');
          setCustomers(fetchedCustomers);
        }
      } catch (err) {
        setError('Failed to load customer list.');
      }
    };
    fetchCustomers();
  }, [formData.is_global]);

  const fetchPlaceholders = async (actionType) => {
    if (!actionType) return;
    try {
      const fetchedPlaceholders = await apiRequest(`/system-owner/template-placeholders?action_type=${actionType}`, 'GET');
      setPlaceholders(fetchedPlaceholders);
    } catch (err) {
      setPlaceholders([]);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    const val = type === 'checkbox' ? checked : value;

    setFormData((prev) => ({
      ...prev,
      [name]: val,
      ...(name === 'is_global' && checked ? { customer_id: null } : {}),
    }));

    if (name === 'action_type') {
      fetchPlaceholders(value);
    }
  };

  const handleInsertPlaceholder = (placeholderName) => {
    const textarea = contentTextAreaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const newContent = formData.content.substring(0, start) + placeholderName + formData.content.substring(end);
    setFormData(prev => ({ ...prev, content: newContent }));
    setTimeout(() => {
      textarea.focus();
      textarea.selectionStart = textarea.selectionEnd = start + placeholderName.length;
    }, 0);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const method = id ? 'PUT' : 'POST';
      const url = id ? `/system-owner/templates/${id}` : '/system-owner/templates';
      await apiRequest(url, method, formData);
      alert('Template saved successfully!');
      navigate('/system-owner/global-configurations/templates');
    } catch (err) {
      setError(`Error: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) return <div className="text-center py-8"><Loader2 className="animate-spin mx-auto" /></div>;

  return (
    <div className="p-4">
      <h2 className="text-2xl font-semibold mb-6">{formTitle}</h2>
      {error && <div className="bg-red-100 text-red-700 p-3 rounded mb-4">{error}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-6 rounded-lg shadow">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className={labelClassNames}>Template Name {requiredSpan}</label>
              <input type="text" name="name" value={formData.name} onChange={handleChange} required className={inputClassNames} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClassNames}>Template Type {requiredSpan}</label>
                <select name="template_type" value={formData.template_type} onChange={handleChange} required className={inputClassNames}>
                  <option value="">Select Type</option>
                  {templateTypes.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className={labelClassNames}>Action Type {requiredSpan}</label>
                <select name="action_type" value={formData.action_type} onChange={handleChange} required className={inputClassNames}>
                  <option value="">Select Action</option>
                  {actionTypes.map(a => <option key={a} value={a}>{a.replace(/_/g, ' ')}</option>)}
                </select>
              </div>
            </div>

            <ToggleSwitch id="is_global" name="is_global" checked={formData.is_global} onChange={handleChange} label="Global Template" />

            {!formData.is_global && (
              <div>
                <label className={labelClassNames}>Customer {requiredSpan}</label>
                <select name="customer_id" value={formData.customer_id || ''} onChange={handleChange} required className={inputClassNames}>
                  <option value="">Select Customer</option>
                  {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            )}

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

            <div>
              <label className={labelClassNames}>Template Content {requiredSpan}</label>
              <textarea 
                ref={contentTextAreaRef} 
                name="content" 
                rows="10" 
                value={formData.content} 
                onChange={handleChange} 
                required 
                className={`${inputClassNames} font-mono`} 
              />
            </div>

            <div className="flex justify-end space-x-3">
              <button type="button" onClick={() => navigate(-1)} className="px-4 py-2 border rounded">Cancel</button>
              <button type="submit" disabled={isSaving} className="px-4 py-2 bg-blue-600 text-white rounded">
                {isSaving ? <Loader2 className="animate-spin inline mr-2" /> : <Save className="inline mr-2" />}
                {id ? 'Update Template' : 'Create Template'}
              </button>
            </div>
          </form>
        </div>

        <div className="bg-gray-50 p-4 rounded-lg shadow max-h-[600px] overflow-y-auto">
          <h3 className="font-bold mb-3 text-gray-700">Available Placeholders</h3>
          <p className="text-xs text-gray-500 mb-4">Click to insert at cursor position</p>
          <div className="space-y-2">
            {placeholders.length > 0 ? (
              placeholders.map(p => (
                <div key={p.name} onClick={() => handleInsertPlaceholder(p.name)} className="p-2 bg-white border rounded cursor-pointer hover:bg-blue-50">
                  <code className="text-blue-600 text-sm font-bold">{p.name}</code>
                  <p className="text-xs text-gray-500">{p.description}</p>
                </div>
              ))
            ) : (
              <p className="text-gray-400 italic text-sm">Select an Action Type to see placeholders.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default TemplateForm;