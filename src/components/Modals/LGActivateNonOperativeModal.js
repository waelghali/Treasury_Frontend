// frontend/src/components/Modals/LGActivateNonOperativeModal.js
import React, { useState, useEffect, Fragment } from 'react';
import { Dialog, DialogPanel, DialogTitle, Transition, TransitionChild } from '@headlessui/react';
import { X, Check, Loader2, AlertCircle, FileText } from 'lucide-react'; // ADDED FileText
import { toast } from 'react-toastify';
import moment from 'moment';
import { apiRequest } from '../../services/apiService';

const buttonBaseClassNames = "inline-flex items-center px-4 py-2 text-sm font-medium rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors duration-200";

const LGActivateNonOperativeModal = ({ lgRecord, onClose, onSuccess }) => {
    const [isProcessing, setIsProcessing] = useState(false);
    const [isLoadingData, setIsLoadingData] = useState(true);
    const [paymentDetails, setPaymentDetails] = useState({
        payment_method: '',
        amount: '',
        currency_id: '',
        issuing_bank_id: '',
        payment_reference: '',
        payment_date: moment().format('YYYY-MM-DD'),
    });
    // NEW: State for the optional supporting document file
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

    // NEW: Handler for file input change
    const handleFileChange = (e) => {
        const file = e.target.files[0];
        setSupportingDocument(file);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setIsProcessing(true);

        // Frontend validation
        const requiredFields = ['amount', 'payment_method', 'payment_date', 'currency_id', 'issuing_bank_id'];
        const missingFields = requiredFields.filter(field => !paymentDetails[field]);
        if (missingFields.length > 0) {
            setError(`Please fill in all required fields. Missing: ${missingFields.join(', ')}`);
            setIsProcessing(false);
            return;
        }

        try {
            // FIX: Use FormData to send file and form data together
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
            onSuccess(response.lg_record, response.latest_instruction_id);
            toast.success("LG successfully activated!");
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
            <Dialog as="div" className="relative z-10" onClose={onClose}>
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
                            <DialogPanel className="relative transform overflow-hidden rounded-lg bg-white px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-xl sm:p-6">
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
                                            Activate LG Record: {lgRecord.lg_number}
                                        </DialogTitle>
                                        {isLoadingData ? (
                                            <div className="flex justify-center items-center py-8">
                                                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                                                <span className="ml-2 text-gray-600">Loading data...</span>
                                            </div>
                                        ) : (
                                            <div className="mt-2">
                                                {error && (
                                                    <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-md mb-4 flex items-center">
                                                        <AlertCircle className="mr-2" size={20} />
                                                        {error}
                                                    </div>
                                                )}
                                                <form onSubmit={handleSubmit} className="space-y-4">
                                                    <div>
                                                        <h4 className="font-semibold text-gray-800">LG Details</h4>
                                                        <p className="text-sm text-gray-500">
                                                            <strong>Type:</strong> {lgRecord.lg_type?.name} |
                                                            <strong> Status:</strong> {lgRecord.lg_operational_status?.name}
                                                        </p>
                                                    </div>

                                                    <div>
                                                        <h4 className="font-semibold text-gray-800">Payment Information</h4>
                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                                                            <div>
                                                                <label htmlFor="amount" className="block text-sm font-medium text-gray-700">Payment Amount*</label>
                                                                <input
                                                                    type="number"
                                                                    step="0.01"
                                                                    name="amount"
                                                                    id="amount"
                                                                    value={paymentDetails.amount}
                                                                    onChange={handleInputChange}
                                                                    required
                                                                    className="mt-1 block w-full rounded-md border border-gray-300 shadow-sm sm:text-sm p-2"
                                                                />
                                                            </div>
                                                            <div>
                                                                <label htmlFor="currency_id" className="block text-sm font-medium text-gray-700">Currency*</label>
                                                                <select
                                                                    name="currency_id"
                                                                    id="currency_id"
                                                                    value={paymentDetails.currency_id}
                                                                    onChange={handleSelectChange}
                                                                    required
                                                                    className="mt-1 block w-full rounded-md border border-gray-300 shadow-sm sm:text-sm p-2"
                                                                >
                                                                    <option value="">Select Currency</option>
                                                                    {dropdownData.currencies.map(currency => (
                                                                        <option key={currency.id} value={currency.id}>{currency.iso_code}</option>
                                                                    ))}
                                                                </select>
                                                            </div>
                                                            <div>
                                                                <label htmlFor="issuing_bank_id" className="block text-sm font-medium text-gray-700">Issuing Bank*</label>
                                                                <select
                                                                    name="issuing_bank_id"
                                                                    id="issuing_bank_id"
                                                                    value={paymentDetails.issuing_bank_id}
                                                                    onChange={handleSelectChange}
                                                                    required
                                                                    className="mt-1 block w-full rounded-md border border-gray-300 shadow-sm sm:text-sm p-2"
                                                                >
                                                                    <option value="">Select Bank</option>
                                                                    {dropdownData.banks.map(bank => (
                                                                        <option key={bank.id} value={bank.id}>{bank.name}</option>
                                                                    ))}
                                                                </select>
                                                            </div>
                                                            <div>
                                                                <label htmlFor="payment_method" className="block text-sm font-medium text-gray-700">Payment Method*</label>
                                                                <input
                                                                    type="text"
                                                                    name="payment_method"
                                                                    id="payment_method"
                                                                    value={paymentDetails.payment_method}
                                                                    onChange={handleInputChange}
                                                                    required
                                                                    className="mt-1 block w-full rounded-md border border-gray-300 shadow-sm sm:text-sm p-2"
                                                                />
                                                            </div>
                                                            <div>
                                                                <label htmlFor="payment_date" className="block text-sm font-medium text-gray-700">Payment Date*</label>
                                                                <input
                                                                    type="date"
                                                                    name="payment_date"
                                                                    id="payment_date"
                                                                    value={paymentDetails.payment_date}
                                                                    onChange={handleInputChange}
                                                                    required
                                                                    className="mt-1 block w-full rounded-md border border-gray-300 shadow-sm sm:text-sm p-2"
                                                                />
                                                            </div>
                                                            <div className="md:col-span-2">
                                                                <label htmlFor="payment_reference" className="block text-sm font-medium text-gray-700">Payment Reference</label>
                                                                <input
                                                                    type="text"
                                                                    name="payment_reference"
                                                                    id="payment_reference"
                                                                    value={paymentDetails.payment_reference}
                                                                    onChange={handleInputChange}
                                                                    className="mt-1 block w-full rounded-md border border-gray-300 shadow-sm sm:text-sm p-2"
                                                                />
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* NEW: Optional supporting document upload */}
                                                    <div className="border-t pt-4">
                                                        <label htmlFor="supporting-document-file" className="block text-sm font-medium text-gray-700">
                                                            Optional Supporting Document
                                                        </label>
                                                        <div className="mt-1 flex items-center">
                                                            <input
                                                                id="supporting-document-file"
                                                                name="internal_supporting_document_file"
                                                                type="file"
                                                                onChange={handleFileChange}
                                                                accept=".pdf,image/*"
                                                                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                                                                disabled={isProcessing}
                                                            />
                                                            {supportingDocument && (
                                                                <span className="ml-3 text-sm text-gray-500">
                                                                    <FileText className="inline-block h-4 w-4 mr-1" />
                                                                    {supportingDocument.name}
                                                                </span>
                                                            )}
                                                        </div>
                                                        <p className="mt-2 text-sm text-gray-500">Attach any documents related to this request (e.g., proof of advance payment).</p>
                                                    </div>

                                                    <div className="mt-5 sm:mt-6 sm:grid sm:grid-flow-row-dense sm:grid-cols-2 sm:gap-3">
                                                        <button
                                                            type="submit"
                                                            className={classNames(
                                                                buttonBaseClassNames,
                                                                "sm:col-start-2 bg-teal-600 text-white hover:bg-teal-700",
                                                                !isFormValid ? "opacity-50 cursor-not-allowed" : ""
                                                            )}
                                                            disabled={!isFormValid || isProcessing}
                                                        >
                                                            {isProcessing ? <Loader2 className="h-5 w-5 mr-2 animate-spin" /> : <Check className="h-5 w-5 mr-2" />}
                                                            {isProcessing ? 'Activating...' : 'Activate LG'}
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
                                        )}
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

export default LGActivateNonOperativeModal;