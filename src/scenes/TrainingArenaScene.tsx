'use client';

import { useRef, useState, useMemo, useCallback, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import FirstPersonController from '@/components/FirstPersonController';
import { TrainingSceneConfig } from '@/types';

interface TrainingArenaSceneProps {
  config: TrainingSceneConfig;
  isPaused: boolean;
  isActive: boolean;
  onOrbCollected?: (index: number) => void;
  collectedOrbs?: number[];
}

const ORB_POSITIONS: Array<[number, number, number]> = [
  [0, 1.5, -2],    // Start platform
  [5, 1.5, -5],    // Right platform
  [-5, 1.5, -5],   // Left platform
  [5, 3.5, -8],    // Upper right
  [-5, 3.5, -8],   // Upper left
  [0, 3.5, -10],   // Center upper
  [8, 5, -12],     // Top right
  [-8, 5, -12],    // Top left
  [0, 5, -15],     // Top center
  [0, 7, -18],     // Final - highest platform
];

const ORB_COLORS = ['#ff6b6b', '#ffd93d', '#6bcb77', '#4d96ff', '#ff6b6b', '#ffd93d', '#6bcb77', '#4d96ff', '#c084fc', '#22c55e'];

// === Neon platform ===
function Platform({ position, size, color }: {
  position: [number, number, number]; size: [number, number]; color: string;
}) {
  const [x, y, z] = position;
  return (
    <group position={[x, y, z]}>
      {/* Main platform */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={size} />
        <meshStandardMaterial color="#111827" roughness={0.6} metalness={0.4} />
      </mesh>
      {/* Edge glow */}
      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[size[0] + 0.1, size[1] + 0.1]} />
        <meshBasicMaterial color={color} transparent opacity={0.3} side={THREE.DoubleSide} />
      </mesh>
      {/* Edge strips */}
      <EdgeStrip halfW={size[0]/2} halfD={size[1]/2} y={0.1} color={color} />
    </group>
  );
}

function EdgeStrip({ halfW, halfD, y, color }: { halfW: number; halfD: number; y: number; color: string }) {
  return (
    <group>
      {[[-halfW, 0], [halfW, 0], [0, -halfD], [0, halfD]].map(([x, z], i) => (
        <mesh key={i} position={[x, y, z]} rotation={[0, i < 2 ? 0 : Math.PI/2, 0]}>
          <boxGeometry args={[halfW*2 + halfD*2 < 0.1 ? 0.1 : halfW*2+0.1, 0.05, 0.08]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.8} />
        </mesh>
      ))}
    </group>
  );
}

// === Neon ramp ===
function Ramp({ start, end, width, color }: {
  start: [number, number, number]; end: [number, number, number]; width: number; color: string;
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
    <group position={[cx, cy, cz]} rotation={[angle, rotY, 0]}>
      <mesh receiveShadow>
        <planeGeometry args={[width, len]} />
        <meshStandardMaterial color="#1a1a2e" roughness={0.5} metalness={0.3} />
      </mesh>
      {/* Rails */}
      <mesh position={[-width/2, 0.3, 0]}><boxGeometry args={[0.08, 0.15, len]} /><meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.6} /></mesh>
      <mesh position={[width/2, 0.3, 0]}><boxGeometry args={[0.08, 0.15, len]} /><meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.6} /></mesh>
    </group>
  );
}

// === Glowing Orb ===
function NeonOrb({ position, color, collected }: {
  position: [number, number, number]; color: string; collected: boolean;
}) {
  if (collected) return null;
  return (
    <group position={position}>
      {/* Core */}
      <mesh>
        <sphereGeometry args={[0.35, 32, 32]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={1.2} roughness={0.1} />
      </mesh>
      {/* Ring */}
      <mesh rotation={[Math.PI/2, 0, 0]}>
        <torusGeometry args={[0.5, 0.04, 16, 32]} />
        <meshBasicMaterial color={color} />
      </mesh>
      {/* Outer aura */}
      <mesh>
        <sphereGeometry args={[0.6, 16, 16]} />
        <meshBasicMaterial color={color} transparent opacity={0.12} />
      </mesh>
      <pointLight color={color} intensity={2.5} distance={12} />
    </group>
  );
}

// === Floating particles ===
function Particles({ count = 80 }: { count?: number }) {
  const ref = useRef<THREE.Points>(null);
  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const pos: number[] = [];
    for (let i=0;i<count;i++) pos.push((Math.random()-0.5)*25, Math.random()*8, -(Math.random()*20+2));
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    return g;
  }, [count]);

  useFrame((_, delta) => {
    if (ref.current) ref.current.rotation.y += delta * 0.05;
  });

  return (
    <points ref={ref} geometry={geo}>
      <pointsMaterial size={0.04} color="#4d96ff" transparent opacity={0.5} />
    </points>
  );
}

