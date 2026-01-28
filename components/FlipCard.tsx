
import React, { useRef } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { Flashcard } from '../types';

interface FlipCardProps {
  card: Flashcard;
  isFlipped: boolean;
  onClick: () => void;
  frontImage?: string;
  backImage?: string;
}

export const FlipCard: React.FC<FlipCardProps> = ({ card, isFlipped, onClick, frontImage, backImage }) => {
  const ref = useRef<HTMLDivElement>(null);

  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const mouseX = useSpring(x, { stiffness: 500, damping: 50 });
  const mouseY = useSpring(y, { stiffness: 500, damping: 50 });

  const rotateX = useTransform(mouseY, [-0.5, 0.5], ["10deg", "-10deg"]);
  const rotateY = useTransform(mouseX, [-0.5, 0.5], ["-10deg", "10deg"]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const mouseXFromCenter = e.clientX - rect.left - width / 2;
    const mouseYFromCenter = e.clientY - rect.top - height / 2;
    
    x.set(mouseXFromCenter / width);
    y.set(mouseYFromCenter / height);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  const getBgStyle = (img?: string) => img ? {
    backgroundImage: `url(${img})`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
  } : {};

  return (
    <div 
      className="w-full h-80 sm:h-96 perspective-1000 cursor-pointer group" 
      onClick={onClick}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      ref={ref}
    >
      <motion.div
        className="relative w-full h-full transform-style-3d transition-all duration-500"
        initial={false}
        animate={{ 
          rotateY: isFlipped ? 180 : 0,
        }}
        style={{
          rotateX: isFlipped ? 0 : rotateX,
          rotateY: isFlipped ? 180 : rotateY,
        }}
      >
        {/* Front */}
        <div 
            className={`absolute w-full h-full backface-hidden rounded-3xl shadow-2xl border p-8 flex flex-col items-center justify-center text-center overflow-hidden ${frontImage ? 'border-white/20' : 'bg-white/90 backdrop-blur-xl border-white/50'}`}
            style={getBgStyle(frontImage)}
        >
          {frontImage && <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px]"></div>}
          
          <div className="relative z-10">
              <span className={`absolute -top-16 left-0 text-xs font-bold tracking-wider uppercase ${frontImage ? 'text-indigo-200' : 'text-indigo-500'}`}>Question</span>
              <p className={`text-xl sm:text-2xl font-medium leading-relaxed select-none ${frontImage ? 'text-white drop-shadow-md' : 'text-slate-800'}`}>
                {card.question}
              </p>
          </div>
          <span className={`absolute bottom-6 text-sm ${frontImage ? 'text-white/70' : 'text-slate-400'}`}>Click to flip</span>
        </div>

        {/* Back */}
        <div 
            className={`absolute w-full h-full backface-hidden rotate-y-180 rounded-3xl shadow-2xl p-8 flex flex-col items-center justify-center text-center overflow-hidden border ${backImage ? 'border-white/20' : 'bg-indigo-600 border-indigo-500'}`}
            style={getBgStyle(backImage)}
        >
          {backImage ? (
              <div className="absolute inset-0 bg-black/50 backdrop-blur-[1px]"></div>
          ) : null}

          <div className="relative z-10">
            <span className={`absolute -top-16 left-0 text-xs font-bold tracking-wider uppercase ${backImage ? 'text-indigo-200' : 'text-indigo-200'}`}>Answer</span>
            <p className={`text-lg sm:text-xl font-medium leading-relaxed select-none ${backImage ? 'text-white drop-shadow-md' : 'text-white'}`}>
                {card.answer}
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};