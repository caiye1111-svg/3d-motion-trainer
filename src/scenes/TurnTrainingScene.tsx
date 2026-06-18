'use client';

import { useRef, useState, useEffect, useCallback } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { TrainingSceneConfig } from '@/types';

interface TurnTrainingSceneProps {
  config: TrainingSceneConfig;
  isPaused: boolean;
  isActive: boolean;
  onTurnCompleted?: (count: number) => void;
  completedCount?: number;
}

// Target angles progression: 3 each of increasing difficulty
const TARGET_ANGLES = [
  20, -20, 25, -30, 35, -40, 45, -50, 55, -60,
  70, -75, 85, -90, 100,
];

function CircularRoom() {
  return (
    <group>
      {/* Floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <cylinderGeometry args={[6, 6, 0.1, 48]} />
        <meshStandardMaterial color="#1a2332" roughness={0.8} />
      </mesh>
      {/* Circular wall */}
      <mesh position={[0, 1.75, 0]} receiveShadow>
        <cylinderGeometry args={[6, 6, 3.5, 48, 1, true]} />
        <meshStandardMaterial color="#1e293b" roughness={0.7} side={THREE.DoubleSide} />
      </mesh>
      {/* Ceiling ring */}
      <mesh position={[0, 3.5, 0]} rotation={[Math.PI, 0, 0]}>
        <ringGeometry args={[5, 6, 48]} />
        <meshStandardMaterial color="#0f172a" side={THREE.DoubleSide} />
      </mesh>
      {/* Floor angle markers every 15° */}
      {Array.from({ length: 24 }).map((_, i) => {
        const angle = (i / 24) * Math.PI * 2;
        const x = Math.sin(angle) * 5.5;
        const z = Math.cos(angle) * 5.5;
        const isMajor = i % 6 === 0;
        return (
          <mesh key={i} position={[x, 0.02, z]} rotation={[-Math.PI / 2, 0, -angle]}>
            <planeGeometry args={[isMajor ? 0.8 : 0.3, 0.08]} />
            <meshBasicMaterial color={isMajor ? '#475569' : '#334155'} />
          </mesh>
        );
      })}
      {/* Center marker */}
      <mesh position={[0, 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.5, 0.6, 32]} />
        <meshBasicMaterial color="#22c55e" side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

// Target that player must turn to face
function AngleTarget({ angle, active, onFaced }: {
  angle: number; active: boolean; onFaced: () => void;
}) {
  const { camera } = useThree();
  const faceTimer = useRef(0);

  const rad = (angle * Math.PI) / 180;
  const x = Math.sin(rad) * 4;
  const z = Math.cos(rad) * 4;

  useFrame((_, delta) => {
    if (!active) return;
    // Check if player is facing this target
    const camDir = new THREE.Vector3();
    camera.getWorldDirection(camDir);
    const toTarget = new THREE.Vector3(x, 1.6, z).sub(camera.position).normalize();
    const dot = camDir.dot(toTarget);
    if (dot > 0.94) { // within ~20° cone
      faceTimer.current += delta;
      if (faceTimer.current >= 0.8) onFaced();
    } else {
      faceTimer.current = Math.max(0, faceTimer.current - delta * 1.5);
    }
  });

  if (!active) return null;

  return (
    <group position={[x, 1.6, z]}>
      <mesh>
        <sphereGeometry args={[0.35, 24, 24]} />
        <meshStandardMaterial color="#f59e0b" emissive="#f59e0b" emissiveIntensity={0.9} roughness={0.15} />
      </mesh>
      <mesh position={[0, 0, 0]}>
        <torusGeometry args={[0.5, 0.04, 8, 24]} />
        <meshBasicMaterial color="#f59e0b" />
      </mesh>
      <pointLight color="#f59e0b" intensity={1.2} distance={8} />
      {/* Arrow pointing from wall toward center */}
      <mesh position={[Math.sin(rad) * 0.6, 0, Math.cos(rad) * 0.6]}>
        <coneGeometry args={[0.15, 0.5, 8]} />
        <meshStandardMaterial color="#f59e0b" emissive="#f59e0b" emissiveIntensity={0.5} />
      </mesh>
    </group>
  );
}

// Angle indicator on wall
function WallMarkers({ currentTarget }: { currentTarget: number | null }) {
  const marks = [0, 30, 60, 90, 120, 150, 180, -150, -120, -90, -60, -30];
  return (
    <group>
      {marks.map(a => {
        const rad = (a * Math.PI) / 180;
        const r = 5.8;
        const x = Math.sin(rad) * r;
        const z = Math.cos(rad) * r;
        const isTarget = currentTarget !== null && a === Math.round(currentTarget / 30) * 30;
        return (
          <mesh key={a} position={[x, 1.75, z]} rotation={[0, -rad + Math.PI, 0]}>
            <planeGeometry args={[0.8, 0.4]} />
            <meshBasicMaterial color={isTarget ? '#f59e0b' : '#334155'} side={THREE.DoubleSide} />
          </mesh>
        );
      })}
    </group>
  );
}

// Success flash
function useSuccessFlash(count: number) {
  useEffect(() => {
    if (count === 0) return;
    const el = document.createElement('div');
    el.style.cssText = `
      position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);
      z-index:23;pointer-events:none;text-align:center;
      animation: turnPop 1.2s ease-out forwards;
    `;
    el.innerHTML = `
      <div style="font-size:32px;">🎯</div>
      <div style="background:rgba(15,23,42,0.95);border:2px solid #f59e0b;border-radius:16px;padding:8px 20px;">
        <p style="color:#f59e0b;font-size:16px;font-weight:bold;margin:0;">转向 ${count}/15</p>
      </div>
    `;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 1500);
    return () => el.remove();
  }, [count]);
}

if (typeof document !== 'undefined' && !document.getElementById('turn-anim')) {
  const s = document.createElement('style');
  s.id = 'turn-anim';
  s.textContent = '@keyframes turnPop{0%{opacity:0;transform:translate(-50%,-50%) scale(0.6)}30%{opacity:1;transform:translate(-50%,-50%) scale(1.1)}60%{transform:translate(-50%,-50%) scale(1)}100%{opacity:0}}';
  document.head.appendChild(s);
}

export default function TurnTrainingScene({
  config, isPaused, isActive, onTurnCompleted, completedCount = 0,
}: TurnTrainingSceneProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [successCount, setSuccessCount] = useState(completedCount);

  useEffect(() => { setCurrentIndex(completedCount); }, [completedCount]);

  const handleFaced = useCallback(() => {
    const next = successCount + 1;
    setSuccessCount(next);
    setCurrentIndex(next);
    onTurnCompleted?.(next);
  }, [successCount, onTurnCompleted]);

  useSuccessFlash(successCount);

  const currentAngle = TARGET_ANGLES[Math.min(currentIndex, TARGET_ANGLES.length - 1)];

  return (
    <group>
      <ambientLight intensity={0.5} />
      <pointLight position={[0, 3, 0]} intensity={0.8} distance={10} />
      <hemisphereLight args={['#334466', '#112233', 0.3]} />

      <CircularRoom />
      <WallMarkers currentTarget={currentIndex < TARGET_ANGLES.length ? currentAngle : null} />

      <AngleTarget
        angle={currentAngle}
        active={currentIndex < TARGET_ANGLES.length && isActive && !isPaused}
        onFaced={handleFaced}
      />

      {/* Lock player position to center */}
      <CenterLock enabled={isActive && !isPaused} />
    </group>
  );
}

// Keeps camera at center, only allows rotation
function CenterLock({ enabled }: { enabled: boolean }) {
  const { camera, gl } = useThree();
  const isLocked = useRef(false);
  const _euler = new THREE.Euler(0, 0, 0, 'YXZ');

  useEffect(() => {
    camera.position.set(0, 1.6, 0);
  }, [camera]);

  useEffect(() => {
    const canvas = gl.domElement;
    const onClick = () => { if (!isLocked.current) canvas.requestPointerLock(); };
    canvas.addEventListener('click', onClick);

    const onLock = () => { isLocked.current = document.pointerLockElement === canvas; };
    document.addEventListener('pointerlockchange', onLock);

    return () => {
      canvas.removeEventListener('click', onClick);
      document.removeEventListener('pointerlockchange', onLock);
    };
  }, [gl]);

  useEffect(() => {
    const onMouse = (e: MouseEvent) => {
      if (!enabled || !isLocked.current) return;
      _euler.setFromQuaternion(camera.quaternion);
      _euler.y -= e.movementX * 0.003;
      _euler.x -= e.movementY * 0.002;
      _euler.x = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, _euler.x));
      camera.quaternion.setFromEuler(_euler);
    };
    document.addEventListener('mousemove', onMouse);
    return () => document.removeEventListener('mousemove', onMouse);
  }, [enabled, camera]);

  // Lock position to center every frame
  useFrame(() => {
    if (enabled) {
      camera.position.set(0, 1.6, 0);
    }
  });

  // Hint overlay
  useEffect(() => {
    if (!enabled) return;
    const hint = document.createElement('div');
    hint.id = 'turn-hint';
    hint.style.cssText = 'position:fixed;bottom:16px;left:50%;transform:translateX(-50%);background:rgba(15,23,42,0.9);color:#94a3b8;padding:8px 20px;border-radius:20px;font-size:13px;z-index:25;pointer-events:none;transition:opacity 0.3s;';
    hint.textContent = '🖱️点击锁定 · 移动鼠标转头 · 对准黄色光球';
    document.body.appendChild(hint);
    const onLock = () => { hint.style.opacity = document.pointerLockElement === gl.domElement ? '0' : '1'; };
    document.addEventListener('pointerlockchange', onLock);
    return () => { hint.remove(); document.removeEventListener('pointerlockchange', onLock); };
  }, [enabled, gl]);

  return null;
}
