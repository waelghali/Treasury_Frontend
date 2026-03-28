import React, { useState, useEffect } from 'react';
import { Dialog, DialogPanel, DialogTitle, Transition, TransitionChild } from '@headlessui/react';
import { X, Users, Loader2, AlertCircle } from 'lucide-react';
import { Formik, Form, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';
import { apiRequest, publicApiRequest } from '../../services/apiService';
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

const ChangeRequestorModal = ({ 
    lgRecords = [], // Can be a single LG or an array of LGs 
    onClose, 
    onSuccess, 
    isGracePeriod, 
    isPublicPortal = false, 
    publicToken = null 
}) => {
    // Normalize to array
    const lgsToProcess = Array.isArray(lgRecords) ? lgRecords : [lgRecords];
    const singleLgMode = lgsToProcess.length === 1;

    const [existingRequestors, setExistingRequestors] = useState([]);
    const [isLoadingRequestors, setIsLoadingRequestors] = useState(false);

    // Compute active owners to exclude them from the existing requestors dropdown
    const currentOwnerEmails = React.useMemo(() => {
        return lgsToProcess.map(lg => {
            // Backend returns owner email as `current_owner_name` and requestor email nested in `request.requestor_email`
            return lg.current_owner_name || lg.request?.requestor_email;
        }).filter(Boolean).map(e => e.toLowerCase());
    }, [lgsToProcess]);

    const filteredRequestors = React.useMemo(() => {
        return existingRequestors.filter(req => 
            !currentOwnerEmails.includes((req.email || '').toLowerCase())
        );
    }, [existingRequestors, currentOwnerEmails]);
    
    // In the public portal, Requestors CANNOT pick from directory, they must enter details
    const [isCreatingNewOwner, setIsCreatingNewOwner] = useState(isPublicPortal);
    
    const initialValues = {
        selectedEmail: '', // Used for dropdown
        newEmail: '',
        newName: '',
        newDepartment: '',
        newJobTitle: '',
        newPhoneNumber: '',
        newEmployeeId: '',
        newManagerEmail: '',
        newSecondLineManagerEmail: '',
        justification: '',
    };

    const HandoverSchema = Yup.object().shape({
        selectedEmail: Yup.string().when('isCreatingNewOwner', {
            // is is actually evaluating an external value, so we'll test conditionally based on state but Yup .when doesn't read external state directly unless we pass it.
            // A trick is to use `.test()` or make `isCreatingNewOwner` part of initialValues.
            // For simplicity, we'll validate both depending on manual logic or keep both optional and validate in onSubmit.
            is: false,
            then: (schema) => schema.nullable(),
        }),
        newEmail: Yup.string().email('Invalid email address'),
        justification: isPublicPortal ? Yup.string().nullable() : Yup.string().required('Justification is required for Admin actions'),
    });

    useEffect(() => {
        if (isPublicPortal) return; // Public portal users don't get the directory

        const fetchExistingRequestors = async () => {
            setIsLoadingRequestors(true);
            try {
                const response = await apiRequest('/end-user/issuance/requestors/directory', 'GET');
                setExistingRequestors(response || []);
            } catch (err) {
                console.error("Failed to fetch existing requestors:", err);
                toast.error("Failed to load existing requestors for selection.");
            } finally {
                setIsLoadingRequestors(false);
            }
        };
        fetchExistingRequestors();
    }, [isPublicPortal]);

    const handleSubmit = async (values, { setSubmitting, setErrors }) => {
        if (isGracePeriod) {
            toast.warn("This action is disabled during your subscription's grace period.");
            setSubmitting(false);
            return;
        }

        try {
            // Determine the target profile
            let targetProfile = null;
            
            if (isCreatingNewOwner) {
                if (!values.newEmail) throw new Error("Email is required for the new requestor.");
                targetProfile = {
                    email: values.newEmail,
                    name: values.newName,
                    department: values.newDepartment,
                    job_title: values.newJobTitle,
                    phone_number: values.newPhoneNumber,
                    employee_id: values.newEmployeeId,
                    manager_email: values.newManagerEmail,
                    second_line_manager_email: values.newSecondLineManagerEmail,
                };
            } else {
                if (!values.selectedEmail) throw new Error("Please select an existing requestor.");
                const existing = existingRequestors.find(r => r.email === values.selectedEmail);
                if (!existing) throw new Error("Selected requestor not found.");
                targetProfile = { ...existing }; // use existing data
            }

            const lgIds = lgsToProcess.map(lg => lg.id);

            if (isPublicPortal) {
                // Currently Requestor handover only supports single LG at a time from their portal
                const payload = {
                    lg_id: lgIds[0],
                    new_requestor: targetProfile
                };
                await publicApiRequest(`/public_issuance/handover/initiate?token=${publicToken}`, 'POST', payload);
                toast.success(`Handover initiated. The new requestor will receive an OTP to accept.`);
            } else {
                // Admin force transfer
                const payload = {
                    lg_ids: lgIds,
                    new_requestor: targetProfile,
                    justification: values.justification
                };
                const response = await apiRequest('/end-user/issuance/handover/force', 'POST', payload);
                
                if (response && response.id) {
                    toast.info(`Force transfer request submitted for Maker-Checker approval. Request ID: ${response.id}`);
                } else {
                    toast.success(`LG Ownership forcibly transferred successfully.`);
                }
            }
            onSuccess();
        } catch (error) {
            console.error("Failed to process handover:", error);
            const errMsg = error.message || 'An unexpected error occurred.';
            toast.error(`Handover failed: ${errMsg}`);
            setErrors({ general: errMsg });
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
                    <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
                        <TransitionChild
                            as={React.Fragment}
                            enter="ease-out duration-300"
                            enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
                            enterTo="opacity-100 translate-y-0 sm:scale-100"
                            leave="ease-in duration-200"
                            leaveFrom="opacity-100 translate-y-0 sm:scale-100"
                            leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
                        >
                            <DialogPanel className="relative transform overflow-hidden rounded-xl bg-white px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-full max-w-2xl sm:p-6">
                                <div className="absolute right-0 top-0 hidden pr-4 pt-4 sm:block">
                                    <button
                                        type="button"
                                        className="rounded-md bg-white text-gray-400 hover:text-gray-500 focus:outline-none"
                                        onClick={onClose}
                                    >
                                        <span className="sr-only">Close</span>
                                        <X className="h-6 w-6" aria-hidden="true" />
                                    </button>
                                </div>
                                <div className="sm:flex sm:items-start">
                                    <div className="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left w-full">
                                        <DialogTitle as="h3" className="text-lg font-bold leading-6 text-gray-900 tracking-tight border-b pb-3 mb-4">
                                            {isPublicPortal 
                                                ? "Hand Over LG to Another Requestor" 
                                                : singleLgMode 
                                                    ? `Transfer Ownership for LG: ${lgsToProcess[0].lg_ref_number || lgsToProcess[0].bank_lg_number}`
                                                    : `Transfer Ownership for ${lgsToProcess.length} LGs`
                                            }
                                        </DialogTitle>
                                        <div className="mt-2 text-sm text-gray-600 mb-4">
                                            {isPublicPortal 
                                                ? "You are about to transfer ownership of this LG to a colleague. They will receive an email with instructions to log in and accept the handover. Until they accept, you will remain the owner."
                                                : "Force-transferring ownership will require Maker-Checker approval. Once approved, ownership is updated instantly."
                                            }
                                        </div>
                                        <div className="mt-2">
                                            <Formik
                                                initialValues={initialValues}
                                                validationSchema={HandoverSchema}
                                                onSubmit={handleSubmit}
                                            >
                                                {({ isSubmitting, errors, touched, values, setFieldValue }) => {
                                                    // Sync formik state with local state check
                                                    const creatingNew = isCreatingNewOwner;

                                                    return (
                                                    <Form className={`space-y-4 ${isGracePeriod ? 'opacity-50' : ''}`}>
                                                        
                                                        {/* Public Portal ONLY allows new creation */}
                                                        {!isPublicPortal && (
                                                            <div className="flex items-center space-x-2 mt-4 mb-4 bg-gray-50 p-3 rounded-md border">
                                                                <input
                                                                    id="isCreatingNewOwner"
                                                                    name="isCreatingNewOwner"
                                                                    type="checkbox"
                                                                    checked={creatingNew}
                                                                    onChange={() => {
                                                                        setIsCreatingNewOwner(!creatingNew);
                                                                    }}
                                                                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                                                    disabled={isGracePeriod}
                                                                />
                                                                <label htmlFor="isCreatingNewOwner" className="text-sm font-medium text-gray-900">
                                                                    Enter a New Requestor (instead of selecting existing)
                                                                </label>
                                                            </div>
                                                        )}

                                                        {creatingNew ? (
                                                            <div className="space-y-4 border border-blue-100 p-4 rounded-md shadow-sm bg-blue-50/30">
                                                                <h4 className="font-medium text-md text-blue-800 border-b border-blue-100 pb-2">New Requestor Details</h4>
                                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                                    <div>
                                                                        <label className="block text-sm font-medium text-gray-700">Email Address <span className="text-red-500">*</span></label>
                                                                        <Field name="newEmail" type="email" className={`mt-1 block w-full px-3 py-2 rounded-md border text-sm ${errors.newEmail && touched.newEmail ? 'border-red-500' : 'border-gray-300'}`} disabled={isGracePeriod} placeholder="colleague@company.com" />
                                                                        <ErrorMessage name="newEmail" component="div" className="text-red-600 text-xs mt-1" />
                                                                    </div>
                                                                    <div>
                                                                        <label className="block text-sm font-medium text-gray-700">Full Name</label>
                                                                        <Field name="newName" type="text" className="mt-1 block w-full px-3 py-2 rounded-md border border-gray-300 text-sm" disabled={isGracePeriod} />
                                                                    </div>
                                                                    <div>
                                                                        <label className="block text-sm font-medium text-gray-700">Department</label>
                                                                        <Field name="newDepartment" type="text" className="mt-1 block w-full px-3 py-2 rounded-md border border-gray-300 text-sm" disabled={isGracePeriod} />
                                                                    </div>
                                                                    <div>
                                                                        <label className="block text-sm font-medium text-gray-700">Job Title</label>
                                                                        <Field name="newJobTitle" type="text" className="mt-1 block w-full px-3 py-2 rounded-md border border-gray-300 text-sm" disabled={isGracePeriod} />
                                                                    </div>
                                                                    <div>
                                                                        <label className="block text-sm font-medium text-gray-700">Phone Number</label>
                                                                        <Field name="newPhoneNumber" type="text" className="mt-1 block w-full px-3 py-2 rounded-md border border-gray-300 text-sm" disabled={isGracePeriod} />
                                                                    </div>
                                                                    <div>
                                                                        <label className="block text-sm font-medium text-gray-700">Employee ID</label>
                                                                        <Field name="newEmployeeId" type="text" className="mt-1 block w-full px-3 py-2 rounded-md border border-gray-300 text-sm" disabled={isGracePeriod} />
                                                                    </div>
                                                                    <div className="sm:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                                        <div>
                                                                            <label className="block text-sm font-medium text-gray-700">Manager Email</label>
                                                                            <Field name="newManagerEmail" type="email" className="mt-1 block w-full px-3 py-2 rounded-md border border-gray-300 text-sm" disabled={isGracePeriod} />
                                                                        </div>
                                                                        <div>
                                                                            <label className="block text-sm font-medium text-gray-700">Second-Line Manager Email</label>
                                                                            <Field name="newSecondLineManagerEmail" type="email" className="mt-1 block w-full px-3 py-2 rounded-md border border-gray-300 text-sm" disabled={isGracePeriod} />
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <div>
                                                                <label htmlFor="selectedEmail" className="block text-sm font-medium text-gray-700">
                                                                    Select Existing Requestor
                                                                </label>
                                                                {isLoadingRequestors ? (
                                                                    <p className="text-gray-500 flex items-center mt-2 text-sm"><Loader2 className="animate-spin h-4 w-4 mr-2" /> Loading directory...</p>
                                                                ) : (
                                                                    <Field
                                                                        as="select"
                                                                        name="selectedEmail"
                                                                        className={`mt-1 block w-full px-3 py-2 rounded-md border text-sm ${errors.selectedEmail && touched.selectedEmail ? 'border-red-500' : 'border-gray-300'}`}
                                                                        disabled={isGracePeriod}
                                                                    >
                                                                        <option value="">-- Choose a Requestor Profile --</option>
                                                                        {filteredRequestors.map((req, idx) => (
                                                                            <option key={idx} value={req.email}>
                                                                                {req.email} {req.name ? `(${req.name})` : ''} - {req.department || 'Unknown Dept'}
                                                                            </option>
                                                                        ))}
                                                                    </Field>
                                                                )}
                                                                {errors.selectedEmail && touched.selectedEmail && <div className="text-red-600 text-xs mt-1">{errors.selectedEmail}</div>}
                                                            </div>
                                                        )}

                                                        {!isPublicPortal && (
                                                            <div>
                                                                <label htmlFor="justification" className="block text-sm font-medium text-gray-700">
                                                                    Reason / Justification <span className="text-red-500">*</span>
                                                                </label>
                                                                <Field
                                                                    as="textarea"
                                                                    name="justification"
                                                                    rows="2"
                                                                    className={`mt-1 block w-full px-3 py-2 rounded-md border text-sm ${errors.justification && touched.justification ? 'border-red-500' : 'border-gray-300'}`}
                                                                    disabled={isGracePeriod}
                                                                />
                                                                <ErrorMessage name="justification" component="div" className="text-red-600 text-xs mt-1" />
                                                            </div>
                                                        )}

                                                        {errors.general && (
                                                            <div className="text-red-600 text-sm mt-2 flex items-center bg-red-50 p-2 rounded">
                                                                <AlertCircle className="h-4 w-4 mr-2 flex-shrink-0" />
                                                                {errors.general}
                                                            </div>
                                                        )}

                                                        <div className="mt-6 sm:grid sm:grid-flow-row-dense sm:grid-cols-2 sm:gap-3 border-t pt-4">
                                                            <GracePeriodTooltip isGracePeriod={isGracePeriod}>
                                                                <button
                                                                    type="submit"
                                                                    className={`${buttonBaseClassNames} sm:col-start-2 w-full justify-center bg-blue-600 text-white hover:bg-blue-700 ${isSubmitting || isGracePeriod ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                                    disabled={isSubmitting || isGracePeriod}
                                                                >
                                                                    {isSubmitting ? <Loader2 className="h-5 w-5 mr-2 animate-spin" /> : <Users className="h-5 w-5 mr-2" />}
                                                                    {isPublicPortal ? 'Initiate Handover' : 'Submit Transfer'}
                                                                </button>
                                                            </GracePeriodTooltip>
                                                            <button
                                                                type="button"
                                                                className={`${buttonBaseClassNames} sm:col-start-1 w-full justify-center bg-gray-100 text-gray-700 hover:bg-gray-200`}
                                                                onClick={onClose}
                                                                disabled={isSubmitting}
                                                            >
                                                                Cancel
                                                            </button>
                                                        </div>
                                                    </Form>
                                                )}}
                                            </Formik>
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

export default ChangeRequestorModal;
