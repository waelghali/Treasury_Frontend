// frontend/src/pages/Public/FreeTrialRegistration.js
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { publicApiRequest } from '../../services/apiService';
import { toast } from 'react-toastify';
import { Loader2, Zap, Shield, TrendingUp, AlertCircle } from 'lucide-react'; // Added benefit icons

// Standardized input and label classes
const inputClassNames = "mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2 text-base transition-all duration-200";
const labelClassNames = "block text-sm font-medium text-gray-700";
const requiredSpan = <span className="text-red-500">*</span>;

// Static content for the marketing side (based on KnowMorePage value props)
const benefits = [
  { icon: Shield, title: "Mitigate Financial Risk", description: "Prevent expired or missed LG renewals with proactive alerts and automation." }, // Based on
  { icon: Zap, title: "AI-Powered Speed", description: "Capture all LG details in less than a minute using our AI-powered document extraction." }, // Based on
  { icon: TrendingUp, title: "Full Transparency", description: "Get a single, unified view of your entire LG portfolio and audit trail." }, // Based on
];

function FreeTrialRegistration() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    organization_name: '',
    organization_address: '',
    contact_admin_name: '',
    contact_phone: '',
    admin_email: '',
    entities_count: 'One',
    commercial_register_document: null,
    accepted_terms: false,
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [termsContent, setTermsContent] = useState('');

  // Fetch the Terms and Conditions content on component mount
  useEffect(() => {
    const fetchTerms = async () => {
      try {
        const response = await publicApiRequest('/public/legal-content/terms_and_conditions', 'GET'); //
        setTermsContent(response.content); //
      } catch (err) {
        console.error('Failed to fetch Terms and Conditions:', err); //
        setError('Failed to load Terms and Conditions. Please try again later.'); //
        toast.error('Failed to load legal content.'); //
      } finally {
        setIsLoading(false); //
      }
    };
    fetchTerms(); //
  }, []);

  const handleChange = (e) => {
    const { name, value, type, files, checked } = e.target; //
    setFormData((prev) => ({ //
      ...prev,
      [name]: type === 'file' ? files[0] : (type === 'checkbox' ? checked : value), //
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault(); //
    setIsSaving(true); //
    setError(''); //
    
    if (!formData.accepted_terms) { //
      setError('You must accept the Terms & Conditions.'); //
      toast.error('You must accept the Terms & Conditions.'); //
      setIsSaving(false); //
      return;
    }

    if (!formData.commercial_register_document) {
      setError('Commercial Register document is required.');
      toast.error('Commercial Register document is required.');
      setIsSaving(false);
      return;
    }
    
    const data = new FormData(); //
    data.append('organization_name', formData.organization_name); //
    data.append('organization_address', formData.organization_address); //
    data.append('contact_admin_name', formData.contact_admin_name); //
    data.append('contact_phone', formData.contact_phone); //
    data.append('admin_email', formData.admin_email); //
    data.append('entities_count', formData.entities_count); //
    data.append('commercial_register_document', formData.commercial_register_document); //
    data.append('accepted_terms', String(formData.accepted_terms)); //

    try {
      await publicApiRequest('/public/register-free-trial/', 'POST', data); //
      toast.success('Registration submitted successfully. Please check your email for a confirmation message.'); //
      navigate('/'); //
    } catch (err) {
      console.error('Registration failed:', err); //
      // Improved error handling based on standard API service expectations
      const errorMessage = err.response?.data?.detail || err.message || 'An unexpected error occurred during submission.';
      setError(`Registration failed: ${errorMessage}`); //
      toast.error(errorMessage); //
    } finally {
      setIsSaving(false); //
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="h-10 w-10 text-blue-600 animate-spin" /> {/* Consistent loader */}
      </div>
    );
  }

  return (
    <div className="bg-gray-50 font-sans text-gray-800">
      
      {/* Consistent Header from KnowMorePage.js */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white shadow-sm transition-all duration-300 ease-in-out">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-1 flex items-center justify-between">
          <div className="flex items-center">
            <img src="/growlogonocircle.png" alt="Grow Business Development Logo" className="h-24" />
          </div>
          <nav className="flex items-center space-x-4">
            <Link 
              to="/" 
              className="px-4 py-2 text-sm font-medium text-blue-600 border border-blue-600 rounded-md hover:bg-blue-50 transition-colors"
            >
              Home
            </Link>
            <Link
              to="/know-more"
              className="px-4 py-2 text-sm font-medium text-blue-600 border border-blue-600 rounded-md hover:bg-blue-50 transition-colors"
            >
              Know More
            </Link>
            <Link 
              to="/login" 
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors shadow-md"
            >
              Login
            </Link>
          </nav>
        </div>
      </header>

      {/* Main Content: Two-Column Layout */}
      <main className="pt-24 pb-12 flex justify-center items-start min-h-screen px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl w-full grid grid-cols-1 lg:grid-cols-3 gap-10">

          {/* Left Column: Marketing & Benefits (75% height of the right column) */}
          <div className="lg:col-span-1 bg-white p-8 rounded-lg shadow-xl h-fit sticky top-28 border border-blue-100">
            <h2 className="text-2xl font-bold text-blue-600 mb-4">
              Start Your 3-Month Free Trial
            </h2>
            <p className="mt-2 text-gray-600 border-b pb-4 mb-4">
              Access the full LG Management System and transform your treasury operations immediately. No credit card required.
            </p>
            
            <ul className="space-y-6">
              {benefits.map((benefit, index) => (
                <li key={index} className="flex items-start space-x-3">
                  <benefit.icon className="flex-shrink-0 h-6 w-6 text-blue-500 mt-1" />
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800">{benefit.title}</h3>
                    <p className="text-sm text-gray-500">{benefit.description}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
          
          {/* Right Column: Registration Form */}
          <div className="lg:col-span-2 bg-white p-10 rounded-lg shadow-xl">
            <h1 className="text-3xl font-bold text-gray-900 mb-6 border-b pb-3">
              Organization & Admin Details
            </h1>

            <form className="space-y-6" onSubmit={handleSubmit}>
              
              {/* Error/Alert box */}
              {error && (
                <div className="flex items-center p-4 text-sm text-red-800 rounded-lg bg-red-50 border border-red-200" role="alert">
                  <AlertCircle className="flex-shrink-0 inline w-4 h-4 mr-3" />
                  <div>{error}</div>
                </div>
              )}

              {/* Personal/Contact Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="organization_name" className={labelClassNames}>Organization Name {requiredSpan}</label>
                  <input type="text" name="organization_name" id="organization_name" value={formData.organization_name} onChange={handleChange} required className={inputClassNames} /> {/* */}
                </div>
                <div>
                  <label htmlFor="organization_address" className={labelClassNames}>Organization Address {requiredSpan}</label>
                  <input type="text" name="organization_address" id="organization_address" value={formData.organization_address} onChange={handleChange} required className={inputClassNames} /> {/* */}
                </div>
                <div>
                  <label htmlFor="contact_admin_name" className={labelClassNames}>Super Admin Name {requiredSpan}</label>
                  <input type="text" name="contact_admin_name" id="contact_admin_name" value={formData.contact_admin_name} onChange={handleChange} required className={inputClassNames} /> {/* */}
                </div>
                <div>
                  <label htmlFor="contact_phone" className={labelClassNames}>Contact Phone {requiredSpan}</label>
                  <input type="tel" name="contact_phone" id="contact_phone" value={formData.contact_phone} onChange={handleChange} required className={inputClassNames} /> {/* */}
                </div>
                <div className="md:col-span-2">
                  <label htmlFor="admin_email" className={labelClassNames}>Admin Email {requiredSpan}</label>
                  <input type="email" name="admin_email" id="admin_email" value={formData.admin_email} onChange={handleChange} required className={inputClassNames} /> {/* */}
                </div>
              </div>

              {/* Business Setup & Document */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-gray-100">
                  <div>
                      <label className={labelClassNames}>Number of Entities {requiredSpan}</label>
                      <div className="mt-2 flex items-center space-x-6">
                        <label className="inline-flex items-center">
                          <input type="radio" name="entities_count" value="One" checked={formData.entities_count === 'One'} onChange={handleChange} className="form-radio h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500" /> {/* */}
                          <span className="ml-2 text-gray-700">One</span>
                        </label>
                        <label className="inline-flex items-center">
                          <input type="radio" name="entities_count" value="Multiple" checked={formData.entities_count === 'Multiple'} onChange={handleChange} className="form-radio h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500" /> {/* */}
                          <span className="ml-2 text-gray-700">Multiple</span>
                        </label>
                      </div>
                  </div>
                  
                  <div>
                      <label htmlFor="commercial_register_document" className={labelClassNames}>Commercial Register (PDF/Image) {requiredSpan}</label>
                      <input type="file" name="commercial_register_document" id="commercial_register_document" onChange={handleChange} required accept=".pdf, .jpg, .jpeg, .png" className={inputClassNames} /> {/* */}
                      {formData.commercial_register_document && (
                        <p className="text-xs text-gray-500 mt-1">File selected: **{formData.commercial_register_document.name}**</p>
                      )}
                  </div>
              </div>


              {/* Terms and Conditions and Checkbox */}
              <div className="space-y-4 pt-6 border-t border-gray-100">
                
                {termsContent && (
                  <div className="border border-gray-300 rounded-lg p-4 max-h-60 overflow-y-auto bg-gray-50/50">
                    <h3 className="text-lg font-semibold text-gray-800 mb-2">Terms & Conditions</h3>
                    <div className="prose max-w-none text-sm text-gray-600" dangerouslySetInnerHTML={{ __html: termsContent }} /> {/* */}
                  </div>
                )}

                <div className="flex items-start">
                  <div className="flex items-center h-5 pt-1">
                    <input
                      id="accepted_terms"
                      name="accepted_terms"
                      type="checkbox"
                      checked={formData.accepted_terms} //
                      onChange={handleChange} //
                      required
                      className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                  </div>
                  <div className="ml-3 text-sm">
                    <label htmlFor="accepted_terms" className="font-medium text-gray-700 cursor-pointer">
                      I have read and agree to the Terms & Conditions and Free Trial Disclaimer {requiredSpan} {/* */}
                    </label>
                  </div>
                </div>
              </div>
              
              {/* Submit Button */}
              <div className="pt-6">
                <button
                  type="submit"
                  className="w-full inline-flex justify-center py-3 px-6 border border-transparent shadow-md text-base font-bold rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200 transform hover:scale-[1.005]"
                  disabled={isSaving}
                >
                  {isSaving ? (
                      <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  ) : null}
                  {isSaving ? 'Submitting...' : 'Register and Activate Free Trial'}
                </button>
                <p className='text-center text-xs text-gray-500 mt-2'>We will email your admin credentials instantly after review.</p>
              </div>
            </form>
          </div>
        </div>
      </main>

      {/* Footer (Replicated for completeness) */}
      <footer className="bg-gray-900 text-gray-400 py-8"> {/* */}
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center"> {/* */}
          <p className="text-sm">&copy; 2025 Grow Business Development. All rights reserved.</p> {/* */}
        </div>
      </footer>
    </div>
  );
}

export default FreeTrialRegistration;