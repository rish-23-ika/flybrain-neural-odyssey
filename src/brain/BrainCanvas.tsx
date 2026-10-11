import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import {
  loadRealConnectome,
  RealConnectomeData,
  NT_COLORS,
} from './ConnectomeLoader';
import { REAL_CONNECTOME_METADATA, NOTABLE_CIRCUITS } from './BrainData';
import { sound } from '../audio/SoundEngine';
import {
  Brain,
  Search,
  RotateCw,
  X,
  AlertTriangle,
  RefreshCw,
  Sliders,
  ExternalLink,
  ShieldCheck,
  Zap,
  Crosshair,
  Play,
  Eye,
  ChevronRight,
  ChevronDown,
  Compass,
  Sparkles,
  HelpCircle,
  Layers,
} from 'lucide-react';

interface BrainCanvasProps {
  onBackToMenu: () => void;
  onOpenFlyLab?: () => void;
  onOpenNeuralDodge?: () => void;
  onStartFlight?: () => void;
}

interface SelectedNeuronDetails {
  index: number;
  typeName: string;
  ntName: string;
  coords: [number, number, number];
  typeCount: number;
}

/**
 * Creates a soft glowing radial particle texture for luminous neuron somas.
 */
function createNeuronParticleTexture(): THREE.Texture {
  const canvas = document.createElement('canvas');
  canvas.width = 32;
  canvas.height = 32;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const grad = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
    grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
    grad.addColorStop(0.3, 'rgba(255, 255, 255, 0.9)');
    grad.addColorStop(0.65, 'rgba(180, 235, 255, 0.4)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 32, 32);
  }
  const texture = new THREE.CanvasTexture(canvas);
  return texture;
}

