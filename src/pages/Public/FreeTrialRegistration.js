// frontend/src/pages/Public/FreeTrialRegistration.js
import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { publicApiRequest } from '../../services/apiService';
import { toast } from 'react-toastify';
import { Helmet } from 'react-helmet-async';
import {
  Loader2,
  Shield,
  Send,
  TrendingUp,
  FileSpreadsheet,
  Building2,
  Layers,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Upload,
  Play,
  Users,
  Lock,
  Sparkles,
  MessageCircle,
  X,
} from 'lucide-react';
import HoneypotField from '../../components/Security/HoneypotField';
import GrowLogo from '../../components/Common/GrowLogo';
import { trackPublicEvent } from '../../utils/publicTelemetry';

const PERSONAL_EMAIL_DOMAINS = new Set([
  'gmail.com', 'googlemail.com', 'yahoo.com', 'yahoo.co.uk', 'ymail.com',
  'hotmail.com', 'outlook.com', 'live.com', 'msn.com', 'icloud.com', 'me.com',
  'aol.com', 'protonmail.com', 'proton.me', 'yandex.com', 'mail.com', 'gmx.com',
  'mailinator.com', 'tempmail.com', 'guerrillamail.com', 'yopmail.com',
]);

const SANDBOX_HIGHLIGHTS = [
  {
    icon: Sparkles,
    title: 'AI Prepares — Your Team Reviews & Approves',
    description:
      'AI reads PDFs, flags risky LG text, and proposes bank matches fast — while your team stays in full control of every approval.',
  },
  {
    icon: Building2,
    title: 'Ready Sample Data (Or Test Your Own Files)',
    description:
      'Comes ready with sample LGs, 3 bank credit lines (0% vs 10% cash margin), and test CSVs so you never start with an empty screen.',
  },
  {
    icon: Users,
    title: 'Easy Start View + Colleague Access',
    description:
      'Starts focused on your #1 priority with a simple 5-page menu, and lets you invite colleagues or your manager from your company domain.',
  },
  {
    icon: Lock,
    title: 'Private, Encrypted & Safe to Test',
    description:
      'Encrypted for your company only, never shared or used to train public AI, watermarked TRIAL, and 1-click file deletion anytime.',
  },
];

const ALL_MODULE_KEYS = ['custody', 'issuance', 'reconciliation', 'quotations'];

const PRIORITY_OPTIONS = [
  {
    key: 'custody',
    icon: Shield,
    title: 'LG Custody (Received LGs)',
    desc: 'Read LG PDFs with AI for review, track expiry reminders & prepare renewal letters.',
  },
  {
    key: 'issuance',
    icon: Send,
    title: 'LG Issuance (New LGs)',
    desc: 'Compare bank credit lines, highlight risky client wording & fill bank PDF forms.',
  },
  {
    key: 'reconciliation',
    icon: FileSpreadsheet,
    title: 'Bank Reconciliation',
    desc: 'Verify balances, match InstaPay & SWIFT fees, and let Grow learn your counterparties & GL rules every month.',
  },
  {
    key: 'quotations',
    icon: TrendingUp,
    title: 'FX & T-Bill Bank Quotes',
    desc: 'Request closed-timer rates from multiple banks benchmarked against live interbank market & CBE reference rates.',
  },
];

function normalizePriorityKey(raw) {
  const clean = (raw || '').trim().toLowerCase();
  if (clean === 'quotation' || clean === 'quotations') return 'quotations';
  if (clean === 'issuance' || clean === 'reconciliation' || clean === 'custody') return clean;
  return 'custody';
}

