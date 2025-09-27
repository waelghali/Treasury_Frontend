// frontend/src/pages/EndUser/RecordNewLGPage.js
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiRequest } from 'services/apiService.js';
import { ChevronDown, ChevronUp, Upload, Scan, Save, AlertCircle, XCircle, Loader2, CheckCircle, Search } from 'lucide-react';
import moment from 'moment';

// A reusable component to provide a tooltip for disabled elements during the grace period.
const GracePeriodTooltip = ({ children, isGracePeriod }) => {
  if (isGracePeriod) {
    return (
      <div className="relative group inline-block">
        {children}
        <div className="opacity-0 w-max bg-gray-800 text-white text-xs rounded-lg py-2 px-3 absolute z-10 bottom-full left-1/2 -translate-x-1/2 pointer-events-none group-hover:opacity-100 transition-opacity duration-200">
          This action is disabled during your subscription's grace period.
          <svg className="absolute text-gray-800 h-2 w-full left-0 top-full" x="0px" y="0px" viewBox="0 0 255 255">
            <polygon className="fill-current" points="0,0 127.5,127.5 255,0"/>
          </svg>
        </div>
      </div>
    );
  }
  return children;
};

// Helper function to format date for input type="date"
const formatDateForInput = (dateObj) => {
  if (!dateObj) return '';
  const mDate = moment(dateObj);
  return mDate.isValid() ? mDate.format('YYYY-MM-DD') : '';
};

// Helper function to find a dropdown item's ID by its name
const findIdByName = (dataArray, nameToFind) => {
    const item = dataArray.find(item => item.name === nameToFind);
    return item ? String(item.id) : '';
};

const parseDateFromInput = (dateString) => {
  if (!dateString) return null;
  const mDate = moment(dateString);
  return mDate.isValid() ? mDate.toDate() : null;
};

