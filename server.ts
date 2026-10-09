/**
 * @file server.ts
 * @description Full-stack Express server powering the Aura AI Assistant.
 * Serves API proxy endpoints for Google Gemini models and hosts Vite middlewares in development.
 *
 * Models utilized:
 * - gemini-3.8-flash: Conversational planning, conflict resolution, daily briefings, and natural language schedule parsing.
 * - gemini-3.8-flash-lite-tts: High-fidelity speech generation (WAV output, 24kHz) for spoken daily briefings.
 */

import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json({ limit: '10mb' }));

/**
 * Initialize the Google GenAI SDK.
 * Note: Telemetry header 'User-Agent': 'aistudio-build' is required.
 */
const apiKey = process.env.GEMINI_API_KEY || '';
const ai = apiKey
  ? new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    })
  : null;

// Helper to sanitize or handle fallback if Gemini API key isn't provided
function getAiClient() {
  if (!ai) {
    throw new Error('Gemini API key is not configured on the server.');
  }
  return ai;
}

// 1. Natural Language Assistant Chat Endpoint
app.post('/api/assistant/chat', async (req, res) => {
  try {
    const { message, history = [], scheduleState = {} } = req.body;
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const { events = [], reminders = [], currentDate = new Date().toISOString().split('T')[0] } = scheduleState;

    if (!ai) {
      // Graceful heuristic fallback if API key is temporarily absent
      return res.json({
        reply: `I received your request: "${message}". (Note: Gemini API key is not set in the environment, so live AI parsing is running in local mode).`,
        actions: [],
      });
    }

    const systemPrompt = `You are "Aura", an elite, proactive, and exceptionally organized personal schedule and reminder assistant.
Today's reference date is: ${currentDate}.
The user has provided their current schedule and reminders context:
Existing Events (${events.length}): ${JSON.stringify(events.slice(0, 30))}
Existing Reminders (${reminders.length}): ${JSON.stringify(reminders.slice(0, 30))}

Your job:
1. Provide a warm, concise, highly helpful response to the user's prompt.
2. Determine if the user's message implies creating, updating, deleting, or rescheduling events or reminders, resolving conflicts, or auto-planning the day.
3. If an action is required, output precise action items in the actions list.
4. Ensure event times are in 24-hour "HH:mm" format and dates are in "YYYY-MM-DD" format.
5. If the user refers to relative terms like "tomorrow", "this afternoon", "next Monday", calculate the exact YYYY-MM-DD relative to today (${currentDate}).
6. Event categories should be one of: 'work', 'personal', 'focus', 'health', 'meeting', 'urgent'.
7. Reminder priority should be one of: 'urgent', 'high', 'medium', 'low'.
8. If the user asks for a daily plan, time blocking, or conflict resolution, generate the appropriate actions.

Respond strictly in JSON matching the specified schema.`;

    const chatHistoryPrompt = history
      .slice(-6)
      .map((h: any) => `${h.role === 'user' ? 'User' : 'Aura'}: ${h.content}`)
      .join('\n');

    const promptText = `${chatHistoryPrompt ? `Recent conversation:\n${chatHistoryPrompt}\n\n` : ''}User prompt: ${message}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: promptText,
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            reply: {
              type: Type.STRING,
              description: 'Conversational, polite, and helpful response to the user.',
            },
            actions: {
              type: Type.ARRAY,
              description: 'List of actionable operations to perform on calendar or reminders.',
              items: {
                type: Type.OBJECT,
                properties: {
                  type: {
                    type: Type.STRING,
                    description: 'One of: add_event, update_event, delete_event, add_reminder, update_reminder, delete_reminder, auto_plan_day, resolve_conflicts, message_only',
                  },
                  description: {
                    type: Type.STRING,
                    description: 'Brief description of the action taken.',
                  },
                  data: {
                    type: Type.OBJECT,
                    description: 'Payload for the action. For add_event: { title, startDate, startTime, endDate, endTime, category, description, location }. For add_reminder: { title, dueDate, dueTime, priority, category, description }. For update: { id, updates }. For delete: { id }. For auto_plan_day: { plannedEvents: [...] }',
                    properties: {
                      id: { type: Type.STRING },
                      title: { type: Type.STRING },
                      description: { type: Type.STRING },
                      startDate: { type: Type.STRING },
                      startTime: { type: Type.STRING },
                      endDate: { type: Type.STRING },
                      endTime: { type: Type.STRING },
                      category: { type: Type.STRING },
                      location: { type: Type.STRING },
                      dueDate: { type: Type.STRING },
                      dueTime: { type: Type.STRING },
                      priority: { type: Type.STRING },
                      plannedEvents: {
                        type: Type.ARRAY,
                        items: {
                          type: Type.OBJECT,
                          properties: {
                            id: { type: Type.STRING },
                            title: { type: Type.STRING },
                            startDate: { type: Type.STRING },
                            startTime: { type: Type.STRING },
                            endDate: { type: Type.STRING },
                            endTime: { type: Type.STRING },
                            category: { type: Type.STRING },
                            description: { type: Type.STRING },
                          },
                        },
                      },
                    },
                  },
                },
                required: ['type'],
              },
            },
          },
          required: ['reply'],
        },
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    return res.json(parsed);
  } catch (error: any) {
    console.error('Error in /api/assistant/chat:', error);
    return res.status(500).json({
      error: 'Failed to process assistant request',
      details: error?.message || 'Unknown error',
    });
  }
});

// 2. Executive Daily Briefing Endpoint
app.post('/api/assistant/daily-briefing', async (req, res) => {
  try {
    const { events = [], reminders = [], date = new Date().toISOString().split('T')[0] } = req.body;

    if (!ai) {
      return res.json({
        greeting: 'Good morning!',
        summary: `You have ${events.length} event(s) and ${reminders.length} reminder(s) queued for ${date}.`,
        focusScore: 78,
        totalScheduledHours: 4.5,
        freeHours: 3.5,
        conflicts: [],
        keyPriorities: ['Focus on top schedule tasks'],
        productivityTip: 'Block 45 minutes of uninterrupted deep focus in the morning.',
        quote: 'Small disciplines repeated with consistency lead to great achievements.',
      });
    }

    const systemPrompt = `You are Aura, an executive chief-of-staff AI. Analyze the user's daily calendar and reminders for the target date (${date}).
Events for the day: ${JSON.stringify(events)}
Reminders for the day: ${JSON.stringify(reminders)}

Provide a sharp, motivating, and actionable executive summary.
Calculate:
1. focusScore (0-100 score on how balanced and realistic the schedule is)
2. totalScheduledHours
3. freeHours (assuming an 8-hour workday window between 9 AM and 5 PM)
4. conflicts (strings describing any overlapping events or back-to-back pressure)
5. keyPriorities (top 3 critical objectives for today)
6. productivityTip (one hyper-practical scheduling/focus tip for today)
7. quote (an inspiring, non-cliché thought for today)

Respond strictly in JSON matching the schema.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: `Generate daily briefing for ${date}`,
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            greeting: { type: Type.STRING },
            summary: { type: Type.STRING },
            focusScore: { type: Type.NUMBER },
            totalScheduledHours: { type: Type.NUMBER },
            freeHours: { type: Type.NUMBER },
            conflicts: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            keyPriorities: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            productivityTip: { type: Type.STRING },
            quote: { type: Type.STRING },
          },
          required: ['greeting', 'summary', 'focusScore', 'totalScheduledHours', 'freeHours', 'keyPriorities', 'productivityTip'],
        },
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    return res.json(parsed);
  } catch (error: any) {
    console.error('Error in /api/assistant/daily-briefing:', error);
    return res.status(500).json({ error: error.message });
  }
});

