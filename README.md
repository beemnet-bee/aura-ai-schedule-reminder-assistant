# Aura — AI Personal Schedule & Reminder Assistant

> An intelligent, executive-grade daily schedule and reminder assistant powered by Google Gemini, designed to optimize time-blocking, eliminate calendar conflicts, and keep priorities laser-focused.

---

## 🌟 Overview

**Aura** acts as your personal chief-of-staff AI. Rather than manually juggling static calendar blocks and disjointed to-do lists, Aura actively monitors your schedule, provides spoken daily morning briefings, detects scheduling collisions in real-time, and provides 1-click AI resolutions.

Built with a responsive full-stack architecture (**Express + Vite + React 19 + TypeScript + Tailwind CSS**), Aura combines direct client-side reactivity with server-side Gemini intelligence.

---

## 🚀 Key Features

### 1. Conversational AI Copilot (`gemini-3.8-flash`)
- **Natural Language Scheduling:** Chat or speak to Aura naturally (e.g., *"Schedule team sync tomorrow 2pm to 3:30pm in Room 4"*, *"Plan my afternoon for deep coding"*, *"Remind me to submit the quarterly proposal at 5pm"*).
- **Actionable Execution Cards:** Aura returns conversational answers paired with structured mutation actions (`add_event`, `update_event`, `auto_plan_day`, `resolve_conflicts`) that can be applied with a single click.
- **Hands-Free Voice Dictation:** Integrated with the Web Speech API with an animated recording pulse for natural speech-to-text dictation.

### 2. Multi-Perspective Calendar Engine
- **Day Timeline View:**
  - 24-hour visual grid (7:00 AM – 10:00 PM) with a real-time red scrubber line indicator.
  - Color-coded categories: **Deep Focus** (Indigo), **Meeting** (Purple), **Work** (Blue), **Health & Wellness** (Emerald), **Personal** (Amber), and **Urgent** (Rose).
  - Click on any empty hour slot to instantly schedule an event.
- **7-Day Week View:** High-level panoramic column view across Monday–Sunday with quick day selection and quick-add slots.
- **Chronological Agenda:** Grouped linear list of upcoming commitments with duration metrics and edit controls.

### 3. Intelligent Conflict Detection & 1-Click AI Auto-Resolve
- **Automatic Collision Detection:** Mathematical interval overlap algorithm (`startA < endB && endA > startB`) flags conflicting events in real-time.
- **Prominent Conflict Alert Banner:** Displays details on the collision and provides an instant **"AI Auto-Resolve Overlaps"** button that prompts Gemini to shift and rebalance the day with zero manual math.

### 4. Executive Daily Briefing
- **Workload & Focus Analysis:** Calculates daily scheduled hours, available focus buffer hours, and a 0–100 **Focus Score**.
- **Top 3 Daily Objectives:** Prioritizes what matters most for the day.
- **Spoken Audio Briefing (`gemini-3.8-flash-lite-tts`):** Generates 24kHz studio-quality spoken audio briefings, with smooth fallback to browser speech synthesis.

### 5. Smart Reminders Hub
- **Prioritized Categories:** Urgent (P1), High (P2), Medium (P3), and Low (P4).
- **Filter Tabs:** *Today*, *Upcoming*, *Overdue*, and *Completed*.
- **Subtasks & Checklists:** Expandable step-by-step checklist with progress tracking.
- **Snooze Engine:** Postpone tasks by +1h or push to tomorrow morning.
- **Celebratory Feedback:** Confetti bursts and uplifting audio pops on task completion.
- **Audio Chime Alarms:** Active timer checks every 30 seconds to alert you when a task deadline is reached.

### 6. Spotlight Command Bar (`⌘K` / `Ctrl+K`)
- Global floating search and natural language parser.
- Type conversational input (e.g., *"Dentist appointment next Tuesday at 3pm"*); Aura extracts the title, date, start/end time, and category automatically.

### 7. Export & Persistence
- **iCalendar (.ics) Export:** Download standard `.ics` calendar files to import directly into Google Calendar, Apple Calendar, or Microsoft Outlook.
- **Local Storage Synchronization:** All changes persist locally across browser reloads.

---

## 🛠️ Architecture & Tech Stack

