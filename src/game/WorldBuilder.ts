import * as THREE from 'three';
import { LevelDefinition } from '../types/game';
import { createSoftParticleTexture } from './FlyModel';

export interface WorldCollectible {
  mesh: THREE.Group;
  type: 'nectar' | 'pollen' | 'vesicle';
  value: number;
  radiusSq: number;
  collected: boolean;
  baseY: number;
  rotationSpeed: number;
}

export interface WorldRing {
  mesh: THREE.Group;
  index: number;
  radius: number;
  radiusSq: number;
  passed: boolean;
  position: THREE.Vector3;
  glowMesh: THREE.Mesh;
  beaconMesh?: THREE.Mesh;
}

export interface WorldObstacle {
  position: THREE.Vector3;
  radius: number;
  radiusSq: number;
  mesh?: THREE.Object3D;
  type: 'cylinder' | 'sphere';
  minY?: number;
  maxY?: number;
  isMoving?: boolean;
  velocity?: THREE.Vector3;
  label?: string;
}

export interface BuiltWorld {
  environmentGroup: THREE.Group;
  collectibles: WorldCollectible[];
  rings: WorldRing[];
  obstacles: WorldObstacle[];
  particles: THREE.Points;
  boundaryMesh?: THREE.Mesh;
  updateWorld: (delta: number, time: number, currentRingIndex?: number) => void;
  disposeWorld: () => void;
}

// Global cached shared geometries for high rendering performance
let cachedOuterPetalGeom: THREE.BufferGeometry | null = null;
let cachedInnerPetalGeom: THREE.BufferGeometry | null = null;
let cachedStamenGeom: THREE.BufferGeometry | null = null;
let cachedLeafGeom: THREE.BufferGeometry | null = null;
let cachedMushroomCapGeom: THREE.BufferGeometry | null = null;
let cachedNectarGeom: THREE.BufferGeometry | null = null;
let cachedAuraGeom: THREE.BufferGeometry | null = null;
let cachedTrunkGeom: THREE.BufferGeometry | null = null;
let cachedPillarGeom: THREE.BufferGeometry | null = null;

function getSharedGeometries() {
  if (!cachedOuterPetalGeom) {
    cachedOuterPetalGeom = new THREE.SphereGeometry(2.6, 8, 8);
    cachedOuterPetalGeom.scale(0.85, 0.25, 1.9);
    cachedOuterPetalGeom.translate(0, 0, 2.2);
  }
  if (!cachedInnerPetalGeom) {
    cachedInnerPetalGeom = new THREE.SphereGeometry(1.9, 8, 8);
    cachedInnerPetalGeom.scale(0.75, 0.28, 1.6);
    cachedInnerPetalGeom.translate(0, 0, 1.6);
  }
  if (!cachedStamenGeom) {
    cachedStamenGeom = new THREE.SphereGeometry(1.2, 8, 8);
  }
  if (!cachedLeafGeom) {
    cachedLeafGeom = new THREE.SphereGeometry(2.2, 6, 6);
    cachedLeafGeom.scale(0.65, 0.12, 1.6);
    cachedLeafGeom.translate(0, 0, 1.4);
  }
  if (!cachedMushroomCapGeom) {
    cachedMushroomCapGeom = new THREE.SphereGeometry(1.8, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.5);
  }
  if (!cachedNectarGeom) {
    cachedNectarGeom = new THREE.SphereGeometry(0.75, 8, 8);
    cachedNectarGeom.scale(1.0, 1.35, 1.0);
  }
  if (!cachedAuraGeom) {
    cachedAuraGeom = new THREE.SphereGeometry(1.15, 6, 6);
  }
  if (!cachedTrunkGeom) {
    cachedTrunkGeom = new THREE.CylinderGeometry(4.0, 5.2, 75, 10);
    cachedTrunkGeom.translate(0, 37.5, 0);
  }
  if (!cachedPillarGeom) {
    cachedPillarGeom = new THREE.CylinderGeometry(3.0, 3.8, 65, 8);
    cachedPillarGeom.translate(0, 32.5, 0);
  }

  return {
    outerPetal: cachedOuterPetalGeom,
    innerPetal: cachedInnerPetalGeom,
    stamen: cachedStamenGeom,
    leaf: cachedLeafGeom,
    mushroomCap: cachedMushroomCapGeom,
    nectar: cachedNectarGeom,
    aura: cachedAuraGeom,
    trunk: cachedTrunkGeom,
    pillar: cachedPillarGeom,
  };
}

