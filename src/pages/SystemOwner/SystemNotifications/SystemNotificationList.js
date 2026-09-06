import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { 
  getSystemNotifications, 
  getSystemNotificationTypes,
  deleteSystemNotification, 
  restoreSystemNotification,
  updateSystemNotification,
  getSystemNotificationAnalytics,
  getAllUsersForSystemOwner,
  apiRequest
} from '../../../services/apiService';
import { format } from 'date-fns';
import { 
  PlusCircle, Edit, Trash, RotateCcw, Loader2, ToggleRight, ToggleLeft, 
  BarChart2, X, Eye, Search, Filter, Users, Building2, Bot, 
  Megaphone, ChevronDown, ChevronUp, ExternalLink, Sparkles, RefreshCw
} from 'lucide-react';
import clsx from 'clsx';

// --- UI HELPERS & ATOMS ---

const Button = ({ children, className, variant = 'default', size = 'default', ...props }) => {
  const baseClass = "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-500 disabled:pointer-events-none disabled:opacity-50";
  const sizeClass = size === 'sm' ? "h-8 px-2.5 text-xs" : size === 'lg' ? "h-10 px-8" : "h-9 px-4 py-2";

  const variantClass = clsx({
    "bg-blue-600 text-white shadow hover:bg-blue-700": variant === 'default',
    "bg-red-600 text-white shadow-sm hover:bg-red-700": variant === 'destructive',
    "border border-gray-300 bg-white text-slate-700 shadow-sm hover:bg-gray-50": variant === 'outline',
    "bg-gray-200 text-gray-900 shadow-sm hover:bg-gray-300": variant === 'secondary',
    "p-1 rounded-md text-gray-600 hover:bg-gray-100": variant === 'icon-default',
    "p-1 rounded-md text-blue-600 hover:bg-blue-100": variant === 'icon-blue',
    "p-1 rounded-md text-purple-600 hover:bg-purple-100": variant === 'icon-purple',
    "p-1 rounded-md text-red-600 hover:bg-red-100": variant === 'icon-red',
    "p-1 rounded-md text-green-600 hover:bg-green-100": variant === 'icon-green',
    "p-1 rounded-md text-yellow-600 hover:bg-yellow-100": variant === 'icon-yellow',
    "hover:bg-gray-100": variant === 'ghost',
    "text-blue-600 underline-offset-4 hover:underline": variant === 'link',
  });

  return (
    <button className={clsx(baseClass, sizeClass, variantClass, className)} {...props}>
      {children}
    </button>
  );
};

const Table = ({ children, className, ...props }) => (
  <div className="overflow-x-auto bg-white rounded-xl shadow-sm border border-gray-200">
    <table className={clsx("min-w-full divide-y divide-gray-200", className)} {...props}>
      {children}
    </table>
  </div>
);

const TableHeader = ({ children, className, ...props }) => (
  <thead className={clsx("bg-slate-50 border-b border-gray-200", className)} {...props}>
    {children}
  </thead>
);

const TableBody = ({ children, className, ...props }) => (
  <tbody className={clsx("bg-white divide-y divide-gray-200", className)} {...props}>
    {children}
  </tbody>
);

const TableRow = ({ children, className, isDeleted, ...props }) => (
  <tr 
    className={clsx(
      "cursor-pointer hover:bg-blue-50/40 transition-colors",
      isDeleted && "opacity-60 bg-gray-50",
      className
    )} 
    {...props}>
    {children}
  </tr>
);

const TableHead = ({ children, className, ...props }) => (
  <th scope="col" className={clsx("px-5 py-3.5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider", className)} {...props}>
    {children}
  </th>
);

const TableCell = ({ children, className, ...props }) => (
  <td className={clsx("px-5 py-4 text-sm text-slate-600", className)} {...props}>
    {children}
  </td>
);

const Badge = ({ children, className, variant = 'default', ...props }) => {
  const variantClass = clsx({
    "bg-blue-100 text-blue-800 border-blue-200": variant === 'default',
    "bg-red-100 text-red-800 border-red-200": variant === 'destructive',
    "bg-gray-100 text-gray-700 border-gray-200": variant === 'secondary',
    "border border-gray-300 text-gray-700": variant === 'outline',
    "bg-emerald-100 text-emerald-800 border-emerald-200": variant === 'success',
    "bg-amber-100 text-amber-800 border-amber-200": variant === 'warning',
    "bg-purple-100 text-purple-800 border-purple-200": variant === 'purple',
  });
  return (
    <span className={clsx("px-2.5 py-0.5 inline-flex items-center text-xs font-medium rounded-full border", variantClass, className)} {...props}>
      {children}
    </span>
  );
};

