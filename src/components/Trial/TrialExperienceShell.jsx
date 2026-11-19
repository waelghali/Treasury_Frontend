// src/components/Trial/TrialExperienceShell.jsx
import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  Download,
  Sparkles,
  Wand2,
  Loader2,
  Lock,
  ExternalLink,
  FastForward,
  Award,
  Copy,
  RefreshCw,
  MessageSquarePlus,
  ThumbsUp,
  HelpCircle,
  Lightbulb,
  X,
} from 'lucide-react';
import { toast } from 'react-toastify';
import { getRouteSalesContext } from './trialSalesCatalog';

export default function TrialExperienceShell({
  isTrial,
  sandboxStatus,
  activeRole = 'end_user',
  showGuidedHome = false,
  isSwitchingRole = false,
  isFastForwarding = false,
  isRefreshingSim = false,
  downloadingSampleId = null,
  autoLoadingActionId = null,
  isSubmittingFeedback = false,
  onNavigateTarget,
  onGoToTrialHome,
  onDownloadSample,
  onAutoLoadSample,
  onFastForwardRfq,
  onRefreshStatus,
  onSubmitFeedback,
}) {
  const location = useLocation();
  const navigate = useNavigate();
  const [showWhyGrow, setShowWhyGrow] = useState(false);
  const [showFeedbackBar, setShowFeedbackBar] = useState(false);
  const [feedbackReaction, setFeedbackReaction] = useState('confusing');
  const [feedbackComment, setFeedbackComment] = useState('');

  useEffect(() => {
    setShowWhyGrow(false);
    setShowFeedbackBar(false);
  }, [location.pathname]);

  if (!isTrial || !sandboxStatus || showGuidedHome) {
    return null;
  }

  const salesContext = getRouteSalesContext(location.pathname, activeRole);
  const rfqSim = sandboxStatus.active_rfq_simulator || null;
  const isQuotationScreen = (location.pathname || '').toLowerCase().includes('/quotation');
  const showRfqSimulator = Boolean(
    rfqSim &&
      (isQuotationScreen || ['PENDING_APPROVAL', 'OPEN', 'EVALUATING'].includes(rfqSim.status))
  );
  const resultsRoutePrefix = activeRole === 'corporate_admin' ? '/corporate-admin' : '/end-user';

  const handleCopyText = (txt, label) => {
    if (!txt) return;
    navigator.clipboard?.writeText(txt);
    toast.success(`${label} copied!`, { autoClose: 1400 });
  };

  const handleSendInlineFeedback = async (e) => {
    e.preventDefault();
    if (!onSubmitFeedback) return;
    const map = {
      easy: { sentiment: 'POSITIVE', feedbackType: 'GENERAL_FEEDBACK' },
      confusing: { sentiment: 'NEGATIVE', feedbackType: 'USABILITY_PAIN_POINT' },
      idea: { sentiment: 'NEUTRAL', feedbackType: 'FEATURE_REQUEST' },
    };
    const picked = map[feedbackReaction] || map.easy;
    const ok = await onSubmitFeedback({
      sentiment: picked.sentiment,
      feedbackType: picked.feedbackType,
      message: feedbackComment,
    });
    if (ok) {
      setFeedbackComment('');
      setShowFeedbackBar(false);
    }
  };

  const isAutoLoadingThisStep = Boolean(
    salesContext.autoLoadAction && autoLoadingActionId === salesContext.autoLoadAction.id
  );

  return (
    <div className="mb-5 rounded-2xl border border-slate-700/60 bg-white shadow-sm overflow-hidden">
      {/* 1. COMPACT TOP NAVIGATION & UTILITY STRIP */}
      <div className="px-4 sm:px-5 py-2 bg-[#0b1324] border-b border-white/10 text-white flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2.5 min-w-0">
          <button
            type="button"
            onClick={onGoToTrialHome}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 border border-white/15 text-xs font-bold text-white shrink-0 transition-colors cursor-pointer"
            title="Go back to Trial Home"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-emerald-300" />
            <span>Trial Home</span>
          </button>

          {salesContext.stepBadge && (
            <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-emerald-500/20 border border-emerald-400/40 text-xs font-extrabold text-emerald-300 shrink-0">
              {salesContext.stepBadge}
            </span>
          )}

          <span className="hidden md:inline-flex items-center gap-1 text-[11px] font-medium text-slate-400">
            <Lock className="w-3 h-3 text-slate-400" />
            <span>Encrypted Sandbox · Safe to test</span>
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setShowWhyGrow((prev) => !prev)}
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
              showWhyGrow
                ? 'bg-amber-400 text-slate-950 border-amber-300'
                : 'bg-white/[0.08] hover:bg-white/15 text-amber-300 border-white/15'
            }`}
            title="See how this saves time"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>How This Helps</span>
          </button>

          {onSubmitFeedback && (
            <button
              type="button"
              onClick={() => setShowFeedbackBar((prev) => !prev)}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
                showFeedbackBar
                  ? 'bg-emerald-400 text-slate-950 border-emerald-300'
                  : 'bg-white/[0.08] hover:bg-white/15 text-slate-200 border-white/15'
              }`}
              title="Share quick feedback or ask for help on this screen"
            >
              <MessageSquarePlus className="w-3.5 h-3.5" />
              <span>Feedback</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. CLEAN, WIDE INSTRUCTION & ACTION ROW */}
      <div className="px-4 sm:px-5 py-3 bg-gradient-to-r from-[#0f172a] via-[#172554] to-[#0f172a] text-white flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3.5">
        <p className="text-xs sm:text-sm font-medium text-slate-100 leading-relaxed flex-1 min-w-0">
          {salesContext.quickAction}
        </p>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {salesContext.autoLoadAction && onAutoLoadSample && (
            <button
              type="button"
              disabled={Boolean(autoLoadingActionId) || isSwitchingRole}
              onClick={() => onAutoLoadSample(salesContext.autoLoadAction.id)}
              title={salesContext.autoLoadAction.title}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-extrabold bg-gradient-to-r from-emerald-400 to-teal-300 hover:from-emerald-300 hover:to-teal-200 text-slate-950 shadow-sm transition-all cursor-pointer disabled:opacity-60"
            >
              {isAutoLoadingThisStep ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
              ) : (
                <Wand2 className="w-3.5 h-3.5 shrink-0" />
              )}
              <span>
                {isAutoLoadingThisStep
                  ? salesContext.autoLoadAction.loadingLabel
                  : salesContext.autoLoadAction.label}
              </span>
            </button>
          )}

          {(salesContext.samples || []).map((file) => (
            <button
              key={file.id}
              type="button"
              disabled={downloadingSampleId === file.id}
              onClick={() => onDownloadSample(file)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/20 text-white border border-white/20 transition-colors cursor-pointer disabled:opacity-60"
            >
              <Download className="w-3.5 h-3.5 text-blue-300 shrink-0" />
              <span>{downloadingSampleId === file.id ? 'Creating PDF…' : file.label}</span>
            </button>
          ))}

          {salesContext.secondaryNext && (
            <button
              type="button"
              disabled={isSwitchingRole}
              onClick={() =>
                onNavigateTarget(
                  salesContext.secondaryNext.path,
                  salesContext.secondaryNext.requiredRole || null
                )
              }
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/20 text-white border border-white/15 transition-colors cursor-pointer"
            >
              <span>{salesContext.secondaryNext.label}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}

          {salesContext.nextAction && (
            <button
              type="button"
              disabled={isSwitchingRole}
              onClick={() =>
                onNavigateTarget(
                  salesContext.nextAction.path,
                  salesContext.nextAction.requiredRole || null
                )
              }
              className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-blue-500 hover:bg-blue-400 text-white shadow-xs transition-colors cursor-pointer"
            >
              <span>{salesContext.nextAction.label}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* OPTIONAL 1-LINE "HOW THIS HELPS" + PRIVACY NOTE */}
      {showWhyGrow && (
        <div className="px-4 sm:px-5 py-2.5 bg-emerald-950 text-emerald-100 text-xs sm:text-sm flex flex-wrap items-center justify-between gap-2 border-t border-emerald-700/40">
          <span>
            <strong className="text-amber-300">How Grow Helps Your Team:</strong>{' '}
            {salesContext.growEdge}
          </span>
          <span className="text-xs text-slate-300">
            Encrypted for your company only · Trial Usage:{' '}
            <strong>
              {sandboxStatus.usage?.lg_records || 0}/{sandboxStatus.caps?.max_lg_records || 8}
            </strong>{' '}
            LGs ·{' '}
            <strong>
              {sandboxStatus.usage?.statements || 0}/{sandboxStatus.caps?.max_statements || 3}
            </strong>{' '}
            Statements ·{' '}
            <strong>
              {sandboxStatus.usage?.rfqs || 0}/{sandboxStatus.caps?.max_rfqs || 5}
            </strong>{' '}
            Rate Requests
          </span>
        </div>
      )}

      {/* INLINE QUICK FEEDBACK BAR (Report confusion or praise on this exact screen) */}
      {showFeedbackBar && onSubmitFeedback && (
        <form
          onSubmit={handleSendInlineFeedback}
          className="px-4 sm:px-5 py-2.5 bg-slate-50 border-t border-slate-200 flex flex-col lg:flex-row lg:items-center justify-between gap-2.5 text-xs"
        >
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="font-bold text-slate-700 mr-1">Feedback on this page:</span>
            {[
              { id: 'easy', label: 'Easy & Clear', icon: ThumbsUp },
              { id: 'confusing', label: 'Something Confusing', icon: HelpCircle },
              { id: 'idea', label: 'Question / Idea', icon: Lightbulb },
            ].map((opt) => {
              const Icon = opt.icon;
              const active = feedbackReaction === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setFeedbackReaction(opt.id)}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg font-bold border transition-colors cursor-pointer ${
                    active
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                  }`}
                >
                  <Icon className="w-3 h-3" />
                  <span>{opt.label}</span>
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2 flex-1 lg:max-w-md">
            <input
              type="text"
              value={feedbackComment}
              onChange={(e) => setFeedbackComment(e.target.value)}
              placeholder="Optional short note (we reply fast if you need help)..."
              className="flex-1 px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
            <button
              type="submit"
              disabled={isSubmittingFeedback}
              className="px-3 py-1.5 rounded-lg font-bold bg-emerald-600 hover:bg-emerald-700 text-white shrink-0 cursor-pointer disabled:opacity-60"
            >
              {isSubmittingFeedback ? 'Sending…' : 'Send'}
            </button>
            <button
              type="button"
              onClick={() => setShowFeedbackBar(false)}
              className="p-1 rounded text-slate-400 hover:text-slate-700 cursor-pointer"
              title="Close"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </form>
      )}

      {/* LIVE FX & T-BILL QUOTE TEST BAR (Only when an active RFQ exists) */}
      {showRfqSimulator && rfqSim && (
        <div className="px-4 sm:px-5 py-2.5 bg-indigo-950 text-slate-100 border-t border-indigo-500/30 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-indigo-500/25 text-indigo-200 border border-indigo-400/30">
              <Lock className="w-3 h-3" />
              Test Rate Request · {rfqSim.ref_no}
            </span>

            {rfqSim.status === 'PENDING_APPROVAL' && (
              <span className="text-amber-200">
                Waiting for approval before sending to banks.
              </span>
            )}

            {(rfqSim.status === 'OPEN' || rfqSim.status === 'PENDING') && (
              <span>
                <strong className="text-emerald-300">
                  {rfqSim.quoted_banks}/{rfqSim.total_banks} Banks Sent Quotes
                </strong>{' '}
                (Hidden until timer ends) — try the Bank Trader Screen or Finish Timer Now!
              </span>
            )}

            {(rfqSim.status === 'EVALUATING' || rfqSim.status === 'COMPLETED') && (
              <span className="text-emerald-200">
                Timer ended — compare bank rates &amp; approve Deal Confirmation.
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {rfqSim.status === 'PENDING_APPROVAL' && activeRole !== 'corporate_admin' && (
              <button
                type="button"
                onClick={() => onNavigateTarget('/corporate-admin/quotations', 'corporate_admin')}
                className="px-2.5 py-1 rounded-lg font-bold bg-amber-400 hover:bg-amber-300 text-slate-950 transition-colors cursor-pointer"
              >
                Approve Request →
              </button>
            )}

            {(rfqSim.status === 'OPEN' || rfqSim.status === 'PENDING') &&
              rfqSim.dealer_playground && (
                <>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-[11px]">
                    Code:{' '}
                    <strong className="font-mono text-amber-300">
                      {rfqSim.dealer_playground.demo_otp}
                    </strong>
                    <button
                      type="button"
                      onClick={() =>
                        handleCopyText(rfqSim.dealer_playground.demo_otp, 'Login Code')
                      }
                      className="text-slate-400 hover:text-white ml-1 cursor-pointer"
                    >
                      <Copy className="w-3 h-3" />
                    </button>
                  </span>

                  <a
                    href={
                      rfqSim.dealer_playground.magic_url || rfqSim.dealer_playground.otp_gate_url
                    }
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg font-bold bg-indigo-600 hover:bg-indigo-500 text-white transition-colors"
                  >
                    <span>Open Bank Trader Screen</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>

                  <button
                    type="button"
                    onClick={onFastForwardRfq}
                    disabled={isFastForwarding}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition-colors disabled:opacity-60 cursor-pointer"
                  >
                    <FastForward className="w-3 h-3" />
                    <span>{isFastForwarding ? 'Opening Quotes…' : 'Finish Timer Now'}</span>
                  </button>
                </>
              )}

            {(rfqSim.status === 'EVALUATING' || rfqSim.status === 'COMPLETED') && (
              <button
                type="button"
                onClick={() =>
                  navigate(`${resultsRoutePrefix}/quotations/results/${rfqSim.rfq_id}`)
                }
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition-colors cursor-pointer"
              >
                <Award className="w-3 h-3" />
                <span>See Winning Rates &amp; Confirmation →</span>
              </button>
            )}

            <button
              type="button"
              onClick={onRefreshStatus}
              disabled={isRefreshingSim}
              className="p-1 rounded bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-700 cursor-pointer"
              title="Refresh"
            >
              <RefreshCw className={`w-3 h-3 ${isRefreshingSim ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
