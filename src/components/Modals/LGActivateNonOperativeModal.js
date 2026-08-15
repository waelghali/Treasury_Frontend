// frontend/src/components/Modals/LGActivateNonOperativeModal.js
import React, { useState, useEffect, Fragment } from 'react';
import { Dialog, DialogPanel, DialogTitle, Transition, TransitionChild } from '@headlessui/react';
import { X, Check, Loader2, AlertCircle, FileText } from 'lucide-react';
import { toast } from 'react-toastify';
import moment from 'moment';
import { apiRequest } from '../../services/apiService';

const buttonBaseClassNames = "inline-flex items-center px-4 py-2 text-sm font-medium rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors duration-200";

const LGActivateNonOperativeModal = ({ lgRecord, onClose, onSuccess, isGracePeriod }) => {
    const [isProcessing, setIsProcessing] = useState(false);
    const [isLoadingData, setIsLoadingData] = useState(true);
    const [paymentDetails, setPaymentDetails] = useState({
        payment_method: '',
        amount: '',
        currency_id: '',
        issuing_bank_id: '',
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
        setIsProcessing(true);

        const requiredFields = ['amount', 'payment_method', 'payment_date', 'currency_id', 'issuing_bank_id'];
        const missingFields = requiredFields.filter(field => !paymentDetails[field]);
        if (missingFields.length > 0) {
            setError(`Please fill in all required fields. Missing: ${missingFields.join(', ')}`);
            setIsProcessing(false);
            return;
        }

        try {
            const formData = new FormData();
            for (const key in paymentDetails) {
                if (paymentDetails[key]) {
                    formData.append(key, paymentDetails[key]);
                }
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

    const isFormValid = paymentDetails.amount && paymentDetails.payment_method && paymentDetails.payment_date && paymentDetails.currency_id && paymentDetails.issuing_bank_id;

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
                    <div className="flex min-h-full items-center justify-center p-3 text-center sm:p-0">
                        <TransitionChild
                            as={Fragment}
                            enter="ease-out duration-300"
                            enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
                            enterTo="opacity-100 translate-y-0 sm:scale-100"
                            leave="ease-in duration-200"
                            leaveFrom="opacity-100"
                            leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
                        >
                            <DialogPanel className="relative transform overflow-hidden rounded-2xl bg-white text-left shadow-2xl transition-all my-auto sm:my-8 w-full max-w-xl mx-2 sm:mx-auto p-5 sm:p-6 max-h-[92vh] overflow-y-auto">
                                <div className="absolute right-3 top-3 sm:right-4 sm:top-4 z-10">
                                    <button
                                        type="button"
                                        className="rounded-full p-1 bg-gray-100 text-gray-500 hover:text-gray-700 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                        onClick={onClose}
                                    >
                                        <span className="sr-only">Close</span>
                                        <X className="h-5 w-5" aria-hidden="true" />
                                    </button>
                                </div>
                                <div className="w-full">
                                    <DialogTitle as="h3" className="text-lg font-bold leading-6 text-gray-900 tracking-tight border-b pb-3 mb-3 pr-8">
                                        Activate LG Record: {lgRecord.lg_number}
                                    </DialogTitle>
                                    {isLoadingData ? (
                                        <div className="flex justify-center items-center py-8">
                                            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                                            <span className="ml-2 text-sm text-gray-600">Loading data...</span>
                                        </div>
                                    ) : (
                                        <div className="mt-2">
                                            {error && (
                                                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-md mb-4 flex items-center text-xs sm:text-sm">
                                                    <AlertCircle className="mr-2 h-4 w-4 shrink-0" />
                                                    {error}
                                                </div>
                                            )}
                                            <form onSubmit={handleSubmit} className="space-y-4">
                                                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                                                    <h4 className="font-bold text-xs text-gray-700 uppercase tracking-wider mb-1">LG Details</h4>
                                                    <p className="text-xs text-gray-600">
                                                        <strong>Type:</strong> {lgRecord.lg_type?.name} |
                                                        <strong> Status:</strong> {lgRecord.lg_operational_status?.name}
                                                    </p>
                                                </div>

                                                <div>
                                                    <h4 className="font-bold text-xs text-gray-700 uppercase tracking-wider mb-2">Payment Information</h4>
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-1">
                                                        <div>
                                                            <label htmlFor="amount" className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Payment Amount*</label>
                                                            <input
                                                                type="number"
                                                                step="0.01"
                                                                name="amount"
                                                                id="amount"
                                                                value={paymentDetails.amount}
                                                                onChange={handleInputChange}
                                                                required
                                                                className="block w-full rounded-lg border border-gray-300 shadow-sm text-sm p-2"
                                                                disabled={isProcessing || isGracePeriod}
                                                            />
                                                        </div>
                                                        <div>
                                                            <label htmlFor="currency_id" className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Currency*</label>
                                                            <select
                                                                name="currency_id"
                                                                id="currency_id"
                                                                value={paymentDetails.currency_id}
                                                                onChange={handleSelectChange}
                                                                required
                                                                className="block w-full rounded-lg border border-gray-300 shadow-sm text-sm p-2"
                                                                disabled={isProcessing || isGracePeriod}
                                                            >
                                                                <option value="">Select Currency</option>
                                                                {dropdownData.currencies.map(currency => (
                                                                    <option key={currency.id} value={currency.id}>{currency.iso_code}</option>
                                                                ))}
                                                            </select>
                                                        </div>
                                                        <div>
                                                            <label htmlFor="issuing_bank_id" className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Issuing Bank*</label>
                                                            <select
                                                                name="issuing_bank_id"
                                                                id="issuing_bank_id"
                                                                value={paymentDetails.issuing_bank_id}
                                                                onChange={handleSelectChange}
                                                                required
                                                                className="block w-full rounded-lg border border-gray-300 shadow-sm text-sm p-2"
                                                                disabled={isProcessing || isGracePeriod}
                                                            >
                                                                <option value="">Select Bank</option>
                                                                {dropdownData.banks.map(bank => (
                                                                    <option key={bank.id} value={bank.id}>{bank.name}</option>
                                                                ))}
                                                            </select>
                                                        </div>
                                                        <div>
                                                            <label htmlFor="payment_method" className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Payment Method*</label>
                                                            <input
                                                                type="text"
                                                                name="payment_method"
                                                                id="payment_method"
                                                                value={paymentDetails.payment_method}
                                                                onChange={handleInputChange}
                                                                required
                                                                className="block w-full rounded-lg border border-gray-300 shadow-sm text-sm p-2"
                                                                disabled={isProcessing || isGracePeriod}
                                                            />
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="border-t pt-3">
                                                    <label htmlFor="supporting-document-file" className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                                                        Supporting Document
                                                    </label>
                                                    <div className="mt-1 flex flex-col sm:flex-row sm:items-center gap-2">
                                                        <input
                                                            id="supporting-document-file"
                                                            name="internal_supporting_document_file"
                                                            type="file"
                                                            onChange={handleFileChange}
                                                            accept=".pdf,image/*"
                                                            className="block w-full text-xs text-gray-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                                                            disabled={isProcessing || isGracePeriod}
                                                        />
                                                        {supportingDocument && (
                                                            <span className="text-xs text-gray-500 truncate">
                                                                <FileText className="inline-block h-3.5 w-3.5 mr-1" />
                                                                {supportingDocument.name}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="mt-1 text-xs text-gray-500">Attach any documents related to this request (e.g., proof of advance payment).</p>
                                                </div>

                                                <div className="mt-6 flex flex-col-reverse sm:flex-row sm:justify-end gap-2.5 sm:gap-3 pt-2 border-t border-gray-100">
                                                    <button
                                                        type="button"
                                                        className={classNames(
                                                            buttonBaseClassNames,
                                                            "justify-center w-full sm:w-auto text-gray-700 bg-gray-100 hover:bg-gray-200 py-2.5"
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
                                                            "justify-center w-full sm:w-auto bg-teal-600 text-white hover:bg-teal-700 py-2.5 font-bold shadow-md",
                                                            !isFormValid || isProcessing || isGracePeriod ? "opacity-50 cursor-not-allowed" : ""
                                                        )}
                                                        disabled={!isFormValid || isProcessing || isGracePeriod}
                                                    >
                                                        {isProcessing ? <Loader2 className="h-5 w-5 mr-2 animate-spin" /> : <Check className="h-5 w-5 mr-2" />}
                                                        {isProcessing ? 'Activating...' : 'Activate LG'}
                                                    </button>
                                                </div>
                                            </form>
                                        </div>
                                    )}
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

export default LGActivateNonOperativeModal;