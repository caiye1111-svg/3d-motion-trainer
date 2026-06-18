'use client';

import { Canvas } from '@react-three/fiber';
import { Suspense } from 'react';
import { TrainingSceneConfig, SceneType } from '@/types';
import StaticRoomScene from '@/scenes/StaticRoomScene';
import VisualFlowTunnelScene from '@/scenes/VisualFlowTunnelScene';
import SlowWalkCorridorScene from '@/scenes/SlowWalkCorridorScene';
import TurnTrainingScene from '@/scenes/TurnTrainingScene';
import MazeSearchScene from '@/scenes/MazeSearchScene';
import StairSlopeScene from '@/scenes/StairSlopeScene';
import TrainingArenaScene from '@/scenes/TrainingArenaScene';
import FPSRangeScene from '@/scenes/FPSRangeScene';

interface TrainingCanvasProps {
  config: TrainingSceneConfig;
  isPaused: boolean;
  comfortMode: boolean;
  isActive: boolean;
  elapsedSeconds: number;

  // Lv.1: object search
  foundObjects?: number[];
  onObjectFound?: (index: number) => void;

  // Lv.2: tunnel targets
  showTunnelTarget?: boolean;
  onTunnelTargetClick?: () => void;

  // Lv.3: checkpoint
  reachedCheckpoints?: number[];
  onCheckpointReached?: (index: number) => void;

  // Lv.4: turns
  currentTurnIndex?: number;
  completedTurns?: number[];
  onTurnCompleted?: (angle: number) => void;

  // Lv.5: maze orbs
  collectedOrbs?: number[];
  onOrbCollected?: (index: number) => void;
}

// Map scene type from config level
function getSceneType(config: TrainingSceneConfig): SceneType {
  const map: Record<number, SceneType> = {
    0: 'static_room', 1: 'static_room',
    2: 'visual_flow_tunnel', 3: 'slow_walk_corridor',
    4: 'turn_training', 5: 'maze_search',
    6: 'stair_slope', 7: 'training_arena',
    8: 'fps_range', 9: 'fps_range',
    10: 'open_world_mini', 11: 'open_world_mini', 12: 'target_range',
  };
  return map[config.level] || 'static_room';
}

function SceneRouter(props: TrainingCanvasProps) {
  const sceneType = getSceneType(props.config);
  const {
    config, isPaused, comfortMode, isActive, elapsedSeconds,
    foundObjects, onObjectFound,
    showTunnelTarget, onTunnelTargetClick,
    reachedCheckpoints, onCheckpointReached,
    currentTurnIndex, completedTurns, onTurnCompleted,
    collectedOrbs, onOrbCollected,
  } = props;

  const showCenterDot = comfortMode || config.comfortModeEnabled;

  switch (sceneType) {
    case 'static_room':
      return (
        <StaticRoomScene
          config={config}
          isPaused={isPaused}
          isActive={isActive}
          onObjectFound={onObjectFound}
          foundObjects={foundObjects}
          showCenterDot={showCenterDot}
        />
      );

    case 'visual_flow_tunnel':
      return (
        <VisualFlowTunnelScene
          config={config}
          isPaused={isPaused}
          isActive={isActive}
          elapsedSeconds={elapsedSeconds}
          onTargetClick={onTunnelTargetClick}
        />
      );

    case 'slow_walk_corridor':
      return (
        <SlowWalkCorridorScene
          config={config}
          isPaused={isPaused}
          isActive={isActive}
          onCheckpointReached={onCheckpointReached}
          reachedCheckpoints={reachedCheckpoints}
        />
      );

    case 'turn_training':
      return (
        <TurnTrainingScene
          config={config}
          isPaused={isPaused}
          isActive={isActive}
          onTurnCompleted={onTurnCompleted}
          completedCount={0}
        />
      );

    case 'maze_search':
      return (
        <MazeSearchScene
          config={config}
          isPaused={isPaused}
          isActive={isActive}
          onOrbCollected={onOrbCollected}
          collectedOrbs={collectedOrbs}
        />
      );

    case 'stair_slope':
      return (
        <StairSlopeScene
          config={config}
          isPaused={isPaused}
          isActive={isActive}
          onCheckpointReached={onCheckpointReached}
          reachedCheckpoints={reachedCheckpoints}
        />
      );

    // Lv.7: Training Arena
    case 'training_arena':
      return (
        <TrainingArenaScene
          config={config}
          isPaused={isPaused}
          isActive={isActive}
          onOrbCollected={onOrbCollected}
          collectedOrbs={collectedOrbs}
        />
      );

    // Lv.8, Lv.9: FPS Range
    case 'fps_range':
      return (
        <FPSRangeScene
          config={config}
          isPaused={isPaused}
          isActive={isActive}
          onTargetHit={onTunnelTargetClick}
        />
      );

    // Lv.10-12 fallback: maze with higher params
    case 'target_range':
    case 'open_world_mini':
      return (
        <MazeSearchScene
          config={config}
          isPaused={isPaused}
          isActive={isActive}
          onOrbCollected={onOrbCollected}
          collectedOrbs={collectedOrbs}
        />
      );

    default:
      // Fallback to static room
      return (
        <StaticRoomScene
          config={config}
          isPaused={isPaused}
          isActive={isActive}
        />
      );
  }
}

export default function TrainingCanvas(props: TrainingCanvasProps) {
  const effectiveFov = props.comfortMode
    ? Math.max(50, props.config.fov - 10)
    : props.config.fov;

  return (
    <Canvas
      style={{ background: '#0f172a', width: '100%', height: '100%' }}
      gl={{ antialias: true, alpha: false }}
      dpr={[1, 2]}
      tabIndex={0}
      camera={{ fov: effectiveFov, near: 0.1, far: 200, position: [0, 1.6, 0] }}
      onCreated={({ gl }) => {
        gl.domElement.focus();
        gl.domElement.style.outline = 'none';
      }}
    >
      <Suspense fallback={null}>
        <SceneRouter {...props} />
      </Suspense>
    </Canvas>
  );
}