export function buildEnvironment(
  level: LevelDefinition,
  quality: 'low' | 'medium' | 'high' = 'medium'
): BuiltWorld {
  const environmentGroup = new THREE.Group();
  const collectibles: WorldCollectible[] = [];
  const rings: WorldRing[] = [];
  const obstacles: WorldObstacle[] = [];
  const geoms = getSharedGeometries();

  // 1. Enhanced Multi-Source Lighting & Radiance
  const hemiLight = new THREE.HemisphereLight(
    level.environment === 'garden'
      ? 0x38bdf8 // Moonlit sapphire sky
      : level.environment === 'pollen'
      ? 0xfef08a // Warm golden dusk sky
      : 0xc084fc, // Electric violet connectome
    level.environment === 'garden'
      ? 0x0a261a // Emerald forest loam
      : level.environment === 'pollen'
      ? 0x3d1d08 // Amber soil
      : 0x090314, // Deep neuro-matrix
    level.environment === 'neural' ? 2.0 : 2.2
  );
  environmentGroup.add(hemiLight);

  // Key directional light (Sun/Moon/Core)
  const sunLight = new THREE.DirectionalLight(
    level.environment === 'garden'
      ? 0xdbeafe
      : level.environment === 'pollen'
      ? 0xffedd5
      : 0xe9d5ff,
    level.environment === 'neural' ? 2.2 : 2.8
  );
  sunLight.position.set(50, 85, 35);
  environmentGroup.add(sunLight);

  // Colored fill & rim lights
  const rimLight = new THREE.DirectionalLight(new THREE.Color(level.themeColor), 1.6);
  rimLight.position.set(-45, 35, -50);
  environmentGroup.add(rimLight);

  // 2. Rich Atmospheric Sky Dome, Volumetric Sky, and Overhead Canopy (REPLACING EMPTY BLACK SPACE)
  buildAtmosphereAndSkyDome(level, environmentGroup, quality);

  // 3. Terrain & Floor Substrates
  buildGroundSubstrate(level, environmentGroup, quality);

  // 4. Playable Boundary Visual Indicator (Subtle luminous barrier at R=135)
  const boundaryMesh = buildPlayableBoundaryMesh(level.themeColor, environmentGroup);

  // 5. Environment-Specific Solid Obstacles, Flora & Scenery
  if (level.environment === 'garden') {
    buildEnchantedGardenFull(environmentGroup, obstacles, collectibles, geoms, quality);
  } else if (level.environment === 'pollen') {
    buildPollenRunFull(environmentGroup, obstacles, collectibles, geoms, quality);
  } else {
    buildNeuralDreamscapeFull(environmentGroup, obstacles, collectibles, geoms, quality);
  }

  // 6. Checkpoint Flight Rings with Guidance Flare Beacons
  buildFlightPathRingsPolished(level, environmentGroup, rings);

  // 7. Ambient Microscopic Particles (Pollen / Spores / Bio-electric Sparks)
  const particleCount = quality === 'low' ? 220 : quality === 'medium' ? 360 : 500;
  const particleGeom = new THREE.BufferGeometry();
  const particlePositions = new Float32Array(particleCount * 3);
  const particleColors = new Float32Array(particleCount * 3);

  const baseCol = new THREE.Color(level.themeColor);
  for (let i = 0; i < particleCount; i++) {
    const i3 = i * 3;
    particlePositions[i3] = (Math.random() - 0.5) * 260;
    particlePositions[i3 + 1] = Math.random() * 52 + 2;
    particlePositions[i3 + 2] = (Math.random() - 0.5) * 260;

    const col = baseCol.clone().offsetHSL(
      (Math.random() - 0.5) * 0.25,
      0.3,
      (Math.random() - 0.5) * 0.2
    );
    particleColors[i3] = col.r;
    particleColors[i3 + 1] = col.g;
    particleColors[i3 + 2] = col.b;
  }
  particleGeom.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
  particleGeom.setAttribute('color', new THREE.BufferAttribute(particleColors, 3));

  const softPollenTex = createSoftParticleTexture(level.environment === 'pollen');
  const particleMat = new THREE.PointsMaterial({
    size: level.environment === 'pollen' ? 1.4 : 1.1,
    map: softPollenTex,
    vertexColors: true,
    transparent: true,
    opacity: 0.85,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const particles = new THREE.Points(particleGeom, particleMat);
  environmentGroup.add(particles);

  // 8. Zero-Allocation Fast World Update Loop
  const updateWorld = (delta: number, time: number, currentRingIndex: number = 0) => {
    // Collectibles animation
    for (let i = 0; i < collectibles.length; i++) {
      const item = collectibles[i];
      if (!item.collected) {
        item.mesh.rotation.y += item.rotationSpeed * delta;
        item.mesh.position.y = item.baseY + Math.sin(time * 2.8 + item.mesh.position.x) * 0.35;
      }
    }

    // Rings pulse & guide beacons
    for (let i = 0; i < rings.length; i++) {
      const ring = rings[i];
      if (!ring.passed) {
        const isCurrentTarget = ring.index === currentRingIndex;
        const pulseRate = isCurrentTarget ? 5.5 : 3.5;
        const pulseAmp = isCurrentTarget ? 0.14 : 0.07;
        const pulse = 1 + Math.sin(time * pulseRate + ring.index) * pulseAmp;

        ring.glowMesh.scale.set(pulse, pulse, 1);
        ring.mesh.rotation.z += (isCurrentTarget ? 0.65 : 0.35) * delta;

        if (ring.beaconMesh) {
          ring.beaconMesh.visible = isCurrentTarget;
          const beaconPulse = 0.8 + Math.sin(time * 6) * 0.25;
          ring.beaconMesh.scale.set(beaconPulse, beaconPulse, 1);
        }
      } else if (ring.beaconMesh) {
        ring.beaconMesh.visible = false;
      }
    }

    // Drifting particles & spores
    particles.rotation.y = time * 0.02;
    particles.position.y = Math.sin(time * 0.35) * 1.0;

    // Moving dynamic obstacles (e.g. drifting dandelion fluff)
    for (let i = 0; i < obstacles.length; i++) {
      const obs = obstacles[i];
      if (obs.isMoving && obs.velocity && obs.mesh) {
        obs.mesh.position.addScaledVector(obs.velocity, delta);
        obs.position.copy(obs.mesh.position);
        if (Math.abs(obs.mesh.position.x) > 95) obs.velocity.x *= -1;
        if (Math.abs(obs.mesh.position.z) > 95) obs.velocity.z *= -1;
      }
    }

    // Gentle boundary shimmer
    if (boundaryMesh) {
      (boundaryMesh.material as THREE.MeshBasicMaterial).opacity = 0.12 + Math.sin(time * 2.2) * 0.04;
    }
  };

  const disposeWorld = () => {
    particleGeom.dispose();
    particleMat.dispose();
    softPollenTex.dispose();
  };

  return {
    environmentGroup,
    collectibles,
    rings,
    obstacles,
    particles,
    boundaryMesh,
    updateWorld,
    disposeWorld,
  };
}

// --------------------------------------------------------------------------
// Atmospheric Sky Dome, Horizon & Overhead Canopy (ELIMINATES EMPTY BLACK SPACE)
// --------------------------------------------------------------------------
function buildAtmosphereAndSkyDome(
  level: LevelDefinition,
  group: THREE.Group,
  quality: 'low' | 'medium' | 'high'
) {
  // 1. Inverted Giant Sky Dome with Custom Atmospheric Color Gradient
  const domeRadius = 250;
  const domeGeom = new THREE.SphereGeometry(domeRadius, 24, 16);
  domeGeom.scale(-1, 1, 1); // Render inside

  const posAttr = domeGeom.attributes.position;
  const count = posAttr.count;
  const colorAttr = new Float32Array(count * 3);

  // Gradient colors per environment
  let topColor: THREE.Color;
  let midColor: THREE.Color;
  let horizonColor: THREE.Color;
  let bottomColor: THREE.Color;

  if (level.environment === 'garden') {
    topColor = new THREE.Color(0x030818); // Deep midnight indigo
    midColor = new THREE.Color(0x061e2d); // Moonlit teal
    horizonColor = new THREE.Color(0x08333a); // Luminous cyan mist
    bottomColor = new THREE.Color(0x051a14); // Deep woodland moss
  } else if (level.environment === 'pollen') {
    topColor = new THREE.Color(0x1a0a24); // Dusk violet sky
    midColor = new THREE.Color(0x782d12); // Warm amber twilight
    horizonColor = new THREE.Color(0xb45309); // Glowing apricot horizon
    bottomColor = new THREE.Color(0x271206); // Warm garden loam
  } else {
    topColor = new THREE.Color(0x0a0218); // Deep cosmic void
    midColor = new THREE.Color(0x260d3d); // Electric synapse violet
    horizonColor = new THREE.Color(0x131238); // Cyan connectome aurora
    bottomColor = new THREE.Color(0x070114); // Deep bio-substrate
  }

  for (let i = 0; i < count; i++) {
    const y = posAttr.getY(i) / domeRadius; // -1 to 1
    let c = new THREE.Color();
    if (y > 0.3) {
      const t = (y - 0.3) / 0.7;
      c.lerpColors(midColor, topColor, t);
    } else if (y >= 0) {
      const t = y / 0.3;
      c.lerpColors(horizonColor, midColor, t);
    } else {
      const t = -y;
      c.lerpColors(horizonColor, bottomColor, t);
    }

    colorAttr[i * 3] = c.r;
    colorAttr[i * 3 + 1] = c.g;
    colorAttr[i * 3 + 2] = c.b;
  }

  domeGeom.setAttribute('color', new THREE.BufferAttribute(colorAttr, 3));

  const domeMat = new THREE.MeshBasicMaterial({
    vertexColors: true,
    side: THREE.BackSide,
    depthWrite: false,
  });
  const skyDome = new THREE.Mesh(domeGeom, domeMat);
  group.add(skyDome);

  // 2. Celestial Body & Volumetric Radiance in Sky
  if (level.environment === 'garden') {
    // Radiant Moon Disc
    const moonGroup = new THREE.Group();
    moonGroup.position.set(70, 110, -130);

    const moonGeom = new THREE.CircleGeometry(16, 24);
    const moonMat = new THREE.MeshBasicMaterial({
      color: 0xe0f2fe,
      side: THREE.DoubleSide,
    });
    const moon = new THREE.Mesh(moonGeom, moonMat);
    moon.lookAt(0, 0, 0);
    moonGroup.add(moon);

    // Soft moon halo
    const haloGeom = new THREE.RingGeometry(15, 34, 24);
    const haloMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.35,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
    });
    const halo = new THREE.Mesh(haloGeom, haloMat);
    halo.lookAt(0, 0, 0);
    moonGroup.add(halo);

    group.add(moonGroup);
  } else if (level.environment === 'pollen') {
    // Golden Dusk Sun Disc & Volumetric Light Shafts
    const sunGroup = new THREE.Group();
    sunGroup.position.set(75, 100, 60);

    const sunGeom = new THREE.CircleGeometry(22, 24);
    const sunMat = new THREE.MeshBasicMaterial({
      color: 0xfef08a,
      side: THREE.DoubleSide,
    });
    const sun = new THREE.Mesh(sunGeom, sunMat);
    sun.lookAt(0, 0, 0);
    sunGroup.add(sun);

    const sunGlowGeom = new THREE.RingGeometry(21, 46, 24);
    const sunGlowMat = new THREE.MeshBasicMaterial({
      color: 0xf59e0b,
      transparent: true,
      opacity: 0.45,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
    });
    const sunGlow = new THREE.Mesh(sunGlowGeom, sunGlowMat);
    sunGlow.lookAt(0, 0, 0);
    sunGroup.add(sunGlow);

    group.add(sunGroup);

    // Warm volumetric light shafts through canopy
    const beamCount = quality === 'low' ? 4 : 7;
    const beamGeom = new THREE.CylinderGeometry(2.5, 12.0, 140, 8, 1, true);
    beamGeom.translate(0, 70, 0);
    const beamMat = new THREE.MeshBasicMaterial({
      color: 0xfbbf24,
      transparent: true,
      opacity: 0.12,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    for (let b = 0; b < beamCount; b++) {
      const beam = new THREE.Mesh(beamGeom, beamMat);
      beam.position.set(30 + (b - beamCount / 2) * 22, 0, 15 + (b % 3) * 18);
      beam.rotation.x = 0.35;
      beam.rotation.z = -0.45;
      group.add(beam);
    }
  } else {
    // Neural Dreamscape: Massive Overhead Synaptic Connectome Shell
    const vaultGroup = new THREE.Group();
    const vaultRadius = 145;
    const ribCount = quality === 'low' ? 12 : 18;

    for (let r = 0; r < ribCount; r++) {
      const angle = (r / ribCount) * Math.PI * 2;
      const points: THREE.Vector3[] = [];
      for (let s = 0; s <= 8; s++) {
        const theta = (s / 8) * (Math.PI * 0.48);
        const rad = Math.cos(theta) * vaultRadius;
        const py = Math.sin(theta) * 75 + 10;
        const px = Math.cos(angle) * rad;
        const pz = Math.sin(angle) * rad;
        points.push(new THREE.Vector3(px, py, pz));
      }

      const curve = new THREE.CatmullRomCurve3(points);
      const ribGeom = new THREE.TubeGeometry(curve, 14, 0.75, 5, false);
      const ribMat = new THREE.MeshBasicMaterial({
        color: r % 2 === 0 ? 0x06b6d4 : 0xa855f7,
        transparent: true,
        opacity: 0.55,
        blending: THREE.AdditiveBlending,
      });
      vaultGroup.add(new THREE.Mesh(ribGeom, ribMat));
    }
    group.add(vaultGroup);
  }

  // 3. Overhead Botanical / Macro Foliage Canopy (Prevents Looking Up Into Empty Void)
  if (level.environment !== 'neural') {
    const canopyGroup = new THREE.Group();
    const canopyLeafCount = quality === 'low' ? 14 : 22;
    const leafGeom = new THREE.SphereGeometry(18, 6, 6);
    leafGeom.scale(1.2, 0.08, 2.2);

    const canopyMat = new THREE.MeshStandardMaterial({
      color: level.environment === 'garden' ? 0x064e3b : 0x2e6617,
      emissive: level.environment === 'garden' ? 0x022c22 : 0x143e06,
      emissiveIntensity: 0.3,
      roughness: 0.6,
      transparent: true,
      opacity: 0.78,
      side: THREE.DoubleSide,
    });

    for (let c = 0; c < canopyLeafCount; c++) {
      const cAngle = (c / canopyLeafCount) * Math.PI * 2;
      const cDist = 45 + (c % 4) * 20;
      const cx = Math.cos(cAngle) * cDist;
      const cz = Math.sin(cAngle) * cDist;
      const cy = 52 + (c % 3) * 6;

      const leaf = new THREE.Mesh(leafGeom, canopyMat);
      leaf.position.set(cx, cy, cz);
      leaf.rotation.x = Math.sin(c) * 0.4;
      leaf.rotation.y = cAngle;
      leaf.rotation.z = Math.cos(c) * 0.4;
      canopyGroup.add(leaf);
    }
    group.add(canopyGroup);
  }
}

// --------------------------------------------------------------------------
// Terrain & Substrates for All Environments
// --------------------------------------------------------------------------
function buildGroundSubstrate(
  level: LevelDefinition,
  group: THREE.Group,
  quality: 'low' | 'medium' | 'high'
) {
  const segments = quality === 'low' ? 24 : 36;
  const groundGeom = new THREE.PlaneGeometry(380, 380, segments, segments);
  const posAttr = groundGeom.attributes.position;

  for (let i = 0; i < posAttr.count; i++) {
    const x = posAttr.getX(i);
    const y = posAttr.getY(i);
    const z =
      Math.sin(x * 0.04) * Math.cos(y * 0.04) * 4.0 +
      Math.sin(x * 0.015) * 2.2;
    posAttr.setZ(i, z);
  }
  groundGeom.computeVertexNormals();

  if (level.environment === 'neural') {
    // Bio-electric hexagonal circuit substrate
    const neuralGroundMat = new THREE.MeshStandardMaterial({
      color: 0x080318,
      emissive: 0x1e0838,
      emissiveIntensity: 0.35,
      roughness: 0.3,
      metalness: 0.8,
      wireframe: quality !== 'low',
    });
    const ground = new THREE.Mesh(groundGeom, neuralGroundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -1;
    group.add(ground);

    // Glowing circuit grid overlay
    const gridHelper = new THREE.PolarGridHelper(160, 16, 8, 32, 0x06b6d4, 0xa855f7);
    gridHelper.position.y = 0.2;
    (gridHelper.material as THREE.Material).transparent = true;
    (gridHelper.material as THREE.Material).opacity = 0.35;
    group.add(gridHelper);
  } else {
    // Organic forest / loam floor
    const groundMat = new THREE.MeshStandardMaterial({
      color: level.environment === 'garden' ? 0x0a2618 : 0x24160a,
      roughness: 0.85,
      metalness: 0.05,
    });
    const ground = new THREE.Mesh(groundGeom, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -1.5;
    group.add(ground);
  }
}

// --------------------------------------------------------------------------
// Playable Boundary Mesh (Luminous boundary cage at R=135)
// --------------------------------------------------------------------------
function buildPlayableBoundaryMesh(themeColor: string, group: THREE.Group): THREE.Mesh {
  const boundaryRadius = 135;
  const boundaryHeight = 65;
  const boundaryGeom = new THREE.CylinderGeometry(
    boundaryRadius,
    boundaryRadius,
    boundaryHeight,
    32,
    4,
    true
  );
  boundaryGeom.translate(0, boundaryHeight / 2, 0);

  const boundaryMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color(themeColor),
    wireframe: true,
    transparent: true,
    opacity: 0.14,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });

  const boundaryMesh = new THREE.Mesh(boundaryGeom, boundaryMat);
  group.add(boundaryMesh);
  return boundaryMesh;
}

// --------------------------------------------------------------------------
// ENVIRONMENT 1: Polish Enchanted Garden (With Real Solid Tree Trunks, Stems & Foliage)
// --------------------------------------------------------------------------
function buildEnchantedGardenFull(
  group: THREE.Group,
  obstacles: WorldObstacle[],
  collectibles: WorldCollectible[],
  geoms: ReturnType<typeof getSharedGeometries>,
  quality: 'low' | 'medium' | 'high'
) {
  // 1. Giant Ancient Tree Trunks (Mighty Solid Obstacles & Natural Perimeter Forest)
  const trunkMat = new THREE.MeshStandardMaterial({
    color: 0x1f140c,
    roughness: 0.9,
    metalness: 0.1,
  });
  const mossMat = new THREE.MeshStandardMaterial({
    color: 0x0d5c34,
    emissive: 0x052e18,
    emissiveIntensity: 0.25,
    roughness: 0.8,
  });

  const treePositions = [
    // Outer perimeter natural forest wall
    { x: -110, z: -40, r: 5.2 },
    { x: -95, z: 65, r: 4.8 },
    { x: -70, z: -105, r: 5.0 },
    { x: 30, z: -115, r: 4.6 },
    { x: 105, z: -55, r: 5.4 },
    { x: 115, z: 50, r: 4.9 },
    { x: 60, z: 105, r: 5.1 },
    { x: -40, z: 110, r: 4.7 },
    // Mid-course grove obstacles requiring flight steering
    { x: -45, z: -25, r: 4.2 },
    { x: 50, z: -35, r: 4.0 },
    { x: -35, z: 45, r: 4.1 },
    { x: 45, z: 40, r: 4.3 },
  ];

  for (let t = 0; t < treePositions.length; t++) {
    const tp = treePositions[t];
    const treeGroup = new THREE.Group();
    treeGroup.position.set(tp.x, 0, tp.z);

    const trunkMesh = new THREE.Mesh(geoms.trunk, trunkMat);
    trunkMesh.scale.set(tp.r / 4.2, 1, tp.r / 4.2);
    treeGroup.add(trunkMesh);

    // Moss collars
    const collarGeom = new THREE.TorusGeometry(tp.r * 1.05, 0.6, 6, 12);
    collarGeom.rotateX(Math.PI / 2);
    const collar = new THREE.Mesh(collarGeom, mossMat);
    collar.position.y = 8 + (t % 3) * 5;
    treeGroup.add(collar);

    group.add(treeGroup);

    // REGISTER AS SOLID CYLINDER OBSTACLE
    obstacles.push({
      position: new THREE.Vector3(tp.x, 0, tp.z),
      radius: tp.r,
      radiusSq: tp.r * tp.r,
      mesh: trunkMesh,
      type: 'cylinder',
      minY: 0,
      maxY: 75,
      label: `tree_trunk_${t}`,
    });
  }

  // 2. Layered Night Orchids & Luminous Flowers (Stems are Solid Cylinders!)
  const flowerPalettes = [
    { outer: 0x00f2fe, inner: 0x38bdf8, emissive: 0x00c4df }, // Cyan Orchid
    { outer: 0xc084fc, inner: 0xe879f9, emissive: 0xa855f7 }, // Celestial Violet
    { outer: 0xf472b6, inner: 0xfb7185, emissive: 0xec4899 }, // Magenta Lotus
    { outer: 0x34d399, inner: 0x6ee7b7, emissive: 0x10b981 }, // Emerald Dewdrop
    { outer: 0xfbbf24, inner: 0xfde047, emissive: 0xf59e0b }, // Honey Lily
  ];

  const stemMat = new THREE.MeshStandardMaterial({ color: 0x11462a, roughness: 0.65 });
  const leafMat = new THREE.MeshStandardMaterial({
    color: 0x15803d,
    emissive: 0x052e16,
    emissiveIntensity: 0.2,
    roughness: 0.5,
    side: THREE.DoubleSide,
  });
  const stamenMat = new THREE.MeshBasicMaterial({ color: 0xfff07c });

  const sharedStemGeom = new THREE.CylinderGeometry(0.7, 1.2, 1, 8);
  sharedStemGeom.translate(0, 0.5, 0);

  const outerPetalMaterials = flowerPalettes.map(
    (pal) =>
      new THREE.MeshStandardMaterial({
        color: pal.outer,
        emissive: pal.emissive,
        emissiveIntensity: 0.7,
        roughness: 0.3,
        transparent: true,
        opacity: 0.9,
        side: THREE.DoubleSide,
      })
  );

  const innerPetalMaterials = flowerPalettes.map(
    (pal) =>
      new THREE.MeshStandardMaterial({
        color: pal.inner,
        emissive: pal.emissive,
        emissiveIntensity: 0.85,
        roughness: 0.25,
        transparent: true,
        opacity: 0.92,
        side: THREE.DoubleSide,
      })
  );

  const flowerCount = quality === 'low' ? 24 : quality === 'medium' ? 32 : 38;

  for (let i = 0; i < flowerCount; i++) {
    const angle = (i / flowerCount) * Math.PI * 2 + (Math.random() - 0.5) * 0.25;
    const dist = 22 + Math.random() * 85;
    const x = Math.cos(angle) * dist;
    const z = Math.sin(angle) * dist;
    const height = 13 + Math.random() * 22;

    const flowerGroup = new THREE.Group();
    flowerGroup.position.set(x, 0, z);

    const scaleVar = 0.85 + (i % 4) * 0.12;
    flowerGroup.scale.setScalar(scaleVar);

    const stem = new THREE.Mesh(sharedStemGeom, stemMat);
    stem.scale.set(1, height, 1);
    stem.rotation.z = Math.sin(i) * 0.15;
    stem.rotation.x = Math.cos(i) * 0.15;
    flowerGroup.add(stem);

    // Leaves branching from stem
    [-1, 1].forEach((leafSide, lIdx) => {
      const leafHeight = height * (0.35 + lIdx * 0.3);
      const leaf = new THREE.Mesh(geoms.leaf, leafMat);
      leaf.position.set(leafSide * 0.4, leafHeight, 0);
      leaf.rotation.z = leafSide * 0.6;
      leaf.rotation.y = lIdx * 1.2;
      flowerGroup.add(leaf);
    });

    // Blossom Cup with Layered Petals
    const blossomGroup = new THREE.Group();
    blossomGroup.position.set(0, height, 0);

    const palIdx = i % flowerPalettes.length;
    const outerMat = outerPetalMaterials[palIdx];
    const innerMat = innerPetalMaterials[palIdx];

    // Layer 1: Outer Petals
    for (let p = 0; p < 5; p++) {
      const petal = new THREE.Mesh(geoms.outerPetal, outerMat);
      petal.rotation.y = (p / 5) * Math.PI * 2;
      petal.rotation.x = 0.42;
      blossomGroup.add(petal);
    }

    // Layer 2: Inner Petals
    for (let p = 0; p < 5; p++) {
      const petal = new THREE.Mesh(geoms.innerPetal, innerMat);
      petal.rotation.y = (p / 5) * Math.PI * 2 + Math.PI / 5;
      petal.rotation.x = 0.22;
      petal.position.y = 0.2;
      blossomGroup.add(petal);
    }

    // Glowing Stamen Core
    const stamen = new THREE.Mesh(geoms.stamen, stamenMat);
    stamen.position.y = 0.55;
    blossomGroup.add(stamen);

    flowerGroup.add(blossomGroup);
    group.add(flowerGroup);

    // REGISTER STEM AS SOLID CYLINDER OBSTACLE
    const stemRadius = 1.6 * scaleVar;
    obstacles.push({
      position: new THREE.Vector3(x, 0, z),
      radius: stemRadius,
      radiusSq: stemRadius * stemRadius,
      mesh: stem,
      type: 'cylinder',
      minY: 0,
      maxY: height,
      label: `flower_stem_${i}`,
    });

    // Nectar Droplet Nestled in Flower Cup
    createNectarDropletPolished(
      group,
      collectibles,
      new THREE.Vector3(x, height + 1.4, z),
      50,
      0xfff07c,
      geoms,
      'nectar'
    );
  }

  // 3. Bioluminescent Forest Mushrooms (With Solid Collision)
  const mushroomCount = quality === 'low' ? 20 : 30;
  const shroomStemMat = new THREE.MeshStandardMaterial({ color: 0x2dd4bf, roughness: 0.6 });
  const shroomCapMat = new THREE.MeshStandardMaterial({
    color: 0x06b6d4,
    emissive: 0x06b6d4,
    emissiveIntensity: 0.85,
    roughness: 0.25,
  });

  for (let m = 0; m < mushroomCount; m++) {
    const mx = (Math.random() - 0.5) * 200;
    const mz = (Math.random() - 0.5) * 200;
    const mHeight = 3.5 + Math.random() * 5.5;

    const shroomGroup = new THREE.Group();
    shroomGroup.position.set(mx, 0, mz);

    const shroomStem = new THREE.Mesh(sharedStemGeom, shroomStemMat);
    shroomStem.scale.set(0.8, mHeight, 0.8);
    shroomGroup.add(shroomStem);

    const cap = new THREE.Mesh(geoms.mushroomCap, shroomCapMat);
    cap.position.y = mHeight;
    shroomGroup.add(cap);

    group.add(shroomGroup);

    // Solid obstacle for larger mushrooms
    if (mHeight > 5.0) {
      obstacles.push({
        position: new THREE.Vector3(mx, 0, mz),
        radius: 1.8,
        radiusSq: 1.8 * 1.8,
        mesh: shroomGroup,
        type: 'cylinder',
        minY: 0,
        maxY: mHeight + 1.5,
        label: `mushroom_${m}`,
      });
    }

    if (m % 2 === 0) {
      createNectarDropletPolished(
        group,
        collectibles,
        new THREE.Vector3(mx, mHeight + 2.0, mz),
        30,
        0x38bdf8,
        geoms,
        'nectar'
      );
    }
  }

  // 4. Giant Vine Arches
  const vineCount = quality === 'low' ? 5 : 8;
  const vineMat = new THREE.MeshStandardMaterial({ color: 0x064e3b, roughness: 0.8 });
  for (let v = 0; v < vineCount; v++) {
    const startX = -60 + v * 16;
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(startX, 0, -50 + Math.sin(v) * 35),
      new THREE.Vector3(startX + 22, 17 + (v % 3) * 6, -12),
      new THREE.Vector3(startX + 45, 15 + (v % 2) * 5, 28),
      new THREE.Vector3(startX + 65, 0, 70),
    ]);
    const vineGeom = new THREE.TubeGeometry(curve, 20, 1.4, 6, false);
    const vine = new THREE.Mesh(vineGeom, vineMat);
    group.add(vine);

    // Register arch footings as solid obstacles
    obstacles.push({
      position: new THREE.Vector3(startX, 0, -50 + Math.sin(v) * 35),
      radius: 2.2,
      radiusSq: 2.2 * 2.2,
      mesh: vine,
      type: 'cylinder',
      minY: 0,
      maxY: 20,
      label: `vine_arch_left_${v}`,
    });
    obstacles.push({
      position: new THREE.Vector3(startX + 65, 0, 70),
      radius: 2.2,
      radiusSq: 2.2 * 2.2,
      mesh: vine,
      type: 'cylinder',
      minY: 0,
      maxY: 20,
      label: `vine_arch_right_${v}`,
    });
  }
}

