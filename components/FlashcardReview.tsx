import React, { useState } from 'react';
import { CardSet, Flashcard } from '../types';
import { Button } from './Button';
import { Plus, Trash2, Save, ArrowLeft } from 'lucide-react';

interface FlashcardReviewProps {
  initialSet: CardSet;
  onSave: (set: CardSet) => void;
  onCancel: () => void;
}

export const FlashcardReview: React.FC<FlashcardReviewProps> = ({ initialSet, onSave, onCancel }) => {
  const [title, setTitle] = useState(initialSet.title);
  const [cards, setCards] = useState<Flashcard[]>(initialSet.cards);

  const handleCardChange = (id: string, field: keyof Flashcard, value: string) => {
    setCards(prev => prev.map(c => c.id === id ? { ...c, [field]: value } : c));
  };

  const handleDelete = (id: string) => {
    if (window.confirm("Are you sure you want to delete this flashcard?")) {
      setCards(prev => prev.filter(c => c.id !== id));
    }
  };

  const handleAddCard = () => {
    const newCard: Flashcard = {
      id: Math.random().toString(36).substr(2, 9),
      question: '',
      answer: '',
      status: 'new'
    };
    setCards(prev => [...prev, newCard]);
  };

  const handleSave = () => {
    if (!title.trim()) {
      alert("Please enter a title");
      return;
    }
    
    // Filter out completely empty cards, but allow editing empty ones if user wants to fill them later
    const validCards = cards.filter(c => c.question.trim() || c.answer.trim());
    
    if (validCards.length === 0) {
        alert("Please ensure at least one card has content.");
        return;
    }
    
    onSave({
      ...initialSet,
      title,
      cards: validCards
    });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fade-in pb-20">
      <div className="flex items-center justify-between sticky top-[72px] bg-slate-50/95 backdrop-blur-sm py-4 z-20 border-b border-slate-200/50">
        <div className="flex items-center gap-4">
            <button onClick={onCancel} className="p-2 hover:bg-slate-100 rounded-full text-slate-500">
                <ArrowLeft size={20} />
            </button>
            <h2 className="text-2xl font-bold text-slate-900">Review Flashcards</h2>
        </div>
        <Button onClick={handleSave} icon={<Save size={18} />}>Save to Library</Button>
      </div>

      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <label className="block text-sm font-medium text-slate-700 mb-2">Set Title</label>
        <input 
            type="text" 
            value={title} 
            onChange={(e) => setTitle(e.target.value)}
            className="w-full text-lg font-bold border-b-2 border-slate-200 focus:border-indigo-500 outline-none py-2 transition-colors placeholder:font-normal bg-transparent"
            placeholder="Enter set title..."
        />
      </div>

      <div className="space-y-4">
        {cards.map((card, index) => (
            <div key={card.id} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm group hover:border-indigo-300 transition-colors relative">
                <div className="flex justify-between items-start mb-4">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Card {index + 1}</span>
                    <button 
                        onClick={() => handleDelete(card.id)} 
                        className="text-slate-300 hover:text-red-500 transition-colors p-1"
                        title="Delete Card"
                    >
                        <Trash2 size={16} />
                    </button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-600">Question</label>
                        <textarea 
                            value={card.question}
                            onChange={(e) => handleCardChange(card.id, 'question', e.target.value)}
                            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-100 outline-none resize-none min-h-[120px] text-slate-800"
                            placeholder="Enter question..."
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-600">Answer</label>
                        <textarea 
                            value={card.answer}
                            onChange={(e) => handleCardChange(card.id, 'answer', e.target.value)}
                            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-100 outline-none resize-none min-h-[120px] text-slate-800"
                            placeholder="Enter answer..."
                        />
                    </div>
                </div>
            </div>
        ))}
      </div>

      <Button variant="secondary" onClick={handleAddCard} className="w-full py-4 border-dashed text-slate-500 hover:text-indigo-600 hover:border-indigo-300" icon={<Plus size={18} />}>
        Add New Card
      </Button>
    </div>
  );
};