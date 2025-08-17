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
    const [error, setError] = useState('');

    const hasChanges = Object.keys(amendmentDetails).length > 0 || amendmentFile;

    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        let newValue = value;

        // Special handling for date and boolean types
        if (type === 'checkbox') {
            newValue = checked;
        }

        setAmendmentDetails(prev => ({
            ...prev,
            [name]: newValue,
        }));
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setAmendmentFile(file);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setIsProcessing(true);

        const formData = new FormData();
        formData.append('lg_record_id', lgRecord.id);
        
        // Append amendment details, converting to string where needed
        const payloadDetails = {};
        for (const [key, value] of Object.entries(amendmentDetails)) {
            if (value !== undefined && value !== null) {
                payloadDetails[key] = value;
            }
        }
        formData.append('amendment_details', JSON.stringify(payloadDetails));

        if (amendmentFile) {
            formData.append('amendment_letter_file', amendmentFile);
        }

        try {
            const response = await apiRequest(`/end-user/lg-records/${lgRecord.id}/amend`, 'POST', formData, true);
            onSuccess(response);
            toast.success("LG record amended successfully!");
            onClose();
        } catch (err) {
            console.error("Failed to amend LG:", err);
            setError(`Failed to amend LG. ${err.message || 'An unexpected error occurred.'}`);
            toast.error(`Failed to amend LG. ${err.message || 'An unexpected error occurred.'}`);
        } finally {
            setIsProcessing(false);
        }
    };

    const getField = (name, label, type = 'text', readOnly = false, extraProps = {}) => {
        const currentValue = lgRecord[name];
        const hasBeenChanged = name in amendmentDetails;

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
                            defaultChecked={currentValue}
                            onChange={handleInputChange}
                            disabled={readOnly}
                            className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                            {...extraProps}
                        />
                    </div>
                ) : (
                    <input
                        type={type}
                        name={name}
                        id={name}
                        defaultValue={type === 'date' ? moment(currentValue).format('YYYY-MM-DD') : currentValue || ''}
                        onChange={handleInputChange}
                        readOnly={readOnly}
                        className={classNames(
                            "mt-1 block w-full rounded-md shadow-sm sm:text-sm p-2",
                            // Add these two classes for the border to match CustomerOnboardingForm
                            "border border-gray-300",
                            readOnly ? "bg-gray-100 text-gray-500" : "focus:border-indigo-500 focus:ring-indigo-500",
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
                            leaveFrom="opacity-100 translate-y-0 sm:scale-100"
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
                                                    {getField('beneficiary_corporate.entity_name', 'Beneficiary', 'text', true)}
                                                    {getField('issuance_date', 'Issuance Date', 'date')}
                                                    {getField('expiry_date', 'Expiry Date', 'date')}
                                                    {getField('lg_amount', 'LG Amount')}
                                                    {getField('auto_renewal', 'Auto-Renewal', 'checkbox')}
                                                    {getField('payment_conditions', 'Payment Conditions')}
                                                    {getField('description_purpose', 'Purpose')}
                                                    {getField('other_conditions', 'Other Conditions')}
                                                    {getField('notes', 'Notes')}
                                                </div>

                                                <div className="border-t pt-4">
                                                    <label htmlFor="amendment-file" className="block text-sm font-medium text-gray-700">
                                                        Amendment Letter from Bank
                                                    </label>
                                                    <div className="mt-1 flex items-center">
                                                        <input
                                                            id="amendment-file"
                                                            name="amendment_letter_file"
                                                            type="file"
                                                            onChange={handleFileChange}
                                                            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                                                        />
                                                        {amendmentFile && (
                                                            <span className="ml-3 text-sm text-gray-500">
                                                                <FileText className="inline-block h-4 w-4 mr-1" />
                                                                {amendmentFile.name}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="mt-5 sm:mt-6 sm:grid sm:grid-flow-row-dense sm:grid-cols-2 sm:gap-3">
                                                    <button
                                                        type="submit"
                                                        className={classNames(
                                                            buttonBaseClassNames,
                                                            "sm:col-start-2 bg-indigo-600 text-white hover:bg-indigo-700",
                                                            !hasChanges ? "opacity-50 cursor-not-allowed" : ""
                                                        )}
                                                        disabled={!hasChanges || isProcessing}
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