// --------------------------------------------------------------------------
// ENVIRONMENT 2: Polish Pollen Run (With Towering Sunflowers, Slalom Posts & Fluff)
// --------------------------------------------------------------------------
function buildPollenRunFull(
  group: THREE.Group,
  obstacles: WorldObstacle[],
  collectibles: WorldCollectible[],
  geoms: ReturnType<typeof getSharedGeometries>,
  quality: 'low' | 'medium' | 'high'
) {
  const sunflowerMat = new THREE.MeshStandardMaterial({
    color: 0xf59e0b,
    emissive: 0xd97706,
    emissiveIntensity: 0.5,
    roughness: 0.35,
  });
  const centerMat = new THREE.MeshStandardMaterial({ color: 0x451a03, roughness: 0.8 });
  const stalkMat = new THREE.MeshStandardMaterial({ color: 0x166534, roughness: 0.7 });

  const count = quality === 'low' ? 24 : 34;
  const sharedStalkGeom = new THREE.CylinderGeometry(0.8, 1.4, 1, 8);
  sharedStalkGeom.translate(0, 0.5, 0);

  const sharedDiscGeom = new THREE.CylinderGeometry(3.5, 3.5, 0.6, 14);
  sharedDiscGeom.rotateX(Math.PI / 2);

  const sharedPetalConeGeom = new THREE.ConeGeometry(1.0, 4.4, 5);
  sharedPetalConeGeom.translate(0, 2.2, 0);

  // 1. Towering Sunflowers (Stems are Solid Cylinders!)
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.3;
    const dist = 25 + Math.random() * 95;
    const x = Math.cos(angle) * dist;
    const z = Math.sin(angle) * dist;
    const height = 18 + Math.random() * 26;

    const sunflower = new THREE.Group();
    sunflower.position.set(x, 0, z);

    const stalk = new THREE.Mesh(sharedStalkGeom, stalkMat);
    stalk.scale.set(1, height, 1);
    sunflower.add(stalk);

    const headGroup = new THREE.Group();
    headGroup.position.set(0, height, 0);
    headGroup.rotation.x = 0.4;

    const disc = new THREE.Mesh(sharedDiscGeom, centerMat);
    headGroup.add(disc);

    for (let p = 0; p < 14; p++) {
      const petal = new THREE.Mesh(sharedPetalConeGeom, sunflowerMat);
      petal.rotation.z = (p / 14) * Math.PI * 2;
      headGroup.add(petal);
    }

    sunflower.add(headGroup);
    group.add(sunflower);

    // REGISTER AS SOLID CYLINDER OBSTACLE
    const stalkRadius = 2.0;
    obstacles.push({
      position: new THREE.Vector3(x, 0, z),
      radius: stalkRadius,
      radiusSq: stalkRadius * stalkRadius,
      mesh: stalk,
      type: 'cylinder',
      minY: 0,
      maxY: height,
      label: `sunflower_stalk_${i}`,
    });

    createNectarDropletPolished(
      group,
      collectibles,
      new THREE.Vector3(x + (Math.random() - 0.5) * 4, height + 2.2, z + (Math.random() - 0.5) * 4),
      35,
      0xfbbf24,
      geoms,
      'pollen'
    );
  }

  // 2. Solid Wooden Garden Stakes & Bramble Slalom Posts (Intentional Slalom Obstacles)
  const woodStakeMat = new THREE.MeshStandardMaterial({ color: 0x451a03, roughness: 0.85 });
  const stakeGeom = new THREE.CylinderGeometry(1.4, 1.8, 55, 8);
  stakeGeom.translate(0, 27.5, 0);

  const slalomPositions = [
    { x: -28, z: -15 },
    { x: 28, z: -25 },
    { x: -35, z: 25 },
    { x: 32, z: 35 },
    { x: 0, z: -55 },
    { x: -55, z: 0 },
    { x: 55, z: 0 },
    { x: 0, z: 55 },
  ];

  for (let s = 0; s < slalomPositions.length; s++) {
    const sp = slalomPositions[s];
    const stake = new THREE.Mesh(stakeGeom, woodStakeMat);
    stake.position.set(sp.x, 0, sp.z);
    group.add(stake);

    // REGISTER AS SOLID SLALOM CYLINDER OBSTACLE
    obstacles.push({
      position: new THREE.Vector3(sp.x, 0, sp.z),
      radius: 2.2,
      radiusSq: 2.2 * 2.2,
      mesh: stake,
      type: 'cylinder',
      minY: 0,
      maxY: 55,
      label: `slalom_stake_${s}`,
    });
  }

  // 3. Dense Perimeter Bamboo Reeds (Forms Garden Perimeter Wall)
  const bambooMat = new THREE.MeshStandardMaterial({ color: 0x3f6212, roughness: 0.6 });
  const bambooGeom = new THREE.CylinderGeometry(1.6, 2.2, 70, 8);
  bambooGeom.translate(0, 35, 0);

  const bambooCount = quality === 'low' ? 14 : 22;
  for (let b = 0; b < bambooCount; b++) {
    const bAngle = (b / bambooCount) * Math.PI * 2;
    const bDist = 115 + (b % 3) * 12;
    const bx = Math.cos(bAngle) * bDist;
    const bz = Math.sin(bAngle) * bDist;

    const reed = new THREE.Mesh(bambooGeom, bambooMat);
    reed.position.set(bx, 0, bz);
    group.add(reed);

    obstacles.push({
      position: new THREE.Vector3(bx, 0, bz),
      radius: 2.5,
      radiusSq: 2.5 * 2.5,
      mesh: reed,
      type: 'cylinder',
      minY: 0,
      maxY: 70,
      label: `perimeter_bamboo_${b}`,
    });
  }

  // 4. Drifting Dandelion Seed Heads (Moving Dynamic Sphere Obstacles)
  const seedCount = quality === 'low' ? 6 : 10;
  const sharedFluffGeom = new THREE.SphereGeometry(2.4, 6, 6);
  const fluffMat = new THREE.MeshBasicMaterial({
    color: 0xfffbeb,
    wireframe: true,
    transparent: true,
    opacity: 0.45,
  });

  for (let d = 0; d < seedCount; d++) {
    const seedGroup = new THREE.Group();
    const sx = (Math.random() - 0.5) * 160;
    const sy = 12 + Math.random() * 24;
    const sz = (Math.random() - 0.5) * 160;
    seedGroup.position.set(sx, sy, sz);

    const fluff = new THREE.Mesh(sharedFluffGeom, fluffMat);
    seedGroup.add(fluff);
    group.add(seedGroup);

    obstacles.push({
      position: seedGroup.position,
      radius: 2.4,
      radiusSq: 2.4 * 2.4,
      mesh: seedGroup,
      type: 'sphere',
      isMoving: true,
      velocity: new THREE.Vector3((Math.random() - 0.5) * 3, 0, (Math.random() - 0.5) * 3),
      label: `dandelion_fluff_${d}`,
    });
  }
}

