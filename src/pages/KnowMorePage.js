// frontend/src/pages/KnowMorePage.js
import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import {
  ArrowRight,
  Shield,
  Send,
  TrendingUp,
  FileSpreadsheet,
  KeyRound,
  Fingerprint,
  ShieldCheck,
  Lock,
  Play,
  X,
} from 'lucide-react';
import { trackPublicEvent } from '../utils/publicTelemetry';
import GrowLogo from '../components/Common/GrowLogo';
import ExecutiveModulePreview from '../components/Showcase/ExecutiveModulePreview';

const CHAPTERS = [
  {
    id: 'reconciliation',
    badge: 'Module 04 · Bank Auto-Reconciliation',
    badgeCls: 'bg-amber-50 text-amber-700 border-amber-200',
    icon: FileSpreadsheet,
    title: 'Reconcile Multi-Bank Statements in Minutes, Not Weeks.',
    subtitle:
      'Import Excel, CSV, SWIFT MT940, or ISO 20022 CAMT.053 statements and turn raw bank lines into balanced ERP journal entries.',
    steps: [
      'Validates opening-to-closing balance continuity row by row on upload.',
      'Auto-classifies bank fees, stamp duty, interest, and payroll with zero rule setup.',
      'Pairs inter-account sweeps (isolating wire fees) and nets returned wires.',
      'Matches open ERP invoices side by side and exports locked SAP / Oracle GL journals.',
    ],
    image: '/demo/shots/recon_4_2/step_04_split_pane_erp_match.png',
    ctaLabel: 'Try Bank Recon Screen Live',
    ctaUrl: '/demo?module=reconciliation',
  },
  {
    id: 'custody',
    badge: 'Module 01 · LG Custody',
    badgeCls: 'bg-blue-50 text-blue-700 border-blue-200',
    icon: Shield,
    title: 'Never Miss an Expiry or Lose Financial Protection.',
    subtitle:
      'Safeguard every supplier and contractor guarantee from day of receipt until final bank release.',
    steps: [
      'Scans incoming LG PDFs in under 60 seconds and flags restrictive claim wording.',
      'Surfaces due renewals, unprinted letters, and overdue bank replies in one Action Center.',
      'Executes protective extensions directly while enforcing Maker-Checker on releases & claims.',
      'Seals outgoing bank instruction letters with a public QR code and split security code.',
    ],
    image: '/demo/shots/custody_action_center/step1_action_center_radar.png',
    ctaLabel: 'Try LG Custody Screen Live',
    ctaUrl: '/demo?module=custody',
  },
  {
    id: 'issuance',
    badge: 'Module 02 · LG Issuance & Facilities',
    badgeCls: 'bg-purple-50 text-purple-700 border-purple-200',
    icon: Send,
    title: 'Pick the Best Credit Line & Unlock Cash Collateral.',
    subtitle:
      'Unify outgoing guarantee requests from internal project teams through bank execution and position reconciliation.',
    steps: [
      'Captures department requests via an OTP-verified portal with AI contract verification.',
      'Scores multi-bank facilities 0–100 across commission, 0% margin, headroom & bank SLA.',
      'Auto-fills official Arabic and English bank PDF application forms and custom annexes.',
      'Reconciles Bank LG Position reports to catch expired guarantees still open at the bank.',
    ],
    image: '/demo/shots/issuance_2_2/step_03_smart_facility_scoring.png',
    ctaLabel: 'Try Facility Scoring Screen Live',
    ctaUrl: '/demo?module=issuance',
  },
  {
    id: 'quotations',
    badge: 'Module 03 · FX & T-Bill Quotations',
    badgeCls: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    icon: TrendingUp,
    title: 'Make Relationship Banks Compete with Sealed Bidding.',
    subtitle:
      'Run simultaneous multi-bank RFQs for FX Spot baskets and Sovereign Treasury Bills with complete auditability.',
    steps: [
      'Invites bank dealers via domain-locked, zero-password OTP links — zero bank IT setup.',
      'Keeps dealer quotes AES-256 sealed until 00:00 with fat-finger and inversion guardrails.',
      'Ranks All-In net prices (after fees & TVM) benchmarked against live market & CBE rates.',
      'Generates a Best Execution Audit Certificate and signed HMAC-SHA256 Deal Receipt.',
    ],
    image: '/demo/shots/quotations_3_3/step_01_provisional_net_standings.png',
    ctaLabel: 'Try FX & T-Bill Screen Live',
    ctaUrl: '/demo?module=quotations',
  },
];

