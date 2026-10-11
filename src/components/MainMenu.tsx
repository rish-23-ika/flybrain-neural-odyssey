import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { createFruitFlyModel, createSoftParticleTexture } from '../game/FlyModel';
import { LevelDefinition } from '../types/game';
import { Play, Compass, BookOpen, Volume2, VolumeX, Sparkles, Trophy, Move3d, Zap, Crosshair } from 'lucide-react';
import { sound } from '../audio/SoundEngine';

interface MainMenuProps {
  onStartGame: (level: LevelDefinition) => void;
  onOpenLevelSelect: () => void;
  onOpenBrainExplorer: () => void;
  onOpenFlyLab: () => void;
  onOpenNeuralDodge: () => void;
  onOpenControlsGuide: () => void;
  levels: LevelDefinition[];
  highScores: Record<string, number>;
  isMuted: boolean;
  onToggleMute: () => void;
}

export const MainMenu: React.FC<MainMenuProps> = ({
  onStartGame,
  onOpenLevelSelect,
  onOpenBrainExplorer,
  onOpenFlyLab,
  onOpenNeuralDodge,
  onOpenControlsGuide,
  levels,
  highScores,
  isMuted,
  onToggleMute,
}) => {
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const [isInteracting, setIsInteracting] = useState(false);

  useEffect(() => {
    if (!canvasContainerRef.current) return;

    // 1. Scene & Camera Setup
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x060814, 0.035);

    const camera = new THREE.PerspectiveCamera(
      42,
      canvasContainerRef.current.clientWidth / canvasContainerRef.current.clientHeight,
      0.1,
      100
    );
    // Position camera to give a 3/4 hero view of the fruit fly on the right
    camera.position.set(1.1, 0.9, 4.6);
    camera.lookAt(0.9, 0.1, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setSize(canvasContainerRef.current.clientWidth, canvasContainerRef.current.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.35));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.25;
    renderer.shadowMap.enabled = false;
    canvasContainerRef.current.appendChild(renderer.domElement);

    // 2. Multi-Point Cinematic Lighting Setup
    // Soft ambient fill
    const ambientLight = new THREE.AmbientLight(0x233554, 2.2);
    scene.add(ambientLight);

    // Warm Sun Key Light (illuminates fly chitin and eyes)
    const keyLight = new THREE.DirectionalLight(0xffedd5, 4.2);
    keyLight.position.set(4, 7, 5);
    scene.add(keyLight);

    // Sharp Cyan Rim Backlight (highlights translucent wings and thoracic bristles)
    const rimLight = new THREE.PointLight(0x00f2fe, 6.0, 20);
    rimLight.position.set(-2.5, 3.5, -3.5);
    scene.add(rimLight);

    // Electric Violet Underfill
    const violetFill = new THREE.PointLight(0xa855f7, 4.5, 20);
    violetFill.position.set(3.5, -3.0, 1.5);
    scene.add(violetFill);

    // Ruby Eye Glint Light
    const eyeGlint = new THREE.PointLight(0xff2a5f, 2.2, 5.0);
    eyeGlint.position.set(1.0, 0.5, 1.4);
    scene.add(eyeGlint);

    // 3. Hero Fruit Fly Model
    const fly = createFruitFlyModel();
    fly.root.scale.set(2.4, 2.4, 2.4); // HERO SCALE: Large and clearly visible!
    fly.root.position.set(1.1, 0.15, 0);
    fly.root.rotation.y = -Math.PI * 0.28;
    fly.root.rotation.x = 0.12;
    scene.add(fly.root);

    // 4. Rich Layered Miniature Botanical Environment
    const gardenGroup = new THREE.Group();
    scene.add(gardenGroup);

    // Curved Mossy Branch / Forest Floor Underneath
    const curvePoints = [
      new THREE.Vector3(-6, -2.5, -2),
      new THREE.Vector3(-1, -1.8, 0),
      new THREE.Vector3(4, -2.2, -1),
      new THREE.Vector3(8, -3.5, -3),
    ];
    const branchCurve = new THREE.CatmullRomCurve3(curvePoints);
    const branchGeom = new THREE.TubeGeometry(branchCurve, 32, 1.4, 12, false);
    const branchMat = new THREE.MeshStandardMaterial({
      color: 0x14281f,
      roughness: 0.85,
      metalness: 0.1,
    });
    const branch = new THREE.Mesh(branchGeom, branchMat);
    gardenGroup.add(branch);

    // Giant Translucent Orchid Blossoms & Leaves
    const petalColors = [0x00f2fe, 0xc084fc, 0x38bdf8, 0xec4899, 0x10b981];
    const flowers: THREE.Group[] = [];

    const flowerConfigs = [
      { pos: new THREE.Vector3(-2.8, -0.6, -2.8), rot: [0.3, 0.8, -0.2], col: 0x00f2fe, scale: 1.6 },
      { pos: new THREE.Vector3(3.8, -0.8, -3.2), rot: [-0.2, -0.9, 0.3], col: 0xa855f7, scale: 1.8 },
      { pos: new THREE.Vector3(2.5, 2.4, -4.5), rot: [0.6, -0.3, 0.4], col: 0x38bdf8, scale: 2.0 },
      { pos: new THREE.Vector3(-4.0, 2.2, -4.0), rot: [0.4, 0.7, -0.1], col: 0xec4899, scale: 1.9 },
    ];

    flowerConfigs.forEach((cfg) => {
      const flGroup = new THREE.Group();
      flGroup.position.copy(cfg.pos);
      flGroup.rotation.set(cfg.rot[0], cfg.rot[1], cfg.rot[2]);
      flGroup.scale.setScalar(cfg.scale);

      const petalMat = new THREE.MeshPhysicalMaterial({
        color: cfg.col,
        emissive: cfg.col,
        emissiveIntensity: 0.35,
        roughness: 0.25,
        transmission: 0.7,
        transparent: true,
        opacity: 0.85,
        side: THREE.DoubleSide,
      });

      // 5 Curving Petals
      for (let p = 0; p < 5; p++) {
        const petalGeom = new THREE.SphereGeometry(1.6, 14, 14);
        petalGeom.scale(0.85, 0.18, 1.7);
        petalGeom.translate(0, 0, 1.4);
        const petal = new THREE.Mesh(petalGeom, petalMat);
        petal.rotation.y = (p / 5) * Math.PI * 2;
        petal.rotation.x = 0.45;
        flGroup.add(petal);
      }

      // Glowing Center Stamen with Nectar Drop
      const stamenGeom = new THREE.SphereGeometry(0.55, 12, 12);
      const stamenMat = new THREE.MeshBasicMaterial({ color: 0xfff07c });
      const stamen = new THREE.Mesh(stamenGeom, stamenMat);
      stamen.position.y = 0.2;
      flGroup.add(stamen);

      const flowerLight = new THREE.PointLight(cfg.col, 2.5, 9);
      flowerLight.position.set(0, 0.8, 0);
      flGroup.add(flowerLight);

      gardenGroup.add(flGroup);
      flowers.push(flGroup);
    });

    // Glowing Nectar Droplets Hanging on Leaves
    const nectarDroplets: THREE.Group[] = [];
    const nectarMat = new THREE.MeshPhysicalMaterial({
      color: 0xfbbf24,
      emissive: 0xd97706,
      emissiveIntensity: 0.8,
      roughness: 0.05,
      transmission: 0.85,
      transparent: true,
      opacity: 0.95,
      clearcoat: 1.0,
    });

    const dropPositions = [
      new THREE.Vector3(-0.8, -1.1, -0.6),
      new THREE.Vector3(2.6, -1.3, -1.0),
      new THREE.Vector3(-2.2, 0.4, -1.8),
    ];

    dropPositions.forEach((dp) => {
      const dropGroup = new THREE.Group();
      dropGroup.position.copy(dp);

      const dropGeom = new THREE.SphereGeometry(0.22, 14, 14);
      dropGeom.scale(1.0, 1.4, 1.0);
      const dropMesh = new THREE.Mesh(dropGeom, nectarMat);
      dropGroup.add(dropMesh);

      const dropLight = new THREE.PointLight(0xfbbf24, 1.5, 4);
      dropGroup.add(dropLight);

      gardenGroup.add(dropGroup);
      nectarDroplets.push(dropGroup);
    });

    // 5. Soft Luminous Pollen & Spore Particle Cloud
    // Circular Soft Pollen Texture eliminates ugly square artifacts!
    const pollenTex = createSoftParticleTexture(true);
    const sporeTex = createSoftParticleTexture(false);

    const pollenCount = 180;
    const pollenGeom = new THREE.BufferGeometry();
    const pollenPos = new Float32Array(pollenCount * 3);
    const pollenColors = new Float32Array(pollenCount * 3);

    for (let i = 0; i < pollenCount; i++) {
      pollenPos[i * 3] = (Math.random() - 0.5) * 14;
      pollenPos[i * 3 + 1] = (Math.random() - 0.5) * 8 + 0.5;
      pollenPos[i * 3 + 2] = (Math.random() - 0.5) * 10;

      // Golden & Cyan glowing spore tints
      if (i % 2 === 0) {
        pollenColors[i * 3] = 1.0;
        pollenColors[i * 3 + 1] = 0.85;
        pollenColors[i * 3 + 2] = 0.3;
      } else {
        pollenColors[i * 3] = 0.2;
        pollenColors[i * 3 + 1] = 0.9;
        pollenColors[i * 3 + 2] = 1.0;
      }
    }
    pollenGeom.setAttribute('position', new THREE.BufferAttribute(pollenPos, 3));
    pollenGeom.setAttribute('color', new THREE.BufferAttribute(pollenColors, 3));

    const pollenMat = new THREE.PointsMaterial({
      size: 0.28,
      map: pollenTex,
      vertexColors: true,
      transparent: true,
      opacity: 0.88,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const pollen = new THREE.Points(pollenGeom, pollenMat);
    gardenGroup.add(pollen);

    // 6. Interactive Orbit & Mouse Parallax
    let isDragging = false;
    let prevMouse = { x: 0, y: 0 };
    let targetRotationY = -Math.PI * 0.28;
    let targetRotationX = 0.12;

    const onMouseDown = (e: MouseEvent) => {
      isDragging = true;
      setIsInteracting(true);
      prevMouse = { x: e.clientX, y: e.clientY };
    };

    const onMouseMove = (e: MouseEvent) => {
      const xNorm = (e.clientX / window.innerWidth) * 2 - 1;
      const yNorm = (e.clientY / window.innerHeight) * 2 - 1;

      if (isDragging) {
        const dx = e.clientX - prevMouse.x;
        const dy = e.clientY - prevMouse.y;
        targetRotationY += dx * 0.008;
        targetRotationX += dy * 0.008;
        prevMouse = { x: e.clientX, y: e.clientY };
      } else {
        // Subtle natural look-around parallax when hovering
        targetRotationY = -Math.PI * 0.28 + xNorm * 0.35;
        targetRotationX = 0.12 + yNorm * 0.2;
      }
    };

    const onMouseUp = () => {
      isDragging = false;
    };

    const dom = canvasContainerRef.current;
    dom.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);

    // 7. Animation Loop
    let reqId: number;
    let clock = new THREE.Clock();

    const animate = () => {
      reqId = requestAnimationFrame(animate);
      const time = clock.getElapsedTime();

      // Fly hovering bobbing & breathing
      fly.root.position.y = 0.15 + Math.sin(time * 2.2) * 0.08;
      fly.root.rotation.y = THREE.MathUtils.lerp(fly.root.rotation.y, targetRotationY, 0.06);
      fly.root.rotation.x = THREE.MathUtils.lerp(fly.root.rotation.x, targetRotationX, 0.06);

      // Subtle gentle wing flutter in menu
      fly.updateAnimation(time, 0.18, false);

      // Garden ambient animation: flower petals gently swaying
      flowers.forEach((fl, idx) => {
        fl.rotation.z = Math.sin(time * 1.5 + idx) * 0.04;
      });

      // Nectar droplets bobbing
      nectarDroplets.forEach((drop, idx) => {
        drop.position.y += Math.sin(time * 3 + idx) * 0.001;
      });

      // Smoothly drift pollen particles via group transform (ZERO buffer re-uploads!)
      pollen.rotation.y = time * 0.02;
      pollen.position.y = Math.sin(time * 0.5) * 0.5;

      renderer.render(scene, camera);
    };

    animate();

    const handleResize = () => {
      if (!canvasContainerRef.current) return;
      const w = canvasContainerRef.current.clientWidth;
      const h = canvasContainerRef.current.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(reqId);
      dom.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('resize', handleResize);
      if (renderer.domElement && canvasContainerRef.current?.contains(renderer.domElement)) {
        canvasContainerRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, []);

  return (
    <div className="relative w-full h-full bg-[#060814] text-slate-100 flex flex-col justify-between overflow-hidden select-none">
      {/* 3D Background Canvas */}
      <div
        ref={canvasContainerRef}
        className="absolute inset-0 z-0 cursor-grab active:cursor-grabbing"
      />

      {/* Atmospheric Contrast Scrim on the left for crisp text readability */}
      <div className="absolute inset-y-0 left-0 w-full md:w-3/5 bg-gradient-to-r from-black/85 via-black/45 to-transparent pointer-events-none z-[1]" />

      {/* Top Header */}
      <header className="relative z-10 flex items-center justify-between px-8 py-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/25">
            <Sparkles className="w-5 h-5 text-black" />
          </div>
          <div>
            <span className="font-display font-extrabold tracking-wider text-2xl text-white">
              FLYBRAIN
            </span>
            <div className="text-[11px] text-cyan-400 font-medium tracking-wide">
              Neural Odyssey · 3D Flight Experience
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              onToggleMute();
              sound.playUiClick();
            }}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-black/60 backdrop-blur-md border border-white/15 text-slate-300 hover:text-white hover:bg-white/10 transition-all text-xs font-medium cursor-pointer shadow-lg"
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-slate-400" /> : <Volume2 className="w-4 h-4 text-cyan-400" />}
            <span>{isMuted ? 'Muted' : 'Audio On'}</span>
          </button>
        </div>
      </header>

      {/* Hero Content Section */}
      <div className="relative z-10 px-8 max-w-2xl mt-auto mb-auto">
        <div className="space-y-5">
          <div className="inline-flex items-center gap-2 text-xs text-cyan-400 font-semibold tracking-wide bg-cyan-950/40 px-3 py-1 rounded-md border border-cyan-500/30 backdrop-blur-sm">
            <span>Drosophila Aerodynamics</span>
            <span aria-hidden="true">·</span>
            <span>Micro-Scale Universe</span>
          </div>

          <h1 className="font-display font-black text-5xl md:text-6xl text-white tracking-tight leading-none text-balance">
            Soar through the miniature universe.
          </h1>

          <p className="text-slate-200 text-sm md:text-base leading-relaxed max-w-xl drop-shadow-md">
            Take flight as an agile fruit fly navigating colossal night gardens, giant blooming flora, and the living bio-electric corridors of the connectome.
          </p>

          {/* Primary Action Buttons */}
          <div className="pt-2 flex flex-wrap items-center gap-3">
            <button
              onClick={() => {
                sound.playUiClick();
                onStartGame(levels[0]);
              }}
              className="px-7 py-4 rounded-xl font-bold text-sm text-black bg-gradient-to-r from-cyan-400 via-cyan-300 to-teal-200 hover:from-white hover:to-cyan-300 transition-all shadow-xl shadow-cyan-500/35 flex items-center gap-2.5 cursor-pointer transform hover:-translate-y-0.5 active:translate-y-0"
            >
              <Play className="w-4 h-4 fill-black" />
              <span>Launch First Flight</span>
            </button>

            <button
              onClick={() => {
                sound.playUiClick();
                onOpenLevelSelect();
              }}
              className="px-5 py-4 rounded-xl font-semibold text-sm text-white bg-black/60 backdrop-blur-md border border-white/20 hover:bg-white/15 hover:border-white/35 transition-all flex items-center gap-2 cursor-pointer shadow-lg"
            >
              <span>Select Environment</span>
            </button>

            <button
              onClick={() => {
                sound.playUiClick();
                onOpenBrainExplorer();
              }}
              className="px-5 py-4 rounded-xl font-semibold text-sm text-cyan-300 bg-cyan-950/60 backdrop-blur-md border border-cyan-500/40 hover:bg-cyan-900/70 transition-all flex items-center gap-2 cursor-pointer shadow-lg shadow-cyan-950/50"
            >
              <Compass className="w-4 h-4 text-cyan-400" />
              <span>Brain Connectome</span>
            </button>

            <button
              onClick={() => {
                sound.playUiClick();
                onOpenFlyLab();
              }}
              className="px-5 py-4 rounded-xl font-semibold text-sm text-rose-300 bg-rose-950/60 backdrop-blur-md border border-rose-500/40 hover:bg-rose-900/70 hover:border-rose-400 transition-all flex items-center gap-2 cursor-pointer shadow-lg shadow-rose-950/50"
            >
              <Zap className="w-4 h-4 text-rose-400" />
              <span>FLYLAB: Escape Circuit</span>
            </button>

            <button
              onClick={() => {
                sound.playUiClick();
                onOpenNeuralDodge();
              }}
              className="px-5 py-4 rounded-xl font-bold text-sm text-amber-300 bg-gradient-to-r from-amber-950/80 to-amber-900/50 backdrop-blur-md border border-amber-500/50 hover:border-amber-300 hover:from-amber-900/80 hover:to-amber-800/60 transition-all flex items-center gap-2 cursor-pointer shadow-lg shadow-amber-950/60"
            >
              <Crosshair className="w-4 h-4 text-amber-400" />
              <span>Neural Dodge Challenge</span>
            </button>

            <button
              onClick={() => {
                sound.playUiClick();
                onOpenControlsGuide();
              }}
              className="px-4 py-4 rounded-xl font-medium text-sm text-slate-300 bg-black/60 backdrop-blur-md border border-white/15 hover:text-white hover:bg-white/10 transition-all flex items-center gap-2 cursor-pointer shadow-lg"
            >
              <BookOpen className="w-4 h-4" />
              <span>Flight School</span>
            </button>
          </div>

          {/* 3D Inspect Prompt */}
          <div className="flex items-center gap-2 text-[11px] text-cyan-300/80 pt-1">
            <Move3d className="w-3.5 h-3.5 text-cyan-400" />
            <span>Click & drag background to inspect fruit fly in 3D</span>
          </div>
        </div>
      </div>

      {/* Footer / Best Scores Preview */}
      <footer className="relative z-10 px-8 py-5 border-t border-white/10 bg-black/50 backdrop-blur-md flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-slate-400">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 text-slate-200 font-medium">
            <Trophy className="w-4 h-4 text-amber-400" />
            <span>Personal Bests:</span>
          </div>
          {levels.map((lvl) => {
            const score = highScores[lvl.id] || 0;
            return (
              <div key={lvl.id} className="flex items-center gap-2">
                <span className="text-slate-300">{lvl.name}:</span>
                <span className="font-mono-numbers text-cyan-300">
                  {score > 0 ? `${score.toLocaleString()} pts` : 'Unclimbed'}
                </span>
                <span aria-hidden="true" className="text-slate-600">·</span>
              </div>
            );
          })}
        </div>

        <div className="text-slate-400 text-[11px]">
          Physics: 3-Axis Gyroscopic Flight · 200 Hz Wing Oscillation · WebGL 3D
        </div>
      </footer>
    </div>
  );
};
