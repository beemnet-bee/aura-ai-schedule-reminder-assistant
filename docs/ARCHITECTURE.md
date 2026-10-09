# Technical Architecture & System Documentation

This document provides a comprehensive technical walkthrough of the codebase, internal data structures, state lifecycle, conflict resolution algorithms, and Gemini AI integration for **Aura**.

---

## 1. Directory Structure

```
├── .env.example                     # Environment template (GEMINI_API_KEY, APP_URL)
├── index.html                       # HTML5 entry point with Plus Jakarta Sans & JetBrains Mono
├── metadata.json                    # AI Studio metadata & server capabilities
├── package.json                     # Dependency manifests & scripts
├── server.ts                        # Full-stack Express server & Gemini API proxy
├── src/
│   ├── main.tsx                     # React 19 root bootstrap
│   ├── App.tsx                      # Top-level state coordinator & view controller
│   ├── index.css                    # Tailwind CSS imports & animations
│   ├── types/
│   │   └── assistant.ts             # Domain models (CalendarEvent, Reminder, ConflictItem, etc.)
│   ├── utils/
│   │   ├── dateUtils.ts             # Date arithmetic, conflict math, and iCalendar export
│   │   └── audio.ts                # Web Audio API synthesizers and TTS playback
│   └── components/
│       ├── TimelineView.tsx         # 24-hour visual Day Timeline with real-time scrubber
│       ├── WeekView.tsx             # 7-day panoramic week column grid
│       ├── AgendaView.tsx           # Chronological linear commitments list
│       ├── RemindersHub.tsx         # Prioritized tasks manager with confetti & snooze
│       ├── EventModal.tsx           # Scrollable event creation & editing dialog
│       ├── ReminderModal.tsx        # Scrollable reminder creation & subtasks dialog
│       ├── AssistantDrawer.tsx      # Gemini assistant side drawer with voice dictation
│       ├── DailyBriefingModal.tsx   # Executive morning briefing with audio synthesis
│       ├── QuickCommandBar.tsx      # Spotlight natural language command bar (⌘K)
│       └── ConflictAlertBanner.tsx  # Overlap alert banner with 1-click AI resolution
└── docs/
    └── ARCHITECTURE.md              # Technical documentation
```

---

## 2. Core Domain Data Models

### 2.1 Calendar Event (`CalendarEvent`)
```typescript
export interface CalendarEvent {
  id: string;               // Unique event ID (e.g. 'ev-1728470000')
  title: string;            // Event title
  description?: string;     // Notes, agenda, links
  startDate: string;        // YYYY-MM-DD
  startTime: string;        // HH:mm (24-hour format)
  endDate: string;          // YYYY-MM-DD
  endTime: string;          // HH:mm (24-hour format)
  category: EventCategory;  // 'work' | 'personal' | 'focus' | 'health' | 'meeting' | 'urgent'
  location?: string;        // Room, Meet URL, or physical place
  color?: string;           // Optional custom accent
  isCompleted?: boolean;
}
```

### 2.2 Reminder (`Reminder`)
```typescript
export interface Reminder {
  id: string;               // Unique reminder ID
  title: string;            // Task title
  description?: string;     // Context or instructions
  dueDate: string;          // YYYY-MM-DD
  dueTime?: string;         // Optional HH:mm deadline
  priority: ReminderPriority; // 'urgent' | 'high' | 'medium' | 'low'
  completed: boolean;       // Status flag
  category: ReminderCategory; // 'work' | 'personal' | 'health' | 'errands' | 'general'
  subtasks?: Subtask[];     // Granular checklist items
  recurring?: RecurringInterval; // 'none' | 'daily' | 'weekly' | 'monthly'
  snoozedUntil?: string;    // ISO timestamp
  createdAt?: string;
}
```

---

## 3. Conflict Detection Algorithm

Conflict detection is performed deterministically on the client using mathematical interval intersection in `src/utils/dateUtils.ts`.

### Mathematical Formulation
Given two events $E_A$ and $E_B$ occurring on the same calendar date:
- Let $S_A, E_A$ be start and end times of Event A in minutes from midnight.
- Let $S_B, E_B$ be start and end times of Event B in minutes from midnight.

