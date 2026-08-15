import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useSearchParams, useParams } from 'react-router-dom';
import { apiRequest, publicApiRequest } from '../../services/apiService';
import { toast } from 'react-toastify';
import {
    Loader2, Save, Send, AlertCircle, Info, CheckCircle, User, FileText, DollarSign,
    Building, ChevronLeft, ChevronRight, Search, X, Upload, Trash2, Clock, AlertTriangle, Edit3
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { COUNTRIES_FOR_SELECT as COUNTRIES } from '../../constants/countries';

// ──────────────────────────────────────────────
// CONSTANTS
// ──────────────────────────────────────────────
const UNHIDEABLE_FIELDS = [
    'amount', 'currency_id', 'requested_expiry_date',
    'beneficiary_name', 'lg_type_id', 'issuing_entity_id',
    'requestor_name', 'requestor_email', 'lg_purpose', 'beneficiary_country'
];

const STEP_LABELS = ['Requestor', 'Reference', 'LG Details', 'Beneficiary & Conditions'];
const STEP_ICONS = [User, FileText, DollarSign, Building];

const DEFAULT_REFERENCE_TYPES = [
    { id: 'CONTRACT', name: 'Contract' },
    { id: 'PROJECT', name: 'Project' },
    { id: 'PURCHASE_ORDER', name: 'Purchase Order' },
    { id: 'TENDER', name: 'Tender' },
    { id: 'OTHER', name: 'Other' },
];

const THIRD_PARTY_RELATIONSHIPS = [
    { id: 'SUBSIDIARY', name: 'Subsidiary' },
    { id: 'AGENT', name: 'Agent' },
    { id: 'SUBCONTRACTOR', name: 'Subcontractor' },
    { id: 'JOINT_VENTURE', name: 'Joint Venture' },
    { id: 'OTHER', name: 'Other' },
];


const inputClasses = (disabled) => `w-full p-3 rounded-xl border border-gray-200 shadow-sm text-sm text-slate-800 transition-all duration-200 focus:ring-4 focus:ring-blue-100 focus:border-blue-400 outline-none ${disabled ? 'bg-blue-50/50 text-slate-500 cursor-not-allowed' : 'bg-white hover:border-gray-300'}`;

// ──────────────────────────────────────────────
// COMPONENT
// ──────────────────────────────────────────────
export default function IssuanceRequestForm() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    const token = searchParams.get('token');
    const isPublic = !!token;
    const { id: routeEditId } = useParams(); // Present when editing via internal route /edit/:id
    const initialEditDraftId = routeEditId || searchParams.get('editDraftId'); // Also support query param for public
    const [draftId, setDraftId] = useState(initialEditDraftId || null); // Mutable — updated after first draft creation
    const [editingStatus, setEditingStatus] = useState(null); // Track original status when editing (DRAFT, SUBMITTED, etc.)

    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [currentStep, setCurrentStep] = useState(0);
    const [slideDir, setSlideDir] = useState('right');

    const [config, setConfig] = useState(null);
    const [entities, setEntities] = useState([]);
    const [currencies, setCurrencies] = useState([]);
    const [lgTypes, setLgTypes] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [projects, setProjects] = useState([]);

    // Track email that came from the token (only THAT email gets locked)
    const tokenEmailRef = useRef(null);

    // Beneficiary suggestions
    const [beneficiarySuggestions, setBeneficiarySuggestions] = useState([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const suggestTimeout = useRef(null);
    const dupRefTimeout = useRef(null);
    const [duplicateRefWarning, setDuplicateRefWarning] = useState(null);

    // Pending file uploads (collected before submit, uploaded after)
    const [pendingFiles, setPendingFiles] = useState([]);
    // Existing documents already attached to the request being edited
    const [existingDocuments, setExistingDocuments] = useState([]);

    // Track whether user has manually changed payable currency (stops auto-sync)
    const [payableCurrencyTouched, setPayableCurrencyTouched] = useState(false);

    // AI Document Verification state
    const [verificationResult, setVerificationResult] = useState(null); // {comparison, mismatches, summary, ...}
    const [showVerificationDialog, setShowVerificationDialog] = useState(false);
    const [verifying, setVerifying] = useState(false);
    const [pendingSubmitPayload, setPendingSubmitPayload] = useState(null); // payload to submit after verification
    // { file: File, type: 'CONTRACT'|'PURCHASE_ORDER'|'THIRD_PARTY'|'SPECIAL_WORDING'|'OTHER' }

    const addFile = (file, docType) => {
        if (file.size > 10 * 1024 * 1024) {
            toast.error('File size exceeds 10MB limit');
            return;
        }
        setPendingFiles(prev => [...prev, { file, type: docType, name: file.name }]);
    };

    const removeFile = (index) => {
        setPendingFiles(prev => prev.filter((_, i) => i !== index));
    };

    const [formData, setFormData] = useState({
        issuing_entity_id: '', requestor_name: '', requestor_email: '', department: 'General',
        job_title: '', phone_number: '', employee_id: '', manager_email: '', second_line_manager_email: '',
        reference_type: '', reference_number: '', reference_amount: '', reference_currency_id: '',
        project_id: '',
        reference_start_date: '', reference_end_date: '', lg_type_id: '', lg_purpose: '', amount: '',
        currency_id: '', payable_currency_id: '', requested_issue_date: new Date().toISOString().split('T')[0],
        requested_expiry_date: '', operational_status: '', lg_language: 'EN', is_auto_reducing: false, reduction_trigger: '',
        other_conditions: '', beneficiary_id_number: '', beneficiary_name: '', beneficiary_address: '',
        beneficiary_contact_person: '', beneficiary_phone: '', beneficiary_email: '', beneficiary_country: '',
        is_third_party: false, third_party_name: '', third_party_address: '', third_party_relationship: '',
        is_cross_border: false, issuance_country: '', applicable_rules: '',
        cross_border_details: {},
        requires_special_wording: false,
        is_urgent: false, urgency_justification: '', comments: '',
        custom_field_1_value: '', custom_field_2_value: '',
        change_reason: ''
    });

    // ──────────────────────────────────────────────
    // DATA LOADING
    // ──────────────────────────────────────────────
    useEffect(() => { fetchInitialData(); }, []);

    // Load draft data when editing an existing draft
    useEffect(() => {
        if (initialEditDraftId) {
            loadDraftData(initialEditDraftId);
        }
    }, [initialEditDraftId]);

    const loadDraftData = async (draftId) => {
        try {
            let draft;
            if (isPublic) {
                const safeToken = encodeURIComponent(token);
                draft = await publicApiRequest(`/public-issuance/requests/${draftId}?token=${safeToken}`, 'GET');
            } else {
                draft = await apiRequest(`/issuance/requests/${draftId}`, 'GET');
            }
            const EDITABLE_STATUSES = ['DRAFT', 'SUBMITTED', 'PENDING_APPROVAL', 'APPROVED', 'APPROVED_INTERNAL', 'FACILITY_RESERVED', 'REVISION_REQUIRED'];
            if (!EDITABLE_STATUSES.includes(draft.status)) {
                toast.error('This request cannot be edited in its current status.');
                if (isPublic) {
                    navigate(`/public-issuance/dashboard?token=${encodeURIComponent(token)}`);
                } else {
                    navigate(-1);
                }
                return;
            }
            setEditingStatus(draft.status);
            // Pre-fill form with existing draft data
            const fillData = {};
            Object.keys(formData).forEach(key => {
                if (draft[key] !== null && draft[key] !== undefined) {
                    if (typeof draft[key] === 'boolean') {
                        fillData[key] = draft[key];
                    } else if (typeof draft[key] === 'object') {
                        // Keep objects/arrays as-is (e.g. cross_border_details)
                        fillData[key] = draft[key];
                    } else {
                        fillData[key] = String(draft[key]);
                    }
                }
            });
            setFormData(prev => ({ ...prev, ...fillData }));

            // Load existing documents so they appear in the form
            if (!isPublic) {
                try {
                    const docs = await apiRequest(`/issuance/requests/${draftId}/documents`, 'GET');
                    if (Array.isArray(docs) && docs.length > 0) {
                        setExistingDocuments(docs);
                    }
                } catch (docErr) {
                    console.warn('Could not load existing documents:', docErr);
                }
            }

            toast.info('Draft loaded. You can continue editing.');
        } catch (err) {
            toast.error('Failed to load draft.');
            if (isPublic) {
                navigate(`/public-issuance/dashboard?token=${encodeURIComponent(token)}`);
            } else {
                navigate('/issuance/requests');
            }
        }
    };

    const fetchInitialData = async () => {
        try {
            if (isPublic) {
                const safeToken = encodeURIComponent(token);
                const [configData, dictData] = await Promise.all([
                    publicApiRequest(`/public-issuance/form-config?token=${safeToken}`, 'GET'),
                    publicApiRequest(`/public-issuance/dictionaries?token=${safeToken}`, 'GET')
                ]);
                setConfig(configData);
                setEntities(dictData.entities);
                setCurrencies(dictData.currencies);
                setLgTypes(dictData.lgTypes);
                // Set departments from server (not hardcoded)
                if (dictData.departments && dictData.departments.length > 0) {
                    setDepartments(dictData.departments);
                }
                if (dictData.projects) {
                    setProjects(dictData.projects);
                }
                const tokenEmail = dictData.email || '';
                if (tokenEmail) {
                    tokenEmailRef.current = tokenEmail;
                    setFormData(prev => {
                        const updated = {
                            ...prev,
                            requestor_email: tokenEmail
                        };
                        // Resolve department: prefer token dept if it matches a real dept,
                        // otherwise auto-select if only 1 dept, else leave blank for user to pick
                        const deptNames = (dictData.departments || []).map(d => d.name || d);
                        const tokenDept = dictData.department || '';
                        if (deptNames.length === 1) {
                            updated.department = deptNames[0];
                        } else if (tokenDept && deptNames.includes(tokenDept)) {
                            updated.department = tokenDept;
                        } else if (deptNames.length > 0) {
                            updated.department = ''; // force user to pick
                        }
                        // Auto-select single-option dropdowns
                        if (dictData.entities?.length === 1 && !prev.issuing_entity_id) updated.issuing_entity_id = String(dictData.entities[0].id);
                        if (dictData.lgTypes?.length === 1 && !prev.lg_type_id) updated.lg_type_id = String(dictData.lgTypes[0].id);
                        if (dictData.currencies?.length === 1 && !prev.currency_id) {
                            updated.currency_id = String(dictData.currencies[0].id);
                            if (!prev.payable_currency_id) updated.payable_currency_id = String(dictData.currencies[0].id);
                        }
                        return updated;
                    });
                    fetchPreviousRequestorData(tokenEmail);
                } else {
                    setFormData(prev => {
                        const updated = { ...prev };
                        // Resolve department same way
                        const deptNames = (dictData.departments || []).map(d => d.name || d);
                        const tokenDept = dictData.department || '';
                        if (deptNames.length === 1) {
                            updated.department = deptNames[0];
                        } else if (tokenDept && deptNames.includes(tokenDept)) {
                            updated.department = tokenDept;
                        } else if (deptNames.length > 0) {
                            updated.department = '';
                        }
                        // Auto-select single-option dropdowns
                        if (dictData.entities?.length === 1 && !prev.issuing_entity_id) updated.issuing_entity_id = String(dictData.entities[0].id);
                        if (dictData.lgTypes?.length === 1 && !prev.lg_type_id) updated.lg_type_id = String(dictData.lgTypes[0].id);
                        if (dictData.currencies?.length === 1 && !prev.currency_id) {
                            updated.currency_id = String(dictData.currencies[0].id);
                            if (!prev.payable_currency_id) updated.payable_currency_id = String(dictData.currencies[0].id);
                        }
                        return updated;
                    });
                }
            } else {
                const [configData, dictData] = await Promise.all([
                    apiRequest('/issuance/form-config', 'GET').catch(() => null),
                    apiRequest('/issuance/form-dictionary', 'GET').catch(() => ({})),
                ]);
                const currData = dictData.currencies || [];
                const entData = (dictData.entities || []).map(e => ({ ...e, entity_name: e.name }));
                const typesData = dictData.lgTypes || [];
                const deptsData = (dictData.departments || []).map(d => typeof d === 'string' ? { id: d, name: d } : d);
                setConfig(configData);
                setCurrencies(currData);
                setEntities(entData);
                setLgTypes(typesData);
                setDepartments(deptsData);
                // Auto-select single-option dropdowns for internal users
                setFormData(prev => {
                    const updated = { ...prev };
                    if (entData?.length === 1 && !prev.issuing_entity_id) updated.issuing_entity_id = String(entData[0].id);
                    if (typesData?.length === 1 && !prev.lg_type_id) updated.lg_type_id = String(typesData[0].id);
                    if (currData?.length === 1 && !prev.currency_id) {
                        updated.currency_id = String(currData[0].id);
                        if (!prev.payable_currency_id) updated.payable_currency_id = String(currData[0].id);
                    }
                    if (deptsData?.length === 1) updated.department = deptsData[0].name || deptsData[0];
                    return updated;
                });
                // Fetch projects for corporate admin users only
                try {
                    const token = localStorage.getItem('jwt_token');
                    const payload = token ? JSON.parse(atob(token.split('.')[1])) : {};
                    if (payload.role === 'corporate_admin' || payload.role === 'checker') {
                        const projData = await apiRequest('/corporate-admin/projects/', 'GET');
                        setProjects(projData || []);
                    }
                } catch (e) { /* projects not critical */ }
            }
        } catch (error) {
            console.error("Form Load Error:", error);
            toast.error(isPublic ? t('pages.publicIssuanceForm.messages.sessionExpired') : t('pages.publicIssuanceForm.messages.loadFailed'));
            if (isPublic) navigate('/login');
        } finally {
            setLoading(false);
        }
    };

    const fetchPreviousRequestorData = async (email) => {
        if (!email || !email.includes('@')) return;
        try {
            const safeToken = isPublic ? encodeURIComponent(token) : '';
            const endpoint = isPublic
                ? `/public-issuance/previous-requestor?token=${safeToken}&email=${encodeURIComponent(email)}`
                : `/issuance/previous-requestor?email=${encodeURIComponent(email)}`;
            const data = await (isPublic ? publicApiRequest(endpoint, 'GET') : apiRequest(endpoint, 'GET'));
            if (data && data.found) {
                setFormData(prev => ({
                    ...prev,
                    requestor_name: prev.requestor_name || data.requestor_name || '',
                    job_title: prev.job_title || data.job_title || '',
                    phone_number: prev.phone_number || data.phone_number || '',
                    employee_id: prev.employee_id || data.employee_id || '',
                    manager_email: prev.manager_email || data.manager_email || '',
                    second_line_manager_email: prev.second_line_manager_email || data.second_line_manager_email || '',
                    department: prev.department || data.department || 'General'
                }));
                toast.info('Previous request data loaded — please review');
            }
        } catch (e) {
            console.log('Previous requestor lookup not available:', e.message);
        }
    };

    // ──────────────────────────────────────────────
    // BENEFICIARY LOOKUP
    // ──────────────────────────────────────────────
    const lookupBeneficiaryById = async (idNumber) => {
        if (!idNumber) return;
        try {
            const safeToken = isPublic ? encodeURIComponent(token) : '';
            const endpoint = isPublic
                ? `/public-issuance/beneficiary-lookup?token=${safeToken}&id_number=${encodeURIComponent(idNumber)}`
                : `/issuance/beneficiary-lookup?id_number=${encodeURIComponent(idNumber)}`;
            const data = await (isPublic ? publicApiRequest(endpoint, 'GET') : apiRequest(endpoint, 'GET'));
            if (data && data.found) {
                setFormData(prev => ({
                    ...prev,
                    beneficiary_name: data.beneficiary_name || prev.beneficiary_name,
                    beneficiary_country: data.beneficiary_country || prev.beneficiary_country,
                    beneficiary_address: data.beneficiary_address || prev.beneficiary_address,
                    beneficiary_contact_person: data.beneficiary_contact_person || prev.beneficiary_contact_person,
                    beneficiary_phone: data.beneficiary_phone || prev.beneficiary_phone,
                    beneficiary_email: data.beneficiary_email || prev.beneficiary_email,
                }));
                toast.info('Beneficiary data loaded from previous records');
            }
        } catch (e) { /* silently fail */ }
    };

    const suggestBeneficiary = useCallback(async (name) => {
        if (!name || name.length < 3) { setBeneficiarySuggestions([]); return; }
        try {
            const safeToken = isPublic ? encodeURIComponent(token) : '';
            const endpoint = isPublic
                ? `/public-issuance/beneficiary-suggest?token=${safeToken}&name=${encodeURIComponent(name)}`
                : `/issuance/beneficiary-suggest?name=${encodeURIComponent(name)}`;
            const data = await (isPublic ? publicApiRequest(endpoint, 'GET') : apiRequest(endpoint, 'GET'));
            if (data && data.length > 0) {
                setBeneficiarySuggestions(data);
                setShowSuggestions(true);
            } else {
                setBeneficiarySuggestions([]);
            }
        } catch (e) { setBeneficiarySuggestions([]); }
    }, [isPublic, token]);

    const applyBeneficiarySuggestion = (suggestion) => {
        setFormData(prev => ({
            ...prev,
            beneficiary_name: suggestion.beneficiary_name || prev.beneficiary_name,
            beneficiary_id_number: suggestion.beneficiary_id_number || prev.beneficiary_id_number,
            beneficiary_country: suggestion.beneficiary_country || prev.beneficiary_country,
            beneficiary_address: suggestion.beneficiary_address || prev.beneficiary_address,
            beneficiary_contact_person: suggestion.beneficiary_contact_person || prev.beneficiary_contact_person,
            beneficiary_phone: suggestion.beneficiary_phone || prev.beneficiary_phone,
            beneficiary_email: suggestion.beneficiary_email || prev.beneficiary_email,
        }));
        setShowSuggestions(false);
    };

    // ──────────────────────────────────────────────
    // HELPERS
    // ──────────────────────────────────────────────
    const isVisible = (fieldName) => {
        if (UNHIDEABLE_FIELDS.includes(fieldName)) return true;
        if (!config || !config.field_configurations) return true;
        return config.field_configurations[fieldName]?.is_visible !== false;
    };

    const isMandatory = (fieldName) => {
        if (UNHIDEABLE_FIELDS.includes(fieldName)) return true;
        if (!config || !config.field_configurations) return false;
        return config.field_configurations[fieldName]?.is_mandatory === true;
    };

    const isDocVisible = (docType) => {
        // Special Wording is always visible when requires_special_wording is checked
        if (docType === 'SPECIAL_WORDING' && formData.requires_special_wording) return true;
        // Third Party is ONLY visible when the toggle is ON
        if (docType === 'THIRD_PARTY' && !formData.is_third_party) return false;
        
        if (!config?.document_config?.[docType]) return true; // default visible
        return config.document_config[docType].is_visible !== false;
    };

    const isDocMandatory = (docType) => {
        // Special Wording is ONLY mandatory when the toggle is ON
        if (docType === 'SPECIAL_WORDING') return formData.requires_special_wording === true;
        // Third Party is ONLY mandatory when the toggle is ON and config requires it
        if (docType === 'THIRD_PARTY') {
            if (!formData.is_third_party) return false;
            if (!config?.document_config?.[docType]) return false;
            return config.document_config[docType].is_mandatory === true;
        }
        
        if (!config?.document_config?.[docType]) return false;
        return config.document_config[docType].is_mandatory === true;
    };

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        let newValue = type === 'checkbox' ? checked : value;

        if (name === 'phone_number' || name === 'beneficiary_phone') {
            newValue = value.replace(/(?!^\+)[^\d]/g, '');
        }

        setFormData(prev => {
            const updated = { ...prev, [name]: newValue };
            if (name === 'currency_id') {
                // Always mirror payable currency to LG currency unless user deliberately changed it
                if (!payableCurrencyTouched) {
                    updated.payable_currency_id = newValue;
                }
            }
            if (name === 'payable_currency_id') {
                // User explicitly picked a payable currency — stop auto-syncing
                setPayableCurrencyTouched(newValue !== formData.currency_id);
            }
            return updated;
        });

        // Debounced beneficiary name suggest
        if (name === 'beneficiary_name') {
            clearTimeout(suggestTimeout.current);
            suggestTimeout.current = setTimeout(() => suggestBeneficiary(newValue), 400);
        }
    };

    const selectedLgType = lgTypes.find(t => t.id?.toString() === formData.lg_type_id?.toString());
    const isAdvancePayment = selectedLgType && selectedLgType.name.toLowerCase().includes('advance');

    // ──────────────────────────────────────────────
    // DUPLICATE REFERENCE CHECK (useEffect-based)
    // ──────────────────────────────────────────────
    useEffect(() => {
        const refType = formData.reference_type;
        const refNum = formData.reference_number;
        const benName = formData.beneficiary_name;
        const amount = formData.amount;
        const lgTypeId = formData.lg_type_id;
        const expDate = formData.requested_expiry_date;
        
        if ((!refType || !refNum || refNum.length < 1) && !benName && !amount && !lgTypeId && !expDate) {
            setDuplicateRefWarning(null);
            return;
        }
        
        const timer = setTimeout(async () => {
            try {
                let data;
                const payload = {
                    reference_type: refType || null,
                    reference_number: refNum || null,
                    beneficiary_name: benName || null,
                    amount: amount ? parseFloat(amount) : null,
                    currency: formData.currency_id 
                        ? (currencies.find(c => c.id === parseInt(formData.currency_id))?.iso_code || formData.currency_id) 
                        : null,
                    lg_type_id: lgTypeId ? parseInt(lgTypeId) : null,
                    requested_expiry_date: expDate || null,
                    exclude_request_id: draftId ? parseInt(draftId) : null
                };

                if (isPublic) {
                    payload.token = token;
                    data = await publicApiRequest('/public-issuance/pre-submit-similarity', 'POST', payload);
                } else {
                    data = await apiRequest('/issuance/pre-submit-similarity', 'POST', payload);
                }
                
                if (data && data.found && data.matches?.length > 0) {
                    setDuplicateRefWarning(data.matches);
                    // Auto-recall: fill blank reference fields from most recent match that is an exact ref match
                    const exactMatch = data.matches.find(m => m.exact_ref && m.recall_data);
                    if (exactMatch && exactMatch.recall_data) {
                        setFormData(prev => {
                            const updated = { ...prev };
                            const rd = exactMatch.recall_data;
                            let filled = false;
                            if (!prev.reference_amount && rd.reference_amount) { updated.reference_amount = rd.reference_amount; filled = true; }
                            if (!prev.reference_currency_id && rd.reference_currency_id) { updated.reference_currency_id = String(rd.reference_currency_id); filled = true; }
                            if (!prev.reference_start_date && rd.reference_start_date) { updated.reference_start_date = rd.reference_start_date; filled = true; }
                            if (!prev.reference_end_date && rd.reference_end_date) { updated.reference_end_date = rd.reference_end_date; filled = true; }
                            if (!prev.project_id && rd.project_id) { updated.project_id = String(rd.project_id); filled = true; }
                            if (filled) toast.info('Reference details recalled from a previous request');
                            return updated;
                        });
                    }
                } else {
                    setDuplicateRefWarning(null);
                }
            } catch (e) {
                console.error('Similarity check failed:', e);
                setDuplicateRefWarning(null);
            }
        }, 800);
        return () => clearTimeout(timer);
    }, [formData.reference_type, formData.reference_number, formData.beneficiary_name, formData.amount, formData.lg_type_id, formData.requested_expiry_date, draftId]);

    // Tenor calculation
    const calcTenor = () => {
        if (!formData.requested_issue_date || !formData.requested_expiry_date) return null;
        const start = new Date(formData.requested_issue_date);
        const end = new Date(formData.requested_expiry_date);
        if (end <= start) return null;
        const diffMs = end - start;
        const days = Math.round(diffMs / (1000 * 60 * 60 * 24));
        const months = Math.floor(days / 30);
        const remainDays = days % 30;
        if (months > 0) return `${months} month${months > 1 ? 's' : ''}${remainDays > 0 ? `, ${remainDays} day${remainDays > 1 ? 's' : ''}` : ''}`;
        return `${days} day${days > 1 ? 's' : ''}`;
    };

    // ──────────────────────────────────────────────
    // STEP VALIDATION
    // ──────────────────────────────────────────────
    const validateStep = (step) => {
        const errors = [];
        if (step === 0) {
            if (!formData.issuing_entity_id) errors.push('Issuing Entity is required');
            if (!formData.requestor_name) errors.push('Requestor Name is required');
            if (!formData.requestor_email || !formData.requestor_email.includes('@')) errors.push('Valid work email is required');
        }
        if (step === 1) {
            if (formData.reference_end_date) {
                if (formData.reference_start_date && formData.reference_end_date < formData.reference_start_date) {
                    errors.push('Reference end date must be on or after start date');
                }
                const today = new Date().toISOString().split('T')[0];
                if (formData.reference_end_date < today) {
                    errors.push('Reference end date must be in the future');
                }
            }
        }
        if (step === 2) {
            if (!formData.lg_type_id) errors.push('LG Type is required');
            if (!formData.amount || parseFloat(formData.amount) <= 0) errors.push('LG Amount must be greater than 0');
            if (!formData.currency_id) errors.push('LG Currency is required');
            if (!formData.lg_purpose) errors.push('LG Purpose is required');
            if (!formData.requested_expiry_date) errors.push('Maturity Date is required');
            if (formData.requested_issue_date && formData.requested_expiry_date && formData.requested_expiry_date <= formData.requested_issue_date) {
                errors.push('Maturity Date must be after Issue Date');
            }
            if (isAdvancePayment && !formData.operational_status) {
                errors.push('Operational Status is required for Advance Payment Guarantees');
            }
        }
        if (step === 3) {
            if (!formData.beneficiary_name) errors.push('Beneficiary Name is required');
            if (!formData.beneficiary_country) errors.push('Beneficiary Country is required');
            if (formData.is_third_party && !formData.third_party_name) errors.push('Third Party Name is required');
            if (formData.is_cross_border && !formData.issuance_country) errors.push('Issuance Country is required');
            if (formData.is_urgent && !formData.urgency_justification) errors.push('Urgency Justification is required');
            // Mandatory document validation — skip if existing document of that type already attached
            const mandatoryDocTypes = ['CONTRACT', 'THIRD_PARTY', 'SPECIAL_WORDING', 'OTHER'].filter(dt => isDocMandatory(dt) && isDocVisible(dt));
            mandatoryDocTypes.forEach(dt => {
                const hasNewFile = pendingFiles.some(f => f.type === dt);
                const hasExisting = existingDocuments.some(d => d.document_type === dt);
                if (!hasNewFile && !hasExisting) {
                    const docLabels = { CONTRACT: 'Contract / Purchase Order', THIRD_PARTY: 'Third Party Document', SPECIAL_WORDING: 'Special Wording Template', OTHER: 'Other Supporting Document' };
                    errors.push(`${docLabels[dt] || dt} is required`);
                }
            });
        }
        return errors;
    };

    const goNext = () => {
        const errors = validateStep(currentStep);
        if (errors.length > 0) {
            errors.forEach(e => toast.error(e));
            return;
        }
        setSlideDir('right');
        setCurrentStep(prev => Math.min(prev + 1, 3));
    };

    const goBack = () => {
        setSlideDir('left');
        setCurrentStep(prev => Math.max(prev - 1, 0));
    };

    // ──────────────────────────────────────────────
    // FILE UPLOAD HELPER
    // ──────────────────────────────────────────────
    const uploadPendingFiles = async (requestId, usePublicApi) => {
        for (const pf of pendingFiles) {
            try {
                const fd = new FormData();
                fd.append('file', pf.file);
                const API_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8000/api/v1';
                if (usePublicApi) {
                    const safeToken = encodeURIComponent(token);
                    await fetch(`${API_URL}/public-issuance/requests/${requestId}/documents?token=${safeToken}&document_type=${pf.type}`, {
                        method: 'POST', body: fd
                    });
                } else {
                    const authToken = localStorage.getItem('jwt_token');
                    await fetch(`${API_URL}/issuance/requests/${requestId}/documents?document_type=${pf.type}`, {
                        method: 'POST', body: fd,
                        headers: { 'Authorization': `Bearer ${authToken}` }
                    });
                }
            } catch (e) {
                console.error('File upload failed:', pf.name, e);
                toast.warning(`Document "${pf.name}" upload failed — you can re-upload later`);
            }
        }
    };

    // ──────────────────────────────────────────────
    // SUBMIT
    // ──────────────────────────────────────────────
    const handleAction = async (actionType) => {
        if (actionType === 'SUBMIT') {
            const allErrors = [0, 1, 2, 3].flatMap(s => validateStep(s));
            if (allErrors.length > 0) {
                allErrors.forEach(e => toast.error(e));
                return;
            }
        }

        setSubmitting(true);
        try {
            const payload = { ...formData };
            Object.keys(payload).forEach(key => { if (payload[key] === '') payload[key] = null; });

            const intFields = ['issuing_entity_id', 'lg_type_id', 'currency_id', 'payable_currency_id', 'reference_currency_id', 'project_id'];
            intFields.forEach(f => {
                if (payload[f] !== null && payload[f] !== undefined) {
                    payload[f] = parseInt(payload[f], 10);
                    if (isNaN(payload[f])) payload[f] = null;
                }
            });

            if (payload.amount) payload.amount = parseFloat(payload.amount);
            if (payload.reference_amount) payload.reference_amount = parseFloat(payload.reference_amount);

            if (isPublic) {
                const safeToken = encodeURIComponent(token);
                if (draftId) {
                    // Editing an existing draft — update via PUT first
                    await publicApiRequest(`/public-issuance/requests/${draftId}?token=${safeToken}`, 'PUT', payload);
                    if (pendingFiles.length > 0) {
                        await uploadPendingFiles(draftId, true);
                    }
                    if (actionType === 'SUBMIT') {
                        // Check for CONTRACT documents to verify with AI
                        const contractFiles = pendingFiles.filter(pf => pf.type === 'CONTRACT' && pf.file.name?.toLowerCase().endsWith('.pdf'));
                        if (contractFiles.length > 0) {
                            setVerifying(true);
                            try {
                                const fd = new FormData();
                                fd.append('file', contractFiles[0].file);
                                const API_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8000/api/v1';
                                const resp = await fetch(`${API_URL}/public-issuance/requests/${draftId}/analyze-document?token=${safeToken}&doc_type=CONTRACT`, {
                                    method: 'POST', body: fd
                                });
                                const result = await resp.json();
                                if (result.status === 'OK' && result.mismatches > 0) {
                                    // Show verification dialog — let user decide
                                    setVerificationResult(result);
                                    setPendingSubmitPayload({ editDraftId: draftId, safeToken, payload });
                                    setShowVerificationDialog(true);
                                    setSubmitting(false);
                                    setVerifying(false);
                                    return; // Stop here — user will choose
                                }
                                // If all matched or AI error → proceed
                                if (result.status === 'OK') {
                                    setVerificationResult(result); // store for display
                                }
                            } catch (err) {
                                console.warn('AI verification failed, proceeding anyway:', err);
                            }
                            setVerifying(false);
                        }
                        // Submit the SAME updated draft, not a new request
                        await publicApiRequest(`/public-issuance/requests/${draftId}/submit?token=${safeToken}`, 'POST', payload);
                        setIsSuccess(true);
                    } else {
                        toast.success('Draft updated!');
                        navigate(`/public-issuance/dashboard?token=${safeToken}`);
                    }
                } else if (actionType === 'DRAFT') {
                    // New draft — save without submitting
                    const created = await publicApiRequest(`/public-issuance/save-draft?token=${safeToken}`, 'POST', payload);
                    if (pendingFiles.length > 0 && created?.id) {
                        await uploadPendingFiles(created.id, true);
                    }
                    toast.success('Draft saved! You can find it in your requests dashboard.');
                    navigate(`/public-issuance/dashboard?token=${safeToken}`);
                } else {
                    // New submission — first save draft to get an ID, upload files, verify, then submit
                    const created = await publicApiRequest(`/public-issuance/save-draft?token=${safeToken}`, 'POST', payload);
                    if (!created?.id) {
                        toast.error('Failed to prepare request for submission');
                        return;
                    }
                    // CRITICAL: Store the draft ID so "Cancel & Edit" reuses it
                    setDraftId(created.id);
                    if (pendingFiles.length > 0) {
                        await uploadPendingFiles(created.id, true);
                    }
                    // AI verification on CONTRACT documents
                    const contractFiles = pendingFiles.filter(pf => pf.type === 'CONTRACT' && pf.file.name?.toLowerCase().endsWith('.pdf'));
                    if (contractFiles.length > 0) {
                        setVerifying(true);
                        try {
                            const fd = new FormData();
                            fd.append('file', contractFiles[0].file);
                            const API_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8000/api/v1';
                            const resp = await fetch(`${API_URL}/public-issuance/requests/${created.id}/analyze-document?token=${safeToken}&doc_type=CONTRACT`, {
                                method: 'POST', body: fd
                            });
                            const result = await resp.json();
                            if (result.status === 'OK' && result.mismatches > 0) {
                                setVerificationResult(result);
                                setPendingSubmitPayload({ editDraftId: created.id, safeToken, payload });
                                setShowVerificationDialog(true);
                                setSubmitting(false);
                                setVerifying(false);
                                return;
                            }
                            if (result.status === 'OK') {
                                setVerificationResult(result);
                            }
                        } catch (err) {
                            console.warn('AI verification failed, proceeding anyway:', err);
                        }
                        setVerifying(false);
                    }
                    // Submit
                    await publicApiRequest(`/public-issuance/requests/${created.id}/submit?token=${safeToken}`, 'POST', payload);
                    setIsSuccess(true);
                }
            } else if (draftId) {
                const isPostSubmission = editingStatus && editingStatus !== 'DRAFT' && editingStatus !== 'REVISION_REQUIRED';
                const requireChangeReason = editingStatus && editingStatus !== 'DRAFT';

                if (requireChangeReason && !payload.change_reason) {
                    toast.error('A change reason is required when editing this request.');
                    setSubmitting(false);
                    return;
                }

                // Strip change_reason from payload ONLY if editing DRAFT (not needed)
                const putPayload = { ...payload };
                if (editingStatus === 'DRAFT') {
                    delete putPayload.change_reason;
                }
                await apiRequest(`/issuance/requests/${draftId}`, 'PUT', putPayload);
                // Upload any pending documents
                if (pendingFiles.length > 0) {
                    await uploadPendingFiles(draftId, false);
                }
                if (isPostSubmission) {
                    // Post-submission edit done — don't call /submit again
                    toast.success('Request updated. Changes have been saved and relevant parties notified.');
                } else if (actionType === 'SUBMIT') {
                    await apiRequest(`/issuance/requests/${draftId}/submit`, 'POST');
                    toast.success(t('pages.publicIssuanceForm.messages.requestSubmitted'));
                } else {
                    toast.success('Draft updated successfully');
                }
                navigate(-1);
            } else {
                // Internal user: use draft endpoint for saves, full endpoint for submissions
                const createUrl = actionType === 'DRAFT' ? '/issuance/requests/draft' : '/issuance/requests/';
                const createdReq = await apiRequest(createUrl, 'POST', payload);
                // Upload any pending documents
                if (pendingFiles.length > 0 && createdReq?.id) {
                    await uploadPendingFiles(createdReq.id, false);
                }
                if (actionType === 'SUBMIT') {
                    await apiRequest(`/issuance/requests/${createdReq.id}/submit`, 'POST');
                    toast.success(t('pages.publicIssuanceForm.messages.requestSubmitted'));
                } else {
                    toast.info(t('pages.publicIssuanceForm.messages.draftSaved'));
                }
                navigate('/issuance/requests');
            }
        } catch (err) {
            console.error("Submit Error:", err);
            toast.error(err.response?.data?.detail || t('pages.publicIssuanceForm.messages.validationError'));
        } finally {
            setSubmitting(false);
        }
    };

    // Called when user clicks "Submit Anyway" in the verification dialog
    const proceedAfterVerification = async () => {
        if (!pendingSubmitPayload) return;
        setShowVerificationDialog(false);
        setSubmitting(true);
        try {
            const { editDraftId: draftId, safeToken: st, payload: pl } = pendingSubmitPayload;
            await publicApiRequest(`/public-issuance/requests/${draftId}/submit?token=${st}`, 'POST', pl);
            setIsSuccess(true);
        } catch (err) {
            toast.error(err.response?.data?.detail || 'Submission failed');
        } finally {
            setSubmitting(false);
            setPendingSubmitPayload(null);
        }
    };

    // Called when user clicks "Cancel & Edit" in the verification dialog
    const cancelVerification = () => {
        setShowVerificationDialog(false);
        setPendingSubmitPayload(null);
        toast.info('Submission cancelled. You can review and edit your request.');
    };

    // Verification Dialog Component
    const VerificationDialog = () => {
        if (!showVerificationDialog || !verificationResult) return null;
        const { comparison = [], mismatches = 0, summary } = verificationResult;
        return (
            <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] flex flex-col">
                    {/* Header */}
                    <div className="bg-amber-50 border-b border-amber-200 px-6 py-4 rounded-t-2xl">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                                <AlertTriangle className="w-5 h-5 text-amber-600" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-amber-900">AI Document Verification</h3>
                                <p className="text-sm text-amber-700">
                                    {mismatches} potential mismatch{mismatches !== 1 ? 'es' : ''} found between your request and the reference document
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Body */}
                    <div className="px-6 py-4 overflow-y-auto flex-1">
                        {summary && (
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                                <p className="text-xs text-blue-600 font-semibold uppercase mb-1">Document Summary</p>
                                <p className="text-sm text-blue-900">{summary}</p>
                            </div>
                        )}
                        <div className="space-y-2">
                            {comparison.map((item, idx) => (
                                <div key={idx} className={`rounded-lg border p-3 ${
                                    item.match ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
                                }`}>
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="text-xs font-bold text-gray-700">{item.label}</span>
                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                            item.match ? 'bg-green-200 text-green-800' : 'bg-red-200 text-red-800'
                                        }`}>
                                            {item.match ? '✓ Match' : '✗ Mismatch'}
                                        </span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3 text-sm">
                                        <div>
                                            <span className="text-[10px] text-gray-400 block">Your Request</span>
                                            <span className="text-gray-900 font-medium">{item.request_value || '—'}</span>
                                        </div>
                                        <div>
                                            <span className="text-[10px] text-gray-400 block">In Document</span>
                                            <span className="text-gray-900 font-medium">{item.document_value || '—'}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between gap-3 rounded-b-2xl bg-gray-50">
                        <button
                            onClick={cancelVerification}
                            className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm border-2 border-gray-300 text-gray-700 hover:bg-gray-100 transition"
                        >
                            <Edit3 className="w-4 h-4" /> Cancel & Edit
                        </button>
                        <button
                            onClick={proceedAfterVerification}
                            disabled={submitting}
                            className="flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm bg-amber-500 text-white hover:bg-amber-600 shadow-lg shadow-amber-500/20 transition"
                        >
                            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                            Submit Anyway
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    // ──────────────────────────────────────────────
    // RENDER HELPERS (plain functions, NOT components)
    // ──────────────────────────────────────────────
    const renderField = (name, label, type = 'text', options = [], placeholder = '', extraProps = {}) => {
        if (!isVisible(name)) return null;
        const required = isMandatory(name);

        // Auto-add constraints for number inputs
        const numberProps = type === 'number' ? { min: '0', step: '0.01' } : {};

        return (
            <div key={name} className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    {label} {required && <span className="text-red-400 ml-0.5">*</span>}
                </label>
                {type === 'select' ? (
                    <select
                        name={name} value={formData[name] || ''} onChange={handleChange}
                        required={required}
                        className={inputClasses(false)}
                    >
                        <option value="">— Select —</option>
                        {options.map(opt => <option key={opt.id} value={opt.id}>{opt.iso_code ? `${opt.iso_code}${opt.name && opt.name !== opt.iso_code ? ` - ${opt.name}` : ''}` : (opt.name || opt.entity_name)}</option>)}
                    </select>
                ) : type === 'textarea' ? (
                    <textarea
                        name={name} value={formData[name] || ''} onChange={handleChange}
                        required={required} rows={3} placeholder={placeholder}
                        className={inputClasses(false)}
                    />
                ) : (
                    <input
                        type={type} name={name} value={formData[name] || ''} onChange={handleChange}
                        required={required} placeholder={placeholder}
                        className={inputClasses(false)}
                        {...numberProps}
                        {...extraProps}
                    />
                )}
            </div>
        );
    };

    const renderToggle = (name, label, children) => {
        if (!isVisible(name)) return null;
        return (
            <div key={name} className="border border-gray-100 rounded-xl p-4 bg-gray-50/50">
                <label className="flex items-center gap-3 cursor-pointer select-none">
                    <div className={`relative w-11 h-6 rounded-full transition-colors ${formData[name] ? 'bg-blue-500' : 'bg-gray-300'}`}>
                        <input type="checkbox" name={name} checked={formData[name]} onChange={handleChange} className="sr-only" />
                        <div className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${formData[name] ? 'translate-x-5' : ''}`} />
                    </div>
                    <span className="text-sm font-medium text-slate-700">{label}</span>
                </label>
                {formData[name] && children && (
                    <div className="mt-4 pl-6 border-l-2 border-blue-200 space-y-4 animate-fadeIn">
                        {children}
                    </div>
                )}
            </div>
        );
    };

    // ──────────────────────────────────────────────
    // STEP CONTENT
    // ──────────────────────────────────────────────
    const renderStep0 = () => {
        const emailLocked = isPublic && tokenEmailRef.current && formData.requestor_email === tokenEmailRef.current;
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 animate-slideUp">
                {renderField('issuing_entity_id', 'Issuing Entity', 'select', entities)}

                <div key="requestor_email" className="space-y-1.5">
                    <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider">
                        Work Email <span className="text-red-400 ml-0.5">*</span>
                    </label>
                    <input
                        type="email" name="requestor_email" value={formData.requestor_email || ''}
                        onChange={handleChange}
                        onBlur={(e) => fetchPreviousRequestorData(e.target.value)}
                        required
                        disabled={emailLocked}
                        className={inputClasses(emailLocked)}
                    />
                </div>

                {renderField('requestor_name', 'Full Name')}
                {renderField('department', 'Department', 'select',
                    departments.length > 0
                        ? departments.map(d => ({ id: d.name || d, name: d.name || d }))
                        : [{ id: 'General', name: 'General' }]
                )}
                {isVisible('job_title') && renderField('job_title', 'Job Title')}
                {isVisible('phone_number') && (
                    <div key="phone_number" className="space-y-1.5">
                        <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider">Phone Number</label>
                        <input type="tel" name="phone_number" value={formData.phone_number || ''} onChange={handleChange}
                            placeholder="+201234567890" className={inputClasses(false)} />
                    </div>
                )}
                {isVisible('employee_id') && renderField('employee_id', 'Employee ID')}
                {isVisible('manager_email') && renderField('manager_email', 'Direct Manager Email', 'email')}
                {isVisible('second_line_manager_email') && renderField('second_line_manager_email', 'Second Line Manager Email', 'email')}
            </div>
        );
    };

    const renderStep1 = () => (
        <div className="space-y-5 animate-slideUp">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {isVisible('reference_type') && renderField('reference_type', 'Reference Type', 'select', config?.reference_types || DEFAULT_REFERENCE_TYPES)}
                {isVisible('reference_number') && renderField('reference_number', 'Reference Number')}
                {isVisible('reference_amount') && renderField('reference_amount', 'Reference Amount', 'number', [], '0.00')}
                {isVisible('reference_currency_id') && renderField('reference_currency_id', 'Reference Currency', 'select', currencies)}
                {isVisible('reference_start_date') && renderField('reference_start_date', 'Start Date', 'date')}
                {isVisible('reference_end_date') && renderField('reference_end_date', 'End Date', 'date', [], '', { min: formData.reference_start_date || '' })}
                {projects.length > 0 && (
                    <div className="col-span-2">
                        <label className="block text-sm font-semibold text-gray-700 mb-1">Linked Project / Contract</label>
                        <select
                            className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                            value={formData.project_id || ''}
                            onChange={e => setFormData(prev => ({ ...prev, project_id: e.target.value ? parseInt(e.target.value) : '' }))}
                        >
                            <option value="">— No specific project —</option>
                            {projects.filter(p => p.status === 'ACTIVE').map(p => (
                                <option key={p.id} value={p.id}>{p.name} ({p.project_type}{p.reference_number ? ` · #${p.reference_number}` : ''})</option>
                            ))}
                        </select>
                        <p className="text-xs text-gray-400 mt-1">Link to a project for dedicated facility matching</p>
                    </div>
                )}
            </div>


            {/* Reference Document Upload */}
            {isDocVisible('CONTRACT') && (
                <div className="border border-dashed border-gray-300 rounded-xl p-5 bg-gray-50/50">
                    <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3 flex items-center gap-2">
                        <Upload className="w-4 h-4 text-blue-500" /> Attach Reference Document
                        {isDocMandatory('CONTRACT') && <span className="text-red-400 text-[10px]">Required</span>}
                    </h4>
                    <p className="text-xs text-slate-400 mb-3">Upload the underlying contract, PO, or tender document (PDF, DOC, DOCX, XLS, XLSX — max 10MB)</p>
                    <label className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-white border border-gray-200 text-sm font-medium text-slate-700 hover:bg-gray-50 hover:border-blue-300 transition cursor-pointer shadow-sm">
                        <Upload className="w-4 h-4" /> Choose File
                        <input type="file" className="hidden"
                            accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
                            onChange={(e) => { if (e.target.files[0]) addFile(e.target.files[0], 'CONTRACT'); e.target.value = ''; }}
                        />
                    </label>
                    {/* Show existing files for this type */}
                    {existingDocuments.filter(f => f.document_type === 'CONTRACT').map((f, i) => (
                        <div key={`exist-${i}`} className="flex items-center gap-3 mt-3 bg-gray-50/80 p-2.5 rounded-lg border border-gray-200">
                            <FileText className="w-4 h-4 text-slate-400 flex-shrink-0" />
                            <span className="text-sm text-slate-600 font-medium text-ellipsis overflow-hidden flex-1">{f.file_name}</span>
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-semibold border border-green-200">Already Attached</span>
                        </div>
                    ))}
                    {/* Show pending files for this type */}
                    {pendingFiles.filter(f => f.type === 'CONTRACT').map((f, i) => {
                        const realIdx = pendingFiles.indexOf(f);
                        return (
                            <div key={i} className="flex items-center gap-3 mt-3 bg-white p-2.5 rounded-lg border border-gray-200">
                                <FileText className="w-4 h-4 text-blue-500 flex-shrink-0" />
                                <span className="text-sm text-slate-700 text-ellipsis overflow-hidden flex-1">{f.name}</span>
                                <span className="text-[10px] text-slate-400">{(f.file.size / 1024).toFixed(0)} KB</span>
                                <button type="button" onClick={() => removeFile(realIdx)}
                                    className="text-red-400 hover:text-red-600 transition p-1">
                                    <Trash2 className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );

    const renderStep2 = () => {
        const tenor = calcTenor();
        return (
            <div className="space-y-5 animate-slideUp">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {renderField('lg_type_id', 'LG Type', 'select', lgTypes)}
                    <div className="space-y-1.5">
                        <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider">
                            LG Language <span className="text-red-400 ml-0.5">*</span>
                        </label>
                        <select name="lg_language" value={formData.lg_language} onChange={handleChange}
                            required className={inputClasses(false)}>
                            <option value="EN">English</option>
                            <option value="AR">العربية — Arabic</option>
                        </select>
                        <p className="text-[10px] text-slate-400">Language in which the LG will be issued</p>
                    </div>
                    {renderField('amount', 'LG Amount', 'number', [], '0.00')}
                    {renderField('currency_id', 'LG Currency', 'select', currencies)}
                    <div key="payable_currency_id" className="space-y-1.5">
                        <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider">
                            LG Payable Currency
                        </label>
                        <select name="payable_currency_id" value={formData.payable_currency_id || ''} onChange={handleChange} className={inputClasses(false)}>
                            <option value="">— Select —</option>
                            {currencies.map(opt => <option key={opt.id} value={opt.id}>{opt.iso_code}{opt.name && opt.name !== opt.iso_code ? ` - ${opt.name}` : ''}</option>)}
                        </select>
                        <p className="text-[10px] text-slate-400">Defaults to LG currency unless changed</p>
                    </div>
                    <div key="applicable_rules" className="space-y-1.5">
                        <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider">
                            Applicable Rules
                        </label>
                        <select name="applicable_rules" value={formData.applicable_rules || ''} onChange={handleChange} className={inputClasses(false)}>
                            <option value="">— Not Specified —</option>
                            <option value="URDG_758">URDG 758 (ICC)</option>
                            <option value="ISP_98">ISP98 (ICC)</option>
                            <option value="LOCAL_LAW">Local Law</option>
                        </select>
                        <p className="text-[10px] text-slate-400">International rules governing the guarantee (optional)</p>
                    </div>
                </div>

                {renderField('lg_purpose', 'LG Purpose / Wording', 'textarea', [], 'Describe the guarantee purpose exactly as it should appear in the LG text...')}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {renderField('requested_issue_date', 'Suggested Issue Date', 'date', [], '', { min: new Date().toISOString().split('T')[0] })}
                    <div key="requested_expiry_date" className="space-y-1.5">
                        <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider">
                            Maturity Date <span className="text-red-400 ml-0.5">*</span>
                        </label>
                        <input type="date" name="requested_expiry_date" value={formData.requested_expiry_date || ''}
                            onChange={handleChange} required className={inputClasses(false)}
                            min={formData.requested_issue_date || new Date().toISOString().split('T')[0]} />
                        {tenor && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-50 text-blue-600 text-[11px] font-semibold mt-1">
                                <Clock className="w-3 h-3" /> Tenor: {tenor}
                            </span>
                        )}
                    </div>
                </div>

                {/* Advance Payment conditional */}
                {isAdvancePayment && (
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-4">
                        <div className="flex items-center gap-2 text-amber-800 text-sm font-semibold">
                            <AlertCircle className="w-4 h-4" /> Advance Payment Guarantee — Additional Details
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="block text-xs font-semibold text-amber-700 uppercase tracking-wider">Operational Status *</label>
                                <select name="operational_status" value={formData.operational_status || ''} onChange={handleChange}
                                    required className={inputClasses(false)}>
                                    <option value="">— Select —</option>
                                    <option value="OPERATIVE">Operative</option>
                                    <option value="NON_OPERATIVE">Non-Operative</option>
                                </select>
                            </div>
                        </div>
                        {renderToggle('is_auto_reducing', 'LG will be automatically reduced',
                            renderField('reduction_trigger', 'Reduction Trigger', 'textarea', [], 'Describe the conditions under which the LG amount will be reduced...')
                        )}
                    </div>
                )}

                {isVisible('other_conditions') && renderField('other_conditions', 'Other Conditions / Requirements', 'textarea', [], 'Any additional conditions or special requirements for the guarantee...')}
            </div>
        );
    };

    const renderStep3 = () => (
        <div className="space-y-6 animate-slideUp">
            {/* Beneficiary Section */}
            <div className="space-y-5">
                <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                    <Building className="w-4 h-4 text-blue-500" /> Beneficiary Details
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {isVisible('beneficiary_id_number') && (
                        <div key="beneficiary_id_number" className="space-y-1.5">
                            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider">
                                Beneficiary ID / Number
                            </label>
                            <div className="relative">
                                <input type="text" name="beneficiary_id_number" value={formData.beneficiary_id_number || ''}
                                    onChange={handleChange}
                                    onBlur={(e) => lookupBeneficiaryById(e.target.value)}
                                    placeholder="Enter ID to auto-fill beneficiary data"
                                    className={inputClasses(false)} />
                                <Search className="absolute right-3 top-3.5 w-4 h-4 text-slate-400" />
                            </div>
                        </div>
                    )}

                    <div key="beneficiary_name" className="space-y-1.5 relative">
                        <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider">
                            Beneficiary Name <span className="text-red-400 ml-0.5">*</span>
                        </label>
                        <input type="text" name="beneficiary_name" value={formData.beneficiary_name || ''}
                            onChange={handleChange} required
                            placeholder="Start typing to see suggestions..."
                            className={inputClasses(false)} />
                        {/* Fuzzy match suggestions */}
                        {showSuggestions && beneficiarySuggestions.length > 0 && (
                            <div className="absolute z-50 top-full mt-1 w-full bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden">
                                <p className="px-3 py-2 text-[10px] text-slate-400 uppercase font-bold bg-gray-50">Did you mean...</p>
                                {beneficiarySuggestions.map((s, i) => (
                                    <button key={i} type="button"
                                        onClick={() => applyBeneficiarySuggestion(s)}
                                        className="w-full text-left px-3 py-2.5 text-sm hover:bg-blue-50 transition border-b border-gray-50 last:border-none flex items-center justify-between">
                                        <div>
                                            <span className="font-medium text-slate-800">{s.beneficiary_name}</span>
                                            {s.beneficiary_country && <span className="text-slate-400 ml-2 text-xs">{s.beneficiary_country}</span>}
                                        </div>
                                        {s.similarity_score && (
                                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                                                s.similarity_score >= 95 ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                                            }`}>{s.similarity_score}%</span>
                                        )}
                                    </button>
                                ))}
                                <button type="button" onClick={() => setShowSuggestions(false)}
                                    className="w-full text-center py-2 text-xs text-slate-400 hover:bg-gray-50">
                                    <X className="w-3 h-3 inline mr-1" /> Dismiss
                                </button>
                            </div>
                        )}
                    </div>

                    {renderField('beneficiary_country', 'Country', 'select', COUNTRIES)}
                </div>

                <div className="grid grid-cols-1 gap-5">
                    {isVisible('beneficiary_address') && renderField('beneficiary_address', 'Full Address', 'textarea')}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    {isVisible('beneficiary_contact_person') && renderField('beneficiary_contact_person', 'Contact Person')}
                    {isVisible('beneficiary_phone') && renderField('beneficiary_phone', 'Beneficiary Phone', 'tel')}
                    {isVisible('beneficiary_email') && renderField('beneficiary_email', 'Beneficiary Email', 'email')}
                </div>
            </div>

            {/* Conditional Sections */}
            <div className="space-y-4 pt-2">
                <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">Special Conditions</h3>

                {renderToggle('is_third_party', 'This is a Third Party Request',
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {renderField('third_party_name', 'Third Party Name')}
                        {renderField('third_party_relationship', 'Relationship', 'select', THIRD_PARTY_RELATIONSHIPS)}
                        <div className="md:col-span-2">
                            {renderField('third_party_address', 'Third Party Address')}
                        </div>
                    </div>
                )}

                {renderToggle('is_cross_border', 'Cross-Border Issuance',
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {renderField('issuance_country', 'Issuing Country', 'select', COUNTRIES)}
                        <div className="space-y-1.5">
                            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider">Advising Bank Name</label>
                            <input type="text" value={formData.cross_border_details?.advising_bank_name || ''}
                                onChange={(e) => setFormData(prev => ({ ...prev, cross_border_details: { ...prev.cross_border_details, advising_bank_name: e.target.value }}))}
                                className={inputClasses(false)} placeholder="Bank in beneficiary's country" />
                        </div>
                        <div className="space-y-1.5">
                            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider">Advising Bank SWIFT</label>
                            <input type="text" value={formData.cross_border_details?.advising_bank_swift || ''}
                                onChange={(e) => setFormData(prev => ({ ...prev, cross_border_details: { ...prev.cross_border_details, advising_bank_swift: e.target.value }}))}
                                className={inputClasses(false)} placeholder="e.g. DEUTDEFF" />
                        </div>
                        <div className="space-y-1.5">
                            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider">Governing Law Country</label>
                            <select value={formData.cross_border_details?.governing_law_country || ''}
                                onChange={(e) => setFormData(prev => ({ ...prev, cross_border_details: { ...prev.cross_border_details, governing_law_country: e.target.value }}))}
                                className={inputClasses(false)}>
                                <option value="">— Select —</option>
                                {COUNTRIES.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>
                        <div className="space-y-1.5">
                            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider">Delivery Channel</label>
                            <select value={formData.cross_border_details?.delivery_channel || ''}
                                onChange={(e) => setFormData(prev => ({ ...prev, cross_border_details: { ...prev.cross_border_details, delivery_channel: e.target.value }}))}
                                className={inputClasses(false)}>
                                <option value="">— Select —</option>
                                <option value="SWIFT_MT760">SWIFT MT760</option>
                                <option value="COURIER">Courier</option>
                                <option value="HAND_DELIVERY">Hand Delivery</option>
                            </select>
                        </div>
                        <div className="space-y-1.5">
                            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider">Beneficiary Bank Name</label>
                            <input type="text" value={formData.cross_border_details?.beneficiary_bank_name || ''}
                                onChange={(e) => setFormData(prev => ({ ...prev, cross_border_details: { ...prev.cross_border_details, beneficiary_bank_name: e.target.value }}))}
                                className={inputClasses(false)} placeholder="For SWIFT routing" />
                        </div>
                        <div className="space-y-1.5">
                            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider">Beneficiary Bank SWIFT</label>
                            <input type="text" value={formData.cross_border_details?.beneficiary_bank_swift || ''}
                                onChange={(e) => setFormData(prev => ({ ...prev, cross_border_details: { ...prev.cross_border_details, beneficiary_bank_swift: e.target.value }}))}
                                className={inputClasses(false)} placeholder="e.g. BNPAFRPP" />
                        </div>
                        <div className="md:col-span-2">
                            <label className="flex items-center gap-2 text-xs font-medium text-slate-600">
                                <input type="checkbox" checked={formData.cross_border_details?.requires_counter_guarantee || false}
                                    onChange={(e) => setFormData(prev => ({ ...prev, cross_border_details: { ...prev.cross_border_details, requires_counter_guarantee: e.target.checked }}))}
                                    className="rounded" />
                                Requires Counter-Guarantee
                            </label>
                        </div>
                    </div>
                )}

                {renderToggle('requires_special_wording', 'Requires Special Wording',
                    <p className="text-sm text-blue-600 flex items-center gap-1">
                        <Info className="w-4 h-4" /> You may need to upload a wording template after submission
                    </p>
                )}

                {isVisible('is_urgent') && renderToggle('is_urgent', 'This is an Urgent Request',
                    renderField('urgency_justification', 'Urgency Justification', 'textarea', [], 'Please explain why this request is urgent...')
                )}
            </div>

            {/* Comments & Custom */}
            <div className="space-y-4 pt-2">
                {isVisible('comments') && renderField('comments', 'General Comments', 'textarea')}

                {(config?.custom_field_1_config || config?.custom_field_2_config) && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {[1, 2].map(num => {
                            const cnf = config?.[`custom_field_${num}_config`];
                            if (!cnf || !cnf.is_visible) return null;
                            const fieldName = `custom_field_${num}_value`;
                            const isList = cnf.type === 'LIST';
                            const inputType = cnf.type === 'NUMBER' ? 'number' : cnf.type === 'DATE' ? 'date' : 'text';
                            return (
                                <div key={num} className="space-y-1.5">
                                    <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider">
                                        {cnf.label} {cnf.is_mandatory && <span className="text-red-400">*</span>}
                                    </label>
                                    {isList ? (
                                        <select name={fieldName}
                                            value={formData[fieldName] || ''} onChange={handleChange}
                                            required={cnf.is_mandatory} className={inputClasses(false)}>
                                            <option value="">-- Select --</option>
                                            {(cnf.options || []).map((opt, idx) => (
                                                <option key={idx} value={opt}>{opt}</option>
                                            ))}
                                        </select>
                                    ) : (
                                        <input type={inputType} name={fieldName}
                                            value={formData[fieldName] || ''} onChange={handleChange}
                                            required={cnf.is_mandatory} className={inputClasses(false)} />
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Supporting Documents Upload */}
            {(isDocVisible('THIRD_PARTY') || isDocVisible('SPECIAL_WORDING') || isDocVisible('OTHER')) && (
                <div className="space-y-4 pt-2">
                    <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                        <Upload className="w-4 h-4 text-blue-500" /> Supporting Documents
                    </h3>

                    <div className="border border-dashed border-gray-300 rounded-xl p-5 bg-gray-50/50">
                        <p className="text-xs text-slate-400 mb-3">Upload any additional supporting documents (third-party authorisation, special wording templates, etc.)</p>
                        <div className="flex flex-wrap gap-2">
                            {isDocVisible('THIRD_PARTY') && (
                                <label className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-white border border-gray-200 text-xs font-medium text-slate-700 hover:bg-gray-50 hover:border-blue-300 transition cursor-pointer shadow-sm">
                                    <Upload className="w-3.5 h-3.5" /> Third Party Doc {isDocMandatory('THIRD_PARTY') && <span className="text-red-400">*</span>}
                                    <input type="file" className="hidden"
                                        accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
                                        onChange={(e) => { if (e.target.files[0]) addFile(e.target.files[0], 'THIRD_PARTY'); e.target.value = ''; }}
                                    />
                                </label>
                            )}
                            {isDocVisible('SPECIAL_WORDING') && (
                                <label className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-white border border-gray-200 text-xs font-medium text-slate-700 hover:bg-gray-50 hover:border-blue-300 transition cursor-pointer shadow-sm">
                                    <Upload className="w-3.5 h-3.5" /> Wording Template {isDocMandatory('SPECIAL_WORDING') && <span className="text-red-400">*</span>}
                                    <input type="file" className="hidden"
                                        accept=".pdf,.doc,.docx"
                                        onChange={(e) => { if (e.target.files[0]) addFile(e.target.files[0], 'SPECIAL_WORDING'); e.target.value = ''; }}
                                    />
                                </label>
                            )}
                            {isDocVisible('OTHER') && (
                                <label className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-white border border-gray-200 text-xs font-medium text-slate-700 hover:bg-gray-50 hover:border-blue-300 transition cursor-pointer shadow-sm">
                                    <Upload className="w-3.5 h-3.5" /> Other Document
                                    <input type="file" className="hidden"
                                        accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.csv"
                                        onChange={(e) => { if (e.target.files[0]) addFile(e.target.files[0], 'OTHER'); e.target.value = ''; }}
                                    />
                                </label>
                            )}
                        </div>
                        {/* Show existing files (except CONTRACT) */}
                        {existingDocuments.filter(f => f.document_type !== 'CONTRACT').map((f, i) => {
                            const typeLabels = { THIRD_PARTY: 'Third Party', SPECIAL_WORDING: 'Wording', OTHER: 'Other' };
                            return (
                                <div key={`exist-${i}`} className="flex items-center gap-3 mt-3 bg-gray-50/80 p-2.5 rounded-lg border border-gray-200">
                                    <FileText className="w-4 h-4 text-slate-400 flex-shrink-0" />
                                    <span className="text-sm text-slate-600 font-medium text-ellipsis overflow-hidden flex-1">{f.file_name}</span>
                                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-200 text-slate-600 font-medium">{typeLabels[f.document_type] || f.document_type}</span>
                                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-semibold border border-green-200 whitespace-nowrap">Already Attached</span>
                                </div>
                            );
                        })}
                        {/* All pending files (except CONTRACT which is shown in Step 1) */}
                        {pendingFiles.filter(f => f.type !== 'CONTRACT').map((f, i) => {
                            const realIdx = pendingFiles.indexOf(f);
                            const typeLabels = { THIRD_PARTY: 'Third Party', SPECIAL_WORDING: 'Wording', OTHER: 'Other' };
                            return (
                                <div key={i} className="flex items-center gap-3 mt-3 bg-white p-2.5 rounded-lg border border-gray-200">
                                    <FileText className="w-4 h-4 text-blue-500 flex-shrink-0" />
                                    <span className="text-sm text-slate-700 text-ellipsis overflow-hidden flex-1">{f.name}</span>
                                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 font-medium">{typeLabels[f.type] || f.type}</span>
                                    <span className="text-[10px] text-slate-400">{(f.file.size / 1024).toFixed(0)} KB</span>
                                    <button type="button" onClick={() => removeFile(realIdx)}
                                        className="text-red-400 hover:text-red-600 transition p-1">
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            );
                        })}
                    </div>

                    {/* Total files summary */}
                    {pendingFiles.length > 0 && (
                        <div className="flex items-center gap-2 text-xs text-blue-600 font-medium bg-blue-50 px-3 py-2 rounded-lg">
                            <FileText className="w-3.5 h-3.5" />
                            {pendingFiles.length} document{pendingFiles.length > 1 ? 's' : ''} will be uploaded upon submission
                        </div>
                    )}
                </div>
            )}
        </div>
    );

    const STEPS = [renderStep0, renderStep1, renderStep2, renderStep3];

    // ──────────────────────────────────────────────
    // RENDER
    // ──────────────────────────────────────────────
    if (loading) return (
        <div className="flex flex-col justify-center items-center py-32 gap-3">
            <Loader2 className="animate-spin text-blue-600 w-10 h-10" />
            <p className="text-sm text-slate-400">Loading form configuration...</p>
        </div>
    );

    if (isSuccess) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
                <div className="bg-white p-10 rounded-2xl shadow-2xl max-w-md w-full text-center border border-gray-100">
                    <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
                        <CheckCircle className="w-10 h-10 text-green-500" />
                    </div>
                    <h2 className="text-2xl font-bold text-slate-900 mb-2">{t('pages.publicIssuanceForm.successTitle')}</h2>
                    <p className="text-slate-500 mb-8">{t('pages.publicIssuanceForm.successMessage')}</p>
                    <button onClick={() => {
                            if (isPublic && token) {
                                navigate(`/public-issuance/dashboard?token=${encodeURIComponent(token)}`);
                            } else {
                                navigate('/end-user/issuance/requests');
                            }
                        }}
                        className="w-full bg-slate-900 text-white font-semibold py-3.5 rounded-xl hover:bg-slate-800 transition shadow-lg">
                        {isPublic ? 'Return to Dashboard' : 'Return to Requests'}
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50/50">
            <style>{`
                @keyframes slideUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
                @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
                .animate-slideUp { animation: slideUp 0.3s ease-out both; }
                .animate-fadeIn { animation: fadeIn 0.2s ease-out both; }
            `}</style>

            <div className="max-w-4xl mx-auto px-3.5 py-4 sm:px-6 sm:py-8">
                {/* Header */}
                <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                        <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
                            {draftId ? 'Edit Draft Request' : isPublic ? t('pages.publicIssuanceForm.externalTitle') : t('pages.publicIssuanceForm.internalTitle')}
                        </h1>
                        <p className="text-slate-500 text-xs sm:text-sm mt-1">{t('pages.publicIssuanceForm.subtitle')}</p>
                    </div>
                    {isPublic ? (
                        <button
                            type="button"
                            onClick={() => navigate(`/public-issuance/dashboard?token=${encodeURIComponent(token)}`)}
                            className="inline-flex items-center justify-center gap-2 px-4 py-2 text-xs sm:text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-xl border border-blue-200 transition-colors w-full sm:w-auto"
                        >
                            <FileText className="w-4 h-4" /> My Requests
                        </button>
                    ) : (
                        <button
                            type="button"
                            onClick={() => navigate(-1)}
                            className="inline-flex items-center justify-center gap-2 px-4 py-2 text-xs sm:text-sm font-medium text-slate-600 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200 transition-colors w-full sm:w-auto"
                        >
                            <ChevronLeft className="w-4 h-4" /> All Requests
                        </button>
                    )}
                </div>

                {/* ─── STEPPER PROGRESS BAR ─── */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-3 sm:p-6 mb-6 overflow-x-auto">
                    <div className="flex items-center justify-between min-w-[320px] relative">
                        {/* Connecting line */}
                        <div className="absolute top-4 sm:top-5 left-6 right-6 h-0.5 bg-gray-200 -z-0" />
                        <div className="absolute top-4 sm:top-5 left-6 h-0.5 bg-green-500 transition-all duration-500 -z-0"
                            style={{ width: `${(currentStep / 3) * (100 - (100 / 3.7))}%` }} />

                        {STEP_LABELS.map((label, idx) => {
                            const Icon = STEP_ICONS[idx];
                            const isActive = idx === currentStep;
                            const isDone = idx < currentStep;
                            return (
                                <div key={idx} className="flex flex-col items-center relative z-10 cursor-pointer group"
                                    onClick={() => {
                                        if (idx < currentStep) {
                                            setSlideDir('left');
                                            setCurrentStep(idx);
                                        } else if (idx > currentStep) {
                                            for (let s = currentStep; s < idx; s++) {
                                                const errors = validateStep(s);
                                                if (errors.length > 0) {
                                                    errors.forEach(e => toast.error(e));
                                                    setCurrentStep(s);
                                                    return;
                                                }
                                            }
                                            setSlideDir('right');
                                            setCurrentStep(idx);
                                        }
                                    }}>
                                    <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center transition-all duration-300 ${isDone ? 'bg-green-500 text-white shadow-md shadow-green-200 group-hover:bg-green-600' :
                                        isActive ? 'bg-blue-500 text-white shadow-lg shadow-blue-200 ring-4 ring-blue-100' :
                                            'bg-white text-slate-400 border-2 border-gray-200 group-hover:border-blue-300 group-hover:text-blue-400'
                                        }`}>
                                        {isDone ? <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5" /> : <Icon className="w-4 h-4 sm:w-5 sm:h-5" />}
                                    </div>
                                    <span className={`text-[10px] sm:text-[11px] font-semibold mt-1.5 sm:mt-2 whitespace-nowrap transition-colors ${isActive ? 'text-blue-600' : isDone ? 'text-green-600' : 'text-slate-400 group-hover:text-slate-600'
                                        }`}>{label}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* ─── STEP CONTENT ─── */}
                <form onSubmit={(e) => e.preventDefault()}>
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-8 mb-6">
                        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-100">
                            {React.createElement(STEP_ICONS[currentStep], { className: 'w-5 h-5 text-blue-500' })}
                            <h2 className="text-base sm:text-lg font-bold text-slate-800">{STEP_LABELS[currentStep]}</h2>
                            <span className="ml-auto text-xs text-slate-400 font-medium">Step {currentStep + 1} of 4</span>
                        </div>

                        {/* Duplicate Reference Warning Overlay - Persists globally over all Steps */}
                        {duplicateRefWarning && duplicateRefWarning.length > 0 && (
                            <div className="mb-6 bg-amber-50 border border-amber-300 rounded-xl p-4 flex flex-col gap-3 shadow-sm animate-fadeIn">
                                <div className="flex items-start gap-3">
                                    <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                                    <div>
                                        <p className="text-sm font-semibold text-amber-800">Similar LGs Detected</p>
                                        <p className="text-xs text-amber-700 mt-1">
                                            We found {duplicateRefWarning.length === 1 ? '1 similar record' : `${duplicateRefWarning.length} similar records`} matching the details you entered. Please verify this is a new request.
                                        </p>
                                    </div>
                                </div>
                                <div className="mt-2 flex flex-col gap-3">
                                    {duplicateRefWarning.map((m, i) => (
                                        <div key={i} className="bg-white rounded-lg p-3 border border-amber-200 shadow-sm">
                                            <div className="flex justify-between items-center mb-2">
                                                <p className="text-xs font-semibold text-amber-900">
                                                    {m.match_type === 'issued_lg' ? 'Issued LG' : 'Pending Request'}
                                                    <span className="ml-2 px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-700 font-mono text-[10px]">{m.lg_ref_number || `REQ-${m.request_id}`}</span>
                                                </p>
                                                <div className="flex items-center gap-1.5 bg-amber-100 px-2 py-0.5 rounded text-xs font-bold text-amber-800">
                                                    <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></div>
                                                    {m.score.toFixed(1)}% Match
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-2 gap-2 text-[10px]">
                                                {m.breakdown?.reference?.matched && (
                                                    <div className="flex items-center gap-1 text-emerald-700 bg-emerald-50 px-1.5 py-1 rounded">
                                                        <CheckCircle className="w-3 h-3 truncate" /> Same Ref (+{m.breakdown.reference.score})
                                                    </div>
                                                )}
                                                {m.breakdown?.beneficiary?.matched && (
                                                    <div className="flex items-center gap-1 text-emerald-700 bg-emerald-50 px-1.5 py-1 rounded">
                                                        <CheckCircle className="w-3 h-3 truncate" /> Ben. Match (+{m.breakdown.beneficiary.score})
                                                    </div>
                                                )}
                                                {m.breakdown?.amount?.matched && (
                                                    <div className="flex items-center gap-1 text-emerald-700 bg-emerald-50 px-1.5 py-1 rounded">
                                                        <CheckCircle className="w-3 h-3 truncate" /> Similar Amt (+{m.breakdown.amount.score})
                                                    </div>
                                                )}
                                                {m.breakdown?.lg_type?.matched && (
                                                    <div className="flex items-center gap-1 text-emerald-700 bg-emerald-50 px-1.5 py-1 rounded">
                                                        <CheckCircle className="w-3 h-3 truncate" /> Same LG Type (+{m.breakdown.lg_type.score})
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div key={currentStep}>
                            {STEPS[currentStep]()}
                        </div>
                    </div>

                    {/* ─── CHANGE REASON (shown only for post-submission edits) ─── */}
                    {editingStatus && editingStatus !== 'DRAFT' && (
                        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 sm:p-6 mb-4">
                            <div className="flex items-start gap-3 mb-3">
                                <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
                                <div>
                                    <p className="text-sm font-bold text-amber-900">You are editing a {editingStatus.replace(/_/g, ' ').toLowerCase()} request</p>
                                    <p className="text-xs text-amber-700 mt-1">
                                        Changes to critical fields (amount, currency, expiry date, beneficiary, LG type, etc.) will reset the approval process.
                                        Other changes will be saved and approvers will be notified.
                                    </p>
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-amber-800 mb-1">Reason for Changes *</label>
                                <textarea
                                    rows={2}
                                    value={formData.change_reason}
                                    onChange={e => setFormData({ ...formData, change_reason: e.target.value })}
                                    placeholder="Briefly explain why this request needs to be modified..."
                                    className="w-full p-3 rounded-xl border border-amber-300 bg-white text-sm text-slate-800 resize-none focus:ring-4 focus:ring-amber-100 focus:border-amber-400 outline-none"
                                />
                            </div>
                        </div>
                    )}

                    {/* ─── NAVIGATION ─── */}
                    <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between bg-white rounded-2xl shadow-sm border border-gray-100 p-4 gap-3 sm:gap-0">
                        <button type="button" onClick={goBack} disabled={currentStep === 0}
                            className={`inline-flex items-center justify-center gap-2 px-5 py-2.5 sm:py-3 rounded-xl font-semibold text-xs sm:text-sm transition-all ${currentStep === 0 ? 'text-slate-300 cursor-not-allowed' : 'text-slate-600 hover:bg-slate-100'
                                }`}>
                            <ChevronLeft className="w-4 h-4" /> Back
                        </button>

                        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                            {editingStatus && editingStatus !== 'DRAFT' ? (
                                currentStep < 3 ? (
                                    <button type="button" onClick={goNext}
                                        className="inline-flex items-center justify-center gap-2 px-6 py-2.5 sm:py-3 rounded-xl font-semibold text-xs sm:text-sm bg-slate-900 text-white hover:bg-slate-800 shadow-lg shadow-slate-900/20 transition">
                                        Next <ChevronRight className="w-4 h-4" />
                                    </button>
                                ) : (
                                    <button type="button" onClick={() => handleAction('SUBMIT')} disabled={submitting || !formData.change_reason}
                                        className="inline-flex items-center justify-center gap-2 px-8 py-2.5 sm:py-3 rounded-xl font-bold text-xs sm:text-sm bg-amber-600 text-white hover:bg-amber-700 shadow-lg shadow-amber-600/30 transition disabled:opacity-50">
                                        {submitting ? <Loader2 className="animate-spin w-4 h-4" /> : <Edit3 className="w-4 h-4" />}
                                        Save Changes
                                    </button>
                                )
                            ) : (
                                <>
                                    <button type="button" onClick={() => handleAction('DRAFT')} disabled={submitting}
                                        className="inline-flex items-center justify-center gap-2 px-5 py-2.5 sm:py-3 rounded-xl font-semibold text-xs sm:text-sm border-2 border-gray-200 text-slate-600 hover:bg-gray-50 transition">
                                        <Save className="w-4 h-4" />
                                        {t('pages.publicIssuanceForm.saveDraftBtn')}
                                    </button>

                                    {currentStep < 3 ? (
                                        <button type="button" onClick={goNext}
                                            className="inline-flex items-center justify-center gap-2 px-6 py-2.5 sm:py-3 rounded-xl font-semibold text-xs sm:text-sm bg-slate-900 text-white hover:bg-slate-800 shadow-lg shadow-slate-900/20 transition">
                                            Next <ChevronRight className="w-4 h-4" />
                                        </button>
                                    ) : (
                                        <button type="button" onClick={() => handleAction('SUBMIT')} disabled={submitting || verifying}
                                            className="inline-flex items-center justify-center gap-2 px-8 py-2.5 sm:py-3 rounded-xl font-bold text-xs sm:text-sm bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-600/30 transition">
                                            {(submitting || verifying) ? <Loader2 className="animate-spin w-4 h-4" /> : <Send className="w-4 h-4" />}
                                            {verifying ? 'Verifying...' : t('pages.publicIssuanceForm.submitBtn')}
                                        </button>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                </form>

                {/* AI Verification Dialog */}
                <VerificationDialog />
            </div>
        </div>
    );
}