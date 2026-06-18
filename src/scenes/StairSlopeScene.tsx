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
  { x: 0, y: 0.5, z: -3, label: '🌳 起点' },
  { x: 0, y: 4, z: -16, label: '⛰️ 上坡完成' },
  { x: 0, y: 0.5, z: -30, label: '🏞️ 下到山谷' },
  { x: 0, y: 6, z: -46, label: '🪜 楼梯登顶' },
  { x: 0, y: 0.3, z: -62, label: '🏁 终点' },
];

// === Ground with grass ===
function Ground({ z, w, d }: { z: number; w: number; d: number }) {
  return (
    <mesh position={[0, -0.05, z]} rotation={[-Math.PI/2,0,0]}>
      <planeGeometry args={[w, d]} />
      <meshStandardMaterial color="#3d6b2e" roughness={0.9} />
    </mesh>
  );
}

// === Dirt path (slope) ===
function Path({ start, end, width = 1.4 }: { start: [number,number,number]; end: [number,number,number]; width?: number }) {
  const dx=end[0]-start[0], dy=end[1]-start[1], dz=end[2]-start[2];
  const len=Math.sqrt(dx*dx+dz*dz);
  const angle=Math.atan2(dy,len), rotY=Math.atan2(dx,dz);
  const cx=(start[0]+end[0])/2, cy=(start[1]+end[1])/2, cz=(start[2]+end[2])/2;
  return (
    <mesh position={[cx,cy+0.03,cz]} rotation={[angle,rotY,0]}>
      <planeGeometry args={[width,len]} />
      <meshStandardMaterial color="#b8956e" roughness={0.7} />
    </mesh>
  );
}

// === Big visible stairs ===
function Stairs({ start, end, count = 10, width = 2.5 }: {
  start: [number,number,number]; end: [number,number,number]; count?: number; width?: number;
}) {
  const dx=(end[0]-start[0])/count, dy=(end[1]-start[1])/count, dz=(end[2]-start[2])/count;
  return (
    <group>
      {Array.from({length:count}).map((_,i)=>{
        const x=start[0]+dx*i, y=start[1]+dy*i+0.2, z=start[2]+dz*i;
        return (
          <mesh key={i} position={[x,y,z]} castShadow>
            <boxGeometry args={[width, 0.3, 0.9]} />
            <meshStandardMaterial color={i%2?'#b8a088':'#c8b098'} roughness={0.6} />
          </mesh>
        );
      })}
    </group>
  );
}

// === Tree ===
function Tree({ pos, s = 1 }: { pos: [number,number,number]; s?: number }) {
  return (
    <group position={pos} scale={s}>
      <mesh position={[0,1.2,0]} castShadow><cylinderGeometry args={[0.12,0.18,2.4,8]} /><meshStandardMaterial color="#5a3a20" roughness={0.8} /></mesh>
      <mesh position={[0,2.5,0]} castShadow><coneGeometry args={[1.3,2.2,8,4]} /><meshStandardMaterial color="#2d6a2d" roughness={0.7} /></mesh>
      <mesh position={[0,3.6,0]} castShadow><coneGeometry args={[1,1.8,8,4]} /><meshStandardMaterial color="#3a7a3a" roughness={0.7} /></mesh>
    </group>
  );
}

// === Rail ===
function Rail({ start, end, side }: { start: [number,number,number]; end: [number,number,number]; side: -1|1 }) {
  const dx=end[0]-start[0], dy=end[1]-start[1], dz=end[2]-start[2];
  const len=Math.sqrt(dx*dx+dz*dz);
  const angle=Math.atan2(dy,len), rotY=Math.atan2(dx,dz);
  const cx=(start[0]+end[0])/2+side*1.5, cy=(start[1]+end[1])/2+1, cz=(start[2]+end[2])/2;
  return (
    <group>
      <mesh position={[cx,cy,cz]} rotation={[angle,rotY,0]}><boxGeometry args={[0.06,0.1,len]} /><meshStandardMaterial color="#8b6914" roughness={0.5} /></mesh>
      {Array.from({length:Math.floor(len/1.5)}).map((_,i)=>{
        const t=(i*1.5)/len, px=start[0]+dx*t+side*1.5, py=start[1]+dy*t+0.5, pz=start[2]+dz*t;
        return <mesh key={i} position={[px,py,pz]}><cylinderGeometry args={[0.04,0.04,0.8,6]} /><meshStandardMaterial color="#6b4c3b" /></mesh>;
      })}
    </group>
  );
}

// === Checkpoint sign ===
function Sign({ pos, reached }: { pos: [number,number,number]; reached: boolean }) {
  return (
    <group position={pos}>
      <mesh position={[0,1.2,0]}><cylinderGeometry args={[0.06,0.06,2.4,8]} /><meshStandardMaterial color="#5a3a2a" /></mesh>
      <mesh position={[0,2,0]}><boxGeometry args={[1,0.5,0.05]} /><meshStandardMaterial color={reached?'#22c55e':'#f59e0b'} roughness={0.4} /></mesh>
      <pointLight color={reached?'#22c55e':'#f59e0b'} intensity={reached?0.5:1.5} distance={8} />
    </group>
  );
}