const AlertDialog = ({ title, description, onConfirm, onCancel, confirmText = 'Continue' }) => {
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-gray-900 bg-opacity-50 flex items-center justify-center backdrop-blur-sm">
      <div className="bg-white p-6 rounded-xl shadow-2xl w-full max-w-sm mx-4 animate-in fade-in zoom-in-95">
        <h3 className="text-lg font-bold text-gray-900">{title}</h3>
        <p className="mt-2 text-sm text-gray-600">{description}</p>
        <div className="mt-6 flex justify-end space-x-3">
          <Button variant="outline" onClick={onCancel}>Cancel</Button>
          <Button variant="destructive" onClick={onConfirm}>{confirmText}</Button>
        </div>
      </div>
    </div>
  );
};

// --- NOTIFICATION INSPECTION MODAL ---

const NotificationDetailsModal = ({ isOpen, onClose, notification, onOpenAnalytics }) => {
  if (!isOpen || !notification) return null;

  const isAutomated = notification.created_by_user_name === 'System Automation' ||
    notification.notification_type?.includes('EXPIRED') ||
    notification.notification_type?.includes('ALERT');

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-gray-900 bg-opacity-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full mx-auto overflow-hidden border border-gray-200">
        
        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-slate-50/60">
          <div className="flex items-center gap-2.5">
            {isAutomated ? (
              <span className="p-2 rounded-xl bg-purple-100 text-purple-700">
                <Bot className="w-5 h-5" />
              </span>
            ) : (
              <span className="p-2 rounded-xl bg-blue-100 text-blue-700">
                <Megaphone className="w-5 h-5" />
              </span>
            )}
            <div>
              <h3 className="text-lg font-bold text-slate-800">Notification Overview</h3>
              <p className="text-xs text-slate-500">ID #{notification.id} · Type: {notification.notification_type || 'system_info'}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-gray-100 transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          
          {/* Content Box */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 space-y-2">
            <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Message Content</span>
            <p className="text-sm font-medium text-slate-900 leading-relaxed whitespace-pre-wrap">
              {notification.content}
            </p>
            {notification.link && (
              <div className="pt-2 border-t border-slate-200/60 flex items-center gap-1.5 text-xs text-blue-600 font-medium">
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Action Link: {notification.link}</span>
              </div>
            )}
          </div>

          {/* Metadata Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
            <div className="bg-white p-3 rounded-lg border border-gray-200">
              <span className="text-slate-400 uppercase font-semibold">Origin</span>
              <p className="text-slate-800 font-bold mt-1 flex items-center gap-1">
                {isAutomated ? <Bot className="w-3.5 h-3.5 text-purple-600" /> : <Megaphone className="w-3.5 h-3.5 text-blue-600" />}
                {notification.created_by_user_name || 'System'}
              </p>
              {notification.created_by_user_email && (
                <p className="text-[11px] text-slate-500 truncate">{notification.created_by_user_email}</p>
              )}
            </div>

            <div className="bg-white p-3 rounded-lg border border-gray-200">
              <span className="text-slate-400 uppercase font-semibold">Created At</span>
              <p className="text-slate-800 font-bold mt-1">
                {format(new Date(notification.created_at), 'MMM dd, yyyy HH:mm')}
              </p>
            </div>

            <div className="bg-white p-3 rounded-lg border border-gray-200">
              <span className="text-slate-400 uppercase font-semibold">Status</span>
              <p className="text-slate-800 font-bold mt-1">
                {notification.is_deleted ? 'Soft-Deleted' : notification.is_active ? 'Active' : 'Inactive'}
              </p>
            </div>

            <div className="bg-white p-3 rounded-lg border border-gray-200">
              <span className="text-slate-400 uppercase font-semibold">Active Window</span>
              <p className="text-slate-800 font-medium mt-1">
                {format(new Date(notification.start_date), 'MMM dd, yyyy')}
              </p>
              <p className="text-[11px] text-slate-400">until {format(new Date(notification.end_date), 'MMM dd, yyyy')}</p>
            </div>

            <div className="bg-white p-3 rounded-lg border border-gray-200">
              <span className="text-slate-400 uppercase font-semibold">Display Frequency</span>
              <p className="text-slate-800 font-bold mt-1 uppercase">
                {notification.display_frequency || 'once'}
              </p>
            </div>

            <div className="bg-white p-3 rounded-lg border border-gray-200">
              <span className="text-slate-400 uppercase font-semibold">Popup Modal</span>
              <p className="text-slate-800 font-bold mt-1">
                {notification.is_popup ? 'Yes (Blocking)' : 'No (Banner)'}
              </p>
            </div>
          </div>

          {/* Delivery & Targeting Breakdown */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-600" /> Delivery Target Breakdown
            </h4>

            {/* Targeted Customers */}
            <div className="bg-gray-50/80 p-3.5 rounded-xl border border-gray-200 space-y-1.5">
              <span className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-slate-500" />
                Target Customer Tenants:
              </span>
              {notification.target_customer_names && notification.target_customer_names.length > 0 ? (
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {notification.target_customer_names.map((name, i) => (
                    <span key={i} className="px-2.5 py-1 rounded-md bg-blue-50 text-blue-700 border border-blue-200 text-xs font-medium">
                      🏢 {name}
                    </span>
                  ))}
                </div>
              ) : (
                <span className="text-xs text-slate-500 italic">🌐 All Customer Tenants (Global Broadcast)</span>
              )}
            </div>

            {/* Targeted Users */}
            <div className="bg-gray-50/80 p-3.5 rounded-xl border border-gray-200 space-y-1.5">
              <span className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-slate-500" />
                Target Specific Users:
              </span>
              {notification.target_user_emails && notification.target_user_emails.length > 0 ? (
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {notification.target_user_emails.map((email, i) => (
                    <span key={i} className="px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-medium">
                      👤 {email}
                    </span>
                  ))}
                </div>
              ) : (
                <span className="text-xs text-slate-500 italic">🌐 All Users in targeted tenant(s)</span>
              )}
            </div>

            {/* Target Roles */}
            {notification.target_roles && notification.target_roles.length > 0 && (
              <div className="bg-gray-50/80 p-3.5 rounded-xl border border-gray-200 space-y-1.5">
                <span className="text-xs font-semibold text-slate-600">Target Roles:</span>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {notification.target_roles.map((role, i) => (
                    <span key={i} className="px-2 py-0.5 rounded-md bg-slate-200 text-slate-700 text-xs font-medium">
                      {role}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-gray-200 flex items-center justify-between">
          <Button 
            variant="outline" 
            onClick={() => { onClose(); onOpenAnalytics(notification); }}
            className="flex items-center gap-1.5 text-purple-700 border-purple-200 hover:bg-purple-50"
          >
            <BarChart2 className="w-4 h-4" /> View Readership Analytics
          </Button>
          <Button variant="default" onClick={onClose}>Close</Button>
        </div>
      </div>
    </div>
  );
};

// --- ANALYTICS DIALOG COMPONENT ---
const AnalyticsDialog = ({ isOpen, onClose, data, isLoading, notificationTitle }) => {
  if (!isOpen) return null;
  const maxViews = data?.logs?.reduce((max, log) => Math.max(max, log.view_count), 0) || 1;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-gray-900 bg-opacity-50 flex items-center justify-center p-4 transition-opacity backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl mx-auto flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200 border border-gray-200">
        
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-100">
          <div>
            <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <BarChart2 className="h-6 w-6 text-blue-600" />
              Analytics Report
            </h3>
            <p className="text-sm text-gray-500 mt-1 max-w-md truncate">
              {notificationTitle || "System Notification"}
            </p>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-gray-50/50">
          {isLoading ? (
             <div className="flex flex-col justify-center items-center h-64 space-y-4">
               <Loader2 className="h-10 w-10 text-blue-600 animate-spin" />
               <p className="text-sm text-gray-500">Gathering insights...</p>
             </div>
          ) : !data ? (
            <div className="text-center py-12">
              <BarChart2 className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No analytics data available.</p>
            </div>
          ) : (
            <div className="space-y-8">
              {/* Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500 uppercase tracking-wide">Total Views</p>
                    <p className="text-4xl font-extrabold text-blue-600 mt-2">{data.total_views}</p>
                  </div>
                  <div className="p-3 bg-blue-50 rounded-full">
                    <Eye className="h-6 w-6 text-blue-600" />
                  </div>
                </div>
                
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500 uppercase tracking-wide">Unique Viewers</p>
                    <p className="text-4xl font-extrabold text-purple-600 mt-2">{data.unique_viewers}</p>
                  </div>
                  <div className="p-3 bg-purple-50 rounded-full">
                    <BarChart2 className="h-6 w-6 text-purple-600" />
                  </div>
                </div>
              </div>

              {/* View Logs Table */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100">
                  <h4 className="text-base font-semibold text-gray-800">Viewer Engagement</h4>
                </div>
                
                {data.logs && data.logs.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-100">
                      <thead className="bg-gray-50/50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">User</th>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase w-1/3">Engagement (Views)</th>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Last Interaction</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-100">
                        {data.logs.map((log) => (
                          <tr key={log.id} className="hover:bg-blue-50/30 transition-colors">
                            <td className="px-6 py-4 text-sm font-medium text-gray-900">
                              {log.user_email || `User ID: ${log.user_id}`}
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <span className="text-sm font-bold text-gray-700 w-6">{log.view_count}</span>
                                <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden max-w-[150px]">
                                  <div 
                                    className="h-full bg-blue-500 rounded-full transition-all duration-500 ease-out"
                                    style={{ width: `${(log.view_count / maxViews) * 100}%` }}
                                  />
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-500">
                              {format(new Date(log.last_viewed_at), 'MMM dd, HH:mm')}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="p-8 text-center text-gray-500 italic">No views recorded yet.</div>
                )}
              </div>
            </div>
          )}
        </div>
        
        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex justify-end rounded-b-xl">
          <Button variant="outline" onClick={onClose}>Close Report</Button>
        </div>
      </div>
    </div>
  );
};


// --- MAIN PAGE COMPONENT ---

function SystemNotificationList({ onLogout }) {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Metadata for filter dropdowns
  const [customers, setCustomers] = useState([]);
  const [users, setUsers] = useState([]);
  const [availableTypes, setAvailableTypes] = useState([]);

  // Multi-criteria Query Filter State
  const [filters, setFilters] = useState({
    search: '',
    status: 'ALL',
    origin: 'ALL', // 'ALL' | 'AUTOMATED' | 'MANUAL'
    customerId: '',
    targetUserId: '',
    notificationType: 'ALL',
    createdFrom: '',
    createdTo: '',
    includeBroadcast: true,
  });

  const [isAdvancedFiltersOpen, setIsAdvancedFiltersOpen] = useState(false);

  // Modal States
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showRestoreConfirm, setShowRestoreConfirm] = useState(false);
  const [showToggleConfirm, setShowToggleConfirm] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  // Analytics States
  const [showAnalyticsModal, setShowAnalyticsModal] = useState(false);
  const [analyticsData, setAnalyticsData] = useState(null);
  const [isLoadingAnalytics, setIsLoadingAnalytics] = useState(false);

  // Load metadata on mount
  useEffect(() => {
    const fetchMetadata = async () => {
      try {
        const [custRes, userRes, typesRes] = await Promise.allSettled([
          apiRequest('/system-owner/customers/'),
          getAllUsersForSystemOwner(),
          getSystemNotificationTypes()
        ]);
        if (custRes.status === 'fulfilled') setCustomers(custRes.value || []);
        if (userRes.status === 'fulfilled') setUsers(userRes.value || []);
        if (typesRes.status === 'fulfilled') setAvailableTypes(typesRes.value || []);
      } catch (err) {
        console.error("Failed to load filter metadata", err);
      }
    };
    fetchMetadata();
  }, []);

  // Fetch notifications with active filters
  const fetchNotifications = useCallback(async (customFilters = filters) => {
    setIsLoading(true);
    setError(null);
    try {
      const queryParams = {};
      if (customFilters.search?.trim()) queryParams.search = customFilters.search.trim();
      if (customFilters.status && customFilters.status !== 'ALL') queryParams.status = customFilters.status;
      if (customFilters.origin === 'AUTOMATED') queryParams.is_automated = true;
      if (customFilters.origin === 'MANUAL') queryParams.is_automated = false;
      if (customFilters.customerId) queryParams.customer_id = customFilters.customerId;
      if (customFilters.targetUserId) queryParams.target_user_id = customFilters.targetUserId;
      if (customFilters.notificationType && customFilters.notificationType !== 'ALL') queryParams.notification_type = customFilters.notificationType;
      if (customFilters.createdFrom) queryParams.created_from = customFilters.createdFrom;
      if (customFilters.createdTo) queryParams.created_to = customFilters.createdTo;
      queryParams.include_broadcast = customFilters.includeBroadcast !== false;

      const data = await getSystemNotifications(queryParams);
      setNotifications(data || []);
    } catch (err) {
      setError('Failed to fetch system notifications.');
      toast.error('Failed to fetch notifications.');
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchNotifications(filters);
  }, [filters, fetchNotifications]);

  // Active filters count
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (filters.search?.trim()) count++;
    if (filters.status !== 'ALL') count++;
    if (filters.origin !== 'ALL') count++;
    if (filters.customerId) count++;
    if (filters.targetUserId) count++;
    if (filters.notificationType && filters.notificationType !== 'ALL') count++;
    if (filters.createdFrom) count++;
    if (filters.createdTo) count++;
    return count;
  }, [filters]);

  const handleResetFilters = () => {
    const defaultFilters = {
      search: '',
      status: 'ALL',
      origin: 'ALL',
      customerId: '',
      targetUserId: '',
      notificationType: 'ALL',
      createdFrom: '',
      createdTo: '',
      includeBroadcast: true,
    };
    setFilters(defaultFilters);
  };

  const handleEdit = (id) => {
    navigate(`/system-owner/system-notifications/edit/${id}`);
  };

  const handleConfirmDelete = (notification) => {
    setSelectedNotification(notification);
    setShowDeleteConfirm(true);
  };

  const handleDelete = async () => {
    if (!selectedNotification) return;
    try {
      await deleteSystemNotification(selectedNotification.id);
      toast.success('Notification deleted successfully.');
      fetchNotifications();
    } catch (err) {
      toast.error('Failed to delete notification.');
    } finally {
      setShowDeleteConfirm(false);
      setSelectedNotification(null);
    }
  };

  const handleConfirmRestore = (notification) => {
    setSelectedNotification(notification);
    setShowRestoreConfirm(true);
  };

  const handleRestore = async () => {
    if (!selectedNotification) return;
    try {
      await restoreSystemNotification(selectedNotification.id);
      toast.success('Notification restored successfully.');
      fetchNotifications();
    } catch (err) {
      toast.error('Failed to restore notification.');
    } finally {
      setShowRestoreConfirm(false);
      setSelectedNotification(null);
    }
  };
  
  const handleConfirmToggleActive = (notification) => {
    setSelectedNotification(notification);
    setShowToggleConfirm(true);
  };
  
  const handleToggleActive = async () => {
    if (!selectedNotification) return;
    const newStatus = !selectedNotification.is_active;
    
    try {
      await updateSystemNotification(selectedNotification.id, { 
        is_active: newStatus 
      });
      toast.success(`Notification successfully ${newStatus ? 'activated' : 'deactivated'}.`);
      fetchNotifications();
    } catch (err) {
      console.error("Toggle active status failed", err);
      toast.error(`Failed to ${newStatus ? 'activate' : 'deactivate'} notification.`);
    } finally {
      setShowToggleConfirm(false);
      setSelectedNotification(null);
    }
  };

  const handleShowAnalytics = async (notification) => {
    setSelectedNotification(notification);
    setShowAnalyticsModal(true);
    setAnalyticsData(null); 
    setIsLoadingAnalytics(true);

    try {
      const data = await getSystemNotificationAnalytics(notification.id);
      setAnalyticsData(data);
    } catch (err) {
      console.error("Failed to fetch analytics", err);
      toast.error("Failed to load analytics data.");
    } finally {
      setIsLoadingAnalytics(false);
    }
  };

  const handleShowDetails = (notification) => {
    setSelectedNotification(notification);
    setShowDetailsModal(true);
  };

  const getStatusBadge = (notification) => {
    const now = new Date();
    const startDate = new Date(notification.start_date);
    const endDate = new Date(notification.end_date);
    
    if (notification.is_deleted) {
      return <Badge variant="destructive">Deleted</Badge>;
    }
    if (!notification.is_active) {
      return <Badge variant="secondary">Inactive</Badge>;
    }
    if (now < startDate) {
      return <Badge variant="default">Scheduled</Badge>;
    }
    if (now > endDate) {
      return <Badge variant="secondary">Expired</Badge>;
    }
    return <Badge variant="success">Active</Badge>;
  };

  const getTypeBadge = (type) => {
    if (!type) return null;
    const t = type.toUpperCase();
    if (t.includes('EXPIRED')) {
      return <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-800 border border-amber-200">LG Expired</span>;
    }
    if (t.includes('ALERT') || t.includes('CRITICAL')) {
      return <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-red-100 text-red-800 border border-red-200">Alert</span>;
    }
    if (t.includes('RENEWAL')) {
      return <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-purple-100 text-purple-800 border border-purple-200">Renewal</span>;
    }
    return <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-200">{type}</span>;
  };

  const getOriginBadge = (notification) => {
    const isAutomated = notification.created_by_user_name === 'System Automation' ||
      notification.notification_type?.includes('EXPIRED') ||
      notification.notification_type?.includes('ALERT');

    if (isAutomated) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-purple-50 text-purple-700 border border-purple-200">
          <Bot className="w-3 h-3 text-purple-600" /> System Automation
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
        <Megaphone className="w-3 h-3 text-emerald-600" /> {notification.created_by_user_name || 'Admin'}
      </span>
    );
  };

  const renderTargetDisplay = (notification) => {
    const custCount = notification.target_customer_names?.length || notification.target_customer_ids?.length || 0;
    const userCount = notification.target_user_emails?.length || notification.target_user_ids?.length || 0;

    if (custCount === 0 && userCount === 0) {
      return (
        <span className="inline-flex items-center gap-1 text-xs text-slate-500 font-medium">
          <Sparkles className="w-3.5 h-3.5 text-blue-500" /> Broadcast (All Users)
        </span>
      );
    }

    return (
      <div className="space-y-1">
        {notification.target_customer_names && notification.target_customer_names.length > 0 ? (
          <div className="flex items-center gap-1 text-xs text-slate-700 font-medium" title={notification.target_customer_names.join(', ')}>
            <Building2 className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
            <span className="truncate max-w-[160px]">{notification.target_customer_names[0]}</span>
            {notification.target_customer_names.length > 1 && (
              <span className="px-1.5 py-0.2 rounded bg-slate-100 text-[10px] text-slate-500 font-bold">
                +{notification.target_customer_names.length - 1}
              </span>
            )}
          </div>
        ) : custCount > 0 ? (
          <div className="flex items-center gap-1 text-xs text-slate-600">
            <Building2 className="w-3.5 h-3.5 text-slate-400" /> Customers ({custCount})
          </div>
        ) : null}

        {notification.target_user_emails && notification.target_user_emails.length > 0 ? (
          <div className="flex items-center gap-1 text-[11px] text-slate-500" title={notification.target_user_emails.join(', ')}>
            <Users className="w-3 h-3 text-slate-400 flex-shrink-0" />
            <span className="truncate max-w-[160px]">{notification.target_user_emails[0]}</span>
            {notification.target_user_emails.length > 1 && (
              <span className="px-1 py-0.2 rounded bg-slate-100 text-[10px] text-slate-500 font-bold">
                +{notification.target_user_emails.length - 1}
              </span>
            )}
          </div>
        ) : userCount > 0 ? (
          <div className="flex items-center gap-1 text-[11px] text-slate-500">
            <Users className="w-3 h-3 text-slate-400" /> Users ({userCount})
          </div>
        ) : null}
      </div>
    );
  };

  return (
    <div className="space-y-5">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 tracking-tight">System Notifications</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Audit, query, and track automated alerts and announcements across tenant organizations
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <Button 
            variant="outline" 
            onClick={() => fetchNotifications()} 
            title="Refresh list"
            className="flex items-center gap-1.5"
          >
            <RefreshCw className={`w-4 h-4 text-slate-600 ${isLoading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </Button>
          <Button onClick={() => navigate('/system-owner/system-notifications/new')} className="shadow-sm">
            <PlusCircle className="h-4 w-4 mr-1.5" /> Create Notification
          </Button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm" role="alert">
          {error}
        </div>
      )}

      {/* --- ADVANCED QUERY & FILTER TOOLBAR --- */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 space-y-4">
        
        {/* Row 1: Search + Origin Toggle + Status Pills + Filter Toggle */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          
          {/* Keyword Search Input */}
          <div className="relative flex-1 max-w-lg">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by keyword, LG reference, or message..."
              value={filters.search}
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
              className="w-full pl-10 pr-9 py-2 rounded-lg border border-gray-200 bg-slate-50 text-sm focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition placeholder:text-slate-400"
            />
            {filters.search && (
              <button 
                onClick={() => setFilters(prev => ({ ...prev, search: '' }))}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Origin Segmented Control (Automated vs Manual) */}
          <div className="flex rounded-lg bg-slate-100 p-1 border border-slate-200 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setFilters(p => ({ ...p, origin: 'ALL' }))}
              className={`py-1.5 px-3 text-xs font-semibold rounded-md transition ${
                filters.origin === 'ALL'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All Origin
            </button>
            <button
              type="button"
              onClick={() => setFilters(p => ({ ...p, origin: 'AUTOMATED' }))}
              className={`py-1.5 px-3 text-xs font-semibold rounded-md transition flex items-center gap-1.5 ${
                filters.origin === 'AUTOMATED'
                  ? 'bg-white text-purple-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Bot className="w-3.5 h-3.5" /> Automated
            </button>
            <button
              type="button"
              onClick={() => setFilters(p => ({ ...p, origin: 'MANUAL' }))}
              className={`py-1.5 px-3 text-xs font-semibold rounded-md transition flex items-center gap-1.5 ${
                filters.origin === 'MANUAL'
                  ? 'bg-white text-emerald-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Megaphone className="w-3.5 h-3.5" /> Manual
            </button>
          </div>

          {/* Advanced Filter Drawer Button */}
          <Button
            type="button"
            variant="outline"
            onClick={() => setIsAdvancedFiltersOpen(!isAdvancedFiltersOpen)}
            className={`flex items-center gap-2 ${activeFiltersCount > 0 ? 'border-blue-300 bg-blue-50/60 text-blue-700 font-semibold' : ''}`}
          >
            <Filter className="w-4 h-4" />
            <span>Filters</span>
            {activeFiltersCount > 0 && (
              <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-[10px] flex items-center justify-center font-bold">
                {activeFiltersCount}
              </span>
            )}
            {isAdvancedFiltersOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </Button>
        </div>

        {/* Status Quick Pills */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-slate-100">
          <span className="text-xs text-slate-500 font-medium mr-1 flex items-center gap-1">
            Status:
          </span>
          {[
            { id: 'ALL', label: 'All' },
            { id: 'ACTIVE', label: 'Active', badgeClass: 'text-emerald-700' },
            { id: 'SCHEDULED', label: 'Scheduled', badgeClass: 'text-blue-700' },
            { id: 'EXPIRED', label: 'Expired', badgeClass: 'text-slate-600' },
            { id: 'INACTIVE', label: 'Inactive', badgeClass: 'text-amber-700' },
            { id: 'DELETED', label: 'Deleted', badgeClass: 'text-red-700' },
          ].map(st => {
            const isSelected = filters.status === st.id;
            return (
              <button
                key={st.id}
                type="button"
                onClick={() => setFilters(p => ({ ...p, status: st.id }))}
                className={`px-3 py-1 text-xs font-semibold rounded-full border transition-all ${
                  isSelected
                    ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                {st.label}
              </button>
            );
          })}

          {/* Active Results Summary */}
          <div className="ml-auto text-xs text-slate-400 font-medium">
            Showing <strong className="text-slate-700">{notifications.length}</strong> notification{notifications.length === 1 ? '' : 's'}
          </div>
        </div>

        {/* Collapsible Advanced Criteria (Customer, User, Type, Dates) */}
        {isAdvancedFiltersOpen && (
          <div className="pt-3 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-fadeIn">
            
            {/* Target Customer Dropdown */}
            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">
                Target Customer
              </label>
              <select
                value={filters.customerId}
                onChange={(e) => setFilters(p => ({ ...p, customerId: e.target.value }))}
                className="w-full px-3 py-2 text-xs rounded-lg border border-gray-200 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">— All Customers —</option>
                {customers.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            {/* Target User Dropdown */}
            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">
                Target Recipient User
              </label>
              <select
                value={filters.targetUserId}
                onChange={(e) => setFilters(p => ({ ...p, targetUserId: e.target.value }))}
                className="w-full px-3 py-2 text-xs rounded-lg border border-gray-200 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">— All Users —</option>
                {users.map(u => (
                  <option key={u.id} value={u.id}>{u.email} ({u.role})</option>
                ))}
              </select>
            </div>

            {/* Notification Type Dropdown */}
            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">
                Notification Type
              </label>
              <select
                value={filters.notificationType}
                onChange={(e) => setFilters(p => ({ ...p, notificationType: e.target.value }))}
                className="w-full px-3 py-2 text-xs rounded-lg border border-gray-200 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="ALL">— All Notification Types —</option>
                <option value="LG_EXPIRED">LG_EXPIRED (LG Expiration Notice)</option>
                <option value="system_info">system_info (General Information)</option>
                <option value="SYSTEM_ALERT">SYSTEM_ALERT (System Alert)</option>
                {availableTypes
                  .filter(t => !['LG_EXPIRED', 'system_info', 'SYSTEM_ALERT'].includes(t))
                  .map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
              </select>
            </div>

            {/* Date Range: Created From / To */}
            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">
                Created Date Range
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={filters.createdFrom}
                  onChange={(e) => setFilters(p => ({ ...p, createdFrom: e.target.value }))}
                  className="w-1/2 px-2 py-1.5 text-xs rounded-lg border border-gray-200 bg-white focus:ring-2 focus:ring-blue-500"
                  placeholder="From"
                  title="Created From"
                />
                <span className="text-slate-400 text-xs">—</span>
                <input
                  type="date"
                  value={filters.createdTo}
                  onChange={(e) => setFilters(p => ({ ...p, createdTo: e.target.value }))}
                  className="w-1/2 px-2 py-1.5 text-xs rounded-lg border border-gray-200 bg-white focus:ring-2 focus:ring-blue-500"
                  placeholder="To"
                  title="Created To"
                />
              </div>
            </div>

            {/* Broadcast Option & Reset Buttons */}
            <div className="sm:col-span-2 lg:col-span-4 flex items-center justify-between pt-2 border-t border-slate-100">
              <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={filters.includeBroadcast}
                  onChange={(e) => setFilters(p => ({ ...p, includeBroadcast: e.target.checked }))}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span>Include global broadcast notifications when filtering by specific Customer or User</span>
              </label>

              {activeFiltersCount > 0 && (
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="text-xs text-red-600 hover:text-red-700 font-semibold flex items-center gap-1"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Reset all filters
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* --- TABLE CONTENT --- */}
      {isLoading ? (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-200 shadow-sm">
          <Loader2 className="h-8 w-8 text-blue-600 animate-spin mx-auto" />
          <p className="text-slate-600 mt-2 text-sm font-medium">Filtering notifications...</p>
        </div>
      ) : notifications.length === 0 ? (
        <div className="bg-white p-12 rounded-xl shadow-sm border border-gray-200 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
            <Search className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-800">No matching notifications found</h3>
          <p className="text-sm text-slate-500 max-w-md mx-auto">
            No notifications matched your current filter criteria. Try adjusting your search query, status, or date range.
          </p>
          {activeFiltersCount > 0 && (
            <Button variant="outline" onClick={handleResetFilters} className="mt-2">
              Clear All Filters
            </Button>
          )}
        </div>
      ) : (
        <Table>
          <TableHeader>
            <tr>
              <TableHead className="w-1/3">Content & Type</TableHead>
              <TableHead>Created By</TableHead>
              <TableHead>Target Recipient(s)</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Active Window</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </tr>
          </TableHeader>
          <TableBody>
            {notifications.map((notification) => (
              <TableRow
                key={notification.id}
                isDeleted={notification.is_deleted}
                onClick={() => handleShowDetails(notification)}
                className="group"
              >
                {/* Content & Type */}
                <TableCell className="w-1/3 max-w-sm">
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {getTypeBadge(notification.notification_type)}
                      {notification.is_popup && (
                        <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                          Popup Modal
                        </span>
                      )}
                    </div>
                    <p className="font-semibold text-slate-900 group-hover:text-blue-600 transition truncate" title={notification.content}>
                      {notification.content}
                    </p>
                    {notification.link && (
                      <span className="inline-flex items-center gap-1 text-[11px] text-blue-600 hover:underline" onClick={(e) => e.stopPropagation()}>
                        <ExternalLink className="w-3 h-3" /> {notification.link}
                      </span>
                    )}
                  </div>
                </TableCell>

                {/* Origin / Created By */}
                <TableCell>
                  <div className="space-y-0.5">
                    {getOriginBadge(notification)}
                    <p className="text-[11px] text-slate-400">
                      {format(new Date(notification.created_at), 'MMM dd, yyyy HH:mm')}
                    </p>
                  </div>
                </TableCell>

                {/* Target Recipients */}
                <TableCell>
                  {renderTargetDisplay(notification)}
                </TableCell>

                {/* Status Badge */}
                <TableCell>
                  {getStatusBadge(notification)}
                </TableCell>

                {/* Active Window */}
                <TableCell>
                  <div className="text-xs text-slate-600 space-y-0.5">
                    <p className="font-medium text-slate-700">
                      {format(new Date(notification.start_date), 'MMM dd, yyyy HH:mm')}
                    </p>
                    <p className="text-[11px] text-slate-400">
                      to {format(new Date(notification.end_date), 'MMM dd, yyyy HH:mm')}
                    </p>
                  </div>
                </TableCell>

                {/* Action Buttons */}
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    
                    {/* View Details / Inspect */}
                    <Button
                      variant="icon-default"
                      size="sm"
                      onClick={(e) => { e.stopPropagation(); handleShowDetails(notification); }}
                      title="Inspect Notification Details"
                    >
                      <Eye className="h-4 w-4 text-slate-600" />
                    </Button>

                    {/* Toggle Active Status */}
                    {!notification.is_deleted && (
                      <Button
                        variant={notification.is_active ? "icon-yellow" : "icon-green"}
                        size="sm"
                        onClick={(e) => { e.stopPropagation(); handleConfirmToggleActive(notification); }}
                        title={notification.is_active ? "Deactivate" : "Activate"}
                      >
                        {notification.is_active ? 
                          <ToggleRight className="h-5 w-5" /> : 
                          <ToggleLeft className="h-5 w-5" />
                        }
                      </Button>
                    )}
                    
                    {/* Edit */}
                    {!notification.is_deleted && (
                      <Button
                        variant="icon-blue"
                        size="sm"
                        onClick={(e) => { e.stopPropagation(); handleEdit(notification.id); }}
                        title="Edit Notification"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    )}

                    {/* Delete or Restore */}
                    {!notification.is_deleted ? (
                      <Button
                        variant="icon-red"
                        size="sm"
                        onClick={(e) => { e.stopPropagation(); handleConfirmDelete(notification); }}
                        title="Delete"
                      >
                        <Trash className="h-4 w-4" />
                      </Button>
                    ) : (
                      <Button
                        variant="icon-green"
                        size="sm"
                        onClick={(e) => { e.stopPropagation(); handleConfirmRestore(notification); }}
                        title="Restore"
                      >
                        <RotateCcw className="h-4 w-4" />
                      </Button>
                    )}

                    {/* Analytics */}
                    <Button
                      variant="icon-purple"
                      size="sm"
                      onClick={(e) => { e.stopPropagation(); handleShowAnalytics(notification); }}
                      title="View Readership Analytics"
                    >
                      <BarChart2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {/* Details Overview Modal */}
      <NotificationDetailsModal
        isOpen={showDetailsModal}
        onClose={() => setShowDetailsModal(false)}
        notification={selectedNotification}
        onOpenAnalytics={handleShowAnalytics}
      />

      {/* Confirmation Dialogs */}
      {showDeleteConfirm && selectedNotification && (
        <AlertDialog
          title="Delete Notification?"
          description="This action will soft-delete the notification. It will be hidden from users but can be restored anytime."
          onConfirm={handleDelete}
          onCancel={() => setShowDeleteConfirm(false)}
          confirmText="Delete"
        />
      )}

      {showRestoreConfirm && selectedNotification && (
        <AlertDialog
          title="Restore Notification?"
          description="This action will restore the deleted notification. It will be active again if it's within its scheduled date range."
          onConfirm={handleRestore}
          onCancel={() => setShowRestoreConfirm(false)}
          confirmText="Restore"
        />
      )}

      {showToggleConfirm && selectedNotification && (
        <AlertDialog
          title={selectedNotification.is_active ? "Deactivate Notification?" : "Activate Notification?"}
          description={selectedNotification.is_active 
            ? "This will immediately hide the notification from all users, regardless of its scheduled date range."
            : "This will make the notification visible to eligible recipients, provided it is within its start and end dates."}
          onConfirm={handleToggleActive}
          onCancel={() => setShowToggleConfirm(false)}
          confirmText={selectedNotification.is_active ? "Deactivate" : "Activate"}
        />
      )}

      {/* Readership Analytics Dialog */}
      <AnalyticsDialog
        isOpen={showAnalyticsModal}
        onClose={() => setShowAnalyticsModal(false)}
        data={analyticsData}
        isLoading={isLoadingAnalytics}
        notificationTitle={selectedNotification?.content}
      />
    </div>
  );
}

export default SystemNotificationList;