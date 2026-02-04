'use client';

import React, { useEffect, useState } from 'react';
import styled from 'styled-components';
import RosConnection from '@/lib/ros/RosConnection';
import { Navigation, Compass, Activity } from 'lucide-react';
import { theme } from '@/lib/theme';

const Container = styled.div`
  background: white;
  border-radius: ${theme.radius.lg};
  border-left: 6px solid ${theme.colors.primary};
  padding: 16px;
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
  margin-bottom: 20px;
`;

const Title = styled.h3`
  font-size: 11px;
  font-weight: 900;
  text-transform: uppercase;
  letter-spacing: 2px;
  color: ${theme.colors.primary};
`;

const StatRow = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 20px;
`;

const IconBox = styled.div`
  width: 48px;
  height: 48px;
  background: ${theme.colors.background};
  border: 1px solid ${theme.colors.border};
  border-radius: ${theme.radius.md};
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${theme.colors.primary};
`;

const Label = styled.div`
  font-size: 9px;
  font-weight: 800;
  color: ${theme.colors.textLight};
  text-transform: uppercase;
`;

const Value = styled.div`
  font-size: 20px;
  font-weight: 900;
  color: ${theme.colors.text};
`;

const StatusIndicator = styled.div<{ active: boolean }>`
  font-size: 10px;
  font-weight: 900;
  color: ${props => props.active ? theme.colors.primary : theme.colors.textLight};
  display: flex;
  align-items: center;
  gap: 6px;
  
  &::before {
    content: '';
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: ${props => props.active ? theme.colors.primary : theme.colors.border};
  }
`;

export default function OdomStats() {
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

    return (
        <Container>
            <div>
                <Header>
                    <Title>Odometry_System</Title>
                    <Activity size={16} color={theme.colors.primary} />
                </Header>

                <StatRow>
                    <IconBox><Navigation size={22} /></IconBox>
                    <div>
                        <Label>Position (X, Y)</Label>
                        <Value>{odom.x.toFixed(2)}, {odom.y.toFixed(2)}</Value>
                    </div>
                </StatRow>

                <StatRow>
                    <IconBox><Compass size={22} /></IconBox>
                    <div>
                        <Label>Heading</Label>
                        <Value>{odom.yaw}°</Value>
                    </div>
                </StatRow>
            </div>

            <StatusIndicator active={isConnected}>
                {isConnected ? 'NODE ACTIVE' : 'NODE OFFLINE'}
            </StatusIndicator>
        </Container>
    );
}