```
┌─────────────────────────────────────────────────────────────┐
│                      Client (Browser)                       │
│  React 19 + TypeScript + Tailwind CSS + Lucide + Web Audio  │
│  - Day Timeline / Week View / Agenda / Reminders Hub        │
│  - Assistant Drawer (Speech Recognition + Action Cards)     │
│  - Spotlight Command Bar (⌘K)                               │
└──────────────────────────────┬──────────────────────────────┘
                               │ HTTP / JSON
┌──────────────────────────────▼──────────────────────────────┐
│                   Server (server.ts - Express)              │
│  - POST /api/assistant/chat          (gemini-3.8-flash)     │
│  - POST /api/assistant/daily-briefing (gemini-3.8-flash)     │
│  - POST /api/assistant/parse-input   (gemini-3.8-flash)     │
│  - POST /api/assistant/tts           (gemini-3.8-flash-lite)│
│  - Vite Middlewares (Dev) / Static Dist (Production)        │
└──────────────────────────────┬──────────────────────────────┘
                               │ Google GenAI SDK
┌──────────────────────────────▼──────────────────────────────┐
│                      Google Gemini API                      │
│  - gemini-3.8-flash: JSON Mode & Structured Function Schemas│
│  - gemini-3.8-flash-lite-tts: 24kHz Unary WAV Speech Audio  │
└─────────────────────────────────────────────────────────────┘
```

| Layer | Technologies |
|---|---|
| **Frontend** | React 19, TypeScript, Tailwind CSS v4, Lucide React, Motion, Canvas-Confetti |
| **Backend** | Express 4, Node 22, Tsx / Esbuild |
| **AI SDK** | `@google/genai` (v2.4.0) with required telemetry headers |
| **AI Models** | `gemini-3.8-flash` (Reasoning & Text), `gemini-3.8-flash-lite-tts` (Speech) |
| **Audio** | HTML5 Web Audio API (Synthesizer) + Unary 24kHz WAV Playback |

---

## 📡 Backend API Reference

### 1. `POST /api/assistant/chat`
Conversational chat endpoint with Gemini 3.8 Flash that inspects the user's schedule state and emits actionable mutations.
- **Request Body:**
  ```json
  {
    "message": "Schedule sync with David tomorrow at 2pm",
    "history": [{"role": "user", "content": "..."}],
    "scheduleState": {
      "events": [...],
      "reminders": [...],
      "currentDate": "2026-10-09"
    }
  }
  ```
- **Response:**
  ```json
  {
    "reply": "I have scheduled your sync with David for tomorrow at 2:00 PM.",
    "actions": [
      {
        "type": "add_event",
        "description": "Schedule sync with David",
        "data": {
          "title": "Sync with David",
          "startDate": "2026-10-10",
          "startTime": "14:00",
          "endDate": "2026-10-10",
          "endTime": "15:00",
          "category": "meeting"
        }
      }
    ]
  }
  ```

### 2. `POST /api/assistant/daily-briefing`
Synthesizes an executive morning outlook analyzing commitments and focus balance.
- **Response Body:**
  ```json
  {
    "greeting": "Good morning!",
    "summary": "You have a balanced morning followed by high-leverage client calls in the afternoon.",
    "focusScore": 85,
    "totalScheduledHours": 5.0,
    "freeHours": 3.0,
    "conflicts": [],
    "keyPriorities": ["1. Finalize proposal", "2. Client strategy call"],
    "productivityTip": "Take a 15-minute screen-free walk after your 1:00 PM meeting.",
    "quote": "Discipline is the bridge between goals and accomplishment."
  }
  ```

### 3. `POST /api/assistant/parse-input`
Extracts structured event or reminder parameters from conversational short text.

### 4. `POST /api/assistant/tts`
Converts written briefing text into spoken audio using `gemini-3.8-flash-lite-tts`.
- **Response Body:**
  ```json
  {
    "audioBase64": "<base64_wav_data>",
    "mimeType": "audio/wav"
  }
  ```

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `⌘ + K` or `Ctrl + K` | Open Spotlight Natural Language Command Bar |
| `Escape` | Dismiss any open modal dialog or command bar |
| `Enter` | Submit / Parse within command bar or quick add |

---

## 🏃 Running the Application

### Prerequisites
- Node.js 22+
- `GEMINI_API_KEY` (configured in `.env` or AI Studio environment)

### Commands
```bash
# Install dependencies
npm install

# Start the full-stack development server (Port 3000)
npm run dev

# Compile TypeScript and build client assets
npm run build

# Start production server
npm run start

# Type check codebase
npm run lint
```
