'use client';

import React from 'react';
import styled from 'styled-components';
import { Joystick } from 'react-joystick-component';
import { AlertTriangle, RotateCcw } from 'lucide-react';
import { theme } from '@/lib/theme';
import RosConnection from '@/lib/ros/RosConnection';

const Container = styled.div`
  background: white;
  border-radius: ${theme.radius.lg};
  border: 4px solid ${theme.colors.primary};
  padding: 24px;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: space-between;
  box-shadow: ${theme.shadows.medium};
  position: relative;
`;

const Header = styled.div`
  width: 100%;
  padding-bottom: 12px;
  border-bottom: 2px solid ${theme.colors.border};
  margin-bottom: 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const Title = styled.h3`
  font-size: 11px;
  font-weight: 900;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: ${theme.colors.text};
`;

const EmergencyButton = styled.button`
  width: 100%;
  background: ${theme.colors.primary};
  color: white;
  border: none;
  border-radius: ${theme.radius.md};
  padding: 16px;
  font-weight: 900;
  text-transform: uppercase;
  font-size: 14px;
  letter-spacing: 1px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 4px 0px ${theme.colors.primaryDark};
  margin-top: 20px;

  &:active {
    transform: translateY(2px);
    box-shadow: 0 2px 0px ${theme.colors.primaryDark};
  }

  &:hover {
    background: ${theme.colors.primaryDark};
  }
`;

const JoystickWrapper = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${theme.colors.background};
  padding: 20px;
  border-radius: 50%;
  border: 4px dashed ${theme.colors.border};
`;

export default function ManualControl() {
  const handleMove = (event: any) => {
    const ros = RosConnection.getInstance();
    const cmdVel = ros.createTopic('/cmd_vel', 'geometry_msgs/Twist');
    if (cmdVel) {
      // Linear X is forward/backward (event.y)
      // Angular Z is left/right (event.x)
      cmdVel.publish({
        linear: { x: event.y / 100, y: 0, z: 0 },
        angular: { x: 0, y: 0, z: -event.x / 100 }
      });
    }
  };

  const handleStop = () => {
    const ros = RosConnection.getInstance();
    const cmdVel = ros.createTopic('/cmd_vel', 'geometry_msgs/Twist');
    if (cmdVel) {
      cmdVel.publish({
        linear: { x: 0, y: 0, z: 0 },
        angular: { x: 0, y: 0, z: 0 }
      });
    }
  };

  const handleEmergencyReturn = () => {
    const ros = RosConnection.getInstance();
    const emergencyTopic = ros.createTopic('/emergency_return', 'std_msgs/Empty');
    if (emergencyTopic) {
      emergencyTopic.publish({});
      alert('EMERGENCY RETURN SIGNAL SENT');
    }
  };

  return (
    <Container>
      <Header>
        <Title>MANUAL_OVERRIDE</Title>
        <RotateCcw size={16} color={theme.colors.textLight} style={{ cursor: 'pointer' }} />
      </Header>

      <JoystickWrapper>
        <Joystick
          size={120}
          sticky={false}
          baseColor={theme.colors.background}
          stickColor={theme.colors.primary}
          move={handleMove}
          stop={handleStop}
        />
      </JoystickWrapper>

      <EmergencyButton onClick={handleEmergencyReturn}>
        <AlertTriangle size={20} />
        Emergency Return
      </EmergencyButton>
    </Container>
  );
}
