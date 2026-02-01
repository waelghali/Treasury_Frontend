// frontend/src/components/Modals/LGAmendModal.js
import React, { useState, Fragment, useEffect } from 'react';
import { Dialog, DialogPanel, DialogTitle, Transition, TransitionChild } from '@headlessui/react';
import { X, Save, Upload, FileText, AlertCircle, Loader2 } from 'lucide-react';
import { toast } from 'react-toastify';
import moment from 'moment';
import { apiRequest } from '../../services/apiService';

const buttonBaseClassNames = "inline-flex items-center px-4 py-2 text-sm font-medium rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors duration-200";

const LGAmendModal = ({ lgRecord, onClose, onSuccess }) => {
    const [isProcessing, setIsProcessing] = useState(false);
    const [amendmentDetails, setAmendmentDetails] = useState({});
    const [amendmentFile, setAmendmentFile] = useState(null);
    const [reason, setReason] = useState('');
    const [error, setError] = useState('');
    const [isLoadingAI, setIsLoadingAI] = useState(false);
    const [aiMessage, setAiMessage] = useState('');
    const [currencies, setCurrencies] = useState([]);

    // Fetch currencies on component mount
    useEffect(() => {
        const fetchCurrencies = async () => {
            try {
                const response = await apiRequest('/end-user/currencies');
                setCurrencies(response);
            } catch (err) {
                console.error("Failed to fetch currencies:", err);
                toast.error("Failed to load currency options.");
            }
        };
        fetchCurrencies();
    }, []);

    const hasChanges = Object.keys(amendmentDetails).length > 0 || amendmentFile || reason;

    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        let newValue = value;

        if (type === 'checkbox') {
            newValue = checked;
        }

        setAmendmentDetails(prev => ({
            ...prev,
            [name]: newValue,
        }));
    };

    const handleFileChange = async (e) => {
        const file = e.target.files[0];
        if (file) {
            setAmendmentFile(file);
            setError('');
            setAiMessage('');
            
            setIsLoadingAI(true);
            const formData = new FormData();
            formData.append('amendment_letter_file', file);
            formData.append('lg_record_id', lgRecord.id); 

            try {
                const response = await apiRequest(`/end-user/lg-records/${lgRecord.id}/amend/scan-file`, 'POST', formData);
                
                if (response.ai_suggested_details) {
                    // FIX: Map the AI response keys to the component's state keys and lookup currency ID
                    const mappedDetails = {};
                    for (const key in response.ai_suggested_details) {
                        const mappedKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
                        let value = response.ai_suggested_details[key];

                        if (mappedKey === 'currency') {
                            const currency = currencies.find(c => c.iso_code === value);
                            if (currency) {
                                mappedDetails.lg_currency_id = currency.id;
                            } else {
                                toast.warn(`AI suggested currency '${value}' not found in system.`);
                            }
                        } else {
                            mappedDetails[mappedKey] = value;
                        }
                    }

                    setAmendmentDetails(mappedDetails);
                    setAiMessage('AI successfully extracted amendment details. Please review and confirm before submitting.');
                    toast.success('AI extraction complete!');
                } else if (response.message) {
                    setAiMessage(response.message);
                    toast.info(response.message);
                } else {
                    setAiMessage('AI analysis is complete. Please fill in the details manually.');
                    toast.info('AI analysis is complete, but no data was extracted.');
                }
            } catch (err) {
                console.error("AI scan failed:", err);
                const errorMessage = err.message || 'An unexpected error occurred.';
                setError(`AI scan failed. ${errorMessage}`);
                setAiMessage('AI analysis failed. Please fill in the details manually.');
                toast.error(`AI analysis failed. ${errorMessage}`);
            } finally {
                setIsLoadingAI(false);
            }
        }
    };
    
    const hasFieldChanged = (name) => {
      const currentValueInState = amendmentDetails[name];
      const originalValue = lgRecord[name];

      if (!amendmentDetails.hasOwnProperty(name)) {
        return false;
      }
      
      if (name.includes('date') && typeof originalValue === 'string') {
        const originalDate = moment(originalValue).format('YYYY-MM-DD');
        const amendedDate = moment(currentValueInState).format('YYYY-MM-DD');
        if (!amendedDate && originalDate) return true;
        if (amendedDate === originalDate) return false;
        return true;
      }

      if (typeof originalValue === 'number' || originalValue instanceof Number) {
          const originalNum = parseFloat(originalValue);
          const amendedNum = parseFloat(currentValueInState);
          return !isNaN(amendedNum) && originalNum !== amendedNum;
      }

      return currentValueInState !== originalValue;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (!amendmentFile) {
            setError("An amendment letter from the bank is required.");
            toast.error("Please upload an amendment letter.");
            return;
        }

        setIsProcessing(true);

        const formData = new FormData();
        
        const payloadDetails = {};
        for (const [key, value] of Object.entries(amendmentDetails)) {
            if (value !== undefined && value !== null) {
                payloadDetails[key] = value;
            }
        }
        
        // FIX: Ensure the correct field name is used for the payload
        if (payloadDetails.lg_currency_id) {
            payloadDetails.lg_currency_id = payloadDetails.lg_currency_id;
            delete payloadDetails.lg_currency; // Remove the non-ID field
        }

        formData.append('amendment_details', JSON.stringify(payloadDetails));
        formData.append('reason', reason);
        formData.append('amendment_letter_file', amendmentFile);

        try {
            const response = await apiRequest(`/end-user/lg-records/${lgRecord.id}/amend`, 'POST', formData);
            
            // --- FIX START: Implement conditional toasts based on approval status ---
            if (response.approval_request_id) {
                // Scenario 1: Request requires approval
                toast.info(`LG Amendment request submitted for approval. Request ID: ${response.approval_request_id}.`);
            } else {
                // Scenario 2: Direct amendment or approval not required
                // We rely on the parent component's onSuccess to show the final success toast (Fix for the duplicate toast).
            }

            // Call parent success handler and close the modal
            onSuccess(response.lg_record, response.latest_instruction_id);
            onClose();
            // --- FIX END ---
            
        } catch (err) {
            console.error("Failed to amend LG:", err);
            const errorMessage = err.message || 'An unexpected error occurred.';
            setError(`Failed to amend LG. ${errorMessage}`);
            toast.error(`Failed to amend LG. ${errorMessage}`);
        } finally {
            setIsProcessing(false);
        }
    };

    const getField = (name, label, type = 'text', readOnly = false, extraProps = {}) => {
        const hasAmendedProperty = amendmentDetails.hasOwnProperty(name);
        const inputValue = hasAmendedProperty
            ? (type === 'date' ? moment(amendmentDetails[name]).format('YYYY-MM-DD') : amendmentDetails[name] || '')
            : (type === 'date' ? moment(lgRecord[name]).format('YYYY-MM-DD') : lgRecord[name] || '');

        const hasBeenChanged = hasFieldChanged(name);

        return (
            <div key={name} className="relative">
                <label htmlFor={name} className="block text-sm font-medium text-gray-700">
                    {label}
                </label>
                {type === 'checkbox' ? (
                    <div className="mt-1">
                        <input
                            id={name}
                            name={name}
                            type="checkbox"
                            checked={hasAmendedProperty ? amendmentDetails[name] : lgRecord[name]}
                            onChange={handleInputChange}
                            disabled={readOnly || isLoadingAI}
                            className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                            {...extraProps}
                        />
                    </div>
                ) : (
                    <input
                        type={type}
                        name={name}
                        id={name}
                        value={inputValue}
                        onChange={handleInputChange}
                        readOnly={readOnly || isLoadingAI}
                        className={classNames(
                            "mt-1 block w-full rounded-md shadow-sm sm:text-sm p-2",
                            "border border-gray-300",
                            (readOnly || isLoadingAI) ? "bg-gray-100 text-gray-500" : "focus:border-indigo-500 focus:ring-indigo-500",
                            hasBeenChanged ? "bg-yellow-50 border-yellow-400" : "bg-white"
                        )}
                        {...extraProps}
                    />
                )}
                {hasBeenChanged && (
                    <span className="absolute top-0 right-0 mt-1 mr-1 px-2 py-1 text-xs font-medium text-yellow-800 bg-yellow-200 rounded-full">
                        Amended
                    </span>
                )}
            </div>
        );
    };

    const isLgExpired = moment(lgRecord.expiry_date).isBefore(moment(), 'day');
    const isWithinGracePeriod = moment().diff(moment(lgRecord.expiry_date), 'days') <= 30;
    const isAmendable = !isLgExpired || (isLgExpired && isWithinGracePeriod);

    return (
        <Transition show={true} as={Fragment}>
            <Dialog as="div" className="relative z-[100]" onClose={onClose}>
                <TransitionChild
                    as={Fragment}
                    enter="ease-out duration-300"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="ease-in duration-200"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                >
                    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
                </TransitionChild>

                <div className="fixed inset-0 z-10 w-screen overflow-y-auto">
                    <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
                        <TransitionChild
                            as={Fragment}
                            enter="ease-out duration-300"
                            enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
                            enterTo="opacity-100 translate-y-0 sm:scale-100"
                            leave="ease-in duration-200"
                            leaveFrom="opacity-100"
                            leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
                        >
                            <DialogPanel className="relative transform overflow-hidden rounded-lg bg-white px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-3xl sm:p-6">
                                <div className="absolute right-0 top-0 hidden pr-4 pt-4 sm:block">
                                    <button
                                        type="button"
                                        className="rounded-md bg-white text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                                        onClick={onClose}
                                    >
                                        <span className="sr-only">Close</span>
                                        <X className="h-6 w-6" aria-hidden="true" />
                                    </button>
                                </div>
                                <div className="sm:flex sm:items-start">
                                    <div className="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left w-full">
                                        <DialogTitle as="h3" className="text-xl font-semibold leading-6 text-gray-900 border-b pb-3 mb-3">
                                            Amend LG Record: {lgRecord.lg_number}
                                        </DialogTitle>
                                        <div className="mt-2">
                                            {error && (
                                                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-md mb-4 flex items-center">
                                                    <AlertCircle className="mr-2" size={20} />
                                                    {error}
                                                </div>
                                            )}
                                            <form onSubmit={handleSubmit} className="space-y-4">
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    {getField('lg_number', 'LG Number', 'text', true)}
                                                    <div className="relative">
                                                      <label htmlFor="beneficiary_name" className="block text-sm font-medium text-gray-700">Beneficiary</label>
                                                      <input type="text" name="beneficiary_name" id="beneficiary_name" value={lgRecord.beneficiary_corporate?.entity_name || 'N/A'} readOnly className="mt-1 block w-full rounded-md shadow-sm sm:text-sm p-2 border border-gray-300 bg-gray-100 text-gray-500" />
                                                    </div>
                                                    {getField('issuance_date', 'Issuance Date', 'date')}
                                                    {getField('expiry_date', 'Expiry Date', 'date')}
                                                    {getField('lg_amount', 'LG Amount', 'number', false, {step: "0.01"})}
                                                    {getField('auto_renewal', 'Auto-Renewal', 'checkbox')}
                                                    {getField('payment_conditions', 'Payment Conditions')}
                                                    {getField('description_purpose', 'Purpose')}
                                                    {getField('other_conditions', 'Other Conditions')}
                                                    {getField('notes', 'Notes', 'textarea')}
                                                </div>
                                                <div className="border-t pt-4">
                                                    <label htmlFor="reason" className="block text-sm font-medium text-gray-700">
                                                        Reason for Amendment <span className="text-red-500">*</span>
                                                    </label>
                                                    <textarea
                                                        id="reason"
                                                        name="reason"
                                                        rows={1}
                                                        value={reason}
                                                        onChange={(e) => setReason(e.target.value)}
                                                        required
														className={`mt-1 block w-full px-3 py-2 rounded-md border border-gray-300 : 'border-gray-300'}`}
                                                    />
                                                </div>
                                                <div className="border-t pt-4">
                                                    <label htmlFor="amendment-file" className="block text-sm font-medium text-gray-700">
                                                        Amendment Letter from Bank <span className="text-red-500">*</span>
                                                    </label>
                                                    <div className="mt-1 flex items-center">
                                                        <input
                                                            id="amendment-file"
                                                            name="amendment_letter_file"
                                                            type="file"
                                                            onChange={handleFileChange}
                                                            accept=".pdf,image/*"
                                                            required
                                                            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                                                        />
                                                        {isLoadingAI && (
                                                            <Loader2 className="h-5 w-5 animate-spin ml-3 text-blue-500" />
                                                        )}
                                                        {amendmentFile && (
                                                            <span className="ml-3 text-sm text-gray-500">
                                                                <FileText className="inline-block h-4 w-4 mr-1" />
                                                                {amendmentFile.name}
                                                            </span>
                                                        )}
                                                    </div>
                                                    {aiMessage && (
                                                        <p className="mt-2 text-sm text-blue-600">{aiMessage}</p>
                                                    )}
                                                    {(!amendmentFile) && <p className="mt-2 text-sm text-gray-500">A scanned copy of the bank's amendment letter is mandatory.</p>}
                                                </div>

                                                <div className="mt-5 sm:mt-6 sm:grid sm:grid-flow-row-dense sm:grid-cols-2 sm:gap-3">
                                                    <button
                                                        type="submit"
                                                        className={classNames(
                                                            buttonBaseClassNames,
                                                            "sm:col-start-2 bg-yellow-600 text-white hover:bg-yellow-700",
                                                            !hasChanges || !amendmentFile || !reason || !isAmendable ? "opacity-50 cursor-not-allowed" : ""
                                                        )}
                                                        disabled={isProcessing || !amendmentFile || !reason}
                                                    >
                                                        {isProcessing ? <Loader2 className="h-5 w-5 mr-2 animate-spin" /> : <Save className="h-5 w-5 mr-2" />}
                                                        {isProcessing ? 'Amending...' : 'Submit Amendment'}
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className={classNames(
                                                            buttonBaseClassNames,
                                                            "sm:col-start-1 text-gray-700 bg-gray-200 hover:bg-gray-300"
                                                        )}
                                                        onClick={onClose}
                                                        disabled={isProcessing}
                                                    >
                                                        Cancel
                                                    </button>
                                                </div>
                                            </form>
                                        </div>
                                    </div>
                                </div>
                            </DialogPanel>
                        </TransitionChild>
                    </div>
                </div>
            </Dialog>
        </Transition>
    );
};

function classNames(...classes) {
    return classes.filter(Boolean).join(' ');
}

export default LGAmendModal;