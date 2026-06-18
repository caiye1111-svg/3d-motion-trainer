'use client';

import { create } from 'zustand';
import { TrainingSceneConfig, SymptomCheckpoint } from '@/types';

interface TrainingState {
  // Session state
  isActive: boolean;
  isPaused: boolean;
  comfortMode: boolean;
  elapsedSeconds: number;
  config: TrainingSceneConfig | null;

  // Scoring
  preScore: number | null;
  currentScore: number | null;
  peakScore: number;
  checkpoints: SymptomCheckpoint[];
  severeSymptoms: string[];

  // Actions
  startSession: (config: TrainingSceneConfig, preScore: number) => void;
  pauseSession: () => void;
  resumeSession: () => void;
  endSession: (reason?: string) => void;
  tick: () => void;
  setScore: (score: number, tags?: string[]) => void;
  enableComfortMode: () => void;
  disableComfortMode: () => void;
  setElapsed: (seconds: number) => void;
  reset: () => void;
}

export const useTrainingStore = create<TrainingState>((set, get) => ({
  isActive: false,
  isPaused: false,
  comfortMode: false,
  elapsedSeconds: 0,
  config: null,
  preScore: null,
  currentScore: null,
  peakScore: 0,
  checkpoints: [],
  severeSymptoms: [],

  startSession: (config, preScore) => set({
    isActive: true,
    isPaused: false,
    comfortMode: false,
    elapsedSeconds: 0,
    config,
    preScore,
    currentScore: preScore,
    peakScore: preScore,
    checkpoints: [],
    severeSymptoms: [],
  }),

  pauseSession: () => set({ isPaused: true }),

  resumeSession: () => set({ isPaused: false }),

  endSession: () => set({ isActive: false, isPaused: false }),

  tick: () => set(state => ({
    elapsedSeconds: state.elapsedSeconds + 1,
  })),

  setScore: (score, tags = []) => {
    const state = get();
    const newPeak = Math.max(state.peakScore, score);
    const checkpoint: SymptomCheckpoint = {
      id: crypto.randomUUID(),
      session_id: '',
      timestamp_seconds: state.elapsedSeconds,
      score,
      symptom_tags: tags,
    };

    const severeTags = ['nausea', 'vomiting', 'vertigo', 'tinnitus'];
    const newSevere = tags.some(t => severeTags.includes(t))
      ? [...state.severeSymptoms, ...tags]
      : state.severeSymptoms;

    set({
      currentScore: score,
      peakScore: newPeak,
      checkpoints: [...state.checkpoints, checkpoint],
      severeSymptoms: newSevere,
    });
  },

  enableComfortMode: () => set({
    comfortMode: true,
    isPaused: true,
  }),

  disableComfortMode: () => set({
    comfortMode: false,
    isPaused: false,
  }),

  setElapsed: (seconds) => set({ elapsedSeconds: seconds }),

  reset: () => set({
    isActive: false,
    isPaused: false,
    comfortMode: false,
    elapsedSeconds: 0,
    config: null,
    preScore: null,
    currentScore: null,
    peakScore: 0,
    checkpoints: [],
    severeSymptoms: [],
  }),
}));
