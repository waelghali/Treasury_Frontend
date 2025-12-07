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
// UPDATED: Added UploadCloud and X icons
import { Loader2, UploadCloud, X } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import clsx from 'clsx';

// Reusable styling classes
const inputClassNames = "mb-2 mt-1 block w-full text-base px-3 py-2 rounded-md border border-gray-300 bg-white shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200";
const labelClassNames = "block text-sm font-medium text-gray-700";

const Button = ({ children, className, variant = 'default', size = 'default', ...props }) => {
  const baseClass = "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-500 disabled:pointer-events-none disabled:opacity-50";
  const sizeClass = size === 'sm' ? "h-8 px-3 text-xs" : size === 'lg' ? "h-10 px-8" : "h-9 px-4 py-2";
  const variantClass = clsx({
    "bg-blue-600 text-white shadow hover:bg-blue-700": variant === 'default',
    "bg-red-600 text-white shadow-sm hover:bg-red-700": variant === 'destructive',
    "border border-gray-300 bg-white shadow-sm hover:bg-gray-100": variant === 'outline',
    "bg-gray-200 text-gray-900 shadow-sm hover:bg-gray-300": variant === 'secondary',
    "hover:bg-gray-100": variant === 'ghost',
    "text-blue-600 underline-offset-4 hover:underline": variant === 'link',
  });
  return <button className={clsx(baseClass, sizeClass, variantClass, className)} {...props}>{children}</button>;
};

const Card = ({ children, className, ...props }) => <div className={clsx("bg-white p-6 rounded-lg shadow-md", className)} {...props}>{children}</div>;
const CardHeader = ({ children, ...props }) => <div className="border-b border-gray-200 pb-4 mb-4" {...props}>{children}</div>;
const CardTitle = ({ children, ...props }) => <h3 className="text-lg font-medium text-gray-800" {...props}>{children}</h3>;
const CardContent = ({ children, ...props }) => <div className="space-y-4" {...props}>{children}</div>;
const Input = ({ className, ...props }) => <input className={clsx(inputClassNames, className)} {...props} />;
const Label = ({ htmlFor, children, className, ...props }) => <label htmlFor={htmlFor} className={clsx(labelClassNames, className)} {...props}>{children}</label>;
const Textarea = ({ className, ...props }) => <textarea className={clsx(inputClassNames, className)} {...props} />;
const Select = ({ children, className, ...props }) => <select className={clsx(inputClassNames, className)} {...props}>{children}</select>;

const ToggleSwitch = ({ id, name, checked, onChange, label, className }) => (
  <label htmlFor={id} className={clsx("relative inline-flex items-center cursor-pointer mb-2", className)}>
    <input type="checkbox" name={name} id={id} checked={checked} onChange={onChange} className="sr-only peer" />
    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
    <span className="ml-3 text-sm font-medium text-gray-900">{label}</span>
  </label>
);

