
import React, { useState, useEffect, useMemo } from 'react';
import confetti from 'canvas-confetti';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import { ArrowLeft, Check, X, RotateCcw, Trophy, X as CloseIcon, Network, ChevronLeft, ChevronRight, FileText, Timer, Maximize2, Loader2, AlertCircle } from 'lucide-react';
import { CardSet, Flashcard, StudyModeType, MindMapData } from '../types';
import { FlipCard } from './FlipCard';
import { Button } from './Button';
import { updateSetMastery, saveSet, getUser, saveSessionProgress, getSessionProgress, clearSessionProgress } from '../services/storageService';
import { generateSummary, generateMindMap } from '../services/geminiService';
import { MindMap } from './MindMap';

interface StudyModeProps {
  set: CardSet;
  onExit: () => void;
  onUpdateSet: (updatedSet: CardSet) => void;
  onSessionComplete: () => void;
  initialFeature?: 'none' | 'summary' | 'mindmap';
}

export const StudyMode: React.FC<StudyModeProps> = ({ set, onExit, onUpdateSet, onSessionComplete, initialFeature = 'none' }) => {
  const [mode, setMode] = useState<StudyModeType>('flashcards');
  
  // Flashcard State
  const [studyCards, setStudyCards] = useState<Flashcard[]>(() => [...set.cards]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [sessionScore, setSessionScore] = useState(0);
  const [isFinished, setIsFinished] = useState(false);
  
  // State loading flag to prevent overwriting saved data on initial render
  const [isLoaded, setIsLoaded] = useState(false);

  // Background Images State
  const [backgrounds, setBackgrounds] = useState<{
      front: string[], back: string[], randFront: boolean, randBack: boolean, selFront: number, selBack: number
  }>({ front: [], back: [], randFront: false, randBack: false, selFront: 0, selBack: 0 });
  
  // Exam/Quiz State
  const [examTimer, setExamTimer] = useState(0); // seconds
  const [quizSelection, setQuizSelection] = useState<string | null>(null);
  
  // Simulated Background Generation State
  const [isPreparingQuiz, setIsPreparingQuiz] = useState(true);
  const [showPrepMessage, setShowPrepMessage] = useState(false);

  // Modal State
  const [modalType, setModalType] = useState<'none' | 'summary' | 'mindmap'>('none');
  const [summaryContent, setSummaryContent] = useState("");
  const [mindMapContent, setMindMapContent] = useState<MindMapData | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    // Load backgrounds if available
    const user = getUser();
    if (user?.preferences) {
        setBackgrounds({
            front: user.preferences.cardBackgroundsFront || user.preferences.cardBackgrounds || [], // Fallback to legacy
            back: user.preferences.cardBackgroundsBack || [],
            randFront: user.preferences.randomizeFront ?? true,
            randBack: user.preferences.randomizeBack ?? true,
            selFront: user.preferences.selectedFrontIndex || 0,
            selBack: user.preferences.selectedBackIndex || 0
        });
    }

    // Load saved session progress
    const savedSession = getSessionProgress(set.id, user?.id);
    if (savedSession) {
        setMode(savedSession.mode);
        setCurrentIndex(savedSession.currentIndex);
        setIsFlipped(savedSession.isFlipped);
        
        // Restore shuffled order if it exists
        if (savedSession.shuffledCardIds && savedSession.shuffledCardIds.length > 0) {
            const cardMap = new Map(set.cards.map(c => [c.id, c]));
            const orderedCards = savedSession.shuffledCardIds
                .map(id => cardMap.get(id))
                .filter(c => c !== undefined) as Flashcard[];
            
            if (orderedCards.length > 0) {
                setStudyCards(orderedCards);
                // Adjust index if out of bounds (e.g. cards deleted)
                if (savedSession.currentIndex >= orderedCards.length) {
                    setCurrentIndex(0);
                }
            }
        }
    }
    setIsLoaded(true);

    // Simulate background generation for Quiz/Test
    const prepTimer = setTimeout(() => {
        setIsPreparingQuiz(false);
    }, 2000);

    return () => clearTimeout(prepTimer);
  }, [set.id]);

  // Save session progress on change
  useEffect(() => {
      if (!isLoaded) return;
      const user = getUser();
      
      if (!isFinished) {
          saveSessionProgress(set.id, {
              currentIndex,
              isFlipped,
              mode,
              shuffledCardIds: studyCards.map(c => c.id)
          }, user?.id);
      } else {
          clearSessionProgress(set.id, user?.id);
      }
  }, [currentIndex, isFlipped, mode, studyCards, isFinished, isLoaded, set.id]);

  // Open initial feature if requested
  useEffect(() => {
    if (initialFeature === 'summary' || initialFeature === 'mindmap') {
        openFeature(initialFeature);
    }
  }, [initialFeature]);

  useEffect(() => {
    if (showPrepMessage) {
        const t = setTimeout(() => setShowPrepMessage(false), 3000);
        return () => clearTimeout(t);
    }
  }, [showPrepMessage]);

  // Modified: Preserve progress when switching modes
  const changeMode = (newMode: StudyModeType) => {
    if ((newMode === 'quiz' || newMode === 'exam') && isPreparingQuiz) {
        setShowPrepMessage(true);
        return;
    }
    setMode(newMode);
    setIsFlipped(false);
    // We DO NOT reset currentIndex here to preserve progress
    if (newMode === 'exam' && examTimer === 0) {
         setExamTimer(0); // Only reset timer if starting fresh
    }
  };

  const currentCard = studyCards[currentIndex];
  const progress = studyCards.length > 0 ? ((currentIndex) / studyCards.length) * 100 : 0;

  // Determine backgrounds
  const images = useMemo(() => {
      let front: string | undefined = undefined;
      let back: string | undefined = undefined;

      // Front Logic
      if (backgrounds.front.length > 0) {
          if (backgrounds.randFront) {
              const charCodeSum = currentCard.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
              front = backgrounds.front[charCodeSum % backgrounds.front.length];
          } else {
              front = backgrounds.front[backgrounds.selFront] || backgrounds.front[0];
          }
      }

      // Back Logic
      if (backgrounds.back.length > 0) {
          if (backgrounds.randBack) {
              const charCodeSum = currentCard.answer.length + currentIndex;
              back = backgrounds.back[charCodeSum % backgrounds.back.length];
          } else {
               back = backgrounds.back[backgrounds.selBack] || backgrounds.back[0];
          }
      }

      return { front, back };
  }, [currentCard, backgrounds, currentIndex]);

  // Generate Distractors for Quiz Mode
  const distractors = useMemo(() => {
    if (!currentCard) return [];
    if (mode !== 'quiz' && mode !== 'exam') return [];
    const otherAnswers = set.cards
        .filter(c => c.id !== currentCard.id)
        .map(c => c.answer)
        .sort(() => 0.5 - Math.random())
        .slice(0, 3);
    
    // Ensure unique options
    const options = new Set([...otherAnswers, currentCard.answer]);
    return Array.from(options).sort(() => 0.5 - Math.random());
  }, [currentCard, mode, set.cards]);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (mode === 'exam' && !isFinished) {
      interval = setInterval(() => setExamTimer(t => t + 1), 1000);
    }
    return () => clearInterval(interval);
  }, [mode, isFinished]);

  useEffect(() => {
    if (isFinished) {
      const percentage = studyCards.length > 0 ? Math.round((sessionScore / studyCards.length) * 100) : 0;
      if (percentage > 70) {
        confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
      }
      
      // Update mastery and user streak logic
      if (mode !== 'exam') { 
        updateSetMastery(set.id, percentage);
        onUpdateSet({ ...set, masteryPercentage: percentage });
        onSessionComplete();
      } else {
        if (percentage > 50) onSessionComplete();
      }
      
      // Clear progress when finished
      clearSessionProgress(set.id, getUser()?.id);
    }
  }, [isFinished, sessionScore, studyCards.length, mode, set, onUpdateSet, onSessionComplete]);

  const handleResponse = (known: boolean) => {
    if (known) setSessionScore(s => s + 1);
    setIsFlipped(false);
    nextCard();
  };

  const handleQuizAnswer = (answer: string) => {
    if (!currentCard) return;
    setQuizSelection(answer);
    const correct = answer === currentCard.answer;
    
    setTimeout(() => {
        if (correct) setSessionScore(s => s + 1);
        setQuizSelection(null);
        nextCard();
    }, 1000); // Delay to show result
  };

  const nextCard = () => {
    if (currentIndex < studyCards.length - 1) {
      setTimeout(() => setCurrentIndex(c => c + 1), 200);
    } else {
      setIsFinished(true);
    }
  };

  const handleNav = (direction: 'prev' | 'next') => {
    setIsFlipped(false);
    if (direction === 'next' && currentIndex < studyCards.length - 1) {
      setCurrentIndex(c => c + 1);
    } else if (direction === 'prev' && currentIndex > 0) {
      setCurrentIndex(c => c - 1);
    }
  };

  const restart = () => {
    setCurrentIndex(0);
    setIsFlipped(false);
    setSessionScore(0);
    setIsFinished(false);
    setExamTimer(0);
    setStudyCards([...set.cards].sort(() => Math.random() - 0.5));
  };

  const openFeature = async (type: 'summary' | 'mindmap') => {
    setModalType(type);
    
    if (type === 'summary') {
        if (set.summary) {
            setSummaryContent(set.summary);
            return;
        }
        setIsGenerating(true);
        try {
            const content = await generateSummary(set.cards);
            if (!content || content.includes("Error")) {
                throw new Error(content);
            }
            const updatedSet = { ...set, summary: content };
            saveSet(updatedSet);
            onUpdateSet(updatedSet);
            setSummaryContent(content);
        } catch(e) {
            setSummaryContent("Failed to generate summary. Please try again later.");
        } finally {
            setIsGenerating(false);
        }
    } else {
        if (set.mindMap) {
            setMindMapContent(set.mindMap);
            return;
        }
        setIsGenerating(true);
        try {
            const content = await generateMindMap(set.cards);
            if (content) {
                const updatedSet = { ...set, mindMap: content };
                saveSet(updatedSet);
                onUpdateSet(updatedSet);
                setMindMapContent(content);
            } else {
                throw new Error("Empty mindmap");
            }
        } catch(e) {
            console.error(e);
            setMindMapContent(null);
        } finally {
            setIsGenerating(false);
        }
    }
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  if (isFinished) {
    return (
      <div className="flex flex-col items-center justify-center h-full max-w-2xl mx-auto p-6 text-center animate-fade-in">
        <div className="bg-yellow-100 p-4 rounded-full mb-6">
          <Trophy className="w-12 h-12 text-yellow-600" />
        </div>
        <h2 className="text-3xl font-bold text-slate-800 mb-2">
            {mode === 'exam' ? 'Exam Submitted!' : 'Session Complete!'}
        </h2>
        <p className="text-slate-500 mb-2">Score: {sessionScore} / {studyCards.length}</p>
        {mode === 'exam' && <p className="text-slate-500 mb-8">Time Taken: {formatTime(examTimer)}</p>}
        
        <div className="w-full bg-gray-200 rounded-full h-4 mb-8">
          <div 
            className="bg-indigo-600 h-4 rounded-full transition-all duration-1000" 
            style={{ width: studyCards.length > 0 ? `${(sessionScore / studyCards.length) * 100}%` : '0%' }}
          ></div>
        </div>

        {/* Feature Buttons Moved Here */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-md mb-8">
            <button 
                onClick={() => openFeature('summary')}
                className="flex items-center justify-center p-4 bg-white border border-slate-200 rounded-xl hover:border-indigo-400 hover:shadow-md transition-all group"
            >
                <div className="mr-3 p-2 bg-indigo-50 text-indigo-600 rounded-lg group-hover:bg-indigo-100">
                    <FileText size={20} />
                </div>
                <div className="text-left">
                    <h4 className="font-semibold text-slate-800">Summary</h4>
                    <p className="text-xs text-slate-500">Key takeaways</p>
                </div>
            </button>
            <button 
                onClick={() => openFeature('mindmap')}
                className="flex items-center justify-center p-4 bg-white border border-slate-200 rounded-xl hover:border-indigo-400 hover:shadow-md transition-all group"
            >
                <div className="mr-3 p-2 bg-purple-50 text-purple-600 rounded-lg group-hover:bg-purple-100">
                    <Network size={20} />
                </div>
                <div className="text-left">
                    <h4 className="font-semibold text-slate-800">Mind Map</h4>
                    <p className="text-xs text-slate-500">Interactive graph</p>
                </div>
            </button>
        </div>

        <div className="flex gap-4">
          <Button variant="secondary" onClick={onExit} icon={<ArrowLeft size={18} />}>
            Library
          </Button>
          <Button onClick={restart} icon={<RotateCcw size={18} />}>
            Retry
          </Button>
        </div>
      </div>
    );
  }

  // Guard against empty cards
  if (!currentCard) {
    return (
      <div className="flex flex-col items-center justify-center h-full max-w-lg mx-auto p-6 text-center">
        <div className="bg-slate-100 p-4 rounded-full mb-6 text-slate-400">
            <FileText size={48} />
        </div>
        <h2 className="text-xl font-bold text-slate-800 mb-2">Empty Set</h2>
        <p className="text-slate-500 mb-6">This study set contains no cards.</p>
        <Button onClick={onExit} icon={<ArrowLeft size={18} />}>
            Back to Library
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto flex flex-col h-full relative">
      {/* Top Bar - Cleaned up */}
      <div className="flex flex-col sm:flex-row items-center justify-between mb-6 gap-4 border-b border-slate-100 pb-4">
         <div className="flex items-center gap-2 w-full sm:w-auto">
             <button onClick={onExit} className="p-2 hover:bg-slate-100 rounded-full text-slate-500">
                <ArrowLeft size={20} />
             </button>
             <h2 className="font-semibold text-lg line-clamp-1 text-slate-900">{set.title}</h2>
         </div>
      </div>

      {/* Mode Tabs */}
      <div className="relative flex justify-center mb-6 z-10">
         {showPrepMessage && (
            <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="absolute -top-14 bg-indigo-900 text-white text-xs px-4 py-3 rounded-xl shadow-xl flex items-center gap-2 max-w-sm text-center"
            >
                <Loader2 size={16} className="animate-spin shrink-0" />
                Go through the flashcards while we are getting the test/quiz ready for you.
            </motion.div>
         )}
         <div className="bg-slate-100 p-1 rounded-xl flex gap-1">
             <button onClick={() => changeMode('flashcards')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${mode === 'flashcards' ? 'bg-white shadow text-indigo-600' : 'text-slate-500'}`}>Flashcards</button>
             <button 
                onClick={() => changeMode('quiz')} 
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${mode === 'quiz' ? 'bg-white shadow text-indigo-600' : 'text-slate-500'}`}
             >
                Quiz {isPreparingQuiz && <Loader2 size={12} className="animate-spin opacity-50" />}
             </button>
             <button 
                onClick={() => changeMode('exam')} 
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${mode === 'exam' ? 'bg-white shadow text-indigo-600' : 'text-slate-500'}`}
             >
                Exam {isPreparingQuiz && <Loader2 size={12} className="animate-spin opacity-50" />}
             </button>
         </div>
      </div>

      {/* Progress & Timer */}
      <div className="flex items-center justify-between mb-4 px-2">
         <div className="flex-1 mr-4">
            <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
                <div className="h-full bg-indigo-500 transition-all duration-300 ease-out" style={{ width: `${progress}%` }} />
            </div>
         </div>
         {mode === 'exam' && (
             <div className="flex items-center text-slate-600 font-mono text-sm">
                 <Timer size={16} className="mr-1" />
                 {formatTime(examTimer)}
             </div>
         )}
         <div className="text-xs text-slate-400 font-medium whitespace-nowrap">
             {currentIndex + 1} / {studyCards.length}
         </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col items-center justify-center p-2 relative min-h-[400px]">
        {mode === 'flashcards' && (
            <>
                <button onClick={() => handleNav('prev')} disabled={currentIndex === 0} className="hidden sm:block absolute left-0 p-3 text-slate-300 hover:text-indigo-600 disabled:opacity-0 transition-colors"><ChevronLeft size={36} /></button>
                <button onClick={() => handleNav('next')} disabled={currentIndex === studyCards.length - 1} className="hidden sm:block absolute right-0 p-3 text-slate-300 hover:text-indigo-600 disabled:opacity-0 transition-colors"><ChevronRight size={36} /></button>
            </>
        )}
        
        <AnimatePresence mode='wait'>
          <motion.div 
            key={`${currentCard.id}-${mode}`}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
            className="w-full max-w-2xl"
          >
            {mode === 'flashcards' ? (
                <FlipCard 
                    card={currentCard} 
                    isFlipped={isFlipped} 
                    onClick={() => setIsFlipped(!isFlipped)} 
                    frontImage={images.front}
                    backImage={images.back}
                />
            ) : (
                <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-8 w-full">
                    <span className="text-xs font-bold tracking-wider text-indigo-500 uppercase mb-4 block">Question</span>
                    <h3 className="text-xl font-medium text-slate-800 mb-8">{currentCard.question}</h3>
                    <div className="grid grid-cols-1 gap-3">
                        {distractors.map((option, idx) => {
                            let btnClass = "p-4 rounded-xl border-2 text-left transition-all hover:bg-slate-50 border-slate-200";
                            if (quizSelection) {
                                if (option === currentCard.answer) btnClass = "p-4 rounded-xl border-2 text-left bg-green-50 border-green-500 text-green-700";
                                else if (option === quizSelection) btnClass = "p-4 rounded-xl border-2 text-left bg-red-50 border-red-500 text-red-700";
                                else btnClass = "p-4 rounded-xl border-2 text-left border-slate-100 opacity-50";
                            }
                            return (
                                <button 
                                    key={idx}
                                    disabled={!!quizSelection}
                                    onClick={() => handleQuizAnswer(option)}
                                    className={btnClass}
                                >
                                    {option}
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {mode === 'flashcards' && (
        <div className="mt-8 mb-4 grid grid-cols-2 gap-4 max-w-md mx-auto w-full">
            <button onClick={() => handleResponse(false)} className="flex items-center justify-center p-4 rounded-xl border-2 border-orange-100 bg-orange-50 text-orange-600 font-semibold hover:bg-orange-100 active:scale-95 transition-all">
            <X className="mr-2" size={20} /> Practice
            </button>
            <button onClick={() => handleResponse(true)} className="flex items-center justify-center p-4 rounded-xl border-2 border-green-100 bg-green-50 text-green-600 font-semibold hover:bg-green-100 active:scale-95 transition-all">
            <Check className="mr-2" size={20} /> Mastered
            </button>
        </div>
      )}

      {/* Feature Modal */}
      <AnimatePresence>
        {modalType !== 'none' && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          >
             <div className="bg-white w-full max-w-5xl h-[85vh] flex flex-col rounded-2xl shadow-2xl overflow-hidden border border-slate-200">
               <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50">
                  <div className="flex items-center gap-2">
                     {modalType === 'summary' ? <FileText size={20} className="text-indigo-600"/> : <Network size={20} className="text-purple-600"/>}
                     <h3 className="font-semibold text-slate-800">
                        {modalType === 'summary' ? 'Topic Summary' : 'Topic Knowledge Graph'}
                     </h3>
                  </div>
                  <button onClick={() => setModalType('none')} className="p-2 hover:bg-slate-200 rounded-full text-slate-500">
                    <CloseIcon size={20} />
                  </button>
               </div>
               
               <div className="p-0 flex-1 overflow-hidden bg-slate-50 relative">
                 {isGenerating ? (
                   <div className="flex flex-col items-center justify-center h-full space-y-4 text-slate-500">
                     <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                     <p>Generating insights with AI...</p>
                   </div>
                 ) : (
                    <>
                       {modalType === 'summary' ? (
                          <div className="p-8 overflow-y-auto h-full prose prose-slate prose-lg max-w-none text-slate-700">
                            <ReactMarkdown>{summaryContent}</ReactMarkdown>
                          </div>
                       ) : (
                          <div className="w-full h-full relative">
                            {mindMapContent ? (
                                <MindMap data={mindMapContent} title={set.title} />
                            ) : (
                                <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-2">
                                    <Network size={48} className="opacity-20" />
                                    <p>Failed to load Mind Map.</p>
                                    <p className="text-xs">Try regenerating later.</p>
                                </div>
                            )}
                          </div>
                       )}
                    </>
                 )}
               </div>
             </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};