function FreeTrialRegistration() {
  const [searchParams] = useSearchParams();
  const preselectedModule = searchParams.get('module');

  const [formData, setFormData] = useState({
    organization_name: '',
    organization_address: 'Cairo, Egypt',
    contact_admin_name: '',
    contact_phone: '',
    admin_email: '',
    entities_count: 'Multiple',
    primary_module: normalizePriorityKey(preselectedModule),
    commercial_register_document: null,
    accepted_terms: false,
    website_url: '',
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [termsContent, setTermsContent] = useState('');
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [submittedState, setSubmittedState] = useState(null);

  useEffect(() => {
    trackPublicEvent('page_view', {
      page: 'free_trial',
      path: '/free-trial-register',
      metadata: { module: preselectedModule || 'custody' },
    });
    const fetchTerms = async () => {
      try {
        const response = await publicApiRequest('/public/legal-content/terms_and_conditions', 'GET');
        setTermsContent(response.content);
      } catch (err) {
        console.error('Failed to fetch Terms and Conditions:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchTerms();
  }, [preselectedModule]);

  const handleChange = (e) => {
    const { name, value, type, files, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'file' ? files[0] : type === 'checkbox' ? checked : value,
    }));
    if (error) setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    setError('');

    if (!formData.accepted_terms) {
      const msg = 'Please accept the Terms of Service to continue.';
      setError(msg);
      toast.error(msg);
      setIsSaving(false);
      return;
    }

    const emailClean = (formData.admin_email || '').trim().toLowerCase();
    const emailDomain = emailClean.includes('@') ? emailClean.split('@').pop() : '';
    if (!emailDomain || !emailDomain.includes('.') || PERSONAL_EMAIL_DOMAINS.has(emailDomain)) {
      const msg =
        'Please use your company work email address (e.g. name@yourcompany.com) rather than a personal email.';
      setError(msg);
      toast.error(msg);
      setIsSaving(false);
      return;
    }

    const safeAddress = (formData.organization_address || '').trim() || 'Cairo, Egypt';
    const primaryKey = normalizePriorityKey(formData.primary_module);
    const orderedModules = [primaryKey, ...ALL_MODULE_KEYS.filter((m) => m !== primaryKey)];

    const data = new FormData();
    data.append('organization_name', formData.organization_name.trim());
    data.append('organization_address', safeAddress);
    data.append('contact_admin_name', formData.contact_admin_name.trim());
    data.append('contact_phone', formData.contact_phone.trim());
    data.append('admin_email', emailClean);
    data.append('entities_count', formData.entities_count);
    data.append('requested_modules', orderedModules.join(','));

    if (formData.commercial_register_document) {
      data.append('commercial_register_document', formData.commercial_register_document);
    }
    data.append('accepted_terms', String(formData.accepted_terms));

    const trap = formData.website_url ? formData.website_url.trim().toLowerCase() : '';
    const isAutofillCollision =
      trap &&
      ((formData.admin_email && trap === formData.admin_email.trim().toLowerCase()) ||
        (formData.contact_admin_name && trap === formData.contact_admin_name.trim().toLowerCase()) ||
        (formData.organization_name && trap === formData.organization_name.trim().toLowerCase()) ||
        (safeAddress && trap === safeAddress.toLowerCase()) ||
        (formData.contact_phone && trap === formData.contact_phone.trim().toLowerCase()));
    data.append('website_url', isAutofillCollision ? '' : formData.website_url || '');

    const primaryTitle =
      PRIORITY_OPTIONS.find((o) => o.key === primaryKey)?.title || 'LG Custody';

    try {
      await publicApiRequest('/public/register-free-trial/', 'POST', data);
      trackPublicEvent('cta_click', {
        page: 'free_trial',
        path: '/free-trial-register',
        metadata: {
          target: 'free_trial_submit',
          primary_module: primaryKey,
          modules: orderedModules.join(','),
        },
      });
      toast.success('Free Trial request received!');
      setSubmittedState({
        name: formData.contact_admin_name.trim(),
        company: formData.organization_name.trim(),
        email: emailClean,
        primaryTitle,
      });
    } catch (err) {
      console.error('Registration failed:', err);
      const errorMessage = err.message || 'An unexpected error occurred during submission.';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0f172a]">
        <Loader2 className="h-9 w-9 text-blue-400 animate-spin" />
      </div>
    );
  }

  const inputCls =
    'w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all bg-slate-50/50 focus:bg-white';
  const labelCls = 'block text-[11.5px] font-semibold text-slate-700 mb-1';

  return (
    <div
      className="min-h-screen flex flex-col antialiased text-white"
      style={{
        fontFamily: "'Inter', 'Segoe UI', sans-serif",
        background:
          'radial-gradient(ellipse 85% 55% at 50% -10%, rgba(37, 99, 235, 0.28), transparent), #0f172a',
      }}
    >
      <Helmet>
        <title>Start 14-Day Free Trial — Grow Treasury Platform</title>
        <meta
          name="description"
          content="Start your 14-day Grow Treasury Free Trial focused on your #1 priority. Test LG Custody, LG Issuance, Bank Reconciliation, and FX & T-Bill Quotes with sample data or your own encrypted files."
        />
      </Helmet>

      {/* CLEAN SINGLE-LINE TOPBAR */}
      <header
        className="sticky top-0 z-40 border-b border-white/10 backdrop-blur-md"
        style={{ backgroundColor: 'rgba(15, 23, 42, 0.92)' }}
      >
        <div className="max-w-7xl mx-auto px-5 sm:px-8 h-16 flex items-center justify-between gap-6">
          <Link to="/" className="flex items-center hover:opacity-95 transition-opacity shrink-0">
            <GrowLogo size="md" />
          </Link>

          <nav className="flex items-center gap-4 sm:gap-6 whitespace-nowrap shrink-0">
            <Link
              to="/demo"
              className="inline-flex items-center text-xs sm:text-sm font-medium text-slate-300 hover:text-white transition-colors"
            >
              <Play className="w-3.5 h-3.5 mr-1.5 text-blue-400 fill-current" />
              Interactive Preview
            </Link>
            <Link
              to="/know-more"
              className="text-sm font-medium text-slate-300 hover:text-white transition-colors hidden md:inline"
            >
              How It Works
            </Link>
            <Link
              to="/portal/issuance"
              className="text-sm font-medium text-slate-300 hover:text-white transition-colors hidden lg:inline"
            >
              Issuance Portal
            </Link>
            <span className="hidden sm:inline-block h-4 w-px bg-white/15" aria-hidden="true" />
            <Link
              to="/login"
              className="px-4 py-1.5 rounded-lg text-xs sm:text-sm font-semibold text-white bg-white/[0.07] border border-white/15 hover:bg-white/[0.14] transition-colors"
            >
              Sign In
            </Link>
          </nav>
        </div>
      </header>

      {/* UNIFIED FULL-WIDTH CANVAS */}
      <main className="flex-1 flex items-center py-6 sm:py-8 lg:py-6">
        <div className="max-w-7xl w-full mx-auto px-5 sm:px-8 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center">
          {/* LEFT 5 COLUMNS: Calm, Credible Value Pitch */}
          <div className="lg:col-span-5 space-y-5">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-emerald-500/15 text-emerald-300 border border-emerald-400/30 mb-3.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                14-Day Free Trial · Timer Starts on 1st Login
              </div>

              <h1 className="text-3xl sm:text-4xl xl:text-[40px] font-extrabold text-white tracking-tight leading-[1.12]">
                Start With Your #1 Need —{' '}
                <span className="text-blue-400">Sample Data or Your Files.</span>
              </h1>

              <p className="mt-2.5 text-sm text-slate-300 leading-relaxed">
                Pick the one workflow that matters most to your team right now. We tailor your first
                screen around it with ready sample data — while keeping the other modules unlocked.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-2.5">
              {SANDBOX_HIGHLIGHTS.map((item, idx) => {
                const Icon = item.icon;
                return (
                  <div
                    key={idx}
                    className="flex items-start gap-3 p-3 rounded-2xl bg-white/[0.04] border border-white/[0.08]"
                  >
                    <div className="w-8 h-8 rounded-xl bg-blue-500/15 border border-blue-400/25 flex items-center justify-center shrink-0 mt-0.5">
                      <Icon className="w-4 h-4 text-blue-400" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-xs sm:text-[13px] font-bold text-white leading-snug">
                        {item.title}
                      </h3>
                      <p className="text-[11.5px] text-slate-400 mt-0.5 leading-snug">
                        {item.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="pt-2 grid grid-cols-3 gap-2 text-xs">
              <div className="px-3 py-2 rounded-xl bg-white/[0.03] border border-white/[0.07]">
                <div className="font-bold text-blue-400">1. Pick #1 Need</div>
                <div className="text-[11px] text-slate-400">60-sec work email</div>
              </div>
              <div className="px-3 py-2 rounded-xl bg-white/[0.03] border border-white/[0.07]">
                <div className="font-bold text-blue-400">2. Activate</div>
                <div className="text-[11px] text-slate-400">14d starts on login</div>
              </div>
              <div className="px-3 py-2 rounded-xl bg-white/[0.03] border border-white/[0.07]">
                <div className="font-bold text-emerald-400">3. Prove Value</div>
                <div className="text-[11px] text-slate-400">1-page CFO summary</div>
              </div>
            </div>
          </div>

          {/* RIGHT 7 COLUMNS: Registration Card */}
          <div className="lg:col-span-7">
            {submittedState ? (
              <div className="bg-white text-slate-900 rounded-3xl border border-white/20 shadow-2xl p-8 sm:p-10 text-center">
                <div className="w-14 h-14 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 className="w-7 h-7 text-emerald-600" />
                </div>
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 mb-3">
                  Free Trial Request Received
                </span>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                  Thank you, {submittedState.name}.
                </h2>
                <p className="mt-2.5 text-sm sm:text-base text-slate-600 leading-relaxed max-w-lg mx-auto">
                  We&apos;re preparing your private trial account for{' '}
                  <strong className="text-slate-900">{submittedState.company}</strong> starting with{' '}
                  <strong className="text-blue-700">{submittedState.primaryTitle}</strong>, and will
                  send your activation link to{' '}
                  <strong className="text-slate-900">{submittedState.email}</strong>. Your 14-day
                  timer starts only when you first sign in.
                </p>

                <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
                  <a
                    href={`https://wa.me/201200557551?text=${encodeURIComponent(
                      `Hello Grow Team, this is ${submittedState.name} from ${submittedState.company} (${submittedState.email}). I just requested a Free Trial (#1 Priority: ${submittedState.primaryTitle}) and would love quick activation.`
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition-colors shadow-sm"
                  >
                    <MessageCircle className="w-4 h-4" />
                    Fast-Track Activation on WhatsApp
                  </a>
                  <Link
                    to="/demo"
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-bold text-slate-800 bg-white border border-slate-300 hover:bg-slate-50 transition-colors"
                  >
                    <Play className="w-4 h-4 text-blue-600 fill-current" />
                    Explore Interactive Preview Now
                  </Link>
                </div>
              </div>
            ) : (
              <div className="bg-white text-slate-900 rounded-3xl border border-white/20 shadow-2xl p-6 sm:p-7 lg:p-8">
                <div className="flex flex-wrap items-baseline justify-between gap-2 mb-4">
                  <div>
                    <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
                      Start Your 14-Day Free Trial
                    </h2>
                    <p className="text-xs sm:text-[13px] text-slate-500 mt-0.5">
                      Work email only · No credit card needed · Your 14 days start on first login.
                    </p>
                  </div>
                </div>

                {error && (
                  <div
                    className="flex items-start gap-2 p-3 mb-4 text-xs text-rose-800 rounded-xl bg-rose-50 border border-rose-200"
                    role="alert"
                  >
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    <span>{error}</span>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-3.5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <label htmlFor="contact_admin_name" className={labelCls}>
                        Full Name <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="contact_admin_name"
                        id="contact_admin_name"
                        value={formData.contact_admin_name}
                        onChange={handleChange}
                        required
                        className={inputCls}
                        placeholder="Ahmed Mansour"
                      />
                    </div>

                    <div>
                      <label htmlFor="admin_email" className={labelCls}>
                        Company Work Email <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="email"
                        name="admin_email"
                        id="admin_email"
                        value={formData.admin_email}
                        onChange={handleChange}
                        required
                        className={inputCls}
                        placeholder="a.mansour@yourcompany.com"
                      />
                    </div>

                    <div>
                      <label htmlFor="organization_name" className={labelCls}>
                        Company / Group Name <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="organization_name"
                        id="organization_name"
                        value={formData.organization_name}
                        onChange={handleChange}
                        required
                        className={inputCls}
                        placeholder="Nile Industrial Group S.A.E."
                      />
                    </div>

                    <div>
                      <label htmlFor="contact_phone" className={labelCls}>
                        Mobile / WhatsApp <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="tel"
                        name="contact_phone"
                        id="contact_phone"
                        value={formData.contact_phone}
                        onChange={handleChange}
                        required
                        className={inputCls}
                        placeholder="+20 100 123 4567"
                      />
                    </div>
                  </div>

                  {/* Structure + Optional CR */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 py-2 px-3 rounded-xl bg-slate-50 border border-slate-200/80">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className="text-[11.5px] font-semibold text-slate-600">Structure:</span>
                      <div className="inline-flex rounded-lg bg-slate-200/70 p-0.5">
                        {[
                          { val: 'One', icon: Building2, label: 'Single Company' },
                          { val: 'Multiple', icon: Layers, label: 'Holding / Group' },
                        ].map((opt) => {
                          const selected = formData.entities_count === opt.val;
                          const OIcon = opt.icon;
                          return (
                            <button
                              key={opt.val}
                              type="button"
                              onClick={() =>
                                setFormData((p) => ({ ...p, entities_count: opt.val }))
                              }
                              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                                selected
                                  ? 'bg-white text-blue-700 shadow-xs'
                                  : 'text-slate-600 hover:text-slate-900'
                              }`}
                            >
                              <OIcon className="w-3.5 h-3.5" />
                              <span>{opt.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <label
                      htmlFor="commercial_register_document"
                      className="inline-flex items-center gap-1.5 text-[11.5px] font-medium text-slate-500 hover:text-blue-600 cursor-pointer transition-colors"
                      title="Optional — only required later when moving to live production"
                    >
                      <Upload className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate max-w-[210px]">
                        {formData.commercial_register_document
                          ? formData.commercial_register_document.name
                          : 'Attach CR (Optional for go-live)'}
                      </span>
                      <input
                        type="file"
                        name="commercial_register_document"
                        id="commercial_register_document"
                        onChange={handleChange}
                        accept=".pdf, .jpg, .jpeg, .png"
                        className="sr-only"
                      />
                    </label>
                  </div>

                  {/* Single-Select #1 Priority Picker (Unlocks All 4 in Background) */}
                  <div>
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                      <span className="text-[11.5px] font-bold text-slate-800">
                        What is your #1 priority right now? <span className="text-rose-500">*</span>
                      </span>
                      <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                        We start here · Other 3 modules included free
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {PRIORITY_OPTIONS.map((mod) => {
                        const selected = formData.primary_module === mod.key;
                        const MIcon = mod.icon;
                        return (
                          <button
                            key={mod.key}
                            type="button"
                            onClick={() =>
                              setFormData((prev) => ({ ...prev, primary_module: mod.key }))
                            }
                            className={`flex items-start gap-2.5 p-2.5 border rounded-xl text-left cursor-pointer transition-all ${
                              selected
                                ? 'border-blue-600 bg-blue-50/60 ring-2 ring-blue-600/15'
                                : 'border-slate-200 hover:border-slate-300 bg-white'
                            }`}
                          >
                            <div
                              className={`w-4 h-4 rounded-full border flex items-center justify-center mt-0.5 shrink-0 ${
                                selected
                                  ? 'border-blue-600 bg-blue-600'
                                  : 'border-slate-300 bg-white'
                              }`}
                            >
                              {selected && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center justify-between gap-1.5">
                                <div className="flex items-center gap-1.5 min-w-0">
                                  <MIcon
                                    className={`w-3.5 h-3.5 shrink-0 ${
                                      selected ? 'text-blue-600' : 'text-slate-400'
                                    }`}
                                  />
                                  <span className="text-xs font-bold text-slate-900 truncate">
                                    {mod.title}
                                  </span>
                                </div>
                                {selected && (
                                  <span className="text-[10px] font-extrabold text-blue-700 bg-blue-100 px-1.5 py-0.5 rounded shrink-0">
                                    #1 Focus
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-slate-500 mt-0.5 leading-tight">
                                {mod.desc}
                              </p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Plain-English Data Privacy Promise */}
                  <div className="flex items-start gap-2 px-3 py-2 rounded-xl bg-emerald-50/70 border border-emerald-200/80 text-[11px] text-slate-700">
                    <Lock className="w-3.5 h-3.5 text-emerald-700 shrink-0 mt-0.5" />
                    <span>
                      <strong className="text-emerald-950">Data Privacy Guarantee:</strong> Any test
                      files you upload are encrypted for your company only, never shared or used to
                      train public AI, and can be deleted in 1 click anytime.
                    </span>
                  </div>

                  {/* Terms + Primary Action CTA */}
                  <div className="pt-2.5 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <label
                        htmlFor="accepted_terms"
                        className="flex items-center gap-2 cursor-pointer select-none"
                      >
                        <input
                          id="accepted_terms"
                          name="accepted_terms"
                          type="checkbox"
                          checked={formData.accepted_terms}
                          onChange={handleChange}
                          required
                          className="h-4 w-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                        />
                        <span className="text-xs text-slate-600">
                          I agree to the{' '}
                          {termsContent ? (
                            <button
                              type="button"
                              onClick={() => setShowTermsModal(true)}
                              className="font-semibold text-blue-600 hover:underline cursor-pointer"
                            >
                              Terms of Service
                            </button>
                          ) : (
                            <span className="font-semibold text-slate-800">Terms of Service</span>
                          )}{' '}
                          <span className="text-rose-500">*</span>
                        </span>
                      </label>
                      <p className="text-[11px] text-slate-400 pl-6">
                        Already have credentials?{' '}
                        <Link to="/login" className="font-semibold text-blue-600 hover:underline">
                          Sign In →
                        </Link>
                      </p>
                    </div>

                    <button
                      type="submit"
                      disabled={isSaving}
                      className="inline-flex items-center justify-center px-6 py-3 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-lg shadow-blue-600/25 transition-all disabled:opacity-60 whitespace-nowrap cursor-pointer shrink-0"
                    >
                      {isSaving ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Submitting…
                        </>
                      ) : (
                        <>
                          Start Free Trial
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </>
                      )}
                    </button>
                  </div>

                  <HoneypotField
                    name="website_url"
                    value={formData.website_url}
                    onChange={handleChange}
                  />
                </form>
              </div>
            )}
          </div>
        </div>
      </main>

      {showTermsModal && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setShowTermsModal(false)}
        >
          <div
            className="bg-white text-slate-900 rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 max-h-[80vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Terms of Service</h3>
              <button
                type="button"
                onClick={() => setShowTermsModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="py-4 overflow-y-auto flex-1">
              <div
                className="prose max-w-none text-xs text-slate-600"
                dangerouslySetInnerHTML={{ __html: termsContent }}
              />
            </div>
            <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setFormData((p) => ({ ...p, accepted_terms: true }));
                  setShowTermsModal(false);
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 cursor-pointer"
              >
                Accept &amp; Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default FreeTrialRegistration;
