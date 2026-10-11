import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { LevelDefinition, PlayerFlightState } from '../types/game';
import { createFruitFlyModel } from './FlyModel';
import { buildEnvironment, BuiltWorld } from './WorldBuilder';
import { sound } from '../audio/SoundEngine';

interface GameCanvasProps {
  level: LevelDefinition;
  isPaused: boolean;
  quality?: 'low' | 'medium' | 'high';
  onUpdateHUD: (state: PlayerFlightState) => void;
  onLevelComplete: (stats: { score: number; nectar: number; rings: number; time: number }) => void;
  onGameOver: () => void;
}

export const GameCanvas: React.FC<GameCanvasProps> = ({
  level,
  isPaused,
  quality = 'medium',
  onUpdateHUD,
  onLevelComplete,
  onGameOver,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  const isPausedRef = useRef(isPaused);
  isPausedRef.current = isPaused;

  const onUpdateHUDRef = useRef(onUpdateHUD);
  onUpdateHUDRef.current = onUpdateHUD;

  const onLevelCompleteRef = useRef(onLevelComplete);
  onLevelCompleteRef.current = onLevelComplete;

  const onGameOverRef = useRef(onGameOver);
  onGameOverRef.current = onGameOver;

  useEffect(() => {
    if (!containerRef.current) return;

    // 1. Scene & Fast Renderer Setup with Rich Atmosphere & Backdrop
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(level.fogColor);
    scene.fog = new THREE.FogExp2(new THREE.Color(level.fogColor), 0.0075);

    const camera = new THREE.PerspectiveCamera(
      62,
      containerRef.current.clientWidth / containerRef.current.clientHeight,
      0.1,
      480
    );

    const renderer = new THREE.WebGLRenderer({
      antialias: quality !== 'low',
      powerPreference: 'high-performance',
      precision: 'mediump',
      depth: true,
      stencil: false,
    });

    // Cap PixelRatio based on quality setting
    const targetDpr =
      quality === 'low'
        ? 1.0
        : quality === 'medium'
        ? Math.min(window.devicePixelRatio, 1.25)
        : Math.min(window.devicePixelRatio, 1.5);

    renderer.setPixelRatio(targetDpr);
    renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.25;
    renderer.shadowMap.enabled = false;
    containerRef.current.appendChild(renderer.domElement);

    const handleContextLost = (e: Event) => {
      e.preventDefault();
    };
    renderer.domElement.addEventListener('webglcontextlost', handleContextLost, false);

    // 2. Build World Environment
    const world: BuiltWorld = buildEnvironment(level, quality);
    scene.add(world.environmentGroup);

    // 3. Build Fruit Fly Player
    const fly = createFruitFlyModel();
    scene.add(fly.root);
    fly.root.position.set(0, 9, 20);

    // Dynamic Fruit Fly PointLight
    const flyProximityLight = new THREE.PointLight(0x00f2fe, 2.2, 16);
    flyProximityLight.position.set(0, 0, 0);
    fly.root.add(flyProximityLight);

    // 4. Lightweight Pre-Allocated Visual Feedback Effects
    // Ring Shockwave Pool (reused without runtime memory allocation)
    const ringWaveCount = 3;
    const ringWaveGeom = new THREE.RingGeometry(3.8, 4.4, 24);
    const ringWaves: Array<{ mesh: THREE.Mesh; active: boolean; progress: number; maxLife: number }> = [];

    for (let i = 0; i < ringWaveCount; i++) {
      const mat = new THREE.MeshBasicMaterial({
        color: 0x10b981,
        transparent: true,
        opacity: 0,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const mesh = new THREE.Mesh(ringWaveGeom, mat);
      mesh.visible = false;
      scene.add(mesh);
      ringWaves.push({ mesh, active: false, progress: 0, maxLife: 0.4 });
    }

    const spawnRingShockwave = (pos: THREE.Vector3, quat: THREE.Quaternion) => {
      for (let i = 0; i < ringWaves.length; i++) {
        const w = ringWaves[i];
        if (!w.active) {
          w.active = true;
          w.progress = 0;
          w.mesh.position.copy(pos);
          w.mesh.quaternion.copy(quat);
          w.mesh.scale.set(1.0, 1.0, 1.0);
          (w.mesh.material as THREE.MeshBasicMaterial).opacity = 0.95;
          w.mesh.visible = true;
          break;
        }
      }
    };

    // Nectar Sparkle Pop Pool
    const nectarPopCount = 4;
    const nectarPopGeom = new THREE.SphereGeometry(0.8, 8, 8);
    const nectarPops: Array<{ mesh: THREE.Mesh; active: boolean; progress: number; maxLife: number }> = [];

    for (let i = 0; i < nectarPopCount; i++) {
      const mat = new THREE.MeshBasicMaterial({
        color: 0xfff07c,
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        wireframe: true,
      });
      const mesh = new THREE.Mesh(nectarPopGeom, mat);
      mesh.visible = false;
      scene.add(mesh);
      nectarPops.push({ mesh, active: false, progress: 0, maxLife: 0.35 });
    }

    const spawnNectarPop = (pos: THREE.Vector3, colorHex: number) => {
      for (let i = 0; i < nectarPops.length; i++) {
        const p = nectarPops[i];
        if (!p.active) {
          p.active = true;
          p.progress = 0;
          p.mesh.position.copy(pos);
          p.mesh.scale.set(0.6, 0.6, 0.6);
          const mat = p.mesh.material as THREE.MeshBasicMaterial;
          mat.color.setHex(colorHex);
          mat.opacity = 1.0;
          p.mesh.visible = true;
          break;
        }
      }
    };

    // Start Audio
    sound.startFlightAudio();

    // 5. Flight Physics & State Variables
    const keysPressed: Record<string, boolean> = {};
    
    // Normalized steering target & smoothed current steering (-1 to +1)
    let targetSteerX = 0; // right positive, left negative
    let targetSteerY = 0; // up positive (climb), down negative (dive)
    let smoothSteerX = 0;
    let smoothSteerY = 0;
    let isMouseDown = false;

    let speed = 13.0;
    const baseSpeed = 13.0;
    const boostSpeed = 30.0;
    let boostEnergy = 100.0;
    let isBoosting = false;

    let pitch = 0;
    let yaw = 0;
    let roll = 0;

    let nectarCollected = 0;
    let ringsCompleted = 0;
    let score = 0;
    let timeElapsed = 0;
    let nearMisses = 0;
    let collisionCooldown = 0;
    let cameraShake = 0;

    // Wingtip trail points
    const trailCount = quality === 'low' ? 60 : 100;
    const trailGeom = new THREE.BufferGeometry();
    const trailPositions = new Float32Array(trailCount * 3);
    trailGeom.setAttribute('position', new THREE.BufferAttribute(trailPositions, 3));
    const trailMat = new THREE.PointsMaterial({
      color: 0x00f2fe,
      size: 0.5,
      transparent: true,
      opacity: 0.75,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const trailPoints = new THREE.Points(trailGeom, trailMat);
    scene.add(trailPoints);
    let trailHead = 0;

    // Camera follow parameters
    const cameraOffset = new THREE.Vector3(0, 1.9, 6.8);

    // Pre-allocated reusable objects (ZERO Garbage Collection in render loop!)
    const _forwardDir = new THREE.Vector3();
    const _flyEuler = new THREE.Euler(0, 0, 0, 'YXZ');
    const _idealCamPos = new THREE.Vector3();
    const _camTarget = new THREE.Vector3();
    const _camOffsetRotated = new THREE.Vector3();
    const _repelDir = new THREE.Vector3();

    // Key event listeners
    const handleKeyDown = (e: KeyboardEvent) => {
      keysPressed[e.key.toLowerCase()] = true;
      keysPressed[e.code.toLowerCase()] = true;
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysPressed[e.key.toLowerCase()] = false;
      keysPressed[e.code.toLowerCase()] = false;
    };

    // Pointer / Mouse steering event listeners
    // Calculates cursor position relative to the canvas container center
    // Deadzone near center (0.05) allows straight-ahead flight without jitter
    const updatePointerPosition = (clientX: number, clientY: number) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const halfW = rect.width / 2;
      const halfH = rect.height / 2;
      if (halfW <= 0 || halfH <= 0) return;

      // X: -1 (left edge) to +1 (right edge)
      const rawX = (clientX - (rect.left + halfW)) / halfW;
      // Y: Invert screen Y so upward mouse movement (lower screen Y) gives POSITIVE value (climb)
      // and downward mouse movement (higher screen Y) gives NEGATIVE value (dive)
      const rawY = -((clientY - (rect.top + halfH)) / halfH);

      const clampedX = THREE.MathUtils.clamp(rawX, -1, 1);
      const clampedY = THREE.MathUtils.clamp(rawY, -1, 1);

      // Deadzone threshold for comfortable neutral cruise
      const DEADZONE = 0.05;
      if (Math.abs(clampedX) < DEADZONE) {
        targetSteerX = 0;
      } else {
        const sign = Math.sign(clampedX);
        targetSteerX = sign * ((Math.abs(clampedX) - DEADZONE) / (1 - DEADZONE));
      }

      if (Math.abs(clampedY) < DEADZONE) {
        targetSteerY = 0;
      } else {
        const sign = Math.sign(clampedY);
        targetSteerY = sign * ((Math.abs(clampedY) - DEADZONE) / (1 - DEADZONE));
      }
    };

    const handlePointerMove = (e: PointerEvent) => {
      updatePointerPosition(e.clientX, e.clientY);
    };

    const handlePointerDown = (e: PointerEvent) => {
      if (e.button === 0) {
        isMouseDown = true;
      }
      updatePointerPosition(e.clientX, e.clientY);
    };

    const handlePointerUp = (e: PointerEvent) => {
      if (e.button === 0) {
        isMouseDown = false;
      }
    };

    const handlePointerLeave = () => {
      // Smoothly return steering back toward center when pointer exits canvas window
      targetSteerX = 0;
      targetSteerY = 0;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointerleave', handlePointerLeave);

    // 6. High-Performance Game Loop
    let reqId: number;
    let clock = new THREE.Clock();
    let hasCompleted = false;
    let lastHudUpdateTime = 0;
    let lastReportedRings = -1;
    let lastReportedNectar = -1;

    const gameLoop = () => {
      reqId = requestAnimationFrame(gameLoop);

      if (isPausedRef.current || hasCompleted) {
        sound.updateFlightSpeed(0, false);
        return;
      }

      const delta = Math.min(clock.getDelta(), 0.05);
      const time = clock.getElapsedTime();

      timeElapsed += delta;

      // Handle Boost
      const wantsBoost =
        keysPressed['shift'] ||
        keysPressed['f'] ||
        keysPressed[' '] ||
        isMouseDown;

      if (wantsBoost && boostEnergy > 5) {
        isBoosting = true;
        boostEnergy = Math.max(0, boostEnergy - 32 * delta);
        speed = THREE.MathUtils.lerp(speed, boostSpeed, 0.15);
      } else {
        isBoosting = false;
        boostEnergy = Math.min(100, boostEnergy + 15 * delta);
        speed = THREE.MathUtils.lerp(speed, baseSpeed, 0.08);
      }

      // Smoothly interpolate steering towards pointer target (smooth acceleration & natural flight response)
      smoothSteerX = THREE.MathUtils.lerp(smoothSteerX, targetSteerX, 0.16);
      smoothSteerY = THREE.MathUtils.lerp(smoothSteerY, targetSteerY, 0.16);

      // Hybrid Keyboard + Mouse Steering
      // Pitch: Mouse UP (targetSteerY > 0) -> Climb (+pitch). Mouse DOWN (targetSteerY < 0) -> Dive (-pitch).
      // Keyboard: W climbs (+pitch), S dives (-pitch) or aviation convention
      const turnRate = 2.4 * delta;
      const pitchRate = 2.0 * delta;

      // Vertical Steering (Climb / Dive):
      // W key climbs; S key dives
      if (keysPressed['w'] || keysPressed['arrowup']) pitch += pitchRate;
      if (keysPressed['s'] || keysPressed['arrowdown']) pitch -= pitchRate;
      // Mouse upward (smoothSteerY > 0) pitches UP (climbs); downward pitches DOWN (dives)
      if (Math.abs(smoothSteerY) > 0.02) {
        pitch += smoothSteerY * 1.8 * delta;
      }

      // Horizontal Steering (Yaw + Banking Roll):
      // A key turns left (+yaw, banks left); D key turns right (-yaw, banks right)
      let targetRoll = 0;
      if (keysPressed['a'] || keysPressed['arrowleft']) {
        yaw += turnRate;
        targetRoll += 0.55;
      }
      if (keysPressed['d'] || keysPressed['arrowright']) {
        yaw -= turnRate;
        targetRoll -= 0.55;
      }
      // Mouse right (smoothSteerX > 0) turns RIGHT (-yaw, banks right -targetRoll)
      // Mouse left (smoothSteerX < 0) turns LEFT (+yaw, banks left +targetRoll)
      if (Math.abs(smoothSteerX) > 0.02) {
        yaw -= smoothSteerX * 2.5 * delta;
        targetRoll -= smoothSteerX * 0.52;
      }

      // Vertical altitude keys (E: climb, C/Ctrl: descend)
      if (keysPressed['e']) fly.root.position.y += 6.5 * delta;
      if (keysPressed['c'] || keysPressed['control']) fly.root.position.y -= 6.5 * delta;

      // Natural aerodynamic damping: pitch returns gently toward neutral cruise when no pitch input is active
      const hasPitchInput =
        keysPressed['w'] ||
        keysPressed['s'] ||
        keysPressed['arrowup'] ||
        keysPressed['arrowdown'] ||
        Math.abs(smoothSteerY) > 0.02;
      if (!hasPitchInput) {
        pitch = THREE.MathUtils.lerp(pitch, 0, 0.04);
      }

      roll = THREE.MathUtils.lerp(roll, targetRoll, 0.16);
      pitch = THREE.MathUtils.clamp(pitch, -0.75, 0.75);

      // Apply rotation to fly
      _flyEuler.set(pitch, yaw, roll, 'YXZ');
      fly.root.quaternion.setFromEuler(_flyEuler);

      // Forward movement
      _forwardDir.set(0, 0, -1).applyQuaternion(fly.root.quaternion);
      fly.root.position.addScaledVector(_forwardDir, speed * delta);

      // Boundary enforcement & Autonav gentle turn-back
      const ARENA_RADIUS = 135.0;
      const WARNING_RADIUS = 110.0;
      const hDist = Math.sqrt(fly.root.position.x * fly.root.position.x + fly.root.position.z * fly.root.position.z);
      let boundaryWarning = false;

      if (hDist > WARNING_RADIUS) {
        boundaryWarning = true;
        const targetYaw = Math.atan2(-fly.root.position.x, -fly.root.position.z);
        let yawDiff = targetYaw - yaw;
        while (yawDiff > Math.PI) yawDiff -= Math.PI * 2;
        while (yawDiff < -Math.PI) yawDiff += Math.PI * 2;

        const boundaryFactor = Math.min(1.0, (hDist - WARNING_RADIUS) / (ARENA_RADIUS - WARNING_RADIUS));
        yaw += yawDiff * boundaryFactor * 2.8 * delta;

        const pushBack = boundaryFactor * 12.0 * delta;
        fly.root.position.x -= (fly.root.position.x / (hDist || 1)) * pushBack;
        fly.root.position.z -= (fly.root.position.z / (hDist || 1)) * pushBack;
      }

      if (hDist >= ARENA_RADIUS) {
        fly.root.position.x = (fly.root.position.x / (hDist || 1)) * ARENA_RADIUS;
        fly.root.position.z = (fly.root.position.z / (hDist || 1)) * ARENA_RADIUS;
      }

      // Vertical Altitude boundaries
      if (fly.root.position.y < 1.8) {
        fly.root.position.y = 1.8;
        pitch = Math.max(0.08, pitch);
      }
      if (fly.root.position.y > 56) {
        const ceilFactor = Math.min(1.0, (fly.root.position.y - 56) / 8);
        pitch = Math.min(-0.12 * ceilFactor, pitch);
        if (fly.root.position.y > 64) fly.root.position.y = 64;
      }

      // Fly Animation & Audio
      const speedRatio = (speed - baseSpeed) / (boostSpeed - baseSpeed);
      fly.updateAnimation(time, speedRatio, isBoosting);
      sound.updateFlightSpeed(speedRatio, isBoosting);

      // World Update (passing ringsCompleted so upcoming target ring is highlighted)
      world.updateWorld(delta, time, ringsCompleted);

      // Update Feedback Shockwaves
      for (let i = 0; i < ringWaves.length; i++) {
        const w = ringWaves[i];
        if (w.active) {
          w.progress += delta;
          const t = w.progress / w.maxLife;
          if (t >= 1.0) {
            w.active = false;
            w.mesh.visible = false;
          } else {
            const scale = 1.0 + t * 1.4;
            w.mesh.scale.set(scale, scale, 1.0);
            (w.mesh.material as THREE.MeshBasicMaterial).opacity = (1.0 - t) * 0.95;
          }
        }
      }

      // Update Nectar Sparkle Pops
      for (let i = 0; i < nectarPops.length; i++) {
        const p = nectarPops[i];
        if (p.active) {
          p.progress += delta;
          const t = p.progress / p.maxLife;
          if (t >= 1.0) {
            p.active = false;
            p.mesh.visible = false;
          } else {
            const scale = 0.6 + t * 1.8;
            p.mesh.scale.set(scale, scale, scale);
            (p.mesh.material as THREE.MeshBasicMaterial).opacity = 1.0 - t;
          }
        }
      }

      // Wingtip trail points
      const posArray = trailGeom.attributes.position.array as Float32Array;
      posArray[trailHead * 3] = fly.root.position.x;
      posArray[trailHead * 3 + 1] = fly.root.position.y + 0.2;
      posArray[trailHead * 3 + 2] = fly.root.position.z;
      trailHead = (trailHead + 1) % trailCount;
      trailGeom.attributes.position.needsUpdate = true;

      // Collectibles Detection & Magnetic Pull
      const flyPos = fly.root.position;
      const collectibles = world.collectibles;
      for (let i = 0; i < collectibles.length; i++) {
        const item = collectibles[i];
        if (!item.collected) {
          const dx = flyPos.x - item.mesh.position.x;
          const dy = flyPos.y - item.mesh.position.y;
          const dz = flyPos.z - item.mesh.position.z;
          const distSq = dx * dx + dy * dy + dz * dz;

          if (distSq < 36.0) {
            item.mesh.position.lerp(flyPos, 6.5 * delta);
          }

          if (distSq < 4.0) {
            item.collected = true;
            item.mesh.visible = false;
            nectarCollected++;
            score += item.value;
            boostEnergy = Math.min(100, boostEnergy + 30);
            sound.playNectarChime();

            // Spawn brief sparkling collection burst
            spawnNectarPop(item.mesh.position, item.type === 'pollen' ? 0xfbbf24 : 0x00f2fe);
          }
        }
      }

      // Rings Checkpoint Progression
      const rings = world.rings;
      for (let i = 0; i < rings.length; i++) {
        const ring = rings[i];
        if (!ring.passed) {
          const dx = flyPos.x - ring.position.x;
          const dy = flyPos.y - ring.position.y;
          const dz = flyPos.z - ring.position.z;
          const distSq = dx * dx + dy * dy + dz * dz;

          if (distSq < ring.radiusSq) {
            ring.passed = true;
            ringsCompleted++;
            score += 250;
            // Flare ring brilliant emerald
            (ring.glowMesh.material as THREE.MeshBasicMaterial).color.setHex(0x10b981);
            sound.playRingWhoosh();

            // Spawn expanding shockwave feedback effect
            spawnRingShockwave(ring.position, ring.mesh.quaternion);

            if (ringsCompleted >= level.targetRings) {
              hasCompleted = true;
              sound.playVictoryFanfare();
              onLevelCompleteRef.current({
                score,
                nectar: nectarCollected,
                rings: ringsCompleted,
                time: Math.round(timeElapsed),
              });
            }
          }
        }
      }

      // Obstacle Proximity & Solid Collision Resolution (Prevents Passing Through!)
      collisionCooldown = Math.max(0, collisionCooldown - delta);
      let collisionWarning = false;
      const obstacles = world.obstacles;
      const flyRadius = 0.85;

      for (let i = 0; i < obstacles.length; i++) {
        const obs = obstacles[i];
        let distSq: number;
        let normX = 0;
        let normY = 0;
        let normZ = 0;
        const hitDist = obs.radius + flyRadius;

        if (obs.type === 'cylinder') {
          const minY = obs.minY ?? 0;
          const maxY = obs.maxY ?? 65;
          const clampedY = Math.max(minY, Math.min(maxY, flyPos.y));
          const dx = flyPos.x - obs.position.x;
          const dy = flyPos.y - clampedY;
          const dz = flyPos.z - obs.position.z;
          distSq = dx * dx + dy * dy + dz * dz;

          const hDist = Math.sqrt(dx * dx + dz * dz) || 0.001;
          normX = dx / hDist;
          normY = dy !== 0 ? (dy > 0 ? 0.35 : -0.35) : 0;
          normZ = dz / hDist;
        } else {
          const dx = flyPos.x - obs.position.x;
          const dy = flyPos.y - obs.position.y;
          const dz = flyPos.z - obs.position.z;
          distSq = dx * dx + dy * dy + dz * dz;

          const dist = Math.sqrt(distSq) || 0.001;
          normX = dx / dist;
          normY = dy / dist;
          normZ = dz / dist;
        }

        const warnDist = hitDist + 3.0;
        if (distSq < warnDist * warnDist) {
          collisionWarning = true;
        }

        if (distSq < hitDist * hitDist) {
          const currentDist = Math.sqrt(distSq) || 0.001;
          const overlap = hitDist - currentDist;

          // 1. HARD POSITION CORRECTION: Push fly outside obstacle immediately (EVERY FRAME!)
          if (obs.type === 'cylinder') {
            flyPos.x += normX * (overlap + 0.12);
            flyPos.z += normZ * (overlap + 0.12);
          } else {
            flyPos.x += normX * (overlap + 0.12);
            flyPos.y += normY * (overlap + 0.12);
            flyPos.z += normZ * (overlap + 0.12);
          }

          // 2. SPEED DAMPENING & BOUNCE
          speed = Math.max(baseSpeed * 0.45, speed * 0.55);

          // 3. DEFLECT FLIGHT HEADING AWAY FROM CONTACT NORMAL
          yaw += normX * 0.28 - normZ * 0.12;

          // 4. THROTTLED AUDIO & IMPACT FEEDBACK (CAMERA SHAKE)
          if (collisionCooldown <= 0) {
            collisionCooldown = 0.32;
            nearMisses++;
            cameraShake = 0.38;
            sound.playNearMiss();
          }
        }
      }

      // Camera Spring Follow Choreography
      _camOffsetRotated.copy(cameraOffset).applyQuaternion(fly.root.quaternion);
      _idealCamPos.copy(fly.root.position).add(_camOffsetRotated);

      if (cameraShake > 0) {
        _idealCamPos.x += (Math.random() - 0.5) * cameraShake;
        _idealCamPos.y += (Math.random() - 0.5) * cameraShake;
        cameraShake = Math.max(0, cameraShake - delta * 1.5);
      }

      camera.position.lerp(_idealCamPos, 0.09);
      _camTarget.copy(fly.root.position).addScaledVector(_forwardDir, 12);
      camera.lookAt(_camTarget);

      // Dynamic FOV widening on boost
      const targetFov = isBoosting ? 74 : 62;
      camera.fov = THREE.MathUtils.lerp(camera.fov, targetFov, 0.06);
      camera.updateProjectionMatrix();

      // Check Time Limit
      if (timeElapsed >= level.timeLimitSeconds && ringsCompleted < level.targetRings) {
        hasCompleted = true;
        onGameOverRef.current();
      }

      // Throttled HUD update
      const shouldUpdateHud =
        timeElapsed - lastHudUpdateTime >= 0.1 ||
        ringsCompleted !== lastReportedRings ||
        nectarCollected !== lastReportedNectar;

      if (shouldUpdateHud) {
        lastHudUpdateTime = timeElapsed;
        lastReportedRings = ringsCompleted;
        lastReportedNectar = nectarCollected;

        onUpdateHUDRef.current({
          speed: Math.round(speed),
          maxSpeed: boostSpeed,
          boostSpeed,
          isBoosting,
          boostEnergy: Math.round(boostEnergy),
          altitude: Math.round(fly.root.position.y),
          nectarCollected,
          ringsCompleted,
          score,
          timeElapsed: Math.round(timeElapsed),
          nearMisses,
          collisionWarning,
          boundaryWarning,
        });
      }

      renderer.render(scene, camera);
    };

    gameLoop();

    // Resize handling
    const handleResize = () => {
      if (!containerRef.current) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(reqId);
      sound.stopFlightAudio();
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointerleave', handlePointerLeave);
      window.removeEventListener('resize', handleResize);
      renderer.domElement.removeEventListener('webglcontextlost', handleContextLost);

      world.disposeWorld();
      trailGeom.dispose();
      trailMat.dispose();
      ringWaveGeom.dispose();
      nectarPopGeom.dispose();

      if (renderer.domElement && containerRef.current?.contains(renderer.domElement)) {
        containerRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [level, quality]);

  return <div ref={containerRef} className="w-full h-full relative cursor-crosshair select-none" />;
};
