export type Difficulty = 'easy' | 'normal' | 'hard';
export type Language = 'en' | 'zh';

export const PASS_THRESHOLDS: Record<Difficulty, number> = {
  easy: 60,
  normal: 75,
  hard: 85,
};

export interface ScoreResult {
  score: number;
  comment: string;
  passed: boolean;
}

export interface GeneratePromptResponse {
  prompt: string;
  token: string;
}

export interface ScoreRequest {
  imageBase64: string;
  promptToken: string;
  difficulty: Difficulty;
  language: Language;
}

export interface PastWork {
  id: string;
  prompt: string;
  imageBase64: string;
  score: number;
  level: number;
  difficulty: Difficulty;
  timestamp: number;
}
