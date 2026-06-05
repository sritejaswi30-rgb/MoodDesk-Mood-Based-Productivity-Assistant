export type MoodState = 'Happy' | 'Sad' | 'Stressed' | 'Neutral' | 'Motivated';

export interface MoodAnalysis {
  mood: MoodState;
  confidence: number;
  scores: Record<MoodState, number>;
  wordMatches: { word: string; mood: MoodState; multiplier: number }[];
  explanation: string;
}

export type WorkflowMode = 'Focus' | 'Recovery' | 'Planning';

export interface Task {
  id: string;
  text: string;
  type: 'system' | 'custom';
  completed: boolean;
  moodCategory: MoodState;
  createdAt: string;
}

export interface MoodLog {
  id: string;
  timestamp: string;
  text: string;
  mood: MoodState;
  confidence: number;
  mode: WorkflowMode;
}

export interface StreakData {
  currentStreak: number;
  bestStreak: number;
  lastLoggedDate: string | null;
}
