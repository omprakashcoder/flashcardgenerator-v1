
import { FileText, BookOpen, Calculator, Code, FlaskConical, Globe, Music } from 'lucide-react';

export const APP_NAME = "FlashCard AI";

export const SAMPLE_PROMPTS = [
  "Upload a PDF of your history notes...",
  "Paste your biology lecture transcript...",
  "Upload a photo of your math formulas..."
];

export const CATEGORY_ICONS: Record<string, any> = {
  default: FileText,
  history: BookOpen,
  science: FlaskConical,
  math: Calculator,
  coding: Code,
  language: Globe,
  music: Music,
  philosophy: FileText
};

export const MOCK_USER_STREAK = 3;
