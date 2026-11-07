'use client';

import React, { useEffect, useState } from 'react';
import styled from 'styled-components';
import { Flame, ShieldAlert, Wind, Activity } from 'lucide-react';
import { theme } from '@/lib/theme';
import RosConnection from '@/lib/ros/RosConnection';

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  height: 100%;
`;

const Card = styled.div`
  background: white;
  border-radius: ${theme.radius.lg};
  border: 3px solid ${theme.colors.border};
  padding: 16px 18px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  box-shadow: ${theme.shadows.soft};
  transition: border-color 0.2s, box-shadow 0.2s;
  
  &:hover {
    border-color: ${theme.colors.primary};
    box-shadow: ${theme.shadows.medium};
  }
`;

const CardHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const HeaderLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
`;

const IconWrapper = styled.div<{ $color: string }>`
  width: 36px;
  height: 36px;
  border-radius: 8px;
  background: white;
  border: 2px solid ${props => props.$color};
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${props => props.$color};
  flex-shrink: 0;
`;

const TitleBlock = styled.div`
  line-height: 1.1;
`;

const Label = styled.div`
  font-size: 11px;
  font-weight: 900;
  color: ${theme.colors.text};
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const SubLabel = styled.div`
  font-size: 8px;
  font-weight: 700;
  color: ${theme.colors.textLight};
  text-transform: uppercase;
`;

const StatusPill = styled.span<{ $color: string }>`
  font-size: 8px;
  font-weight: 900;
  padding: 2px 7px;
  border-radius: 999px;
  background: ${props => props.$color}15;
  color: ${props => props.$color};
  border: 1px solid ${props => props.$color}40;
  letter-spacing: 0.4px;
`;

const MainValueRow = styled.div`
  display: flex;
  align-items: baseline;
  gap: 6px;
  margin-top: 6px;
  margin-bottom: 4px;
`;

const Value = styled.div`
  font-size: 28px;
  font-weight: 900;
  color: ${theme.colors.text};
  letter-spacing: -0.5px;
  line-height: 1;
`;

const Unit = styled.span`
  font-size: 11px;
  font-weight: 800;
  color: ${theme.colors.textLight};
`;

const LevelMeter = styled.div<{ $percent: number; $fillColor: string }>`
  width: 100%;
  height: 6px;
  background: ${theme.colors.background};
  border-radius: 3px;
  overflow: hidden;
  position: relative;
  margin-top: 6px;

  &::after {
    content: '';
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: ${props => Math.min(100, Math.max(0, props.$percent))}%;
    background: ${props => props.$fillColor};
    border-radius: 3px;
    transition: width 0.4s ease;
  }
`;

const GasMatrix = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 4px 8px;
  margin-top: 6px;
  padding-top: 6px;
  border-top: 1px dashed ${theme.colors.border};
`;

const GasItem = styled.div`
  display: flex;
  justify-content: space-between;
  font-size: 9px;
  font-weight: 700;
  color: ${theme.colors.textLight};

  span.val {
    color: ${theme.colors.text};
    font-weight: 800;
  }
`;

const FooterNote = styled.div`
  font-size: 8px;
  font-weight: 700;
  color: ${theme.colors.textLight};
  margin-top: 6px;
  display: flex;
  justify-content: space-between;
`;

