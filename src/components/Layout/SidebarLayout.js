// src/components/SidebarLayout.js
import React, { useState, useEffect } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { Home, Users, Briefcase, Settings, FileText, BarChart, LogOut, DollarSign, List, Gavel, File, HardDrive, LayoutDashboard, Clock, BookOpen, UserPlus, Menu, X, MessageSquare } from 'lucide-react';

function SidebarLayout({ onLogout, headerTitle }) {
  const [showGlobalConfigSubMenu, setShowGlobalConfigSubMenu] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    if (location.pathname.startsWith('/system-owner/global-configurations')) {
      setShowGlobalConfigSubMenu(true);
    }
    setMobileMenuOpen(false); // Close mobile drawer on route change
  }, [location.pathname]);

  // A helper to determine if a link is active for highlighting
  const isLinkActive = (path) => location.pathname.startsWith(path);

  const NavLinks = () => (
    <>
      <Link
        to="/system-owner/dashboard"
        onClick={() => setMobileMenuOpen(false)}
        className={`flex items-center py-2 px-3 rounded-lg transition-colors duration-200 ${isLinkActive('/system-owner/dashboard') ? 'bg-blue-100 text-blue-700 font-semibold' : 'text-gray-700 hover:bg-gray-100'}`}
      >
        <Home className="h-5 w-5 mr-3" />
        Dashboard
      </Link>

      <Link
        to="/system-owner/subscription-plans"
        onClick={() => setMobileMenuOpen(false)}
        className={`flex items-center py-2 px-3 rounded-lg transition-colors duration-200 ${isLinkActive('/system-owner/subscription-plans') ? 'bg-blue-100 text-blue-700 font-semibold' : 'text-gray-700 hover:bg-gray-100'}`}
      >
        <Briefcase className="h-5 w-5 mr-3" />
        Subscription Plans
      </Link>

      {/* Main Customer Management Link */}
      <Link
        to="/system-owner/customers"
        onClick={() => setMobileMenuOpen(false)}
        className={`flex items-center py-2 px-3 rounded-lg transition-colors duration-200 ${isLinkActive('/system-owner/customers') && !isLinkActive('/system-owner/customers/trial-registrations') ? 'bg-blue-100 text-blue-700 font-semibold' : 'text-gray-700 hover:bg-gray-100'}`}
      >
        <Users className="h-5 w-5 mr-3" />
        Customer Management
      </Link>

      {/* Trial Registrations Sub-Link */}
      <Link
        to="/system-owner/customers/trial-registrations"
        onClick={() => setMobileMenuOpen(false)}
        className={`flex items-center py-2 px-3 rounded-lg transition-colors duration-200 ml-6 ${isLinkActive('/system-owner/customers/trial-registrations') ? 'bg-blue-50 text-blue-600 font-medium' : 'text-gray-600 hover:bg-gray-50'}`}
      >
        <UserPlus className="h-4 w-4 mr-2" />
        Trial Registrations
      </Link>

      <Link
        to="/system-owner/system-notifications"
        onClick={() => setMobileMenuOpen(false)}
        className={`flex items-center py-2 px-3 rounded-lg transition-colors duration-200 ${isLinkActive('/system-owner/system-notifications') ? 'bg-blue-100 text-blue-700 font-semibold' : 'text-gray-700 hover:bg-gray-100'}`}
      >
        <Settings className="h-5 w-5 mr-3" />
        System Notifications
      </Link>
      <Link
        to="/system-owner/scheduler"
        onClick={() => setMobileMenuOpen(false)}
        className={`flex items-center py-2 px-3 rounded-lg transition-colors duration-200 ${isLinkActive('/system-owner/scheduler') ? 'bg-blue-100 text-blue-700 font-semibold' : 'text-gray-700 hover:bg-gray-100'}`}
      >
        <Clock className="h-5 w-5 mr-3" />
        Scheduler
      </Link>

      <Link
        to="/system-owner/bank-forms"
        onClick={() => setMobileMenuOpen(false)}
        className={`flex items-center py-2 px-3 rounded-lg transition-colors duration-200 ${isLinkActive('/system-owner/bank-forms') ? 'bg-blue-100 text-blue-700 font-semibold' : 'text-gray-700 hover:bg-gray-100'}`}
      >
        <File className="h-5 w-5 mr-3" />
        Bank Forms
      </Link>

      <div>
        <button
          onClick={() => setShowGlobalConfigSubMenu(!showGlobalConfigSubMenu)}
          className={`flex items-center justify-between w-full p-3 rounded-lg transition-colors duration-200 ${isLinkActive('/system-owner/global-configurations') ? 'bg-blue-100 text-blue-700 font-semibold' : 'text-gray-700 hover:bg-gray-100'}`}
        >
          <span className="flex items-center">
            <Settings className="h-5 w-5 mr-3" />
            Global Configurations
          </span>
          <svg
            className={`w-4 h-4 transform ${showGlobalConfigSubMenu ? 'rotate-90' : 'rotate-0'} transition-transform`}
            fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path>
          </svg>
        </button>
        {showGlobalConfigSubMenu && (
          <div className="ml-6 mt-1 space-y-1">
            <Link
              to="/system-owner/global-configurations"
              onClick={() => setMobileMenuOpen(false)}
              className={`flex items-center py-2 px-3 rounded-lg transition-colors duration-200 ${isLinkActive('/system-owner/global-configurations') && !isLinkActive('/system-owner/global-configurations/common-list') && !isLinkActive('/system-owner/global-configurations/templates')
                  ? 'bg-blue-50 text-blue-600 font-medium' : 'text-gray-600 hover:bg-gray-50'}`}
            >
              <LayoutDashboard className="h-4 w-4 mr-2" />
              Ranges Settings
            </Link>
            <Link
              to="/system-owner/global-configurations/common-list/banks"
              onClick={() => setMobileMenuOpen(false)}
              className={`flex items-center py-2 px-3 rounded-lg transition-colors duration-200 ${isLinkActive('/system-owner/global-configurations/common-list/banks') ? 'bg-blue-50 text-blue-600 font-medium' : 'text-gray-600 hover:bg-gray-50'}`}
            >
              <HardDrive className="h-4 w-4 mr-2" />
              Banks
            </Link>
            <Link
              to="/system-owner/global-configurations/common-list/currencies"
              onClick={() => setMobileMenuOpen(false)}
              className={`flex items-center py-2 px-3 rounded-lg transition-colors duration-200 ${isLinkActive('/system-owner/global-configurations/common-list/currencies') ? 'bg-blue-50 text-blue-600 font-medium' : 'text-gray-600 hover:bg-gray-50'}`}
            >
              <DollarSign className="h-4 w-4 mr-2" />
              Currencies
            </Link>
            <Link
              to="/system-owner/global-configurations/common-list/lg-types"
              onClick={() => setMobileMenuOpen(false)}
              className={`flex items-center py-2 px-3 rounded-lg transition-colors duration-200 ${isLinkActive('/system-owner/global-configurations/common-list/lg-types') ? 'bg-blue-50 text-blue-600 font-medium' : 'text-gray-600 hover:bg-gray-50'}`}
            >
              <List className="h-4 w-4 mr-2" />
              LG Types
            </Link>
            <Link
              to="/system-owner/global-configurations/common-list/rules"
              onClick={() => setMobileMenuOpen(false)}
              className={`flex items-center py-2 px-3 rounded-lg transition-colors duration-200 ${isLinkActive('/system-owner/global-configurations/common-list/rules') ? 'bg-blue-50 text-blue-600 font-medium' : 'text-gray-600 hover:bg-gray-50'}`}
            >
              <Gavel className="h-4 w-4 mr-2" />
              Rules
            </Link>
            <Link
              to="/system-owner/global-configurations/common-list/issuing-methods"
              onClick={() => setMobileMenuOpen(false)}
              className={`flex items-center py-2 px-3 rounded-lg transition-colors duration-200 ${isLinkActive('/system-owner/global-configurations/common-list/issuing-methods') ? 'bg-blue-50 text-blue-600 font-medium' : 'text-gray-600 hover:bg-gray-50'}`}
            >
              <File className="h-4 w-4 mr-2" />
              Issuing Methods
            </Link>
            <Link
              to="/system-owner/global-configurations/common-list/lg-statuses"
              onClick={() => setMobileMenuOpen(false)}
              className={`flex items-center py-2 px-3 rounded-lg transition-colors duration-200 ${isLinkActive('/system-owner/global-configurations/common-list/lg-statuses') ? 'bg-blue-50 text-blue-600 font-medium' : 'text-gray-600 hover:bg-gray-50'}`}
            >
              <List className="h-4 w-4 mr-2" />
              LG Statuses
            </Link>
            <Link
              to="/system-owner/global-configurations/common-list/lg-operational-statuses"
              onClick={() => setMobileMenuOpen(false)}
              className={`flex items-center py-2 px-3 rounded-lg transition-colors duration-200 ${isLinkActive('/system-owner/global-configurations/common-list/lg-operational-statuses') ? 'bg-blue-50 text-blue-600 font-medium' : 'text-gray-600 hover:bg-gray-50'}`}
            >
              <LayoutDashboard className="h-4 w-4 mr-2" />
              LG Operational Statuses
            </Link>
            <Link
              to="/system-owner/global-configurations/templates"
              onClick={() => setMobileMenuOpen(false)}
              className={`flex items-center py-2 px-3 rounded-lg transition-colors duration-200 ${isLinkActive('/system-owner/global-configurations/templates') ? 'bg-blue-50 text-blue-600 font-medium' : 'text-gray-600 hover:bg-gray-50'}`}
            >
              <FileText className="h-4 w-4 mr-2" />
              Templates
            </Link>
          </div>
        )}
      </div>

      <Link
        to="/system-owner/lg-categories/universal"
        onClick={() => setMobileMenuOpen(false)}
        className={`flex items-center py-2 px-3 rounded-lg transition-colors duration-200 ${isLinkActive('/system-owner/lg-categories/universal') ? 'bg-blue-100 text-blue-700 font-semibold' : 'text-gray-700 hover:bg-gray-100'}`}
      >
        <BookOpen className="h-5 w-5 mr-3" />
        Universal Categories
      </Link>

      <Link
        to="/system-owner/feedback"
        onClick={() => setMobileMenuOpen(false)}
        className={`flex items-center py-2 px-3 rounded-lg transition-colors duration-200 ${isLinkActive('/system-owner/feedback') ? 'bg-purple-100 text-purple-700 font-semibold' : 'text-gray-700 hover:bg-gray-100'}`}
      >
        <MessageSquare className="h-5 w-5 mr-3 text-purple-600" />
        User Feedback
      </Link>

      <Link
        to="/system-owner/audit-logs"
        onClick={() => setMobileMenuOpen(false)}
        className={`flex items-center py-2 px-3 rounded-lg transition-colors duration-200 ${isLinkActive('/system-owner/audit-logs') ? 'bg-blue-100 text-blue-700 font-semibold' : 'text-gray-700 hover:bg-gray-100'}`}
      >
        <FileText className="h-5 w-5 mr-3" />
        Audit Logs
      </Link>

      <Link
        to="/system-owner/reports"
        onClick={() => setMobileMenuOpen(false)}
        className={`flex items-center py-2 px-3 rounded-lg transition-colors duration-200 ${isLinkActive('/system-owner/reports') ? 'bg-blue-100 text-blue-700 font-semibold' : 'text-gray-700 hover:bg-gray-100'}`}
      >
        <BarChart className="h-5 w-5 mr-3" />
        Reports
      </Link>
    </>
  );

  return (
    <div className="relative flex flex-col lg:flex-row h-screen bg-[#f8fafc] overflow-hidden">
      {/* BACKGROUND BLOBS & ORBS */}
      <div className="fixed top-[-10%] right-[-5%] w-[500px] h-[500px] bg-blue-500 rounded-full blur-[140px] opacity-20 animate-pulse pointer-events-none"></div>
      <div className="fixed bottom-[-10%] left-[-5%] w-[500px] h-[500px] bg-blue-700 rounded-full blur-[140px] opacity-20 animate-pulse pointer-events-none" style={{ animationDelay: '3s' }}></div>

      {/* MOBILE TOPBAR */}
      <header className="lg:hidden flex items-center justify-between px-4 py-3 bg-white/90 backdrop-blur-md border-b border-gray-200 z-30 shrink-0">
        <div className="flex items-center space-x-2">
          <img src="/growlogonleaf.png" alt="Logo" className="w-7 h-auto" />
          <div>
            <h1 className="text-sm font-bold text-gray-800 leading-tight">Treasury Platform</h1>
            <span className="text-[10px] bg-blue-100 text-blue-800 font-semibold px-2 py-0.5 rounded-full">System Owner</span>
          </div>
        </div>
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          aria-label="Toggle Menu"
        >
          {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </header>

      {/* MOBILE DRAWER */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-40 lg:hidden flex">
          <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm transition-opacity" onClick={() => setMobileMenuOpen(false)} />
          <div className="relative flex flex-col w-4/5 max-w-xs bg-white h-full shadow-2xl z-50">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <img src="/growlogonleaf.png" alt="Logo" className="w-8 h-auto" />
                <div>
                  <h2 className="text-base font-bold text-gray-800">Treasury Platform</h2>
                  <p className="text-xs text-blue-600 font-medium">System Owner Portal</p>
                </div>
              </div>
              <button onClick={() => setMobileMenuOpen(false)} className="p-1 rounded-lg text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav className="flex-grow p-4 space-y-1.5 overflow-y-auto">
              <NavLinks />
            </nav>
            <div className="p-4 border-t border-gray-200 bg-gray-50">
              <div className="flex items-center mb-3">
                <span className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-blue-600 text-white text-xs font-bold">
                  SO
                </span>
                <div className="ml-2.5">
                  <p className="text-xs font-semibold text-gray-800">System Owner</p>
                  <p className="text-[11px] text-gray-500">Super Admin</p>
                </div>
              </div>
              <button
                onClick={onLogout}
                className="w-full flex items-center justify-center p-2.5 text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DESKTOP SIDEBAR */}
      <aside className="hidden lg:flex w-72 bg-white/80 backdrop-blur-md shadow-lg border-r border-gray-200 flex-col flex-shrink-0 relative z-10">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-center space-x-2">
            <img
              src="/growlogonleaf.png"
              alt="Grow BD Logo"
              style={{ width: '80px', height: 'auto' }}
            />
            <h1 className="text-xl font-bold text-gray-800">Treasury Platform</h1>
          </div>
          <p className="text-sm text-gray-500 text-center mt-1">Enterprise Edition</p>
        </div>

        <nav className="flex-grow p-4 space-y-2 overflow-y-auto">
          <NavLinks />
        </nav>

        <div className="p-4 border-t border-gray-200 flex-shrink-0">
          <div className="flex items-center mb-3">
            <span className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-blue-500 text-white text-sm font-semibold">
              SO
            </span>
            <div className="ml-3">
              <p className="text-sm font-semibold text-gray-800">System Owner</p>
              <p className="text-xs text-gray-500">Admin</p>
            </div>
          </div>
          <button
            onClick={onLogout}
            className="w-full flex items-center justify-center p-3 text-red-600 hover:bg-red-50 rounded-lg transition-colors duration-200 font-medium"
          >
            <LogOut className="h-5 w-5 mr-2" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 p-3 sm:p-4 lg:p-5 overflow-y-auto lg:overflow-hidden h-full flex flex-col relative z-10">
        <Outlet />
      </main>

      <style dangerouslySetInnerHTML={{
        __html: `
        @keyframes float { 0%, 100% { transform: translateY(0) scale(1); } 50% { transform: translateY(-40px) scale(1.05); } }
        @keyframes float-delayed { 0%, 100% { transform: translateY(0) scale(1.05); } 50% { transform: translateY(40px) scale(1); } }
        .animate-float { animation: float 10s ease-in-out infinite; }
        .animate-float-delayed { animation: float-delayed 12s ease-in-out infinite; }
      `}} />
    </div>
  );
}

export default SidebarLayout;