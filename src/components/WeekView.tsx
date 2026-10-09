import React from 'react';
import { CalendarEvent } from '../types/assistant';
import { getWeekDays, formatReadableDate, formatTime12h, getTodayDateString, parseTimeToMinutes } from '../utils/dateUtils';
import { ChevronLeft, ChevronRight, AlertTriangle, Plus } from 'lucide-react';

interface WeekViewProps {
  events: CalendarEvent[];
  selectedDate: string;
  onSelectDate: (date: string) => void;
  onEventClick: (event: CalendarEvent) => void;
  onAddEventSlot: (date: string, time: string) => void;
}

export const WeekView: React.FC<WeekViewProps> = ({
  events,
  selectedDate,
  onSelectDate,
  onEventClick,
  onAddEventSlot,
}) => {
  const weekDays = getWeekDays(selectedDate);
  const today = getTodayDateString();

  return (
    <div className="flex flex-col h-full bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50/50">
        <div>
          <h2 className="text-base font-bold text-slate-900">
            Week of {formatReadableDate(weekDays[0])} – {formatReadableDate(weekDays[6])}
          </h2>
          <p className="text-xs text-slate-500">7-day schedule overview</p>
        </div>
      </div>

      {/* 7-column grid */}
      <div className="flex-1 grid grid-cols-7 divide-x divide-slate-100 overflow-y-auto">
        {weekDays.map((day) => {
          const isSelected = day === selectedDate;
          const isToday = day === today;
          const dayEvents = events
            .filter((e) => e.startDate === day)
            .sort((a, b) => parseTimeToMinutes(a.startTime) - parseTimeToMinutes(b.startTime));

          const [y, m, d] = day.split('-');
          const dateObj = new Date(Number(y), Number(m) - 1, Number(d));
          const weekdayName = dateObj.toLocaleDateString('en-US', { weekday: 'short' });

          return (
            <div
              key={day}
              className={`flex flex-col min-w-[130px] p-2 transition-colors ${
                isSelected ? 'bg-indigo-50/30' : 'bg-white'
              }`}
            >
              {/* Day column header */}
              <button
                onClick={() => onSelectDate(day)}
                className={`text-center py-2 px-1 rounded-xl mb-3 transition-colors ${
                  isToday
                    ? 'bg-indigo-600 text-white font-bold shadow-xs'
                    : isSelected
                    ? 'bg-slate-200 text-slate-900 font-bold'
                    : 'hover:bg-slate-100 text-slate-700'
                }`}
              >
                <div className="text-[11px] uppercase tracking-wider">{weekdayName}</div>
                <div className="text-base leading-none mt-1 font-bold">{d}</div>
              </button>

              {/* Day events list */}
              <div className="flex-1 space-y-2 overflow-y-auto min-h-[300px]">
                {dayEvents.map((event) => (
                  <div
                    key={event.id}
                    onClick={() => onEventClick(event)}
                    className="p-2 rounded-xl text-left bg-slate-50 hover:bg-slate-100 border border-slate-200/80 cursor-pointer shadow-2xs transition-all hover:scale-[1.02]"
                  >
                    <div className="flex items-center justify-between text-[10px] text-slate-500 font-semibold mb-1">
                      <span>{formatTime12h(event.startTime)}</span>
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          event.category === 'focus'
                            ? 'bg-indigo-500'
                            : event.category === 'meeting'
                            ? 'bg-purple-500'
                            : event.category === 'health'
                            ? 'bg-emerald-500'
                            : 'bg-blue-500'
                        }`}
                      />
                    </div>
                    <div className="text-xs font-bold text-slate-900 line-clamp-2">
                      {event.title}
                    </div>
                  </div>
                ))}

                {dayEvents.length === 0 && (
                  <div className="h-24 flex items-center justify-center text-[11px] text-slate-400 italic">
                    Free
                  </div>
                )}
              </div>

              {/* Quick Add button at bottom of day */}
              <button
                onClick={() => onAddEventSlot(day, '10:00')}
                className="mt-2 py-1.5 px-2 border border-dashed border-slate-200 hover:border-indigo-400 text-slate-400 hover:text-indigo-600 rounded-lg text-[11px] flex items-center justify-center gap-1 transition-colors"
              >
                <Plus className="w-3 h-3" /> Add
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};
