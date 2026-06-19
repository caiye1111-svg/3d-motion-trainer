'use client';

import { useRef, useState, useMemo, useCallback, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import FirstPersonController from '@/components/FirstPersonController';
import { TrainingSceneConfig } from '@/types';

interface OpenWorldSceneProps {
  config: TrainingSceneConfig;
  isPaused: boolean;
  isActive: boolean;
  onCheckpointReached?: (index: number) => void;
  reachedCheckpoints?: number[];
}

const CHECKPOINTS = [
  { x: 0, y: 0, z: -4, label: '🏕️ 营地' },
  { x: 6, y: 0, z: -22, label: '🌲 第一路标' },
  { x: -4, y: 0, z: -38, label: '🪨 第二路标' },
  { x: 3, y: 0, z: -54, label: '🌉 第三路标' },
  { x: 0, y: 3, z: -72, label: '🏰 塔楼登顶' },
];

// Grass ground
function Grass({ z }: { z: number }) {
  return (
    <mesh position={[0, -0.05, z]} rotation={[-Math.PI/2,0,0]}>
      <planeGeometry args={[40, 25]} />
      <meshStandardMaterial color="#3d6b2e" roughness={0.9} />
    </mesh>
  );
}

// Dirt road
function Road() {
  return (
    <group>
      {Array.from({length:80}).map((_,i)=>{
        const z=-i;
        const x=Math.sin(z*0.06)*3;
        return (
          <mesh key={i} position={[x,0.01,-z]} rotation={[-Math.PI/2,0,0]}>
            <planeGeometry args={[2.5,1.2]} />
            <meshStandardMaterial color="#b8956e" roughness={0.7} />
          </mesh>
        );
      })}
    </group>
  );
}

// Tree with random variation
function Tree({ pos, scale = 1 }: { pos: [number,number,number]; scale?: number }) {
  return (
    <group position={pos} scale={scale}>
      <mesh position={[0,1.5,0]} castShadow><cylinderGeometry args={[0.15,0.22,3,8]} /><meshStandardMaterial color="#5a3a20" roughness={0.8} /></mesh>
      <mesh position={[0,3.2,0]} castShadow><coneGeometry args={[1.5+Math.random()*0.5,2.5+Math.random(),8,4]} /><meshStandardMaterial color="#2d6a2d" roughness={0.7} /></mesh>
      <mesh position={[0,4.5,0]} castShadow><coneGeometry args={[1.1,2,8,4]} /><meshStandardMaterial color="#3a7a3a" roughness={0.7} /></mesh>
    </group>
  );
}

// Simple building
function Building({ pos, size, color }: { pos: [number,number,number]; size: [number,number,number]; color: string }) {
  return (
    <group position={pos}>
      <mesh castShadow><boxGeometry args={size} /><meshStandardMaterial color={color} roughness={0.6} /></mesh>
      <mesh position={[0,size[1]/2+0.2,0]} rotation={[0,0,0]}><coneGeometry args={[size[0]/2+0.3,0.8,4]} /><meshStandardMaterial color="#8b4513" roughness={0.8} /></mesh>
    </group>
  );
}

// Signpost
function Signpost({ pos, reached, label }: { pos: [number,number,number]; reached: boolean; label: string }) {
  return (
    <group position={pos}>
      <mesh position={[0,1.2,0]}><cylinderGeometry args={[0.06,0.06,2.4,8]} /><meshStandardMaterial color="#5a3a2a" /></mesh>
      <mesh position={[0,2.2,0]}><boxGeometry args={[1.2,0.6,0.05]} /><meshStandardMaterial color={reached?'#22c55e':'#f59e0b'} roughness={0.4} /></mesh>
      <pointLight color={reached?'#22c55e':'#f59e0b'} intensity={reached?0.5:1.5} distance={8} />
    </group>
  );
}

// Tower at the end
function Tower({ pos }: { pos: [number,number,number] }) {
  return (
    <group position={pos}>
      <mesh position={[0,4,0]} castShadow><cylinderGeometry args={[1.5,2,8,8]} /><meshStandardMaterial color="#8a7a6a" roughness={0.6} /></mesh>
      <mesh position={[0,8.5,0]} castShadow><cylinderGeometry args={[0.5,1.5,1,8]} /><meshStandardMaterial color="#7a6a5a" roughness={0.6} /></mesh>
      <mesh position={[0,9.5,0]}><coneGeometry args={[1,1.2,6]} /><meshStandardMaterial color="#8b0000" roughness={0.5} /></mesh>
      <pointLight position={[0,9,0]} color="#ff6600" intensity={2} distance={15} />
    </group>
  );
}

function useNotify(i: number|null) {
  useEffect(()=>{if(i===null)return;const e=document.createElement('div');e.style.cssText='position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);z-index:23;pointer-events:none;text-align:center;animation:cpPop 2s ease-out forwards;';e.innerHTML=`<div style="font-size:40px;">✅</div><div style="background:rgba(15,23,42,0.95);border:2px solid #f59e0b;border-radius:14px;padding:10px 20px;"><p style="color:#f59e0b;font-size:17px;font-weight:bold;margin:0;">${CHECKPOINTS[i].label}</p></div>`;document.body.appendChild(e);setTimeout(()=>e.remove(),2500);return()=>e.remove();},[i]);
}

if(typeof document!=='undefined'&&!document.getElementById('ow-anim')){const s=document.createElement('style');s.id='ow-anim';s.textContent='@keyframes cpPop{0%{opacity:0;transform:translate(-50%,-50%) scale(0.6)}25%{opacity:1;transform:translate(-50%,-50%) scale(1.05)}50%{transform:translate(-50%,-50%) scale(1)}100%{opacity:0}}';document.head.appendChild(s);}

export default function OpenWorldScene({ config, isPaused, isActive, onCheckpointReached, reachedCheckpoints=[] }: OpenWorldSceneProps) {
  const [last,setLast]=useState<number|null>(null);
  const trig=useRef(new Set(reachedCheckpoints));
  useEffect(()=>{reachedCheckpoints.forEach(i=>trig.current.add(i));},[reachedCheckpoints]);
  const hp=useCallback((p:THREE.Vector3)=>{CHECKPOINTS.forEach((c,i)=>{if(!trig.current.has(i)&&Math.hypot(p.x-c.x,p.z-c.z)<4){trig.current.add(i);setLast(i);onCheckpointReached?.(i);}});},[onCheckpointReached]);
  useNotify(last);

  const trees=useMemo(()=>{const t:Array<[number,number,number,number]>=[];const r=Math.random;for(let z=0;z>-80;z-=3){t.push([-10+r()*3,0,z+r(),0.7+r()]);t.push([10+r()*3,0,z+r(),0.7+r()]);t.push([-15+r()*2,0,z-1+r()*2,0.5+r()*0.8]);t.push([15+r()*2,0,z-1+r()*2,0.5+r()*0.8]);}return t;},[]);

  return (
    <group>
      <ambientLight intensity={0.5} />
      <directionalLight position={[10,15,5]} intensity={1.0} color="#fff5e8" castShadow />
      <hemisphereLight args={['#87ceeb','#3d5a1e',0.4]} />

      <Grass z={-10} /><Grass z={-35} /><Grass z={-60} /><Grass z={-80} />
      <Road />
      {trees.map((t,i)=><Tree key={i} pos={[t[0],t[3],t[2]]} scale={0.7+t[3]*0.3} />)}

      <Building pos={[5,1,10]} size={[3,2.5,3]} color="#d4c5a0" />
      <Building pos={[-8,0.7,-15]} size={[2,1.5,2]} color="#c4b590" />
      <Building pos={[6,0.5,-50]} size={[4,3,4]} color="#b8a880" />

      <Tower pos={[0,0,-76]} />

      {CHECKPOINTS.map((c,i)=><Signpost key={i} pos={[c.x,c.y,c.z]} reached={reachedCheckpoints.includes(i)} label={c.label} />)}

      <mesh position={[0,0.03,0]} rotation={[-Math.PI/2,0,0]}><ringGeometry args={[0.6,0.8,32]} /><meshBasicMaterial color="#22c55e" side={THREE.DoubleSide} /></mesh>

      <FirstPersonController
        enabled={isActive&&!isPaused} moveSpeed={config.movementSpeed} turnSpeed={config.turnSpeedLimit}
        allowMovement={isActive&&!isPaused} allowTurning={isActive&&!isPaused}
        headBobStrength={config.headBobStrength} onPositionChange={hp}
        hintText={`🖱️点击锁定 · WASD移动 · 沿土路走到塔楼 · 速度 ${config.movementSpeed}m/s`}
      />
    </group>
  );
}
