"use client";

import { create } from "zustand";
import type { Question, SessionMode, UserAnswer } from "@/types";

interface ExamStore {
  sessionId: string | null;
  mode: SessionMode | null;
  currentQuestion: Question | null;
  questionIndex: number;
  totalQuestions: number;
  answers: UserAnswer[];
  theta: number;
  se: number;
  elapsedSec: number;
  isFinished: boolean;
  isLoading: boolean;

  setSession: (sessionId: string, mode: SessionMode) => void;
  setQuestion: (q: Question, index: number) => void;
  addAnswer: (a: UserAnswer) => void;
  setTheta: (theta: number, se: number) => void;
  tickTimer: () => void;
  finish: () => void;
  reset: () => void;
}

export const useExamStore = create<ExamStore>((set) => ({
  sessionId: null,
  mode: null,
  currentQuestion: null,
  questionIndex: 0,
  totalQuestions: 0,
  answers: [],
  theta: 0,
  se: 1,
  elapsedSec: 0,
  isFinished: false,
  isLoading: false,

  setSession: (sessionId, mode) => set({ sessionId, mode }),
  setQuestion: (currentQuestion, questionIndex) => set({ currentQuestion, questionIndex }),
  addAnswer: (a) => set((s) => ({ answers: [...s.answers, a] })),
  setTheta: (theta, se) => set({ theta, se }),
  tickTimer: () => set((s) => ({ elapsedSec: s.elapsedSec + 1 })),
  finish: () => set({ isFinished: true }),
  reset: () =>
    set({
      sessionId: null, mode: null, currentQuestion: null, questionIndex: 0,
      totalQuestions: 0, answers: [], theta: 0, se: 1, elapsedSec: 0,
      isFinished: false, isLoading: false,
    }),
}));
