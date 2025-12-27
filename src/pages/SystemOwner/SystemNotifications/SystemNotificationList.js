import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { 
  getSystemNotifications, 
  deleteSystemNotification, 
  restoreSystemNotification,
  updateSystemNotification,
  getSystemNotificationAnalytics
} from '../../../services/apiService';
import { format } from 'date-fns';
import { PlusCircle, Edit, Trash, RotateCcw, Loader2, ToggleRight, ToggleLeft, BarChart2, X, Eye } from 'lucide-react';
import clsx from 'clsx';

// --- UI COMPONENTS ---

const Button = ({ children, className, variant = 'default', size = 'default', ...props }) => {
  const baseClass = "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-500 disabled:pointer-events-none disabled:opacity-50";
  const sizeClass = size === 'sm' ? "h-8 px-3 text-xs" : size === 'lg' ? "h-10 px-8" : "h-9 px-4 py-2";

  const variantClass = clsx({
    "bg-blue-600 text-white shadow hover:bg-blue-700": variant === 'default',
    "bg-red-600 text-white shadow-sm hover:bg-red-700": variant === 'destructive',
    "border border-gray-300 bg-white shadow-sm hover:bg-gray-100": variant === 'outline',
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
  <div className="overflow-x-auto bg-white rounded-lg shadow-md">
    <table className={clsx("min-w-full divide-y divide-gray-200", className)} {...props}>
      {children}
    </table>
  </div>
);

const TableHeader = ({ children, className, ...props }) => (
  <thead className={clsx("bg-gray-50", className)} {...props}>
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
      "cursor-pointer hover:bg-gray-50",
      isDeleted && "opacity-60 bg-gray-50",
      className
    )} 
    {...props}>
    {children}
  </tr>
);

const TableHead = ({ children, className, ...props }) => (
  <th scope="col" className={clsx("px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider", className)} {...props}>
    {children}
  </th>
);

const TableCell = ({ children, className, ...props }) => (
  <td className={clsx("px-4 py-4 whitespace-nowrap text-sm text-gray-500", className)} {...props}>
    {children}
  </td>
);

const Badge = ({ children, className, variant = 'default', ...props }) => {
  const variantClass = clsx({
    "bg-blue-600 text-white": variant === 'default',
    "bg-red-600 text-white": variant === 'destructive',
    "bg-gray-200 text-gray-900": variant === 'secondary',
    "border border-gray-300 text-gray-700": variant === 'outline',
    "bg-green-500 text-white": variant === 'success',
  });
  return (
    <span className={clsx("ml-2 px-2 inline-flex text-xs leading-5 font-semibold rounded-full", variantClass, className)} {...props}>
      {children}
    </span>
  );
};

const AlertDialog = ({ title, description, onConfirm, onCancel, confirmText = 'Continue', ...props }) => {
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-gray-600 bg-opacity-75 flex items-center justify-center transition-opacity">
      <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-sm mx-auto">
        <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
        <p className="mt-2 text-sm text-gray-500">{description}</p>
        <div className="mt-4 flex justify-end space-x-2">
          <Button variant="outline" onClick={onCancel}>Cancel</Button>
          <Button variant="destructive" onClick={onConfirm}>{confirmText}</Button>
        </div>
      </div>
    </div>
  );
};

