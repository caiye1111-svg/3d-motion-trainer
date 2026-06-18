'use client';

import { useRef, useState, useMemo, useCallback, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
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

const CHECKPOINTS = [
  { x: 0, y: 0.5, z: -4, label: '🌳 起点 · 林间小路' },
  { x: 0, y: 3.5, z: -18, label: '⛰️ 第一段上坡完成' },
  { x: 0, y: 0.8, z: -32, label: '🏞️ 下到山谷' },
  { x: 0, y: 5.5, z: -48, label: '🪜 楼梯登顶' },
  { x: 0, y: 0.3, z: -62, label: '🏁 终点 · 瞭望台' },
];

// === Natural ground with grass ===
function GroundTile({ x, z, w, d }: { x: number; z: number; w: number; d: number }) {
  return (
    <mesh position={[x, -0.05, z]} rotation={[-Math.PI/2, 0, 0]} receiveShadow>
      <planeGeometry args={[w, d]} />
      <meshStandardMaterial color="#2d5a1e" roughness={1} />
    </mesh>
  );
}

// === Dirt path ===
function PathSegment({ start, end, width = 1.2 }: {
  start: [number, number, number];
  end: [number, number, number];
  width?: number;
}) {
  const dx = end[0] - start[0];
  const dy = end[1] - start[1];
  const dz = end[2] - start[2];
  const len = Math.sqrt(dx*dx + dz*dz);
  const angle = Math.atan2(dy, len);
  const rotY = Math.atan2(dx, dz);
  const cx = (start[0]+end[0])/2;
  const cy = (start[1]+end[1])/2;
  const cz = (start[2]+end[2])/2;

  return (
    <mesh position={[cx, cy+0.02, cz]} rotation={[angle, rotY, 0]} receiveShadow>
      <planeGeometry args={[width, len]} />
      <meshStandardMaterial color="#6b5a3e" roughness={0.9} />
    </mesh>
  );
}

// === Stone stairs ===
function StoneSteps({ start, end, count = 10 }: {
  start: [number, number, number];
  end: [number, number, number];
  count?: number;
}) {
  const dx = (end[0]-start[0])/count;
  const dy = (end[1]-start[1])/count;
  const dz = (end[2]-start[2])/count;
  const items = [];
  for (let i=0; i<count; i++) {
    const x = start[0]+dx*i;
    const y = start[1]+dy*i+0.15;
    const z = start[2]+dz*i;
    items.push(
      <mesh key={i} position={[x, y, z]} castShadow receiveShadow>
        <boxGeometry args={[2.5, 0.25, 0.8]} />
        <meshStandardMaterial color={i%2===0?'#7a6a5a':'#8a7a6a'} roughness={0.7} />
      </mesh>
    );
  }
  return <group>{items}</group>;
}

// === Wooden handrail ===
function Handrail({ start, end, side }: {
  start: [number, number, number];
  end: [number, number, number];
  side: -1 | 1;
}) {
  const dx = end[0]-start[0];
  const dy = end[1]-start[1];
  const dz = end[2]-start[2];
  const len = Math.sqrt(dx*dx+dz*dz);
  const angle = Math.atan2(dy, len);
  const rotY = Math.atan2(dx, dz);
  const cx = (start[0]+end[0])/2+side*1.5;
  const cy = (start[1]+end[1])/2+1;
  const cz = (start[2]+end[2])/2;

  return (
    <group>
      <mesh position={[cx, cy, cz]} rotation={[angle, rotY, 0]}>
        <boxGeometry args={[0.08, 0.1, len]} />
        <meshStandardMaterial color="#6b4c3b" roughness={0.6} />
      </mesh>
      {/* Posts */}
      {Array.from({length: Math.floor(len/2)}).map((_,i)=>{
        const t = (i*2)/len;
        const px = start[0]+dx*t+side*1.5;
        const py = start[1]+dy*t+0.5;
        const pz = start[2]+dz*t;
        return <mesh key={i} position={[px, py, pz]}><cylinderGeometry args={[0.05,0.05,0.8,8]} /><meshStandardMaterial color="#5a3a2a" /></mesh>;
      })}
    </group>
  );
}

// === Tree ===
function Tree({ position, scale = 1 }: { position: [number, number, number]; scale?: number }) {
  return (
    <group position={position} scale={scale}>
      {/* Trunk */}
      <mesh position={[0, 1, 0]} castShadow>
        <cylinderGeometry args={[0.15, 0.2, 2, 8]} />
        <meshStandardMaterial color="#4a3520" roughness={0.9} />
      </mesh>
      {/* Foliage layers */}
      <mesh position={[0, 2.2, 0]} castShadow>
        <coneGeometry args={[1, 1.8, 8, 4]} />
        <meshStandardMaterial color="#1e5a1e" roughness={0.8} />
      </mesh>
      <mesh position={[0, 3, 0]} castShadow>
        <coneGeometry args={[0.8, 1.5, 8, 4]} />
        <meshStandardMaterial color="#2d6a2d" roughness={0.8} />
      </mesh>
    </group>
  );
}

// === Rock ===
function Rock({ position, scale = 1 }: { position: [number, number, number]; scale?: number }) {
  return (
    <mesh position={position} scale={scale} castShadow>
      <icosahedronGeometry args={[0.5+Math.random()*0.3, 1]} />
      <meshStandardMaterial color="#666666" roughness={0.7} />
    </mesh>
  );
}

// === Checkpoint sign ===
function CheckpointSign({ position, reached, label }: {
  position: [number, number, number]; reached: boolean; label: string;
}) {
  return (
    <group position={position}>
      {/* Post */}
      <mesh position={[0, 1, 0]} castShadow>
        <cylinderGeometry args={[0.08, 0.08, 2, 8]} />
        <meshStandardMaterial color="#5a3a2a" />
      </mesh>
      {/* Sign board */}
      <mesh position={[0, 1.8, 0]}>
        <boxGeometry args={[1.2, 0.6, 0.05]} />
        <meshStandardMaterial color={reached?'#22c55e':'#f59e0b'} roughness={0.4} />
      </mesh>
      {/* Glow */}
      <pointLight color={reached?'#22c55e':'#f59e0b'} intensity={reached?0.5:1.5} distance={8} />
      {/* Number */}
      <mesh position={[0, 1.81, 0.03]} rotation={[0,0,0]}>
        <sphereGeometry args={[reached?0.15:0.25, 16, 16]} />
        <meshBasicMaterial color={reached?'#22c55e':'#f59e0b'} />
      </mesh>
    </group>
  );
}

// === Flash notification ===
function useCheckpointNotify(index: number | null) {
  useEffect(() => {
    if (index===null) return;
    const el = document.createElement('div');
    el.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);z-index:23;pointer-events:none;text-align:center;animation:cpPop 2s ease-out forwards;';
    el.innerHTML = `<div style="font-size:48px;">✅</div><div style="background:rgba(15,23,42,0.95);border:2px solid #f59e0b;border-radius:14px;padding:10px 24px;"><p style="color:#f59e0b;font-size:17px;font-weight:bold;margin:0;">${CHECKPOINTS[index].label}</p><p style="color:#94a3b8;font-size:12px;margin:4px 0 0;">检查点 ${index+1}/${CHECKPOINTS.length}</p></div>`;
    document.body.appendChild(el);
    setTimeout(()=>el.remove(), 2500);
    return ()=>el.remove();
  }, [index]);
}

