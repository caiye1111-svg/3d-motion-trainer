'use client';

import { useRef, useState, useMemo, useEffect, useCallback } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import FirstPersonController from '@/components/FirstPersonController';
import { TrainingSceneConfig } from '@/types';

interface MazeSearchSceneProps {
  config: TrainingSceneConfig;
  isPaused: boolean;
  isActive: boolean;
  onOrbCollected?: (index: number) => void;
  collectedOrbs?: number[];
}

// Simple open layout with rooms connected by wide corridors
// No confusing maze walls — just rooms with different colors and clear paths
const ROOMS = [
  { name: '起点', x: 0, z: 0, w: 6, d: 6, color: '#1a2535' },
  { name: '蓝光房', x: 8, z: -8, w: 5, d: 5, color: '#1a2540' },
  { name: '黄光房', x: -8, z: -8, w: 5, d: 5, color: '#251a20' },
  { name: '红光房', x: 8, z: 8, w: 5, d: 5, color: '#201a25' },
  { name: '绿光房', x: -8, z: 8, w: 5, d: 5, color: '#1a3020' },
];

const ORB_POSITIONS: Array<[number, number, number]> = [
  [0, 1.5, 0],     // Start room - easy to find
  [8, 1.5, -8],    // Blue room
  [-8, 1.5, -8],   // Yellow room
  [8, 1.5, 8],     // Red room
  [-8, 1.5, 8],    // Green room
];

const ORB_COLORS = ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#a855f7'];

// === Room ===
function RoomFloor({ x, z, w, d, color }: { x: number; z: number; w: number; d: number; color: string }) {
  return (
    <mesh position={[x, 0.01, z]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <planeGeometry args={[w, d]} />
      <meshStandardMaterial color={color} roughness={0.9} />
    </mesh>
  );
}

// === Glowing orb with beacon ===
function LightOrb({ position, color, collected, onCollect }: {
  position: [number, number, number]; color: string; collected: boolean; onCollect: () => void;
}) {
  if (collected) {
    return (
      <mesh position={[position[0], position[1] + 0.3, position[2]]}>
        <sphereGeometry args={[0.2, 8, 8]} />
        <meshStandardMaterial color="#334155" roughness={1} />
      </mesh>
    );
  }

  return (
    <group position={position}>
      {/* Glow sphere */}
      <mesh>
        <sphereGeometry args={[0.5, 32, 32]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={1.0} roughness={0.1} />
      </mesh>
      {/* Outer aura */}
      <mesh>
        <sphereGeometry args={[0.7, 16, 16]} />
        <meshBasicMaterial color={color} transparent opacity={0.15} />
      </mesh>
      {/* Ground ring */}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, -1.5, 0]}>
        <torusGeometry args={[1.2, 0.08, 8, 48]} />
        <meshBasicMaterial color={color} />
      </mesh>
      {/* Point light — visible from far away */}
      <pointLight color={color} intensity={2.5} distance={20} />
      {/* Beacon beam */}
      <mesh position={[0, 2, 0]}>
        <cylinderGeometry args={[0.1, 0.3, 4, 8]} />
        <meshBasicMaterial color={color} transparent opacity={0.15} />
      </mesh>
    </group>
  );
}

// === Floor arrow pointing toward nearest unfound orb ===
function GuideArrow({ from, to, color }: { from: THREE.Vector3; to: THREE.Vector3; color: string }) {
  const dir = new THREE.Vector3().subVectors(to, from);
  dir.y = 0;
  const len = dir.length();
  if (len < 1) return null;
  dir.normalize();
  const mid = new THREE.Vector3().addVectors(from, dir.clone().multiplyScalar(len * 0.3));
  const angle = Math.atan2(dir.x, dir.z);

  return (
    <mesh position={[mid.x, 0.03, mid.z]} rotation={[-Math.PI / 2, 0, angle]}>
      <planeGeometry args={[0.6, 1.2]} />
      <meshBasicMaterial color={color} transparent opacity={0.4} />
    </mesh>
  );
}

// === Wall segments between rooms ===
function WallSegment({ start, end, h = 2 }: { start: [number, number]; end: [number, number]; h?: number }) {
  const dx = end[0] - start[0];
  const dz = end[1] - start[1];
  const len = Math.sqrt(dx * dx + dz * dz);
  const cx = (start[0] + end[0]) / 2;
  const cz = (start[1] + end[1]) / 2;
  const angle = Math.atan2(dx, dz);

  return (
    <mesh position={[cx, h / 2, cz]} rotation={[0, angle, 0]}>
      <boxGeometry args={[len, h, 0.15]} />
      <meshStandardMaterial color="#5a6a7a" roughness={0.6} emissive="#5a6a7a" emissiveIntensity={0.2} />
    </mesh>
  );
}

