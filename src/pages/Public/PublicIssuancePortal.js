// frontend/src/pages/Public/PublicIssuancePortal.js

import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Loader2, Mail, KeyRound, ShieldCheck, ArrowRight, ArrowLeft, Send } from 'lucide-react';
import { API_BASE_URL } from 'services/apiService';
import { toast } from 'react-toastify';
import { Helmet } from 'react-helmet-async';

export default function PublicIssuancePortal() {
  const navigate = useNavigate();

  const [step, setStep] = useState('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleVerifyDomain = async (e) => {
    e.preventDefault();
    if (!email || !email.includes('@')) {
      toast.error('Please enter a valid email address.');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/public-issuance/verify-domain`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.toLowerCase() })
      });

      const data = await response.json();
      if (!response.ok) {
        toast.error(data.detail || 'Unable to verify your organization.');
        return;
      }

      toast.success('Verification code sent to your email!');
      setStep('otp');
    } catch (err) {
      toast.error('Network error. Please check your connection.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (!otp || otp.length < 4) {
      toast.error('Please enter a valid verification code.');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/public-issuance/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.toLowerCase(), otp })
      });

      const data = await response.json();
      if (!response.ok) {
        toast.error(data.detail || 'Invalid or expired code.');
        return;
      }

      toast.success('Access granted! Redirecting to your dashboard...');
      navigate(`/public-issuance/dashboard?token=${encodeURIComponent(data.token)}`);
    } catch (err) {
      toast.error('Network error. Please check your connection.');
    } finally {
      setIsLoading(false);
    }
  };

  const inputCls = "w-full px-4 py-3 bg-white border border-gray-200 text-gray-900 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all placeholder-gray-400";

  return (
    <div className="min-h-screen flex" style={{ fontFamily: "'Inter', 'Segoe UI', sans-serif" }}>
      <Helmet>
        <title>LG Issuance Request Portal — Grow Business Development</title>
        <meta name="description" content="Submit LG issuance requests through the secure public portal. Verify your corporate email and access the issuance request form." />
      </Helmet>

      {/* Left Branding Panel */}
      <div className="hidden lg:flex lg:w-[45%] relative overflow-hidden flex-col justify-between p-10" style={{ backgroundColor: '#1e2a4a' }}>
        <div className="absolute top-0 right-0 w-80 h-80 rounded-full opacity-[0.05] bg-white -mr-40 -mt-40" />
        <div className="absolute bottom-0 left-0 w-60 h-60 rounded-full opacity-[0.05] bg-white -ml-30 -mb-30" />
        <div className="absolute top-1/2 right-1/4 w-32 h-32 rounded-full opacity-[0.03] bg-blue-400" />

        <div>
          <div className="flex items-center space-x-2 mb-16">
            <span className="text-xl font-bold text-white tracking-tight">Grow</span>
            <span className="text-xs text-blue-400 font-medium">Business Development</span>
          </div>

          <div className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium mb-6" style={{ backgroundColor: 'rgba(96,165,250,0.15)', color: '#93bbfc' }}>
            <Send className="w-3 h-3 mr-1.5" />
            LG Issuance Module
          </div>

          <h1 className="text-3xl xl:text-4xl font-extrabold text-white leading-[1.15] mb-4">
            Submit Issuance<br />
            <span style={{ color: '#60a5fa' }}>Requests Securely</span>
          </h1>
          <p className="text-gray-400 text-sm leading-relaxed max-w-sm">
            Use your corporate email to verify your identity and submit LG issuance requests directly to your organization's treasury team.
          </p>
        </div>

        <div className="space-y-4">
          {[
            { title: 'Email Verification', desc: 'Secure OTP-based access — no password required.' },
            { title: 'Smart Auto-Fill', desc: 'Returning users get pre-filled details from previous requests.' },
            { title: 'Real-Time Tracking', desc: 'Monitor the status of your submissions from your dashboard.' },
          ].map((item, i) => (
            <div key={i} className="flex items-start space-x-3 p-3 rounded-lg" style={{ backgroundColor: 'rgba(255,255,255,0.05)' }}>
              <ShieldCheck className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: '#60a5fa' }} />
              <div>
                <p className="text-xs font-semibold text-white">{item.title}</p>
                <p className="text-[11px] text-gray-500">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Right Form Panel */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 bg-gray-50">
        <div className="w-full max-w-md">

          {/* Mobile-only logo */}
          <div className="lg:hidden text-center mb-8">
            <span className="text-2xl font-bold text-gray-900">Grow</span>
            <span className="text-sm text-blue-600 font-medium ml-2">Business Development</span>
          </div>

          {/* Step 1: Email */}
          {step === 'email' && (
            <div className="space-y-6">
              <div className="text-center lg:text-left">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-blue-50 mb-4">
                  <Mail className="w-5 h-5 text-blue-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900">Issuance Request Portal</h2>
                <p className="text-sm text-gray-500 mt-1">Enter your corporate email to get started.</p>
              </div>

              <form onSubmit={handleVerifyDomain} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                    Corporate Email Address
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@yourcompany.com"
                    className={inputCls}
                    required
                    autoFocus
                  />
                  <p className="mt-1.5 text-xs text-gray-400">
                    We'll verify your organization and send a one-time code.
                  </p>
                </div>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full flex items-center justify-center py-3 px-4 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-md disabled:opacity-50"
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>Continue <ArrowRight className="ml-2 h-4 w-4" /></>
                  )}
                </button>
              </form>

              <div className="pt-5 border-t border-gray-200 flex items-center justify-center space-x-4 text-sm">
                <Link to="/" className="inline-flex items-center text-gray-400 hover:text-gray-800 transition-colors">
                  <ArrowLeft className="w-3 h-3 mr-1" /> Home
                </Link>
                <span className="text-gray-200">|</span>
                <Link to="/login" className="text-gray-400 hover:text-blue-600 transition-colors">
                  Sign In
                </Link>
              </div>
            </div>
          )}

          {/* Step 2: OTP */}
          {step === 'otp' && (
            <div className="space-y-6">
              <div className="text-center lg:text-left">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-green-50 mb-4">
                  <KeyRound className="w-5 h-5 text-green-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900">Verify Your Email</h2>
                <p className="text-sm text-gray-500 mt-1">
                  A code was sent to <span className="font-semibold text-gray-700">{email}</span>
                </p>
              </div>

              <form onSubmit={handleVerifyOtp} className="space-y-4">
                <div>
                  <input
                    type="text"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
                    placeholder="000000"
                    className="w-full py-4 border-2 border-blue-100 bg-blue-50/30 text-center text-3xl tracking-[0.5em] rounded-lg font-mono text-blue-900 focus:border-blue-500 focus:bg-white outline-none transition-all"
                    maxLength={6}
                    autoFocus
                  />
                </div>
                <button
                  type="submit"
                  disabled={isLoading || otp.length < 6}
                  className="w-full flex items-center justify-center py-3 px-4 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-md disabled:opacity-50"
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>Verify & Access Portal <ArrowRight className="ml-2 h-4 w-4" /></>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => { setStep('email'); setOtp(''); }}
                  className="w-full text-sm text-gray-400 hover:text-blue-600 transition-colors"
                >
                  ← Use a different email
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}