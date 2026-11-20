// frontend/src/components/Modals/LGAmendModal.js
import React, { useState, Fragment, useEffect } from 'react';
import { Dialog, DialogPanel, DialogTitle, Transition, TransitionChild } from '@headlessui/react';
import { X, Save, Upload, FileText, AlertCircle, Loader2 } from 'lucide-react';
import { toast } from 'react-toastify';
import moment from 'moment';
import { apiRequest } from '../../services/apiService';
import FormattedDateInput from 'components/FormattedDateInput';
import AmountInWordsHint from '../Common/AmountInWordsHint';

const buttonBaseClassNames = "inline-flex items-center px-4 py-2 text-sm font-semibold rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors duration-200";

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
                <label htmlFor={name} className="block text-xs sm:text-sm font-medium text-slate-700 mb-1">
                    {label}
                </label>
                {type === 'checkbox' ? (
                    <div className="mt-1.5">
                        <input
                            id={name}
                            name={name}
                            type="checkbox"
                            checked={hasAmendedProperty ? amendmentDetails[name] : lgRecord[name]}
                            onChange={handleInputChange}
                            disabled={readOnly || isLoadingAI}
                            className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-slate-300 rounded"
                            {...extraProps}
                        />
                    </div>
                ) : type === 'date' ? (
                    <FormattedDateInput
                        name={name}
                        id={name}
                        value={inputValue}
                        onChange={handleInputChange}
                        readOnly={readOnly || isLoadingAI}
                        disabled={readOnly || isLoadingAI}
                        className={classNames(
                            "mt-1 block w-full rounded-xl shadow-sm text-sm px-3 py-2",
                            "border border-slate-300 focus:outline-none focus:ring-2",
                            (readOnly || isLoadingAI) ? "bg-slate-100 text-slate-500" : "focus:border-indigo-500 focus:ring-indigo-500",
                            hasBeenChanged ? "bg-amber-50 border-amber-400" : "bg-white"
                        )}
                        {...extraProps}
                    />
                ) : (
                    <>
                    <input
                        type={type}
                        name={name}
                        id={name}
                        value={inputValue}
                        onChange={handleInputChange}
                        readOnly={readOnly || isLoadingAI}
                        className={classNames(
                            "mt-1 block w-full rounded-xl shadow-sm text-sm px-3 py-2",
                            "border border-slate-300 focus:outline-none focus:ring-2",
                            (readOnly || isLoadingAI) ? "bg-slate-100 text-slate-500" : "focus:border-indigo-500 focus:ring-indigo-500",
                            hasBeenChanged ? "bg-amber-50 border-amber-400" : "bg-white"
                        )}
                        {...extraProps}
                    />
                    {name === 'lg_amount' && (
                        <AmountInWordsHint
                            amount={inputValue}
                            currencyCode={lgRecord?.lg_currency?.iso_code || ''}
                        />
                    )}
                </>
                )}
                {hasBeenChanged && (
                    <span className="absolute top-0 right-0 mt-0.5 mr-0.5 px-2 py-0.5 text-[11px] font-semibold text-amber-800 bg-amber-100 border border-amber-200 rounded-full">
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
                    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" />
                </TransitionChild>

                <div className="fixed inset-0 z-10 w-screen overflow-y-auto">
                    <div className="flex min-h-full items-center justify-center p-3 text-center sm:p-4">
                        <TransitionChild
                            as={Fragment}
                            enter="ease-out duration-300"
                            enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
                            enterTo="opacity-100 translate-y-0 sm:scale-100"
                            leave="ease-in duration-200"
                            leaveFrom="opacity-100"
                            leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
                        >
                            <DialogPanel className="relative transform overflow-hidden rounded-2xl bg-white border border-slate-200/80 text-left shadow-2xl transition-all my-auto w-full max-w-2xl flex flex-col max-h-[90vh]">
                                {/* Sticky Header */}
                                <div className="px-5 py-3.5 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between gap-3 shrink-0">
                                    <div className="flex items-center gap-2.5 min-w-0">
                                        <div className="p-2 rounded-xl bg-amber-50 text-amber-600 border border-amber-100 shrink-0">
                                            <FileText className="h-4 w-4" />
                                        </div>
                                        <DialogTitle as="h3" className="text-base sm:text-lg font-bold leading-6 text-slate-900 tracking-tight truncate">
                                            Amend LG Record: {lgRecord.lg_number}
                                        </DialogTitle>
                                    </div>
                                    <button
                                        type="button"
                                        className="rounded-lg p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-300 shrink-0"
                                        onClick={onClose}
                                    >
                                        <span className="sr-only">Close</span>
                                        <X className="h-5 w-5" aria-hidden="true" />
                                    </button>
                                </div>

                                <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
                                    <div className="px-5 py-4 space-y-3.5 overflow-y-auto flex-1">
                                        {error && (
                                            <div className="bg-rose-50 border border-rose-200 text-rose-700 px-3.5 py-2.5 rounded-xl flex items-center text-xs sm:text-sm">
                                                <AlertCircle className="mr-2 h-4 w-4 shrink-0" />
                                                {error}
                                            </div>
                                        )}
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                                            {getField('lg_number', 'LG Number', 'text', true)}
                                            <div className="relative">
                                              <label htmlFor="beneficiary_name" className="block text-xs sm:text-sm font-medium text-slate-700 mb-1">Beneficiary</label>
                                              <input type="text" name="beneficiary_name" id="beneficiary_name" value={lgRecord.beneficiary_corporate?.entity_name || 'N/A'} readOnly className="mt-1 block w-full rounded-xl shadow-sm text-sm px-3 py-2 border border-slate-300 bg-slate-100 text-slate-500" />
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
                                        <div className="border-t border-slate-200 pt-3">
                                            <label htmlFor="reason" className="block text-xs sm:text-sm font-medium text-slate-700 mb-1">
                                                Reason for Amendment <span className="text-rose-500">*</span>
                                            </label>
                                            <textarea
                                                id="reason"
                                                name="reason"
                                                rows={2}
                                                value={reason}
                                                onChange={(e) => setReason(e.target.value)}
                                                required
                                                className="mt-1 block w-full px-3 py-2 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                            />
                                        </div>
                                        <div className="border-t border-slate-200 pt-3">
                                            <label htmlFor="amendment-file" className="block text-xs sm:text-sm font-medium text-slate-700 mb-1">
                                                Amendment Letter from Bank <span className="text-rose-500">*</span>
                                            </label>
                                            <div className="mt-1 flex flex-col sm:flex-row sm:items-center gap-2">
                                                <input
                                                    id="amendment-file"
                                                    name="amendment_letter_file"
                                                    type="file"
                                                    onChange={handleFileChange}
                                                    accept=".pdf,image/*"
                                                    required
                                                    className="block w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                                                />
                                                {isLoadingAI && (
                                                    <div className="flex items-center text-xs text-indigo-600 shrink-0">
                                                        <Loader2 className="h-4 w-4 animate-spin mr-1 text-indigo-600" />
                                                        Analyzing...
                                                    </div>
                                                )}
                                                {amendmentFile && (
                                                    <span className="text-xs text-slate-500 truncate">
                                                        <FileText className="inline-block h-3.5 w-3.5 mr-1" />
                                                        {amendmentFile.name}
                                                    </span>
                                                )}
                                            </div>
                                            {aiMessage && (
                                                <p className="mt-1 text-xs text-indigo-600">{aiMessage}</p>
                                            )}
                                            {(!amendmentFile) && <p className="mt-1 text-xs text-slate-500">A scanned copy of the bank's amendment letter is mandatory.</p>}
                                        </div>
                                    </div>

                                    {/* Sticky Footer */}
                                    <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex flex-col-reverse sm:flex-row sm:justify-end gap-2.5 shrink-0">
                                        <button
                                            type="button"
                                            className={classNames(
                                                buttonBaseClassNames,
                                                "justify-center w-full sm:w-auto rounded-xl text-slate-700 bg-white border border-slate-300 hover:bg-slate-50"
                                            )}
                                            onClick={onClose}
                                            disabled={isProcessing}
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="submit"
                                            className={classNames(
                                                buttonBaseClassNames,
                                                "justify-center w-full sm:w-auto rounded-xl bg-amber-600 text-white hover:bg-amber-700",
                                                !hasChanges || !amendmentFile || !reason || !isAmendable ? "opacity-50 cursor-not-allowed" : ""
                                            )}
                                            disabled={isProcessing || !amendmentFile || !reason}
                                        >
                                            {isProcessing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                                            {isProcessing ? 'Amending...' : 'Submit Amendment'}
                                        </button>
                                    </div>
                                </form>
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