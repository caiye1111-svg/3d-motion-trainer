'use client';

import { useRef, useState, useEffect } from 'react';
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

const ORBS: Array<{ pos: [number, number, number]; color: string }> = [
  { pos: [0, 1.2, -3], color: '#22c55e' },
  { pos: [6, 1.2, -6], color: '#3b82f6' },
  { pos: [-6, 1.2, -6], color: '#f59e0b' },
  { pos: [4, 1.2, -10], color: '#ef4444' },
  { pos: [-4, 1.2, -10], color: '#a855f7' },
];

function Orb({ pos, color, collected }: { pos: [number, number, number]; color: string; collected: boolean }) {
  if (collected) return null;
  return (
    <group position={pos}>
      <mesh>
        <sphereGeometry args={[0.4, 32, 32]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={1.0} roughness={0.1} />
      </mesh>
      <mesh><sphereGeometry args={[0.6, 16, 16]} /><meshBasicMaterial color={color} transparent opacity={0.12} /></mesh>
      <mesh rotation={[Math.PI/2, 0, 0]} position={[0, -1.2, 0]}>
        <torusGeometry args={[1.0, 0.06, 8, 32]} />
        <meshBasicMaterial color={color} />
      </mesh>
      <pointLight color={color} intensity={2.5} distance={15} />
    </group>
  );
}

function useCollectFlash(index: number) {
  useEffect(() => {
    if (index < 0) return;
    const el = document.createElement('div');
    el.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);z-index:23;pointer-events:none;text-align:center;animation:cpPop 1.5s ease-out forwards;';
    el.innerHTML = `<div style="font-size:40px;">✨</div><div style="background:rgba(15,23,42,0.95);border:2px solid ${ORBS[index].color};border-radius:14px;padding:8px 20px;"><p style="color:${ORBS[index].color};font-size:16px;font-weight:bold;margin:0;">收集 ${index+1}/5</p></div>`;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 1800);
    return () => el.remove();
  }, [index]);
}

if (typeof document !== 'undefined' && !document.getElementById('orb-anim2')) {
  const s = document.createElement('style'); s.id = 'orb-anim2';
  s.textContent = '@keyframes cpPop{0%{opacity:0;transform:translate(-50%,-50%) scale(0.6)}30%{opacity:1;transform:translate(-50%,-50%) scale(1.1)}60%{transform:translate(-50%,-50%) scale(1)}100%{opacity:0}}';
  document.head.appendChild(s);
}

export default function MazeSearchScene({
  config, isPaused, isActive, onOrbCollected, collectedOrbs = [],
}: MazeSearchSceneProps) {
  const { camera } = useThree();
  const [lastCollected, setLastCollected] = useState(-1);
  const triggered = useRef<Set<number>>(new Set(collectedOrbs));

  useEffect(() => { collectedOrbs.forEach(i => triggered.current.add(i)); }, [collectedOrbs]);

  useFrame(() => {
    if (!isActive || isPaused) return;
    const p = camera.position;
    ORBS.forEach((orb, i) => {
      if (triggered.current.has(i)) return;
      const d = Math.sqrt((p.x-orb.pos[0])**2 + (p.z-orb.pos[2])**2);
      if (d < 2.5) {
        triggered.current.add(i);
        setLastCollected(i);
        onOrbCollected?.(i);
      }
    });
  });

  useCollectFlash(lastCollected);

  return (
    <group>
      <ambientLight intensity={0.5} />
      <hemisphereLight args={['#334466', '#112233', 0.4]} />
      <directionalLight position={[0, 8, 0]} intensity={0.4} />

      {/* Large flat floor */}
      <mesh rotation={[-Math.PI/2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[20, 20]} />
        <meshStandardMaterial color="#1a2332" roughness={0.9} />
      </mesh>

      {/* Grid for spatial reference */}
      <gridHelper args={[20, 20, '#2a3a4a', '#1a2a3a']} position={[0, 0.01, -5]} />

      {/* Colored zones around each orb */}
      {ORBS.map((orb, i) => (
        <mesh key={`zone-${i}`} position={[orb.pos[0], 0.02, orb.pos[2]]} rotation={[-Math.PI/2, 0, 0]}>
          <planeGeometry args={[3, 3]} />
          <meshBasicMaterial color={orb.color} transparent opacity={collectedOrbs.includes(i) ? 0 : 0.08} />
        </mesh>
      ))}

      {/* Orbs */}
      {ORBS.map((orb, i) => (
        <Orb key={i} pos={orb.pos} color={orb.color} collected={collectedOrbs.includes(i)} />
      ))}

      {/* Start marker */}
      <mesh position={[0, 0.03, 0]} rotation={[-Math.PI/2, 0, 0]}>
        <ringGeometry args={[0.6, 0.8, 32]} />
        <meshBasicMaterial color="#22c55e" side={THREE.DoubleSide} />
      </mesh>

      <FirstPersonController
        enabled={isActive && !isPaused}
        moveSpeed={2.8}
        turnSpeed={40}
        allowMovement={isActive && !isPaused}
        allowTurning={isActive && !isPaused}
        hintText="🖱️点击画面锁定鼠标 · WASD移动 · 走向发光球体自动收集"
      />
    </group>
  );
}
