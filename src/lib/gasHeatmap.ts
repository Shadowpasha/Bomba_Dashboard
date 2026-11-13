export type GasSensorId = 'methane' | 'flammable' | 'airQuality';

export interface GasSensorConfig {
  id: GasSensorId;
  topic: string;
  label: string;
  shortLabel: string;
  unit: string;
  colorHex: string;
  rgb: [number, number, number];
  minVal: number;
  maxVal: number;
  decimals: number;
}

export interface GasSampleCell {
  x: number;
  y: number;
  value: number;
}

export interface MapGridInfo {
  width: number;
  height: number;
  resolution: number;
  origin: {
    position: {
      x: number;
      y: number;
    };
  };
}

export const CELL_SIZE_METERS = 0.25;
const PLUME_RADIUS_METERS = 0.75;
const MAX_LAYER_ALPHA = 150;

export const GAS_SENSORS: GasSensorConfig[] = [
  {
    id: 'methane',
    topic: '/sensor/methane',
    label: 'Methane (CH₄)',
    shortLabel: 'CH₄',
    unit: 'PPM',
    colorHex: '#FF9500',
    rgb: [255, 149, 0],
    minVal: 0,
    maxVal: 500,
    decimals: 1,
  },
  {
    id: 'flammable',
    topic: '/sensor/flammable',
    label: 'Flammable (LEL)',
    shortLabel: 'LEL',
    unit: '% LEL',
    colorHex: '#AF52DE',
    rgb: [175, 82, 222],
    minVal: 0,
    maxVal: 10,
    decimals: 1,
  },
  {
    id: 'airQuality',
    topic: '/sensor/air_quality',
    label: 'Air Quality',
    shortLabel: 'AQI',
    unit: 'AQI',
    colorHex: '#00C7BE',
    rgb: [0, 199, 190],
    minVal: 0,
    maxVal: 150,
    decimals: 0,
  },
];

export type GasHeatmapStores = Record<GasSensorId, Map<string, GasSampleCell>>;

export function createEmptyHeatmapStores(): GasHeatmapStores {
  return {
    methane: new Map<string, GasSampleCell>(),
    flammable: new Map<string, GasSampleCell>(),
    airQuality: new Map<string, GasSampleCell>(),
  };
}

export function serializeHeatmapStores(stores: GasHeatmapStores): Record<GasSensorId, GasSampleCell[]> {
  return {
    methane: Array.from(stores.methane.values()),
    flammable: Array.from(stores.flammable.values()),
    airQuality: Array.from(stores.airQuality.values()),
  };
}

export function deserializeHeatmapStores(data?: Partial<Record<GasSensorId, GasSampleCell[]>> | null): GasHeatmapStores {
  const stores = createEmptyHeatmapStores();
  if (!data) return stores;

  for (const sensor of GAS_SENSORS) {
    const list = data[sensor.id];
    if (Array.isArray(list)) {
      for (const cell of list) {
        if (cell && Number.isFinite(cell.x) && Number.isFinite(cell.y) && Number.isFinite(cell.value)) {
          const gx = Math.round(cell.x / CELL_SIZE_METERS);
          const gy = Math.round(cell.y / CELL_SIZE_METERS);
          stores[sensor.id].set(`${gx},${gy}`, { ...cell });
        }
      }
    }
  }

  return stores;
}

/**
 * Normalizes a raw sensor reading to [0, 1] using a square-root response curve
 * with a soft floor so ambient readings remain visible without saturating spikes.
 */
export function normalizeGasReading(value: number, sensor: GasSensorConfig): number {
  if (!Number.isFinite(value) || value <= 0) return 0;
  const span = sensor.maxVal - sensor.minVal;
  if (span <= 0) return 0;
  const linear = Math.min(1, Math.max(0, (value - sensor.minVal) / span));
  return 0.18 + 0.82 * Math.sqrt(linear);
}

/**
 * Records or updates a reading in the spatial grid cell containing (worldX, worldY).
 */
