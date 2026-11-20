// frontend/src/components/LoadingSpinner.js
import React from 'react';
import { Loader2 } from 'lucide-react';

const LoadingSpinner = () => {
  return (
    <div className="flex flex-col justify-center items-center min-h-[200px] py-10 h-full gap-2.5">
      <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      <span className="text-xs font-medium text-slate-500">Loading...</span>
    </div>
  );
};

export default LoadingSpinner;