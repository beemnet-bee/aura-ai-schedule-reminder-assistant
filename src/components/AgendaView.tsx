import React from 'react';
import { CalendarEvent } from '../types/assistant';
import { formatReadableDate, formatTime12h, parseTimeToMinutes } from '../utils/dateUtils';
import { Calendar, Clock, MapPin, AlignLeft, Edit3, Trash2 } from 'lucide-react';

interface AgendaViewProps {
  events: CalendarEvent[];
  selectedDate: string;
  onEventClick: (event: CalendarEvent) => void;
  onDeleteEvent: (id: string) => void;
}

export const AgendaView: React.FC<AgendaViewProps> = ({
  events,
  selectedDate,
  onEventClick,
  onDeleteEvent,
}) => {
  const dayEvents = events
    .filter((e) => e.startDate >= selectedDate)
    .sort((a, b) => {
      if (a.startDate !== b.startDate) return a.startDate.localeCompare(b.startDate);
      return parseTimeToMinutes(a.startTime) - parseTimeToMinutes(b.startTime);
    });

  // Group events by date
  const grouped = dayEvents.reduce((acc, ev) => {
    if (!acc[ev.startDate]) acc[ev.startDate] = [];
    acc[ev.startDate].push(ev);
    return acc;
  }, {} as Record<string, CalendarEvent[]>);

  return (
    <div className="flex flex-col h-full bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
      <div className="p-4 border-b border-slate-100 bg-slate-50/50">
        <h2 className="text-base font-bold text-slate-900">Agenda & Upcoming Timeline</h2>
        <p className="text-xs text-slate-500">Chronological schedule breakdown</p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {Object.entries(grouped).map(([dateStr, items]) => (
          <div key={dateStr} className="space-y-3">
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                {formatReadableDate(dateStr)} ({dateStr})
              </h3>
              <div className="flex-1 border-t border-slate-100"></div>
            </div>

            <div className="space-y-2">
              {items.map((event) => {
                const startMins = parseTimeToMinutes(event.startTime);
                const endMins = parseTimeToMinutes(event.endTime);
                const durationMins = Math.max(0, endMins - startMins);

                return (
                  <div
                    key={event.id}
                    className="p-3.5 rounded-xl border border-slate-200 hover:border-slate-300 bg-white shadow-2xs hover:shadow-xs transition-all flex items-start justify-between gap-3 group"
                  >
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      <div className="w-2.5 h-2.5 rounded-full bg-indigo-600 shrink-0 mt-1.5" />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <span className="text-xs font-bold text-slate-900">
                            {formatTime12h(event.startTime)} – {formatTime12h(event.endTime)}
                          </span>
                          <span className="text-[11px] text-slate-400">
                            ({durationMins} mins)
                          </span>
                          <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700">
                            {event.category}
                          </span>
                        </div>

                        <h4 className="text-sm font-semibold text-slate-900 truncate">
                          {event.title}
                        </h4>

                        {event.location && (
                          <p className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span>{event.location}</span>
                          </p>
                        )}

                        {event.description && (
                          <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                            {event.description}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => onEventClick(event)}
                        className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                        title="Edit"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onDeleteEvent(event.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        {dayEvents.length === 0 && (
          <div className="text-center py-16 text-slate-400">
            <Calendar className="w-10 h-10 mx-auto text-slate-300 mb-2" />
            <p className="text-sm font-semibold text-slate-600">No scheduled events ahead</p>
            <p className="text-xs text-slate-400">Use the calendar or ask Aura to schedule one!</p>
          </div>
        )}
      </div>
    </div>
  );
};
