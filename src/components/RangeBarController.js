import React from 'react';

/**
 * RangeBarController
 * 
 * A visual and interactive slider/bar controller showing:
 * - A track between [min, max]
 * - A distinct marker indicating the platform default
 * - An active fill and thumb for the current configured value
 * - Supports both compact mode (for data tables) and standard mode (for cards/forms)
 */
const RangeBarController = ({
  min = 0,
  max = 100,
  defaultVal = 50,
  value,
  onChange,
  unit = '',
  step = 1,
  disabled = false,
  compact = false,
  showValue = false,
  label = '',
  showLabels = true,
  className = '',
}) => {
  const minNum = Number.isFinite(parseFloat(min)) ? parseFloat(min) : 0;
  const maxNum = Number.isFinite(parseFloat(max)) ? parseFloat(max) : 100;
  const defaultNum = Number.isFinite(parseFloat(defaultVal)) ? parseFloat(defaultVal) : minNum;
  
  // If value is undefined, fallback to defaultVal, then min
  const rawVal = value !== undefined && value !== null && value !== '' ? value : defaultNum;
  const currentNum = Number.isFinite(parseFloat(rawVal)) ? parseFloat(rawVal) : minNum;

  const span = maxNum - minNum;
  if (span <= 0) {
    return (
      <span className="text-xs text-gray-400 font-mono">
        {currentNum} {unit}
      </span>
    );
  }

  // Defensively clamp default and current values so they never render outside the track
  const clampedDefault = Math.max(minNum, Math.min(maxNum, defaultNum));
  const clampedCurrent = Math.max(minNum, Math.min(maxNum, currentNum));

  const defaultPct = Math.max(0, Math.min(100, ((clampedDefault - minNum) / span) * 100));
  const currentPct = Math.max(0, Math.min(100, ((clampedCurrent - minNum) / span) * 100));

  const isInteractive = typeof onChange === 'function' && !disabled;

  const handleSliderChange = (e) => {
    if (!isInteractive) return;
    const val = parseFloat(e.target.value);
    onChange(val);
  };

  // Compact mode for data table rows
  if (compact) {
    return (
      <div 
        className={`inline-flex items-center gap-2 select-none ${className}`}
        title={`Current: ${currentNum} ${unit} | Default: ${defaultNum} ${unit} | Range: [${minNum} - ${maxNum}]`}
      >
        <div className="relative w-20 sm:w-24 h-5 flex items-center">
          {/* Base Track */}
          <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
            {/* Active Fill */}
            <div 
              className="h-full bg-blue-500 rounded-full transition-all duration-150"
              style={{ width: `${currentPct}%` }}
            />
          </div>

          {/* Default Marker (Vertical Notch) */}
          <div 
            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-1 h-3 bg-amber-500 rounded-xs shadow-xs z-10 pointer-events-none"
            style={{ left: `${defaultPct}%` }}
            title={`Default: ${defaultNum} ${unit}`}
          />

          {/* Current Value Thumb */}
          <div 
            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3 h-3 bg-white border-2 border-blue-600 rounded-full shadow-xs z-20 pointer-events-none transition-all duration-150"
            style={{ left: `${currentPct}%` }}
          />

          {/* Interactive Range Input overlay if editable */}
          {isInteractive && (
            <input
              type="range"
              min={minNum}
              max={maxNum}
              step={step}
              value={currentNum}
              onChange={handleSliderChange}
              className="absolute inset-0 w-full h-full opacity-0 cursor-ew-resize z-30"
              aria-label={`Adjust ${label || 'value'}`}
            />
          )}
        </div>

        {/* Small Value Readout (only when explicitly requested) */}
        {showValue && (
          <span className="text-[11px] font-mono font-semibold text-slate-700 whitespace-nowrap min-w-[28px]">
            {currentNum}
          </span>
        )}
      </div>
    );
  }

  // Standard mode for cards, policy panels, and modal forms
  const delta = currentNum - defaultNum;
  const hasDelta = delta !== 0;

  return (
    <div className={`space-y-1.5 ${className}`}>
      {/* Header Info */}
      {(label || showLabels) && (
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5">
            {label && <span className="font-semibold text-slate-700">{label}</span>}
            <span className="px-1.5 py-0.5 rounded-md font-mono font-bold text-xs bg-blue-50 text-blue-700 border border-blue-200">
              {currentNum} {unit}
            </span>
          </div>
          <div className="flex items-center gap-1 text-[11px] text-slate-500">
            <span className="inline-block w-2 h-2 rounded-full bg-amber-500" />
            <span>Default: <strong className="text-slate-700 font-mono">{defaultNum} {unit}</strong></span>
            {hasDelta && (
              <span className={`font-semibold ${delta > 0 ? 'text-indigo-600' : 'text-amber-600'}`}>
                ({delta > 0 ? `+${delta}` : delta})
              </span>
            )}
          </div>
        </div>
      )}

      {/* Main Track & Slider */}
      <div className="relative pt-2 pb-1">
        {/* Track Container */}
        <div className="relative h-2 w-full bg-slate-100 border border-slate-200 rounded-full">
          {/* Active Gradient Fill */}
          <div 
            className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full transition-all duration-150"
            style={{ width: `${currentPct}%` }}
          />

          {/* Default Marker Pin */}
          <div 
            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 flex flex-col items-center pointer-events-none z-10"
            style={{ left: `${defaultPct}%` }}
          >
            <div className="w-1.5 h-4 bg-amber-500 rounded-xs shadow-xs" />
            <div className="text-[9px] font-bold text-amber-700 uppercase tracking-tighter mt-0.5 whitespace-nowrap">
              DEF
            </div>
          </div>

          {/* Current Thumb Indicator */}
          <div 
            className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-4 h-4 bg-white border-2 border-indigo-600 rounded-full shadow-md z-20 pointer-events-none transition-all duration-150 ${
              isInteractive ? 'group-hover:scale-110 ring-2 ring-indigo-200' : ''
            }`}
            style={{ left: `${currentPct}%` }}
          />
        </div>

        {/* HTML Range Input for Drag / Click */}
        {isInteractive && (
          <input
            type="range"
            min={minNum}
            max={maxNum}
            step={step}
            value={currentNum}
            onChange={handleSliderChange}
            disabled={disabled}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-30"
            aria-label={`Adjust ${label || 'setting'}`}
          />
        )}
      </div>

      {/* Footer Limits */}
      {showLabels && (
        <div className="flex justify-between items-center text-[10px] text-slate-400 font-mono px-0.5">
          <span>Min: {minNum} {unit}</span>
          <span>Max: {maxNum} {unit}</span>
        </div>
      )}
    </div>
  );
};

export default RangeBarController;