export function recordGasSample(
  store: Map<string, GasSampleCell>,
  worldX: number,
  worldY: number,
  value: number
): void {
  if (!Number.isFinite(worldX) || !Number.isFinite(worldY) || !Number.isFinite(value)) {
    return;
  }

  const gx = Math.round(worldX / CELL_SIZE_METERS);
  const gy = Math.round(worldY / CELL_SIZE_METERS);
  const key = `${gx},${gy}`;
  const existing = store.get(key);

  if (existing) {
    existing.value = existing.value * 0.4 + value * 0.6;
  } else {
    store.set(key, {
      x: gx * CELL_SIZE_METERS,
      y: gy * CELL_SIZE_METERS,
      value,
    });
  }
}

/**
 * Renders one gas sensor's spatial samples onto an offscreen scalar grid and
 * composites it smoothly onto the main map canvas.
 */
export function renderSensorHeatmapLayer(
  ctx: CanvasRenderingContext2D,
  samples: Map<string, GasSampleCell>,
  sensor: GasSensorConfig,
  info: MapGridInfo,
  offscreenCanvas: HTMLCanvasElement,
  worldToMap: (worldX: number, worldY: number, info: MapGridInfo) => { x: number; y: number }
): void {
  if (samples.size === 0 || info.width <= 0 || info.height <= 0 || info.resolution <= 0) {
    return;
  }

  const scale = Math.max(1, Math.ceil(Math.max(info.width, info.height) / 160));
  const gridW = Math.max(1, Math.ceil(info.width / scale));
  const gridH = Math.max(1, Math.ceil(info.height / scale));
  const field = new Float32Array(gridW * gridH);

  const radiusPx = Math.max(2, Math.round(PLUME_RADIUS_METERS / (info.resolution * scale)));
  const radiusSq = radiusPx * radiusPx;

  for (const sample of samples.values()) {
    const intensity = normalizeGasReading(sample.value, sensor);
    if (intensity <= 0) continue;

    const mapPos = worldToMap(sample.x, sample.y, info);
    const cx = mapPos.x / scale;
    const cy = mapPos.y / scale;

    if (
      cx < -radiusPx ||
      cx >= gridW + radiusPx ||
      cy < -radiusPx ||
      cy >= gridH + radiusPx
    ) {
      continue;
    }

    const minY = Math.max(0, Math.floor(cy - radiusPx));
    const maxY = Math.min(gridH - 1, Math.ceil(cy + radiusPx));
    const minX = Math.max(0, Math.floor(cx - radiusPx));
    const maxX = Math.min(gridW - 1, Math.ceil(cx + radiusPx));

    for (let y = minY; y <= maxY; y++) {
      const dy = y - cy;
      const dySq = dy * dy;
      const rowOffset = y * gridW;

      for (let x = minX; x <= maxX; x++) {
        const dx = x - cx;
        const distSq = dx * dx + dySq;
        if (distSq >= radiusSq) continue;

        const falloff = 1 - distSq / radiusSq;
        const val = intensity * falloff * falloff;
        const idx = rowOffset + x;
        if (val > field[idx]) {
          field[idx] = val;
        }
      }
    }
  }

  if (offscreenCanvas.width !== gridW || offscreenCanvas.height !== gridH) {
    offscreenCanvas.width = gridW;
    offscreenCanvas.height = gridH;
  }

  const offCtx = offscreenCanvas.getContext('2d');
  if (!offCtx) return;

  const imageData = offCtx.createImageData(gridW, gridH);
  const data = imageData.data;
  const [r, g, b] = sensor.rgb;

  for (let i = 0; i < field.length; i++) {
    const v = field[i];
    if (v <= 0.01) continue;

    const px = i * 4;
    data[px] = r;
    data[px + 1] = g;
    data[px + 2] = b;
    data[px + 3] = Math.min(255, Math.round(v * MAX_LAYER_ALPHA));
  }

  offCtx.putImageData(imageData, 0, 0);

  ctx.save();
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(offscreenCanvas, 0, 0, info.width, info.height);
  ctx.restore();
}

