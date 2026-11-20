import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  getSystemNotificationById,
  createSystemNotification,
  updateSystemNotification,
  apiRequest,
  getAllUsersForSystemOwner,
} from '../../../services/apiService';
import { Loader2, UploadCloud, X } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import clsx from 'clsx';

// Reusable styling classes
const inputClassNames = "mt-1 block w-full text-sm px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-800 shadow-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors";
const labelClassNames = "block text-xs font-semibold text-slate-700 mb-0.5";

const Button = ({ children, className, variant = 'default', size = 'default', ...props }) => {
  const baseClass = "inline-flex items-center justify-center whitespace-nowrap rounded-xl text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:pointer-events-none disabled:opacity-50";
  const sizeClass = size === 'sm' ? "h-8 px-3 text-xs" : size === 'lg' ? "h-10 px-6" : "h-9 px-4 py-2";
  const variantClass = clsx({
    "bg-indigo-600 text-white shadow-sm hover:bg-indigo-700": variant === 'default',
    "bg-rose-600 text-white shadow-sm hover:bg-rose-700": variant === 'destructive',
    "border border-slate-300 bg-white text-slate-700 shadow-xs hover:bg-slate-50": variant === 'outline',
    "bg-slate-100 text-slate-800 shadow-xs hover:bg-slate-200": variant === 'secondary',
    "hover:bg-slate-100 text-slate-700": variant === 'ghost',
    "text-indigo-600 underline-offset-4 hover:underline": variant === 'link',
  });
  return <button className={clsx(baseClass, sizeClass, variantClass, className)} {...props}>{children}</button>;
};

const Card = ({ children, className, ...props }) => <div className={clsx("bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm", className)} {...props}>{children}</div>;
const CardHeader = ({ children, ...props }) => <div className="border-b border-slate-200 pb-3.5 mb-4" {...props}>{children}</div>;
const CardTitle = ({ children, ...props }) => <h3 className="text-lg font-bold text-slate-900" {...props}>{children}</h3>;
const CardContent = ({ children, ...props }) => <div className="space-y-4" {...props}>{children}</div>;
const Input = ({ className, ...props }) => <input className={clsx(inputClassNames, className)} {...props} />;
const Label = ({ htmlFor, children, className, ...props }) => <label htmlFor={htmlFor} className={clsx(labelClassNames, className)} {...props}>{children}</label>;
const Textarea = ({ className, ...props }) => <textarea className={clsx(inputClassNames, className)} {...props} />;
const Select = ({ children, className, ...props }) => <select className={clsx(inputClassNames, className)} {...props}>{children}</select>;

const ToggleSwitch = ({ id, name, checked, onChange, label, className }) => (
  <label htmlFor={id} className={clsx("relative inline-flex items-center cursor-pointer py-1", className)}>
    <input type="checkbox" name={name} id={id} checked={checked} onChange={onChange} className="sr-only peer" />
    <div className="w-11 h-6 bg-slate-200 shrink-0 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-indigo-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[6px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
    <span className="ml-3 text-sm font-medium text-slate-800">{label}</span>
  </label>
);

