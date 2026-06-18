'use client';

import { useRef, useState, useMemo, useCallback, useEffect } from 'react';
import * as THREE from 'three';
import FirstPersonController from '@/components/FirstPersonController';
import { TrainingSceneConfig } from '@/types';

interface StairSlopeSceneProps {
  config: TrainingSceneConfig;
  isPaused: boolean;
  isActive: boolean;
  onCheckpointReached?: (index: number) => void;
  reachedCheckpoints?: number[];
}

// Checkpoints at key positions
const CHECKPOINTS = [
  { x: 0, y: 0, z: -8, label: '起点' },
  { x: 0, y: 3, z: -20, label: '坡顶' },
  { x: 0, y: 0.5, z: -32, label: '下坡后' },
  { x: 0, y: 3.5, z: -44, label: '楼梯顶' },
  { x: 0, y: 0, z: -56, label: '终点' },
];

function SlopedFloor({ start, end, width = 4 }: { start: [number, number, number]; end: [number, number, number]; width?: number }) {
  const dx = end[0] - start[0];
  const dy = end[1] - start[1];
  const dz = end[2] - start[2];
  const len = Math.sqrt(dx * dx + dz * dz);
  const angle = Math.atan2(dy, len);
  const cx = (start[0] + end[0]) / 2;
  const cy = (start[1] + end[1]) / 2;
  const cz = (start[2] + end[2]) / 2;
  const rotY = Math.atan2(dx, dz);

  return (
    <mesh position={[cx, cy, cz]} rotation={[angle, rotY, 0]} receiveShadow>
      <planeGeometry args={[width, len]} />
      <meshStandardMaterial color="#2a3a4a" roughness={0.8} />
    </mesh>
  );
}

function FlatFloor({ pos, size }: { pos: [number, number, number]; size: [number, number] }) {
  return (
    <mesh position={pos} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <planeGeometry args={size} />
      <meshStandardMaterial color="#1a2a3a" roughness={0.8} />
    </mesh>
  );
}

function Stairs({ startPos, endPos, steps = 8, width = 3 }: {
  startPos: [number, number, number]; endPos: [number, number, number]; steps?: number; width?: number;
}) {
  const dx = (endPos[0] - startPos[0]) / steps;
  const dy = (endPos[1] - startPos[1]) / steps;
  const dz = (endPos[2] - startPos[2]) / steps;
  const stepDepth = 0.5;

  const items = [];
  for (let i = 0; i < steps; i++) {
    const x = startPos[0] + dx * i;
    const y = startPos[1] + dy * i;
    const z = startPos[2] + dz * i;
    items.push(
      <mesh key={i} position={[x, y, z]} castShadow receiveShadow>
        <boxGeometry args={[width, dy, 0.6]} />
        <meshStandardMaterial color={i % 2 === 0 ? '#3a5068' : '#2a4058'} roughness={0.7} />
      </mesh>
    );
  }
  return <group>{items}</group>;
}

function CheckpointOrb({ position, reached }: { position: [number, number, number]; reached: boolean }) {
  return (
    <group position={position}>
      <mesh>
        <sphereGeometry args={[0.4, 24, 24]} />
        <meshStandardMaterial
          color={reached ? '#22c55e' : '#06b6d4'}
          emissive={reached ? '#22c55e' : '#06b6d4'}
          emissiveIntensity={reached ? 0.2 : 1.0}
          roughness={0.2}
        />
      </mesh>
      {!reached && <pointLight color="#06b6d4" intensity={1.0} distance={8} />}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.45, 0]}>
        <ringGeometry args={[0.45, 0.55, 32]} />
        <meshBasicMaterial color={reached ? '#22c55e' : '#06b6d4'} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

function SideRail({ start, end, side }: { start: [number, number, number]; end: [number, number, number]; side: -1 | 1 }) {
  const dx = end[0] - start[0];
  const dy = end[1] - start[1];
  const dz = end[2] - start[2];
  const len = Math.sqrt(dx * dx + dz * dz);
  const angle = Math.atan2(dy, len);
  const rotY = Math.atan2(dx, dz);
  const cx = (start[0] + end[0]) / 2 + side * 2;
  const cy = (start[1] + end[1]) / 2 + 1;
  const cz = (start[2] + end[2]) / 2;

  return (
    <mesh position={[cx, cy, cz]} rotation={[angle, rotY, 0]}>
      <boxGeometry args={[0.1, 0.15, len]} />
      <meshStandardMaterial color="#f59e0b" emissive="#f59e0b" emissiveIntensity={0.3} />
    </mesh>
  );
}