// --- UPDATED ANALYTICS DIALOG COMPONENT ---
const AnalyticsDialog = ({ isOpen, onClose, data, isLoading, notificationTitle }) => {
  if (!isOpen) return null;

  // Calculate max views to scale the bars
  const maxViews = data?.logs?.reduce((max, log) => Math.max(max, log.view_count), 0) || 1;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-gray-900 bg-opacity-50 flex items-center justify-center transition-opacity backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl mx-auto flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
        
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

              {/* View Logs Table with Visuals */}
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
                                {/* VISUAL BAR CHART */}
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

// --- MAIN COMPONENT ---

function SystemNotificationList({ onLogout }) {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Dialog States
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showRestoreConfirm, setShowRestoreConfirm] = useState(false);
  const [showToggleConfirm, setShowToggleConfirm] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState(null);

  // Analytics States
  const [showAnalyticsModal, setShowAnalyticsModal] = useState(false);
  const [analyticsData, setAnalyticsData] = useState(null);
  const [isLoadingAnalytics, setIsLoadingAnalytics] = useState(false);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getSystemNotifications();
      setNotifications(data);
    } catch (err) {
      setError('Failed to fetch system notifications.');
      toast.error('Failed to fetch notifications.');
    } finally {
      setIsLoading(false);
    }
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

  // --- ANALYTICS HANDLER ---
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
  
  const getTargetText = (notification) => {
    const targetCustomers = notification.target_customer_ids?.length || 0;
    const targetUsers = notification.target_user_ids?.length || 0;
    const targetRoles = notification.target_roles?.length || 0;

    if (targetCustomers > 0 || targetUsers > 0 || targetRoles > 0) {
      let parts = [];
      if (targetCustomers > 0) parts.push(`Customers (${targetCustomers})`);
      if (targetUsers > 0) parts.push(`Users (${targetUsers})`);
      if (targetRoles > 0) parts.push(`Roles (${targetRoles})`);
      return parts.join(', ');
    }
    return 'All Users';
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-semibold text-gray-800">System Notifications</h2>
        <Button onClick={() => navigate('/system-owner/system-notifications/new')}>
          <PlusCircle className="h-5 w-5 mr-2" /> Create Notification
        </Button>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-md relative mb-4" role="alert">
          <span className="block sm:inline">{error}</span>
        </div>
      )}

      {isLoading ? (
        <div className="text-center py-8">
          <Loader2 className="h-8 w-8 text-blue-600 animate-spin mx-auto" />
          <p className="text-gray-600 mt-2">Loading notifications...</p>
        </div>
      ) : notifications.length === 0 ? (
        <div className="bg-white p-6 rounded-lg shadow-md text-center">
          <p className="text-gray-500">No notifications found.</p>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <tr>
              <TableHead className="w-1/3">Content</TableHead>
              <TableHead>Target</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Start Date</TableHead>
              <TableHead>End Date</TableHead>
              <TableHead className="text-center">Actions</TableHead>
            </tr>
          </TableHeader>
          <TableBody>
            {notifications.map((notification) => (
              <TableRow key={notification.id} isDeleted={notification.is_deleted}>
                <TableCell className="font-medium text-gray-900 w-1/3 max-w-sm truncate">{notification.content}</TableCell>
                <TableCell>
                  {getTargetText(notification)}
                </TableCell>
                <TableCell>{getStatusBadge(notification)}</TableCell>
                <TableCell>{format(new Date(notification.start_date), 'MMM dd, yyyy HH:mm')}</TableCell>
                <TableCell>{format(new Date(notification.end_date), 'MMM dd, yyyy HH:mm')}</TableCell>
                <TableCell className="text-right text-sm font-medium">
                  <div className="flex justify-end space-x-0.75">
                    
                    {/* Toggle Active Status Button */}
                    {!notification.is_deleted && (
                      <Button
                        variant={notification.is_active ? "icon-yellow" : "icon-green"}
                        size="sm"
                        onClick={(e) => { e.stopPropagation(); handleConfirmToggleActive(notification); }}
                        title={notification.is_active ? "Deactivate" : "Activate"}
                      >
                        {notification.is_active ? 
                          <ToggleRight className="h-6 w-6" /> : 
                          <ToggleLeft className="h-6 w-6" />
                        }
                      </Button>
                    )}
                    
                    {!notification.is_deleted && (
                      <>
                        <Button
                          variant="icon-blue"
                          size="sm"
                          onClick={(e) => { e.stopPropagation(); handleEdit(notification.id); }}
                          title="Edit"
                        >
                          <Edit className="h-5 w-5" />
                        </Button>
                        <Button
                          variant="icon-red"
                          size="sm"
                          onClick={(e) => { e.stopPropagation(); handleConfirmDelete(notification); }}
                          title="Delete"
                        >
                          <Trash className="h-5 w-5" />
                        </Button>
                      </>
                    )}
                    {notification.is_deleted && (
                      <Button
                        variant="icon-green"
                        size="sm"
                        onClick={(e) => { e.stopPropagation(); handleConfirmRestore(notification); }}
                        title="Restore"
                      >
                        <RotateCcw className="h-5 w-5" />
                      </Button>
                    )}

                    {/* Analytics Button - Moved to end for consistent positioning */}
                    <Button
                      variant="icon-purple"
                      size="sm"
                      onClick={(e) => { e.stopPropagation(); handleShowAnalytics(notification); }}
                      title="View Analytics"
                    >
                      <BarChart2 className="h-5 w-5" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {/* Confirmation Dialogs */}
      {showDeleteConfirm && selectedNotification && (
        <AlertDialog
          title="Are you sure you want to delete this notification?"
          description="This action will soft-delete the notification. It can be restored later."
          onConfirm={handleDelete}
          onCancel={() => setShowDeleteConfirm(false)}
          confirmText="Delete"
        />
      )}

      {showRestoreConfirm && selectedNotification && (
        <AlertDialog
          title="Restore this notification?"
          description="This action will restore the deleted notification. It will be active again if it's within the date range."
          onConfirm={handleRestore}
          onCancel={() => setShowRestoreConfirm(false)}
          confirmText="Restore"
        />
      )}

      {showToggleConfirm && selectedNotification && (
        <AlertDialog
          title={selectedNotification.is_active ? "Deactivate Notification?" : "Activate Notification?"}
          description={selectedNotification.is_active 
            ? "This will immediately hide the notification from all users, regardless of its date range."
            : "This will make the notification visible, provided it is within its start and end dates."}
          onConfirm={handleToggleActive}
          onCancel={() => setShowToggleConfirm(false)}
          confirmText={selectedNotification.is_active ? "Deactivate" : "Activate"}
        />
      )}

      {/* Analytics Dialog */}
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