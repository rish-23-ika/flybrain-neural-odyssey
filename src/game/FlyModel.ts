import * as THREE from 'three';

/**
 * Creates a soft glowing radial particle texture for pollen and atmospheric spores.
 * Eliminates harsh square particle artifacts.
 */
export function createSoftParticleTexture(isPollen: boolean = false): THREE.Texture {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);

  if (isPollen) {
    grad.addColorStop(0, 'rgba(255, 245, 180, 1.0)');
    grad.addColorStop(0.25, 'rgba(251, 191, 36, 0.85)');
    grad.addColorStop(0.6, 'rgba(245, 158, 11, 0.35)');
    grad.addColorStop(1, 'rgba(217, 119, 6, 0.0)');
  } else {
    grad.addColorStop(0, 'rgba(255, 255, 255, 1.0)');
    grad.addColorStop(0.25, 'rgba(125, 211, 252, 0.85)');
    grad.addColorStop(0.6, 'rgba(6, 182, 212, 0.35)');
    grad.addColorStop(1, 'rgba(2, 132, 199, 0.0)');
  }

  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 64, 64);
  const texture = new THREE.CanvasTexture(canvas);
  texture.generateMipmaps = false;
  texture.minFilter = THREE.LinearFilter;
  return texture;
}

/**
 * Creates an articulate, visually stunning 3D Fruit Fly (Drosophila melanogaster) model
 * with glistening chitin, faceted compound ruby eyes, crystalline veined wings,
 * halteres, thoracic bristles, and smooth figure-8 wing animation.
 */
