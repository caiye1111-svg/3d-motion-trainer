import * as THREE from 'three';

// Common materials
export const WALL_COLOR = '#1e293b';
export const FLOOR_COLOR = '#334155';
export const ACCENT_COLORS = ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#a855f7'];
export const ORB_COLOR = '#fbbf24';
export const CHECKPOINT_COLOR = '#06b6d4';

// Simple room builder
export function Room({ width = 8, depth = 8, height = 3, wallColor = WALL_COLOR, floorColor = FLOOR_COLOR }: {
  width?: number;
  depth?: number;
  height?: number;
  wallColor?: string;
  floorColor?: string;
}) {
  const hw = width / 2;
  const hd = depth / 2;

  return (
    <group>
      {/* Floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[width, depth]} />
        <meshStandardMaterial color={floorColor} />
      </mesh>
      {/* Ceiling */}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, height, 0]}>
        <planeGeometry args={[width, depth]} />
        <meshStandardMaterial color="#0f172a" />
      </mesh>
      {/* Walls */}
      <Wall pos={[0, height / 2, -hd]} rot={[0, 0, 0]} w={width} h={height} color={wallColor} />
      <Wall pos={[0, height / 2, hd]} rot={[0, Math.PI, 0]} w={width} h={height} color={wallColor} />
      <Wall pos={[-hw, height / 2, 0]} rot={[0, Math.PI / 2, 0]} w={depth} h={height} color={wallColor} />
      <Wall pos={[hw, height / 2, 0]} rot={[0, -Math.PI / 2, 0]} w={depth} h={height} color={wallColor} />
    </group>
  );
}

function Wall({ pos, rot, w, h, color }: { pos: [number, number, number]; rot: [number, number, number]; w: number; h: number; color: string }) {
  return (
    <mesh position={pos} rotation={rot as any} receiveShadow>
      <planeGeometry args={[w, h]} />
      <meshStandardMaterial color={color} side={THREE.DoubleSide} />
    </mesh>
  );
}

// Glowing orb (target/collectible)
export function GlowingOrb({ position, color = ORB_COLOR, collected = false, onClick }: {
  position: [number, number, number];
  color?: string;
  collected?: boolean;
  onClick?: () => void;
}) {
  if (collected) return null;

  return (
    <mesh position={position} onClick={onClick}>
      <sphereGeometry args={[0.3, 32, 32]} />
      <meshStandardMaterial
        color={color}
        emissive={color}
        emissiveIntensity={0.8}
        roughness={0.2}
      />
      <pointLight color={color} intensity={0.5} distance={3} />
    </mesh>
  );
}

// Checkpoint marker
export function CheckpointMarker({ position, reached = false }: {
  position: [number, number, number];
  reached?: boolean;
}) {
  return (
    <group position={position}>
      <mesh rotation={[0, 0, 0]}>
        <ringGeometry args={[0.4, 0.55, 32]} />
        <meshBasicMaterial color={reached ? '#22c55e' : CHECKPOINT_COLOR} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.4, 0.55, 32]} />
        <meshBasicMaterial color={reached ? '#22c55e' : CHECKPOINT_COLOR} side={THREE.DoubleSide} />
      </mesh>
      {!reached && (
        <pointLight color={CHECKPOINT_COLOR} intensity={0.4} distance={4} />
      )}
    </group>
  );
}

// Simple box object (for room search)
export function ColoredBox({ position, color, size = 0.5, found = false }: {
  position: [number, number, number];
  color: string;
  size?: number;
  found?: boolean;
}) {
  return (
    <mesh position={position} castShadow>
      <boxGeometry args={[size, size, size]} />
      <meshStandardMaterial
        color={found ? '#334155' : color}
        emissive={found ? '#000' : color}
        emissiveIntensity={found ? 0 : 0.3}
        roughness={found ? 0.8 : 0.3}
      />
    </mesh>
  );
}

// Center crosshair / fixation dot
export function CenterDot({ visible = true, color = '#22c55e' }: { visible?: boolean; color?: string }) {
  if (!visible) return null;
  return (
    <mesh position={[0, 0, -2]} renderOrder={999}>
      <ringGeometry args={[0.015, 0.03, 32]} />
      <meshBasicMaterial color={color} depthTest={false} />
    </mesh>
  );
}
