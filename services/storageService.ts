import { CardSet, User, StudyModeType } from "../types";

const STORAGE_KEY_PREFIX = 'flashcard_ai_sets_';
const USER_KEY = 'flashcard_ai_user';
const SESSION_KEY_PREFIX = 'flashcard_ai_session_';

// Helper to get the correct storage key based on user ID
const getStorageKey = (userId?: string) => {
    return userId ? `${STORAGE_KEY_PREFIX}${userId}` : 'flashcard_ai_sets_guest';
};

export const getSets = (userId?: string): CardSet[] => {
  const key = getStorageKey(userId);
  const data = localStorage.getItem(key);
  if (!data) return [];
  
  try {
    const parsed = JSON.parse(data);
    if (!Array.isArray(parsed)) return [];
    
    return parsed.map((set: any) => ({
        ...set,
        cards: Array.isArray(set.cards) ? set.cards : []
    }));
  } catch (e) {
    console.error("Failed to load sets", e);
    return [];
  }
};

export const saveSet = (set: CardSet, userId?: string): void => {
  const sets = getSets(userId);
  const existingIndex = sets.findIndex(s => s.id === set.id);
  
  if (existingIndex >= 0) {
    sets[existingIndex] = set;
  } else {
    sets.unshift(set);
  }
  
  localStorage.setItem(getStorageKey(userId), JSON.stringify(sets));
};

export const deleteSet = (setId: string, userId?: string): void => {
  const sets = getSets(userId).filter(s => s.id !== setId);
  localStorage.setItem(getStorageKey(userId), JSON.stringify(sets));
};

export const updateSetMastery = (setId: string, masteryPercentage: number, userId?: string): void => {
  const sets = getSets(userId);
  const setIndex = sets.findIndex(s => s.id === setId);
  if (setIndex >= 0) {
    sets[setIndex].masteryPercentage = masteryPercentage;
    localStorage.setItem(getStorageKey(userId), JSON.stringify(sets));
  }
};

/**
 * Moves any sets found in the 'guest' storage to the 'user' storage.
 * Should be called upon successful login.
 */
export const migrateGuestData = (userId: string): void => {
    const guestSets = getSets(); // Get guest sets (no userId provided)
    if (guestSets.length === 0) return;

    const userSets = getSets(userId);
    
    // Create a set of existing IDs to prevent duplicates if any weirdness occurs
    const existingIds = new Set(userSets.map(s => s.id));
    
    const newSetsToMigrate = guestSets.filter(s => !existingIds.has(s.id));
    
    if (newSetsToMigrate.length > 0) {
        const mergedSets = [...newSetsToMigrate, ...userSets];
        localStorage.setItem(getStorageKey(userId), JSON.stringify(mergedSets));
    }
    
    // Clear guest storage after migration
    localStorage.removeItem(getStorageKey());
};

// User & Streak Management
export const getUser = (): User | null => {
  const data = localStorage.getItem(USER_KEY);
  return data ? JSON.parse(data) : null;
};

export const saveUser = (user: User): void => {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
};

export const updateUserStreak = (): User | null => {
  const user = getUser();
  if (!user) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const lastStudy = user.lastStudyDate ? new Date(user.lastStudyDate) : null;
  if (lastStudy) lastStudy.setHours(0, 0, 0, 0);

  let newStreak = user.streak;
  
  if (!lastStudy) {
    newStreak = 1;
  } else if (today.getTime() === lastStudy.getTime()) {
    // Already studied today, keep streak
    return user;
  } else if (today.getTime() - lastStudy.getTime() === 86400000) {
    // Consecutive day
    newStreak += 1;
  } else {
    // Missed a day or more
    newStreak = 1;
  }

  const updatedUser: User = {
    ...user,
    streak: newStreak,
    lastStudyDate: Date.now()
  };
  
  saveUser(updatedUser);
  return updatedUser;
};

// Session Progress Management
export interface SessionProgress {
  setId: string;
  currentIndex: number;
  isFlipped: boolean;
  mode: StudyModeType;
  shuffledCardIds?: string[];
  timestamp: number;
}

const getSessionKey = (setId: string, userId?: string) => {
    return `${SESSION_KEY_PREFIX}${userId || 'guest'}_${setId}`;
};

export const saveSessionProgress = (setId: string, progress: Omit<SessionProgress, 'setId' | 'timestamp'>, userId?: string) => {
  const key = getSessionKey(setId, userId);
  const sessionData: SessionProgress = {
    setId,
    timestamp: Date.now(),
    ...progress
  };
  localStorage.setItem(key, JSON.stringify(sessionData));
};

export const getSessionProgress = (setId: string, userId?: string): SessionProgress | null => {
  const key = getSessionKey(setId, userId);
  const data = localStorage.getItem(key);
  if (!data) return null;
  try {
    return JSON.parse(data);
  } catch {
    return null;
  }
};

export const clearSessionProgress = (setId: string, userId?: string) => {
   const key = getSessionKey(setId, userId);
   localStorage.removeItem(key);
};