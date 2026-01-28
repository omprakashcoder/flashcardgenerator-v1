
export interface Flashcard {
  id: string;
  question: string;
  answer: string;
  category?: string;
  status: 'new' | 'learning' | 'mastered';
}

export interface MindMapData {
  nodes: { id: string; group: number; label: string }[];
  links: { source: string; target: string; value: number }[];
}

export interface CardSet {
  id: string;
  title: string;
  createdAt: number;
  cards: Flashcard[];
  masteryPercentage: number;
  icon?: string;
  description?: string;
  summary?: string;
  mindMap?: MindMapData | null; 
  difficulty?: string;
}

export interface User {
  id: string;
  name: string;
  email?: string;
  isPremium: boolean;
  streak: number;
  lastStudyDate?: number;
  stats: {
    flashcardsGenerated: number;
    summariesGenerated: number;
    mindmapsGenerated: number;
    totalScore: number;
  };
  preferences?: {
    darkMode: boolean;
    // Legacy support (can be migrated or ignored)
    cardBackgrounds?: string[]; 
    
    // New Preference Structure
    cardBackgroundsFront: string[];
    cardBackgroundsBack: string[];
    randomizeFront: boolean;
    randomizeBack: boolean;
    selectedFrontIndex: number;
    selectedBackIndex: number;
  };
}

export type AppView = 'landing' | 'library' | 'study' | 'premium' | 'auth' | 'profile' | 'pricing' | 'review';
export type StudyModeType = 'flashcards' | 'quiz' | 'exam';

export interface GenerationOptions {
  difficulty: 'easy' | 'medium' | 'hard';
  cardCount: 10 | 15 | 20;
  answerLength: 'short' | 'medium' | 'long';
}

export enum GenerationStatus {
  IDLE = 'idle',
  PROCESSING = 'processing',
  COMPLETE = 'complete',
  ERROR = 'error'
}