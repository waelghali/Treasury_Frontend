// src/pages/Auth/ForgotPasswordPage.js
import React, { useState } from 'react';
import { API_BASE_URL } from 'services/apiService';
import { Mail, Loader2, ArrowLeft, CheckCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';

function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    setError('');
    setIsLoading(true);

    if (!email) {
      setError('Please enter your email address.');
      setIsLoading(false);
      return;
    }

    try {
      await fetch(`${API_BASE_URL}/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      setMessage('If an account with that email exists, a password reset link has been sent to your inbox.');
    } catch (err) {
      setError(err.message || 'An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const inputCls = "block w-full px-4 py-3 bg-white border border-gray-200 text-gray-900 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all placeholder-gray-400";

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ fontFamily: "'Inter', 'Segoe UI', sans-serif", backgroundColor: '#1e2a4a' }}>
      <Helmet>
        <title>Forgot Password — Grow LG Management Platform</title>
        <meta name="description" content="Reset your Grow account password. Enter your email to receive a password reset link." />
      </Helmet>

      {/* Decorative circles */}
      <div className="absolute top-0 right-0 w-96 h-96 rounded-full opacity-[0.04] bg-white -mr-48 -mt-48" />
      <div className="absolute bottom-0 left-0 w-72 h-72 rounded-full opacity-[0.04] bg-white -ml-36 -mb-36" />

      <div className="w-full max-w-md relative z-10">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center space-x-2 mb-6">
            <span className="text-xl font-bold text-white tracking-tight">Grow</span>
            <span className="text-xs text-blue-400 font-medium">Business Development</span>
          </div>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-2xl p-8 space-y-6">
          <div className="text-center">
            <div className="mx-auto w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center mb-4">
              <Mail className="w-5 h-5 text-blue-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">Forgot Password?</h2>
            <p className="text-sm text-gray-500 mt-1">
              Enter your email and we'll send you a reset link.
            </p>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="email" className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                Email Address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className={inputCls}
                placeholder="name@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            {message && (
              <div className="flex items-start space-x-2 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">
                <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>{message}</span>
              </div>
            )}

            {error && (
              <div className="bg-red-50 border-l-4 border-red-500 text-red-700 px-4 py-3 rounded-r-lg text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              className="w-full flex items-center justify-center py-3 px-4 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-md disabled:opacity-50"
              disabled={isLoading}
            >
              {isLoading ? (
                <><Loader2 className="animate-spin h-4 w-4 mr-2" /> Sending...</>
              ) : (
                <><Mail className="h-4 w-4 mr-2" /> Send Reset Link</>
              )}
            </button>
          </form>

          <div className="text-center pt-4 border-t border-gray-100">
            <Link to="/login" className="inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors">
              <ArrowLeft className="w-3 h-3 mr-1" /> Back to Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ForgotPasswordPage;