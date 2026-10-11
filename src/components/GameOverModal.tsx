import React from 'react';
import { RotateCcw, Home, Clock } from 'lucide-react';
import { sound } from '../audio/SoundEngine';

interface GameOverModalProps {
  onRetry: () => void;
  onHome: () => void;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({ onRetry, onHome }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-200 select-none">
      <div className="w-full max-w-sm bg-[#0a0d18] border border-red-500/30 rounded-2xl p-6 text-center shadow-2xl relative flex flex-col items-center">
        <div className="w-14 h-14 rounded-2xl bg-red-950/60 border border-red-500/40 flex items-center justify-center mb-4">
          <Clock className="w-7 h-7 text-red-400" />
        </div>

        <h2 className="font-display font-bold text-2xl text-white mb-1">Time Elapsed</h2>
        <p className="text-xs text-slate-300 leading-relaxed mb-6">
          The sun has set on this flight sector before all rings were cleared. Refuel your thoracic reserve and try again!
        </p>

        <div className="w-full space-y-2">
          <button
            onClick={() => {
              sound.playUiClick();
              onRetry();
            }}
            className="w-full py-3 rounded-xl font-bold text-xs text-black bg-gradient-to-r from-cyan-400 to-cyan-300 hover:from-white hover:to-cyan-200 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-cyan-500/20"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Try Again</span>
          </button>

          <button
            onClick={() => {
              sound.playUiClick();
              onHome();
            }}
            className="w-full py-2.5 rounded-xl font-medium text-xs text-slate-300 bg-white/5 hover:bg-white/10 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <Home className="w-4 h-4" />
            <span>Return to Menu</span>
          </button>
        </div>
      </div>
    </div>
  );
};
