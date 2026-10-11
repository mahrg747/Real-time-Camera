import React from 'react';
import { MapPin, Navigation, AlertTriangle, RefreshCw, Compass } from 'lucide-react';
import { GpsLocation } from '../types';

interface GpsStatusBadgeProps {
  location: GpsLocation;
  onRefresh: () => void;
  compact?: boolean;
}

export const GpsStatusBadge: React.FC<GpsStatusBadgeProps> = ({
  location,
  onRefresh,
  compact = false,
}) => {
  const isDenied = location.error && location.error.includes('denied');
  const hasCoordinates = location.latitude !== null && location.longitude !== null;
  const isAccurate = location.accuracy !== null && location.accuracy <= 15;

  let badgeColor = 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300';
  let dotColor = 'bg-emerald-400';
  let statusText = 'GPS Active';

  if (location.isLocating) {
    badgeColor = 'bg-sky-500/15 border-sky-500/30 text-sky-300';
    dotColor = 'bg-sky-400 animate-pulse';
    statusText = 'Acquiring GPS...';
  } else if (isDenied) {
    badgeColor = 'bg-rose-500/15 border-rose-500/30 text-rose-300';
    dotColor = 'bg-rose-400';
    statusText = 'GPS Denied';
  } else if (!hasCoordinates) {
    badgeColor = 'bg-amber-500/15 border-amber-500/30 text-amber-300';
    dotColor = 'bg-amber-400';
    statusText = 'No GPS Fix';
  } else if (!isAccurate) {
    badgeColor = 'bg-amber-500/15 border-amber-500/30 text-amber-300';
    dotColor = 'bg-amber-400';
    statusText = 'Weak Fix';
  }

  if (compact) {
    return (
      <button
        onClick={onRefresh}
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border backdrop-blur-md transition-all ${badgeColor} active:scale-95`}
        title={location.error || 'Click to refresh GPS position'}
      >
        <span className={`w-2 h-2 rounded-full ${dotColor}`} />
        <span>{location.accuracy ? `±${location.accuracy}m` : statusText}</span>
        <RefreshCw className={`w-3 h-3 ${location.isLocating ? 'animate-spin' : ''}`} />
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-1 w-full max-w-sm">
      <div className={`flex items-center justify-between px-3 py-1.5 rounded-lg text-xs border backdrop-blur-md ${badgeColor}`}>
        <div className="flex items-center gap-2 truncate">
          <span className={`w-2 h-2 rounded-full shrink-0 ${dotColor}`} />
          <span className="font-semibold">{statusText}</span>
          {location.accuracy !== null && (
            <span className="font-mono-numbers text-[11px] text-slate-300">
              (±{location.accuracy}m)
            </span>
          )}
        </div>

        <button
          onClick={onRefresh}
          disabled={location.isLocating}
          className="p-1 rounded hover:bg-white/10 active:scale-95 transition-transform flex items-center gap-1 text-[11px] font-medium text-slate-200"
          title="Refresh GPS location"
        >
          <RefreshCw className={`w-3 h-3 ${location.isLocating ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {hasCoordinates && (
        <div className="flex items-center justify-between text-[11px] text-slate-300 px-1 font-mono-numbers">
          <div className="flex items-center gap-1 truncate">
            <MapPin className="w-3 h-3 text-sky-400 shrink-0" />
            <span className="truncate">
              {location.latitude?.toFixed(5)}, {location.longitude?.toFixed(5)}
            </span>
          </div>
          {location.altitude !== null && (
            <div className="flex items-center gap-1 text-slate-400 text-[10px]">
              <Compass className="w-2.5 h-2.5 text-slate-400" />
              <span>Alt: {location.altitude}m</span>
            </div>
          )}
        </div>
      )}

      {location.error && (
        <div className="flex items-center gap-1.5 text-[11px] text-rose-300 bg-rose-950/40 border border-rose-800/50 px-2.5 py-1 rounded">
          <AlertTriangle className="w-3 h-3 shrink-0 text-rose-400" />
          <span className="truncate">{location.error}</span>
          <button
            onClick={onRefresh}
            className="ml-auto underline text-white hover:text-rose-200 font-semibold text-[10px]"
          >
            Retry
          </button>
        </div>
      )}
    </div>
  );
};
