// src/components/Trial/TrialGuidedHome.jsx
import React, { useState } from 'react';
import {
  CheckCircle2,
  ArrowRight,
  Download,
  Sparkles,
  BarChart3,
  ShieldCheck,
  Building2,
  Layers,
  Info,
  Star,
  FileText,
  UserPlus,
  Lock,
  Trash2,
  MessageSquarePlus,
  ThumbsUp,
  HelpCircle,
  Lightbulb,
  X,
  Loader2,
} from 'lucide-react';
import { TRIAL_SCENARIOS, SAMPLE_KIT } from './trialSalesCatalog';

const ACCENT_STYLES = {
  blue: {
    badge: 'bg-blue-50 text-blue-700 border-blue-200',
    num: 'bg-blue-600 text-white',
    btn: 'bg-blue-600 hover:bg-blue-700 text-white',
    ring: 'hover:border-blue-300',
    heroBorder: 'border-blue-400/80 ring-2 ring-blue-500/10',
  },
  indigo: {
    badge: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    num: 'bg-indigo-600 text-white',
    btn: 'bg-indigo-600 hover:bg-indigo-700 text-white',
    ring: 'hover:border-indigo-300',
    heroBorder: 'border-indigo-400/80 ring-2 ring-indigo-500/10',
  },
  emerald: {
    badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    num: 'bg-emerald-600 text-white',
    btn: 'bg-emerald-600 hover:bg-emerald-700 text-white',
    ring: 'hover:border-emerald-300',
    heroBorder: 'border-emerald-400/80 ring-2 ring-emerald-500/10',
  },
  amber: {
    badge: 'bg-amber-50 text-amber-800 border-amber-200',
    num: 'bg-slate-900 text-amber-300',
    btn: 'bg-slate-900 hover:bg-slate-800 text-white',
    ring: 'hover:border-amber-300',
    heroBorder: 'border-amber-400/80 ring-2 ring-amber-500/10',
  },
};

const FEEDBACK_CHOICES = [
  {
    id: 'easy',
    label: 'Easy & Clear',
    sentiment: 'POSITIVE',
    feedbackType: 'GENERAL_FEEDBACK',
    icon: ThumbsUp,
    activeCls: 'border-emerald-600 bg-emerald-50 text-emerald-900',
  },
  {
    id: 'confusing',
    label: 'Something Was Confusing',
    sentiment: 'NEGATIVE',
    feedbackType: 'USABILITY_PAIN_POINT',
    icon: HelpCircle,
    activeCls: 'border-amber-500 bg-amber-50 text-amber-950',
  },
  {
    id: 'idea',
    label: 'Feature Question / Idea',
    sentiment: 'NEUTRAL',
    feedbackType: 'FEATURE_REQUEST',
    icon: Lightbulb,
    activeCls: 'border-blue-600 bg-blue-50 text-blue-900',
  },
];

