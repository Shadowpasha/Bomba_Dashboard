'use client';

import React, { useEffect, useState } from 'react';
import styled from 'styled-components';
import RosConnection from '@/lib/ros/RosConnection';
import { Navigation, Compass, Target, Activity, Clock, Route } from 'lucide-react';
import { theme } from '@/lib/theme';

interface OdomStatsProps {
    targetPoint?: { x: number; y: number } | null;
    cycleNumber?: number;
    distanceMeters?: number;
    durationSeconds?: number;
    isRecallMode?: boolean;
}

const Container = styled.div`
  background: white;
  border-radius: ${theme.radius.lg};
  border-left: 6px solid ${theme.colors.primary};
  padding: 14px 16px;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  box-shadow: ${theme.shadows.soft};
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
`;

const Title = styled.h3`
  font-size: 10px;
  font-weight: 900;
  text-transform: uppercase;
  letter-spacing: 1.5px;
  color: ${theme.colors.primary};
`;

const StatRow = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
`;

const IconBox = styled.div`
  width: 32px;
  height: 32px;
  background: ${theme.colors.background};
  border: 1px solid ${theme.colors.border};
  border-radius: ${theme.radius.md};
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${theme.colors.primary};
  flex-shrink: 0;
`;

const Label = styled.div`
  font-size: 7.5px;
  font-weight: 800;
  color: ${theme.colors.textLight};
  text-transform: uppercase;
  letter-spacing: 0.4px;
`;

const Value = styled.div`
  font-size: 14px;
  font-weight: 900;
  color: ${theme.colors.text};
  line-height: 1.1;
`;

const StatusIndicator = styled.div<{ $active: boolean }>`
  font-size: 8.5px;
  font-weight: 900;
  color: ${props => props.$active ? theme.colors.primary : theme.colors.textLight};
  display: flex;
  align-items: center;
  gap: 6px;
  
  &::before {
    content: '';
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: ${props => props.$active ? theme.colors.success : theme.colors.border};
  }
`;

function formatDuration(sec: number): string {
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export default function OdomStats({
    targetPoint,
    cycleNumber = 1,
    distanceMeters = 0,
    durationSeconds = 0,
    isRecallMode = false,
}: OdomStatsProps) {
    const [odom, setOdom] = useState({ x: 0, y: 0, yaw: 0 });
    const [isConnected, setIsConnected] = useState(false);

    useEffect(() => {
        const ros = RosConnection.getInstance();
        const cleanup = ros.subscribeStatus(setIsConnected);
        const odomTopic = ros.createTopic('/odom', 'nav_msgs/Odometry');

        if (odomTopic) {
            odomTopic.subscribe((message: any) => {
                const pose = message.pose.pose;
                const q = pose.orientation;
                const yaw = Math.atan2(2.0 * (q.w * q.z + q.x * q.y), 1.0 - 2.0 * (q.y * q.y + q.z * q.z));
                setOdom({
                    x: pose.position.x,
                    y: pose.position.y,
                    yaw: parseFloat((yaw * 180 / Math.PI).toFixed(1))
                });
            });
        }

        return () => {
            cleanup();
            if (odomTopic) odomTopic.unsubscribe();
        };
    }, []);

    const targetDist = targetPoint
        ? Math.hypot(targetPoint.x - odom.x, targetPoint.y - odom.y).toFixed(2)
        : null;

    return (
        <Container>
            <div>
                <Header>
                    <Title>CYCLE #{cycleNumber} ODOMETRY</Title>
                    <Activity size={14} color={theme.colors.primary} />
                </Header>

                <StatRow>
                    <IconBox><Clock size={16} /></IconBox>
                    <div>
                        <Label>INSPECTION DURATION</Label>
                        <Value>{formatDuration(durationSeconds)}</Value>
                    </div>
                </StatRow>

                <StatRow>
                    <IconBox><Route size={16} /></IconBox>
                    <div>
                        <Label>DISTANCE TRAVERSED</Label>
                        <Value>{distanceMeters.toFixed(1)} m</Value>
                    </div>
                </StatRow>

                <StatRow>
                    <IconBox><Navigation size={16} /></IconBox>
                    <div>
                        <Label>ROBOT POSE (X, Y)</Label>
                        <Value>{odom.x.toFixed(2)}, {odom.y.toFixed(2)}</Value>
                    </div>
                </StatRow>

                <StatRow>
                    <IconBox><Compass size={16} /></IconBox>
                    <div>
                        <Label>HEADING YAW</Label>
                        <Value>{odom.yaw}°</Value>
                    </div>
                </StatRow>

                {targetPoint && (
                    <StatRow>
                        <IconBox><Target size={16} /></IconBox>
                        <div>
                            <Label>TARGET DISTANCE</Label>
                            <Value>{targetDist} m</Value>
                        </div>
                    </StatRow>
                )}
            </div>

            <StatusIndicator $active={isConnected && !isRecallMode}>
                {isRecallMode
                    ? 'HISTORICAL ARCHIVE'
                    : isConnected
                    ? 'TELEMETRY LIVE'
                    : 'NODE STANDBY'}
            </StatusIndicator>
        </Container>
    );
}
