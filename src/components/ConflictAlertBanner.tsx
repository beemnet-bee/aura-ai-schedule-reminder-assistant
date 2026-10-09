import React from 'react';
import { ConflictItem } from '../types/assistant';
import { AlertTriangle, Sparkles, Clock } from 'lucide-react';
import { formatTime12h } from '../utils/dateUtils';

interface ConflictAlertBannerProps {
  conflicts: ConflictItem[];
  onAutoResolve: () => void;
  isResolving?: boolean;
}

export const ConflictAlertBanner: React.FC<ConflictAlertBannerProps> = ({
  conflicts,
  onAutoResolve,
  isResolving = false,
}) => {
  if (conflicts.length === 0) return null;

  return (
    <div className="bg-amber-500/10 border border-amber-300 rounded-2xl p-4 mb-4 text-amber-950 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-xl bg-amber-500 text-white shrink-0 mt-0.5">
          <AlertTriangle className="w-5 h-5" />
        </div>
        <div>
          <h4 className="text-sm font-bold flex items-center gap-2">
            <span>Schedule Conflict Detected</span>
            <span className="text-[11px] font-semibold bg-amber-200 text-amber-900 px-2 py-0.5 rounded-full">
              {conflicts.length} Overlap{conflicts.length > 1 ? 's' : ''}
            </span>
          </h4>
          <p className="text-xs text-amber-800 mt-0.5 max-w-xl">
            {conflicts[0].reason}
            {conflicts.length > 1 && ` (+${conflicts.length - 1} more)`}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
        <button
          onClick={onAutoResolve}
          disabled={isResolving}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 active:scale-95 text-white text-xs font-bold shadow-xs transition-all disabled:opacity-50"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>{isResolving ? 'Resolving with Aura...' : 'AI Auto-Resolve Overlaps'}</span>
        </button>
      </div>
    </div>
  );
};
