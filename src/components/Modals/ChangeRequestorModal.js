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
                    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" />
                </TransitionChild>

                <div className="fixed inset-0 z-[100] w-screen overflow-y-auto">
                    <div className="flex min-h-full items-center justify-center p-4 text-center">
                        <TransitionChild
                            as={React.Fragment}
                            enter="ease-out duration-300"
                            enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
                            enterTo="opacity-100 translate-y-0 sm:scale-100"
                            leave="ease-in duration-200"
                            leaveFrom="opacity-100 translate-y-0 sm:scale-100"
                            leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
                        >
                            <DialogPanel className="relative transform overflow-hidden rounded-2xl bg-white border border-slate-200 text-left shadow-2xl transition-all w-full max-w-2xl flex flex-col max-h-[90vh]">
                                {/* Sticky Header */}
                                <div className="px-5 py-3.5 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between shrink-0">
                                    <div className="flex items-center gap-2.5 min-w-0">
                                        <div className="p-2 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 shrink-0">
                                            <Users className="h-5 w-5" />
                                        </div>
                                        <DialogTitle as="h3" className="text-base font-bold leading-6 text-slate-900 truncate">
                                            {isPublicPortal
                                                ? "Hand Over LG to Another Requestor"
                                                : singleLgMode
                                                    ? `Transfer Ownership for LG: ${lgsToProcess[0].lg_ref_number || lgsToProcess[0].bank_lg_number}`
                                                    : `Transfer Ownership for ${lgsToProcess.length} LGs`
                                            }
                                        </DialogTitle>
                                    </div>
                                    <button
                                        type="button"
                                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors focus:outline-none shrink-0"
                                        onClick={onClose}
                                    >
                                        <span className="sr-only">Close</span>
                                        <X className="h-5 w-5" aria-hidden="true" />
                                    </button>
                                </div>

                                <Formik
                                    initialValues={initialValues}
                                    validationSchema={HandoverSchema}
                                    onSubmit={handleSubmit}
                                >
                                    {({ isSubmitting, errors, touched, values, setFieldValue }) => {
                                        // Sync formik state with local state check
                                        const creatingNew = isCreatingNewOwner;

                                        return (
                                        <Form className={`flex flex-col flex-1 min-h-0 ${isGracePeriod ? 'opacity-50' : ''}`}>
                                            {/* Scrollable Body */}
                                            <div className="px-5 py-4 space-y-4 overflow-y-auto flex-1">
                                                <div className="text-xs text-slate-600 bg-slate-50 border border-slate-200/80 rounded-xl p-3 leading-relaxed">
                                                    {isPublicPortal
                                                        ? "You are about to transfer ownership of this LG to a colleague. They will receive an email with instructions to log in and accept the handover. Until they accept, you will remain the owner."
                                                        : "Force-transferring ownership will require Maker-Checker approval. Once approved, ownership is updated instantly."
                                                    }
                                                </div>

                                                {/* Public Portal ONLY allows new creation */}
                                                {!isPublicPortal && (
                                                    <div className="flex items-center space-x-2.5 bg-slate-50/80 p-3 rounded-xl border border-slate-200">
                                                        <input
                                                            id="isCreatingNewOwner"
                                                            name="isCreatingNewOwner"
                                                            type="checkbox"
                                                            checked={creatingNew}
                                                            onChange={() => {
                                                                setIsCreatingNewOwner(!creatingNew);
                                                            }}
                                                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-slate-300 rounded"
                                                            disabled={isGracePeriod}
                                                        />
                                                        <label htmlFor="isCreatingNewOwner" className="text-sm font-medium text-slate-800 cursor-pointer">
                                                            Enter a New Requestor (instead of selecting existing)
                                                        </label>
                                                    </div>
                                                )}

                                                {creatingNew ? (
                                                    <div className="space-y-3.5 border border-blue-200/80 p-4 rounded-xl bg-blue-50/40">
                                                        <h4 className="font-bold text-xs uppercase tracking-wider text-blue-800 border-b border-blue-200/60 pb-2">New Requestor Details</h4>
                                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                                                            <div>
                                                                <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address <span className="text-rose-500">*</span></label>
                                                                <Field name="newEmail" type="email" className={`block w-full px-3 py-2 rounded-xl border bg-white text-sm text-slate-800 shadow-xs focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.newEmail && touched.newEmail ? 'border-rose-500' : 'border-slate-300'}`} disabled={isGracePeriod} placeholder="colleague@company.com" />
                                                                <ErrorMessage name="newEmail" component="div" className="text-rose-600 text-xs mt-1" />
                                                            </div>
                                                            <div>
                                                                <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name</label>
                                                                <Field name="newName" type="text" className="block w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-sm text-slate-800 shadow-xs focus:outline-none focus:ring-2 focus:ring-blue-500" disabled={isGracePeriod} />
                                                            </div>
                                                            <div>
                                                                <label className="block text-xs font-semibold text-slate-700 mb-1">Department</label>
                                                                <Field name="newDepartment" type="text" className="block w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-sm text-slate-800 shadow-xs focus:outline-none focus:ring-2 focus:ring-blue-500" disabled={isGracePeriod} />
                                                            </div>
                                                            <div>
                                                                <label className="block text-xs font-semibold text-slate-700 mb-1">Job Title</label>
                                                                <Field name="newJobTitle" type="text" className="block w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-sm text-slate-800 shadow-xs focus:outline-none focus:ring-2 focus:ring-blue-500" disabled={isGracePeriod} />
                                                            </div>
                                                            <div>
                                                                <label className="block text-xs font-semibold text-slate-700 mb-1">Phone Number</label>
                                                                <Field name="newPhoneNumber" type="text" className="block w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-sm text-slate-800 shadow-xs focus:outline-none focus:ring-2 focus:ring-blue-500" disabled={isGracePeriod} />
                                                            </div>
                                                            <div>
                                                                <label className="block text-xs font-semibold text-slate-700 mb-1">Employee ID</label>
                                                                <Field name="newEmployeeId" type="text" className="block w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-sm text-slate-800 shadow-xs focus:outline-none focus:ring-2 focus:ring-blue-500" disabled={isGracePeriod} />
                                                            </div>
                                                            <div className="sm:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                                                                <div>
                                                                    <label className="block text-xs font-semibold text-slate-700 mb-1">Manager Email</label>
                                                                    <Field name="newManagerEmail" type="email" className="block w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-sm text-slate-800 shadow-xs focus:outline-none focus:ring-2 focus:ring-blue-500" disabled={isGracePeriod} />
                                                                </div>
                                                                <div>
                                                                    <label className="block text-xs font-semibold text-slate-700 mb-1">Second-Line Manager Email</label>
                                                                    <Field name="newSecondLineManagerEmail" type="email" className="block w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-sm text-slate-800 shadow-xs focus:outline-none focus:ring-2 focus:ring-blue-500" disabled={isGracePeriod} />
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div>
                                                        <label htmlFor="selectedEmail" className="block text-xs font-semibold text-slate-700 mb-1">
                                                            Select Existing Requestor
                                                        </label>
                                                        {isLoadingRequestors ? (
                                                            <p className="text-slate-500 flex items-center mt-2 text-sm"><Loader2 className="animate-spin h-4 w-4 mr-2 text-blue-600" /> Loading directory...</p>
                                                        ) : (
                                                            <Field
                                                                as="select"
                                                                name="selectedEmail"
                                                                className={`block w-full px-3 py-2 rounded-xl border bg-white text-sm text-slate-800 shadow-xs focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.selectedEmail && touched.selectedEmail ? 'border-rose-500' : 'border-slate-300'}`}
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
                                                        {errors.selectedEmail && touched.selectedEmail && <div className="text-rose-600 text-xs mt-1">{errors.selectedEmail}</div>}
                                                    </div>
                                                )}

                                                {!isPublicPortal && (
                                                    <div>
                                                        <label htmlFor="justification" className="block text-xs font-semibold text-slate-700 mb-1">
                                                            Reason / Justification <span className="text-rose-500">*</span>
                                                        </label>
                                                        <Field
                                                            as="textarea"
                                                            name="justification"
                                                            rows="2"
                                                            className={`block w-full px-3 py-2 rounded-xl border bg-white text-sm text-slate-800 shadow-xs focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.justification && touched.justification ? 'border-rose-500' : 'border-slate-300'}`}
                                                            disabled={isGracePeriod}
                                                        />
                                                        <ErrorMessage name="justification" component="div" className="text-rose-600 text-xs mt-1" />
                                                    </div>
                                                )}

                                                {errors.general && (
                                                    <div className="text-rose-700 text-xs flex items-center bg-rose-50 border border-rose-200 p-3 rounded-xl">
                                                        <AlertCircle className="h-4 w-4 mr-2 flex-shrink-0" />
                                                        {errors.general}
                                                    </div>
                                                )}
                                            </div>

                                            {/* Sticky Footer inside Form */}
                                            <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex flex-col-reverse sm:flex-row sm:justify-end gap-2.5 shrink-0">
                                                <button
                                                    type="button"
                                                    className="inline-flex justify-center items-center px-4 py-2 text-sm font-semibold rounded-xl border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 transition-colors shadow-xs"
                                                    onClick={onClose}
                                                    disabled={isSubmitting}
                                                >
                                                    Cancel
                                                </button>
                                                <GracePeriodTooltip isGracePeriod={isGracePeriod}>
                                                    <button
                                                        type="submit"
                                                        className={`inline-flex justify-center items-center px-4 py-2 text-sm font-semibold rounded-xl shadow-sm bg-blue-600 text-white hover:bg-blue-700 transition-colors ${isSubmitting || isGracePeriod ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                        disabled={isSubmitting || isGracePeriod}
                                                    >
                                                        {isSubmitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Users className="h-4 w-4 mr-2" />}
                                                        {isPublicPortal ? 'Initiate Handover' : 'Submit Transfer'}
                                                    </button>
                                                </GracePeriodTooltip>
                                            </div>
                                        </Form>
                                    )}}
                                </Formik>
                            </DialogPanel>
                        </TransitionChild>
                    </div>
                </div>
            </Dialog>
        </Transition>
    );
};

export default ChangeRequestorModal;
