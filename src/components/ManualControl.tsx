'use client';

import React, { useState } from 'react';
import styled from 'styled-components';
import { Joystick } from 'react-joystick-component';
import {
  Navigation2,
  RotateCcw,
  AlertTriangle,
  Send,
  XCircle,
  Home,
  Compass,
  MapPin,
  CheckCircle2,
  Trash2,
  SkipForward,
  Save,
  PlusCircle,
  Play
} from 'lucide-react';
import { theme } from '@/lib/theme';
import RosConnection from '@/lib/ros/RosConnection';
import { InspectionWaypoint } from '@/lib/inspections';

interface Point {
  x: number;
  y: number;
}

interface ManualControlProps {
  mode?: 'manual' | 'autonomous';
  onModeChange?: (mode: 'manual' | 'autonomous') => void;
  targetPoint?: Point | null;
  onClearTarget?: () => void;
  onSetTarget?: (point: Point) => void;
  waypoints?: InspectionWaypoint[];
  activeWaypointIndex?: number;
  onAddWaypointAtRobot?: () => void;
  onRemoveWaypoint?: (id: string) => void;
  onClearWaypoints?: () => void;
  onSkipWaypoint?: () => void;
  robotPose?: { x: number; y: number; yaw: number };
  isNavigating?: boolean;
  onStartNavigation?: () => void;
  onCancelNavigation?: () => void;
  onCompleteInspection?: () => void;
  hasSavedMap?: boolean;
  isRecallMode?: boolean;
}

const Container = styled.div`
  background: white;
  border-radius: ${theme.radius.lg};
  border: 4px solid ${theme.colors.primary};
  padding: 16px 18px;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  box-shadow: ${theme.shadows.medium};
  position: relative;
  overflow: hidden;
`;

const Header = styled.div`
  width: 100%;
  padding-bottom: 8px;
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
  margin: 8px 0;
`;

const ModeTabButton = styled.button<{ $active: boolean }>`
  background: ${props => props.$active ? theme.colors.primary : theme.colors.background};
  color: ${props => props.$active ? 'white' : theme.colors.text};
  border: 2px solid ${props => props.$active ? theme.colors.primary : theme.colors.border};
  padding: 7px 8px;
  border-radius: ${theme.radius.md};
  font-size: 9px;
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

const PanelBody = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
  flex: 1;
  min-height: 0;
  overflow: hidden;
`;

const Card = styled.div`
  background: ${theme.colors.background};
  border: 2px solid ${theme.colors.border};
  border-radius: ${theme.radius.md};
  padding: 10px 12px;
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

const CardHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const CardLabel = styled.div`
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
  gap: 6px;
`;

const CoordBox = styled.div`
  background: white;
  border: 1px solid ${theme.colors.border};
  border-radius: 6px;
  padding: 5px 8px;
  .axis {
    font-size: 8px;
    font-weight: 800;
    color: ${theme.colors.textLight};
  }
  .coord-val {
    font-size: 13px;
    font-weight: 900;
    color: ${theme.colors.text};
  }
`;

const MetricRow = styled.div`
  display: flex;
  justify-content: space-between;
  padding-top: 4px;
  border-top: 1px dashed ${theme.colors.border};
  font-size: 8px;
  font-weight: 800;
  color: ${theme.colors.textLight};

  span.active-val {
    color: ${theme.colors.text};
    font-weight: 900;
  }
`;

const WaypointListScroll = styled.div`
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding-right: 4px;
`;

const WaypointRow = styled.div<{ $active: boolean; $reached: boolean }>`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 4px 8px;
  background: ${props =>
    props.$active
      ? '#FF950015'
      : props.$reached
      ? '#34C75915'
      : 'white'};
  border: 1px solid ${props =>
    props.$active
      ? '#FF9500'
      : props.$reached
      ? '#34C759'
      : theme.colors.border};
  border-radius: 6px;
  font-size: 8px;
  font-weight: 800;
`;

const WaypointInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  .order {
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: ${theme.colors.text};
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 8px;
    font-weight: 900;
  }
  .coords {
    color: ${theme.colors.text};
  }
`;

const DeleteBtn = styled.button`
  background: none;
  border: none;
  color: ${theme.colors.textLight};
  cursor: pointer;
  padding: 2px;
  display: flex;
  align-items: center;
  &:hover {
    color: ${theme.colors.primaryDark};
  }
`;

const JoystickWrapper = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${theme.colors.background};
  padding: 10px;
  border-radius: 50%;
  border: 3px dashed ${theme.colors.border};
  margin: auto;
`;

const ActionButtonGroup = styled.div`
  display: flex;
  gap: 6px;
  width: 100%;
  margin-top: 6px;