// =========================================================
// UPDATED: Searchable Select Component (Generic)
// Now handles the "mistaken selection" issue by showing all options on focus/clear.
// =========================================================
const SearchableBankSelect = ({ name, id, value, onChange, options, placeholder, required, className, disabled, labelClassNames }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const wrapperRef = useRef(null);
  const inputRef = useRef(null);
  
  const selectedOption = options.find(opt => String(opt.value) === String(value));
  
  // Logic: Show all options if searchTerm is empty or exactly matches the selected option's label.
  // Otherwise, filter based on the search term.
  const isSearchActive = searchTerm.length > 0 && !(selectedOption && selectedOption.label === searchTerm);

  const filteredOptions = isSearchActive
    ? options.filter(option => 
        option.label.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : options; // Show all options if search term is empty or matches selected

  // Handles selection and sends the correct synthetic event back to parent's handleChange
  const handleSelect = (option) => {
    // Create a synthetic event object to match the native select/input behavior
    const syntheticEvent = {
      target: {
        name: name,
        value: option.value,
        type: 'select-one', // Mimic select behavior for type
      },
      preventDefault: () => {},
      stopPropagation: () => {},
    };
    onChange(syntheticEvent);
    setSearchTerm(option.label); // Set search term to selected label
    setIsOpen(false);
    setHighlightedIndex(-1);
    inputRef.current.focus(); // Re-focus on input for better UX
  };
  
  const handleInputChange = (e) => {
    const newTerm = e.target.value;
    setSearchTerm(newTerm);
    setIsOpen(true);
    setHighlightedIndex(-1);
    
    // Clear the form value if the user starts typing over a previously selected value
    if (String(value).length > 0 && (selectedOption ? selectedOption.label !== newTerm : true)) {
        const syntheticEvent = {
            target: {
                name: name,
                value: '', // Clear the selection
                type: 'select-one',
            },
        };
        onChange(syntheticEvent);
    }
  };

  const handleBlur = () => {
    setTimeout(() => {
        if (wrapperRef.current && !wrapperRef.current.contains(document.activeElement)) {
            setIsOpen(false);
            // If no option is selected, clear the search term, otherwise reset to selected label
            if (selectedOption) {
                setSearchTerm(selectedOption.label);
            } else {
                setSearchTerm('');
            }
        }
    }, 150);
  };

  const handleFocus = () => {
    setIsOpen(true);
    // If an item is selected, set search term to its label (already done in useEffect)
    // If no item is selected, clear the search input to encourage typing
    if (!selectedOption) {
        setSearchTerm('');
    }
  };

  const handleKeyDown = useCallback((e) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex(prev => (prev < filteredOptions.length - 1 ? prev + 1 : 0));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev => (prev > 0 ? prev - 1 : filteredOptions.length - 1));
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && filteredOptions[highlightedIndex]) {
          handleSelect(filteredOptions[highlightedIndex]);
        } else if (filteredOptions.length === 1 && filteredOptions[0].label.toLowerCase() === searchTerm.toLowerCase()) {
          // Auto-select if a perfect match remains after filtering
          handleSelect(filteredOptions[0]);
        } else if (selectedOption && selectedOption.label === searchTerm) {
          // If Enter is pressed on the input with a selected value
          setIsOpen(false);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        break;
      default:
        break;
    }
  }, [isOpen, highlightedIndex, filteredOptions, handleSelect, selectedOption, searchTerm]);


  // Effect to handle clicking outside the component
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [wrapperRef]);
  
  // Set initial search term to selected label when 'value' changes
  useEffect(() => {
    if (selectedOption) {
        setSearchTerm(selectedOption.label);
    } else {
        setSearchTerm('');
    }
  }, [value, selectedOption]);

  const inputClasses = `${className} pl-10`; // Add padding left for search icon

  return (
    <div className="relative" ref={wrapperRef}>
      <div className={`relative ${disabled ? 'opacity-50 pointer-events-none' : ''}`}>
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
        <input
          type="text"
          ref={inputRef}
          id={id}
          name={name}
          value={searchTerm}
          onChange={handleInputChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          required={required}
          className={inputClasses}
          disabled={disabled}
          autoComplete="off"
        />
        <ChevronDown className={`absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </div>
      
      {isOpen && filteredOptions.length > 0 && (
        <ul className="absolute z-50 w-full bg-white border border-gray-300 rounded-md shadow-lg mt-1 max-h-60 overflow-y-auto">
          {filteredOptions.map((option, index) => (
            <li
              key={option.value}
              onMouseDown={(e) => { // Use onMouseDown to prevent onBlur from firing first
                e.preventDefault(); // Crucial: prevents input losing focus
                handleSelect(option);
              }}
              className={`px-3 py-2 cursor-pointer transition-all duration-100 ${
                index === highlightedIndex ? 'bg-blue-100' : 'hover:bg-gray-100'
              } ${String(option.value) === String(value) ? 'bg-blue-50 font-semibold' : ''} ${
                option.isForeign ? 'text-red-500 font-bold' : 'text-gray-900'
              }`}
            >
              {option.label}
            </li>
          ))}
        </ul>
      )}
      {isOpen && filteredOptions.length === 0 && (
        <div className="absolute z-50 w-full bg-white border border-gray-300 rounded-md shadow-lg mt-1 px-3 py-2 text-sm text-gray-500">
          No matches found for "{searchTerm}".
        </div>
      )}
    </div>
  );
};
// =========================================================
// END: Searchable Select Component
// =========================================================


function RecordNewLGPage({ onLogout, isGracePeriod }) {
  const navigate = useNavigate();

  const initialFormData = {
    beneficiary_corporate_id: '',
    issuer_name: '',
    issuer_id: '',
    lg_number: '',
    lg_amount: '',
    lg_currency_id: '',
    lg_payable_currency_id: '',
    issuance_date: '',
    expiry_date: '',
    auto_renewal: true,
    lg_type_id: '',
    lg_operational_status_id: '',
    payment_conditions: '',
    description_purpose: '',
    issuing_bank_id: '',
    issuing_bank_address: '',
    issuing_bank_phone: '',
    issuing_bank_fax: '',
    // NEW from Phase 1
    foreign_bank_name: '',
    foreign_bank_country: '',
    foreign_bank_address: '',
    foreign_bank_swift_code: '',
    // NEW from Phase 2
    advising_status: 'Not Advised',
    communication_bank_id: '',
    issuing_method_id: '', // Changed to empty string to set dynamically
    applicable_rule_id: '',
    applicable_rules_text: '',
    other_conditions: '',
    internal_owner_email: '',
    internal_owner_phone: '',
    internal_owner_id: '',
    internal_owner_manager_email: '',
    lg_category_id: '',
    additional_field_values: {},
    internal_contract_project_id: '',
    notes: '',
    ai_scan_file: null,
    internal_supporting_document_file: null,
  };

  const [formData, setFormData] = useState(initialFormData);
  const [dropdownData, setDropdownData] = useState({
    customerEntities: [],
    currencies: [],
    lgTypes: [],
    lgStatuses: [],
    lgOperationalStatuses: [],
    banks: [],
    issuingMethods: [],
    rules: [],
    lgCategories: [],
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [accordionsOpen, setAccordionsOpen] = useState({
    mainLGData: true,
    bankData: false,
    internalData: false,
  });
  const [selectedLgType, setSelectedLgType] = useState(null);
  const [selectedOperationalStatus, setSelectedOperationalStatus] = useState(null);
  const [selectedApplicableRule, setSelectedApplicableRule] = useState(null);
  const [selectedLGCategory, setSelectedLGCategory] = useState(null);
  const [aiScanInProgress, setAiScanInProgress] = useState(false);
  const [isInternalOwnerFieldsLocked, setIsInternalOwnerFieldsLocked] = useState(false);
  const [aiScanSuccess, setAiScanSuccess] = useState(false);
  const [isFormDisabled, setIsFormDisabled] = useState(false);
  // NEW: State to track foreign bank for conditional rendering
  const [isForeignBankSelected, setIsForeignBankSelected] = useState(false);
  const [foreignBankId, setForeignBankId] = useState(null);
  const [advisingStatusOptions, setAdvisingStatusOptions] = useState([]);
  const [communicationBanks, setCommunicationBanks] = useState([]);

  const aiFileInputRef = useRef(null);
  const internalDocInputRef = useRef(null);

  useEffect(() => {
    const fetchAllDropdownData = async () => {
      setIsLoading(true);
      setError('');
      try {
        const [
          customerEntities, currencies, lgTypes, lgStatuses, lgOperationalStatuses,
          banks, issuingMethods, rules, lgCategories
        ] = await Promise.all([
          apiRequest('/end-user/customer-entities/', 'GET'),
          apiRequest('/end-user/currencies/', 'GET'),
          apiRequest('/end-user/lg-types/', 'GET'),
          apiRequest('/end-user/lg-statuses/', 'GET'),
          apiRequest('/end-user/lg-operational-statuses/', 'GET'),
          apiRequest('/end-user/banks/', 'GET'),
          apiRequest('/end-user/issuing-methods/', 'GET'),
          apiRequest('/end-user/rules/', 'GET'),
          apiRequest('/end-user/lg-categories/', 'GET'),
        ]);

        setDropdownData({
          customerEntities, currencies, lgTypes, lgStatuses, lgOperationalStatuses,
          banks, issuingMethods, rules, lgCategories
        });

        // Set the default issuing method to "Manual Delivery" after fetching
        const manualDeliveryId = findIdByName(issuingMethods, 'Manual Delivery');
        if (manualDeliveryId) {
            setFormData(prev => ({
                ...prev,
                issuing_method_id: manualDeliveryId,
            }));
        }
        
        // NEW: Set up advising status options and communication banks
        setAdvisingStatusOptions([
          { value: 'Not Advised', label: 'Not Advised' },
          { value: 'Advised', label: 'Advised' },
          { value: 'Confirmed', label: 'Confirmed' },
        ]);
        const foreignBank = banks.find(bank => bank.name === 'Foreign Bank');
        if (foreignBank) {
          setForeignBankId(foreignBank.id);
          const otherBanks = banks.filter(bank => bank.id !== foreignBank.id);
          setCommunicationBanks(otherBanks);
        } else {
          setCommunicationBanks(banks); // If no foreign bank exists, all are comm banks
        }

      } catch (err) {
        console.error('Failed to fetch dropdown data:', err);
        setError(`Failed to load necessary data for the form. ${err.message || 'An unexpected error occurred.'}`);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAllDropdownData();
  }, []);

  useEffect(() => {
    if (!dropdownData.lgTypes || !dropdownData.lgOperationalStatuses || !dropdownData.rules || !dropdownData.lgCategories) {
      return;
    }
    
    setSelectedLgType(dropdownData.lgTypes.find(type => type.id === parseInt(formData.lg_type_id)));
    setSelectedOperationalStatus(dropdownData.lgOperationalStatuses.find(status => status.id === parseInt(formData.lg_operational_status_id)));
    setSelectedApplicableRule(dropdownData.rules.find(rule => rule.id === parseInt(formData.applicable_rule_id)));
    setSelectedLGCategory(dropdownData.lgCategories.find(cat => cat.id === parseInt(formData.lg_category_id)));
  }, [formData.lg_type_id, formData.lg_operational_status_id, formData.applicable_rule_id, formData.lg_category_id, dropdownData]);

  // UPDATED: useEffect hook for conditional bank fields
  useEffect(() => {
    if (!dropdownData.banks || dropdownData.banks.length === 0) {
      return;
    }
    
    const selectedBank = dropdownData.banks.find(bank => String(bank.id) === String(formData.issuing_bank_id));
    const foreignBank = dropdownData.banks.find(bank => bank.name === 'Foreign Bank');

    if (selectedBank && foreignBank && selectedBank.id === foreignBank.id) {
      setIsForeignBankSelected(true);
      // If 'Foreign Bank' is selected, keep its fields, and clear local bank fields
      setFormData(prev => ({
        ...prev,
        issuing_bank_address: '',
        issuing_bank_phone: '',
        issuing_bank_fax: '',
      }));
    } else if (selectedBank) {
      setIsForeignBankSelected(false);
      // If a regular bank is selected, populate local bank fields and clear foreign bank fields
      setFormData(prev => ({
        ...prev,
        issuing_bank_address: selectedBank.address || '',
        issuing_bank_phone: selectedBank.phone_number || '',
        issuing_bank_fax: selectedBank.fax || '',
        foreign_bank_name: '',
        foreign_bank_country: '',
        foreign_bank_address: '',
        foreign_bank_swift_code: '',
        advising_status: 'Not Advised', // NEW: Reset advising status
        communication_bank_id: '', // NEW: Clear communication bank
      }));
    } else {
      setIsForeignBankSelected(false);
      // If no bank is selected, clear all bank-related fields
      setFormData(prev => ({
        ...prev,
        issuing_bank_address: '',
        issuing_bank_phone: '',
        issuing_bank_fax: '',
        foreign_bank_name: '',
        foreign_bank_country: '',
        foreign_bank_address: '',
        foreign_bank_swift_code: '',
        advising_status: 'Not Advised', // NEW: Reset advising status
        communication_bank_id: '', // NEW: Clear communication bank
      }));
    }
  }, [formData.issuing_bank_id, dropdownData.banks, foreignBankId]);


  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prevData) => {
      if (type === 'checkbox') {
        return { ...prevData, [name]: checked };
      }
      if (name === 'lg_amount') {
        return { ...prevData, [name]: parseFloat(value) || '' };
      }
      if (['beneficiary_corporate_id', 'lg_currency_id', 'lg_payable_currency_id', 'lg_type_id',
			 'lg_operational_status_id', 'issuing_bank_id', 'issuing_method_id', 'applicable_rule_id',
			 'lg_category_id', 'communication_bank_id'].includes(name)) {
		  const parsedValue = parseInt(value, 10);
		  // Handles the case where the select/searchable is cleared (value is '')
		  return { ...prevData, [name]: value === '' ? '' : String(parsedValue) };
		}
      return { ...prevData, [name]: value };
    });
  };

  const handleAdditionalFieldChange = (e) => {
    const { name, value } = e.target;
    setFormData((prevData) => ({
      ...prevData,
      additional_field_values: {
        ...prevData.additional_field_values,
        [name]: value,
      },
    }));
  };

  const handleFileChange = (e) => {
    const { name, files } = e.target;
    if (files.length > 0) {
      setFormData((prevData) => ({
        ...prevData,
        [name]: files[0],
      }));
      setAiScanSuccess(false);
    } else {
      setFormData((prevData) => ({ ...prevData, [name]: null }));
      setAiScanSuccess(false);
    }
  };

  const clearFormDirectly = () => {
    const manualDeliveryId = findIdByName(dropdownData.issuingMethods, 'Manual Delivery');
    setFormData({
        ...initialFormData,
        issuing_method_id: manualDeliveryId,
    });
    setError('');
    setAccordionsOpen({
      mainLGData: true,
      bankData: false,
      internalData: false,
    });
    setIsInternalOwnerFieldsLocked(false);
    setAiScanSuccess(false);
    // NEW: Reset states for conditional fields
    setIsForeignBankSelected(false);
    if (aiFileInputRef.current) {
      aiFileInputRef.current.value = '';
    }
    if (internalDocInputRef.current) {
      internalDocInputRef.current.value = '';
    }
  };

  const handleClearForm = () => {
    if (window.confirm("Are you sure you want to clear all form fields?")) {
      clearFormDirectly();
    }
  };

  const handleAiScan = async () => {
    const fileToProcess = formData.ai_scan_file;
    if (!fileToProcess) {
      setError("Please select an AI Scan File (image or PDF) first.");
      return;
    }

    setAiScanInProgress(true);
    setIsFormDisabled(true);
    setError('');
    setAiScanSuccess(false);

    const fileMimeType = fileToProcess.type;
    if (!fileMimeType.startsWith('image/') && fileMimeType !== 'application/pdf') {
      setError("Only image files (JPEG, PNG) or PDF files are supported for AI scanning.");
      setAiScanInProgress(false);
      setIsFormDisabled(false);
      return;
    }

    const internalSupportingDocFile = formData.internal_supporting_document_file;
    const manualDeliveryId = findIdByName(dropdownData.issuingMethods, 'Manual Delivery');
    const foreignBank = dropdownData.banks.find(b => b.name === "Foreign Bank");

    setFormData(prev => ({
      ...initialFormData,
      ai_scan_file: fileToProcess,
      internal_supporting_document_file: internalSupportingDocFile,
      issuing_method_id: manualDeliveryId, // Set default for new form
    }));

    try {
      const data = new FormData();
      data.append('file', fileToProcess);

      const extractedData = await apiRequest('/end-user/lg-records/scan-file/', 'POST', data, 'multipart/form-data');
      setFormData(prev => {
        let otherConditionsString = '';
        if (Array.isArray(extractedData.other_conditions)) {
          otherConditionsString = extractedData.other_conditions.join('\n');
        } else if (typeof extractedData.other_conditions === 'string') {
          otherConditionsString = extractedData.other_conditions;
        }

        let issuingBankId = extractedData.issuing_bank_id ? String(extractedData.issuing_bank_id) : '';
        let foreignBankName = extractedData.foreign_bank_name || '';
        let foreignBankCountry = extractedData.foreign_bank_country || '';
        let foreignBankAddress = extractedData.foreign_bank_address || '';
        let foreignBankSwiftCode = extractedData.foreign_bank_swift_code || '';
        let issuingBankAddress = extractedData.issuing_bank_address || '';
        let issuingBankPhone = extractedData.issuing_bank_phone || '';
        let issuingBankFax = extractedData.issuing_bank_fax || '';
        let advisingStatus = extractedData.advising_status || 'Not Advised';
        let communicationBankId = extractedData.communication_bank_id ? String(extractedData.communication_bank_id) : '';

        // If a foreign bank ID is matched by name or if the AI returns foreign bank details,
        // use the foreign bank ID and populate the new fields.
        if ((foreignBank && String(issuingBankId) === String(foreignBank.id)) || foreignBankName) {
            if (foreignBank) {
                issuingBankId = String(foreignBank.id);
                issuingBankAddress = '';
                issuingBankPhone = '';
                issuingBankFax = '';
            }
        } else {
            // Otherwise, clear foreign bank fields and advising status fields
            foreignBankName = '';
            foreignBankCountry = '';
            foreignBankAddress = '';
            foreignBankSwiftCode = '';
            advisingStatus = 'Not Advised';
            communicationBankId = '';
        }

        const newFormData = {
          ...prev,
          beneficiary_corporate_id: extractedData.beneficiary_corporate_id ? String(extractedData.beneficiary_corporate_id) : '',
          issuer_name: extractedData.issuer_name || '',
          issuer_id: extractedData.issuer_id || '',
          lg_number: extractedData.lg_number || '',
          lg_amount: extractedData.lg_amount ? parseFloat(extractedData.lg_amount) : '',
          lg_currency_id: extractedData.lg_currency_id ? String(extractedData.lg_currency_id) : '',
          lg_payable_currency_id: extractedData.lg_payable_currency_id ? String(extractedData.lg_payable_currency_id) : null,
          issuance_date: extractedData.issuance_date ? formatDateForInput(extractedData.issuance_date) : '',
          expiry_date: extractedData.expiry_date ? formatDateForInput(extractedData.expiry_date) : '',
          auto_renewal: extractedData.auto_renewal !== true,
          lg_type_id: extractedData.lg_type_id ? String(extractedData.lg_type_id) : '',
          lg_operational_status_id: extractedData.lg_operational_status_id ? String(extractedData.lg_operational_status_id) : null,
          payment_conditions: extractedData.payment_conditions || '',
          description_purpose: extractedData.description_purpose || '',
          issuing_bank_id: issuingBankId,
          issuing_bank_address: issuingBankAddress,
          issuing_bank_phone: issuingBankPhone,
          issuing_bank_fax: issuingBankFax,
          foreign_bank_name: foreignBankName,
          foreign_bank_country: foreignBankCountry,
          foreign_bank_address: foreignBankAddress,
          foreign_bank_swift_code: foreignBankSwiftCode,
          advising_status: advisingStatus,
          communication_bank_id: communicationBankId,
          issuing_method_id: extractedData.issuing_method_id ? String(extractedData.issuing_method_id) : manualDeliveryId, // Use dynamic default
          applicable_rule_id: extractedData.applicable_rule_id ? String(extractedData.applicable_rule_id) : '',
          applicable_rules_text: extractedData.applicable_rules_text || '',
          other_conditions: otherConditionsString,
          lg_category_id: extractedData.lg_category_id ? String(extractedData.lg_category_id) : '',
          additional_field_values: extractedData.additional_field_values || {},
          internal_owner_email: extractedData.internal_owner_email || '',
          internal_owner_phone: extractedData.internal_owner_phone || '',
          internal_owner_id: extractedData.internal_owner_id || '',
          internal_owner_manager_email: extractedData.manager_email || '',
        };
        return newFormData;
      });
      setAiScanSuccess(true);
      alert("AI scan successful! Form fields have been auto-populated.");
    } catch (err) {
      console.error('AI Scan failed:', err);
      setError(`AI Scan failed: ${err.message || 'An unexpected error occurred.'}`);
      setAiScanSuccess(false);
      if (aiFileInputRef.current) {
        aiFileInputRef.current.value = '';
      }
      setFormData(prev => ({ ...prev, ai_scan_file: null }));
    } finally {
      setAiScanInProgress(false);
      setIsFormDisabled(false);
    }
  };

  const handleInternalOwnerEmailLookup = async () => {
    const email = formData.internal_owner_email;
    if (!email) {
      setFormData(prev => ({
        ...prev,
        internal_owner_phone: '',
        internal_owner_id: '',
        internal_owner_manager_email: '',
      }));
      setIsInternalOwnerFieldsLocked(false);
      setError('');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Please enter a valid email format for lookup.");
      setFormData(prev => ({
        ...prev,
        internal_owner_phone: '',
        internal_owner_id: '',
        internal_owner_manager_email: '',
      }));
      setIsInternalOwnerFieldsLocked(false);
      return;
    }

    setError('');

    try {
      const contactDetails = await apiRequest(`/end-user/internal-owner-contacts/lookup-by-email/?email=${encodeURIComponent(email)}`, 'GET');
      
      if (contactDetails) {
        setFormData(prev => {
          const newContactData = {
            ...prev,
            internal_owner_phone: contactDetails.phone_number || '',
            internal_owner_id: contactDetails.internal_id || '',
            internal_owner_manager_email: contactDetails.manager_email || '',
          };
          return newContactData;
        });
        setIsInternalOwnerFieldsLocked(true);
      } else {
        setFormData(prev => ({
          ...prev,
          internal_owner_phone: '',
          internal_owner_id: '',
          internal_owner_manager_email: '',
        }));
        setIsInternalOwnerFieldsLocked(false);
        setError(`Internal Owner contact '${email}' not found. Please fill in details for a new contact.`);
      }
    } catch (err) {
      console.error('Internal Owner lookup failed:', err);
      setFormData(prev => ({
        ...prev,
        internal_owner_phone: '',
        internal_owner_id: '',
        internal_owner_manager_email: '',
      }));
      setIsInternalOwnerFieldsLocked(false);
      setError(`Internal Owner lookup failed: ${err.message || 'An unexpected error occurred.'}`);
    } finally {
    }
  };

  const toggleAccordion = (sectionToToggle) => {
    setAccordionsOpen(prev => {
      const newState = {};
      for (const key in prev) {
        newState[key] = (key === sectionToToggle) ? !prev[key] : false;
      }
      return newState;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    setError('');
    
    if (isGracePeriod) {
      setError("This action is disabled during your subscription's grace period.");
      setIsSaving(false);
      return;
    }

    const errors = [];
    if (!formData.beneficiary_corporate_id) errors.push("Beneficiary Corporate is mandatory.");
    if (!formData.issuer_name) errors.push("Issuer Name is mandatory.");
    if (!formData.lg_number) errors.push("LG Number is mandatory.");
    if (!formData.lg_amount || isNaN(formData.lg_amount) || formData.lg_amount <= 0) errors.push("LG Amount must be a positive number.");
    if (!formData.lg_currency_id) errors.push("LG Currency is mandatory.");
    if (!formData.issuance_date) errors.push("Issuance Date is mandatory.");
    if (!formData.expiry_date) errors.push("Expiry Date is mandatory.");
    if (!formData.lg_type_id) errors.push("LG Type is mandatory.");
    if (!formData.description_purpose) errors.push("Description/Purpose is mandatory.");
    
    // UPDATED: Conditional validation for foreign banks
    const foreignBankId = dropdownData.banks.find(bank => bank.name === 'Foreign Bank')?.id;
    if (!formData.issuing_bank_id) errors.push("Issuing Bank is mandatory.");
    else if (parseInt(formData.issuing_bank_id, 10) === foreignBankId) {
      if (!formData.foreign_bank_name) errors.push("Foreign Bank Name is mandatory.");
      if (!formData.foreign_bank_country) errors.push("Foreign Bank Country is mandatory.");
      if (!formData.foreign_bank_address) errors.push("Foreign Bank Address is mandatory.");
      if (!formData.foreign_bank_swift_code) errors.push("Foreign Bank SWIFT Code is mandatory.");
      // NEW: Add validation for Advising/Confirming Bank
      if (formData.advising_status === 'Advised' || formData.advising_status === 'Confirmed') {
        if (!formData.communication_bank_id) {
          errors.push(`A Communication Bank is mandatory when Advising Status is '${formData.advising_status}'.`);
        }
      }
    } else {
      if (!formData.issuing_bank_address) errors.push("Issuing Bank Address is mandatory.");
      if (!formData.issuing_bank_phone) errors.push("Issuing Bank Phone is mandatory.");
    }

    if (!formData.issuing_method_id) errors.push("Issuing Method is mandatory.");
    if (!formData.applicable_rule_id) errors.push("Applicable Rule is mandatory.");
    if (!formData.internal_owner_email) errors.push("Internal Owner Email is mandatory.");
    if (!formData.internal_owner_phone) errors.push("Internal Owner Phone is mandatory.");
    if (!formData.internal_owner_manager_email) errors.push("Internal Owner Manager Email is mandatory.");
    if (!formData.lg_category_id) errors.push("Category is mandatory.");

    const issuanceMoment = moment(formData.issuance_date);
    const expiryMoment = moment(formData.expiry_date);
    if (issuanceMoment.isValid() && expiryMoment.isValid()) {
      if (expiryMoment.isSameOrBefore(issuanceMoment)) {
        errors.push("Expiry Date must be after Issuance Date.");
      }
    } else {
      if (formData.issuance_date && !issuanceMoment.isValid()) errors.push("Invalid Issuance Date format.");
      if (formData.expiry_date && !expiryMoment.isValid()) errors.push("Invalid Expiry Date format.");
    }

    if (selectedLgType && selectedLgType.name === "Advance Payment LG") {
      if (!formData.lg_operational_status_id) errors.push("Operational Status is mandatory for 'Advance Payment LG' type.");
      if (selectedOperationalStatus && selectedOperationalStatus.name === "None Operative") {
        if (!formData.payment_conditions || formData.payment_conditions.trim() === '') errors.push("Payment Conditions are mandatory when LG Type is 'Advance Payment LG' and Operational Status is 'None Operative'.");
      } else if (formData.payment_conditions && formData.payment_conditions.trim() !== '') {
        errors.push("Payment Conditions should only be provided for 'Advance Payment LG' with 'None Operative' status.");
      }
    } else {
      if (formData.lg_operational_status_id) errors.push("Operational Status is only applicable for 'Advance Payment LG' type.");
      if (formData.payment_conditions && formData.payment_conditions.trim() !== '') errors.push("Payment Conditions are only applicable for 'Advance Payment LG' type with 'None Operative' status.");
    }

    if (selectedApplicableRule && selectedApplicableRule.name === "Other") {
      if (!formData.applicable_rules_text || formData.applicable_rules_text.trim() === '') errors.push("Applicable Rules Text is mandatory when Applicable Rule is 'Other'.");
    } else if (formData.applicable_rules_text && formData.applicable_rules_text.trim() !== '') {
      errors.push("Applicable Rules Text should only be provided when Applicable Rule is 'Other'.");
    }

    if (selectedLGCategory && selectedLGCategory.extra_field_name) {
      if (selectedLGCategory.is_mandatory && (!formData.additional_field_values[selectedLGCategory.extra_field_name] || formData.additional_field_values[selectedLGCategory.extra_field_name].trim() === '')) {
        errors.push(`Custom field '${selectedLGCategory.extra_field_name}' is mandatory for the selected LG Category.`);
      }
    } else if (selectedLGCategory && !selectedLGCategory.extra_field_name && Object.keys(formData.additional_field_values).length > 0) {
      errors.push(`No custom field is expected for the selected LG Category '${selectedLGCategory.category_name}'.`);
    }

    if (errors.length > 0) {
      setError(errors.join(' '));
      setIsSaving(false);
      setAccordionsOpen({
        mainLGData: errors.some(e => ['Beneficiary Corporate', 'Issuer Name', 'LG Number', 'LG Amount', 'LG Currency', 'Issuance Date', 'Expiry Date', 'LG Type', 'Operational Status', 'Payment Conditions', 'Description/Purpose'].some(field => e.includes(field))),
        bankData: errors.some(e => ['Issuing Bank', 'Issuing Bank Address', 'Issuing Bank Phone', 'Issuing Method', 'Applicable Rule', 'Applicable Rules Text', 'Foreign Bank Name', 'Foreign Bank Country', 'Foreign Bank Address', 'Advising Status', 'Communication Bank'].some(field => e.includes(field))),
        internalData: errors.some(e => ['Internal Owner', 'Category', 'Custom field'].some(field => e.includes(field))),
      });
      return;
    }

    const jsonPayload = {
        ...formData,
        issuance_date: formData.issuance_date ? moment(formData.issuance_date).format('YYYY-MM-DD') : null,
        expiry_date: formData.expiry_date ? moment(formData.expiry_date).format('YYYY-MM-DD') : null,
        lg_operational_status_id: (selectedLgType && selectedLgType.name === "Advance Payment LG") ? formData.lg_operational_status_id : null,
        lg_payable_currency_id: formData.lg_payable_currency_id,
		payment_conditions: (selectedLgType && selectedLgType.name === "Advance Payment LG" && selectedOperationalStatus && selectedOperationalStatus.name === "None Operative") ? formData.payment_conditions : null,
        applicable_rules_text: (selectedApplicableRule && selectedApplicableRule.name === "Other") ? formData.applicable_rules_text : null,
        additional_field_values: (selectedLGCategory && selectedLGCategory.extra_field_name) ? formData.additional_field_values : {},
        ai_scan_file: formData.ai_scan_file ? {
            file_name: formData.ai_scan_file.name,
            mime_type: formData.ai_scan_file.type,
            file_path: "",
            document_type: 'AI_SCAN',
        } : null,
        internal_supporting_document_file: formData.internal_supporting_document_file ? {
            file_name: formData.internal_supporting_document_file.name,
            mime_type: formData.internal_supporting_document_file.type,
            file_path: "",
            document_type: 'INTERNAL_SUPPORTING',
        } : null,
        manager_email: formData.internal_owner_manager_email,
        // NEW: Conditionally include foreign bank details
        foreign_bank_name: isForeignBankSelected ? formData.foreign_bank_name : null,
        foreign_bank_country: isForeignBankSelected ? formData.foreign_bank_country : null,
        foreign_bank_address: isForeignBankSelected ? formData.foreign_bank_address : null,
        foreign_bank_swift_code: isForeignBankSelected ? formData.foreign_bank_swift_code : null,
        // NEW: Conditionally include advising status fields
        advising_status: isForeignBankSelected ? formData.advising_status : null,
        communication_bank_id: isForeignBankSelected ? formData.communication_bank_id : null,
        // NEW: Ensure local bank fields are nullified if foreign bank is selected.
        issuing_bank_address: isForeignBankSelected ? null : formData.issuing_bank_address,
        issuing_bank_phone: isForeignBankSelected ? null : formData.issuing_bank_phone,
        issuing_bank_fax: isForeignBankSelected ? null : formData.issuing_bank_fax,
    };

    const formDataToSend = new FormData();
    formDataToSend.append('lg_record_in', JSON.stringify(jsonPayload));

    if (formData.ai_scan_file) {
        formDataToSend.append('ai_scan_file', formData.ai_scan_file);
    }
    if (formData.internal_supporting_document_file) {
        formDataToSend.append('internal_supporting_document_file', formData.internal_supporting_document_file);
    }

    try {
        const response = await apiRequest('/end-user/lg-records/', 'POST', formDataToSend, 'multipart/form-data');
        alert('New LG Record created successfully!');
        clearFormDirectly();
        navigate('/end-user/dashboard');
    } catch (err) {
      console.error('Error creating LG record:', err);
      let errorMessage = 'An unexpected error occurred.';
      if (err.detail) {
        if (Array.isArray(err.detail)) {
          errorMessage = err.detail.map(e => {
            const field = e.loc && Array.isArray(e.loc) && e.loc.length > 1 ? e.loc[1] : '';
            return field ? `${field}: ${e.msg}` : e.msg;
          }).join('; ');
        } else if (typeof err.detail === 'string') {
          errorMessage = err.detail;
        }
      } else if (err.message) {
        errorMessage = err.message;
      }
      setError(`Error creating LG Record: ${errorMessage}`);
    } finally {
      setIsSaving(false);
    }
  };

  const inputClassNames = "mb-2 mt-1 block w-full text-base px-3 py-2 rounded-md border border-gray-300 bg-white shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200";
  const labelClassNames = "block text-sm font-medium text-gray-700";
  const requiredSpan = <span className="text-red-500">*</span>;

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <svg className="animate-spin h-8 w-8 text-blue-600 mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <p className="text-gray-600 mt-2">Loading form data...</p>
      </div>
    );
  }
  
  const isAdvisingOrConfirmed = formData.advising_status === 'Advised' || formData.advising_status === 'Confirmed';
  
  // Prepare bank options for the new searchable select component
  const bankOptions = dropdownData.banks.map(bank => ({
    value: String(bank.id),
    label: `${bank.name} (${bank.short_name || bank.swift_code || 'N/A'})`,
    isForeign: bank.name === 'Foreign Bank',
  }));
  
  // Prepare communication bank options (excluding Foreign Bank, if it exists)
  const communicationBankOptions = communicationBanks.map(bank => ({
    value: String(bank.id),
    label: `${bank.name} (${bank.short_name || bank.swift_code || 'N/A'})`,
    isForeign: false,
  }));


  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-2xl font-semibold text-gray-800 mb-6">Record New LG</h2>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-md relative mb-4 flex items-center" role="alert">
          <AlertCircle className="h-5 w-5 mr-2" />
          <span className="block sm:inline">{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Main LG Data Accordion */}
        <div className="bg-white shadow-md rounded-lg">
          <button
            type="button"
            className="flex justify-between items-center w-full p-4 font-medium text-left text-gray-800 bg-gray-50 rounded-t-lg hover:bg-gray-100 focus:outline-none"
            onClick={() => toggleAccordion('mainLGData')}
            disabled={isFormDisabled || isGracePeriod}
          >
            <span>Main LG Data</span>
            {accordionsOpen.mainLGData ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </button>
          {accordionsOpen.mainLGData && (
            <div className={`p-4 border-t border-gray-200 grid grid-cols-1 md:grid-cols-2 gap-4 ${isFormDisabled || isGracePeriod ? 'opacity-50' : ''}`}>
              <div className="md:col-span-2 mb-2">
                <label htmlFor="ai_scan_file" className={labelClassNames}>LG Copy {requiredSpan}</label>
                <div className={`flex items-stretch rounded-md shadow-sm border ${aiScanSuccess ? 'border-green-500' : 'border-gray-300'} focus-within:ring-1 focus-within:ring-blue-500 focus-within:border-blue-500 transition-all duration-200`}>
                  <label htmlFor="ai_scan_file" className={`cursor-pointer bg-gray-50 hover:bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 rounded-l-md flex items-center border-r border-gray-300 ${isFormDisabled || isGracePeriod ? 'opacity-50 cursor-not-allowed' : ''}`}>
                    Choose File
                  </label>
                  <input
                    type="file"
                    name="ai_scan_file"
                    id="ai_scan_file"
                    ref={aiFileInputRef}
                    onChange={handleFileChange}
                    accept="image/*,application/pdf"
                    className="hidden"
                    disabled={isFormDisabled || isGracePeriod}
                  />
                  <div className="flex-grow px-3 py-2 text-sm text-gray-900 bg-white flex items-center truncate">
                    {formData.ai_scan_file ? formData.ai_scan_file.name : 'No file chosen'}
                  </div>
                  {aiScanSuccess && (
                    <div className="px-3 py-2 flex items-center bg-green-50 text-green-700">
                      <CheckCircle className="h-5 w-5" />
                    </div>
                  )}
                  <GracePeriodTooltip isGracePeriod={isGracePeriod}>
                    <button
                      type="button"
                      className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-r-md text-white bg-gray-600 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-all duration-200 ease-in-out ${aiScanInProgress || !formData.ai_scan_file || isGracePeriod ? 'opacity-50 cursor-not-allowed' : ''}`}
                      onClick={handleAiScan}
                      disabled={aiScanInProgress || !formData.ai_scan_file || isGracePeriod}
                    >
                      {aiScanInProgress ? (
                        <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                      ) : (
                        <Scan className="h-5 w-5 mr-2" />
                      )}
                      {aiScanInProgress ? 'Scanning...' : 'Upload & Scan'}
                    </button>
                  </GracePeriodTooltip>
                </div>
                <p className="mt-1 text-sm text-gray-500">
                  {formData.ai_scan_file ? (
                    <>
                      File uploaded, scanned & data extracted!{' '}
                      {!isFormDisabled && !isGracePeriod && <span onClick={() => aiFileInputRef.current && aiFileInputRef.current.click()} className="text-blue-600 cursor-pointer hover:underline">Change File</span>}
                    </>
                  ) : (
                    'Upload an image or PDF of the LG to auto-populate fields.'
                  )}
                </p>
              </div>
              <div className="md:col-span-2 mb-2">
                <label htmlFor="beneficiary_corporate_id" className={labelClassNames}>Beneficiary Corporate {requiredSpan}</label>
                <select
                  name="beneficiary_corporate_id"
                  id="beneficiary_corporate_id"
                  value={formData.beneficiary_corporate_id}
                  onChange={handleChange}
                  required
                  className={inputClassNames}
                  disabled={isFormDisabled || isGracePeriod}
                >
                  <option value="">Select Beneficiary Corporate</option>
                  {dropdownData.customerEntities.map(entity => (
                    <option key={`entity-${entity.id}`} value={String(entity.id)}>{entity.entity_name} ({entity.code})</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:col-span-2">
                <div className="mb-2">
                  <label htmlFor="issuer_name" className={labelClassNames}>Issuer Name {requiredSpan}</label>
                  <input type="text" name="issuer_name" id="issuer_name" value={formData.issuer_name} onChange={handleChange} required className={inputClassNames} disabled={isFormDisabled || isGracePeriod} />
                </div>
                <div className="mb-2">
                  <label htmlFor="issuer_id" className={labelClassNames}>Issuer ID</label>
                  <input type="text" name="issuer_id" id="issuer_id" value={formData.issuer_id} onChange={handleChange} maxLength="15" className={inputClassNames} disabled={isFormDisabled || isGracePeriod} />
                </div>
              </div>
              <div className="mb-2">
                <label htmlFor="lg_number" className={labelClassNames}>LG Number {requiredSpan}</label>
                <input type="text" name="lg_number" id="lg_number" value={formData.lg_number} onChange={handleChange} required maxLength="64" className={inputClassNames} disabled={isFormDisabled || isGracePeriod} />
              </div>
              <div className="mb-2">
                <label htmlFor="lg_amount" className={labelClassNames}>LG Amount {requiredSpan}</label>
                <input type="number" name="lg_amount" id="lg_amount" value={formData.lg_amount} onChange={handleChange} required min="0.01" step="0.01" className={inputClassNames} disabled={isFormDisabled || isGracePeriod} />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:col-span-2">
                <div className="mb-2">
                  <label htmlFor="lg_currency_id" className={labelClassNames}>LG Currency {requiredSpan}</label>
                  <select name="lg_currency_id" id="lg_currency_id" value={formData.lg_currency_id} onChange={handleChange} required className={inputClassNames} disabled={isFormDisabled || isGracePeriod} >
                    <option value="">Select Currency</option>
                    {dropdownData.currencies.map(currency => (
                      <option key={`currency-${currency.id}`} value={String(currency.id)}>{currency.iso_code} - {currency.name}</option>
                    ))}
                  </select>
                </div>
                <div className="mb-2">
                  <label htmlFor="lg_payable_currency_id" className={labelClassNames}>LG Payable Currency</label>
                  <select name="lg_payable_currency_id" id="lg_payable_currency_id" value={formData.lg_payable_currency_id} onChange={handleChange} className={inputClassNames} disabled={isFormDisabled || isGracePeriod} >
                    <option value="">Same as LG Currency</option>
                    {dropdownData.currencies.map(currency => (
                      <option key={`payable-currency-${currency.id}`} value={String(currency.id)}>{currency.iso_code} - {currency.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:col-span-2">
                <div className="mb-2">
                  <label htmlFor="issuance_date" className={labelClassNames}>Issuance Date {requiredSpan}</label>
                  <input type="date" name="issuance_date" id="issuance_date" value={formData.issuance_date} onChange={handleChange} required className={inputClassNames} disabled={isFormDisabled || isGracePeriod} />
                </div>
                <div className="mb-2">
                  <label htmlFor="expiry_date" className={labelClassNames}>Expiry Date {requiredSpan}</label>
                  <input type="date" name="expiry_date" id="expiry_date" value={formData.expiry_date} onChange={handleChange} required className={inputClassNames} disabled={isFormDisabled || isGracePeriod} />
                </div>
              </div>
              <div className="flex items-center mb-2">
                <label htmlFor="auto_renewal" className={`relative inline-flex items-center cursor-pointer ${isFormDisabled || isGracePeriod ? 'opacity-50 cursor-not-allowed' : ''}`}>
                  <input
                    type="checkbox"
                    name="auto_renewal"
                    id="auto_renewal"
                    checked={formData.auto_renewal}
                    onChange={handleChange}
                    className="sr-only peer"
                    disabled={isFormDisabled || isGracePeriod}
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  <span className="ml-3 text-sm font-medium text-gray-900">Auto-Renewal</span>
                </label>
              </div>
              <div className="mb-2">
                <label htmlFor="lg_type_id" className={labelClassNames}>LG Type {requiredSpan}</label>
                <select name="lg_type_id" id="lg_type_id" value={formData.lg_type_id} onChange={handleChange} required className={inputClassNames} disabled={isFormDisabled || isGracePeriod} >
                  <option value="">Select LG Type</option>
                  {dropdownData.lgTypes.map(type => (
                    <option key={`lg-type-${type.id}`} value={String(type.id)}>{type.name}</option>
                  ))}
                </select>
              </div>
              {selectedLgType && selectedLgType.name === "Advance Payment LG" && (
                <div className="mb-2">
                  <label htmlFor="lg_operational_status_id" className={labelClassNames}>Operational Status {requiredSpan}</label>
                  <select name="lg_operational_status_id" id="lg_operational_status_id" value={formData.lg_operational_status_id} onChange={handleChange} required={selectedLgType.name === "Advance Payment LG"} className={inputClassNames} disabled={isFormDisabled || isGracePeriod} >
                    <option value="">Select Operational Status</option>
                    {dropdownData.lgOperationalStatuses.map(status => (
                      <option key={`op-status-${status.id}`} value={String(status.id)}>{status.name}</option>
                    ))}
                  </select>
                </div>
              )}
              {selectedLgType && selectedLgType.name === "Advance Payment LG" && selectedOperationalStatus && selectedOperationalStatus.name === "None Operative" && (
                <div className="mb-2">
                  <label htmlFor="payment_conditions" className={labelClassNames}>Payment Conditions {requiredSpan}</label>
                  <textarea name="payment_conditions" id="payment_conditions" value={formData.payment_conditions} onChange={handleChange} required={selectedLgType.name === "Advance Payment LG" && selectedOperationalStatus.name === "Non-Operative"} maxLength="1024" rows="1" className={inputClassNames} disabled={isFormDisabled || isGracePeriod}></textarea>
                </div>
              )}
              <div className="md:col-span-2 mb-2">
                <label htmlFor="description_purpose" className={labelClassNames}>Description/Purpose {requiredSpan}</label>
                <textarea name="description_purpose" id="description_purpose" value={formData.description_purpose} onChange={handleChange} required maxLength="516" rows="3" className={inputClassNames} disabled={isFormDisabled || isGracePeriod}></textarea>
              </div>
            </div>
          )}
        </div>

        {/* Bank Data Accordion */}
        <div className="bg-white shadow-md rounded-lg">
          <button
            type="button"
            className="flex justify-between items-center w-full p-4 font-medium text-left text-gray-800 bg-gray-50 rounded-t-lg hover:bg-gray-100 focus:outline-none"
            onClick={() => toggleAccordion('bankData')}
            disabled={isFormDisabled || isGracePeriod}
          >
            <span>Bank Data</span>
            {accordionsOpen.bankData ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </button>
          {accordionsOpen.bankData && (
            <div className={`p-4 border-t border-gray-200 grid grid-cols-1 md:grid-cols-2 gap-4 ${isFormDisabled || isGracePeriod ? 'opacity-50' : ''}`}>
              <div className="mb-2">
                <label htmlFor="issuing_bank_id" className={labelClassNames}>Issuing Bank {requiredSpan}</label>
                <SearchableBankSelect
                    name="issuing_bank_id"
                    id="issuing_bank_id"
                    value={formData.issuing_bank_id}
                    onChange={handleChange}
                    options={bankOptions}
                    placeholder="Type to search Issuing Bank"
                    required
                    className={inputClassNames}
                    disabled={isFormDisabled || isGracePeriod}
                />
              </div>
              {/* NEW: Conditional fields for Foreign Bank */}
              {isForeignBankSelected ? (
                <>
                  <div className="mb-2">
                    <label htmlFor="foreign_bank_name" className={labelClassNames}>Bank Name {requiredSpan}</label>
                    <input type="text" name="foreign_bank_name" id="foreign_bank_name" value={formData.foreign_bank_name} onChange={handleChange} required={isForeignBankSelected} className={inputClassNames} disabled={isFormDisabled || isGracePeriod} />
                  </div>
                  <div className="mb-2">
                    <label htmlFor="foreign_bank_country" className={labelClassNames}>Country {requiredSpan}</label>
                    <input type="text" name="foreign_bank_country" id="foreign_bank_country" value={formData.foreign_bank_country} onChange={handleChange} required={isForeignBankSelected} className={inputClassNames} disabled={isFormDisabled || isGracePeriod} />
                  </div>
                  <div className="mb-2">
                    <label htmlFor="foreign_bank_address" className={labelClassNames}>Address {requiredSpan}</label>
                    <input type="text" name="foreign_bank_address" id="foreign_bank_address" value={formData.foreign_bank_address} onChange={handleChange} required={isForeignBankSelected} className={inputClassNames} disabled={isFormDisabled || isGracePeriod} />
                  </div>
                  <div className="mb-2">
                    <label htmlFor="foreign_bank_swift_code" className={labelClassNames}>SWIFT Code {requiredSpan}</label>
                    <input type="text" name="foreign_bank_swift_code" id="foreign_bank_swift_code" value={formData.foreign_bank_swift_code} onChange={handleChange} required={isForeignBankSelected} className={inputClassNames} disabled={isFormDisabled || isGracePeriod} />
                  </div>
                  {/* UPDATED: Advising Status and Communication Bank fields */}
                  <div className="mb-2">
                    <label htmlFor="advising_status" className={labelClassNames}>Advising Status {requiredSpan}</label>
                    <select
                      name="advising_status"
                      id="advising_status"
                      value={formData.advising_status}
                      onChange={handleChange}
                      required={isForeignBankSelected}
                      className={inputClassNames}
                      disabled={isFormDisabled || isGracePeriod}
                    >
                      {advisingStatusOptions.map(option => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  </div>
                  {(formData.advising_status === 'Advised' || formData.advising_status === 'Confirmed') && (
                    <div className="mb-2">
                      <label htmlFor="communication_bank_id" className={labelClassNames}>
                        {formData.advising_status === 'Advised' ? 'Advising Bank' : 'Confirming Bank'} {requiredSpan}
                      </label>
                      {/* NOW USING SearchableBankSelect for consistency */}
                      <SearchableBankSelect
                          name="communication_bank_id"
                          id="communication_bank_id"
                          value={formData.communication_bank_id}
                          onChange={handleChange}
                          options={communicationBankOptions}
                          placeholder={`Type to search ${formData.advising_status === 'Advised' ? 'Advising Bank' : 'Confirming Bank'}`}
                          required
                          className={inputClassNames}
                          disabled={isFormDisabled || isGracePeriod}
                      />
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div className="mb-2">
                    <label htmlFor="issuing_bank_address" className={labelClassNames}>Issuing Bank Address {requiredSpan}</label>
                    <input type="text" name="issuing_bank_address" id="issuing_bank_address" value={formData.issuing_bank_address} onChange={handleChange} required={!isForeignBankSelected && formData.issuing_bank_id !== ''} readOnly className={`${inputClassNames} bg-gray-100`} />
                  </div>
                  <div className="mb-2">
                    <label htmlFor="issuing_bank_phone" className={labelClassNames}>Issuing Bank Phone {requiredSpan}</label>
                    <input type="text" name="issuing_bank_phone" id="issuing_bank_phone" value={formData.issuing_bank_phone} onChange={handleChange} required={!isForeignBankSelected && formData.issuing_bank_id !== ''} readOnly className={`${inputClassNames} bg-gray-100`} />
                  </div>
                  <div className="mb-2">
                    <label htmlFor="issuing_bank_fax" className={labelClassNames}>Issuing Bank Fax</label>
                    <input type="text" name="issuing_bank_fax" id="issuing_bank_fax" value={formData.issuing_bank_fax} onChange={handleChange} maxLength="18" readOnly className={`${inputClassNames} bg-gray-100`} />
                  </div>
                </>
              )}
              {/* END NEW: Conditional fields for Foreign Bank */}
              <div className="mb-2">
                <label htmlFor="issuing_method_id" className={labelClassNames}>Issuing Method {requiredSpan}</label>
                <select name="issuing_method_id" id="issuing_method_id" value={formData.issuing_method_id} onChange={handleChange} required className={inputClassNames} disabled={isFormDisabled || isGracePeriod} >
                  <option value="">Select Issuing Method</option>
                  {dropdownData.issuingMethods.map(method => (
                    <option key={`issuing-method-${method.id}`} value={String(method.id)}>{method.name}</option>
                  ))}
                </select>
              </div>
              <div className="mb-2">
                <label htmlFor="applicable_rule_id" className={labelClassNames}>Applicable Rule {requiredSpan}</label>
                <select name="applicable_rule_id" id="applicable_rule_id" value={formData.applicable_rule_id} onChange={handleChange} required className={inputClassNames} disabled={isFormDisabled || isGracePeriod} >
                  <option value="">Select Rule</option>
                  {dropdownData.rules.map(rule => (
                    <option key={`rule-${rule.id}`} value={String(rule.id)}>{rule.name}</option>
                  ))}
                </select>
              </div>
              {selectedApplicableRule && selectedApplicableRule.name === "Other" && (
                <div className="mb-2">
                  <label htmlFor="applicable_rules_text" className={labelClassNames}>Applicable Rules Text {requiredSpan}</label>
                  <input type="text" name="applicable_rules_text" id="applicable_rules_text" value={formData.applicable_rules_text} onChange={handleChange} required={selectedApplicableRule.name === "Other"} maxLength="64" className={inputClassNames} disabled={isFormDisabled || isGracePeriod} />
                </div>
              )}
              <div className="md:col-span-2 mb-2">
                <label htmlFor="other_conditions" className={labelClassNames}>Other Conditions</label>
                <textarea name="other_conditions" id="other_conditions" value={formData.other_conditions} onChange={handleChange} maxLength="8000" rows="2" className={inputClassNames} disabled={isFormDisabled || isGracePeriod}></textarea>
              </div>
            </div>
          )}
        </div>

        {/* Internal Data Accordion */}
        <div className="bg-white shadow-md rounded-lg">
          <button
            type="button"
            className="flex justify-between items-center w-full p-4 font-medium text-left text-gray-800 bg-gray-50 rounded-t-lg hover:bg-gray-100 focus:outline-none"
            onClick={() => toggleAccordion('internalData')}
            disabled={isFormDisabled || isGracePeriod}
          >
            <span>Internal Data</span>
            {accordionsOpen.internalData ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </button>
          {accordionsOpen.internalData && (
            <div className={`p-4 border-t border-gray-200 grid grid-cols-1 md:grid-cols-2 gap-4 ${isFormDisabled || isGracePeriod ? 'opacity-50' : ''}`}>
              <div className="mb-2">
                <label htmlFor="internal_owner_email" className={labelClassNames}>Internal Owner (Email) {requiredSpan}</label>
                <input
                    type="email"
                    name="internal_owner_email"
                    id="internal_owner_email"
                    value={formData.internal_owner_email}
                    onChange={handleChange}
                    onBlur={handleInternalOwnerEmailLookup}
                    required
					className={inputClassNames}
                    disabled={isFormDisabled || isGracePeriod}
                />
              </div>
              <div className="mb-2">
                <label htmlFor="internal_owner_phone" className={labelClassNames}>Internal Owner (Phone) {requiredSpan}</label>
                <input
                  type="text"
                  name="internal_owner_phone"
                  id="internal_owner_phone"
                  value={formData.internal_owner_phone}
                  onChange={handleChange}
                  required
                  readOnly={isInternalOwnerFieldsLocked || isFormDisabled || isGracePeriod}
                  className={`${inputClassNames} ${isInternalOwnerFieldsLocked || isFormDisabled || isGracePeriod ? 'bg-gray-200' : ''}`}
                />
              </div>
              <div className="mb-2">
                <label htmlFor="internal_owner_id" className={labelClassNames}>Internal Owner (ID)</label>
                <input
                  type="text"
                  name="internal_owner_id"
                  id="internal_owner_id"
                  value={formData.internal_owner_id}
                  onChange={handleChange}
                  maxLength="10"
                  readOnly={isInternalOwnerFieldsLocked || isFormDisabled || isGracePeriod}
                  className={`${inputClassNames} ${isInternalOwnerFieldsLocked || isFormDisabled || isGracePeriod ? 'bg-gray-200' : ''}`}
                />
              </div>
              <div className="mb-2">
                <label htmlFor="internal_owner_manager_email" className={labelClassNames}>Internal Owner (Manager) {requiredSpan}</label>
                <input
                  type="email"
                  name="internal_owner_manager_email"
                  id="internal_owner_manager_email"
                  value={formData.internal_owner_manager_email}
                  onChange={handleChange}
                  required
                  readOnly={isInternalOwnerFieldsLocked || isFormDisabled || isGracePeriod}
                  className={`${inputClassNames} ${isInternalOwnerFieldsLocked || isFormDisabled || isGracePeriod ? 'bg-gray-200' : ''}`}
                />
              </div>
              <div className="mb-2">
                <label htmlFor="lg_category_id" className={labelClassNames}>Category {requiredSpan}</label>
                {dropdownData.lgCategories.length > 0 ? (
                  <select name="lg_category_id" id="lg_category_id" value={formData.lg_category_id} onChange={handleChange} required className={inputClassNames} disabled={isFormDisabled || isGracePeriod} >
                    <option value="">Select Category</option>
                    {dropdownData.lgCategories.map(cat => (
                      <option key={`lg-category-${cat.type}-${cat.id}`} value={String(cat.id)}>
                        {cat.name} ({cat.code}) {cat.customer_id === null ? '(System Default)' : ''}
                      </option>
                    ))}
                  </select>
                ) : (
                  <p className="mt-1 text-sm text-gray-500 mb-2">No LG Categories defined by Corporate Admin. Please ask your Corporate Admin to define at least one category.</p>
                )}
              </div>
              {selectedLGCategory && selectedLGCategory.extra_field_name && (
                <div className="mb-2">
                  <label htmlFor="additional_field_value" className={labelClassNames}>
                    {selectedLGCategory.extra_field_name} {selectedLGCategory.is_mandatory && requiredSpan}
                  </label>
                  <input
                    type="text"
                    name={selectedLGCategory.extra_field_name}
                    id="additional_field_value"
                    value={formData.additional_field_values[selectedLGCategory.extra_field_name] || ''}
                    onChange={handleAdditionalFieldChange}
                    required={selectedLGCategory.is_mandatory}
                    className={inputClassNames}
                    disabled={isFormDisabled || isGracePeriod}
                  />
                </div>
              )}
              <div className="mb-2">
                <label htmlFor="internal_contract_project_id" className={labelClassNames}>Contract/Project ID</label>
                <input
                  type="text"
                  name="internal_contract_project_id"
                  id="internal_contract_project_id"
                  value={formData.internal_contract_project_id}
                  onChange={handleChange}
                  maxLength="64"
                  className={inputClassNames}
                  disabled={isFormDisabled || isGracePeriod}
                />
              </div>
              <div className="md:col-span-2 mb-2">
                <label htmlFor="internal_supporting_document_file" className={labelClassNames}>Internal Supporting Document</label>
                <div className={`flex items-stretch rounded-md shadow-sm border border-gray-300 focus-within:ring-1 focus-within:ring-blue-500 focus-within:border-blue-500 transition-all duration-200 ${isFormDisabled || isGracePeriod ? 'opacity-50' : ''}`}>
                  <label htmlFor="internal_supporting_document_file" className={`cursor-pointer bg-gray-50 hover:bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 rounded-l-md flex items-center border-r border-gray-300 ${isFormDisabled || isGracePeriod ? 'cursor-not-allowed' : ''}`}>
                    Choose File
                  </label>
                  <input
                    type="file"
                    name="internal_supporting_document_file"
                    id="internal_supporting_document_file"
                    ref={internalDocInputRef}
                    onChange={handleFileChange}
                    accept="application/pdf"
                    className="hidden"
                    disabled={isFormDisabled || isGracePeriod}
                  />
                  <div className="flex-grow px-3 py-2 text-sm text-gray-900 bg-white flex items-center truncate">
                    {formData.internal_supporting_document_file ? formData.internal_supporting_document_file.name : 'No file chosen'}
                  </div>
                </div>
                <p className="mt-1 text-sm text-gray-500">Upload a PDF supporting document, if applicable.</p>
              </div>
              <div className="md:col-span-2 mb-2">
                <label htmlFor="notes" className={labelClassNames}>Notes</label>
                <textarea
                  name="notes"
                  id="notes"
                  value={formData.notes}
                  onChange={handleChange}
                  maxLength="1024"
                  rows="3"
                  className={inputClassNames}
                  disabled={isFormDisabled || isGracePeriod}
                ></textarea>
              </div>
            </div>
          )}
        </div>

        {/* Form Actions */}
        <div className="flex justify-end space-x-4">
          <button
            type="button"
            onClick={handleClearForm}
            className={`inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${isFormDisabled || isGracePeriod ? 'opacity-50 cursor-not-allowed' : ''}`}
            disabled={isFormDisabled || isGracePeriod}
          >
            <XCircle className="h-5 w-5 mr-2" />
            Clear Form
          </button>
          <GracePeriodTooltip isGracePeriod={isGracePeriod}>
            <button
              type="submit"
              disabled={isSaving || isFormDisabled || isGracePeriod}
              className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200 ease-in-out ${isSaving || isFormDisabled || isGracePeriod ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {isSaving ? (
                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
              ) : (
                <Save className="h-5 w-5 mr-2" />
              )}
              {isSaving ? 'Saving...' : 'Save LG Record'}
            </button>
          </GracePeriodTooltip>
        </div>
      </form>
    </div>
  );
}

export default RecordNewLGPage;