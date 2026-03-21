import React, { useState, useEffect, useRef } from 'react';
import { Bell, Check, ExternalLink, X, CheckCheck, Clock, AlertTriangle, ShieldAlert, FileText, Building2, Settings, Info } from 'lucide-react';
import apiClient from '../services/apiClient';
import { useNavigate } from 'react-router-dom';

// ─── Time-ago helper ────────────────────────────────────────────
function timeAgo(dateStr) {
    if (!dateStr) return '';
    const now = new Date();
    const d = new Date(dateStr);
    const diff = Math.floor((now - d) / 1000);
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
    return d.toLocaleDateString();
}

// ─── Notification type → icon + color ───────────────────────────
function getTypeIcon(type) {
    const map = {
        LG_EXPIRED: { icon: AlertTriangle, color: 'text-red-500 bg-red-50' },
        ISSUANCE_LG_EXPIRY: { icon: Clock, color: 'text-amber-500 bg-amber-50' },
        REFERENCE_EXPIRY: { icon: FileText, color: 'text-orange-500 bg-orange-50' },
        FACILITY_UTILIZATION: { icon: ShieldAlert, color: 'text-red-500 bg-red-50' },
        cbe: { icon: Building2, color: 'text-blue-500 bg-blue-50' },
        system_info: { icon: Info, color: 'text-slate-500 bg-slate-50' },
    };
    return map[type] || map.system_info;
}

// ─── Module badge ───────────────────────────────────────────────
function getModuleBadge(module) {
    const colors = {
        ISSUANCE: 'bg-blue-100 text-blue-700',
        CUSTODY: 'bg-green-100 text-green-700',
        QUOTATION: 'bg-amber-100 text-amber-700',
        SYSTEM: 'bg-gray-100 text-gray-600',
    };
    return colors[module] || colors.SYSTEM;
}

// ─── Group helpers ──────────────────────────────────────────────
function isToday(dateStr) {
    if (!dateStr) return false;
    const d = new Date(dateStr);
    const now = new Date();
    return d.toDateString() === now.toDateString();
}

export default function NotificationCenter() {
    const [notifications, setNotifications] = useState([]);
    const [isOpen, setIsOpen] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);
    const dropdownRef = useRef(null);
    const navigate = useNavigate();

    const fetchNotifications = async () => {
        try {
            const response = await apiClient.get('/notifications');
            setNotifications(response.data);
            setUnreadCount(response.data.filter(n => !n.is_read).length);
        } catch (error) {
            if (error?.response?.status !== 401) {
                console.error("Error fetching notifications:", error);
            }
        }
    };

    useEffect(() => {
        fetchNotifications();
        const interval = setInterval(fetchNotifications, 30000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const markAsRead = async (id) => {
        try {
            await apiClient.patch(`/notifications/${id}/read`, {});
            setNotifications(notifications.map(n => n.id === id ? { ...n, is_read: true } : n));
            setUnreadCount(prev => Math.max(0, prev - 1));
        } catch (error) {
            console.error("Error marking notification as read:", error);
        }
    };

    const markAllAsRead = async () => {
        try {
            await apiClient.patch('/notifications/mark-all-read', {});
            setNotifications(notifications.map(n => ({ ...n, is_read: true })));
            setUnreadCount(0);
        } catch (error) {
            console.error("Error marking all as read:", error);
        }
    };

    const handleNotificationClick = (notif) => {
        if (!notif.is_read) markAsRead(notif.id);
        if (notif.link) navigate(notif.link);
        setIsOpen(false);
    };

    // Group: today vs earlier
    const todayNotifs = notifications.filter(n => isToday(n.created_at));
    const earlierNotifs = notifications.filter(n => !isToday(n.created_at));

    const renderNotification = (notif) => {
        const typeInfo = getTypeIcon(notif.notification_type);
        const TypeIcon = typeInfo.icon;
        return (
            <div
                key={notif.id}
                onClick={() => handleNotificationClick(notif)}
                className={`px-4 py-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors ${!notif.is_read ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''}`}
            >
                <div className="flex gap-3 items-start">
                    {/* Type Icon */}
                    <div className={`p-1.5 rounded-lg shrink-0 ${typeInfo.color}`}>
                        <TypeIcon size={14} />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                            <p className={`text-sm leading-snug ${!notif.is_read ? 'font-semibold text-gray-900 dark:text-white' : 'text-gray-700 dark:text-gray-300'}`}>
                                {notif.title || notif.content || notif.message}
                            </p>
                        </div>
                        {(notif.message && notif.title) && (
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">{notif.message}</p>
                        )}
                        <div className="flex items-center gap-2 mt-1.5">
                            <span className="text-[10px] text-gray-400">{timeAgo(notif.created_at)}</span>
                            {notif.module && (
                                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${getModuleBadge(notif.module)}`}>
                                    {notif.module}
                                </span>
                            )}
                            {notif.link && <ExternalLink size={9} className="text-gray-300" />}
                        </div>
                    </div>

                    {/* Unread dot */}
                    {!notif.is_read && <div className="h-2 w-2 rounded-full bg-blue-500 shrink-0 mt-1.5"></div>}
                </div>
            </div>
        );
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                aria-label="Notifications"
            >
                <Bell size={20} className="text-gray-600 dark:text-gray-300" />
                {unreadCount > 0 && (
                    <span className="absolute top-0.5 right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white animate-pulse">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-2 w-[400px] max-h-[520px] overflow-hidden rounded-xl bg-white dark:bg-gray-900 shadow-2xl border border-gray-100 dark:border-gray-800 z-[100] flex flex-col">
                    {/* Header */}
                    <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800">
                        <div className="flex items-center gap-2">
                            <h3 className="font-bold text-gray-900 dark:text-white text-sm">Notifications</h3>
                            {unreadCount > 0 && (
                                <span className="text-[10px] font-bold bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full">{unreadCount} new</span>
                            )}
                        </div>
                        <div className="flex items-center gap-2">
                            {unreadCount > 0 && (
                                <button
                                    onClick={markAllAsRead}
                                    className="text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
                                    title="Mark all as read"
                                >
                                    <CheckCheck size={14} /> Mark all
                                </button>
                            )}
                            <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-gray-600">
                                <X size={16} />
                            </button>
                        </div>
                    </div>

                    {/* Notification List */}
                    <div className="overflow-y-auto flex-1">
                        {notifications.length === 0 ? (
                            <div className="p-10 text-center text-gray-500 dark:text-gray-400">
                                <Bell size={32} className="mx-auto mb-3 opacity-20" />
                                <p className="text-sm font-medium">All caught up!</p>
                                <p className="text-xs mt-1 text-gray-400">No notifications to show</p>
                            </div>
                        ) : (
                            <>
                                {todayNotifs.length > 0 && (
                                    <>
                                        <div className="px-4 py-2 bg-gray-50 dark:bg-gray-800/50">
                                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Today</span>
                                        </div>
                                        <div className="divide-y divide-gray-50 dark:divide-gray-800">
                                            {todayNotifs.map(renderNotification)}
                                        </div>
                                    </>
                                )}
                                {earlierNotifs.length > 0 && (
                                    <>
                                        <div className="px-4 py-2 bg-gray-50 dark:bg-gray-800/50">
                                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Earlier</span>
                                        </div>
                                        <div className="divide-y divide-gray-50 dark:divide-gray-800">
                                            {earlierNotifs.map(renderNotification)}
                                        </div>
                                    </>
                                )}
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
