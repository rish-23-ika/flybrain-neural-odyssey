/**
 * ConnectomeLoader.ts
 * Loads the real Drosophila melanogaster Male CNS Connectome dataset (v1.0)
 * Source: FlyEM / HHMI Janelia Research Campus with Google Research, Columbia University, Harvard University (2026). CC BY 4.0.
 * Derivative data format by VIDraft (https://huggingface.co/spaces/VIDraft/fruitfly-brain).
 */

export interface ConnectomeMeta {
  dataset: string;
  n: number;
  types: string[];
  typeCount: number[];
  nts: string[];
  ntCount: number[];
  extentMm: [number, number, number];
  source: string;
}

export interface RealConnectomeData {
  meta: ConnectomeMeta;
  somaXyz: Float32Array;
  somaNt: Uint8Array;
  somaType: Uint16Array;
  baseColors: Float32Array;
  typeIndexMap: Map<string, number[]>; // cell type name -> list of neuron indices
}

// Authentic Neurotransmitter Color Encoding based on functional polarity:
// Warm colors = Excitatory (Acetylcholine)
// Cool colors = Inhibitory (GABA, Glutamate, Histamine)
// Modulatory / Monoamines = Distinct intermediate hues
export const NT_COLORS: Record<string, [number, number, number]> = {
  acetylcholine: [1.0, 0.66, 0.28], // Excitatory (Warm Amber/Gold)
  glutamate: [0.3, 0.86, 0.72],     // Inhibitory in arthropods via GluCl (Teal)
  gaba: [0.36, 0.62, 1.0],          // Inhibitory (Electric Blue)
  histamine: [0.42, 0.9, 0.95],     // Inhibitory compound eye photoreceptor transmitter (Cyan)
  dopamine: [0.92, 0.42, 0.86],     // Modulatory reward/punishment (Magenta)
  serotonin: [0.71, 0.52, 0.98],    // Modulatory state (Purple)
  octopamine: [1.0, 0.45, 0.6],     // Modulatory fight/flight / insect adrenaline (Rose)
  unclear: [0.45, 0.52, 0.6],       // Dim slate
  unknown: [0.38, 0.44, 0.5],       // Neutral dark slate
};

let cachedData: RealConnectomeData | null = null;
let loadPromise: Promise<RealConnectomeData> | null = null;

export async function loadRealConnectome(
  onProgress?: (step: string, percent: number) => void
): Promise<RealConnectomeData> {
  if (cachedData) return cachedData;
  if (loadPromise) return loadPromise;

  loadPromise = (async () => {
    try {
      onProgress?.('Fetching dataset metadata...', 10);
      const metaRes = await fetch('/data/meta.json');
      if (!metaRes.ok) {
        throw new Error(`Failed to load /data/meta.json (HTTP ${metaRes.status})`);
      }
      const meta: ConnectomeMeta = await metaRes.json();

      onProgress?.('Loading 141,781 soma coordinates (1.7 MB)...', 30);
      const xyzRes = await fetch('/data/soma_xyz.f32');
      if (!xyzRes.ok) {
        throw new Error(`Failed to load /data/soma_xyz.f32 (HTTP ${xyzRes.status})`);
      }
      const xyzBuffer = await xyzRes.arrayBuffer();
      const somaXyz = new Float32Array(xyzBuffer);

      if (somaXyz.length !== meta.n * 3) {
        throw new Error(
          `Corrupt coordinate buffer: expected ${meta.n * 3} float32 elements, got ${somaXyz.length}`
        );
      }

      onProgress?.('Loading neurotransmitter profiles...', 60);
      const ntRes = await fetch('/data/soma_nt.u8');
      if (!ntRes.ok) {
        throw new Error(`Failed to load /data/soma_nt.u8 (HTTP ${ntRes.status})`);
      }
      const ntBuffer = await ntRes.arrayBuffer();
      const somaNt = new Uint8Array(ntBuffer);

      onProgress?.('Loading 11,385 cell type classifications...', 80);
      const typeRes = await fetch('/data/soma_type.u16');
      if (!typeRes.ok) {
        throw new Error(`Failed to load /data/soma_type.u16 (HTTP ${typeRes.status})`);
      }
      const typeBuffer = await typeRes.arrayBuffer();
      const somaType = new Uint16Array(typeBuffer);

      onProgress?.('Compiling neural index and color arrays...', 95);
      const n = meta.n;
      const baseColors = new Float32Array(n * 3);
      const typeIndexMap = new Map<string, number[]>();

      for (let i = 0; i < n; i++) {
        const ntName = meta.nts[somaNt[i]] || 'unknown';
        const col = NT_COLORS[ntName] || NT_COLORS.unknown;
        baseColors[i * 3] = col[0];
        baseColors[i * 3 + 1] = col[1];
        baseColors[i * 3 + 2] = col[2];

        // Map cell type name
        const typeId = somaType[i];
        const typeName = meta.types[typeId];
        if (typeName) {
          let list = typeIndexMap.get(typeName);
          if (!list) {
            list = [];
            typeIndexMap.set(typeName, list);
          }
          list.push(i);
        }
      }

      onProgress?.('Connectome ready', 100);

      cachedData = {
        meta,
        somaXyz,
        somaNt,
        somaType,
        baseColors,
        typeIndexMap,
      };

      return cachedData;
    } catch (err) {
      loadPromise = null;
      throw err;
    }
  })();

  return loadPromise;
}