function SystemNotificationForm() {
    const navigate = useNavigate();
    const { id } = useParams();
    const isEditMode = Boolean(id);

    const [formData, setFormData] = useState({
        content: '',
        link: '',
        image_url: '', // UPDATED: Initialized image_url
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
    
    // UPDATED: Upload loading state
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

            setFormData({
                ...data,
                notification_type: incomingType, 
                image_url: data.image_url || '', // UPDATED: Map existing image URL
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

    // UPDATED: Image Upload Handler
    const handleImageUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Validate file type
        if (!file.type.startsWith('image/')) {
            toast.error("Please upload an image file.");
            return;
        }

        setUploading(true);
        const uploadData = new FormData();
        uploadData.append('file', file);

        try {
            // FIX 1: URL comes first, then 'post'
            // FIX 2: Removed manual 'Content-Type' header so browser handles the boundary
            const response = await apiRequest(
                '/system-owner/system-notifications/upload-image', 
                'post', 
                uploadData
            );
            
            // Handle response (assuming apiRequest returns the parsed JSON body directly)
            // If apiRequest returns the full response object, use response.data.image_url
            const imageUrl = response.image_url || response.data?.image_url;

            if (imageUrl) {
                setFormData(prev => ({ ...prev, image_url: imageUrl }));
                toast.success("Image uploaded successfully!");
            } else {
                throw new Error("No image URL returned");
            }

        } catch (error) {
            console.error("Upload failed", error);
            toast.error("Failed to upload image.");
        } finally {
            setUploading(false);
        }
    };

    // --- Case-Insensitive Role Filtering ---
    const filteredUsers = useMemo(() => {
        if (!users || users.length === 0) return [];
        
        return users.filter(user => {
            // 1. Filter by Customer (Number/String safe comparison)
            if (formData.target_customer_ids && formData.target_customer_ids.length > 0) {
                const userCustId = String(user.customer_id);
                const isMatch = formData.target_customer_ids.some(id => String(id) === userCustId);
                if (!isMatch) return false;
            }

            // 2. Filter by Role (Case-Insensitive)
            if (formData.target_roles && formData.target_roles.length > 0) {
                // Normalize user role to uppercase string for comparison
                const userRole = String(user.role).toUpperCase();
                
                // formData.target_roles contains the IDs from 'availableRoles' (e.g., 'CORPORATE_ADMIN')
                // Check if ANY selected role matches the user's role
                const isRoleMatch = formData.target_roles.some(targetRole => 
                   String(targetRole).toUpperCase() === userRole
                );
                
                if (!isRoleMatch) return false;
            }

            return true;
        });
    }, [users, formData.target_customer_ids, formData.target_roles]);
    
    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        
        const payload = {
            ...formData,
            link: formData.link || null,
            image_url: formData.image_url || null, // Ensure image_url is sent
            max_display_count: formData.display_frequency === 'repeat-x-times' ? formData.max_display_count : null,
        };
        
        try {
            if (isEditMode) {
                await updateSystemNotification(id, payload);
                toast.success('Notification updated successfully.');
            } else {
                await createSystemNotification(payload);
                toast.success('Notification created successfully.');
            }
            navigate('/system-owner/system-notifications');
        } catch (err) {
            toast.error(`Failed to ${isEditMode ? 'update' : 'create'} notification.`);
            console.error(err);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isLoading || isLoadingCustomers || isLoadingUsers) {
        return (
            <div className="flex justify-center items-center h-64">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }
    
    const getMultiSelectValue = (fieldName) => {
      const fieldData = formData[fieldName];
      return (fieldData.length === 0 && fieldData !== null) ? [""] : fieldData.map(String);
    };

    return (
        <div>
            {/* Header ... */}
            <Card>
                <CardHeader><CardTitle>Notification Details</CardTitle></CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            
                            {/* ... Type, Content ... */}
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
                                <Label htmlFor="content">Content <span className="text-red-500">*</span></Label>
                                <Textarea id="content" value={formData.content} onChange={handleChange} required />
                            </div>
                            
                            {/* UPDATED: Image Upload Section */}
                            <div className="md:col-span-2">
                                <label className={labelClassNames}>Notification Image (Optional)</label>
                                <div className="mt-1 flex items-start space-x-4">
                                    {formData.image_url ? (
                                        <div className="relative group">
                                            <div className="h-24 w-24 rounded-md border border-gray-200 overflow-hidden bg-gray-50 flex items-center justify-center">
                                                {/* We can't easily preview the GCS URI until it's signed, 
                                                    so we show a generic placeholder or just the file status 
                                                    unless you want to fetch the signed URL immediately. 
                                                    For simplicity, we show a success state here. */}
                                                <span className="text-xs text-green-600 font-medium p-2 text-center">Image Attached</span>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => setFormData(prev => ({ ...prev, image_url: '' }))}
                                                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-sm hover:bg-red-600"
                                                title="Remove image"
                                            >
                                                <X className="h-3 w-3" />
                                            </button>
                                        </div>
                                    ) : (
                                        <label className="cursor-pointer inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
                                            {uploading ? (
                                                <Loader2 className="animate-spin h-4 w-4 mr-2" />
                                            ) : (
                                                <UploadCloud className="h-4 w-4 mr-2" />
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
                                <p className="text-xs text-gray-500 mt-1">
                                    This image will appear as a banner thumbnail or a hero image in popups.
                                </p>
                            </div>

                            <div className="mb-2">
                                <Label htmlFor="link">Link (Optional)</Label>
                                <Input id="link" type="url" value={formData.link} onChange={handleChange} />
                            </div>

                            {/* --- Popup Configuration --- */}
                            <div className="md:col-span-2 bg-gray-50 p-4 rounded-md border border-gray-200">
                                <h4 className="font-medium text-gray-800 mb-2">Display Style</h4>
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

                            {/* ... Rest of the form (Dates, Frequencies, Targeting) ... */}
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
                                <Label htmlFor="start_date">Start Date <span className="text-red-500">*</span></Label>
                                <Input id="start_date" type="datetime-local" value={formData.start_date} onChange={handleChange} required />
                            </div>
                            <div className="mb-2">
                                <Label htmlFor="end_date">End Date <span className="text-red-500">*</span></Label>
                                <Input id="end_date" type="datetime-local" value={formData.end_date} onChange={handleChange} required />
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
                            
                             <hr className="md:col-span-2 my-2 border-gray-200" />

                            {/* ... Targeting Selects (Customer, Role, User) ... */}
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
                                <div className="text-xs text-gray-500 mb-1">Showing {filteredUsers.length} users based on current filters.</div>
                                <select id="target_user_ids" multiple value={getMultiSelectValue('target_user_ids')} onChange={(e) => handleMultiSelectChange(e, 'target_user_ids')} className={clsx(inputClassNames, "h-32")} disabled={isLoadingUsers}>
                                    <option value="">All Users</option>
                                    {filteredUsers.map((u) => (<option key={u.id} value={u.id}>{u.email}</option>))}
                                </select>
                            </div>
                        </div>
                        
                        <div className="flex justify-end space-x-3 mt-6">
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