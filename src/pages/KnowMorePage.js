// frontend/src/pages/KnowMorePage.js
import React from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import {
  ArrowRight, CheckCircle, Shield, Zap, Globe, Bell, FileCheck,
  Lock, BarChart3, Users, Layers, ChevronRight,
  Upload, Eye, Settings, Send, ClipboardCheck, Building2,
  RefreshCw, FileText, Workflow
} from 'lucide-react';

function KnowMorePage() {
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  return (
    <div style={{ fontFamily: "'Inter', 'Segoe UI', sans-serif" }}>
      <Helmet>
        <title>About the Platform — Grow Business Development</title>
        <meta name="description" content="Discover how Grow's modular LG management platform works — from AI-powered custody tracking to smart issuance workflows. Built for treasurers, designed for growth." />
        <meta property="og:title" content="About Grow — LG Custody & Issuance Platform" />
        <meta property="og:description" content="A step-by-step look at how Grow handles LG custody tracking, issuance workflows, bank communication, and compliance reporting." />
        <meta property="og:type" content="website" />
      </Helmet>

      {/* ═══════ HEADER ═══════ */}
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-gray-800/30" style={{ backgroundColor: '#1e2a4a' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-lg font-bold text-white tracking-tight">Grow</span>
            <span className="text-xs text-blue-400 font-medium hidden sm:inline">Business Development</span>
          </div>
          
          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center space-x-4">
            <Link to="/" className="text-sm font-medium text-gray-300 hover:text-white transition-colors">Home</Link>
            <Link to="/portal/issuance" className="text-sm font-medium text-gray-300 hover:text-white transition-colors">Issuance Portal</Link>
            <a href="/grow_brochure.pdf" download="Grow-Brochure.pdf" className="text-sm font-medium text-gray-300 hover:text-white transition-colors">Brochure</a>
            <Link to="/free-trial-register" className="px-4 py-1.5 text-sm font-semibold text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors">
              Free Trial
            </Link>
            <Link to="/login" className="px-4 py-1.5 text-sm font-semibold text-gray-300 border border-gray-500 rounded-md hover:bg-white/10 transition-colors">
              Sign In
            </Link>
          </nav>

          {/* Mobile Right Actions & Hamburger */}
          <div className="flex md:hidden items-center space-x-2">
            <Link to="/login" className="px-3 py-1 text-xs font-semibold text-gray-300 border border-gray-500 rounded-md hover:bg-white/10 transition-colors">
              Sign In
            </Link>
            <Link to="/free-trial-register" className="px-3 py-1 text-xs font-semibold text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors">
              Free Trial
            </Link>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-1.5 rounded-lg text-gray-300 hover:text-white hover:bg-white/10 transition-colors focus:outline-none"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-gray-700/50 bg-[#162038] px-4 py-3 space-y-2 shadow-2xl animate-fade-in-up">
            <Link
              to="/"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-lg text-sm font-medium text-gray-200 hover:text-white hover:bg-white/10 transition-colors"
            >
              Home
            </Link>
            <Link
              to="/portal/issuance"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-lg text-sm font-medium text-gray-200 hover:text-white hover:bg-white/10 transition-colors"
            >
              Issuance Portal
            </Link>
            <a
              href="/grow_brochure.pdf"
              download="Grow-Brochure.pdf"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-lg text-sm font-medium text-gray-200 hover:text-white hover:bg-white/10 transition-colors"
            >
              Brochure
            </a>
            <Link
              to="/#demo-form"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-lg text-sm font-medium text-gray-200 hover:text-white hover:bg-white/10 transition-colors"
            >
              Book a Demo
            </Link>
          </div>
        )}
      </header>

      {/* ═══════ HERO ═══════ */}
      <section className="relative overflow-hidden" style={{ backgroundColor: '#1e2a4a', paddingTop: '56px' }}>
        <div className="absolute top-0 right-0 w-96 h-96 rounded-full opacity-[0.04] bg-white -mr-48 -mt-48" />
        <div className="absolute bottom-0 left-1/4 w-64 h-64 rounded-full opacity-[0.03] bg-blue-400" />
        <div className="max-w-7xl mx-auto px-6 py-20 lg:py-28 text-center relative z-10">
          <div className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium mb-6" style={{ backgroundColor: 'rgba(96,165,250,0.15)', color: '#93bbfc' }}>
            <Layers className="w-3 h-3 mr-1.5" />
            Platform Deep Dive
          </div>
          <h1 className="text-4xl lg:text-5xl xl:text-6xl font-extrabold text-white leading-[1.1] mb-5 tracking-tight max-w-4xl mx-auto">
            Built for Treasurers,<br />
            <span style={{ color: '#60a5fa' }}>Designed for Growth</span>
          </h1>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto mb-8 leading-relaxed">
            A modular LG management platform covering custody, issuance, and everything in between — crafted to prevent risks, simplify operations, and help businesses grow.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link to="/free-trial-register" className="inline-flex items-center px-6 py-3 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/25">
              Start Free Trial <ArrowRight className="ml-2 w-4 h-4" />
            </Link>
            <Link to="/#demo-form" className="inline-flex items-center px-6 py-3 text-sm font-semibold text-gray-300 border border-gray-500 rounded-lg hover:bg-white/10 transition-all">
              Request a Demo
            </Link>
          </div>
        </div>
      </section>

      {/* ═══════ WHAT WE DO ═══════ */}
      <section className="bg-white py-20 lg:py-24">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <p className="text-xs font-bold text-blue-600 uppercase tracking-widest mb-2">What We Do</p>
              <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">One Platform. Two Powerful Modules.</h2>
              <p className="text-gray-500 leading-relaxed mb-6">
                We provide a specialized treasury system covering the full lifecycle of Letters of Guarantee — from receiving and tracking (Custody) to requesting and issuing (Issuance). Nothing slips through the cracks.
              </p>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { icon: Shield, label: 'LG Custody', color: 'blue' },
                  { icon: Send, label: 'LG Issuance', color: 'purple' },
                  { icon: Zap, label: 'AI Extraction', color: 'amber' },
                  { icon: Lock, label: 'Maker-Checker', color: 'green' },
                ].map((item, i) => (
                  <div key={i} className="flex items-center space-x-2 text-sm text-gray-700">
                    <item.icon className={`w-4 h-4 text-${item.color}-500`} />
                    <span className="font-medium">{item.label}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {[
                { value: '< 1 min', label: 'AI document capture', icon: Zap },
                { value: '100%', label: 'Audit trail coverage', icon: Eye },
                { value: '24/7', label: 'Proactive alerts', icon: Bell },
                { value: '140+', label: 'Banks supported', icon: Globe },
              ].map((stat, i) => (
                <div key={i} className="bg-gray-50 rounded-xl p-5 border border-gray-100 text-center">
                  <stat.icon className="w-5 h-5 text-blue-500 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ═══════ HOW LG CUSTODY WORKS ═══════ */}
      <section className="py-20 lg:py-24" style={{ backgroundColor: '#f8fafc' }}>
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-14">
            <div className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium mb-3 bg-blue-100 text-blue-700">
              <Shield className="w-3 h-3 mr-1.5" /> LG Custody Module
            </div>
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900">How LG Custody Works</h2>
            <p className="text-gray-500 mt-3 max-w-xl mx-auto">A step-by-step look at managing received guarantees.</p>
          </div>

          <div className="max-w-4xl mx-auto space-y-6">
            {[
              {
                step: '01', icon: Upload, title: 'Record a New LG',
                desc: 'Upload the scanned LG document. Our AI instantly extracts key fields — expiry date, amount, bank, beneficiary — in under 60 seconds. Add internal context like project or category.',
                highlights: ['AI-powered auto-extraction', 'Secure document storage', 'Internal tagging & context']
              },
              {
                step: '02', icon: Bell, title: 'Smart Reminders & Tracking',
                desc: 'The system continuously monitors every LG. Automatic reminders fire for upcoming expiries, renewals, and overdue bank replies — sent to all relevant parties.',
                highlights: ['Proactive expiry alerts', 'One-click renewal suggestions', 'Built-in template library']
              },
              {
                step: '03', icon: Eye, title: 'Lifecycle & Action Center',
                desc: 'Every LG has a comprehensive lifecycle view — current status, every action taken, all related documents from original to final release. The Action Center is your daily mission control.',
                highlights: ['Full lifecycle timeline', 'Pending approvals dashboard', 'Outstanding bank replies']
              },
              {
                step: '04', icon: Settings, title: 'Take Action',
                desc: 'Extend, decrease, liquidate, amend, activate, or release — every LG action is supported with maker-checker approval workflows and automatic instruction generation.',
                highlights: ['All LG actions supported', 'Maker-checker enforcement', 'Auto-generated instructions']
              },
              {
                step: '05', icon: FileText, title: 'Bank Communication & Audit',
                desc: 'Track instruction delivery and bank responses. Get notified of delays and generate reminders. Every action is logged for a complete, auditor-ready trail.',
                highlights: ['Response tracking & nudges', 'Complete audit trail', 'Instant documentation']
              },
            ].map((item, i) => (
              <div key={i} className="flex items-start space-x-5 bg-white rounded-xl p-6 border border-gray-100 hover:shadow-lg transition-shadow duration-300">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center">
                    <item.icon className="w-5 h-5 text-blue-600" />
                  </div>
                  <p className="text-[10px] font-bold text-blue-400 text-center mt-1">STEP {item.step}</p>
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-gray-900 mb-1">{item.title}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed mb-3">{item.desc}</p>
                  <div className="flex flex-wrap gap-2">
                    {item.highlights.map((h, j) => (
                      <span key={j} className="inline-flex items-center text-xs text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full">
                        <CheckCircle className="w-3 h-3 mr-1" />{h}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════ HOW LG ISSUANCE WORKS ═══════ */}
      <section className="bg-white py-20 lg:py-24">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-14">
            <div className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium mb-3 bg-purple-100 text-purple-700">
              <Send className="w-3 h-3 mr-1.5" /> LG Issuance Module
            </div>
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900">How LG Issuance Works</h2>
            <p className="text-gray-500 mt-3 max-w-xl mx-auto">A streamlined workflow for requesting new guarantees from banks.</p>
          </div>

          <div className="max-w-4xl mx-auto space-y-6">
            {[
              {
                step: '01', icon: ClipboardCheck, title: 'Create Issuance Request',
                desc: 'Fill out the 3-step issuance wizard with all LG details — type, amount, beneficiary, terms, and supporting documents. Smart defaults and auto-fill speed things up.',
                highlights: ['3-step guided wizard', 'Smart form auto-filling', 'Document attachments']
              },
              {
                step: '02', icon: Workflow, title: 'Internal Approval Flow',
                desc: 'Configurable maker-checker approval workflows ensure every request is reviewed before going to banks. Multi-level approvals with escalation support.',
                highlights: ['Configurable checker groups', 'Multi-level approvals', 'Full audit trail']
              },
              {
                step: '03', icon: FileCheck, title: 'AI-Powered Bank Form Filling',
                desc: 'Upload any bank\'s LG application form (PDF). Our AI analyzes the form fields and pre-fills them with your issuance data — supporting both fillable PDFs and scanned forms.',
                highlights: ['Fillable PDF support', 'Scanned form overlay', 'Bilingual Arabic/English']
              },
              {
                step: '04', icon: RefreshCw, title: 'Full Lifecycle Management',
                desc: 'Track the entire issuance journey from request to delivery. Monitor status, handle amendments, and maintain a complete record of every issuance.',
                highlights: ['End-to-end tracking', 'Status notifications', 'Amendment support']
              },
            ].map((item, i) => (
              <div key={i} className="flex items-start space-x-5 bg-purple-50/30 rounded-xl p-6 border border-purple-100 hover:shadow-lg transition-shadow duration-300">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center">
                    <item.icon className="w-5 h-5 text-purple-600" />
                  </div>
                  <p className="text-[10px] font-bold text-purple-400 text-center mt-1">STEP {item.step}</p>
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-gray-900 mb-1">{item.title}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed mb-3">{item.desc}</p>
                  <div className="flex flex-wrap gap-2">
                    {item.highlights.map((h, j) => (
                      <span key={j} className="inline-flex items-center text-xs text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full">
                        <CheckCircle className="w-3 h-3 mr-1" />{h}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════ PLATFORM CAPABILITIES ═══════ */}
      <section className="py-20 lg:py-24" style={{ backgroundColor: '#1e2a4a' }}>
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-14">
            <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: '#60a5fa' }}>Platform Capabilities</p>
            <h2 className="text-3xl lg:text-4xl font-bold text-white">Built for Your Business</h2>
            <p className="text-gray-400 mt-3 max-w-xl mx-auto text-sm">Not a rigid tool — a flexible platform you configure to fit your specific needs.</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: Users, title: 'Role-Based Access', desc: 'System Owner, Corporate Admin, End User, Checker, and Viewer roles — each with configurable permissions.' },
              { icon: Layers, title: 'Multi-Entity Management', desc: 'Manage multiple subsidiaries from a centralized dashboard with entity-level data isolation.' },
              { icon: Settings, title: 'Configurable Rules', desc: 'Define renewal logic, reminder schedules, actionable LG criteria, and behavioral rules to match your processes.' },
              { icon: BarChart3, title: 'Dashboards & Analytics', desc: 'Real-time portfolio views, expiry timelines, bank performance, and trend analysis at your fingertips.' },
              { icon: Lock, title: 'Maker-Checker Workflows', desc: 'Enforce approval workflows with configurable checker groups, escalation paths, and expiry-safe automation.' },
              { icon: Eye, title: 'Complete Audit Trail', desc: 'Every action is logged — who did what, when, and what changed. Internal reviews and external audits made effortless.' },
            ].map((item, i) => (
              <div key={i} className="p-6 rounded-xl" style={{ backgroundColor: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <div className="w-10 h-10 rounded-lg mb-4 flex items-center justify-center" style={{ backgroundColor: 'rgba(96,165,250,0.15)' }}>
                  <item.icon className="w-5 h-5" style={{ color: '#60a5fa' }} />
                </div>
                <h4 className="text-sm font-semibold text-white mb-2">{item.title}</h4>
                <p className="text-xs text-gray-400 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════ CTA ═══════ */}
      <section className="bg-blue-600 py-16">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-3xl font-bold text-white mb-3">Ready to Take Control?</h2>
          <p className="text-blue-200 mb-8 text-sm max-w-xl mx-auto">
            LG management can be simple, secure, and smart. See for yourself how a platform built by treasurers can transform your operations.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link to="/free-trial-register" className="px-6 py-2.5 text-sm font-semibold text-blue-600 bg-white rounded-lg hover:bg-gray-100 transition-colors shadow-md">
              Start Free Trial
            </Link>
            <Link to="/#demo-form" className="px-6 py-2.5 text-sm font-semibold text-white border-2 border-white/70 rounded-lg hover:bg-white/10 transition-colors">
              Request a Demo Today
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
              <li><Link to="/" className="hover:text-white transition-colors">Home</Link></li>
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

export default KnowMorePage;