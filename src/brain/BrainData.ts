/**
 * BrainData.ts
 * Real Drosophila melanogaster connectome metadata and circuits
 * Source: Male CNS connectome (v1.0), FlyEM / HHMI Janelia with Google Research, Columbia University, Harvard University (2026).
 * Licensed under CC BY 4.0.
 * Derivative work by VIDraft (https://huggingface.co/spaces/VIDraft/fruitfly-brain).
 */

export interface CircuitDefinition {
  id: string;
  name: string;
  category: 'Vision & Evasion' | 'Navigation' | 'Olfaction' | 'Memory';
  description: string;
  keyCellTypes: string[];
  measuredEffect?: string;
}

export const REAL_CONNECTOME_METADATA = {
  title: 'Drosophila Melanogaster Male CNS Connectome',
  version: 'male-cns:v1.0',
  license: 'CC BY 4.0',
  attribution: 'FlyEM / HHMI Janelia Research Campus with Google Research, Columbia University, and Harvard University (2026)',
  referenceSpace: 'VIDraft / fruitfly-brain on Hugging Face',
  totalSimulatedNeurons: 173023,
  totalDrawnSomas: 141781,
  totalSynapses: 6127738,
  totalCellTypes: 11385,
  extentMm: [0.7296, 0.5139, 0.9950] as [number, number, number],
};

export const NOTABLE_CIRCUITS: CircuitDefinition[] = [
  {
    id: 'looming_escape',
    name: 'Visual Looming & Escape Circuit (LC4 → DNp01)',
    category: 'Vision & Evasion',
    description:
      'Looming-sensitive lobula columnar visual projection neurons converge onto giant descending command neurons (DNp01/DNp02) in the gnathal ganglion to drive escape saccades.',
    keyCellTypes: ['LC4', 'LPLC2', 'LC11', 'LC6', 'DNp01', 'DNp02'],
    measuredEffect: 'Ablating LC4 (126 cells) drops the escape command signal by 89.1%.',
  },
  {
    id: 'central_complex',
    name: 'Central Complex Navigation Heading Compass',
    category: 'Navigation',
    description:
      'Ellipsoid body (EB) ring attractor circuit where EPG compass neurons encode current 3D flight heading relative to celestial polarization and optical landmarks.',
    keyCellTypes: ['EPG', 'PFL3', 'PEG', 'Delta7'],
    measuredEffect: 'Maintains azimuthal internal compass for path integration during flight.',
  },
  {
    id: 'olfactory_plumetrac',
    name: 'Antennal Lobe Odor Guidance Circuit',
    category: 'Olfaction',
    description:
      'Projection neurons from ~54 antennal lobe glomeruli relay fermentation volatiles and food odor plumes directly to the lateral horn and mushroom body.',
    keyCellTypes: ['DM1_vPN', 'DM2_vPN', 'DL5_vPN', 'DA1_vPN'],
    measuredEffect: 'Guides upwind surge flight toward rich nectar and ripe fruit sources.',
  },
  {
    id: 'mushroom_body',
    name: 'Mushroom Body Reward Learning Matrix',
    category: 'Memory',
    description:
      'Kenyon cell array (~2,000 cells per hemisphere) receives multisensory input and is modulated by dopaminergic reward signals (DANs) to output learned valence via MBONs.',
    keyCellTypes: ['KCg', 'KCa_b', 'KCap', 'MBON01', 'PPL101'],
    measuredEffect: 'Associates specific visual and olfactory flower cues with sucrose nectar rewards.',
  },
];
