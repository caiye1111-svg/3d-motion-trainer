'use client';

import { useRef, useState, useMemo, useCallback, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { TrainingSceneConfig } from '@/types';

interface FPSRangeSceneProps {
  config: TrainingSceneConfig;
  isPaused: boolean;
  isActive: boolean;
  onTargetHit?: () => void;
}

// === Target ===
function Target({ position, active, onHit }: {
  position: [number, number, number]; active: boolean; onHit: () => void;
}) {
  const groupRef = useRef<THREE.Group>(null);

  if (!active) return null;

  return (
    <group ref={groupRef} position={position}>
      {/* Body - humanoid silhouette */}
      <mesh position={[0, 0.8, 0]} castShadow>
        <capsuleGeometry args={[0.25, 1.2, 8, 16]} />
        <meshStandardMaterial color="#ef4444" roughness={0.4} />
      </mesh>
      {/* Head */}
      <mesh position={[0, 1.7, 0]}>
        <sphereGeometry args={[0.2, 16, 16]} />
        <meshStandardMaterial color="#ef4444" roughness={0.3} />
      </mesh>
      {/* Bullseye ring */}
      <mesh position={[0, 1.1, 0.01]}>
        <torusGeometry args={[0.18, 0.03, 8, 16]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>
      {/* Click hitbox - transparent but clickable */}
      <mesh onClick={(e) => { e.stopPropagation(); onHit(); }}>
        <sphereGeometry args={[0.8, 8, 8]} />
        <meshBasicMaterial transparent opacity={0.001} depthTest={false} />
      </mesh>
    </group>
  );
}

// === Shooting lane ===
function Lane({ z, width }: { z: number; width: number }) {
  return (
    <group position={[0, 0, z]}>
      {/* Floor */}
      <mesh rotation={[-Math.PI/2,0,0]} receiveShadow>
        <planeGeometry args={[width, 30]} />
        <meshStandardMaterial color="#1a1a1a" roughness={0.9} />
      </mesh>
      {/* Lane markings */}
      <mesh position={[0,0.01,0]} rotation={[-Math.PI/2,0,0]}>
        <planeGeometry args={[0.1, 30]} />
        <meshBasicMaterial color="#444444" />
      </mesh>
      {/* Side walls */}
      <mesh position={[-width/2, 1.5, -10]} receiveShadow>
        <boxGeometry args={[0.2, 3, 20]} />
        <meshStandardMaterial color="#2a2a2a" roughness={0.7} />
      </mesh>
      <mesh position={[width/2, 1.5, -10]} receiveShadow>
        <boxGeometry args={[0.2, 3, 20]} />
        <meshStandardMaterial color="#2a2a2a" roughness={0.7} />
      </mesh>
      {/* Ceiling */}
      <mesh position={[0, 3, -10]} rotation={[Math.PI,0,0]}>
        <planeGeometry args={[width, 20]} />
        <meshStandardMaterial color="#0a0a0a" />
      </mesh>
      {/* Distance markers */}
      {[5, 10, 15, 20].map(d=>(
        <mesh key={d} position={[0,0.02,-d]} rotation={[-Math.PI/2,0,0]}>
          <planeGeometry args={[width-0.5, 0.3]} />
          <meshBasicMaterial color="#333333" />
        </mesh>
      ))}
    </group>
  );
}

// === Score HUD ===
function ScoreHUD({ hits, misses, combo }: { hits:number; misses:number; combo:number }) {
  useEffect(()=>{
    let el=document.getElementById('fps-hud');
    if(!el){el=document.createElement('div');el.id='fps-hud';el.style.cssText='position:fixed;top:100px;left:50%;transform:translateX(-50%);z-index:25;pointer-events:none;';document.body.appendChild(el);}
    const total=hits+misses;
    const acc=total>0?Math.round(hits/total*100):0;
    el.innerHTML=`<div style="background:rgba(15,23,42,0.95);border-radius:16px;padding:10px 24px;border:1px solid #334155;display:flex;gap:24px;align-items:center;">
      <div><span style="color:#64748b;font-size:11px;">命中</span><br><span style="color:#22c55e;font-size:18px;font-weight:bold;">${hits}/20</span></div>
      <div><span style="color:#64748b;font-size:11px;">精度</span><br><span style="color:#e2e8f0;font-size:18px;font-weight:bold;">${acc}%</span></div>
      ${combo>2?`<div><span style="color:#64748b;font-size:11px;">连击</span><br><span style="color:#f59e0b;font-size:18px;font-weight:bold;">🔥x${combo}</span></div>`:''}
      <div style="margin-left:8px;background:#1e293b;border-radius:8px;height:6px;width:80px;overflow:hidden;"><div style="background:linear-gradient(90deg,#22c55e,#3b82f6);height:100%;width:${hits/20*100}%;transition:width 0.3s;"></div></div>
    </div>`;
    return()=>{if(el)el.remove();};
  },[hits,misses,combo]);
  return null;
}

// === Hit flash ===
function useHitFlash(count:number) {
  useEffect(()=>{
    if(count===0)return;
    const el=document.createElement('div');
    el.style.cssText=`position:fixed;top:50%;left:${40+Math.random()*20}%;transform:translate(-50%,-50%);color:#22c55e;font-size:20px;font-weight:bold;z-index:30;pointer-events:none;animation:hitPop 0.6s ease-out forwards;`;
    el.textContent='✓';
    document.body.appendChild(el);
    setTimeout(()=>el.remove(),700);
    return()=>el.remove();
  },[count]);
}

if(typeof document!=='undefined'&&!document.getElementById('hit-anim')){
  const s=document.createElement('style');s.id='hit-anim';
  s.textContent='@keyframes hitPop{0%{opacity:1;transform:translate(-50%,-50%) scale(0.5)}100%{opacity:0;transform:translate(-50%,-80%) scale(1.2)}}';
  document.head.appendChild(s);
}

// === Main Scene ===
export default function FPSRangeScene({
  config, isPaused, isActive, onTargetHit,
}: FPSRangeSceneProps) {
  const { camera } = useThree();
  const [hits, setHits] = useState(0);
  const [misses, setMisses] = useState(0);
  const [combo, setCombo] = useState(0);
  const [targets, setTargets] = useState<Array<{id:number; pos:[number,number,number]; active:boolean}>>([]);
  const nextId = useRef(0);
  const totalTargets = 20;
  const maxActive = 3;

  // Lock player at shooting position
  useFrame(() => {
    if (isActive && !isPaused) {
      camera.position.set(0, 1.6, 2);
    }
  });

  // Mouse look only (no movement)
  useEffect(() => {
    if (!isActive || isPaused) return;
    const canvas = document.querySelector('canvas');
    if (!canvas) return;

    let locked = false;
    const onClick = () => { if (!locked) canvas.requestPointerLock(); };
    const onLock = () => { locked = document.pointerLockElement === canvas; };
    const onMouse = (e: MouseEvent) => {
      if (!locked) return;
      const euler = new THREE.Euler().setFromQuaternion(camera.quaternion, 'YXZ');
      euler.y -= e.movementX * 0.002;
      euler.x -= e.movementY * 0.0015;
      euler.x = Math.max(-Math.PI/4, Math.min(Math.PI/4, euler.x));
      camera.quaternion.setFromEuler(euler);
    };

    canvas.addEventListener('click', onClick);
    document.addEventListener('pointerlockchange', onLock);
    document.addEventListener('mousemove', onMouse);
    return () => { canvas.removeEventListener('click', onClick); document.removeEventListener('pointerlockchange', onLock); document.removeEventListener('mousemove', onMouse); };
  }, [isActive, isPaused, camera]);

  // Spawn targets
  useEffect(() => {
    if (!isActive || isPaused) return;

    const spawn = () => {
      if (hits + misses >= totalTargets) return;
      const activeCount = targets.filter(t=>t.active).length;
      if (activeCount >= maxActive) return;

      const id = nextId.current++;
      const lane = (Math.random()-0.5) * 4;
      const distance = 5 + Math.random() * 15;
      const height = 0.3 + Math.random() * 1.5;
      setTargets(prev => [...prev, { id, pos: [lane, height, -distance], active: true }]);

      // Auto-expire after 3-5 seconds
      setTimeout(() => {
        setTargets(prev => prev.map(t => t.id === id ? {...t, active: false} : t));
        setMisses(m => m + 1);
        setCombo(0);
      }, 3000 + Math.random() * 2000);
    };

    const interval = setInterval(spawn, 1800);
    spawn(); spawn(); // Initial targets
    return () => clearInterval(interval);
  }, [isActive, isPaused, hits, misses, targets.length]);

  const handleHit = useCallback(() => {
    setHits(h => h + 1);
    setCombo(c => c + 1);
    onTargetHit?.();
  }, [onTargetHit]);

  useHitFlash(hits);

  // Auto-complete when all targets done
  useEffect(() => {
    if (hits >= totalTargets && onTargetHit) onTargetHit();
  }, [hits]);

  return (
    <group>
      <ambientLight intensity={0.3} />
      <pointLight position={[0, 3, 2]} intensity={0.5} color="#888888" />
      <spotLight position={[0, 4, 0]} angle={0.3} penumbra={0.5} intensity={0.8} color="#ffffff" target-position={[0,0,-15]} />

      {/* Shooting booth */}
      <mesh position={[0, -0.1, 1.5]} rotation={[-Math.PI/2,0,0]}>
        <planeGeometry args={[3, 2]} />
        <meshStandardMaterial color="#2a2a2a" roughness={0.8} />
      </mesh>
      {/* Counter */}
      <mesh position={[0, 0.8, 0.3]}>
        <boxGeometry args={[3, 0.2, 1]} />
        <meshStandardMaterial color="#3a3a3a" roughness={0.5} metalness={0.3} />
      </mesh>

      <Lane z={-10} width={6} />

      {/* Targets */}
      {targets.filter(t=>t.active).map(t => (
        <Target key={t.id} position={t.pos} active={t.active} onHit={handleHit} />
      ))}

      {/* Back wall */}
      <mesh position={[0, 2, -22]}>
        <planeGeometry args={[8, 4]} />
        <meshStandardMaterial color="#111111" roughness={0.9} />
      </mesh>

      <ScoreHUD hits={hits} misses={misses} combo={combo} />

      {/* Hint */}
      <Hint />
    </group>
  );
}

function Hint() {
  useEffect(() => {
    const el = document.createElement('div');
    el.id = 'fps-hint';
    el.style.cssText = 'position:fixed;bottom:16px;left:50%;transform:translateX(-50%);background:rgba(15,23,42,0.9);color:#94a3b8;padding:8px 20px;border-radius:20px;font-size:13px;z-index:25;pointer-events:none;transition:opacity 0.3s;';
    el.textContent = '🖱️点击锁定 · 移动鼠标瞄准 · 点击靶子射击';
    document.body.appendChild(el);
    const canvas = document.querySelector('canvas');
    if (canvas) {
      const onLock = () => { el.style.opacity = document.pointerLockElement === canvas ? '0' : '1'; };
      document.addEventListener('pointerlockchange', onLock);
      return () => { el.remove(); document.removeEventListener('pointerlockchange', onLock); };
    }
    return () => el.remove();
  }, []);
  return null;
}
