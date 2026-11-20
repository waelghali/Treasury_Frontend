import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShieldAlert, Mail, Phone, ArrowLeft } from 'lucide-react';
import GrowLogo from '../components/Common/GrowLogo';

function RenewalPage() {
  const navigate = useNavigate();

  return (
    <div
      className="min-h-screen relative overflow-hidden flex items-center justify-center px-4 py-12"
      style={{ fontFamily: "'Inter', 'Segoe UI', sans-serif", backgroundColor: '#1e2a4a' }}
    >
      {/* Decorative circles */}
      <div className="absolute top-0 right-0 w-96 h-96 rounded-full opacity-[0.04] bg-white -mr-48 -mt-48 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-72 h-72 rounded-full opacity-[0.04] bg-white -ml-36 -mb-36 pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center justify-center mb-2 hover:opacity-95 transition-opacity">
            <GrowLogo size="md" />
          </Link>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-2xl p-8 space-y-6 text-center">
          <div>
            <div className="mx-auto w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center mb-4">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <h1 className="text-xl font-bold text-slate-900">Account Expired</h1>
            <p className="text-sm text-slate-600 mt-2">
              Your subscription has expired and access to the platform has been disabled.
            </p>
            <p className="text-xs text-slate-500 mt-2 leading-relaxed">
              To regain access and continue using the service, please contact our sales team to renew your subscription.
            </p>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-left space-y-2.5">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">Contact Information</h2>
            <div className="flex items-center gap-2.5 text-sm font-medium text-slate-700">
              <Mail className="w-4 h-4 text-slate-400 shrink-0" />
              <span>info@growbusinessdevelopment.com</span>
            </div>
            <div className="flex items-center gap-2.5 text-sm font-medium text-slate-700">
              <Phone className="w-4 h-4 text-slate-400 shrink-0" />
              <span>+20 120 055 7551</span>
            </div>
          </div>

          <div>
            <button
              onClick={() => navigate('/login', { replace: true })}
              className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 border border-transparent shadow-md text-sm font-semibold rounded-xl text-white bg-blue-600 hover:bg-blue-700 transition-colors duration-200"
            >
              <ArrowLeft className="w-4 h-4" />
              Return to Login
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default RenewalPage;