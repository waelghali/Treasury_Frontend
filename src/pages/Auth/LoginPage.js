import React, { useState, useEffect, useCallback, useRef } from 'react';
import { setAuthToken, API_BASE_URL } from 'services/apiService';
import { Link, useSearchParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { v4 as uuidv4 } from 'uuid'; 
import { ArrowLeft, Loader2, Shield, Fingerprint, BellRing, KeyRound, CheckCircle2 } from 'lucide-react';
import HoneypotField from '../../components/Security/HoneypotField';
import {
  isBiometricSupported,
  getBiometricDisplayLabel,
  getStoredBiometricInfo,
  clearStoredBiometricInfo,
  fetchBiometricAuthOptions,
  authenticateWithBiometric,
  fetchBiometricRegistrationOptions,
  enrollBiometricWithOptions,
} from '../../services/biometricService';

function LoginPage({ onLoginSuccess }) {
  const [searchParams] = useSearchParams();
  const nextPath = searchParams.get('next');
  const emailInputRef = useRef(null);
  const passwordInputRef = useRef(null);

  const storedBio = getStoredBiometricInfo();
  const [email, setEmail] = useState(storedBio.email || '');
  const [password, setPassword] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [error, setError] = useState('');
  const [infoPrompt, setInfoPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const [showMfa, setShowMfa] = useState(false);
  const [mfaCode, setMfaCode] = useState('');
  const [mfaSessionToken, setMfaSessionToken] = useState('');
  const [rememberMe, setRememberMe] = useState(false);

  // Biometric (Face ID / Touch ID / Fingerprint) state
  const [bioAvailable, setBioAvailable] = useState(() => isBiometricSupported());
  const [hasPairedBio, setHasPairedBio] = useState(() => storedBio.hasBiometric);
  const [pairedBioEmail, setPairedBioEmail] = useState(() => storedBio.email || '');
  const [preloadedBioOptions, setPreloadedBioOptions] = useState(null);
  const [isBioLoading, setIsBioLoading] = useState(false);
  const [showPasswordForm, setShowPasswordForm] = useState(() => !storedBio.hasBiometric);

  // Post-login Biometric Activation state (when user clicks "Sign In & Enable Fingerprint / Face ID")
  const [enrollBioAfterLogin, setEnrollBioAfterLogin] = useState(false);
  const [pendingLoginData, setPendingLoginData] = useState(null);
  const [pendingBioRegOptions, setPendingBioRegOptions] = useState(null);

  const getOrCreateDeviceId = () => {
    let deviceId = localStorage.getItem('device_id');
    if (!deviceId) {
      deviceId = uuidv4();
      localStorage.setItem('device_id', deviceId);
    }
    return deviceId;
  };

  const handleBiometricLogin = useCallback(async (optsOverride = null, silentOnCancel = false) => {
    if (!isBiometricSupported()) return;
    setError('');
    setIsBioLoading(true);
    try {
      const data = await authenticateWithBiometric(optsOverride || preloadedBioOptions, {
        email: email || pairedBioEmail,
      });
      if (data && data.access_token) {
        setAuthToken(data.access_token);
        onLoginSuccess(data);
      }
    } catch (err) {
      const isCancel =
        err?.name === 'NotAllowedError' ||
        err?.name === 'AbortError' ||
        (err?.message || '').toLowerCase().includes('cancel');
      setShowPasswordForm(true);
      if (!silentOnCancel && !isCancel) {
        setError(err?.message || 'Biometric sign-in failed. Please sign in with your password below.');
      }
      // Refresh preloaded challenge token so the next tap works immediately
      try {
        const freshOpts = await fetchBiometricAuthOptions({ email: email || pairedBioEmail });
        setPreloadedBioOptions(freshOpts);
      } catch {}
    } finally {
      setIsBioLoading(false);
    }
  }, [preloadedBioOptions, email, pairedBioEmail, onLoginSuccess]);

  // Pre-load WebAuthn challenge on mount & auto-prompt when arriving from a notification on a paired phone
  useEffect(() => {
    if (!isBiometricSupported()) {
      setBioAvailable(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const opts = await fetchBiometricAuthOptions({ email: storedBio.email });
        if (cancelled) return;
        setPreloadedBioOptions(opts);
        if (opts.has_registered_credentials) {
          setHasPairedBio(true);
          setShowPasswordForm(false);
          if (opts.user_email) {
            setPairedBioEmail(opts.user_email);
            setEmail((prev) => prev || opts.user_email);
          }
          // If opened via a notification deep-link (?next=...), attempt immediate biometric prompt
          if (nextPath) {
            handleBiometricLogin(opts, true);
          }
        }
      } catch {
        // Ignore background pre-fetch error; button will fetch on demand if clicked
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const completeLoginWithOptionalBiometric = async (loginData, shouldEnrollBiometric) => {
    setAuthToken(loginData.access_token);
    if (!shouldEnrollBiometric || !isBiometricSupported()) {
      onLoginSuccess(loginData);
      return;
    }
    try {
      const regOpts = await fetchBiometricRegistrationOptions(loginData.access_token);
      try {
        await enrollBiometricWithOptions(regOpts);
        onLoginSuccess(loginData);
      } catch (bioErr) {
        // Browser may require a direct tap gesture after the login network call (e.g., iOS Safari)
        setPendingLoginData(loginData);
        setPendingBioRegOptions(regOpts);
      }
    } catch {
      onLoginSuccess(loginData);
    }
  };

  const handleConfirmPendingBiometric = async () => {
    if (!pendingBioRegOptions || !pendingLoginData) return;
    setIsBioLoading(true);
    setError('');
    try {
      await enrollBiometricWithOptions(pendingBioRegOptions);
      onLoginSuccess(pendingLoginData);
    } catch (err) {
      setError(err?.message || 'Could not activate biometrics. You can skip to continue to the platform.');
    } finally {
      setIsBioLoading(false);
    }
  };

  const performPasswordLogin = async (shouldEnrollBiometric = false) => {
    setError('');
    setInfoPrompt('');
    setIsLoading(true);
    setEnrollBioAfterLogin(shouldEnrollBiometric);

    try {
      // Prevent browser autofill false positive if browser populated honeypot with the user's email
      const safeWebsiteUrl = (websiteUrl && email && websiteUrl.trim().toLowerCase() === email.trim().toLowerCase())
        ? ''
        : websiteUrl;

      const response = await fetch(`${API_BASE_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email,
          password: password,
          device_id: getOrCreateDeviceId(),
          remember_me: rememberMe || shouldEnrollBiometric,
          device_name: navigator.userAgent.split(') ')[0] || "Web Browser",
          website_url: safeWebsiteUrl,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        if (data.access_token) {
          await completeLoginWithOptionalBiometric(data, shouldEnrollBiometric);
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    await performPasswordLogin(enrollBioAfterLogin);
  };

  const handleEnableBiometricClick = async () => {
    setError('');
    if (!email.trim()) {
      setInfoPrompt(`Enter your email and password above, then click "Sign In & Enable ${getBiometricDisplayLabel()}" to activate one-tap biometric login on this device.`);
      emailInputRef.current?.focus();
      return;
    }
    if (!password) {
      setInfoPrompt(`Enter your password above, then click "Sign In & Enable ${getBiometricDisplayLabel()}" to activate one-tap biometric login on this device.`);
      passwordInputRef.current?.focus();
      return;
    }
    await performPasswordLogin(true);
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
          remember_me: rememberMe || enrollBioAfterLogin
        }),
      });

      const data = await response.json();

      if (response.ok) {
        await completeLoginWithOptionalBiometric(data, enrollBioAfterLogin);
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

          {infoPrompt && !error && (
            <div className="bg-blue-50 border-l-4 border-blue-500 text-blue-800 px-4 py-3 rounded-r-lg text-xs font-medium leading-relaxed" role="status">
              {infoPrompt}
            </div>
          )}

          {pendingLoginData && pendingBioRegOptions ? (
            <div className="p-6 rounded-2xl bg-white border border-blue-200 shadow-lg space-y-4 text-center">
              <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center mx-auto shadow-md">
                <Fingerprint className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900">
                  Activate {getBiometricDisplayLabel()}
                </h3>
                <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                  You are signed in as <strong>{email}</strong>. Tap below to link your {getBiometricDisplayLabel()} so you can unlock Grow in one tap next time.
                </p>
              </div>
              <button
                type="button"
                onClick={handleConfirmPendingBiometric}
                disabled={isBioLoading}
                className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isBioLoading ? (
                  <><Loader2 className="animate-spin h-4 w-4" /> Waiting for {getBiometricDisplayLabel()}...</>
                ) : (
                  <><Fingerprint className="h-4 w-4" /> Activate {getBiometricDisplayLabel()} Now</>
                )}
              </button>
              <button
                type="button"
                onClick={() => onLoginSuccess(pendingLoginData)}
                className="w-full py-2 text-xs font-semibold text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
              >
                Skip for now &amp; continue to Dashboard
              </button>
            </div>
          ) : !showMfa ? (
            <div className="space-y-5">
              {/* AFTER BIOMETRICS ENABLED: Clean, single-focus Biometric Sign-In Card */}
              {bioAvailable && hasPairedBio && (
                <div className="p-5 rounded-2xl bg-white border border-blue-200 space-y-4 shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                      {nextPath ? <BellRing className="w-5 h-5" /> : <Fingerprint className="w-5 h-5" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <p className="text-sm font-bold text-gray-900">
                          {nextPath ? 'Mobile Alert Quick Unlock' : 'Biometric Sign-In Ready'}
                        </p>
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      </div>
                      <p className="text-xs text-gray-500 truncate">
                        {pairedBioEmail ? pairedBioEmail : 'Verified device'}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleBiometricLogin(preloadedBioOptions, false)}
                    disabled={isBioLoading || isLoading}
                    className="w-full py-3.5 px-4 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl shadow-md transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {isBioLoading ? (
                      <>
                        <Loader2 className="animate-spin h-4 w-4" />
                        <span>Verifying {getBiometricDisplayLabel()}...</span>
                      </>
                    ) : (
                      <>
                        <Fingerprint className="h-4 w-4" />
                        <span>Sign In with {getBiometricDisplayLabel()}</span>
                      </>
                    )}
                  </button>

                  <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-xs">
                    <button
                      type="button"
                      onClick={() => setShowPasswordForm((prev) => !prev)}
                      className="font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
                    >
                      <KeyRound className="w-3.5 h-3.5" />
                      <span>{showPasswordForm ? 'Hide password form' : 'Use password instead'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        clearStoredBiometricInfo();
                        setHasPairedBio(false);
                        setShowPasswordForm(true);
                      }}
                      className="text-gray-400 hover:text-gray-600 font-medium cursor-pointer"
                    >
                      Switch account
                    </button>
                  </div>
                </div>
              )}

              {/* PASSWORD FORM: Shown by default BEFORE biometrics are enabled, or when toggled */}
              {(!hasPairedBio || showPasswordForm) && (
                <form className="space-y-5" onSubmit={handleSubmit}>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Email Address</label>
                    <input
                      ref={emailInputRef}
                      type="email"
                      name="email"
                      autoComplete="username"
                      required
                      className={inputCls}
                      placeholder="name@company.com"
                      value={email}
                      onChange={(e) => { setEmail(e.target.value); if (infoPrompt) setInfoPrompt(''); }}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Password</label>
                    <input
                      ref={passwordInputRef}
                      type="password"
                      name="password"
                      autoComplete="current-password"
                      required
                      className={inputCls}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => { setPassword(e.target.value); if (infoPrompt) setInfoPrompt(''); }}
                    />
                  </div>

                  <button
                    type="submit"
                    onClick={() => setEnrollBioAfterLogin(false)}
                    className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg shadow-md transition-all disabled:opacity-50 flex items-center justify-center cursor-pointer"
                    disabled={isLoading || isBioLoading}
                  >
                    {isLoading && !enrollBioAfterLogin ? (
                      <><Loader2 className="animate-spin h-4 w-4 mr-2" /> Signing In...</>
                    ) : 'Sign In'}
                  </button>

                  {/* BEFORE BIOMETRICS ENABLED: Real Activation Button */}
                  {bioAvailable && !hasPairedBio && (
                    <div className="pt-1">
                      <button
                        type="button"
                        onClick={handleEnableBiometricClick}
                        disabled={isBioLoading || isLoading}
                        className="w-full py-3 px-4 bg-emerald-50/70 hover:bg-emerald-50 text-emerald-800 border border-emerald-200 hover:border-emerald-300 text-xs font-bold rounded-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer shadow-2xs"
                      >
                        {isLoading && enrollBioAfterLogin ? (
                          <><Loader2 className="animate-spin h-4 w-4 text-emerald-600" /> Signing In &amp; Activating {getBiometricDisplayLabel()}...</>
                        ) : (
                          <><Fingerprint className="h-4 w-4 text-emerald-600" /> Sign In &amp; Enable {getBiometricDisplayLabel()}</>
                        )}
                      </button>
                      <p className="text-[11px] text-center text-gray-400 mt-1.5">
                        Enables one-tap {getBiometricDisplayLabel()} login for future visits &amp; mobile alerts on this device.
                      </p>
                    </div>
                  )}

                  {/* Zero-friction perimeter anti-bot honeypot trap positioned after credentials to prevent autofill heuristic collisions */}
                  <HoneypotField name="website_url" value={websiteUrl} onChange={(e) => setWebsiteUrl(e.target.value)} />
                </form>
              )}
            </div>
          ) : (
            <form className="space-y-4" onSubmit={handleMfaVerify}>
              <div className="text-center">
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Enter 6-Digit Code</label>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  autoComplete="one-time-code"
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