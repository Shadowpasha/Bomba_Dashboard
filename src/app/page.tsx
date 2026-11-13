'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import styled from 'styled-components';
import CameraView from "@/components/CameraView";
import MapView from "@/components/MapView";
import OdomStats from "@/components/OdomStats";
import SensorGrid from "@/components/SensorGrid";
import ManualControl from "@/components/ManualControl";
import {
  Bot,
  Power,
  Wifi,
  ShieldCheck,
  Settings,
  BatteryCharging,
  Navigation2,
  History,
  PlusCircle,
  CheckCircle2,
  ArrowLeft,
  Layers,
  MapPin
} from "lucide-react";
import { theme } from "@/lib/theme";
import RosConnection from "@/lib/ros/RosConnection";
import {
  InspectionRecord,
  InspectionWaypoint,
  SavedOccupancyMap,
  loadInspections,
  saveInspections,
  createNewInspection,
  getLatestSavedMap,
  getStoredActiveInspectionId,
  setStoredActiveInspectionId
} from "@/lib/inspections";
import {
  GasHeatmapStores,
  serializeHeatmapStores,
  GAS_SENSORS
} from "@/lib/gasHeatmap";

interface Point {
  x: number;
  y: number;
}

const DashboardWrapper = styled.div`
  height: 100vh;
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  overflow: hidden;
  background: ${theme.colors.background};
`;

const Header = styled.header`
  background: white;
  border: 4px solid ${theme.colors.primary};
  border-radius: ${theme.radius.lg};
  padding: 10px 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  box-shadow: ${theme.shadows.soft};
  flex-shrink: 0;
  gap: 16px;
`;

const Branding = styled.div`
  display: flex;
  align-items: center;
  gap: 14px;
`;

const LogoBox = styled.div`
  background: ${theme.colors.primary};
  padding: 8px;
  border-radius: 8px;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const TitleGroup = styled.div`
  h1 {
    font-size: 19px;
    font-weight: 900;
    text-transform: uppercase;
    color: ${theme.colors.text};
    span { color: ${theme.colors.primary}; }
    line-height: 1;
  }
  p {
    font-size: 8.5px;
    font-weight: 800;
    color: ${theme.colors.textLight};
    text-transform: uppercase;
    letter-spacing: 1px;
  }
`;

const InspectionSelectorBar = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  background: ${theme.colors.background};
  border: 2px solid ${theme.colors.border};
  border-radius: ${theme.radius.md};
  padding: 4px 10px;
`;

const InspectionSelect = styled.select`
  background: white;
  border: 1px solid ${theme.colors.border};
  border-radius: 6px;
  padding: 5px 8px;
  font-size: 10px;
  font-weight: 800;
  color: ${theme.colors.text};
  cursor: pointer;
  outline: none;
`;

const MiniButton = styled.button<{ $primary?: boolean }>`
  background: ${props => props.$primary ? theme.colors.primary : 'white'};
  color: ${props => props.$primary ? 'white' : theme.colors.text};
  border: 1px solid ${props => props.$primary ? theme.colors.primary : theme.colors.border};
  border-radius: 6px;
  padding: 5px 8px;
  font-size: 9px;
  font-weight: 900;
  text-transform: uppercase;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 4px;
  transition: all 0.15s ease;

  &:hover {
    filter: brightness(1.05);
  }
`;

const Controls = styled.div`
  display: flex;
  gap: 20px;
  align-items: center;
`;

const StatusItem = styled.div<{ $color: string }>`
  display: flex;
  align-items: center;
  gap: 8px;
  .icon { color: ${props => props.$color}; }
  .text {
    line-height: 1.1;
    .label { font-size: 8px; font-weight: 900; color: ${theme.colors.textLight}; }
    .val { font-size: 10px; font-weight: 900; color: ${theme.colors.text}; }
  }
`;

const RecallBanner = styled.div`
  background: #007AFF;
  color: white;
  border-radius: ${theme.radius.md};
  padding: 8px 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 11px;
  font-weight: 800;
  box-shadow: 0 2px 8px rgba(0, 122, 255, 0.25);
  flex-shrink: 0;
`;

