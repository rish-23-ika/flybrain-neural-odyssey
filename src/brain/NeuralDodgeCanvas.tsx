import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { createFruitFlyModel, createSoftParticleTexture } from '../game/FlyModel';
import {
  DodgeCondition,
  ThreatPattern,
  THREAT_PATTERNS,
  MODEL_CONSTANTS,
  NeuralDodgeState,
  createInitialDodgeState,
  stepDodgeSimulation,
  MODEL_SCIENTIFIC_DOSSIER,
  CONDITION_REGISTRY,
} from './NeuralDodgeModel';
import { sound } from '../audio/SoundEngine';
import {
  RotateCcw,
  Play,
  Pause,
  Zap,
  Scissors,
  CheckCircle2,
  XCircle,
  Compass,
  ArrowLeft,
  BookOpen,
  Info,
  ChevronRight,
  Eye,
  Crosshair,
  Volume2,
  VolumeX,
  Activity,
  Sliders,
  Camera,
  Layers,
  Sparkles,
} from 'lucide-react';

interface NeuralDodgeCanvasProps {
  onBackToMenu: () => void;
  onOpenFlyLab: () => void;
  onOpenBrainExplorer: () => void;
  onStartFlight: () => void;
}

type CameraPreset = 'chase' | 'side' | 'overhead';

/**
 * Creates a predatory hornet/wasp 3D obstacle model that looms menacingly.
 */
function createPredatorModel(pattern: ThreatPattern): {
  group: THREE.Group;
  leftWing: THREE.Mesh;
  rightWing: THREE.Mesh;
  eyesMesh: THREE.Mesh;
} {
  const group = new THREE.Group();

  // Predator body - sleek predatory chitin
  const bodyMat = new THREE.MeshPhysicalMaterial({
    color: 0x18120c,
    emissive: 0x3d0c00,
    emissiveIntensity: 0.35,
    roughness: 0.3,
    metalness: 0.4,
    clearcoat: 0.8,
  });

  const stripeMat = new THREE.MeshStandardMaterial({
    color: 0xd97706, // Amber hornet hazard bands
    roughness: 0.4,
    metalness: 0.2,
  });

  // Glowing sinister compound eyes
  const predatorEyeMat = new THREE.MeshPhysicalMaterial({
    color: 0xff1e00,
    emissive: 0xff2200,
    emissiveIntensity: 1.2,
    roughness: 0.1,
    clearcoat: 1.0,
  });

  // Predator wings - dark translucent
  const predatorWingMat = new THREE.MeshPhysicalMaterial({
    color: 0x38bdf8,
    emissive: 0x0284c7,
    emissiveIntensity: 0.2,
    transparent: true,
    opacity: 0.45,
    roughness: 0.2,
    side: THREE.DoubleSide,
  });

  // Thorax
  const thoraxGeom = new THREE.SphereGeometry(pattern.radius * 0.55, 14, 14);
  thoraxGeom.scale(1.0, 0.9, 1.4);
  const thorax = new THREE.Mesh(thoraxGeom, bodyMat);
  group.add(thorax);

  // Head
  const headGeom = new THREE.SphereGeometry(pattern.radius * 0.42, 12, 12);
  headGeom.scale(1.2, 0.9, 0.9);
  const head = new THREE.Mesh(headGeom, bodyMat);
  head.position.set(0, 0.05, pattern.radius * 0.65);
  group.add(head);

  // Compound Eyes
  const eyeGeom = new THREE.SphereGeometry(pattern.radius * 0.18, 10, 10);
  eyeGeom.scale(0.8, 1.4, 1.2);
  const leftEye = new THREE.Mesh(eyeGeom, predatorEyeMat);
  leftEye.position.set(-pattern.radius * 0.28, 0.08, pattern.radius * 0.75);
  group.add(leftEye);

  const rightEye = new THREE.Mesh(eyeGeom, predatorEyeMat);
  rightEye.position.set(pattern.radius * 0.28, 0.08, pattern.radius * 0.75);
  group.add(rightEye);

  // Abdomen with warning stripes
  const abdomenGroup = new THREE.Group();
  abdomenGroup.position.set(0, -0.05, -pattern.radius * 0.65);

  const abdomenGeom = new THREE.ConeGeometry(pattern.radius * 0.45, pattern.radius * 1.5, 12);
  abdomenGeom.rotateX(-Math.PI * 0.5);
  const abdomen = new THREE.Mesh(abdomenGeom, bodyMat);
  abdomenGroup.add(abdomen);

  // Stripes
  [-0.2, -0.5, -0.8].forEach((zOff) => {
    const ringGeom = new THREE.TorusGeometry(pattern.radius * 0.32 * (1 + zOff * 0.4), pattern.radius * 0.04, 6, 12);
    const ring = new THREE.Mesh(ringGeom, stripeMat);
    ring.position.set(0, 0, zOff * pattern.radius);
    abdomenGroup.add(ring);
  });
  group.add(abdomenGroup);

  // Wings
  const wingGeom = new THREE.PlaneGeometry(pattern.radius * 1.8, pattern.radius * 0.65);
  wingGeom.translate(pattern.radius * 0.9, 0, 0);

  const leftWing = new THREE.Mesh(wingGeom, predatorWingMat);
  leftWing.position.set(-pattern.radius * 0.2, pattern.radius * 0.35, 0);
  leftWing.rotation.y = Math.PI * 0.1;
  group.add(leftWing);

  const rightWingGeom = wingGeom.clone();
  rightWingGeom.scale(-1, 1, 1);
  const rightWing = new THREE.Mesh(rightWingGeom, predatorWingMat);
  rightWing.position.set(pattern.radius * 0.2, pattern.radius * 0.35, 0);
  rightWing.rotation.y = -Math.PI * 0.1;
  group.add(rightWing);

  // Ground Target Projection Shadow Disc
  const shadowMat = new THREE.MeshBasicMaterial({
    color: 0x000000,
    transparent: true,
    opacity: 0.5,
  });
  const shadowGeom = new THREE.CircleGeometry(pattern.radius * 1.2, 24);
  shadowGeom.rotateX(-Math.PI / 2);
  const shadow = new THREE.Mesh(shadowGeom, shadowMat);
  shadow.position.y = -1.95;
  group.add(shadow);

  return { group, leftWing, rightWing, eyesMesh: leftEye };
}