export default function TrialGuidedHome({
  sandboxStatus,
  activeRole = 'end_user',
  moduleFlags = {},
  isSwitchingRole = false,
  downloadingSampleId = null,
  isDownloadingSummary = false,
  isPurgingData = false,
  isInvitingColleague = false,
  isSubmittingFeedback = false,
  onNavigateTarget,
  onDownloadSample,
  onDownloadValueSummary,
  onPurgeUploadedData,
  onInviteColleague,
  onSubmitFeedback,
  onOpenAiAssistant,
  onUnlockFullMenu,
}) {
  const stepsCompleted = sandboxStatus?.steps_completed || {};
  const usage = sandboxStatus?.usage || {};
  const caps = sandboxStatus?.caps || {};
  const companyName = sandboxStatus?.customer_name || 'Your Company';
  const customerId = sandboxStatus?.customer_id || 'trial';
  const daysLeft = sandboxStatus?.days_remaining;
  const primaryModuleKey = sandboxStatus?.primary_module || 'custody';
  const companyDomain = sandboxStatus?.company_email_domain || '';
  const invitedColleagues = sandboxStatus?.invited_colleagues || [];

  const pulseStorageKey = `grow_trial_first_pulse_v1_${customerId}`;
  const [pulseDismissed, setPulseDismissed] = useState(() => {
    try {
      return localStorage.getItem(pulseStorageKey) === 'done';
    } catch {
      return false;
    }
  });

  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [inviteForm, setInviteForm] = useState({ name: '', email: '', role: 'end_user' });
  const [inviteError, setInviteError] = useState('');

  const [purgeConfirmOpen, setPurgeConfirmOpen] = useState(false);

  const [feedbackModalOpen, setFeedbackModalOpen] = useState(false);
  const [selectedReactionId, setSelectedReactionId] = useState('easy');
  const [feedbackNote, setFeedbackNote] = useState('');

  const dismissPulsePermanently = () => {
    setPulseDismissed(true);
    try {
      localStorage.setItem(pulseStorageKey, 'done');
    } catch {}
  };

  const openFeedbackWithReaction = (reactionId) => {
    setSelectedReactionId(reactionId);
    setFeedbackNote('');
    setFeedbackModalOpen(true);
  };

  const handleQuickPositivePulse = async () => {
    dismissPulsePermanently();
    if (onSubmitFeedback) {
      await onSubmitFeedback({
        sentiment: 'POSITIVE',
        feedbackType: 'GENERAL_FEEDBACK',
        message: 'First trial test micro-pulse: Very Easy & Clear.',
      });
    }
  };

  const handleFeedbackSubmit = async (e) => {
    e.preventDefault();
    if (!onSubmitFeedback) return;
    const choice =
      FEEDBACK_CHOICES.find((c) => c.id === selectedReactionId) || FEEDBACK_CHOICES[0];
    const ok = await onSubmitFeedback({
      sentiment: choice.sentiment,
      feedbackType: choice.feedbackType,
      message: feedbackNote,
    });
    if (ok) {
      dismissPulsePermanently();
      setFeedbackModalOpen(false);
      setFeedbackNote('');
    }
  };

  const handleInviteSubmit = async (e) => {
    e.preventDefault();
    setInviteError('');
    if (!onInviteColleague) return;
    const res = await onInviteColleague(inviteForm);
    if (res?.ok) {
      setInviteForm({ name: '', email: '', role: 'end_user' });
      setInviteModalOpen(false);
    } else if (res?.error) {
      setInviteError(res.error);
    }
  };

  const handleConfirmPurge = async () => {
    if (!onPurgeUploadedData) return;
    const ok = await onPurgeUploadedData();
    if (ok) {
      setPurgeConfirmOpen(false);
    }
  };

  const visibleScenarios = TRIAL_SCENARIOS.filter((s) => {
    if (!s.moduleProp) return true;
    return moduleFlags[s.moduleProp] !== false;
  });

  const completedCount = visibleScenarios.filter((s) =>
    Boolean(stepsCompleted[s.completedKey])
  ).length;

  const primaryScenario =
    visibleScenarios.find((s) => s.id === primaryModuleKey) || visibleScenarios[0] || null;
  const secondaryScenarios = visibleScenarios.filter((s) => s.id !== primaryScenario?.id);

  const quickFiles = [
    SAMPLE_KIT.custodyLgPdf,
    SAMPLE_KIT.riskyWordingPdf,
    SAMPLE_KIT.bankStatementACsv,
    SAMPLE_KIT.sapOpenInvoicesCsv,
  ];

  const renderScenarioActions = (sc, style) => {
    const primaryPath = sc.primaryAction.getPath
      ? sc.primaryAction.getPath(activeRole)
      : sc.primaryAction.path;
    const secondaryPath = sc.secondaryAction
      ? sc.secondaryAction.getPath
        ? sc.secondaryAction.getPath(activeRole)
        : sc.secondaryAction.path
      : null;

    return (
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={isSwitchingRole}
          onClick={() => onNavigateTarget(primaryPath, sc.primaryAction.requiredRole || null)}
          className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-2xs disabled:opacity-60 ${style.btn}`}
        >
          <span>{sc.primaryAction.label}</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>

        {sc.secondaryAction && secondaryPath && (
          <button
            type="button"
            disabled={isSwitchingRole}
            onClick={() =>
              onNavigateTarget(secondaryPath, sc.secondaryAction.requiredRole || null)
            }
            className="inline-flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-bold text-slate-700 hover:text-slate-950 bg-slate-100 hover:bg-slate-200/80 transition-colors cursor-pointer disabled:opacity-60"
          >
            <span>{sc.secondaryAction.label}</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="max-w-6xl mx-auto space-y-4">
      {/* 1. CLEAR, UPFRONT NOTICE IN SIMPLE WORDS */}
      <div className="rounded-2xl bg-blue-50 border border-blue-200 px-4 sm:px-5 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-start sm:items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0">
            <Info className="w-4 h-4" />
          </div>
          <p className="text-xs sm:text-sm text-slate-800 leading-relaxed">
            <strong className="text-blue-950">Easy Trial View is ON:</strong> We show a{' '}
            <strong>simple 5-page menu</strong> on the left so anyone can test easily without
            training. Click <strong>&ldquo;Show All 16 Menus&rdquo;</strong> anytime to open the
            full enterprise navigation.
          </p>
        </div>

        <button
          type="button"
          onClick={onUnlockFullMenu}
          className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-blue-100/70 text-blue-800 border border-blue-300 text-xs font-bold shrink-0 transition-colors cursor-pointer"
        >
          <Layers className="w-3.5 h-3.5 text-blue-600" />
          <span>Show All 16 Menus</span>
        </button>
      </div>

      {/* 2. WELCOME HEADER */}
      <div className="rounded-2xl bg-gradient-to-r from-[#0f172a] via-[#172554] to-[#0f172a] text-white p-6 sm:p-7 shadow-md border border-blue-500/20">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex flex-wrap items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/35 text-xs font-bold text-emerald-300">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>
                Free Trial · {companyName}
                {daysLeft != null ? ` · ${daysLeft} days left (from 1st login)` : ''}
              </span>
              <span className="text-emerald-200/70">·</span>
              <span>
                {completedCount}/{visibleScenarios.length} Tried
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              Welcome! Start with your #1 priority below
            </h1>
            <p className="text-sm text-slate-300 leading-relaxed">
              Your workspace is pre-loaded with sample LGs, 3 bank credit facilities, and sample
              statements.{' '}
              <strong className="text-emerald-300">
                AI prepares the work fast — your team reviews and approves every step.
              </strong>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              disabled={isSwitchingRole}
              onClick={() =>
                onNavigateTarget('/corporate-admin/dashboard?view=dashboard', 'corporate_admin')
              }
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-xs sm:text-sm font-bold text-white transition-colors cursor-pointer disabled:opacity-60"
            >
              <BarChart3 className="w-4 h-4 text-blue-300" />
              <span>Open Main Dashboard</span>
            </button>

            <button
              type="button"
              onClick={() => openFeedbackWithReaction('easy')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-xs sm:text-sm font-bold text-white transition-colors cursor-pointer"
            >
              <MessageSquarePlus className="w-4 h-4 text-emerald-300" />
              <span>Quick Feedback</span>
            </button>

            {onOpenAiAssistant && (
              <button
                type="button"
                onClick={onOpenAiAssistant}
                className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-indigo-500 hover:bg-indigo-400 text-xs sm:text-sm font-bold text-white shadow-xs transition-colors cursor-pointer"
              >
                <Sparkles className="w-4 h-4 text-amber-200" />
                <span>Ask AI Helper</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 3. GENTLE ONE-TIME POST-FIRST-TEST FEEDBACK MICRO-PULSE */}
      {completedCount >= 1 && !pulseDismissed && (
        <div className="rounded-2xl bg-amber-50/90 border border-amber-200 px-4 sm:px-5 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="px-2 py-0.5 rounded-full bg-amber-200/80 text-amber-950 text-[11px] font-extrabold">
              10-Sec Check
            </span>
            <p className="text-xs sm:text-sm font-semibold text-slate-900">
              You completed your first test! How easy was it to follow?
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={isSubmittingFeedback}
              onClick={handleQuickPositivePulse}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition-colors cursor-pointer"
            >
              <ThumbsUp className="w-3.5 h-3.5" />
              <span>Very Easy</span>
            </button>

            <button
              type="button"
              onClick={() => openFeedbackWithReaction('confusing')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-white hover:bg-amber-100 text-amber-950 border border-amber-300 transition-colors cursor-pointer"
            >
              <HelpCircle className="w-3.5 h-3.5 text-amber-700" />
              <span>Something Was Confusing</span>
            </button>

            <button
              type="button"
              onClick={() => openFeedbackWithReaction('idea')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-white hover:bg-blue-50 text-slate-800 border border-slate-300 transition-colors cursor-pointer"
            >
              <Lightbulb className="w-3.5 h-3.5 text-blue-600" />
              <span>Feature Idea</span>
            </button>

            <button
              type="button"
              onClick={dismissPulsePermanently}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-amber-100/60 cursor-pointer"
              title="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* 4. HERO #1 PRIORITY SCENARIO CARD ("Stop Showing Too Much Too Early") */}
      {primaryScenario && (() => {
        const pStyle = ACCENT_STYLES[primaryScenario.accent] || ACCENT_STYLES.blue;
        const pDone = Boolean(stepsCompleted[primaryScenario.completedKey]);
        return (
          <div
            className={`rounded-2xl bg-white border-2 ${pStyle.heroBorder} p-5 sm:p-6 shadow-sm transition-all`}
          >
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-600 text-white text-[11px] font-extrabold uppercase tracking-wide">
                  <Star className="w-3.5 h-3.5 fill-current text-amber-300" />
                  <span>Start Here · Your #1 Priority</span>
                </span>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[11px] font-extrabold border ${pStyle.badge}`}
                >
                  {primaryScenario.badge}
                </span>
              </div>

              {pDone && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Completed
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-center">
              <div className="lg:col-span-8 space-y-2.5">
                <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
                  {primaryScenario.title}
                </h2>
                <p className="text-sm text-slate-600 leading-relaxed">
                  {primaryScenario.summary}
                </p>

                <ul className="space-y-1.5 pt-1">
                  {primaryScenario.highlights.map((pt) => (
                    <li key={pt} className="flex items-start gap-2 text-xs sm:text-sm text-slate-700">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      <span>{pt}</span>
                    </li>
                  ))}
                </ul>

                {primaryScenario.humanControlNote && (
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700">
                    <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0" />
                    <span>
                      <strong>Control Check:</strong> {primaryScenario.humanControlNote}
                    </span>
                  </div>
                )}
              </div>

              <div className="lg:col-span-4 lg:border-l lg:border-slate-100 lg:pl-5 flex flex-col justify-center gap-2.5">
                <div className="text-xs font-bold text-slate-500">
                  Ready in 2 minutes (sample data pre-loaded):
                </div>
                {renderScenarioActions(primaryScenario, pStyle)}
              </div>
            </div>
          </div>
        );
      })()}

      {/* 5. OTHER 3 MODULES INCLUDED IN YOUR TRIAL (Calm Secondary Row) */}
      {secondaryScenarios.length > 0 && (
        <div className="space-y-2.5 pt-1">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
              Other Modules Included in Your Trial (Explore Anytime)
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
            {secondaryScenarios.map((sc) => {
              const style = ACCENT_STYLES[sc.accent] || ACCENT_STYLES.blue;
              const isDone = Boolean(stepsCompleted[sc.completedKey]);

              return (
                <div
                  key={sc.id}
                  className={`rounded-2xl bg-white border border-slate-200/90 ${style.ring} p-4 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2.5">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10.5px] font-extrabold border ${style.badge}`}
                      >
                        {sc.badge}
                      </span>
                      {isDone && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10.5px] font-bold">
                          <CheckCircle2 className="w-3 h-3" />
                          Done
                        </span>
                      )}
                    </div>

                    <h4 className="text-sm sm:text-base font-extrabold text-slate-900 leading-snug">
                      {sc.title}
                    </h4>
                    <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">{sc.summary}</p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100">
                    {renderScenarioActions(sc, style)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 6. STAGE 3: PROVE BUSINESS VALUE TO MANAGEMENT + INVITE A COLLEAGUE */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* 1-Page CFO / Management Business Case PDF */}
        <div className="rounded-2xl bg-white border border-slate-200/90 p-5 flex flex-col justify-between gap-3 shadow-2xs">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center shrink-0">
              <FileText className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-extrabold text-slate-900">
                Share a 1-Page Summary With Management / CFO
              </h3>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                Need management approval? Download a ready 1-page PDF tailored to{' '}
                <strong>{companyName}</strong> showing time saved, cash-margin impact, internal
                approval controls, and security.
              </p>
            </div>
          </div>

          <div>
            <button
              type="button"
              disabled={isDownloadingSummary}
              onClick={onDownloadValueSummary}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white transition-colors cursor-pointer disabled:opacity-60"
            >
              {isDownloadingSummary ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Download className="w-3.5 h-3.5" />
              )}
              <span>
                {isDownloadingSummary
                  ? 'Preparing Summary PDF…'
                  : 'Download 1-Page Management Summary (PDF)'}
              </span>
            </button>
          </div>
        </div>

        {/* Invite a Colleague or Manager (Same Corporate Email Domain) */}
        <div className="rounded-2xl bg-white border border-slate-200/90 p-5 flex flex-col justify-between gap-3 shadow-2xs">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center shrink-0">
              <UserPlus className="w-5 h-5 text-emerald-600" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm sm:text-base font-extrabold text-slate-900">
                Invite a Colleague or Manager to Review With You
              </h3>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                Invite up to 3 colleagues from{' '}
                <strong>{companyDomain ? `@${companyDomain}` : 'your company email'}</strong> so
                your team or manager can review the workspace directly.
              </p>
              {invitedColleagues.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {invitedColleagues.map((em) => (
                    <span
                      key={em}
                      className="px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-[11px] font-semibold text-emerald-800"
                    >
                      ✓ {em}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div>
            <button
              type="button"
              onClick={() => {
                setInviteError('');
                setInviteModalOpen(true);
              }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition-colors cursor-pointer"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Invite Colleague / Manager</span>
            </button>
          </div>
        </div>
      </div>

      {/* 7. DATA PRIVACY PROMISE + SELF-SERVE FILE DELETE + SAMPLE KIT */}
      <div className="rounded-2xl bg-slate-50 border border-slate-200/90 p-4 sm:p-5 space-y-4">
        {/* Privacy Guarantee + Delete Uploaded Test Files */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3.5 border-b border-slate-200/80">
          <div className="flex items-start gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0 mt-0.5">
              <Lock className="w-3.5 h-3.5" />
            </div>
            <p className="text-xs text-slate-700 leading-relaxed">
              <strong className="text-slate-900">Your Uploaded Files Are Private &amp; Encrypted:</strong>{' '}
              Encrypted for <strong>{companyName}</strong> only · Never shared · Never used to train
              public AI · Trial letters carry a safe <strong>TRIAL</strong> watermark and never
              email external banks.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setPurgeConfirmOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-white hover:bg-rose-50 text-slate-700 hover:text-rose-700 border border-slate-200 hover:border-rose-200 shrink-0 transition-colors cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5 text-rose-500" />
            <span>Delete My Uploaded Test Files</span>
          </button>
        </div>

        {/* Sample Files + More Pages */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="space-y-2">
            <div className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
              Download Sample Test Files (Or Upload Your Own)
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {quickFiles.map((file) => (
                <button
                  key={file.id}
                  type="button"
                  disabled={downloadingSampleId === file.id}
                  onClick={() => onDownloadSample(file)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-white hover:bg-blue-50 text-slate-800 hover:text-blue-800 border border-slate-200 hover:border-blue-300 shadow-2xs transition-all cursor-pointer disabled:opacity-60"
                >
                  <Download className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                  <span>
                    {downloadingSampleId === file.id ? 'Creating PDF…' : file.label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2 lg:text-right">
            <div className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
              Trial Usage: {usage.lg_records || 0}/{caps.max_lg_records || 8} LGs ·{' '}
              {usage.statements || 0}/{caps.max_statements || 3} Statements · {usage.rfqs || 0}/
              {caps.max_rfqs || 5} Rate Requests
            </div>
            <div className="flex flex-wrap lg:justify-end items-center gap-2">
              <button
                type="button"
                disabled={isSwitchingRole}
                onClick={() =>
                  onNavigateTarget('/corporate-admin/issuance/facilities', 'corporate_admin')
                }
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 transition-colors cursor-pointer"
              >
                <Building2 className="w-3.5 h-3.5 text-indigo-600" />
                <span>3 Bank Credit Lines</span>
              </button>

              <button
                type="button"
                disabled={isSwitchingRole}
                onClick={() =>
                  onNavigateTarget('/corporate-admin/approval-requests', 'corporate_admin')
                }
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 transition-colors cursor-pointer"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>Approvals Page</span>
              </button>

              <button
                type="button"
                onClick={onUnlockFullMenu}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white transition-colors cursor-pointer"
              >
                <Layers className="w-3.5 h-3.5 text-amber-300" />
                <span>Show All Menus</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* INVITE COLLEAGUE MODAL */}
      {inviteModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setInviteModalOpen(false)}
        >
          <div
            className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-extrabold text-slate-900">
                Invite a Colleague or Manager
              </h3>
              <button
                type="button"
                onClick={() => setInviteModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              We will email them a secure activation link to join{' '}
              <strong>{companyName}</strong>&apos;s trial workspace. For security, their email must
              end with <strong>@{companyDomain || 'yourcompany.com'}</strong>.
            </p>

            {inviteError && (
              <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800">
                {inviteError}
              </div>
            )}

            <form onSubmit={handleInviteSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Colleague Name
                </label>
                <input
                  type="text"
                  value={inviteForm.name}
                  onChange={(e) => setInviteForm((p) => ({ ...p, name: e.target.value }))}
                  placeholder="Sara Hassan"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Work Email {companyDomain ? `(@${companyDomain})` : ''} *
                </label>
                <input
                  type="email"
                  required
                  value={inviteForm.email}
                  onChange={(e) => setInviteForm((p) => ({ ...p, email: e.target.value }))}
                  placeholder={`colleague@${companyDomain || 'yourcompany.com'}`}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Access Role</label>
                <select
                  value={inviteForm.role}
                  onChange={(e) => setInviteForm((p) => ({ ...p, role: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600"
                >
                  <option value="end_user">Treasury Team Member (End User)</option>
                  <option value="corporate_admin">
                    Treasury Manager / CFO (Approvals &amp; Dashboard)
                  </option>
                </select>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setInviteModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isInvitingColleague}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer disabled:opacity-60"
                >
                  {isInvitingColleague && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{isInvitingColleague ? 'Sending…' : 'Send Activation Link'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE MY UPLOADED TEST FILES CONFIRMATION MODAL */}
      {purgeConfirmOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setPurgeConfirmOpen(false)}
        >
          <div
            className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-extrabold text-slate-900">
                Delete Your Uploaded Test Files?
              </h3>
              <button
                type="button"
                onClick={() => setPurgeConfirmOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              This deletes any LGs, bank statements, rate requests, or documents that your team
              uploaded during testing — while keeping Grow&apos;s pre-loaded starter sample records
              intact so you can continue exploring anytime.
            </p>

            <div className="pt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setPurgeConfirmOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isPurgingData}
                onClick={handleConfirmPurge}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white cursor-pointer disabled:opacity-60"
              >
                {isPurgingData ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Trash2 className="w-3.5 h-3.5" />
                )}
                <span>{isPurgingData ? 'Deleting…' : 'Yes, Delete Uploaded Files'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* QUICK FEEDBACK MODAL */}
      {feedbackModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setFeedbackModalOpen(false)}
        >
          <div
            className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-extrabold text-slate-900">
                How is your Free Trial going?
              </h3>
              <button
                type="button"
                onClick={() => setFeedbackModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleFeedbackSubmit} className="space-y-3.5">
              <div className="grid grid-cols-1 gap-2">
                {FEEDBACK_CHOICES.map((ch) => {
                  const Icon = ch.icon;
                  const active = selectedReactionId === ch.id;
                  return (
                    <button
                      key={ch.id}
                      type="button"
                      onClick={() => setSelectedReactionId(ch.id)}
                      className={`flex items-center gap-2.5 p-3 rounded-xl border text-left text-xs font-bold transition-all cursor-pointer ${
                        active
                          ? ch.activeCls
                          : 'border-slate-200 hover:border-slate-300 text-slate-700 bg-white'
                      }`}
                    >
                      <Icon className="w-4 h-4 shrink-0" />
                      <span>{ch.label}</span>
                    </button>
                  );
                })}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Short note (optional)
                </label>
                <textarea
                  rows={3}
                  value={feedbackNote}
                  onChange={(e) => setFeedbackNote(e.target.value)}
                  placeholder="Tell us what you liked, what felt confusing, or what your team needs..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div className="pt-1 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setFeedbackModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingFeedback}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white cursor-pointer disabled:opacity-60"
                >
                  {isSubmittingFeedback && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{isSubmittingFeedback ? 'Sending…' : 'Send Feedback'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
