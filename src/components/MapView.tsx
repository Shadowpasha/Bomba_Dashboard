'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import styled from 'styled-components';
import RosConnection from '@/lib/ros/RosConnection';
import { theme } from '@/lib/theme';
import { Crosshair, MapPin } from 'lucide-react';

interface Point {
    x: number;
    y: number;
}

interface MapViewProps {
    mode?: 'manual' | 'p2p';
    targetPoint?: Point | null;
    onSetTarget?: (point: Point) => void;
    robotPose?: { x: number; y: number; yaw: number };
    isNavigating?: boolean;
}

const Container = styled.div<{ $isP2P: boolean }>`
  background: white;
  border-radius: ${theme.radius.lg};
  border: 2px solid ${theme.colors.border};
  overflow: hidden;
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  box-shadow: ${theme.shadows.soft};
  cursor: ${props => props.$isP2P ? 'crosshair' : 'default'};
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

const Badge = styled.div`
  position: absolute;
  top: 12px;
  left: 12px;
  background: ${theme.colors.text};
  color: white;
  padding: 5px 12px;
  border-radius: ${theme.radius.sm};
  font-size: 9px;
  font-weight: 800;
  text-transform: uppercase;
  z-index: 10;
  border-left: 3px solid ${theme.colors.primary};
  display: flex;
  align-items: center;
  gap: 8px;
`;

const ModeHint = styled.div`
  position: absolute;
  top: 12px;
  right: 12px;
  background: rgba(255, 149, 0, 0.95);
  color: white;
  padding: 4px 10px;
  border-radius: ${theme.radius.sm};
  font-size: 9px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  display: flex;
  align-items: center;
  gap: 6px;
  z-index: 10;
  box-shadow: 0 2px 6px rgba(255, 149, 0, 0.3);
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

