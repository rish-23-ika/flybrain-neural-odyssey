/**
 * FlyLabData.ts
 * Integrates pre-measured looming-escape simulation datasets from the Drosophila Connectome
 * Source: VIDraft / fruitfly-brain (https://huggingface.co/spaces/VIDraft/fruitfly-brain)
 * Based on FlyWire / Janelia Male CNS Connectome v1.0.
 */

export type ConditionId = 'intact' | 'lc4' | 'lplc2' | 'lc11' | 'lc6';

export interface BakedSimulationFile {
  note: string;
  threat: string[];
  frames: number[];
  sig: Record<string, number>;
  act: Record<string, string[]>;
  rest?: string;
}

export interface FrameActivityMetrics {
  frame: number;
  timeMs: number;
  activeCount: number;
  sumActivity: number;
  meanActivity: number;
  rawBuffer: Uint8Array;
}

export interface ConditionDefinition {
  id: ConditionId;
  bakedKey: string;
  name: string;
  shortName: string;
  targetNeuron: string;
  badge: 'Baseline' | 'Primary Pathway' | 'Secondary Synergy' | 'Negative Control';
  badgeColor: string;
  color: string;
  strokeColor: string;
  fillColor: string;
  escapeSignal: number; // 0..1 from baked.json
  signalDeltaPercent: number; // relative change vs intact
  statusSummary: string;
  outcomeLabel: 'Escaped' | 'Delayed Escape' | 'Escape Failed';
  plainSummary: string;
  survivalOutcome: 'Success' | 'Fatal Strike' | 'Compromised / Delayed';
  receptiveField: string;
  neurotransmitter: string;
  synapticTarget: string;
  biologicalExplanation: string;
  behavioralConsequence: string;
  frames: FrameActivityMetrics[];
}

export interface FlyLabDataset {
  note: string;
  threatNeurons: string[];
  frames: number[];
  intactBaselineSignal: number;
  conditions: Record<ConditionId, ConditionDefinition>;
  conditionList: ConditionDefinition[];
}

export const CONDITION_METADATA_CONFIG: Record<
  ConditionId,
  {
    bakedKey: string;
    name: string;
    shortName: string;
    targetNeuron: string;
    badge: 'Baseline' | 'Primary Pathway' | 'Secondary Synergy' | 'Negative Control';
    badgeColor: string;
    color: string;
    strokeColor: string;
    fillColor: string;
    outcomeLabel: 'Escaped' | 'Delayed Escape' | 'Escape Failed';
    plainSummary: string;
    survivalOutcome: 'Success' | 'Fatal Strike' | 'Compromised / Delayed';
    receptiveField: string;
    neurotransmitter: string;
    synapticTarget: string;
    biologicalExplanation: string;
    behavioralConsequence: string;
  }
