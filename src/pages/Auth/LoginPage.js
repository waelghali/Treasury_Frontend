import React, { useState } from 'react';
import { setAuthToken, API_BASE_URL } from 'services/apiService';
import { useNavigate, Link } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid'; 

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
        // Direct login (Device already trusted)
        if (data.access_token) {
          setAuthToken(data.access_token);
          onLoginSuccess(data);
        } else if (data.status === "MFA_REQUIRED") {
          setMfaSessionToken(data.mfa_session_token);
          setShowMfa(true);
        }
      } else if (data.status === "MFA_REQUIRED") {
        // Some backends return 401 or 200 for MFA; handling both
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
          remember_me: rememberMe // Ensures device is trusted on success
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setAuthToken(data.access_token);
        onLoginSuccess(data);
      } else {
        setError(data.detail || 'Invalid verification code.');
        setMfaCode(''); // Clear code on failure
      }
    } catch (err) {
      setError('Verification failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

	const [resendTimer, setResendTimer] = useState(0);

	// Cooldown timer effect
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
			mfa_code: "" // Not needed for resend but required by schema
		  }),
		});

		if (response.ok) {
		  setResendTimer(180); // 60-second cooldown
		  setMfaCode('');
		  // Optional: Show a "Code Resent" success toast/message
		} else {
		  const data = await response.json();
		  setError(data.detail || "Failed to resend code.");
		}
	  } catch (err) {
		setError("Network error. Could not resend code.");
	  }
	};


  return (
    <div className="relative flex items-center justify-center min-h-screen bg-[#f8fafc] overflow-hidden">
      
      {/* BACKGROUND BLOBS */}
      <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] bg-blue-500 rounded-full blur-[140px] opacity-20 animate-pulse"></div>
      <div className="absolute bottom-[-10%] left-[-5%] w-[500px] h-[500px] bg-blue-700 rounded-full blur-[140px] opacity-20 animate-pulse" style={{ animationDelay: '3s' }}></div>

      {/* Floating Animated Side Orbs */}
      <div className="hidden lg:block absolute top-1/4 left-10 w-32 h-32 bg-gradient-to-tr from-blue-400 to-blue-700 rounded-full opacity-15 animate-float"></div>
      <div className="hidden lg:block absolute bottom-1/3 right-12 w-24 h-24 bg-gradient-to-br from-blue-500 to-indigo-700 rounded-full opacity-15 animate-float-delayed"></div>

      <div className="relative z-10 w-full max-w-md bg-white rounded-3xl shadow-[0_32px_64px_-12px_rgba(0,0,0,0.14)] p-8 md:p-10 space-y-6 border border-gray-100">
        
        {/* LOGO */}
        <img
          src="/growlogonocircle.png"
          alt="Grow BD Logo"
          className="mx-auto mb-2"
          style={{ width: '345px', height: '135px' }}
        />
        
        <div className="text-center space-y-1">
          <h2 className="text-2xl font-extrabold text-gray-900 tracking-tight">
            {showMfa ? 'Verify Security' : 'Sign In'}
          </h2>
          <p className="text-blue-600/70 font-medium text-sm">
            {showMfa ? 'A code has been sent to your email' : 'Treasury Management Platform'}
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 text-red-700 px-4 py-3 rounded-r-xl text-sm font-semibold animate-shake" role="alert">
            {error}
          </div>
        )}

        {!showMfa ? (
          <form className="space-y-5" onSubmit={handleSubmit}>
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Email Address</label>
              <input
                type="email"
                required
                className="block w-full px-4 py-3.5 bg-gray-50 border border-gray-200 text-gray-900 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all"
                placeholder="name@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Password</label>
              <input
                type="password"
                required
                className="block w-full px-4 py-3.5 bg-gray-50 border border-gray-200 text-gray-900 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>


            <button
              type="submit"
              className="w-full py-4 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl shadow-xl shadow-blue-200 transition-all duration-300 transform active:scale-[0.97] disabled:opacity-50"
              disabled={isLoading}
            >
              {isLoading ? (
                <span className="flex items-center justify-center">
                   <svg className="animate-spin h-5 w-5 text-white mr-3" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                   </svg>
                   Signing In...
                </span>
              ) : 'Sign In'}
            </button>
          </form>
        ) : (
          <form className="space-y-4" onSubmit={handleMfaVerify}>
            <div className="text-center">
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1 text-center">Enter 6-Digit Code</label>
              <input
                type="text"
                maxLength="6"
                required
                autoFocus
                className="w-full py-5 border-2 border-blue-100 bg-blue-50/30 text-center text-4xl font-mono tracking-[0.4em] text-blue-900 rounded-2xl focus:border-blue-500 focus:bg-white outline-none transition-all"
                placeholder="000000"
                value={mfaCode}
                onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, ''))}
              />
            </div>
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center">
                <input
                  id="remember-me"
                  type="checkbox"
                  className="h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded-lg cursor-pointer transition-all"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                />
                <label htmlFor="remember-me" className="ml-2.5 text-sm text-gray-500 font-medium cursor-pointer">
                  Trust this device in the future
                </label>
              </div>
            </div>
			<div className="text-center">
			  <p className="text-sm text-gray-500 mb-2">Didn't receive the code?</p>
			  <button
				type="button"
				onClick={handleResendCode}
				disabled={resendTimer > 0 || isLoading}
				className={`text-sm font-bold uppercase tracking-widest transition-colors ${
				  resendTimer > 0 ? 'text-sm text-gray-300 cursor-not-allowed' : 'text-blue-600 hover:text-blue-800'
				}`}
			  >
				{resendTimer > 0 ? `Resend Code in ${resendTimer}s` : 'Resend New Code'}
			  </button>
			</div>
            <button
              type="submit"
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl shadow-xl shadow-blue-200 transition-all active:scale-[0.98] disabled:opacity-50"
              disabled={isLoading || mfaCode.length < 6}
            >
              {isLoading ? 'Verifying...' : 'Verify & Access Platform'}
            </button>

            <button 
              type="button" 
              onClick={() => {
                setShowMfa(false);
                setError('');
                setMfaCode('');
              }}
              className="w-full text-xs font-bold text-gray-400 hover:text-blue-600 transition-colors uppercase tracking-[0.2em]"
            >
              Back to Sign In
            </button>
          </form>
        )}

        <div className="pt-6 border-t border-gray-100 flex flex-col items-center space-y-4">
          <Link to="/forgot-password" size="sm" className="text-sm font-bold text-blue-600 hover:text-blue-800 transition-colors">
            Forgot Password?
          </Link>
          
          <Link to="/" className="inline-flex items-center text-xs font-bold text-gray-400 hover:text-gray-900 transition-colors uppercase tracking-widest">
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"/></svg>
            Back to Home
          </Link>
        </div>
      </div>

      {/* Tailwind Custom Animations */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes float { 0%, 100% { transform: translateY(0) scale(1); } 50% { transform: translateY(-40px) scale(1.05); } }
        @keyframes float-delayed { 0%, 100% { transform: translateY(0) scale(1.05); } 50% { transform: translateY(40px) scale(1); } }
        @keyframes shake { 0%, 100% { transform: translateX(0); } 25% { transform: translateX(-6px); } 75% { transform: translateX(6px); } }
        .animate-float { animation: float 10s ease-in-out infinite; }
        .animate-float-delayed { animation: float-delayed 12s ease-in-out infinite; }
        .animate-shake { animation: shake 0.2s ease-in-out 0s 2; }
      `}} />
    </div>
  );
}

export default LoginPage;