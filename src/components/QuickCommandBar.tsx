/**
 * @file QuickCommandBar.tsx
 * @description Global spotlight command palette (invoked via Cmd+K / Ctrl+K or search bar).
 * Enables natural language parsing of conversational text into structured calendar events
 * or reminders with instant one-click scheduling.
 */

import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, Calendar, Clock, Check, X, ArrowRight, AlertCircle } from 'lucide-react';
import { CalendarEvent, Reminder } from '../types/assistant';
import { formatTime12h, formatReadableDate } from '../utils/dateUtils';
import { playCompleteSound } from '../utils/audio';

interface QuickCommandBarProps {
  /** Whether the command bar is currently visible */
  isOpen: boolean;
  /** Callback to close the spotlight bar */
  onClose: () => void;
  /** Callback invoked when a parsed event is accepted */
  onAddEvent: (event: CalendarEvent) => void;
  /** Callback invoked when a parsed reminder is accepted */
  onAddReminder: (reminder: Reminder) => void;
  /** Reference active date string */
  currentDate: string;
}

export const QuickCommandBar: React.FC<QuickCommandBarProps> = ({
  isOpen,
  onClose,
  onAddEvent,
  onAddReminder,
  currentDate,
}) => {
  const [query, setQuery] = useState('');
  const [isParsing, setIsParsing] = useState(false);
  const [parsedResult, setParsedResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setQuery('');
      setParsedResult(null);
      setError(null);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleParse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setIsParsing(true);
    setError(null);

    try {
      const res = await fetch('/api/assistant/parse-input', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: query, currentDate }),
      });

      if (!res.ok) throw new Error('Parsing failed');

      const data = await res.json();
      setParsedResult(data);
    } catch (err: any) {
      console.warn('Error parsing input:', err);
      // Fallback
      setParsedResult({
        kind: 'reminder',
        reminder: {
          title: query,
          dueDate: currentDate,
          priority: 'medium',
          category: 'general',
        },
      });
    } finally {
      setIsParsing(false);
    }
  };

  const handleConfirm = () => {
    if (!parsedResult) return;
    playCompleteSound();

    if (parsedResult.kind === 'event' && parsedResult.event) {
      const ev: CalendarEvent = {
        id: `ev-${Date.now()}`,
        title: parsedResult.event.title || query,
        startDate: parsedResult.event.startDate || currentDate,
        startTime: parsedResult.event.startTime || '10:00',
        endDate: parsedResult.event.endDate || parsedResult.event.startDate || currentDate,
        endTime: parsedResult.event.endTime || '11:00',
        category: parsedResult.event.category || 'work',
        description: parsedResult.event.description || '',
        location: parsedResult.event.location || '',
      };
      onAddEvent(ev);
    } else {
      const r = parsedResult.reminder || {};
      const rem: Reminder = {
        id: `rem-${Date.now()}`,
        title: r.title || query,
        dueDate: r.dueDate || currentDate,
        dueTime: r.dueTime || '17:00',
        priority: r.priority || 'medium',
        category: r.category || 'general',
        completed: false,
        description: r.description || '',
      };
      onAddReminder(rem);
    }

    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-20 p-3 sm:p-4 bg-slate-900/50 backdrop-blur-xs overflow-y-auto"
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl border border-slate-200 overflow-hidden flex flex-col max-h-[88vh] animate-in fade-in zoom-in-95 duration-150 my-auto">
        {/* Sticky Input Bar */}
        <form onSubmit={handleParse} className="shrink-0 relative border-b border-slate-100 flex items-center p-3 gap-2 bg-white">
          <Sparkles className="w-5 h-5 text-indigo-600 shrink-0 ml-1" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Type anything (e.g. 'Coffee with Rachel tomorrow 10am' or 'Pay invoice Friday')..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none"
          />
          {query && (
            <button
              type="submit"
              disabled={isParsing}
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
            >
              {isParsing ? (
                <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
              ) : (
                <>
                  Parse <ArrowRight className="w-3 h-3" />
                </>
              )}
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close spotlight"
            className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
          >
            <X className="w-4 h-4" />
          </button>
        </form>

        {/* Scrollable Parsed Result Card */}
        {parsedResult && (
          <div className="flex-1 overflow-y-auto p-4 bg-slate-50 border-b border-slate-100 animate-in fade-in space-y-3">
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
              <span>Aura Extracted Structure</span>
              <span className="text-indigo-600 font-semibold capitalize">
                Kind: {parsedResult.kind}
              </span>
            </div>

            {parsedResult.kind === 'event' && parsedResult.event && (
              <div className="p-3 bg-white rounded-xl border border-indigo-100 shadow-2xs space-y-2">
                <h4 className="text-sm font-bold text-slate-900">
                  {parsedResult.event.title || query}
                </h4>
                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    {formatReadableDate(parsedResult.event.startDate || currentDate)}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    {formatTime12h(parsedResult.event.startTime || '10:00')} –{' '}
                    {formatTime12h(parsedResult.event.endTime || '11:00')}
                  </span>
                  {parsedResult.event.category && (
                    <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 font-semibold text-[11px] capitalize">
                      {parsedResult.event.category}
                    </span>
                  )}
                </div>
                {parsedResult.event.description && (
                  <p className="text-xs text-slate-500 pt-1 border-t border-slate-100">
                    {parsedResult.event.description}
                  </p>
                )}
              </div>
            )}

            {parsedResult.kind === 'reminder' && (
              <div className="p-3 bg-white rounded-xl border border-amber-100 shadow-2xs space-y-2">
                <h4 className="text-sm font-bold text-slate-900">
                  {parsedResult.reminder?.title || query}
                </h4>
                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    Due: {formatReadableDate(parsedResult.reminder?.dueDate || currentDate)}
                  </span>
                  {parsedResult.reminder?.dueTime && (
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      {formatTime12h(parsedResult.reminder.dueTime)}
                    </span>
                  )}
                  <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 font-semibold text-[11px] capitalize">
                    {parsedResult.reminder?.priority || 'medium'} priority
                  </span>
                </div>
                {parsedResult.reminder?.description && (
                  <p className="text-xs text-slate-500 pt-1 border-t border-slate-100">
                    {parsedResult.reminder.description}
                  </p>
                )}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                className="px-4 py-1.5 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-xs flex items-center gap-1.5"
              >
                <Check className="w-3.5 h-3.5" /> Confirm & Add
              </button>
            </div>
          </div>
        )}

        {/* Sticky Helper Footer */}
        <div className="shrink-0 px-4 py-2.5 bg-slate-50/70 border-t border-slate-100 text-[11px] text-slate-400 flex items-center justify-between">
          <span>Tip: Press Enter to parse natural language text</span>
          <span className="font-mono bg-slate-200/70 px-1.5 py-0.5 rounded text-[10px]">Esc to close</span>
        </div>
      </div>
    </div>
  );
};
