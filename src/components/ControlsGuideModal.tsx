import React from 'react';
import { X, Navigation, Zap, Compass, Wind } from 'lucide-react';
import { sound } from '../audio/SoundEngine';

interface ControlsGuideModalProps {
  onClose: () => void;
}

export const ControlsGuideModal: React.FC<ControlsGuideModalProps> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-200 select-none">
      <div className="w-full max-w-2xl bg-[#0a0d18] border border-white/15 rounded-2xl p-6 md:p-8 shadow-2xl relative flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between mb-6 pb-4 border-b border-white/10">
          <div>
            <div className="text-xs text-cyan-400 font-semibold uppercase tracking-wider mb-1">
              Flight Operations
            </div>
            <h2 className="font-display font-extrabold text-2xl text-white">
              Flight School & Biomechanics
            </h2>
          </div>
          <button
            onClick={() => {
              sound.playUiClick();
              onClose();
            }}
            className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="space-y-6 text-xs text-slate-300">
          {/* Flight Controls Keymap */}
          <div>
            <h3 className="font-display font-bold text-sm text-white mb-3 flex items-center gap-2">
              <Navigation className="w-4 h-4 text-cyan-400" />
              Pilot Flight Controls
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="bg-white/5 border border-white/5 rounded-xl p-3 flex items-center justify-between">
                <span className="text-slate-400">Pitch (Dive / Climb):</span>
                <div className="flex gap-1">
                  <kbd className="px-2 py-1 bg-black/60 border border-white/10 rounded text-cyan-300 font-mono">W</kbd>
                  <kbd className="px-2 py-1 bg-black/60 border border-white/10 rounded text-cyan-300 font-mono">S</kbd>
                </div>
              </div>

              <div className="bg-white/5 border border-white/5 rounded-xl p-3 flex items-center justify-between">
                <span className="text-slate-400">Steer & Bank Turn:</span>
                <div className="flex gap-1">
                  <kbd className="px-2 py-1 bg-black/60 border border-white/10 rounded text-cyan-300 font-mono">A</kbd>
                  <kbd className="px-2 py-1 bg-black/60 border border-white/10 rounded text-cyan-300 font-mono">D</kbd>
                </div>
              </div>

              <div className="bg-white/5 border border-white/5 rounded-xl p-3 flex items-center justify-between">
                <span className="text-slate-400">Altitude Lift / Dive:</span>
                <div className="flex gap-1">
                  <kbd className="px-2 py-1 bg-black/60 border border-white/10 rounded text-cyan-300 font-mono">E</kbd>
                  <kbd className="px-2 py-1 bg-black/60 border border-white/10 rounded text-cyan-300 font-mono">C</kbd>
                </div>
              </div>

              <div className="bg-white/5 border border-white/5 rounded-xl p-3 flex items-center justify-between">
                <span className="text-slate-400">Thoracic Boost:</span>
                <div className="flex gap-1">
                  <kbd className="px-2 py-1 bg-black/60 border border-white/10 rounded text-cyan-300 font-mono">Shift</kbd>
                  <span className="text-slate-500">or</span>
                  <kbd className="px-2 py-1 bg-black/60 border border-white/10 rounded text-cyan-300 font-mono">F</kbd>
                </div>
              </div>
            </div>
          </div>

          {/* Biological Mechanics */}
          <div className="pt-2 border-t border-white/10">
            <h3 className="font-display font-bold text-sm text-white mb-3 flex items-center gap-2">
              <Compass className="w-4 h-4 text-violet-400" />
              How Drosophila Actually Flies
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="bg-black/40 border border-white/5 rounded-xl p-3.5 space-y-1">
                <div className="font-bold text-white flex items-center gap-1.5 text-xs">
                  <Wind className="w-3.5 h-3.5 text-cyan-400" />
                  Halteres: Biological Gyroscopes
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Behind each wing, fruit flies possess dumbbell-shaped organs vibrating at 200 Hz. They act as vibrating Coriolis gyroscopes, detecting rotational slip in less than 5 milliseconds!
                </p>
              </div>

              <div className="bg-black/40 border border-white/5 rounded-xl p-3.5 space-y-1">
                <div className="font-bold text-white flex items-center gap-1.5 text-xs">
                  <Zap className="w-3.5 h-3.5 text-amber-400" />
                  Optic Flow Collision Avoidance
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Thousands of hexagonal ommatidia feed wide-field motion sensors in the Optic Lobes, triggering near-instantaneous flight saccades to dodge approaching obstacles.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-6 mt-6 border-t border-white/10 flex justify-end">
          <button
            onClick={() => {
              sound.playUiClick();
              onClose();
            }}
            className="px-6 py-2.5 rounded-xl text-xs font-bold text-black bg-cyan-400 hover:bg-white transition-all cursor-pointer"
          >
            Understood, Pilot
          </button>
        </div>
      </div>
    </div>
  );
};
