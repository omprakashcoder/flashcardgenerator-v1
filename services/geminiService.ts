
import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { Flashcard, GenerationOptions, MindMapData } from "../types";

const normalizeResponse = (parsed: any): { topic: string, cards: Omit<Flashcard, 'id' | 'status'>[] } => {
    let rawCards: any[] = [];
    let topic = "Untitled Set";

    if (Array.isArray(parsed)) {
      rawCards = parsed;
    } else if (typeof parsed === 'object' && parsed !== null) {
      topic = parsed.topic || parsed.title || "Study Set";
      rawCards = Array.isArray(parsed.cards) ? parsed.cards : (Array.isArray(parsed.flashcards) ? parsed.flashcards : []);
    }

    // Map short keys (q, a) back to full interface (question, answer)
    const cards = rawCards
      .map((c: any) => ({
        question: c.q || c.question || "",
        answer: c.a || c.answer || "",
        category: c.c || c.category || "General"
      }))
      .filter((c) => c.question && c.answer); // Filter out invalid cards
    
    return { topic, cards };
};

const parseGeminiResponse = (text: string): { topic: string, cards: Omit<Flashcard, 'id' | 'status'>[] } => {
  try {
    try {
        return normalizeResponse(JSON.parse(text));
    } catch {
        // ignore
    }

    let cleanText = text.replace(/```json\s*/g, '').replace(/```\s*$/g, '').trim();
    const firstBrace = cleanText.indexOf('{');
    const lastBrace = cleanText.lastIndexOf('}');

    if (firstBrace !== -1 && lastBrace !== -1) {
      const jsonCandidate = cleanText.substring(firstBrace, lastBrace + 1);
       try {
        return normalizeResponse(JSON.parse(jsonCandidate));
       } catch {
        // ignore
       }
    } 
    
    const firstBracket = cleanText.indexOf('[');
    const lastBracket = cleanText.lastIndexOf(']');
    if (firstBracket !== -1 && lastBracket !== -1) {
        const jsonCandidate = cleanText.substring(firstBracket, lastBracket + 1);
        try {
            return normalizeResponse(JSON.parse(jsonCandidate));
        } catch {
            // ignore
        }
    }

    throw new Error("Could not parse JSON from response");
  } catch (e) {
    console.error("Failed to parse Gemini response", e, text);
    throw new Error("Invalid response format from AI. The content might be too long or complex.");
  }
};

export interface FileInput {
  mimeType: string;
  data: string;
}

const getApiKey = (): string | undefined => {
  try {
    if (typeof process !== 'undefined' && process.env) {
      return process.env.API_KEY;
    }
  } catch (e) {
    // Ignore reference errors
  }
  return undefined;
};

// Retry helper for transient 500/network errors
const withRetry = async <T>(fn: () => Promise<T>, retries = 3, delay = 1000): Promise<T> => {
    let lastError: any;
    for (let i = 0; i < retries; i++) {
        try {
            return await fn();
        } catch (error: any) {
            lastError = error;
            const msg = error.message || '';
            // Retry on 5xx status or XHR/Network related errors
            const isRetryable = msg.includes('500') || 
                                msg.toLowerCase().includes('xhr') || 
                                msg.toLowerCase().includes('fetch') || 
                                msg.toLowerCase().includes('network') ||
                                error.status >= 500 || 
                                error.status === 429;
            
            if (!isRetryable) throw error;
            
            console.warn(`Gemini API Attempt ${i + 1} failed. Retrying in ${delay}ms...`, error);
            await new Promise(res => setTimeout(res, delay));
            delay *= 2; // Exponential backoff
        }
    }
    throw lastError;
};

