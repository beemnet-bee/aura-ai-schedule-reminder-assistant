/**
 * @file AssistantDrawer.tsx
 * @description Side panel conversation interface with Aura, powered by Gemini 3.8 Flash.
 * Features Web Speech API voice dictation with an animated pulse, quick prompt chips,
 * and actionable schedule cards for 1-click execution.
 */

import React, { useState, useRef, useEffect } from 'react';
import { AssistantMessage, CalendarEvent, Reminder, ScheduleAction } from '../types/assistant';
import {
  X,
  Send,
  Sparkles,
  Mic,
  MicOff,
  Bot,
  User,
  CheckCircle,
  Calendar,
  Clock,
  AlertTriangle,
  RotateCcw,
  Volume2,
} from 'lucide-react';
import { formatTime12h, formatReadableDate } from '../utils/dateUtils';
import { playCompleteSound } from '../utils/audio';

interface AssistantDrawerProps {
  /** Whether the drawer is actively slid open */
  isOpen: boolean;
  /** Callback to close the drawer */
  onClose: () => void;
  /** Message history array */
  messages: AssistantMessage[];
  /** Async callback to send user prompt to Gemini backend */
  onSendMessage: (text: string) => Promise<void>;
  /** Whether an AI response is being processed */
  isLoading: boolean;
  /** Callback invoked when user confirms an action suggested by Aura */
  onApplyAction: (action: ScheduleAction) => void;
  /** Callback to reset conversation history */
  onClearHistory: () => void;
  /** Optional initial prompt to populate the input bar */
  initialPrompt?: string;
}

