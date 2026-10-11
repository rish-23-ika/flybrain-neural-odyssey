import React from 'react';
import { Play, RotateCcw, Home, Volume2, VolumeX, Sliders } from 'lucide-react';
import { sound } from '../audio/SoundEngine';

interface PauseMenuProps {
  onResume: () => void;
  onRestart: () => void;
  onHome: () => void;
  isMuted: boolean;
  quality: 'low' | 'medium' | 'high';
  onToggleMute: () => void;
  onCycleQuality: () => void;
}

export const PauseMenu: React.FC<PauseMenuProps> = ({
  onResume,
  onRestart,
  onHome,
  isMuted,
  quality,
  onToggleMute,
  onCycleQuality,
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-150 select-none">
      <div className="w-full max-w-sm bg-[#0a0d18] border border-white/15 rounded-2xl p-6 text-center shadow-2xl relative flex flex-col items-center">
        <h2 className="font-display font-bold text-2xl text-white mb-1">Flight Suspended</h2>
        <div className="text-xs text-slate-400 mb-6">Simulation is currently paused</div>

        <div className="w-full space-y-2.5 mb-6">
          <button
            onClick={() => {
              sound.playUiClick();
              onResume();
            }}
            className="w-full py-3 rounded-xl font-bold text-xs text-black bg-gradient-to-r from-cyan-400 to-cyan-300 hover:from-white hover:to-cyan-200 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-cyan-500/20"
          >
            <Play className="w-4 h-4 fill-black" />
            <span>Resume Flight</span>
          </button>

          <button
            onClick={() => {
              sound.playUiClick();
              onRestart();
            }}
            className="w-full py-2.5 rounded-xl font-medium text-xs text-slate-200 bg-white/10 hover:bg-white/15 border border-white/10 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Restart Sector</span>
          </button>

          <button
            onClick={() => {
              onCycleQuality();
              sound.playUiClick();
            }}
            className="w-full py-2.5 rounded-xl font-medium text-xs text-slate-200 bg-white/5 hover:bg-white/10 border border-white/5 transition-all flex items-center justify-between px-4 cursor-pointer"
          >
            <span className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-cyan-400" />
              <span>Graphics Quality</span>
            </span>
            <span className="uppercase text-cyan-300 font-mono font-bold">{quality}</span>
          </button>

          <button
            onClick={() => {
              onToggleMute();
              sound.playUiClick();
            }}
            className="w-full py-2.5 rounded-xl font-medium text-xs text-slate-200 bg-white/5 hover:bg-white/10 border border-white/5 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-slate-400" /> : <Volume2 className="w-4 h-4 text-cyan-400" />}
            <span>{isMuted ? 'Unmute Audio' : 'Mute Audio'}</span>
          </button>

          <button
            onClick={() => {
              sound.playUiClick();
              onHome();
            }}
            className="w-full py-2.5 rounded-xl font-medium text-xs text-slate-400 hover:text-white bg-transparent hover:bg-white/5 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <Home className="w-4 h-4" />
            <span>Exit to Main Menu</span>
          </button>
        </div>

        <div className="text-[11px] text-slate-400">
          Press <kbd className="px-1.5 py-0.5 bg-white/10 rounded font-mono text-[10px]">Esc</kbd> to toggle pause
        </div>
      </div>
    </div>
  );
};
