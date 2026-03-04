'use client';

import React, { useState } from 'react';
import styled from 'styled-components';
import { Thermometer, Zap, Wind, Droplets, Battery } from 'lucide-react';
import { theme } from '@/lib/theme';

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  height: 100%;
`;

const Card = styled.div`
  background: white;
  border-radius: ${theme.radius.lg};
  border: 4px solid ${theme.colors.border};
  padding: 16px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  transition: transform 0.2s;
  
  &:hover {
    transform: translateY(-2px);
    border-color: ${theme.colors.primary};
  }
`;

const IconWrapper = styled.div<{ color: string }>`
  width: 40px;
  height: 40px;
  border-radius: 8px;
  background: white;
  border: 2px solid ${props => props.color};
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${props => props.color};
`;

const Label = styled.div`
  font-size: 10px;
  font-weight: 800;
  color: ${theme.colors.textLight};
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const Value = styled.div`
  font-size: 24px;
  font-weight: 900;
  color: ${theme.colors.text};
  margin-top: 4px;
`;

const Unit = styled.span`
  font-size: 12px;
  color: ${theme.colors.textLight};
  margin-left: 4px;
`;

const BatteryBar = styled.div<{ level: number }>`
  width: 100%;
  height: 6px;
  background: ${theme.colors.background};
  border-radius: 3px;
  margin-top: 10px;
  overflow: hidden;
  position: relative;

  &::after {
    content: '';
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: ${props => props.level}%;
    background: ${props => props.level > 20 ? '#34C759' : '#FF3B30'};
    transition: width 0.5s ease;
  }
`;

function SensorCard({ label, value, unit, icon, color }: any) {
  return (
    <Card>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <IconWrapper color={color}>{icon}</IconWrapper>
        <Label>{label}</Label>
      </div>
      <div>
        <Value>
          {value}
          <Unit>{unit}</Unit>
        </Value>
        {label === 'Battery' && <BatteryBar level={value} />}
      </div>
    </Card>
  );
}

export default function SensorGrid() {
  return (
    <Grid>
      <SensorCard
        label="Temp"
        value={42.5}
        unit="°C"
        icon={<Thermometer size={20} />}
        color={theme.colors.primary}
      />
      <SensorCard
        label="Gas"
        value={12.8}
        unit="ppm"
        icon={<Wind size={20} />}
        color={theme.colors.primary}
      />
      <SensorCard
        label="Battery"
        value={85}
        unit="%"
        icon={<Battery size={20} />}
        color="#34C759"
      />
      <SensorCard
        label="Hum"
        value={38}
        unit="%"
        icon={<Droplets size={20} />}
        color={theme.colors.primary}
      />
    </Grid>
  );
}
