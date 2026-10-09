/**
 * @file ReminderModal.tsx
 * @description Modal dialog for creating and editing prioritized tasks and smart reminders.
 * Includes priority tags, recurring intervals, due time, dynamic subtasks checklist,
 * and a scrollable body with anchored header and footer.
 */

import React, { useState, useEffect } from 'react';
import { Reminder, ReminderPriority, ReminderCategory, RecurringInterval, Subtask } from '../types/assistant';
import { X, Calendar, Clock, AlertTriangle, Plus, Trash2, Repeat, CheckSquare } from 'lucide-react';

interface ReminderModalProps {
  /** Whether the modal is actively visible */
  isOpen: boolean;
  /** Callback to close dialog */
  onClose: () => void;
  /** Callback to persist the reminder */
  onSave: (reminder: Reminder) => void;
  /** Optional callback to delete the reminder */
  onDelete?: (id: string) => void;
  /** Pre-filled reminder when editing, or null for brand new reminder */
  initialReminder?: Partial<Reminder> | null;
  /** Reference active date string in YYYY-MM-DD format */
  selectedDate: string;
}

const PRIORITIES: { id: ReminderPriority; label: string; badge: string; border: string; bg: string }[] = [
  { id: 'urgent', label: 'Urgent (P1)', badge: 'text-rose-700 bg-rose-50', border: 'border-rose-300', bg: 'bg-rose-50' },
  { id: 'high', label: 'High (P2)', badge: 'text-amber-700 bg-amber-50', border: 'border-amber-300', bg: 'bg-amber-50' },
  { id: 'medium', label: 'Medium (P3)', badge: 'text-blue-700 bg-blue-50', border: 'border-blue-300', bg: 'bg-blue-50' },
  { id: 'low', label: 'Low (P4)', badge: 'text-slate-600 bg-slate-100', border: 'border-slate-300', bg: 'bg-slate-50' },
];

const CATEGORIES: { id: ReminderCategory; label: string }[] = [
  { id: 'work', label: 'Work' },
  { id: 'personal', label: 'Personal' },
  { id: 'health', label: 'Health' },
  { id: 'errands', label: 'Errands' },
  { id: 'general', label: 'General' },
];

