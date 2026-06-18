'use client';

import { useRef, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import FirstPersonController from '@/components/FirstPersonController';
import { TrainingSceneConfig } from '@/types';

interface StaticRoomSceneProps {
  config: TrainingSceneConfig;
  isPaused: boolean;
  isActive: boolean;
  onObjectFound?: (index: number) => void;
  foundObjects?: number[];
  showCenterDot?: boolean;
}

// Proximity collector — when player walks close enough, auto-collect
function ProximityCollector({ targets, foundObjects, onFound }: {
  targets: React.RefObject<THREE.Mesh | null>[];
  foundObjects: number[];
  onFound: (index: number) => void;
}) {
  const { camera } = useThree();
  const collectedRef = useRef<Set<number>>(new Set());

  useFrame(() => {
    if (foundObjects.length >= targets.length) return;
    const playerPos = camera.position;

    for (let i = 0; i < targets.length; i++) {
      if (foundObjects.includes(i) || collectedRef.current.has(i)) continue;
      const mesh = targets[i]?.current;
      if (!mesh) continue;
      const objWorldPos = new THREE.Vector3();
      mesh.getWorldPosition(objWorldPos);
      const dist = playerPos.distanceTo(objWorldPos);
      if (dist < 2.5) {
        collectedRef.current.add(i);
        onFound(i);
      }
    }
  });

  // Reset when foundObjects changes externally
  useEffect(() => {
    collectedRef.current = new Set(foundObjects);
  }, [foundObjects]);

  return null;
}

export default function StaticRoomScene({
  config, isPaused, isActive, onObjectFound, foundObjects = [], showCenterDot = true,
}: StaticRoomSceneProps) {
  // Lv.0: no movement, no turning
  // Lv.1: movement enabled (walk to objects), turning enabled
  const allowMovement = config.level >= 1 && isActive && !isPaused;
  const allowTurning = config.level >= 1 && isActive && !isPaused;
  const showObjects = config.level >= 1;

  // Lv.0: auto-slow pan for safety check
  const autoPan = config.level === 0 && isActive && !isPaused;

  const targetRef0 = useRef<THREE.Mesh>(null);
  const targetRef1 = useRef<THREE.Mesh>(null);
  const targetRef2 = useRef<THREE.Mesh>(null);
  const targetRefs = [targetRef0, targetRef1, targetRef2];

  const objects: Array<{ position: [number, number, number]; color: string; label: string }> = [
    { position: [3.5, 0.8, 3.5], color: '#3b82f6', label: '蓝' },
    { position: [-3.5, 0.8, -3.5], color: '#f59e0b', label: '黄' },
    { position: [0, 0.8, -4.5], color: '#ef4444', label: '红' },
  ];

  // === Auto-pan for Lv.0 ===
  const { camera } = useThree();
  const panAngle = useRef(0);
  useFrame((_, delta) => {
    if (!autoPan) return;
    panAngle.current += delta * 0.12;
    const r = 3;
    camera.position.set(Math.sin(panAngle.current) * r, 1.6, Math.cos(panAngle.current) * r);
    camera.lookAt(0, 1.6, 0);
  });

  const hint = allowMovement
    ? '🖱️点击锁定 · WASD走路 · 鼠标转头 · 走近方块自动收集'
    : '🖱️点击锁定 · 鼠标转头观察房间 · ESC释放';

  return (
    <group>
      <ambientLight intensity={0.8} />
      <pointLight position={[0, 2.8, 0]} intensity={1.5} distance={15} />
      <directionalLight position={[2, 4, 5]} intensity={0.8} />

      <GridFloor />
      <RoomWalls width={10} depth={10} height={3.5} />
      <CeilingLight position={[0, 3.3, 0]} />

      <FurniturePiece position={[-3, 0.75, 2]} size={[1.5, 1.5, 1.5]} color="#1e3a5f" />
      <FurniturePiece position={[3.5, 0.5, -1]} size={[1.2, 1, 1]} color="#3a1e3f" />
      <FurniturePiece position={[-3.5, 0.3, -2.5]} size={[0.8, 0.6, 0.8]} color="#1e3a3f" />
      <FurniturePiece position={[0, 0.5, 2]} size={[1, 1, 1]} color="#2a2a3a" />

      {objects.map((obj, i) => (
        <TargetMesh
          key={i}
          ref={targetRefs[i]}
          position={obj.position}
          color={obj.color}
          label={obj.label}
          found={foundObjects.includes(i)}
        />
      ))}

      {/* Floor arrows pointing to unfound targets */}
      {!foundObjects.includes(0) && <FloorArrow position={[3.5, 0.02, 3.5]} color="#3b82f6" />}
      {!foundObjects.includes(1) && <FloorArrow position={[-3.5, 0.02, -3.5]} color="#f59e0b" />}
      {!foundObjects.includes(2) && <FloorArrow position={[0, 0.02, -4.5]} color="#ef4444" />}

      <FirstPersonController
        enabled={isActive && !isPaused && config.level >= 1}
        moveSpeed={config.level >= 1 ? 1.2 : 0}
        turnSpeed={config.turnSpeedLimit}
        allowMovement={allowMovement}
        allowTurning={allowTurning}
        headBobStrength={config.headBobStrength}
        hintText={hint}
      />

      <ProximityCollector targets={targetRefs} foundObjects={foundObjects} onFound={(i) => onObjectFound?.(i)} />
    </group>
  );
}

// === Sub-components ===

import { forwardRef } from 'react';

const TargetMesh = forwardRef<THREE.Mesh, {
  position: [number, number, number]; color: string; label: string; found: boolean;
}>(({ position, color, label, found }, ref) => {
  if (found) return null;
  return (
    <group position={position}>
      {/* Large glowing box */}
      <mesh ref={ref} castShadow>
        <boxGeometry args={[0.8, 0.8, 0.8]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.7} roughness={0.15} />
      </mesh>
      {/* Glow aura */}
      <mesh>
        <sphereGeometry args={[0.7, 16, 16]} />
        <meshBasicMaterial color={color} transparent opacity={0.18} />
      </mesh>
      {/* Ground ring */}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, -0.7, 0]}>
        <torusGeometry args={[0.55, 0.06, 8, 32]} />
        <meshBasicMaterial color={color} />
      </mesh>
      {/* Point light so it glows */}
      <pointLight color={color} intensity={1.0} distance={6} />
    </group>
  );
});
TargetMesh.displayName = 'TargetMesh';

