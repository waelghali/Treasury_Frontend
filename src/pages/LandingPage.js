// frontend/src/pages/LandingPage.js
import React, { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { 
  Shield, Zap, Globe, ArrowRight, CheckCircle, 
  FileCheck, Bell, BarChart3, Layers, Lock, 
  Send, Building2, Briefcase, ChevronRight,
  Clock, Users, BookOpen
} from 'lucide-react';

function LandingPage() {
  const demoFormRef = useRef(null);
  const [formData, setFormData] = useState({ name: '', company: '', email: '', phone: '', message: '' });
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
      const googleFormsUrl = 'https://docs.google.com/forms/d/e/1FAIpQLSdNahdLNZwI1txtvR8kSvEdaJ43hQ7VbcLOIsdC41OQV51Lvw/formResponse';
      const data = new URLSearchParams();
      data.append('entry.1184110141', formData.name);
      data.append('entry.1533984093', formData.company);
      data.append('entry.1421145951', formData.email);
      data.append('entry.1978314716', formData.phone);
      data.append('entry.1323929138', formData.message);
      await fetch(googleFormsUrl, { method: 'POST', body: data, mode: 'no-cors' });
      setFormSubmitted(true);
      setFormData({ name: '', company: '', email: '', phone: '', message: '' });
    } catch (err) {
      setFormError('A network error occurred. Please check your connection.');
    }
  };

  const scrollToDemoForm = () => {
    if (demoFormRef.current) demoFormRef.current.scrollIntoView({ behavior: 'smooth' });
  };

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = '/grow_brochure.pdf';
    link.download = 'Grow-Brochure.pdf';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const inputCls = "w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white";

  return (
    <div style={{ fontFamily: "'Inter', 'Segoe UI', sans-serif" }}>
      <Helmet>
        <title>Grow Business Development — LG Management Platform for Treasury Teams</title>
        <meta name="description" content="The modular LG management platform that automates custody tracking, issuance workflows, and bank communication. AI-powered document capture, proactive alerts, and maker-checker approvals. Start your free trial today." />
        <meta property="og:title" content="Grow — LG Management Platform" />
        <meta property="og:description" content="Track custody, automate issuance, and stay in control. The LG platform built by treasurers, for treasurers." />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Grow — LG Management Platform" />
        <meta name="twitter:description" content="Track custody, automate issuance, and stay in control — all on one unified platform." />
      </Helmet>

      {/* ═══════ HEADER ═══════ */}
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-gray-800/30" style={{ backgroundColor: '#1e2a4a' }}>
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-lg font-bold text-white tracking-tight">Grow</span>
            <span className="text-xs text-blue-400 font-medium hidden sm:inline">Business Development</span>
          </div>
          <nav className="flex items-center space-x-4">
            <Link to="/portal/issuance" className="text-sm font-medium text-gray-300 hover:text-white transition-colors hidden md:inline">Issuance Portal</Link>
            <button onClick={scrollToDemoForm} className="text-sm font-medium text-gray-300 hover:text-white transition-colors hidden md:inline">Book a Demo</button>
            <button onClick={handleDownload} className="text-sm font-medium text-gray-300 hover:text-white transition-colors hidden md:inline">Brochure</button>
            <Link to="/free-trial-register" className="px-4 py-1.5 text-sm font-semibold text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors">
              Free Trial
            </Link>
            <Link to="/login" className="px-4 py-1.5 text-sm font-semibold text-gray-300 border border-gray-500 rounded-md hover:bg-white/10 transition-colors">
              Sign In
            </Link>
          </nav>
        </div>
      </header>

      {/* ═══════ HERO SECTION ═══════ */}
      <section className="relative overflow-hidden" style={{ backgroundColor: '#1e2a4a', paddingTop: '56px' }}>
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-96 h-96 rounded-full opacity-[0.04] bg-white -mr-48 -mt-48" />
        <div className="absolute bottom-0 left-0 w-72 h-72 rounded-full opacity-[0.04] bg-white -ml-36 -mb-36" />
        <div className="absolute top-1/2 right-1/4 w-40 h-40 rounded-full opacity-[0.03] bg-blue-400" />
        
        <div className="max-w-7xl mx-auto px-6 py-20 lg:py-28 relative z-10">
          <div className="max-w-3xl">
            <div className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium mb-6" style={{ backgroundColor: 'rgba(96,165,250,0.15)', color: '#93bbfc' }}>
              <Layers className="w-3 h-3 mr-1.5" />
              LG Custody · LG Issuance · Modular Platform
            </div>
            <h1 className="text-4xl lg:text-5xl xl:text-6xl font-extrabold text-white leading-[1.1] mb-5 tracking-tight">
              The LG Platform That<br />
              <span style={{ color: '#60a5fa' }}>Works Like Your Smartest Team Member</span>
            </h1>
            <p className="text-lg text-gray-400 max-w-2xl mb-8 leading-relaxed">
              Never miss an expiry. Never lose a reply. Track custody, automate issuance, and always stay in control — all on one unified platform.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                to="/free-trial-register"
                className="inline-flex items-center px-6 py-3 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/25"
              >
                Start Free Trial <ArrowRight className="ml-2 w-4 h-4" />
              </Link>
              <button
                onClick={scrollToDemoForm}
                className="inline-flex items-center px-6 py-3 text-sm font-semibold text-gray-300 border border-gray-500 rounded-lg hover:bg-white/10 transition-all"
              >
                Book a Demo
              </button>
              <Link
                to="/know-more"
                className="inline-flex items-center px-6 py-3 text-sm font-semibold text-gray-300 border border-gray-500 rounded-lg hover:bg-white/10 transition-all"
              >
                Learn More
              </Link>
            </div>
          </div>
          
          {/* Stats Row */}
          <div className="flex flex-wrap gap-8 mt-14 pt-8 border-t border-white/10">
            {[
              { value: '< 1 min', label: 'AI document capture' },
              { value: '140+', label: 'Correspondent banks' },
              { value: '100%', label: 'Audit trail coverage' },
              { value: '24/7', label: 'Proactive alerts' },
            ].map((stat, i) => (
              <div key={i}>
                <p className="text-2xl font-bold text-white">{stat.value}</p>
                <p className="text-xs text-gray-500 mt-0.5">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════ MODULES SECTION ═══════ */}
      <section className="bg-white py-20 lg:py-28">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-14">
            <p className="text-xs font-bold text-blue-600 uppercase tracking-widest mb-2">Modular by Design</p>
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900">Choose Only What You Need</h2>
            <p className="text-gray-500 mt-3 max-w-xl mx-auto">Two powerful modules that work independently or together. Start with one, expand when you're ready.</p>
          </div>

          <div className="grid lg:grid-cols-2 gap-8">
            {/* Module 1: LG Custody */}
            <div className="rounded-2xl border border-gray-200 p-8 hover:shadow-xl transition-shadow duration-300 group">
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                  <Shield className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">LG Custody</h3>
                  <p className="text-xs text-gray-500">For beneficiaries managing received guarantees</p>
                </div>
              </div>
              <ul className="space-y-3 mb-6">
                {[
                  'Centralized LG portfolio with full lifecycle tracking',
                  'AI-powered document capture in under 60 seconds',
                  'Automated expiry, renewal & claim reminders',
                  'Multi-entity management with role-based access',
                  'Complete audit trail and compliance reporting',
                ].map((item, i) => (
                  <li key={i} className="flex items-start text-sm text-gray-600">
                    <CheckCircle className="w-4 h-4 text-blue-500 mr-2 mt-0.5 flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
              <Link to="/free-trial-register?module=custody" className="inline-flex items-center text-sm font-semibold text-blue-600 hover:text-blue-800 transition-colors group-hover:translate-x-1 duration-200">
                Try LG Custody <ChevronRight className="w-4 h-4 ml-1" />
              </Link>
            </div>

            {/* Module 2: LG Issuance */}
            <div className="rounded-2xl border border-gray-200 p-8 hover:shadow-xl transition-shadow duration-300 group relative overflow-hidden">
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
                  <Send className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">LG Issuance</h3>
                  <p className="text-xs text-gray-500">For applicants requesting new guarantees from banks</p>
                </div>
              </div>
              <ul className="space-y-3 mb-6">
                {[
                  '3-step issuance wizard with smart form auto-filling',
                  'Multi-bank RFQ with side-by-side comparison',
                  'Built-in maker-checker approval workflows',
                  'AI-powered bank form analysis and filling',
                  'Full issuance lifecycle from request to delivery',
                ].map((item, i) => (
                  <li key={i} className="flex items-start text-sm text-gray-600">
                    <CheckCircle className="w-4 h-4 text-purple-500 mr-2 mt-0.5 flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
              <Link to="/free-trial-register?module=issuance" className="inline-flex items-center text-sm font-semibold text-purple-600 hover:text-purple-800 transition-colors group-hover:translate-x-1 duration-200">
                Try LG Issuance <ChevronRight className="w-4 h-4 ml-1" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════ PROBLEMS WE SOLVE ═══════ */}
      <section className="py-20 lg:py-24" style={{ backgroundColor: '#f8fafc' }}>
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-14">
            <p className="text-xs font-bold text-blue-600 uppercase tracking-widest mb-2">The Challenge</p>
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900">The Daily Struggles With LGs</h2>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: Clock, title: 'Expiries Missed', desc: 'Manual tracking leads to last-minute scrambles and potential financial risk.' },
              { icon: Send, title: 'Bank Replies Lost', desc: 'Tracking communication across channels is a constant challenge.' },
              { icon: Layers, title: 'Scattered Files', desc: 'LG documents and statuses spread across emails and spreadsheets.' },
              { icon: BarChart3, title: 'Audit Stress', desc: 'Producing reports for audits is a time-consuming manual process.' },
            ].map((item, i) => (
              <div key={i} className="bg-white rounded-xl p-6 border border-gray-100 hover:shadow-lg transition-shadow duration-300">
                <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center mb-4">
                  <item.icon className="w-5 h-5 text-red-500" />
                </div>
                <h4 className="text-base font-semibold text-gray-900 mb-2">{item.title}</h4>
                <p className="text-sm text-gray-500 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════ SOLUTION HIGHLIGHTS ═══════ */}
      <section className="bg-white py-20 lg:py-24">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-14">
            <p className="text-xs font-bold text-blue-600 uppercase tracking-widest mb-2">How We Help</p>
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900">Your Assistant for LG Management</h2>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: FileCheck, title: 'End-to-End Tracking', desc: 'All LGs in one place — clear, organized, and always updated across custody and issuance.' },
              { icon: Bell, title: 'Proactive Alerts', desc: 'Automatic reminders for expiries, renewals, overdue replies, and approval deadlines.' },
              { icon: Lock, title: 'Maker-Checker Approvals', desc: 'Built-in approval workflows with configurable checker groups and escalation paths.' },
              { icon: Zap, title: 'AI-Powered Capture', desc: 'Upload any LG document and let AI extract all details in under 60 seconds.' },
              { icon: Globe, title: 'Multi-Entity, Multi-Bank', desc: 'Manage multiple subsidiaries and bank relationships from a centralized dashboard.' },
              { icon: BarChart3, title: 'Data Insights', desc: 'Your data organized into dashboards showing renewal cycles, delays, and portfolio trends.' },
            ].map((item, i) => (
              <div key={i} className="flex items-start space-x-4 p-5 rounded-xl border border-gray-100 hover:border-blue-200 hover:shadow-md transition-all duration-300">
                <div className="w-10 h-10 rounded-lg flex-shrink-0 flex items-center justify-center" style={{ backgroundColor: 'rgba(37,99,235,0.08)' }}>
                  <item.icon className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-gray-900 mb-1">{item.title}</h4>
                  <p className="text-sm text-gray-500 leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════ WHY CHOOSE US ═══════ */}
      <section className="py-20 lg:py-24" style={{ backgroundColor: '#1e2a4a' }}>
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-14">
            <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: '#60a5fa' }}>Why Grow</p>
            <h2 className="text-3xl lg:text-4xl font-bold text-white">Built by Treasurers, for Treasurers</h2>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: Briefcase, title: 'Real Operational DNA', desc: 'Designed from years of real treasury operations — not from a textbook.' },
              { icon: Lock, title: 'Your Data, Your Control', desc: 'Enterprise-grade security. Your data stays private and protected.' },
              { icon: Users, title: 'Team-First Design', desc: 'Role-based access, approval workflows, and collaboration built in.' },
              { icon: Layers, title: 'Scales With You', desc: 'Start with one module, expand into a full treasury platform as you grow.' },
            ].map((item, i) => (
              <div key={i} className="text-center p-6 rounded-xl" style={{ backgroundColor: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <div className="w-12 h-12 rounded-xl mx-auto mb-4 flex items-center justify-center" style={{ backgroundColor: 'rgba(96,165,250,0.15)' }}>
                  <item.icon className="w-5 h-5" style={{ color: '#60a5fa' }} />
                </div>
                <h4 className="text-sm font-semibold text-white mb-2">{item.title}</h4>
                <p className="text-xs text-gray-400 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>

          {/* Vision Quote */}
          <div className="mt-16 pt-10 border-t border-white/10 text-center max-w-3xl mx-auto">
            <p className="text-lg text-gray-300 italic leading-relaxed">
              "We're building more than a system. We're building your future treasury assistant — a tool that grows with you, understands your needs, and makes your operations stronger every day."
            </p>
          </div>
        </div>
      </section>

      {/* ═══════ DEMO REQUEST FORM ═══════ */}
      <section ref={demoFormRef} id="demo-form" className="bg-white py-20 lg:py-24">
        <div className="max-w-5xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            
            {/* Left: Info */}
            <div>
              <p className="text-xs font-bold text-blue-600 uppercase tracking-widest mb-2">See It in Action</p>
              <h2 className="text-3xl font-bold text-gray-900 mb-4">Request a Personalized Demo</h2>
              <p className="text-gray-500 mb-6 leading-relaxed">
                See how our platform can transform your LG operations. Our team will walk you through the modules most relevant to your business.
              </p>
              <div className="space-y-4">
                {[
                  { icon: Clock, text: '30-minute guided walkthrough' },
                  { icon: Building2, text: 'Tailored to your industry and use case' },
                  { icon: BookOpen, text: 'Free brochure included after the call' },
                ].map((perk, i) => (
                  <div key={i} className="flex items-center text-sm text-gray-600">
                    <perk.icon className="w-4 h-4 text-blue-500 mr-3 flex-shrink-0" />
                    {perk.text}
                  </div>
                ))}
              </div>
            </div>

            {/* Right: Form */}
            <div className="bg-gray-50 rounded-2xl p-8 border border-gray-100">
              {formSubmitted ? (
                <div className="text-center p-8">
                  <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
                  <p className="text-lg font-semibold text-green-700">Thank you!</p>
                  <p className="text-sm text-gray-500 mt-1">We'll be in touch shortly to schedule your demo.</p>
                </div>
              ) : (
                <form onSubmit={handleDemoSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="name" className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Name *</label>
                      <input type="text" id="name" name="name" required value={formData.name} onChange={handleInputChange} className={inputCls} placeholder="John Doe" />
                    </div>
                    <div>
                      <label htmlFor="company" className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Company *</label>
                      <input type="text" id="company" name="company" required value={formData.company} onChange={handleInputChange} className={inputCls} placeholder="Acme Corp" />
                    </div>
                  </div>
                  <div>
                    <label htmlFor="email" className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Email *</label>
                    <input type="email" id="email" name="email" required value={formData.email} onChange={handleInputChange} className={inputCls} placeholder="john@company.com" />
                  </div>
                  <div>
                    <label htmlFor="phone" className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Phone *</label>
                    <input type="tel" id="phone" name="phone" required value={formData.phone} onChange={handleInputChange} className={inputCls} placeholder="+20 120 055 7551" />
                  </div>
                  <div>
                    <label htmlFor="message" className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Message (Optional)</label>
                    <textarea id="message" name="message" rows="2" value={formData.message} onChange={handleInputChange} className={inputCls} placeholder="Tell us about your needs..." />
                  </div>
                  {formError && (
                    <div className="text-sm text-red-600 bg-red-50 p-3 rounded-lg border border-red-100">{formError}</div>
                  )}
                  <button type="submit" className="w-full flex items-center justify-center py-2.5 px-4 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-md">
                    Request Demo <ArrowRight className="ml-2 w-4 h-4" />
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ═══════ FINAL CTA ═══════ */}
      <section className="bg-blue-600 py-16">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-3xl font-bold text-white mb-3">Ready to take control of your LGs?</h2>
          <p className="text-blue-200 mb-8 text-sm">Join enterprises who've automated their LG operations with Grow.</p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link to="/free-trial-register" className="px-6 py-2.5 text-sm font-semibold text-blue-600 bg-white rounded-lg hover:bg-gray-100 transition-colors shadow-md">
              Start Free Trial
            </Link>
            <button onClick={scrollToDemoForm} className="px-6 py-2.5 text-sm font-semibold text-white border-2 border-white/70 rounded-lg hover:bg-white/10 transition-colors">
              Book a Demo
            </button>
            <Link to="/login" className="px-6 py-2.5 text-sm font-semibold text-white border-2 border-white/70 rounded-lg hover:bg-white/10 transition-colors">
              Login to Your Account
            </Link>
          </div>
        </div>
      </section>

      {/* ═══════ FOOTER ═══════ */}
      <footer style={{ backgroundColor: '#111827' }} className="text-gray-400 py-12">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <div className="flex items-center space-x-2 mb-4">
              <span className="text-lg font-bold text-white">Grow</span>
              <span className="text-xs text-blue-400 font-medium">Business Development</span>
            </div>
            <p className="text-sm leading-relaxed">The modular LG management platform designed to empower your treasury operations — from custody to issuance.</p>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">Contact Info</h4>
            <ul className="space-y-2 text-sm">
              <li>Phone: <a href="tel:+201200557551" className="hover:text-white transition-colors">+20 120 055 7551</a></li>
              <li>WhatsApp: <a href="https://wa.me/201200557551" className="hover:text-white transition-colors">+20 120 055 7551</a></li>
              <li>Email: <a href="mailto:info@growbusinessdevelopment.com" className="hover:text-white transition-colors">info@growbusinessdevelopment.com</a></li>
              <li>Address: 100 El Merghany St., Heliopolis, Cairo, Egypt</li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">Quick Links</h4>
            <ul className="space-y-2 text-sm">
              <li><Link to="/know-more" className="hover:text-white transition-colors">About the Platform</Link></li>
              <li><Link to="/free-trial-register" className="hover:text-white transition-colors">Start Free Trial</Link></li>
              <li><Link to="/portal/issuance" className="hover:text-white transition-colors">Public Issuance Portal</Link></li>
              <li><Link to="/login" className="hover:text-white transition-colors">Login</Link></li>
            </ul>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-6 text-center mt-8 pt-8 border-t border-gray-800">
          <p className="text-xs">&copy; {new Date().getFullYear()} Grow Business Development. All rights reserved.</p>
        </div>
      </footer>

    </div>
  );
}

export default LandingPage;