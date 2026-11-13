'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import styled from 'styled-components';
import RosConnection from '@/lib/ros/RosConnection';
import { theme } from '@/lib/theme';
import { Crosshair, MapPin, Layers, Trash2, History, CheckCircle2, Navigation, AlertCircle } from 'lucide-react';
import {
    GAS_SENSORS,
    GasSensorId,
    GasHeatmapStores,
    createEmptyHeatmapStores,
    recordGasSample,
    renderSensorHeatmapLayer,
    deserializeHeatmapStores,
    serializeHeatmapStores,
    GasSampleCell,
} from '@/lib/gasHeatmap';
import { InspectionRecord, InspectionWaypoint, SavedOccupancyMap } from '@/lib/inspections';

interface Point {
    x: number;
    y: number;
}

export interface MapViewProps {
    mode?: 'manual' | 'p2p' | 'autonomous';
    targetPoint?: Point | null;
    onSetTarget?: (point: Point) => void;
    waypoints?: InspectionWaypoint[];
    activeWaypointIndex?: number;
    onAddWaypoint?: (point: Point) => void;
    robotPose?: { x: number; y: number; yaw: number };
    isNavigating?: boolean;
    savedMap?: SavedOccupancyMap | null;
    recallInspection?: InspectionRecord | null;
    isRecallMode?: boolean;
    liveHeatmapStoresRef?: React.MutableRefObject<GasHeatmapStores | null>;
    onLiveMapUpdate?: (map: SavedOccupancyMap) => void;
}

const Container = styled.div<{ $isClickable: boolean; $isRecall: boolean }>`
  background: white;
  border-radius: ${theme.radius.lg};
  border: ${props => props.$isRecall ? `3px solid #007AFF` : `2px solid ${theme.colors.border}`};
  overflow: hidden;
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  box-shadow: ${theme.shadows.soft};
  cursor: ${props => props.$isClickable ? 'crosshair' : 'default'};
`;

const CanvasWrapper = styled.div`
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
`;

const Canvas = styled.canvas`
  max-width: 100%;
  max-height: 100%;
  width: auto;
  height: auto;
  object-fit: contain;
  image-rendering: pixelated;
  display: block;
`;

const Badge = styled.div<{ $recall?: boolean }>`
  position: absolute;
  top: 12px;
  left: 12px;
  background: ${props => props.$recall ? '#007AFF' : theme.colors.text};
  color: white;
  padding: 6px 14px;
  border-radius: ${theme.radius.sm};
  font-size: 9px;
  font-weight: 800;
  text-transform: uppercase;
  z-index: 10;
  border-left: 3px solid ${props => props.$recall ? '#5AC8FA' : theme.colors.primary};
  display: flex;
  align-items: center;
  gap: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
`;

const ModeHint = styled.div<{ $variant?: 'warning' | 'info' | 'success' }>`
  position: absolute;
  top: 12px;
  right: 12px;
  background: ${props =>
    props.$variant === 'info'
      ? '#007AFF'
      : props.$variant === 'success'
      ? '#34C759'
      : 'rgba(255, 149, 0, 0.95)'};
  color: white;
  padding: 5px 12px;
  border-radius: ${theme.radius.sm};
  font-size: 9px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  display: flex;
  align-items: center;
  gap: 6px;
  z-index: 10;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
`;

const Legend = styled.div`
  position: absolute;
  bottom: 12px;
  right: 12px;
  background: rgba(255, 255, 255, 0.95);
  padding: 8px 12px;
  border-radius: 6px;
  border: 1px solid ${theme.colors.border};
  font-size: 8px;
  font-weight: 800;
  display: flex;
  flex-direction: column;
  gap: 5px;
  z-index: 10;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
`;

const LegendItem = styled.div<{ $color: string }>`
  display: flex;
  align-items: center;
  gap: 6px;
  color: ${theme.colors.text};
  &::before {
    content: '';
    width: 7px;
    height: 7px;
    background: ${props => props.$color};
    border-radius: 50%;
  }
