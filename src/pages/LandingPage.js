// frontend/src/pages/LandingPage.js

import React, { useRef, useState } from 'react';
import { Link } from 'react-router-dom';

function LandingPage() {
  const demoFormRef = useRef(null);
  const [formData, setFormData] = useState({
    name: '',
    company: '',
    email: '',
    phone: '',
    message: '',
  });
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [formError, setFormError] = useState('');

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleDemoSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!formData.name || !formData.company || !formData.email || !formData.phone) {
      setFormError('Please fill out all required fields.');
      return;
    }

    try {
      // NOTE: Google Form submission URL and field IDs are based on your form.
      const googleFormsUrl = 'https://docs.google.com/forms/d/e/1FAIpQLSdNahdLNZwI1txtvR8kSvEdaJ43hQ7VbcLOIsdC41OQV51Lvw/formResponse';
      
      // Map your form fields to the Google Form entry IDs.
      // This mapping is now verified to be correct for all fields including Message/Notes.
      const data = new URLSearchParams();
      data.append('entry.732381457', formData.name); 
      data.append('entry.1039262465', formData.company);
      data.append('entry.192879642', formData.email);
      data.append('entry.983279326', formData.phone);
      data.append('entry.124167735', formData.message);

      const response = await fetch(googleFormsUrl, {
        method: 'POST',
        body: data,
        mode: 'no-cors',
      });

      setFormSubmitted(true);
      setFormData({ name: '', company: '', email: '', phone: '', message: '' }); // Reset form
    } catch (err) {
      console.error('Network or unexpected error:', err);
      setFormError('A network error occurred. Please check your connection.');
    }
  };

  const scrollToDemoForm = () => {
    if (demoFormRef.current) {
      demoFormRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="bg-gray-50 font-sans text-gray-800">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white shadow-sm transition-all duration-300 ease-in-out">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-1 flex items-center justify-between">
          <div className="flex items-center">
            {/* Replace with your logo image */}
            <img src="/growlogonocircle.png" alt="Grow Business Development Logo" className="h-24" />
          </div>
          <nav className="flex items-center space-x-4">
            <Link 
              to="/login" 
              className="px-4 py-2 text-sm font-medium text-blue-600 border border-blue-600 rounded-md hover:bg-blue-50 transition-colors"
            >
              Login
            </Link>
            <button 
              onClick={scrollToDemoForm}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors shadow-md"
            >
              Book a Demo
            </button>
          </nav>
        </div>
      </header>
      
      <main className="pt-20"> {/* Add padding top for the fixed header */}
        
        {/* Hero Section */}
        <section className="bg-gradient-to-br from-blue-50 via-gray-100 to-blue-200 py-24 md:py-32 relative overflow-hidden">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-gray-900 leading-tight mb-4 tracking-tight">
              The LG Management System That Works Like Your Smartest Team Member
            </h1>
            <h2 className="text-xl sm:text-2xl text-gray-600 max-w-3xl mx-auto mb-8">
              Never miss an expiry. Never lose a reply. Always stay in control.
            </h2>
            <button
              onClick={scrollToDemoForm}
              className="px-8 py-4 text-lg font-bold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-lg transform hover:scale-105"
            >
              Book a Demo
            </button>
          </div>
        </section>

        {/* Problems Section */}
        <section className="bg-white py-16 md:py-24">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <h3 className="text-3xl sm:text-4xl font-bold text-center mb-12">The Daily Struggles With LGs</h3>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 text-center">
              <div className="p-6 bg-gray-50 rounded-lg shadow-md border-t-4 border-blue-500 transform transition-transform hover:scale-105">
                <div className="text-4xl text-blue-600 mb-4">⏰</div>
                <h4 className="text-xl font-semibold mb-2">Expiries missed or rushed</h4>
                <p className="text-gray-600">Manual tracking leads to last-minute scrambles and potential financial risk.</p>
              </div>
              <div className="p-6 bg-gray-50 rounded-lg shadow-md border-t-4 border-blue-500 transform transition-transform hover:scale-105">
                <div className="text-4xl text-blue-600 mb-4">📧</div>
                <h4 className="text-xl font-semibold mb-2">Bank replies lost in follow-ups</h4>
                <p className="text-gray-600">Tracking communication and replies across different channels is a daily challenge.</p>
              </div>
              <div className="p-6 bg-gray-50 rounded-lg shadow-md border-t-4 border-blue-500 transform transition-transform hover:scale-105">
                <div className="text-4xl text-blue-600 mb-4">📂</div>
                <h4 className="text-xl font-semibold mb-2">Scattered files and unclear status</h4>
                <p className="text-gray-600">LG documents and statuses are spread across emails and spreadsheets.</p>
              </div>
              <div className="p-6 bg-gray-50 rounded-lg shadow-md border-t-4 border-blue-500 transform transition-transform hover:scale-105">
                <div className="text-4xl text-blue-600 mb-4">📊</div>
                <h4 className="text-xl font-semibold mb-2">Stress when auditors or management ask for details</h4>
                <p className="text-gray-600">Producing reports for audits is a time-consuming and manual process.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Solution Section */}
        <section className="bg-gray-100 py-16 md:py-24">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <h3 className="text-3xl sm:text-4xl font-bold text-center mb-12">Your Assistant for LG Management</h3>
            <div className="grid md:grid-cols-2 gap-8 lg:gap-16">
              <div className="space-y-8">
                <div className="flex items-start">
                  <div className="text-4xl text-blue-600 mr-4">🔄</div>
                  <div>
                    <h4 className="text-xl font-semibold">End-to-End LG Tracking</h4>
                    <p className="text-gray-600">All LGs in one place — clear, organized, and always updated.</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <div className="text-4xl text-blue-600 mr-4">🔔</div>
                  <div>
                    <h4 className="text-xl font-semibold">Proactive Alerts</h4>
                    <p className="text-gray-600">Automatic reminders for expiries, renewals, and overdue replies.</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <div className="text-4xl text-blue-600 mr-4">⚙️</div>
                  <div>
                    <h4 className="text-xl font-semibold">Simple Control</h4>
                    <p className="text-gray-600">Dashboards, one-click actions, and maker-checker approvals.</p>
                  </div>
                </div>
              </div>
              <div className="p-6 bg-white rounded-lg shadow-xl">
                <div className="text-4xl text-blue-600 mb-4">💡</div>
                <h4 className="text-xl font-semibold mb-2">Data Insights — Your Power, Your Control</h4>
                <p className="text-gray-600">
                  Your data stays safe and private. The system organizes it into a wide view, showing renewal cycles, delays, and trends — so you lead the conversation with facts and stay one step ahead.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Why Choose Us Section */}
        <section className="bg-white py-16 md:py-24">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h3 className="text-3xl sm:text-4xl font-bold mb-4">Built by Treasurers, for Treasurers</h3>
            <div className="max-w-4xl mx-auto grid md:grid-cols-4 gap-6 text-gray-600 mt-8">
                <div className="flex flex-col items-center text-center">
                    <span className="text-4xl text-blue-600 mb-2">✍️</span>
                    <p>Designed from real operational needs.</p>
                </div>
                <div className="flex flex-col items-center text-center">
                    <span className="text-4xl text-blue-600 mb-2">🔒</span>
                    <p>Protects your data — you always stay in control.</p>
                </div>
                <div className="flex flex-col items-center text-center">
                    <span className="text-4xl text-blue-600 mb-2">✨</span>
                    <p>Focused on efficiency, accuracy, and peace of mind.</p>
                </div>
                <div className="flex flex-col items-center text-center">
                    <span className="text-4xl text-blue-600 mb-2">📈</span>
                    <p>Scales into a full treasury platform in the future.</p>
                </div>
            </div>
          </div>
        </section>

        {/* Vision Section */}
        <section className="bg-gray-900 text-white py-16 md:py-24">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center max-w-3xl">
            <blockquote className="text-2xl sm:text-3xl font-light italic leading-relaxed">
              “We’re building more than a system. We’re building your future treasury assistant — a tool that grows with you, understands your needs, and makes your operations stronger every day.”
            </blockquote>
          </div>
        </section>

        {/* Demo Request Section (Form) */}
        <section ref={demoFormRef} className="bg-white py-16 md:py-24">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-2xl">
            <div className="text-center mb-12">
              <h3 className="text-3xl sm:text-4xl font-bold mb-2">See the System in Action</h3>
              <p className="text-lg text-gray-600">Request a demo and discover how it can transform your LG management.</p>
            </div>
            <div className="bg-gray-50 p-8 rounded-lg shadow-xl border-t-4 border-blue-600">
              {formSubmitted ? (
                <div className="text-center p-8 text-lg font-semibold text-green-700 bg-green-100 rounded-md">
                  Thank you! We’ll be in touch shortly to schedule your demo.
                </div>
              ) : (
                <form onSubmit={handleDemoSubmit} className="space-y-6">
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700">Name *</label>
                    <input type="text" id="name" name="name" required value={formData.name} onChange={handleInputChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label htmlFor="company" className="block text-sm font-medium text-gray-700">Company *</label>
                    <input type="text" id="company" name="company" required value={formData.company} onChange={handleInputChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email *</label>
                    <input type="email" id="email" name="email" required value={formData.email} onChange={handleInputChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label htmlFor="phone" className="block text-sm font-medium text-gray-700">Phone *</label>
                    <div className="mt-1 flex rounded-md shadow-sm">
                      <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 text-gray-500 text-sm">
                        +20
                      </span>
                      <input type="tel" id="phone" name="phone" required value={formData.phone} onChange={handleInputChange} className="block w-full rounded-none rounded-r-md border-gray-300 focus:border-blue-500 focus:ring-blue-500" />
                    </div>
                  </div>
                  <div>
                    <label htmlFor="message" className="block text-sm font-medium text-gray-700">Message/Notes (Optional)</label>
                    <textarea id="message" name="message" rows="3" value={formData.message} onChange={handleInputChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"></textarea>
                  </div>
                  {formError && (
                    <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4" role="alert">
                      <p>{formError}</p>
                    </div>
                  )}
                  <div>
                    <button type="submit" className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                      Request Demo
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </section>

        {/* Final CTA Section */}
        <section className="bg-blue-600 py-16 text-white text-center">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <h3 className="text-3xl sm:text-4xl font-bold mb-4">Ready to take control of your LGs?</h3>
            <div className="flex flex-col sm:flex-row justify-center items-center space-y-4 sm:space-y-0 sm:space-x-4">
              <button
                onClick={scrollToDemoForm}
                className="px-8 py-3 text-lg font-bold text-blue-600 bg-white rounded-lg hover:bg-gray-100 transition-colors shadow-lg"
              >
                Book a Demo Today
              </button>
              <Link
                to="/login"
                className="px-8 py-3 text-lg font-bold text-white border-2 border-white rounded-lg hover:bg-white hover:text-blue-600 transition-colors"
              >
                Login to Your Account
              </Link>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="bg-gray-900 text-gray-400 py-12">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-3 gap-8 text-center md:text-left">
            <div>
              <h4 className="text-lg font-semibold text-white mb-4">Grow Business Development</h4>
              <p>The LG Management System designed to empower your treasury operations.</p>
            </div>
            <div>
              <h4 className="text-lg font-semibold text-white mb-4">Contact Info</h4>
              <ul className="space-y-2">
                <li>Phone: <a href="tel:+201200557551" className="hover:text-white transition-colors">+201200557551</a></li>
                <li>WhatsApp: <a href="https://wa.me/201200557551" className="hover:text-white transition-colors">+201200557551</a></li>
                <li>Email: <a href="mailto:info@growbusinessdevelopment.com" className="hover:text-white transition-colors">info@growbusinessdevelopment.com</a></li>
                <li>Address: 100 El Merghany St., Heliopolis, Cairo, Egypt</li>
              </ul>
            </div>
            <div>
              <h4 className="text-lg font-semibold text-white mb-4">Quick Links</h4>
              <ul className="space-y-2">
                <li><a href="#" className="hover:text-white transition-colors">Terms & Conditions</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Privacy Policy</a></li>
              </ul>
            </div>
          </div>
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center mt-8 pt-8 border-t border-gray-700">
            <p className="text-sm">&copy; 2025 Grow Business Development. All rights reserved.</p>
          </div>
        </footer>

      </main>
    </div>
  );
}

export default LandingPage;