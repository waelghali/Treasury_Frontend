// frontend/src/pages/Public/InteractiveDemoPage.js
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import InteractivePlatformShowcase from '../../components/Showcase/InteractivePlatformShowcase';
import GrowLogo from '../../components/Common/GrowLogo';
import { trackPublicEvent } from '../../utils/publicTelemetry';

export default function InteractiveDemoPage() {
  const [bookModalOpen, setBookModalOpen] = useState(false);

  return (
    <div
      className="min-h-screen flex flex-col bg-slate-50"
      style={{ fontFamily: "'Inter', 'Segoe UI', sans-serif" }}
    >
      <Helmet>
        <title>Interactive Demo — Grow Treasury</title>
        <meta
          name="description"
          content="Click through live Grow Treasury screens across Bank Auto-Reconciliation, LG Custody, LG Issuance, and FX & T-Bill Bidding."
        />
      </Helmet>

      {/* Clean, Prominent Brand Top Bar (Keeps Live Demo Screen 100% Above the Fold) */}
      <header
        className="sticky top-0 z-40 border-b border-white/10"
        style={{ backgroundColor: '#0f172a' }}
      >
        <div className="max-w-[1840px] mx-auto px-4 sm:px-6 lg:px-7 h-14 sm:h-16 flex items-center justify-between gap-3">
          <Link
            to="/"
            className="flex items-center hover:opacity-95 transition-opacity shrink-0"
          >
            <GrowLogo size="md" />
          </Link>

          <nav className="flex items-center gap-3 sm:gap-5 whitespace-nowrap shrink-0">
            <Link
              to="/know-more"
              className="text-xs sm:text-sm font-medium text-slate-300 hover:text-white transition-colors hidden md:inline"
            >
              How It Works
            </Link>
            <Link
              to="/portal/issuance"
              className="text-xs sm:text-sm font-medium text-slate-300 hover:text-white transition-colors hidden lg:inline"
            >
              Issuance Portal
            </Link>
            <Link
              to="/login"
              className="text-xs sm:text-sm font-medium text-slate-300 hover:text-white transition-colors hidden sm:inline"
            >
              Sign In
            </Link>
            <span className="hidden sm:inline-block h-4 w-px bg-white/15" aria-hidden="true" />
            <Link
              to="/free-trial-register"
              onClick={() =>
                trackPublicEvent('cta_click', {
                  page: 'demo',
                  path: '/demo',
                  metadata: { target: 'free_trial_click', source: 'demo_navbar' },
                })
              }
              className="px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold text-white bg-white/[0.06] border border-white/15 hover:bg-white/[0.12] transition-colors"
            >
              Free Trial
            </Link>
            <button
              type="button"
              onClick={() => {
                trackPublicEvent('cta_click', {
                  page: 'demo',
                  path: '/demo',
                  metadata: { target: 'book_meeting_click', source: 'demo_navbar' },
                });
                setBookModalOpen(true);
              }}
              className="px-3.5 py-1.5 text-xs sm:text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-500 transition-colors cursor-pointer shadow-sm"
            >
              Book a Demo
            </button>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        <InteractivePlatformShowcase
          embedded={false}
          externalBookOpen={bookModalOpen}
          onExternalBookClose={() => setBookModalOpen(false)}
        />
      </main>
    </div>
  );
}
