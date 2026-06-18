import { TrainingLevel, TrainingSceneConfig, SceneType } from '@/types';

export const TRAINING_LEVELS: TrainingLevel[] = [
  { id: 0, name: '安全与屏幕适配', description: '确认你能安全看到基础 3D 画面', scene_type: 'static_room', default_duration_seconds: 60, max_duration_seconds: 120, movement_speed: 0, turn_speed: 0, fov: 70, head_bob_strength: 0, visual_complexity: 1, vertical_motion: false },
  { id: 1, name: '静态 3D 空间适应', description: '在房间里走动，找到 3 个发光方块', scene_type: 'static_room', default_duration_seconds: 180, max_duration_seconds: 300, movement_speed: 1.2, turn_speed: 30, fov: 75, head_bob_strength: 0, visual_complexity: 1, vertical_motion: false },
  { id: 2, name: '隧道视觉流 + 靶标', description: '隧道中点击出现的光球，训练视觉流适应', scene_type: 'visual_flow_tunnel', default_duration_seconds: 240, max_duration_seconds: 360, movement_speed: 0.8, turn_speed: 0, fov: 80, head_bob_strength: 0, visual_complexity: 2, vertical_motion: false },
  { id: 3, name: '走廊检查点', description: '沿走廊前进，穿过 5 个发光检查点到达终点', scene_type: 'slow_walk_corridor', default_duration_seconds: 300, max_duration_seconds: 420, movement_speed: 2.2, turn_speed: 25, fov: 80, head_bob_strength: 0, visual_complexity: 2, vertical_motion: false },
  { id: 4, name: '转向瞄准训练', description: '站在圆形房间中央，转头对准出现的黄色光球', scene_type: 'turn_training', default_duration_seconds: 240, max_duration_seconds: 360, movement_speed: 0, turn_speed: 45, fov: 80, head_bob_strength: 0, visual_complexity: 2, vertical_motion: false },
  { id: 5, name: '小迷宫找光球', description: '在开放房间中探索，收集 5 个发光球体', scene_type: 'maze_search', default_duration_seconds: 360, max_duration_seconds: 480, movement_speed: 2.8, turn_speed: 40, fov: 85, head_bob_strength: 0, visual_complexity: 3, vertical_motion: false },
  { id: 6, name: '上下坡与楼梯', description: '走上缓坡、短楼梯、平台，适应垂直运动', scene_type: 'stair_slope', default_duration_seconds: 300, max_duration_seconds: 420, movement_speed: 1.4, turn_speed: 50, fov: 80, head_bob_strength: 0, visual_complexity: 3, vertical_motion: true },
  { id: 7, name: '收集光球任务', description: '在训练场内收集 10 个光球，含上下坡和转向', scene_type: 'maze_search', default_duration_seconds: 420, max_duration_seconds: 540, movement_speed: 1.8, turn_speed: 80, fov: 85, head_bob_strength: 0, visual_complexity: 3, vertical_motion: true },
  { id: 8, name: 'FPS 静态靶场', description: '站在原地瞄准点击静态靶子，训练瞄准和视角微调', scene_type: 'target_range', default_duration_seconds: 360, max_duration_seconds: 480, movement_speed: 0, turn_speed: 90, fov: 90, head_bob_strength: 0, visual_complexity: 3, vertical_motion: false },
  { id: 9, name: 'FPS 移动靶', description: '靶子移动+左右平移+90°转身瞄准', scene_type: 'target_range', default_duration_seconds: 420, max_duration_seconds: 540, movement_speed: 2.0, turn_speed: 100, fov: 90, head_bob_strength: 0, visual_complexity: 4, vertical_motion: false },
  { id: 10, name: '开放世界探索', description: '小型户外地图，从营地走到塔楼，观察远近景', scene_type: 'open_world_mini', default_duration_seconds: 480, max_duration_seconds: 600, movement_speed: 2.5, turn_speed: 100, fov: 90, head_bob_strength: 0, visual_complexity: 4, vertical_motion: true },
  { id: 11, name: '跑步 + 镜头晃动', description: '慢跑穿过街区，轻微 head bob 可关闭', scene_type: 'open_world_mini', default_duration_seconds: 480, max_duration_seconds: 600, movement_speed: 3.5, turn_speed: 110, fov: 95, head_bob_strength: 10, visual_complexity: 5, vertical_motion: true },
  { id: 12, name: '高级综合挑战', description: '选择专项：FPS综合/开放世界跑图/低速驾驶', scene_type: 'target_range', default_duration_seconds: 600, max_duration_seconds: 900, movement_speed: 3.0, turn_speed: 120, fov: 100, head_bob_strength: 15, visual_complexity: 5, vertical_motion: true },
];

export function getLevelConfig(levelId: number): TrainingLevel | undefined {
  return TRAINING_LEVELS.find(l => l.id === levelId);
}

export function buildSceneConfig(level: TrainingLevel, overrides?: Partial<TrainingSceneConfig>): TrainingSceneConfig {
  return {
    level: level.id,
    durationSeconds: level.default_duration_seconds,
    movementSpeed: level.movement_speed,
    turnSpeedLimit: level.turn_speed,
    fov: level.fov,
    headBobStrength: level.head_bob_strength,
    visualComplexity: level.visual_complexity as 1 | 2 | 3 | 4 | 5,
    verticalMotion: level.vertical_motion,
    targetCount: level.scene_type === 'maze_search' ? (level.id === 7 ? 10 : 5) : 3,
    checkpointIntervalSeconds: 60,
    comfortModeEnabled: false,
    ...overrides,
  };
}
