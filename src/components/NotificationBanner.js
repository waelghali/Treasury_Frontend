import React, { useState, useEffect, useRef } from 'react';
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

  .cbe-colors {
    background-color: #E0F7FA !important;
    border-color: #00BCD4 !important;
    color: #006064 !important;
  }
  .cbe-icon { color: #0097A7 !important; }
`;

// Helper component to get unique User ID
const getCurrentUserId = () => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
        try { 
            const user = JSON.parse(userStr);
            if (user && user.id) {
                return `user_${String(user.id)}`;
            }
        } catch (e) { 
            return 'session_guest'; 
        }
    }
    return 'session_guest';
};

// --- WRAPPER COMPONENT WITH VIEW LOGGING FIX (USING REF) ---
const NotificationWithViewLog = ({ notification, onDismiss, getTypeConfig, animationClassMap }) => {
    
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

    const config = getTypeConfig(notification);
    const IconComponent = config.icon;
    const iconClass = config.iconColor.startsWith('text-') ? config.iconColor : config.iconColor;
    const animType = notification.animation_type || 'fade';
    const animationClass = animationClassMap[animType] || 'banner-anim-fade';

    return (
        <div key={notification.id} className={`relative border-l-4 p-4 rounded-md shadow-sm flex items-start ${config.colorClasses} ${animationClass}`} role="alert">
          
          {/* Icon */}
          <div className="flex-shrink-0 mt-0.5">
            <IconComponent className={`h-5 w-5 ${iconClass}`} />
          </div>

          <div className="ml-3 flex-1 pr-6">
            <p className="font-bold text-sm uppercase tracking-wide opacity-90 mb-1">{config.defaultTitle}</p>
            
            {/* UPDATED: Flex container for Image + Text */}
            <div className="flex flex-col sm:flex-row gap-3">
                {notification.image_url && (
                    <div className="flex-shrink-0">
                        <img 
                            src={notification.image_url} 
                            alt="Thumbnail" 
                            className="h-16 w-24 object-cover rounded-md border border-black/10" 
                        />
                    </div>
                )}
                
                <div className="text-sm">
                    {/* Content Text */}
                    <p>{notification.content}</p>
                    
                    {/* Link */}
                    {notification.link && (
                        <div className="mt-2">
                             <a href={notification.link} className="font-semibold underline opacity-90 hover:opacity-100" target="_blank" rel="noopener noreferrer">
                                Learn More &rarr;
                             </a>
                        </div>
                    )}
                </div>
            </div>
          </div>

          {/* Dismiss button */}
          <button onClick={() => onDismiss(notification)} className="absolute top-2 right-2 p-1 rounded-full hover:bg-black/10 transition-colors" title="Dismiss">
            <X className="h-4 w-4 opacity-60 hover:opacity-100" />
          </button>
        </div>
    );
};


function NotificationBanner({ notifications }) {
  const [visibleNotifications, setVisibleNotifications] = useState([]);
  
  const userId = getCurrentUserId();

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

  if (!visibleNotifications || visibleNotifications.length === 0) return null;

  const modals = visibleNotifications.filter(n => n.is_popup);
  const banners = visibleNotifications.filter(n => !n.is_popup);

  const getTypeConfig = (notification) => {
    let typeKey = notification.notification_type || notification.type || 'system_info';
    if (typeKey === 'system') typeKey = 'system_info';

    const configs = {
      system_info: { colorClasses: "bg-blue-50 border-blue-400 text-blue-800", iconColor: "text-blue-500", icon: Info, defaultTitle: "System Announcement" },
      system_critical: { colorClasses: "bg-red-50 border-red-500 text-red-900", iconColor: "text-red-600", icon: AlertTriangle, defaultTitle: "Critical Alert" },
      news: { colorClasses: "bg-green-50 border-green-400 text-green-800", iconColor: "text-green-500", icon: Newspaper, defaultTitle: "Latest News" },
      cbe: { colorClasses: "cbe-colors", iconColor: "cbe-icon", icon: Building2, defaultTitle: "CBE Update" },
      ad: { colorClasses: "bg-purple-50 border-purple-400 text-purple-800", iconColor: "text-purple-500", icon: Megaphone, defaultTitle: "Sponsored" }
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
        const iconClass = config.iconColor.startsWith('text-') ? config.iconColor : config.iconColor;
        const zIndex = 50 + idx; 

        return (
          <div key={notification.id} className="fixed inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" style={{ zIndex }}>
            <div className={`bg-white rounded-lg shadow-2xl max-w-lg w-full overflow-hidden animate-zoom-in`}>
              
              {/* UPDATED: Hero Image for Popup */}
              {notification.image_url && (
                  <div className="w-full h-48 bg-gray-100 relative">
                      <img 
                          src={notification.image_url} 
                          alt="Notification" 
                          className="w-full h-full object-cover" 
                      />
                  </div>
              )}

              <div className={`p-4 border-b flex items-center ${config.colorClasses.split(' ')[0]}`}>
                 <IconComponent className={`h-6 w-6 mr-3 ${iconClass}`} />
                 <h3 className={`text-lg font-bold uppercase tracking-wide ${config.colorClasses.split(' ')[2]}`}>{config.defaultTitle}</h3>
              </div>
              
              <div className="p-6 space-y-4">
                 <p className="text-gray-800 text-base leading-relaxed whitespace-pre-wrap">{notification.content}</p>
                 {notification.link && (
                    <div className="pt-2">
                       <a href={notification.link} target="_blank" rel="noopener noreferrer" className="text-blue-600 font-semibold underline hover:text-blue-800">View Details &rarr;</a>
                    </div>
                 )}
              </div>
              
              <div className="p-4 bg-gray-50 border-t flex justify-end">
                 <button
                   onClick={() => handleDismiss(notification)}
                   className="inline-flex items-center justify-center px-6 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
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
          />
        ))}
      </div>
    </>
  );
}

export default NotificationBanner;