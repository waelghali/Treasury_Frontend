import { useEffect } from 'react';

/**
 * Warns the user via the native browser confirmation prompt before closing
 * or reloading the tab when a long form has unsaved edits.
 */
export default function useUnsavedChangesGuard(when) {
  useEffect(() => {
    if (!when || typeof window === 'undefined') return undefined;

    const handleBeforeUnload = (event) => {
      event.preventDefault();
      event.returnValue = '';
      return '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [when]);
}
