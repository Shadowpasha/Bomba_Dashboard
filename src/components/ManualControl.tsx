'use client';

import React, { useState } from 'react';
import styled from 'styled-components';
import { Joystick } from 'react-joystick-component';
import { AlertTriangle, RotateCcw, Power } from 'lucide-react';
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

const ModeSwitch = styled.div<{ active: boolean }>`
  display: flex;
  align-items: center;
  gap: 10px;
  background: ${props => props.active ? theme.colors.primary : theme.colors.background};
  color: ${props => props.active ? 'white' : theme.colors.text};
  border: 2px solid ${theme.colors.border};
  padding: 8px 16px;
  border-radius: ${theme.radius.md};
  font-size: 10px;
  font-weight: 900;
  text-transform: uppercase;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  margin-bottom: 16px;

  &:hover {
    border-color: ${theme.colors.primary};
  }

  svg {
    color: ${props => props.active ? 'white' : theme.colors.primary};
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
  const [isManualMode, setIsManualMode] = useState(false);

  const toggleManualMode = () => {
    const nextMode = !isManualMode;
    setIsManualMode(nextMode);

    const ros = RosConnection.getInstance();
    const overrideTopic = ros.createTopic('/manual_override', 'std_msgs/Bool');
    if (overrideTopic) {
      overrideTopic.publish({ data: nextMode });
    }
  };

  const handleMove = (event: any) => {
    if (!isManualMode) return;
    const ros = RosConnection.getInstance();
    const cmdVel = ros.createTopic('/cmd_vel', 'geometry_msgs/Twist');
    if (cmdVel) {
      // Scale to match TD3 node: [0, 0.2] m/s linear, [-0.5, 0.5] rad/s angular
      // event.x and event.y are normalized -100 to 100
      // Re-scaled to 0.5 (max m/s and rad/s) for safety and control.
      // event.x and event.y are expected to be -100 to 100
      cmdVel.publish({
        linear: { x: (event.y / 100) * 50.0, y: 0, z: 0 },
        angular: { x: 0, y: 0, z: -(event.x / 100) * 50.0 }
      });
    }
  };

  const handleStop = () => {
    if (!isManualMode) return;
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
    const emergencyTopic = ros.createTopic('/emergency_return', 'std_msgs/Bool');
    if (emergencyTopic) {
      emergencyTopic.publish({ data: true });
      alert('EMERGENCY RETURN SIGNAL SENT');
    }
  };

  const handleStartExploration = () => {
    const ros = RosConnection.getInstance();
    const startTopic = ros.createTopic('/start_exploration', 'std_msgs/Bool');
    if (startTopic) {
      startTopic.publish({ data: true });
    }
  };

  return (
    <Container>
      <Header>
        <Title>MANUAL_OVERRIDE</Title>
        <RotateCcw size={16} color={theme.colors.textLight} style={{ cursor: 'pointer' }} />
      </Header>

      <ModeSwitch active={isManualMode} onClick={toggleManualMode}>
        <Power size={14} />
        {isManualMode ? 'MANUAL_ACTIVE' : 'AUTO_ACTIVE'}
      </ModeSwitch>

      <JoystickWrapper style={{ opacity: isManualMode ? 1 : 0.4, pointerEvents: isManualMode ? 'auto' : 'none', transition: 'all 0.3s' }}>
        <Joystick
          size={120}
          sticky={false}
          baseColor={theme.colors.background}
          stickColor={theme.colors.primary}
          move={handleMove}
          stop={handleStop}
        />
      </JoystickWrapper>

      <div style={{ width: '100%', display: 'flex', gap: '12px' }}>
        <EmergencyButton onClick={handleStartExploration} style={{ background: theme.colors.success, boxShadow: '0 4px 0px #2da94c' }}>
          <Power size={20} />
          Start
        </EmergencyButton>

        <EmergencyButton onClick={handleEmergencyReturn}>
          <AlertTriangle size={20} />
          Return
        </EmergencyButton>
      </div>
    </Container>
  );
}
