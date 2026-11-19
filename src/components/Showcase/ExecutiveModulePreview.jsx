// frontend/src/components/Showcase/ExecutiveModulePreview.jsx
import React from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
  Lock,
  QrCode,
  Sparkles,
  Award,
} from 'lucide-react';

/**
 * Enterprise-Depth, Zero-Clutter Product Proof Cards.
 * Shows the exact high-stakes corporate treasury edge cases where Excel & basic ERPs fail —
 * clean enough to grasp in 3 seconds, rich enough to prove serious institutional depth.
 */
export default function ExecutiveModulePreview({
  moduleId = 'reconciliation',
  onTourClick = null,
  showFooterLink = true,
}) {
  if (moduleId === 'custody') {
    return (
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xl shadow-slate-950/20 p-6 sm:p-8 text-slate-900 text-left">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-blue-600">
              Incoming Supplier Guarantee · Beneficiary Protection
            </p>
            <h3 className="text-base sm:text-lg font-bold text-slate-900 mt-0.5">
              Performance LG #FNCB-8840 &nbsp;·&nbsp; EGP 4,500,000
            </h3>
          </div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200/80">
            <Sparkles className="w-3.5 h-3.5" />
            Arabic &amp; English AI · 42s
          </span>
        </div>

        {/* 3 Enterprise Differentiator Rows */}
        <div className="my-5 space-y-3">
          {/* 1. Upfront Claim Trap Detection */}
          <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200/90 flex items-start gap-3">
            <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
            <div className="text-xs sm:text-sm">
              <p className="font-bold text-amber-950">
                Smart Claim Condition Captured Upfront (URDG 758)
              </p>
              <p className="text-amber-900/80 mt-0.5">
                AI detected mandatory breach declaration text — pre-saved so a claim can never be
                rejected on a technicality.
              </p>
            </div>
          </div>

          {/* 2. Risk-Smart Governance Split */}
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-700">PROTECTIVE EXTENSION</span>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                  Fast-Track
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                Executes directly with <strong>zero approval delay</strong> so protection never
                lapses near cutoff.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800">RELEASE / REDUCE / CLAIM</span>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-slate-200 text-slate-800">
                  Maker-Checker
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                Requires milestone certificate &amp; dual sign-off before surrendering EGP 1 of
                security.
              </p>
            </div>
          </div>

          {/* 3. Escalation & Anti-Forgery Bar */}
          <div className="px-4 py-3 rounded-xl bg-slate-900 text-white flex flex-wrap items-center justify-between gap-3 text-xs">
            <span className="font-medium text-slate-200">
              11 Days Left: Owner Alert → Line Manager Escalation → Bank Reply Tracked
            </span>
            <span className="inline-flex items-center gap-1.5 font-bold text-blue-300">
              <QrCode className="w-3.5 h-3.5" />
              QR + Split Security Code
            </span>
          </div>
        </div>

        {showFooterLink && (
          <div className="flex flex-wrap items-center justify-between gap-3 pt-1 text-xs sm:text-sm">
            <span className="text-slate-500">
              Verifies physical bank receiving stamps, paper letters &amp; amendment scans.
            </span>
            <Link
              to="/demo?module=custody"
              onClick={onTourClick}
              className="inline-flex items-center font-semibold text-blue-600 hover:text-blue-800 shrink-0"
            >
              Walk through live screen <ArrowRight className="w-4 h-4 ml-1" />
            </Link>
          </div>
        )}
      </div>
    );
  }

  if (moduleId === 'issuance') {
    return (
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xl shadow-slate-950/20 p-6 sm:p-8 text-slate-900 text-left">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-purple-600">
              Outgoing Guarantee · EGP 12,000,000 Advance Payment LG
            </p>
            <h3 className="text-base sm:text-lg font-bold text-slate-900 mt-0.5">
              AI Wording Trap Check + 0–100 Bank Facility Scoring
            </h3>
          </div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/80">
            Saves EGP 1.2M Cash Margin
          </span>
        </div>

        <div className="my-5 space-y-3">
          {/* Pre-Credit Applicant Wording Trap Alert */}
          <div className="px-4 py-3 rounded-xl bg-rose-50/70 border border-rose-200/80 flex flex-wrap items-center justify-between gap-2 text-xs">
            <span className="font-semibold text-rose-950">
              <ShieldCheck className="w-4 h-4 text-rose-600 inline mr-1.5 -mt-0.5" />
              <strong>Applicant Trap Caught:</strong> Client draft lacked Non-Operative advance
              trigger — safe clause generated.
            </span>
            <span className="font-bold text-rose-700">Contract Match: 8/8</span>
          </div>

          {/* Ranked Facility #1 */}
          <div className="p-4 rounded-xl border-2 border-blue-600 bg-blue-50/25 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-blue-600 text-white">
                  ★ BEST FIT
                </span>
                <span className="text-sm sm:text-base font-bold text-slate-900">
                  Bank A · Umbrella Facility
                </span>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                  Preserves Scarce FX Line
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-1.5">
                <strong className="text-emerald-700">0% Cash Margin</strong> · 0.85% p.a. ·{' '}
                <strong>1.2d Real Historical Speed</strong> · EGP 81.5M Headroom
              </p>
            </div>
            <div className="sm:text-right shrink-0">
              <p className="text-2xl font-extrabold text-blue-600 leading-none">94.4</p>
              <p className="text-[10px] font-bold uppercase text-slate-400 mt-1">Score / 100</p>
            </div>
          </div>

          {/* Ranked Facility #2 */}
          <div className="px-4 py-3 rounded-xl border border-slate-200 bg-slate-50/70 flex flex-col sm:flex-row sm:items-center justify-between gap-2 opacity-80">
            <div>
              <p className="text-xs sm:text-sm font-semibold text-slate-700">
                Bank B · General Trade Line
              </p>
              <p className="text-xs text-slate-500 mt-0.5">
                10% Cash Margin (Locks EGP 1.2M) · 1.25% p.a. · 3.4d Historical Speed
              </p>
            </div>
            <p className="text-base font-bold text-slate-500 shrink-0">79.1 / 100</p>
          </div>
        </div>

        {showFooterLink && (
          <div className="flex flex-wrap items-center justify-between gap-3 pt-1 text-xs sm:text-sm">
            <span className="text-slate-500">
              Auto-fills Arabic &amp; English bank PDF forms — zero bank portal setup needed.
            </span>
            <Link
              to="/demo?module=issuance"
              onClick={onTourClick}
              className="inline-flex items-center font-semibold text-blue-600 hover:text-blue-800 shrink-0"
            >
              Walk through live screen <ArrowRight className="w-4 h-4 ml-1" />
            </Link>
          </div>
        )}
      </div>
    );
  }

  if (moduleId === 'quotations') {
    return (
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xl shadow-slate-950/20 p-6 sm:p-8 text-slate-900 text-left">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-600">
              Sealed Multi-Bank Tender · Unsealed at 00:00:00
            </p>
            <h3 className="text-base sm:text-lg font-bold text-slate-900 mt-0.5">
              2-Leg FX Spot Basket · Cherry-Picked Per Currency
            </h3>
          </div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/80">
            <Award className="w-3.5 h-3.5" />
            +EGP 32,166 Saved vs. Mean
          </span>
        </div>

        {/* Multi-Leg Cherry-Pick Proof */}
        <div className="my-5 space-y-3">
          {/* Leg 1 */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/60">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
              <span className="text-xs sm:text-sm font-bold text-slate-900">
                Leg 1 · Buy USD 500,000{' '}
                <span className="text-xs font-normal text-slate-500">(All-In Net of Fees &amp; TVM)</span>
              </span>
              <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded">
                Beats CBE &amp; Market Mid
              </span>
            </div>
            <div className="grid sm:grid-cols-3 gap-2 text-xs">
              <div className="px-3 py-2 rounded-lg bg-emerald-600 text-white font-bold flex justify-between">
                <span>★ Bank A</span>
                <span className="font-mono">51.2450</span>
              </div>
              <div className="px-3 py-2 rounded-lg bg-white border border-slate-200 text-slate-600 flex justify-between">
                <span>Bank B</span>
                <span className="font-mono">51.2960</span>
              </div>
              <div className="px-3 py-2 rounded-lg bg-white border border-slate-200 text-slate-400 flex justify-between">
                <span>Bank C</span>
                <span className="font-mono">51.3870</span>
              </div>
            </div>
          </div>

          {/* Leg 2 */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/60">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
              <span className="text-xs sm:text-sm font-bold text-slate-900">
                Leg 2 · Buy EUR 250,000{' '}
                <span className="text-xs font-normal text-slate-500">(Awarded Independently)</span>
              </span>
              <span className="text-[11px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
                Split Winner Selected
              </span>
            </div>
            <div className="grid sm:grid-cols-3 gap-2 text-xs">
              <div className="px-3 py-2 rounded-lg bg-emerald-600 text-white font-bold flex justify-between">
                <span>★ Bank B</span>
                <span className="font-mono">55.4920</span>
              </div>
              <div className="px-3 py-2 rounded-lg bg-white border border-slate-200 text-slate-600 flex justify-between">
                <span>Bank A</span>
                <span className="font-mono">55.6000</span>
              </div>
              <div className="px-3 py-2 rounded-lg bg-white border border-slate-200 text-slate-400 flex justify-between">
                <span>Bank C</span>
                <span className="font-mono">55.6840</span>
              </div>
            </div>
          </div>

          {/* CBE & Sovereign T-Bill Governance Strip */}
          <div className="px-4 py-2.5 rounded-xl bg-slate-900 text-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs">
            <span className="inline-flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-emerald-400" />
              Zero-Password OTP Dealer Desk · Execution vs. Indicative CBE Roles
            </span>
            <span className="font-bold text-emerald-300">+ Sovereign T-Bill Auctions</span>
          </div>
        </div>

        {showFooterLink && (
          <div className="flex flex-wrap items-center justify-between gap-3 pt-1 text-xs sm:text-sm">
            <span className="text-slate-500">
              Banks quote via zero-password email links — zero IT setup required from banks.
            </span>
            <Link
              to="/demo?module=quotations"
              onClick={onTourClick}
              className="inline-flex items-center font-semibold text-blue-600 hover:text-blue-800 shrink-0"
            >
              Walk through live screen <ArrowRight className="w-4 h-4 ml-1" />
            </Link>
          </div>
        )}
      </div>
    );
  }

  // Default: Bank Auto-Reconciliation (3 Hard Realities Excel Fails At!)
  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xl shadow-slate-950/20 p-6 sm:p-8 text-slate-900 text-left">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-amber-600">
            Multi-Bank Statement &amp; ERP Reconciliation
          </p>
          <h3 className="text-base sm:text-lg font-bold text-slate-900 mt-0.5">
            3 Banking Realities Where Excel Breaks — Solved Automatically
          </h3>
        </div>
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/80">
          <CheckCircle2 className="w-3.5 h-3.5" />
          Balance Continuity Verified
        </span>
      </div>

      {/* 3 Clean, High-Signal Treasury Rows */}
      <div className="my-5 space-y-2.5">
        {/* Case 1: Asymmetric Inter-Bank Sweep */}
        <div className="p-3.5 sm:p-4 rounded-xl bg-slate-50 border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-indigo-100 text-indigo-800">
                CROSS-BANK SWEEP
              </span>
              <span className="text-xs sm:text-sm font-bold text-slate-900">
                Bank A (−5,000,175 EGP) ↔ Bank B (+5,000,000 EGP)
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Paired across separate bank statements despite wire fee deduction.
            </p>
          </div>
          <span className="self-start sm:self-center px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-100 text-amber-900 shrink-0">
            ⚡ 175 EGP Fee Isolated
          </span>
        </div>

        {/* Case 2: Bounced / Returned Wire Netting */}
        <div className="p-3.5 sm:p-4 rounded-xl bg-slate-50 border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-rose-100 text-rose-800">
                RETURNED WIRE
              </span>
              <span className="text-xs sm:text-sm font-bold text-slate-900">
                Vendor Payment (−380,000) + Next-Day IBAN Reject (+380,000)
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Netted to 0.00 so your open ERP vendor bill is never falsely marked paid.
            </p>
          </div>
          <span className="self-start sm:self-center px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-200 text-slate-800 shrink-0">
            ✓ Ghost Pair Cleared
          </span>
        </div>

        {/* Case 3: Split ERP Match with Correspondent Fee */}
        <div className="p-3.5 sm:p-4 rounded-xl bg-emerald-50/45 border border-emerald-200/90 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-600 text-white">
                ERP SPLIT MATCH
              </span>
              <span className="text-xs sm:text-sm font-bold text-slate-900">
                Swift Receipt (+1,249,850) ↔ SAP Invoice #4082 (+1,250,000)
              </span>
            </div>
            <p className="text-xs text-slate-600 mt-1">
              Closes full AR invoice &amp; routes 150 EGP correspondent fee to Bank Charges.
            </p>
          </div>
          <span className="self-start sm:self-center px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-100 text-emerald-900 shrink-0">
            ✓ 3-Leg GL Ready
          </span>
        </div>
      </div>

      {showFooterLink && (
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1 text-xs sm:text-sm">
          <span className="text-slate-500">
            Ready for SWIFT MT940 &amp; CAMT.053 — or everyday Arabic/English Excel &amp; CSV sheets.
          </span>
          <Link
            to="/demo?module=reconciliation"
            onClick={onTourClick}
            className="inline-flex items-center font-semibold text-blue-600 hover:text-blue-800 shrink-0"
          >
            Walk through live screen <ArrowRight className="w-4 h-4 ml-1" />
          </Link>
        </div>
      )}
    </div>
  );
}
