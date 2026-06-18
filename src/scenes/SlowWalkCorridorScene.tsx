'use client';

import { useRef, useState, useMemo, useEffect, useCallback } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import FirstPersonController from '@/components/FirstPersonController';
import { TrainingSceneConfig } from '@/types';

interface SlowWalkCorridorSceneProps {
  config: TrainingSceneConfig;
  isPaused: boolean;
  isActive: boolean;
  onCheckpointReached?: (index: number) => void;
  reachedCheckpoints?: number[];
}

const CHECKPOINT_Z = [-20, -50, -80, -110, -140]; // z positions
const CORRIDOR_LENGTH = 160;

// === Corridor walls with section colors ===
function CorridorSection({ zStart, zEnd, sectionIndex }: { zStart: number; zEnd: number; sectionIndex: number }) {
  const length = Math.abs(zEnd - zStart);
  const midZ = (zStart + zEnd) / 2;
  const colors = ['#1a2740', '#1a2e35', '#201a35', '#2a1a30', '#1a2530'];
  const wallColor = colors[sectionIndex % colors.length];

  return (
    <group position={[0, 0, midZ]}>
      {/* Floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[5, length]} />
        <meshStandardMaterial color="#1a2332" roughness={0.8} />
      </mesh>
      {/* Left wall */}
      <mesh position={[-2.5, 1.75, 0]} receiveShadow>
        <boxGeometry args={[0.3, 3.5, length]} />
        <meshStandardMaterial color={wallColor} roughness={0.7} />
      </mesh>
      {/* Right wall */}
      <mesh position={[2.5, 1.75, 0]} receiveShadow>
        <boxGeometry args={[0.3, 3.5, length]} />
        <meshStandardMaterial color={wallColor} roughness={0.7} />
      </mesh>
      {/* Ceiling */}
      <mesh position={[0, 3.5, 0]} rotation={[Math.PI, 0, 0]}>
        <planeGeometry args={[5, length]} />
        <meshStandardMaterial color="#0d1117" />
      </mesh>

      {/* Floor edge guide lines */}
      {Array.from({ length: Math.floor(length / 2) }).map((_, i) => {
        const z = -length / 2 + i * 2 + 1;
        return (
          <group key={i}>
            <mesh position={[-2.3, 0.02, z]} rotation={[-Math.PI / 2, 0, 0]}>
              <planeGeometry args={[0.15, 0.8]} />
              <meshBasicMaterial color="#3b82f6" transparent opacity={0.3} />
            </mesh>
            <mesh position={[2.3, 0.02, z]} rotation={[-Math.PI / 2, 0, 0]}>
              <planeGeometry args={[0.15, 0.8]} />
              <meshBasicMaterial color="#3b82f6" transparent opacity={0.3} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

// === Glowing checkpoint gate ===
function CheckpointGate({ z, index, reached }: { z: number; index: number; reached: boolean }) {
  const ringRef = useRef<THREE.Mesh>(null);
  const color = reached ? '#22c55e' : '#06b6d4';

  useFrame((_, delta) => {
    if (ringRef.current && !reached) {
      ringRef.current.rotation.y += delta * 0.5;
    }
  });

  return (
    <group position={[0, 1.75, z]}>
      {/* Gate frame */}
      <mesh position={[-2.5, 0, 0]}>
        <boxGeometry args={[0.2, 3.5, 0.2]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={reached ? 0.3 : 0.8} />
      </mesh>
      <mesh position={[2.5, 0, 0]}>
        <boxGeometry args={[0.2, 3.5, 0.2]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={reached ? 0.3 : 0.8} />
      </mesh>
      <mesh position={[0, 2, 0]}>
        <boxGeometry args={[5, 0.2, 0.2]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={reached ? 0.3 : 0.8} />
      </mesh>

      {/* Rotating ring */}
      <mesh ref={ringRef} position={[0, 0, 0]}>
        <torusGeometry args={[2.2, 0.08, 16, 48]} />
        <meshStandardMaterial
          color={color} emissive={color}
          emissiveIntensity={reached ? 0.4 : 1.2} roughness={0.2}
        />
      </mesh>

      {/* Point lights */}
      <pointLight color={color} intensity={reached ? 0.3 : 1.5} distance={8} position={[-2.5, 1.5, 0]} />
      <pointLight color={color} intensity={reached ? 0.3 : 1.5} distance={8} position={[2.5, 1.5, 0]} />

      {/* Floor number */}
      <mesh position={[0, -1.7, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.6, 0.75, 32]} />
        <meshBasicMaterial color={color} side={THREE.DoubleSide} />
      </mesh>

      {/* Number label */}
      {!reached && (
        <pointLight color={color} intensity={0.8} distance={6} position={[0, 0, 0]} />
      )}
    </group>
  );
}

// === Distance markers on floor ===
function DistanceMarkers() {
  const markers = useMemo(() => {
    const arr = [];
    for (let z = -5; z > -CORRIDOR_LENGTH; z -= 10) {
      arr.push(z);
    }
    return arr;
  }, []);

  return (
    <group>
      {markers.map(z => (
        <mesh key={z} position={[0, 0.01, z]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[4.5, 0.15]} />
          <meshBasicMaterial color="#334155" transparent opacity={0.4} />
        </mesh>
      ))}
    </group>
  );
}

// === Checkpoint reached flash overlay (DOM) ===
function useCheckpointFlash(index: number | null) {
  useEffect(() => {
    if (index === null) return;

    // Screen edge glow
    const el = document.createElement('div');
    el.style.cssText = `
      position:fixed;inset:0;z-index:22;pointer-events:none;
      border:4px solid #22c55e;border-radius:0;
      animation: cpFlash 1.5s ease-out forwards;
      opacity:0;
    `;
    document.body.appendChild(el);

    // Center notification
    const notify = document.createElement('div');
    notify.style.cssText = `
      position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);
      z-index:23;pointer-events:none;text-align:center;
      animation: cpPop 2s ease-out forwards;
    `;
    notify.innerHTML = `
      <div style="font-size:48px;margin-bottom:8px;">✅</div>
      <div style="background:rgba(15,23,42,0.95);border:2px solid #22c55e;border-radius:16px;padding:12px 28px;">
        <p style="color:#22c55e;font-size:20px;font-weight:bold;margin:0;">检查点 ${index + 1}/5 到达</p>
        <p style="color:#94a3b8;font-size:13px;margin:4px 0 0;">深呼吸，休息一下</p>
      </div>
    `;
    document.body.appendChild(notify);

    const timer = setTimeout(() => { el.remove(); notify.remove(); }, 2200);
    return () => { clearTimeout(timer); el.remove(); notify.remove(); };
  }, [index]);
}

// Inject animations
if (typeof document !== 'undefined' && !document.getElementById('cp-anim')) {
  const s = document.createElement('style');
  s.id = 'cp-anim';
  s.textContent = `
    @keyframes cpFlash{0%{opacity:1;border-color:#22c55e}50%{opacity:0.6;border-color:#06b6d4}100%{opacity:0;border-color:#22c55e}}
    @keyframes cpPop{0%{opacity:0;transform:translate(-50%,-50%) scale(0.7)}20%{opacity:1;transform:translate(-50%,-50%) scale(1.05)}40%{transform:translate(-50%,-50%) scale(1)}100%{opacity:0;transform:translate(-50%,-60%)}}
  `;
  document.head.appendChild(s);
}

// === Main scene ===
export default function SlowWalkCorridorScene({
  config, isPaused, isActive, onCheckpointReached, reachedCheckpoints = [],
}: SlowWalkCorridorSceneProps) {
  const [lastReached, setLastReached] = useState<number | null>(null);
  const pendingRef = useRef<Set<number>>(new Set());

  // Track which checkpoints have been triggered
  useEffect(() => {
    reachedCheckpoints.forEach(i => pendingRef.current.add(i));
  }, [reachedCheckpoints]);

  const handlePosition = useCallback((pos: THREE.Vector3) => {
    CHECKPOINT_Z.forEach((cpZ, i) => {
      if (pendingRef.current.has(i)) return;
      if (Math.abs(pos.z - cpZ) < 3) {
        pendingRef.current.add(i);
        setLastReached(i);
        onCheckpointReached?.(i);
      }
    });
  }, [onCheckpointReached]);

  // Build corridor in 30m sections
  const sections = useMemo(() => {
    const segs = [];
    for (let z = -15; z > -CORRIDOR_LENGTH; z -= 30) {
      segs.push({ start: z, end: z - 30 });
    }
    return segs;
  }, []);

  // Show checkpoint flash
  useCheckpointFlash(lastReached);

  const moveSpeed = 2.2; // Fast enough to feel like walking

  return (
    <group>
      <ambientLight intensity={0.5} />
      <directionalLight position={[0, 6, 5]} intensity={0.6} />

      {/* Corridor walls */}
      {sections.map((seg, i) => (
        <CorridorSection key={i} zStart={seg.start} zEnd={seg.end} sectionIndex={i} />
      ))}

      {/* Distance markers */}
      <DistanceMarkers />

      {/* Checkpoint gates */}
      {CHECKPOINT_Z.map((z, i) => (
        <CheckpointGate key={i} z={z} index={i} reached={reachedCheckpoints.includes(i)} />
      ))}

      {/* Finish line at the end */}
      <FinishLine z={-CORRIDOR_LENGTH + 5} />

      <FirstPersonController
        enabled={isActive && !isPaused}
        moveSpeed={moveSpeed}
        turnSpeed={config.turnSpeedLimit}
        allowMovement={isActive && !isPaused}
        allowTurning={isActive && !isPaused}
        onPositionChange={handlePosition}
        hintText="🖱️点击锁定 · W前进 · 鼠标微调方向 · 穿过5个检查点到达终点"
      />
    </group>
  );
}

// === Finish line ===
function FinishLine({ z }: { z: number }) {
  return (
    <group position={[0, 0, z]}>
      {/* Green carpet */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <planeGeometry args={[4.5, 3]} />
        <meshStandardMaterial color="#22c55e" emissive="#22c55e" emissiveIntensity={0.2} roughness={0.6} />
      </mesh>
      {/* Gate */}
      <mesh position={[-2.5, 1.75, 0]}><boxGeometry args={[0.3, 3.5, 0.3]} /><meshStandardMaterial color="#22c55e" emissive="#22c55e" emissiveIntensity={0.8} /></mesh>
      <mesh position={[2.5, 1.75, 0]}><boxGeometry args={[0.3, 3.5, 0.3]} /><meshStandardMaterial color="#22c55e" emissive="#22c55e" emissiveIntensity={0.8} /></mesh>
      <mesh position={[0, 3.3, 0]}><boxGeometry args={[5, 0.3, 0.3]} /><meshStandardMaterial color="#22c55e" emissive="#22c55e" emissiveIntensity={0.8} /></mesh>
      <pointLight color="#22c55e" intensity={2} distance={10} />
      <pointLight color="#22c55e" intensity={2} distance={10} position={[-2.5, 1.5, 0]} />
      <pointLight color="#22c55e" intensity={2} distance={10} position={[2.5, 1.5, 0]} />
    </group>
  );
}