const Grid = styled.main`
  flex: 1;
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  grid-template-rows: repeat(6, 1fr);
  gap: 16px;
  min-height: 0;
`;

const GridItem = styled.div<{ $span: number; $rowSpan: number }>`
  grid-column: span ${props => props.$span};
  grid-row: span ${props => props.$rowSpan};
  min-height: 0;
`;

export default function Home() {
  const [inspections, setInspections] = useState<InspectionRecord[]>([]);
  const [activeInspectionId, setActiveInspectionId] = useState<string>('INSP-001');
  const [recallingInspectionId, setRecallingInspectionId] = useState<string | null>(null);

  const [mode, setMode] = useState<'manual' | 'autonomous'>('manual');
  const [waypoints, setWaypoints] = useState<InspectionWaypoint[]>([]);
  const [activeWaypointIndex, setActiveWaypointIndex] = useState<number>(0);
  const [targetPoint, setTargetPoint] = useState<Point | null>(null);
  const [robotPose, setRobotPose] = useState({ x: 0, y: 0, yaw: 0 });
  const [isNavigating, setIsNavigating] = useState(false);

  const [cycleDistance, setCycleDistance] = useState<number>(0);
  const [cycleDuration, setCycleDuration] = useState<number>(0);
  const lastPoseRef = useRef<{ x: number; y: number } | null>(null);

  const liveMapRef = useRef<SavedOccupancyMap | null>(null);
  const liveHeatmapStoresRef = useRef<GasHeatmapStores | null>(null);
  const peakGasRef = useRef<Record<string, number>>({
    methane: 0,
    flammable: 0,
    airQuality: 0,
  });

  // 1. Initialize or load inspections from storage on mount
  useEffect(() => {
    const loaded = loadInspections();
    if (loaded.length > 0) {
      setInspections(loaded);
      const storedActiveId = getStoredActiveInspectionId();
      const currentActive = loaded.find(i => i.id === storedActiveId && i.status === 'active')
        || loaded.find(i => i.status === 'active')
        || loaded[loaded.length - 1];

      setActiveInspectionId(currentActive.id);
      setMode(currentActive.mode || 'manual');
      setWaypoints(currentActive.waypoints || []);
      setCycleDistance(currentActive.distanceMeters || 0);
      setCycleDuration(currentActive.durationSeconds || 0);
      if (currentActive.savedMap) {
        liveMapRef.current = currentActive.savedMap;
      }
    } else {
      // First time deployment: Cycle #1, initial manual survey
      const initialCycle = createNewInspection(1, 'manual', null, 'Inspection Cycle #1 - Baseline Scan & Mapping');
      const initialList = [initialCycle];
      setInspections(initialList);
      setActiveInspectionId(initialCycle.id);
      setStoredActiveInspectionId(initialCycle.id);
      saveInspections(initialList);
      setMode('manual');
    }
  }, []);

  // 2. Inspection duration counter for active inspection
  useEffect(() => {
    if (recallingInspectionId) return; // Paused in historical recall mode
    const timer = setInterval(() => {
      setCycleDuration(prev => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [recallingInspectionId]);

  // 3. Odometry subscription & distance calculation
  useEffect(() => {
    const ros = RosConnection.getInstance();
    const odomTopic = ros.createTopic('/odom', 'nav_msgs/Odometry');

    if (odomTopic) {
      odomTopic.subscribe((message: any) => {
        const pose = message.pose.pose;
        const q = pose.orientation;
        const yaw = Math.atan2(2.0 * (q.w * q.z + q.x * q.y), 1.0 - 2.0 * (q.y * q.y + q.z * q.z));
        const currentPos = {
          x: pose.position.x,
          y: pose.position.y,
          yaw: yaw
        };
        setRobotPose(currentPos);

        // Compute incremental distance
        if (lastPoseRef.current) {
          const step = Math.hypot(currentPos.x - lastPoseRef.current.x, currentPos.y - lastPoseRef.current.y);
          if (step > 0.02 && step < 5.0) { // filter out teleport noise
            setCycleDistance(prev => prev + step);
          }
        }
        lastPoseRef.current = { x: currentPos.x, y: currentPos.y };
      });
    }

    // Subscribe to sensor telemetry to monitor peak levels for active cycle
    const sensorCleanups = GAS_SENSORS.map(sensor => {
      const topic = ros.createTopic(sensor.topic, 'std_msgs/Float32');
      if (topic) {
        topic.subscribe((msg: any) => {
          if (typeof msg.data === 'number' && Number.isFinite(msg.data)) {
            const current = peakGasRef.current[sensor.id] || 0;
            if (msg.data > current) {
              peakGasRef.current[sensor.id] = msg.data;
            }
          }
        });
      }
      return topic;
    });

    return () => {
      if (odomTopic) odomTopic.unsubscribe();
      sensorCleanups.forEach(t => {
        if (t) t.unsubscribe();
      });
    };
  }, []);

  // Dispatch goal to ROS navigation stack
  const dispatchGoalToRos = useCallback((point: Point) => {
    const ros = RosConnection.getInstance();
    const angle = Math.atan2(point.y - robotPose.y, point.x - robotPose.x);

    const goalTopic = ros.createTopic('/move_base_simple/goal', 'geometry_msgs/PoseStamped');
    if (goalTopic) {
      goalTopic.publish({
        header: { frame_id: 'map', stamp: { sec: Math.floor(Date.now() / 1000), nsec: 0 } },
        pose: {
          position: { x: point.x, y: point.y, z: 0 },
          orientation: { x: 0, y: 0, z: Math.sin(angle / 2), w: Math.cos(angle / 2) }
        }
      });
    }

    const goalPoseTopic = ros.createTopic('/goal_pose', 'geometry_msgs/PoseStamped');
    if (goalPoseTopic) {
      goalPoseTopic.publish({
        header: { frame_id: 'map', stamp: { sec: Math.floor(Date.now() / 1000), nsec: 0 } },
        pose: {
          position: { x: point.x, y: point.y, z: 0 },
          orientation: { x: 0, y: 0, z: Math.sin(angle / 2), w: Math.cos(angle / 2) }
        }
      });
    }

    const p2pStartTopic = ros.createTopic('/point_to_point/start', 'std_msgs/Bool');
    if (p2pStartTopic) {
      p2pStartTopic.publish({ data: true });
    }
  }, [robotPose]);

  // 4. Autonomous Waypoint Navigation Progression
  useEffect(() => {
    if (!isNavigating || waypoints.length === 0 || mode !== 'autonomous') return;

    const currentWP = waypoints[activeWaypointIndex];
    if (!currentWP) {
      setIsNavigating(false);
      return;
    }

    const distToWp = Math.hypot(currentWP.x - robotPose.x, currentWP.y - robotPose.y);

    // If robot is within 0.45m of current waypoint, mark reached and advance
    if (distToWp < 0.45 && currentWP.status !== 'reached') {
      const updatedWaypoints = waypoints.map((wp, idx) => {
        if (idx === activeWaypointIndex) {
          return { ...wp, status: 'reached' as const, reachedAt: new Date().toISOString() };
        }
        return wp;
      });
      setWaypoints(updatedWaypoints);

      const nextIndex = activeWaypointIndex + 1;
      if (nextIndex < updatedWaypoints.length) {
        setActiveWaypointIndex(nextIndex);
        dispatchGoalToRos({ x: updatedWaypoints[nextIndex].x, y: updatedWaypoints[nextIndex].y });
      } else {
        // All waypoints completed
        setIsNavigating(false);
      }
    }
  }, [robotPose, isNavigating, waypoints, activeWaypointIndex, mode, dispatchGoalToRos]);

  // Handle adding waypoint from Map click
  const handleAddWaypoint = (point: Point) => {
    if (recallingInspectionId) return;
    const newWp: InspectionWaypoint = {
      id: `WP-${Date.now()}`,
      order: waypoints.length + 1,
      x: point.x,
      y: point.y,
      label: `Waypoint ${waypoints.length + 1}`,
      status: 'pending',
    };
    setWaypoints(prev => [...prev, newWp]);
    setTargetPoint(point);
  };

  // Handle adding waypoint at current robot position
  const handleAddWaypointAtRobot = () => {
    if (recallingInspectionId) return;
    const newWp: InspectionWaypoint = {
      id: `WP-${Date.now()}`,
      order: waypoints.length + 1,
      x: parseFloat(robotPose.x.toFixed(2)),
      y: parseFloat(robotPose.y.toFixed(2)),
      label: `Waypoint ${waypoints.length + 1}`,
      status: 'pending',
    };
    setWaypoints(prev => [...prev, newWp]);
  };

  const handleRemoveWaypoint = (id: string) => {
    setWaypoints(prev => {
      const filtered = prev.filter(w => w.id !== id);
      return filtered.map((w, idx) => ({ ...w, order: idx + 1 }));
    });
  };

  const handleClearWaypoints = () => {
    setWaypoints([]);
    setActiveWaypointIndex(0);
    setTargetPoint(null);
    setIsNavigating(false);
  };

  const handleStartNavigation = () => {
    if (waypoints.length === 0) return;
    setIsNavigating(true);
    const targetWp = waypoints[activeWaypointIndex] || waypoints[0];
    dispatchGoalToRos({ x: targetWp.x, y: targetWp.y });
  };

  const handleCancelNavigation = () => {
    setIsNavigating(false);
    const ros = RosConnection.getInstance();
    const cancelTopic = ros.createTopic('/point_to_point/cancel', 'std_msgs/Bool');
    if (cancelTopic) cancelTopic.publish({ data: true });
  };

  const handleSkipWaypoint = () => {
    if (activeWaypointIndex + 1 < waypoints.length) {
      const nextIdx = activeWaypointIndex + 1;
      setActiveWaypointIndex(nextIdx);
      dispatchGoalToRos({ x: waypoints[nextIdx].x, y: waypoints[nextIdx].y });
    } else {
      setIsNavigating(false);
    }
  };

  // Complete and save active inspection cycle
  const handleCompleteInspection = () => {
    const active = inspections.find(i => i.id === activeInspectionId);
    if (!active) return;

    const heatmapsSerialized = liveHeatmapStoresRef.current
      ? serializeHeatmapStores(liveHeatmapStoresRef.current)
      : active.gasHeatmaps;

    const totalSamples = Object.values(heatmapsSerialized).reduce((acc, curr) => acc + curr.length, 0);

    const updatedCycle: InspectionRecord = {
      ...active,
      status: 'completed',
      completedAt: new Date().toISOString(),
      distanceMeters: cycleDistance,
      durationSeconds: cycleDuration,
      savedMap: liveMapRef.current || active.savedMap,
      gasHeatmaps: heatmapsSerialized,
      waypoints: waypoints,
      peakGas: {
        methane: peakGasRef.current.methane,
        flammable: peakGasRef.current.flammable,
        airQuality: peakGasRef.current.airQuality,
      },
      sampleCount: totalSamples,
    };

    const nextList = inspections.map(i => i.id === active.id ? updatedCycle : i);
    setInspections(nextList);
    saveInspections(nextList);
    alert(`Inspection Cycle #${active.cycleNumber} successfully saved with ${totalSamples} gas samples and mapped layout.`);
  };

  // Start a new inspection cycle
  const handleStartNewCycle = () => {
    // If current inspection has unsaved data, prompt or save
    const latestSavedMap = liveMapRef.current || getLatestSavedMap(inspections);
    const nextCycleNum = inspections.length + 1;
    const newCycle = createNewInspection(
      nextCycleNum,
      'autonomous',
      latestSavedMap,
      `Inspection Cycle #${nextCycleNum} - Autonomous Waypoint Patrol`
    );

    const nextList = [...inspections, newCycle];
    setInspections(nextList);
    setActiveInspectionId(newCycle.id);
    setStoredActiveInspectionId(newCycle.id);
    setRecallingInspectionId(null);
    saveInspections(nextList);

    // Reset cycle operational states
    setWaypoints([]);
    setActiveWaypointIndex(0);
    setTargetPoint(null);
    setIsNavigating(false);
    setCycleDistance(0);
    setCycleDuration(0);
    setMode('autonomous');
    peakGasRef.current = { methane: 0, flammable: 0, airQuality: 0 };
    lastPoseRef.current = null;
  };

  // Current active inspection record
  const currentActiveRecord = inspections.find(i => i.id === activeInspectionId);
  // Recalled historical inspection record
  const recalledRecord = recallingInspectionId
    ? inspections.find(i => i.id === recallingInspectionId) || null
    : null;

  const isRecallMode = Boolean(recalledRecord);
  const activeCycleNumber = currentActiveRecord ? currentActiveRecord.cycleNumber : 1;
  const hasBaseMap = Boolean(liveMapRef.current || currentActiveRecord?.savedMap);

  return (
    <DashboardWrapper>
      <Header>
        <Branding>
          <LogoBox><Bot size={28} /></LogoBox>
          <TitleGroup>
            <h1>Mrayap <span>OS_v2</span></h1>
            <p>Industrial Robot Inspection Unit</p>
          </TitleGroup>
        </Branding>

        <InspectionSelectorBar>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <History size={14} color={theme.colors.primary} />
            <span style={{ fontSize: '9px', fontWeight: 900, textTransform: 'uppercase', color: theme.colors.text }}>
              Inspection Cycle:
            </span>
          </div>

          <InspectionSelect
            value={recallingInspectionId || activeInspectionId}
            onChange={(e) => {
              const val = e.target.value;
              if (val === activeInspectionId) {
                setRecallingInspectionId(null);
              } else {
                setRecallingInspectionId(val);
              }
            }}
          >
            <optgroup label="Active Inspection">
              {currentActiveRecord && (
                <option value={currentActiveRecord.id}>
                  Active: Cycle #{currentActiveRecord.cycleNumber} ({currentActiveRecord.mode.toUpperCase()})
                </option>
              )}
            </optgroup>
            {inspections.filter(i => i.id !== activeInspectionId).length > 0 && (
              <optgroup label="Previous Saved Inspections">
                {inspections
                  .filter(i => i.id !== activeInspectionId)
                  .map(insp => (
                    <option key={insp.id} value={insp.id}>
                      Cycle #{insp.cycleNumber} - {new Date(insp.startedAt).toLocaleDateString()} ({insp.status})
                    </option>
                  ))}
              </optgroup>
            )}
          </InspectionSelect>

          <MiniButton $primary onClick={handleStartNewCycle} title="Begin a new inspection cycle">
            <PlusCircle size={11} />
            New Cycle
          </MiniButton>
        </InspectionSelectorBar>

        <Controls>
          <StatusItem $color={theme.colors.success}>
            <Wifi size={18} className="icon" />
            <div className="text">
              <div className="label">LINK_STATUS</div>
              <div className="val">ACTIVE_ENCRYPTED</div>
            </div>
          </StatusItem>

          <StatusItem $color="#34C759">
            <BatteryCharging size={18} className="icon" />
            <div className="text">
              <div className="label">SYS_BATTERY</div>
              <div className="val">88% (24.2V)</div>
            </div>
          </StatusItem>

          <StatusItem $color={mode === 'autonomous' ? '#FF9500' : theme.colors.primary}>
            <Navigation2 size={18} className="icon" />
            <div className="text">
              <div className="label">CYCLE_MODE</div>
              <div className="val">
                {isRecallMode
                  ? 'RECALL_ARCHIVE'
                  : mode === 'autonomous'
                  ? 'AUTONOMOUS_PATROL'
                  : 'MANUAL_SURVEY'}
              </div>
            </div>
          </StatusItem>

          <StatusItem $color={theme.colors.primary}>
            <ShieldCheck size={18} className="icon" />
            <div className="text">
              <div className="label">INSPECTION_STATE</div>
              <div className="val">{isRecallMode ? 'READ_ONLY' : isNavigating ? 'NAVIGATING' : 'READY'}</div>
            </div>
          </StatusItem>

          <div style={{ display: 'flex', gap: '10px' }}>
            <Settings size={18} color={theme.colors.textLight} style={{ cursor: 'pointer' }} />
            <Power size={18} color={theme.colors.primary} style={{ cursor: 'pointer' }} />
          </div>
        </Controls>
      </Header>

      {/* Historical Recall Mode Banner */}
      {isRecallMode && recalledRecord && (
        <RecallBanner>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <History size={16} />
            <span>
              HISTORICAL RECALL: Viewing Cycle #{recalledRecord.cycleNumber} ({recalledRecord.title}) recorded on {new Date(recalledRecord.startedAt).toLocaleString()}. Heat map and telemetry loaded from previous deployment.
            </span>
          </div>
          <MiniButton onClick={() => setRecallingInspectionId(null)}>
            <ArrowLeft size={11} />
            Return to Live Robot
          </MiniButton>
        </RecallBanner>
      )}

      <Grid>
        {/* Map View - Interactive Map, SLAM Grid, Gas Heatmaps, Waypoint Route */}
        <GridItem $span={7} $rowSpan={4}>
          <MapView
            mode={mode}
            targetPoint={targetPoint}
            onSetTarget={setTargetPoint}
            waypoints={waypoints}
            activeWaypointIndex={activeWaypointIndex}
            onAddWaypoint={handleAddWaypoint}
            robotPose={robotPose}
            isNavigating={isNavigating}
            savedMap={currentActiveRecord?.savedMap || null}
            recallInspection={recalledRecord}
            isRecallMode={isRecallMode}
            liveHeatmapStoresRef={liveHeatmapStoresRef}
            onLiveMapUpdate={(map) => {
              liveMapRef.current = map;
            }}
          />
        </GridItem>

        {/* Camera View */}
        <GridItem $span={5} $rowSpan={3}>
          <CameraView />
        </GridItem>

        {/* Motion & Inspection Control Unit */}
        <GridItem $span={3} $rowSpan={3}>
          <ManualControl
            mode={mode}
            onModeChange={setMode}
            targetPoint={targetPoint}
            onClearTarget={() => setTargetPoint(null)}
            onSetTarget={setTargetPoint}
            waypoints={waypoints}
            activeWaypointIndex={activeWaypointIndex}
            onAddWaypointAtRobot={handleAddWaypointAtRobot}
            onRemoveWaypoint={handleRemoveWaypoint}
            onClearWaypoints={handleClearWaypoints}
            onSkipWaypoint={handleSkipWaypoint}
            robotPose={robotPose}
            isNavigating={isNavigating}
            onStartNavigation={handleStartNavigation}
            onCancelNavigation={handleCancelNavigation}
            onCompleteInspection={handleCompleteInspection}
            hasSavedMap={hasBaseMap}
            isRecallMode={isRecallMode}
          />
        </GridItem>

        {/* Odometry & Inspection Cycle Stats */}
        <GridItem $span={2} $rowSpan={3}>
          <OdomStats
            targetPoint={waypoints[activeWaypointIndex] ? { x: waypoints[activeWaypointIndex].x, y: waypoints[activeWaypointIndex].y } : targetPoint}
            cycleNumber={isRecallMode && recalledRecord ? recalledRecord.cycleNumber : activeCycleNumber}
            distanceMeters={isRecallMode && recalledRecord ? recalledRecord.distanceMeters : cycleDistance}
            durationSeconds={isRecallMode && recalledRecord ? recalledRecord.durationSeconds : cycleDuration}
            isRecallMode={isRecallMode}
          />
        </GridItem>

        {/* Sensor Grid - 3 Gas & Air Quality Telemetry Readings */}
        <GridItem $span={7} $rowSpan={2}>
          <SensorGrid />
        </GridItem>
      </Grid>
    </DashboardWrapper>
  );
}
