import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { differenceInDays, parseISO, format } from 'date-fns';

function SubscriptionBanner({ subscriptionEndDate, isExpired, growthRatio = 0 }) {
  if (!subscriptionEndDate) return null;

  const endDate = typeof subscriptionEndDate === 'string' 
    ? parseISO(subscriptionEndDate) 
    : new Date(subscriptionEndDate);
  const today = new Date();
  const daysDiff = differenceInDays(endDate, today);
  const graceDaysLeft = Math.max(0, 30 - Math.abs(daysDiff));
  const formattedEndDate = format(endDate, 'MMM dd, yyyy');

  // AGGRESSIVE scaling — the banner takes over more screen real estate each day
  const verticalPadding = 1 + (growthRatio * 8);       // 1rem  →  9rem
  const titleSize = 1.1 + (growthRatio * 2.5);          // 1.1rem →  3.6rem
  const iconSize = 28 + (growthRatio * 52);              // 28px  →  80px
  const descriptionSize = 0.8 + (growthRatio * 0.5);     // 0.8rem → 1.3rem
  const badgeSize = 0.65 + (growthRatio * 0.25);         // 0.65rem → 0.9rem

  return (
    <div 
      className="w-full relative overflow-hidden transition-all duration-700 ease-in-out"
      style={{ padding: `${verticalPadding}rem 1.5rem` }}
    >
      {/* Gradient background */}
      <div className={`absolute inset-0 ${
        isExpired 
          ? 'bg-gradient-to-r from-red-700 via-red-600 to-orange-500' 
          : 'bg-gradient-to-r from-amber-500 via-orange-500 to-red-500'
      }`} />
      
      {/* Subtle pattern overlay for depth */}
      <div className="absolute inset-0 opacity-[0.07]" style={{
        backgroundImage: 'radial-gradient(circle at 25% 50%, white 1px, transparent 1px), radial-gradient(circle at 75% 50%, white 1px, transparent 1px)',
        backgroundSize: '40px 40px'
      }} />

      <div className="relative flex flex-col items-center justify-center text-center max-w-5xl mx-auto">
        {/* Warning Icon — grows with pressure */}
        <AlertTriangle 
          className={`mb-4 shrink-0 ${isExpired ? 'text-white' : 'text-yellow-200'} ${growthRatio > 0.3 ? 'animate-bounce' : 'animate-pulse'}`}
          style={{ width: iconSize, height: iconSize }}
        />

        {/* Status badge */}
        <div className="flex items-center gap-3 mb-2 flex-wrap justify-center">
          <span 
            className={`px-3 py-1 font-bold uppercase tracking-widest rounded-full ${
              isExpired 
                ? 'bg-red-900/40 text-white border border-red-300/30' 
                : 'bg-orange-700/30 text-white border border-orange-300/30'
            }`}
            style={{ fontSize: `${badgeSize}rem` }}
          >
            {isExpired ? 'Critical State' : 'Attention Required'}
          </span>
          <span className="text-white/70 font-medium" style={{ fontSize: `${badgeSize}rem` }}>
            Subscription ended: {formattedEndDate}
          </span>
        </div>

        {/* Title — aggressive growth */}
        <h2 
          className="font-black text-white uppercase tracking-tighter leading-none transition-all" 
          style={{ fontSize: `${titleSize}rem` }}
        >
          {isExpired 
            ? <>Grace Period Expiring in <span className="text-yellow-300">{String(graceDaysLeft).padStart(2, '0')} Days</span></>
            : <>Renewal Required — <span className="text-yellow-200">{String(graceDaysLeft).padStart(2, '0')} Days Left</span></>
          }
        </h2>

        {/* Description */}
        <p 
          className="text-white/80 mt-3 leading-relaxed max-w-3xl transition-all" 
          style={{ fontSize: `${descriptionSize}rem` }}
        >
          {isExpired 
            ? 'Your access is in critical suspension. All actions are restricted to read-only. Immediate action required to prevent data loss.'
            : 'Your subscription has ended. Actions will be progressively restricted. Please renew to maintain full access.'
          }
        </p>
      </div>
    </div>
  );
}

export default SubscriptionBanner;