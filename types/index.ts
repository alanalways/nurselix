// ===== Enums =====
export type Role = "STUDENT" | "MODERATOR" | "ADMIN";
export type Plan = "FREE" | "BASIC" | "PRO" | "ELITE";
export type Module = "NCLEX" | "TOEIC" | "IELTS";
export type QuestionType = "MCQ" | "SATA" | "ORDERED" | "MATRIX" | "BOWTIE" | "DROPDOWN" | "HIGHLIGHT";
export type Difficulty = "EASY" | "MEDIUM" | "HARD";
export type QuestionStatus = "DRAFT" | "APPROVED" | "ARCHIVED";
export type SessionMode = "CAT" | "PRACTICE" | "TUTOR" | "MOCK" | "REVIEW" | "ASSESSMENT" | "MINI_CAT" | "ERROR_CHALLENGE";

// ===== User =====
export interface User {
  id: string;
  email: string;
  name?: string;          // display name (NextAuth compatible, was displayName)
  image?: string;         // avatar URL  (NextAuth compatible, was avatarUrl)
  emailVerified?: string; // ISO date string
  role: Role;
  plan: Plan;
  examDate?: string;
  trialUsed: boolean;
  trialEndsAt?: string;
  createdAt: string;
}

export interface UserSettings {
  userId: string;
  dailyGoal: number;
  notification: boolean;
  theme: "dark" | "light";
  fontSize: "small" | "medium" | "large";
}

// ===== Question =====
export interface Question {
  id: string;
  module: Module;
  questionType: QuestionType;
  stem: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctAnswer: string;
  explanationZh: string;
  explanationEn?: string;
  usTwDifference?: string;
  domain?: string;
  subDomain?: string;
  tags: string[];
  irtA?: number;
  irtB?: number;
  irtC?: number;
  difficulty: Difficulty;
  attemptCount: number;
  correctCount: number;
  errorRate: number;
  status: QuestionStatus;
  createdAt: string;
}

// ===== Session =====
export interface UserSession {
  id: string;
  userId: string;
  module: Module;
  mode: SessionMode;
  isAssessment: boolean;
  theta: number;
  se: number;
  questionIds: string[];
  totalQuestions: number;
  correctCount: number;
  score?: number;
  passFail?: string;
  totalTimeSec: number;
  isPaused: boolean;
  startedAt: string;
  endedAt?: string;
}

export interface UserAnswer {
  id: string;
  sessionId: string;
  userId: string;
  questionId: string;
  selectedAnswer?: string;
  isCorrect?: boolean;
  timeSpentSec?: number;
  thetaBefore?: number;
  thetaAfter?: number;
  answeredAt: string;
}

// ===== Stats =====
export interface UserDailyStats {
  id: string;
  userId: string;
  statDate: string;
  questionsDone: number;
  correctCount: number;
  timeSpentMin: number;
  sessionsCount: number;
  domainStats: Record<string, { done: number; correct: number }>;
  streakDay: number;
}

// ===== Achievement =====
export interface Achievement {
  id: string;
  key: string;
  name: string;
  description: string;
  icon: string;
}

export interface UserAchievement {
  id: string;
  userId: string;
  achievementId: string;
  earnedAt: string;
  achievement: Achievement;
}

// ===== Exam Store =====
export interface ExamState {
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
}

// ===== API Responses =====
export interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}

// ===== Pricing =====
export interface PricingPlan {
  key: Plan;
  nameZh: string;
  monthlyPrice: number;
  quarterlyMonthlyPrice: number;
  yearlyMonthlyPrice: number;
  quarterlyTotal: number;
  yearlyTotal: number;
  features: string[];
  highlight?: boolean;
}
