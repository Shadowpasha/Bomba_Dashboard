'use client';

import React, { useState } from 'react';
import styled from 'styled-components';
import { Joystick } from 'react-joystick-component';
import { Navigation2, RotateCcw, AlertTriangle, Send, XCircle, Home, Compass } from 'lucide-react';
import { theme } from '@/lib/theme';
import RosConnection from '@/lib/ros/RosConnection';

interface Point {
  x: number;
  y: number;
}

interface ManualControlProps {
  mode?: 'manual' | 'p2p';
  onModeChange?: (mode: 'manual' | 'p2p') => void;
  targetPoint?: Point | null;
  onClearTarget?: () => void;
  onSetTarget?: (point: Point) => void;
  robotPose?: { x: number; y: number; yaw: number };
  isNavigating?: boolean;
  onStartNavigation?: () => void;
  onCancelNavigation?: () => void;
}

const Container = styled.div`
  background: white;
  border-radius: ${theme.radius.lg};
  border: 4px solid ${theme.colors.primary};
  padding: 18px 20px;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  box-shadow: ${theme.shadows.medium};
  position: relative;
`;

const Header = styled.div`
  width: 100%;
  padding-bottom: 10px;
  border-bottom: 2px solid ${theme.colors.border};
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

const ModeTabs = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  width: 100%;
  margin: 10px 0;
`;

const ModeTabButton = styled.button<{ $active: boolean }>`
  background: ${props => props.$active ? theme.colors.primary : theme.colors.background};
  color: ${props => props.$active ? 'white' : theme.colors.text};
  border: 2px solid ${props => props.$active ? theme.colors.primary : theme.colors.border};
  padding: 8px 10px;
  border-radius: ${theme.radius.md};
  font-size: 10px;
  font-weight: 900;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  transition: all 0.2s ease;

  &:hover {
    border-color: ${theme.colors.primary};
  }
`;

const P2PPanel = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
  width: 100%;
  flex: 1;
  justify-content: center;
`;

const WaypointCard = styled.div`
  background: ${theme.colors.background};
  border: 2px solid ${theme.colors.border};
  border-radius: ${theme.radius.md};
  padding: 12px;
`;

const WaypointHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
`;

const WaypointLabel = styled.div`
  font-size: 9px;
  font-weight: 900;
  color: ${theme.colors.textLight};
  text-transform: uppercase;
`;

const StatusTag = styled.span<{ $color: string }>`
  font-size: 8px;
  font-weight: 900;
  padding: 2px 6px;
  border-radius: 4px;
  background: ${props => props.$color}15;
  color: ${props => props.$color};
  border: 1px solid ${props => props.$color}40;
`;

const CoordinateGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
`;

const CoordBox = styled.div`
  background: white;
  border: 1px solid ${theme.colors.border};
  border-radius: 6px;
  padding: 6px 10px;
  .axis {
    font-size: 8px;
    font-weight: 800;
    color: ${theme.colors.textLight};
  }
  .coord-val {
    font-size: 15px;
    font-weight: 900;
    color: ${theme.colors.text};
  }
`;

const MetricRow = styled.div`
  display: flex;
  justify-content: space-between;
  margin-top: 8px;
  padding-top: 6px;
  border-top: 1px dashed ${theme.colors.border};
  font-size: 9px;
  font-weight: 800;
  color: ${theme.colors.textLight};

  span.active-val {
    color: ${theme.colors.text};
    font-weight: 900;
  }
`;

const JoystickWrapper = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${theme.colors.background};
  padding: 14px;
  border-radius: 50%;
  border: 3px dashed ${theme.colors.border};
  margin: auto;
`;

const ActionButtonGroup = styled.div`
  display: flex;
  gap: 8px;
  width: 100%;
  margin-top: 10px;
`;

const ActionButton = styled.button<{ $variant?: 'primary' | 'danger' | 'secondary' }>`
  flex: 1;
  background: ${props =>
    props.$variant === 'secondary'
      ? theme.colors.background
      : props.$variant === 'danger'
      ? theme.colors.primaryDark
      : theme.colors.success};
  color: ${props => (props.$variant === 'secondary' ? theme.colors.text : 'white')};
  border: ${props => (props.$variant === 'secondary' ? `2px solid ${theme.colors.border}` : 'none')};
  border-radius: ${theme.radius.md};
  padding: 12px 10px;
  font-weight: 900;
  text-transform: uppercase;
  font-size: 11px;
  letter-spacing: 0.5px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: ${props => (props.$variant === 'secondary' ? 'none' : '0 3px 0px rgba(0, 0, 0, 0.15)')};

  &:hover {
    filter: brightness(1.05);
  }

  &:active {
    transform: translateY(2px);
    box-shadow: none;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
  }
`;

