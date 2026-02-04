'use client';

import React, { useEffect, useState, useRef } from 'react';
import styled from 'styled-components';
import RosConnection from '@/lib/ros/RosConnection';
import * as ROSLIB from 'roslib';
import { theme } from '@/lib/theme';

const Container = styled.div`
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
`;

const Canvas = styled.canvas`
  max-width: 100%;
  max-height: 100%;
  image-rendering: pixelated;
`;

const Badge = styled.div`
  position: absolute;
  top: 12px;
  left: 12px;
  background: ${theme.colors.text};
  color: white;
  padding: 4px 10px;
  border-radius: ${theme.radius.sm};
  font-size: 9px;
  font-weight: 800;
  text-transform: uppercase;
  z-index: 10;
  border-left: 3px solid ${theme.colors.primary};
`;

const Legend = styled.div`
  position: absolute;
  bottom: 12px;
  right: 12px;
  background: rgba(255, 255, 255, 0.9);
  padding: 8px;
  border-radius: 4px;
  border: 1px solid ${theme.colors.border};
  font-size: 8px;
  font-weight: 700;
  display: flex;
  flex-direction: column;
  gap: 4px;
  z-index: 10;
`;

const LegendItem = styled.div<{ color: string }>`
  display: flex;
  align-items: center;
  gap: 6px;
  &::before {
    content: '';
    width: 6px;
    height: 6px;
    background: ${props => props.color};
    border-radius: 50%;
  }
`;

export default function MapView() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isConnected, setIsConnected] = useState(false);
    const mapData = useRef<any>(null);
    const robotPose = useRef({ x: 0, y: 0, yaw: 0 });
    const markers = useRef<any[]>([]);

    useEffect(() => {
        const ros = RosConnection.getInstance();
        const cleanup = ros.subscribeStatus(setIsConnected);

        // 1. Map Subscription
        const mapTopic = ros.createTopic('/map', 'nav_msgs/OccupancyGrid');
        if (mapTopic) {
            mapTopic.subscribe((message: any) => {
                mapData.current = message;
                render();
            });
        }

        // 2. Odom Subscription for Robot Position
        const odomTopic = ros.createTopic('/odom', 'nav_msgs/Odometry');
        if (odomTopic) {
            odomTopic.subscribe((message: any) => {
                const pose = message.pose.pose;
                const q = pose.orientation;
                const yaw = Math.atan2(2.0 * (q.w * q.z + q.x * q.y), 1.0 - 2.0 * (q.y * q.y + q.z * q.z));
                robotPose.current = {
                    x: pose.position.x,
                    y: pose.position.y,
                    yaw: yaw
                };
                render();
            });
        }

        // 3. Markers Subscription
        const markersTopic = ros.createTopic('/map_markers', 'std_msgs/String');
        if (markersTopic) {
            markersTopic.subscribe((message: any) => {
                try {
                    const newMarker = JSON.parse(message.data);
                    // Simple logic: add or update marker by ID
                    const index = markers.current.findIndex(m => m.id === newMarker.id);
                    if (index > -1) markers.current[index] = newMarker;
                    else markers.current.push(newMarker);
                    render();
                } catch (e) {
                    console.error("Failed to parse marker:", e);
                }
            });
        }

        return () => {
            cleanup();
            if (mapTopic) mapTopic.unsubscribe();
            if (odomTopic) odomTopic.unsubscribe();
            if (markersTopic) markersTopic.unsubscribe();
        };
    }, []);

    const worldToMap = (worldX: number, worldY: number, info: any) => {
        const mapX = (worldX - info.origin.position.x) / info.resolution;
        const mapY = (worldY - info.origin.position.y) / info.resolution;
        return { x: mapX, y: info.height - mapY }; // Canvas Y is inverted
    };

    const render = () => {
        const canvas = canvasRef.current;
        if (!canvas || !mapData.current) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const info = mapData.current.info;
        const data = mapData.current.data;

        canvas.width = info.width;
        canvas.height = info.height;

        // 1. Clear and Draw Map
        const imageData = ctx.createImageData(info.width, info.height);
        for (let i = 0; i < data.length; i++) {
            const val = data[i];
            let r, g, b;
            if (val === -1) { r = 240; g = 240; b = 245; }
            else if (val === 0) { r = 255; g = 255; b = 255; }
            else { r = 255; g = 59; b = 48; }

            const idx = i * 4;
            imageData.data[idx] = r;
            imageData.data[idx + 1] = g;
            imageData.data[idx + 2] = b;
            imageData.data[idx + 3] = 255;
        }
        ctx.putImageData(imageData, 0, 0);

        // 2. Draw Markers
        markers.current.forEach(marker => {
            const pos = worldToMap(marker.x, marker.y, info);
            ctx.beginPath();
            if (marker.type === 'human') {
                ctx.fillStyle = '#34C759'; // Green
                ctx.arc(pos.x, pos.y, 10 / info.resolution / 20, 0, 2 * Math.PI);
                ctx.fill();
                ctx.strokeStyle = 'white';
                ctx.stroke();
            } else if (marker.type === 'danger') {
                ctx.fillStyle = 'rgba(255, 59, 48, 0.4)'; // Red Area
                ctx.arc(pos.x, pos.y, 20 / info.resolution / 20, 0, 2 * Math.PI);
                ctx.fill();
            }
        });

        // 3. Draw Robot
        const robotPos = worldToMap(robotPose.current.x, robotPose.current.y, info);
        ctx.save();
        ctx.translate(robotPos.x, robotPos.y);
        ctx.rotate(-robotPose.current.yaw); // ROS yaw vs Canvas rotation

        // Robot Triangle
        ctx.beginPath();
        ctx.moveTo(8 / info.resolution / 10, 0);
        ctx.lineTo(-6 / info.resolution / 10, 5 / info.resolution / 10);
        ctx.lineTo(-6 / info.resolution / 10, -5 / info.resolution / 10);
        ctx.closePath();
        ctx.fillStyle = theme.colors.primary;
        ctx.fill();
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.restore();
    };

    return (
        <Container>
            <Badge>ROBOTIC_MISSION_CONTROL</Badge>
            {!isConnected ? (
                <span style={{ color: theme.colors.textLight, fontSize: '12px' }}>OFFLINE</span>
            ) : (
                <Canvas ref={canvasRef} />
            )}
            <Legend>
                <LegendItem color={theme.colors.primary}>Robot Position</LegendItem>
                <LegendItem color="#34C759">Human Detected</LegendItem>
                <LegendItem color="rgba(255, 59, 48, 0.4)">Danger Zone</LegendItem>
            </Legend>
        </Container>
    );
}