function SystemNotificationForm() {
    const navigate = useNavigate();
    const { id } = useParams();
    const isEditMode = Boolean(id);

    const [formData, setFormData] = useState({
        content: '',
        link: '',
        image_url: '', // For display purposes (preview URL)
        _gcs_uri: '', // The permanent gs:// URI to submit
        _original_gcs_uri: '', // Store the original GCS URI from backend
        notification_type: 'system_info', 
        start_date: '',
        end_date: '',
        is_active: true,
        animation_type: 'fade',
        display_frequency: 'once-per-login',
        max_display_count: 3,
        target_customer_ids: [],
        target_user_ids: [],
        target_roles: [],
        is_popup: false,
        popup_action_label: 'Acknowledge',
    });
    
    const [uploading, setUploading] = useState(false);
    const [customers, setCustomers] = useState([]);
    const [users, setUsers] = useState([]);
    const [isLoadingCustomers, setIsLoadingCustomers] = useState(false);
    const [isLoadingUsers, setIsLoadingUsers] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const availableRoles = [
      { id: 'SYSTEM_OWNER', name: 'System Owner' },
      { id: 'CORPORATE_ADMIN', name: 'Corporate Admin' },
      { id: 'END_USER', name: 'End User' },
      { id: 'VIEWER', name: 'Viewer' },
    ];
    
    useEffect(() => {
        const fetchCustomers = async () => {
            setIsLoadingCustomers(true);
            try {
                const data = await apiRequest('/system-owner/customers/');
                setCustomers(data);
            } catch (err) {
                console.error("Failed to fetch customers:", err);
                toast.error("Failed to load customer list.");
            } finally {
                setIsLoadingCustomers(false);
            }
        };

        const fetchUsers = async () => {
          setIsLoadingUsers(true);
          try {
              const data = await getAllUsersForSystemOwner();
              setUsers(data);
          } catch (err) {
              console.error("Failed to fetch users:", err);
          } finally {
              setIsLoadingUsers(false);
          }
        };

        fetchCustomers();
        fetchUsers();
    }, []);

    useEffect(() => {
        if (isEditMode) {
            fetchNotification();
        }
    }, [isEditMode]);

    const fetchNotification = async () => {
        setIsLoading(true);
        try {
            const data = await getSystemNotificationById(id);
            let incomingType = data.notification_type || data.type || 'system_info'; 
            if (incomingType === 'system') incomingType = 'system_info';

            // FIXED: Store both the signed URL (for display) and extract the original GCS URI
            const imageUrl = data.image_url || '';
            const originalGcsUri = extractGcsUriFromSignedUrl(imageUrl);

            setFormData({
                ...data,
                notification_type: incomingType, 
                image_url: imageUrl, // Signed URL for display
                _gcs_uri: '', // Empty initially (will be set if user uploads new image)
                _original_gcs_uri: originalGcsUri, // Store the permanent URI
                start_date: format(parseISO(data.start_date), "yyyy-MM-dd'T'HH:mm"),
                end_date: format(parseISO(data.end_date), "yyyy-MM-dd'T'HH:mm"),
                target_customer_ids: data.target_customer_ids || [],
                target_user_ids: data.target_user_ids || [],
                target_roles: data.target_roles || [],
                is_popup: data.is_popup || false,
                popup_action_label: data.popup_action_label || 'Acknowledge',
            });
        } catch (err) {
            toast.error('Failed to fetch notification details.');
            navigate('/system-owner/system-notifications');
        } finally {
            setIsLoading(false);
        }
    };

    // ADDED: Helper function to extract gs:// URI from signed URL
    const extractGcsUriFromSignedUrl = (url) => {
        if (!url) return '';
        
        // If already a gs:// URI, return it
        if (url.startsWith('gs://')) return url;
        
        // Try to extract from signed URL
        // Pattern: .../BUCKET_NAME/path/to/file.ext?...
        const bucketPattern = /\/lg_custody_bucket\/([^?]+)/;
        const match = url.match(bucketPattern);
        
        if (match && match[1]) {
            return `gs://lg_custody_bucket/${match[1]}`;
        }
        
        // If we can't extract, return empty (safer than returning the signed URL)
        return '';
    };

    const handleChange = (e) => {
        const { id, value, type, checked } = e.target;
        setFormData((prev) => ({ 
            ...prev, 
            [id]: type === 'checkbox' ? checked : value 
        }));
    };

    const handleMultiSelectChange = (e, fieldName) => {
        const selectedValues = Array.from(e.target.options)
            .filter(option => option.selected)
            .map(option => option.value);
        const isAllSelected = selectedValues.includes("");

        if (isAllSelected) {
            setFormData(prev => ({ ...prev, [fieldName]: [] }));
        } else {
            const value = selectedValues.map(v => 
                (fieldName === 'target_user_ids' || fieldName === 'target_customer_ids') ? Number(v) : v
            );
            setFormData(prev => ({ ...prev, [fieldName]: value }));
        }
    };

    const handleImageUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setUploading(true);
        const uploadData = new FormData();
        uploadData.append('file', file);

        try {
            const response = await apiRequest(
                '/system-owner/system-notifications/upload-image',
                'post',
                uploadData
            );
            
            const data = response.data || response;

            // ADDED: Console logs for debugging
            console.log('=== UPLOAD RESPONSE ===');
            console.log('gcs_uri:', data.gcs_uri);
            console.log('image_url (signed):', data.image_url);

            if (data.gcs_uri && data.image_url) {
                setFormData(prev => ({ 
                    ...prev, 
                    image_url: data.image_url, // Signed URL for preview
                    _gcs_uri: data.gcs_uri, // Permanent URI for submission
                    _original_gcs_uri: data.gcs_uri // Update original as well since it's new
                }));
                toast.success("Image uploaded successfully");
            } else {
                // ADDED: Error log for missing fields
                console.error('Missing gcs_uri or image_url in response:', data);
                toast.error("Upload response missing required fields");
            }

        } catch (error) {
            console.error("Upload failed", error);
            toast.error("Failed to upload image");
        } finally {
            setUploading(false);
        }
    };

    const filteredUsers = useMemo(() => {
        if (!users || users.length === 0) return [];
        
        return users.filter(user => {
            if (formData.target_customer_ids && formData.target_customer_ids.length > 0) {
                const userCustId = String(user.customer_id);
                const isMatch = formData.target_customer_ids.some(id => String(id) === userCustId);
                if (!isMatch) return false;
            }

            if (formData.target_roles && formData.target_roles.length > 0) {
                const userRole = String(user.role).toUpperCase();
                const isRoleMatch = formData.target_roles.some(targetRole => 
                   String(targetRole).toUpperCase() === userRole
                );
                if (!isRoleMatch) return false;
            }

            return true;
        });
    }, [users, formData.target_customer_ids, formData.target_roles]);
    
    // FIXED: Proper handling of image URL in submission
    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!formData.content) {
             toast.error("Content is required");
             return;
        }

        setIsSubmitting(true);
        
        // ADDED: Console logs for debugging
        console.log('=== BEFORE SUBMIT ===');
        console.log('formData.image_url:', formData.image_url);
        console.log('formData._gcs_uri:', formData._gcs_uri);
        console.log('formData._original_gcs_uri:', formData._original_gcs_uri);

        try {
            const payload = { ...formData };
            
            // DECISION LOGIC:
            // 1. If user uploaded a new image (_gcs_uri is set), use that
            // 2. Otherwise, use the original GCS URI (not the signed URL)
            // 3. If neither exists, set to empty string
            if (payload._gcs_uri) {
                // New upload - use the new permanent URI
                payload.image_url = payload._gcs_uri;
                console.log('✅ Using NEW upload URI:', payload.image_url);
            } else if (payload._original_gcs_uri) {
                // Existing image - use the original permanent URI
                payload.image_url = payload._original_gcs_uri;
                console.log('✅ Using ORIGINAL URI:', payload.image_url);
            } else {
                // No image at all
                payload.image_url = '';
                console.log('⚠️ No image URI available');
            }
            
            // ADDED: Validation check
            if (payload.image_url && !payload.image_url.startsWith('gs://')) {
                console.error('❌ ERROR: About to submit non-GCS URI:', payload.image_url);
                toast.error('Invalid image URI format. Please re-upload the image.');
                setIsSubmitting(false);
                return;
            }

            // Clean up temporary fields
            delete payload._gcs_uri;
            delete payload._original_gcs_uri;
            
            // ADDED: Console logs for debugging
            console.log('=== SUBMITTING PAYLOAD ===');
            console.log('payload.image_url:', payload.image_url);
            console.log('Full payload:', JSON.stringify(payload, null, 2));

            if (isEditMode) {
                const response = await updateSystemNotification(id, payload);
                // ADDED: Console logs for debugging
                console.log('=== UPDATE RESPONSE ===');
                console.log('Returned image_url:', response.image_url);
                
                toast.success('Notification updated successfully.');
                // Refresh to get fresh signed URLs
                navigate('/system-owner/system-notifications');
            } else {
                const response = await createSystemNotification(payload);
                // ADDED: Console logs for debugging
                console.log('=== CREATE RESPONSE ===');
                console.log('Returned image_url:', response.image_url);
                
                toast.success('Notification created successfully.');
                navigate('/system-owner/system-notifications');
            }
        } catch (err) {
            console.error("Submission failed", err);
            const errorMessage = err.response?.data?.detail || err.response?.data?.message || 'An unexpected error occurred during submission.';
            toast.error(`Submission failed: ${errorMessage}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isLoading || isLoadingCustomers || isLoadingUsers) {
        return (
            <div className="flex flex-col justify-center items-center py-16">
                <Loader2 className="h-8 w-8 text-indigo-600 animate-spin" />
                <p className="text-sm text-slate-500 mt-3">Loading notification form...</p>
            </div>
        );
    }
    
    const getMultiSelectValue = (fieldName) => {
      const fieldData = formData[fieldName];
      return (fieldData.length === 0 && fieldData !== null) ? [""] : fieldData.map(String);
    };

    return (
        <div className="max-w-4xl mx-auto">
            <Card>
                <CardHeader><CardTitle>{isEditMode ? 'Edit' : 'Create'} System Notification</CardTitle></CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            
                            <div className="md:col-span-2">
                                <Label htmlFor="notification_type">Notification Type</Label>
                                <Select id="notification_type" value={formData.notification_type} onChange={handleChange}>
                                    <option value="system_info">System Announcement (Blue)</option>
                                    <option value="system_critical">System Critical / Alert (Red)</option>
                                    <option value="cbe">CBE Announcement (Teal)</option>
                                    <option value="news">Latest News (Green)</option>
                                    <option value="ad">Advertisement (Purple)</option>
                                </Select>
                            </div>
                            
                            <div className="md:col-span-2">
                                <Label htmlFor="content">Content <span className="text-rose-500">*</span></Label>
                                <Textarea id="content" value={formData.content} onChange={handleChange} required />
                            </div>
                            
                            <div className="md:col-span-2">
                                <label className={labelClassNames}>Notification Image (Optional)</label>
                                <div className="mt-1.5 flex items-start space-x-4">
                                    {formData.image_url ? (
                                        <div className="relative group">
                                            <div className="h-24 w-24 rounded-xl border border-slate-200 overflow-hidden bg-slate-50 flex items-center justify-center shadow-sm">
                                                <img 
                                                    src={formData.image_url} 
                                                    alt="Notification Preview" 
                                                    className="object-cover h-full w-full"
                                                />
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => setFormData(prev => ({ 
                                                    ...prev, 
                                                    image_url: '', 
                                                    _gcs_uri: '',
                                                    _original_gcs_uri: ''
                                                }))}
                                                className="absolute -top-2 -right-2 bg-rose-600 text-white rounded-full p-1 shadow-sm hover:bg-rose-700 transition-colors"
                                                title="Remove image"
                                            >
                                                <X className="h-3 w-3" />
                                            </button>
                                        </div>
                                    ) : (
                                        <label className="cursor-pointer inline-flex items-center px-4 py-2 border border-slate-300 rounded-xl shadow-sm text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 transition-colors">
                                            {uploading ? (
                                                <Loader2 className="animate-spin h-4 w-4 mr-2 text-indigo-600" />
                                            ) : (
                                                <UploadCloud className="h-4 w-4 mr-2 text-slate-500" />
                                            )}
                                            {uploading ? 'Uploading...' : 'Upload Image'}
                                            <input 
                                                type="file" 
                                                className="hidden" 
                                                accept="image/*" 
                                                onChange={handleImageUpload} 
                                                disabled={uploading} 
                                            />
                                        </label>
                                    )}
                                </div>
                                <p className="text-xs text-slate-500 mt-1.5">
                                    This image will appear as a banner thumbnail or a hero image in popups.
                                </p>
                            </div>

                            <div className="mb-2">
                                <Label htmlFor="link">Link (Optional)</Label>
                                <Input id="link" type="url" value={formData.link} onChange={handleChange} />
                            </div>

                            <div className="md:col-span-2 bg-slate-50/80 p-4 rounded-xl border border-slate-200/80">
                                <h4 className="font-semibold text-sm text-slate-800 mb-2">Display Style</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="flex items-center space-x-2 mt-2">
                                        <ToggleSwitch
                                            id="is_popup"
                                            name="is_popup"
                                            checked={formData.is_popup}
                                            onChange={handleChange}
                                            label="Show as Modal Popup (Blocking)"
                                            className="mb-0"
                                        />
                                    </div>
                                    
                                    {formData.is_popup && (
                                        <div>
                                            <Label htmlFor="popup_action_label">Action Button Label</Label>
                                            <Input 
                                                id="popup_action_label" 
                                                value={formData.popup_action_label} 
                                                onChange={handleChange}
                                                placeholder="e.g., I Agree, Acknowledge"
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="mb-2">
                                <Label htmlFor="start_date">Start Date <span className="text-rose-500">*</span></Label>
                                <Input id="start_date" type="datetime-local" value={formData.start_date} onChange={handleChange} required />
                            </div>
                            <div className="mb-2">
                                <Label htmlFor="end_date">End Date <span className="text-rose-500">*</span></Label>
                                <Input id="end_date" type="datetime-local" value={formData.end_date} onChange={handleChange} required />
                            </div>

                            <div className="mb-2">
                                <Label htmlFor="animation_type">Animation Type</Label>
                                <Select id="animation_type" value={formData.animation_type} onChange={handleChange}>
                                    <option value="fade">Fade In</option>
                                    <option value="slide-left">Slide In (Left)</option>
                                    <option value="scroll-left">Slide In (Right)</option>
                                    <option value="zoom">Zoom In</option>
                                    <option value="bounce">Bounce In</option>
                                </Select>
                            </div>
                            <div className="mb-2">
                                <Label htmlFor="display_frequency">Display Frequency</Label>
                                <Select id="display_frequency" value={formData.display_frequency} onChange={handleChange}>
                                    <option value="once">Once</option>
                                    <option value="once-per-login">Once Per Login</option>
                                    <option value="repeat-x-times">Repeat Up to X Times</option>
                                </Select>
                            </div>


                            {formData.display_frequency === 'repeat-x-times' && (
                                <div className="mb-2">
                                    <Label htmlFor="max_display_count">Max Display Count</Label>
                                    <Input id="max_display_count" type="number" min="1" value={formData.max_display_count} onChange={handleChange} />
                                </div>
                            )}

                            <div className="flex items-center space-x-2 mt-4 md:col-span-2">
                                <ToggleSwitch id="is_active" name="is_active" checked={formData.is_active} onChange={handleChange} label="Active Status" />
                            </div>
                            
                            <hr className="md:col-span-2 my-2 border-slate-200" />

                            <div className="mb-2">
                                <Label htmlFor="target_customer_ids">Target Customer(s) (Optional)</Label>
                                <select id="target_customer_ids" multiple value={getMultiSelectValue('target_customer_ids')} onChange={(e) => handleMultiSelectChange(e, 'target_customer_ids')} className={clsx(inputClassNames, "h-32")} disabled={isLoadingCustomers}>
                                    <option value="">All Customers</option>
                                    {customers.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
                                </select>
                            </div>
                            <div className="mb-2">
                                <Label htmlFor="target_roles">Target Role(s) (Optional)</Label>
                                <select id="target_roles" multiple value={getMultiSelectValue('target_roles')} onChange={(e) => handleMultiSelectChange(e, 'target_roles')} className={clsx(inputClassNames, "h-32")}>
                                    <option value="">All Roles</option>
                                    {availableRoles.map((r) => (<option key={r.id} value={r.id}>{r.name}</option>))}
                                </select>
                            </div>
                            <div className="mb-2">
                                <Label htmlFor="target_user_ids">Target User(s) (Optional)</Label>
                                <div className="text-xs text-slate-500 mb-1">Showing {filteredUsers.length} users based on current filters.</div>
                                <select id="target_user_ids" multiple value={getMultiSelectValue('target_user_ids')} onChange={(e) => handleMultiSelectChange(e, 'target_user_ids')} className={clsx(inputClassNames, "h-32")} disabled={isLoadingUsers}>
                                    <option value="">All Users</option>
                                    {filteredUsers.map((u) => (<option key={u.id} value={u.id}>{u.email}</option>))}
                                </select>
                            </div>
                        </div>
                        
                        <div className="flex justify-end space-x-3 mt-6 pt-4 border-t border-slate-200">
                            <Button type="button" onClick={() => navigate('/system-owner/system-notifications')} variant="outline">Cancel</Button>
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting && <Loader2 className="animate-spin mr-2 h-4 w-4" />}
                                {isEditMode ? 'Update Notification' : 'Create Notification'}
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}

export default SystemNotificationForm;