export default function MapView({
    mode = 'p2p',
    targetPoint = null,
    onSetTarget,
    robotPose: externalRobotPose,
    isNavigating = false
}: MapViewProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isConnected, setIsConnected] = useState(false);
    const mapData = useRef<any>(null);
    const internalRobotPose = useRef({ x: 0, y: 0, yaw: 0 });
    const markers = useRef<any[]>([]);
    const plannedPath = useRef<Point[]>([]);
    const hoverCoordsRef = useRef<Point | null>(null);

    const activePose = externalRobotPose || internalRobotPose.current;

    const fallbackInfo = {
        width: 400,
        height: 400,
        resolution: 0.05,
        origin: { position: { x: -10, y: -10 } }
    };

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

        // When the canvas element aspect ratio differs from internal canvas resolution
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

        const info = mapData.current ? mapData.current.info : fallbackInfo;
        if (canvas.width !== info.width || canvas.height !== info.height) {
            canvas.width = info.width;
            canvas.height = info.height;
        }

        // 1. Draw Map (or synthetic tactical grid)
        if (mapData.current) {
            const data = mapData.current.data;
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
            // Tactical grid for standby / development mode
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
        if (plannedPath.current.length > 1) {
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

        // 4. Hover Reticle in Point-to-Point Mode
        if (mode === 'p2p' && hoverCoordsRef.current) {
            const hPos = worldToMap(hoverCoordsRef.current.x, hoverCoordsRef.current.y, info);
            ctx.beginPath();
            ctx.arc(hPos.x, hPos.y, 7, 0, 2 * Math.PI);
            ctx.strokeStyle = 'rgba(255, 149, 0, 0.8)';
            ctx.lineWidth = 1;
            ctx.setLineDash([3, 3]);
            ctx.stroke();
            ctx.setLineDash([]);

            // Crosshair lines
            ctx.beginPath();
            ctx.strokeStyle = 'rgba(255, 149, 0, 0.6)';
            ctx.moveTo(hPos.x - 10, hPos.y);
            ctx.lineTo(hPos.x + 10, hPos.y);
            ctx.moveTo(hPos.x, hPos.y - 10);
            ctx.lineTo(hPos.x, hPos.y + 10);
            ctx.stroke();
        }

        // 5. Point-to-Point Waypoint Target & Direct Vector
        if (targetPoint) {
            const targetPos = worldToMap(targetPoint.x, targetPoint.y, info);
            const robotPos = worldToMap(activePose.x, activePose.y, info);

            // Draw approach vector from robot to target
            ctx.beginPath();
            ctx.setLineDash([5, 5]);
            ctx.strokeStyle = '#FF9500';
            ctx.lineWidth = 1.5;
            ctx.moveTo(robotPos.x, robotPos.y);
            ctx.lineTo(targetPos.x, targetPos.y);
            ctx.stroke();
            ctx.setLineDash([]);

            // Outer target pulse circle
            ctx.beginPath();
            ctx.arc(targetPos.x, targetPos.y, 10, 0, 2 * Math.PI);
            ctx.fillStyle = 'rgba(255, 149, 0, 0.2)';
            ctx.fill();
            ctx.strokeStyle = '#FF9500';
            ctx.lineWidth = 2;
            ctx.stroke();

            // Inner target crosshair
            ctx.beginPath();
            ctx.arc(targetPos.x, targetPos.y, 3, 0, 2 * Math.PI);
            ctx.fillStyle = '#FF9500';
            ctx.fill();

            // Target Waypoint Label
            ctx.fillStyle = '#1C1C1E';
            ctx.font = 'bold 9px sans-serif';
            ctx.fillText(`WP [${targetPoint.x.toFixed(1)}, ${targetPoint.y.toFixed(1)}]`, targetPos.x + 12, targetPos.y - 4);
        }

        // 6. Draw Robot Pose
        const robotPos = worldToMap(activePose.x, activePose.y, info);
        ctx.save();
        ctx.translate(robotPos.x, robotPos.y);
        ctx.rotate(-activePose.yaw);

        ctx.beginPath();
        ctx.moveTo(7, 0);
        ctx.lineTo(-5, 4);
        ctx.lineTo(-5, -4);
        ctx.closePath();
        ctx.fillStyle = theme.colors.primary;
        ctx.fill();
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 1.2;
        ctx.stroke();

        ctx.restore();
    }, [activePose, targetPoint, mode, worldToMap]);

    useEffect(() => {
        const ros = RosConnection.getInstance();
        const cleanup = ros.subscribeStatus(setIsConnected);

        const mapTopic = ros.createTopic('/map', 'nav_msgs/OccupancyGrid');
        if (mapTopic) {
            mapTopic.subscribe((message: any) => {
                mapData.current = message;
                render();
            });
        }

        const odomTopic = ros.createTopic('/odom', 'nav_msgs/Odometry');
        if (odomTopic) {
            odomTopic.subscribe((message: any) => {
                const pose = message.pose.pose;
                const q = pose.orientation;
                const yaw = Math.atan2(2.0 * (q.w * q.z + q.x * q.y), 1.0 - 2.0 * (q.y * q.y + q.z * q.z));
                internalRobotPose.current = {
                    x: pose.position.x,
                    y: pose.position.y,
                    yaw: yaw
                };
                render();
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
                    render();
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
                render();
            });
        }

        render();

        return () => {
            cleanup();
            if (mapTopic) mapTopic.unsubscribe();
            if (odomTopic) odomTopic.unsubscribe();
            if (markersTopic) markersTopic.unsubscribe();
            if (pathTopic) pathTopic.unsubscribe();
        };
    }, [render]);

    useEffect(() => {
        render();
    }, [targetPoint, externalRobotPose, render]);

    const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
        if (mode !== 'p2p') return;
        const pt = getCanvasPoint(e);
        if (!pt) {
            hoverCoordsRef.current = null;
            render();
            return;
        }

        const info = mapData.current ? mapData.current.info : fallbackInfo;
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
        if (mode !== 'p2p') return;
        const pt = getCanvasPoint(e);
        if (!pt) return;

        const info = mapData.current ? mapData.current.info : fallbackInfo;
        const worldCoords = mapToWorld(pt.canvasX, pt.canvasY, info);

        if (onSetTarget) {
            onSetTarget(worldCoords);
        }
    };

    return (
        <Container $isP2P={mode === 'p2p'}>
            <Badge>
                <Crosshair size={14} color={theme.colors.primary} />
                POINT_TO_POINT_MISSION_MAP
            </Badge>

            {mode === 'p2p' && (
                <ModeHint>
                    <MapPin size={12} />
                    CLICK MAP TO SET WAYPOINT
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

            <Legend>
                <LegendItem $color={theme.colors.primary}>Robot Position</LegendItem>
                <LegendItem $color="#FF9500">Target Waypoint</LegendItem>
                <LegendItem $color="#007AFF">Approach / Planned Path</LegendItem>
                <LegendItem $color="#34C759">Human Detected</LegendItem>
                <LegendItem $color="rgba(255, 59, 48, 0.4)">Hazard Zone</LegendItem>
            </Legend>
        </Container>
    );
}
