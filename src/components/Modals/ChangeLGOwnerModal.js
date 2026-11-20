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
                <div className="opacity-0 w-max bg-slate-900 text-white text-xs rounded-xl py-2 px-3 absolute z-10 bottom-full left-1/2 -translate-x-1/2 pointer-events-none group-hover:opacity-100 transition-opacity duration-200 shadow-lg">
                    This action is disabled during your subscription's grace period.
                    <svg className="absolute text-slate-900 h-2 w-full left-0 top-full" x="0px" y="0px" viewBox="0 0 255 255">
                        <polygon className="fill-current" points="0,0 127.5,127.5 255,0"/>
                    </svg>
                </div>
            </div>
        );
    }
    return children;
};

const buttonBaseClassNames = "inline-flex items-center px-4 py-2 text-sm font-semibold rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors duration-200";

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
                    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" />
                </TransitionChild>

                <div className="fixed inset-0 z-10 w-screen overflow-y-auto">
                    <div className="flex min-h-full items-center justify-center p-3 text-center sm:p-4">
                        <TransitionChild
                            as={React.Fragment}
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
                                        <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100 shrink-0">
                                            <Users className="h-4 w-4" />
                                        </div>
                                        <DialogTitle as="h3" className="text-base sm:text-lg font-bold leading-6 text-slate-900 tracking-tight truncate">
                                            Change Internal Owner: {lgRecord.lg_number}
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

                                <Formik
                                    initialValues={initialValues}
                                    validationSchema={ChangeOwnerSchema}
                                    onSubmit={handleSubmit}
                                >
                                    {({ isSubmitting, errors, touched, values, setFieldValue }) => (
                                        <Form className={`flex flex-col flex-1 min-h-0 ${isGracePeriod ? 'opacity-50' : ''}`}>
                                            <div className="px-5 py-4 space-y-3.5 overflow-y-auto flex-1">
                                                <div className="p-3 border border-indigo-200/80 rounded-xl bg-indigo-50/60 text-xs sm:text-sm text-indigo-950 space-y-0.5">
                                                    <h4 className="font-bold text-indigo-900 mb-1">Current Owner:</h4>
                                                    <p><strong>Email:</strong> {lgRecord.internal_owner_contact?.email || 'N/A'}</p>
                                                    <p><strong>Phone:</strong> {lgRecord.internal_owner_contact?.phone_number || 'N/A'}</p>
                                                    <p><strong>Manager:</strong> {lgRecord.internal_owner_contact?.manager_email || 'N/A'}</p>
                                                </div>

                                                <div className="flex items-center space-x-2 py-1">
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
                                                        className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-slate-300 rounded"
                                                        disabled={isGracePeriod || isOwnerFieldsLocked}
                                                    />
                                                    <label htmlFor="isCreatingNewOwner" className="text-xs sm:text-sm font-medium text-slate-700 cursor-pointer">
                                                        Create a New Internal Owner Contact
                                                    </label>
                                                </div>

                                                {isCreatingNewOwner ? (
                                                    <div className="space-y-3 border border-slate-200 p-3.5 rounded-xl shadow-sm bg-slate-50/70 text-xs sm:text-sm">
                                                        <h4 className="font-bold text-slate-800 mb-1">New Owner Contact Details:</h4>
                                                        <div>
                                                            <label htmlFor="newOwnerEmail" className="block text-xs sm:text-sm font-medium text-slate-700 mb-1">
                                                                Email
                                                            </label>
                                                            <Field
                                                                type="email"
                                                                id="newOwnerEmail"
                                                                name="newOwnerEmail"
                                                                onBlur={(e) => handleEmailLookup(e.target.value, setFieldValue)}
                                                                className={`block w-full px-3 py-2 rounded-xl border text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 ${errors.newOwnerEmail && touched.newOwnerEmail ? 'border-rose-500' : 'border-slate-300'}`}
                                                                disabled={isGracePeriod || isOwnerFieldsLocked}
                                                            />
                                                            <ErrorMessage name="newOwnerEmail" component="div" className="text-rose-600 text-xs mt-1" />
                                                        </div>
                                                        <div>
                                                            <label htmlFor="newOwnerPhoneNumber" className="block text-xs sm:text-sm font-medium text-slate-700 mb-1">
                                                                Phone Number
                                                            </label>
                                                            <Field
                                                                type="text"
                                                                id="newOwnerPhoneNumber"
                                                                name="newOwnerPhoneNumber"
                                                                className={`block w-full px-3 py-2 rounded-xl border text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 ${errors.newOwnerPhoneNumber && touched.newOwnerPhoneNumber ? 'border-rose-500' : 'border-slate-300'}`}
                                                                disabled={isGracePeriod || isOwnerFieldsLocked}
                                                            />
                                                            <ErrorMessage name="newOwnerPhoneNumber" component="div" className="text-rose-600 text-xs mt-1" />
                                                        </div>
                                                        <div>
                                                            <label htmlFor="newOwnerInternalId" className="block text-xs sm:text-sm font-medium text-slate-700 mb-1">
                                                                Internal ID (Optional)
                                                            </label>
                                                            <Field
                                                                type="text"
                                                                id="newOwnerInternalId"
                                                                name="newOwnerInternalId"
                                                                className="block w-full px-3 py-2 rounded-xl border border-slate-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                                                disabled={isGracePeriod || isOwnerFieldsLocked}
                                                            />
                                                            <ErrorMessage name="newOwnerInternalId" component="div" className="text-rose-600 text-xs mt-1" />
                                                        </div>
                                                        <div>
                                                            <label htmlFor="newOwnerManagerEmail" className="block text-xs sm:text-sm font-medium text-slate-700 mb-1">
                                                                Manager Email
                                                            </label>
                                                            <Field
                                                                type="email"
                                                                id="newOwnerManagerEmail"
                                                                name="newOwnerManagerEmail"
                                                                className={`block w-full px-3 py-2 rounded-xl border text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 ${errors.newOwnerManagerEmail && touched.newOwnerManagerEmail ? 'border-rose-500' : 'border-slate-300'}`}
                                                                disabled={isGracePeriod || isOwnerFieldsLocked}
                                                            />
                                                            <ErrorMessage name="newOwnerManagerEmail" component="div" className="text-rose-600 text-xs mt-1" />
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div>
                                                        <label htmlFor="newOwnerId" className="block text-xs sm:text-sm font-medium text-slate-700 mb-1">
                                                            Select Existing Owner
                                                        </label>
                                                        {isLoadingOwners ? (
                                                            <p className="text-slate-500 flex items-center mt-2 text-xs"><Loader2 className="animate-spin h-4 w-4 mr-2 text-indigo-600" /> Loading owners...</p>
                                                        ) : (
                                                            <Field
                                                                as="select"
                                                                id="newOwnerId"
                                                                name="newOwnerId"
                                                                className={`block w-full px-3 py-2 rounded-xl border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${errors.newOwnerId && touched.newOwnerId ? 'border-rose-500' : 'border-slate-300'}`}
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
                                                        <ErrorMessage name="newOwnerId" component="div" className="text-rose-600 text-xs mt-1" />
                                                    </div>
                                                )}

                                                <div>
                                                    <label htmlFor="reason" className="block text-xs sm:text-sm font-medium text-slate-700 mb-1">
                                                        Reason for Change
                                                    </label>
                                                    <Field
                                                        as="textarea"
                                                        id="reason"
                                                        name="reason"
                                                        rows="2"
                                                        className={`block w-full px-3 py-2 text-sm rounded-xl border focus:outline-none focus:ring-2 focus:ring-indigo-500 ${errors.reason && touched.reason ? 'border-rose-500' : 'border-slate-300'}`}
                                                        disabled={isGracePeriod}
                                                    />
                                                    <ErrorMessage name="reason" component="div" className="text-rose-600 text-xs mt-1" />
                                                </div>

                                                {errors.general && (
                                                    <div className="text-rose-600 text-xs bg-rose-50 border border-rose-200 rounded-xl p-2.5">
                                                        <AlertCircle className="inline h-4 w-4 mr-1" />
                                                        {errors.general}
                                                    </div>
                                                )}
                                            </div>

                                            {/* Sticky Footer */}
                                            <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex flex-col-reverse sm:flex-row sm:justify-end gap-2.5 shrink-0">
                                                <button
                                                    type="button"
                                                    className={`${buttonBaseClassNames} justify-center w-full sm:w-auto rounded-xl bg-white border border-slate-300 text-slate-700 hover:bg-slate-50`}
                                                    onClick={onClose}
                                                    disabled={isSubmitting}
                                                >
                                                    Cancel
                                                </button>
                                                <GracePeriodTooltip isGracePeriod={isGracePeriod}>
                                                    <button
                                                        type="submit"
                                                        className={`${buttonBaseClassNames} justify-center w-full sm:w-auto rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 ${isSubmitting || isGracePeriod ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                        disabled={isSubmitting || isGracePeriod}
                                                    >
                                                        {isSubmitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Users className="h-4 w-4 mr-2" />}
                                                        {isSubmitting ? 'Processing...' : 'Submit Change Request'}
                                                    </button>
                                                </GracePeriodTooltip>
                                            </div>
                                        </Form>
                                    )}
                                </Formik>
                            </DialogPanel>
                        </TransitionChild>
                    </div>
                </div>
            </Dialog>
        </Transition>
    );
};

export default ChangeLGOwnerModal;