export const NeuralDodgeCanvas: React.FC<NeuralDodgeCanvasProps> = ({
  onBackToMenu,
  onOpenFlyLab,
  onOpenBrainExplorer,
  onStartFlight,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);

  // Simulation State
  const [selectedThreat, setSelectedThreat] = useState<ThreatPattern>(THREAT_PATTERNS[0]);
  const [condition, setCondition] = useState<DodgeCondition>('intact');
  const [simSpeed, setSimSpeed] = useState<number>(1.0); // 1.0 = real-time, 0.45 = slow-mo
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [simState, setSimState] = useState<NeuralDodgeState>(() =>
    createInitialDodgeState(THREAT_PATTERNS[0], 'intact')
  );
  const [showDossierModal, setShowDossierModal] = useState<boolean>(false);
  const [showDebugPipeline, setShowDebugPipeline] = useState<boolean>(true);
  const [cameraPreset, setCameraPreset] = useState<CameraPreset>('chase');
  const [isMuted, setIsMuted] = useState<boolean>(() => sound.getIsMuted());

  // Mutable refs for simulation loop
  const simStateRef = useRef<NeuralDodgeState>(simState);
  const isPlayingRef = useRef<boolean>(isPlaying);
  const simSpeedRef = useRef<number>(simSpeed);
  const cameraPresetRef = useRef<CameraPreset>(cameraPreset);

  useEffect(() => {
    simStateRef.current = simState;
  }, [simState]);

  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  useEffect(() => {
    simSpeedRef.current = simSpeed;
  }, [simSpeed]);

  useEffect(() => {
    cameraPresetRef.current = cameraPreset;
  }, [cameraPreset]);

  // Restart / Replay current threat sequence under current condition
  const handleReplaySequence = useCallback(() => {
    const fresh = createInitialDodgeState(selectedThreat, condition);
    simStateRef.current = fresh;
    setSimState(fresh);
    setIsPlaying(true);
    sound.playThreatPulse();
  }, [selectedThreat, condition]);

  // Keyboard shortcut: 'R' to replay
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'r' || e.key === 'R') {
        handleReplaySequence();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleReplaySequence]);

  // Switch condition and immediately replay sequence to compare
  const handleSelectCondition = useCallback(
    (newCond: DodgeCondition) => {
      setCondition(newCond);
      if (newCond === 'lc4_ablated' || newCond === 'lplc2_ablated') {
        sound.playLaserAblate();
      } else {
        sound.playUiClick();
      }
      const fresh = createInitialDodgeState(selectedThreat, newCond);
      simStateRef.current = fresh;
      setSimState(fresh);
      setIsPlaying(true);
    },
    [selectedThreat]
  );

  // Switch threat pattern and reset
  const handleSelectThreat = useCallback(
    (threat: ThreatPattern) => {
      setSelectedThreat(threat);
      sound.playUiClick();
      const fresh = createInitialDodgeState(threat, condition);
      simStateRef.current = fresh;
      setSimState(fresh);
      setIsPlaying(true);
    },
    [condition]
  );

  // Three.js Canvas Scene Lifecycle
  useEffect(() => {
    if (!mountRef.current) return;
    const container = mountRef.current;

    // 1. Scene, Camera, Renderer
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x060914, 0.024);

    // Smooth third-person chase camera with wide FOV
    const camera = new THREE.PerspectiveCamera(
      48,
      container.clientWidth / container.clientHeight,
      0.1,
      140
    );
    // Initial camera position behind and above the fly
    camera.position.set(0, 2.2, 8.5);
    camera.lookAt(0, 0.4, -3.0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.25;
    container.appendChild(renderer.domElement);

    // 2. Cinematic Botanical Lighting
    const ambientLight = new THREE.AmbientLight(0x1e293b, 1.8);
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xfff7ed, 3.4);
    sunLight.position.set(6, 14, 8);
    scene.add(sunLight);

    const rimLight = new THREE.PointLight(0x06b6d4, 6.0, 30);
    rimLight.position.set(-5, 4, -8);
    scene.add(rimLight);

    const underLight = new THREE.PointLight(0x6366f1, 3.5, 25);
    underLight.position.set(4, -4, 3);
    scene.add(underLight);

    // 3. Environment: Botanical Perch Arena with Depth & Foliage
    const arenaGroup = new THREE.Group();
    scene.add(arenaGroup);

    // Giant curved mossy leaf/branch platform
    const branchGeom = new THREE.CylinderGeometry(0.7, 0.95, 20, 16);
    branchGeom.rotateZ(Math.PI / 2);
    const branchMat = new THREE.MeshStandardMaterial({
      color: 0x1e3a1f,
      roughness: 0.85,
      metalness: 0.05,
    });
    const branch = new THREE.Mesh(branchGeom, branchMat);
    branch.position.set(0, -1.0, 0);
    arenaGroup.add(branch);

    // Lush oversized botanical leaf pad where fly rests
    const leafGeom = new THREE.SphereGeometry(3.8, 16, 12);
    leafGeom.scale(1.2, 0.07, 2.0);
    const leafMat = new THREE.MeshStandardMaterial({
      color: 0x14532d,
      roughness: 0.55,
      metalness: 0.1,
    });
    const leaf = new THREE.Mesh(leafGeom, leafMat);
    leaf.position.set(0, -0.55, 0);
    arenaGroup.add(leaf);

    // Leaf vein ridges for realistic depth
    const veinMat = new THREE.MeshStandardMaterial({
      color: 0x166534,
      roughness: 0.4,
    });
    const mainVein = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.02, 7.0, 8), veinMat);
    mainVein.rotation.x = Math.PI / 2;
    mainVein.position.set(0, -0.48, 0);
    arenaGroup.add(mainVein);

    // Distant background foliage discs to establish scenic depth ahead
    for (let i = 0; i < 6; i++) {
      const bgLeafGeom = new THREE.SphereGeometry(4 + Math.random() * 3, 12, 8);
      bgLeafGeom.scale(1.4, 0.05, 1.8);
      const bgLeafMat = new THREE.MeshStandardMaterial({
        color: 0x064e3b,
        roughness: 0.8,
        transparent: true,
        opacity: 0.45,
      });
      const bgLeaf = new THREE.Mesh(bgLeafGeom, bgLeafMat);
      bgLeaf.position.set((i % 2 === 0 ? 1 : -1) * (8 + Math.random() * 6), -3 + Math.random() * 4, -18 - i * 5);
      arenaGroup.add(bgLeaf);
    }

    // Dew droplets on leaf
    [-1.2, 1.4, -0.8].forEach((x, idx) => {
      const dewGeom = new THREE.SphereGeometry(0.12 + idx * 0.04, 12, 12);
      const dewMat = new THREE.MeshPhysicalMaterial({
        color: 0xffffff,
        transmission: 0.9,
        opacity: 1,
        transparent: true,
        roughness: 0.05,
        ior: 1.33,
      });
      const dew = new THREE.Mesh(dewGeom, dewMat);
      dew.position.set(x, -0.46, -1.2 + idx * 1.5);
      arenaGroup.add(dew);
    });

    // Bio-luminescent spores floating in air
    const particleCount = 140;
    const particleGeom = new THREE.BufferGeometry();
    const particlePos = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i++) {
      particlePos[i * 3] = (Math.random() - 0.5) * 28;
      particlePos[i * 3 + 1] = Math.random() * 10 - 2;
      particlePos[i * 3 + 2] = (Math.random() - 0.5) * 32 - 6;
    }
    particleGeom.setAttribute('position', new THREE.BufferAttribute(particlePos, 3));
    const sporeMat = new THREE.PointsMaterial({
      size: 0.16,
      map: createSoftParticleTexture(false),
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      color: 0x38bdf8,
    });
    const spores = new THREE.Points(particleGeom, sporeMat);
    arenaGroup.add(spores);

    // 4. 3D Fruit Fly Model (Proper third-person scale: 0.68)
    const fly = createFruitFlyModel();
    fly.root.scale.set(0.68, 0.68, 0.68);
    fly.root.position.set(0, 0, 0);
    scene.add(fly.root);

    // Compound Eye Neural Excitation Halo Mesh on Fly
    const eyeGlowMat = new THREE.MeshBasicMaterial({
      color: 0x34d399,
      transparent: true,
      opacity: 0.0,
      blending: THREE.AdditiveBlending,
    });
    const eyeGlowGeom = new THREE.SphereGeometry(0.3, 12, 12);
    const eyeGlowMesh = new THREE.Mesh(eyeGlowGeom, eyeGlowMat);
    eyeGlowMesh.position.set(0, 0.1, -0.45);
    fly.root.add(eyeGlowMesh);

    // Threat Trajectory Guide Line (Subtle dashed visual vector showing attack corridor)
    const lineGeom = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(...selectedThreat.startPos),
      new THREE.Vector3(...selectedThreat.targetPos),
    ]);
    const lineMat = new THREE.LineDashedMaterial({
      color: 0xf59e0b,
      dashSize: 0.6,
      gapSize: 0.4,
      transparent: true,
      opacity: 0.35,
    });
    const trajectoryLine = new THREE.Line(lineGeom, lineMat);
    trajectoryLine.computeLineDistances();
    scene.add(trajectoryLine);

    // 5. 3D Predator Threat Obstacle
    let predatorObj = createPredatorModel(selectedThreat);
    predatorObj.group.position.set(...selectedThreat.startPos);
    scene.add(predatorObj.group);

    // Kinetic impact burst effect
    const impactGeom = new THREE.RingGeometry(0.2, 2.0, 24);
    const impactMat = new THREE.MeshBasicMaterial({
      color: 0xff3b30,
      transparent: true,
      opacity: 0.0,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
    });
    const impactMesh = new THREE.Mesh(impactGeom, impactMat);
    impactMesh.rotation.x = -Math.PI / 2;
    scene.add(impactMesh);

    // Re-create predator whenever selected threat changes
    const updatePredatorGeometry = (threat: ThreatPattern) => {
      scene.remove(predatorObj.group);
      predatorObj = createPredatorModel(threat);
      predatorObj.group.position.set(...threat.startPos);
      scene.add(predatorObj.group);

      // Update trajectory guide line
      const pts = [new THREE.Vector3(...threat.startPos), new THREE.Vector3(...threat.targetPos)];
      trajectoryLine.geometry.setFromPoints(pts);
      trajectoryLine.computeLineDistances();
    };

    // 6. Camera Orbit & Drag Controls
    let isDragging = false;
    let prevMouseX = 0;
    let prevMouseY = 0;
    let orbitAngleX = 0;
    let orbitAngleY = 0.15;

    const onMouseDown = (e: MouseEvent) => {
      isDragging = true;
      prevMouseX = e.clientX;
      prevMouseY = e.clientY;
    };
    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      const dx = e.clientX - prevMouseX;
      const dy = e.clientY - prevMouseY;
      prevMouseX = e.clientX;
      prevMouseY = e.clientY;
      orbitAngleX += dx * 0.006;
      orbitAngleY = Math.max(-0.25, Math.min(0.85, orbitAngleY + dy * 0.005));
    };
    const onMouseUp = () => {
      isDragging = false;
    };

    const dom = renderer.domElement;
    dom.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);

    // 7. Simulation & Animation Loop
    let lastClock = performance.now();
    let animReqId: number;
    let previousVerdict = simStateRef.current.verdict;

    // Smoothed chase camera position vectors for smooth following
    const currentCamPos = new THREE.Vector3(0, 2.2, 8.5);
    const currentCamLook = new THREE.Vector3(0, 0.4, -3.0);

    const animate = () => {
      animReqId = requestAnimationFrame(animate);
      const now = performance.now();
      const rawDt = Math.min(0.05, (now - lastClock) / 1000);
      lastClock = now;

      const currentThreat = simStateRef.current.threat;
      if (currentThreat.id !== selectedThreat.id) {
        updatePredatorGeometry(simStateRef.current.threat);
      }

      // Step simulation if playing
      if (isPlayingRef.current) {
        const dt = rawDt * simSpeedRef.current;
        const nextState = stepDodgeSimulation(simStateRef.current, dt);

        // Sound Triggers on State Transitions
        if (!previousVerdict && nextState.verdict === 'spiked') {
          sound.playGiantFiberSpike();
          sound.playEscapeTrigger();
        } else if (previousVerdict !== 'spiked' && nextState.verdict === 'spiked') {
          sound.playGiantFiberSpike();
          sound.playEscapeTrigger();
        } else if (previousVerdict !== 'struck' && nextState.verdict === 'struck') {
          sound.playPredatorImpact();
        }
        previousVerdict = nextState.verdict;

        simStateRef.current = nextState;
        setSimState(nextState);
      }

      const st = simStateRef.current;

      // Update 3D Fly Position & Rotation directly from simulation state
      fly.root.position.set(st.flyPos[0], st.flyPos[1], st.flyPos[2]);
      fly.root.rotation.set(st.flyRotation[0], st.flyRotation[1], st.flyRotation[2]);

      // Wing animation frequency: surges to 450 Hz during emergency escape jump!
      const wingSpeedRatio = st.isDodging ? 2.8 : 1.0;
      fly.updateAnimation(now * 0.001, wingSpeedRatio, st.isDodging);

      // Eye Glow: Reflects neural excitation V_GF
      if (st.condition === 'lc4_ablated') {
        eyeGlowMat.color.setHex(0xf43f5e);
        eyeGlowMat.opacity = Math.min(0.25, st.membranePotential * 0.5);
      } else if (st.condition === 'lplc2_ablated') {
        eyeGlowMat.color.setHex(0xf59e0b);
        eyeGlowMat.opacity = st.hasSpiked ? 0.9 : Math.min(0.7, st.membranePotential);
      } else {
        if (st.hasSpiked) {
          eyeGlowMat.color.setHex(0xffffff); // Action potential flash!
          eyeGlowMat.opacity = 0.95;
        } else {
          eyeGlowMat.color.setHex(0x10b981);
          eyeGlowMat.opacity = Math.min(0.85, st.membranePotential * 1.2);
        }
      }

      // Update 3D Predator Position & Wing Flap
      predatorObj.group.position.set(st.threatPos[0], st.threatPos[1], st.threatPos[2]);
      predatorObj.group.lookAt(st.flyPos[0], st.flyPos[1] + 0.15, st.flyPos[2]);

      // Predator wing flapping
      const predatorWingFreq = now * 0.045;
      predatorObj.leftWing.rotation.z = Math.sin(predatorWingFreq) * 0.55;
      predatorObj.rightWing.rotation.z = -Math.sin(predatorWingFreq) * 0.55;

      // Impact Shockwave FX
      if (st.isCollision) {
        impactMesh.position.set(st.flyPos[0], st.flyPos[1], st.flyPos[2]);
        impactMat.opacity = Math.min(0.8, impactMat.opacity + 0.1);
        impactMesh.scale.addScalar(0.08);
      } else {
        impactMat.opacity = 0;
        impactMesh.scale.set(1, 1, 1);
      }

      // Dynamic Chase Camera Framing
      // The camera tracks behind and slightly above the fly, showing ample space ahead
      const preset = cameraPresetRef.current;
      const targetLookX = st.flyPos[0] * 0.7;
      const targetLookY = st.flyPos[1] * 0.7 + 0.35;
      const targetLookZ = st.flyPos[2] * 0.7 - 2.8; // Looking forward toward incoming threat

      let desiredCamX = 0;
      let desiredCamY = 2.0;
      let desiredCamZ = 8.5;

      if (preset === 'chase') {
        // Third-person chase following behind fly with user orbit offset
        const chaseRadius = 8.8;
        desiredCamX = st.flyPos[0] * 0.4 + Math.sin(orbitAngleX) * chaseRadius * Math.cos(orbitAngleY);
        desiredCamY = st.flyPos[1] * 0.4 + Math.sin(orbitAngleY) * chaseRadius + 1.8;
        desiredCamZ = st.flyPos[2] * 0.4 + Math.cos(orbitAngleX) * chaseRadius * Math.cos(orbitAngleY);
      } else if (preset === 'side') {
        // Lateral profile view: ideal for seeing jump height and takeoff latency
        desiredCamX = st.flyPos[0] * 0.4 + 8.5;
        desiredCamY = st.flyPos[1] * 0.4 + 1.6;
        desiredCamZ = st.flyPos[2] * 0.4 - 1.0;
      } else if (preset === 'overhead') {
        // Top-down tactical receptive field view
        desiredCamX = st.flyPos[0] * 0.4;
        desiredCamY = st.flyPos[1] * 0.4 + 11.5;
        desiredCamZ = st.flyPos[2] * 0.4 + 0.5;
      }

      // Smooth camera interpolation (lerp)
      currentCamPos.lerp(new THREE.Vector3(desiredCamX, desiredCamY, desiredCamZ), 0.08);
      currentCamLook.lerp(new THREE.Vector3(targetLookX, targetLookY, targetLookZ), 0.08);

      camera.position.copy(currentCamPos);
      camera.lookAt(currentCamLook);

      // Render scene
      renderer.render(scene, camera);
    };

    animate();

    const handleResize = () => {
      if (!container) return;
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animReqId);
      dom.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('resize', handleResize);
      if (renderer.domElement && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [selectedThreat]);

  // Sparkline calculation for live oscilloscope
  const sparklinePoints = simState.history
    .map((h, i, arr) => {
      const x = (i / Math.max(1, arr.length - 1)) * 220;
      const y = 50 - Math.min(1, h.membranePotential / 1.0) * 45;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  const thresholdY = 50 - (MODEL_CONSTANTS.V_THRESH / 1.0) * 45;
  const currentConditionMeta = CONDITION_REGISTRY[condition];

  return (
    <div className="relative w-full h-full bg-[#060914] text-slate-100 flex flex-col overflow-hidden select-none">
      {/* 1. 3D WebGL Canvas Layer */}
      <div
        ref={mountRef}
        className="absolute inset-0 z-0 cursor-grab active:cursor-grabbing"
        title="Click and drag to rotate camera"
      />

      {/* Vignette / collision flash overlay */}
      <div
        className={`absolute inset-0 pointer-events-none transition-colors duration-300 z-[1] ${
          simState.isCollision
            ? 'bg-rose-950/40 border-4 border-rose-500/80 animate-pulse'
            : simState.isEscaped
            ? 'bg-emerald-950/20'
            : 'bg-radial-gradient'
        }`}
      />

      {/* 2. Top Navigation Bar */}
      <header className="relative z-20 flex items-center justify-between px-6 py-3.5 bg-slate-950/85 backdrop-blur-md border-b border-white/10">
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              sound.playUiClick();
              onBackToMenu();
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs text-slate-300 hover:text-white transition-all cursor-pointer border border-white/10"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Menu</span>
          </button>

          <div className="h-5 w-px bg-white/10" />

          <div>
            <div className="flex items-center gap-2">
              <span className="font-display font-extrabold tracking-wide text-lg text-white">
                NEURAL FLIGHT CHALLENGE
              </span>
              <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                Fly Using Its Brain
              </span>
            </div>
            <div className="text-[11px] text-slate-400">
              Autonomous Fruit Fly Escape Circuit (LC4 + LPLC2 → Giant Fiber) Driven by Connectome Weights
            </div>
          </div>
        </div>

        {/* Center / Navigation Links */}
        <div className="hidden lg:flex items-center gap-2">
          <button
            onClick={() => {
              sound.playUiClick();
              onOpenBrainExplorer();
            }}
            className="px-3 py-1.5 rounded-lg bg-cyan-950/50 hover:bg-cyan-900/60 border border-cyan-500/30 text-cyan-300 text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Compass className="w-3.5 h-3.5 text-cyan-400" />
            <span>1. Brain Lab</span>
          </button>

          <button
            onClick={() => {
              sound.playUiClick();
              onOpenFlyLab();
            }}
            className="px-3 py-1.5 rounded-lg bg-rose-950/50 hover:bg-rose-900/60 border border-rose-500/30 text-rose-300 text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Scissors className="w-3.5 h-3.5 text-rose-400" />
            <span>2. Looming Experiment</span>
          </button>

          <span className="px-3 py-1.5 rounded-lg bg-amber-500/25 border border-amber-400/50 text-amber-200 text-xs font-bold flex items-center gap-1.5 shadow-sm">
            <Crosshair className="w-3.5 h-3.5 text-amber-400" />
            <span>3. Neural Flight</span>
          </span>

          <button
            onClick={() => {
              sound.playUiClick();
              onStartFlight();
            }}
            className="px-3 py-1.5 rounded-lg bg-emerald-950/50 hover:bg-emerald-900/60 border border-emerald-500/30 text-emerald-300 text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Play className="w-3.5 h-3.5 text-emerald-400 fill-emerald-400" />
            <span>4. Manual Flight</span>
          </button>
        </div>

        {/* Right Controls */}
        <div className="flex items-center gap-2">
          {/* Debug View Toggle */}
          <button
            onClick={() => {
              sound.playUiClick();
              setShowDebugPipeline(!showDebugPipeline);
            }}
            className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
              showDebugPipeline
                ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                : 'bg-slate-800/80 text-slate-400 border-white/10 hover:text-white'
            }`}
            title="Toggle Live Neural Circuit Flow Diagram"
          >
            <Activity className="w-3.5 h-3.5 text-cyan-400" />
            <span>Circuit Debug</span>
          </button>

          <button
            onClick={() => setShowDossierModal(true)}
            className="px-3 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-white/10 text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
          >
            <BookOpen className="w-3.5 h-3.5 text-cyan-400" />
            <span>Dossier</span>
          </button>

          <button
            onClick={() => {
              const next = !isMuted;
              setIsMuted(next);
              sound.setMuted(next);
            }}
            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all cursor-pointer border border-white/10"
            title={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4 text-cyan-400" />}
          </button>
        </div>
      </header>

      {/* 3. Conditions Bar (5 Selectable Brain States) */}
      <div className="relative z-20 px-6 py-2 bg-slate-900/90 backdrop-blur-md border-b border-white/10 flex flex-wrap items-center justify-between gap-3">
        {/* All 5 Condition Buttons */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mr-1 flex items-center gap-1">
            <Layers className="w-3 h-3 text-cyan-400" />
            Brain State:
          </span>

          {/* 1. Intact Baseline */}
          <button
            onClick={() => handleSelectCondition('intact')}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              condition === 'intact'
                ? 'bg-emerald-500/25 border-2 border-emerald-400 text-emerald-300 shadow-md shadow-emerald-500/20'
                : 'bg-slate-800/60 border border-white/10 text-slate-400 hover:text-white hover:bg-slate-700/60'
            }`}
          >
            <Zap className={`w-3.5 h-3.5 ${condition === 'intact' ? 'text-emerald-400 fill-emerald-400' : ''}`} />
            <span>⚡ Intact (Wild-Type)</span>
          </button>

          {/* 2. LC4 Ablated */}
          <button
            onClick={() => handleSelectCondition('lc4_ablated')}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              condition === 'lc4_ablated'
                ? 'bg-rose-500/25 border-2 border-rose-400 text-rose-300 shadow-md shadow-rose-500/20'
                : 'bg-slate-800/60 border border-white/10 text-slate-400 hover:text-white hover:bg-slate-700/60'
            }`}
          >
            <Scissors className="w-3.5 h-3.5 text-rose-400" />
            <span>✂️ LC4 Ablated (-89%)</span>
          </button>

          {/* 3. LPLC2 Ablated */}
          <button
            onClick={() => handleSelectCondition('lplc2_ablated')}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              condition === 'lplc2_ablated'
                ? 'bg-amber-500/25 border-2 border-amber-400 text-amber-300 shadow-md shadow-amber-500/20'
                : 'bg-slate-800/60 border border-white/10 text-slate-400 hover:text-white hover:bg-slate-700/60'
            }`}
          >
            <Scissors className="w-3.5 h-3.5 text-amber-400" />
            <span>✂️ LPLC2 Ablated (-11%)</span>
          </button>

          {/* 4. LC11 Control */}
          <button
            onClick={() => handleSelectCondition('lc11_control')}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              condition === 'lc11_control'
                ? 'bg-cyan-500/25 border-2 border-cyan-400 text-cyan-300 shadow-md shadow-cyan-500/20'
                : 'bg-slate-800/60 border border-white/10 text-slate-400 hover:text-white hover:bg-slate-700/60'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span>🔬 LC11 Control (0%)</span>
          </button>

          {/* 5. LC6 Control */}
          <button
            onClick={() => handleSelectCondition('lc6_control')}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              condition === 'lc6_control'
                ? 'bg-indigo-500/25 border-2 border-indigo-400 text-indigo-300 shadow-md shadow-indigo-500/20'
                : 'bg-slate-800/60 border border-white/10 text-slate-400 hover:text-white hover:bg-slate-700/60'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            <span>🔬 LC6 Control (0%)</span>
          </button>
        </div>

        {/* 4 Repeatable Threat Scenarios & Replay Action */}
        <div className="flex items-center gap-2">
          {/* Threat Scenarios Selector */}
          <div className="flex items-center gap-1 bg-slate-950/80 p-0.5 rounded-lg border border-white/10">
            {THREAT_PATTERNS.map((threat, idx) => (
              <button
                key={threat.id}
                onClick={() => handleSelectThreat(threat)}
                className={`px-2 py-1 rounded text-[11px] font-medium transition-all cursor-pointer ${
                  selectedThreat.id === threat.id
                    ? 'bg-cyan-500/30 text-cyan-200 border border-cyan-400/50 font-bold'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
                title={`${threat.name}: ${threat.description}`}
              >
                Wave {idx + 1}
              </button>
            ))}
          </div>

          {/* Prominent Replay Button */}
          <button
            onClick={handleReplaySequence}
            className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black font-extrabold text-xs transition-all flex items-center gap-1.5 cursor-pointer shadow-md shadow-cyan-500/25 active:scale-95"
            title="Replay the exact same threat sequence to compare brain conditions (Press 'R')"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Replay Sequence [R]</span>
          </button>

          {/* Pause / Play */}
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-slate-200 transition-all cursor-pointer border border-white/10"
            title={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-current" />}
          </button>

          {/* Speed Toggle */}
          <button
            onClick={() => setSimSpeed(simSpeed === 1.0 ? 0.45 : 1.0)}
            className="px-2 py-1 rounded text-[11px] font-medium bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 cursor-pointer"
            title="Toggle between Real-Time and Slow-Motion"
          >
            {simSpeed === 1.0 ? '1.0x' : '0.45x Slow'}
          </button>

          {/* Camera Presets */}
          <div className="flex items-center gap-1 bg-slate-950/70 p-0.5 rounded-lg border border-white/10">
            <Camera className="w-3 h-3 text-slate-400 ml-1" />
            <button
              onClick={() => setCameraPreset('chase')}
              className={`px-1.5 py-0.5 rounded text-[10px] ${
                cameraPreset === 'chase' ? 'bg-cyan-500/30 text-cyan-200 font-bold' : 'text-slate-400 hover:text-white'
              }`}
              title="Third-person chase camera (following behind fly)"
            >
              Chase
            </button>
            <button
              onClick={() => setCameraPreset('side')}
              className={`px-1.5 py-0.5 rounded text-[10px] ${
                cameraPreset === 'side' ? 'bg-cyan-500/30 text-cyan-200 font-bold' : 'text-slate-400 hover:text-white'
              }`}
              title="Side view profile (observe jump height)"
            >
              Side
            </button>
            <button
              onClick={() => setCameraPreset('overhead')}
              className={`px-1.5 py-0.5 rounded text-[10px] ${
                cameraPreset === 'overhead' ? 'bg-cyan-500/30 text-cyan-200 font-bold' : 'text-slate-400 hover:text-white'
              }`}
              title="Overhead tactical view"
            >
              Top
            </button>
          </div>
        </div>
      </div>

      {/* 4. Concise Science Summary Ribbon */}
      <div className="relative z-10 px-6 py-1.5 bg-slate-950/90 border-b border-white/5 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <Info className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
          <span className="text-slate-200">
            <strong className="text-cyan-300">{currentConditionMeta.name}:</strong>{' '}
            {currentConditionMeta.plainSummary}
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0 ml-4 font-mono text-[11px] text-slate-400">
          <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10">
            Ref Escape Signal: <strong className="text-white">{currentConditionMeta.referenceEscapeSignal}</strong>
          </span>
          <span className={`px-2 py-0.5 rounded border ${currentConditionMeta.badgeColor}`}>
            Delta: {currentConditionMeta.signalDeltaPercent > 0 ? '+' : ''}{currentConditionMeta.signalDeltaPercent}%
          </span>
        </div>
      </div>

      {/* 5. Live Circuit Flow Pipeline (Debug View) */}
      {showDebugPipeline && (
        <div className="relative z-20 px-6 py-2 bg-slate-950/80 backdrop-blur-md border-b border-white/10">
          <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
            <span className="flex items-center gap-1 text-cyan-400">
              <Activity className="w-3 h-3" />
              Neural Circuit Flow: Threat Optics → Columnar Drive → Giant Fiber Integration → Evasive Motor Jump
            </span>
            <span className="text-slate-500 font-normal normal-case">
              Simplified dynamical single-compartment model
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-2 text-xs">
            {/* Box 1: Threat Input */}
            <div className="bg-slate-900/80 p-2 rounded-lg border border-white/10">
              <div className="text-[10px] font-bold text-slate-400 uppercase mb-1">
                1. Looming Threat Input
              </div>
              <div className="flex justify-between text-[11px]">
                <span className="text-slate-400">Optical Expansion:</span>
                <span className="font-mono text-cyan-300 font-bold">{Math.round(simState.angularExpansionRate)}°/s</span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span className="text-slate-400">Visual Angle θ(t):</span>
                <span className="font-mono text-amber-300 font-bold">{Math.round(simState.angularSizeDeg)}°</span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span className="text-slate-400">Normalized Loom S:</span>
                <span className="font-mono text-white font-bold">{simState.loomingStimulus.toFixed(2)}</span>
              </div>
            </div>

            {/* Box 2: Columnar Neurons */}
            <div className="bg-slate-900/80 p-2 rounded-lg border border-white/10">
              <div className="text-[10px] font-bold text-slate-400 uppercase mb-1">
                2. Lobula Projection Neurons
              </div>
              <div className="flex justify-between text-[11px]">
                <span className="text-slate-400">LC4 Drive (85% wt):</span>
                <span className={`font-mono font-bold ${condition === 'lc4_ablated' ? 'text-rose-400' : 'text-emerald-400'}`}>
                  {condition === 'lc4_ablated' ? '0.00 (Ablated)' : simState.lc4Drive.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span className="text-slate-400">LPLC2 Drive (15% wt):</span>
                <span className={`font-mono font-bold ${condition === 'lplc2_ablated' ? 'text-rose-400' : 'text-amber-400'}`}>
                  {condition === 'lplc2_ablated' ? '0.00 (Ablated)' : simState.lplc2Drive.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span className="text-slate-400">Negative Controls:</span>
                <span className="font-mono text-slate-400">LC11/LC6 (0% on GF)</span>
              </div>
            </div>

            {/* Box 3: Giant Fiber Leaky Integrator */}
            <div className="bg-slate-900/80 p-2 rounded-lg border border-white/10">
              <div className="text-[10px] font-bold text-slate-400 uppercase mb-1">
                3. Giant Fiber Integration
              </div>
              <div className="flex justify-between text-[11px]">
                <span className="text-slate-400">Synaptic Current I_syn:</span>
                <span className="font-mono text-cyan-300 font-bold">{simState.synapticDrive.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span className="text-slate-400">Membrane V_GF(t):</span>
                <span className="font-mono font-bold text-amber-300">
                  {simState.membranePotential.toFixed(2)} / {MODEL_CONSTANTS.V_THRESH}
                </span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span className="text-slate-400">Spike State:</span>
                <span className={`font-mono font-bold ${simState.hasSpiked ? 'text-emerald-300' : 'text-slate-500'}`}>
                  {simState.hasSpiked ? '⚡ AP SPIKE FIRED' : 'Sub-Threshold'}
                </span>
              </div>
            </div>

            {/* Box 4: Motor Output & Evasion */}
            <div className="bg-slate-900/80 p-2 rounded-lg border border-white/10">
              <div className="text-[10px] font-bold text-slate-400 uppercase mb-1">
                4. Motor Saccade Decision
              </div>
              <div className="flex justify-between text-[11px]">
                <span className="text-slate-400">Motor Latency:</span>
                <span className="font-mono text-slate-300">22 ms leg extension</span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span className="text-slate-400">Lead Time to Strike:</span>
                <span className="font-mono font-bold text-cyan-300">
                  {simState.timeBeforeImpactAtSpikeMs !== null ? `${simState.timeBeforeImpactAtSpikeMs} ms` : 'None (No Spike)'}
                </span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span className="text-slate-400">Kinematic Result:</span>
                <span className={`font-mono font-bold ${
                  simState.isDodging ? 'text-emerald-300' : simState.isCollision ? 'text-rose-400' : 'text-slate-400'
                }`}>
                  {simState.isDodging ? 'Ballistic Evasion' : simState.isCollision ? 'Fatal Impact' : 'Perched / Waiting'}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 6. Live HUD Telemetry Layer (Bottom Overlay) */}
      <div className="relative z-20 mt-auto p-6 pointer-events-none grid grid-cols-1 md:grid-cols-12 gap-4">
        {/* Left Telemetry Card (Optical Sensor & Synaptic Drive) */}
        <div className="md:col-span-4 bg-slate-950/85 backdrop-blur-md rounded-xl p-4 border border-white/10 shadow-2xl pointer-events-auto flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-3">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-300">
                <Crosshair className="w-3.5 h-3.5 text-cyan-400" />
                <span>LOOMING OPTICAL SENSOR</span>
              </div>
              <span className="text-[10px] font-mono text-cyan-400">
                {selectedThreat.name}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center mb-3">
              <div className="bg-slate-900/60 p-2 rounded-lg border border-white/5">
                <div className="text-[10px] text-slate-400 uppercase">Distance D</div>
                <div className="text-sm font-mono font-bold text-white">
                  {simState.threatDistance.toFixed(1)} <span className="text-[10px] text-slate-400">m</span>
                </div>
              </div>

              <div className="bg-slate-900/60 p-2 rounded-lg border border-white/5">
                <div className="text-[10px] text-slate-400 uppercase">Visual θ(t)</div>
                <div className="text-sm font-mono font-bold text-amber-300">
                  {Math.round(simState.angularSizeDeg)}°
                </div>
              </div>

              <div className="bg-slate-900/60 p-2 rounded-lg border border-white/5">
                <div className="text-[10px] text-slate-400 uppercase">Expansion dθ/dt</div>
                <div className="text-sm font-mono font-bold text-cyan-300">
                  {Math.round(simState.angularExpansionRate)}°/s
                </div>
              </div>
            </div>

            {/* Lobula Columnar Synaptic Contributions */}
            <div className="space-y-1.5 text-xs">
              <div className="flex items-center justify-between text-slate-300">
                <span className="text-[11px] text-slate-400">LC4 Excitatory Drive:</span>
                <span className={`font-mono font-bold ${condition === 'lc4_ablated' ? 'text-rose-400' : 'text-emerald-400'}`}>
                  {condition === 'lc4_ablated' ? '0.00 (Ablated)' : simState.lc4Drive.toFixed(2)}
                </span>
              </div>
              <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all ${condition === 'lc4_ablated' ? 'bg-rose-500 w-0' : 'bg-emerald-400'}`}
                  style={{ width: `${Math.min(100, (simState.lc4Drive / 0.85) * 100)}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-slate-300 pt-1">
                <span className="text-[11px] text-slate-400">LPLC2 Synergy Drive:</span>
                <span className={`font-mono font-bold ${condition === 'lplc2_ablated' ? 'text-rose-400' : 'text-amber-300'}`}>
                  {condition === 'lplc2_ablated' ? '0.00 (Ablated)' : simState.lplc2Drive.toFixed(2)}
                </span>
              </div>
              <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                <div
                  className="h-full bg-amber-400 transition-all"
                  style={{ width: `${Math.min(100, (simState.lplc2Drive / 0.15) * 100)}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Center Card: Giant Fiber Leaky-Integrate Membrane Potential & Oscilloscope */}
        <div className="md:col-span-5 bg-slate-950/85 backdrop-blur-md rounded-xl p-4 border border-white/10 shadow-2xl pointer-events-auto flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-300">
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                <span>GIANT FIBER MEMBRANE POTENTIAL V(t)</span>
              </div>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                simState.hasSpiked
                  ? 'bg-emerald-500/30 text-emerald-300 border border-emerald-400/50'
                  : 'bg-slate-800 text-slate-400'
              }`}>
                {simState.hasSpiked ? '⚡ AP FIRED' : 'SUB-THRESHOLD'}
              </span>
            </div>

            {/* Live Meter Bar */}
            <div className="mb-2">
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-[11px] text-slate-400 font-mono">
                  V_GF = {simState.membranePotential.toFixed(3)}
                </span>
                <span className="text-[11px] text-amber-300 font-mono">
                  Threshold = {MODEL_CONSTANTS.V_THRESH}
                </span>
              </div>

              <div className="relative w-full h-3 bg-slate-800 rounded-full overflow-hidden">
                {/* Threshold Tick Line */}
                <div
                  className="absolute top-0 bottom-0 w-0.5 bg-amber-400 z-10 shadow-sm shadow-amber-400"
                  style={{ left: `${MODEL_CONSTANTS.V_THRESH * 100}%` }}
                />
                <div
                  className={`h-full transition-all duration-75 ${
                    simState.hasSpiked
                      ? 'bg-gradient-to-r from-emerald-500 to-cyan-300'
                      : condition === 'lc4_ablated'
                      ? 'bg-gradient-to-r from-rose-500 to-rose-400'
                      : condition === 'lplc2_ablated'
                      ? 'bg-gradient-to-r from-amber-500 to-amber-400'
                      : 'bg-gradient-to-r from-cyan-500 to-emerald-400'
                  }`}
                  style={{ width: `${Math.min(100, (simState.membranePotential / 1.0) * 100)}%` }}
                />
              </div>
            </div>

            {/* Live Oscilloscope Sparkline */}
            <div className="relative bg-slate-900/90 rounded-lg p-2 border border-white/5 h-20 overflow-hidden flex flex-col justify-end">
              <div className="absolute top-1 left-2 text-[9px] font-mono text-slate-500">
                Leaky-Integrator Dynamics dV/dt (tau = 45ms)
              </div>
              <svg className="w-full h-full" viewBox="0 0 220 50" preserveAspectRatio="none">
                <line
                  x1="0"
                  y1={thresholdY}
                  x2="220"
                  y2={thresholdY}
                  stroke="#fbbf24"
                  strokeWidth="1"
                  strokeDasharray="4,2"
                />
                {sparklinePoints && (
                  <polyline
                    fill="none"
                    stroke={
                      simState.hasSpiked
                        ? '#34d399'
                        : condition === 'lc4_ablated'
                        ? '#fb7185'
                        : condition === 'lplc2_ablated'
                        ? '#fbbf24'
                        : '#38bdf8'
                    }
                    strokeWidth="2"
                    points={sparklinePoints}
                  />
                )}
              </svg>
            </div>
          </div>
        </div>

        {/* Right Outcome Card: Prominent Behavioral Verdict & Metrics */}
        <div className={`md:col-span-3 rounded-xl p-4 border shadow-2xl pointer-events-auto flex flex-col justify-between ${
          simState.verdict === 'escaped'
            ? 'bg-emerald-950/85 border-emerald-500/50 text-emerald-100'
            : simState.verdict === 'delayed_escaped'
            ? 'bg-amber-950/85 border-amber-500/50 text-amber-100'
            : simState.verdict === 'struck'
            ? 'bg-rose-950/85 border-rose-500/50 text-rose-100'
            : simState.verdict === 'spiked'
            ? 'bg-cyan-950/85 border-cyan-500/50 text-cyan-100'
            : 'bg-slate-950/85 border-white/10 text-slate-200'
        }`}>
          <div>
            <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400 mb-1">
              Autonomous Behavioral Verdict
            </div>

            <div className="flex items-center gap-2 mb-2">
              {simState.verdict === 'escaped' && (
                <>
                  <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" />
                  <span className="font-display font-black text-2xl text-emerald-300 tracking-wide">
                    ESCAPED
                  </span>
                </>
              )}
              {simState.verdict === 'delayed_escaped' && (
                <>
                  <AlertTriangleIcon className="w-6 h-6 text-amber-400 shrink-0" />
                  <span className="font-display font-black text-2xl text-amber-300 tracking-wide">
                    DELAYED ESCAPE
                  </span>
                </>
              )}
              {simState.verdict === 'struck' && (
                <>
                  <XCircle className="w-6 h-6 text-rose-400 shrink-0" />
                  <span className="font-display font-black text-2xl text-rose-300 tracking-wide">
                    FATAL STRIKE
                  </span>
                </>
              )}
              {simState.verdict === 'spiked' && (
                <>
                  <Zap className="w-6 h-6 text-cyan-400 shrink-0" />
                  <span className="font-display font-black text-2xl text-cyan-300 tracking-wide">
                    JUMP FIRED
                  </span>
                </>
              )}
              {(simState.verdict === 'idle' || simState.verdict === 'tracking') && (
                <>
                  <Eye className="w-6 h-6 text-slate-400 shrink-0" />
                  <span className="font-display font-black text-2xl text-slate-300 tracking-wide">
                    {simState.verdict === 'tracking' ? 'TRACKING' : 'SCANNING'}
                  </span>
                </>
              )}
            </div>

            <p className="text-xs leading-relaxed opacity-90 mb-3">
              {simState.statusText}
            </p>
          </div>

          <div className="space-y-1.5 pt-2 border-t border-white/10 text-[11px]">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Dodge Lead Time:</span>
              <span className="font-mono font-bold text-white">
                {simState.timeBeforeImpactAtSpikeMs !== null ? `${simState.timeBeforeImpactAtSpikeMs} ms` : 'N/A'}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-400">Min Clearance Margin:</span>
              <span className="font-mono font-bold text-white">
                {simState.minDistanceRecorded.toFixed(1)} m
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-400">Model Drive Loss:</span>
              <span className="font-mono font-bold">
                {currentConditionMeta.signalDeltaPercent === 0
                  ? '0.0% (Normal)'
                  : `${currentConditionMeta.signalDeltaPercent}%`}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 7. Neuroscience & Connectome Dossier Modal */}
      {showDossierModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-white/15 rounded-2xl max-w-2xl w-full max-h-[85vh] overflow-y-auto p-6 shadow-2xl text-slate-200">
            <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-4">
              <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-cyan-400" />
                <h2 className="font-display font-bold text-lg text-white">
                  {MODEL_SCIENTIFIC_DOSSIER.title}
                </h2>
              </div>
              <button
                onClick={() => setShowDossierModal(false)}
                className="px-3 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-bold text-white transition-all cursor-pointer"
              >
                Close
              </button>
            </div>

            <div className="space-y-5 text-xs leading-relaxed">
              {/* Attribution */}
              <div className="bg-cyan-950/40 p-3 rounded-xl border border-cyan-500/30">
                <div className="font-bold text-cyan-300 mb-1">Biological Connectome Dataset:</div>
                <div className="text-slate-300">{MODEL_SCIENTIFIC_DOSSIER.referenceAttribution}</div>
              </div>

              {/* Mathematical Equations */}
              <div>
                <h3 className="font-bold text-sm text-white mb-2">Model Equations & Dynamics</h3>
                <div className="space-y-3">
                  {MODEL_SCIENTIFIC_DOSSIER.equations.map((eq, i) => (
                    <div key={i} className="bg-slate-950/60 p-3 rounded-lg border border-white/5">
                      <div className="font-semibold text-amber-300 mb-1">{eq.label}</div>
                      <code className="block font-mono bg-black/50 p-2 rounded text-cyan-300 text-xs mb-1.5">
                        {eq.formula}
                      </code>
                      <p className="text-slate-400">{eq.explanation}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Literature Citations */}
              <div>
                <h3 className="font-bold text-sm text-white mb-2">Peer-Reviewed Literature Grounding</h3>
                <ul className="list-disc list-inside space-y-1.5 text-slate-400">
                  {MODEL_SCIENTIFIC_DOSSIER.literatureCitations.map((cite, i) => (
                    <li key={i}>{cite}</li>
                  ))}
                </ul>
              </div>

              {/* Assumptions & Limitations */}
              <div>
                <h3 className="font-bold text-sm text-white mb-2">Scientific Scope & Limitations</h3>
                <ul className="list-disc list-inside space-y-1.5 text-slate-400">
                  {MODEL_SCIENTIFIC_DOSSIER.assumptionsAndLimitations.map((lim, i) => (
                    <li key={i}>{lim}</li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-white/10 flex justify-end">
              <button
                onClick={() => setShowDossierModal(false)}
                className="px-5 py-2 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-black font-bold text-xs transition-all cursor-pointer"
              >
                Return to Challenge
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

function AlertTriangleIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}