// --------------------------------------------------------------------------
// ENVIRONMENT 3: Polish Neural Dreamscape (With Solid Neural Pillars & Passable Axons)
// --------------------------------------------------------------------------
function buildNeuralDreamscapeFull(
  group: THREE.Group,
  obstacles: WorldObstacle[],
  collectibles: WorldCollectible[],
  geoms: ReturnType<typeof getSharedGeometries>,
  quality: 'low' | 'medium' | 'high'
) {
  // 1. SOLID NEURAL PILLARS (Crystalline Columnar Monoliths as Definite Solid Obstacles)
  const pillarMat = new THREE.MeshStandardMaterial({
    color: 0x0f172a, // Deep obsidian crystalline body
    roughness: 0.2,
    metalness: 0.9,
  });

  const hazardRingMat = new THREE.MeshStandardMaterial({
    color: 0x06b6d4,
    emissive: 0x06b6d4,
    emissiveIntensity: 0.9,
    roughness: 0.1,
  });

  const pillarPositions = [
    // Core slalom barriers
    { x: -35, z: -35, r: 3.4 },
    { x: 35, z: -35, r: 3.4 },
    { x: -35, z: 35, r: 3.4 },
    { x: 35, z: 35, r: 3.4 },
    { x: 0, z: -60, r: 3.8 },
    { x: -60, z: 0, r: 3.8 },
    { x: 60, z: 0, r: 3.8 },
    { x: 0, z: 60, r: 3.8 },
    // Perimeter transmission columns
    { x: -85, z: -70, r: 4.2 },
    { x: 85, z: -70, r: 4.2 },
    { x: -85, z: 70, r: 4.2 },
    { x: 85, z: 70, r: 4.2 },
    { x: -110, z: 0, r: 4.5 },
    { x: 110, z: 0, r: 4.5 },
  ];

  for (let p = 0; p < pillarPositions.length; p++) {
    const pp = pillarPositions[p];
    const pillarGroup = new THREE.Group();
    pillarGroup.position.set(pp.x, 0, pp.z);

    const pillarMesh = new THREE.Mesh(geoms.pillar, pillarMat);
    pillarMesh.scale.set(pp.r / 3.0, 1, pp.r / 3.0);
    pillarGroup.add(pillarMesh);

    // Glowing hazard rings encircling the pillar so players instantly recognize solid obstacles
    for (let h = 0; h < 4; h++) {
      const ringGeom = new THREE.TorusGeometry(pp.r * 1.08, 0.45, 6, 16);
      ringGeom.rotateX(Math.PI / 2);
      const ringMesh = new THREE.Mesh(ringGeom, hazardRingMat);
      ringMesh.position.y = 8 + h * 14;
      pillarGroup.add(ringMesh);
    }

    group.add(pillarGroup);

    // REGISTER AS SOLID CYLINDER OBSTACLE
    obstacles.push({
      position: new THREE.Vector3(pp.x, 0, pp.z),
      radius: pp.r,
      radiusSq: pp.r * pp.r,
      mesh: pillarGroup,
      type: 'cylinder',
      minY: 0,
      maxY: 65,
      label: `neural_pillar_${p}`,
    });
  }

  // 2. PASSABLE BIO-ELECTRIC AXONAL PATHWAYS (Fly freely through, not solid obstacles!)
  const axonColors = [0x00f2fe, 0xa855f7, 0xec4899, 0x3b82f6];
  const axonCount = quality === 'low' ? 14 : 20;
  const sharedNodeGeom = new THREE.SphereGeometry(1.8, 8, 8);

  for (let a = 0; a < axonCount; a++) {
    const points: THREE.Vector3[] = [];
    const length = 5;
    const startX = (Math.random() - 0.5) * 180;
    const startY = 8 + Math.random() * 30;
    const startZ = (Math.random() - 0.5) * 180;

    for (let p = 0; p < length; p++) {
      points.push(
        new THREE.Vector3(
          startX + (p - length / 2) * 26 + (Math.random() - 0.5) * 16,
          startY + Math.sin(p * 1.5) * 12,
          startZ + (p - length / 2) * 26 + (Math.random() - 0.5) * 16
        )
      );
    }

    const curve = new THREE.CatmullRomCurve3(points);
    const axonGeom = new THREE.TubeGeometry(curve, 16, 0.9, 6, false);
    const color = axonColors[a % axonColors.length];

    const axonMat = new THREE.MeshStandardMaterial({
      color: color,
      emissive: color,
      emissiveIntensity: 0.7,
      roughness: 0.25,
      transparent: true,
      opacity: 0.85,
    });
    const axon = new THREE.Mesh(axonGeom, axonMat);
    group.add(axon);

    // Synaptic transmission nodes & collectible vesicle droplets
    const nodeMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    points.forEach((pt, pIdx) => {
      if (pIdx > 0 && pIdx < length - 1) {
        const node = new THREE.Mesh(sharedNodeGeom, nodeMat);
        node.position.copy(pt);
        group.add(node);

        createNectarDropletPolished(
          group,
          collectibles,
          new THREE.Vector3(pt.x, pt.y + 2.5, pt.z),
          60,
          0xc084fc,
          geoms,
          'vesicle'
        );
      }
    });
  }

  // 3. Central Complex Core Ring Structure
  const cxGroup = new THREE.Group();
  cxGroup.position.set(0, 24, 0);

  const torusGeom = new THREE.TorusGeometry(18, 2.0, 10, 24);
  const torusMat = new THREE.MeshStandardMaterial({
    color: 0x9333ea,
    emissive: 0x6b21a8,
    emissiveIntensity: 0.6,
    roughness: 0.3,
    wireframe: true,
  });
  const torus = new THREE.Mesh(torusGeom, torusMat);
  torus.rotation.x = Math.PI / 2;
  cxGroup.add(torus);

  group.add(cxGroup);
}

