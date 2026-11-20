import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Info, AlertTriangle, Newspaper, Building2, Megaphone, X, CheckCircle } from 'lucide-react';
import { acknowledgeSystemNotification, logNotificationView } from '../services/notificationService'; 

const animationStyles = `
  @keyframes customFadeIn { from { opacity: 0; } to { opacity: 1; } }
  @keyframes customSlideInLeft { from { transform: translateX(-100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
  @keyframes customSlideInRight { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
  @keyframes customZoomIn { from { transform: scale(0.95); opacity: 0; } to { transform: scale(1); opacity: 1; } }
  @keyframes customBounceIn { 
    0% { transform: scale(0.9); opacity: 0; }
    70% { transform: scale(1.05); opacity: 1; }
    100% { transform: scale(1); opacity: 1; }
  }

  .banner-anim-fade { animation: customFadeIn 0.5s ease-out forwards; }
  .banner-anim-slide-left { animation: customSlideInLeft 0.5s ease-out forwards; }
  .banner-anim-scroll-left { animation: customSlideInRight 0.5s ease-out forwards; }
  .banner-anim-zoom { animation: customZoomIn 0.4s ease-out forwards; }
  .banner-anim-bounce { animation: customBounceIn 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; }
`;

// Helper component to get unique User ID & Role
const getCurrentUserInfo = () => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
        try { 
            const user = JSON.parse(userStr);
            if (user) {
                return {
                    userId: user.id ? `user_${String(user.id)}` : 'session_guest',
                    userRole: user.role || 'end_user'
                };
            }
        } catch (e) { 
            return { userId: 'session_guest', userRole: 'end_user' }; 
        }
    }
    return { userId: 'session_guest', userRole: 'end_user' };
};

const isExternalLink = (url) => {
    if (!url) return false;
    return /^(?:[a-z+]+:)?\/\//i.test(url) || url.startsWith('mailto:') || url.startsWith('tel:');
};

const resolveInternalLink = (url, userRole) => {
    if (!url) return '/';
    if (isExternalLink(url)) return url;
    
    let path = url.trim();
    if (!path.startsWith('/')) path = `/${path}`;

    const isCorpOrViewer = (userRole === 'corporate_admin' || userRole === 'viewer');
    const rolePrefix = isCorpOrViewer ? '/corporate-admin' : '/end-user';

    // Map un-scoped routes to the user's role prefix
    if (path.startsWith('/lg-records')) {
        return `${rolePrefix}${path}`;
    }
    if (path.startsWith('/facilities') || path.startsWith('/issuance/facilities')) {
        return `/corporate-admin/issuance/facilities`;
    }
    if (path.startsWith('/issuance/issued-lgs')) {
        return `${rolePrefix}/issuance/issued-lgs`;
    }
    if (path.startsWith('/issuance/requests')) {
        return `${rolePrefix}/issuance/requests`;
    }
    if (path.startsWith('/issuance/reconciliation')) {
        return `${rolePrefix}/issuance/reconciliation`;
    }
    if (path.startsWith('/approval-center') || path.startsWith('/corporate-admin/approval-center')) {
        return `/corporate-admin/approval-inbox`;
    }
    if (path.startsWith('/quotations/')) {
        return `${rolePrefix}${path}`;
    }
    
    return path;
};

