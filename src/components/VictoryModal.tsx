import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { LevelDefinition, LevelResult } from '../types/game';
import { Trophy, Award, Sparkles, Clock, Target, RotateCcw, ArrowRight, Home } from 'lucide-react';
import { sound } from '../audio/SoundEngine';

interface VictoryModalProps {
  level: LevelDefinition;
  result: LevelResult;
  onNextLevel: () => void;
  onRetry: () => void;
  onHome: () => void;
  hasNextLevel: boolean;
}

export const VictoryModal: React.FC<VictoryModalProps> = ({
  level,
  result,
  onNextLevel,
  onRetry,
  onHome,
  hasNextLevel,
}) => {
  useEffect(() => {
    // Confetti blast on victory
    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#00f2fe', '#a855f7', '#fbbf24', '#34d399'],
      });
    } catch {
      // Ignore if confetti fails
    }
  }, []);

  const medalColor =
    result.medal === 'gold'
      ? 'text-amber-400'
      : result.medal === 'silver'
      ? 'text-slate-300'
      : 'text-amber-700';

  const medalLabel =
    result.medal === 'gold'
      ? 'Gold Wings'
      : result.medal === 'silver'
      ? 'Silver Wings'
      : 'Bronze Wings';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-300 select-none">
      <div className="w-full max-w-md bg-[#0a0d18] border border-cyan-500/40 rounded-2xl p-6 md:p-8 shadow-2xl shadow-cyan-900/40 text-center relative flex flex-col items-center">
        {/* Medal Badge */}
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-400/20 to-violet-500/20 border border-cyan-400/40 flex items-center justify-center mb-4 shadow-lg shadow-cyan-500/20">
          <Trophy className={`w-8 h-8 ${medalColor}`} />
        </div>

        <div className="text-xs text-cyan-400 font-semibold tracking-wider uppercase mb-1">
          Sector Cleared
        </div>
        <h2 className="font-display font-extrabold text-2xl md:text-3xl text-white mb-1">
          Flight Complete!
        </h2>
        <div className="text-xs text-slate-400 mb-6 flex items-center justify-center gap-1.5">
          <Award className={`w-3.5 h-3.5 ${medalColor}`} />
          <span>Awarded {medalLabel}</span>
          {result.newRecord && <span className="text-amber-300 font-semibold">· New Record!</span>}
        </div>

        {/* Score Card */}
        <div className="w-full bg-black/50 border border-white/10 rounded-xl p-4 mb-6 space-y-3 text-xs">
          <div className="flex justify-between items-baseline pb-2 border-b border-white/10">
            <span className="text-slate-400">Total Flight Score:</span>
            <span className="font-mono-numbers font-extrabold text-2xl text-cyan-300">
              {result.score.toLocaleString()}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2 pt-1 text-center">
            <div className="bg-white/5 rounded-lg p-2 border border-white/5">
              <Target className="w-3.5 h-3.5 text-cyan-400 mx-auto mb-1" />
              <div className="font-mono-numbers font-bold text-white">{result.rings}</div>
              <div className="text-[10px] text-slate-400">Rings</div>
            </div>

            <div className="bg-white/5 rounded-lg p-2 border border-white/5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400 mx-auto mb-1" />
              <div className="font-mono-numbers font-bold text-amber-300">{result.nectar}</div>
              <div className="text-[10px] text-slate-400">Nectar</div>
            </div>

            <div className="bg-white/5 rounded-lg p-2 border border-white/5">
              <Clock className="w-3.5 h-3.5 text-emerald-400 mx-auto mb-1" />
              <div className="font-mono-numbers font-bold text-emerald-300">{result.time}s</div>
              <div className="text-[10px] text-slate-400">Time</div>
            </div>
          </div>
        </div>

        {/* Buttons */}
        <div className="w-full space-y-2">
          {hasNextLevel && (
            <button
              onClick={() => {
                sound.playUiClick();
                onNextLevel();
              }}
              className="w-full py-3 rounded-xl font-bold text-xs text-black bg-gradient-to-r from-cyan-400 to-cyan-300 hover:from-white hover:to-cyan-200 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-cyan-500/20"
            >
              <span>Next Flight Sector</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}

          <div className="flex gap-2">
            <button
              onClick={() => {
                sound.playUiClick();
                onRetry();
              }}
              className="flex-1 py-2.5 rounded-xl font-medium text-xs text-slate-200 bg-white/10 hover:bg-white/15 border border-white/10 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Retry</span>
            </button>

            <button
              onClick={() => {
                sound.playUiClick();
                onHome();
              }}
              className="flex-1 py-2.5 rounded-xl font-medium text-xs text-slate-200 bg-white/10 hover:bg-white/15 border border-white/10 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Home className="w-3.5 h-3.5" />
              <span>Menu</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
