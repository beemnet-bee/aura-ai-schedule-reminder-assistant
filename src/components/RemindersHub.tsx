import React, { useState, useMemo } from 'react';
import { Reminder, ReminderPriority } from '../types/assistant';
import { getTodayDateString, formatReadableDate, formatTime12h, addDays } from '../utils/dateUtils';
import { playCompleteSound } from '../utils/audio';
import confetti from 'canvas-confetti';
import {
  CheckCircle2,
  Circle,
  Clock,
  Calendar,
  AlertCircle,
  Plus,
  Trash2,
  MoreVertical,
  ChevronDown,
  ChevronUp,
  Tag,
  Sparkles,
} from 'lucide-react';

interface RemindersHubProps {
  reminders: Reminder[];
  onToggleComplete: (id: string) => void;
  onEditReminder: (reminder: Reminder) => void;
  onDeleteReminder: (id: string) => void;
  onAddReminder: (reminder: Reminder) => void;
  onSnoozeReminder: (id: string, minutes: number) => void;
}

export const RemindersHub: React.FC<RemindersHubProps> = ({
  reminders,
  onToggleComplete,
  onEditReminder,
  onDeleteReminder,
  onAddReminder,
  onSnoozeReminder,
}) => {
  const [filter, setFilter] = useState<'all' | 'today' | 'upcoming' | 'overdue' | 'completed'>('today');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [quickTitle, setQuickTitle] = useState('');
  const [quickPriority, setQuickPriority] = useState<ReminderPriority>('medium');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const today = getTodayDateString();

  const filteredReminders = useMemo(() => {
    return reminders.filter((r) => {
      // Priority filter
      if (priorityFilter !== 'all' && r.priority !== priorityFilter) {
        return false;
      }

      // Status filter
      if (filter === 'completed') return r.completed;
      if (r.completed) return false;

      if (filter === 'today') {
        return r.dueDate === today;
      }
      if (filter === 'upcoming') {
        return r.dueDate > today;
      }
      if (filter === 'overdue') {
        return r.dueDate < today;
      }
      return true; // 'all' non-completed
    });
  }, [reminders, filter, priorityFilter, today]);

  const stats = useMemo(() => {
    const active = reminders.filter((r) => !r.completed);
    const overdue = active.filter((r) => r.dueDate < today).length;
    const todayCount = active.filter((r) => r.dueDate === today).length;
    const completedCount = reminders.filter((r) => r.completed).length;
    return { overdue, todayCount, totalActive: active.length, completedCount };
  }, [reminders, today]);

  const handleToggle = (id: string, currentlyCompleted: boolean) => {
    if (!currentlyCompleted) {
      playCompleteSound();
      confetti({
        particleCount: 45,
        spread: 60,
        origin: { y: 0.8 },
      });
    }
    onToggleComplete(id);
  };

  const handleQuickAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickTitle.trim()) return;

    const newReminder: Reminder = {
      id: `rem-${Date.now()}`,
      title: quickTitle.trim(),
      dueDate: today,
      priority: quickPriority,
      completed: false,
      category: 'general',
      dueTime: '17:00',
    };

    onAddReminder(newReminder);
    setQuickTitle('');
  };

  const getPriorityBadge = (priority: ReminderPriority) => {
    switch (priority) {
      case 'urgent':
        return 'text-rose-700 bg-rose-50 border-rose-200';
      case 'high':
        return 'text-amber-700 bg-amber-50 border-amber-200';
      case 'medium':
        return 'text-blue-700 bg-blue-50 border-blue-200';
      case 'low':
        return 'text-slate-600 bg-slate-50 border-slate-200';
    }
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
      {/* Top Header */}
      <div className="p-4 border-b border-slate-100 bg-slate-50/50">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <span>Reminders & Action Items</span>
              <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-amber-100 text-amber-800">
                {stats.totalActive} active
              </span>
            </h2>
            <p className="text-xs text-slate-500">
              Prioritized tasks and intelligent alerts
            </p>
          </div>

          {/* Overdue alert indicator */}
          {stats.overdue > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1 bg-rose-50 border border-rose-200 rounded-xl text-xs font-bold text-rose-700">
              <AlertCircle className="w-4 h-4 text-rose-500" />
              <span>{stats.overdue} Overdue Task{stats.overdue > 1 ? 's' : ''}</span>
            </div>
          )}
        </div>

        {/* Filters bar */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1 bg-white border border-slate-200 p-1 rounded-xl">
            {(['today', 'upcoming', 'overdue', 'all', 'completed'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setFilter(tab)}
                className={`px-3 py-1 text-xs font-semibold rounded-lg capitalize transition-colors ${
                  filter === tab
                    ? 'bg-amber-500 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                {tab}
                {tab === 'today' && ` (${stats.todayCount})`}
                {tab === 'overdue' && stats.overdue > 0 && ` (${stats.overdue})`}
              </button>
            ))}
          </div>

          {/* Priority filter */}
          <div className="flex items-center gap-1 text-xs">
            <span className="text-slate-400 font-medium">Priority:</span>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-1 focus:ring-amber-500"
            >
              <option value="all">All Priorities</option>
              <option value="urgent">Urgent (P1)</option>
              <option value="high">High (P2)</option>
              <option value="medium">Medium (P3)</option>
              <option value="low">Low (P4)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Quick Add Bar */}
      <form onSubmit={handleQuickAdd} className="p-3 bg-slate-50/70 border-b border-slate-100 flex items-center gap-2">
        <input
          type="text"
          placeholder="Quick add reminder (e.g. Call accountant at 3pm)..."
          value={quickTitle}
          onChange={(e) => setQuickTitle(e.target.value)}
          className="flex-1 px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 placeholder:text-slate-400 font-medium"
        />
        <select
          value={quickPriority}
          onChange={(e) => setQuickPriority(e.target.value as ReminderPriority)}
          className="bg-white border border-slate-200 rounded-xl px-2.5 py-2 text-xs font-semibold text-slate-700 focus:outline-none"
        >
          <option value="urgent">Urgent</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
        <button
          type="submit"
          className="px-3.5 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-semibold flex items-center gap-1 shadow-2xs transition-colors"
        >
          <Plus className="w-3.5 h-3.5" /> Add
        </button>
      </form>

      {/* Reminders List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {filteredReminders.map((reminder) => {
          const isOverdue = !reminder.completed && reminder.dueDate < today;
          const isExpanded = expandedId === reminder.id;
          const hasSubtasks = reminder.subtasks && reminder.subtasks.length > 0;
          const completedSubtasks = reminder.subtasks?.filter((s) => s.completed).length || 0;

          return (
            <div
              key={reminder.id}
              className={`p-3.5 rounded-xl border transition-all ${
                reminder.completed
                  ? 'bg-slate-50/70 border-slate-200 opacity-60'
                  : isOverdue
                  ? 'bg-rose-50/40 border-rose-200 hover:border-rose-300'
                  : 'bg-white border-slate-200 hover:border-slate-300 shadow-2xs'
              }`}
            >
              <div className="flex items-start gap-3">
                {/* Complete checkbox button */}
                <button
                  type="button"
                  onClick={() => handleToggle(reminder.id, reminder.completed)}
                  className="mt-0.5 text-slate-400 hover:text-amber-600 transition-colors"
                >
                  {reminder.completed ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  ) : (
                    <Circle className="w-5 h-5 text-slate-300 hover:text-amber-500" />
                  )}
                </button>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md border ${getPriorityBadge(
                        reminder.priority
                      )}`}
                    >
                      {reminder.priority}
                    </span>

                    <span className="text-[11px] font-semibold text-slate-500 flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-slate-400" />
                      {formatReadableDate(reminder.dueDate)}
                    </span>

                    {reminder.dueTime && (
                      <span className="text-[11px] font-semibold text-slate-500 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-400" />
                        {formatTime12h(reminder.dueTime)}
                      </span>
                    )}

                    {isOverdue && (
                      <span className="text-[10px] font-bold text-rose-700 bg-rose-100 px-1.5 py-0.5 rounded-md">
                        Overdue
                      </span>
                    )}
                  </div>

                  <h3
                    className={`text-sm font-semibold text-slate-900 ${
                      reminder.completed ? 'line-through text-slate-400' : ''
                    }`}
                  >
                    {reminder.title}
                  </h3>

                  {reminder.description && (
                    <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                      {reminder.description}
                    </p>
                  )}

                  {/* Subtask preview / toggle */}
                  {hasSubtasks && (
                    <div className="mt-2">
                      <button
                        onClick={() => setExpandedId(isExpanded ? null : reminder.id)}
                        className="text-[11px] font-semibold text-slate-500 hover:text-slate-800 flex items-center gap-1"
                      >
                        {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                        <span>
                          {completedSubtasks}/{reminder.subtasks!.length} subtasks
                        </span>
                      </button>

                      {isExpanded && (
                        <div className="mt-2 pl-2 space-y-1 border-l-2 border-slate-200">
                          {reminder.subtasks!.map((sub) => (
                            <div key={sub.id} className="text-xs text-slate-600 flex items-center gap-1.5">
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${
                                  sub.completed ? 'bg-emerald-500' : 'bg-slate-300'
                                }`}
                              />
                              <span className={sub.completed ? 'line-through text-slate-400' : ''}>
                                {sub.title}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Snooze & Actions */}
                <div className="flex items-center gap-1 shrink-0">
                  {!reminder.completed && (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => onSnoozeReminder(reminder.id, 60)}
                        title="Snooze 1 hour"
                        className="px-2 py-1 text-[10px] font-semibold bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg transition-colors"
                      >
                        +1h
                      </button>
                      <button
                        onClick={() => onSnoozeReminder(reminder.id, 24 * 60)}
                        title="Snooze to Tomorrow"
                        className="px-2 py-1 text-[10px] font-semibold bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg transition-colors"
                      >
                        Tomorrow
                      </button>
                    </div>
                  )}

                  <button
                    onClick={() => onEditReminder(reminder)}
                    className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                    title="Edit"
                  >
                    <MoreVertical className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => onDeleteReminder(reminder.id)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}

        {filteredReminders.length === 0 && (
          <div className="text-center py-12 text-slate-400">
            <CheckCircle2 className="w-10 h-10 mx-auto text-slate-300 mb-2" />
            <p className="text-sm font-semibold text-slate-600">All caught up!</p>
            <p className="text-xs text-slate-400">No {filter} reminders found.</p>
          </div>
        )}
      </div>
    </div>
  );
};
