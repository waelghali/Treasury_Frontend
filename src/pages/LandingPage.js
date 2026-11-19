// frontend/src/pages/LandingPage.js
import React, { useRef, useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import {
  Shield,
  ArrowRight,
  Check,
  X,
  Send,
  ChevronRight,
  ChevronDown,
  TrendingUp,
  FileSpreadsheet,
  KeyRound,
  Fingerprint,
  ShieldCheck,
  Lock,
  Play,
  Sparkles,
  Calendar,
  MessageCircle,
  CheckCircle2,
  ExternalLink,
} from 'lucide-react';
import HoneypotField from '../components/Security/HoneypotField';
import GrowLogo from '../components/Common/GrowLogo';
import PublicProductExpertChat from '../components/Showcase/PublicProductExpertChat';
import ExecutiveModulePreview from '../components/Showcase/ExecutiveModulePreview';
import { trackPublicEvent } from '../utils/publicTelemetry';

const SHOWCASE_TABS = [
  { id: 'reconciliation', label: 'Bank Reconciliation' },
  { id: 'custody', label: 'LG Custody' },
  { id: 'issuance', label: 'LG Issuance' },
  { id: 'quotations', label: 'FX & T-Bill Bidding' },
];

const MODULES_GRID = [
  {
    id: 'custody',
    title: 'LG Custody',
    audience: 'Received Guarantees',
    desc: 'Never miss an expiry or bank reply across supplier and contractor guarantees.',
    points: ['60s AI document scan', 'Proactive renewal radar', 'QR-sealed bank letters'],
    icon: Shield,
    iconCls: 'bg-blue-50 text-blue-600',
    linkCls: 'text-blue-600 hover:text-blue-800',
    storyUrl: '/demo?story=custody',
  },
  {
    id: 'issuance',
    title: 'LG Issuance',
    audience: 'Outgoing Bank Requests',
    desc: 'Pick the lowest-cost credit line, protect cash margins, and auto-fill bank forms.',
    points: ['Department intake portal', 'Facility & margin scoring', 'Arabic/English PDF fill'],
    icon: Send,
    iconCls: 'bg-purple-50 text-purple-600',
    linkCls: 'text-purple-600 hover:text-purple-800',
    storyUrl: '/demo?story=issuance',
  },
  {
    id: 'quotations',
    title: 'FX & T-Bill RFQs',
    audience: 'Multi-Bank Dealing',
    desc: 'Make relationship banks compete simultaneously with full best-execution proof.',
    points: ['Zero-password dealer links', 'All-in net & TVM ranking', 'Signed deal receipts'],
    icon: TrendingUp,
    iconCls: 'bg-emerald-50 text-emerald-600',
    linkCls: 'text-emerald-600 hover:text-emerald-800',
    storyUrl: '/demo?story=quotations',
  },
  {
    id: 'reconciliation',
    title: 'Bank Reconciliation',
    audience: 'Statements & ERP Match',
    desc: 'Turn raw bank statements into matched, balanced ERP journal entries in minutes.',
    points: ['Zero-setup fee & tax rules', 'Sweep & fee-variance pairing', 'SAP / Oracle GL export'],
    icon: FileSpreadsheet,
    iconCls: 'bg-amber-50 text-amber-600',
    linkCls: 'text-amber-600 hover:text-amber-800',
    storyUrl: '/demo?story=reconciliation',
  },
];

const TOPIC_CHIPS = [
  'Full Suite',
  'Bank Reconciliation',
  'LG Custody',
  'LG Issuance',
  'FX & T-Bill Bidding',
];

const EXECUTIVE_FAQS = [
  {
    q: 'Do our relationship banks need any IT setup, software, or APIs?',
    a: 'No. Grow works on Day 1 with zero bank IT involvement: QR-verified instruction letters, auto-filled official bank PDF forms, zero-password OTP dealer links, and standard Excel/CSV/MT940/CAMT.053 statement imports.',
  },
  {
    q: 'Can we subscribe to just one module first and expand later?',
    a: 'Yes. Every module runs independently on a shared governance foundation, so you can start with Bank Reconciliation or LG Custody today and unlock additional modules anytime.',
  },
  {
    q: 'Does Grow replace our ERP or work alongside it?',
    a: 'Grow works alongside SAP, Oracle, Microsoft Dynamics, and Odoo — acting as your treasury cockpit and generating balanced, locked double-entry CSV/XLSX journal files mapped to your Chart of Accounts.',
  },
  {
    q: 'Can we manage a holding group with multiple legal entities and approval rules?',
    a: 'Yes. Each subsidiary can have isolated users, segregated records, and custom Maker-Checker approval matrices while giving the CFO and Group Treasurer consolidated group-wide visibility.',
  },
  {
    q: 'Does LG Issuance handle cross-border guarantees and special bank wording?',
    a: 'Yes. Approval matrices can route cross-border LGs automatically, attach custom legal wording annexes, and populate official Arabic or English bank PDF applications.',
  },
];

function LandingPage() {
  const meetingFormRef = useRef(null);
  const { hash } = useLocation();
  const calendarEmbedUrl = (process.env.REACT_APP_CALENDAR_EMBED_URL || '').trim();

  const [activeTab, setActiveTab] = useState('reconciliation');
  const [openFaqIdx, setOpenFaqIdx] = useState(null);
  const [selectedTopic, setSelectedTopic] = useState('Full Suite');
  const [formData, setFormData] = useState({
    name: '',
    company: '',
    email: '',
    phone: '',
    website_url: '',
  });
  const [submittedInfo, setSubmittedInfo] = useState(null);
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [expertChatOpen, setExpertChatOpen] = useState(false);

  useEffect(() => {
    trackPublicEvent('page_view', { page: 'landing', path: '/' });
  }, []);

  useEffect(() => {
    if (!hash) return;
    const scrollTarget = () => {
      if ((hash === '#book-meeting' || hash === '#demo-form') && meetingFormRef.current) {
        meetingFormRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
        return;
      }
      const el = document.querySelector(hash);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };
    const timer = setTimeout(scrollTarget, 60);
    return () => clearTimeout(timer);
  }, [hash]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const scrollToMeetingForm = () => {
    trackPublicEvent('cta_click', {
      page: 'landing',
      path: '/',
      metadata: { target: 'book_meeting_click' },
    });
    if (meetingFormRef.current) meetingFormRef.current.scrollIntoView({ behavior: 'smooth' });
  };

  const handleDownloadBrochure = () => {
    trackPublicEvent('cta_click', {
      page: 'landing',
      path: '/',
      metadata: { target: 'brochure_download' },
    });
    const link = document.createElement('a');
    link.href = '/grow_brochure.pdf';
    link.download = 'Grow-Brochure.pdf';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleMeetingSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    const trap = formData.website_url ? formData.website_url.trim().toLowerCase() : '';
    const isAutofillCollision =
      trap &&
      ((formData.email && trap === formData.email.trim().toLowerCase()) ||
        (formData.name && trap === formData.name.trim().toLowerCase()) ||
        (formData.company && trap === formData.company.trim().toLowerCase()) ||
        (formData.phone && trap === formData.phone.trim().toLowerCase()));

    if (trap && !isAutofillCollision) {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      setFormError('Invalid request submission. Please verify your information.');
      return;
    }

    if (!formData.name || !formData.company || !formData.email || !formData.phone) {
      setFormError('Please fill out all required fields.');
      return;
    }

    setIsSubmitting(true);
    try {
      const googleFormsUrl =
        'https://docs.google.com/forms/d/e/1FAIpQLSdNahdLNZwI1txtvR8kSvEdaJ43hQ7VbcLOIsdC41OQV51Lvw/formResponse';
      const data = new URLSearchParams();
      data.append('entry.1184110141', formData.name);
      data.append('entry.1533984093', formData.company);
      data.append('entry.1421145951', formData.email);
      data.append('entry.1978314716', formData.phone);
      data.append('entry.1323929138', `Focus: ${selectedTopic}`);
      await fetch(googleFormsUrl, { method: 'POST', body: data, mode: 'no-cors' });

      trackPublicEvent('cta_click', {
        page: 'landing',
        path: '/',
        metadata: { target: 'book_meeting_submit', focus: selectedTopic },
      });

      setSubmittedInfo({
        name: formData.name,
        company: formData.company,
        topic: selectedTopic,
      });
      setFormData({ name: '', company: '', email: '', phone: '', website_url: '' });
    } catch {
      setFormError('Network error. Please try again or reach us directly on WhatsApp.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentShowcase =
    SHOWCASE_TABS.find((t) => t.id === activeTab) || SHOWCASE_TABS[0];

  const inputCls =
    'w-full px-4 py-3 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent bg-white transition-shadow';

  return (
    <div
      className="bg-white text-slate-900 antialiased"
      style={{ fontFamily: "'Inter', 'Segoe UI', sans-serif" }}
    >
      <Helmet>
        <title>Grow Treasury — Control Every Guarantee, Bank Quote &amp; Statement</title>
        <meta
          name="description"
          content="Automate LG custody and issuance, make banks compete on FX & T-Bills, and reconcile multi-bank statements in minutes — on one encrypted treasury platform."
        />
        <meta
          property="og:title"
          content="Grow Treasury — Corporate Treasury & Trade Finance Platform"
        />
        <meta
          property="og:description"
          content="Every Guarantee, Bank Quote & Statement — Under Total Control."
        />
        <meta property="og:type" content="website" />
      </Helmet>

      {/* ═══════ CLEAN, MINIMAL EXECUTIVE NAVBAR ═══════ */}
      <header
        className="fixed top-0 left-0 right-0 z-50 border-b border-white/10 backdrop-blur-md"
        style={{ backgroundColor: 'rgba(15, 23, 42, 0.94)' }}
      >
        <div className="max-w-7xl mx-auto px-5 sm:px-8 h-[72px] flex items-center justify-between gap-6">
          <Link
            to="/"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="flex items-center hover:opacity-95 transition-opacity shrink-0"
          >
            <GrowLogo size="md" />
          </Link>

          {/* Calm Center Links — Strictly Single-Line */}
          <nav className="hidden xl:flex items-center gap-7 whitespace-nowrap">
            <Link
              to="/demo"
              onClick={() =>
                trackPublicEvent('cta_click', {
                  page: 'landing',
                  path: '/',
                  metadata: { target: 'nav_interactive_demo' },
                })
              }
              className="text-sm font-medium text-slate-300 hover:text-white transition-colors"
            >
              Interactive Demo
            </Link>
            <Link
              to="/know-more"
              className="text-sm font-medium text-slate-300 hover:text-white transition-colors"
            >
              How It Works
            </Link>
            <a
              href="#security"
              className="text-sm font-medium text-slate-300 hover:text-white transition-colors"
            >
              Security
            </a>
            <button
              type="button"
              onClick={() => setExpertChatOpen((v) => !v)}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-300 hover:text-white transition-colors cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-blue-400 shrink-0" />
              <span>{expertChatOpen ? 'Close AI' : 'Ask AI'}</span>
            </button>
          </nav>

          {/* Right Actions: Clean Monochrome + Single Primary CTA (Zero Wrapping, Zero Color Clash) */}
          <div className="hidden md:flex items-center gap-4 whitespace-nowrap shrink-0">
            <Link
              to="/portal/issuance"
              className="text-sm font-medium text-slate-300 hover:text-white transition-colors"
            >
              Issuance Portal
            </Link>
            <Link
              to="/login"
              className="text-sm font-medium text-slate-300 hover:text-white transition-colors"
            >
              Sign In
            </Link>
            <span className="h-4 w-px bg-white/15" aria-hidden="true" />
            <Link
              to="/free-trial-register"
              onClick={() =>
                trackPublicEvent('cta_click', {
                  page: 'landing',
                  path: '/',
                  metadata: { target: 'navbar_free_trial' },
                })
              }
              className="px-3.5 py-2 rounded-lg text-sm font-semibold text-white bg-white/[0.06] border border-white/15 hover:bg-white/[0.12] transition-colors"
            >
              Free Trial
            </Link>
            <button
              type="button"
              onClick={scrollToMeetingForm}
              className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-blue-600 hover:bg-blue-500 transition-colors cursor-pointer shadow-sm"
            >
              Book a Demo
            </button>
          </div>

          {/* Mobile Controls */}
          <div className="flex md:hidden items-center gap-2 whitespace-nowrap shrink-0">
            <Link
              to="/portal/issuance"
              className="px-2.5 py-1.5 text-[11px] font-semibold text-slate-200 bg-white/[0.07] border border-white/15 rounded-lg"
            >
              Issuance Portal
            </Link>
            <button
              type="button"
              onClick={scrollToMeetingForm}
              className="px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 rounded-lg"
            >
              Book Demo
            </button>
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-1.5 rounded-lg text-slate-300 hover:text-white"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? (
                <X className="w-6 h-6" />
              ) : (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Clean Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-white/10 bg-[#0f172a] px-5 py-4 space-y-2.5">
            <Link
              to="/demo"
              onClick={() => setMobileMenuOpen(false)}
              className="block py-2 text-sm font-semibold text-blue-400"
            >
              Interactive Demo
            </Link>
            <Link
              to="/know-more"
              onClick={() => setMobileMenuOpen(false)}
              className="block py-2 text-sm font-medium text-slate-200"
            >
              How It Works
            </Link>
            <a
              href="#security"
              onClick={() => setMobileMenuOpen(false)}
              className="block py-2 text-sm font-medium text-slate-200"
            >
              Security
            </a>
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                setExpertChatOpen(true);
              }}
              className="w-full text-left py-2 text-sm font-medium text-slate-200"
            >
              Ask Grow AI
            </button>
            <Link
              to="/portal/issuance"
              onClick={() => setMobileMenuOpen(false)}
              className="block py-2 text-sm font-medium text-slate-200"
            >
              Department Issuance Portal
            </Link>
            <div className="pt-2.5 border-t border-white/10 flex items-center justify-between">
              <Link
                to="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="text-sm font-semibold text-white"
              >
                Customer Sign In →
              </Link>
              <Link
                to="/free-trial-register"
                onClick={() => setMobileMenuOpen(false)}
                className="text-sm font-medium text-blue-400"
              >
                Free Trial
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* ═══════ DOCKED SIDE-PUSH SHELL ═══════ */}
      <div className="flex items-start w-full">
        <div className="flex-1 min-w-0">
          {/* ═══════ SECTION 1: FOCUSED HERO + FULL-SIZE INTERACTIVE PRODUCT STAGE ═══════ */}
          <section
            className="relative overflow-hidden pt-28 sm:pt-36 pb-20 lg:pb-28"
            style={{
              background:
                'radial-gradient(ellipse 80% 50% at 50% -10%, rgba(37, 99, 235, 0.28), transparent), #0f172a',
            }}
          >
            <div className="max-w-6xl mx-auto px-5 sm:px-6 text-center">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-400 mb-4">
                Corporate Treasury Platform
              </p>

              <h1 className="text-4xl sm:text-5xl lg:text-[58px] font-extrabold text-white tracking-tight leading-[1.08] max-w-4xl mx-auto">
                Every Guarantee, Bank Quote &amp; Statement.{' '}
                <span className="text-blue-400">Under Total Control.</span>
              </h1>

              <p className="mt-6 text-base sm:text-xl text-slate-300 max-w-2xl mx-auto leading-relaxed font-normal">
                Automate LG custody and issuance, make banks compete on FX &amp; T-Bills, and
                reconcile multi-bank statements in minutes —{' '}
                <span className="text-white font-medium">
                  ready from Day 1, even when your banks or internal systems aren’t ready yet.
                </span>
              </p>

              {/* Two Clear Actions + Walkthrough Sub-Link */}
              <div className="mt-9 flex flex-col sm:flex-row items-center justify-center gap-3.5">
                <Link
                  to="/demo"
                  onClick={() =>
                    trackPublicEvent('cta_click', {
                      page: 'landing',
                      path: '/',
                      metadata: { target: 'hero_interactive_demo' },
                    })
                  }
                  className="w-full sm:w-auto inline-flex items-center justify-center px-7 py-3.5 text-sm sm:text-base font-semibold text-white bg-blue-600 rounded-xl hover:bg-blue-500 transition-all shadow-lg shadow-blue-600/30"
                >
                  <Play className="w-4 h-4 mr-2 fill-current" />
                  Try Interactive Demo
                </Link>

                <Link
                  to="/free-trial-register"
                  onClick={() =>
                    trackPublicEvent('cta_click', {
                      page: 'landing',
                      path: '/',
                      metadata: { target: 'hero_free_trial' },
                    })
                  }
                  className="w-full sm:w-auto inline-flex items-center justify-center px-7 py-3.5 text-sm sm:text-base font-semibold text-white bg-white/[0.08] border border-white/20 rounded-xl hover:bg-white/[0.14] transition-all"
                >
                  Start Guided Free Trial
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Link>
              </div>

              <div className="mt-3.5">
                <button
                  type="button"
                  onClick={scrollToMeetingForm}
                  className="text-xs sm:text-sm font-medium text-blue-300 hover:text-white underline-offset-4 hover:underline transition-colors cursor-pointer"
                >
                  Prefer a live 1-on-1 walkthrough with your team? Book 20 minutes →
                </button>
              </div>

              <p className="mt-4 text-xs text-slate-400">
                SWIFT / ISO &amp; paper/Excel ready &nbsp;·&nbsp; Arabic &amp; English AI
                &nbsp;·&nbsp; Zero bank or ERP IT project required
              </p>

              {/* Centered Calm Concept Visual Stage (Zero Clutter, Understood in 2 Seconds) */}
              <div className="mt-14 max-w-4xl mx-auto">
                <div className="flex justify-center mb-5">
                  <div className="inline-flex flex-wrap justify-center gap-1 p-1.5 rounded-xl bg-white/[0.06] border border-white/10">
                    {SHOWCASE_TABS.map((tab) => {
                      const active = tab.id === currentShowcase.id;
                      return (
                        <button
                          key={tab.id}
                          type="button"
                          onClick={() => setActiveTab(tab.id)}
                          className={`px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                            active
                              ? 'bg-blue-600 text-white shadow-sm'
                              : 'text-slate-300 hover:text-white'
                          }`}
                        >
                          {tab.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <ExecutiveModulePreview
                  moduleId={currentShowcase.id}
                  onTourClick={() =>
                    trackPublicEvent('cta_click', {
                      page: 'landing',
                      path: '/',
                      metadata: { target: 'hero_screenshot_tour', module: currentShowcase.id },
                    })
                  }
                />

                {/* Warm, Authoritative Readiness & Compatibility Line */}
                <div className="mt-10 pt-8 border-t border-white/10 text-center">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-blue-400/90 mb-2">
                    Enterprise Standards When You Have Them · Effortless Fallbacks When You Don’t
                  </p>
                  <p className="text-xs sm:text-sm text-slate-300 max-w-2xl mx-auto mb-3 leading-relaxed">
                    Whether your banks send structured SWIFT feeds or stamped paper letters, PDFs,
                    and Excel sheets — and whether you run SAP, Oracle, Odoo, or spreadsheets today
                    — Grow works smoothly with your reality from Day 1.
                  </p>
                  <p className="text-xs sm:text-sm font-semibold text-slate-400 tracking-wide leading-relaxed">
                    CIB &nbsp;·&nbsp; HSBC &nbsp;·&nbsp; NBE &nbsp;·&nbsp; QNB &nbsp;·&nbsp; Banque
                    Misr &nbsp;·&nbsp; FAB &nbsp;·&nbsp; Citibank &nbsp;·&nbsp; Emirates NBD
                    &nbsp;·&nbsp; SAP &nbsp;·&nbsp; Oracle &nbsp;·&nbsp; Dynamics 365 &nbsp;·&nbsp;
                    Odoo
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* ═══════ SECTION 2: 3 NUMBERS + BEFORE VS. AFTER CLARITY ═══════ */}
          <section className="py-24 lg:py-28 bg-white">
            <div className="max-w-5xl mx-auto px-5 sm:px-6">
              <div className="text-center max-w-2xl mx-auto mb-16">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-600 mb-3">
                  Immediate ROI
                </p>
                <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
                  Stop Running Million-Pound Decisions in Spreadsheets.
                </h2>
              </div>

              {/* 3 Clean Numbers */}
              <div className="grid sm:grid-cols-3 gap-8 pb-16 mb-16 border-b border-slate-100 text-center">
                <div>
                  <p className="text-4xl sm:text-5xl font-extrabold text-slate-900 tracking-tight">
                    &lt; 60s
                  </p>
                  <p className="mt-2 text-sm text-slate-500">
                    To scan an LG or auto-fill a bank PDF form
                  </p>
                </div>
                <div>
                  <p className="text-4xl sm:text-5xl font-extrabold text-blue-600 tracking-tight">
                    80%
                  </p>
                  <p className="mt-2 text-sm text-slate-500">
                    Faster monthly multi-bank reconciliation
                  </p>
                </div>
                <div>
                  <p className="text-4xl sm:text-5xl font-extrabold text-slate-900 tracking-tight">
                    Zero
                  </p>
                  <p className="mt-2 text-sm text-slate-500">
                    Missed expiries or unspotted bank fee variances
                  </p>
                </div>
              </div>

              {/* Scannable 4-Row Before -> After Table */}
              <div className="rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                <div className="grid md:grid-cols-2 bg-slate-50 border-b border-slate-200 text-xs font-bold uppercase tracking-wider">
                  <div className="px-6 py-3.5 text-slate-500">Manual Treasury Today</div>
                  <div className="px-6 py-3.5 text-blue-700 border-t md:border-t-0 md:border-l border-slate-200 bg-blue-50/50">
                    With Grow Treasury
                  </div>
                </div>

                {[
                  {
                    before: 'Chasing LG expiries and bank stamps across Excel & email',
                    after: 'AI-scanned LG register, automated alerts & QR-verified bank letters',
                  },
                  {
                    before: 'Guessing which bank credit line preserves cash collateral',
                    after: 'Instant facility scoring by commission, 0% margin & live headroom',
                  },
                  {
                    before: 'Collecting FX & T-Bill quotes over phone with hidden spreads',
                    after: 'Sealed multi-bank FX Spot & T-Bill bidding with All-In net ranking',
                  },
                  {
                    before: 'Days of VLOOKUPs matching sweeps, bank fees & ERP ledgers',
                    after: 'Zero-setup fee rules, sweep pairing & 1-click ERP split-matching',
                  },
                ].map((row, idx) => (
                  <div
                    key={idx}
                    className="grid md:grid-cols-2 border-b last:border-b-0 border-slate-100 text-sm"
                  >
                    <div className="px-6 py-4 flex items-start gap-3 text-slate-500">
                      <X className="w-4 h-4 text-rose-400 mt-0.5 shrink-0" />
                      <span>{row.before}</span>
                    </div>
                    <div className="px-6 py-4 flex items-start gap-3 font-medium text-slate-900 bg-blue-50/20 md:border-l border-slate-100">
                      <Check className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                      <span>{row.after}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* ═══════ SECTION 3: 4 FOCUSED MODULES (CLEAN, BREATHABLE) ═══════ */}
          <section className="py-24 lg:py-28 bg-slate-50 border-t border-slate-200/70">
            <div className="max-w-6xl mx-auto px-5 sm:px-6">
              <div className="text-center max-w-2xl mx-auto mb-16">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-600 mb-3">
                  Modular &amp; Pragmatic by Design
                </p>
                <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
                  Start Where You Are Today. Scale at Your Pace.
                </h2>
                <p className="mt-3 text-base text-slate-600 leading-relaxed">
                  You don’t need to wait on bank APIs, an ERP upgrade, or a company-wide overhaul.
                  Launch one module or the full suite right away.
                </p>
              </div>

              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {MODULES_GRID.map((mod) => {
                  const Icon = mod.icon;
                  return (
                    <div
                      key={mod.id}
                      className="bg-white rounded-2xl p-6 border border-slate-200/80 hover:border-slate-300 hover:shadow-lg transition-all flex flex-col"
                    >
                      <div
                        className={`w-11 h-11 rounded-xl flex items-center justify-center mb-5 ${mod.iconCls}`}
                      >
                        <Icon className="w-5 h-5" />
                      </div>

                      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                        {mod.audience}
                      </p>
                      <h3 className="text-lg font-bold text-slate-900 mt-1">{mod.title}</h3>
                      <p className="text-sm text-slate-600 mt-2.5 leading-relaxed">{mod.desc}</p>

                      <ul className="mt-5 pt-4 border-t border-slate-100 space-y-2 flex-1">
                        {mod.points.map((pt, i) => (
                          <li key={i} className="flex items-center text-xs font-medium text-slate-700">
                            <Check className="w-3.5 h-3.5 text-emerald-500 mr-2 shrink-0" />
                            {pt}
                          </li>
                        ))}
                      </ul>

                      <Link
                        to={mod.storyUrl}
                        className={`mt-6 inline-flex items-center text-xs font-bold ${mod.linkCls}`}
                      >
                        Watch 75s tour <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
                      </Link>
                    </div>
                  );
                })}
              </div>

              {/* Encouraging 3-Pillar "Ready Even When Your Banks or Systems Aren't" Assurance */}
              <div className="mt-12 grid md:grid-cols-3 gap-5 pt-10 border-t border-slate-200/80">
                {[
                  {
                    title: 'Ready Even If Your Banks Work on Paper',
                    desc: 'No bank APIs needed. Grow reads Arabic & English scans, auto-fills bank PDF forms, verifies physical stamps, and invites FX dealers via zero-password links.',
                  },
                  {
                    title: 'Ready Even If Your ERP Isn’t Ready',
                    desc: 'No IT integration project required. Work smoothly alongside SAP, Oracle, Dynamics, Odoo, or Excel today and export balanced, locked GL files.',
                  },
                  {
                    title: 'Ready to Migrate Your History in Hours',
                    desc: 'Already tracking LGs in spreadsheets and scanned PDFs? Our smart Migration Hub validates and imports your existing portfolio cleanly.',
                  },
                ].map((item, idx) => (
                  <div
                    key={idx}
                    className="rounded-2xl bg-white/80 border border-slate-200/70 p-5 text-left"
                  >
                    <div className="flex items-center gap-2 mb-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <h3 className="text-sm font-bold text-slate-900">{item.title}</h3>
                    </div>
                    <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* ═══════ SECTION 4: SECURITY & GOVERNANCE (CALM AUTHORITY) ═══════ */}
          <section id="security" className="py-24 lg:py-28 bg-[#0f172a] text-white scroll-mt-16">
            <div className="max-w-6xl mx-auto px-5 sm:px-6">
              <div className="text-center max-w-2xl mx-auto mb-16">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-400 mb-3">
                  Security &amp; Governance
                </p>
                <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
                  Your Financial Data Stays Strictly Yours.
                </h2>
                <p className="mt-3 text-base text-slate-400">
                  Built for CFOs, Internal Audit, and InfoSec teams from the ground up.
                </p>
              </div>

              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                  {
                    icon: KeyRound,
                    title: 'Private Key Per Company',
                    desc: 'Dedicated AES-256 encryption isolates your rates, statements, and files at rest.',
                  },
                  {
                    icon: Shield,
                    title: 'Zero-PII AI Masking',
                    desc: 'Names, IBANs, and LG numbers are masked with tokens before AI runs.',
                  },
                  {
                    icon: Lock,
                    title: 'Strict Maker-Checker',
                    desc: 'Dual control across entities and subsidiaries; self-approval is blocked.',
                  },
                  {
                    icon: ShieldCheck,
                    title: 'SHA-256 & QR Seals',
                    desc: 'Tamper-evident audit logs and QR-sealed bank letters verified in seconds.',
                  },
                ].map((item, i) => (
                  <div
                    key={i}
                    className="rounded-2xl p-6 bg-white/[0.04] border border-white/10"
                  >
                    <div className="w-10 h-10 rounded-xl bg-blue-500/15 flex items-center justify-center mb-4">
                      <item.icon className="w-5 h-5 text-blue-400" />
                    </div>
                    <h3 className="text-base font-bold text-white">{item.title}</h3>
                    <p className="mt-2 text-sm text-slate-400 leading-relaxed">{item.desc}</p>
                  </div>
                ))}
              </div>

              <div className="mt-10 flex flex-wrap items-center justify-center gap-6 text-xs text-slate-400">
                <span className="inline-flex items-center gap-1.5">
                  <Fingerprint className="w-4 h-4 text-blue-400" /> Biometric Face ID / Touch ID &amp; MFA
                </span>
                <span>·</span>
                <span>Optional Customer-Owned Google Cloud Bucket</span>
              </div>
            </div>
          </section>

          {/* ═══════ TOP 5 EXECUTIVE QUESTIONS (COLLAPSED ACCORDION — ZERO CLUTTER) ═══════ */}
          <section className="py-20 bg-slate-50 border-b border-slate-200/70">
            <div className="max-w-3xl mx-auto px-5 sm:px-6">
              <div className="text-center mb-10">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-600 mb-2">
                  Common Questions
                </p>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                  What CFOs &amp; Treasurers Ask First
                </h2>
              </div>

              <div className="divide-y divide-slate-200 rounded-2xl border border-slate-200 bg-white overflow-hidden">
                {EXECUTIVE_FAQS.map((faq, idx) => {
                  const isOpen = openFaqIdx === idx;
                  return (
                    <div key={idx}>
                      <button
                        type="button"
                        onClick={() => setOpenFaqIdx(isOpen ? null : idx)}
                        className="w-full px-6 py-4 text-left flex items-center justify-between gap-4 hover:bg-slate-50/80 transition-colors cursor-pointer"
                      >
                        <span className="text-sm sm:text-base font-semibold text-slate-900">
                          {faq.q}
                        </span>
                        <ChevronDown
                          className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-200 ${
                            isOpen ? 'rotate-180 text-blue-600' : ''
                          }`}
                        />
                      </button>
                      {isOpen && (
                        <div className="px-6 pb-5 text-sm text-slate-600 leading-relaxed">
                          {faq.a}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="mt-6 text-center">
                <button
                  type="button"
                  onClick={() => setExpertChatOpen(true)}
                  className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-blue-600 hover:text-blue-800 cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Have a specific treasury question? Ask Grow AI instantly →
                </button>
              </div>
            </div>
          </section>

          {/* ═══════ SECTION 5: EFFORTLESS 20-MIN WALKTHROUGH CONVERSION ═══════ */}
          <section ref={meetingFormRef} id="book-meeting" className="py-24 lg:py-28 bg-white scroll-mt-16">
            <div className="max-w-5xl mx-auto px-5 sm:px-6">
              <div className="grid lg:grid-cols-12 gap-12 items-center">
                {/* Left: Short, High-Conviction Pitch */}
                <div className="lg:col-span-5">
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-600 mb-3">
                    Live Walkthrough
                  </p>
                  <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight leading-tight">
                    See Grow Run on Your Bank Formats in 20 Minutes.
                  </h2>
                  <p className="mt-4 text-base text-slate-600 leading-relaxed">
                    No slide decks. A treasury specialist will walk through the exact modules,
                    house banks, and approval rules relevant to your team.
                  </p>

                  <ul className="mt-6 space-y-3 text-sm text-slate-700">
                    {[
                      'Tailored to your banks (CIB, HSBC, NBE, QNB & more)',
                      'Day-1 standalone setup — zero IT project required',
                      'Clear modular pricing for single or multi-entity teams',
                    ].map((pt, i) => (
                      <li key={i} className="flex items-center gap-2.5">
                        <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                        <span>{pt}</span>
                      </li>
                    ))}
                  </ul>

                  <div className="mt-8 pt-6 border-t border-slate-100 flex flex-wrap items-center gap-5 text-sm">
                    <a
                      href="https://wa.me/201200557551?text=Hello%20Grow%20Team%2C%20I%20would%20like%20to%20book%20a%2020-minute%20walkthrough."
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center font-semibold text-emerald-700 hover:text-emerald-800"
                    >
                      <MessageCircle className="w-4 h-4 mr-1.5" />
                      Chat on WhatsApp
                    </a>
                    <Link
                      to="/demo"
                      className="inline-flex items-center font-semibold text-blue-600 hover:text-blue-800"
                    >
                      <Play className="w-3.5 h-3.5 mr-1.5 fill-current" />
                      Try 2-min demo
                    </Link>
                    <Link
                      to="/free-trial-register"
                      className="inline-flex items-center font-semibold text-slate-800 hover:text-blue-700"
                    >
                      Start Guided Free Trial →
                    </Link>
                  </div>
                </div>

                {/* Right: 4-Field Frictionless Card (or Live Calendar Embed) */}
                <div className="lg:col-span-7">
                  {calendarEmbedUrl ? (
                    <div className="rounded-2xl border border-slate-200 overflow-hidden shadow-xl bg-white">
                      <div className="px-5 py-3 bg-slate-900 text-white flex items-center justify-between text-xs font-semibold">
                        <span className="inline-flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-blue-400" />
                          Pick a Time on Our Calendar
                        </span>
                        <a
                          href={calendarEmbedUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-blue-300 hover:text-white"
                        >
                          Open <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                      <iframe
                        src={calendarEmbedUrl}
                        title="Book a Grow Treasury Walkthrough"
                        className="w-full h-[580px] border-0"
                        loading="lazy"
                      />
                    </div>
                  ) : (
                    <div className="bg-slate-50/80 rounded-2xl p-7 sm:p-9 border border-slate-200/90 shadow-xl shadow-slate-900/[0.04]">
                      {submittedInfo ? (
                        <div className="text-center py-6">
                          <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
                            <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                          </div>
                          <h3 className="text-xl font-bold text-slate-900">
                            We’ve Received Your Request
                          </h3>
                          <p className="text-sm text-slate-600 mt-1.5 max-w-sm mx-auto">
                            Thank you, <span className="font-semibold">{submittedInfo.name}</span>.
                            Our team will reach out shortly to confirm your 20-minute walkthrough.
                          </p>
                          <div className="mt-6 flex flex-wrap justify-center gap-3">
                            <a
                              href={`https://wa.me/201200557551?text=${encodeURIComponent(
                                `Hi Grow Team, this is ${submittedInfo.name} from ${submittedInfo.company}. I just requested a 20-min walkthrough (${submittedInfo.topic}).`
                              )}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 transition-colors"
                            >
                              <MessageCircle className="w-4 h-4 mr-2" />
                              Pick Instant Time on WhatsApp
                            </a>
                            <button
                              type="button"
                              onClick={() => setSubmittedInfo(null)}
                              className="px-4 py-2.5 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-200/60 transition-colors cursor-pointer"
                            >
                              Done
                            </button>
                          </div>
                        </div>
                      ) : (
                        <form onSubmit={handleMeetingSubmit} className="space-y-4">
                          <div>
                            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                              What interests you most?
                            </label>
                            <div className="flex flex-wrap gap-1.5">
                              {TOPIC_CHIPS.map((topic) => {
                                const active = selectedTopic === topic;
                                return (
                                  <button
                                    key={topic}
                                    type="button"
                                    onClick={() => setSelectedTopic(topic)}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                                      active
                                        ? 'bg-slate-900 text-white border-slate-900'
                                        : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                                    }`}
                                  >
                                    {topic}
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          <div className="grid sm:grid-cols-2 gap-4 pt-1">
                            <div>
                              <label
                                htmlFor="name"
                                className="block text-xs font-semibold text-slate-600 mb-1.5"
                              >
                                Full Name *
                              </label>
                              <input
                                type="text"
                                id="name"
                                name="name"
                                required
                                value={formData.name}
                                onChange={handleInputChange}
                                className={inputCls}
                                placeholder="Ahmed Hassan"
                              />
                            </div>
                            <div>
                              <label
                                htmlFor="company"
                                className="block text-xs font-semibold text-slate-600 mb-1.5"
                              >
                                Company *
                              </label>
                              <input
                                type="text"
                                id="company"
                                name="company"
                                required
                                value={formData.company}
                                onChange={handleInputChange}
                                className={inputCls}
                                placeholder="Orascom / El Sewedy..."
                              />
                            </div>
                          </div>

                          <div className="grid sm:grid-cols-2 gap-4">
                            <div>
                              <label
                                htmlFor="email"
                                className="block text-xs font-semibold text-slate-600 mb-1.5"
                              >
                                Work Email *
                              </label>
                              <input
                                type="email"
                                id="email"
                                name="email"
                                required
                                value={formData.email}
                                onChange={handleInputChange}
                                className={inputCls}
                                placeholder="name@company.com"
                              />
                            </div>
                            <div>
                              <label
                                htmlFor="phone"
                                className="block text-xs font-semibold text-slate-600 mb-1.5"
                              >
                                Mobile / WhatsApp *
                              </label>
                              <input
                                type="tel"
                                id="phone"
                                name="phone"
                                required
                                value={formData.phone}
                                onChange={handleInputChange}
                                className={inputCls}
                                placeholder="+20 100 000 0000"
                              />
                            </div>
                          </div>

                          {formError && (
                            <div className="text-sm text-red-600 bg-red-50 p-3 rounded-xl border border-red-100">
                              {formError}
                            </div>
                          )}

                          <button
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full flex items-center justify-center py-3.5 px-6 text-sm font-semibold text-white bg-blue-600 rounded-xl hover:bg-blue-700 disabled:opacity-60 transition-colors shadow-md shadow-blue-600/20 cursor-pointer"
                          >
                            {isSubmitting ? 'Sending...' : 'Book My 20-Min Walkthrough'}
                            <ArrowRight className="ml-2 w-4 h-4" />
                          </button>

                          <HoneypotField
                            name="website_url"
                            value={formData.website_url}
                            onChange={handleInputChange}
                          />
                        </form>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>

          {/* ═══════ CLEAN EXECUTIVE FOOTER ═══════ */}
          <footer className="bg-[#0b1120] text-slate-400 py-14 border-t border-slate-800/80">
            <div className="max-w-6xl mx-auto px-5 sm:px-6 grid grid-cols-1 md:grid-cols-4 gap-10">
              <div className="md:col-span-1">
                <Link
                  to="/"
                  onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                  className="inline-flex items-center mb-4 hover:opacity-95"
                >
                  <GrowLogo size="md" />
                </Link>
                <p className="text-sm leading-relaxed">
                  Corporate treasury automation across LG Custody, LG Issuance, FX &amp; T-Bill
                  Bidding, and Bank Reconciliation.
                </p>
              </div>

              <div>
                <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-4">
                  Platform
                </h4>
                <ul className="space-y-2.5 text-sm">
                  <li>
                    <Link to="/demo" className="hover:text-white transition-colors">
                      Interactive Demo
                    </Link>
                  </li>
                  <li>
                    <Link to="/know-more" className="hover:text-white transition-colors">
                      How It Works
                    </Link>
                  </li>
                  <li>
                    <button
                      type="button"
                      onClick={handleDownloadBrochure}
                      className="hover:text-white transition-colors cursor-pointer"
                    >
                      Download Brochure (PDF)
                    </button>
                  </li>
                  <li>
                    <Link to="/free-trial-register" className="hover:text-white transition-colors">
                      Free Trial Registration
                    </Link>
                  </li>
                </ul>
              </div>

              <div>
                <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-4">
                  Portals &amp; Access
                </h4>
                <ul className="space-y-2.5 text-sm">
                  <li>
                    <Link to="/login" className="hover:text-white transition-colors">
                      Customer Sign In
                    </Link>
                  </li>
                  <li>
                    <Link to="/portal/issuance" className="hover:text-white transition-colors">
                      Department Issuance Portal
                    </Link>
                  </li>
                  <li>
                    <Link to="/dealer/login" className="hover:text-white transition-colors">
                      Bank FX Dealer Desk
                    </Link>
                  </li>
                  <li>
                    <Link to="/verify-instruction" className="hover:text-white transition-colors">
                      Verify LG Bank Letter
                    </Link>
                  </li>
                </ul>
              </div>

              <div>
                <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-4">
                  Contact
                </h4>
                <ul className="space-y-2.5 text-sm">
                  <li>
                    <a href="tel:+201200557551" className="hover:text-white transition-colors">
                      +20 120 055 7551
                    </a>
                  </li>
                  <li>
                    <a
                      href="https://wa.me/201200557551"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-white transition-colors"
                    >
                      WhatsApp Desk
                    </a>
                  </li>
                  <li>
                    <a
                      href="mailto:info@growbusinessdevelopment.com"
                      className="hover:text-white transition-colors"
                    >
                      info@growbusinessdevelopment.com
                    </a>
                  </li>
                  <li className="text-slate-500">100 El Merghany St., Heliopolis, Cairo</li>
                </ul>
              </div>
            </div>

            <div className="max-w-6xl mx-auto px-5 sm:px-6 mt-10 pt-8 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
              <p>&copy; {new Date().getFullYear()} Grow Business Development. All rights reserved.</p>
              <div className="flex items-center gap-5">
                <Link to="/portal/issuance" className="hover:text-slate-300 transition-colors">
                  Issuance Portal
                </Link>
                <Link to="/login" className="hover:text-slate-300 transition-colors">
                  Customer Sign In →
                </Link>
              </div>
            </div>
          </footer>
        </div>

        <PublicProductExpertChat
          pageContext="landing"
          isOpen={expertChatOpen}
          onOpenChange={setExpertChatOpen}
          onBookMeeting={scrollToMeetingForm}
          stickyClassName="lg:top-[72px] lg:h-[calc(100vh-72px)]"
        />
      </div>
    </div>
  );
}

export default LandingPage;
