// LegalArtifactModal.js
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { apiRequest } from '../services/apiService';
import { API_BASE_URL } from '../services/apiService';
import { toast } from 'react-toastify';
import { FileText, ShieldCheck, CheckCircle2, Loader2, X, LogOut } from 'lucide-react';

function LegalArtifactModal({ onAcceptSuccess, onLogout }) {
  const { t } = useTranslation();
  const [tcVersion, setTcVersion] = useState(null);
  const [ppVersion, setPpVersion] = useState(null);
  const [tcContent, setTcContent] = useState('Loading...');
  const [ppContent, setPpContent] = useState('Loading...');
  const [isLoading, setIsLoading] = useState(false);
  const [isAccepting, setIsAccepting] = useState(false);
  const [currentTab, setCurrentTab] = useState('tc');

  // New function to fetch the latest versions from the public endpoint
  const fetchLatestVersions = async () => {
    const response = await fetch(`${API_BASE_URL}/public/legal-versions`);
    if (!response.ok) {
        throw new Error('Failed to fetch legal versions');
    }
    const data = await response.json();
    return data;
  };

  // New function to fetch the content of a specific artifact
  const fetchLegalContent = async (artifactType) => {
    const response = await fetch(`${API_BASE_URL}/public/legal-content/${artifactType}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch ${artifactType} content`);
    }
    const data = await response.json();
    return data.content; // assuming the response contains a 'content' field
  };

  useEffect(() => {
    const fetchArtifacts = async () => {
      try {
        setIsLoading(true);

        // Fetch versions from the new public endpoint
        const latestPolicies = await fetchLatestVersions();
        const latestTcVersion = latestPolicies.tc_version;
        const latestPpVersion = latestPolicies.pp_version;

        setTcVersion(latestTcVersion);
        setPpVersion(latestPpVersion);

        // Fetch the actual content based on the versions
        const tcContentData = await fetchLegalContent('terms_and_conditions');
        const ppContentData = await fetchLegalContent('privacy_policy');

        setTcContent(tcContentData);
        setPpContent(ppContentData);

      } catch (error) {
        console.error("Failed to fetch legal artifacts:", error);
        toast.error(t('legal.loadFailed', 'Failed to load legal policies. Please try again later.'));
      } finally {
        setIsLoading(false);
      }
    };
    fetchArtifacts();
  }, [t]);

  const handleAccept = async () => {
    setIsAccepting(true);
    try {
      await apiRequest(
        '/policies/accept', 
        'POST',
        {
          tc_version: tcVersion,
          pp_version: ppVersion,
        }
      );
      toast.success(t('legal.acceptSuccess', 'Policies accepted successfully!'));
      onAcceptSuccess();
    } catch (error) {
      console.error("Failed to accept policies:", error);
      toast.error(error.message || t('legal.acceptFailed', 'Failed to accept policies. Please try again.'));
      if (onLogout) onLogout();
    } finally {
      setIsAccepting(false);
    }
  };

  const handleDeclineOrClose = () => {
    toast.info(t('legal.declineToast', "You can review and accept the policies whenever you're ready to sign in."));
    if (onLogout) {
      onLogout();
    }
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto relative">
          <button
            type="button"
            onClick={handleDeclineOrClose}
            className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-300"
            title={t('legal.closeTooltip', 'Close and come back later')}
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex justify-center items-center h-40">
            <Loader2 className="w-7 h-7 text-indigo-600 animate-spin" />
            <p className="ml-3 text-base font-medium text-slate-700">{t('legal.loading', 'Loading policies...')}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xl max-w-3xl w-full max-h-[92vh] flex flex-col overflow-hidden transform transition-all duration-300 scale-100 opacity-100 relative">
        
        {/* Sticky Header */}
        <div className="px-6 py-4 bg-slate-50/80 border-b border-slate-200/80 flex items-start justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100 shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-slate-900">
                {t('legal.reviewAccept', 'Review and Accept Policies')}
              </h2>
              <p className="text-slate-500 mt-0.5 text-xs sm:text-sm">
                {t('legal.policyDesc', 'To continue using the platform, you must accept our latest Terms & Conditions and Privacy Policy.')}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleDeclineOrClose}
            disabled={isAccepting}
            className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-200/60 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-300 disabled:opacity-50 shrink-0"
            title={t('legal.closeTooltip', 'Close and come back later')}
            aria-label="Close and come back later"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Sticky Tabs */}
        <div className="flex px-6 border-b border-slate-200 bg-white shrink-0">
          <button
            type="button"
            className={`flex-1 py-3 text-center text-sm sm:text-base font-semibold rounded-none border-b-2 transition-colors duration-200 flex items-center justify-center gap-2 ${
              currentTab === 'tc'
                ? 'text-indigo-600 border-indigo-600'
                : 'text-slate-500 border-transparent hover:text-slate-800 hover:border-slate-300'
            }`}
            onClick={() => setCurrentTab('tc')}
          >
            <FileText className="w-4 h-4" />
            <span>{t('legal.terms', { version: tcVersion, defaultValue: `T&C (v${tcVersion})` })}</span>
          </button>
          <button
            type="button"
            className={`flex-1 py-3 text-center text-sm sm:text-base font-semibold rounded-none border-b-2 transition-colors duration-200 flex items-center justify-center gap-2 ${
              currentTab === 'pp'
                ? 'text-indigo-600 border-indigo-600'
                : 'text-slate-500 border-transparent hover:text-slate-800 hover:border-slate-300'
            }`}
            onClick={() => setCurrentTab('pp')}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>{t('legal.privacy', { version: ppVersion, defaultValue: `Privacy Policy (v${ppVersion})` })}</span>
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-6 overflow-y-auto flex-1 bg-white">
          <div
            className="prose prose-sm sm:prose-base max-w-none text-slate-700 border border-slate-200/80 p-5 rounded-xl bg-slate-50/60"
            dangerouslySetInnerHTML={{ __html: currentTab === 'tc' ? tcContent : ppContent }}
          ></div>
        </div>
        
        {/* Sticky Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex flex-col-reverse sm:flex-row items-center justify-end gap-2.5 shrink-0">
          <button
            type="button"
            onClick={handleDeclineOrClose}
            disabled={isAccepting}
            className="w-full sm:w-auto px-4 py-2 text-sm font-semibold rounded-xl text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-400 transition duration-150 ease-in-out inline-flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
          >
            <LogOut className="w-4 h-4" />
            <span>{t('legal.declineButton', 'Decline / Come Back Later')}</span>
          </button>

          <button
            type="button"
            onClick={handleAccept}
            disabled={isAccepting || isLoading}
            className="w-full sm:w-auto px-5 py-2 text-sm font-semibold rounded-xl text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 transition duration-150 ease-in-out inline-flex items-center justify-center gap-2 disabled:bg-emerald-300 disabled:cursor-not-allowed shadow-sm"
          >
            {isAccepting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>{t('legal.accepting', 'Accepting...')}</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>{t('legal.acceptButton', 'I Accept the Policies')}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default LegalArtifactModal;