export default function SensorGrid() {
  const [methanePpm, setMethanePpm] = useState(41.8);
  const [flammableLel, setFlammableLel] = useState(2.3);
  const [airQualityAqi, setAirQualityAqi] = useState(32);
  const [no2Ppb, setNo2Ppb] = useState(13.8);

  useEffect(() => {
    const ros = RosConnection.getInstance();

    const methaneTopic = ros.createTopic('/sensor/methane', 'std_msgs/Float32');
    if (methaneTopic) {
      methaneTopic.subscribe((message: any) => {
        if (typeof message.data === 'number') {
          setMethanePpm(parseFloat(message.data.toFixed(1)));
        }
      });
    }

    const flammableTopic = ros.createTopic('/sensor/flammable', 'std_msgs/Float32');
    if (flammableTopic) {
      flammableTopic.subscribe((message: any) => {
        if (typeof message.data === 'number') {
          setFlammableLel(parseFloat(message.data.toFixed(1)));
        }
      });
    }

    const airTopic = ros.createTopic('/sensor/air_quality', 'std_msgs/Float32');
    if (airTopic) {
      airTopic.subscribe((message: any) => {
        if (typeof message.data === 'number') {
          setAirQualityAqi(Math.round(message.data));
        }
      });
    }

    // Gentle ambient fluctuation when idle to demonstrate live telemetry
    const interval = setInterval(() => {
      setMethanePpm(prev => parseFloat((prev + (Math.random() * 0.6 - 0.3)).toFixed(1)));
      setFlammableLel(prev => parseFloat(Math.max(0.1, prev + (Math.random() * 0.2 - 0.1)).toFixed(1)));
      setNo2Ppb(prev => parseFloat((prev + (Math.random() * 0.4 - 0.2)).toFixed(1)));
    }, 2500);

    return () => {
      clearInterval(interval);
      if (methaneTopic) methaneTopic.unsubscribe();
      if (flammableTopic) flammableTopic.unsubscribe();
      if (airTopic) airTopic.unsubscribe();
    };
  }, []);

  return (
    <Grid>
      {/* 1. Methane Card */}
      <Card>
        <div>
          <CardHeader>
            <HeaderLeft>
              <IconWrapper $color="#FF9500">
                <Flame size={18} />
              </IconWrapper>
              <TitleBlock>
                <Label>Methane (CH₄)</Label>
                <SubLabel>Infrared Optical Gas Core</SubLabel>
              </TitleBlock>
            </HeaderLeft>
            <StatusPill $color={methanePpm < 500 ? theme.colors.success : theme.colors.danger}>
              {methanePpm < 500 ? 'NOMINAL' : 'ALERT'}
            </StatusPill>
          </CardHeader>

          <MainValueRow>
            <Value>{methanePpm}</Value>
            <Unit>PPM</Unit>
          </MainValueRow>

          <LevelMeter
            $percent={(methanePpm / 1000) * 100}
            $fillColor={methanePpm < 250 ? '#34C759' : methanePpm < 750 ? '#FF9500' : '#FF3B30'}
          />
        </div>

        <FooterNote>
          <span>THRESHOLD: 1,000 PPM</span>
          <span>CALIBRATED ACTIVE</span>
        </FooterNote>
      </Card>

      {/* 2. Flammable Gases Card */}
      <Card>
        <div>
          <CardHeader>
            <HeaderLeft>
              <IconWrapper $color={theme.colors.primary}>
                <ShieldAlert size={18} />
              </IconWrapper>
              <TitleBlock>
                <Label>Flammable Gases</Label>
                <SubLabel>Catalytic LEL Detector</SubLabel>
              </TitleBlock>
            </HeaderLeft>
            <StatusPill $color={flammableLel < 10 ? theme.colors.success : theme.colors.danger}>
              {flammableLel < 10 ? 'SAFE' : 'HAZARD'}
            </StatusPill>
          </CardHeader>

          <MainValueRow>
            <Value>{flammableLel}</Value>
            <Unit>% LEL</Unit>
          </MainValueRow>

          <LevelMeter
            $percent={(flammableLel / 25) * 100}
            $fillColor={flammableLel < 5 ? '#34C759' : flammableLel < 10 ? '#FF9500' : '#FF3B30'}
          />
        </div>

        <GasMatrix>
          <GasItem><span>LPG / PROPANE</span><span className="val">0.7%</span></GasItem>
          <GasItem><span>HYDROGEN (H₂)</span><span className="val">0.3%</span></GasItem>
          <GasItem><span>BUTANE</span><span className="val">0.6%</span></GasItem>
          <GasItem><span>ALARM GATE</span><span className="val">10% LEL</span></GasItem>
        </GasMatrix>
      </Card>

      {/* 3. General Air Quality Card */}
      <Card>
        <div>
          <CardHeader>
            <HeaderLeft>
              <IconWrapper $color="#34C759">
                <Wind size={18} />
              </IconWrapper>
              <TitleBlock>
                <Label>General Air Quality</Label>
                <SubLabel>Multi-Atmosphere Sensor</SubLabel>
              </TitleBlock>
            </HeaderLeft>
            <StatusPill $color={airQualityAqi <= 50 ? theme.colors.success : '#FF9500'}>
              {airQualityAqi <= 50 ? 'GOOD' : 'MODERATE'}
            </StatusPill>
          </CardHeader>

          <MainValueRow>
            <Value>{airQualityAqi}</Value>
            <Unit>AQI</Unit>
          </MainValueRow>

          <LevelMeter
            $percent={(airQualityAqi / 150) * 100}
            $fillColor={airQualityAqi <= 50 ? '#34C759' : '#FF9500'}
          />
        </div>

        <GasMatrix>
          <GasItem><span>NITROGEN (N₂)</span><span className="val">78.08%</span></GasItem>
          <GasItem><span>NITROGEN (NO₂)</span><span className="val">{no2Ppb} ppb</span></GasItem>
          <GasItem><span>OXYGEN (O₂)</span><span className="val">20.94%</span></GasItem>
          <GasItem><span>CARBON (CO₂)</span><span className="val">412 ppm</span></GasItem>
        </GasMatrix>
      </Card>
    </Grid>
  );
}