An overlap exists if and only if:
$$\text{overlap} = (S_A < E_B) \land (E_A > S_B)$$

```typescript
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
```

When conflicts are detected:
1. Both event cards in `TimelineView` receive a pulsating rose badge and border.
2. The `ConflictAlertBanner` displays at the top of the workspace.
3. Clicking **"AI Auto-Resolve Overlaps"** invokes `/api/assistant/chat`, which prompts Gemini with the collision details and returns adjusted non-overlapping time boundaries.

---

## 4. Modal Architecture & Scrollability

All dialog components (`EventModal`, `ReminderModal`, `DailyBriefingModal`, and `QuickCommandBar`) implement an ergonomic **Anchored Header & Footer + Scrollable Body** pattern:

```html
<!-- Outer Backdrop: handles clicks and mobile overflow -->
<div role="dialog" class="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/50 backdrop-blur-xs overflow-y-auto">
  
  <!-- Modal Card: constrained to 92vh/88vh with flex-col layout -->
  <div class="bg-white rounded-2xl shadow-2xl w-full max-w-lg border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] sm:max-h-[88vh]">
    
    <!-- Pinned Header: shrink-0 -->
    <div class="shrink-0 flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/80">
      <!-- Title & Close Button -->
    </div>

    <!-- Scrollable Body: flex-1 overflow-y-auto -->
    <form id="modal-form" class="flex-1 overflow-y-auto p-6 space-y-4">
      <!-- Input fields, category buttons, date pickers, subtasks -->
    </form>

    <!-- Pinned Footer: shrink-0 -->
    <div class="shrink-0 flex items-center justify-between px-6 py-3.5 border-t border-slate-100 bg-slate-50/80">
      <button type="submit" form="modal-form">Save Changes</button>
    </div>

  </div>
</div>
```

### Advantages
1. **Never Cuts Off Buttons:** Submit and Cancel buttons are always visible, regardless of screen height.
2. **Keyboard Accessible:** `Escape` key closes the modal; `autoFocus` enables immediate typing.
3. **Smooth Scrollbars:** Styled via custom WebKit scrollbar rules in `src/index.css`.

---

## 5. Gemini AI Integration & Prompt Engineering

All calls to the `@google/genai` SDK occur strictly server-side inside `server.ts`. The client communicates via JSON REST endpoints.

### 5.1 Telemetry Compliance
```typescript
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build', // Mandatory telemetry header
    },
  },
});
```

### 5.2 Conversational Action Schema (`gemini-3.8-flash`)
The system prompt injects today's date and the current 30 events/reminders. The response format uses `responseMimeType: 'application/json'` and a typed `responseSchema` enforcing structured `actions` arrays.

When a user says:
> *"Plan my afternoon tomorrow: I need 2 hours for coding and 1 hour client demo"*

Gemini calculates the target date, divides open time slots, assigns `'focus'` and `'meeting'` categories, and outputs an action of type `'auto_plan_day'` or multiple `'add_event'` actions.

### 5.3 Speech Generation (`gemini-3.8-flash-lite-tts`)
The `/api/assistant/tts` endpoint uses `gemini-3.8-flash-lite-tts` with voice persona `'Kore'` (or `'Zephyr'`). The unary call returns a complete 24kHz mono WAV audio file with RIFF header directly in `inlineData.data`, which the client decodes into a standard HTML `<audio>` source.

---

## 6. Zero-Asset Audio Synthesis (`src/utils/audio.ts`)

To avoid flaky external MP3/WAV network dependencies, UI audio feedback is synthesized on the fly via the browser's native `AudioContext`:
- **Notification Chime (`playNotificationChime`):** Dual oscillator (sine + triangle) 3-note arpeggio (C6 $\rightarrow$ E6 $\rightarrow$ G6) for reminder alarms.
- **Completion Pop (`playCompleteSound`):** Frequency exponential ramp (D5 $\rightarrow$ A5) for satisfying checkbox clicks.
- **Conflict Warning (`playAlertSound`):** Sawtooth tone pair for schedule collisions.
