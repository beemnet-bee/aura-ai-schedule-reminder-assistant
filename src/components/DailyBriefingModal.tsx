/**
 * @file DailyBriefingModal.tsx
 * @description Executive morning briefing modal delivering an AI-generated schedule overview,
 * focus score gauge, critical priorities, productivity recommendations, and synthesized TTS audio playback.
 * Built with a responsive scrollable body and pinned header and footer.
 */

import React, { useState, useEffect } from 'react';
import { DailyBriefingData } from '../types/assistant';
import { X, Sparkles, Volume2, VolumeX, CheckCircle, Clock, Battery, AlertCircle, Quote } from 'lucide-react';
import { playBase64Audio } from '../utils/audio';

interface DailyBriefingModalProps {
  /** Whether the modal is actively visible */
  isOpen: boolean;
  /** Callback to close dialog */
  onClose: () => void;
  /** Briefing data object returned from the server */
  briefing: DailyBriefingData | null;
  /** Whether the briefing generation request is currently pending */
  isLoading: boolean;
  /** Callback to re-trigger generation with updated events */
  onRegenerate: () => void;
  /** Active target date string */
  selectedDate: string;
}

export const DailyBriefingModal: React.FC<DailyBriefingModalProps> = ({
  isOpen,
  onClose,
  briefing,
  isLoading,
  onRegenerate,
  selectedDate,
}) => {
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [audioLoading, setAudioLoading] = useState(false);
  const [currentAudio, setCurrentAudio] = useState<HTMLAudioElement | null>(null);

  // Stop audio on unmount or close
  useEffect(() => {
    if (!isOpen && currentAudio) {
      currentAudio.pause();
      setIsPlayingAudio(false);
    }
  }, [isOpen, currentAudio]);

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

  const handlePlayVoice = async () => {
    if (isPlayingAudio && currentAudio) {
      currentAudio.pause();
      setIsPlayingAudio(false);
      return;
    }

    if (!briefing) return;

    setAudioLoading(true);
    try {
      const textToSpeak = `${briefing.greeting}. ${briefing.summary} Today's top priorities are: ${briefing.keyPriorities.join(', ')}. Productivity tip: ${briefing.productivityTip}`;

      const res = await fetch('/api/assistant/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: textToSpeak, voice: 'Kore' }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.audioBase64) {
          const audio = playBase64Audio(data.audioBase64, () => {
            setIsPlayingAudio(false);
          });
          setCurrentAudio(audio);
          setIsPlayingAudio(true);
          setAudioLoading(false);
          return;
        }
      }

      // Graceful fallback to browser SpeechSynthesis if backend audio is unconfigured
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(textToSpeak);
        utterance.rate = 1.0;
        utterance.pitch = 1.0;
        utterance.onend = () => setIsPlayingAudio(false);
        utterance.onerror = () => setIsPlayingAudio(false);
        window.speechSynthesis.speak(utterance);
        setIsPlayingAudio(true);
      }
    } catch (err) {
      console.warn('Speech playback fallback:', err);
    } finally {
      setAudioLoading(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return { text: 'text-emerald-600', bg: 'bg-emerald-500', label: 'Balanced & Optimal' };
    if (score >= 60) return { text: 'text-amber-600', bg: 'bg-amber-500', label: 'Moderate Load' };
    return { text: 'text-rose-600', bg: 'bg-rose-500', label: 'Heavy / Overbooked' };
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="briefing-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/50 backdrop-blur-xs overflow-y-auto"
    >
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150 max-h-[92vh] sm:max-h-[88vh] flex flex-col my-auto">
        {/* Sticky Header */}
        <div className="shrink-0 flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-linear-to-r from-indigo-50/80 to-purple-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 id="briefing-modal-title" className="font-bold text-slate-900 text-base">
                Executive Daily Briefing
              </h2>
              <p className="text-xs text-slate-500">{selectedDate}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePlayVoice}
              disabled={isLoading || audioLoading}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                isPlayingAudio
                  ? 'bg-rose-50 text-rose-600 border-rose-200'
                  : 'bg-white text-indigo-600 border-indigo-200 hover:bg-indigo-50'
              }`}
            >
              {audioLoading ? (
                <span className="w-3.5 h-3.5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></span>
              ) : isPlayingAudio ? (
                <VolumeX className="w-3.5 h-3.5" />
              ) : (
                <Volume2 className="w-3.5 h-3.5" />
              )}
              <span>{isPlayingAudio ? 'Stop Audio' : audioLoading ? 'Generating...' : 'Listen Briefing'}</span>
            </button>

            <button
              onClick={onClose}
              aria-label="Close dialog"
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {isLoading ? (
            <div className="py-16 text-center space-y-3">
              <div className="w-10 h-10 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
              <p className="text-sm font-semibold text-slate-700">Aura is synthesizing your daily outlook...</p>
              <p className="text-xs text-slate-400">Analyzing calendar commitments, conflicts, and focus blocks</p>
            </div>
          ) : briefing ? (
            <>
              {/* Greeting & Summary */}
              <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4.5">
                <h3 className="text-lg font-bold text-slate-900 mb-1">{briefing.greeting}</h3>
                <p className="text-sm text-slate-700 leading-relaxed">{briefing.summary}</p>
              </div>

              {/* Metrics Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Focus Score */}
                <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs">
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-500 mb-2">
                    <span className="flex items-center gap-1">
                      <Battery className="w-3.5 h-3.5 text-indigo-500" /> Focus Score
                    </span>
                    <span className={`text-[11px] font-bold ${getScoreColor(briefing.focusScore).text}`}>
                      {getScoreColor(briefing.focusScore).label}
                    </span>
                  </div>
                  <div className="flex items-baseline gap-1 mb-2">
                    <span className="text-2xl font-black text-slate-900">{briefing.focusScore}</span>
                    <span className="text-xs text-slate-400 font-semibold">/100</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${getScoreColor(briefing.focusScore).bg}`}
                      style={{ width: `${Math.min(100, briefing.focusScore)}%` }}
                    />
                  </div>
                </div>

                {/* Scheduled Load */}
                <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs">
                  <div className="flex items-center gap-1 text-xs font-semibold text-slate-500 mb-2">
                    <Clock className="w-3.5 h-3.5 text-purple-500" /> Scheduled Hours
                  </div>
                  <div className="text-2xl font-black text-slate-900 mb-1">
                    {briefing.totalScheduledHours}h
                  </div>
                  <p className="text-[11px] text-slate-400">Total duration across meetings & tasks</p>
                </div>

                {/* Free Time Buffer */}
                <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs">
                  <div className="flex items-center gap-1 text-xs font-semibold text-slate-500 mb-2">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-500" /> Free Buffer
                  </div>
                  <div className="text-2xl font-black text-slate-900 mb-1">
                    {briefing.freeHours}h
                  </div>
                  <p className="text-[11px] text-slate-400">Available time window for deep focus</p>
                </div>
              </div>

              {/* Key Priorities Checklist */}
              {briefing.keyPriorities && briefing.keyPriorities.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                    Key Objectives for Today
                  </h4>
                  <div className="space-y-2">
                    {briefing.keyPriorities.map((item, idx) => (
                      <div
                        key={idx}
                        className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-800"
                      >
                        <span className="w-5 h-5 rounded-lg bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center shrink-0 text-[11px]">
                          {idx + 1}
                        </span>
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Productivity Tip */}
              {briefing.productivityTip && (
                <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200/80">
                  <div className="text-xs font-bold text-amber-900 flex items-center gap-1.5 mb-1">
                    <Sparkles className="w-3.5 h-3.5 text-amber-600" /> Aura's Strategic Tip
                  </div>
                  <p className="text-xs text-amber-950 font-medium leading-relaxed">
                    {briefing.productivityTip}
                  </p>
                </div>
              )}

              {/* Quote */}
              {briefing.quote && (
                <div className="flex items-start gap-2 text-xs italic text-slate-500 pt-2 border-t border-slate-100">
                  <Quote className="w-4 h-4 text-slate-300 shrink-0 mt-0.5" />
                  <span>"{briefing.quote}"</span>
                </div>
              )}
            </>
          ) : (
            <div className="py-12 text-center text-slate-400">
              <p>No briefing generated yet.</p>
            </div>
          )}
        </div>

        {/* Sticky Action Footer */}
        <div className="shrink-0 p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
          <button
            onClick={onRegenerate}
            disabled={isLoading}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 rounded-xl transition-colors"
          >
            Refresh Briefing
          </button>
          <button
            onClick={onClose}
            className="px-5 py-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-xs transition-colors"
          >
            Ready for the Day
          </button>
        </div>
      </div>
    </div>
  );
};