// --------------------------------------------------------------------------
// Luminous Checkpoint Rings with Directional Guide Beacons
// --------------------------------------------------------------------------
function buildFlightPathRingsPolished(
  level: LevelDefinition,
  group: THREE.Group,
  rings: WorldRing[]
) {
  const ringCount = level.targetRings;
  const ringColor = new THREE.Color(level.themeColor);

  const loopPoints: THREE.Vector3[] = [];
  const radius = 68;

  for (let i = 0; i < ringCount; i++) {
    const fraction = i / ringCount;
    const angle = fraction * Math.PI * 2;
    const x = Math.sin(angle) * radius * 1.35;
    const z = Math.cos(angle * 2) * (radius * 0.85);
    const y = 9 + Math.sin(angle * 3) * 7 + Math.cos(angle) * 5;
    loopPoints.push(new THREE.Vector3(x, y, z));
  }

  const loopCurve = new THREE.CatmullRomCurve3(loopPoints, true);

  const ringRadius = 4.4;
  const ringGeom = new THREE.TorusGeometry(ringRadius, 0.36, 8, 22);
  const ringMat = new THREE.MeshStandardMaterial({
    color: ringColor,
    emissive: ringColor,
    emissiveIntensity: 0.85,
    roughness: 0.15,
    metalness: 0.7,
  });

  const glowGeom = new THREE.TorusGeometry(ringRadius + 0.42, 0.16, 6, 20);

  // Inner waypoint beacon circle to guide sight from distance
  const beaconGeom = new THREE.RingGeometry(0.8, 1.4, 16);
  const beaconMat = new THREE.MeshBasicMaterial({
    color: ringColor,
    transparent: true,
    opacity: 0.45,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
  });

  for (let i = 0; i < ringCount; i++) {
    const t = i / ringCount;
    const pos = loopCurve.getPointAt(t);
    const tangent = loopCurve.getTangentAt(t);

    const ringGroup = new THREE.Group();
    ringGroup.position.copy(pos);
    ringGroup.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), tangent);

    const ringMesh = new THREE.Mesh(ringGeom, ringMat);
    ringGroup.add(ringMesh);

    const glowMat = new THREE.MeshBasicMaterial({
      color: ringColor,
      transparent: true,
      opacity: 0.7,
      blending: THREE.AdditiveBlending,
    });
    const glowMesh = new THREE.Mesh(glowGeom, glowMat);
    ringGroup.add(glowMesh);

    // Directional Center Guide Beacon
    const beaconMesh = new THREE.Mesh(beaconGeom, beaconMat.clone());
    beaconMesh.visible = i === 0;
    ringGroup.add(beaconMesh);

    group.add(ringGroup);

    rings.push({
      mesh: ringGroup,
      index: i,
      radius: ringRadius,
      radiusSq: ringRadius * ringRadius,
      passed: false,
      position: pos.clone(),
      glowMesh,
      beaconMesh,
    });
  }
}