`;

const HeatmapPanel = styled.div`
  position: absolute;
  bottom: 12px;
  left: 12px;
  background: rgba(255, 255, 255, 0.95);
  padding: 8px 10px;
  border-radius: 6px;
  border: 1px solid ${theme.colors.border};
  display: flex;
  flex-direction: column;
  gap: 6px;
  z-index: 10;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  cursor: default;
  min-width: 180px;
`;

const HeatmapHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding-bottom: 4px;
  border-bottom: 1px solid ${theme.colors.border};
`;

const HeatmapTitle = styled.div`
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 8px;
  font-weight: 900;
  color: ${theme.colors.text};
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const HeatmapActions = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
`;

const SmallActionButton = styled.button`
  background: ${theme.colors.background};
  border: 1px solid ${theme.colors.border};
  border-radius: 4px;
  color: ${theme.colors.textLight};
  font-size: 7px;
  font-weight: 900;
  text-transform: uppercase;
  padding: 2px 5px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 3px;
  transition: all 0.15s ease;

  &:hover {
    border-color: ${theme.colors.text};
    color: ${theme.colors.text};
  }
`;

const SensorToggleList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const SensorToggleButton = styled.button<{ $active: boolean; $color: string }>`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  width: 100%;
  padding: 4px 7px;
  border-radius: 4px;
  border: 1px solid ${props => props.$active ? props.$color : theme.colors.border};
  background: ${props => props.$active ? `${props.$color}18` : theme.colors.background};
  color: ${theme.colors.text};
  opacity: ${props => props.$active ? 1 : 0.6};
  cursor: pointer;
  font-size: 8px;
  font-weight: 800;
  transition: all 0.15s ease;

  &:hover {
    opacity: 1;
    border-color: ${props => props.$color};
  }
`;

const SensorToggleLeft = styled.span`
  display: flex;
  align-items: center;
  gap: 6px;
`;

const ColorSwatch = styled.span<{ $active: boolean; $color: string }>`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: ${props => props.$active ? props.$color : 'transparent'};
  border: 2px solid ${props => props.$color};
  flex-shrink: 0;
`;

const SensorReadingText = styled.span`
  font-size: 8px;
  font-weight: 800;
  color: ${theme.colors.textLight};
`;

const FALLBACK_MAP_INFO = {
    width: 400,
    height: 400,
    resolution: 0.05,
    origin: { position: { x: -10, y: -10 } }
};