function KnowMorePage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { hash } = useLocation();

  useEffect(() => {
    trackPublicEvent('page_view', { page: 'know_more', path: '/know-more' });
  }, []);

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
    <div
      className="bg-white text-slate-900 antialiased"
      style={{ fontFamily: "'Inter', 'Segoe UI', sans-serif" }}
    >
      <Helmet>
        <title>How It Works — Grow Treasury</title>
        <meta
          name="description"
          content="See how Grow Treasury automates Bank Reconciliation, LG Custody, LG Issuance, and Multi-Bank FX & T-Bill Bidding."
        />
      </Helmet>

      {/* ═══════ CLEAN EXECUTIVE NAVBAR ═══════ */}
      <header
        className="fixed top-0 left-0 right-0 z-50 border-b border-white/10 backdrop-blur-md"
        style={{ backgroundColor: 'rgba(15, 23, 42, 0.94)' }}
      >
        <div className="max-w-7xl mx-auto px-5 sm:px-8 h-[72px] flex items-center justify-between gap-6">
          <Link
            to="/"
            className="flex items-center hover:opacity-95 transition-opacity shrink-0"
          >
            <GrowLogo size="md" />
          </Link>

          <nav className="hidden xl:flex items-center gap-7 whitespace-nowrap">
            <Link
              to="/demo"
              className="text-sm font-medium text-slate-300 hover:text-white transition-colors"
            >
              Interactive Demo
            </Link>
            <a
              href="#reconciliation"
              className="text-sm font-medium text-slate-300 hover:text-white transition-colors"
            >
              Modules
            </a>
            <a
              href="#security"
              className="text-sm font-medium text-slate-300 hover:text-white transition-colors"
            >
              Security
            </a>
          </nav>

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
              className="px-3.5 py-2 rounded-lg text-sm font-semibold text-white bg-white/[0.06] border border-white/15 hover:bg-white/[0.12] transition-colors"
            >
              Free Trial
            </Link>
            <Link
              to="/#book-meeting"
              className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-blue-600 hover:bg-blue-500 transition-colors shadow-sm"
            >
              Book a Demo
            </Link>
          </div>

          <div className="flex md:hidden items-center gap-2 whitespace-nowrap shrink-0">
            <Link
              to="/portal/issuance"
              className="px-2.5 py-1.5 text-[11px] font-semibold text-slate-200 bg-white/[0.07] border border-white/15 rounded-lg"
            >
              Issuance Portal
            </Link>
            <Link
              to="/demo"
              className="px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 rounded-lg"
            >
              Try Demo
            </Link>
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
              to="/#book-meeting"
              onClick={() => setMobileMenuOpen(false)}
              className="block py-2 text-sm font-medium text-slate-200"
            >
              Book a 20-Min Walkthrough
            </Link>
            <a
              href="#security"
              onClick={() => setMobileMenuOpen(false)}
              className="block py-2 text-sm font-medium text-slate-200"
            >
              Security
            </a>
            <Link
              to="/portal/issuance"
              onClick={() => setMobileMenuOpen(false)}
              className="block py-2 text-sm font-medium text-slate-200"
            >
              Department Issuance Portal
            </Link>
            <Link
              to="/login"
              onClick={() => setMobileMenuOpen(false)}
              className="block pt-2.5 border-t border-white/10 text-sm font-semibold text-white"
            >
              Customer Sign In →
            </Link>
          </div>
        )}
      </header>

      {/* ═══════ CALM CENTERED HERO ═══════ */}
      <section
        className="pt-32 pb-20 text-center"
        style={{
          background:
            'radial-gradient(ellipse 80% 50% at 50% -10%, rgba(37, 99, 235, 0.25), transparent), #0f172a',
        }}
      >
        <div className="max-w-4xl mx-auto px-5 sm:px-6">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-400 mb-4">
            How Grow Works
          </p>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-white tracking-tight leading-[1.1]">
            Four Focused Modules.{' '}
            <span className="text-blue-400">One Governed Treasury.</span>
          </h1>
          <p className="mt-5 text-base sm:text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed">
            Full enterprise standards across every workflow — and ready from Day 1 even when your
            banks still use paper, PDFs, or Excel, or your ERP isn’t ready for an IT project.
          </p>

          <div className="mt-8 flex flex-wrap justify-center gap-2">
            {CHAPTERS.map((ch) => (
              <a
                key={ch.id}
                href={`#${ch.id}`}
                className="px-3.5 py-1.5 rounded-full text-xs font-semibold text-slate-300 bg-white/[0.06] border border-white/10 hover:bg-white/[0.12] hover:text-white transition-colors"
              >
                {ch.badge.split('·')[1]?.trim()}
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════ 4 BREATHABLE ALTERNATING SPLIT CHAPTERS ═══════ */}
      {CHAPTERS.map((ch, idx) => {
        const isEven = idx % 2 === 0;
        return (
          <section
            key={ch.id}
            id={ch.id}
            className={`py-20 lg:py-28 scroll-mt-16 ${
              isEven ? 'bg-white' : 'bg-slate-50 border-y border-slate-200/70'
            }`}
          >
            <div className="max-w-6xl mx-auto px-5 sm:px-6">
              <div className="grid lg:grid-cols-12 gap-10 lg:gap-12 items-center">
                {/* Text Column */}
                <div className={`lg:col-span-5 ${isEven ? 'lg:order-1' : 'lg:order-2'}`}>
                  <span
                    className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border mb-4 ${ch.badgeCls}`}
                  >
                    {ch.badge}
                  </span>

                  <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight leading-snug">
                    {ch.title}
                  </h2>

                  <p className="mt-3.5 text-sm sm:text-base text-slate-600 leading-relaxed">
                    {ch.subtitle}
                  </p>

                  <ol className="mt-6 space-y-3">
                    {ch.steps.map((stepText, sIdx) => (
                      <li key={sIdx} className="flex items-start gap-3 text-sm text-slate-700">
                        <span className="w-5 h-5 rounded-full bg-slate-900 text-white text-[11px] font-bold flex items-center justify-center mt-0.5 shrink-0">
                          {sIdx + 1}
                        </span>
                        <span className="leading-relaxed">{stepText}</span>
                      </li>
                    ))}
                  </ol>

                  <div className="mt-8">
                    <Link
                      to={ch.ctaUrl}
                      className="inline-flex items-center px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-500 transition-colors shadow-sm"
                    >
                      <Play className="w-3.5 h-3.5 mr-2 fill-current" />
                      {ch.ctaLabel}
                      <ArrowRight className="w-4 h-4 ml-1.5" />
                    </Link>
                  </div>
                </div>

                {/* Calm Concept Visual Column */}
                <div className={`lg:col-span-7 ${isEven ? 'lg:order-2' : 'lg:order-1'}`}>
                  <ExecutiveModulePreview moduleId={ch.id} showFooterLink={false} />
                </div>
              </div>
            </div>
          </section>
        );
      })}

      {/* ═══════ SECURITY & GOVERNANCE ═══════ */}
      <section id="security" className="py-24 bg-[#0f172a] text-white scroll-mt-16">
        <div className="max-w-6xl mx-auto px-5 sm:px-6">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-400 mb-3">
              Security &amp; Isolation
            </p>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
              Protected by Design. Clear in Plain Words.
            </h2>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                icon: KeyRound,
                title: 'Per-Company AES-256 Key',
                desc: 'Dedicated encryption keys isolate your rates, statements, and documents at rest.',
              },
              {
                icon: Shield,
                title: 'Zero-PII AI Masking',
                desc: 'Company names, IBANs, and LG numbers are masked before AI ever runs.',
              },
              {
                icon: Lock,
                title: 'Maker-Checker & Entities',
                desc: 'Multi-entity access scoping and dual approval with self-approval blocked.',
              },
              {
                icon: ShieldCheck,
                title: 'SHA-256 & QR Verification',
                desc: 'Hash-chained WORM audit logs and QR-sealed bank instruction letters.',
              },
            ].map((item, i) => (
              <div key={i} className="rounded-2xl p-6 bg-white/[0.04] border border-white/10">
                <div className="w-10 h-10 rounded-xl bg-blue-500/15 flex items-center justify-center mb-4">
                  <item.icon className="w-5 h-5 text-blue-400" />
                </div>
                <h3 className="text-base font-bold text-white">{item.title}</h3>
                <p className="mt-2 text-sm text-slate-400 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>

          <div className="mt-10 text-center text-xs text-slate-400">
            <span className="inline-flex items-center gap-1.5">
              <Fingerprint className="w-4 h-4 text-blue-400" /> Passkeys (Face ID / Touch ID), OTP
              MFA &amp; Optional Customer-Owned Google Cloud Bucket
            </span>
          </div>
        </div>
      </section>

      {/* ═══════ CLEAN CLOSING CTA ═══════ */}
      <section className="py-20 bg-blue-600 text-center">
        <div className="max-w-3xl mx-auto px-5 sm:px-6">
          <h2 className="text-3xl font-extrabold text-white tracking-tight">
            See Grow Run on Your Bank Formats in 20 Minutes.
          </h2>
          <p className="mt-3 text-blue-100 text-sm sm:text-base">
            Click through the live interactive demo right now or schedule a 1-on-1 session.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3.5">
            <Link
              to="/demo"
              className="inline-flex items-center px-6 py-3 rounded-xl text-sm font-bold text-blue-700 bg-white hover:bg-blue-50 transition-colors shadow-md"
            >
              <Play className="w-4 h-4 mr-2 fill-current" />
              Try Interactive Demo
            </Link>
            <Link
              to="/free-trial-register"
              className="inline-flex items-center px-6 py-3 rounded-xl text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-500 transition-colors shadow-md"
            >
              Start Guided Free Trial
              <ArrowRight className="w-4 h-4 ml-2" />
            </Link>
            <Link
              to="/#book-meeting"
              className="px-6 py-3 rounded-xl text-sm font-bold text-white bg-blue-700/70 border border-white/50 hover:bg-blue-700 transition-colors"
            >
              Book a 20-Min Walkthrough
            </Link>
          </div>
        </div>
      </section>

      {/* ═══════ MINIMAL FOOTER ═══════ */}
      <footer className="bg-[#0b1120] text-slate-400 py-12 border-t border-slate-800/80">
        <div className="max-w-6xl mx-auto px-5 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
          <div className="flex items-center space-x-3">
            <GrowLogo size="sm" showSubtitle={false} />
            <span className="text-slate-600">·</span>
            <span>&copy; {new Date().getFullYear()} Grow Business Development</span>
          </div>
          <div className="flex flex-wrap items-center gap-5">
            <Link to="/" className="hover:text-white">
              Home
            </Link>
            <Link to="/demo" className="hover:text-white">
              Interactive Demo
            </Link>
            <Link to="/portal/issuance" className="hover:text-white">
              Issuance Portal
            </Link>
            <a href="/grow_brochure.pdf" download="Grow-Brochure.pdf" className="hover:text-white">
              Brochure (PDF)
            </a>
            <Link to="/free-trial-register" className="hover:text-white">
              Free Trial
            </Link>
            <Link to="/login" className="hover:text-white">
              Sign In
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default KnowMorePage;
