// frontend/src/components/Modals/ChangeLGOwnerModal.js
import React, { useState, useEffect } from 'react';
import { Dialog, DialogPanel, DialogTitle, Transition, TransitionChild } from '@headlessui/react';
import { X, Users, Loader2, AlertCircle } from 'lucide-react';
import { Formik, Form, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';
import { apiRequest } from '../../services/apiService';
import { toast } from 'react-toastify';

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

const buttonBaseClassNames = "inline-flex items-center px-4 py-2 text-sm font-medium rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors duration-200";

const ChangeLGOwnerModal = ({ lgRecord, onClose, onSuccess, isGracePeriod }) => {
    const [existingOwners, setExistingOwners] = useState([]);
    const [isLoadingOwners, setIsLoadingOwners] = useState(true);
    const [isCreatingNewOwner, setIsCreatingNewOwner] = useState(false);
    const [isOwnerFieldsLocked, setIsOwnerFieldsLocked] = useState(false);

    const initialValues = {
        newOwnerId: '',
        newOwnerEmail: '',
        newOwnerPhoneNumber: '',
        newOwnerInternalId: '',
        newOwnerManagerEmail: '',
        reason: '',
    };

    const ChangeOwnerSchema = Yup.object().shape({
        newOwnerId: Yup.number().when('isCreatingNewOwner', {
            is: false,
            then: (schema) => schema.required('Please select an existing owner'),
            otherwise: (schema) => schema.nullable(),
        }),
        newOwnerEmail: Yup.string().when('isCreatingNewOwner', {
            is: true,
            then: (schema) => schema.email('Invalid email').required('Email is required for new owner'),
            otherwise: (schema) => schema.nullable(),
        }),
        newOwnerPhoneNumber: Yup.string().when('isCreatingNewOwner', {
            is: true,
            then: (schema) => schema.matches(/^[0-9\-()\s+]+$/, 'Invalid phone number format').required('Phone is required for new owner'),
            otherwise: (schema) => schema.nullable(),
        }),
        newOwnerInternalId: Yup.string().nullable(),
        newOwnerManagerEmail: Yup.string().when('isCreatingNewOwner', {
            is: true,
            then: (schema) => schema.email('Invalid manager email').required('Manager email is required for new owner'),
            otherwise: (schema) => schema.nullable(),
        }),
        reason: Yup.string().required('Reason for owner change is required'),
    });

    useEffect(() => {
        const fetchExistingOwners = async () => {
            setIsLoadingOwners(true);
            try {
                const response = await apiRequest('/end-user/internal-owner-contacts/with-lg-count', 'GET');
                const filteredOwners = response.filter(o => o.id !== lgRecord.internal_owner_contact?.id);
                setExistingOwners(filteredOwners);
            } catch (err) {
                console.error("Failed to fetch existing internal owners:", err);
                toast.error("Failed to load existing owners for selection.");
            } finally {
                setIsLoadingOwners(false);
            }
        };
        fetchExistingOwners();
    }, [lgRecord]);

    const handleEmailLookup = async (email, setFieldValue) => {
        if (!email) {
            setIsOwnerFieldsLocked(false);
            return;
        }

        try {
            const contactDetails = await apiRequest(`/end-user/internal-owner-contacts/lookup-by-email/?email=${encodeURIComponent(email)}`, 'GET');
            
            if (contactDetails) {
                toast.info(`An existing owner was found with this email. Please select from the dropdown.`);
                setIsCreatingNewOwner(false);
                setFieldValue('newOwnerId', contactDetails.id);
                setIsOwnerFieldsLocked(true);
            } else {
                setIsOwnerFieldsLocked(false);
            }
        } catch (err) {
            console.error('Owner lookup failed:', err);
            toast.error(`Owner lookup failed: ${err.message || 'An unexpected error occurred.'}`);
        }
    };

    const handleSubmit = async (values, { setSubmitting, setErrors }) => {
        if (isGracePeriod) {
            toast.warn("This action is disabled during your subscription's grace period.");
            setSubmitting(false);
            return;
        }

        try {
            let newOwnerPayload = null;
            let newInternalOwnerContactId = values.newOwnerId || null;

            if (isCreatingNewOwner) {
                newOwnerPayload = {
                    email: values.newOwnerEmail,
                    phone_number: values.newOwnerPhoneNumber,
                    internal_id: values.newOwnerInternalId || null,
                    manager_email: values.newOwnerManagerEmail,
                };
                newInternalOwnerContactId = null;
            }

            const payload = {
                change_scope: "single_lg",
                lg_record_id: lgRecord.id,
                new_internal_owner_contact_id: newInternalOwnerContactId,
                new_internal_owner_contact_details: newOwnerPayload,
                reason: values.reason,
            };

            const response = await apiRequest('/end-user/lg-records/change-owner', 'POST', payload);

            if (response.approval_request_id) {
                toast.info(`LG Owner change request submitted for approval. Request ID: ${response.approval_request_id}.`);
            } else {
                toast.success(`LG Owner for ${lgRecord.lg_number} changed successfully!`);
            }
            onSuccess();
        } catch (error) {
            console.error("Failed to change LG owner:", error);
            toast.error(`Failed to change LG owner: ${error.message || 'An unexpected error occurred.'}`);
            setErrors({ general: error.message || 'An unexpected error occurred.' });
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Transition show={true} as={React.Fragment}>
            <Dialog as="div" className="relative z-[100]" onClose={onClose}>
                <TransitionChild
                    as={React.Fragment}
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
                            as={React.Fragment}
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
                                        className="rounded-full p-1 bg-gray-100 text-gray-500 hover:text-gray-700 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        onClick={onClose}
                                    >
                                        <span className="sr-only">Close</span>
                                        <X className="h-5 w-5" aria-hidden="true" />
                                    </button>
                                </div>
                                <div className="w-full">
                                    <DialogTitle as="h3" className="text-lg font-bold leading-6 text-gray-900 tracking-tight border-b pb-3 mb-4 pr-8">
                                        Change Internal Owner: {lgRecord.lg_number}
                                    </DialogTitle>
                                    <div className="mt-2">
                                        <Formik
                                            initialValues={initialValues}
                                            validationSchema={ChangeOwnerSchema}
                                            onSubmit={handleSubmit}
                                        >
                                            {({ isSubmitting, errors, touched, values, setFieldValue }) => (
                                                <Form className={`space-y-4 ${isGracePeriod ? 'opacity-50' : ''}`}>
                                                    <div className="p-3 border border-blue-200 rounded-lg bg-blue-50 text-xs sm:text-sm">
                                                        <h4 className="font-bold text-blue-900 mb-1">Current Owner:</h4>
                                                        <p><strong>Email:</strong> {lgRecord.internal_owner_contact?.email || 'N/A'}</p>
                                                        <p><strong>Phone:</strong> {lgRecord.internal_owner_contact?.phone_number || 'N/A'}</p>
                                                        <p><strong>Manager:</strong> {lgRecord.internal_owner_contact?.manager_email || 'N/A'}</p>
                                                    </div>

                                                    <div className="flex items-center space-x-2 my-3">
                                                        <input
                                                            id="isCreatingNewOwner"
                                                            name="isCreatingNewOwner"
                                                            type="checkbox"
                                                            checked={isCreatingNewOwner}
                                                            onChange={() => {
                                                                setIsCreatingNewOwner(!isCreatingNewOwner);
                                                                setFieldValue('newOwnerId', '');
                                                                setFieldValue('newOwnerEmail', '');
                                                                setFieldValue('newOwnerPhoneNumber', '');
                                                                setFieldValue('newOwnerInternalId', '');
                                                                setFieldValue('newOwnerManagerEmail', '');
                                                            }}
                                                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                                            disabled={isGracePeriod || isOwnerFieldsLocked}
                                                        />
                                                        <label htmlFor="isCreatingNewOwner" className="text-xs sm:text-sm font-medium text-gray-700">
                                                            Create a New Internal Owner Contact
                                                        </label>
                                                    </div>

                                                    {isCreatingNewOwner ? (
                                                        <div className="space-y-3 border p-3 rounded-lg shadow-sm bg-gray-50 text-xs sm:text-sm">
                                                            <h4 className="font-bold text-gray-700 mb-1">New Owner Contact Details:</h4>
                                                            <div>
                                                                <label htmlFor="newOwnerEmail" className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                                                                    Email
                                                                </label>
                                                                <Field
                                                                    type="email"
                                                                    id="newOwnerEmail"
                                                                    name="newOwnerEmail"
                                                                    onBlur={(e) => handleEmailLookup(e.target.value, setFieldValue)}
                                                                    className={`block w-full px-3 py-2 rounded-lg border text-sm ${errors.newOwnerEmail && touched.newOwnerEmail ? 'border-red-500' : 'border-gray-300'}`}
                                                                    disabled={isGracePeriod || isOwnerFieldsLocked}
                                                                />
                                                                <ErrorMessage name="newOwnerEmail" component="div" className="text-red-600 text-xs mt-1" />
                                                            </div>
                                                            <div>
                                                                <label htmlFor="newOwnerPhoneNumber" className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                                                                    Phone Number
                                                                </label>
                                                                <Field
                                                                    type="text"
                                                                    id="newOwnerPhoneNumber"
                                                                    name="newOwnerPhoneNumber"
                                                                    className={`block w-full px-3 py-2 rounded-lg border text-sm ${errors.newOwnerPhoneNumber && touched.newOwnerPhoneNumber ? 'border-red-500' : 'border-gray-300'}`}
                                                                    disabled={isGracePeriod || isOwnerFieldsLocked}
                                                                />
                                                                <ErrorMessage name="newOwnerPhoneNumber" component="div" className="text-red-600 text-xs mt-1" />
                                                            </div>
                                                            <div>
                                                                <label htmlFor="newOwnerInternalId" className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                                                                    Internal ID (Optional)
                                                                </label>
                                                                <Field
                                                                    type="text"
                                                                    id="newOwnerInternalId"
                                                                    name="newOwnerInternalId"
                                                                    className="block w-full px-3 py-2 rounded-lg border border-gray-300 text-sm"
                                                                    disabled={isGracePeriod || isOwnerFieldsLocked}
                                                                />
                                                                <ErrorMessage name="newOwnerInternalId" component="div" className="text-red-600 text-xs mt-1" />
                                                            </div>
                                                            <div>
                                                                <label htmlFor="newOwnerManagerEmail" className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                                                                    Manager Email
                                                                </label>
                                                                <Field
                                                                    type="email"
                                                                    id="newOwnerManagerEmail"
                                                                    name="newOwnerManagerEmail"
                                                                    className={`block w-full px-3 py-2 rounded-lg border text-sm ${errors.newOwnerManagerEmail && touched.newOwnerManagerEmail ? 'border-red-500' : 'border-gray-300'}`}
                                                                    disabled={isGracePeriod || isOwnerFieldsLocked}
                                                                />
                                                                <ErrorMessage name="newOwnerManagerEmail" component="div" className="text-red-600 text-xs mt-1" />
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div>
                                                            <label htmlFor="newOwnerId" className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                                                                Select Existing Owner
                                                            </label>
                                                            {isLoadingOwners ? (
                                                                <p className="text-gray-500 flex items-center mt-2 text-xs"><Loader2 className="animate-spin h-4 w-4 mr-2" /> Loading owners...</p>
                                                            ) : (
                                                                <Field
                                                                    as="select"
                                                                    id="newOwnerId"
                                                                    name="newOwnerId"
                                                                    className={`block w-full px-3 py-2 rounded-lg border text-sm ${errors.newOwnerId && touched.newOwnerId ? 'border-red-500' : 'border-gray-300'}`}
                                                                    disabled={isGracePeriod}
                                                                >
                                                                    <option value="">-- Select an owner --</option>
                                                                    {existingOwners.map(ownerOption => (
                                                                        <option key={ownerOption.id} value={ownerOption.id}>
                                                                            {ownerOption.email} ({ownerOption.phone_number})
                                                                        </option>
                                                                    ))}
                                                                </Field>
                                                            )}
                                                            <ErrorMessage name="newOwnerId" component="div" className="text-red-600 text-xs mt-1" />
                                                        </div>
                                                    )}

                                                    <div>
                                                        <label htmlFor="reason" className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                                                            Reason for Change
                                                        </label>
                                                        <Field
                                                            as="textarea"
                                                            id="reason"
                                                            name="reason"
                                                            rows="2"
                                                            className={`block w-full px-3 py-2 text-sm rounded-lg border ${errors.reason && touched.reason ? 'border-red-500' : 'border-gray-300'}`}
                                                            disabled={isGracePeriod}
                                                        />
                                                        <ErrorMessage name="reason" component="div" className="text-red-600 text-xs mt-1" />
                                                    </div>

                                                    {errors.general && (
                                                        <div className="text-red-600 text-xs mt-2">
                                                            <AlertCircle className="inline h-4 w-4 mr-1" />
                                                            {errors.general}
                                                        </div>
                                                    )}

                                                    <div className="mt-6 flex flex-col-reverse sm:flex-row sm:justify-end gap-2.5 sm:gap-3 pt-2 border-t border-gray-100">
                                                        <button
                                                            type="button"
                                                            className={`${buttonBaseClassNames} justify-center w-full sm:w-auto bg-gray-100 text-gray-700 hover:bg-gray-200 py-2.5`}
                                                            onClick={onClose}
                                                            disabled={isSubmitting}
                                                        >
                                                            Cancel
                                                        </button>
                                                        <GracePeriodTooltip isGracePeriod={isGracePeriod}>
                                                            <button
                                                                type="submit"
                                                                className={`${buttonBaseClassNames} justify-center w-full sm:w-auto bg-purple-600 text-white hover:bg-purple-700 py-2.5 font-bold shadow-md ${isSubmitting || isGracePeriod ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                                disabled={isSubmitting || isGracePeriod}
                                                            >
                                                                {isSubmitting ? <Loader2 className="h-5 w-5 mr-2 animate-spin" /> : <Users className="h-5 w-5 mr-2" />}
                                                                {isSubmitting ? 'Processing...' : 'Submit Change Request'}
                                                            </button>
                                                        </GracePeriodTooltip>
                                                    </div>
                                                </Form>
                                            )}
                                        </Formik>
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

export default ChangeLGOwnerModal;