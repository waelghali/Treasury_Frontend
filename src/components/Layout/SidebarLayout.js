// src/components/Layout/SidebarLayout.js
import React, { useState, useEffect } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Briefcase,
  Settings,
  FileText,
  BarChart,
  LogOut,
  DollarSign,
  List,
  Gavel,
  File,
  HardDrive,
  Clock,
  BookOpen,
  UserPlus,
  Menu,
  X,
  MessageSquare,
  ChevronDown,
  ChevronRight,
  ShieldCheck,
  Building2,
  Bell,
  Sparkles,
  Layers,
  FileCheck
} from 'lucide-react';
import apiClient from '../../services/apiClient';

function SidebarLayout({ onLogout, headerTitle }) {
  const [showGlobalConfigSubMenu, setShowGlobalConfigSubMenu] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [unreviewedFeedback, setUnreviewedFeedback] = useState(0);
  const location = useLocation();

  useEffect(() => {
    if (location.pathname.startsWith('/system-owner/global-configurations')) {
      setShowGlobalConfigSubMenu(true);
    }
    setMobileMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    // fetch badge count
    apiClient.get('/feedback/').then((res) => {
      const newCount = (res.data || []).filter((f) => f.status === 'NEW').length;
      setUnreviewedFeedback(newCount);
    }).catch(() => {});
  }, [location.pathname]);

  const isLinkActive = (path, exact = false) => {
    if (exact) return location.pathname === path;
    return location.pathname.startsWith(path);
  };

  const navItemClass = (active) =>
    `flex items-center justify-between px-3 py-1.5 rounded-xl text-xs font-semibold transition-all duration-150 ${
      active
        ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-sm shadow-indigo-200 dark:shadow-none'
        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
    }`;

  const subNavItemClass = (active) =>
    `flex items-center px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all ${
      active
        ? 'bg-indigo-50 text-indigo-700 font-bold dark:bg-indigo-950/60 dark:text-indigo-300'
        : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800/50'
    }`;

  const NavLinks = () => (
    <div className="space-y-4 text-xs">
      {/* SECTION 1: EXECUTIVE OVERVIEW */}
      <div className="space-y-1">
        <span className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
          Overview & Telemetry
        </span>

        <Link
          to="/system-owner/dashboard"
          onClick={() => setMobileMenuOpen(false)}
          className={navItemClass(isLinkActive('/system-owner/dashboard'))}
        >
          <span className="flex items-center gap-2.5">
            <LayoutDashboard className="w-4 h-4" />
            Executive Dashboard
          </span>
        </Link>

        <Link
          to="/system-owner/feedback"
          onClick={() => setMobileMenuOpen(false)}
          className={navItemClass(isLinkActive('/system-owner/feedback'))}
        >
          <span className="flex items-center gap-2.5">
            <MessageSquare className="w-4 h-4 text-purple-300" />
            User Feedback
          </span>
          {unreviewedFeedback > 0 && (
            <span className="bg-amber-400 text-slate-900 text-[9px] font-black px-1.5 py-0.2 rounded-full animate-pulse">
              {unreviewedFeedback}
            </span>
          )}
        </Link>

        <Link
          to="/system-owner/reports"
          onClick={() => setMobileMenuOpen(false)}
          className={navItemClass(isLinkActive('/system-owner/reports'))}
        >
          <span className="flex items-center gap-2.5">
            <BarChart className="w-4 h-4" />
            Platform Analytics
          </span>
        </Link>
      </div>

      {/* SECTION 2: TENANTS & BILLING */}
      <div className="space-y-1">
        <span className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
          Commercial & Tenants
        </span>

        <Link
          to="/system-owner/customers"
          onClick={() => setMobileMenuOpen(false)}
          className={navItemClass(isLinkActive('/system-owner/customers') && !isLinkActive('/system-owner/customers/trial-registrations'))}
        >
          <span className="flex items-center gap-2.5">
            <Building2 className="w-4 h-4" />
            Customer Tenants
          </span>
        </Link>

        <Link
          to="/system-owner/customers/trial-registrations"
          onClick={() => setMobileMenuOpen(false)}
          className={navItemClass(isLinkActive('/system-owner/customers/trial-registrations'))}
        >
          <span className="flex items-center gap-2.5">
            <UserPlus className="w-4 h-4" />
            Trial Registrations
          </span>
        </Link>

        <Link
          to="/system-owner/subscription-plans"
          onClick={() => setMobileMenuOpen(false)}
          className={navItemClass(isLinkActive('/system-owner/subscription-plans'))}
        >
          <span className="flex items-center gap-2.5">
            <Briefcase className="w-4 h-4" />
            Subscription Plans
          </span>
        </Link>
      </div>

      {/* SECTION 3: SYSTEM CONFIG & ENGINES */}
      <div className="space-y-1">
        <span className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
          Engines & Settings
        </span>

        <Link
          to="/system-owner/bank-forms"
          onClick={() => setMobileMenuOpen(false)}
          className={navItemClass(isLinkActive('/system-owner/bank-forms'))}
        >
          <span className="flex items-center gap-2.5">
            <FileCheck className="w-4 h-4" />
            Bank Form Overlays
          </span>
        </Link>

        <div>
          <button
            onClick={() => setShowGlobalConfigSubMenu(!showGlobalConfigSubMenu)}
            className={`w-full ${navItemClass(isLinkActive('/system-owner/global-configurations'))}`}
          >
            <span className="flex items-center gap-2.5">
              <Settings className="w-4 h-4" />
              Global Settings
            </span>
            {showGlobalConfigSubMenu ? (
              <ChevronDown className="w-3.5 h-3.5 opacity-70" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5 opacity-70" />
            )}
          </button>

          {showGlobalConfigSubMenu && (
            <div className="ml-5 mt-1 pl-2.5 border-l border-slate-200 dark:border-slate-700 space-y-0.5">
              <Link
                to="/system-owner/global-configurations"
                onClick={() => setMobileMenuOpen(false)}
                className={subNavItemClass(isLinkActive('/system-owner/global-configurations', true))}
              >
                Ranges Settings
              </Link>
              <Link
                to="/system-owner/global-configurations/common-list/banks"
                onClick={() => setMobileMenuOpen(false)}
                className={subNavItemClass(isLinkActive('/system-owner/global-configurations/common-list/banks'))}
              >
                Banks
              </Link>
              <Link
                to="/system-owner/global-configurations/common-list/currencies"
                onClick={() => setMobileMenuOpen(false)}
                className={subNavItemClass(isLinkActive('/system-owner/global-configurations/common-list/currencies'))}
              >
                Currencies
              </Link>
              <Link
                to="/system-owner/global-configurations/common-list/lg-types"
                onClick={() => setMobileMenuOpen(false)}
                className={subNavItemClass(isLinkActive('/system-owner/global-configurations/common-list/lg-types'))}
              >
                LG Types
              </Link>
              <Link
                to="/system-owner/global-configurations/common-list/rules"
                onClick={() => setMobileMenuOpen(false)}
                className={subNavItemClass(isLinkActive('/system-owner/global-configurations/common-list/rules'))}
              >
                Rules & Policies
              </Link>
              <Link
                to="/system-owner/global-configurations/templates"
                onClick={() => setMobileMenuOpen(false)}
                className={subNavItemClass(isLinkActive('/system-owner/global-configurations/templates'))}
              >
                Templates
              </Link>
            </div>
          )}
        </div>

        <Link
          to="/system-owner/system-notifications"
          onClick={() => setMobileMenuOpen(false)}
          className={navItemClass(isLinkActive('/system-owner/system-notifications'))}
        >
          <span className="flex items-center gap-2.5">
            <Bell className="w-4 h-4" />
            System Notifications
          </span>
        </Link>

        <Link
          to="/system-owner/scheduler"
          onClick={() => setMobileMenuOpen(false)}
          className={navItemClass(isLinkActive('/system-owner/scheduler'))}
        >
          <span className="flex items-center gap-2.5">
            <Clock className="w-4 h-4" />
            Scheduler Timers
          </span>
        </Link>
      </div>

      {/* SECTION 4: COMPLIANCE & GOVERNANCE */}
      <div className="space-y-1">
        <span className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
          Governance & Security
        </span>

        <Link
          to="/system-owner/audit-logs"
          onClick={() => setMobileMenuOpen(false)}
          className={navItemClass(isLinkActive('/system-owner/audit-logs'))}
        >
          <span className="flex items-center gap-2.5">
            <ShieldCheck className="w-4 h-4" />
            Audit Logs
          </span>
        </Link>

        <Link
          to="/system-owner/lg-categories/universal"
          onClick={() => setMobileMenuOpen(false)}
          className={navItemClass(isLinkActive('/system-owner/lg-categories/universal'))}
        >
          <span className="flex items-center gap-2.5">
            <BookOpen className="w-4 h-4" />
            Universal Categories
          </span>
        </Link>
      </div>
    </div>
  );

  return (
    <div className="relative flex flex-col lg:flex-row h-screen bg-[#f8fafc] overflow-hidden">
      {/* MOBILE TOPBAR */}
      <header className="lg:hidden flex items-center justify-between px-4 py-2.5 bg-white/90 backdrop-blur-md border-b border-gray-200 z-30 shrink-0">
        <div className="flex items-center space-x-2">
          <img src="/growlogonleaf.png" alt="Logo" className="w-7 h-auto" />
          <div>
            <h1 className="text-xs font-bold text-gray-800 leading-tight">Grow Treasury</h1>
            <span className="text-[9px] bg-indigo-100 text-indigo-800 font-bold px-1.5 py-0.2 rounded-full">System Owner</span>
          </div>
        </div>
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-1.5 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-100"
          aria-label="Toggle Menu"
        >
          {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </header>

      {/* MOBILE DRAWER */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-40 lg:hidden flex">
          <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-xs" onClick={() => setMobileMenuOpen(false)} />
          <div className="relative flex flex-col w-4/5 max-w-xs bg-white h-full shadow-2xl z-50">
            <div className="p-3 border-b border-gray-200 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <img src="/growlogonleaf.png" alt="Logo" className="w-7 h-auto" />
                <div>
                  <h2 className="text-sm font-bold text-gray-800">Grow Platform</h2>
                  <p className="text-[10px] text-indigo-600 font-semibold">System Owner</p>
                </div>
              </div>
              <button onClick={() => setMobileMenuOpen(false)} className="p-1 text-gray-400 hover:text-gray-600">
                <X className="h-4 w-4" />
              </button>
            </div>
            <nav className="flex-grow p-3 space-y-1 overflow-y-auto">
              <NavLinks />
            </nav>
            <div className="p-3 border-t border-gray-200 bg-gray-50">
              <button
                onClick={onLogout}
                className="w-full flex items-center justify-center p-2 text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 rounded-xl"
              >
                <LogOut className="h-3.5 w-3.5 mr-1.5" />
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DESKTOP SIDEBAR */}
      <aside className="hidden lg:flex w-64 bg-white/90 backdrop-blur-md shadow-sm border-r border-slate-200/80 flex-col flex-shrink-0 relative z-10">
        {/* Brand Header */}
        <div className="p-4 border-b border-slate-100 flex items-center gap-3">
          <img
            src="/growlogonleaf.png"
            alt="Grow Logo"
            className="w-8 h-auto"
          />
          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="text-sm font-black text-slate-900 tracking-tight">Treasury Engine</h1>
              <span className="text-[9px] font-bold bg-indigo-100 text-indigo-700 px-1.5 py-0.2 rounded-md">SO</span>
            </div>
            <p className="text-[10px] text-slate-400 font-medium">Enterprise Control Hub</p>
          </div>
        </div>

        {/* Categorized Navigation */}
        <nav className="flex-grow p-3 space-y-1 overflow-y-auto">
          <NavLinks />
        </nav>

        {/* Profile / Sign Out Footer */}
        <div className="p-3 border-t border-slate-100 flex-shrink-0 bg-slate-50/60">
          <div className="flex items-center justify-between mb-2 px-1">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-indigo-600 to-purple-600 text-white text-[11px] font-black flex items-center justify-center shadow-2xs">
                SO
              </div>
              <div>
                <p className="text-xs font-bold text-slate-800 leading-tight">Super Admin</p>
                <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  Authenticated
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={onLogout}
            className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 text-xs font-bold text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
          >
            <LogOut className="h-3.5 w-3.5" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 p-3 sm:p-4 lg:p-5 overflow-y-auto lg:overflow-hidden h-full flex flex-col relative z-10">
        <Outlet />
      </main>
    </div>
  );
}

export default SidebarLayout;
