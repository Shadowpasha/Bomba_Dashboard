'use client';

import React, { useEffect, useState } from 'react';
import styled from 'styled-components';
import RosConnection from '@/lib/ros/RosConnection';
import { theme } from '@/lib/theme';

const Container = styled.div`
  background: ${theme.colors.text};
  border-radius: ${theme.radius.lg};
  border: 4px solid ${theme.colors.primary};
  overflow: hidden;
  position: relative;
  aspect-ratio: 16 / 9;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: ${theme.shadows.medium};
`;

const Stream = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
`;

const Badge = styled.div`
  position: absolute;
  top: 12px;
  left: 12px;
  background: ${theme.colors.primary};
  color: white;
  padding: 4px 12px;
  border-radius: ${theme.radius.sm};
  font-size: 10px;
  font-weight: 900;
  text-transform: uppercase;
  letter-spacing: 1px;
  display: flex;
  align-items: center;
  gap: 8px;
  z-index: 10;
`;

const Dot = styled.div<{ active: boolean }>`
  width: 6px;
  height: 6px;
  background: ${props => props.active ? '#34C759' : '#fff'};
  border-radius: 50%;
  ${props => props.active && `box-shadow: 0 0 8px #34C759;`}
`;

const PlaceholderText = styled.div`
  color: ${theme.colors.secondary};
  font-size: 12px;
  opacity: 0.5;
`;

export default function CameraView() {
    const [isConnected, setIsConnected] = useState(false);

    useEffect(() => {
        const unsubscribe = RosConnection.getInstance().subscribeStatus(setIsConnected);
        return () => { unsubscribe(); };
    }, []);

    return (
        <Container>
            {isConnected ? (
                <Stream
                    src="http://localhost:8080/stream?topic=/front_camera/image_raw&type=mjpeg"
                    alt="Front Camera"
                    onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://via.placeholder.com/640x480?text=No+Camera+Stream';
                    }}
                />
            ) : (
                <PlaceholderText>WAITING FOR UPLINK...</PlaceholderText>
            )}
            <Badge>
                <Dot active={isConnected} />
                CAM_01 LIVE
            </Badge>
        </Container>
    );
}
