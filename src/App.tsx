import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  CalendarEvent,
  Reminder,
  ConflictItem,
  AssistantMessage,
  ScheduleAction,
  DailyBriefingData,
} from './types/assistant';
import {
  getTodayDateString,
  detectConflicts,
  generateInitialScheduleData,
  exportToICS,
  downloadFile,
  formatReadableDate,
  calculateScheduleMetrics,
} from './utils/dateUtils';
import { playNotificationChime, playCompleteSound } from './utils/audio';

import { TimelineView } from './components/TimelineView';
import { WeekView } from './components/WeekView';
import { AgendaView } from './components/AgendaView';
import { RemindersHub } from './components/RemindersHub';
import { EventModal } from './components/EventModal';
import { ReminderModal } from './components/ReminderModal';
import { AssistantDrawer } from './components/AssistantDrawer';
import { DailyBriefingModal } from './components/DailyBriefingModal';
import { QuickCommandBar } from './components/QuickCommandBar';
import { ConflictAlertBanner } from './components/ConflictAlertBanner';

import {
  Sparkles,
  Calendar,
  CheckSquare,
  Clock,
  Plus,
  Download,
  Search,
  RotateCcw,
  Bot,
  AlertTriangle,
  Menu,
  X,
  Layers,
} from 'lucide-react';

const STORAGE_KEYS = {
  EVENTS: 'aura_assistant_events_v1',
  REMINDERS: 'aura_assistant_reminders_v1',
  MESSAGES: 'aura_assistant_messages_v1',
};