export default function MapView({
    mode = 'manual',
    targetPoint = null,
    onSetTarget,
    waypoints = [],
    activeWaypointIndex = 0,
    onAddWaypoint,
    robotPose: externalRobotPose,
    isNavigating = false,
    savedMap = null,
    recallInspection = null,
    isRecallMode = false,
    liveHeatmapStoresRef,
    onLiveMapUpdate,
}: MapViewProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isConnected, setIsConnected] = useState(false);
    const [visibleHeatmaps, setVisibleHeatmaps] = useState<Record<GasSensorId, boolean>>({
        methane: true,
        flammable: true,
        airQuality: true,
    });
    const [latestGasValues, setLatestGasValues] = useState<Record<GasSensorId, number | null>>({
        methane: null,
        flammable: null,
        airQuality: null,
    });

    const liveMapData = useRef<SavedOccupancyMap | null>(null);
    const internalRobotPose = useRef({ x: 0, y: 0, yaw: 0 });
    const markers = useRef<any[]>([]);
    const plannedPath = useRef<Point[]>([]);
    const hoverCoordsRef = useRef<Point | null>(null);

    const gasHeatmapsRef = useRef<GasHeatmapStores>(createEmptyHeatmapStores());
    const latestGasRef = useRef<Record<GasSensorId, number | null>>({
        methane: null,
        flammable: null,
        airQuality: null,
    });
    const lastRecordedPoseRef = useRef<{ x: number; y: number } | null>(null);
    const offscreenCanvasRef = useRef<HTMLCanvasElement | null>(null);

    // Sync live heatmaps reference for parent component to access when saving inspection
    useEffect(() => {
        if (liveHeatmapStoresRef) {
            liveHeatmapStoresRef.current = gasHeatmapsRef.current;
        }
    }, [liveHeatmapStoresRef]);

    const activePose = externalRobotPose || internalRobotPose.current;
    const activePoseRef = useRef(activePose);
    activePoseRef.current = activePose;

    const stampPoseWithLatestGas = useCallback((x: number, y: number) => {
        if (isRecallMode) return;
        const last = lastRecordedPoseRef.current;
        if (last && Math.hypot(x - last.x, y - last.y) < 0.12) {
            return;
        }

        let stampedAny = false;
        for (const sensor of GAS_SENSORS) {
            const val = latestGasRef.current[sensor.id];
            if (val !== null) {
                recordGasSample(gasHeatmapsRef.current[sensor.id], x, y, val);
                stampedAny = true;
            }
        }

        if (stampedAny) {
            lastRecordedPoseRef.current = { x, y };
        }
    }, [isRecallMode]);

    const worldToMap = useCallback((worldX: number, worldY: number, info: any) => {
        const mapX = (worldX - info.origin.position.x) / info.resolution;
        const mapY = (worldY - info.origin.position.y) / info.resolution;
        return { x: mapX, y: info.height - mapY };
    }, []);

    const mapToWorld = useCallback((canvasX: number, canvasY: number, info: any) => {
        const mapX = canvasX;
        const mapY = info.height - canvasY;
        const worldX = mapX * info.resolution + info.origin.position.x;
        const worldY = mapY * info.resolution + info.origin.position.y;
        return {
            x: parseFloat(worldX.toFixed(2)),
            y: parseFloat(worldY.toFixed(2))
        };
    }, []);

    const getCanvasPoint = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current;
        if (!canvas) return null;

        const rect = canvas.getBoundingClientRect();
        if (!rect.width || !rect.height || !canvas.width || !canvas.height) return null;

        const contentRatio = canvas.width / canvas.height;
        const elementRatio = rect.width / rect.height;

        let renderedWidth = rect.width;
        let renderedHeight = rect.height;
        let offsetX = 0;
        let offsetY = 0;

        if (Math.abs(elementRatio - contentRatio) > 0.001) {
            if (elementRatio > contentRatio) {
                renderedHeight = rect.height;
                renderedWidth = rect.height * contentRatio;
                offsetX = (rect.width - renderedWidth) / 2;
            } else {
                renderedWidth = rect.width;
                renderedHeight = rect.width / contentRatio;
                offsetY = (rect.height - renderedHeight) / 2;
            }
        }

        const clickX = e.clientX - rect.left - offsetX;
        const clickY = e.clientY - rect.top - offsetY;

        const clampedX = Math.max(0, Math.min(renderedWidth, clickX));
        const clampedY = Math.max(0, Math.min(renderedHeight, clickY));

        const canvasX = (clampedX / renderedWidth) * canvas.width;
        const canvasY = (clampedY / renderedHeight) * canvas.height;

        return { canvasX, canvasY };
    }, []);

    const render = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Determine effective map source: recall inspection map > live ROS map > saved base map
        let effectiveMap: SavedOccupancyMap | null = null;
        if (isRecallMode && recallInspection?.savedMap) {
            effectiveMap = recallInspection.savedMap;
        } else if (liveMapData.current) {
            effectiveMap = liveMapData.current;
        } else if (savedMap) {
            effectiveMap = savedMap;
        }

        const info = effectiveMap ? effectiveMap.info : FALLBACK_MAP_INFO;
        if (canvas.width !== info.width || canvas.height !== info.height) {
            canvas.width = info.width;
            canvas.height = info.height;
        }

        // 1. Draw Map (or synthetic tactical grid)
        if (effectiveMap && effectiveMap.data && effectiveMap.data.length > 0) {
            const data = effectiveMap.data;
            const imageData = ctx.createImageData(info.width, info.height);
            for (let y = 0; y < info.height; y++) {
                for (let x = 0; x < info.width; x++) {
                    const rosIdx = y * info.width + x;
                    const val = data[rosIdx];
                    let r, g, b;
                    if (val === -1) { r = 245; g = 246; b = 248; }
                    else if (val === 0) { r = 255; g = 255; b = 255; }
                    else { r = 255; g = 59; b = 48; }

                    const canvasIdx = ((info.height - 1 - y) * info.width + x) * 4;
                    imageData.data[canvasIdx] = r;
                    imageData.data[canvasIdx + 1] = g;
                    imageData.data[canvasIdx + 2] = b;
                    imageData.data[canvasIdx + 3] = 255;
                }
            }
            ctx.putImageData(imageData, 0, 0);
        } else {
            // Tactical grid for initial inspection standby
            ctx.fillStyle = '#FAFBFC';
            ctx.fillRect(0, 0, info.width, info.height);

            ctx.strokeStyle = '#E5E5EA';
            ctx.lineWidth = 1;
            const step = 20; // 1 meter grid
            for (let x = 0; x <= info.width; x += step) {
                ctx.beginPath();
                ctx.moveTo(x, 0);
                ctx.lineTo(x, info.height);
                ctx.stroke();
            }
            for (let y = 0; y <= info.height; y += step) {
                ctx.beginPath();
                ctx.moveTo(0, y);
                ctx.lineTo(info.width, y);
                ctx.stroke();
            }

            // Origin axes
            const originCanvas = worldToMap(0, 0, info);
            ctx.strokeStyle = '#C7C7CC';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(originCanvas.x, 0);
            ctx.lineTo(originCanvas.x, info.height);
            ctx.moveTo(0, originCanvas.y);
            ctx.lineTo(info.width, originCanvas.y);
            ctx.stroke();
        }

        // 1b. Gas Sensor Heatmap Overlays
        // If in recall mode, render historical deserialized heatmap stores; else live stores
        let activeHeatmapStores: GasHeatmapStores;
        if (isRecallMode && recallInspection?.gasHeatmaps) {
            activeHeatmapStores = deserializeHeatmapStores(recallInspection.gasHeatmaps);
        } else {
            activeHeatmapStores = gasHeatmapsRef.current;
        }

        if (typeof document !== 'undefined') {
            if (!offscreenCanvasRef.current) {
                offscreenCanvasRef.current = document.createElement('canvas');
            }
            for (const sensor of GAS_SENSORS) {
                if (!visibleHeatmaps[sensor.id]) continue;
                renderSensorHeatmapLayer(
                    ctx,
                    activeHeatmapStores[sensor.id],
                    sensor,
                    info,
                    offscreenCanvasRef.current,
                    worldToMap
                );
            }
        }

        // 2. Markers (Humans / Hazards)
        markers.current.forEach(marker => {
            const pos = worldToMap(marker.x, marker.y, info);
            ctx.beginPath();
            if (marker.type === 'human') {
                ctx.fillStyle = '#34C759';
                ctx.arc(pos.x, pos.y, 8, 0, 2 * Math.PI);
                ctx.fill();
                ctx.strokeStyle = 'white';
                ctx.lineWidth = 1.5;
                ctx.stroke();
            } else if (marker.type === 'danger') {
                ctx.fillStyle = 'rgba(255, 59, 48, 0.35)';
                ctx.arc(pos.x, pos.y, 16, 0, 2 * Math.PI);
                ctx.fill();
            }
        });

        // 3. Planned Path from ROS
        if (plannedPath.current.length > 1 && !isRecallMode) {
            ctx.beginPath();
            ctx.setLineDash([4, 4]);
            ctx.strokeStyle = '#007AFF';
            ctx.lineWidth = 2;
            const startPos = worldToMap(plannedPath.current[0].x, plannedPath.current[0].y, info);
            ctx.moveTo(startPos.x, startPos.y);
            for (let i = 1; i < plannedPath.current.length; i++) {
                const pos = worldToMap(plannedPath.current[i].x, plannedPath.current[i].y, info);
                ctx.lineTo(pos.x, pos.y);
            }
            ctx.stroke();
            ctx.setLineDash([]);
        }

        // 4. Autonomous Inspection Waypoint Route & Pins
        const displayWaypoints = isRecallMode && recallInspection?.waypoints
            ? recallInspection.waypoints
            : waypoints;

        if (displayWaypoints && displayWaypoints.length > 0) {
            // 4a. Connect waypoints with dotted inspection route lines
            if (displayWaypoints.length > 1) {
                ctx.beginPath();
                ctx.setLineDash([5, 4]);
                ctx.strokeStyle = '#FF9500';
                ctx.lineWidth = 2;
                const firstPos = worldToMap(displayWaypoints[0].x, displayWaypoints[0].y, info);
                ctx.moveTo(firstPos.x, firstPos.y);
                for (let i = 1; i < displayWaypoints.length; i++) {
                    const nextPos = worldToMap(displayWaypoints[i].x, displayWaypoints[i].y, info);
                    ctx.lineTo(nextPos.x, nextPos.y);
                }
                ctx.stroke();
                ctx.setLineDash([]);
            }

            // 4b. Draw approach line from robot to active waypoint in live mode
            if (!isRecallMode && displayWaypoints[activeWaypointIndex]) {
                const currentWP = displayWaypoints[activeWaypointIndex];
                const activeWpPos = worldToMap(currentWP.x, currentWP.y, info);
                const robotPos = worldToMap(activePose.x, activePose.y, info);
                ctx.beginPath();
                ctx.setLineDash([4, 4]);
                ctx.strokeStyle = '#FF9500';
                ctx.lineWidth = 1.5;
                ctx.moveTo(robotPos.x, robotPos.y);
                ctx.lineTo(activeWpPos.x, activeWpPos.y);
                ctx.stroke();
                ctx.setLineDash([]);
            }

            // 4c. Draw waypoint nodes
            displayWaypoints.forEach((wp, index) => {
                const wpPos = worldToMap(wp.x, wp.y, info);
                const isCurrent = !isRecallMode && index === activeWaypointIndex;
                const isReached = wp.status === 'reached';

                // Node background circle
                ctx.beginPath();
                ctx.arc(wpPos.x, wpPos.y, isCurrent ? 12 : 9, 0, 2 * Math.PI);

                if (isReached) {
                    ctx.fillStyle = '#34C759';
                } else if (isCurrent) {
                    ctx.fillStyle = '#FF9500';
                } else {
                    ctx.fillStyle = '#1C1C1E';
                }
                ctx.fill();

                ctx.strokeStyle = 'white';
                ctx.lineWidth = 2;
                ctx.stroke();

                // Outer halo for current active waypoint
                if (isCurrent) {
                    ctx.beginPath();
                    ctx.arc(wpPos.x, wpPos.y, 16, 0, 2 * Math.PI);
                    ctx.strokeStyle = 'rgba(255, 149, 0, 0.4)';
                    ctx.lineWidth = 2;
                    ctx.stroke();
                }

                // Waypoint number text
                ctx.fillStyle = 'white';
                ctx.font = 'bold 9px sans-serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(isReached ? '✓' : String(wp.order || index + 1), wpPos.x, wpPos.y);

                // Waypoint coordinate badge
                ctx.font = 'bold 8px sans-serif';
                ctx.fillStyle = '#1C1C1E';
                ctx.textAlign = 'left';
                ctx.fillText(`WP ${wp.order || index + 1} [${wp.x.toFixed(1)}, ${wp.y.toFixed(1)}]`, wpPos.x + 14, wpPos.y - 4);
            });
        }

        // 5. Point-to-Point Target if set independently
        if (targetPoint && !isRecallMode) {
            const targetPos = worldToMap(targetPoint.x, targetPoint.y, info);
            ctx.beginPath();
            ctx.arc(targetPos.x, targetPos.y, 10, 0, 2 * Math.PI);
            ctx.fillStyle = 'rgba(255, 149, 0, 0.2)';
            ctx.fill();
            ctx.strokeStyle = '#FF9500';
            ctx.lineWidth = 2;
            ctx.stroke();
        }

        // 6. Hover Reticle in Waypoint / Autonomous Mode
        if ((mode === 'autonomous' || mode === 'p2p') && hoverCoordsRef.current && !isRecallMode) {
            const hPos = worldToMap(hoverCoordsRef.current.x, hoverCoordsRef.current.y, info);
            ctx.beginPath();
            ctx.arc(hPos.x, hPos.y, 7, 0, 2 * Math.PI);
            ctx.strokeStyle = 'rgba(255, 149, 0, 0.8)';
            ctx.lineWidth = 1;
            ctx.setLineDash([3, 3]);
            ctx.stroke();
            ctx.setLineDash([]);

            ctx.beginPath();
            ctx.strokeStyle = 'rgba(255, 149, 0, 0.6)';
            ctx.moveTo(hPos.x - 10, hPos.y);
            ctx.lineTo(hPos.x + 10, hPos.y);
            ctx.moveTo(hPos.x, hPos.y - 10);
            ctx.lineTo(hPos.x, hPos.y + 10);
            ctx.stroke();
        }

        // 7. Draw Robot Pose (only in live mode)
        if (!isRecallMode) {
            const robotPos = worldToMap(activePose.x, activePose.y, info);
            ctx.save();
            ctx.translate(robotPos.x, robotPos.y);
            ctx.rotate(-activePose.yaw);

            ctx.beginPath();
            ctx.moveTo(8, 0);
            ctx.lineTo(-6, 5);
            ctx.lineTo(-6, -5);
            ctx.closePath();
            ctx.fillStyle = theme.colors.primary;
            ctx.fill();
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 1.2;
            ctx.stroke();

            ctx.restore();
        }
    }, [activePose, targetPoint, mode, waypoints, activeWaypointIndex, worldToMap, visibleHeatmaps, savedMap, recallInspection, isRecallMode]);

    const renderRef = useRef(render);
    renderRef.current = render;

    // ROS topic subscriptions for live inspection mode
    useEffect(() => {
        const ros = RosConnection.getInstance();
        const cleanup = ros.subscribeStatus(setIsConnected);

        const mapTopic = ros.createTopic('/map', 'nav_msgs/OccupancyGrid');
        if (mapTopic) {
            mapTopic.subscribe((message: any) => {
                liveMapData.current = message;
                if (onLiveMapUpdate) {
                    onLiveMapUpdate({
                        info: message.info,
                        data: Array.from(message.data),
                    });
                }
                renderRef.current();
            });
        }

        const odomTopic = ros.createTopic('/odom', 'nav_msgs/Odometry');
        if (odomTopic) {
            odomTopic.subscribe((message: any) => {
                const pose = message.pose.pose;
                const q = pose.orientation;
                const yaw = Math.atan2(2.0 * (q.w * q.z + q.x * q.y), 1.0 - 2.0 * (q.y * q.y + q.z * q.z));
                const nextPose = {
                    x: pose.position.x,
                    y: pose.position.y,
                    yaw: yaw
                };
                internalRobotPose.current = nextPose;
                activePoseRef.current = nextPose;
                stampPoseWithLatestGas(nextPose.x, nextPose.y);
                renderRef.current();
            });
        }

        const markersTopic = ros.createTopic('/map_markers', 'std_msgs/String');
        if (markersTopic) {
            markersTopic.subscribe((message: any) => {
                try {
                    const newMarker = JSON.parse(message.data);
                    const index = markers.current.findIndex(m => m.id === newMarker.id);
                    if (index > -1) markers.current[index] = newMarker;
                    else markers.current.push(newMarker);
                    renderRef.current();
                } catch (e) {
                    console.error("Failed to parse marker:", e);
                }
            });
        }

        const pathTopic = ros.createTopic('/planned_path', 'nav_msgs/Path');
        if (pathTopic) {
            pathTopic.subscribe((message: any) => {
                plannedPath.current = message.poses.map((p: any) => ({
                    x: p.pose.position.x,
                    y: p.pose.position.y
                }));
                renderRef.current();
            });
        }

        const sensorTopics = GAS_SENSORS.map(sensor => {
            const topic = ros.createTopic(sensor.topic, 'std_msgs/Float32');
            if (topic) {
                topic.subscribe((message: any) => {
                    if (typeof message.data === 'number' && Number.isFinite(message.data)) {
                        const val = message.data;
                        latestGasRef.current[sensor.id] = val;
                        setLatestGasValues(prev => ({ ...prev, [sensor.id]: val }));
                        const pose = activePoseRef.current;
                        recordGasSample(gasHeatmapsRef.current[sensor.id], pose.x, pose.y, val);
                        renderRef.current();
                    }
                });
            }
            return topic;
        });

        renderRef.current();

        return () => {
            cleanup();
            if (mapTopic) mapTopic.unsubscribe();
            if (odomTopic) odomTopic.unsubscribe();
            if (markersTopic) markersTopic.unsubscribe();
            if (pathTopic) pathTopic.unsubscribe();
            sensorTopics.forEach(topic => {
                if (topic) topic.unsubscribe();
            });
        };
    }, [stampPoseWithLatestGas, onLiveMapUpdate]);

    useEffect(() => {
        if (externalRobotPose) {
            stampPoseWithLatestGas(externalRobotPose.x, externalRobotPose.y);
        }
        render();
    }, [targetPoint, externalRobotPose, visibleHeatmaps, stampPoseWithLatestGas, render, savedMap, recallInspection, isRecallMode, waypoints, activeWaypointIndex]);

    const handleToggleHeatmap = (sensorId: GasSensorId) => {
        setVisibleHeatmaps(prev => ({
            ...prev,
            [sensorId]: !prev[sensorId],
        }));
    };

    const allHeatmapsVisible = GAS_SENSORS.every(s => visibleHeatmaps[s.id]);

    const handleToggleAllHeatmaps = () => {
        const nextState = !allHeatmapsVisible;
        setVisibleHeatmaps({
            methane: nextState,
            flammable: nextState,
            airQuality: nextState,
        });
    };

    const handleClearHeatmaps = () => {
        if (isRecallMode) return;
        gasHeatmapsRef.current = createEmptyHeatmapStores();
        lastRecordedPoseRef.current = null;
        render();
    };

    const isWaypointAddMode = (mode === 'autonomous' || mode === 'p2p') && !isRecallMode;

    const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
        if (!isWaypointAddMode) return;
        const pt = getCanvasPoint(e);
        if (!pt) {
            hoverCoordsRef.current = null;
            render();
            return;
        }

        const effectiveMap = (isRecallMode && recallInspection?.savedMap)
            ? recallInspection.savedMap
            : (liveMapData.current || savedMap);
        const info = effectiveMap ? effectiveMap.info : FALLBACK_MAP_INFO;
        hoverCoordsRef.current = mapToWorld(pt.canvasX, pt.canvasY, info);
        render();
    };

    const handleMouseLeave = () => {
        if (hoverCoordsRef.current) {
            hoverCoordsRef.current = null;
            render();
        }
    };

    const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
        if (isRecallMode) return;
        const pt = getCanvasPoint(e);
        if (!pt) return;

        const effectiveMap = liveMapData.current || savedMap;
        const info = effectiveMap ? effectiveMap.info : FALLBACK_MAP_INFO;
        const worldCoords = mapToWorld(pt.canvasX, pt.canvasY, info);

        if (mode === 'autonomous' && onAddWaypoint) {
            onAddWaypoint(worldCoords);
        } else if (onSetTarget) {
            onSetTarget(worldCoords);
        }
    };

    return (
        <Container $isClickable={isWaypointAddMode} $isRecall={isRecallMode}>
            {isRecallMode ? (
                <Badge $recall>
                    <History size={14} color="#5AC8FA" />
                    RECALLED INSPECTION | {recallInspection?.id || 'ARCHIVED'} ({recallInspection?.title})
                </Badge>
            ) : (
                <Badge>
                    <Crosshair size={14} color={theme.colors.primary} />
                    {mode === 'autonomous'
                        ? 'AUTONOMOUS INSPECTION MAP'
                        : mode === 'manual'
                        ? 'INITIAL SURVEY & SLAM MAPPING'
                        : 'POINT_TO_POINT_MISSION_MAP'}
                </Badge>
            )}

            {isRecallMode && (
                <ModeHint $variant="info">
                    <History size={12} />
                    HISTORICAL RECALL MODE
                </ModeHint>
            )}

            {!isRecallMode && mode === 'autonomous' && (
                <ModeHint $variant="warning">
                    <MapPin size={12} />
                    CLICK MAP TO ADD INSPECTION WAYPOINTS ({waypoints.length})
                </ModeHint>
            )}

            {!isRecallMode && mode === 'manual' && (
                <ModeHint $variant="success">
                    <Navigation size={12} />
                    MANUAL SURVEY ACTIVE - GENERATING MAP
                </ModeHint>
            )}

            <CanvasWrapper>
                <Canvas
                    ref={canvasRef}
                    onClick={handleCanvasClick}
                    onMouseMove={handleMouseMove}
                    onMouseLeave={handleMouseLeave}
                />
            </CanvasWrapper>

            <HeatmapPanel>
                <HeatmapHeader>
                    <HeatmapTitle>
                        <Layers size={11} color={theme.colors.primary} />
                        {isRecallMode ? 'SAVED GAS HEATMAPS' : 'LIVE GAS HEATMAPS'}
                    </HeatmapTitle>
                    <HeatmapActions>
                        <SmallActionButton
                            type="button"
                            onClick={handleToggleAllHeatmaps}
                            title={allHeatmapsVisible ? 'Hide all gas heatmaps' : 'Show all gas heatmaps'}
                        >
                            {allHeatmapsVisible ? 'NONE' : 'ALL'}
                        </SmallActionButton>
                        {!isRecallMode && (
                            <SmallActionButton
                                type="button"
                                onClick={handleClearHeatmaps}
                                title="Clear recorded gas heatmap samples"
                                aria-label="Clear gas heatmaps"
                            >
                                <Trash2 size={9} />
                            </SmallActionButton>
                        )}
                    </HeatmapActions>
                </HeatmapHeader>

                <SensorToggleList>
                    {GAS_SENSORS.map(sensor => {
                        const isActive = visibleHeatmaps[sensor.id];
                        let formattedVal = 'WAIT';

                        if (isRecallMode && recallInspection) {
                            const peak = recallInspection.peakGas?.[sensor.id] || 0;
                            const sampleCount = recallInspection.gasHeatmaps?.[sensor.id]?.length || 0;
                            formattedVal = `${peak.toFixed(sensor.decimals)} ${sensor.unit} (${sampleCount} pts)`;
                        } else {
                            const latestVal = latestGasValues[sensor.id];
                            formattedVal =
                                latestVal !== null
                                    ? `${latestVal.toFixed(sensor.decimals)} ${sensor.unit}`
                                    : 'WAIT';
                        }

                        return (
                            <SensorToggleButton
                                key={sensor.id}
                                type="button"
                                $active={isActive}
                                $color={sensor.colorHex}
                                onClick={() => handleToggleHeatmap(sensor.id)}
                                aria-pressed={isActive}
                                title={`Toggle ${sensor.label} heatmap overlay`}
                            >
                                <SensorToggleLeft>
                                    <ColorSwatch $active={isActive} $color={sensor.colorHex} />
                                    <span>{sensor.label}</span>
                                </SensorToggleLeft>
                                <SensorReadingText>{formattedVal}</SensorReadingText>
                            </SensorToggleButton>
                        );
                    })}
                </SensorToggleList>
            </HeatmapPanel>

            <Legend>
                {!isRecallMode && <LegendItem $color={theme.colors.primary}>Robot Position</LegendItem>}
                <LegendItem $color="#FF9500">Active Waypoint / Route</LegendItem>
                <LegendItem $color="#34C759">Reached Waypoint</LegendItem>
                <LegendItem $color="#1C1C1E">Pending Waypoint</LegendItem>
                <LegendItem $color="#007AFF">Planned Path</LegendItem>
            </Legend>
        </Container>
    );
}
