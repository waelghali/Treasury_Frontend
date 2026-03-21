import React, { useState } from 'react';
import { setAuthToken, API_BASE_URL } from 'services/apiService';
import { useNavigate, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { v4 as uuidv4 } from 'uuid'; 
import { ArrowLeft, Loader2, Shield } from 'lucide-react';

function LoginPage({ onLoginSuccess }) {
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const [showMfa, setShowMfa] = useState(false);
  const [mfaCode, setMfaCode] = useState('');
  const [mfaSessionToken, setMfaSessionToken] = useState('');
  const [rememberMe, setRememberMe] = useState(false);

  const getOrCreateDeviceId = () => {
    let deviceId = localStorage.getItem('device_id');
    if (!deviceId) {
      deviceId = uuidv4();
      localStorage.setItem('device_id', deviceId);
    }
    return deviceId;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email,
          password: password,
          device_id: getOrCreateDeviceId(),
          remember_me: rememberMe,
          device_name: navigator.userAgent.split(') ')[0] || "Web Browser"
        }),
      });

      const data = await response.json();

      if (response.ok) {
        if (data.access_token) {
          setAuthToken(data.access_token);
          onLoginSuccess(data);
        } else if (data.status === "MFA_REQUIRED") {
          setMfaSessionToken(data.mfa_session_token);
          setShowMfa(true);
        }
      } else if (data.status === "MFA_REQUIRED") {
        setMfaSessionToken(data.mfa_session_token);
        setShowMfa(true);
      } else {
        const errorMsg = typeof data.detail === 'object' 
          ? (Array.isArray(data.detail) ? data.detail[0].msg : JSON.stringify(data.detail))
          : data.detail;
        setError(errorMsg || 'Login failed. Please try again.');
      }
    } catch (err) {
      setError('A network error occurred. Please check your connection.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleMfaVerify = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/verify-mfa`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email,
          mfa_code: mfaCode,
          device_id: getOrCreateDeviceId(),
          mfa_session_token: mfaSessionToken,
          remember_me: rememberMe
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setAuthToken(data.access_token);
        onLoginSuccess(data);
      } else {
        setError(data.detail || 'Invalid verification code.');
        setMfaCode('');
      }
    } catch (err) {
      setError('Verification failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const [resendTimer, setResendTimer] = useState(0);

  React.useEffect(() => {
    let interval;
    if (resendTimer > 0) {
      interval = setInterval(() => setResendTimer((prev) => prev - 1), 1000);
    }
    return () => clearInterval(interval);
  }, [resendTimer]);

  const handleResendCode = async () => {
    if (resendTimer > 0) return;
    setError('');
    
    try {
      const response = await fetch(`${API_BASE_URL}/resend-mfa`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email,
          mfa_session_token: mfaSessionToken,
          device_id: getOrCreateDeviceId(),
          mfa_code: ""
        }),
      });

      if (response.ok) {
        setResendTimer(180);
        setMfaCode('');
      } else {
        const data = await response.json();
        setError(data.detail || "Failed to resend code.");
      }
    } catch (err) {
      setError("Network error. Could not resend code.");
    }
  };

  const inputCls = "block w-full px-4 py-3 bg-white border border-gray-200 text-gray-900 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all placeholder-gray-400";

  return (
    <div className="min-h-screen flex" style={{ fontFamily: "'Inter', 'Segoe UI', sans-serif" }}>
      <Helmet>
        <title>Sign In — Grow LG Management Platform</title>
        <meta name="description" content="Sign in to your Grow account to manage LG custody, issuance workflows, and treasury operations." />
      </Helmet>

      {/* Left Branding Panel */}
      <div className="hidden lg:flex lg:w-[45%] relative overflow-hidden flex-col justify-between p-10" style={{ backgroundColor: '#1e2a4a' }}>
        {/* Decorative circles */}
        <div className="absolute top-0 right-0 w-80 h-80 rounded-full opacity-[0.05] bg-white -mr-40 -mt-40" />
        <div className="absolute bottom-0 left-0 w-60 h-60 rounded-full opacity-[0.05] bg-white -ml-30 -mb-30" />
        <div className="absolute top-1/2 right-1/4 w-32 h-32 rounded-full opacity-[0.03] bg-blue-400" />

        <div>
          <div className="flex items-center space-x-2 mb-16">
            <span className="text-xl font-bold text-white tracking-tight">Grow</span>
            <span className="text-xs text-blue-400 font-medium">Business Development</span>
          </div>
          
          <h1 className="text-3xl xl:text-4xl font-extrabold text-white leading-[1.15] mb-4">
            Welcome Back to<br />
            <span style={{ color: '#60a5fa' }}>Your LG Command Center</span>
          </h1>
          <p className="text-gray-400 text-sm leading-relaxed max-w-sm">
            Track custody, automate issuance, and stay in control — all on one unified platform built by treasurers.
          </p>
        </div>

        <div className="space-y-4">
          {[
            { title: 'Bank-Grade Security', desc: 'ISO 27001 certified vault for sensitive documents.' },
            { title: 'AI-Powered Extraction', desc: 'Capture LG details from any document in seconds.' },
            { title: 'Always in Control', desc: 'Proactive alerts and full audit trail coverage.' },
          ].map((item, i) => (
            <div key={i} className="flex items-start space-x-3 p-3 rounded-lg" style={{ backgroundColor: 'rgba(255,255,255,0.05)' }}>
              <Shield className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: '#60a5fa' }} />
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
        <div className="w-full max-w-md space-y-6">
          
          {/* Mobile-only logo */}
          <div className="lg:hidden text-center mb-4">
            <span className="text-2xl font-bold text-gray-900">Grow</span>
            <span className="text-sm text-blue-600 font-medium ml-2">Business Development</span>
          </div>

          <div className="text-center lg:text-left">
            <h2 className="text-2xl font-bold text-gray-900">
              {showMfa ? 'Verify Security' : 'Sign In'}
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              {showMfa ? 'A verification code has been sent to your email' : 'Enter your credentials to access the platform'}
            </p>
          </div>

          {error && (
            <div className="bg-red-50 border-l-4 border-red-500 text-red-700 px-4 py-3 rounded-r-lg text-sm font-medium" role="alert">
              {error}
            </div>
          )}

          {!showMfa ? (
            <form className="space-y-5" onSubmit={handleSubmit}>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Email Address</label>
                <input
                  type="email"
                  required
                  className={inputCls}
                  placeholder="name@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Password</label>
                <input
                  type="password"
                  required
                  className={inputCls}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg shadow-md transition-all disabled:opacity-50 flex items-center justify-center"
                disabled={isLoading}
              >
                {isLoading ? (
                  <><Loader2 className="animate-spin h-4 w-4 mr-2" /> Signing In...</>
                ) : 'Sign In'}
              </button>
            </form>
          ) : (
            <form className="space-y-4" onSubmit={handleMfaVerify}>
              <div className="text-center">
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Enter 6-Digit Code</label>
                <input
                  type="text"
                  maxLength="6"
                  required
                  autoFocus
                  className="w-full py-4 border-2 border-blue-100 bg-blue-50/30 text-center text-3xl font-mono tracking-[0.4em] text-blue-900 rounded-lg focus:border-blue-500 focus:bg-white outline-none transition-all"
                  placeholder="000000"
                  value={mfaCode}
                  onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, ''))}
                />
              </div>
              <div className="flex items-center px-1">
                <input
                  id="remember-me"
                  type="checkbox"
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded cursor-pointer"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                />
                <label htmlFor="remember-me" className="ml-2 text-sm text-gray-500 cursor-pointer">
                  Trust this device in the future
                </label>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-500 mb-1.5">Didn't receive the code?</p>
                <button
                  type="button"
                  onClick={handleResendCode}
                  disabled={resendTimer > 0 || isLoading}
                  className={`text-xs font-bold uppercase tracking-widest transition-colors ${
                    resendTimer > 0 ? 'text-gray-300 cursor-not-allowed' : 'text-blue-600 hover:text-blue-800'
                  }`}
                >
                  {resendTimer > 0 ? `Resend Code in ${resendTimer}s` : 'Resend New Code'}
                </button>
              </div>
              <button
                type="submit"
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg shadow-md transition-all disabled:opacity-50"
                disabled={isLoading || mfaCode.length < 6}
              >
                {isLoading ? 'Verifying...' : 'Verify & Access Platform'}
              </button>

              <button 
                type="button" 
                onClick={() => { setShowMfa(false); setError(''); setMfaCode(''); }}
                className="w-full text-xs font-semibold text-gray-400 hover:text-blue-600 transition-colors uppercase tracking-wider"
              >
                Back to Sign In
              </button>
            </form>
          )}

          <div className="pt-5 border-t border-gray-200 flex flex-col items-center space-y-3">
            <Link to="/forgot-password" className="text-sm font-semibold text-blue-600 hover:text-blue-800 transition-colors">
              Forgot Password?
            </Link>
            <Link to="/" className="inline-flex items-center text-xs font-medium text-gray-400 hover:text-gray-800 transition-colors">
              <ArrowLeft className="w-3 h-3 mr-1" /> Back to Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;