export default function App() {
  const today = useMemo(() => getTodayDateString(), []);
  const [selectedDate, setSelectedDate] = useState<string>(today);
  const [activeView, setActiveView] = useState<'day' | 'week' | 'agenda' | 'reminders'>('day');

  // Core data states
  const [events, setEvents] = useState<CalendarEvent[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.EVENTS);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn('Failed to load events from storage:', e);
    }
    return generateInitialScheduleData().events;
  });

  const [reminders, setReminders] = useState<Reminder[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.REMINDERS);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn('Failed to load reminders from storage:', e);
    }
    return generateInitialScheduleData().reminders;
  });

  // Save to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.EVENTS, JSON.stringify(events));
    } catch (e) {
      console.warn('Failed to save events:', e);
    }
  }, [events]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.REMINDERS, JSON.stringify(reminders));
    } catch (e) {
      console.warn('Failed to save reminders:', e);
    }
  }, [reminders]);

  // Assistant states
  const [isAssistantOpen, setIsAssistantOpen] = useState(false);
  const [assistantLoading, setAssistantLoading] = useState(false);
  const [assistantInitialPrompt, setAssistantInitialPrompt] = useState<string | undefined>();
  const [messages, setMessages] = useState<AssistantMessage[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.MESSAGES);
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return [
      {
        id: 'msg-welcome',
        role: 'assistant',
        content: `Good day! I'm Aura, your personal AI schedule and reminder assistant. I'm actively monitoring your commitments for ${today}. Feel free to ask me to schedule new events, set prioritized reminders, resolve overlapping meetings, or plan your entire afternoon for deep focus!`,
        timestamp: new Date().toISOString(),
      },
    ];
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.MESSAGES, JSON.stringify(messages));
    } catch (e) {}
  }, [messages]);

  // Briefing modal states
  const [isBriefingOpen, setIsBriefingOpen] = useState(false);
  const [briefingData, setBriefingData] = useState<DailyBriefingData | null>(null);
  const [briefingLoading, setBriefingLoading] = useState(false);

  // Quick Command Bar
  const [isQuickCommandOpen, setIsQuickCommandOpen] = useState(false);

  // Modals for CRUD
  const [eventModalState, setEventModalState] = useState<{
    isOpen: boolean;
    event: Partial<CalendarEvent> | null;
  }>({ isOpen: false, event: null });

  const [reminderModalState, setReminderModalState] = useState<{
    isOpen: boolean;
    reminder: Partial<Reminder> | null;
  }>({ isOpen: false, reminder: null });

  // Toast feedback
  const [toast, setToast] = useState<{ message: string; type?: 'info' | 'success' | 'warning' } | null>(null);

  const showToast = useCallback((message: string, type: 'info' | 'success' | 'warning' = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  }, []);

  // Conflict calculation
  const conflicts = useMemo(() => {
    return detectConflicts(events, selectedDate);
  }, [events, selectedDate]);

  // Periodic reminder alert check
  useEffect(() => {
    const checkAlarms = () => {
      const now = new Date();
      const currentH = String(now.getHours()).padStart(2, '0');
      const currentM = String(now.getMinutes()).padStart(2, '0');
      const currentTimeStr = `${currentH}:${currentM}`;
      const currentDateStr = getTodayDateString();

      reminders.forEach((r) => {
        if (!r.completed && r.dueDate === currentDateStr && r.dueTime === currentTimeStr) {
          playNotificationChime();
          showToast(`Reminder due: ${r.title}`, 'warning');
        }
      });
    };

    const interval = setInterval(checkAlarms, 30000);
    return () => clearInterval(interval);
  }, [reminders, showToast]);

  // Global keyboard shortcuts (Cmd+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsQuickCommandOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Event handlers
  const handleSaveEvent = (savedEvent: CalendarEvent) => {
    setEvents((prev) => {
      const index = prev.findIndex((e) => e.id === savedEvent.id);
      if (index >= 0) {
        const next = [...prev];
        next[index] = savedEvent;
        return next;
      }
      return [...prev, savedEvent];
    });
    playCompleteSound();
    showToast(`Event "${savedEvent.title}" scheduled!`, 'success');
  };

  const handleDeleteEvent = (id: string) => {
    setEvents((prev) => prev.filter((e) => e.id !== id));
    showToast('Event removed from schedule.', 'info');
  };

  const handleSaveReminder = (savedReminder: Reminder) => {
    setReminders((prev) => {
      const index = prev.findIndex((r) => r.id === savedReminder.id);
      if (index >= 0) {
        const next = [...prev];
        next[index] = savedReminder;
        return next;
      }
      return [...prev, savedReminder];
    });
    playCompleteSound();
    showToast(`Reminder "${savedReminder.title}" saved!`, 'success');
  };

  const handleDeleteReminder = (id: string) => {
    setReminders((prev) => prev.filter((r) => r.id !== id));
    showToast('Reminder deleted.', 'info');
  };

  const handleToggleReminderComplete = (id: string) => {
    setReminders((prev) =>
      prev.map((r) => (r.id === id ? { ...r, completed: !r.completed } : r))
    );
  };

  const handleSnoozeReminder = (id: string, minutes: number) => {
    setReminders((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r;
        const now = new Date();
        now.setMinutes(now.getMinutes() + minutes);
        return {
          ...r,
          snoozedUntil: now.toISOString(),
        };
      })
    );
    showToast(`Reminder snoozed for ${minutes >= 60 ? `${minutes / 60}h` : `${minutes}m`}`, 'info');
  };

  // Assistant Action Executions
  const handleApplyAction = useCallback((action: ScheduleAction) => {
    if (action.type === 'add_event' && action.data) {
      const newEvent: CalendarEvent = {
        id: action.data.id || `ev-${Date.now()}`,
        title: action.data.title || 'New Event',
        startDate: action.data.startDate || selectedDate,
        startTime: action.data.startTime || '10:00',
        endDate: action.data.endDate || action.data.startDate || selectedDate,
        endTime: action.data.endTime || '11:00',
        category: action.data.category || 'work',
        description: action.data.description || '',
        location: action.data.location || '',
      };
      setEvents((prev) => [...prev, newEvent]);
      showToast(`Added event: ${newEvent.title}`, 'success');
    } else if (action.type === 'update_event' && action.data) {
      setEvents((prev) =>
        prev.map((e) => (e.id === action.data.id ? { ...e, ...action.data } : e))
      );
      showToast('Event updated.', 'success');
    } else if (action.type === 'delete_event' && action.data?.id) {
      setEvents((prev) => prev.filter((e) => e.id !== action.data.id));
      showToast('Event deleted.', 'info');
    } else if (action.type === 'add_reminder' && action.data) {
      const newRem: Reminder = {
        id: action.data.id || `rem-${Date.now()}`,
        title: action.data.title || 'New Reminder',
        dueDate: action.data.dueDate || selectedDate,
        dueTime: action.data.dueTime || '17:00',
        priority: action.data.priority || 'medium',
        category: action.data.category || 'general',
        completed: false,
        description: action.data.description || '',
      };
      setReminders((prev) => [...prev, newRem]);
      showToast(`Added reminder: ${newRem.title}`, 'success');
    } else if (action.type === 'auto_plan_day' && action.data?.plannedEvents) {
      const planned: CalendarEvent[] = action.data.plannedEvents.map((p: any) => ({
        id: p.id || `ev-plan-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        title: p.title,
        startDate: p.startDate || selectedDate,
        startTime: p.startTime || '09:00',
        endDate: p.endDate || p.startDate || selectedDate,
        endTime: p.endTime || '10:00',
        category: p.category || 'focus',
        description: p.description || '',
      }));
      setEvents((prev) => [...prev.filter((e) => e.startDate !== selectedDate), ...planned]);
      showToast(`Aura planned ${planned.length} blocks for your day!`, 'success');
    }
  }, [selectedDate, showToast]);

  // Send message to Gemini Assistant
  const handleSendMessage = async (text: string) => {
    const userMsg: AssistantMessage = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setAssistantLoading(true);

    try {
      const res = await fetch('/api/assistant/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          history: messages.slice(-6).map((m) => ({ role: m.role, content: m.content })),
          scheduleState: {
            events,
            reminders,
            currentDate: selectedDate,
          },
        }),
      });

      if (!res.ok) throw new Error('Failed to get response');

      const data = await res.json();
      const assistantMsg: AssistantMessage = {
        id: `msg-${Date.now() + 1}`,
        role: 'assistant',
        content: data.reply || "I've reviewed your request.",
        timestamp: new Date().toISOString(),
        actions: data.actions || [],
      };

      setMessages((prev) => [...prev, assistantMsg]);

      // If there are auto-actions, notify user or auto-apply non-destructive ones
      if (data.actions && data.actions.length > 0) {
        showToast(`Aura proposed ${data.actions.length} schedule action(s).`, 'info');
      }
    } catch (err: any) {
      console.error('Chat error:', err);
      setMessages((prev) => [
        ...prev,
        {
          id: `msg-${Date.now() + 1}`,
          role: 'assistant',
          content: "I apologize, but I encountered an error communicating with the server. Please check your connection or try again.",
          timestamp: new Date().toISOString(),
        },
      ]);
    } finally {
      setAssistantLoading(false);
    }
  };

  // AI Auto-Resolve Overlaps
  const [isResolvingConflicts, setIsResolvingConflicts] = useState(false);
  const handleAutoResolveConflicts = async () => {
    if (conflicts.length === 0) return;
    setIsResolvingConflicts(true);

    try {
      const conflictPrompt = `Please resolve this schedule conflict on ${selectedDate}: ${conflicts.map((c) => c.reason).join('. ')}. Adjust the start and end times to eliminate overlap while keeping reasonable focus buffers.`;
      
      const res = await fetch('/api/assistant/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: conflictPrompt,
          scheduleState: { events, reminders, currentDate: selectedDate },
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.actions && data.actions.length > 0) {
          data.actions.forEach((act: ScheduleAction) => handleApplyAction(act));
          showToast('Conflicts resolved automatically by Aura!', 'success');
        } else {
          // Heuristic fallback: shift the second conflicting event
          const conflict = conflicts[0];
          const bStart = conflict.eventA.endTime;
          const [h, m] = bStart.split(':').map(Number);
          const newEndH = String(Math.min(23, h + 1)).padStart(2, '0');
          const newEnd = `${newEndH}:${String(m).padStart(2, '0')}`;

          setEvents((prev) =>
            prev.map((e) =>
              e.id === conflict.eventB.id
                ? { ...e, startTime: bStart, endTime: newEnd }
                : e
            )
          );
          showToast('Schedule rebalanced successfully!', 'success');
        }
      }
    } catch (err) {
      console.warn('Conflict resolve error:', err);
      showToast('Could not auto-resolve conflict at this time.', 'warning');
    } finally {
      setIsResolvingConflicts(false);
    }
  };

  // Fetch Daily Briefing
  const handleOpenBriefing = async () => {
    setIsBriefingOpen(true);
    setBriefingLoading(true);

    try {
      const res = await fetch('/api/assistant/daily-briefing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          events: events.filter((e) => e.startDate === selectedDate),
          reminders: reminders.filter((r) => r.dueDate === selectedDate),
          date: selectedDate,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setBriefingData(data);
      }
    } catch (err) {
      console.warn('Error fetching briefing:', err);
    } finally {
      setBriefingLoading(false);
    }
  };

  // Export iCalendar (.ics)
  const handleExportCalendar = () => {
    const icsContent = exportToICS(events, 'Aura Assistant');
    downloadFile(icsContent, `aura-schedule-${selectedDate}.ics`, 'text/calendar');
    showToast('Exported calendar (.ics) to your downloads!', 'success');
  };

  // Reset to sample data
  const handleResetData = () => {
    if (window.confirm('Reset schedule and reminders to demo initial state?')) {
      const init = generateInitialScheduleData();
      setEvents(init.events);
      setReminders(init.reminders);
      showToast('Schedule reset to demo dataset.', 'info');
    }
  };

  const pendingRemindersCount = useMemo(() => {
    return reminders.filter((r) => !r.completed && r.dueDate === today).length;
  }, [reminders, today]);

  return (
    <div className="min-h-screen bg-slate-100/70 text-slate-900 flex flex-col antialiased selection:bg-indigo-500 selection:text-white">
      {/* Top Main Navigation Bar */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          {/* Logo & Identity */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-linear-to-tr from-indigo-600 to-violet-600 text-white flex items-center justify-center shadow-xs">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-extrabold text-slate-900 text-base tracking-tight leading-none">
                  Aura
                </h1>
                <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200/60">
                  AI Assistant
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium leading-none mt-1 hidden sm:block">
                Daily Schedule & Reminders
              </p>
            </div>
          </div>

          {/* Quick Spotlight Trigger */}
          <button
            onClick={() => setIsQuickCommandOpen(true)}
            className="hidden md:flex items-center gap-3 px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200/80 text-slate-500 hover:text-slate-800 text-xs font-medium transition-colors border border-slate-200/60"
          >
            <Search className="w-3.5 h-3.5 text-slate-400" />
            <span>Type anything to schedule...</span>
            <kbd className="font-mono text-[10px] bg-white px-1.5 py-0.5 rounded-md border border-slate-200 text-slate-500 shadow-2xs">
              ⌘K
            </kbd>
          </button>

          {/* Views Tabs */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200/60 text-xs font-semibold">
            <button
              onClick={() => setActiveView('day')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                activeView === 'day'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Day
            </button>
            <button
              onClick={() => setActiveView('week')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                activeView === 'week'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Week
            </button>
            <button
              onClick={() => setActiveView('agenda')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                activeView === 'agenda'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Agenda
            </button>
            <button
              onClick={() => setActiveView('reminders')}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                activeView === 'reminders'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>Reminders</span>
              {pendingRemindersCount > 0 && (
                <span className="w-4 h-4 rounded-full bg-amber-500 text-white text-[10px] font-bold flex items-center justify-center">
                  {pendingRemindersCount}
                </span>
              )}
            </button>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            {/* New Event / Reminder Quick buttons */}
            <div className="hidden sm:flex items-center gap-1.5">
              <button
                onClick={() => setEventModalState({ isOpen: true, event: null })}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-xs transition-colors"
              >
                <Plus className="w-3.5 h-3.5" /> Event
              </button>
              <button
                onClick={() => setReminderModalState({ isOpen: true, reminder: null })}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold shadow-xs transition-colors"
              >
                <Plus className="w-3.5 h-3.5" /> Reminder
              </button>
            </div>

            {/* Aura Assistant Drawer Toggle */}
            <button
              onClick={() => setIsAssistantOpen(true)}
              className="relative flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs transition-all active:scale-95"
            >
              <Sparkles className="w-4 h-4" />
              <span>Ask Aura</span>
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            </button>

            {/* Extra Options Dropdown/Menu */}
            <button
              onClick={handleExportCalendar}
              title="Export to iCalendar (.ics)"
              className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors border border-slate-200/60 hidden md:block"
            >
              <Download className="w-4 h-4" />
            </button>

            <button
              onClick={handleResetData}
              title="Reset Demo Schedule"
              className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors hidden lg:block"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Workspace */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 flex flex-col">
        {/* Conflict Alert Banner if overlaps exist */}
        <ConflictAlertBanner
          conflicts={conflicts}
          onAutoResolve={handleAutoResolveConflicts}
          isResolving={isResolvingConflicts}
        />

        {/* View Switcher Container */}
        <div className="flex-1 min-h-[600px] flex flex-col">
          {activeView === 'day' && (
            <TimelineView
              events={events}
              selectedDate={selectedDate}
              onSelectDate={setSelectedDate}
              onEventClick={(ev) => setEventModalState({ isOpen: true, event: ev })}
              onAddEventSlot={(time) => {
                setEventModalState({
                  isOpen: true,
                  event: {
                    startDate: selectedDate,
                    startTime: time,
                    endDate: selectedDate,
                    endTime: `${String(parseInt(time.split(':')[0]) + 1).padStart(2, '0')}:00`,
                  },
                });
              }}
              conflicts={conflicts}
              onOpenAssistant={(prompt) => {
                setAssistantInitialPrompt(prompt);
                setIsAssistantOpen(true);
              }}
              onOpenBriefing={handleOpenBriefing}
            />
          )}

          {activeView === 'week' && (
            <WeekView
              events={events}
              selectedDate={selectedDate}
              onSelectDate={setSelectedDate}
              onEventClick={(ev) => setEventModalState({ isOpen: true, event: ev })}
              onAddEventSlot={(date, time) => {
                setEventModalState({
                  isOpen: true,
                  event: {
                    startDate: date,
                    startTime: time,
                    endDate: date,
                    endTime: `${String(parseInt(time.split(':')[0]) + 1).padStart(2, '0')}:00`,
                  },
                });
              }}
            />
          )}

          {activeView === 'agenda' && (
            <AgendaView
              events={events}
              selectedDate={selectedDate}
              onEventClick={(ev) => setEventModalState({ isOpen: true, event: ev })}
              onDeleteEvent={handleDeleteEvent}
            />
          )}

          {activeView === 'reminders' && (
            <RemindersHub
              reminders={reminders}
              onToggleComplete={handleToggleReminderComplete}
              onEditReminder={(r) => setReminderModalState({ isOpen: true, reminder: r })}
              onDeleteReminder={handleDeleteReminder}
              onAddReminder={handleSaveReminder}
              onSnoozeReminder={handleSnoozeReminder}
            />
          )}
        </div>
      </main>

      {/* Floating Assistant Launcher (on Mobile) */}
      <div className="sm:hidden fixed bottom-6 right-6 z-30">
        <button
          onClick={() => setIsAssistantOpen(true)}
          className="w-14 h-14 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-2xl active:scale-95 transition-transform"
        >
          <Sparkles className="w-6 h-6" />
        </button>
      </div>

      {/* Modals & Drawers */}
      <EventModal
        isOpen={eventModalState.isOpen}
        onClose={() => setEventModalState({ isOpen: false, event: null })}
        onSave={handleSaveEvent}
        onDelete={handleDeleteEvent}
        initialEvent={eventModalState.event}
        selectedDate={selectedDate}
      />

      <ReminderModal
        isOpen={reminderModalState.isOpen}
        onClose={() => setReminderModalState({ isOpen: false, reminder: null })}
        onSave={handleSaveReminder}
        onDelete={handleDeleteReminder}
        initialReminder={reminderModalState.reminder}
        selectedDate={selectedDate}
      />

      <AssistantDrawer
        isOpen={isAssistantOpen}
        onClose={() => {
          setIsAssistantOpen(false);
          setAssistantInitialPrompt(undefined);
        }}
        messages={messages}
        onSendMessage={handleSendMessage}
        isLoading={assistantLoading}
        onApplyAction={handleApplyAction}
        onClearHistory={() => setMessages([])}
        initialPrompt={assistantInitialPrompt}
      />

      <DailyBriefingModal
        isOpen={isBriefingOpen}
        onClose={() => setIsBriefingOpen(false)}
        briefing={briefingData}
        isLoading={briefingLoading}
        onRegenerate={handleOpenBriefing}
        selectedDate={selectedDate}
      />

      <QuickCommandBar
        isOpen={isQuickCommandOpen}
        onClose={() => setIsQuickCommandOpen(false)}
        onAddEvent={handleSaveEvent}
        onAddReminder={handleSaveReminder}
        currentDate={selectedDate}
      />

      {/* Toast Notification Banner */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-bottom-4 duration-150">
          <div
            className={`px-4 py-2.5 rounded-2xl shadow-xl text-xs font-semibold flex items-center gap-2 border ${
              toast.type === 'success'
                ? 'bg-slate-900 text-white border-slate-800'
                : toast.type === 'warning'
                ? 'bg-amber-600 text-white border-amber-700'
                : 'bg-indigo-600 text-white border-indigo-700'
            }`}
          >
            <Sparkles className="w-4 h-4 shrink-0" />
            <span>{toast.message}</span>
          </div>
        </div>
      )}
    </div>
  );
}
