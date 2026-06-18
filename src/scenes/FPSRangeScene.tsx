'use client';

import { useRef, useState, useEffect, useCallback } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { TrainingSceneConfig } from '@/types';

interface FPSRangeSceneProps {
  config: TrainingSceneConfig;
  isPaused: boolean;
  isActive: boolean;
  onTargetHit?: () => void;
}

function Target({ pos, active, meshRef }: {
  pos: [number,number,number]; active: boolean;
  meshRef: React.RefObject<THREE.Mesh | null>;
}) {
  if (!active) return null;
  return (
    <group position={pos}>
      <mesh ref={meshRef as any} position={[0,0.8,0]}>
        <capsuleGeometry args={[0.25,1.2,8,16]} />
        <meshStandardMaterial color="#ef4444" roughness={0.3} />
      </mesh>
      <mesh position={[0,1.7,0]}>
        <sphereGeometry args={[0.2,16,16]} />
        <meshStandardMaterial color="#ef4444" />
      </mesh>
      <mesh position={[0,1.1,0.01]}>
        <torusGeometry args={[0.18,0.03,8,16]} />
        <meshBasicMaterial color="#fff" />
      </mesh>
    </group>
  );
}

function Lane() {
  return (
    <group position={[0,0,-10]}>
      <mesh rotation={[-Math.PI/2,0,0]} receiveShadow>
        <planeGeometry args={[6,30]} />
        <meshStandardMaterial color="#1a1a1a" roughness={0.9} />
      </mesh>
      <mesh position={[-3,1.5,-10]}><boxGeometry args={[0.2,3,20]} /><meshStandardMaterial color="#2a2a2a" /></mesh>
      <mesh position={[3,1.5,-10]}><boxGeometry args={[0.2,3,20]} /><meshStandardMaterial color="#2a2a2a" /></mesh>
      <mesh position={[0,3,-10]} rotation={[Math.PI,0,0]}><planeGeometry args={[6,20]} /><meshStandardMaterial color="#0a0a0a" /></mesh>
    </group>
  );
}

function ScoreHUD({ hits, misses }: { hits:number; misses:number }) {
  useEffect(()=>{
    let el=document.getElementById('fps-hud');
    if(!el){el=document.createElement('div');el.id='fps-hud';el.style.cssText='position:fixed;top:100px;left:50%;transform:translateX(-50%);z-index:25;pointer-events:none;';document.body.appendChild(el);}
    const t=hits+misses, acc=t>0?Math.round(hits/t*100):0;
    el.innerHTML=`<div style="background:rgba(15,23,42,0.95);border-radius:16px;padding:10px 24px;border:1px solid #334155;display:flex;gap:24px;align-items:center;">
      <div><span style="color:#64748b;font-size:11px;">命中</span><br><span style="color:#22c55e;font-size:18px;font-weight:bold;">${hits}/20</span></div>
      <div><span style="color:#64748b;font-size:11px;">精度</span><br><span style="color:#e2e8f0;font-size:18px;font-weight:bold;">${acc}%</span></div>
      <div style="margin-left:8px;background:#1e293b;border-radius:8px;height:6px;width:80px;overflow:hidden;"><div style="background:linear-gradient(90deg,#22c55e,#3b82f6);height:100%;width:${hits/20*100}%;transition:width 0.3s;"></div></div>
    </div>`;
    return()=>{if(el)el.remove();};
  },[hits,misses]);
  return null;
}

function Hint() {
  useEffect(()=>{
    const el=document.createElement('div');el.id='fps-hint';
    el.style.cssText='position:fixed;bottom:16px;left:50%;transform:translateX(-50%);background:rgba(15,23,42,0.9);color:#94a3b8;padding:8px 20px;border-radius:20px;font-size:13px;z-index:25;pointer-events:none;';
    el.textContent='🖱️点击锁定 · 鼠标瞄准 · 左键点击靶子射击';
    document.body.appendChild(el);
    const c=document.querySelector('canvas');
    if(c){const f=()=>{el.style.opacity=document.pointerLockElement===c?'0':'1';};document.addEventListener('pointerlockchange',f);return()=>{el.remove();document.removeEventListener('pointerlockchange',f);};}
    return()=>el.remove();
  },[]);
  return null;
}

