import { GasSampleCell, GasSensorId, MapGridInfo } from './gasHeatmap';

export interface InspectionWaypoint {
  id: string;
  order: number;
  x: number;
  y: number;
  label: string;
  status: 'pending' | 'navigating' | 'reached' | 'skipped';
  reachedAt?: string;
}

export interface SavedOccupancyMap {
  info: MapGridInfo;
  data: number[];
}

export interface InspectionRecord {
  id: string;
  cycleNumber: number;
  title: string;
  startedAt: string;
  completedAt?: string;
  status: 'active' | 'completed';
  mode: 'manual' | 'autonomous';
  distanceMeters: number;
  durationSeconds: number;
  savedMap: SavedOccupancyMap | null;
  gasHeatmaps: Record<GasSensorId, GasSampleCell[]>;
  waypoints: InspectionWaypoint[];
  peakGas: Record<GasSensorId, number>;
  sampleCount: number;
  notes?: string;
}

const STORAGE_KEY = 'mrayap_inspections_v1';
const ACTIVE_ID_KEY = 'mrayap_active_inspection_id';

export function loadInspections(): InspectionRecord[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error('Failed to load inspections from storage', err);
    return [];
  }
}

export function saveInspections(inspections: InspectionRecord[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(inspections));
  } catch (err) {
    console.error('Failed to save inspections to storage', err);
  }
}

export function getStoredActiveInspectionId(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(ACTIVE_ID_KEY);
}

export function setStoredActiveInspectionId(id: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(ACTIVE_ID_KEY, id);
}

export function createNewInspection(
  cycleNumber: number,
  mode: 'manual' | 'autonomous' = 'manual',
  baseMap: SavedOccupancyMap | null = null,
  title?: string
): InspectionRecord {
  const pad = String(cycleNumber).padStart(3, '0');
  const now = new Date();
  const defaultTitle = mode === 'manual'
    ? `Cycle #${cycleNumber} - Initial Survey & SLAM Mapping`
    : `Cycle #${cycleNumber} - Autonomous Waypoint Inspection`;

  return {
    id: `INSP-${pad}`,
    cycleNumber,
    title: title || defaultTitle,
    startedAt: now.toISOString(),
    status: 'active',
    mode,
    distanceMeters: 0,
    durationSeconds: 0,
    savedMap: baseMap,
    gasHeatmaps: {
      methane: [],
      flammable: [],
      airQuality: [],
    },
    waypoints: [],
    peakGas: {
      methane: 0,
      flammable: 0,
      airQuality: 0,
    },
    sampleCount: 0,
  };
}

export function getLatestSavedMap(inspections: InspectionRecord[]): SavedOccupancyMap | null {
  for (let i = inspections.length - 1; i >= 0; i--) {
    if (inspections[i].savedMap && inspections[i].savedMap?.data?.length) {
      return inspections[i].savedMap;
    }
  }
  return null;
}

