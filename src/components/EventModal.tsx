/**
 * @file EventModal.tsx
 * @description Comprehensive modal dialog for creating and editing calendar schedule events.
 * Features auto-calculation of duration, conflict-ready time pickers, color-coded categories,
 * and a fully scrollable viewport layout ensuring buttons never overflow off-screen.
 */

import React, { useState, useEffect } from 'react';
import { CalendarEvent, EventCategory } from '../types/assistant';
import { X, Calendar, Clock, MapPin, AlignLeft, Tag, Trash2 } from 'lucide-react';
import { formatTime12h, parseTimeToMinutes, minutesToTimeString } from '../utils/dateUtils';

interface EventModalProps {
  /** Whether the modal is actively visible */
  isOpen: boolean;
  /** Callback invoked when the user dismisses the dialog */
  onClose: () => void;
  /** Callback invoked when the user confirms and saves the event */
  onSave: (event: CalendarEvent) => void;
  /** Optional callback to remove an existing event */
  onDelete?: (id: string) => void;
  /** Pre-filled event data when editing, or null for brand new event */
  initialEvent?: Partial<CalendarEvent> | null;
  /** Reference active date string in YYYY-MM-DD format */
  selectedDate: string;
}

const CATEGORIES: { id: EventCategory; label: string; color: string; bg: string; border: string }[] = [
  { id: 'work', label: 'Work', color: 'text-blue-700', bg: 'bg-blue-50', border: 'border-blue-200' },
  { id: 'focus', label: 'Deep Focus', color: 'text-indigo-700', bg: 'bg-indigo-50', border: 'border-indigo-200' },
  { id: 'meeting', label: 'Meeting', color: 'text-purple-700', bg: 'bg-purple-50', border: 'border-purple-200' },
  { id: 'health', label: 'Health & Wellness', color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200' },
  { id: 'personal', label: 'Personal', color: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200' },
  { id: 'urgent', label: 'Urgent', color: 'text-rose-700', bg: 'bg-rose-50', border: 'border-rose-200' },
];

export const EventModal: React.FC<EventModalProps> = ({
  isOpen,
  onClose,
  onSave,
  onDelete,
  initialEvent,
  selectedDate,
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState(selectedDate);
  const [startTime, setStartTime] = useState('09:00');
  const [endDate, setEndDate] = useState(selectedDate);
  const [endTime, setEndTime] = useState('10:00');
  const [category, setCategory] = useState<EventCategory>('work');
  const [location, setLocation] = useState('');

  // Sync state when props change or modal is re-opened
  useEffect(() => {
    if (initialEvent) {
      setTitle(initialEvent.title || '');
      setDescription(initialEvent.description || '');
      setStartDate(initialEvent.startDate || selectedDate);
      setStartTime(initialEvent.startTime || '09:00');
      setEndDate(initialEvent.endDate || initialEvent.startDate || selectedDate);
      setEndTime(initialEvent.endTime || '10:00');
      setCategory(initialEvent.category || 'work');
      setLocation(initialEvent.location || '');
    } else {
      setTitle('');
      setDescription('');
      setStartDate(selectedDate);
      setStartTime('09:00');
      setEndDate(selectedDate);
      setEndTime('10:00');
      setCategory('work');
      setLocation('');
    }
  }, [initialEvent, selectedDate, isOpen]);

  // Handle escape key to dismiss modal
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    // Validate that end time is after start time if on the same day
    let finalEndTime = endTime;
    if (startDate === endDate && parseTimeToMinutes(endTime) <= parseTimeToMinutes(startTime)) {
      finalEndTime = minutesToTimeString(parseTimeToMinutes(startTime) + 60);
    }

    const eventToSave: CalendarEvent = {
      id: initialEvent?.id || `ev-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      title: title.trim(),
      description: description.trim(),
      startDate,
      startTime,
      endDate: endDate || startDate,
      endTime: finalEndTime,
      category,
      location: location.trim(),
    };

    onSave(eventToSave);
    onClose();
  };

  const startMins = parseTimeToMinutes(startTime);
  const endMins = parseTimeToMinutes(endTime);
  const durationMins = Math.max(0, endMins - startMins);
  const durationLabel =
    durationMins >= 60
      ? `${Math.floor(durationMins / 60)}h ${durationMins % 60 ? `${durationMins % 60}m` : ''}`
      : `${durationMins}m`;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="event-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/50 backdrop-blur-xs overflow-y-auto"
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] sm:max-h-[88vh] animate-in fade-in zoom-in-95 duration-150 my-auto">
        {/* Sticky Header */}
        <div className="shrink-0 flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/80">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-600"></span>
            <h2 id="event-modal-title" className="font-semibold text-slate-800 text-lg">
              {initialEvent?.id ? 'Edit Scheduled Event' : 'Create New Event'}
            </h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Close dialog"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form id="event-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
              Event Title *
            </label>
            <input
              type="text"
              required
              autoFocus
              placeholder="e.g. Quarterly Strategic Alignment"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-900 font-medium placeholder:text-slate-400 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
              Category
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setCategory(cat.id)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border text-left flex items-center gap-1.5 transition-all ${
                    category === cat.id
                      ? `${cat.bg} ${cat.color} ${cat.border} ring-2 ring-indigo-500/20 shadow-xs font-semibold`
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <span
                    className={`w-2 h-2 rounded-full ${
                      cat.id === 'work'
                        ? 'bg-blue-500'
                        : cat.id === 'focus'
                        ? 'bg-indigo-500'
                        : cat.id === 'meeting'
                        ? 'bg-purple-500'
                        : cat.id === 'health'
                        ? 'bg-emerald-500'
                        : cat.id === 'personal'
                        ? 'bg-amber-500'
                        : 'bg-rose-500'
                    }`}
                  />
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200/80">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-slate-400" /> Start Date
              </label>
              <input
                type="date"
                required
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  if (endDate < e.target.value) setEndDate(e.target.value);
                }}
                className="w-full px-2.5 py-1.5 bg-white rounded-lg border border-slate-200 text-xs font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-slate-400" /> Start Time
              </label>
              <input
                type="time"
                required
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-white rounded-lg border border-slate-200 text-xs font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-slate-400" /> End Date
              </label>
              <input
                type="date"
                required
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-white rounded-lg border border-slate-200 text-xs font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-slate-400" /> End Time
              </label>
              <input
                type="time"
                required
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-white rounded-lg border border-slate-200 text-xs font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div className="sm:col-span-2 flex items-center justify-between text-xs text-slate-500 pt-1 border-t border-slate-200/60">
              <span>Duration: <strong className="text-slate-800">{durationLabel}</strong></span>
              <span>{formatTime12h(startTime)} → {formatTime12h(endTime)}</span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-slate-400" /> Location / Link
            </label>
            <input
              type="text"
              placeholder="e.g. Google Meet, Room 402, or Gym"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-xs text-slate-900 placeholder:text-slate-400"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1">
              <AlignLeft className="w-3.5 h-3.5 text-slate-400" /> Notes / Agenda
            </label>
            <textarea
              rows={3}
              placeholder="Key objectives, talking points, preparation notes..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-xs text-slate-900 placeholder:text-slate-400"
            />
          </div>
        </form>

        {/* Sticky Action Footer */}
        <div className="shrink-0 flex items-center justify-between px-6 py-3.5 border-t border-slate-100 bg-slate-50/80">
          {initialEvent?.id && onDelete ? (
            <button
              type="button"
              onClick={() => {
                onDelete(initialEvent.id!);
                onClose();
              }}
              className="px-3 py-2 text-rose-600 hover:bg-rose-50 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" /> Delete Event
            </button>
          ) : (
            <div></div>
          )}

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-200/60 text-xs font-semibold transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="event-form"
              className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition-colors"
            >
              {initialEvent?.id ? 'Save Changes' : 'Schedule Event'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