// === Collect flash ===
function useCollectFlash(index: number) {
  useEffect(() => {
    if (index < 0) return;
    const el = document.createElement('div');
    el.style.cssText = `
      position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);
      z-index:23;pointer-events:none;text-align:center;
      animation: orbPop 1.5s ease-out forwards;
    `;
    el.innerHTML = `<div style="font-size:48px;">✨</div><div style="background:rgba(15,23,42,0.95);border:2px solid ${ORB_COLORS[index]};border-radius:14px;padding:8px 20px;"><p style="color:${ORB_COLORS[index]};font-size:16px;font-weight:bold;margin:0;">收集 ${index + 1}/5</p></div>`;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 1800);
    return () => el.remove();
  }, [index]);
}

if (typeof document !== 'undefined' && !document.getElementById('orb-anim')) {
  const s = document.createElement('style');
  s.id = 'orb-anim';
  s.textContent = '@keyframes orbPop{0%{opacity:0;transform:translate(-50%,-50%) scale(0.6)}30%{opacity:1;transform:translate(-50%,-50%) scale(1.1)}60%{transform:translate(-50%,-50%) scale(1)}100%{opacity:0}}';
  document.head.appendChild(s);
}

// === Main scene ===
export default function MazeSearchScene({
  config, isPaused, isActive, onOrbCollected, collectedOrbs = [],
}: MazeSearchSceneProps) {
  const { camera } = useThree();
  const [lastCollected, setLastCollected] = useState(-1);
  const triggered = useRef<Set<number>>(new Set(collectedOrbs));

  useEffect(() => { collectedOrbs.forEach(i => triggered.current.add(i)); }, [collectedOrbs]);

  // Proximity collection — walk within 2.5m to collect
  useFrame(() => {
    if (!isActive || isPaused) return;
    const pos = camera.position;

    // Orb collection
    ORB_POSITIONS.forEach((orbPos, i) => {
      if (triggered.current.has(i)) return;
      const dx = pos.x - orbPos[0];
      const dz = pos.z - orbPos[2];
      if (Math.sqrt(dx * dx + dz * dz) < 2.5) {
        triggered.current.add(i);
        setLastCollected(i);
        onOrbCollected?.(i);
      }
    });
  });

  // Find nearest unfound orb for guiding arrow
  const nearestOrbIndex = useMemo(() => {
    const pos = camera.position;
    let best = -1;
    let bestDist = Infinity;
    ORB_POSITIONS.forEach((orbPos, i) => {
      if (triggered.current.has(i)) return;
      const d = Math.sqrt((pos.x - orbPos[0]) ** 2 + (pos.z - orbPos[2]) ** 2);
      if (d < bestDist) { bestDist = d; best = i; }
    });
    return best;
  }, []); // eslint-disable-line

  // Wall layout - just enough to define rooms, wide paths between them
  const walls = useMemo(() => {
    const w: Array<[number, number, number, number]> = [];
    const add = (x1: number, z1: number, x2: number, z2: number) => w.push([x1, z1, x2, z2]);
    // Outer boundary
    add(-12, -12, 12, -12);
    add(12, -12, 12, 12);
    add(12, 12, -12, 12);
    add(-12, 12, -12, -12);
    // Internal dividers with gaps for corridors
    add(-3, -3, 3, -3);
    add(3, -3, 3, 3);
    add(3, 3, -3, 3);
    add(-3, 3, -3, -3);
    return w;
  }, []);

  useCollectFlash(lastCollected);

  return (
    <group>
      <ambientLight intensity={0.4} />
      <hemisphereLight args={['#334466', '#112233', 0.3]} />

      {/* Base ground */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[30, 30]} />
        <meshStandardMaterial color="#111827" roughness={1} />
      </mesh>

      {/* Room floors */}
      {ROOMS.map((r, i) => <RoomFloor key={i} {...r} />)}

      {/* Walls */}
      {walls.map((w, i) => <WallSegment key={i} start={[w[0], w[1]]} end={[w[2], w[3]]} />)}

      {/* Orbs */}
      {ORB_POSITIONS.map((pos, i) => (
        <LightOrb key={i} position={pos} color={ORB_COLORS[i]}
          collected={collectedOrbs.includes(i)} onCollect={() => {}} />
      ))}

      {/* Guide arrow to nearest unfound orb */}
      {nearestOrbIndex >= 0 && (
        <GuideArrow
          from={camera.position}
          to={new THREE.Vector3(...ORB_POSITIONS[nearestOrbIndex])}
          color={ORB_COLORS[nearestOrbIndex]}
        />
      )}

      {/* Start marker */}
      <mesh position={[0, 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.8, 1, 32]} />
        <meshBasicMaterial color="#22c55e" side={THREE.DoubleSide} />
      </mesh>

      <FirstPersonController
        enabled={isActive && !isPaused}
        moveSpeed={1.6}
        turnSpeed={config.turnSpeedLimit}
        allowMovement={isActive && !isPaused}
        allowTurning={isActive && !isPaused}
        hintText="🖱️点击锁定 · WASD移动 · 鼠标转头 · 走向发光球体收集"
      />
    </group>
  );
}
