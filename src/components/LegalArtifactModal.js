// LegalArtifactModal.js
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { apiRequest } from '../services/apiService';
import { API_BASE_URL } from '../services/apiService';
import { toast } from 'react-toastify';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faFileContract,
  faUserShield,
  faCheckCircle,
  faSpinner,
  faTimes,
  faArrowRightFromBracket
} from '@fortawesome/free-solid-svg-icons';

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
      <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto relative">
          <button
            type="button"
            onClick={handleDeclineOrClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 p-2 rounded-full hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-300"
            title={t('legal.closeTooltip', 'Close and come back later')}
            aria-label="Close"
          >
            <FontAwesomeIcon icon={faTimes} className="w-5 h-5" />
          </button>
          <div className="flex justify-center items-center h-40">
            <FontAwesomeIcon icon={faSpinner} spin size="2x" className="text-blue-500" />
            <p className="ml-4 text-lg text-gray-700">{t('legal.loading', 'Loading policies...')}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl p-6 sm:p-8 max-w-3xl w-full max-h-[95vh] flex flex-col transform transition-all duration-300 scale-100 opacity-100 relative">
        
        {/* Close Button ('X') */}
        <button
          type="button"
          onClick={handleDeclineOrClose}
          disabled={isAccepting}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 p-2 rounded-full hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-300 disabled:opacity-50"
          title={t('legal.closeTooltip', 'Close and come back later')}
          aria-label="Close and come back later"
        >
          <FontAwesomeIcon icon={faTimes} className="w-5 h-5" />
        </button>

        <div className="text-center mb-6 pr-6 pl-6">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-800 flex items-center justify-center space-x-2">
            <FontAwesomeIcon icon={faFileContract} className="text-blue-600 mr-2" />
            <span>{t('legal.reviewAccept', 'Review and Accept Policies')}</span>
          </h2>
          <p className="text-gray-500 mt-2 text-sm sm:text-base">
            {t('legal.policyDesc', 'To continue using the platform, you must accept our latest Terms & Conditions and Privacy Policy.')}
          </p>
        </div>

        <div className="flex mb-4 border-b border-gray-200">
          <button
            className={`flex-1 py-3 text-center text-base sm:text-lg font-semibold rounded-t-lg transition-colors duration-200 ${
              currentTab === 'tc'
                ? 'text-blue-600 border-b-4 border-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setCurrentTab('tc')}
          >
            <FontAwesomeIcon icon={faFileContract} className="mr-2" />
            <span>{t('legal.terms', { version: tcVersion, defaultValue: `T&C (v${tcVersion})` })}</span>
          </button>
          <button
            className={`flex-1 py-3 text-center text-base sm:text-lg font-semibold rounded-t-lg transition-colors duration-200 ${
              currentTab === 'pp'
                ? 'text-blue-600 border-b-4 border-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setCurrentTab('pp')}
          >
            <FontAwesomeIcon icon={faUserShield} className="mr-2" />
            <span>{t('legal.privacy', { version: ppVersion, defaultValue: `Privacy Policy (v${ppVersion})` })}</span>
          </button>
        </div>

        <div
          className="prose max-w-none text-gray-700 h-80 sm:h-96 overflow-y-auto border p-4 rounded-lg bg-gray-50 mb-6"
          dangerouslySetInnerHTML={{ __html: currentTab === 'tc' ? tcContent : ppContent }}
        ></div>
        
        {/* Action Buttons */}
        <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={handleDeclineOrClose}
            disabled={isAccepting}
            className="w-full sm:w-auto px-6 py-2.5 text-sm sm:text-base font-semibold rounded-full text-gray-700 bg-gray-100 hover:bg-gray-200 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400 transition duration-150 ease-in-out flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FontAwesomeIcon icon={faArrowRightFromBracket} className="mr-1.5" />
            <span>{t('legal.declineButton', 'Decline / Come Back Later')}</span>
          </button>

          <button
            type="button"
            onClick={handleAccept}
            disabled={isAccepting || isLoading}
            className="w-full sm:w-auto px-8 py-2.5 text-sm sm:text-base font-semibold rounded-full text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition duration-150 ease-in-out flex items-center justify-center space-x-2 disabled:bg-green-300 disabled:cursor-not-allowed shadow-md"
          >
            {isAccepting ? (
              <>
                <FontAwesomeIcon icon={faSpinner} spin className="mr-1.5" />
                <span>{t('legal.accepting', 'Accepting...')}</span>
              </>
            ) : (
              <>
                <FontAwesomeIcon icon={faCheckCircle} className="mr-1.5" />
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