import React, { useEffect, useState } from 'react';
import { CheckCircle2, WifiOff } from 'lucide-react';

/**
 * Pure browser-event banner that alerts users immediately when internet drops
 * and confirms briefly when connectivity returns. Zero network polling.
 */
export default function OfflineStatusBanner() {
  const [isOffline, setIsOffline] = useState(() =>
    typeof navigator !== 'undefined' ? !navigator.onLine : false
  );
  const [showReconnected, setShowReconnected] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    let reconnectTimer = null;

    const handleOffline = () => {
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
      }
      setIsOffline(true);
      setShowReconnected(false);
    };

    const handleOnline = () => {
      setIsOffline(false);
      setShowReconnected(true);
      if (reconnectTimer) clearTimeout(reconnectTimer);
      reconnectTimer = setTimeout(() => {
        setShowReconnected(false);
      }, 3000);
    };

    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);

    return () => {
      if (reconnectTimer) clearTimeout(reconnectTimer);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
    };
  }, []);

  if (!isOffline && !showReconnected) {
    return null;
  }

  if (isOffline) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="sticky top-0 z-[10000] bg-amber-600 text-white text-xs sm:text-sm font-medium px-4 py-2 shadow-md flex items-center justify-center gap-2"
      >
        <WifiOff className="h-4 w-4 shrink-0" aria-hidden="true" />
        <span>
          You&apos;re offline — waiting for internet connection. Your screen stays open until Wi-Fi returns.
        </span>
      </div>
    );
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className="sticky top-0 z-[10000] bg-emerald-600 text-white text-xs sm:text-sm font-medium px-4 py-1.5 shadow-sm flex items-center justify-center gap-2"
    >
      <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
      <span>Back online — connection restored.</span>
    </div>
  );
}
