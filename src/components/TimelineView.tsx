import React, { useMemo } from 'react';
import { CalendarEvent, ConflictItem } from '../types/assistant';
import {
  parseTimeToMinutes,
  formatTime12h,
  formatReadableDate,
  addDays,
  calculateScheduleMetrics,
} from '../utils/dateUtils';
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  MapPin,
  AlertTriangle,
  Plus,
  Sparkles,
  Calendar as CalendarIcon,
} from 'lucide-react';

interface TimelineViewProps {
  events: CalendarEvent[];
  selectedDate: string;
  onSelectDate: (date: string) => void;
  onEventClick: (event: CalendarEvent) => void;
  onAddEventSlot: (time: string) => void;
  conflicts: ConflictItem[];
  onOpenAssistant: (prompt?: string) => void;
  onOpenBriefing: () => void;
}

const HOURS = Array.from({ length: 16 }, (_, i) => i + 7); // 7:00 to 22:00

export const TimelineView: React.FC<TimelineViewProps> = ({
  events,
  selectedDate,
  onSelectDate,
  onEventClick,
  onAddEventSlot,
  conflicts,
  onOpenAssistant,
  onOpenBriefing,
}) => {
  const dayEvents = useMemo(() => {
    return events
      .filter((e) => e.startDate === selectedDate)
      .sort((a, b) => parseTimeToMinutes(a.startTime) - parseTimeToMinutes(b.startTime));
  }, [events, selectedDate]);

  const metrics = useMemo(() => {
    return calculateScheduleMetrics(events, selectedDate);
  }, [events, selectedDate]);

  // Current real-time indicator
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  const isToday = selectedDate === todayStr;
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const currentIndicatorTop = ((currentMinutes - 7 * 60) / (16 * 60)) * 100;

  // Check if an event has a conflict
  const conflictingEventIds = useMemo(() => {
    const ids = new Set<string>();
    conflicts.forEach((c) => {
      ids.add(c.eventA.id);
      ids.add(c.eventB.id);
    });
    return ids;
  }, [conflicts]);

  const getCategoryStyles = (category: string) => {
    switch (category) {
      case 'focus':
        return {
          bg: 'bg-indigo-50 hover:bg-indigo-100/90',
          border: 'border-l-4 border-l-indigo-600 border-indigo-200',
          badge: 'bg-indigo-100 text-indigo-700',
          title: 'text-indigo-950',
        };
      case 'meeting':
        return {
          bg: 'bg-purple-50 hover:bg-purple-100/90',
          border: 'border-l-4 border-l-purple-600 border-purple-200',
          badge: 'bg-purple-100 text-purple-700',
          title: 'text-purple-950',
        };
      case 'health':
        return {
          bg: 'bg-emerald-50 hover:bg-emerald-100/90',
          border: 'border-l-4 border-l-emerald-600 border-emerald-200',
          badge: 'bg-emerald-100 text-emerald-700',
          title: 'text-emerald-950',
        };
      case 'urgent':
        return {
          bg: 'bg-rose-50 hover:bg-rose-100/90',
          border: 'border-l-4 border-l-rose-600 border-rose-200',
          badge: 'bg-rose-100 text-rose-700',
          title: 'text-rose-950',
        };
      case 'personal':
        return {
          bg: 'bg-amber-50 hover:bg-amber-100/90',
          border: 'border-l-4 border-l-amber-600 border-amber-200',
          badge: 'bg-amber-100 text-amber-700',
          title: 'text-amber-950',
        };
      default:
        return {
          bg: 'bg-blue-50 hover:bg-blue-100/90',
          border: 'border-l-4 border-l-blue-600 border-blue-200',
          badge: 'bg-blue-100 text-blue-700',
          title: 'text-blue-950',
        };
    }
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
      {/* Top Header & Day Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 border-b border-slate-100 bg-slate-50/50">
        <div className="flex items-center gap-3">
          <div className="flex items-center bg-white border border-slate-200 rounded-xl shadow-2xs p-1">
            <button
              onClick={() => onSelectDate(addDays(selectedDate, -1))}
              className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
              title="Previous day"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => onSelectDate(todayStr)}
              className="px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Today
            </button>
            <button
              onClick={() => onSelectDate(addDays(selectedDate, 1))}
              className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
              title="Next day"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <span>{formatReadableDate(selectedDate)}</span>
              <span className="text-xs font-normal text-slate-500">({selectedDate})</span>
            </h2>
          </div>
        </div>

        {/* Quick Day Metrics & Briefing Launcher */}
        <div className="flex items-center gap-2">
          <div className="hidden sm:flex items-center gap-3 px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-600">
            <span>
              Scheduled: <strong className="text-slate-900">{metrics.totalScheduledHours}h</strong>
            </span>
            <span className="text-slate-300">|</span>
            <span>
              Focus: <strong className="text-indigo-600">{metrics.focusHours}h</strong>
            </span>
            <span className="text-slate-300">|</span>
            <span className="flex items-center gap-1">
              Score:
              <strong
                className={`font-semibold ${
                  metrics.focusScore >= 80
                    ? 'text-emerald-600'
                    : metrics.focusScore >= 60
                    ? 'text-amber-600'
                    : 'text-rose-600'
                }`}
              >
                {metrics.focusScore}/100
              </strong>
            </span>
          </div>

          <button
            onClick={onOpenBriefing}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200/80 rounded-xl transition-all shadow-2xs"
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
            <span>Daily Briefing</span>
          </button>
        </div>
      </div>

      {/* Timeline Scroll Area */}
      <div className="flex-1 overflow-y-auto relative p-4">
        <div className="relative min-h-[960px]">
          {/* Hour grid lines */}
          {HOURS.map((hour) => {
            const timeStr = `${String(hour).padStart(2, '0')}:00`;
            const topPercent = ((hour - 7) / 16) * 100;
            return (
              <div
                key={hour}
                style={{ top: `${topPercent}%` }}
                className="absolute left-0 right-0 border-t border-slate-100 flex items-start group"
              >
                <div className="w-16 -mt-2.5 text-right pr-3 text-[11px] font-semibold text-slate-400 select-none">
                  {formatTime12h(timeStr)}
                </div>
                <div className="flex-1 h-14 relative">
                  {/* Hover slot quick-add trigger */}
                  <button
                    onClick={() => onAddEventSlot(timeStr)}
                    className="opacity-0 group-hover:opacity-100 absolute left-2 top-1.5 flex items-center gap-1 text-[11px] text-indigo-600 hover:text-indigo-800 bg-indigo-50/80 hover:bg-indigo-100 px-2 py-0.5 rounded-md transition-opacity"
                  >
                    <Plus className="w-3 h-3" /> Add at {formatTime12h(timeStr)}
                  </button>
                </div>
              </div>
            );
          })}

          {/* Current Real-Time Indicator Line */}
          {isToday && currentIndicatorTop >= 0 && currentIndicatorTop <= 100 && (
            <div
              style={{ top: `${currentIndicatorTop}%` }}
              className="absolute left-16 right-0 z-20 flex items-center pointer-events-none"
            >
              <div className="w-2.5 h-2.5 rounded-full bg-rose-500 -ml-1.5 ring-4 ring-rose-100"></div>
              <div className="flex-1 border-t-2 border-rose-500"></div>
              <span className="text-[10px] font-bold text-white bg-rose-500 px-1.5 py-0.5 rounded-sm ml-1">
                Now
              </span>
            </div>
          )}

          {/* Event Blocks */}
          <div className="absolute left-18 right-2 top-0 bottom-0 pointer-events-none">
            {dayEvents.map((event) => {
              const startMins = parseTimeToMinutes(event.startTime);
              const endMins = parseTimeToMinutes(event.endTime || event.startTime);
              const timelineStartMins = 7 * 60; // 7 AM
              const totalMins = 16 * 60; // 16 hours

              // Clamped offset
              const topOffset = Math.max(0, ((startMins - timelineStartMins) / totalMins) * 100);
              const durationMins = Math.max(25, endMins - startMins);
              const heightPercent = (durationMins / totalMins) * 100;

              const styles = getCategoryStyles(event.category);
              const hasConflict = conflictingEventIds.has(event.id);

              return (
                <div
                  key={event.id}
                  onClick={() => onEventClick(event)}
                  style={{
                    top: `${topOffset}%`,
                    height: `${Math.max(heightPercent, 3.8)}%`,
                  }}
                  className={`absolute left-0 right-0 pointer-events-auto rounded-xl p-2.5 shadow-2xs border transition-all cursor-pointer hover:shadow-md hover:z-30 ${
                    styles.bg
                  } ${styles.border} ${
                    hasConflict ? 'ring-2 ring-rose-400 border-rose-400' : ''
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span
                          className={`text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded-sm ${styles.badge}`}
                        >
                          {event.category}
                        </span>
                        {hasConflict && (
                          <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-rose-700 bg-rose-100 px-1.5 py-0.5 rounded-sm animate-pulse">
                            <AlertTriangle className="w-3 h-3" /> Conflict
                          </span>
                        )}
                        <span className="text-[11px] font-semibold text-slate-500">
                          {formatTime12h(event.startTime)} – {formatTime12h(event.endTime)}
                        </span>
                      </div>
                      <h4 className={`text-xs font-bold truncate ${styles.title}`}>
                        {event.title}
                      </h4>
                      {event.location && (
                        <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5 truncate">
                          <MapPin className="w-3 h-3 shrink-0" /> {event.location}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Empty day placeholder */}
          {dayEvents.length === 0 && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 pointer-events-none">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 mb-3">
                <CalendarIcon className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-slate-700 mb-1">Clear Schedule</h3>
              <p className="text-xs text-slate-400 max-w-xs mb-3">
                No events scheduled for {formatReadableDate(selectedDate)}. Enjoy open focus or let Aura plan your day!
              </p>
              <button
                onClick={() => onOpenAssistant(`Plan my day for ${selectedDate}`)}
                className="pointer-events-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs"
              >
                <Sparkles className="w-3.5 h-3.5" /> Auto-Plan with Aura
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
