'use client';

import { useRef, useState, useEffect, useMemo, useCallback } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { TrainingSceneConfig } from '@/types';

interface VisualFlowTunnelSceneProps {
  config: TrainingSceneConfig;
  isPaused: boolean;
  isActive: boolean;
  elapsedSeconds: number;
  onTargetClick?: () => void;
}

// === Starfield using single Points geometry (not 200 meshes) ===
function Starfield() {
  const ref = useRef<THREE.Points>(null);
  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const positions: number[] = [];
    for (let i = 0; i < 300; i++) {
      positions.push((Math.random() - 0.5) * 20, (Math.random() - 0.5) * 10, -(Math.random() * 100));
    }
    g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    return g;
  }, []);
  return <points ref={ref} geometry={geo}><pointsMaterial size={0.08} color="#8899cc" sizeAttenuation /></points>;
}

// === Tunnel rings ===
function TunnelRings() {
  const rings = useMemo(() => {
    const items = [];
    for (let z = 0; z > -100; z -= 6) {
      items.push(z);
    }
    return items;
  }, []);
  return (
    <group>
      {rings.map(z => (
        <mesh key={z} position={[0, 0, z]}>
          <torusGeometry args={[3.5, 0.15, 8, 20]} />
          <meshStandardMaterial color={`hsl(${Math.abs(z) * 1.5 % 360}, 50%, 28%)`} roughness={0.7} />
        </mesh>
      ))}
    </group>
  );
}

// === Floor lines ===
function MovingFloor() {
  const lines = useMemo(() => {
    const items = [];
    for (let i = 0; i < 50; i++) {
      items.push(-i * 3);
    }
    return items;
  }, []);
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, -50]}>
        <planeGeometry args={[7, 150]} />
        <meshStandardMaterial color="#0f172a" />
      </mesh>
      {lines.map(z => (
        <mesh key={z} position={[0, -0.48, z]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[5, 0.1]} />
          <meshBasicMaterial color={z % 15 === 0 ? '#3b5568' : '#1e3040'} />
        </mesh>
      ))}
    </group>
  );
}

// === A single target bubble ===
function Bubble({ id, position, color, onPop, onExpire }: {
  id: number; position: THREE.Vector3; color: string;
  onPop: (id: number) => void;
  onExpire: (id: number) => void;
}) {
  const ref = useRef<THREE.Mesh>(null);
  const age = useRef(0);
  const dead = useRef(false);

  useFrame((_, delta) => {
    if (dead.current) return;
    age.current += delta;
    if (age.current > 4) {
      dead.current = true;
      onExpire(id);
    }
  });

  return (
    <mesh
      ref={ref}
      position={position.toArray() as [number, number, number]}
      onClick={(e) => { e.stopPropagation(); dead.current = true; onPop(id); }}
    >
      <sphereGeometry args={[0.35, 16, 16]} />
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.7} roughness={0.15} />
    </mesh>
  );
}

export default function VisualFlowTunnelScene({
  config, isPaused, isActive, onTargetClick,
}: VisualFlowTunnelSceneProps) {
  const { camera } = useThree();
  const scrollOffset = useRef(0);
  const speed = config.movementSpeed * 0.5;

  const [bubbles, setBubbles] = useState<Array<{ id: number; pos: THREE.Vector3; color: string }>>([]);
  const spawnTimer = useRef(0);
  const nextId = useRef(0);
  const totalSpawned = useRef(0);
  const maxActive = 4;
  const maxTotalSpawns = 20; // Spawn at most 20 bubbles total

  // Camera auto-scroll
  useFrame((_, delta) => {
    if (!isActive || isPaused) return;

    scrollOffset.current += speed * delta;
    camera.position.set(0, 1.6, -scrollOffset.current);
    camera.lookAt(0, 1.6, -scrollOffset.current - 6);

    // Spawn logic
    spawnTimer.current += delta;
    const activeCount = bubbles.length;
    if (spawnTimer.current > 2.5 && activeCount < maxActive && totalSpawned.current < maxTotalSpawns) {
      spawnTimer.current = 0;
      totalSpawned.current++;

      const angle = (Math.random() - 0.5) * Math.PI * 0.9;
      const radius = 1.2 + Math.random() * 2.2;
      const x = Math.sin(angle) * radius;
      const y = 1.6 + (Math.random() - 0.5) * 1.8;
      const z = -scrollOffset.current - 8;

      const dist = Math.sqrt(x * x + (y - 1.6) * (y - 1.6));
      const color = dist < 1.5 ? '#22c55e' : dist < 2.5 ? '#f59e0b' : '#ef4444';

      const id = nextId.current++;
      setBubbles(prev => [...prev, { id, pos: new THREE.Vector3(x, y, z), color }]);
    }
  });

  const popBubble = useCallback((id: number) => {
    setBubbles(prev => prev.filter(b => b.id !== id));
    onTargetClick?.(); // Only for real clicks
  }, [onTargetClick]);

  const expireBubble = useCallback((id: number) => {
    setBubbles(prev => prev.filter(b => b.id !== id));
    // No onTargetClick — expired targets don't count
  }, []);

  return (
    <group>
      <ambientLight intensity={0.4} />
      <pointLight position={[0, 2, -scrollOffset.current]} intensity={0.5} />

      <TunnelRings />
      <MovingFloor />
      <Starfield />

      {bubbles.map(b => (
        <Bubble key={b.id} id={b.id} position={b.pos} color={b.color}
          onPop={popBubble} onExpire={expireBubble} />
      ))}
    </group>
  );
}
