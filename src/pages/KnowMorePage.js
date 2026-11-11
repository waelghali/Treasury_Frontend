// frontend/src/pages/KnowMorePage.js
import React, { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import {
  ArrowRight, CheckCircle, Shield, Zap, Bell, FileCheck,
  Lock, BarChart3, Users, Layers,
  Upload, Eye, Settings, Send, ClipboardCheck,
  RefreshCw, FileText, Workflow, TrendingUp, FileSpreadsheet,
  KeyRound, Fingerprint, ShieldCheck, ArrowLeftRight, Split, Timer
} from 'lucide-react';

function KnowMorePage() {
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const { hash } = useLocation();

  useEffect(() => {
    if (hash) {
      const el = document.querySelector(hash);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
        return;
      }
    }
    window.scrollTo(0, 0);
  }, [hash]);

  return (
    <div style={{ fontFamily: "'Inter', 'Segoe UI', sans-serif" }}>
      <Helmet>
        <title>About the Platform — Grow Business Development</title>
        <meta name="description" content="Explore how Grow's modular treasury platform works across LG Custody, LG Issuance, FX & T-Bill Quotations, and Bank Auto-Reconciliation — backed by enterprise security and confidentiality." />
        <meta property="og:title" content="About Grow — Modular Corporate Treasury Platform" />
        <meta property="og:description" content="A clear look at how Grow automates LG custody, LG issuance, multi-bank FX & T-Bill bidding, and bank statement reconciliation." />
        <meta property="og:type" content="website" />
      </Helmet>

      {/* ═══════ HEADER ═══════ */}
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-gray-800/30" style={{ backgroundColor: '#1e2a4a' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <Link to="/" className="flex items-center space-x-2 hover:opacity-90 transition-opacity">
            <span className="text-lg font-bold text-white tracking-tight">Grow</span>
            <span className="text-xs text-blue-400 font-medium hidden sm:inline">Business Development</span>
          </Link>
          
          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center space-x-4">
            <a href="#security" className="text-sm font-medium text-gray-300 hover:text-white transition-colors">Security</a>
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
            <a
              href="#security"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-lg text-sm font-medium text-gray-200 hover:text-white hover:bg-white/10 transition-colors"
            >
              Security & Confidentiality
            </a>
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
            A modular treasury platform covering LG Custody, LG Issuance, FX &amp; T-Bill Quotations, and Bank Auto-Reconciliation — crafted to prevent risks, simplify daily work, and keep your data confidential.
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
              <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">One Platform. Four Focused Modules.</h2>
              <p className="text-gray-500 leading-relaxed mb-6">
                Activate a single module or run all four together. Each module solves a core corporate treasury workflow with shared user permissions, maker-checker governance, and unified audit logs.
              </p>
              <div className="grid sm:grid-cols-2 gap-3">
                {[
                  { icon: Shield, label: 'LG Custody', sub: 'Received guarantees', href: '#custody', color: 'text-blue-600 bg-blue-50 border-blue-100' },
                  { icon: Send, label: 'LG Issuance', sub: 'Outgoing bank requests', href: '#issuance', color: 'text-purple-600 bg-purple-50 border-purple-100' },
                  { icon: TrendingUp, label: 'FX & T-Bill Quotations', sub: 'Multi-bank bidding', href: '#quotations', color: 'text-emerald-600 bg-emerald-50 border-emerald-100' },
                  { icon: FileSpreadsheet, label: 'Bank Auto-Reconciliation', sub: 'Statements & ERP matching', href: '#reconciliation', color: 'text-amber-600 bg-amber-50 border-amber-100' },
                ].map((item, i) => (
                  <a
                    key={i}
                    href={item.href}
                    className="flex items-center space-x-3 p-3 rounded-xl border border-gray-100 hover:border-blue-200 hover:shadow-sm transition-all"
                  >
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center border flex-shrink-0 ${item.color}`}>
                      <item.icon className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{item.label}</p>
                      <p className="text-xs text-gray-500">{item.sub}</p>
                    </div>
                  </a>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {[
                { value: '4 Modules', label: 'Unified treasury suite', icon: Layers },
                { value: '< 1 min', label: 'AI document capture', icon: Zap },
                { value: '100%', label: 'Tamper-evident audit trail', icon: Eye },
                { value: '24/7', label: 'Automated schedule alerts', icon: Bell },
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

      {/* ═══════ MODULE 1: HOW LG CUSTODY WORKS ═══════ */}
      <section id="custody" className="py-20 lg:py-24 scroll-mt-14" style={{ backgroundColor: '#f8fafc' }}>
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-14">
            <div className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium mb-3 bg-blue-100 text-blue-700">
              <Shield className="w-3 h-3 mr-1.5" /> Module 1 · LG Custody
            </div>
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900">How LG Custody Works</h2>
            <p className="text-gray-500 mt-3 max-w-xl mx-auto">Track and safeguard every guarantee received from suppliers, contractors, and partners.</p>
          </div>

          <div className="max-w-4xl mx-auto space-y-5">
            {[
              {
                step: '01', icon: Upload, title: 'Capture & Organize Received LGs',
                desc: 'Upload a scanned LG document and let AI extract key details — amount, currency, expiry date, issuing bank, and beneficiary — in under 60 seconds, then assign internal owners and categories.',
                highlights: ['AI field extraction', 'Encrypted cloud storage', 'Internal owner & category tags']
              },
              {
                step: '02', icon: Bell, title: 'Proactive Alerts & Action Center',
                desc: 'Automated schedules monitor upcoming expiries, auto-renewal windows, unprinted instructions, and overdue bank replies — surfaced daily in your Action Center.',
                highlights: ['Expiry & renewal warnings', 'Pending bank reply tracking', 'Daily Action Center']
              },
              {
                step: '03', icon: Settings, title: 'Lifecycle Actions & Governance',
                desc: 'Extend, release, decrease amount, liquidate, amend, or activate non-operative guarantees — governed by configurable maker-checker approvals and mandatory document rules.',
                highlights: ['Full lifecycle actions', 'Maker-checker approvals', 'Document compliance checks']
              },
              {
                step: '04', icon: FileText, title: 'QR-Verified Bank Letters & Audit Trail',
                desc: 'Generate formal bank instruction and reminder letters sealed with a QR code and 6-digit security code, while tracking physical delivery and bank confirmations.',
                highlights: ['QR & PIN letter verification', 'Delivery & reply logging', 'Auditor-ready history']
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
                      <span key={j} className="inline-flex items-center text-xs text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full">
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

      {/* ═══════ MODULE 2: HOW LG ISSUANCE WORKS ═══════ */}
      <section id="issuance" className="bg-white py-20 lg:py-24 scroll-mt-14">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-14">
            <div className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium mb-3 bg-purple-100 text-purple-700">
              <Send className="w-3 h-3 mr-1.5" /> Module 2 · LG Issuance
            </div>
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900">How LG Issuance Works</h2>
            <p className="text-gray-500 mt-3 max-w-xl mx-auto">Streamline outgoing guarantee requests from internal departments to bank execution.</p>
          </div>

          <div className="max-w-4xl mx-auto space-y-5">
            {[
              {
                step: '01', icon: ClipboardCheck, title: 'Guided Wizard & Department Portal',
                desc: 'Submit requests via the 3-step wizard or let project teams submit through the OTP-verified Public Issuance Portal with smart auto-fill and supporting attachments.',
                highlights: ['3-step guided wizard', 'OTP requestor portal', 'Smart auto-fill']
              },
              {
                step: '02', icon: Workflow, title: 'Smart Facility Scoring & Approval Matrix',
                desc: 'Route requests through multi-level maker-checker approvals while evaluating bank credit facilities across cost, available headroom, cash margin, currency match, and SLA speed.',
                highlights: ['Multi-bank facility limits', 'Smart bank recommendation', 'Configurable approval matrix']
              },
              {
                step: '03', icon: FileCheck, title: 'AI-Powered Bank Application Filling',
                desc: 'Upload any bank\'s PDF LG application form. AI maps and populates fields with your approved request data — supporting both fillable PDFs and scanned forms in Arabic and English.',
                highlights: ['Fillable & scanned PDFs', 'Bilingual Arabic/English', 'Instant print-ready forms']
              },
              {
                step: '04', icon: RefreshCw, title: 'Post-Issuance & Position Reconciliation',
                desc: 'Track bank delivery, issued LG copies, and post-issuance amendments, and reconcile bank LG position statements against your system records to catch discrepancies.',
                highlights: ['Delivery & reply tracking', 'Post-issuance maintenance', 'Bank position reconciliation']
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
                      <span key={j} className="inline-flex items-center text-xs text-purple-700 bg-purple-50 px-2.5 py-0.5 rounded-full">
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

      {/* ═══════ MODULE 3: HOW FX & T-BILL QUOTATIONS WORK ═══════ */}
      <section id="quotations" className="py-20 lg:py-24 scroll-mt-14" style={{ backgroundColor: '#f8fafc' }}>
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-14">
            <div className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium mb-3 bg-emerald-100 text-emerald-700">
              <TrendingUp className="w-3 h-3 mr-1.5" /> Module 3 · FX &amp; T-Bill Quotations
            </div>
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900">How FX &amp; T-Bill Quotations Work</h2>
            <p className="text-gray-500 mt-3 max-w-xl mx-auto">Run structured, competitive multi-bank bidding with real-time pricing controls.</p>
          </div>

          <div className="max-w-4xl mx-auto space-y-5">
            {[
              {
                step: '01', icon: TrendingUp, title: 'Broadcast Multi-Bank RFQs',
                desc: 'Launch FX Spot or Treasury Bill (T-Bill) requests across your relationship banks. Bundle multi-leg currency baskets and apply optional pre-broadcast admin approval.',
                highlights: ['FX Spot & T-Bill RFQs', 'Multi-leg currency baskets', 'Optional pre-broadcast approval']
              },
              {
                step: '02', icon: ShieldCheck, title: 'Tokenized Dealer Bidding & Rate Guardrails',
                desc: 'Bank dealers submit quotes through secure, tokenized bidding links with built-in checks for rate inversions and dealer typos, plus optional blind rank feedback.',
                highlights: ['Zero-password dealer links', 'Inversion & typo checks', 'Confidential live ranking']
              },
              {
                step: '03', icon: Split, title: 'True Net-Cost Ranking & Ticket Splitting',
                desc: 'Compare offers side by side net of bank fees and statutory T-Bill withholding tax, benchmark against Central Bank corridor rates, and split tickets across multiple banks.',
                highlights: ['Net-of-fee & WHT yield', 'Central Bank benchmark', 'Multi-bank ticket splitting']
              },
              {
                step: '04', icon: Timer, title: 'Countdown Execution & Signed Receipts',
                desc: 'Close deals within a synchronized acceptance countdown — manually or via pre-authorized auto-accept — dispatching cryptographically signed deal confirmation receipts.',
                highlights: ['Synchronized acceptance timer', 'Auto-accept or manual award', 'Signed deal execution receipt']
              },
            ].map((item, i) => (
              <div key={i} className="flex items-start space-x-5 bg-white rounded-xl p-6 border border-emerald-100 hover:shadow-lg transition-shadow duration-300">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center">
                    <item.icon className="w-5 h-5 text-emerald-600" />
                  </div>
                  <p className="text-[10px] font-bold text-emerald-500 text-center mt-1">STEP {item.step}</p>
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-gray-900 mb-1">{item.title}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed mb-3">{item.desc}</p>
                  <div className="flex flex-wrap gap-2">
                    {item.highlights.map((h, j) => (
                      <span key={j} className="inline-flex items-center text-xs text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full">
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

      {/* ═══════ MODULE 4: HOW BANK AUTO-RECONCILIATION WORKS ═══════ */}
      <section id="reconciliation" className="bg-white py-20 lg:py-24 scroll-mt-14">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-14">
            <div className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium mb-3 bg-amber-100 text-amber-700">
              <FileSpreadsheet className="w-3 h-3 mr-1.5" /> Module 4 · Bank Auto-Reconciliation
            </div>
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900">How Bank Auto-Reconciliation Works</h2>
            <p className="text-gray-500 mt-3 max-w-xl mx-auto">Turn raw multi-bank statements into classified, ERP-matched accounting entries in minutes.</p>
          </div>

          <div className="max-w-4xl mx-auto space-y-5">
            {[
              {
                step: '01', icon: Upload, title: 'Smart Multi-Bank Statement Import',
                desc: 'Upload Excel or CSV statements from any bank. The parser auto-detects Arabic and English headers, dates, and amounts while verifying opening-to-closing balance continuity.',
                highlights: ['Excel & CSV auto-mapping', 'Arabic & English headers', 'Balance continuity check']
              },
              {
                step: '02', icon: Zap, title: 'Zero-Setup Overhead Classification',
                desc: 'Built-in banking rules immediately categorize account fees, stamp duty, withholding tax, interest, payroll, and bounced collections — and learn new rules when you confirm.',
                highlights: ['Instant built-in classifiers', 'Bounced cheque detection', 'Self-learning GL rules']
              },
              {
                step: '03', icon: ArrowLeftRight, title: 'Liquidity Sweep & Reversal Pairing',
                desc: 'Automatically links inter-account cash sweeps — even when wire transfer fees create an amount difference — and pairs same-day bank errors with their reversals.',
                highlights: ['Inter-account sweep pairing', 'Wire fee variance detection', 'Error & reversal clearing']
              },
              {
                step: '04', icon: FileSpreadsheet, title: 'Split-View ERP Matching & GL Export',
                desc: 'Reconcile customer collections and vendor payments side by side against internal ERP ledger records, then export custom CSV/Excel layouts or expanded double-entry GL journals.',
                highlights: ['Dual-pane ERP matching', '1-to-many & batch matching', 'Custom GL journal export']
              },
            ].map((item, i) => (
              <div key={i} className="flex items-start space-x-5 bg-amber-50/30 rounded-xl p-6 border border-amber-100 hover:shadow-lg transition-shadow duration-300">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center">
                    <item.icon className="w-5 h-5 text-amber-600" />
                  </div>
                  <p className="text-[10px] font-bold text-amber-500 text-center mt-1">STEP {item.step}</p>
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-gray-900 mb-1">{item.title}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed mb-3">{item.desc}</p>
                  <div className="flex flex-wrap gap-2">
                    {item.highlights.map((h, j) => (
                      <span key={j} className="inline-flex items-center text-xs text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full">
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
            <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: '#60a5fa' }}>Platform Foundation</p>
            <h2 className="text-3xl lg:text-4xl font-bold text-white">Shared Across Every Module</h2>
            <p className="text-gray-400 mt-3 max-w-xl mx-auto text-sm">One consistent governance model that adapts to your organization's structure and policies.</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: Users, title: 'Role-Based Access', desc: 'Corporate Admin, Checker, End User, and read-only Viewer roles — each scoped to clear operational permissions.' },
              { icon: Layers, title: 'Multi-Entity Management', desc: 'Manage multiple subsidiaries and legal entities from a single workspace with entity-level scoping.' },
              { icon: Settings, title: 'Configurable Policies', desc: 'Tailor reminder schedules, mandatory evidence rules, facility scoring weights, and approval thresholds.' },
              { icon: Lock, title: 'Strict Maker-Checker', desc: 'Enforce dual control across LG actions, issuance requests, and RFQs — self-approval is blocked by system guardrails.' },
              { icon: Zap, title: 'Privacy-Safe AI Assistant', desc: 'Ask portfolio and platform questions in plain language while sensitive identifiers stay protected.' },
              { icon: BarChart3, title: 'Dashboards & Mobile Alerts', desc: 'Real-time portfolio analytics, SLA tracking, and instant web/mobile push notifications for urgent approvals and quotes.' },
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

      {/* ═══════ SECURITY & CONFIDENTIALITY (DEDICATED SECTION) ═══════ */}
      <section id="security" className="bg-white py-20 lg:py-24 scroll-mt-14">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-14">
            <p className="text-xs font-bold text-blue-600 uppercase tracking-widest mb-2">Security &amp; Confidentiality</p>
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900">Your Financial Data Stays Yours — Always</h2>
            <p className="text-gray-500 mt-3 max-w-2xl mx-auto text-sm leading-relaxed">
              We built privacy directly into how data is stored, processed, and verified — explained simply, with zero black boxes.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 max-w-5xl mx-auto">
            {[
              {
                icon: KeyRound,
                title: 'Dedicated Encryption Key Per Company',
                desc: 'Every organization is protected with its own 256-bit encryption key (AES-256). Sensitive dealer quotes, bank statement details, counterparties, and uploaded documents are encrypted at rest so your records remain strictly isolated.'
              },
              {
                icon: Shield,
                title: 'Automatic Privacy Shield for AI & Smart Rules',
                desc: 'Before the AI assistant or smart classification rules process text, company names, account numbers, IBANs, and LG numbers are automatically masked with anonymous tokens — your business identity and figures are never exposed.'
              },
              {
                icon: ShieldCheck,
                title: 'Tamper-Evident Audit Log & QR Letter Seals',
                desc: 'Every action is locked into a sequential SHA-256 chain where any alteration is immediately detected. Every printed bank instruction carries a unique QR code and 6-digit security code so banks can verify its authenticity in seconds.'
              },
              {
                icon: Fingerprint,
                title: 'Biometric Sign-In, MFA & Private Cloud Storage',
                desc: 'Sign in using Face ID, Touch ID, or email verification codes with automatic idle-session protection. Enterprise clients can also connect their own dedicated Google Cloud Storage bucket for full document residency control.'
              },
            ].map((item, i) => (
              <div key={i} className="flex items-start space-x-4 p-6 rounded-2xl border border-gray-200 bg-gray-50/50 hover:bg-white hover:shadow-lg transition-all duration-300">
                <div className="w-11 h-11 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0">
                  <item.icon className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900 mb-1.5">{item.title}</h3>
                  <p className="text-sm text-gray-600 leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════ CTA ═══════ */}
      <section className="bg-blue-600 py-16">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-3xl font-bold text-white mb-3">Ready to Simplify Your Treasury Operations?</h2>
          <p className="text-blue-200 mb-8 text-sm max-w-xl mx-auto">
            Start with a single module or run your guarantees, FX quotations, and bank reconciliations together on one secure platform.
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
            <Link to="/" className="inline-flex items-center space-x-2 mb-4 hover:opacity-90 transition-opacity">
              <span className="text-lg font-bold text-white">Grow</span>
              <span className="text-xs text-blue-400 font-medium">Business Development</span>
            </Link>
            <p className="text-sm leading-relaxed">The modular corporate treasury platform — uniting LG Custody, LG Issuance, FX &amp; T-Bill Quotations, and Bank Auto-Reconciliation.</p>
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