// --- WRAPPER COMPONENT WITH VIEW LOGGING FIX (USING REF) ---
const NotificationWithViewLog = ({ notification, onDismiss, getTypeConfig, animationClassMap, userRole, navigate }) => {
    
    // CRITICAL FIX: Use a Ref to track if the API call was made in the current mount cycle
    const hasLoggedViewRef = useRef(false); 
    
    // EFFECT: Log the view when this specific notification component mounts (is displayed)
    useEffect(() => {
        const freq = notification.display_frequency;
        
        // 1. Check if view tracking is required (once or repeat-x-times)
        const requiresTracking = freq === 'once' || freq === 'repeat-x-times';

        if (requiresTracking) {
            
            // 2. CHECK REF: If the view has already been logged by this specific component instance, skip.
            if (hasLoggedViewRef.current) {
                return; 
            }
            
            // 3. Log the view
            logNotificationView(notification.id)
                .then(() => {
                    // 4. Mark as logged for this component instance after successful API call
                    hasLoggedViewRef.current = true;
                })
                .catch(error => {
                    console.error("Failed to log notification view:", error);
                });
        }
    // Dependency only includes notification properties.
    }, [notification.id, notification.display_frequency]);

    const handleLinkClick = (e) => {
        if (isExternalLink(notification.link)) {
            onDismiss(notification);
            return;
        }
        e.preventDefault();
        onDismiss(notification);
        const targetPath = resolveInternalLink(notification.link, userRole);
        navigate(targetPath);
    };

    const config = getTypeConfig(notification);
    const IconComponent = config.icon;
    const animType = notification.animation_type || 'fade';
    const animationClass = animationClassMap[animType] || 'banner-anim-fade';
    const isExternal = isExternalLink(notification.link);

    return (
        <div key={notification.id} className={`relative border p-4 rounded-2xl shadow-sm flex items-start gap-3 ${config.bannerCls} ${animationClass}`} role="alert">
          
          {/* Icon */}
          <div className={`p-2 rounded-xl flex-shrink-0 ${config.iconBadgeCls}`}>
            <IconComponent className={`h-5 w-5 ${config.iconColor}`} />
          </div>

          <div className="flex-1 min-w-0 pr-7">
            <p className={`font-bold text-xs uppercase tracking-wider mb-1 ${config.titleCls}`}>{config.defaultTitle}</p>
            
            {/* UPDATED: Flex container for Image + Text */}
            <div className="flex flex-col sm:flex-row gap-3">
                {notification.image_url && (
                    <div className="flex-shrink-0">
                        <img 
                            src={notification.image_url} 
                            alt="Thumbnail" 
                            className="h-16 w-24 object-cover rounded-xl border border-black/10" 
                        />
                    </div>
                )}
                
                <div className="text-sm leading-relaxed">
                    {/* Content Text */}
                    <p>{notification.content}</p>
                    
                    {/* Link */}
                    {notification.link && (
                        <div className="mt-2">
                             <a 
                                href={isExternal ? notification.link : resolveInternalLink(notification.link, userRole)} 
                                onClick={handleLinkClick}
                                className="inline-flex items-center font-semibold underline opacity-90 hover:opacity-100 cursor-pointer" 
                                target={isExternal ? "_blank" : "_self"} 
                                rel={isExternal ? "noopener noreferrer" : undefined}
                             >
                                Learn More &rarr;
                             </a>
                        </div>
                    )}
                </div>
            </div>
          </div>

          {/* Dismiss button */}
          <button onClick={() => onDismiss(notification)} className="absolute top-3 right-3 p-1.5 rounded-lg hover:bg-black/5 shadow-none transition-colors" title="Dismiss">
            <X className="h-4 w-4 opacity-60 hover:opacity-100" />
          </button>
        </div>
    );
};


