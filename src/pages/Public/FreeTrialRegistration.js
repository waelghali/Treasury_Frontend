// frontend/src/pages/Public/FreeTrialRegistration.js
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { publicApiRequest } from '../../services/apiService';
import { Checkbox } from '@mui/material'; // Using MUI v5 for compatibility
import { toast } from 'react-toastify';

const inputClassNames = "mb-2 mt-1 block w-full text-base px-3 py-2 rounded-md border border-gray-300 bg-white shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200";
const labelClassNames = "block text-sm font-medium text-gray-700";
const requiredSpan = <span className="text-red-500">*</span>;

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
    
    const data = new FormData();
    data.append('organization_name', formData.organization_name);
    data.append('organization_address', formData.organization_address);
    data.append('contact_admin_name', formData.contact_admin_name);
    data.append('contact_phone', formData.contact_phone);
    data.append('admin_email', formData.admin_email);
    data.append('entities_count', formData.entities_count);
    data.append('commercial_register_document', formData.commercial_register_document);
    data.append('accepted_terms', String(formData.accepted_terms)); // Explicitly convert boolean to string

    try {
      await publicApiRequest('/public/register-free-trial/', 'POST', data);
      toast.success('Registration submitted successfully. Please check your email for a confirmation message.');
      navigate('/');
    } catch (err) {
      console.error('Registration failed:', err);
      const errorMessage = err.message || 'An unexpected error occurred.';
      setError(`Registration failed: ${errorMessage}`);
      toast.error(errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 font-sans text-gray-800">
      {/* Header for the public registration page */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white shadow-sm transition-all duration-300 ease-in-out">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-1 flex items-center justify-between">
          <div className="flex items-center">
            <img src="/growlogonocircle.png" alt="Grow Business Development Logo" className="h-24" />
          </div>
          <nav className="flex items-center space-x-4">
            <Link 
              to="/" 
              className="px-4 py-2 text-sm font-medium text-blue-600 border border-transparent rounded-md hover:bg-blue-50 transition-colors"
            >
              Home
            </Link>
            <Link 
              to="/know-more" 
              className="px-4 py-2 text-sm font-medium text-blue-600 border border-transparent rounded-md hover:bg-blue-50 transition-colors"
            >
              Know More
            </Link>
            <Link 
              to="/login" 
              className="px-4 py-2 text-sm font-medium text-blue-600 border border-blue-600 rounded-md hover:bg-blue-50 transition-colors"
            >
              Login
            </Link>
          </nav>
        </div>
      </header>
      <main className="pt-20 flex justify-center items-center min-h-screen">
        <div className="max-w-3xl w-full space-y-8 p-10 bg-white rounded-lg shadow-md">
          <div className="text-center">
            <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
              Start Your Free Trial
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              Fill in your details to begin your 3-month free trial.
            </p>
          </div>
          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-md mb-4">{error}</div>}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="organization_name" className={labelClassNames}>Organization Name {requiredSpan}</label>
                <input type="text" name="organization_name" id="organization_name" value={formData.organization_name} onChange={handleChange} required className={inputClassNames} />
              </div>
              <div>
                <label htmlFor="organization_address" className={labelClassNames}>Organization Address {requiredSpan}</label>
                <input type="text" name="organization_address" id="organization_address" value={formData.organization_address} onChange={handleChange} required className={inputClassNames} />
              </div>
              <div>
                <label htmlFor="contact_admin_name" className={labelClassNames}>Super Admin Name {requiredSpan}</label>
                <input type="text" name="contact_admin_name" id="contact_admin_name" value={formData.contact_admin_name} onChange={handleChange} required className={inputClassNames} />
              </div>
              <div>
                <label htmlFor="contact_phone" className={labelClassNames}>Contact Phone {requiredSpan}</label>
                <input type="tel" name="contact_phone" id="contact_phone" value={formData.contact_phone} onChange={handleChange} required className={inputClassNames} />
              </div>
              <div className="md:col-span-2">
                <label htmlFor="admin_email" className={labelClassNames}>Admin Email {requiredSpan}</label>
                <input type="email" name="admin_email" id="admin_email" value={formData.admin_email} onChange={handleChange} required className={inputClassNames} />
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className={labelClassNames}>Number of Entities {requiredSpan}</label>
                <div className="mt-2 flex items-center space-x-4">
                  <label className="inline-flex items-center">
                    <input type="radio" name="entities_count" value="One" checked={formData.entities_count === 'One'} onChange={handleChange} className="form-radio" />
                    <span className="ml-2 text-gray-700">One</span>
                  </label>
                  <label className="inline-flex items-center">
                    <input type="radio" name="entities_count" value="Multiple" checked={formData.entities_count === 'Multiple'} onChange={handleChange} className="form-radio" />
                    <span className="ml-2 text-gray-700">Multiple</span>
                  </label>
                </div>
              </div>

              <div>
                <label htmlFor="commercial_register_document" className={labelClassNames}>Commercial Register (PDF/Image) {requiredSpan}</label>
                <input type="file" name="commercial_register_document" id="commercial_register_document" onChange={handleChange} required accept=".pdf, .jpg, .jpeg, .png" className={inputClassNames.replace("block", "h-10")} />
              </div>

              {/* Display the Terms and Conditions content here */}
              {termsContent && (
                <div className="border border-gray-300 rounded-md p-4 max-h-60 overflow-y-auto mb-4">
                  <h3 className="text-lg font-semibold mb-2">Terms & Conditions</h3>
                  <div className="prose max-w-none" dangerouslySetInnerHTML={{ __html: termsContent }} />
                </div>
              )}

              <div className="flex items-start">
                <div className="flex items-center h-5">
                  <input
                    id="accepted_terms"
                    name="accepted_terms"
                    type="checkbox"
                    checked={formData.accepted_terms}
                    onChange={handleChange}
                    required
                    className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                </div>
                <div className="ml-3 text-sm">
                  <label htmlFor="accepted_terms" className="font-medium text-gray-700">
                    I have read and agree to the Terms & Conditions and Free Trial Disclaimer {requiredSpan}
                  </label>
                </div>
              </div>
            </div>
            
            <div>
              <button
                type="submit"
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                disabled={isSaving}
              >
                {isSaving ? 'Submitting...' : 'Register for Free Trial'}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}

export default FreeTrialRegistration;