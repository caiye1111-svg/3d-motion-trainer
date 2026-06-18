'use client';

import { useRef, useEffect, useCallback } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export interface ControllerState {
  position: THREE.Vector3;
  rotation: THREE.Euler;
  isMoving: boolean;
  isTurning: boolean;
}

interface FirstPersonControllerProps {
  enabled: boolean;
  moveSpeed: number;
  turnSpeed: number;
  allowMovement: boolean;
  allowTurning: boolean;
  onMove?: (state: ControllerState) => void;
  onPositionChange?: (pos: THREE.Vector3) => void;
  verticalMotion?: boolean;
  headBobStrength?: number;
  /** Custom hint text to display at bottom of screen */
  hintText?: string;
  /** Terrain height function: given (x, z), return ground Y */
  terrainHeight?: (x: number, z: number) => number | null;
}

const _euler = new THREE.Euler(0, 0, 0, 'YXZ');
const _PI_2 = Math.PI / 2;

export default function FirstPersonController({
  enabled,
  moveSpeed,
  turnSpeed,
  allowMovement,
  allowTurning,
  onMove,
  onPositionChange,
  verticalMotion = false,
  headBobStrength = 0,
  hintText,
  terrainHeight,
}: FirstPersonControllerProps) {
  const { camera, gl } = useThree();
  const keys = useRef<Set<string>>(new Set());
  const isLocked = useRef(false);
  const headBobPhase = useRef(0);

  const effectiveTurnSpeed = turnSpeed * 0.003;

  // Pointer lock
  const requestLock = useCallback(() => {
    if (!isLocked.current) gl.domElement.requestPointerLock();
  }, [gl]);

  useEffect(() => {
    const canvas = gl.domElement;
    canvas.addEventListener('click', requestLock);

    const onLockChange = () => {
      isLocked.current = document.pointerLockElement === canvas;
      // Show/hide overlay when unlocked
      const overlay = document.getElementById('unlock-overlay');
      if (!isLocked.current && enabled) {
        if (!overlay) {
          const el = document.createElement('div');
          el.id = 'unlock-overlay';
          el.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.4);z-index:20;display:flex;align-items:center;justify-content:center;cursor:pointer;';
          el.innerHTML = '<div style="background:rgba(15,23,42,0.95);border:2px solid #f59e0b;border-radius:20px;padding:20px 32px;text-align:center;pointer-events:none;"><div style="font-size:40px;">🖱️</div><p style="color:#f59e0b;font-size:18px;font-weight:bold;margin:8px 0 0;">点击画面继续</p></div>';
          el.addEventListener('click', () => { canvas.requestPointerLock(); el.remove(); });
          document.body.appendChild(el);
        }
      } else if (overlay) {
        overlay.remove();
      }
    };
    const onKeyDown = (e: KeyboardEvent) => keys.current.add(e.key.toLowerCase());
    const onKeyUp = (e: KeyboardEvent) => keys.current.delete(e.key.toLowerCase());

    document.addEventListener('pointerlockchange', onLockChange);
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);

    return () => {
      canvas.removeEventListener('click', requestLock);
      document.removeEventListener('pointerlockchange', onLockChange);
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('keyup', onKeyUp);
      keys.current.clear();
    };
  }, [gl, requestLock]);

  // Mouse look
  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!enabled || !isLocked.current || !allowTurning) return;
      _euler.setFromQuaternion(camera.quaternion);
      _euler.y -= e.movementX * effectiveTurnSpeed;
      _euler.x -= e.movementY * effectiveTurnSpeed;
      _euler.x = Math.max(-_PI_2, Math.min(_PI_2, _euler.x));
      camera.quaternion.setFromEuler(_euler);
    };
    document.addEventListener('mousemove', onMouseMove);
    return () => document.removeEventListener('mousemove', onMouseMove);
  }, [enabled, allowTurning, camera, effectiveTurnSpeed]);

  // Movement
  useFrame((_, delta) => {
    if (!enabled || !isLocked.current || !allowMovement) return;
    const k = keys.current;
    let forward = 0, strafe = 0, up = 0;
    if (k.has('w') || k.has('arrowup')) forward = -1;
    if (k.has('s') || k.has('arrowdown')) forward = 1;
    if (k.has('a') || k.has('arrowleft')) strafe = -1;
    if (k.has('d') || k.has('arrowright')) strafe = 1;
    if (verticalMotion) { if (k.has('q')) up = 1; if (k.has('e')) up = -1; }

    const isMoving = forward !== 0 || strafe !== 0;
    let bobOffset = 0;
    if (isMoving && headBobStrength > 0) {
      headBobPhase.current += delta * 8;
      bobOffset = Math.sin(headBobPhase.current) * headBobStrength * 0.02;
    }

    const direction = new THREE.Vector3(strafe, up, forward).normalize();
    direction.applyQuaternion(camera.quaternion);
    direction.y = verticalMotion ? direction.y : 0;
    direction.normalize();
    camera.position.addScaledVector(direction, moveSpeed * delta);
    if (headBobStrength > 0) camera.position.y += bobOffset;

    // Terrain following
    if (terrainHeight && isMoving) {
      const h = terrainHeight(camera.position.x, camera.position.z);
      if (h !== null) {
        camera.position.y = h + 1.6; // eye height above terrain
      }
    }

    if (onMove) onMove({ position: camera.position.clone(), rotation: new THREE.Euler().setFromQuaternion(camera.quaternion), isMoving, isTurning: false });
    if (onPositionChange) onPositionChange(camera.position.clone());
  });

  // Hint display
  useEffect(() => {
    if (!enabled) return;
    const hint = document.createElement('div');
    hint.id = 'fps-hint';
    hint.style.cssText = 'position:fixed;bottom:16px;left:50%;transform:translateX(-50%);background:rgba(15,23,42,0.9);color:#94a3b8;padding:8px 20px;border-radius:20px;font-size:13px;z-index:25;pointer-events:none;transition:opacity 0.3s;';
    const defaultHint = allowMovement ? '🖱️点击锁定 · WASD移动 · 鼠标转向 · ESC释放' : '🖱️点击锁定 · 鼠标转头寻找物体 · ESC释放';
    hint.textContent = hintText || defaultHint;
    document.body.appendChild(hint);

    const onLock = () => { hint.style.opacity = document.pointerLockElement === gl.domElement ? '0' : '1'; };
    document.addEventListener('pointerlockchange', onLock);
    return () => { hint.remove(); document.removeEventListener('pointerlockchange', onLock); };
  }, [enabled, gl, hintText, allowMovement]);

  return null;
}