function GridFloor() {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[12, 12]} /><meshStandardMaterial color="#1a2332" roughness={0.9} />
      </mesh>
      <gridHelper args={[12, 24, '#2a3a4a', '#1a2a3a']} position={[0, 0.01, 0]} />
    </group>
  );
}

function RoomWalls({ width, depth, height }: { width: number; depth: number; height: number }) {
  const hw = width / 2, hd = depth / 2, hh = height / 2, t = 0.2;
  return (
    <group>
      <mesh position={[0, hh, -hd]} receiveShadow><boxGeometry args={[width + t * 2, height, t]} /><meshStandardMaterial color="#2a3a4a" roughness={0.7} /></mesh>
      <mesh position={[0, hh, hd]} receiveShadow><boxGeometry args={[width + t * 2, height, t]} /><meshStandardMaterial color="#2a3a4a" roughness={0.7} /></mesh>
      <mesh position={[-hw, hh, 0]} receiveShadow><boxGeometry args={[t, height, depth]} /><meshStandardMaterial color="#253545" roughness={0.7} /></mesh>
      <mesh position={[hw, hh, 0]} receiveShadow><boxGeometry args={[t, height, depth]} /><meshStandardMaterial color="#253545" roughness={0.7} /></mesh>
    </group>
  );
}

function CeilingLight({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh><cylinderGeometry args={[0.3, 0.3, 0.1, 16]} /><meshStandardMaterial color="#fff" emissive="#fff" emissiveIntensity={0.5} /></mesh>
      <pointLight intensity={0.4} distance={4} />
    </group>
  );
}

function FurniturePiece({ position, size, color }: { position: [number, number, number]; size: [number, number, number]; color: string }) {
  return <mesh position={position} castShadow receiveShadow><boxGeometry args={size} /><meshStandardMaterial color={color} roughness={0.8} /></mesh>;
}

function FloorArrow({ position, color }: { position: [number, number, number]; color: string }) {
  return (
    <mesh position={position} rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[0.5, 0.6, 4]} /><meshBasicMaterial color={color} transparent opacity={0.5} />
    </mesh>
  );
}