export function createFruitFlyModel(options?: { heroScale?: boolean }): {
  root: THREE.Group;
  leftWing: THREE.Group;
  rightWing: THREE.Group;
  wingTrailLeft: THREE.Vector3;
  wingTrailRight: THREE.Vector3;
  updateAnimation: (time: number, speedRatio: number, isBoosting: boolean) => void;
} {
  const root = new THREE.Group();

  // Premium Chitin Materials with Fresnel Edge Glow for high contrast visibility
  const thoraxMaterial = new THREE.MeshPhysicalMaterial({
    color: 0xe08c2f, // Radiant golden amber-bronze
    emissive: 0x3d1d05,
    emissiveIntensity: 0.3,
    roughness: 0.25,
    metalness: 0.32,
    clearcoat: 0.9,
    clearcoatRoughness: 0.12,
    reflectivity: 0.9,
  });

  const headMaterial = new THREE.MeshPhysicalMaterial({
    color: 0xba6022,
    emissive: 0x2e1203,
    emissiveIntensity: 0.25,
    roughness: 0.28,
    metalness: 0.25,
    clearcoat: 0.85,
  });

  // Ruby-red compound eyes with vivid inner luminescence & specular glint
  const eyeMaterial = new THREE.MeshPhysicalMaterial({
    color: 0xf41b3c,
    emissive: 0x8a0020,
    emissiveIntensity: 0.65,
    roughness: 0.08,
    metalness: 0.12,
    clearcoat: 1.0,
    clearcoatRoughness: 0.06,
    reflectivity: 1.0,
  });

  // Iridescent crystalline translucent wings with high-contrast glowing edge
  const wingMaterial = new THREE.MeshPhysicalMaterial({
    color: 0xe8f7ff,
    emissive: 0x1e3a5f,
    emissiveIntensity: 0.2,
    transmission: 0.82,
    opacity: 0.82,
    transparent: true,
    roughness: 0.05,
    metalness: 0.12,
    ior: 1.48,
    side: THREE.DoubleSide,
    depthWrite: false,
    clearcoat: 1.0,
    clearcoatRoughness: 0.04,
  });

  const wingVeinMaterial = new THREE.MeshBasicMaterial({
    color: 0x2563eb,
    transparent: true,
    opacity: 0.8,
  });

  // 1. Thorax (Center body - aerodynamic ovoid)
  const thoraxGeom = new THREE.SphereGeometry(0.38, 20, 20);
  thoraxGeom.scale(1.0, 0.92, 1.35);
  const thoraxMesh = new THREE.Mesh(thoraxGeom, thoraxMaterial);
  root.add(thoraxMesh);

  // Dorsal thoracic stripes (scutum vittae)
  const stripeGeom = new THREE.CylinderGeometry(0.04, 0.04, 0.65, 8);
  stripeGeom.rotateX(Math.PI / 2);
  const stripeMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.5 });
  [-0.1, 0, 0.1].forEach((xPos) => {
    const stripe = new THREE.Mesh(stripeGeom, stripeMat);
    stripe.position.set(xPos, 0.32, 0.02);
    stripe.scale.set(0.6, 0.2, 1.0);
    root.add(stripe);
  });

  // Thoracic Macrochaetae Bristles
  const bristleMat = new THREE.MeshBasicMaterial({ color: 0x1c1208 });
  const bristlePositions = [
    [-0.18, 0.32, -0.15, 0.3, -0.4],
    [0.18, 0.32, -0.15, 0.3, 0.4],
    [-0.22, 0.28, 0.15, 0.4, -0.5],
    [0.22, 0.28, 0.15, 0.4, 0.5],
    [-0.12, 0.34, 0.25, 0.3, -0.2],
    [0.12, 0.34, 0.25, 0.3, 0.2],
  ];
  bristlePositions.forEach(([bx, by, bz, rx, rz]) => {
    const bristleGeom = new THREE.ConeGeometry(0.012, 0.25, 5);
    bristleGeom.rotateX(rx);
    bristleGeom.rotateZ(rz);
    const bristle = new THREE.Mesh(bristleGeom, bristleMat);
    bristle.position.set(bx, by, bz);
    root.add(bristle);
  });

  // Scutellum
  const scutellumGeom = new THREE.ConeGeometry(0.18, 0.28, 10);
  scutellumGeom.rotateX(-Math.PI * 0.4);
  const scutellum = new THREE.Mesh(scutellumGeom, thoraxMaterial);
  scutellum.position.set(0, 0.2, 0.38);
  root.add(scutellum);

  // 2. Head with Giant Compound Eyes
  const headGroup = new THREE.Group();
  headGroup.position.set(0, 0.06, -0.52);

  const headGeom = new THREE.SphereGeometry(0.26, 18, 16);
  headGeom.scale(1.25, 0.95, 0.95);
  const headMesh = new THREE.Mesh(headGeom, headMaterial);
  headGroup.add(headMesh);

  // Large Compound Ruby Eyes
  const eyeGeom = new THREE.SphereGeometry(0.21, 18, 18);
  eyeGeom.scale(0.85, 1.3, 1.15);

  const leftEye = new THREE.Mesh(eyeGeom, eyeMaterial);
  leftEye.position.set(-0.21, 0.05, -0.06);
  leftEye.rotation.set(0.2, -0.4, 0.3);
  headGroup.add(leftEye);

  const rightEye = new THREE.Mesh(eyeGeom, eyeMaterial);
  rightEye.position.set(0.21, 0.05, -0.06);
  rightEye.rotation.set(0.2, 0.4, -0.3);
  headGroup.add(rightEye);

  // Specular Cornea Highlights
  const eyeHighlightMat = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.65,
  });
  [-1, 1].forEach((side) => {
    const glintGeom = new THREE.SphereGeometry(0.045, 8, 8);
    const glint = new THREE.Mesh(glintGeom, eyeHighlightMat);
    glint.position.set(side * 0.28, 0.16, -0.15);
    headGroup.add(glint);
  });

  // Ocelli (Three jewel-like simple eyes on vertex)
  const ocelliMat = new THREE.MeshBasicMaterial({ color: 0xff0044 });
  const ocelliGeom = new THREE.SphereGeometry(0.025, 6, 6);
  [
    [0, 0.25, -0.08],
    [-0.04, 0.24, -0.04],
    [0.04, 0.24, -0.04],
  ].forEach(([ox, oy, oz]) => {
    const oc = new THREE.Mesh(ocelliGeom, ocelliMat);
    oc.position.set(ox, oy, oz);
    headGroup.add(oc);
  });

  // Antennae with Branched Aristae
  [-0.09, 0.09].forEach((xOffset) => {
    const antGeom = new THREE.CylinderGeometry(0.016, 0.012, 0.24, 6);
    antGeom.rotateX(-Math.PI * 0.35);
    const ant = new THREE.Mesh(antGeom, bristleMat);
    ant.position.set(xOffset, 0.17, -0.26);
    headGroup.add(ant);

    const aristaGroup = new THREE.Group();
    aristaGroup.position.set(xOffset * 1.3, 0.25, -0.36);

    const aristaStem = new THREE.Mesh(
      new THREE.CylinderGeometry(0.008, 0.005, 0.18, 5),
      bristleMat
    );
    aristaStem.rotation.x = -0.5;
    aristaGroup.add(aristaStem);

    for (let h = 0; h < 4; h++) {
      const hair = new THREE.Mesh(
        new THREE.CylinderGeometry(0.004, 0.002, 0.08, 4),
        bristleMat
      );
      hair.position.set(0, h * 0.035, 0);
      hair.rotation.z = h % 2 === 0 ? 0.7 : -0.7;
      aristaGroup.add(hair);
    }
    headGroup.add(aristaGroup);
  });

  // Proboscis
  const proboscisGeom = new THREE.CylinderGeometry(0.04, 0.06, 0.25, 8);
  proboscisGeom.rotateX(0.4);
  const proboscis = new THREE.Mesh(proboscisGeom, headMaterial);
  proboscis.position.set(0, -0.22, -0.1);
  headGroup.add(proboscis);

  root.add(headGroup);

  // 3. Abdomen with Banded Chitin Tergites
  const abdomenGroup = new THREE.Group();
  abdomenGroup.position.set(0, -0.06, 0.48);

  const numSegments = 6;
  const darkStripeMat = new THREE.MeshPhysicalMaterial({
    color: 0x1f140e,
    emissive: 0x140a04,
    emissiveIntensity: 0.2,
    roughness: 0.4,
    metalness: 0.25,
    clearcoat: 0.6,
  });
  const lightStripeMat = new THREE.MeshPhysicalMaterial({
    color: 0xdf9845,
    emissive: 0x3d2005,
    emissiveIntensity: 0.3,
    roughness: 0.25,
    metalness: 0.3,
    clearcoat: 0.75,
  });

  for (let i = 0; i < numSegments; i++) {
    const t = i / (numSegments - 1);
    const radius = 0.34 * Math.sin(Math.PI * (0.18 + t * 0.75));
    const length = 0.22;
    const geom = new THREE.CylinderGeometry(radius * 0.94, radius, length, 16);
    geom.rotateX(Math.PI / 2);
    const mat = i % 2 === 0 ? darkStripeMat : lightStripeMat;
    const seg = new THREE.Mesh(geom, mat);
    seg.position.set(0, -0.035 * i, 0.12 + i * 0.18);
    seg.scale.set(1.15, 0.88, 1.0);
    abdomenGroup.add(seg);
  }

  // Posterior Tip
  const tipGeom = new THREE.SphereGeometry(0.14, 12, 12);
  tipGeom.scale(0.9, 0.75, 1.25);
  const tip = new THREE.Mesh(tipGeom, darkStripeMat);
  tip.position.set(0, -0.18, 0.12 + numSegments * 0.18);
  abdomenGroup.add(tip);

  root.add(abdomenGroup);

  // 4. Halteres (Gyroscopic organs)
  const haltereMat = new THREE.MeshPhysicalMaterial({
    color: 0xfde68a,
    emissive: 0x785a10,
    emissiveIntensity: 0.4,
    roughness: 0.2,
    metalness: 0.2,
    clearcoat: 0.8,
  });
  const haltereKnobs: THREE.Mesh[] = [];

  [-1, 1].forEach((side) => {
    const stalkGeom = new THREE.CylinderGeometry(0.018, 0.018, 0.16, 6);
    stalkGeom.rotateZ(side * Math.PI * 0.3);
    const stalk = new THREE.Mesh(stalkGeom, haltereMat);
    stalk.position.set(side * 0.32, 0.03, 0.34);

    const knobGeom = new THREE.SphereGeometry(0.05, 10, 10);
    const knob = new THREE.Mesh(knobGeom, haltereMat);
    knob.position.set(side * 0.39, 0.08, 0.34);
    haltereKnobs.push(knob);

    root.add(stalk);
    root.add(knob);
  });

  // 5. Crystalline Veined Wings
  function createWingMesh(isLeft: boolean): THREE.Group {
    const wingPivot = new THREE.Group();

    const shape = new THREE.Shape();
    shape.moveTo(0, 0);
    shape.bezierCurveTo(0.2, 0.22, 0.65, 0.44, 1.45, 0.38);
    shape.bezierCurveTo(1.75, 0.28, 1.85, 0.06, 1.72, -0.16);
    shape.bezierCurveTo(1.4, -0.42, 0.75, -0.48, 0.25, -0.22);
    shape.bezierCurveTo(0.06, -0.11, 0, -0.05, 0, 0);

    const geom = new THREE.ShapeGeometry(shape, 16);
    geom.scale(1.15, 1.15, 1.0);
    const wingMesh = new THREE.Mesh(geom, wingMaterial);

    const veinGeom = new THREE.BufferGeometry();
    const points = [
      new THREE.Vector3(0, 0, 0.005),
      new THREE.Vector3(0.55, 0.18, 0.005),
      new THREE.Vector3(1.3, 0.21, 0.005),
      new THREE.Vector3(1.65, 0.02, 0.005),
      new THREE.Vector3(0.55, 0.18, 0.005),
      new THREE.Vector3(1.2, 0.0, 0.005),
      new THREE.Vector3(1.5, -0.12, 0.005),
      new THREE.Vector3(0.65, 0.15, 0.005),
      new THREE.Vector3(0.75, -0.22, 0.005),
      new THREE.Vector3(1.2, 0.0, 0.005),
      new THREE.Vector3(1.15, -0.32, 0.005),
    ];
    veinGeom.setFromPoints(points);
    const veins = new THREE.LineSegments(veinGeom, wingVeinMaterial);
    wingMesh.add(veins);

    wingMesh.rotation.x = -Math.PI / 2;
    wingMesh.rotation.z = isLeft ? -Math.PI * 0.14 : Math.PI * 0.14;

    wingPivot.add(wingMesh);
    return wingPivot;
  }

  const leftWing = createWingMesh(true);
  leftWing.position.set(-0.27, 0.25, 0.06);
  root.add(leftWing);

  const rightWing = createWingMesh(false);
  rightWing.position.set(0.27, 0.25, 0.06);
  rightWing.scale.x = -1;
  root.add(rightWing);

  // 6. Bioluminescent Internal Glow Core
  const coreLight = new THREE.PointLight(0x00f2fe, 2.0, 4.5);
  coreLight.position.set(0, -0.05, 0);
  root.add(coreLight);

  const glowMeshGeom = new THREE.SphereGeometry(0.18, 14, 14);
  const glowMeshMat = new THREE.MeshBasicMaterial({
    color: 0x38bdf8,
    transparent: true,
    opacity: 0.45,
  });
  const glowMesh = new THREE.Mesh(glowMeshGeom, glowMeshMat);
  glowMesh.position.set(0, -0.08, 0.12);
  root.add(glowMesh);

  // 7. Folded Swept Aerodynamic Legs
  const legMat = new THREE.MeshPhysicalMaterial({
    color: 0x603813,
    roughness: 0.5,
    metalness: 0.2,
    clearcoat: 0.5,
  });
  [-1, 1].forEach((side) => {
    [-0.15, 0.02, 0.2].forEach((zPos, idx) => {
      const legGroup = new THREE.Group();
      legGroup.position.set(side * 0.22, -0.22, zPos);

      const femurGeom = new THREE.CylinderGeometry(0.022, 0.016, 0.28, 6);
      femurGeom.rotateZ(side * 0.42);
      femurGeom.rotateX(0.45);
      const femur = new THREE.Mesh(femurGeom, legMat);
      femur.position.set(side * 0.06, -0.1, 0.05);
      legGroup.add(femur);

      const tibiaGeom = new THREE.CylinderGeometry(0.016, 0.009, 0.38 + idx * 0.05, 6);
      tibiaGeom.rotateX(0.85);
      const tibia = new THREE.Mesh(tibiaGeom, legMat);
      tibia.position.set(side * 0.09, -0.22, 0.22);
      legGroup.add(tibia);

      root.add(legGroup);
    });
  });

  if (options?.heroScale) {
    root.scale.set(1.5, 1.5, 1.5);
  }

  const wingTrailLeft = new THREE.Vector3();
  const wingTrailRight = new THREE.Vector3();

  // Multi-Harmonic Natural Figure-8 Wing Animation
  const updateAnimation = (time: number, speedRatio: number, isBoosting: boolean) => {
    const baseFreq = 46 + speedRatio * 32 + (isBoosting ? 32 : 0);

    // Primary stroke elevation (flapping angle)
    const strokeFlap = Math.sin(time * baseFreq) * (0.64 + speedRatio * 0.22);
    // Figure-8 stroke pitch twist
    const strokePitch = Math.cos(time * baseFreq) * (0.2 + speedRatio * 0.08);
    // Fore-aft wing deviation
    const strokeDeviation = Math.sin(time * baseFreq * 2) * 0.05;

    leftWing.rotation.z = strokeFlap;
    leftWing.rotation.x = strokePitch;
    leftWing.rotation.y = strokeDeviation;

    rightWing.rotation.z = -strokeFlap;
    rightWing.rotation.x = strokePitch;
    rightWing.rotation.y = -strokeDeviation;

    // High frequency haltere counter-vibration (2x wingbeat frequency in antiphase)
    const haltereOsc = Math.cos(time * baseFreq * 2) * 0.02;
    haltereKnobs.forEach((k) => {
      k.position.y = 0.08 + haltereOsc;
    });

    // Abdomen gentle respiration & aerodynamic tilt
    abdomenGroup.rotation.x = 0.08 + Math.sin(time * 5) * 0.05 + (isBoosting ? 0.16 : 0);

    // Core light glow
    coreLight.intensity = 1.8 + Math.sin(time * 8) * 0.5 + (isBoosting ? 1.8 : 0);
    coreLight.color.setHex(isBoosting ? 0xa855f7 : 0x00f2fe);

    leftWing.getWorldPosition(wingTrailLeft);
    rightWing.getWorldPosition(wingTrailRight);
  };

  return {
    root,
    leftWing,
    rightWing,
    wingTrailLeft,
    wingTrailRight,
    updateAnimation,
  };
}