// 3. Natural Language Quick Parse Endpoint
app.post('/api/assistant/parse-input', async (req, res) => {
  try {
    const { input, currentDate = new Date().toISOString().split('T')[0] } = req.body;
    if (!input) {
      return res.status(400).json({ error: 'Input text is required' });
    }

    if (!ai) {
      return res.json({
        type: 'reminder',
        item: {
          title: input,
          dueDate: currentDate,
          priority: 'medium',
          category: 'general',
        },
      });
    }

    const prompt = `Today's date is ${currentDate}.
Analyze this quick entry text: "${input}"
Determine if it represents a calendar EVENT (has duration or specific start/end times or meeting context) or a REMINDER (task, deadline, or to-do).
Extract all details:
- title
- description (optional)
- If event: startDate, startTime (HH:mm), endDate, endTime (HH:mm, default 1 hour after start if not stated), category ('work'|'personal'|'focus'|'health'|'meeting'|'urgent'), location (if mentioned)
- If reminder: dueDate, dueTime (HH:mm, optional), priority ('urgent'|'high'|'medium'|'low'), category ('work'|'personal'|'health'|'errands'|'general')

Format response strictly in JSON.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            kind: {
              type: Type.STRING,
              description: '"event" or "reminder"',
            },
            confidence: { type: Type.NUMBER },
            event: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                description: { type: Type.STRING },
                startDate: { type: Type.STRING },
                startTime: { type: Type.STRING },
                endDate: { type: Type.STRING },
                endTime: { type: Type.STRING },
                category: { type: Type.STRING },
                location: { type: Type.STRING },
              },
            },
            reminder: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                description: { type: Type.STRING },
                dueDate: { type: Type.STRING },
                dueTime: { type: Type.STRING },
                priority: { type: Type.STRING },
                category: { type: Type.STRING },
              },
            },
          },
          required: ['kind'],
        },
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    return res.json(parsed);
  } catch (error: any) {
    console.error('Error in /api/assistant/parse-input:', error);
    return res.status(500).json({ error: error.message });
  }
});

// 4. Voice Audio Briefing (Text-To-Speech) via gemini-3.8-flash-lite-tts
app.post('/api/assistant/tts', async (req, res) => {
  try {
    const { text, voice = 'Kore' } = req.body;
    if (!text) {
      return res.status(400).json({ error: 'Text is required for TTS' });
    }

    if (!ai) {
      return res.status(503).json({ error: 'AI voice synthesis requires GEMINI_API_KEY' });
    }

    // Call gemini-3.8-flash-lite-tts to generate WAV audio
    const ttsResponse = await ai.models.generateContent({
      model: 'gemini-3.8-flash-lite-tts',
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: `Say warmly and clearly as a professional executive personal assistant: ${text.slice(0, 600)}`,
              speechMetadata: {
                style: 'Warm, clear, executive personal assistant',
              },
            },
          ],
        },
      ],
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: voice || 'Kore' },
          },
        },
      },
    });

    const base64Audio = ttsResponse.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) {
      return res.status(500).json({ error: 'Could not extract synthesized audio' });
    }

    return res.json({ audioBase64: base64Audio, mimeType: 'audio/wav' });
  } catch (error: any) {
    console.error('Error in /api/assistant/tts:', error);
    return res.status(500).json({ error: error.message });
  }
});

// Mount Vite or static assets
async function startServer() {
  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Aura AI Assistant server running on http://0.0.0.0:${PORT} (${isProduction ? 'prod' : 'dev'})`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
