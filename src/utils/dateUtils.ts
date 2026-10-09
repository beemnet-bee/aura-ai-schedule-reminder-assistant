/**
 * @file dateUtils.ts
 * @description Date math, time conversion, overlap conflict detection, focus score calculation,
 * and iCalendar (.ics) export utilities for the Aura personal assistant.
 */

import { CalendarEvent, Reminder, ConflictItem } from '../types/assistant';

/**
 * Returns today's date formatted as YYYY-MM-DD in the user's local timezone.
 */
export function getTodayDateString(): string {
  const d = new Date();
  return formatToYYYYMMDD(d);
}

export function formatToYYYYMMDD(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function addDays(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() + days);
  return formatToYYYYMMDD(date);
}

export function parseTimeToMinutes(timeStr: string): number {
  if (!timeStr) return 0;
  const parts = timeStr.split(':');
  const h = parseInt(parts[0], 10) || 0;
  const m = parseInt(parts[1], 10) || 0;
  return h * 60 + m;
}

export function minutesToTimeString(minutes: number): string {
  const h = Math.floor(minutes / 60) % 24;
  const m = Math.floor(minutes % 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function formatTime12h(timeStr: string): string {
  if (!timeStr) return '';
  const [hStr, mStr] = timeStr.split(':');
  let h = parseInt(hStr, 10);
  const m = mStr || '00';
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12;
  h = h ? h : 12; // 0 should be 12
  return `${h}:${m} ${ampm}`;
}

export function formatReadableDate(dateStr: string): string {
  const today = getTodayDateString();
  const tomorrow = addDays(today, 1);
  const yesterday = addDays(today, -1);

  if (dateStr === today) return 'Today';
  if (dateStr === tomorrow) return 'Tomorrow';
  if (dateStr === yesterday) return 'Yesterday';

  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

export function getWeekDays(referenceDate: string): string[] {
  const [y, m, d] = referenceDate.split('-').map(Number);
  const current = new Date(y, m - 1, d);
  // Find Sunday or Monday of this week (let's use Monday as start of week)
  const day = current.getDay();
  const diff = current.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(current.setDate(diff));

  const week: string[] = [];
  for (let i = 0; i < 7; i++) {
    const nextDay = new Date(monday);
    nextDay.setDate(monday.getDate() + i);
    week.push(formatToYYYYMMDD(nextDay));
  }
  return week;
}

/**
 * Detect conflicts among events for a specific date
 */
export function detectConflicts(events: CalendarEvent[], targetDate: string): ConflictItem[] {
  const dayEvents = events
    .filter((e) => e.startDate === targetDate)
    .sort((a, b) => parseTimeToMinutes(a.startTime) - parseTimeToMinutes(b.startTime));

  const conflicts: ConflictItem[] = [];

  for (let i = 0; i < dayEvents.length; i++) {
    for (let j = i + 1; j < dayEvents.length; j++) {
      const a = dayEvents[i];
      const b = dayEvents[j];

      const aStart = parseTimeToMinutes(a.startTime);
      const aEnd = parseTimeToMinutes(a.endTime || a.startTime);
      const bStart = parseTimeToMinutes(b.startTime);
      const bEnd = parseTimeToMinutes(b.endTime || b.startTime);

      // Overlap condition
      if (aStart < bEnd && aEnd > bStart) {
        conflicts.push({
          eventA: a,
          eventB: b,
          reason: `Overlaps between "${a.title}" (${a.startTime}-${a.endTime}) and "${b.title}" (${b.startTime}-${b.endTime})`,
          suggestedSlot: {
            startTime: minutesToTimeString(Math.max(aEnd, bEnd)),
            endTime: minutesToTimeString(Math.max(aEnd, bEnd) + (bEnd - bStart)),
          },
        });
      }
    }
  }

  return conflicts;
}

/**
 * Compute schedule stats
 */
export function calculateScheduleMetrics(events: CalendarEvent[], targetDate: string) {
  const dayEvents = events.filter((e) => e.startDate === targetDate);
  let totalScheduledMinutes = 0;
  let focusMinutes = 0;
  let meetingMinutes = 0;

  dayEvents.forEach((ev) => {
    const start = parseTimeToMinutes(ev.startTime);
    const end = parseTimeToMinutes(ev.endTime || ev.startTime);
    const dur = Math.max(0, end - start);
    totalScheduledMinutes += dur;

    if (ev.category === 'focus') {
      focusMinutes += dur;
    } else if (ev.category === 'meeting') {
      meetingMinutes += dur;
    }
  });

  const workdayMinutes = 8 * 60; // 480 mins
  const freeMinutes = Math.max(0, workdayMinutes - totalScheduledMinutes);

  // Focus score calculation (0 - 100): reward healthy focus blocks, penalize overbooking > 8h
  let focusScore = 70;
  if (focusMinutes >= 120) focusScore += 15;
  if (meetingMinutes > 300) focusScore -= 20;
  if (totalScheduledMinutes > 480) focusScore -= 15;
  if (dayEvents.length > 0 && focusMinutes === 0) focusScore -= 10;
  focusScore = Math.min(100, Math.max(10, focusScore));

  return {
    totalScheduledMinutes,
    totalScheduledHours: Number((totalScheduledMinutes / 60).toFixed(1)),
    focusMinutes,
    focusHours: Number((focusMinutes / 60).toFixed(1)),
    meetingMinutes,
    freeMinutes,
    freeHours: Number((freeMinutes / 60).toFixed(1)),
    focusScore,
  };
}

/**
 * Generate iCalendar .ics export file content
 */
export function exportToICS(events: CalendarEvent[], appName = 'Aura Assistant'): string {
  let ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    `PRODID:-//${appName}//Schedule//EN`,
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
  ];

  events.forEach((ev) => {
    const startClean = ev.startDate.replace(/-/g, '') + 'T' + ev.startTime.replace(/:/g, '') + '00';
    const endClean = (ev.endDate || ev.startDate).replace(/-/g, '') + 'T' + (ev.endTime || ev.startTime).replace(/:/g, '') + '00';

    ics.push(
      'BEGIN:VEVENT',
      `UID:${ev.id}@aura-assistant.ai`,
      `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').split('.')[0]}Z`,
      `DTSTART:${startClean}`,
      `DTEND:${endClean}`,
      `SUMMARY:${ev.title.replace(/[,;]/g, ' ')}`,
      `DESCRIPTION:${(ev.description || '').replace(/\n/g, '\\n')}`,
      ev.location ? `LOCATION:${ev.location}` : '',
      `CATEGORIES:${ev.category.toUpperCase()}`,
      'END:VEVENT'
    );
  });

  ics.push('END:VCALENDAR');
  return ics.filter(Boolean).join('\r\n');
}

/**
 * Trigger browser download for file
 */
export function downloadFile(content: string, filename: string, mimeType = 'text/calendar') {
  const blob = new Blob([content], { type: `${mimeType};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Default sample events and reminders for a rich, realistic start
 */
export function generateInitialScheduleData(): { events: CalendarEvent[]; reminders: Reminder[] } {
  const today = getTodayDateString();
  const tomorrow = addDays(today, 1);
  const dayAfter = addDays(today, 2);

  const events: CalendarEvent[] = [
    {
      id: 'ev-1',
      title: 'Morning Executive Briefing & Planning',
      description: 'Review priorities, triage inbox, align top 3 goals with Aura.',
      startDate: today,
      startTime: '08:30',
      endDate: today,
      endTime: '09:15',
      category: 'focus',
      location: 'Home Office',
    },
    {
      id: 'ev-2',
      title: 'Product Roadmap & Engineering Sync',
      description: 'Review sprint deliverables, architectural roadmap, and unblock frontend team.',
      startDate: today,
      startTime: '09:30',
      endDate: today,
      endTime: '10:30',
      category: 'meeting',
      location: 'Google Meet',
    },
    {
      id: 'ev-3',
      title: 'Deep Work: System Architecture & Coding',
      description: 'Uninterrupted block for backend API optimizations and database indexing.',
      startDate: today,
      startTime: '11:00',
      endDate: today,
      endTime: '12:30',
      category: 'focus',
      location: 'Deep Work Mode',
    },
    {
      id: 'ev-4',
      title: 'Nutritious Lunch & Quick Walk',
      description: 'Step away from screen for mental clarity.',
      startDate: today,
      startTime: '12:30',
      endDate: today,
      endTime: '13:15',
      category: 'health',
      location: 'Local Park',
    },
    {
      id: 'ev-5',
      title: 'Client Strategy & Demo Call',
      description: 'Present the latest progress report and discuss next phase milestones.',
      startDate: today,
      startTime: '14:00',
      endDate: today,
      endTime: '15:00',
      category: 'work',
      location: 'Zoom',
    },
    {
      id: 'ev-6',
      title: 'Team Standup Check-in',
      description: 'Quick alignment check with design and product team.',
      startDate: today,
      startTime: '14:45', // Intentionally overlaps with Client Strategy Call to showcase conflict detection!
      endDate: today,
      endTime: '15:15',
      category: 'meeting',
      location: 'Huddle Room',
    },
    {
      id: 'ev-7',
      title: 'Evening Workout & Stretch',
      description: 'Strength training session and mobility cooldown.',
      startDate: today,
      startTime: '17:30',
      endDate: today,
      endTime: '18:30',
      category: 'health',
      location: 'Fitness Center',
    },
    // Tomorrow events
    {
      id: 'ev-8',
      title: 'Quarterly Financial Review',
      description: 'Analyze budget allocations and department expenses.',
      startDate: tomorrow,
      startTime: '10:00',
      endDate: tomorrow,
      endTime: '11:30',
      category: 'work',
      location: 'Conference Room B',
    },
    {
      id: 'ev-9',
      title: 'Design Critique & UI Polishing',
      description: 'Refine typography, micro-interactions, and responsive layout.',
      startDate: tomorrow,
      startTime: '14:00',
      endDate: tomorrow,
      endTime: '15:30',
      category: 'focus',
      location: 'Figma',
    },
  ];

  const reminders: Reminder[] = [
    {
      id: 'rem-1',
      title: 'Submit finalized quarterly budget proposal',
      description: 'Attach PDF summary and email to leadership team before 5 PM.',
      dueDate: today,
      dueTime: '17:00',
      priority: 'urgent',
      completed: false,
      category: 'work',
      subtasks: [
        { id: 'sub-1', title: 'Export PDF from Sheets', completed: true },
        { id: 'sub-2', title: 'Verify executive summary notes', completed: false },
        { id: 'sub-3', title: 'Send email confirmation', completed: false },
      ],
    },
    {
      id: 'rem-2',
      title: 'Drink 2L water & take vitamin D',
      description: 'Maintain hydration throughout afternoon meetings.',
      dueDate: today,
      dueTime: '13:00',
      priority: 'medium',
      completed: true,
      category: 'health',
    },
    {
      id: 'rem-3',
      title: 'Pick up dry cleaning & pharmacy prescription',
      description: 'Before the store closes at 7 PM.',
      dueDate: today,
      dueTime: '18:45',
      priority: 'high',
      completed: false,
      category: 'errands',
    },
    {
      id: 'rem-4',
      title: 'Review pull request #142 for smart notifications',
      description: 'Ensure test coverage is above 90% and code comments are addressed.',
      dueDate: tomorrow,
      dueTime: '11:00',
      priority: 'high',
      completed: false,
      category: 'work',
    },
    {
      id: 'rem-5',
      title: 'Book dental checkup for next month',
      description: 'Call Dr. Martinez office for Friday morning slot.',
      dueDate: dayAfter,
      dueTime: '10:00',
      priority: 'low',
      completed: false,
      category: 'personal',
    },
  ];

  return { events, reminders };
}
