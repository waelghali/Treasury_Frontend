import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { ShieldCheck, ShieldAlert, Lock, CheckCircle2, XCircle, Building2, FileText, ArrowRight, RefreshCw } from 'lucide-react';
import { publicApiRequest } from '../../services/apiService';

export default function VerifyInstructionPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('t') || searchParams.get('token') || '';

  const [inspectLoading, setInspectLoading] = useState(true);
  const [tokenInfo, setTokenInfo] = useState(null);
  const [securityCode, setSecurityCode] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState('');
  const [cooldownSeconds, setCooldownSeconds] = useState(0);
  const [verifiedData, setVerifiedData] = useState(null);

  useEffect(() => {
    if (cooldownSeconds <= 0) return undefined;
    const timer = setInterval(() => {
      setCooldownSeconds((prev) => {
        if (prev <= 1) {
          setVerifyError('');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldownSeconds]);

  const formatCountdown = (sec) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  useEffect(() => {
    let isMounted = true;
    async function inspectToken() {
      if (!token) {
        setTokenInfo({ valid_token: false, reason: 'No verification token found in the scanned link.' });
        setInspectLoading(false);
        return;
      }
      try {
        setInspectLoading(true);
        const res = await publicApiRequest(`/public/verify-instruction/inspect?t=${encodeURIComponent(token)}`, 'GET');
        if (isMounted) {
          setTokenInfo(res);
          if (res?.cooldown_seconds && res.cooldown_seconds > 0) {
            setCooldownSeconds(res.cooldown_seconds);
          }
        }
      } catch (err) {
        if (isMounted) {
          setTokenInfo({
            valid_token: false,
            reason: err?.message || 'Unable to validate the QR verification link.',
          });
        }
      } finally {
        if (isMounted) {
          setInspectLoading(false);
        }
      }
    }
    inspectToken();
    return () => {
      isMounted = false;
    };
  }, [token]);

  const handleCodeChange = (e) => {
    const digitsOnly = e.target.value.replace(/[^0-9]/g, '').slice(0, 6);
    if (digitsOnly.length > 3) {
      setSecurityCode(`${digitsOnly.slice(0, 3)}-${digitsOnly.slice(3)}`);
    } else {
      setSecurityCode(digitsOnly);
    }
    if (cooldownSeconds <= 0) {
      setVerifyError('');
    }
  };

  const handleVerifySubmit = async (e) => {
    e.preventDefault();
    if (cooldownSeconds > 0) return;
    const cleanDigits = securityCode.replace(/[^0-9]/g, '');
    if (cleanDigits.length !== 6) {
      setVerifyError('Please enter all 6 digits of the Security Code printed in the letter footer.');
      return;
    }
    try {
      setVerifying(true);
      setVerifyError('');
      const res = await publicApiRequest('/public/verify-instruction/confirm', 'POST', {
        token,
        code: cleanDigits,
      });
      if (res && res.verified) {
        setCooldownSeconds(0);
        setVerifiedData(res);
      } else {
        if (res?.cooldown_seconds && res.cooldown_seconds > 0) {
          setCooldownSeconds(res.cooldown_seconds);
        }
        setVerifyError(res?.reason || 'Verification failed. The Security Code does not match this instruction.');
      }
    } catch (err) {
      setVerifyError(err?.message || 'Verification request failed. Please try again.');
    } finally {
      setVerifying(false);
    }
  };

  const isCanceled = verifiedData?.status_category === 'CANCELED';

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between">
      {/* Top Brand Header */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-amber-500/15 border border-amber-500/40 flex items-center justify-center">
              <ShieldCheck className="h-5 w-5 text-amber-400" />
            </div>
            <div>
              <div className="text-sm font-bold tracking-wide text-white uppercase">
                Grow Business Development
              </div>
              <div className="text-xs text-slate-400">
                Corporate Banking Instruction Authenticity Portal
              </div>
            </div>
          </div>
          <Link
            to="/"
            className="text-xs font-semibold text-amber-400 hover:text-amber-300 flex items-center gap-1"
          >
            Visit Website <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-lg">
          {inspectLoading ? (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center shadow-2xl">
              <RefreshCw className="h-8 w-8 text-amber-400 animate-spin mx-auto mb-3" />
              <h2 className="text-base font-semibold text-white">Validating Cryptographic Signature...</h2>
              <p className="text-xs text-slate-400 mt-1">
                Checking instruction issuance seal with Grow Business Development.
              </p>
            </div>
          ) : !tokenInfo?.valid_token ? (
            <div className="bg-slate-900 border border-rose-500/40 rounded-2xl p-7 shadow-2xl">
              <div className="flex items-center gap-3 text-rose-400 mb-3">
                <ShieldAlert className="h-7 w-7 shrink-0" />
                <h1 className="text-lg font-bold text-white">Invalid or Unrecognized QR Seal</h1>
              </div>
              <p className="text-sm text-slate-300 leading-relaxed">
                {tokenInfo?.reason ||
                  'This QR code could not be verified as an authentic instruction issued via Grow Business Development.'}
              </p>
              <div className="mt-5 p-3.5 rounded-xl bg-rose-950/40 border border-rose-500/30 text-xs text-rose-200">
                <strong>Bank Officer Advisory:</strong> Do not rely on this QR code alone. Please contact the issuing corporate treasury department directly to confirm authenticity.
              </div>
            </div>
          ) : !verifiedData ? (
            /* Step 1: 6-Digit Security Code Gate */
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-medium mb-4">
                <Lock className="h-3.5 w-3.5" /> Cryptographic QR Seal Validated
              </div>

              <h1 className="text-xl font-bold text-white">Verify Physical Document</h1>
              <p className="text-sm text-slate-300 mt-1.5 leading-relaxed">
                To confirm that this QR code belongs to the physical instruction letter in your hand, enter the{' '}
                <strong className="text-white">6-digit Security Code</strong> printed in the footer next to the QR code.
              </p>

              <div className="mt-4 p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                <span className="text-xs text-slate-400">Detected Instruction Ref:</span>
                <span className="font-mono text-xs font-bold text-amber-400 tracking-wider">
                  {tokenInfo.masked_serial}
                </span>
              </div>

              <form onSubmit={handleVerifySubmit} className="mt-6">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                  6-Digit Document Security Code
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  placeholder="000-000"
                  disabled={cooldownSeconds > 0}
                  value={securityCode}
                  onChange={handleCodeChange}
                  className="w-full text-center font-mono text-2xl font-bold tracking-[0.25em] py-3.5 px-4 rounded-xl bg-slate-950 border border-slate-700 text-white disabled:opacity-50 focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20"
                />

                {cooldownSeconds > 0 && (
                  <div className="mt-3 p-3.5 rounded-xl bg-amber-950/60 border border-amber-500/40 flex items-center justify-between gap-3 text-xs text-amber-200">
                    <div className="flex items-start gap-2">
                      <Lock className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                      <span>
                        {verifyError ||
                          'Temporary security cooldown active due to repeated failed attempts from your connection.'}
                      </span>
                    </div>
                    <span className="font-mono font-bold text-sm px-2.5 py-1 rounded-lg bg-slate-950 border border-amber-500/40 text-amber-300 shrink-0">
                      {formatCountdown(cooldownSeconds)}
                    </span>
                  </div>
                )}

                {verifyError && cooldownSeconds <= 0 && (
                  <div className="mt-3 p-3 rounded-xl bg-rose-950/60 border border-rose-500/40 flex items-start gap-2 text-xs text-rose-200">
                    <XCircle className="h-4 w-4 text-rose-400 shrink-0 mt-0.5" />
                    <span>{verifyError}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={verifying || cooldownSeconds > 0}
                  className="mt-5 w-full py-3.5 px-5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-bold text-sm transition flex items-center justify-center gap-2 shadow-lg shadow-amber-500/10"
                >
                  {cooldownSeconds > 0 ? (
                    <>
                      <Lock className="h-4 w-4" /> Retry Available in {formatCountdown(cooldownSeconds)}
                    </>
                  ) : verifying ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" /> Verifying Authenticity...
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="h-4 w-4" /> Verify Instruction Authenticity
                    </>
                  )}
                </button>
              </form>
            </div>
          ) : (
            /* Step 2: Verified Instruction Summary */
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
              {/* Top Status Banner */}
              <div
                className={`p-5 border-b ${
                  isCanceled
                    ? 'bg-rose-950/70 border-rose-500/40'
                    : 'bg-emerald-950/60 border-emerald-500/30'
                }`}
              >
                <div className="flex items-start gap-3">
                  {isCanceled ? (
                    <XCircle className="h-7 w-7 text-rose-400 shrink-0 mt-0.5" />
                  ) : (
                    <CheckCircle2 className="h-7 w-7 text-emerald-400 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <div
                      className={`text-xs font-bold uppercase tracking-wider ${
                        isCanceled ? 'text-rose-300' : 'text-emerald-300'
                      }`}
                    >
                      {isCanceled
                        ? 'Revoked / Canceled Instruction'
                        : 'Verified Genuine Corporate Instruction'}
                    </div>
                    <h2 className="text-lg font-bold text-white mt-0.5">
                      {verifiedData.action_type}
                    </h2>
                    <div className="text-xs text-slate-300 mt-1">
                      Live Platform Status: <strong className="text-white">{verifiedData.delivery_status}</strong>
                    </div>
                  </div>
                </div>
              </div>

              {/* Key Figures to Cross-Check Against Physical Paper */}
              <div className="p-6 space-y-4">
                <div className="p-4 rounded-xl bg-slate-950 border border-amber-500/30">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-amber-400">
                    {verifiedData.authorized_parameter_label}
                  </div>
                  <div className="text-lg font-extrabold text-white mt-0.5">
                    {verifiedData.authorized_parameter_value}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800">
                    <div className="text-slate-400">Bank LG Number</div>
                    <div className="font-mono font-bold text-sm text-white mt-0.5">
                      {verifiedData.lg_number_masked}
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800">
                    <div className="text-slate-400">Guarantee Amount</div>
                    <div className="font-bold text-sm text-white mt-0.5">
                      {verifiedData.lg_amount_formatted}
                    </div>
                  </div>
                </div>

                <div className="divide-y divide-slate-800/80 text-xs border-t border-b border-slate-800 py-1">
                  <div className="py-2.5 flex justify-between gap-4">
                    <span className="text-slate-400 flex items-center gap-1.5">
                      <Building2 className="h-3.5 w-3.5 text-slate-500" /> Addressed To Bank
                    </span>
                    <span className="font-semibold text-white text-right">{verifiedData.bank_name}</span>
                  </div>
                  <div className="py-2.5 flex justify-between gap-4">
                    <span className="text-slate-400">Beneficiary Entity</span>
                    <span className="font-semibold text-white text-right">{verifiedData.beneficiary_masked}</span>
                  </div>
                  <div className="py-2.5 flex justify-between gap-4">
                    <span className="text-slate-400 flex items-center gap-1.5">
                      <FileText className="h-3.5 w-3.5 text-slate-500" /> Instruction Ref
                    </span>
                    <span className="font-mono font-semibold text-amber-300 text-right">
                      {verifiedData.instruction_serial}
                    </span>
                  </div>
                  <div className="py-2.5 flex justify-between gap-4">
                    <span className="text-slate-400">Instruction Date</span>
                    <span className="font-mono text-slate-200 text-right">{verifiedData.issue_date}</span>
                  </div>
                </div>

                <p className="text-[11px] text-slate-400 leading-relaxed text-center">
                  Please ensure the Guarantee Number, Amount, and Authorized Action printed on the physical document match the verified figures above.
                </p>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 py-4 text-center text-xs text-slate-500">
        Powered by <strong className="text-slate-300">Grow Business Development</strong> &mdash; Enterprise Treasury Management Platform
      </footer>
    </div>
  );
}