function useNotify(i: number|null) {
  useEffect(()=>{if(i===null)return;const e=document.createElement('div');e.style.cssText='position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);z-index:23;pointer-events:none;text-align:center;animation:cpPop 2s ease-out forwards;';e.innerHTML=`<div style="font-size:40px;">✅</div><div style="background:rgba(15,23,42,0.95);border:2px solid #f59e0b;border-radius:14px;padding:10px 20px;"><p style="color:#f59e0b;font-size:17px;font-weight:bold;margin:0;">${CHECKPOINTS[i].label}</p></div>`;document.body.appendChild(e);setTimeout(()=>e.remove(),2500);return()=>e.remove();},[i]);
}

if(typeof document!=='undefined'&&!document.getElementById('slope-anim2')){const s=document.createElement('style');s.id='slope-anim2';s.textContent='@keyframes cpPop{0%{opacity:0;transform:translate(-50%,-50%) scale(0.6)}25%{opacity:1;transform:translate(-50%,-50%) scale(1.05)}50%{transform:translate(-50%,-50%) scale(1)}100%{opacity:0}}';document.head.appendChild(s);}

export default function StairSlopeScene({ config, isPaused, isActive, onCheckpointReached, reachedCheckpoints=[] }: StairSlopeSceneProps) {
  const [last,setLast]=useState<number|null>(null);
  const trig=useRef(new Set(reachedCheckpoints));
  useEffect(()=>{reachedCheckpoints.forEach(i=>trig.current.add(i));},[reachedCheckpoints]);
  const hp=useCallback((p:THREE.Vector3)=>{CHECKPOINTS.forEach((c,i)=>{if(!trig.current.has(i)&&Math.hypot(p.x-c.x,p.z-c.z)<4){trig.current.add(i);setLast(i);onCheckpointReached?.(i);}});},[onCheckpointReached]);
  useNotify(last);

  const trees=useMemo(()=>{const t:Array<[number,number,number,number]>=[];const r=Math.random;for(let z=0;z>-66;z-=3){t.push([-8+r()*2,0,z+r(),0.6+r()]);t.push([8+r()*2,0,z+r(),0.6+r()]);}return t;},[]);

  const terrainH = (x:number,z:number) => {
    if(z>-3)return 0;if(z>-12)return (Math.abs(z)-3)/9*3.5;if(z>-18)return 3.5;
    if(z>-26)return 3.5-(Math.abs(z)-18)/8*3;if(z>-32)return 0.5;
    if(z>-42)return 0.5+(Math.abs(z)-32)/10*5.2;if(z>-50)return 5.7;
    if(z>-58)return 5.7-(Math.abs(z)-50)/8*5.4;return 0.3;
  };

  return (
    <group>
      <ambientLight intensity={0.6} />
      <directionalLight position={[8,12,4]} intensity={1.0} color="#fff5e8" />
      <hemisphereLight args={['#87ceeb','#3d5a1e',0.4]} />

      <Ground z={-10} w={22} d={20} />
      <Ground z={-30} w={22} d={22} />
      <Ground z={-50} w={22} d={20} />
      <Ground z={-65} w={22} d={16} />

      {trees.map((t,i)=><Tree key={i} pos={[t[0],t[3],t[2]]} s={0.7+t[3]*0.3} />)}

      {/* Trail */}
      <Path start={[0,0,0]} end={[0,0,-3]} />
      <Path start={[0,0,-3]} end={[0,3.5,-12]} /><Rail start={[0,0,-3]} end={[0,3.5,-12]} side={-1} /><Rail start={[0,0,-3]} end={[0,3.5,-12]} side={1} />
      <Path start={[0,3.5,-12]} end={[0,3.5,-18]} />
      <Path start={[0,3.5,-18]} end={[0,0.5,-26]} /><Rail start={[0,3.5,-18]} end={[0,0.5,-26]} side={-1} /><Rail start={[0,3.5,-18]} end={[0,0.5,-26]} side={1} />
      <Path start={[0,0.5,-26]} end={[0,0.5,-32]} />
      <Stairs start={[0,0.5,-32]} end={[0,5.7,-42]} count={12} /><Rail start={[0,0.5,-32]} end={[0,5.7,-42]} side={-1} /><Rail start={[0,0.5,-32]} end={[0,5.7,-42]} side={1} />
      <Path start={[0,5.7,-42]} end={[0,5.7,-50]} />
      <Path start={[0,5.7,-50]} end={[0,0.3,-58]} /><Rail start={[0,5.7,-50]} end={[0,0.3,-58]} side={-1} /><Rail start={[0,5.7,-50]} end={[0,0.3,-58]} side={1} />
      <Path start={[0,0.3,-58]} end={[0,0.3,-64]} />

      {/* Finish */}
      <mesh position={[0,0.33,-64]} rotation={[-Math.PI/2,0,0]}><planeGeometry args={[4,3]} /><meshStandardMaterial color="#22c55e" emissive="#22c55e" emissiveIntensity={0.2} /></mesh>
      <pointLight position={[0,2,-64]} color="#22c55e" intensity={2} distance={10} />

      {CHECKPOINTS.map((c,i)=><Sign key={i} pos={[c.x,c.y,c.z]} reached={reachedCheckpoints.includes(i)} />)}

      <FirstPersonController
        enabled={isActive&&!isPaused} moveSpeed={2.0} turnSpeed={config.turnSpeedLimit}
        allowMovement={isActive&&!isPaused} allowTurning={isActive&&!isPaused}
        terrainHeight={terrainH} onPositionChange={hp}
        hintText="🖱️点击锁定 · WASD移动 · 沿土路前进 · 爬上楼梯"
      />
    </group>
  );
}