function NotificationBanner({ notifications }) {
  const [visibleNotifications, setVisibleNotifications] = useState([]);
  const navigate = useNavigate();
  const { userId, userRole } = getCurrentUserInfo();

  // Inject the animation styles globally if they aren't handled elsewhere
  useEffect(() => {
      if (typeof document !== 'undefined' && !document.getElementById('notification-animations')) {
          const style = document.createElement('style');
          style.id = 'notification-animations';
          style.innerHTML = animationStyles;
          document.head.appendChild(style);
      }
  }, []);

  useEffect(() => {
    if (notifications && notifications.length > 0) {
      const filtered = notifications.filter(shouldShowNotification);
      setVisibleNotifications(filtered);
    } else {
        setVisibleNotifications([]);
    }
  }, [notifications]);

  // --- Logic: Dismissal & Frequency (PRESERVED) ---
  const shouldShowNotification = (notification) => {
    const freq = notification.display_frequency || 'once-per-login';
    const storageKey = `notif_seen_${userId}_${notification.id}`;

    if (userId === 'session_guest') {
        if (freq === 'once-per-login') return !sessionStorage.getItem(storageKey);
        return true; 
    }
    
    if (freq === 'once') return !localStorage.getItem(storageKey);
    if (freq === 'once-per-login') return !sessionStorage.getItem(storageKey);
    
    // For 'repeat-x-times', we rely entirely on the backend's filtering.
    if (freq === 'repeat-x-times') {
        return true;
    }
    
    return true;
  };

  const handleDismiss = async (notification) => {
    // 1. Remove from UI immediately
    setVisibleNotifications(prev => prev.filter(n => n.id !== notification.id));

    // 2. Client-Side Tracking (Session/Local Storage)
    const freq = notification.display_frequency || 'once-per-login';
    const storageKey = `notif_seen_${userId}_${notification.id}`;

    if (userId !== 'session_guest') {
        if (freq === 'once') localStorage.setItem(storageKey, 'true');
        else if (freq === 'once-per-login') sessionStorage.setItem(storageKey, 'true');
    }

    // 3. Server-Side Tracking
    try {
        await acknowledgeSystemNotification(notification.id);
    } catch (err) {
        console.error("Failed to sync notification dismissal with server:", err);
    }
  };

  const handleModalLinkClick = (e, notification) => {
    if (isExternalLink(notification.link)) {
        handleDismiss(notification);
        return;
    }
    e.preventDefault();
    handleDismiss(notification);
    const targetPath = resolveInternalLink(notification.link, userRole);
    navigate(targetPath);
  };

  if (!visibleNotifications || visibleNotifications.length === 0) return null;

  const modals = visibleNotifications.filter(n => n.is_popup);
  const banners = visibleNotifications.filter(n => !n.is_popup);

  const getTypeConfig = (notification) => {
    let typeKey = notification.notification_type || notification.type || 'system_info';
    if (typeKey === 'system') typeKey = 'system_info';

    const configs = {
      system_info: {
        bannerCls: "bg-blue-50/90 border-blue-200 text-blue-900",
        headerBgCls: "bg-blue-50/70",
        titleCls: "text-blue-900",
        iconBadgeCls: "bg-blue-100/80 text-blue-600",
        iconColor: "text-blue-600",
        icon: Info,
        defaultTitle: "System Announcement"
      },
      system_critical: {
        bannerCls: "bg-rose-50/90 border-rose-200 text-rose-900",
        headerBgCls: "bg-rose-50/70",
        titleCls: "text-rose-900",
        iconBadgeCls: "bg-rose-100/80 text-rose-600",
        iconColor: "text-rose-600",
        icon: AlertTriangle,
        defaultTitle: "Critical Alert"
      },
      news: {
        bannerCls: "bg-emerald-50/90 border-emerald-200 text-emerald-900",
        headerBgCls: "bg-emerald-50/70",
        titleCls: "text-emerald-900",
        iconBadgeCls: "bg-emerald-100/80 text-emerald-600",
        iconColor: "text-emerald-600",
        icon: Newspaper,
        defaultTitle: "Latest News"
      },
      cbe: {
        bannerCls: "bg-cyan-50/90 border-cyan-200 text-cyan-900",
        headerBgCls: "bg-cyan-50/70",
        titleCls: "text-cyan-900",
        iconBadgeCls: "bg-cyan-100/80 text-cyan-700",
        iconColor: "text-cyan-700",
        icon: Building2,
        defaultTitle: "CBE Update"
      },
      ad: {
        bannerCls: "bg-purple-50/90 border-purple-200 text-purple-900",
        headerBgCls: "bg-purple-50/70",
        titleCls: "text-purple-900",
        iconBadgeCls: "bg-purple-100/80 text-purple-600",
        iconColor: "text-purple-600",
        icon: Megaphone,
        defaultTitle: "Sponsored"
      }
    };
    return configs[typeKey] || configs.system_info;
  };

  const animationClassMap = {
    'fade': 'banner-anim-fade',
    'slide-left': 'banner-anim-slide-left',
    'scroll-left': 'banner-anim-scroll-left',
    'zoom': 'banner-anim-zoom',
    'bounce': 'banner-anim-bounce',
  };

  return (
    <>
      <style>{animationStyles}</style>
      
      {/* MODALS */}
      {modals.map((notification, idx) => {
        const config = getTypeConfig(notification);
        const IconComponent = config.icon;
        const zIndex = 50 + idx; 
        const isExternal = isExternalLink(notification.link);

        return (
          <div key={notification.id} className="fixed inset-0 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4" style={{ zIndex }}>
            <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden banner-anim-zoom">
              
              {/* UPDATED: Hero Image for Popup */}
              {notification.image_url && (
					<div className="w-full bg-slate-100 relative">
						<img 
							src={notification.image_url} 
							alt="Notification" 
							className="w-full h-auto max-h-[50vh] object-contain" 
						/>
					</div>
				)}

              <div className={`px-6 py-4 border-b border-slate-100 flex items-center justify-between ${config.headerBgCls}`}>
                 <div className="flex items-center gap-3">
                   <div className={`p-2 rounded-xl ${config.iconBadgeCls}`}>
                     <IconComponent className={`h-5 w-5 ${config.iconColor}`} />
                   </div>
                   <h3 className={`text-base font-bold uppercase tracking-wide ${config.titleCls}`}>{config.defaultTitle}</h3>
                 </div>
                 <button
                   onClick={() => handleDismiss(notification)}
                   className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-black/5 shadow-none transition-colors"
                   title="Dismiss"
                 >
                   <X className="h-4 w-4" />
                 </button>
              </div>
              
              <div className="p-6 space-y-4">
                 <p className="text-slate-700 text-sm leading-relaxed whitespace-pre-wrap">{notification.content}</p>
                 {notification.link && (
                    <div className="pt-1">
                       <a 
                         href={isExternal ? notification.link : resolveInternalLink(notification.link, userRole)} 
                         onClick={(e) => handleModalLinkClick(e, notification)}
                         target={isExternal ? "_blank" : "_self"} 
                         rel={isExternal ? "noopener noreferrer" : undefined} 
                         className="inline-flex items-center text-sm text-blue-600 font-semibold underline hover:text-blue-800 cursor-pointer"
                       >
                         View Details &rarr;
                       </a>
                    </div>
                 )}
              </div>
              
              <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex justify-end">
                 <button
                   onClick={() => handleDismiss(notification)}
                   className="inline-flex items-center justify-center px-5 py-2 border border-transparent text-sm font-semibold rounded-xl shadow-sm text-white bg-blue-600 hover:bg-blue-700 transition-colors"
                 >
                   <CheckCircle className="h-4 w-4 mr-2" />
                   {notification.popup_action_label || "Acknowledge"}
                 </button>
              </div>
            </div>
          </div>
        );
      })}

      {/* BANNERS */}
      <div className="space-y-4 mb-6 relative z-0">
        {banners.map((notification) => (
          <NotificationWithViewLog 
            key={notification.id} 
            notification={notification} 
            onDismiss={handleDismiss} 
            getTypeConfig={getTypeConfig}
            animationClassMap={animationClassMap}
            userRole={userRole}
            navigate={navigate}
          />
        ))}
      </div>
    </>
  );
}

export default NotificationBanner;