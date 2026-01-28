
import React, { useCallback, useState } from 'react';
import { FileText, X, Settings2 } from 'lucide-react';
import { Button } from './Button';
import { FileInput } from '../services/geminiService';
import { GenerationOptions } from '../types';
import { motion, AnimatePresence } from 'framer-motion';

interface FileUploadProps {
  onContentReady: (text: string, files: FileInput[], options: GenerationOptions) => void;
  isProcessing: boolean;
}

interface UploadedFile {
  id: string;
  name: string;
  mimeType: string;
  data: string; // base64 without header
  previewUrl?: string;
}

export const FileUpload: React.FC<FileUploadProps> = ({ onContentReady, isProcessing }) => {
  const [dragActive, setDragActive] = useState(false);
  const [inputText, setInputText] = useState("");
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isLoadingFile, setIsLoadingFile] = useState(false);
  const [showOptionsModal, setShowOptionsModal] = useState(false);
  
  // Generation Options
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [cardCount, setCardCount] = useState<10 | 15 | 20>(10);
  const [answerLength, setAnswerLength] = useState<'short' | 'medium' | 'long'>('medium');

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const processFiles = (files: FileList | null) => {
    if (!files) return;
    
    setIsLoadingFile(true);
    
    Array.from(files).forEach(file => {
      if (file.size > 10 * 1024 * 1024) {
        alert(`File ${file.name} is too large (>10MB).`);
        setIsLoadingFile(false);
        return;
      }

      const reader = new FileReader();
      
      reader.onload = (e) => {
        const result = e.target?.result as string;
        let mimeType = file.type;
        if (file.name.endsWith('.pdf')) mimeType = 'application/pdf';

        if (mimeType.startsWith('image/') || mimeType === 'application/pdf') {
            const base64Data = result.split(',')[1];
            setUploadedFiles(prev => [...prev, {
                id: Math.random().toString(36).substr(2, 9),
                name: file.name,
                mimeType: mimeType,
                data: base64Data,
                previewUrl: mimeType.startsWith('image/') ? result : undefined
            }]);
        } else if (mimeType === 'text/plain') {
            setInputText(prev => prev + "\n" + atob(result.split(',')[1]));
        } else {
            alert(`File type ${file.type} not supported.`);
        }
        setIsLoadingFile(false);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files.length > 0) {
      processFiles(e.target.files);
    }
  };

  const handleInitialClick = () => {
      if (!inputText.trim() && uploadedFiles.length === 0) return;
      setShowOptionsModal(true);
  };

  const handleSubmit = () => {
    setShowOptionsModal(false);
    const filesForService: FileInput[] = uploadedFiles.map(f => ({
        mimeType: f.mimeType,
        data: f.data
    }));

    onContentReady(inputText, filesForService, { difficulty, cardCount, answerLength });
  };

  const removeFile = (id: string) => {
    setUploadedFiles(prev => prev.filter(f => f.id !== id));
  };

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6">
      {/* Attached Files Section */}
      {(uploadedFiles.length > 0 || isLoadingFile) && (
        <div className="flex flex-wrap gap-4 animate-fade-in border border-slate-200 p-4 rounded-xl bg-slate-50 mb-4">
          {isLoadingFile && <div className="text-sm text-slate-500">Reading file...</div>}
          {uploadedFiles.map((file) => (
            <div key={file.id} className="relative group w-20 h-20 rounded-lg overflow-hidden border border-slate-200 shadow-sm bg-white flex items-center justify-center">
              {file.previewUrl ? (
                <img src={file.previewUrl} alt="Preview" className="w-full h-full object-cover" />
              ) : (
                <div className="flex flex-col items-center justify-center p-2 text-center">
                    <img src="https://img.icons8.com/?size=100&id=1JeOZOznuIHr&format=png&color=000000" className="w-8 h-8 mb-1" />
                    <span className="text-[9px] text-slate-500 line-clamp-2">{file.name}</span>
                </div>
              )}
              <button 
                onClick={() => removeFile(file.id)}
                className="absolute top-1 right-1 p-1 bg-black/50 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500"
              >
                <X size={10} />
              </button>
            </div>
          ))}
        </div>
      )}

      <div 
        className={`relative border-2 border-dashed rounded-2xl p-8 transition-all duration-300 ease-in-out text-center 
          ${dragActive ? 'border-indigo-500 bg-indigo-50 scale-[1.02]' : 'border-slate-300 hover:border-indigo-400 bg-white'}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input 
          type="file" 
          multiple
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
          onChange={handleChange}
          accept="image/*,application/pdf,.txt"
          disabled={isProcessing}
        />
        
        <div className="flex flex-col items-center justify-center space-y-4 pointer-events-none">
          <div className="p-2 rounded-full">
             <img 
                src="https://img.icons8.com/ios/100/upload--v1.png" 
                alt="upload--v1" 
                className="w-20 h-20 opacity-80" 
             />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-slate-800">
              Drop your notes, PDFs, or images
            </h3>
            <p className="text-slate-500 mt-1 text-sm">Supports PDF, PNG, JPG, TXT</p>
          </div>
        </div>
      </div>

      <textarea
        value={inputText}
        onChange={(e) => setInputText(e.target.value)}
        placeholder="Or paste text content directly here..."
        className="w-full h-32 p-4 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none resize-none bg-white shadow-sm"
        disabled={isProcessing}
      />

      <div className="flex justify-end pt-2">
        <Button 
          onClick={handleInitialClick} 
          isLoading={isProcessing} 
          disabled={(!inputText.trim() && uploadedFiles.length === 0) || isProcessing}
          className="w-full sm:w-auto"
        >
          Generate Flashcards
        </Button>
      </div>

      {/* Options Modal */}
      <AnimatePresence>
        {showOptionsModal && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-white/60 backdrop-blur-xl p-4"
          >
            <motion.div 
                initial={{ scale: 0.95, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: 20 }}
                className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-100"
            >
                <div className="p-6 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                    <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                        <Settings2 size={20} className="text-indigo-600" />
                        Generation Options
                    </h3>
                    <button onClick={() => setShowOptionsModal(false)} className="text-slate-400 hover:text-slate-600">
                        <X size={20} />
                    </button>
                </div>
                
                <div className="p-6 space-y-6">
                    {/* Difficulty */}
                    <div className="space-y-3">
                        <label className="text-sm font-semibold text-slate-700 block">Difficulty Level</label>
                        <div className="grid grid-cols-3 gap-2">
                            {(['easy', 'medium', 'hard'] as const).map((d) => (
                                <button
                                    key={d}
                                    onClick={() => setDifficulty(d)}
                                    className={`py-3 px-2 text-sm font-medium rounded-xl border-2 transition-all capitalize ${
                                        difficulty === d 
                                        ? 'border-indigo-600 bg-indigo-50 text-indigo-700' 
                                        : 'border-slate-100 hover:border-slate-200 text-slate-600 bg-white'
                                    }`}
                                >
                                    {d}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Number of Cards */}
                    <div className="space-y-3">
                        <label className="text-sm font-semibold text-slate-700 block">Number of Cards</label>
                        <div className="grid grid-cols-3 gap-2">
                             {([10, 15, 20] as const).map((l) => (
                                <button
                                    key={l}
                                    onClick={() => setCardCount(l)}
                                    className={`py-3 px-2 text-sm font-medium rounded-xl border-2 transition-all capitalize ${
                                        cardCount === l 
                                        ? 'border-indigo-600 bg-indigo-50 text-indigo-700' 
                                        : 'border-slate-100 hover:border-slate-200 text-slate-600 bg-white'
                                    }`}
                                >
                                    {l} Cards
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Answer Length */}
                    <div className="space-y-3">
                        <label className="text-sm font-semibold text-slate-700 block">Answer Length</label>
                        <div className="grid grid-cols-3 gap-2">
                             {(['short', 'medium', 'long'] as const).map((l) => (
                                <button
                                    key={l}
                                    onClick={() => setAnswerLength(l)}
                                    className={`py-3 px-2 text-sm font-medium rounded-xl border-2 transition-all capitalize ${
                                        answerLength === l 
                                        ? 'border-indigo-600 bg-indigo-50 text-indigo-700' 
                                        : 'border-slate-100 hover:border-slate-200 text-slate-600 bg-white'
                                    }`}
                                >
                                    {l}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end">
                    <Button onClick={handleSubmit} className="w-full flex items-center justify-center gap-2">
                        Start Generating
                    </Button>
                </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};