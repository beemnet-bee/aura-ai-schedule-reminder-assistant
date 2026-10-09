/**
 * @file assistant.ts
 * @description Core TypeScript domain models for the Aura AI Personal Assistant.
 * Includes data schemas for calendar events, reminders, schedule conflicts,
 * AI agent action payloads, assistant messages, and daily executive briefings.
 */

/**
 * High-level category for calendar events used for color-coding, metrics, and filtering.
 */
export type EventCategory = 'work' | 'personal' | 'focus' | 'health' | 'meeting' | 'urgent';

/**
 * Represents a discrete calendar event block with start/end timestamps and location details.
 */
export interface CalendarEvent {
  /** Unique identifier for the event (e.g., ev-12345) */
  id: string;
  /** Primary title or subject of the event */
  title: string;
  /** Optional extended description, agenda notes, or meeting link */
  description?: string;
  /** Start calendar date in ISO format (YYYY-MM-DD) */
  startDate: string;
  /** Start time in 24-hour military format (HH:mm) */
  startTime: string;
  /** End calendar date in ISO format (YYYY-MM-DD) */
  endDate: string;
  /** End time in 24-hour military format (HH:mm) */
  endTime: string;
  /** Domain classification category */
  category: EventCategory;
  /** Physical or virtual location (e.g., 'Room 402', 'Google Meet', 'Fitness Center') */
  location?: string;
  /** Optional custom hex or Tailwind color token */
  color?: string;
  /** Whether the event has been completed or archived */
  isCompleted?: boolean;
}

/**
 * Urgency/importance tier for reminders (P1 to P4).
 */
export type ReminderPriority = 'urgent' | 'high' | 'medium' | 'low';

/**
 * Domain category for task reminders.
 */
export type ReminderCategory = 'work' | 'personal' | 'health' | 'errands' | 'general';

/**
 * Recurrence frequency for repeating reminders.
 */
export type RecurringInterval = 'none' | 'daily' | 'weekly' | 'monthly';

/**
 * Represents a granular checklist item nested within a parent reminder.
 */
export interface Subtask {
  /** Unique identifier for the subtask */
  id: string;
  /** Text description of the subtask step */
  title: string;
  /** Completion flag */
  completed: boolean;
}

/**
 * Represents a prioritized reminder or to-do task with deadline and checklist support.
 */
export interface Reminder {
  /** Unique identifier for the reminder (e.g., rem-12345) */
  id: string;
  /** Title or headline of the reminder */
  title: string;
  /** Optional background notes, instructions, or hyperlinks */
  description?: string;
  /** Due calendar date in ISO format (YYYY-MM-DD) */
  dueDate: string;
  /** Optional due time in 24-hour format (HH:mm) */
  dueTime?: string;
  /** Priority level */
  priority: ReminderPriority;
  /** Whether the reminder has been checked off */
  completed: boolean;
  /** Categorical classification */
  category: ReminderCategory;
  /** Optional nested subtasks/checklist */
  subtasks?: Subtask[];
  /** Recurrence pattern */
  recurring?: RecurringInterval;
  /** ISO timestamp until which this reminder is snoozed */
  snoozedUntil?: string;
  /** Creation ISO timestamp */
  createdAt?: string;
}

/**
 * Identifies an overlap conflict between two calendar events on the same date.
 */
export interface ConflictItem {
  /** The first conflicting event */
  eventA: CalendarEvent;
  /** The second conflicting event */
  eventB: CalendarEvent;
  /** Human-readable explanation of the collision */
  reason: string;
  /** Optional AI-calculated non-overlapping alternative time slot */
  suggestedSlot?: {
    startTime: string;
    endTime: string;
  };
}

/**
 * Action operations emitted by Gemini to mutate the user's schedule or reminders.
 */
export interface ScheduleAction {
  /** The action verb identifying the mutation */
  type:
    | 'add_event'
    | 'update_event'
    | 'delete_event'
    | 'add_reminder'
    | 'update_reminder'
    | 'delete_reminder'
    | 'auto_plan_day'
    | 'resolve_conflicts'
    | 'message_only';
  /** Polymorphic payload containing event or reminder parameters */
  data?: any;
  /** Human-readable description of what this action does */
  description?: string;
}

/**
 * Represents a chat message in the Aura Assistant conversation stream.
 */
export interface AssistantMessage {
  /** Unique message identifier */
  id: string;
  /** Role origin of the message */
  role: 'user' | 'assistant';
  /** Text body of the message */
  content: string;
  /** ISO timestamp of message creation */
  timestamp: string;
  /** Optional executable action suggestions from the AI */
  actions?: ScheduleAction[];
  /** Whether the assistant is actively thinking */
  isThinking?: boolean;
  /** Optional synthesized speech audio payload encoded in base64 (WAV 24kHz) */
  audioBase64?: string;
}

/**
 * Executive daily briefing payload synthesized by Gemini analyzing schedule load and focus metrics.
 */
export interface DailyBriefingData {
  /** Personalized greeting (e.g. 'Good morning, Alex!') */
  greeting: string;
  /** High-level executive synthesis of the day's outlook */
  summary: string;
  /** Health/focus score between 0 and 100 based on workload balance */
  focusScore: number;
  /** Total sum of scheduled hours across meetings and events */
  totalScheduledHours: number;
  /** Uncommitted buffer hours available for deep focus */
  freeHours: number;
  /** List of detected conflict descriptions or bottlenecks */
  conflicts: string[];
  /** The top 3 high-leverage priorities to conquer today */
  keyPriorities: string[];
  /** Concrete productivity or time-management recommendation */
  productivityTip: string;
  /** Optional inspiring, non-cliché quote */
  quote?: string;
}
