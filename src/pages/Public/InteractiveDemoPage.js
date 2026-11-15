// frontend/src/pages/Public/InteractiveDemoPage.js
import React from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { ArrowRight } from 'lucide-react';
import InteractivePlatformShowcase from '../../components/Showcase/InteractivePlatformShowcase';

export default function InteractiveDemoPage() {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50" style={{ fontFamily: "'Inter', 'Segoe UI', sans-serif" }}>
      <Helmet>
        <title>Interactive Product Tour — Grow Business Development</title>
        <meta
          name="description"
          content="Explore Grow's corporate treasury modules step by step using real screens and real bank test cases across LG Custody, LG Issuance, FX & T-Bill Quotations, and Bank Auto-Reconciliation."
        />
      </Helmet>

      {/* Brand Top Navigation Bar (Compact so Demo Stage fits 100% above the fold) */}
      <header className="sticky top-0 z-40 border-b border-gray-800/40" style={{ backgroundColor: '#1e2a4a' }}>
        <div className="max-w-[1840px] mx-auto px-4 sm:px-6 lg:px-7 py-2 flex items-center justify-between">
          <Link to="/" className="flex items-center space-x-2 hover:opacity-90 transition-opacity">
            <span className="text-lg font-bold text-white tracking-tight">Grow</span>
            <span className="text-xs text-blue-400 font-medium hidden sm:inline">Business Development</span>
          </Link>

          <nav className="flex items-center space-x-3 sm:space-x-4">
            <Link to="/know-more" className="text-xs sm:text-sm font-medium text-gray-300 hover:text-white transition-colors hidden sm:inline">
              Platform Overview
            </Link>
            <Link to="/#book-meeting" className="text-xs sm:text-sm font-medium text-gray-300 hover:text-white transition-colors">
              Book a Meeting
            </Link>
            <Link
              to="/free-trial-register"
              className="inline-flex items-center px-3.5 py-1.5 text-xs sm:text-sm font-semibold text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors"
            >
              Free Trial <ArrowRight className="ml-1.5 w-3.5 h-3.5 hidden sm:inline" />
            </Link>
            <Link
              to="/login"
              className="px-3.5 py-1.5 text-xs sm:text-sm font-semibold text-gray-300 border border-gray-500 rounded-md hover:bg-white/10 transition-colors"
            >
              Sign In
            </Link>
          </nav>
        </div>
      </header>

      {/* Embeddable Interactive Showcase */}
      <main className="flex-1">
        <InteractivePlatformShowcase embedded={false} />
      </main>
    </div>
  );
}
