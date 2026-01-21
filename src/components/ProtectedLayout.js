// frontend/src/components/ProtectedLayout.js
import React, { useState, useEffect } from 'react';
import { useLocation, Outlet } from 'react-router-dom';
// NEW: Imported specific icons for the new themes
import { Sun, Moon, Coffee, Leaf } from 'lucide-react'; 

import SidebarLayout from './Layout/SidebarLayout';
import CorporateAdminLayout from './Layout/CorporateAdminLayout';
import EndUserLayout from './Layout/EndUserLayout';
import ViewerLayout from './Layout/ViewerLayout'; 
import { fetchActiveSystemNotifications } from '../services/notificationService';

function ProtectedLayout({ onLogout, userRole, userPermissions, customerName, subscriptionStatus, subscriptionEndDate }) {
  const location = useLocation();
  const [activeMenuItem, setActiveMenuItem] = useState(null);
  const [headerTitle, setHeaderTitle] = useState('');
  const [systemNotifications, setSystemNotifications] = useState([]);

  // --- NEW: ADVANCED THEME ENGINE ---
  // We now track a specific theme name string instead of a boolean
  // Options: 'light', 'slate', 'beige', 'green'
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'light');

  useEffect(() => {
    const root = window.document.documentElement;
    
    // 1. Reset: Remove all theme classes first to prevent conflicts
    root.classList.remove('dark', 'theme-beige', 'theme-green');

    // 2. Apply: Add classes based on the selected theme
    if (theme === 'light') {
        // Do nothing (Default)
    } else if (theme === 'slate') {
        root.classList.add('dark');
    } else if (theme === 'beige') {
        root.classList.add('dark', 'theme-beige');
    } else if (theme === 'green') {
        root.classList.add('dark', 'theme-green');
    }

    // 3. Persist
    localStorage.setItem('theme', theme);
  }, [theme]);

  // Cycle Order: Light -> Slate -> Beige -> Green -> Light
  const cycleTheme = () => {
    setTheme((prev) => {
        if (prev === 'light') return 'slate';
        if (prev === 'slate') return 'beige';
        if (prev === 'beige') return 'green';
        return 'light';
    });
  };

  // Helper to get the icon and color for the floating button
  const getThemeButtonProps = () => {
      switch(theme) {
          case 'slate': return { icon: <Moon className="h-6 w-6" />, style: 'bg-slate-800 text-blue-400 border-slate-600', label: 'Slate Mode' };
          case 'beige': return { icon: <Coffee className="h-6 w-6" />, style: 'bg-stone-800 text-amber-400 border-stone-600', label: 'Coffee Mode' };
          case 'green': return { icon: <Leaf className="h-6 w-6" />, style: 'bg-emerald-900 text-emerald-400 border-emerald-700', label: 'Forest Mode' };
          default: return { icon: <Sun className="h-6 w-6" />, style: 'bg-white text-yellow-500 border-gray-200', label: 'Light Mode' };
      }
  };
  
  const themeProps = getThemeButtonProps();
  // -------------------------------
  
  const getActiveState = (currentPath, role) => {
    let activeItem = null;
    let title = '';

    if (!currentPath || !role) {
      return { activeItem, title };
    }
    
    if (role === 'system_owner') {
      if (currentPath.startsWith('/system-owner/dashboard')) { activeItem = 'dashboard'; title = 'Treasury Dashboard'; }
      else if (currentPath.startsWith('/system-owner/customers')) { activeItem = 'customer-management'; title = 'Customer Management'; }
      else if (currentPath.startsWith('/system-owner/subscription-plans')) { activeItem = 'subscription-plans'; title = 'Subscription Plans'; }
      else if (currentPath.startsWith('/system-owner/global-configurations')) { activeItem = 'Global Configurations'; }
      else if (currentPath.startsWith('/system-owner/reports')) { activeItem = 'reports'; title = 'System Reports'; }
      else if (currentPath.startsWith('/system-owner/audit-logs')) { activeItem = 'audit-logs'; title = 'Audit Logs'; }
      else if (currentPath.startsWith('/system-owner/notifications')) { activeItem = 'notifications'; title = 'Notifications'; }
      else if (currentPath.startsWith('/system-owner/profile')) { activeItem = 'profile'; title = 'My Profile'; }
    } 
    else if (role === 'corporate_admin') {
       if (currentPath.startsWith('/corporate-admin/dashboard')) { activeItem = 'dashboard'; title = 'Dashboard'; }
       else if (currentPath.startsWith('/corporate-admin/lg-records')) { activeItem = 'lg-records'; title = 'LG Records'; }
       else if (currentPath.startsWith('/corporate-admin/lg-issuance')) { activeItem = 'lg-issuance'; title = 'LG Issuance'; }
       else if (currentPath.startsWith('/corporate-admin/users')) { activeItem = 'user-management'; title = 'User Management'; }
       else if (currentPath.startsWith('/corporate-admin/departments')) { activeItem = 'department-management'; title = 'Departments'; }
       else if (currentPath.startsWith('/corporate-admin/reports')) { activeItem = 'reports'; title = 'Reports'; }
       else if (currentPath.startsWith('/corporate-admin/subscription')) { activeItem = 'subscription'; title = 'Subscription'; }
       else if (currentPath.startsWith('/corporate-admin/audit-logs')) { activeItem = 'audit-logs'; title = 'Audit Logs'; }
       else if (currentPath.startsWith('/corporate-admin/notifications')) { activeItem = 'notifications'; title = 'Notifications'; }
       else if (currentPath.startsWith('/corporate-admin/profile')) { activeItem = 'profile'; title = 'My Profile'; }
    }
    else if (role === 'end_user') {
       if (currentPath.startsWith('/end-user/dashboard')) { activeItem = 'dashboard'; title = 'Dashboard'; }
       else if (currentPath.startsWith('/end-user/lg-records')) { activeItem = 'lg-records'; title = 'LG Records'; }
       else if (currentPath.startsWith('/end-user/internal-owner-contacts')) { activeItem = 'internal-owners'; title = 'Internal Owners'; }
       else if (currentPath.startsWith('/end-user/notifications')) { activeItem = 'notifications'; title = 'Notifications'; }
       else if (currentPath.startsWith('/end-user/profile')) { activeItem = 'profile'; title = 'My Profile'; }
    }
    else if (role === 'viewer') {
       if (currentPath.startsWith('/viewer/dashboard')) { activeItem = 'dashboard'; title = 'Dashboard'; }
       else if (currentPath.startsWith('/viewer/lg-records')) { activeItem = 'lg-records'; title = 'LG Records'; }
       else if (currentPath.startsWith('/viewer/reports')) { activeItem = 'reports'; title = 'Reports'; }
       else if (currentPath.startsWith('/viewer/notifications')) { activeItem = 'notifications'; title = 'Notifications'; }
       else if (currentPath.startsWith('/viewer/profile')) { activeItem = 'profile'; title = 'My Profile'; }
    }

    return { activeItem, title };
  };

  useEffect(() => {
    const { activeItem, title } = getActiveState(location.pathname, userRole);
    setActiveMenuItem(activeItem);
    setHeaderTitle(title);
  }, [location.pathname, userRole]);

  useEffect(() => {
    const loadNotifications = async () => {
        try {
            const data = await fetchActiveSystemNotifications();
            setSystemNotifications(data);
        } catch (error) {
            console.error("Failed to load system notifications in layout", error);
        }
    };
    loadNotifications();
  }, []);

  // --- NEW: Wrapper with Dynamic Theme Button ---
  const LayoutWithThemeButton = ({ children }) => (
    <>
      {children}
      <button
		disabled={true} // remove this line to enable the color button
        onClick={cycleTheme}
        className={`fixed top-2 right-5 p-0.1 rounded-full shadow-xl hover:shadow-2xl hover:scale-110 transition-all duration-300 z-[9999] border-2 ${themeProps.style}`}
        title={`Current: ${themeProps.label} (Click to Cycle)`}
      >
        {themeProps.icon}
      </button>
    </>
  );

  if (userRole === 'system_owner') {
    return (
      <LayoutWithThemeButton>
        <SidebarLayout
          onLogout={onLogout}
          activeMenuItem={activeMenuItem}
          headerTitle={headerTitle}
          systemNotifications={systemNotifications}
        >
          <Outlet />
        </SidebarLayout>
      </LayoutWithThemeButton>
    );
  } else if (userRole === 'corporate_admin') {
    return (
        <LayoutWithThemeButton>
            <CorporateAdminLayout
                onLogout={onLogout}
                activeMenuItem={activeMenuItem}
                customerName={customerName}
                headerTitle={headerTitle}
                systemNotifications={systemNotifications}
                subscriptionStatus={subscriptionStatus} 
                subscriptionEndDate={subscriptionEndDate}
            >
                <Outlet />
            </CorporateAdminLayout>
        </LayoutWithThemeButton>
    );
  } else if (userRole === 'end_user') {
    return (
        <LayoutWithThemeButton>
            <EndUserLayout
                onLogout={onLogout}
                activeMenuItem={activeMenuItem}
                customerName={customerName}
                headerTitle={headerTitle}
                systemNotifications={systemNotifications}
                subscriptionStatus={subscriptionStatus}
                subscriptionEndDate={subscriptionEndDate}
                userPermissions={userPermissions}
            >
                <Outlet />
            </EndUserLayout>
        </LayoutWithThemeButton>
    );
  } else if (userRole === 'viewer') {
    return (
        <LayoutWithThemeButton>
            <ViewerLayout
                onLogout={onLogout}
                activeMenuItem={activeMenuItem}
                customerName={customerName}
                headerTitle={headerTitle}
                systemNotifications={systemNotifications}
            >
                <Outlet />
            </ViewerLayout>
        </LayoutWithThemeButton>
    );
  } else {
    return (
      <div className="text-center py-8">
        <svg className="animate-spin h-8 w-8 text-blue-600 mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <p className="mt-2 text-gray-500">Loading...</p>
      </div>
    );
  }
}

export default ProtectedLayout;