export const ReminderModal: React.FC<ReminderModalProps> = ({
  isOpen,
  onClose,
  onSave,
  onDelete,
  initialReminder,
  selectedDate,
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState(selectedDate);
  const [dueTime, setDueTime] = useState('17:00');
  const [priority, setPriority] = useState<ReminderPriority>('medium');
  const [category, setCategory] = useState<ReminderCategory>('work');
  const [recurring, setRecurring] = useState<RecurringInterval>('none');
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');

  // Sync state on prop changes
  useEffect(() => {
    if (initialReminder) {
      setTitle(initialReminder.title || '');
      setDescription(initialReminder.description || '');
      setDueDate(initialReminder.dueDate || selectedDate);
      setDueTime(initialReminder.dueTime || '17:00');
      setPriority(initialReminder.priority || 'medium');
      setCategory(initialReminder.category || 'work');
      setRecurring(initialReminder.recurring || 'none');
      setSubtasks(initialReminder.subtasks || []);
    } else {
      setTitle('');
      setDescription('');
      setDueDate(selectedDate);
      setDueTime('17:00');
      setPriority('medium');
      setCategory('work');
      setRecurring('none');
      setSubtasks([]);
    }
  }, [initialReminder, selectedDate, isOpen]);

  // Handle escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleAddSubtask = () => {
    if (!newSubtaskTitle.trim()) return;
    setSubtasks([
      ...subtasks,
      {
        id: `sub-${Date.now()}`,
        title: newSubtaskTitle.trim(),
        completed: false,
      },
    ]);
    setNewSubtaskTitle('');
  };

  const handleRemoveSubtask = (id: string) => {
    setSubtasks(subtasks.filter((s) => s.id !== id));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const reminderToSave: Reminder = {
      id: initialReminder?.id || `rem-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      title: title.trim(),
      description: description.trim(),
      dueDate,
      dueTime: dueTime || undefined,
      priority,
      category,
      recurring,
      completed: initialReminder?.completed || false,
      subtasks,
      snoozedUntil: initialReminder?.snoozedUntil,
    };

    onSave(reminderToSave);
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="reminder-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/50 backdrop-blur-xs overflow-y-auto"
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] sm:max-h-[88vh] animate-in fade-in zoom-in-95 duration-150 my-auto">
        {/* Sticky Header */}
        <div className="shrink-0 flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/80">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
            <h2 id="reminder-modal-title" className="font-semibold text-slate-800 text-lg">
              {initialReminder?.id ? 'Edit Reminder' : 'Add New Reminder'}
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
        <form id="reminder-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
              Reminder Title *
            </label>
            <input
              type="text"
              required
              autoFocus
              placeholder="e.g. Submit draft design proposal to client"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-slate-900 font-medium placeholder:text-slate-400 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5 text-slate-400" /> Priority Level
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {PRIORITIES.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPriority(p.id)}
                  className={`px-2.5 py-2 rounded-xl text-xs font-semibold border text-center transition-all ${
                    priority === p.id
                      ? `${p.badge} ${p.border} ring-2 ring-amber-500/20 shadow-xs`
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200/80">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-slate-400" /> Due Date
              </label>
              <input
                type="date"
                required
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-white rounded-lg border border-slate-200 text-xs font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-slate-400" /> Due Time
              </label>
              <input
                type="time"
                value={dueTime}
                onChange={(e) => setDueTime(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-white rounded-lg border border-slate-200 text-xs font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>

            <div className="sm:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-200/60">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as ReminderCategory)}
                  className="w-full px-2.5 py-1.5 bg-white rounded-lg border border-slate-200 text-xs font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-amber-500"
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1 flex items-center gap-1">
                  <Repeat className="w-3 h-3 text-slate-400" /> Repeat
                </label>
                <select
                  value={recurring}
                  onChange={(e) => setRecurring(e.target.value as RecurringInterval)}
                  className="w-full px-2.5 py-1.5 bg-white rounded-lg border border-slate-200 text-xs font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-amber-500"
                >
                  <option value="none">Does not repeat</option>
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>
            </div>
          </div>

          {/* Subtasks checklist */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1">
              <CheckSquare className="w-3.5 h-3.5 text-slate-400" /> Subtasks / Checklist ({subtasks.length})
            </label>
            <div className="space-y-1.5 mb-2">
              {subtasks.map((st) => (
                <div
                  key={st.id}
                  className="flex items-center justify-between px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                >
                  <span className={st.completed ? 'line-through text-slate-400' : 'text-slate-700'}>
                    {st.title}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleRemoveSubtask(st.id)}
                    className="text-slate-400 hover:text-rose-500 p-0.5"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Add subtask step..."
                value={newSubtaskTitle}
                onChange={(e) => setNewSubtaskTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddSubtask();
                  }
                }}
                className="flex-1 px-3 py-1.5 rounded-lg border border-slate-200 text-xs focus:outline-none focus:border-amber-500"
              />
              <button
                type="button"
                onClick={handleAddSubtask}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> Add
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
              Additional Details / Notes
            </label>
            <textarea
              rows={3}
              placeholder="Context, links, deliverables..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-xs text-slate-900 placeholder:text-slate-400"
            />
          </div>
        </form>

        {/* Sticky Action Footer */}
        <div className="shrink-0 flex items-center justify-between px-6 py-3.5 border-t border-slate-100 bg-slate-50/80">
          {initialReminder?.id && onDelete ? (
            <button
              type="button"
              onClick={() => {
                onDelete(initialReminder.id!);
                onClose();
              }}
              className="px-3 py-2 text-rose-600 hover:bg-rose-50 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" /> Delete Reminder
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
              form="reminder-form"
              className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold shadow-xs transition-colors"
            >
              {initialReminder?.id ? 'Save Changes' : 'Create Reminder'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
