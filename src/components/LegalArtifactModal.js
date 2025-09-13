// LegalArtifactModal.js
import React, { useState, useEffect } from 'react';
import { apiRequest } from '../services/apiService';
import { getAuthToken, API_BASE_URL } from '../services/apiService'; // Import API_BASE_URL here
import { jwtDecode } from 'jwt-decode';
import { toast } from 'react-toastify';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFileContract, faUserShield, faCheckCircle, faSpinner } from '@fortawesome/free-solid-svg-icons';

function LegalArtifactModal({ onAcceptSuccess, onLogout }) {
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
        toast.error("Failed to load legal policies. Please try again later.");
      } finally {
        setIsLoading(false);
      }
    };
    fetchArtifacts();
  }, []);

  const handleAccept = async () => {
    setIsAccepting(true);
    try {
      const response = await apiRequest(
        '/policies/accept', 
        'POST',
        {
          tc_version: tcVersion,
          pp_version: ppVersion,
        }
      );
      toast.success("Policies accepted successfully!");
      onAcceptSuccess();
    } catch (error) {
      console.error("Failed to accept policies:", error);
      toast.error(error.message || "Failed to accept policies. Please try again.");
      onLogout();
    } finally {
      setIsAccepting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto transform transition-all duration-300 scale-100 opacity-100">
          <div className="flex justify-center items-center h-40">
            <FontAwesomeIcon icon={faSpinner} spin size="2x" className="text-blue-500" />
            <p className="ml-4 text-lg text-gray-700">Loading policies...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-3xl w-full max-h-[95vh] overflow-y-auto transform transition-all duration-300 scale-100 opacity-100">
        <div className="text-center mb-6">
          <h2 className="text-3xl font-bold text-gray-800 flex items-center justify-center space-x-2">
            <FontAwesomeIcon icon={faFileContract} className="text-blue-600" />
            <span>Review and Accept Policies</span>
          </h2>
          <p className="text-gray-500 mt-2">To continue using the platform, you must accept our latest Terms & Conditions and Privacy Policy.  </p>
        </div>

        <div className="flex mb-6 border-b border-gray-200">
          <button
            className={`flex-1 py-3 text-center text-lg font-semibold rounded-t-lg transition-colors duration-200 ${
              currentTab === 'tc'
                ? 'text-blue-600 border-b-4 border-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setCurrentTab('tc')}
          >
            <FontAwesomeIcon icon={faFileContract} className="mr-2" />
            <span>T&C (v{tcVersion})</span>
          </button>
          <button
            className={`flex-1 py-3 text-center text-lg font-semibold rounded-t-lg transition-colors duration-200 ${
              currentTab === 'pp'
                ? 'text-blue-600 border-b-4 border-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setCurrentTab('pp')}
          >
            <FontAwesomeIcon icon={faUserShield} className="mr-2" />
            <span>Privacy Policy (v{ppVersion})</span>
          </button>
        </div>

        <div className="prose max-w-none text-gray-700 h-96 overflow-y-auto border p-4 rounded-lg bg-gray-50 mb-6"
             dangerouslySetInnerHTML={{ __html: currentTab === 'tc' ? tcContent : ppContent }}
        ></div>
        
        <div className="flex justify-center">
          <button
            onClick={handleAccept}
            disabled={isAccepting}
            className="w-full sm:w-auto px-8 py-3 text-lg font-semibold rounded-full text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition duration-150 ease-in-out flex items-center justify-center space-x-2 disabled:bg-green-300 disabled:cursor-not-allowed"
          >
            {isAccepting ? (
              <>
                <FontAwesomeIcon icon={faSpinner} spin />
                <span>Accepting...</span>
              </>
            ) : (
              <>
                <FontAwesomeIcon icon={faCheckCircle} />
                <span>I Accept the Policies</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default LegalArtifactModal;