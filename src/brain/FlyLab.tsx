import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  ConditionId,
  FlyLabDataset,
  loadFlyLabData,
  ConditionDefinition,
} from './FlyLabData';
import { sound } from '../audio/SoundEngine';
import {
  Brain,
  Zap,
  Play,
  Pause,
  RotateCcw,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Info,
  ShieldCheck,
  Compass,
  ArrowRight,
  TrendingDown,
  Eye,
  Activity,
  Layers,
  ChevronRight,
  ExternalLink,
  Crosshair,
} from 'lucide-react';

interface FlyLabProps {
  onBackToMenu: () => void;
  onOpenBrainExplorer: () => void;
  onStartFlight: () => void;
  onOpenNeuralDodge?: () => void;
}

export const FlyLab: React.FC<FlyLabProps> = ({
  onBackToMenu,
  onOpenBrainExplorer,
  onStartFlight,
  onOpenNeuralDodge,
}) => {
  // Data loading state
  const [dataset, setDataset] = useState<FlyLabDataset | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Active experimental condition
  const [selectedConditionId, setSelectedConditionId] = useState<ConditionId>('intact');

  // Threat stimulation & playback state
  const [selectedFrameIndex, setSelectedFrameIndex] = useState<number>(3); // 0=6, 1=12, 2=20, 3=30
  const [isPlayingThreat, setIsPlayingThreat] = useState<boolean>(false);
  const [threatIntensity, setThreatIntensity] = useState<number>(1.0); // 0.5 to 1.5

  // Tab for bottom panel: 'summary' | 'matrix' | 'methods'
  const [activeTab, setActiveTab] = useState<'summary' | 'matrix' | 'methods'>('summary');

  // Interactive 2D neural network canvas ref
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // 1. Load pre-measured simulation data from baked.json
  useEffect(() => {
    let mounted = true;
    loadFlyLabData()
      .then((data) => {
        if (mounted) {
          setDataset(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (mounted) {
          setLoadError(err instanceof Error ? err.message : 'Failed to load baked.json');
          setLoading(false);
        }
      });
    return () => {
      mounted = false;
    };
  }, []);

  // 2. Playback timer for looming threat stimulus
  useEffect(() => {
    if (!isPlayingThreat || !dataset) return;

    const interval = setInterval(() => {
      setSelectedFrameIndex((prev) => {
        if (prev >= dataset.frames.length - 1) {
          setIsPlayingThreat(false);
          sound.playEscapeTrigger();
          return dataset.frames.length - 1;
        }
        return prev + 1;
      });
    }, 450);

    return () => clearInterval(interval);
  }, [isPlayingThreat, dataset]);

  // Current active condition definition
  const currentCondition: ConditionDefinition | null = useMemo(() => {
    if (!dataset) return null;
    return dataset.conditions[selectedConditionId] || dataset.conditions.intact;
  }, [dataset, selectedConditionId]);

  // Current frame metrics
  const currentFrame = useMemo(() => {
    if (!currentCondition) return null;
    return currentCondition.frames[selectedFrameIndex] || currentCondition.frames[0];
  }, [currentCondition, selectedFrameIndex]);

  // Intact baseline for comparisons
  const intactCondition = useMemo(() => {
    if (!dataset) return null;
    return dataset.conditions.intact;
  }, [dataset]);

  // 3. Render 2D Anatomical Circuit Schematic on Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !currentCondition || !dataset) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    // Clear background
    ctx.fillStyle = '#080c16';
    ctx.fillRect(0, 0, width, height);

    // Subtle background grid
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
    ctx.lineWidth = 1;
    const gridSize = 24;
    for (let x = 0; x < width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y < height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Circuit Nodes Definitions
    // 1. Compound Eye Retina (Photoreceptors)
    // 2. Lobula Columns (LC4, LPLC2, LC11, LC6)
    // 3. Central Neuropil / PVLP Glomeruli
    // 4. Giant Fiber (GF) Descending Motor Command
    // 5. Mesothoracic Motor Neurons / Leg Extension
    const nodes = {
      retina: { x: width * 0.12, y: height * 0.5, r: 24, label: 'Compound Eye\nRetina (R1-R8)' },
      lc4: {
        x: width * 0.35,
        y: height * 0.26,
        r: 20,
        label: 'LC4 Looming\nLobula Col.',
        isAblated: selectedConditionId === 'lc4',
        type: 'lc4',
      },
      lplc2: {
        x: width * 0.35,
        y: height * 0.44,
        r: 18,
        label: 'LPLC2 Outward\nLobula Plate',
        isAblated: selectedConditionId === 'lplc2',
        type: 'lplc2',
      },
      lc11: {
        x: width * 0.35,
        y: height * 0.65,
        r: 16,
        label: 'LC11 Spot\n(Control)',
        isAblated: selectedConditionId === 'lc11',
        type: 'lc11',
      },
      lc6: {
        x: width * 0.35,
        y: height * 0.84,
        r: 16,
        label: 'LC6 Edge\n(Control)',
        isAblated: selectedConditionId === 'lc6',
        type: 'lc6',
      },
      gf: {
        x: width * 0.68,
        y: height * 0.35,
        r: 26,
        label: 'Giant Fiber (GF)\nEscape Command',
      },
      avlp: {
        x: width * 0.68,
        y: height * 0.78,
        r: 20,
        label: 'AVLP Glomeruli\n(Courtship/Steer)',
      },
      motor: {
        x: width * 0.90,
        y: height * 0.35,
        r: 22,
        label: 'Leg Extensor\nLaunch Jump',
      },
    };

    // Calculate dynamic signal activity based on selected frame and condition
    const frameFactor = (selectedFrameIndex + 1) / 4; // 0.25 to 1.0
    const lc4Activity = nodes.lc4.isAblated ? 0 : 0.95 * frameFactor;
    const lplc2Activity = nodes.lplc2.isAblated ? 0 : 0.75 * frameFactor;
    const lc11Activity = 0.15; // Low under looming expansion
    const lc6Activity = 0.45 * frameFactor;

    // GF excitation is sum of LC4 + LPLC2
    const gfExcitation = currentCondition.escapeSignal * frameFactor;
    const spikeThreshold = 0.5;
    const isSpiking = gfExcitation >= spikeThreshold;

    // Helper: Draw Synaptic Edge
    const drawSynapse = (
      from: { x: number; y: number },
      to: { x: number; y: number },
      activity: number,
      color: string,
      isCut: boolean = false,
      dashed: boolean = false
    ) => {
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(from.x, from.y);
      ctx.lineTo(to.x, to.y);

      if (isCut) {
        ctx.strokeStyle = 'rgba(239, 68, 68, 0.4)';
        ctx.setLineDash([4, 4]);
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Draw red "X" cut marker in center
        const mx = (from.x + to.x) / 2;
        const my = (from.y + to.y) / 2;
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(mx - 6, my - 6);
        ctx.lineTo(mx + 6, my + 6);
        ctx.moveTo(mx + 6, my - 6);
        ctx.lineTo(mx - 6, my + 6);
        ctx.stroke();
      } else {
        ctx.strokeStyle = activity > 0.1 ? color : 'rgba(255, 255, 255, 0.12)';
        ctx.lineWidth = activity > 0.1 ? 1.5 + activity * 3.5 : 1;
        if (dashed) ctx.setLineDash([4, 4]);
        ctx.stroke();

        // If active, draw traveling electric pulses
        if (activity > 0.15) {
          const pulseCount = 3;
          const time = Date.now() * 0.003;
          for (let p = 0; p < pulseCount; p++) {
            const t = ((time + p / pulseCount) % 1);
            const px = from.x + (to.x - from.x) * t;
            const py = from.y + (to.y - from.y) * t;
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(px, py, 2.5 * activity, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }
      ctx.restore();
    };

    // Draw Synapses
    // Retina -> Lobula Columns
    drawSynapse(nodes.retina, nodes.lc4, lc4Activity, '#f43f5e', nodes.lc4.isAblated);
    drawSynapse(nodes.retina, nodes.lplc2, lplc2Activity, '#f59e0b', nodes.lplc2.isAblated);
    drawSynapse(nodes.retina, nodes.lc11, lc11Activity, '#06b6d4', nodes.lc11.isAblated);
    drawSynapse(nodes.retina, nodes.lc6, lc6Activity, '#8b5cf6', nodes.lc6.isAblated);

    // Lobula Columns -> Giant Fiber (Primary & Secondary Escape Pathway)
    drawSynapse(nodes.lc4, nodes.gf, lc4Activity, '#f43f5e', nodes.lc4.isAblated);
    drawSynapse(nodes.lplc2, nodes.gf, lplc2Activity, '#f59e0b', nodes.lplc2.isAblated);

    // Controls -> AVLP (Non-escape pathways)
    drawSynapse(nodes.lc11, nodes.avlp, lc11Activity, '#06b6d4', nodes.lc11.isAblated, true);
    drawSynapse(nodes.lc6, nodes.avlp, lc6Activity, '#8b5cf6', nodes.lc6.isAblated, true);

    // Giant Fiber -> Motor Output (Jump Takeoff)
    drawSynapse(
      nodes.gf,
      nodes.motor,
      isSpiking ? gfExcitation : 0,
      isSpiking ? '#10b981' : '#64748b'
    );

    // Draw Nodes
    Object.entries(nodes).forEach(([key, n]) => {
      ctx.save();
      const isAblated = 'isAblated' in n && n.isAblated;

      // Glow effect if active
      let nodeColor = '#334155';
      let glowColor = 'transparent';
      let activityLevel = 0.2;

      if (key === 'retina') {
        nodeColor = '#38bdf8';
        glowColor = 'rgba(56, 189, 248, 0.4)';
        activityLevel = 0.9;
      } else if (key === 'lc4') {
        nodeColor = isAblated ? '#7f1d1d' : '#f43f5e';
        glowColor = isAblated ? 'transparent' : 'rgba(244, 63, 94, 0.5)';
        activityLevel = lc4Activity;
      } else if (key === 'lplc2') {
        nodeColor = isAblated ? '#78350f' : '#f59e0b';
        glowColor = isAblated ? 'transparent' : 'rgba(245, 158, 11, 0.5)';
        activityLevel = lplc2Activity;
      } else if (key === 'lc11') {
        nodeColor = isAblated ? '#164e63' : '#06b6d4';
        glowColor = isAblated ? 'transparent' : 'rgba(6, 182, 212, 0.4)';
        activityLevel = lc11Activity;
      } else if (key === 'lc6') {
        nodeColor = isAblated ? '#312e81' : '#8b5cf6';
        glowColor = isAblated ? 'transparent' : 'rgba(139, 92, 246, 0.4)';
        activityLevel = lc6Activity;
      } else if (key === 'gf') {
        nodeColor = isSpiking ? '#10b981' : '#475569';
        glowColor = isSpiking ? 'rgba(16, 185, 129, 0.6)' : 'transparent';
        activityLevel = gfExcitation;
      } else if (key === 'motor') {
        nodeColor = isSpiking ? '#10b981' : '#334155';
        glowColor = isSpiking ? 'rgba(16, 185, 129, 0.6)' : 'transparent';
        activityLevel = isSpiking ? 1.0 : 0;
      }

      if (glowColor !== 'transparent' && activityLevel > 0.2) {
        ctx.shadowColor = glowColor;
        ctx.shadowBlur = 14 * activityLevel;
      }

      // Circle Body
      ctx.beginPath();
      ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
      ctx.fillStyle = nodeColor;
      ctx.fill();
      ctx.lineWidth = isAblated ? 2 : 1.5;
      ctx.strokeStyle = isAblated ? '#ef4444' : '#ffffff';
      ctx.stroke();

      // If ablated, cross line
      if (isAblated) {
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(n.x - n.r * 0.7, n.y - n.r * 0.7);
        ctx.lineTo(n.x + n.r * 0.7, n.y + n.r * 0.7);
        ctx.stroke();
      }

      // Label text
      ctx.shadowBlur = 0;
      ctx.fillStyle = isAblated ? '#fca5a5' : '#e2e8f0';
      ctx.font = '10px monospace';
      ctx.textAlign = 'center';
      const lines = n.label.split('\n');
      lines.forEach((l, idx) => {
        ctx.fillText(l, n.x, n.y + n.r + 14 + idx * 11);
      });

      ctx.restore();
    });

    // Draw Spike Indicator on Giant Fiber
    ctx.save();
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    if (isSpiking) {
      ctx.fillStyle = '#34d399';
      ctx.fillText('⚡ ACTION POTENTIAL FIRED', nodes.gf.x, nodes.gf.y - nodes.gf.r - 8);
    } else {
      ctx.fillStyle = '#94a3b8';
      ctx.fillText(
        `Sub-threshold (${(gfExcitation * 100).toFixed(0)}% < 50%)`,
        nodes.gf.x,
        nodes.gf.y - nodes.gf.r - 8
      );
    }
    ctx.restore();
  }, [selectedConditionId, selectedFrameIndex, currentCondition, dataset]);

  if (loading) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-[#060810] text-slate-100 p-6 select-none">
        <div className="w-16 h-16 relative flex items-center justify-center mb-4">
          <div className="absolute inset-0 rounded-full border-2 border-cyan-500/20 border-t-cyan-400 animate-spin" />
          <Brain className="w-8 h-8 text-cyan-400 animate-pulse" />
        </div>
        <h2 className="font-display font-bold text-xl text-white mb-2">
          Loading FLYLAB Neural Simulation
        </h2>
        <p className="text-xs text-slate-400 font-mono">
          Decoding verified Drosophila looming dataset (/data/baked.json)...
        </p>
      </div>
    );
  }

  if (loadError || !dataset || !currentCondition) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-[#060810] text-slate-100 p-6 select-none">
        <div className="p-6 bg-red-950/70 border border-red-500/50 rounded-2xl max-w-md text-center shadow-2xl">
          <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-3" />
          <h2 className="font-display font-bold text-lg text-white mb-2">
            Failed to Load FLYLAB Data
          </h2>
          <p className="text-xs text-slate-300 font-mono mb-4">{loadError}</p>
          <button
            onClick={onBackToMenu}
            className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-semibold"
          >
            Return to Menu
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full bg-[#060810] text-slate-100 flex flex-col overflow-hidden select-none font-sans">
      {/* 1. Header & Navigation Bar */}
      <header className="relative z-20 px-6 py-3.5 border-b border-white/10 bg-slate-950/80 backdrop-blur-md flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-rose-500/20 to-cyan-500/20 border border-cyan-500/40 flex items-center justify-center shadow-lg shadow-cyan-500/10">
              <Zap className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-display font-bold text-base text-white tracking-wide">
                  FLYLAB: Broken Escape Circuit
                </h1>
                <span className="text-[10px] uppercase font-mono tracking-wider px-2 py-0.5 rounded-full bg-cyan-950/60 border border-cyan-500/40 text-cyan-300">
                  Looming Dissection
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Ablation experiments investigating visual-to-motor giant fiber escape transmission
              </p>
            </div>
          </div>
        </div>

        {/* Global Navigation Shortcuts */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              sound.playUiClick();
              onOpenBrainExplorer();
            }}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold text-cyan-300 bg-cyan-950/50 border border-cyan-500/30 hover:bg-cyan-900/60 transition-all flex items-center gap-1.5 cursor-pointer"
            title="Return to 3D Connectome Lab"
          >
            <Compass className="w-3.5 h-3.5 text-cyan-400" />
            <span>← 1. 3D Brain Lab</span>
          </button>

          {onOpenNeuralDodge && (
            <button
              onClick={() => {
                sound.playUiClick();
                onOpenNeuralDodge();
              }}
              className="px-3.5 py-1.5 rounded-lg text-xs font-bold text-black bg-gradient-to-r from-amber-400 to-orange-400 hover:from-white hover:to-amber-300 transition-all flex items-center gap-1.5 cursor-pointer shadow-md shadow-amber-500/25"
              title="Launch Neural Flight Challenge (Fly using neural circuit output)"
            >
              <Crosshair className="w-3.5 h-3.5 fill-black" />
              <span>3. FLY USING ITS BRAIN →</span>
            </button>
          )}

          <button
            onClick={() => {
              sound.playUiClick();
              onStartFlight();
            }}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-300 bg-white/5 border border-white/10 hover:bg-white/10 hover:text-white transition-all flex items-center gap-1.5 cursor-pointer"
            title="Launch Manual 3D Fruit Fly Flight Simulation"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>4. Manual Flight</span>
          </button>
        </div>
      </header>

      {/* 2. Experimental Condition Selector Ribbon */}
      <div className="px-6 py-2.5 bg-slate-900/60 border-b border-white/5 flex items-center justify-between gap-3 overflow-x-auto">
        <div className="flex items-center gap-2 text-xs text-slate-400 font-semibold whitespace-nowrap">
          <Layers className="w-3.5 h-3.5 text-cyan-400" />
          <span>Ablation Condition:</span>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto py-0.5">
          {dataset.conditionList.map((cond) => {
            const isSelected = selectedConditionId === cond.id;
            return (
              <button
                key={cond.id}
                onClick={() => {
                  setSelectedConditionId(cond.id);
                  if (cond.id === 'intact') {
                    sound.playUiClick();
                  } else {
                    sound.playLaserAblate();
                  }
                }}
                className={`group px-3.5 py-1.5 rounded-xl border text-xs font-semibold transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
                  isSelected
                    ? 'bg-slate-800 text-white shadow-lg border-white/30 ring-1 ring-white/20'
                    : 'bg-black/30 border-white/10 text-slate-400 hover:text-slate-200 hover:bg-white/5'
                }`}
                style={{
                  borderColor: isSelected ? cond.color : undefined,
                }}
              >
                <span
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: cond.color }}
                />
                <span>{cond.name}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${
                    cond.signalDeltaPercent === 0
                      ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-500/30'
                      : cond.signalDeltaPercent < -50
                      ? 'bg-rose-950/80 text-rose-300 border border-rose-500/30'
                      : 'bg-amber-950/80 text-amber-300 border border-amber-500/30'
                  }`}
                >
                  {cond.signalDeltaPercent === 0
                    ? '0.0%'
                    : `${cond.signalDeltaPercent.toFixed(1)}%`}
                </span>
              </button>
            );
          })}
        </div>

        <div className="hidden lg:flex items-center gap-1.5 text-[11px] text-slate-400 whitespace-nowrap font-mono bg-black/40 px-2.5 py-1 rounded-md border border-white/5">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>Ref: baked.json (FlyWire v1.0)</span>
        </div>
      </div>

      {/* 2b. Plain-English Summary Ribbon: Exactly 1 plain sentence per condition */}
      <div className="px-6 py-2 bg-slate-950/90 border-b border-white/5 flex items-center justify-between gap-4 text-xs">
        <div className="flex items-center gap-2.5 min-w-0">
          <span
            className="w-2 h-2 rounded-full shrink-0 animate-pulse"
            style={{ backgroundColor: currentCondition.color }}
          />
          <span className="font-bold text-white shrink-0">{currentCondition.shortName}:</span>
          <span className="text-slate-300 truncate font-medium">{currentCondition.plainSummary}</span>
        </div>
        <div className="hidden md:flex items-center gap-3 text-[11px] font-mono text-slate-400 shrink-0">
          <span>Target: <span className="text-cyan-300 font-semibold">{currentCondition.targetNeuron}</span></span>
        </div>
      </div>

      {/* 3. Main Dual-Workspace Content Grid */}
      <div className="flex-1 overflow-y-auto p-5 grid grid-cols-1 lg:grid-cols-12 gap-5 min-h-0">
        {/* Left Column (7 cols): Visual Stimulus, Circuit Schematic, and Time-Series Graph */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          {/* Top Panel: Interactive Looming Threat Stimulator */}
          <div className="bg-slate-950/80 border border-white/10 rounded-2xl p-4 shadow-xl flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-cyan-400" />
                <h2 className="text-xs uppercase tracking-wider font-bold text-slate-200">
                  Looming Visual Stimulus Simulator
                </h2>
              </div>

              {/* Playback & Frame Scrubber */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    if (isPlayingThreat) {
                      setIsPlayingThreat(false);
                    } else {
                      setSelectedFrameIndex(0);
                      setIsPlayingThreat(true);
                      sound.playThreatPulse();
                    }
                  }}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                    isPlayingThreat
                      ? 'bg-amber-500 text-black hover:bg-amber-400'
                      : 'bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 hover:bg-cyan-500/30'
                  }`}
                >
                  {isPlayingThreat ? (
                    <>
                      <Pause className="w-3.5 h-3.5 fill-current" />
                      <span>Pause</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>Trigger Looming Attack</span>
                    </>
                  )}
                </button>

                <button
                  onClick={() => {
                    setSelectedFrameIndex(0);
                    sound.playUiClick();
                  }}
                  className="p-1 text-slate-400 hover:text-white rounded hover:bg-white/5"
                  title="Reset Frame"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Stimulus Visual Field Canvas Simulation */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center bg-black/50 p-3 rounded-xl border border-white/5">
              {/* Ommatidia Eye View */}
              <div className="sm:col-span-5 relative aspect-square max-h-44 w-full mx-auto rounded-xl overflow-hidden bg-[#050810] border border-cyan-500/30 flex items-center justify-center">
                {/* Hexagonal Ommatidia Texture */}
                <div
                  className="absolute inset-0 opacity-25"
                  style={{
                    backgroundImage: `radial-gradient(circle, rgba(0, 242, 254, 0.25) 1px, transparent 1px)`,
                    backgroundSize: '12px 12px',
                  }}
                />

                {/* Approaching Dark Predator Disc */}
                {(() => {
                  const frameSizes = [36, 68, 108, 150]; // pixel radius
                  const currentRadius = frameSizes[selectedFrameIndex] || 50;
                  return (
                    <div
                      className="relative rounded-full transition-all duration-300 ease-out flex items-center justify-center shadow-2xl"
                      style={{
                        width: `${currentRadius}px`,
                        height: `${currentRadius}px`,
                        backgroundColor: '#000000',
                        border: '2px solid rgba(244, 63, 94, 0.7)',
                        boxShadow: '0 0 25px rgba(244, 63, 94, 0.4)',
                      }}
                    >
                      <span className="text-[9px] font-mono font-bold text-rose-400 uppercase tracking-wider text-center">
                        Predator Disc
                      </span>
                    </div>
                  );
                })()}

                {/* Optical Reticle Crosshair */}
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                  <div className="w-full h-px bg-cyan-500/20" />
                  <div className="h-full w-px bg-cyan-500/20 absolute" />
                  <div className="w-16 h-16 rounded-full border border-cyan-500/30" />
                </div>

                <div className="absolute bottom-1.5 left-2 text-[9px] font-mono text-cyan-400/80">
                  Left Eye Field
                </div>
              </div>

              {/* Threat Telemetry & Frame Stepper */}
              <div className="sm:col-span-7 flex flex-col justify-between h-full gap-2 text-xs">
                <div>
                  <div className="flex items-center justify-between text-slate-300 font-mono text-[11px] mb-1">
                    <span>Stimulus Frame:</span>
                    <span className="text-cyan-400 font-bold">
                      Frame {currentFrame?.frame || 6} / 30 ({currentFrame?.timeMs || 100} ms)
                    </span>
                  </div>

                  {/* 4 Discrete Frame Step Buttons */}
                  <div className="grid grid-cols-4 gap-1.5 mb-2">
                    {dataset.frames.map((frameNum, idx) => (
                      <button
                        key={frameNum}
                        onClick={() => {
                          setSelectedFrameIndex(idx);
                          sound.playUiClick();
                        }}
                        className={`py-1.5 px-1 rounded-lg text-center font-mono text-[10px] transition-all cursor-pointer ${
                          selectedFrameIndex === idx
                            ? 'bg-cyan-500 text-black font-bold shadow-md shadow-cyan-500/20'
                            : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white'
                        }`}
                      >
                        <div>F{frameNum}</div>
                        <div className="text-[9px] opacity-80">
                          {frameNum === 6
                            ? '100ms'
                            : frameNum === 12
                            ? '200ms'
                            : frameNum === 20
                            ? '333ms'
                            : '500ms'}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Subtended Visual Angle & Expansion Speed */}
                <div className="grid grid-cols-2 gap-2 text-[11px] bg-slate-900/80 p-2.5 rounded-lg border border-white/5">
                  <div>
                    <div className="text-slate-400 text-[10px]">Subtended Angle θ:</div>
                    <div className="font-mono text-white font-bold text-sm">
                      {selectedFrameIndex === 0
                        ? '18.4°'
                        : selectedFrameIndex === 1
                        ? '36.8°'
                        : selectedFrameIndex === 2
                        ? '62.0°'
                        : '89.5°'}
                    </div>
                  </div>
                  <div>
                    <div className="text-slate-400 text-[10px]">Expansion Rate (dθ/dt):</div>
                    <div className="font-mono text-rose-400 font-bold text-sm">
                      {selectedFrameIndex === 0
                        ? '140 °/s'
                        : selectedFrameIndex === 1
                        ? '320 °/s'
                        : selectedFrameIndex === 2
                        ? '780 °/s'
                        : '1,450 °/s'}
                    </div>
                  </div>
                </div>

                <div className="text-[10px] text-slate-400 leading-tight">
                  <span className="font-semibold text-slate-200">Threat stimulus:</span>{' '}
                  Rapid optical looming expansion activating Lobula Columnar detectors LC4 & LPLC2.
                </div>
              </div>
            </div>
          </div>

          {/* Center Panel: Interactive Circuit Schematic Canvas */}
          <div className="bg-slate-950/80 border border-white/10 rounded-2xl p-4 shadow-xl flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-emerald-400" />
                <h2 className="text-xs uppercase tracking-wider font-bold text-slate-200">
                  Synaptic Circuit Architecture & Giant Fiber Output
                </h2>
              </div>
              <span className="text-[10px] font-mono text-slate-400">
                Live State: {currentCondition.shortName}
              </span>
            </div>

            <div className="relative w-full h-52 rounded-xl overflow-hidden border border-white/10 bg-[#080c16]">
              <canvas
                ref={canvasRef}
                className="w-full h-full block"
              />
            </div>
          </div>

          {/* Bottom Panel: Activity Time-Series Graph */}
          <div className="bg-slate-950/80 border border-white/10 rounded-2xl p-4 shadow-xl flex flex-col gap-2">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <TrendingDown className="w-4 h-4 text-cyan-400" />
                <h2 className="text-xs uppercase tracking-wider font-bold text-slate-200">
                  Population Neural Excitation Time-Series (Frames 6–30)
                </h2>
              </div>
              <div className="flex items-center gap-3 text-[10px] font-mono">
                <div className="flex items-center gap-1">
                  <span className="w-2.5 h-0.5 bg-emerald-400 inline-block" />
                  <span className="text-slate-300">Intact Baseline</span>
                </div>
                <div className="flex items-center gap-1">
                  <span
                    className="w-2.5 h-0.5 inline-block"
                    style={{ backgroundColor: currentCondition.color }}
                  />
                  <span className="text-slate-300">{currentCondition.shortName}</span>
                </div>
              </div>
            </div>

            {/* SVG Line Graph */}
            <div className="w-full h-36 relative bg-black/40 rounded-xl p-2 border border-white/5">
              <svg
                className="w-full h-full overflow-visible"
                viewBox="0 0 400 100"
                preserveAspectRatio="none"
              >
                {/* Horizontal grid lines */}
                <line x1="0" y1="20" x2="400" y2="20" stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" />
                <line x1="0" y1="50" x2="400" y2="50" stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" />
                <line x1="0" y1="80" x2="400" y2="80" stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" />

                {/* Baseline intact path (max active neurons = 938, min = 680) */}
                {(() => {
                  if (!intactCondition) return null;
                  const baselinePoints = intactCondition.frames.map((f, i) => {
                    const x = 30 + i * 110;
                    // scale activeCount: 938 -> y=20, 200 -> y=85
                    const y = 85 - ((f.activeCount - 200) / 750) * 65;
                    return `${x},${y}`;
                  }).join(' ');

                  const condPoints = currentCondition.frames.map((f, i) => {
                    const x = 30 + i * 110;
                    const y = 85 - ((f.activeCount - 200) / 750) * 65;
                    return `${x},${y}`;
                  }).join(' ');

                  return (
                    <>
                      {/* Baseline dashed curve */}
                      <polyline
                        fill="none"
                        stroke="#10b981"
                        strokeWidth="2"
                        strokeDasharray="4 4"
                        opacity="0.6"
                        points={baselinePoints}
                      />

                      {/* Current condition curve */}
                      <polyline
                        fill="none"
                        stroke={currentCondition.color}
                        strokeWidth="2.5"
                        points={condPoints}
                      />

                      {/* Current condition dots */}
                      {currentCondition.frames.map((f, i) => {
                        const x = 30 + i * 110;
                        const y = 85 - ((f.activeCount - 200) / 750) * 65;
                        const isCurrentFrame = selectedFrameIndex === i;
                        return (
                          <g key={i}>
                            <circle
                              cx={x}
                              cy={y}
                              r={isCurrentFrame ? 5 : 3.5}
                              fill={currentCondition.color}
                              stroke="#ffffff"
                              strokeWidth={isCurrentFrame ? 2 : 1}
                            />
                            {/* Value label */}
                            <text
                              x={x}
                              y={y - 8}
                              fontSize="9"
                              fontFamily="monospace"
                              fill="#cbd5e1"
                              textAnchor="middle"
                            >
                              {f.activeCount}
                            </text>
                          </g>
                        );
                      })}
                    </>
                  );
                })()}
              </svg>

              {/* X Axis Labels */}
              <div className="flex justify-between px-6 pt-1 text-[9px] font-mono text-slate-400">
                <span>F6 (100ms)</span>
                <span>F12 (200ms)</span>
                <span>F20 (333ms)</span>
                <span>F30 (500ms Decision)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column (5 cols): Prominent Escape Outcome, Signal Meter & Secondary Tabs */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          {/* 1. PROMINENT ESCAPE OUTCOME HERO CARD */}
          <div
            className={`p-4 rounded-2xl border flex items-center justify-between gap-4 shadow-xl transition-all ${
              currentCondition.outcomeLabel === 'Escaped'
                ? 'bg-gradient-to-br from-emerald-950/70 via-slate-950/80 to-slate-950/90 border-emerald-500/50 text-emerald-200 shadow-emerald-500/10'
                : currentCondition.outcomeLabel === 'Delayed Escape'
                ? 'bg-gradient-to-br from-amber-950/70 via-slate-950/80 to-slate-950/90 border-amber-500/50 text-amber-200 shadow-amber-500/10'
                : 'bg-gradient-to-br from-rose-950/80 via-slate-950/80 to-slate-950/90 border-rose-500/60 text-rose-200 shadow-rose-500/20'
            }`}
          >
            <div className="flex items-center gap-3.5">
              <div
                className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border ${
                  currentCondition.outcomeLabel === 'Escaped'
                    ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
                    : currentCondition.outcomeLabel === 'Delayed Escape'
                    ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
                    : 'bg-rose-500/20 border-rose-500/50 text-rose-300'
                }`}
              >
                {currentCondition.outcomeLabel === 'Escaped' ? (
                  <CheckCircle2 className="w-7 h-7 text-emerald-400" />
                ) : currentCondition.outcomeLabel === 'Delayed Escape' ? (
                  <AlertTriangle className="w-7 h-7 text-amber-400" />
                ) : (
                  <XCircle className="w-7 h-7 text-rose-400" />
                )}
              </div>
              <div>
                <div className="text-[10px] font-mono uppercase tracking-widest text-slate-400">
                  Escape Outcome
                </div>
                <div
                  className={`text-2xl font-black font-display tracking-tight uppercase ${
                    currentCondition.outcomeLabel === 'Escaped'
                      ? 'text-emerald-400'
                      : currentCondition.outcomeLabel === 'Delayed Escape'
                      ? 'text-amber-400'
                      : 'text-rose-400'
                  }`}
                >
                  {currentCondition.outcomeLabel}
                </div>
                <p className="text-xs text-slate-300 mt-0.5 font-medium">
                  {currentCondition.outcomeLabel === 'Escaped'
                    ? 'Giant Fiber fired — ballistic escape jump launched in time!'
                    : currentCondition.outcomeLabel === 'Delayed Escape'
                    ? 'Weakened synergy — takeoff is delayed (~30ms late) and erratic.'
                    : 'Signal collapsed below threshold — fly remains frozen and gets caught!'}
                </p>
              </div>
            </div>

            <div className="text-right shrink-0">
              <span
                className={`text-[10px] font-mono px-2 py-1 rounded-lg border font-semibold ${currentCondition.badgeColor}`}
              >
                {currentCondition.badge}
              </span>
            </div>
          </div>

          {/* Action Step: Enter Neural Flight Challenge */}
          {onOpenNeuralDodge && (
            <button
              onClick={() => {
                sound.playUiClick();
                onOpenNeuralDodge();
              }}
              className="w-full py-3.5 px-4 rounded-xl font-display font-extrabold text-xs text-black bg-gradient-to-r from-amber-400 via-orange-400 to-amber-300 hover:from-white hover:to-amber-200 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-amber-500/30 tracking-wide uppercase"
            >
              <Crosshair className="w-4 h-4 fill-black" />
              <span>FLY USING ITS BRAIN (Neural Flight Challenge)</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}

          {/* 2. ESCAPE SIGNAL & MOTOR THRESHOLD CARD */}
          <div className="bg-slate-950/80 border border-white/10 rounded-2xl p-4 shadow-xl flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                Descending Motor Output (GF)
              </span>
              <span className="text-[10px] font-mono text-slate-400">
                Raw: <span className="text-cyan-400 font-bold">{currentCondition.escapeSignal.toFixed(6)}</span>
              </span>
            </div>

            {/* Metric Display */}
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="text-3xl font-display font-black text-white tracking-tight flex items-baseline gap-1.5">
                  <span>{(currentCondition.escapeSignal * 100).toFixed(1)}%</span>
                  <span className="text-xs text-slate-400 font-normal">Transmission</span>
                </div>
              </div>

              {/* Delta Badge */}
              <div className="text-right">
                <div
                  className={`text-lg font-bold font-mono ${
                    currentCondition.signalDeltaPercent === 0
                      ? 'text-emerald-400'
                      : currentCondition.signalDeltaPercent < -50
                      ? 'text-rose-400'
                      : 'text-amber-400'
                  }`}
                >
                  {currentCondition.signalDeltaPercent === 0
                    ? '0.0% Δ'
                    : `${currentCondition.signalDeltaPercent.toFixed(1)}% Δ`}
                </div>
                <div className="text-[10px] text-slate-400">vs Intact Baseline</div>
              </div>
            </div>

            {/* Progress Bar with Action Potential Cutoff (50%) */}
            <div className="space-y-1">
              <div className="relative w-full h-3.5 bg-slate-900 rounded-full overflow-hidden border border-white/10">
                <div
                  className="h-full transition-all duration-500 rounded-full"
                  style={{
                    width: `${Math.min(100, currentCondition.escapeSignal * 100)}%`,
                    backgroundColor: currentCondition.color,
                  }}
                />
                {/* 50% Threshold marker */}
                <div
                  className="absolute top-0 bottom-0 w-0.5 bg-rose-400"
                  style={{ left: '50%' }}
                  title="50% Action Potential Spike Threshold"
                />
              </div>

              <div className="flex justify-between text-[9px] font-mono text-slate-400">
                <span>0.00 (Silent)</span>
                <span className="text-rose-400 font-semibold">50% Spike Cutoff</span>
                <span>1.00 (Full Max)</span>
              </div>
            </div>
          </div>

          {/* 3. SECONDARY TABS: Quick Summary, Comparison Matrix, Methodology */}
          <div className="bg-slate-950/80 border border-white/10 rounded-2xl p-4 shadow-xl flex-1 flex flex-col gap-3 min-h-[280px]">
            {/* Tab Header */}
            <div className="flex items-center gap-1.5 border-b border-white/10 pb-2">
              <button
                onClick={() => {
                  setActiveTab('summary');
                  sound.playUiClick();
                }}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                  activeTab === 'summary'
                    ? 'bg-white/15 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Quick Take
              </button>
              <button
                onClick={() => {
                  setActiveTab('matrix');
                  sound.playUiClick();
                }}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                  activeTab === 'matrix'
                    ? 'bg-white/15 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Comparison Matrix
              </button>
              <button
                onClick={() => {
                  setActiveTab('methods');
                  sound.playUiClick();
                }}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                  activeTab === 'methods'
                    ? 'bg-white/15 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Methodology & Science
              </button>
            </div>

            {/* Tab 1: Quick Take (Beginner-friendly, clean visual cards) */}
            {activeTab === 'summary' && (
              <div className="space-y-2.5 text-xs overflow-y-auto pr-1">
                <div className="bg-black/30 p-2.5 rounded-xl border border-white/5 flex items-center justify-between">
                  <span className="text-slate-400 font-mono text-[11px]">Sensor Tested:</span>
                  <span className="font-mono text-cyan-300 font-bold">{currentCondition.targetNeuron}</span>
                </div>

                <div className="bg-black/20 p-2.5 rounded-xl border border-white/5 space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                    Visual Sensitivity
                  </span>
                  <p className="text-slate-300 text-[11px]">
                    {currentCondition.receptiveField}
                  </p>
                </div>

                <div className="bg-black/20 p-2.5 rounded-xl border border-white/5 grid grid-cols-2 gap-2 text-[11px]">
                  <div>
                    <span className="text-slate-400 text-[10px] block">Transmitter:</span>
                    <span className="text-amber-300 font-medium">{currentCondition.neurotransmitter}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] block">Downstream Circuit:</span>
                    <span className="text-emerald-300 font-medium">{currentCondition.synapticTarget}</span>
                  </div>
                </div>

                <div className="bg-black/20 p-2.5 rounded-xl border border-white/5 space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                    Behavioral Impact
                  </span>
                  <p className="text-slate-300 text-[11px] leading-relaxed">
                    {currentCondition.behavioralConsequence}
                  </p>
                </div>
              </div>
            )}

            {/* Tab 2: 5-Condition Comparison Matrix */}
            {activeTab === 'matrix' && (
              <div className="overflow-x-auto text-xs">
                <table className="w-full text-left border-collapse font-sans">
                  <thead>
                    <tr className="border-b border-white/10 text-[10px] text-slate-400 uppercase font-mono">
                      <th className="py-2 pr-2">Condition</th>
                      <th className="py-2 px-2 text-right">Signal</th>
                      <th className="py-2 px-2 text-right">Δ vs Intact</th>
                      <th className="py-2 px-2 text-right">Somas</th>
                      <th className="py-2 pl-2">Verdict</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 font-mono text-[11px]">
                    {dataset.conditionList.map((cond) => {
                      const isRowActive = selectedConditionId === cond.id;
                      return (
                        <tr
                          key={cond.id}
                          onClick={() => {
                            setSelectedConditionId(cond.id);
                            if (cond.id === 'intact') {
                              sound.playUiClick();
                            } else {
                              sound.playLaserAblate();
                            }
                          }}
                          className={`cursor-pointer transition-colors ${
                            isRowActive ? 'bg-cyan-500/15 text-white' : 'hover:bg-white/5 text-slate-300'
                          }`}
                        >
                          <td className="py-2 pr-2 font-semibold flex items-center gap-1.5">
                            <span
                              className="w-2 h-2 rounded-full"
                              style={{ backgroundColor: cond.color }}
                            />
                            <span>{cond.name}</span>
                          </td>
                          <td className="py-2 px-2 text-right">
                            {(cond.escapeSignal * 100).toFixed(1)}%
                          </td>
                          <td
                            className={`py-2 px-2 text-right font-bold ${
                              cond.signalDeltaPercent === 0
                                ? 'text-emerald-400'
                                : cond.signalDeltaPercent < -50
                                ? 'text-rose-400'
                                : 'text-amber-400'
                            }`}
                          >
                            {cond.signalDeltaPercent === 0
                              ? '0.0%'
                              : `${cond.signalDeltaPercent.toFixed(1)}%`}
                          </td>
                          <td className="py-2 px-2 text-right text-slate-400">
                            {cond.frames[3]?.activeCount || '-'}
                          </td>
                          <td className="py-2 pl-2 text-[10px]">
                            {cond.outcomeLabel === 'Escaped' ? (
                              <span className="text-emerald-400 font-sans font-semibold">Escaped</span>
                            ) : cond.outcomeLabel === 'Escape Failed' ? (
                              <span className="text-rose-400 font-sans font-semibold">Failed</span>
                            ) : (
                              <span className="text-amber-400 font-sans font-semibold">Delayed</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                <div className="mt-3 text-[10px] text-slate-400 bg-black/30 p-2 rounded-lg border border-white/5 text-center">
                  Click any condition above to instantaneously switch telemetry and visual circuits.
                </div>
              </div>
            )}

            {/* Tab 3: Detailed Neuroscience, Equations, Citations & Methodology */}
            {activeTab === 'methods' && (
              <div className="space-y-3 text-[11px] text-slate-300 overflow-y-auto pr-1 leading-relaxed">
                {/* Condition Biological Dossier */}
                <div className="p-2.5 rounded-lg bg-black/40 border border-white/5 space-y-1.5">
                  <div className="font-bold text-xs text-cyan-300 flex items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Biological Mechanism ({currentCondition.name})</span>
                  </div>
                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    {currentCondition.biologicalExplanation}
                  </p>
                </div>

                {/* Mathematical Model */}
                <div className="p-2.5 rounded-lg bg-black/40 border border-white/5 space-y-1.5">
                  <div className="font-semibold text-slate-200">
                    Dynamical Firing-Rate Equation:
                  </div>
                  <div className="p-2 rounded bg-slate-900/90 font-mono text-[10px] text-cyan-300 border border-white/5">
                    τ · dr_i/dt = -r_i + φ(∑ W_ij · r_j + I_ext)
                  </div>
                  <p className="text-[10px] text-slate-400">
                    Where <span className="font-mono text-slate-300">W_ij</span> represents synaptic
                    weights from the FlyWire male connectome, and{' '}
                    <span className="font-mono text-slate-300">I_ext</span> is external looming
                    excitation applied to the receptive fields of lobula columnar cells.
                  </p>
                </div>

                {/* Reference Simulation Attribution */}
                <div className="p-2.5 rounded-lg bg-black/40 border border-white/5 space-y-1">
                  <div className="font-bold text-xs text-white flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Reference Simulation Attribution</span>
                  </div>
                  <p className="text-[10px] text-slate-400">
                    Pre-measured simulation dataset directly loaded from{' '}
                    <code className="text-cyan-400">public/data/baked.json</code>. Originating from
                    the interactive Drosophila connectome engine at{' '}
                    <span className="text-slate-200">huggingface.co/spaces/VIDraft/fruitfly-brain</span>.
                  </p>
                  <p className="text-[10px] text-slate-400">
                    Data based on FlyWire / Janelia Male CNS Whole-Brain Connectome (141k neurons, 54M synapses).
                  </p>
                </div>

                {/* Model Assumptions & Limitations */}
                <div className="p-2.5 rounded-lg bg-black/40 border border-white/5 space-y-1">
                  <div className="font-semibold text-slate-200 text-xs">Model Assumptions & Limitations:</div>
                  <ul className="list-disc pl-4 space-y-0.5 text-[10px] text-slate-400">
                    <li>Single-compartment point-neuron model (no complex dendritic branching).</li>
                    <li>Threshold metric focuses on Giant Fiber (GF) descending motor command.</li>
                    <li>Static synaptic weights during the 500ms looming window.</li>
                  </ul>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