// Flash notification
function useCheckpointNotify(index: number | null) {
  useEffect(() => {
    if (index === null) return;
    const el = document.createElement('div');
    el.style.cssText = `
      position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);z-index:23;
      pointer-events:none;text-align:center;animation:cpPop 2s ease-out forwards;
    `;
    el.innerHTML = `<div style="font-size:36px;">✅</div><div style="background:rgba(15,23,42,0.95);border:2px solid #06b6d4;border-radius:14px;padding:8px 20px;"><p style="color:#06b6d4;font-size:16px;font-weight:bold;margin:0;">${CHECKPOINTS[index].label}</p></div>`;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 2200);
    return () => el.remove();
  }, [index]);
}

export default function StairSlopeScene({
  config, isPaused, isActive, onCheckpointReached, reachedCheckpoints = [],
}: StairSlopeSceneProps) {
  const [lastNotify, setLastNotify] = useState<number | null>(null);
  const triggered = useRef<Set<number>>(new Set());

  useEffect(() => { reachedCheckpoints.forEach(i => triggered.current.add(i)); }, [reachedCheckpoints]);

  const handlePos = useCallback((pos: THREE.Vector3) => {
    CHECKPOINTS.forEach((cp, i) => {
      if (triggered.current.has(i)) return;
      const dist = Math.sqrt((pos.x - cp.x) ** 2 + (pos.y - cp.y) ** 2 + (pos.z - cp.z) ** 2);
      if (dist < 3.5) { triggered.current.add(i); setLastNotify(i); onCheckpointReached?.(i); }
    });
  }, [onCheckpointReached]);

  useCheckpointNotify(lastNotify);

  return (
    <group>
      <ambientLight intensity={0.5} />
      <directionalLight position={[5, 8, 5]} intensity={0.7} />
      <hemisphereLight args={['#8899cc', '#223344', 0.3]} />

      {/* Flat ground start */}
      <FlatFloor pos={[0, 0, -4]} size={[8, 8]} />

      {/* Gentle ramp up (5° slope) */}
      <SlopedFloor start={[0, 0, -8]} end={[0, 3, -18]} width={4} />
      <SideRail start={[0, 0, -8]} end={[0, 3, -18]} side={-1} />
      <SideRail start={[0, 0, -8]} end={[0, 3, -18]} side={1} />

      {/* Flat platform at top */}
      <FlatFloor pos={[0, 3, -21]} size={[6, 6]} />

      {/* Gentle ramp down */}
      <SlopedFloor start={[0, 3, -24]} end={[0, 0.3, -34]} width={4} />
      <SideRail start={[0, 3, -24]} end={[0, 0.3, -34]} side={-1} />
      <SideRail start={[0, 3, -24]} end={[0, 0.3, -34]} side={1} />

      {/* Flat ground */}
      <FlatFloor pos={[0, 0.3, -37]} size={[6, 6]} />

      {/* Stairs going up (8 steps) */}
      <Stairs startPos={[0, 0.3, -40]} endPos={[0, 3.5, -46]} steps={8} width={3} />
      <SideRail start={[0, 0.3, -40]} end={[0, 3.5, -46]} side={-1} />
      <SideRail start={[0, 0.3, -40]} end={[0, 3.5, -46]} side={1} />

      {/* Platform at top */}
      <FlatFloor pos={[0, 3.5, -49]} size={[5, 5]} />

      {/* Stairs going down */}
      <Stairs startPos={[0, 3.5, -51]} endPos={[0, 0, -57]} steps={8} width={3} />
      <SideRail start={[0, 3.5, -51]} end={[0, 0, -57]} side={-1} />
      <SideRail start={[0, 3.5, -51]} end={[0, 0, -57]} side={1} />

      {/* Finish area */}
      <FlatFloor pos={[0, 0, -60]} size={[6, 6]} />
      <mesh position={[0, 0.02, -60]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[4, 2]} />
        <meshStandardMaterial color="#22c55e" emissive="#22c55e" emissiveIntensity={0.3} />
      </mesh>
      <pointLight position={[0, 2, -60]} color="#22c55e" intensity={2} distance={10} />

      {/* Checkpoints */}
      {CHECKPOINTS.map((cp, i) => (
        <CheckpointOrb key={i} position={[cp.x, cp.y + 1.5, cp.z]} reached={reachedCheckpoints.includes(i)} />
      ))}

      <FirstPersonController
        enabled={isActive && !isPaused}
        moveSpeed={1.6}
        turnSpeed={config.turnSpeedLimit}
        allowMovement={isActive && !isPaused}
        allowTurning={isActive && !isPaused}
        verticalMotion
        onPositionChange={handlePos}
        hintText="🖱️点击锁定 · WASD移动 · 鼠标转向 · 走完坡道+楼梯到达终点"
      />
    </group>
  );
}