export default function ManualControl({
  mode: controlledMode,
  onModeChange,
  targetPoint: controlledTarget,
  onClearTarget,
  onSetTarget,
  robotPose = { x: 0, y: 0, yaw: 0 },
  isNavigating: controlledNavigating,
  onStartNavigation,
  onCancelNavigation
}: ManualControlProps) {
  const [internalMode, setInternalMode] = useState<'manual' | 'p2p'>('p2p');
  const [internalTarget, setInternalTarget] = useState<Point | null>(null);
  const [internalNavigating, setInternalNavigating] = useState(false);

  const currentMode = controlledMode !== undefined ? controlledMode : internalMode;
  const currentTarget = controlledTarget !== undefined ? controlledTarget : internalTarget;
  const currentNavigating = controlledNavigating !== undefined ? controlledNavigating : internalNavigating;

  const setMode = (newMode: 'manual' | 'p2p') => {
    if (onModeChange) onModeChange(newMode);
    else setInternalMode(newMode);

    const ros = RosConnection.getInstance();
    const overrideTopic = ros.createTopic('/manual_override', 'std_msgs/Bool');
    if (overrideTopic) {
      overrideTopic.publish({ data: newMode === 'manual' });
    }
  };

  const handleMove = (event: any) => {
    if (currentMode !== 'manual') return;
    const ros = RosConnection.getInstance();
    const cmdVel = ros.createTopic('/cmd_vel', 'geometry_msgs/Twist');
    if (cmdVel) {
      cmdVel.publish({
        linear: { x: (event.y / 100) * 0.5, y: 0, z: 0 },
        angular: { x: 0, y: 0, z: -(event.x / 100) * 0.8 }
      });
    }
  };

  const handleStop = () => {
    if (currentMode !== 'manual') return;
    const ros = RosConnection.getInstance();
    const cmdVel = ros.createTopic('/cmd_vel', 'geometry_msgs/Twist');
    if (cmdVel) {
      cmdVel.publish({
        linear: { x: 0, y: 0, z: 0 },
        angular: { x: 0, y: 0, z: 0 }
      });
    }
  };

  const handleDispatchWaypoint = () => {
    if (!currentTarget) return;

    if (onStartNavigation) {
      onStartNavigation();
    } else {
      setInternalNavigating(true);
    }

    const ros = RosConnection.getInstance();

    // 1. Publish standard ROS navigation goal (PoseStamped)
    const goalTopic = ros.createTopic('/move_base_simple/goal', 'geometry_msgs/PoseStamped');
    if (goalTopic) {
      const angle = Math.atan2(currentTarget.y - robotPose.y, currentTarget.x - robotPose.x);
      goalTopic.publish({
        header: {
          frame_id: 'map',
          stamp: { sec: Math.floor(Date.now() / 1000), nsec: 0 }
        },
        pose: {
          position: { x: currentTarget.x, y: currentTarget.y, z: 0 },
          orientation: { x: 0, y: 0, z: Math.sin(angle / 2), w: Math.cos(angle / 2) }
        }
      });
    }

    // 2. Publish Nav2 / ROS2 goal compatibility
    const goalPoseTopic = ros.createTopic('/goal_pose', 'geometry_msgs/PoseStamped');
    if (goalPoseTopic) {
      const angle = Math.atan2(currentTarget.y - robotPose.y, currentTarget.x - robotPose.x);
      goalPoseTopic.publish({
        header: {
          frame_id: 'map',
          stamp: { sec: Math.floor(Date.now() / 1000), nsec: 0 }
        },
        pose: {
          position: { x: currentTarget.x, y: currentTarget.y, z: 0 },
          orientation: { x: 0, y: 0, z: Math.sin(angle / 2), w: Math.cos(angle / 2) }
        }
      });
    }

    // 3. Trigger Point-to-Point control topic
    const p2pStartTopic = ros.createTopic('/point_to_point/start', 'std_msgs/Bool');
    if (p2pStartTopic) {
      p2pStartTopic.publish({ data: true });
    }
  };

  const handleCancelNavigation = () => {
    if (onCancelNavigation) {
      onCancelNavigation();
    } else {
      setInternalNavigating(false);
    }

    const ros = RosConnection.getInstance();
    const cancelTopic = ros.createTopic('/point_to_point/cancel', 'std_msgs/Bool');
    if (cancelTopic) {
      cancelTopic.publish({ data: true });
    }
  };

  const handleReturnToBase = () => {
    const basePoint = { x: 0, y: 0 };
    if (onSetTarget) onSetTarget(basePoint);
    else setInternalTarget(basePoint);

    const ros = RosConnection.getInstance();
    const emergencyTopic = ros.createTopic('/emergency_return', 'std_msgs/Bool');
    if (emergencyTopic) {
      emergencyTopic.publish({ data: true });
    }

    // Dispatch base as goal
    const goalTopic = ros.createTopic('/move_base_simple/goal', 'geometry_msgs/PoseStamped');
    if (goalTopic) {
      goalTopic.publish({
        header: { frame_id: 'map', stamp: { sec: Math.floor(Date.now() / 1000), nsec: 0 } },
        pose: {
          position: { x: 0, y: 0, z: 0 },
          orientation: { x: 0, y: 0, z: 0, w: 1.0 }
        }
      });
    }

    if (onStartNavigation) onStartNavigation();
    else setInternalNavigating(true);
  };

  const distance = currentTarget
    ? Math.hypot(currentTarget.x - robotPose.x, currentTarget.y - robotPose.y).toFixed(2)
    : '--';

  const bearing = currentTarget
    ? Math.round(
        (Math.atan2(currentTarget.y - robotPose.y, currentTarget.x - robotPose.x) * 180) / Math.PI
      )
    : null;

  return (
    <Container>
      <Header>
        <Title>MOTION_CONTROL_UNIT</Title>
        <RotateCcw
          size={16}
          color={theme.colors.textLight}
          style={{ cursor: 'pointer' }}
          onClick={() => {
            if (onClearTarget) onClearTarget();
            else setInternalTarget(null);
          }}
        />
      </Header>

      <ModeTabs>
        <ModeTabButton $active={currentMode === 'p2p'} onClick={() => setMode('p2p')}>
          <Navigation2 size={13} />
          POINT TO POINT
        </ModeTabButton>
        <ModeTabButton $active={currentMode === 'manual'} onClick={() => setMode('manual')}>
          <Compass size={13} />
          MANUAL DRIVE
        </ModeTabButton>
      </ModeTabs>

      {currentMode === 'p2p' ? (
        <P2PPanel>
          <WaypointCard>
            <WaypointHeader>
              <WaypointLabel>Target Waypoint</WaypointLabel>
              <StatusTag
                $color={
                  currentNavigating
                    ? theme.colors.primary
                    : currentTarget
                    ? theme.colors.success
                    : theme.colors.textLight
                }
              >
                {currentNavigating
                  ? 'IN TRANSIT'
                  : currentTarget
                  ? 'TARGET LOCKED'
                  : 'CLICK MAP TO SET'}
              </StatusTag>
            </WaypointHeader>

            <CoordinateGrid>
              <CoordBox>
                <div className="axis">TARGET X</div>
                <div className="coord-val">
                  {currentTarget ? `${currentTarget.x.toFixed(2)}m` : '0.00m'}
                </div>
              </CoordBox>
              <CoordBox>
                <div className="axis">TARGET Y</div>
                <div className="coord-val">
                  {currentTarget ? `${currentTarget.y.toFixed(2)}m` : '0.00m'}
                </div>
              </CoordBox>
            </CoordinateGrid>

            <MetricRow>
              <span>DISTANCE TO GO:</span>
              <span className="active-val">{distance} m</span>
            </MetricRow>
            <MetricRow>
              <span>TARGET BEARING:</span>
              <span className="active-val">{bearing !== null ? `${bearing}°` : '--'}</span>
            </MetricRow>
          </WaypointCard>

          <ActionButtonGroup>
            {currentNavigating ? (
              <ActionButton $variant="danger" onClick={handleCancelNavigation}>
                <XCircle size={15} />
                Abort Transit
              </ActionButton>
            ) : (
              <ActionButton
                $variant="primary"
                disabled={!currentTarget}
                onClick={handleDispatchWaypoint}
              >
                <Send size={15} />
                Dispatch Goal
              </ActionButton>
            )}

            <ActionButton $variant="secondary" onClick={handleReturnToBase}>
              <Home size={15} />
              Return Home
            </ActionButton>
          </ActionButtonGroup>
        </P2PPanel>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
          <JoystickWrapper>
            <Joystick
              size={110}
              sticky={false}
              baseColor={theme.colors.background}
              stickColor={theme.colors.primary}
              move={handleMove}
              stop={handleStop}
            />
          </JoystickWrapper>

          <ActionButtonGroup>
            <ActionButton $variant="danger" onClick={handleStop}>
              <AlertTriangle size={15} />
              Emergency Stop
            </ActionButton>
            <ActionButton $variant="secondary" onClick={handleReturnToBase}>
              <Home size={15} />
              Base
            </ActionButton>
          </ActionButtonGroup>
        </div>
      )}
    </Container>
  );
}