export const AssistantDrawer: React.FC<AssistantDrawerProps> = ({
  isOpen,
  onClose,
  messages,
  onSendMessage,
  isLoading,
  onApplyAction,
  onClearHistory,
  initialPrompt,
}) => {
  const [inputText, setInputText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [speechError, setSpeechError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if (initialPrompt) {
      setInputText(initialPrompt);
    }
  }, [initialPrompt]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Speech Recognition setup (Web Speech API)
  const toggleSpeechRecognition = () => {
    if (isRecording) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsRecording(false);
      return;
    }

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setSpeechError('Speech recognition is not supported in this browser.');
      setTimeout(() => setSpeechError(null), 4000);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsRecording(true);
        setSpeechError(null);
      };

      recognition.onresult = (event: any) => {
        let transcript = '';
        for (let i = 0; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        setInputText(transcript);
      };

      recognition.onerror = (err: any) => {
        console.warn('Speech recognition error:', err);
        setIsRecording(false);
      };

      recognition.onend = () => {
        setIsRecording(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (e: any) {
      console.warn('Speech recognition start failed:', e);
      setIsRecording(false);
    }
  };

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim() || isLoading) return;

    const text = inputText.trim();
    setInputText('');
    await onSendMessage(text);
  };

  const suggestedPrompts = [
    'Plan my afternoon for deep work',
    'Resolve schedule conflicts today',
    'Add reminder: Review project budget at 4pm',
    'Give me my executive schedule briefing',
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-[460px] bg-white border-l border-slate-200 shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-linear-to-r from-indigo-50/70 to-slate-50">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
              <span>Aura AI Assistant</span>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            </h3>
            <p className="text-[11px] text-slate-500">Intelligent Schedule & Reminders Copilot</p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={onClearHistory}
            title="Clear Chat History"
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors text-xs"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="py-8 text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto shadow-2xs">
              <Bot className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-800">How can I assist your day?</h4>
              <p className="text-xs text-slate-500 max-w-xs mx-auto mt-1">
                Ask me to schedule meetings, set reminders, detect & resolve conflicts, or organize your entire day.
              </p>
            </div>

            {/* Quick Prompt Pills */}
            <div className="pt-2 flex flex-col gap-2 max-w-xs mx-auto">
              {suggestedPrompts.map((prompt, idx) => (
                <button
                  key={idx}
                  onClick={() => onSendMessage(prompt)}
                  className="text-left px-3 py-2 rounded-xl bg-slate-50 hover:bg-indigo-50/70 border border-slate-200/80 hover:border-indigo-200 text-xs font-medium text-slate-700 hover:text-indigo-900 transition-all shadow-2xs"
                >
                  ✨ {prompt}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-2.5 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {msg.role === 'assistant' && (
                <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                  <Sparkles className="w-3.5 h-3.5" />
                </div>
              )}

              <div
                className={`max-w-[85%] rounded-2xl p-3.5 text-xs ${
                  msg.role === 'user'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-slate-50 border border-slate-200/90 text-slate-800 shadow-2xs'
                }`}
              >
                <div className="leading-relaxed whitespace-pre-wrap">{msg.content}</div>

                {/* Render Suggested Schedule Actions */}
                {msg.actions && msg.actions.length > 0 && (
                  <div className="mt-3 pt-2.5 border-t border-slate-200/70 space-y-2">
                    <p className="text-[11px] font-bold text-indigo-700 uppercase tracking-wider flex items-center gap-1">
                      <Sparkles className="w-3 h-3" /> Aura Proactive Actions
                    </p>

                    {msg.actions.map((act, actIdx) => (
                      <div
                        key={actIdx}
                        className="bg-white p-2.5 rounded-xl border border-indigo-100 shadow-2xs flex flex-col gap-1.5"
                      >
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-bold text-slate-800 capitalize">
                            {act.type.replace(/_/g, ' ')}
                          </span>
                          <span className="text-slate-400">
                            {act.data?.title || act.description || 'Schedule update'}
                          </span>
                        </div>

                        {act.data?.startTime && (
                          <div className="text-[11px] text-slate-600 flex items-center gap-1">
                            <Clock className="w-3 h-3 text-slate-400" />
                            <span>
                              {formatTime12h(act.data.startTime)} - {formatTime12h(act.data.endTime)}
                            </span>
                          </div>
                        )}

                        <button
                          onClick={() => {
                            playCompleteSound();
                            onApplyAction(act);
                          }}
                          className="mt-1 w-full py-1.5 px-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1 shadow-2xs transition-colors"
                        >
                          <CheckCircle className="w-3.5 h-3.5" /> Apply Action
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {msg.role === 'user' && (
                <div className="w-7 h-7 rounded-lg bg-slate-200 text-slate-600 flex items-center justify-center shrink-0 mt-0.5">
                  <User className="w-3.5 h-3.5" />
                </div>
              )}
            </div>
          ))
        )}

        {isLoading && (
          <div className="flex gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
              <Sparkles className="w-3.5 h-3.5 animate-spin" />
            </div>
            <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-3 text-xs text-slate-500 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce"></span>
              <span className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce [animation-delay:0.2s]"></span>
              <span className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce [animation-delay:0.4s]"></span>
              <span>Aura is optimizing...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {speechError && (
        <div className="px-4 py-1.5 bg-rose-50 border-t border-rose-200 text-rose-700 text-[11px]">
          {speechError}
        </div>
      )}

      {/* Input bar */}
      <form onSubmit={handleSend} className="p-3 border-t border-slate-100 bg-slate-50/50 flex items-center gap-2">
        <button
          type="button"
          onClick={toggleSpeechRecognition}
          title={isRecording ? 'Stop Voice Input' : 'Voice Dictation'}
          className={`p-2.5 rounded-xl border transition-all ${
            isRecording
              ? 'bg-rose-500 text-white border-rose-600 voice-recording-pulse'
              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
        </button>

        <input
          type="text"
          placeholder={isRecording ? 'Listening to your voice...' : 'Ask Aura to schedule, remind, or plan...'}
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          className="flex-1 px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 placeholder:text-slate-400"
        />

        <button
          type="submit"
          disabled={!inputText.trim() || isLoading}
          className="p-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white rounded-xl shadow-xs transition-colors"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
};
