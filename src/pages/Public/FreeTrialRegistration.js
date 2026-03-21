// frontend/src/pages/Public/FreeTrialRegistration.js
import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { publicApiRequest } from '../../services/apiService';
import { toast } from 'react-toastify';
import { Helmet } from 'react-helmet-async';
import { Loader2, Shield, Zap, Globe, Building2, UserCircle, Package, AlertCircle, ArrowRight, Upload } from 'lucide-react';

const benefits = [
  { icon: Shield, title: "Bank-Grade Security", description: "ISO 27001 certified vault for all your sensitive guarantee documents." },
  { icon: Zap, title: "Instant Digitization", description: "AI-powered OCR extracts data from paper instruments in seconds." },
  { icon: Globe, title: "Global Scale", description: "Automate multi-currency issuances across 140+ correspondent banks." },
];

function FreeTrialRegistration() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Pre-select module based on query param (e.g., ?module=issuance)
  const preselectedModule = searchParams.get('module');

  const [formData, setFormData] = useState({
    organization_name: '',
    organization_address: '',
    contact_admin_name: '',
    contact_phone: '',
    admin_email: '',
    entities_count: 'One',
    modules_custody: preselectedModule === 'issuance' ? false : true,
    modules_issuance: preselectedModule === 'issuance' ? true : false,
    commercial_register_document: null,
    accepted_terms: false,
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [termsContent, setTermsContent] = useState('');

  useEffect(() => {
    const fetchTerms = async () => {
      try {
        const response = await publicApiRequest('/public/legal-content/terms_and_conditions', 'GET');
        setTermsContent(response.content);
      } catch (err) {
        console.error('Failed to fetch Terms and Conditions:', err);
        setError('Failed to load Terms and Conditions. Please try again later.');
        toast.error('Failed to load legal content.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchTerms();
  }, []);

  const handleChange = (e) => {
    const { name, value, type, files, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'file' ? files[0] : (type === 'checkbox' ? checked : value),
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    setError('');
    
    if (!formData.accepted_terms) {
      setError('You must accept the Terms & Conditions.');
      toast.error('You must accept the Terms & Conditions.');
      setIsSaving(false);
      return;
    }

    if (!formData.modules_custody && !formData.modules_issuance) {
      setError('You must select at least one module.');
      toast.error('You must select at least one module.');
      setIsSaving(false);
      return;
    }

    if (!formData.commercial_register_document) {
      setError('Commercial Register document is required.');
      toast.error('Commercial Register document is required.');
      setIsSaving(false);
      return;
    }
    
    const data = new FormData();
    data.append('organization_name', formData.organization_name);
    data.append('organization_address', formData.organization_address);
    data.append('contact_admin_name', formData.contact_admin_name);
    data.append('contact_phone', formData.contact_phone);
    data.append('admin_email', formData.admin_email);
    data.append('entities_count', formData.entities_count);
    const modules = [];
    if (formData.modules_custody) modules.push('custody');
    if (formData.modules_issuance) modules.push('issuance');
    data.append('requested_modules', modules.join(','));
    data.append('commercial_register_document', formData.commercial_register_document);
    data.append('accepted_terms', String(formData.accepted_terms));

    try {
      await publicApiRequest('/public/register-free-trial/', 'POST', data);
      toast.success('Registration submitted successfully. Please check your email for a confirmation message.');
      navigate('/');
    } catch (err) {
      console.error('Registration failed:', err);
      const errorMessage = err.response?.data?.detail || err.message || 'An unexpected error occurred during submission.';
      setError(`Registration failed: ${errorMessage}`);
      toast.error(errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#1e2a4a' }}>
        <Loader2 className="h-10 w-10 text-white animate-spin" />
      </div>
    );
  }

  // Shared input styling
  const inputCls = "w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-gray-50/50";
  const labelCls = "block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5";

  return (
    <div className="min-h-screen flex flex-col" style={{ fontFamily: "'Inter', 'Segoe UI', sans-serif" }}>
      <Helmet>
        <title>Start Free Trial — Grow LG Management Platform</title>
        <meta name="description" content="Sign up for a free trial of Grow's LG management platform. Choose LG Custody, LG Issuance, or both — no credit card required. AI-powered document capture, automated alerts, and maker-checker workflows." />
        <meta property="og:title" content="Free Trial — Grow LG Management" />
        <meta property="og:description" content="Try the LG management platform built for treasurers. Choose your modules and get started in minutes." />
        <meta property="og:type" content="website" />
      </Helmet>

      {/* Top Navigation Bar — Fixed */}
      <header className="fixed top-0 left-0 right-0 z-50" style={{ backgroundColor: '#1e2a4a' }}>
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-lg font-bold text-white tracking-tight">Grow</span>
            <span className="text-xs text-blue-400 font-medium hidden sm:inline">Business Development</span>
          </div>
          <nav className="flex items-center space-x-6">
            <Link to="/" className="text-sm font-medium text-gray-300 hover:text-white transition-colors">Home</Link>
            <Link to="/know-more" className="text-sm font-medium text-gray-300 hover:text-white transition-colors">Know More</Link>
            <Link 
              to="/login" 
              className="px-4 py-1.5 text-sm font-semibold text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors"
            >
              Sign In
            </Link>
          </nav>
        </div>
      </header>

      {/* Main Content Area — with top padding for fixed header */}
      <div className="flex flex-1 flex-col lg:flex-row" style={{ paddingTop: '56px' }}>

        {/* ========== LEFT PANEL: Dark Navy Marketing — Fixed ========== */}
        <div 
          className="hidden lg:flex lg:w-[36%] xl:w-[34%] px-8 lg:px-10 py-8 flex-col justify-center relative overflow-hidden fixed left-0"
          style={{ backgroundColor: '#1e2a4a', position: 'fixed', top: '56px', bottom: 0, width: '36%' }}
        >
          {/* Subtle decorative circles */}
          <div className="absolute -top-20 -right-20 w-72 h-72 rounded-full opacity-5 bg-white" />
          <div className="absolute -bottom-16 -left-16 w-56 h-56 rounded-full opacity-5 bg-white" />

          <div className="relative z-10">
            <h1 className="text-2xl xl:text-3xl font-bold text-white leading-tight mb-3">
              LG Management,<br />
              <span style={{ color: '#60a5fa' }}>Simplified.</span>
            </h1>
            <p className="text-gray-400 text-xs leading-relaxed mb-6 max-w-sm">
              Join enterprises managing their digital guarantees and credit facilities on a single, secure platform. Start your free trial today.
            </p>

            {/* Feature Cards */}
            <div className="space-y-3">
              {benefits.map((benefit, index) => (
                <div 
                  key={index}
                  className="flex items-start space-x-3 p-3 rounded-xl transition-all duration-300 hover:translate-x-1"
                  style={{ backgroundColor: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}
                >
                  <div 
                    className="flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: 'rgba(96,165,250,0.15)' }}
                  >
                    <benefit.icon className="h-4 w-4" style={{ color: '#60a5fa' }} />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-white">{benefit.title}</h3>
                    <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">{benefit.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ========== RIGHT PANEL: Registration Form — scrollable, offset for fixed left panel ========== */}
        <div className="flex-1 bg-white px-6 sm:px-8 lg:px-10 py-10 lg:py-12 overflow-y-auto" style={{ marginLeft: '36%' }}>
          <div className="max-w-3xl mx-auto">
            
            {/* Form Header */}
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900">Get Started with Grow</h2>
              <p className="text-sm text-gray-500 mt-1">Fill in the details to start your free trial. No credit card required.</p>
            </div>

            {/* Error Alert */}
            {error && (
              <div className="flex items-center p-3 mb-6 text-sm text-red-700 rounded-lg bg-red-50 border border-red-200" role="alert">
                <AlertCircle className="flex-shrink-0 w-4 h-4 mr-2" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-8">

              {/* ── Section: Organization Details ── */}
              <div>
                <div className="flex items-center space-x-2 mb-5">
                  <Building2 className="w-4 h-4 text-blue-600" />
                  <h3 className="text-xs font-bold text-gray-800 uppercase tracking-widest">Organization Details</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="organization_name" className={labelCls}>Company / Trade Name <span className="text-red-400">*</span></label>
                    <input type="text" name="organization_name" id="organization_name" value={formData.organization_name} onChange={handleChange} required className={inputCls} placeholder="Acme Corporation" />
                  </div>
                  <div>
                    <label htmlFor="organization_address" className={labelCls}>Headquarters Address <span className="text-red-400">*</span></label>
                    <input type="text" name="organization_address" id="organization_address" value={formData.organization_address} onChange={handleChange} required className={inputCls} placeholder="123 Business Ave, City" />
                  </div>
                  <div>
                    <label className={labelCls}>Number of Entities <span className="text-red-400">*</span></label>
                    <div className="flex items-center space-x-4 mt-1">
                      <label className="inline-flex items-center cursor-pointer">
                        <input type="radio" name="entities_count" value="One" checked={formData.entities_count === 'One'} onChange={handleChange} className="form-radio h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500" />
                        <span className="ml-2 text-sm text-gray-700">One</span>
                      </label>
                      <label className="inline-flex items-center cursor-pointer">
                        <input type="radio" name="entities_count" value="Multiple" checked={formData.entities_count === 'Multiple'} onChange={handleChange} className="form-radio h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500" />
                        <span className="ml-2 text-sm text-gray-700">Multiple</span>
                      </label>
                    </div>
                  </div>
                  <div>
                    <label htmlFor="commercial_register_document" className={labelCls}>Commercial Register <span className="text-red-400">*</span></label>
                    <label 
                      htmlFor="commercial_register_document"
                      className="flex items-center justify-center w-full px-3 py-2.5 border border-dashed border-gray-300 rounded-lg cursor-pointer bg-gray-50/50 hover:bg-gray-100 transition-colors"
                    >
                      <Upload className="w-4 h-4 text-gray-400 mr-2" />
                      <span className="text-sm text-gray-500 truncate">
                        {formData.commercial_register_document ? formData.commercial_register_document.name : 'Upload PDF or Image'}
                      </span>
                    </label>
                    <input type="file" name="commercial_register_document" id="commercial_register_document" onChange={handleChange} required accept=".pdf, .jpg, .jpeg, .png" className="sr-only" />
                  </div>
                </div>
              </div>

              {/* ── Section: Platform Administrator ── */}
              <div>
                <div className="flex items-center space-x-2 mb-5">
                  <UserCircle className="w-4 h-4 text-blue-600" />
                  <h3 className="text-xs font-bold text-gray-800 uppercase tracking-widest">Platform Administrator</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="contact_admin_name" className={labelCls}>Full Name <span className="text-red-400">*</span></label>
                    <input type="text" name="contact_admin_name" id="contact_admin_name" value={formData.contact_admin_name} onChange={handleChange} required className={inputCls} placeholder="John Doe" />
                  </div>
                  <div>
                    <label htmlFor="admin_email" className={labelCls}>Corporate Email <span className="text-red-400">*</span></label>
                    <input type="email" name="admin_email" id="admin_email" value={formData.admin_email} onChange={handleChange} required className={inputCls} placeholder="john@company.com" />
                  </div>
                  <div className="sm:col-span-2">
                    <label htmlFor="contact_phone" className={labelCls}>Contact Phone <span className="text-red-400">*</span></label>
                    <input type="tel" name="contact_phone" id="contact_phone" value={formData.contact_phone} onChange={handleChange} required className={inputCls} placeholder="+971 50 123 4567" />
                  </div>
                </div>
              </div>

              {/* ── Section: Module Selection ── */}
              <div>
                <div className="flex items-center space-x-2 mb-4">
                  <Package className="w-4 h-4 text-blue-600" />
                  <h3 className="text-xs font-bold text-gray-800 uppercase tracking-widest">Select Your Modules</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label 
                    className={`flex items-start p-4 border-2 rounded-xl cursor-pointer transition-all duration-200 ${
                      formData.modules_custody 
                        ? 'border-blue-500 bg-blue-50/60 shadow-sm' 
                        : 'border-gray-200 hover:border-gray-300 bg-white'
                    }`}
                  >
                    <input
                      type="checkbox"
                      name="modules_custody"
                      checked={formData.modules_custody}
                      onChange={handleChange}
                      className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 mt-0.5"
                    />
                    <div className="ml-3">
                      <span className="text-sm font-semibold text-gray-900">LG Custody</span>
                      <p className="text-xs text-gray-500 mt-0.5">Track and manage received Letters of Guarantee.</p>
                    </div>
                  </label>
                  <label 
                    className={`flex items-start p-4 border-2 rounded-xl cursor-pointer transition-all duration-200 ${
                      formData.modules_issuance 
                        ? 'border-blue-500 bg-blue-50/60 shadow-sm' 
                        : 'border-gray-200 hover:border-gray-300 bg-white'
                    }`}
                  >
                    <input
                      type="checkbox"
                      name="modules_issuance"
                      checked={formData.modules_issuance}
                      onChange={handleChange}
                      className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 mt-0.5"
                    />
                    <div className="ml-3">
                      <span className="text-sm font-semibold text-gray-900">LG Issuance</span>
                      <p className="text-xs text-gray-500 mt-0.5">Request and manage LG issuance from banks.</p>
                    </div>
                  </label>
                </div>
              </div>

              {/* ── Terms & Submit ── */}
              <div className="pt-2 border-t border-gray-100">
                {/* Terms Content (collapsed) */}
                {termsContent && (
                  <details className="mb-4">
                    <summary className="text-xs text-blue-600 cursor-pointer hover:text-blue-800 font-medium">View Full Terms & Conditions</summary>
                    <div className="mt-2 border border-gray-200 rounded-lg p-4 max-h-48 overflow-y-auto bg-gray-50/50">
                      <div className="prose max-w-none text-xs text-gray-600" dangerouslySetInnerHTML={{ __html: termsContent }} />
                    </div>
                  </details>
                )}

                {/* Terms Checkbox */}
                <div className="flex items-center mb-6">
                  <input
                    id="accepted_terms"
                    name="accepted_terms"
                    type="checkbox"
                    checked={formData.accepted_terms}
                    onChange={handleChange}
                    required
                    className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <label htmlFor="accepted_terms" className="ml-2 text-sm text-gray-600 cursor-pointer">
                    I agree to the <span className="text-blue-600 font-medium hover:underline">Terms of Service</span> <span className="text-red-400">*</span>
                  </label>
                </div>

                {/* Footer: Back link + Submit */}
                <div className="flex items-center justify-between">
                  <Link to="/" className="text-sm text-gray-500 hover:text-gray-700 font-medium underline-offset-2 hover:underline transition-colors">
                    ← Back to website
                  </Link>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="inline-flex items-center px-6 py-2.5 text-sm font-semibold text-white rounded-lg shadow-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-60"
                    style={{ backgroundColor: '#2563eb', }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#1d4ed8'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#2563eb'}
                  >
                    {isSaving ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : null}
                    {isSaving ? 'Creating...' : 'Create Account'}
                    {!isSaving && <ArrowRight className="ml-2 h-4 w-4" />}
                  </button>
                </div>
              </div>

            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

export default FreeTrialRegistration;