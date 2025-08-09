// frontend/src/components/LoadingSpinner.js
import React from 'react';

const LoadingSpinner = () => {
  return (
    <div className="flex justify-center items-center h-full">
      <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
    </div>
  );
};

export default LoadingSpinner;