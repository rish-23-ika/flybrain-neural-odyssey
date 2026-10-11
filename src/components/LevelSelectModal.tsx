import React from 'react';
import { LevelDefinition } from '../types/game';
import { X, Play, Target, Sparkles, Clock, Trophy } from 'lucide-react';
import { sound } from '../audio/SoundEngine';

interface LevelSelectModalProps {
  levels: LevelDefinition[];
  highScores: Record<string, number>;
  onSelectLevel: (level: LevelDefinition) => void;
  onClose: () => void;
}

export const LevelSelectModal: React.FC<LevelSelectModalProps> = ({
  levels,
  highScores,
  onSelectLevel,
  onClose,
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/75 backdrop-blur-md animate-in fade-in duration-200 select-none">
      <div className="w-full max-w-4xl bg-[#0a0d18] border border-white/15 rounded-2xl p-6 md:p-8 shadow-2xl relative flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between mb-6 pb-4 border-b border-white/10">
          <div>
            <div className="text-xs text-cyan-400 font-semibold uppercase tracking-wider mb-1">
              Mission Registry
            </div>
            <h2 className="font-display font-extrabold text-2xl md:text-3xl text-white">
              Select Flight Environment
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

        {/* Level Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-6">
          {levels.map((lvl) => {
            const bestScore = highScores[lvl.id] || 0;
            return (
              <div
                key={lvl.id}
                className="group relative bg-black/50 border border-white/10 hover:border-cyan-400/60 rounded-xl p-5 flex flex-col justify-between transition-all duration-200 hover:-translate-y-1 hover:shadow-xl hover:shadow-cyan-500/10"
              >
                <div>
                  {/* Level Number & Tag */}
                  <div className="flex items-center justify-between mb-3">
                    <span
                      className="font-mono text-xs font-bold px-2 py-0.5 rounded border"
                      style={{
                        color: lvl.themeColor,
                        borderColor: `${lvl.themeColor}40`,
                        backgroundColor: `${lvl.themeColor}15`,
                      }}
                    >
                      Sector 0{lvl.number}
                    </span>

                    {bestScore > 0 && (
                      <span className="flex items-center gap-1 text-[11px] text-amber-300">
                        <Trophy className="w-3.5 h-3.5 text-amber-400" />
                        <span className="font-mono-numbers">{bestScore.toLocaleString()}</span>
                      </span>
                    )}
                  </div>

                  <h3 className="font-display font-bold text-lg text-white mb-1 group-hover:text-cyan-300 transition-colors">
                    {lvl.name}
                  </h3>
                  <div className="text-xs text-slate-400 mb-3">{lvl.subtitle}</div>

                  <p className="text-xs text-slate-300 leading-relaxed mb-4">
                    {lvl.description}
                  </p>
                </div>

                {/* Mission Goals */}
                <div className="space-y-3 pt-3 border-t border-white/5">
                  <div className="grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="bg-white/5 rounded-lg p-1.5 border border-white/5">
                      <Target className="w-3.5 h-3.5 mx-auto mb-0.5 text-cyan-400" />
                      <div className="font-mono-numbers text-white font-bold">{lvl.targetRings}</div>
                      <div className="text-[9px] text-slate-400">Rings</div>
                    </div>

                    <div className="bg-white/5 rounded-lg p-1.5 border border-white/5">
                      <Sparkles className="w-3.5 h-3.5 mx-auto mb-0.5 text-amber-400" />
                      <div className="font-mono-numbers text-amber-300 font-bold">{lvl.targetNectar}</div>
                      <div className="text-[9px] text-slate-400">Nectar</div>
                    </div>

                    <div className="bg-white/5 rounded-lg p-1.5 border border-white/5">
                      <Clock className="w-3.5 h-3.5 mx-auto mb-0.5 text-emerald-400" />
                      <div className="font-mono-numbers text-emerald-300 font-bold">{lvl.timeLimitSeconds}s</div>
                      <div className="text-[9px] text-slate-400">Limit</div>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      sound.playUiClick();
                      onSelectLevel(lvl);
                    }}
                    className="w-full py-2.5 rounded-lg text-xs font-bold text-black bg-gradient-to-r from-cyan-400 to-cyan-300 hover:from-white hover:to-cyan-200 transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-md shadow-cyan-500/20"
                  >
                    <Play className="w-3.5 h-3.5 fill-black" />
                    <span>Engage Flight</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <div className="text-center text-xs text-slate-400">
          Pro-tip: Collect nectar in flowers to continuously recharge your thoracic boost reserve!
        </div>
      </div>
    </div>
  );
};
