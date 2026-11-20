// frontend/src/components/Modals/LGActivateNonOperativeModal.js
import React, { useState, useEffect, Fragment } from 'react';
import { Dialog, DialogPanel, DialogTitle, Transition, TransitionChild } from '@headlessui/react';
import { X, Check, Loader2, AlertCircle, FileText } from 'lucide-react';
import { toast } from 'react-toastify';
import moment from 'moment';
import { apiRequest } from '../../services/apiService';
import FormattedDateInput from 'components/FormattedDateInput';

const buttonBaseClassNames = "inline-flex items-center px-4 py-2 text-sm font-semibold rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors duration-200";

const LGActivateNonOperativeModal = ({ lgRecord, onClose, onSuccess, isGracePeriod }) => {
    const [isProcessing, setIsProcessing] = useState(false);
    const [isLoadingData, setIsLoadingData] = useState(true);
    const [paymentDetails, setPaymentDetails] = useState({
        payment_method: 'Wire Transfer',
        amount: lgRecord?.lg_amount ? String(parseFloat(lgRecord.lg_amount)) : '',
        currency_id: lgRecord?.lg_currency_id || lgRecord?.lg_currency?.id || '',
        issuing_bank_id: lgRecord?.issuing_bank_id || lgRecord?.issuing_bank?.id || '',
        payment_reference: '',
        payment_date: moment().format('YYYY-MM-DD'),
        notes: '',
    });
    const [supportingDocument, setSupportingDocument] = useState(null);
    const [dropdownData, setDropdownData] = useState({
        currencies: [],
        banks: [],
    });
    const [error, setError] = useState('');
    const [isDocMandatory, setIsDocMandatory] = useState(false);

    useEffect(() => {
        const fetchConfig = async () => {
            try {
                const res = await apiRequest('/end-user/customer-configurations/DOC_MANDATORY_ACTIVATE', 'GET');
                if (res && res.effective_value !== undefined) {
                    setIsDocMandatory(String(res.effective_value).toLowerCase() === 'true');
                }
            } catch (err) {
                console.warn('Could not fetch DOC_MANDATORY_ACTIVATE config, defaulting to optional.', err);
            }
        };
        fetchConfig();
    }, []);

    useEffect(() => {
        const fetchDropdownData = async () => {
            setIsLoadingData(true);
            try {
                const [currencies, banks] = await Promise.all([
                    apiRequest('/end-user/currencies/', 'GET'),
                    apiRequest('/end-user/banks/', 'GET'),
                ]);
                setDropdownData({ currencies, banks });
            } catch (err) {
                console.error('Failed to fetch dropdown data:', err);
                setError('Failed to load currency and bank data. Please try again.');
            } finally {
                setIsLoadingData(false);
            }
        };

        fetchDropdownData();
    }, []);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setPaymentDetails(prev => ({
            ...prev,
            [name]: value,
        }));
    };

    const handleSelectChange = (e) => {
        const { name, value } = e.target;
        setPaymentDetails(prev => ({
            ...prev,
            [name]: value === '' ? '' : parseInt(value, 10),
        }));
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        setSupportingDocument(file);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (isGracePeriod) {
            toast.warn("This action is disabled during your subscription's grace period.");
            return;
        }

        setError('');
        if (isDocMandatory && !supportingDocument) {
            setError('Supporting document is mandatory for LG Activation as per Corporate Admin settings.');
            toast.error('Supporting document is mandatory for LG Activation as per Corporate Admin settings.');
            return;
        }

        setIsProcessing(true);

        const requiredFields = ['amount', 'payment_method', 'payment_date', 'currency_id', 'issuing_bank_id', 'payment_reference'];
        const missingFields = requiredFields.filter(field => !paymentDetails[field] || String(paymentDetails[field]).trim() === '');
        if (missingFields.length > 0) {
            setError(`Please fill in all required fields. Missing: ${missingFields.join(', ')}`);
            setIsProcessing(false);
            return;
        }

        try {
            const formData = new FormData();
            for (const key in paymentDetails) {
                if (paymentDetails[key] !== undefined && paymentDetails[key] !== null && String(paymentDetails[key]).trim() !== '') {
                    formData.append(key, paymentDetails[key]);
                }
            }
            if (!formData.has('payment_reference')) {
                formData.append('payment_reference', 'N/A');
            }
            if (supportingDocument) {
                formData.append('internal_supporting_document_file', supportingDocument);
            }

            const response = await apiRequest(`/end-user/lg-records/${lgRecord.id}/activate-non-operative`, 'POST', formData);
            
            if (response.approval_request_id) {
                toast.info(`LG Activation request submitted for approval. Request ID: ${response.approval_request_id}.`);
                onSuccess(response.lg_record);
            } else {
                toast.success("LG successfully activated!");
                onSuccess(response.lg_record, response.latest_instruction_id);
            }
            onClose();

        } catch (err) {
            console.error("Failed to activate LG:", err);
            const errorMessage = err.detail || err.message || 'An unexpected error occurred.';
            setError(`Failed to activate LG. ${errorMessage}`);
            toast.error(`Failed to activate LG. ${errorMessage}`);
        } finally {
            setIsProcessing(false);
        }
    };

    const isFormValid = Boolean(
        paymentDetails.amount &&
        paymentDetails.payment_method &&
        paymentDetails.payment_date &&
        paymentDetails.currency_id &&
        paymentDetails.issuing_bank_id &&
        paymentDetails.payment_reference &&
        String(paymentDetails.payment_reference).trim() !== '' &&
        (!isDocMandatory || Boolean(supportingDocument))
    );

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
                            <DialogPanel className="relative transform overflow-hidden rounded-2xl bg-white border border-slate-200/80 text-left shadow-2xl transition-all my-auto w-full max-w-xl flex flex-col max-h-[90vh]">
                                {/* Sticky Header */}
                                <div className="px-5 py-3.5 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between gap-3 shrink-0">
                                    <div className="flex items-center gap-2.5 min-w-0">
                                        <div className="p-2 rounded-xl bg-teal-50 text-teal-600 border border-teal-100 shrink-0">
                                            <Check className="h-4 w-4" />
                                        </div>
                                        <DialogTitle as="h3" className="text-base sm:text-lg font-bold leading-6 text-slate-900 tracking-tight truncate">
                                            Activate LG Record: {lgRecord.lg_number}
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

                                {isLoadingData ? (
                                    <div className="flex justify-center items-center py-12 px-5">
                                        <Loader2 className="h-7 w-7 animate-spin text-indigo-600" />
                                        <span className="ml-2.5 text-sm font-medium text-slate-600">Loading data...</span>
                                    </div>
                                ) : (
                                    <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
                                        <div className="px-5 py-4 space-y-3.5 overflow-y-auto flex-1">
                                            {error && (
                                                <div className="bg-rose-50 border border-rose-200 text-rose-700 px-3.5 py-2.5 rounded-xl flex items-center text-xs sm:text-sm">
                                                    <AlertCircle className="mr-2 h-4 w-4 shrink-0" />
                                                    {error}
                                                </div>
                                            )}
                                            <div className="bg-slate-50/80 p-3 rounded-xl border border-slate-200/80">
                                                <h4 className="font-semibold text-xs text-slate-600 uppercase tracking-wider mb-1">LG Details</h4>
                                                <p className="text-xs text-slate-700">
                                                    <strong>Type:</strong> {lgRecord.lg_type?.name} |{' '}
                                                    <strong>Status:</strong> {lgRecord.lg_operational_status?.name}
                                                </p>
                                            </div>

                                            <div>
                                                <h4 className="font-semibold text-xs text-slate-600 uppercase tracking-wider mb-2">Payment Information</h4>
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-1">
                                                    <div>
                                                        <label htmlFor="amount" className="block text-xs sm:text-sm font-medium text-slate-700 mb-1">Payment Amount*</label>
                                                        <input
                                                            type="number"
                                                            step="0.01"
                                                            name="amount"
                                                            id="amount"
                                                            value={paymentDetails.amount}
                                                            onChange={handleInputChange}
                                                            required
                                                            className="block w-full rounded-xl border border-slate-300 shadow-sm text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                                            disabled={isProcessing || isGracePeriod}
                                                        />
                                                    </div>
                                                    <div>
                                                        <label htmlFor="currency_id" className="block text-xs sm:text-sm font-medium text-slate-700 mb-1">Currency*</label>
                                                        <select
                                                            name="currency_id"
                                                            id="currency_id"
                                                            value={paymentDetails.currency_id}
                                                            onChange={handleSelectChange}
                                                            required
                                                            className="block w-full rounded-xl border border-slate-300 bg-white shadow-sm text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                                            disabled={isProcessing || isGracePeriod}
                                                        >
                                                            <option value="">Select Currency</option>
                                                            {dropdownData.currencies.map(currency => (
                                                                <option key={currency.id} value={currency.id}>{currency.iso_code}</option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                    <div>
                                                        <label htmlFor="issuing_bank_id" className="block text-xs sm:text-sm font-medium text-slate-700 mb-1">Issuing Bank*</label>
                                                        <select
                                                            name="issuing_bank_id"
                                                            id="issuing_bank_id"
                                                            value={paymentDetails.issuing_bank_id}
                                                            onChange={handleSelectChange}
                                                            required
                                                            className="block w-full rounded-xl border border-slate-300 bg-white shadow-sm text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                                            disabled={isProcessing || isGracePeriod}
                                                        >
                                                            <option value="">Select Bank</option>
                                                            {dropdownData.banks.map(bank => (
                                                                <option key={bank.id} value={bank.id}>{bank.name}</option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                    <div>
                                                        <label htmlFor="payment_method" className="block text-xs sm:text-sm font-medium text-slate-700 mb-1">Payment Method*</label>
                                                        <input
                                                            type="text"
                                                            name="payment_method"
                                                            id="payment_method"
                                                            list="payment-method-options"
                                                            placeholder="e.g., Wire Transfer, Check"
                                                            value={paymentDetails.payment_method}
                                                            onChange={handleInputChange}
                                                            required
                                                            className="block w-full rounded-xl border border-slate-300 shadow-sm text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                                            disabled={isProcessing || isGracePeriod}
                                                        />
                                                        <datalist id="payment-method-options">
                                                            <option value="Wire Transfer" />
                                                            <option value="Check" />
                                                            <option value="Internal Account Transfer" />
                                                            <option value="SWIFT MT103" />
                                                        </datalist>
                                                    </div>
                                                    <div>
                                                        <label htmlFor="payment_reference" className="block text-xs sm:text-sm font-medium text-slate-700 mb-1">Payment Reference (Wire / Check #)*</label>
                                                        <input
                                                            type="text"
                                                            name="payment_reference"
                                                            id="payment_reference"
                                                            placeholder="e.g., WIRE-2026-99881"
                                                            maxLength={100}
                                                            value={paymentDetails.payment_reference}
                                                            onChange={handleInputChange}
                                                            required
                                                            className="block w-full rounded-xl border border-slate-300 shadow-sm text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                                            disabled={isProcessing || isGracePeriod}
                                                        />
                                                    </div>
                                                    <div>
                                                        <label htmlFor="payment_date" className="block text-xs sm:text-sm font-medium text-slate-700 mb-1">Payment Date*</label>
                                                        <FormattedDateInput
                                                            name="payment_date"
                                                            id="payment_date"
                                                            max={moment().format('YYYY-MM-DD')}
                                                            value={paymentDetails.payment_date}
                                                            onChange={handleInputChange}
                                                            required
                                                            className="block w-full rounded-xl border border-slate-300 shadow-sm text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                                            disabled={isProcessing || isGracePeriod}
                                                        />
                                                    </div>
                                                    <div className="sm:col-span-2">
                                                        <label htmlFor="notes" className="block text-xs sm:text-sm font-medium text-slate-700 mb-1">Additional Notes (Optional)</label>
                                                        <textarea
                                                            name="notes"
                                                            id="notes"
                                                            rows={2}
                                                            placeholder="Optional notes to include in the activation instruction..."
                                                            value={paymentDetails.notes}
                                                            onChange={handleInputChange}
                                                            className="block w-full rounded-xl border border-slate-300 shadow-sm text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                                            disabled={isProcessing || isGracePeriod}
                                                        />
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="border-t border-slate-200 pt-3">
                                                <label htmlFor="supporting-document-file" className="block text-xs sm:text-sm font-medium text-slate-700 mb-1">
                                                    Supporting Document {isDocMandatory ? <span className="text-rose-500">*</span> : '(Optional)'}
                                                </label>
                                                <div className="mt-1 flex flex-col sm:flex-row sm:items-center gap-2">
                                                    <input
                                                        id="supporting-document-file"
                                                        name="internal_supporting_document_file"
                                                        type="file"
                                                        onChange={handleFileChange}
                                                        accept=".pdf,image/*"
                                                        className="block w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                                                        disabled={isProcessing || isGracePeriod}
                                                    />
                                                    {supportingDocument && (
                                                        <span className="text-xs text-slate-500 truncate">
                                                            <FileText className="inline-block h-3.5 w-3.5 mr-1" />
                                                            {supportingDocument.name}
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="mt-1 text-xs text-slate-500">Attach any documents related to this request (e.g., proof of advance payment).</p>
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
                                                    "justify-center w-full sm:w-auto rounded-xl bg-teal-600 text-white hover:bg-teal-700",
                                                    !isFormValid || isProcessing || isGracePeriod ? "opacity-50 cursor-not-allowed" : ""
                                                )}
                                                disabled={!isFormValid || isProcessing || isGracePeriod}
                                            >
                                                {isProcessing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Check className="h-4 w-4 mr-2" />}
                                                {isProcessing ? 'Activating...' : 'Activate LG'}
                                            </button>
                                        </div>
                                    </form>
                                )}
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

export default LGActivateNonOperativeModal;