if(typeof document!=='undefined'&&!document.getElementById('slope-anim')){
  const s=document.createElement('style');s.id='slope-anim';
  s.textContent='@keyframes cpPop{0%{opacity:0;transform:translate(-50%,-50%) scale(0.6)}25%{opacity:1;transform:translate(-50%,-50%) scale(1.05)}50%{transform:translate(-50%,-50%) scale(1)}100%{opacity:0;transform:translate(-50%,-55%)}}';
  document.head.appendChild(s);
}

export default function StairSlopeScene({
  config, isPaused, isActive, onCheckpointReached, reachedCheckpoints=[],
}: StairSlopeSceneProps) {
  const [lastNotify, setLastNotify] = useState<number|null>(null);
  const triggered = useRef<Set<number>>(new Set());

  useEffect(()=>{reachedCheckpoints.forEach(i=>triggered.current.add(i));},[reachedCheckpoints]);

  const handlePos = useCallback((pos:THREE.Vector3)=>{
    CHECKPOINTS.forEach((cp,i)=>{
      if(triggered.current.has(i)) return;
      if(Math.sqrt((pos.x-cp.x)**2+(pos.y-cp.y)**2+(pos.z-cp.z)**2)<4){
        triggered.current.add(i);setLastNotify(i);onCheckpointReached?.(i);
      }
    });
  },[onCheckpointReached]);

  useCheckpointNotify(lastNotify);

  // Tree positions
  const trees = useMemo(()=>{
    const t:Array<[number,number,number,number]>=[];
    const r=()=>Math.random();
    for(let z=-3;z>-65;z-=3){
      if(z>-6&&z<-60)continue; // skip path area
      t.push([-6+r()*2,0,z+r()*1.5,0.6+r()*1.2]);
      t.push([6+r()*2,0,z+r()*1.5,0.6+r()*1.2]);
    }
    return t;
  },[]);

  return (
    <group>
      {/* Sky-like ambient */}
      <ambientLight intensity={0.6} />
      <directionalLight position={[8, 12, 4]} intensity={1.0} castShadow color="#fff5e8" />
      <hemisphereLight args={['#87ceeb','#3d5a1e',0.4]} />

      {/* Ground planes */}
      <GroundTile x={0} z={-15} w={20} d={30} />
      <GroundTile x={0} z={-40} w={20} d={30} />
      <GroundTile x={0} z={-65} w={20} d={25} />

      {/* Trees */}
      {trees.map((t,i)=><Tree key={i} position={[t[0],t[3],t[2]]} scale={t[3]} />)}

      {/* Rocks scattered */}
      <Rock position={[-3,0.1,-8]} scale={1.2} />
      <Rock position={[4,0,-15]} scale={0.8} />
      <Rock position={[-5,3.5,-20]} scale={1} />
      <Rock position={[3,0.8,-35]} scale={0.7} />
      <Rock position={[-4,5.5,-50]} scale={1.1} />

      {/* === THE TRAIL === */}

      {/* Flat start area */}
      <PathSegment start={[0,0,0]} end={[0,0,-6]} width={2} />

      {/* Gentle uphill slope */}
      <PathSegment start={[0,0,-6]} end={[0,3,-18]} width={1.8} />
      <Handrail start={[0,0,-6]} end={[0,3,-18]} side={-1} />
      <Handrail start={[0,0,-6]} end={[0,3,-18]} side={1} />

      {/* Ridge platform */}
      <PathSegment start={[0,3,-18]} end={[0,3,-22]} width={2.5} />

      {/* Gentle downhill */}
      <PathSegment start={[0,3,-22]} end={[0,0.5,-34]} width={1.8} />
      <Handrail start={[0,3,-22]} end={[0,0.5,-34]} side={-1} />
      <Handrail start={[0,3,-22]} end={[0,0.5,-34]} side={1} />

      {/* Valley flat */}
      <PathSegment start={[0,0.5,-34]} end={[0,0.5,-38]} width={2.5} />

      {/* Stone stairs going up */}
      <StoneSteps start={[0,0.5,-38]} end={[0,5.2,-48]} count={14} />
      <Handrail start={[0,0.5,-38]} end={[0,5.2,-48]} side={-1} />
      <Handrail start={[0,0.5,-38]} end={[0,5.2,-48]} side={1} />

      {/* Summit platform */}
      <PathSegment start={[0,5.2,-48]} end={[0,5.2,-52]} width={2.5} />

      {/* Downhill slope to finish */}
      <PathSegment start={[0,5.2,-52]} end={[0,0.3,-64]} width={1.8} />
      <Handrail start={[0,5.2,-52]} end={[0,0.3,-64]} side={-1} />
      <Handrail start={[0,5.2,-52]} end={[0,0.3,-64]} side={1} />

      {/* Finish area */}
      <mesh position={[0,0.33,-64]} rotation={[-Math.PI/2,0,0]}>
        <planeGeometry args={[4,3]} />
        <meshStandardMaterial color="#22c55e" emissive="#22c55e" emissiveIntensity={0.2} />
      </mesh>

      {/* Checkpoint signs */}
      {CHECKPOINTS.map((cp,i)=>(
        <CheckpointSign key={i} position={[cp.x, cp.y, cp.z]} reached={reachedCheckpoints.includes(i)} label={cp.label} />
      ))}

      {/* Green start marker */}
      <mesh position={[0,0.03,0]} rotation={[-Math.PI/2,0,0]}>
        <ringGeometry args={[0.7,0.9,32]} />
        <meshBasicMaterial color="#22c55e" side={THREE.DoubleSide} />
      </mesh>

      <FirstPersonController
        enabled={isActive&&!isPaused}
        moveSpeed={2.0}
        turnSpeed={config.turnSpeedLimit}
        allowMovement={isActive&&!isPaused}
        allowTurning={isActive&&!isPaused}
        verticalMotion
        terrainHeight={(_, z) => {
          // Trail height map along Z axis
          if (z > -6) return 0;
          if (z > -18) return (Math.abs(z) - 6) / 12 * 3; // 0→3 uphill
          if (z > -22) return 3;
          if (z > -34) return 3 - (Math.abs(z) - 22) / 12 * 2.5; // 3→0.5 downhill
          if (z > -38) return 0.5;
          if (z > -48) return 0.5 + (Math.abs(z) - 38) / 10 * 4.7; // stairs up 0.5→5.2
          if (z > -52) return 5.2;
          if (z > -64) return 5.2 - (Math.abs(z) - 52) / 12 * 4.9; // 5.2→0.3 downhill
          return 0.3;
        }}
        onPositionChange={handlePos}
        hintText="🖱️点击锁定 · WASD移动 · 鼠标转向 · 沿土路上坡和爬楼梯"
      />
    </group>
  );
}
