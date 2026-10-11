import React from 'react';
import { PlayerFlightState, LevelDefinition } from '../types/game';
import { Volume2, VolumeX, Pause, Sparkles, Target, Zap, Clock, AlertTriangle, MousePointer2, Sliders } from 'lucide-react';

interface HUDProps {
  level: LevelDefinition;
  flightState: PlayerFlightState;
  isMuted: boolean;
  quality: 'low' | 'medium' | 'high';
  onToggleMute: () => void;
  onCycleQuality: () => void;
  onPause: () => void;
}

export const HUD: React.FC<HUDProps> = ({
  level,
  flightState,
  isMuted,
  quality,
  onToggleMute,
  onCycleQuality,
  onPause,
}) => {
  const timeRemaining = Math.max(0, level.timeLimitSeconds - flightState.timeElapsed);
  const minutes = Math.floor(timeRemaining / 60);
  const seconds = timeRemaining % 60;
  const timeDisplay = `${minutes}:${seconds.toString().padStart(2, '0')}`;

  const isLowTime = timeRemaining <= 15;

  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-6 select-none z-20">
      {/* Top Telemetry Bar */}
      <div className="flex items-start justify-between">
        {/* Left: Sector & Objective */}
        <div className="bg-black/55 backdrop-blur-md border border-white/15 rounded-xl p-4 pointer-events-auto shadow-2xl max-w-sm">
          <div className="flex items-center gap-2 mb-1">
            <span
              className="w-2.5 h-2.5 rounded-full animate-ping"
              style={{ backgroundColor: level.themeColor }}
            />
            <h2 className="font-display font-bold text-sm tracking-wide text-white">
              {level.name}
            </h2>
          </div>
          <div className="text-[11px] text-slate-400 mb-3">
            Sector 0{level.number} · Pass all rings & gather nectar
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="flex items-center gap-2 bg-white/5 rounded-lg px-2.5 py-1.5 border border-white/5">
              <Target className="w-4 h-4 text-cyan-400" />
              <div>
                <div className="text-[10px] text-slate-400">Rings</div>
                <div className="font-mono-numbers font-bold text-white text-sm">
                  {flightState.ringsCompleted} / {level.targetRings}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 bg-white/5 rounded-lg px-2.5 py-1.5 border border-white/5">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <div>
                <div className="text-[10px] text-slate-400">Nectar</div>
                <div className="font-mono-numbers font-bold text-amber-300 text-sm">
                  {flightState.nectarCollected}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Center: Flight Score & Timer */}
        <div className="flex items-center gap-5 bg-black/55 backdrop-blur-md border border-white/15 rounded-xl px-6 py-2.5 shadow-2xl">
          <div className="text-center">
            <div className="text-[10px] uppercase tracking-wider text-slate-400">Score</div>
            <div className="font-mono-numbers font-bold text-xl text-white">
              {flightState.score.toLocaleString()}
            </div>
          </div>

          <div className="w-px h-8 bg-white/15" />

          <div className="flex items-center gap-2.5">
            <Clock className={`w-4 h-4 ${isLowTime ? 'text-red-400 animate-pulse' : 'text-slate-400'}`} />
            <div>
              <div className="text-[10px] uppercase tracking-wider text-slate-400">Time Left</div>
              <div
                className={`font-mono-numbers font-bold text-xl ${
                  isLowTime ? 'text-red-400 animate-pulse' : 'text-white'
                }`}
              >
                {timeDisplay}
              </div>
            </div>
          </div>
        </div>

        {/* Right: Sound, Quality & Pause Controls */}
        <div className="flex items-center gap-2 pointer-events-auto">
          {/* Quality Switcher */}
          <button
            onClick={onCycleQuality}
            className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-black/55 backdrop-blur-md border border-white/15 text-slate-300 hover:text-white hover:bg-white/10 transition-all shadow-xl text-xs font-medium cursor-pointer"
            title="Cycle Graphics Quality (Low / Med / High)"
          >
            <Sliders className="w-3.5 h-3.5 text-cyan-400" />
            <span className="uppercase text-[10px] font-mono font-bold tracking-wider">{quality}</span>
          </button>

          <button
            onClick={onToggleMute}
            className="p-2.5 rounded-xl bg-black/55 backdrop-blur-md border border-white/15 text-slate-300 hover:text-white hover:bg-white/10 transition-all shadow-xl cursor-pointer"
            title={isMuted ? 'Unmute Audio' : 'Mute Audio'}
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>

          <button
            onClick={onPause}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-black/55 backdrop-blur-md border border-white/15 text-slate-300 hover:text-white hover:bg-white/10 transition-all shadow-xl text-xs font-semibold cursor-pointer"
          >
            <Pause className="w-4 h-4" />
            <span>Pause</span>
          </button>
        </div>
      </div>

      {/* Center Flight Crosshair / Reticle for intuitive steering */}
      <div className="self-center flex flex-col items-center justify-center my-auto opacity-70">
        <div className="relative w-12 h-12 flex items-center justify-center">
          {/* Outer Crosshair Ring */}
          <div className="absolute inset-0 border border-cyan-400/40 rounded-full" />
          {/* Center Point */}
          <div className="w-1.5 h-1.5 bg-cyan-300 rounded-full shadow-md shadow-cyan-400" />
          {/* Wings reticle marks */}
          <div className="absolute -left-2 w-2 h-0.5 bg-cyan-400/60" />
          <div className="absolute -right-2 w-2 h-0.5 bg-cyan-400/60" />
          <div className="absolute -top-2 w-0.5 h-2 bg-cyan-400/60" />
        </div>
      </div>

      {/* Proximity Obstacle Warning */}
      {flightState.collisionWarning && (
        <div className="self-center flex items-center gap-2 px-5 py-2 bg-red-950/90 border border-red-500/70 rounded-full text-red-200 text-xs font-semibold animate-pulse shadow-2xl shadow-red-950 mb-3">
          <AlertTriangle className="w-4 h-4 text-red-400" />
          <span>Proximity Warning: Solid Obstacle Ahead! Bank or Climb!</span>
        </div>
      )}

      {/* World Boundary Warning */}
      {!flightState.collisionWarning && flightState.boundaryWarning && (
        <div className="self-center flex items-center gap-2 px-5 py-2 bg-amber-950/90 border border-amber-500/70 rounded-full text-amber-200 text-xs font-semibold animate-pulse shadow-2xl shadow-amber-950 mb-3">
          <AlertTriangle className="w-4 h-4 text-amber-400" />
          <span>Boundary Reached · Turning Back Toward Flight Corridor</span>
        </div>
      )}

      {/* Bottom Center: Flight Cockpit Instruments */}
      <div className="flex items-end justify-between">
        {/* Left: Speedometer & Altitude */}
        <div className="bg-black/55 backdrop-blur-md border border-white/15 rounded-xl p-3.5 shadow-2xl flex items-center gap-6">
          <div>
            <div className="text-[10px] uppercase tracking-wider text-slate-400 mb-0.5">Airspeed</div>
            <div className="flex items-baseline gap-1">
              <span className="font-mono-numbers font-bold text-2xl text-cyan-400">
                {flightState.speed}
              </span>
              <span className="text-[10px] text-slate-400">mm/s</span>
            </div>
          </div>

          <div className="w-px h-9 bg-white/15" />

          <div>
            <div className="text-[10px] uppercase tracking-wider text-slate-400 mb-0.5">Altitude</div>
            <div className="flex items-baseline gap-1">
              <span className="font-mono-numbers font-bold text-2xl text-emerald-400">
                {flightState.altitude}
              </span>
              <span className="text-[10px] text-slate-400">mm</span>
            </div>
          </div>
        </div>

        {/* Center: Thoracic Boost Gauge */}
        <div className="bg-black/55 backdrop-blur-md border border-white/15 rounded-xl p-3.5 shadow-2xl flex flex-col items-center min-w-[300px]">
          <div className="w-full flex items-center justify-between text-xs mb-1.5">
            <span className="flex items-center gap-1.5 font-bold text-slate-200 text-xs">
              <Zap className={`w-4 h-4 ${flightState.isBoosting ? 'text-violet-400 animate-bounce' : 'text-cyan-400'}`} />
              Thoracic Boost Reserve
            </span>
            <span className="font-mono-numbers text-xs font-semibold text-slate-300">
              {flightState.boostEnergy}%
            </span>
          </div>

          <div className="w-full h-2.5 bg-slate-900 rounded-full overflow-hidden p-0.5 border border-white/10">
            <div
              className={`h-full rounded-full transition-all duration-75 ${
                flightState.isBoosting
                  ? 'bg-gradient-to-r from-violet-500 via-fuchsia-400 to-pink-400 shadow-md shadow-fuchsia-500/50'
                  : 'bg-gradient-to-r from-cyan-500 to-blue-400'
              }`}
              style={{ width: `${flightState.boostEnergy}%` }}
            />
          </div>

          <div className="text-[10px] text-slate-400 mt-1.5 flex items-center gap-1.5">
            <span>Hold <kbd className="px-1.5 py-0.5 bg-white/10 rounded text-[9px] text-white">Left Click</kbd> or <kbd className="px-1.5 py-0.5 bg-white/10 rounded text-[9px] text-white">Shift</kbd> to Boost</span>
          </div>
        </div>

        {/* Right: Controls Helper */}
        <div className="bg-black/55 backdrop-blur-md border border-white/15 rounded-xl p-3.5 shadow-2xl text-[11px] text-slate-300 space-y-1">
          <div className="text-[10px] text-cyan-400 uppercase tracking-wider font-bold mb-1 flex items-center gap-1">
            <MousePointer2 className="w-3 h-3" />
            Flight Controls
          </div>
          <div className="text-slate-300">
            <span className="text-white font-semibold">Mouse:</span> Steer Direction
          </div>
          <div className="text-slate-300">
            <span className="text-white font-semibold">W / S:</span> Pitch Dive / Climb
          </div>
          <div className="text-slate-300">
            <span className="text-white font-semibold">A / D:</span> Bank Left / Right
          </div>
          <div className="text-slate-300">
            <span className="text-white font-semibold">E / C:</span> Ascend / Descend
          </div>
        </div>
      </div>
    </div>
  );
};