// === Collect flash ===
function useCollectFlash(index: number) {
  useEffect(() => {
    if (index<0) return;
    const el = document.createElement('div');
    el.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);z-index:23;pointer-events:none;text-align:center;animation:arenaPop 1.5s ease-out forwards;';
    el.innerHTML = `<div style="font-size:40px;">💎</div><div style="background:rgba(15,23,42,0.95);border:2px solid ${ORB_COLORS[index]};border-radius:14px;padding:8px 20px;"><p style="color:${ORB_COLORS[index]};font-size:16px;font-weight:bold;margin:0;">收集 ${index+1}/10</p></div>`;
    document.body.appendChild(el);
    setTimeout(()=>el.remove(),1800);
    return ()=>el.remove();
  }, [index]);
}

if (typeof document !== 'undefined' && !document.getElementById('arena-anim')) {
  const s=document.createElement('style');s.id='arena-anim';
  s.textContent='@keyframes arenaPop{0%{opacity:0;transform:translate(-50%,-50%) scale(0.6)}30%{opacity:1;transform:translate(-50%,-50%) scale(1.1)}60%{transform:translate(-50%,-50%) scale(1)}100%{opacity:0}}';
  document.head.appendChild(s);
}

// === Main Scene ===
export default function TrainingArenaScene({
  config, isPaused, isActive, onOrbCollected, collectedOrbs=[],
}: TrainingArenaSceneProps) {
  const { camera } = useThree();
  const [lastCollected, setLastCollected] = useState(-1);
  const triggered = useRef<Set<number>>(new Set(collectedOrbs));

  useEffect(()=>{collectedOrbs.forEach(i=>triggered.current.add(i));},[collectedOrbs]);

  useFrame(()=>{
    if(!isActive||isPaused)return;
    const p=camera.position;
    ORB_POSITIONS.forEach((op,i)=>{
      if(triggered.current.has(i))return;
      const d=Math.sqrt((p.x-op[0])**2+(p.y-op[1])**2+(p.z-op[2])**2);
      if(d<2.5){triggered.current.add(i);setLastCollected(i);onOrbCollected?.(i);}
    });
  });

  useCollectFlash(lastCollected);

  return (
    <group>
      <ambientLight intensity={0.3} />
      <pointLight position={[0,8,0]} intensity={0.5} color="#444488" distance={30} />
      <hemisphereLight args={['#222244','#111122',0.3]} />

      {/* Background grid */}
      <gridHelper args={[30, 40, '#1a1a3a', '#0a0a1a']} position={[0,-0.01,0]} />

      {/* Platforms */}
      <Platform position={[0,0,-2]} size={[6,6]} color="#4d96ff" />
      <Platform position={[5,0,-6]} size={[4,4]} color="#6bcb77" />
      <Platform position={[-5,0,-6]} size={[4,4]} color="#ffd93d" />
      <Platform position={[5,2,-9]} size={[3,3]} color="#ff6b6b" />
      <Platform position={[-5,2,-9]} size={[3,3]} color="#c084fc" />
      <Platform position={[0,3,-11]} size={[4,4]} color="#4d96ff" />
      <Platform position={[8,3.5,-13]} size={[2.5,2.5]} color="#6bcb77" />
      <Platform position={[-8,3.5,-13]} size={[2.5,2.5]} color="#ff6b6b" />
      <Platform position={[0,5,-16]} size={[3,3]} color="#c084fc" />
      <Platform position={[0,6.5,-19]} size={[2,2]} color="#22c55e" />

      {/* Ramps */}
      <Ramp start={[0,0,-2]} end={[5,0,-5]} width={1.2} color="#6bcb77" />
      <Ramp start={[0,0,-2]} end={[-5,0,-5]} width={1.2} color="#ffd93d" />
      <Ramp start={[5,0,-5]} end={[5,2,-9]} width={1} color="#ff6b6b" />
      <Ramp start={[-5,0,-5]} end={[-5,2,-9]} width={1} color="#c084fc" />
      <Ramp start={[5,2,-9]} end={[0,3,-11]} width={1} color="#4d96ff" />
      <Ramp start={[-5,2,-9]} end={[0,3,-11]} width={1} color="#4d96ff" />
      <Ramp start={[0,3,-11]} end={[8,3.5,-13]} width={0.9} color="#6bcb77" />
      <Ramp start={[0,3,-11]} end={[-8,3.5,-13]} width={0.9} color="#ff6b6b" />
      <Ramp start={[8,3.5,-13]} end={[0,5,-16]} width={0.8} color="#c084fc" />
      <Ramp start={[-8,3.5,-13]} end={[0,5,-16]} width={0.8} color="#c084fc" />
      <Ramp start={[0,5,-16]} end={[0,6.5,-19]} width={0.7} color="#22c55e" />

      {/* Bounce pads */}
      {[[5,0,-6],[-5,0,-6]].map(([x,y,z],i) => (
        <group key={`pad-${i}`} position={[x, y+0.05, z]}>
          <mesh rotation={[-Math.PI/2,0,0]}>
            <ringGeometry args={[0.6, 0.8, 32]} />
            <meshBasicMaterial color="#22c55e" side={THREE.DoubleSide} />
          </mesh>
          <mesh position={[0,0.3,0]}><cylinderGeometry args={[0.5,0.5,0.1,16]} /><meshStandardMaterial color="#22c55e" emissive="#22c55e" emissiveIntensity={0.8} /></mesh>
          <pointLight color="#22c55e" intensity={1.5} distance={6} />
        </group>
      ))}

      {/* Orbs */}
      {ORB_POSITIONS.map((p,i)=><NeonOrb key={i} position={p} color={ORB_COLORS[i]} collected={collectedOrbs.includes(i)}/>)}

      {/* Particles */}
      <Particles />

      <FirstPersonController
        enabled={isActive&&!isPaused}
        moveSpeed={2.2}
        turnSpeed={config.turnSpeedLimit}
        allowMovement={isActive&&!isPaused}
        allowTurning={isActive&&!isPaused}
        verticalMotion
        terrainHeight={(px, pz) => {
          // Bounce pads: if standing on a lower platform looking at a higher one, auto-launch
          const platforms = [
            {x:0,z:-2,y:0,w:3,d:3, bounce:false},
            {x:5,z:-6,y:0,w:2,d:2, bounce:true},   // bounce up to platform at y=2
            {x:-5,z:-6,y:0,w:2,d:2, bounce:true},
            {x:5,z:-9,y:2,w:1.5,d:1.5, bounce:false},
            {x:-5,z:-9,y:2,w:1.5,d:1.5, bounce:false},
            {x:0,z:-11,y:3,w:2,d:2, bounce:false},
            {x:8,z:-13,y:3.5,w:1.25,d:1.25, bounce:false},
            {x:-8,z:-13,y:3.5,w:1.25,d:1.25, bounce:false},
            {x:0,z:-16,y:5,w:1.5,d:1.5, bounce:false},
            {x:0,z:-19,y:6.5,w:1,d:1, bounce:false},
          ];
          for (const p of platforms) {
            if (Math.abs(px-p.x)<p.w && Math.abs(pz-p.z)<p.d) return p.bounce ? p.y + 0.5 : p.y;
          }
          return null;
        }}
        hintText="🖱️点击锁定 · WASD移动 · 走向绿色蹦床跳上高层平台 · 收集10个光球"
      />
    </group>
  );
}
