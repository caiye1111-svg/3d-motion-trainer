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

const ORBS = [
  [0, 1.5, -2],
  [7, 1.5, -5],
  [-7, 1.5, -5],
  [4, 1.5, -10],
  [-4, 1.5, -10],
];

const COLORS = ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#a855f7'];

export default function MazeSearchScene({
  config, isPaused, isActive, onOrbCollected, collectedOrbs = [],
}: MazeSearchSceneProps) {
  const { camera } = useThree();
  const triggered = useRef(new Set(collectedOrbs));

  useEffect(() => { collectedOrbs.forEach(i => triggered.current.add(i)); }, [collectedOrbs]);

  useFrame(() => {
    if (!isActive || isPaused) return;
    const p = camera.position;
    ORBS.forEach(([x, y, z], i) => {
      if (triggered.current.has(i)) return;
      if (Math.hypot(p.x - x, p.z - z) < 3) {
        triggered.current.add(i);
        onOrbCollected?.(i);
      }
    });
  });

  return (
    <group>
      <ambientLight intensity={0.5} />
      <hemisphereLight args={['#334466', '#112233', 0.4]} />

      {/* Plain flat ground - nothing else */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <planeGeometry args={[20, 20]} />
        <meshStandardMaterial color="#1a2332" roughness={0.9} />
      </mesh>

      {/* Orbs only */}
      {ORBS.map(([x, y, z], i) => collectedOrbs.includes(i) ? null : (
        <group key={i} position={[x, y, z]}>
          <mesh>
            <sphereGeometry args={[0.5, 32, 32]} />
            <meshStandardMaterial color={COLORS[i]} emissive={COLORS[i]} emissiveIntensity={1.2} roughness={0.1} />
          </mesh>
          <pointLight color={COLORS[i]} intensity={3} distance={15} />
        </group>
      ))}

      {/* No walls, no collision, no obstacles */}

      <FirstPersonController
        enabled={isActive && !isPaused}
        moveSpeed={2.8}
        turnSpeed={40}
        allowMovement={isActive && !isPaused}
        allowTurning={isActive && !isPaused}
        hintText="🖱️点击画面 · WASD移动 · 走向光球收集"
      />
    </group>
  );
}