export const generateFlashcards = async (
  content: string, 
  files: FileInput[] = [],
  options: GenerationOptions
): Promise<{ topic: string, cards: Omit<Flashcard, 'id' | 'status'>[] }> => {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error("API Key is missing. Environment variable process.env.API_KEY is not set.");
  }

  const ai = new GoogleGenAI({ apiKey });

  const prompt = `
    Analyze the provided content and generate flashcards.
    
    Configuration:
    - Quantity: Exactly ${options.cardCount} cards.
    - Difficulty: ${options.difficulty} (Adjust complexity of questions).
    - Answer Detail: ${options.answerLength} (short = 1 sentence, medium = 2-3 sentences, long = short paragraph).
    
    Return ONLY a JSON object.
    
    Structure: 
    {
      "topic": "Topic Title",
      "cards": [
        { "q": "Question", "a": "Answer" }
      ]
    }
    
    Guidelines:
    - Limit to the most important concepts for speed.
    - Use strict JSON format.
  `;

  const parts: any[] = [{ text: prompt }];

  files.forEach(file => {
    parts.push({
      inlineData: {
        mimeType: file.mimeType,
        data: file.data
      }
    });
  });

  if (content.trim()) {
    parts.push({ text: `\n\nMaterial:\n${content}` });
  }

  try {
    const response = await withRetry<GenerateContentResponse>(() => ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: { parts },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            topic: { type: Type.STRING },
            cards: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  q: { type: Type.STRING },
                  a: { type: Type.STRING },
                },
                required: ["q", "a"]
              }
            }
          },
          required: ["topic", "cards"]
        }
      }
    }));

    if (response.text) {
      return parseGeminiResponse(response.text);
    }
    throw new Error("No response generated from Gemini.");
  } catch (error) {
    console.error("Gemini generation error:", error);
    throw error;
  }
};

export const generateSummary = async (cards: Flashcard[]): Promise<string> => {
  const apiKey = getApiKey();
  if (!apiKey) {
    return "Error: API Key is missing.";
  }

  const ai = new GoogleGenAI({ apiKey });
  const cardContent = cards.map(c => `Q: ${c.question}\nA: ${c.answer}`).join('\n\n');
  const prompt = `Based on these flashcards, write a concise, bulleted summary of the topic. Use Markdown.\n\n${cardContent}`;

  try {
    const response = await withRetry<GenerateContentResponse>(() => ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: { parts: [{ text: prompt }] },
    }));
    return response.text || "Unable to generate summary.";
  } catch (error) {
    console.error("Summary generation error:", error);
    return "Error generating summary.";
  }
};

export const generateMindMap = async (cards: Flashcard[]): Promise<MindMapData | null> => {
  const apiKey = getApiKey();
  if (!apiKey) {
    console.error("Error: API Key is missing.");
    return null;
  }

  const ai = new GoogleGenAI({ apiKey });
  const cardContent = cards.map(c => `Concept: ${c.question}\nDetail: ${c.answer}`).join('\n');

  const prompt = `
    Create a knowledge graph (mind map) from these concepts.
    
    Requirements:
    1. Identify the Main Topic.
    2. Identify 3-5 Subconcepts.
    3. Link details to Subconcepts.
    
    Return STRICT JSON. No markdown formatting, just the raw JSON string.
    
    Structure:
    {
      "nodes": [
        {"id": "Main Topic", "group": 1, "label": "Main Topic"},
        {"id": "Subconcept", "group": 2, "label": "Subconcept"}
      ],
      "links": [
        {"source": "Main Topic", "target": "Subconcept", "value": 1}
      ]
    }
    
    Content to analyze:
    ${cardContent}
  `;

  try {
    const response = await withRetry<GenerateContentResponse>(() => ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: { parts: [{ text: prompt }] },
      config: {
        responseMimeType: "application/json"
      }
    }));

    if (!response.text) return null;

    try {
        return JSON.parse(response.text);
    } catch {
        // Fallback for messy cleanup if the model adds markdown despite instructions
        const cleanText = response.text.replace(/```json\s*/g, '').replace(/```\s*$/g, '').trim();
        return JSON.parse(cleanText);
    }
  } catch (error) {
    console.error("Mind map generation error:", error);
    return null;
  }
};