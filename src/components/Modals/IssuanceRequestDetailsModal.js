import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiRequest } from '../../services/apiService';
import {
    X, CheckCircle, XCircle, Clock, FileText, Building, Globe, Zap, Printer,
    ShieldCheck, FileKey, User, Calendar, DollarSign, AlertTriangle, Hash,
    Briefcase, ArrowDownCircle, FileWarning, MessageSquare, Settings, Search, ChevronDown,
    Download, Loader2, Trash2, Edit3, Send, Lock, Unlock, FileSearch
} from 'lucide-react';
import { toast } from 'react-toastify';
import ApprovalProgressTracker from '../ApprovalProgressTracker';
import IssuanceWizardModal from './IssuanceWizardModal';

export default function IssuanceRequestDetailsModal({ request, onClose, onStatusChange }) {
    const navigate = useNavigate();
    const [facilities, setFacilities] = useState([]);
    const [loadingFacilities, setLoadingFacilities] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [currentUserId, setCurrentUserId] = useState(null);
    const [userRole, setUserRole] = useState(null);
    const [similarityData, setSimilarityData] = useState(null);
    const [loadingSimilarity, setLoadingSimilarity] = useState(false);
    const [showSimilarity, setShowSimilarity] = useState(false);
    const [documents, setDocuments] = useState([]);
    const [loadingDocs, setLoadingDocs] = useState(false);
    const [showLetterDialog, setShowLetterDialog] = useState(false);
    const [letterSpecialWording, setLetterSpecialWording] = useState(false);
    const [letterAdditionalText, setLetterAdditionalText] = useState('');
    const [showWizard, setShowWizard] = useState(false);
    const [nearMatches, setNearMatches] = useState([]);
    const [loadingNearMatch, setLoadingNearMatch] = useState(false);
    const [docAnalysis, setDocAnalysis] = useState(null);
    const [analyzingDocId, setAnalyzingDocId] = useState(null);

    // Get current user ID and role from JWT
    useEffect(() => {
        try {
            const token = localStorage.getItem('jwt_token');
            if (token) {
                const payload = JSON.parse(atob(token.split('.')[1]));
                setCurrentUserId(payload.user_id);
                setUserRole(payload.role);
            }
        } catch (e) { /* ignore parse errors */ }
    }, []);

    useEffect(() => {
        if (request?.status === 'APPROVED_INTERNAL') {
            fetchMatchingFacilities();
        }
    }, [request]);

    // On-demand similarity check
    useEffect(() => {
        if (request?.id) {
            fetchSimilarityCheck();
            fetchDocuments();
            // Beneficiary near-match check
            if (request?.beneficiary_name) {
                fetchBeneficiaryNearMatch(request.beneficiary_name);
            }
        }
    }, [request?.id]);

    const fetchBeneficiaryNearMatch = async (beneficiaryName) => {
        try {
            setLoadingNearMatch(true);
            const data = await apiRequest(`/issuance/beneficiary-nearmatch?name=${encodeURIComponent(beneficiaryName)}&threshold=0.85`, 'GET');
            setNearMatches(data || []);
        } catch (err) {
            console.error('Beneficiary near-match check failed:', err);
        } finally {
            setLoadingNearMatch(false);
        }
    };

    const fetchSimilarityCheck = async () => {
        try {
            setLoadingSimilarity(true);
            const data = await apiRequest(`/issuance/requests/${request.id}/similarity-check`, 'GET');
            setSimilarityData(data);
            if (data.matches?.length > 0) setShowSimilarity(true);
        } catch (err) {
            console.error('Similarity check failed:', err);
        } finally {
            setLoadingSimilarity(false);
        }
    };

    const fetchDocuments = async () => {
        try {
            setLoadingDocs(true);
            const data = await apiRequest(`/issuance/requests/${request.id}/documents`, 'GET');
            setDocuments(data || []);
        } catch (err) {
            console.error('Failed to load documents:', err);
        } finally {
            setLoadingDocs(false);
        }
    };

    const handleDownloadDoc = async (docId, fileName) => {
        try {
            const data = await apiRequest(`/issuance/requests/${request.id}/documents/${docId}/download`, 'GET');
            if (data?.download_url) {
                window.open(data.download_url, '_blank');
            } else {
                toast.error('Download URL not available');
            }
        } catch (err) {
            toast.error('Failed to download document');
        }
    };

    // H2: Analyze a supporting document with AI 
    const handleAnalyzeDoc = async (doc) => {
        setAnalyzingDocId(doc.id);
        try {
            // First download the file to get its bytes
            const downloadData = await apiRequest(`/issuance/requests/${request.id}/documents/${doc.id}/download`, 'GET');
            if (!downloadData?.download_url) { toast.error('Cannot access document'); return; }

            // Fetch the actual file
            const fileResp = await fetch(downloadData.download_url);
            const fileBlob = await fileResp.blob();

            // Map document_type to our API doc_type
            const docTypeMap = { 'CONTRACT': 'CONTRACT', 'PURCHASE_ORDER': 'PURCHASE_ORDER', 'FORMAL_REQUEST': 'FORMAL_REQUEST' };
            const docType = docTypeMap[doc.document_type] || 'CONTRACT';

            const formData = new FormData();
            formData.append('file', fileBlob, doc.file_name);
            formData.append('doc_type', docType);

            const result = await apiRequest(`/issuance/requests/${request.id}/analyze-document`, 'POST', formData, true);
            setDocAnalysis({ docName: doc.file_name, docType: doc.document_type, ...result });
            // Refresh the documents list to pick up the saved ai_verification_result
            try {
                const refreshed = await apiRequest(`/issuance/requests/${request.id}/documents`, 'GET');
                setDocuments(refreshed || []);
            } catch (_) { /* non-critical */ }
        } catch (err) {
            setDocAnalysis({ docName: doc.file_name, status: 'ERROR', message: err.message || 'Analysis failed' });
        } finally {
            setAnalyzingDocId(null);
        }
    };

    const fetchMatchingFacilities = async () => {
        try {
            setLoadingFacilities(true);
            const data = await apiRequest(`/issuance/requests/${request.id}/suitable-facilities`, 'GET');
            const mapped = (data || []).map(f => ({
                id: f.facility_id,
                bank: { name: f.facility_bank, id: f.bank_id },
                bank_id: f.bank_id,
                sub_limit_id: f.sub_limit_id,
                facility_name: f.sub_limit_name,
                reference_number: `Sub-Limit #${f.sub_limit_id}`,
                currency: request?.currency?.iso_code || request?.currency?.code || '',
                available_limit: f.limit_available,
                availableFormatted: parseFloat(f.limit_available).toLocaleString(),
                isRecommended: f.has_sufficient_limit,
                total_used: f.total_used,
                total_limit: f.total_limit,
                utilization_pct: f.utilization_pct,
                tags: f.recommendation_tags || [],
                score: f.facility_score || 0,
            }));
            setFacilities(mapped);
        } catch (err) {
            console.error("Failed to fetch matching facilities:", err);
        } finally {
            setLoadingFacilities(false);
        }
    };

    const handleAction = async (action, endpoint) => {
        if (!window.confirm(`Are you sure you want to ${action} this request?`)) return;
        try {
            setIsProcessing(true);
            await apiRequest(`/issuance/requests/${request.id}/${endpoint}`, 'POST');
            toast.success(`Request ${action}d successfully`);
            onStatusChange();
            onClose();
        } catch (err) {
            toast.error(err?.message || `Failed to ${action} request`);
        } finally {
            setIsProcessing(false);
        }
    };

    if (!request) return null;

    const requestAmount = parseFloat(request.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 });
    const currencyCode = request.currency?.iso_code || request.currency?.code || '';
    const payableCurrencyCode = request.payable_currency?.iso_code || request.payable_currency?.code || '';
    const refCurrencyCode = request.reference_currency?.iso_code || request.reference_currency?.code || '';
    const isApprover = currentUserId && request.pending_approver_users?.map(String).includes(String(currentUserId));

    const DetailRow = ({ label, value, icon: Icon, highlight }) => {
        if (!value && value !== 0 && value !== false) return null;
        return (
            <div className="flex items-start gap-2 py-1.5 min-w-0">
                {Icon && <Icon className={`w-3.5 h-3.5 mt-0.5 flex-shrink-0 ${highlight ? 'text-blue-500' : 'text-gray-400'}`} />}
                <div className="min-w-0">
                    <span className="text-xs text-gray-500">{label}</span>
                    <p className={`text-sm font-medium break-all ${highlight ? 'text-blue-700' : 'text-gray-900'}`}>{String(value)}</p>
                </div>
            </div>
        );
    };

    const Badge = ({ text, color = 'blue' }) => (
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-${color}-100 text-${color}-700`}>
            {text}
        </span>
    );

    return (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75 overflow-y-auto h-full w-full flex items-center justify-center z-50">
            <div className="relative bg-white rounded-xl shadow-2xl max-w-5xl w-full max-h-[90vh] flex flex-col mx-4">

                {/* Header */}
                <div className={`${request.status === 'APPROVED_INTERNAL' ? 'bg-emerald-700' : 'bg-blue-800'} text-white px-6 py-4 rounded-t-xl flex justify-between items-center shrink-0`}>
                    <div>
                        <h2 className="text-xl font-bold flex items-center">
                            <FileKey className="w-5 h-5 mr-2" />
                            {request.serial_number || `Request #${request.id}`}
                            {request.status === 'APPROVED_INTERNAL' && (
                                <span className="ml-3 bg-white/20 text-white text-xs px-2.5 py-0.5 rounded-full font-medium">READY FOR ISSUANCE</span>
                            )}
                        </h2>
                        <p className={`${request.status === 'APPROVED_INTERNAL' ? 'text-emerald-200' : 'text-blue-200'} text-sm mt-1`}>
                            {request.department || 'General'} • {request.status?.replace(/_/g, ' ')}
                            {request.lg_type?.name && ` • ${request.lg_type.name}`}
                        </p>
                    </div>
                    <button onClick={onClose} className="text-white hover:text-red-300 transition-colors">
                        <X className="h-6 w-6" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 overflow-y-auto flex-1 bg-gray-50 flex flex-col lg:flex-row gap-6">

                    {/* LEFT — Request Details */}
                    <div className="w-full lg:w-2/3 space-y-4">

                        {/* Amount Card */}
                        <div className="bg-white p-5 rounded-lg shadow-sm border flex items-center justify-between">
                            <div>
                                <p className="text-xs text-gray-500 font-medium uppercase">Requested Amount</p>
                                <h3 className="text-3xl font-extrabold text-gray-900 mt-1">{currencyCode} {requestAmount}</h3>
                                {payableCurrencyCode && payableCurrencyCode !== currencyCode && (
                                    <p className="text-xs text-gray-400 mt-1">Payable in: {payableCurrencyCode}</p>
                                )}
                            </div>
                            <div className="text-right">
                                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold ${request.status === 'APPROVED_INTERNAL' ? 'bg-green-100 text-green-800' :
                                    request.status === 'REJECTED' ? 'bg-red-100 text-red-800' :
                                        request.status === 'PENDING_APPROVAL' ? 'bg-yellow-100 text-yellow-800' :
                                            'bg-blue-100 text-blue-800'
                                    }`}>
                                    {request.status?.replace(/_/g, ' ')}
                                </span>
                                {request.is_urgent && (
                                    <div className="mt-2">
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-700">
                                            <AlertTriangle className="w-3 h-3" /> URGENT
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Requestor & Business Details */}
                        <div className="bg-white p-5 rounded-lg shadow-sm border">
                            <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider mb-3 border-b pb-2">Requestor & Business Details</h4>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-1">
                                <DetailRow label="Issuing Entity" value={request.issuing_entity?.entity_name || request.issuing_entity_id} icon={Building} highlight />
                                <DetailRow label="Requestor" value={request.requestor_name} icon={User} />
                                <DetailRow label="Email" value={request.requestor_email} />
                                <DetailRow label="Department" value={request.department} />
                                <DetailRow label="Job Title" value={request.job_title} icon={Briefcase} />
                                <DetailRow label="Phone" value={request.phone_number} />
                                <DetailRow label="Employee ID" value={request.employee_id} icon={Hash} />
                            </div>
                            {/* Manager Emails - full width to prevent overlap */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-1 mt-1">
                                <DetailRow label="Direct Manager" value={request.manager_email} />
                                <DetailRow label="Second Line Manager" value={request.second_line_manager_email} />
                            </div>
                        </div>

                        {/* LG Details */}
                        <div className="bg-white p-5 rounded-lg shadow-sm border">
                            <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider mb-3 border-b pb-2">LG Details</h4>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-1">
                                <DetailRow label="LG Type" value={request.lg_type?.name} icon={FileText} />
                                <DetailRow label="LG Purpose" value={request.lg_purpose} />
                                <DetailRow label="Amount" value={`${currencyCode} ${requestAmount}`} icon={DollarSign} />
                                {payableCurrencyCode && payableCurrencyCode !== currencyCode && (
                                    <DetailRow label="Payable Currency" value={payableCurrencyCode} />
                                )}
                                <DetailRow label="Suggested Issue Date" value={request.requested_issue_date} icon={Calendar} />
                                <DetailRow label="Maturity Date" value={request.requested_expiry_date} icon={Calendar} />
                                {request.operational_status && (
                                    <DetailRow label="Operational Status" value={request.operational_status.replace(/_/g, ' ')} icon={Settings} />
                                )}
                                <DetailRow label="LG Language" value={request.lg_language === 'EN' ? 'English' : 'العربية (Arabic)'} icon={Globe} />
                                {request.applicable_rules && (
                                    <DetailRow label="Applicable Rules" value={{
                                        'URDG_758': 'URDG 758 (ICC)', 'ISP_98': 'ISP98 (ICC)', 'LOCAL_LAW': 'Local Law'
                                    }[request.applicable_rules] || request.applicable_rules} icon={ShieldCheck} />
                                )}
                            </div>
                        </div>

                        {/* Auto-Reduction (Advance Payment) */}
                        {request.is_auto_reducing && (
                            <div className="bg-amber-50 p-4 rounded-lg border border-amber-200">
                                <h4 className="text-xs font-bold text-amber-800 uppercase tracking-wider mb-2 flex items-center gap-1">
                                    <ArrowDownCircle className="w-4 h-4" /> Auto-Reducing LG
                                </h4>
                                <p className="text-sm text-amber-900">{request.reduction_trigger || 'No reduction trigger specified'}</p>
                            </div>
                        )}

                        {/* Underlying Reference */}
                        {(request.reference_type || request.reference_number || request.reference_amount) && (
                            <div className="bg-white p-5 rounded-lg shadow-sm border">
                                <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider mb-3 border-b pb-2">Underlying Reference</h4>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-1">
                                    <DetailRow label="Reference Type" value={request.reference_type?.replace(/_/g, ' ')} icon={FileText} />
                                    <DetailRow label="Reference Number" value={request.reference_number} icon={Hash} />
                                    <DetailRow label="Reference Amount" value={request.reference_amount ? `${refCurrencyCode || currencyCode} ${parseFloat(request.reference_amount).toLocaleString()}` : null} icon={DollarSign} />
                                    <DetailRow label="Start Date" value={request.reference_start_date} icon={Calendar} />
                                    <DetailRow label="End Date" value={request.reference_end_date} icon={Calendar} />
                                    {request.project && (
                                        <DetailRow label="Linked Project" value={`${request.project.name} (${request.project.project_type?.replace(/_/g, ' ')}${request.project.reference_number ? ' · #' + request.project.reference_number : ''})`} icon={Briefcase} highlight />
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Beneficiary */}
                        <div className="bg-white p-5 rounded-lg shadow-sm border">
                            <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider mb-3 border-b pb-2">Beneficiary</h4>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-1">
                                <DetailRow label="Beneficiary ID" value={request.beneficiary_id_number} icon={Hash} />
                                <DetailRow label="Name" value={request.beneficiary_name} icon={Building} />
                                <DetailRow label="Country" value={request.beneficiary_country} icon={Globe} />
                                <DetailRow label="Address" value={request.beneficiary_address} />
                                <DetailRow label="Contact Person" value={request.beneficiary_contact_person} icon={User} />
                                <DetailRow label="Phone" value={request.beneficiary_phone} />
                                <DetailRow label="Email" value={request.beneficiary_email} />
                            </div>
                        </div>

                        {/* Beneficiary Near-Match Side Note */}
                        {nearMatches.length > 0 && (
                            <div className="bg-amber-50 p-4 rounded-lg border border-amber-300">
                                <h4 className="text-xs font-bold text-amber-800 uppercase tracking-wider mb-2 flex items-center gap-1">
                                    <AlertTriangle className="w-4 h-4" /> Similar Beneficiary Detected
                                </h4>
                                <p className="text-xs text-amber-700 mb-2">The beneficiary name on this request closely matches existing records:</p>
                                <div className="space-y-2">
                                    {nearMatches.map((nm, idx) => (
                                        <div key={idx} className="flex items-center justify-between bg-white p-2.5 rounded-md border border-amber-200">
                                            <div className="min-w-0">
                                                <p className="text-sm font-semibold text-gray-900">{nm.beneficiary_name}</p>
                                                {nm.beneficiary_id_number && <p className="text-[10px] text-gray-500">ID: {nm.beneficiary_id_number}</p>}
                                                <p className="text-[10px] text-gray-400">Last seen on: {nm.last_seen_request}</p>
                                            </div>
                                            <span className={`text-xs font-black px-2 py-0.5 rounded-full whitespace-nowrap ${
                                                nm.similarity >= 95 ? 'bg-red-200 text-red-900' : 'bg-amber-200 text-amber-900'
                                            }`}>
                                                {nm.similarity}% match
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Third Party */}
                        {request.is_third_party && (
                            <div className="bg-white p-5 rounded-lg shadow-sm border">
                                <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider mb-3 border-b pb-2">Third Party</h4>
                                <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                                    <DetailRow label="Name" value={request.third_party_name} />
                                    <DetailRow label="Relationship" value={request.third_party_relationship?.replace(/_/g, ' ')} />
                                    <DetailRow label="Address" value={request.third_party_address} />
                                </div>
                            </div>
                        )}

                        {/* Cross-Border */}
                        {request.is_cross_border && (
                            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                                <h4 className="text-xs font-bold text-blue-800 uppercase tracking-wider mb-2 flex items-center gap-1">
                                    <Globe className="w-4 h-4" /> Cross-Border Issuance
                                </h4>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-1">
                                    <DetailRow label="Issuing Country" value={request.issuance_country} icon={Globe} />
                                    {request.cross_border_details?.advising_bank_name && (
                                        <DetailRow label="Advising Bank" value={request.cross_border_details.advising_bank_name} />
                                    )}
                                    {request.cross_border_details?.advising_bank_swift && (
                                        <DetailRow label="Advising SWIFT" value={request.cross_border_details.advising_bank_swift} />
                                    )}
                                    {request.cross_border_details?.governing_law_country && (
                                        <DetailRow label="Governing Law" value={request.cross_border_details.governing_law_country} />
                                    )}
                                    {request.cross_border_details?.delivery_channel && (
                                        <DetailRow label="Delivery Channel" value={request.cross_border_details.delivery_channel.replace(/_/g, ' ')} />
                                    )}
                                    {request.cross_border_details?.beneficiary_bank_name && (
                                        <DetailRow label="Beneficiary Bank" value={request.cross_border_details.beneficiary_bank_name} />
                                    )}
                                    {request.cross_border_details?.beneficiary_bank_swift && (
                                        <DetailRow label="Beneficiary SWIFT" value={request.cross_border_details.beneficiary_bank_swift} />
                                    )}
                                    {request.cross_border_details?.requires_counter_guarantee && (
                                        <DetailRow label="Counter-Guarantee" value="Required" highlight />
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Special Wording */}
                        {request.requires_special_wording && (
                            <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                                <h4 className="text-xs font-bold text-purple-800 uppercase tracking-wider flex items-center gap-1">
                                    <FileWarning className="w-4 h-4" /> Requires Special Wording
                                </h4>
                            </div>
                        )}

                        {/* Other Conditions */}
                        {request.other_conditions && (
                            <div className="bg-white p-5 rounded-lg shadow-sm border">
                                <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider mb-3 border-b pb-2 flex items-center gap-1">
                                    <FileText className="w-4 h-4" /> Other Conditions / Requirements
                                </h4>
                                <p className="text-sm text-gray-700 whitespace-pre-wrap">{request.other_conditions}</p>
                            </div>
                        )}

                        {/* Urgency */}
                        {request.is_urgent && request.urgency_justification && (
                            <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                                <h4 className="text-xs font-bold text-red-800 uppercase tracking-wider mb-2 flex items-center gap-1">
                                    <AlertTriangle className="w-4 h-4" /> Urgency Justification
                                </h4>
                                <p className="text-sm text-red-900">{request.urgency_justification}</p>
                            </div>
                        )}

                        {/* Comments */}
                        {request.comments && (
                            <div className="bg-white p-5 rounded-lg shadow-sm border">
                                <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider mb-3 border-b pb-2 flex items-center gap-1">
                                    <MessageSquare className="w-4 h-4" /> Comments
                                </h4>
                                <p className="text-sm text-gray-700 whitespace-pre-wrap">{request.comments}</p>
                            </div>
                        )}

                        {/* Treasury Enrichment (read-only display) */}
                        {request.treasury_enrichment && Object.keys(request.treasury_enrichment).length > 0 && (
                            <div className="bg-emerald-50 p-5 rounded-lg border border-emerald-200">
                                <h4 className="text-xs font-bold text-emerald-800 uppercase tracking-wider mb-3 border-b border-emerald-200 pb-2 flex items-center gap-1">
                                    <ShieldCheck className="w-4 h-4" /> Treasury Enrichment
                                </h4>
                                <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                                    {request.treasury_enrichment.applicable_rules && (
                                        <DetailRow label="Rules (Treasury)" value={{
                                            'URDG_758': 'URDG 758', 'ISP_98': 'ISP98', 'LOCAL_LAW': 'Local Law'
                                        }[request.treasury_enrichment.applicable_rules] || request.treasury_enrichment.applicable_rules} />
                                    )}
                                    {request.treasury_enrichment.margin_instructions && (
                                        <DetailRow label="Margin Instructions" value={request.treasury_enrichment.margin_instructions} />
                                    )}
                                    {request.treasury_enrichment.internal_notes && (
                                        <DetailRow label="Internal Notes" value={request.treasury_enrichment.internal_notes} />
                                    )}
                                    {request.treasury_enrichment.enriched_at && (
                                        <DetailRow label="Enriched At" value={new Date(request.treasury_enrichment.enriched_at).toLocaleString()} icon={Calendar} />
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Custom Fields */}
                        {(request.custom_field_1_value || request.custom_field_2_value) && (
                            <div className="bg-white p-5 rounded-lg shadow-sm border">
                                <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider mb-3 border-b pb-2 flex items-center gap-1">
                                    <Settings className="w-4 h-4" /> Custom Fields
                                </h4>
                                <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                                    <DetailRow label={request.custom_field_1_label || 'Custom Field 1'} value={request.custom_field_1_value} />
                                    <DetailRow label={request.custom_field_2_label || 'Custom Field 2'} value={request.custom_field_2_value} />
                                </div>
                            </div>
                        )}

                        {/* Documents */}
                        <div className="bg-white p-5 rounded-lg shadow-sm border">
                            <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider mb-3 border-b pb-2 flex items-center gap-1">
                                <FileText className="w-4 h-4" /> Attached Documents
                                {documents.length > 0 && (
                                    <span className="bg-blue-100 text-blue-700 text-[10px] px-2 py-0.5 rounded-full font-bold ml-1">{documents.length}</span>
                                )}
                            </h4>
                            {loadingDocs ? (
                                <div className="flex items-center gap-2 text-sm text-gray-400 py-3"><Loader2 className="w-4 h-4 animate-spin" /> Loading documents...</div>
                            ) : documents.length === 0 ? (
                                <p className="text-sm text-gray-400 italic py-2">No documents uploaded.</p>
                            ) : (
                                <div className="space-y-2">
                                    {documents.map(doc => {
                                        const typeLabels = { CONTRACT: 'Contract/PO', SPECIAL_WORDING: 'Wording', FORMAL_REQUEST: 'Formal Request', THIRD_PARTY: 'Third Party', OTHER: 'Other' };
                                        const typeColors = { CONTRACT: 'bg-blue-100 text-blue-700', SPECIAL_WORDING: 'bg-purple-100 text-purple-700', FORMAL_REQUEST: 'bg-gray-100 text-gray-700', THIRD_PARTY: 'bg-amber-100 text-amber-700', OTHER: 'bg-gray-100 text-gray-600' };
                                        return (
                                            <div key={doc.id} className="flex items-center justify-between p-2.5 rounded-lg border border-gray-200 bg-gray-50 hover:bg-white transition">
                                                <div className="flex items-center gap-3 min-w-0 flex-1">
                                                    <FileText className="w-4 h-4 text-blue-500 flex-shrink-0" />
                                                    <div className="min-w-0">
                                                        <p className="text-sm font-medium text-gray-900 truncate">{doc.file_name}</p>
                                                        <div className="flex items-center gap-2 mt-0.5">
                                                            <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${typeColors[doc.document_type] || 'bg-gray-100 text-gray-600'}`}>
                                                                {typeLabels[doc.document_type] || doc.document_type}
                                                            </span>
                                                            {doc.created_at && <span className="text-[10px] text-gray-400">{new Date(doc.created_at).toLocaleDateString()}</span>}
                                                        </div>
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => handleDownloadDoc(doc.id, doc.file_name)}
                                                    className="text-blue-500 hover:text-blue-700 transition p-1.5 rounded hover:bg-blue-50"
                                                    title="Download"
                                                >
                                                    <Download className="w-4 h-4" />
                                                </button>
                                                {['CONTRACT', 'PURCHASE_ORDER', 'FORMAL_REQUEST'].includes(doc.document_type) && doc.file_name?.toLowerCase().endsWith('.pdf') && (
                                                    doc.ai_verification_result?.status === 'OK' ? (
                                                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold cursor-help ${
                                                            doc.ai_verification_result.mismatches === 0
                                                                ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                                                        }`} title={doc.ai_verification_result.mismatches === 0
                                                            ? `AI verified — ${doc.ai_verification_result.total_fields_compared} field(s) checked, all match`
                                                            : `AI found ${doc.ai_verification_result.mismatches} potential mismatch(es) out of ${doc.ai_verification_result.total_fields_compared}`
                                                        }>
                                                            {doc.ai_verification_result.mismatches === 0
                                                                ? <><CheckCircle className="w-3 h-3" /> Verified</>
                                                                : <><AlertTriangle className="w-3 h-3" /> {doc.ai_verification_result.mismatches} Issue{doc.ai_verification_result.mismatches !== 1 ? 's' : ''}</>
                                                            }
                                                        </span>
                                                    ) : (
                                                        <button
                                                            onClick={() => handleAnalyzeDoc(doc)}
                                                            disabled={analyzingDocId === doc.id}
                                                            className="text-violet-500 hover:text-violet-700 transition p-1.5 rounded hover:bg-violet-50"
                                                            title="AI Verify Document"
                                                        >
                                                            {analyzingDocId === doc.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileSearch className="w-4 h-4" />}
                                                        </button>
                                                    )
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* RIGHT — Approval Timeline & Actions */}
                    <div className="w-full lg:w-1/3 flex flex-col gap-4">

                        {/* Approval Progress Tracker — Full Lifecycle Roadmap */}
                        <div className="bg-white p-5 rounded-lg shadow-sm border">
                            <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider mb-4 border-b pb-2">Approval Roadmap</h4>
                            {request.status === 'DRAFT' ? (
                                <p className="text-sm text-gray-400 italic">Not yet submitted for approval.</p>
                            ) : (
                                <ApprovalProgressTracker
                                    requestId={request.id}
                                    requestStatus={request.status}
                                />
                            )}
                        </div>

                        {/* Potential Duplicates (Similarity Check) */}
                        <div className="bg-white rounded-lg shadow-sm border">
                            <button
                                onClick={() => setShowSimilarity(!showSimilarity)}
                                className="w-full px-5 py-3 flex items-center justify-between text-xs font-bold text-gray-800 uppercase tracking-wider hover:bg-gray-50 transition"
                            >
                                <span className="flex items-center gap-2">
                                    <Search className="w-4 h-4" />
                                    Duplicate Check
                                    {similarityData?.matches?.length > 0 && (
                                        <span className="bg-red-100 text-red-700 text-[10px] px-2 py-0.5 rounded-full font-bold">
                                            {similarityData.matches.length} match{similarityData.matches.length > 1 ? 'es' : ''}
                                        </span>
                                    )}
                                </span>
                                <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showSimilarity ? 'rotate-180' : ''}`} />
                            </button>
                            {showSimilarity && (
                                <div className="px-5 pb-4 border-t border-gray-100">
                                    {loadingSimilarity ? (
                                        <p className="text-sm text-gray-400 py-3 text-center">Scanning issued LGs...</p>
                                    ) : !similarityData?.matches?.length ? (
                                        <div className="py-3 text-center">
                                            <p className="text-sm text-green-600 font-medium">✓ No similar issued LGs found</p>
                                            <p className="text-[10px] text-gray-400 mt-1">Compared against {similarityData?.total_issued_compared || 0} issued LGs</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-3 pt-3">
                                            <p className="text-[10px] text-gray-400">Compared against {similarityData.total_issued_compared} issued LGs (last 3 years)</p>
                                            {similarityData.matches.map((m, i) => (
                                                <div key={i} className={`rounded-lg border p-3 text-sm ${m.score >= 90 ? 'bg-red-50 border-red-300' : 'bg-amber-50 border-amber-200'
                                                    }`}>
                                                    <div className="flex justify-between items-start mb-2">
                                                        <div>
                                                            <p className="font-bold text-gray-900">{m.lg_ref_number}</p>
                                                            <p className="text-xs text-gray-600">{m.beneficiary_name}</p>
                                                        </div>
                                                        <span className={`text-xs font-black px-2 py-0.5 rounded-full ${m.score >= 90 ? 'bg-red-200 text-red-900' : 'bg-amber-200 text-amber-900'
                                                            }`}>
                                                            {m.score}% match
                                                        </span>
                                                    </div>
                                                    <div className="flex gap-3 text-[10px] text-gray-500 mb-2">
                                                        <span>{m.currency} {parseFloat(m.amount).toLocaleString()}</span>
                                                        <span>•</span>
                                                        <span>{m.status}</span>
                                                        {m.expiry_date && <><span>•</span><span>Exp: {m.expiry_date}</span></>}
                                                    </div>
                                                    {/* Score Breakdown */}
                                                    <div className="flex gap-1 flex-wrap">
                                                        {Object.entries(m.breakdown || {}).map(([key, bd]) => (
                                                            <span key={key} className={`text-[9px] px-1.5 py-0.5 rounded font-medium ${bd.matched ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'
                                                                }`}>
                                                                {key === 'reference' ? 'Ref' : key === 'beneficiary' ? 'Ben' : key === 'amount' ? 'Amt' : key === 'lg_type' ? 'Type' : 'Exp'}
                                                                {bd.matched ? ` +${bd.score}` : ''}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Approve/Reject — only for designated approvers */}
                        {request.status === 'PENDING_APPROVAL' && isApprover && (
                            <div className="bg-yellow-50 p-5 rounded-lg shadow-sm border border-yellow-200">
                                <h4 className="text-sm font-bold text-yellow-800 uppercase tracking-wider mb-2 flex items-center">
                                    <ShieldCheck className="w-4 h-4 mr-2" /> Action Required
                                </h4>
                                <p className="text-xs text-yellow-700 mb-4">Review the details before registering your approval decision.</p>
                                <div className="flex space-x-3">
                                    <button
                                        onClick={() => handleAction('approve', 'approve')}
                                        disabled={isProcessing}
                                        className="flex-1 bg-green-600 hover:bg-green-700 text-white font-medium py-2 rounded-md shadow-sm text-sm transition-colors flex justify-center items-center"
                                    >
                                        <CheckCircle className="w-4 h-4 mr-2" /> Approve
                                    </button>
                                    <button
                                        onClick={() => handleAction('reject', 'reject')}
                                        disabled={isProcessing}
                                        className="flex-1 bg-red-100 hover:bg-red-200 text-red-800 font-medium py-2 rounded-md shadow-sm text-sm transition-colors flex justify-center items-center"
                                    >
                                        Reject
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Facility Matching */}
                        {request.status === 'APPROVED_INTERNAL' && (
                            <div className="bg-white p-5 rounded-lg shadow-sm border flex-1 flex flex-col">
                                <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider mb-4 border-b pb-2 flex items-center">
                                    <Building className="w-4 h-4 mr-2" /> Facility Matching
                                </h4>
                                {loadingFacilities ? (
                                    <div className="text-center py-4 text-gray-400 text-sm">Searching active facilities...</div>
                                ) : facilities.length === 0 ? (
                                    <div className="bg-amber-50 p-3 rounded text-amber-700 text-xs text-center border border-amber-200">
                                        No matching facilities found. This could be due to currency, LG type, or country restrictions.
                                    </div>
                                ) : (
                                    <div className="space-y-3 overflow-y-auto flex-1">
                                        {facilities.map(f => {
                                            const pct = f.utilization_pct || 0;
                                            const barColor = pct >= 90 ? 'bg-red-500' : pct >= 70 ? 'bg-amber-500' : 'bg-emerald-500';
                                            return (
                                                <div key={f.id + '-' + f.reference_number} className={`p-3 rounded-lg border text-sm ${f.tags?.includes('BEST_OVERALL') ? 'bg-blue-50 border-blue-200 ring-1 ring-blue-300' : f.isRecommended ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
                                                    <div className="flex justify-between items-start mb-1">
                                                        <p className="font-bold text-gray-900">{f.bank?.name}</p>
                                                        <div className="flex gap-1 flex-wrap justify-end">
                                                            {f.tags?.includes('BEST_OVERALL') && <span className="bg-blue-600 text-white text-[10px] px-2 py-0.5 rounded-full uppercase font-bold">★ Recommended</span>}
                                                            {f.tags?.includes('BEST_PRICE') && <span className="bg-green-600 text-white text-[10px] px-2 py-0.5 rounded-full uppercase font-bold">Best Price</span>}
                                                            {f.tags?.includes('FAST_TRACK') && <span className="bg-purple-600 text-white text-[10px] px-2 py-0.5 rounded-full uppercase font-bold">Fast Track</span>}
                                                            {f.tags?.includes('NO_MARGIN') && <span className="bg-teal-500 text-white text-[10px] px-2 py-0.5 rounded-full uppercase font-bold">No Margin</span>}
                                                            {f.tags?.includes('LOW_MARGIN') && <span className="bg-teal-400 text-white text-[10px] px-2 py-0.5 rounded-full uppercase font-bold">Low Margin</span>}
                                                            {!f.isRecommended && <span className="bg-amber-500 text-white text-[10px] px-2 py-0.5 rounded-full uppercase font-bold">Insufficient</span>}
                                                        </div>
                                                    </div>
                                                    <div className="flex justify-between items-center mb-2">
                                                        <p className="text-xs text-gray-600">{f.facility_name}</p>
                                                        <span className="text-[10px] font-bold text-slate-400">Score: {f.score}/100</span>
                                                    </div>
                                                    {/* Utilization Bar */}
                                                    <div className="mb-2">
                                                        <div className="flex justify-between text-[10px] text-gray-400 mb-0.5">
                                                            <span>Used: {parseFloat(f.total_used || 0).toLocaleString()}</span>
                                                            <span>{pct}%</span>
                                                        </div>
                                                        <div className="w-full bg-gray-200 rounded-full h-1.5">
                                                            <div className={`h-1.5 rounded-full ${barColor}`} style={{ width: `${Math.min(pct, 100)}%` }} />
                                                        </div>
                                                    </div>
                                                    <div className="flex justify-between items-center bg-white p-2 rounded border">
                                                        <span className="text-xs text-gray-500">Available</span>
                                                        <span className={`font-bold ${f.isRecommended ? 'text-green-700' : 'text-red-600'}`}>
                                                            {f.currency} {f.availableFormatted}
                                                        </span>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 rounded-b-xl flex justify-between items-center shrink-0">
                    <button
                        onClick={onClose}
                        className="px-6 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-md font-medium text-sm transition-colors"
                    >
                        Close
                    </button>
                    <div className="flex gap-2">
                        {/* === DRAFT ACTIONS === */}
                        {request.status === 'DRAFT' && (
                            <>
                                <button
                                    onClick={async () => {
                                        if (!window.confirm('Are you sure you want to permanently delete this draft?')) return;
                                        try {
                                            await apiRequest(`/issuance/requests/${request.id}`, 'DELETE');
                                            toast.success('Draft deleted');
                                            onStatusChange();
                                            onClose();
                                        } catch (err) {
                                            toast.error(err?.message || 'Failed to delete draft');
                                        }
                                    }}
                                    disabled={isProcessing}
                                    className="flex items-center gap-2 px-4 py-2 bg-red-50 border border-red-200 text-red-700 rounded-md font-medium text-sm hover:bg-red-100 transition-colors"
                                >
                                    <Trash2 className="w-4 h-4" /> Delete Draft
                                </button>
                                <button
                                    onClick={() => {
                                        onClose();
                                        navigate(`/issuance/requests/edit/${request.id}`);
                                    }}
                                    className="flex items-center gap-2 px-4 py-2 bg-gray-50 border border-gray-200 text-gray-700 rounded-md font-medium text-sm hover:bg-gray-100 transition-colors"
                                >
                                    <Edit3 className="w-4 h-4" /> Edit Draft
                                </button>
                                <button
                                    onClick={async () => {
                                        if (!window.confirm('Submit this draft for approval?')) return;
                                        try {
                                            setIsProcessing(true);
                                            await apiRequest(`/issuance/requests/${request.id}/submit`, 'POST');
                                            toast.success('Request submitted for approval');
                                            onStatusChange();
                                            onClose();
                                        } catch (err) {
                                            toast.error(err?.message || 'Failed to submit');
                                        } finally {
                                            setIsProcessing(false);
                                        }
                                    }}
                                    disabled={isProcessing}
                                    className="flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-semibold text-sm transition-colors shadow-sm"
                                >
                                    <Send className="w-4 h-4" /> Submit
                                </button>
                            </>
                        )}

                        {/* === RESERVE / RELEASE FACILITY === */}
                        {request.status === 'FACILITY_RESERVED' && (
                            <button
                                onClick={async () => {
                                    if (!window.confirm('Release the facility reservation? The reserved amount will be freed.')) return;
                                    try {
                                        setIsProcessing(true);
                                        await apiRequest(`/issuance/requests/${request.id}/release-reservation`, 'POST');
                                        toast.success('Facility reservation released');
                                        onStatusChange();
                                        onClose();
                                    } catch (err) {
                                        toast.error(err?.message || 'Failed to release reservation');
                                    } finally {
                                        setIsProcessing(false);
                                    }
                                }}
                                disabled={isProcessing}
                                className="flex items-center gap-2 px-4 py-2 bg-amber-50 border border-amber-200 text-amber-700 rounded-md font-medium text-sm hover:bg-amber-100 transition-colors"
                            >
                                <Unlock className="w-4 h-4" /> Release Reservation
                            </button>
                        )}

                        {/* Reprint letter — only available AFTER issuance */}
                        {request.status === 'ISSUED' && (
                            <button
                                onClick={() => setShowLetterDialog(true)}
                                className="flex items-center gap-2 px-4 py-2 bg-blue-50 border border-blue-200 text-blue-700 rounded-md font-medium text-sm hover:bg-blue-100 transition-colors"
                            >
                                <FileText className="w-4 h-4" /> Reprint Letter
                            </button>
                        )}

                        {/* Issue to Bank — available on APPROVED_INTERNAL or FACILITY_RESERVED */}
                        {userRole === 'end_user' && (request.status === 'APPROVED_INTERNAL' || request.status === 'FACILITY_RESERVED') && (
                            <button
                                onClick={() => setShowWizard(true)}
                                className="flex items-center gap-2 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md font-semibold text-sm transition-colors shadow-sm"
                            >
                                <Zap className="w-4 h-4" /> Issue to Bank
                            </button>
                        )}
                    </div>
                </div>

                {/* Letter Reprint Dialog */}
                {showLetterDialog && (
                    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
                        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
                            <div className="p-5 border-b border-slate-200">
                                <h3 className="text-lg font-bold text-slate-900">Reprint Letter</h3>
                                <p className="text-sm text-slate-500 mt-1">Add any extra instructions for the reprint</p>
                            </div>
                            <div className="p-5 space-y-4">
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Additional Instructions (Optional)</label>
                                    <textarea
                                        value={letterAdditionalText}
                                        onChange={e => setLetterAdditionalText(e.target.value)}
                                        className="w-full p-3 border border-slate-200 rounded-xl text-sm resize-none h-24"
                                        placeholder="Enter any additional instructions or notes for the bank..."
                                    />
                                </div>
                            </div>
                            <div className="p-5 border-t border-slate-200 flex justify-end gap-3">
                                <button onClick={() => setShowLetterDialog(false)}
                                    className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors">
                                    Cancel
                                </button>
                                <button
                                    onClick={async () => {
                                        try {
                                            setShowLetterDialog(false);
                                            toast.info('Generating bank letter...');
                                            const params = new URLSearchParams();
                                            if (letterAdditionalText) params.set('additional_text', letterAdditionalText);
                                            const url = `/issuance/requests/${request.id}/generate-letter${params.toString() ? '?' + params.toString() : ''}`;
                                            const blob = await apiRequest(url, 'GET', null, 'application/json', 'blob');
                                            const blobUrl = window.URL.createObjectURL(blob);
                                            window.open(blobUrl, '_blank');
                                        } catch (err) {
                                            toast.error(err.message || 'Failed to generate letter.');
                                        }
                                    }}
                                    className="px-6 py-2 bg-blue-600 text-white text-sm font-bold rounded-xl hover:bg-blue-700 shadow-lg transition-all flex items-center gap-2"
                                >
                                    <FileText className="w-4 h-4" /> Generate & Print
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* H2: Document Analysis Result Overlay */}
            {docAnalysis && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[70]" onClick={() => setDocAnalysis(null)}>
                    <div className="bg-white rounded-2xl max-w-lg w-full mx-4 max-h-[80vh] overflow-auto shadow-2xl" onClick={e => e.stopPropagation()}>
                        <div className="p-5 border-b border-slate-100">
                            <div className="flex justify-between items-center">
                                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                                    <FileSearch className="w-5 h-5 text-violet-600" />
                                    Document Verification
                                </h3>
                                <button onClick={() => setDocAnalysis(null)} className="text-slate-400 hover:text-slate-600 text-xl">×</button>
                            </div>
                            <p className="text-xs text-slate-400 mt-1">{docAnalysis.docName}</p>
                        </div>
                        <div className="p-5 space-y-3">
                            {docAnalysis.status === 'TOO_LARGE' && (
                                <div className="flex items-center gap-3 p-4 rounded-xl bg-amber-50 border border-amber-200">
                                    <AlertTriangle className="text-amber-600 shrink-0 w-5 h-5" />
                                    <p className="text-sm font-semibold text-amber-800">{docAnalysis.message}</p>
                                </div>
                            )}
                            {docAnalysis.status === 'ERROR' && (
                                <div className="flex items-center gap-3 p-4 rounded-xl bg-red-50 border border-red-200">
                                    <XCircle className="text-red-600 shrink-0 w-5 h-5" />
                                    <p className="text-sm font-semibold text-red-800">{docAnalysis.message}</p>
                                </div>
                            )}
                            {docAnalysis.status === 'OK' && (
                                <>
                                    {docAnalysis.summary && (
                                        <p className="text-sm text-slate-600 bg-slate-50 p-3 rounded-lg">{docAnalysis.summary}</p>
                                    )}
                                    <div className="flex items-center gap-2 p-2 rounded-lg bg-slate-50">
                                        <span className="text-sm font-bold text-slate-600">
                                            {docAnalysis.mismatches === 0
                                                ? '✅ All fields match the request'
                                                : `⚠️ ${docAnalysis.mismatches} potential mismatch${docAnalysis.mismatches > 1 ? 'es' : ''} found`
                                            }
                                        </span>
                                    </div>
                                    {docAnalysis.comparison?.map((c, i) => (
                                        <div key={i} className={`flex items-start gap-3 p-3 rounded-xl border ${
                                            c.match ? 'border-green-100 bg-green-50/50' : 'border-amber-100 bg-amber-50/50'
                                        }`}>
                                            {c.match ? <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 shrink-0" /> : <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />}
                                            <div className="flex-1">
                                                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">{c.label}</p>
                                                <div className="flex gap-4 mt-1">
                                                    <span className="text-xs"><span className="text-slate-400">Request:</span> <span className="font-bold text-slate-700">{c.request_value || '—'}</span></span>
                                                    <span className="text-xs"><span className="text-slate-400">Document:</span> <span className="font-bold text-slate-700">{c.document_value}</span></span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                    <p className="text-[10px] text-slate-400 italic text-center pt-2">This is an advisory AI analysis — for reference only</p>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Issuance Wizard */}
            {showWizard && (
                <IssuanceWizardModal
                    request={request}
                    matchedFacilities={facilities}
                    onClose={() => setShowWizard(false)}
                    onIssued={(result) => {
                        setShowWizard(false);
                        onClose();
                        if (typeof onStatusChange === 'function') onStatusChange('REFRESH');
                    }}
                />
            )}
        </div>
    );
}