> = {
  intact: {
    bakedKey: '',
    name: 'Intact Brain Baseline',
    shortName: 'Intact Baseline',
    targetNeuron: 'None (Wild-Type Circuit)',
    badge: 'Baseline',
    badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    color: '#10b981',
    strokeColor: '#34d399',
    fillColor: 'rgba(16, 185, 129, 0.15)',
    outcomeLabel: 'Escaped',
    plainSummary: 'Both visual sensors are active — the fly detects the approaching threat and escapes in time.',
    survivalOutcome: 'Success',
    receptiveField: 'Full binocular compound eyes & visual lobula columns active',
    neurotransmitter: 'Endogenous (Acetylcholine, GABA, Glutamate)',
    synapticTarget: 'Direct parallel inputs into Giant Fiber (GF) dendrites & DNp01',
    biologicalExplanation:
      'In the intact Drosophila connectome, looming visual stimuli trigger rapid synergistic depolarization across Lobula Columnar type 4 (LC4) and Lobula Plate-Lobula Columnar type 2 (LPLC2). Their combined excitatory acetylcholine drive breaches the spike threshold of the Giant Fiber descending neuron, initiating a ballistic jump-and-takeoff saccade within 150–200 milliseconds before impact.',
    behavioralConsequence:
      'Flawless escape. The fly detects the accelerating looming predator, depresses its mesothoracic middle legs in a 200 Hz launch jump, and initiates evasive flight.',
  },
  lc4: {
    bakedKey: 'lc4',
    name: 'LC4 Ablation',
    shortName: 'LC4 Ablated',
    targetNeuron: 'LC4 (Lobula Columnar 4)',
    badge: 'Primary Pathway',
    badgeColor: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
    color: '#f43f5e',
    strokeColor: '#fb7185',
    fillColor: 'rgba(244, 63, 94, 0.15)',
    outcomeLabel: 'Escape Failed',
    plainSummary: 'Main threat detector removed — the fly cannot see the attack coming and gets swatted.',
    survivalOutcome: 'Fatal Strike',
    receptiveField: 'Expanding dark edges with accelerating angular velocities (dθ/dt)',
    neurotransmitter: 'Acetylcholine (Excitatory nicotinic drive)',
    synapticTarget: 'Direct chemical and electrical gap junctions onto Giant Fiber (GF) medial dendrite',
    biologicalExplanation:
      'LC4 visual neurons are the primary detectors of optical looming flow in fruit flies. They encode rapid dark edge expansion in the lobula and provide ~85% of the total excitatory drive directly into the Giant Fiber escape system. When LC4 is ablated (or genetically silenced with Kir2.1), the escape signal collapses by ~89.1% (from 0.84 to 0.09). Without LC4, downstream descending motor neurons fail to reach action potential threshold.',
    behavioralConsequence:
      'Catastrophic failure. The fruit fly remains stationary on the leaf as the looming predator or swatter descends, resulting in capture or predator strike.',
  },
  lplc2: {
    bakedKey: 'lplc2',
    name: 'LPLC2 Ablation',
    shortName: 'LPLC2 Ablated',
    targetNeuron: 'LPLC2 (Lobula Plate-Lobula Columnar 2)',
    badge: 'Secondary Synergy',
    badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    color: '#f59e0b',
    strokeColor: '#fbbf24',
    fillColor: 'rgba(245, 158, 11, 0.15)',
    outcomeLabel: 'Delayed Escape',
    plainSummary: 'Secondary motion sensor removed — escape is delayed and clumsy, but the fly barely survives.',
    survivalOutcome: 'Compromised / Delayed',
    receptiveField: 'Radial optical expansion with outward motion vectors',
    neurotransmitter: 'Acetylcholine (Excitatory co-activation)',
    synapticTarget: 'Lateral dendritic branches of the Giant Fiber (GF) and DNp01',
    biologicalExplanation:
      'LPLC2 neurons detect outward-moving optical expansion edges and act as a synergistic co-activator alongside LC4. Ablating LPLC2 causes a moderate drop in escape signal of ~10.7% (from 0.84 to 0.75). Because the dominant LC4 pathway remains fully intact, the Giant Fiber still receives sufficient total excitation to depolarize past threshold, but the takeoff reaction time is delayed and directional trajectory accuracy is reduced.',
    behavioralConsequence:
      'Compromised escape. The fly still triggers an escape jump, but with delayed latency (~30–50 ms slower) and erratic takeoff heading, making it vulnerable to wide-angle predators.',
  },
  lc11: {
    bakedKey: 'lc11',
    name: 'LC11 Ablation (Control)',
    shortName: 'LC11 Control',
    targetNeuron: 'LC11 (Lobula Columnar 11)',
    badge: 'Negative Control',
    badgeColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
    color: '#06b6d4',
    strokeColor: '#22d3ee',
    fillColor: 'rgba(6, 182, 212, 0.15)',
    outcomeLabel: 'Escaped',
    plainSummary: 'Small-spot detector removed — this sensor tracks tiny mates, not big threats, so escape is unaffected.',
    survivalOutcome: 'Success',
    receptiveField: 'Small moving spots (<5° visual angle; mates, tiny conspecifics)',
    neurotransmitter: 'Acetylcholine (Excitatory)',
    synapticTarget: 'Optic glomerulus in Posterior Ventrolateral Protocerebrum (courtship tracking)',
    biologicalExplanation:
      'LC11 neurons are physiological small-object detectors. They respond selectively to tiny moving dark dots (subtending <5° visual angle) while being powerfully inhibited by large expanding edges. Furthermore, LC11 projections target courtship and tracking circuits rather than the Giant Fiber. Ablating LC11 produces exactly 0.00% change in looming escape signal, verifying experimental circuit specificity.',
    behavioralConsequence:
      'Normal escape. The fly escapes the looming threat with 100% baseline efficacy. (Only small-object orientation and mate tracking would be selectively impaired).',
  },
  lc6: {
    bakedKey: 'lc6',
    name: 'LC6 Ablation (Control)',
    shortName: 'LC6 Control',
    targetNeuron: 'LC6 (Lobula Columnar 6)',
    badge: 'Negative Control',
    badgeColor: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40',
    color: '#6366f1',
    strokeColor: '#818cf8',
    fillColor: 'rgba(99, 102, 241, 0.15)',
    outcomeLabel: 'Escaped',
    plainSummary: 'Walking sensor removed — this sensor steers walking rather than jumping, so escape is unaffected.',
    survivalOutcome: 'Success',
    receptiveField: 'Broad dark disc visual edges without directional radial preference',
    neurotransmitter: 'Acetylcholine (Excitatory)',
    synapticTarget: 'AVLP optic glomerulus (non-jumping evasive steering and walking)',
    biologicalExplanation:
      'LC6 neurons do detect dark visual edges, but their downstream synaptic projections terminate in the Anterior Ventrolateral Protocerebrum (AVLP), which connects to slow postural adjustments or evasive walking rather than the Giant Fiber jump motor neuron. In this modeled Giant Fiber escape pathway, LC6 provides zero direct synaptic weight. Ablating LC6 produces exactly 0.00% change, confirming that loom detection is pathway-specific.',
    behavioralConsequence:
      'Normal escape. The fly executes a full baseline escape jump without impediment (0% signal change).',
  },
};