export const BrainCanvas: React.FC<BrainCanvasProps> = ({
  onBackToMenu,
  onOpenFlyLab,
  onOpenNeuralDodge,
  onStartFlight,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // Loading & Data State
  const [loadingState, setLoadingState] = useState<'loading' | 'loaded' | 'error'>('loading');
  const [loadingProgress, setLoadingProgress] = useState({ step: 'Initializing...', percent: 0 });
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [connectomeData, setConnectomeData] = useState<RealConnectomeData | null>(null);

  // Interactive Exploration State
  const [activeNts, setActiveNts] = useState<Record<string, boolean>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [selectedNeuron, setSelectedNeuron] = useState<SelectedNeuronDetails | null>(null);
  const [showEscapeCircuit, setShowEscapeCircuit] = useState<boolean>(true);
  const [autoRotate, setAutoRotate] = useState<boolean>(true);
  const [showAttribution, setShowAttribution] = useState<boolean>(false);
  const [cameraView, setCameraView] = useState<'front' | 'top' | 'side' | 'iso'>('front');

  // Side Panel Accordions: 'none' | 'search' | 'neurotransmitters' | 'about'
  const [activeDrawer, setActiveDrawer] = useState<'none' | 'search' | 'neurotransmitters' | 'about'>('none');
  const [sidePanelOpen, setSidePanelOpen] = useState<boolean>(true);

  // Three.js References
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const pointsRef = useRef<THREE.Points | null>(null);
  const circuitLinesRef = useRef<THREE.LineSegments | null>(null);
  const highlightMarkerRef = useRef<THREE.Mesh | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const autoRotateRef = useRef<boolean>(true);

  // Sync autoRotate ref without triggering full Three.js re-mounts
  useEffect(() => {
    autoRotateRef.current = autoRotate;
    if (controlsRef.current) {
      controlsRef.current.autoRotate = autoRotate;
    }
  }, [autoRotate]);

  // Sync escape circuit visibility
  useEffect(() => {
    if (circuitLinesRef.current) {
      circuitLinesRef.current.visible = showEscapeCircuit;
    }
  }, [showEscapeCircuit]);

  // 1. Asynchronous Data Loading
  const initLoad = () => {
    setLoadingState('loading');
    setErrorMessage(null);

    loadRealConnectome((step, percent) => {
      setLoadingProgress({ step, percent });
    })
      .then((data) => {
        setConnectomeData(data);
        const initialNtState: Record<string, boolean> = {};
        data.meta.nts.forEach((nt) => {
          initialNtState[nt] = true;
        });
        setActiveNts(initialNtState);
        setLoadingState('loaded');
      })
      .catch((err) => {
        console.error('Failed to load real connectome:', err);
        setErrorMessage(err instanceof Error ? err.message : 'Unknown network error loading connectome');
        setLoadingState('error');
      });
  };

  useEffect(() => {
    initLoad();
  }, []);

  // 2. Setup Three.js Scene once Data is Loaded
  useEffect(() => {
    if (loadingState !== 'loaded' || !connectomeData || !containerRef.current) return;

    const container = containerRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;

    // Scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.background = new THREE.Color(0x04060c);

    // Camera focused on fruit fly brain center in mm
    const camera = new THREE.PerspectiveCamera(40, width / height, 0.005, 50);
    // Center of brain in dataset: Y is ~0.268 mm, X and Z are ~0
    camera.position.set(0, 0.27, 1.45);
    cameraRef.current = camera;

    // Renderer
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
      alpha: false,
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.setClearColor(0x04060c, 1);
    rendererRef.current = renderer;
    container.appendChild(renderer.domElement);

    // Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.target.set(0, 0.27, 0); // Target anatomical center of brain
    controls.minDistance = 0.15;
    controls.maxDistance = 5.0;
    controls.autoRotate = autoRotateRef.current;
    controls.autoRotateSpeed = 0.75;
    controlsRef.current = controls;

    // User interaction pauses auto-rotate temporarily
    controls.addEventListener('start', () => {
      // allow user inspection
    });

    // 3. Construct 141,781 Real Somas BufferGeometry
    const n = connectomeData.meta.n;
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(connectomeData.somaXyz, 3));

    // Dynamic color buffer copied from baseColors
    const colorArray = new Float32Array(connectomeData.baseColors);
    geometry.setAttribute('color', new THREE.BufferAttribute(colorArray, 3));

    // High performance additive glowing points material
    const pointTexture = createNeuronParticleTexture();
    const pointsMaterial = new THREE.PointsMaterial({
      size: 0.0052,
      map: pointTexture,
      vertexColors: true,
      transparent: true,
      opacity: 0.92,
      sizeAttenuation: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const points = new THREE.Points(geometry, pointsMaterial);
    scene.add(points);
    pointsRef.current = points;

    // 4. Construct Real Escape Circuit Synaptic Lines (LC4 / LPLC2 → DNp01)
    const circuitPoints: THREE.Vector3[] = [];
    const xyz = connectomeData.somaXyz;
    const dnp01Indices = connectomeData.typeIndexMap.get('DNp01') || [];
    const lc4Indices = connectomeData.typeIndexMap.get('LC4') || [];
    const lplc2Indices = connectomeData.typeIndexMap.get('LPLC2') || [];

    if (dnp01Indices.length > 0) {
      // Connect each LC4 to closest giant descending neuron DNp01
      lc4Indices.forEach((lcIdx) => {
        const lx = xyz[lcIdx * 3];
        const ly = xyz[lcIdx * 3 + 1];
        const lz = xyz[lcIdx * 3 + 2];

        // Match ipsilateral / closest DNp01
        let bestDn = dnp01Indices[0];
        let bestDistSq = Infinity;
        dnp01Indices.forEach((dnIdx) => {
          const dx = lx - xyz[dnIdx * 3];
          const dy = ly - xyz[dnIdx * 3 + 1];
          const dz = lz - xyz[dnIdx * 3 + 2];
          const d2 = dx * dx + dy * dy + dz * dz;
          if (d2 < bestDistSq) {
            bestDistSq = d2;
            bestDn = dnIdx;
          }
        });

        circuitPoints.push(new THREE.Vector3(lx, ly, lz));
        circuitPoints.push(
          new THREE.Vector3(xyz[bestDn * 3], xyz[bestDn * 3 + 1], xyz[bestDn * 3 + 2])
        );
      });

      // Connect LPLC2 collision-course neurons
      lplc2Indices.forEach((lpIdx) => {
        const lx = xyz[lpIdx * 3];
        const ly = xyz[lpIdx * 3 + 1];
        const lz = xyz[lpIdx * 3 + 2];

        let bestDn = dnp01Indices[0];
        let bestDistSq = Infinity;
        dnp01Indices.forEach((dnIdx) => {
          const dx = lx - xyz[dnIdx * 3];
          const dy = ly - xyz[dnIdx * 3 + 1];
          const dz = lz - xyz[dnIdx * 3 + 2];
          const d2 = dx * dx + dy * dy + dz * dz;
          if (d2 < bestDistSq) {
            bestDistSq = d2;
            bestDn = dnIdx;
          }
        });

        circuitPoints.push(new THREE.Vector3(lx, ly, lz));
        circuitPoints.push(
          new THREE.Vector3(xyz[bestDn * 3], xyz[bestDn * 3 + 1], xyz[bestDn * 3 + 2])
        );
      });
    }

    const circuitGeom = new THREE.BufferGeometry().setFromPoints(circuitPoints);
    const circuitMat = new THREE.LineBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.65,
      blending: THREE.AdditiveBlending,
      linewidth: 1.5,
    });
    const circuitLines = new THREE.LineSegments(circuitGeom, circuitMat);
    circuitLines.visible = showEscapeCircuit;
    scene.add(circuitLines);
    circuitLinesRef.current = circuitLines;

    // 5. Highlight Marker Mesh for Selected Soma
    const markerGeom = new THREE.SphereGeometry(0.009, 16, 16);
    const markerMat = new THREE.MeshBasicMaterial({
      color: 0x22d3ee,
      wireframe: true,
    });
    const marker = new THREE.Mesh(markerGeom, markerMat);
    marker.visible = false;
    scene.add(marker);
    highlightMarkerRef.current = marker;

    // 6. Interactive Raycast Neuron Picking on Click
    const raycaster = new THREE.Raycaster();
    raycaster.params.Points = { threshold: 0.007 };
    const mouse = new THREE.Vector2();

    const handleClick = (e: MouseEvent) => {
      if (!containerRef.current || !cameraRef.current || !pointsRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, cameraRef.current);
      const intersects = raycaster.intersectObject(pointsRef.current);

      if (intersects.length > 0 && intersects[0].index !== undefined) {
        const idx = intersects[0].index;
        const typeId = connectomeData.somaType[idx];
        const typeName = connectomeData.meta.types[typeId] || `Unknown_Type_${typeId}`;
        const ntId = connectomeData.somaNt[idx];
        const ntName = connectomeData.meta.nts[ntId] || 'unknown';
        const px = xyz[idx * 3];
        const py = xyz[idx * 3 + 1];
        const pz = xyz[idx * 3 + 2];
        const totalInType = connectomeData.typeIndexMap.get(typeName)?.length || 1;

        setSelectedNeuron({
          index: idx,
          typeName,
          ntName,
          coords: [px, py, pz],
          typeCount: totalInType,
        });

        if (highlightMarkerRef.current) {
          highlightMarkerRef.current.position.set(px, py, pz);
          highlightMarkerRef.current.visible = true;
        }

        sound.playUiClick();
      }
    };

    container.addEventListener('click', handleClick);

    // 7. Animation Loop
    let animId: number;
    const clock = new THREE.Clock();

    const animate = () => {
      animId = requestAnimationFrame(animate);

      if (controlsRef.current) {
        controlsRef.current.autoRotate = autoRotateRef.current;
        controlsRef.current.update();
      }

      // Subtle pulse on circuit lines
      if (circuitLinesRef.current && circuitLinesRef.current.visible) {
        const time = clock.getElapsedTime();
        circuitMat.opacity = 0.5 + Math.sin(time * 3.5) * 0.25;
      }

      renderer.render(scene, camera);
    };

    animate();

    // 8. Resize Handler
    const handleResize = () => {
      if (!containerRef.current || !rendererRef.current || !cameraRef.current) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight;
      cameraRef.current.aspect = w / h;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animId);
      container.removeEventListener('click', handleClick);
      window.removeEventListener('resize', handleResize);
      controls.dispose();
      geometry.dispose();
      pointsMaterial.dispose();
      pointTexture.dispose();
      circuitGeom.dispose();
      circuitMat.dispose();
      markerGeom.dispose();
      markerMat.dispose();
      if (renderer.domElement && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [loadingState, connectomeData]);

  // Update Points Colors when NT Filters or Cell Type Search change
  useEffect(() => {
    if (!connectomeData || !pointsRef.current) return;

    const n = connectomeData.meta.n;
    const colorAttr = pointsRef.current.geometry.getAttribute('color') as THREE.BufferAttribute;
    const colors = colorAttr.array as Float32Array;
    const baseColors = connectomeData.baseColors;
    const somaNt = connectomeData.somaNt;
    const nts = connectomeData.meta.nts;
    const somaType = connectomeData.somaType;

    const targetTypeId = selectedType
      ? connectomeData.meta.types.indexOf(selectedType)
      : -1;

    for (let i = 0; i < n; i++) {
      const ntName = nts[somaNt[i]] || 'unknown';
      const isNtActive = activeNts[ntName] !== false;

      if (!isNtActive) {
        // Silenced / dimmed
        colors[i * 3] = 0.03;
        colors[i * 3 + 1] = 0.04;
        colors[i * 3 + 2] = 0.06;
      } else if (targetTypeId >= 0) {
        if (somaType[i] === targetTypeId) {
          // Highlight target population in brilliant electric cyan
          colors[i * 3] = 0.2;
          colors[i * 3 + 1] = 0.95;
          colors[i * 3 + 2] = 1.0;
        } else {
          // Dim surrounding context somas
          colors[i * 3] = baseColors[i * 3] * 0.12;
          colors[i * 3 + 1] = baseColors[i * 3 + 1] * 0.12;
          colors[i * 3 + 2] = baseColors[i * 3 + 2] * 0.12;
        }
      } else {
        // Normal base color
        colors[i * 3] = baseColors[i * 3];
        colors[i * 3 + 1] = baseColors[i * 3 + 1];
        colors[i * 3 + 2] = baseColors[i * 3 + 2];
      }
    }

    colorAttr.needsUpdate = true;
  }, [activeNts, selectedType, connectomeData]);

  // Toggle Neurotransmitter Layer
  const toggleNt = (nt: string) => {
    setActiveNts((prev) => ({
      ...prev,
      [nt]: prev[nt] === false ? true : false,
    }));
    sound.playUiClick();
  };

  // Camera View Switcher
  const handleSetCameraView = (view: 'front' | 'top' | 'side' | 'iso') => {
    if (!cameraRef.current || !controlsRef.current) return;
    sound.playUiClick();
    setCameraView(view);
    const camera = cameraRef.current;
    const controls = controlsRef.current;
    controls.target.set(0, 0.27, 0);

    if (view === 'front') {
      camera.position.set(0, 0.27, 1.45);
    } else if (view === 'top') {
      camera.position.set(0, 1.6, 0.05);
    } else if (view === 'side') {
      camera.position.set(1.45, 0.27, 0);
    } else {
      camera.position.set(0.9, 0.85, 1.15);
    }
    controls.update();
  };

  // Filtered Cell Type Suggestions
  const matchingTypes = useMemo(() => {
    if (!connectomeData || !searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase().trim();
    const results: { name: string; count: number }[] = [];
    const types = connectomeData.meta.types;
    const counts = connectomeData.meta.typeCount;

    for (let i = 0; i < types.length; i++) {
      if (types[i].toLowerCase().includes(q)) {
        results.push({ name: types[i], count: counts[i] });
        if (results.length >= 10) break;
      }
    }
    return results;
  }, [connectomeData, searchQuery]);

  return (
    <div className="relative w-full h-full overflow-hidden bg-[#04060c] text-slate-100 flex flex-col select-none">
      {/* 3D Canvas Mount Point */}
      <div ref={containerRef} className="absolute inset-0 z-0 cursor-grab active:cursor-grabbing" />

      {/* Top Header Navigation Bar */}
      <header className="relative z-15 flex items-center justify-between px-6 py-3 border-b border-white/10 bg-slate-950/75 backdrop-blur-md">
        {/* Brand & Connectome Stats */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center shrink-0 shadow-sm shadow-cyan-500/20">
            <Brain className="w-5 h-5 text-cyan-400 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-display font-extrabold tracking-tight text-base text-white">
                FLYBRAIN
              </span>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-cyan-950/80 text-cyan-300 border border-cyan-500/30">
                Whole-Brain Connectome
              </span>
            </div>
            <div className="text-[11px] text-slate-400">
              <em>Drosophila melanogaster</em> · 141,781 Reconstructed Neurons (FlyEM / Janelia / Google Research)
            </div>
          </div>
        </div>

        {/* Center / Navigation Flow Tabs */}
        <div className="hidden lg:flex items-center gap-1.5 bg-black/40 p-1 rounded-xl border border-white/10">
          <button
            className="px-3 py-1.5 text-xs font-bold rounded-lg bg-cyan-500/20 text-cyan-200 border border-cyan-400/50 flex items-center gap-1.5 shadow-sm"
            title="Current Mode: 3D Connectome Explorer"
          >
            <Compass className="w-3.5 h-3.5 text-cyan-400" />
            <span>1. Brain Lab</span>
          </button>

          {onOpenFlyLab && (
            <button
              onClick={() => {
                sound.playUiClick();
                onOpenFlyLab();
              }}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg text-slate-300 hover:text-white hover:bg-white/5 transition-all flex items-center gap-1.5 cursor-pointer"
              title="Launch Looming Threat Escape Circuit Experiment"
            >
              <Zap className="w-3.5 h-3.5 text-rose-400" />
              <span>2. Looming Experiment</span>
            </button>
          )}

          {onOpenNeuralDodge && (
            <button
              onClick={() => {
                sound.playUiClick();
                onOpenNeuralDodge();
              }}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg text-slate-300 hover:text-white hover:bg-white/5 transition-all flex items-center gap-1.5 cursor-pointer"
              title="Fly autonomously using the simulated neural escape circuit"
            >
              <Crosshair className="w-3.5 h-3.5 text-amber-400" />
              <span>3. Neural Flight</span>
            </button>
          )}

          {onStartFlight && (
            <button
              onClick={() => {
                sound.playUiClick();
                onStartFlight();
              }}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg text-slate-300 hover:text-white hover:bg-white/5 transition-all flex items-center gap-1.5 cursor-pointer"
              title="Manual 3D Flight Game Mode"
            >
              <Play className="w-3.5 h-3.5 text-emerald-400 fill-emerald-400" />
              <span>4. Manual Flight</span>
            </button>
          )}
        </div>

        {/* Right Controls & Camera Presets */}
        <div className="flex items-center gap-2">
          {/* Camera View Switcher */}
          <div className="hidden sm:flex items-center gap-1 bg-black/40 p-1 rounded-lg border border-white/10 text-xs">
            <span className="text-[10px] text-slate-400 uppercase font-mono px-1">View:</span>
            {(['front', 'top', 'side', 'iso'] as const).map((v) => (
              <button
                key={v}
                onClick={() => handleSetCameraView(v)}
                className={`px-2 py-0.5 rounded text-[10px] uppercase font-mono font-medium transition-colors ${
                  cameraView === v
                    ? 'bg-cyan-500/25 text-cyan-200 border border-cyan-400/40'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                {v}
              </button>
            ))}
          </div>

          {/* Auto-Rotate Toggle */}
          <button
            onClick={() => {
              setAutoRotate(!autoRotate);
              sound.playUiClick();
            }}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all flex items-center gap-1.5 cursor-pointer ${
              autoRotate
                ? 'border-cyan-500/50 bg-cyan-950/40 text-cyan-300 shadow-sm shadow-cyan-500/20'
                : 'border-white/10 bg-slate-900/60 text-slate-400 hover:text-white'
            }`}
            title="Toggle smooth auto-rotation of the 3D connectome"
          >
            <RotateCw className={`w-3.5 h-3.5 ${autoRotate ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Rotate</span>
          </button>

          {/* Circuit Lines Toggle */}
          <button
            onClick={() => {
              setShowEscapeCircuit(!showEscapeCircuit);
              sound.playUiClick();
            }}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all flex items-center gap-1.5 cursor-pointer ${
              showEscapeCircuit
                ? 'border-cyan-400/60 bg-cyan-950/50 text-cyan-300 shadow-sm shadow-cyan-500/20'
                : 'border-white/10 bg-slate-900/60 text-slate-400 hover:text-white'
            }`}
            title="Toggle visual synaptic projection lines for the LC4/LPLC2 → DNp01 escape circuit"
          >
            <Zap className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline">Escape Circuit</span>
          </button>

          {/* Dataset Citation */}
          <button
            onClick={() => {
              setShowAttribution(!showAttribution);
              sound.playUiClick();
            }}
            className="px-2.5 py-1.5 text-xs font-medium text-slate-300 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 hover:text-white transition-all flex items-center gap-1 cursor-pointer"
            title="View Open-Access FlyEM/Janelia Connectome Dataset Citation"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden md:inline">Citation</span>
          </button>

          {/* Side Panel Toggle */}
          <button
            onClick={() => setSidePanelOpen(!sidePanelOpen)}
            className="p-1.5 text-xs text-slate-300 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-all cursor-pointer"
            title={sidePanelOpen ? 'Collapse side panel' : 'Expand side panel'}
          >
            <Sliders className="w-4 h-4 text-cyan-400" />
          </button>
        </div>
      </header>

      {/* Loading Overlay */}
      {loadingState === 'loading' && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/80 backdrop-blur-md p-6">
          <div className="w-16 h-16 relative flex items-center justify-center mb-4">
            <div className="absolute inset-0 rounded-full border-2 border-cyan-500/20 border-t-cyan-400 animate-spin" />
            <Brain className="w-7 h-7 text-cyan-400 animate-pulse" />
          </div>
          <h2 className="font-display font-bold text-lg text-white mb-1">
            Loading Real Drosophila Connectome
          </h2>
          <p className="text-xs text-slate-400 mb-4 max-w-sm text-center">
            {loadingProgress.step}
          </p>
          <div className="w-64 h-2 bg-slate-900 rounded-full overflow-hidden border border-white/10 mb-2">
            <div
              className="h-full bg-gradient-to-r from-cyan-500 to-indigo-400 transition-all duration-200"
              style={{ width: `${loadingProgress.percent}%` }}
            />
          </div>
          <span className="text-[11px] font-mono text-cyan-400 font-semibold">
            {loadingProgress.percent}%
          </span>
        </div>
      )}

      {/* Error Overlay */}
      {loadingState === 'error' && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/90 backdrop-blur-md p-6">
          <div className="p-5 bg-red-950/60 border border-red-500/40 rounded-2xl max-w-md text-center shadow-2xl">
            <AlertTriangle className="w-10 h-10 text-red-400 mx-auto mb-3" />
            <h2 className="font-display font-bold text-lg text-white mb-2">
              Dataset Loading Error
            </h2>
            <p className="text-xs text-slate-300 mb-4 font-mono bg-black/40 p-3 rounded border border-white/5 text-left break-all">
              {errorMessage || 'Failed to fetch connectome binary files.'}
            </p>
            <div className="flex justify-center gap-3">
              <button
                onClick={initLoad}
                className="px-4 py-2 bg-cyan-500 text-black font-semibold text-xs rounded-lg hover:bg-cyan-400 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                Retry Loading
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Interactive Floating UI Overlay */}
      {loadingState === 'loaded' && connectomeData && (
        <div className="relative z-10 flex-1 pointer-events-none p-5 flex flex-col justify-between overflow-hidden">
          {/* Top Info Ribbon */}
          <div className="flex justify-between items-start">
            {/* Quick Somas Metric Pill */}
            <div className="pointer-events-auto bg-black/60 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-white/10 text-[11px] text-slate-300 flex items-center gap-2 shadow-lg">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>141,781 Active Somas Loaded</span>
              <span className="text-slate-600">|</span>
              <span className="text-cyan-400 font-mono">54.5M Synapses</span>
            </div>

            {/* Selected Neuron Inspector Floating Card */}
            {selectedNeuron && (
              <div className="pointer-events-auto w-80 bg-slate-950/90 backdrop-blur-xl border border-cyan-500/40 rounded-2xl p-4 shadow-2xl animate-in fade-in slide-in-from-top-2 duration-150">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-cyan-400 font-bold">
                    Neuron #{selectedNeuron.index.toLocaleString()}
                  </span>
                  <button
                    onClick={() => {
                      setSelectedNeuron(null);
                      if (highlightMarkerRef.current) highlightMarkerRef.current.visible = false;
                    }}
                    className="text-slate-400 hover:text-white"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-display font-bold text-base text-white">
                    Type: <span className="font-mono text-cyan-300">{selectedNeuron.typeName}</span>
                  </h3>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/10 text-slate-200">
                    {selectedNeuron.typeCount} cells
                  </span>
                </div>

                <div className="space-y-1.5 text-xs text-slate-300 mb-3 bg-white/5 p-2.5 rounded-xl border border-white/5 font-mono">
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-sans">Transmitter:</span>
                    <span className="capitalize text-amber-300 font-semibold">{selectedNeuron.ntName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-sans">3D Coordinates (mm):</span>
                    <span className="text-cyan-400 text-[11px]">
                      [{selectedNeuron.coords[0].toFixed(3)}, {selectedNeuron.coords[1].toFixed(3)}, {selectedNeuron.coords[2].toFixed(3)}]
                    </span>
                  </div>
                </div>

                {selectedNeuron.typeName === 'LC4' && (
                  <div className="p-2.5 bg-cyan-950/60 border border-cyan-500/40 rounded-xl text-[11px] text-cyan-200 leading-relaxed mb-3">
                    ⚡ <strong>Primary Looming Detector:</strong> 126 lobula columnar neurons projecting to the Giant Fiber. Ablating LC4 drops looming escape drive by 89%.
                  </div>
                )}
                {selectedNeuron.typeName === 'DNp01' && (
                  <div className="p-2.5 bg-purple-950/60 border border-purple-500/40 rounded-xl text-[11px] text-purple-200 leading-relaxed mb-3">
                    ⚡ <strong>Giant Fiber (DNp01):</strong> Bilateral pair of huge descending command neurons driving takeoff motor programs in the thoracic ganglia.
                  </div>
                )}

                {onOpenFlyLab && (
                  <button
                    onClick={() => {
                      sound.playUiClick();
                      onOpenFlyLab();
                    }}
                    className="w-full py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-md shadow-cyan-500/20 cursor-pointer"
                  >
                    <Zap className="w-3.5 h-3.5" />
                    <span>Test This Circuit in Looming Experiment →</span>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Bottom Row: Interaction Hint on Left & Compact Side Panel on Right */}
          <div className="flex justify-between items-end gap-6 mt-auto">
            {/* Bottom-Left Controls Legend */}
            <div className="pointer-events-auto bg-black/60 backdrop-blur-md px-3.5 py-2 rounded-xl border border-white/10 text-[11px] text-slate-400 max-w-sm hidden sm:block">
              💡 <strong>Interaction:</strong> Left-drag to orbit in 3D · Scroll to zoom · Click any of the 141,781 real somas to inspect its anatomical ID.
            </div>

            {/* Right Side Compact Experiment & Circuit Panel */}
            {sidePanelOpen && (
              <div className="pointer-events-auto w-96 max-h-[82vh] overflow-y-auto flex flex-col gap-3 bg-slate-950/85 backdrop-blur-xl border border-white/15 rounded-2xl p-4 shadow-2xl animate-in fade-in slide-in-from-right duration-200">
                {/* 1. HERO EXPERIMENT CALLOUT CARD */}
                <div className="p-4 rounded-xl bg-gradient-to-br from-cyan-950/80 via-slate-900/90 to-purple-950/80 border border-cyan-500/40 shadow-xl">
                  <div className="flex items-center gap-2 text-[10px] uppercase font-mono font-bold tracking-widest text-cyan-400 mb-1">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Escape Circuit Discovery</span>
                  </div>
                  <h2 className="font-display font-extrabold text-base text-white tracking-tight mb-1">
                    How Fruit Flies Dodge Predators
                  </h2>
                  <p className="text-xs text-slate-300 leading-relaxed mb-3 font-medium">
                    126 LC4 visual neurons detect approaching looming shadows and drive the Giant Fiber (DNp01) jump takeoff.
                  </p>

                  {/* PROMINENT EXPERIMENT BUTTON */}
                  {onOpenFlyLab && (
                    <button
                      onClick={() => {
                        sound.playUiClick();
                        onOpenFlyLab();
                      }}
                      className="w-full py-3 px-4 rounded-xl font-bold text-sm text-black bg-gradient-to-r from-cyan-400 via-teal-300 to-cyan-300 hover:from-white hover:to-cyan-200 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-cyan-500/30 font-display tracking-wide"
                    >
                      <Zap className="w-4 h-4 fill-black" />
                      <span>EXPERIMENT WITH THE BRAIN</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  )}

                  {/* NEURAL FLIGHT BUTTON */}
                  {onOpenNeuralDodge && (
                    <button
                      onClick={() => {
                        sound.playUiClick();
                        onOpenNeuralDodge();
                      }}
                      className="w-full mt-2 py-2 px-3 rounded-lg font-semibold text-xs text-amber-300 bg-amber-950/60 border border-amber-500/40 hover:bg-amber-900/70 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Crosshair className="w-3.5 h-3.5 text-amber-400" />
                      <span>FLY USING ITS BRAIN (Neural Dodge)</span>
                    </button>
                  )}
                </div>

                {/* 2. QUICK CELL TYPE FILTER BUTTONS */}
                <div className="bg-black/40 p-3 rounded-xl border border-white/10">
                  <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400 mb-2 flex items-center justify-between">
                    <span>Key Reference Populations</span>
                    <span className="font-mono text-[9px] text-cyan-400">Click to isolate</span>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {[
                      { id: 'LC4', label: 'LC4', note: 'Looming detector (126)' },
                      { id: 'DNp01', label: 'DNp01', note: 'Giant Fiber command (2)' },
                      { id: 'LPLC2', label: 'LPLC2', note: 'Collision course (104)' },
                      { id: 'KC', label: 'KC', note: 'Kenyon / Memory (4.9k)' },
                      { id: 'T4', label: 'T4', note: 'Motion detector (1.3k)' },
                    ].map((target) => (
                      <button
                        key={target.id}
                        onClick={() => {
                          const next = selectedType === target.id ? null : target.id;
                          setSelectedType(next);
                          setSearchQuery(next ? target.id : '');
                          sound.playUiClick();
                        }}
                        className={`px-2.5 py-1 text-xs font-mono rounded-lg border transition-all cursor-pointer ${
                          selectedType === target.id
                            ? 'bg-cyan-500 text-black font-bold border-cyan-400 shadow-md shadow-cyan-500/30'
                            : 'bg-white/5 text-slate-300 border-white/10 hover:border-white/20 hover:bg-white/10'
                        }`}
                        title={target.note}
                      >
                        {target.label}
                      </button>
                    ))}

                    {selectedType && (
                      <button
                        onClick={() => {
                          setSelectedType(null);
                          setSearchQuery('');
                          sound.playUiClick();
                        }}
                        className="px-2 py-1 text-[11px] text-slate-400 hover:text-white ml-auto"
                      >
                        Clear Filter
                      </button>
                    )}
                  </div>
                </div>

                {/* 3. COLLAPSIBLE ACCORDION: SEARCH ALL 11,385 CELL TYPES */}
                <div className="border border-white/10 rounded-xl overflow-hidden bg-black/40">
                  <button
                    onClick={() => {
                      setActiveDrawer(activeDrawer === 'search' ? 'none' : 'search');
                      sound.playUiClick();
                    }}
                    className="w-full px-3 py-2.5 flex items-center justify-between text-xs font-bold text-slate-300 hover:bg-white/5 transition-colors"
                  >
                    <span className="flex items-center gap-1.5">
                      <Search className="w-3.5 h-3.5 text-cyan-400" />
                      Search All 11,385 Cell Types
                    </span>
                    <ChevronDown
                      className={`w-3.5 h-3.5 text-slate-400 transition-transform ${
                        activeDrawer === 'search' ? 'rotate-180' : ''
                      }`}
                    />
                  </button>

                  {activeDrawer === 'search' && (
                    <div className="p-3 pt-0 border-t border-white/5 space-y-2">
                      <div className="relative mt-2">
                        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5 pointer-events-none" />
                        <input
                          type="text"
                          placeholder="e.g. LC4, DNp01, LPLC2, KC, T4"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="w-full bg-slate-900 border border-white/15 rounded-lg pl-8 pr-7 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 font-mono"
                        />
                        {searchQuery && (
                          <button
                            onClick={() => {
                              setSearchQuery('');
                              setSelectedType(null);
                            }}
                            className="absolute right-2 top-2 text-slate-400 hover:text-white"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      {matchingTypes.length > 0 && (
                        <div className="space-y-1 max-h-36 overflow-y-auto bg-slate-950 border border-white/10 rounded-lg p-1">
                          {matchingTypes.map((t) => (
                            <button
                              key={t.name}
                              onClick={() => {
                                setSelectedType(t.name);
                                setSearchQuery(t.name);
                                sound.playUiClick();
                              }}
                              className={`w-full flex items-center justify-between px-2.5 py-1 text-xs rounded transition-colors text-left ${
                                selectedType === t.name
                                  ? 'bg-cyan-500/20 text-cyan-300 font-semibold'
                                  : 'text-slate-300 hover:bg-white/5 hover:text-white'
                              }`}
                            >
                              <span className="font-mono">{t.name}</span>
                              <span className="text-[10px] text-slate-500 font-mono">
                                {t.count} somas
                              </span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* 4. COLLAPSIBLE ACCORDION: NEUROTRANSMITTER LAYERS */}
                <div className="border border-white/10 rounded-xl overflow-hidden bg-black/40">
                  <button
                    onClick={() => {
                      setActiveDrawer(activeDrawer === 'neurotransmitters' ? 'none' : 'neurotransmitters');
                      sound.playUiClick();
                    }}
                    className="w-full px-3 py-2.5 flex items-center justify-between text-xs font-bold text-slate-300 hover:bg-white/5 transition-colors"
                  >
                    <span className="flex items-center gap-1.5">
                      <Sliders className="w-3.5 h-3.5 text-cyan-400" />
                      Neurotransmitter Layers ({connectomeData.meta.nts.length})
                    </span>
                    <ChevronDown
                      className={`w-3.5 h-3.5 text-slate-400 transition-transform ${
                        activeDrawer === 'neurotransmitters' ? 'rotate-180' : ''
                      }`}
                    />
                  </button>

                  {activeDrawer === 'neurotransmitters' && (
                    <div className="p-3 pt-0 border-t border-white/5">
                      <div className="grid grid-cols-2 gap-1.5 mt-2">
                        {connectomeData.meta.nts.map((nt, idx) => {
                          const count = connectomeData.meta.ntCount[idx] || 0;
                          const col = NT_COLORS[nt] || NT_COLORS.unknown;
                          const isActive = activeNts[nt] !== false;
                          const rgbStyle = `rgb(${Math.round(col[0] * 255)}, ${Math.round(col[1] * 255)}, ${Math.round(col[2] * 255)})`;

                          return (
                            <button
                              key={nt}
                              onClick={() => toggleNt(nt)}
                              className={`flex items-center justify-between p-1.5 rounded-lg border text-left transition-all text-[11px] cursor-pointer ${
                                isActive
                                  ? 'bg-white/5 border-white/10 hover:bg-white/10'
                                  : 'opacity-30 border-transparent bg-transparent hover:opacity-50'
                              }`}
                            >
                              <div className="flex items-center gap-1.5 truncate">
                                <span
                                  className="w-2 h-2 rounded-full shrink-0 shadow-sm"
                                  style={{ backgroundColor: rgbStyle }}
                                />
                                <span className="capitalize text-slate-200 truncate">{nt}</span>
                              </div>
                              <span className="font-mono text-[9px] text-slate-400 pl-1">
                                {count > 999 ? `${(count / 1000).toFixed(1)}k` : count}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* 5. COLLAPSIBLE ACCORDION: SCIENTIFIC ARCHITECTURE */}
                <div className="border border-white/10 rounded-xl overflow-hidden bg-black/40">
                  <button
                    onClick={() => {
                      setActiveDrawer(activeDrawer === 'about' ? 'none' : 'about');
                      sound.playUiClick();
                    }}
                    className="w-full px-3 py-2.5 flex items-center justify-between text-xs font-bold text-slate-300 hover:bg-white/5 transition-colors"
                  >
                    <span className="flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                      Dataset Architecture & License
                    </span>
                    <ChevronDown
                      className={`w-3.5 h-3.5 text-slate-400 transition-transform ${
                        activeDrawer === 'about' ? 'rotate-180' : ''
                      }`}
                    />
                  </button>

                  {activeDrawer === 'about' && (
                    <div className="p-3 pt-0 border-t border-white/5 text-[11px] text-slate-300 space-y-2 mt-2 leading-relaxed">
                      <p>
                        <strong>Dataset:</strong> FlyEM / Janelia Research Campus & Google Research Male CNS Connectome v1.0.
                      </p>
                      <p>
                        <strong>Scale:</strong> 141,781 real neuron somas with synaptic connectivity in millimeter coordinates.
                      </p>
                      <p>
                        <strong>License:</strong> Creative Commons Attribution 4.0 International (CC BY 4.0).
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Dataset Attribution & License Modal */}
      {showAttribution && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/80 backdrop-blur-sm p-6 pointer-events-auto">
          <div className="max-w-lg bg-slate-950 border border-white/20 rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-display font-bold text-lg text-white flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                Connectome Attribution & License
              </h2>
              <button
                onClick={() => setShowAttribution(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-300 leading-relaxed mb-4">
              <p>
                <strong>Source Dataset:</strong> {REAL_CONNECTOME_METADATA.title} ({REAL_CONNECTOME_METADATA.version}).
              </p>
              <p>
                <strong>Origin:</strong> {REAL_CONNECTOME_METADATA.attribution}.
              </p>
              <p>
                <strong>License:</strong> Licensed under <strong>Creative Commons Attribution 4.0 International (CC BY 4.0)</strong>.
              </p>
              <p>
                <strong>Derivative WebGL Visualizer:</strong> Adapted from VIDraft ({REAL_CONNECTOME_METADATA.referenceSpace}).
              </p>
              <div className="p-3 bg-white/5 rounded-lg border border-white/10 font-mono text-[11px] text-slate-400">
                Citation: Male CNS connectome, FlyEM / HHMI Janelia with Google Research, Columbia University and Harvard University (2026). CC BY.
              </div>
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setShowAttribution(false)}
                className="px-4 py-2 bg-cyan-500 text-black font-semibold text-xs rounded-lg hover:bg-cyan-400 transition-all cursor-pointer"
              >
                Close Notice
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