`;

const ActionButton = styled.button<{ $variant?: 'primary' | 'danger' | 'secondary' | 'success' }>`
  flex: 1;
  background: ${props =>
    props.$variant === 'secondary'
      ? theme.colors.background
      : props.$variant === 'danger'
      ? theme.colors.primaryDark
      : props.$variant === 'success'
      ? theme.colors.success
      : theme.colors.primary};
  color: ${props => (props.$variant === 'secondary' ? theme.colors.text : 'white')};
  border: ${props => (props.$variant === 'secondary' ? `2px solid ${theme.colors.border}` : 'none')};
  border-radius: ${theme.radius.md};
  padding: 9px 8px;
  font-weight: 900;
  text-transform: uppercase;
  font-size: 9px;
  letter-spacing: 0.5px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    filter: brightness(1.05);
  }

  &:active {
    transform: translateY(1px);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const NoticeBox = styled.div`
  background: white;
  border: 1px dashed ${theme.colors.border};
  border-radius: 6px;
  padding: 8px 10px;
  font-size: 8px;
  font-weight: 700;
  color: ${theme.colors.textLight};
  line-height: 1.3;
  text-align: center;
`;

export default function ManualControl({
  mode = 'manual',
  onModeChange,
  targetPoint,
  onClearTarget,
  onSetTarget,
  waypoints = [],
  activeWaypointIndex = 0,
  onAddWaypointAtRobot,
  onRemoveWaypoint,
  onClearWaypoints,
  onSkipWaypoint,
  robotPose = { x: 0, y: 0, yaw: 0 },
  isNavigating = false,
  onStartNavigation,
  onCancelNavigation,
  onCompleteInspection,
  hasSavedMap = false,
  isRecallMode = false,
}: ManualControlProps) {
  const [internalMode, setInternalMode] = useState<'manual' | 'autonomous'>('manual');
  const currentMode = mode || internalMode;

  const setMode = (newMode: 'manual' | 'autonomous') => {
    if (onModeChange) onModeChange(newMode);
    else setInternalMode(newMode);

    const ros = RosConnection.getInstance();
    const overrideTopic = ros.createTopic('/manual_override', 'std_msgs/Bool');
    if (overrideTopic) {
      overrideTopic.publish({ data: newMode === 'manual' });
    }
  };

  const handleMove = (event: any) => {
    if (currentMode !== 'manual' || isRecallMode) return;
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
    if (currentMode !== 'manual' || isRecallMode) return;
    const ros = RosConnection.getInstance();
    const cmdVel = ros.createTopic('/cmd_vel', 'geometry_msgs/Twist');
    if (cmdVel) {
      cmdVel.publish({
        linear: { x: 0, y: 0, z: 0 },
        angular: { x: 0, y: 0, z: 0 }
      });
    }
  };

  const handleReturnToBase = () => {
    if (isRecallMode) return;
    const basePoint = { x: 0, y: 0 };
    if (onSetTarget) onSetTarget(basePoint);

    const ros = RosConnection.getInstance();
    const emergencyTopic = ros.createTopic('/emergency_return', 'std_msgs/Bool');
    if (emergencyTopic) {
      emergencyTopic.publish({ data: true });
    }

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
  };

  const activeWP = waypoints[activeWaypointIndex] || null;
  const currentTarget = activeWP ? { x: activeWP.x, y: activeWP.y } : targetPoint;

  const distance = currentTarget
    ? Math.hypot(currentTarget.x - robotPose.x, currentTarget.y - robotPose.y).toFixed(2)
    : '--';

  const bearing = currentTarget
    ? Math.round((Math.atan2(currentTarget.y - robotPose.y, currentTarget.x - robotPose.x) * 180) / Math.PI)
    : null;

  return (
    <Container>
      <Header>
        <Title>INSPECTION_CONTROL_UNIT</Title>
        {onClearWaypoints && (
          <span
            style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}
            title="Reset waypoints"
            onClick={onClearWaypoints}
          >
            <RotateCcw size={14} color={theme.colors.textLight} />
          </span>
        )}
      </Header>

      <ModeTabs>
        <ModeTabButton
          $active={currentMode === 'manual'}
          onClick={() => setMode('manual')}
          disabled={isRecallMode}
        >
          <Compass size={12} />
          MANUAL SURVEY
        </ModeTabButton>
        <ModeTabButton
          $active={currentMode === 'autonomous'}
          onClick={() => setMode('autonomous')}
          disabled={isRecallMode}
        >
          <Navigation2 size={12} />
          AUTONOMOUS ({waypoints.length})
        </ModeTabButton>
      </ModeTabs>

      {currentMode === 'autonomous' ? (
        <PanelBody>
          <Card>
            <CardHeader>
              <CardLabel>
                {activeWP ? `Active: WP ${activeWP.order}` : 'Inspection Target'}
              </CardLabel>
              <StatusTag
                $color={
                  isNavigating
                    ? '#FF9500'
                    : activeWP
                    ? theme.colors.primary
                    : theme.colors.textLight
                }
              >
                {isNavigating
                  ? 'TRANSIT IN PROGRESS'
                  : activeWP
                  ? 'READY TO DISPATCH'
                  : 'CLICK MAP TO ADD WP'}
              </StatusTag>
            </CardHeader>

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
              <span>DIST TO NEXT WP:</span>
              <span className="active-val">{distance} m</span>
            </MetricRow>
            <MetricRow>
              <span>TARGET BEARING:</span>
              <span className="active-val">{bearing !== null ? `${bearing}°` : '--'}</span>
            </MetricRow>
          </Card>

          <WaypointListScroll>
            {waypoints.length === 0 ? (
              <NoticeBox>
                {hasSavedMap
                  ? 'Click anywhere on the map to define inspection waypoints for the robot to patrol.'
                  : 'First deployment: perform a Manual Survey to generate the map, or click the map directly to place waypoints.'}
              </NoticeBox>
            ) : (
              waypoints.map((wp, idx) => {
                const isActive = idx === activeWaypointIndex;
                const isReached = wp.status === 'reached';
                return (
                  <WaypointRow key={wp.id} $active={isActive} $reached={isReached}>
                    <WaypointInfo>
                      <div className="order">{isReached ? '✓' : wp.order}</div>
                      <div className="coords">
                        WP {wp.order} [{wp.x.toFixed(2)}, {wp.y.toFixed(2)}]
                      </div>
                    </WaypointInfo>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <StatusTag
                        $color={
                          isReached
                            ? '#34C759'
                            : isActive
                            ? '#FF9500'
                            : theme.colors.textLight
                        }
                      >
                        {isReached ? 'DONE' : isActive ? 'NEXT' : 'QUEUED'}
                      </StatusTag>
                      {onRemoveWaypoint && !isRecallMode && (
                        <DeleteBtn
                          type="button"
                          onClick={() => onRemoveWaypoint(wp.id)}
                          title="Remove waypoint"
                        >
                          <Trash2 size={10} />
                        </DeleteBtn>
                      )}
                    </div>
                  </WaypointRow>
                );
              })
            )}
          </WaypointListScroll>

          <ActionButtonGroup>
            {onAddWaypointAtRobot && !isRecallMode && (
              <ActionButton
                $variant="secondary"
                onClick={onAddWaypointAtRobot}
                title="Save current robot position as a waypoint"
              >
                <PlusCircle size={12} />
                + Add at Robot
              </ActionButton>
            )}

            {isNavigating ? (
              <ActionButton $variant="danger" onClick={onCancelNavigation}>
                <XCircle size={12} />
                Pause Transit
              </ActionButton>
            ) : (
              <ActionButton
                $variant="primary"
                disabled={waypoints.length === 0 || isRecallMode}
                onClick={onStartNavigation}
              >
                <Play size={12} />
                Start Patrol
              </ActionButton>
            )}

            {onSkipWaypoint && isNavigating && (
              <ActionButton $variant="secondary" onClick={onSkipWaypoint} title="Skip to next waypoint">
                <SkipForward size={12} />
              </ActionButton>
            )}
          </ActionButtonGroup>
        </PanelBody>
      ) : (
        <PanelBody style={{ justifyContent: 'center', alignItems: 'center' }}>
          <NoticeBox style={{ marginBottom: 4 }}>
            {!hasSavedMap
              ? 'INITIAL MAPPING PHASE: Pilot robot manually using joystick or keyboard to map the environment and record baseline gas levels.'
              : 'MANUAL RECONNAISSANCE: Manual override active. You can pilot the robot or drop inspection points at current locations.'}
          </NoticeBox>

          <JoystickWrapper>
            <Joystick
              size={105}
              sticky={false}
              baseColor={theme.colors.background}
              stickColor={theme.colors.primary}
              move={handleMove}
              stop={handleStop}
            />
          </JoystickWrapper>

          <ActionButtonGroup>
            {onAddWaypointAtRobot && !isRecallMode && (
              <ActionButton $variant="secondary" onClick={onAddWaypointAtRobot}>
                <MapPin size={12} />
                Drop WP
              </ActionButton>
            )}
            <ActionButton $variant="danger" onClick={handleStop}>
              <AlertTriangle size={12} />
              Stop
            </ActionButton>
            <ActionButton $variant="secondary" onClick={handleReturnToBase}>
              <Home size={12} />
              Base
            </ActionButton>
          </ActionButtonGroup>
        </PanelBody>
      )}

      {onCompleteInspection && !isRecallMode && (
        <ActionButton
          $variant="success"
          style={{ marginTop: 8 }}
          onClick={onCompleteInspection}
          title="Save the current map, gas heatmaps, and inspection metrics"
        >
          <Save size={12} />
          Complete & Save Inspection Cycle
        </ActionButton>
      )}
    </Container>
  );
}