let cachedDataset: FlyLabDataset | null = null;
let loadPromise: Promise<FlyLabDataset> | null = null;

export async function loadFlyLabData(): Promise<FlyLabDataset> {
  if (cachedDataset) return cachedDataset;
  if (loadPromise) return loadPromise;

  loadPromise = (async () => {
    try {
      const res = await fetch('/data/baked.json');
      if (!res.ok) {
        throw new Error(`Failed to load /data/baked.json (HTTP ${res.status})`);
      }
      const raw: BakedSimulationFile = await res.json();

      const baselineSig = raw.sig[''] || 0.839661;
      const conditions: Partial<Record<ConditionId, ConditionDefinition>> = {};
      const conditionKeys: ConditionId[] = ['intact', 'lc4', 'lplc2', 'lc11', 'lc6'];

      const frameTimesMs: Record<number, number> = {
        6: 100,
        12: 200,
        20: 333,
        30: 500,
      };

      for (const condId of conditionKeys) {
        const meta = CONDITION_METADATA_CONFIG[condId];
        const bakedKey = meta.bakedKey;
        const sigVal = raw.sig[bakedKey] !== undefined ? raw.sig[bakedKey] : baselineSig;
        const delta = ((sigVal - baselineSig) / baselineSig) * 100;

        const base64List = raw.act[bakedKey] || [];
        const frames: FrameActivityMetrics[] = [];

        for (let i = 0; i < raw.frames.length; i++) {
          const frameNum = raw.frames[i];
          const b64 = base64List[i] || '';
          const binStr = atob(b64);
          const len = binStr.length;
          const u8 = new Uint8Array(len);
          let sum = 0;
          let activeCount = 0;

          for (let j = 0; j < len; j++) {
            const val = binStr.charCodeAt(j);
            u8[j] = val;
            if (val > 0) {
              sum += val;
              activeCount++;
            }
          }

          frames.push({
            frame: frameNum,
            timeMs: frameTimesMs[frameNum] || frameNum * 16.6,
            activeCount,
            sumActivity: sum,
            meanActivity: activeCount > 0 ? sum / activeCount : 0,
            rawBuffer: u8,
          });
        }

        let statusText = '';
        if (condId === 'intact') {
          statusText = 'Intact Baseline Escape (84% Transmission)';
        } else if (condId === 'lc4') {
          statusText = `Signal Collapsed (${delta.toFixed(1)}%) — Primary Looming Failure`;
        } else if (condId === 'lplc2') {
          statusText = `Synergy Impaired (${delta.toFixed(1)}%) — Moderate Reduction`;
        } else {
          statusText = 'Negative Control — 0.0% Change (Unchanged Escape)';
        }

        conditions[condId] = {
          ...meta,
          id: condId,
          escapeSignal: sigVal,
          signalDeltaPercent: Math.abs(delta) < 0.001 ? 0 : delta,
          statusSummary: statusText,
          frames,
        };
      }

      cachedDataset = {
        note: raw.note,
        threatNeurons: raw.threat,
        frames: raw.frames,
        intactBaselineSignal: baselineSig,
        conditions: conditions as Record<ConditionId, ConditionDefinition>,
        conditionList: conditionKeys.map((k) => conditions[k]!),
      };

      return cachedDataset;
    } catch (err) {
      loadPromise = null;
      throw err;
    }
  })();

  return loadPromise;
}