export default function FPSRangeScene({ config, isPaused, isActive, onTargetHit }: FPSRangeSceneProps) {
  const { camera, gl, raycaster } = useThree();
  const [hits, setHits] = useState(0);
  const [misses, setMisses] = useState(0);
  const [activeTargets, setActive] = useState<Array<{id:number; pos:[number,number,number]}>>([]);
  const nextId = useRef(0);
  const targetRefs = useRef<THREE.Mesh[]>([]);
  const totalTargets = 20;

  // Lock player
  useFrame(()=>{if(isActive&&!isPaused)camera.position.set(0,1.6,2);});

  // Mouse look
  useEffect(()=>{
    if(!isActive||isPaused)return;
    const c=gl.domElement;
    let locked=false;
    const cl=()=>{if(!locked)c.requestPointerLock();};
    const lc=()=>{locked=document.pointerLockElement===c;};
    const mm=(e:MouseEvent)=>{if(!locked)return;const eu=new THREE.Euler().setFromQuaternion(camera.quaternion,'YXZ');eu.y-=e.movementX*0.0015;eu.x-=e.movementY*0.001;eu.x=Math.max(-Math.PI/4,Math.min(Math.PI/4,eu.x));camera.quaternion.setFromEuler(eu);};
    c.addEventListener('click',cl);
    document.addEventListener('pointerlockchange',lc);
    document.addEventListener('mousemove',mm);
    return()=>{c.removeEventListener('click',cl);document.removeEventListener('pointerlockchange',lc);document.removeEventListener('mousemove',mm);};
  },[isActive,isPaused,camera,gl]);

  // Click to shoot
  useEffect(()=>{
    if(!isActive||isPaused)return;
    const onDown=(e:MouseEvent)=>{
      if(e.button!==0||document.pointerLockElement!==gl.domElement)return;
      const r=new THREE.Raycaster();
      r.setFromCamera(new THREE.Vector2(0,0),camera);
      const meshes=targetRefs.current.filter(m=>m&&m.parent?.visible!==false);
      const intersects=r.intersectObjects(meshes);
      if(intersects.length>0){
        const obj=intersects[0].object;
        if(obj.parent){obj.parent.visible=false;obj.visible=false;}
        setHits(h=>h+1);
        onTargetHit?.();
      }
    };
    document.addEventListener('mousedown',onDown);
    return()=>document.removeEventListener('mousedown',onDown);
  },[isActive,isPaused,camera,gl,onTargetHit]);

  // Spawn targets
  useEffect(()=>{
    if(!isActive||isPaused)return;
    const spawn=()=>{
      const activeCount=activeTargets.filter(t=>{const m=targetRefs.current[t.id];return m&&m.parent?.visible!==false;}).length;
      if(activeCount>=3||hits+misses>=totalTargets)return;
      const id=nextId.current++;
      const lane=(Math.random()-0.5)*4;
      const dist=5+Math.random()*14;
      const h=0.3+Math.random()*1.5;
      setActive(p=>[...p,{id,pos:[lane,h,-dist]}]);
      setTimeout(()=>{
        const m=targetRefs.current[id];
        if(m&&m.parent&&m.parent.visible!==false){m.parent.visible=false;m.visible=false;setMisses(m=>m+1);}
      },3500+Math.random()*1500);
    };
    spawn();spawn();
    const iv=setInterval(spawn,2000);
    return()=>clearInterval(iv);
  },[isActive,isPaused,hits,misses,activeTargets.length]);

  // Auto-complete
  useEffect(()=>{if(hits>=totalTargets)onTargetHit?.();},[hits]);

  return (
    <group>
      <ambientLight intensity={0.4} />
      <pointLight position={[0,3,2]} intensity={0.5} />
      <spotLight position={[0,4,0]} angle={0.3} penumbra={0.5} intensity={0.8} />

      <mesh position={[0,1.2,0]}><boxGeometry args={[3,0.15,1.2]} /><meshStandardMaterial color="#3a3a3a" roughness={0.4} metalness={0.3} /></mesh>
      <Lane />
      <mesh position={[0,2,-22]}><planeGeometry args={[8,4]} /><meshStandardMaterial color="#111" /></mesh>

      {activeTargets.map(t=>(
        <Target key={t.id} pos={t.pos} active={true}
          meshRef={{current:targetRefs.current[t.id]||(targetRefs.current[t.id]=new THREE.Mesh()) as any}} />
      ))}

      <ScoreHUD hits={hits} misses={misses} />
      <Hint />
    </group>
  );
}
