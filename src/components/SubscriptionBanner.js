import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { differenceInDays, parseISO } from 'date-fns';

function SubscriptionBanner({ subscriptionEndDate, isExpired, growthRatio }) {
  if (!subscriptionEndDate) return null;

  // Ensure date parsing is robust
  const endDate = typeof subscriptionEndDate === 'string' 
    ? parseISO(subscriptionEndDate) 
    : new Date(subscriptionEndDate);
  const today = new Date();
  
  // Calculate absolute days for the display text
  const daysDiff = differenceInDays(endDate, today);
  const displayDays = Math.abs(daysDiff);

  // Scaling internal elements
  const fontSize = 1 + (growthRatio * 3); // 1rem to 3rem
  const iconSize = 12 + (growthRatio * 60); // 24px to 84px
  const verticalPadding = 0 + (growthRatio * 10); // 1.5rem to 5.5rem

  return (
    <div 
      className={`w-full flex flex-col items-center justify-center border-b-8 transition-all duration-700 ease-in-out ${
        isExpired ? 'bg-red-600 text-white border-red-900' : 'bg-yellow-400 text-black border-yellow-600'
      }`}
      style={{ padding: `${verticalPadding}rem 1.5rem` }}
    >
      <AlertTriangle 
        style={{ width: iconSize, height: iconSize }} 
        className="mb-4 animate-bounce shrink-0" 
      />
      <div className="text-center px-4 max-w-5xl">
        <h2 
          className="font-black uppercase tracking-tighter leading-none transition-all" 
          style={{ fontSize: `${fontSize}rem` }}
        >
          {isExpired ? 'SUBSCRIPTION EXPIRED' : 'RENEWAL REQUIRED'}
        </h2>
        <p 
          className="font-bold mt-4 transition-all" 
          style={{ fontSize: `${0.9 + (growthRatio * 0.6)}rem` }}
        >
          {isExpired 
            ? `Grace period: ${Math.max(0, 30 - displayDays)} days remaining until total lockout.` 
            : `ATTENTION: Your subscription expired since ${displayDays} days.`}
        </p>
        <Link
          to="/renewal"
          className="mt-8 inline-block bg-white text-black font-black py-4 px-12 rounded-full shadow-2xl hover:scale-110 transition-transform text-xl"
        >
          RENEW NOW
        </Link>
      </div>
    </div>
  );
}

export default SubscriptionBanner;