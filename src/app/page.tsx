'use client';

import styled from 'styled-components';
import CameraView from "@/components/CameraView";
import MapView from "@/components/MapView";
import OdomStats from "@/components/OdomStats";
import SensorGrid from "@/components/SensorGrid";
import ManualControl from "@/components/ManualControl";
import { Bot, Power, Wifi, ShieldCheck, Settings } from "lucide-react";
import { theme } from "@/lib/theme";

const DashboardWrapper = styled.div`
  height: 100vh;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  overflow: hidden;
  background: ${theme.colors.background};
`;

const Header = styled.header`
  background: white;
  border: 4px solid ${theme.colors.primary};
  border-radius: ${theme.radius.lg};
  padding: 12px 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  box-shadow: ${theme.shadows.soft};
  flex-shrink: 0;
`;

const Branding = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
`;

const LogoBox = styled.div`
  background: ${theme.colors.primary};
  padding: 8px;
  border-radius: 8px;
  color: white;
`;

const TitleGroup = styled.div`
  h1 {
    font-size: 20px;
    font-weight: 900;
    text-transform: uppercase;
    color: ${theme.colors.text};
    span { color: ${theme.colors.primary}; }
    line-height: 1;
  }
  p {
    font-size: 9px;
    font-weight: 800;
    color: ${theme.colors.textLight};
    text-transform: uppercase;
    letter-spacing: 1px;
  }
`;

const Controls = styled.div`
  display: flex;
  gap: 32px;
  align-items: center;
`;

const StatusItem = styled.div<{ $color: string }>`
  display: flex;
  align-items: center;
  gap: 12px;
  .icon { color: ${props => props.$color}; }
  .text {
    line-height: 1;
    .label { font-size: 9px; font-weight: 900; color: ${theme.colors.textLight}; }
    .val { font-size: 11px; font-weight: 900; color: ${theme.colors.text}; }
  }
`;

const Grid = styled.main`
  flex: 1;
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  grid-template-rows: repeat(6, 1fr);
  gap: 24px;
  min-height: 0;
`;

const GridItem = styled.div<{ $span: number; $rowSpan: number }>`
  grid-column: span ${props => props.$span};
  grid-row: span ${props => props.$rowSpan};
  min-height: 0;
`;

export default function Home() {
  return (
    <DashboardWrapper>
      <Header>
        <Branding>
          <LogoBox><Bot size={32} /></LogoBox>
          <TitleGroup>
            <h1>Bomba <span>OS_v2</span></h1>
            <p>Industrial Robot Control Unit</p>
          </TitleGroup>
        </Branding>

        <Controls>
          <StatusItem $color={theme.colors.success}>
            <Wifi size={20} className="icon" />
            <div className="text">
              <div className="label">LINK_STATUS</div>
              <div className="val">ACTIVE_ENCRYPTED</div>
            </div>
          </StatusItem>
          <StatusItem $color={theme.colors.primary}>
            <ShieldCheck size={20} className="icon" />
            <div className="text">
              <div className="label">CORE_SEC</div>
              <div className="val">LOCKED</div>
            </div>
          </StatusItem>
          <div style={{ display: 'flex', gap: '12px' }}>
            <Settings size={20} color={theme.colors.textLight} style={{ cursor: 'pointer' }} />
            <Power size={20} color={theme.colors.primary} style={{ cursor: 'pointer' }} />
          </div>
        </Controls>
      </Header>

      <Grid>
        {/* Map View - Large Right Side (Widened) */}
        <GridItem $span={7} $rowSpan={4}>
          <MapView />
        </GridItem>

        {/* Camera View - (Reduced Width) */}
        <GridItem $span={5} $rowSpan={3}>
          <CameraView />
        </GridItem>

        {/* Manual Control - (New) */}
        <GridItem $span={3} $rowSpan={3}>
          <ManualControl />
        </GridItem>

        {/* Odom Stats */}
        <GridItem $span={2} $rowSpan={3}>
          <OdomStats />
        </GridItem>

        {/* Sensor Grid - Bottom */}
        <GridItem $span={7} $rowSpan={2}>
          <SensorGrid />
        </GridItem>
      </Grid>
    </DashboardWrapper>
  );
}