// --------------------------------------------------------------------------
// Optimized Nectar / Pollen / Vesicle Droplet Spawner
// --------------------------------------------------------------------------
const cachedNectarMats = new Map<number, THREE.MeshStandardMaterial>();

function createNectarDropletPolished(
  group: THREE.Group,
  collectibles: WorldCollectible[],
  pos: THREE.Vector3,
  value: number,
  colorHex: number,
  geoms: ReturnType<typeof getSharedGeometries>,
  type: 'nectar' | 'pollen' | 'vesicle' = 'nectar'
) {
  const itemGroup = new THREE.Group();
  itemGroup.position.copy(pos);

  let mat = cachedNectarMats.get(colorHex);
  if (!mat) {
    mat = new THREE.MeshStandardMaterial({
      color: colorHex,
      emissive: colorHex,
      emissiveIntensity: 0.95,
      roughness: 0.1,
      transparent: true,
      opacity: 0.92,
    });
    cachedNectarMats.set(colorHex, mat);
  }

  const mesh = new THREE.Mesh(geoms.nectar, mat);
  itemGroup.add(mesh);

  const auraMat = new THREE.MeshBasicMaterial({
    color: colorHex,
    transparent: true,
    opacity: 0.4,
    wireframe: true,
  });
  const aura = new THREE.Mesh(geoms.aura, auraMat);
  itemGroup.add(aura);

  group.add(itemGroup);

  collectibles.push({
    mesh: itemGroup,
    type,
    value,
    radiusSq: 1.8 * 1.8,
    collected: false,
    baseY: pos.y,
    rotationSpeed: 1.6 + Math.random(),
  });
}
