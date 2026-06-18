// User & Auth
export interface User {
  id: string;
  email: string;
  nickname: string;
  created_at: string;
  initial_severity: string | null;
  target_mode: string | null;
  current_level: number;
  is_premium: boolean;
}

// Onboarding
export interface OnboardingAnswers {
  fps_tolerance_minutes: number;
  main_symptom: string;
  trigger_type: string;
  motion_sickness_history: boolean;
  recovery_minutes: number;
  risk_flags: string[];
  recommended_start_level: number;
}

// Training
export interface TrainingLevel {
  id: number;
  name: string;
  description: string;
  scene_type: SceneType;
  default_duration_seconds: number;
  max_duration_seconds: number;
  movement_speed: number;
  turn_speed: number;
  fov: number;
  head_bob_strength: number;
  visual_complexity: number;
  vertical_motion: boolean;
}

export type SceneType =
  | 'static_room'
  | 'visual_flow_tunnel'
  | 'slow_walk_corridor'
  | 'turn_training'
  | 'maze_search'
  | 'stair_slope'
  | 'target_range'
  | 'moving_targets'
  | 'open_world_mini'
  | 'running_bob'
  | 'advanced_fps'
  | 'advanced_open_world';

export interface TrainingSceneConfig {
  level: number;
  durationSeconds: number;
  movementSpeed: number;
  turnSpeedLimit: number;
  fov: number;
  headBobStrength: number;
  visualComplexity: 1 | 2 | 3 | 4 | 5;
  verticalMotion: boolean;
  targetCount: number;
  checkpointIntervalSeconds: number;
  comfortModeEnabled: boolean;
}

export interface TrainingSession {
  id: string;
  user_id: string;
  level_id: number;
  mode: string;
  started_at: string;
  ended_at: string | null;
  planned_duration_seconds: number;
  actual_duration_seconds: number;
  completed: boolean;
  pre_score: number;
  peak_score: number;
  post_score: number;
  recovery_minutes: number;
  comfort_mode_used: boolean;
  stopped_reason: string | null;
  severe_symptoms: string[] | null;
  system_recommendation: string | null;
  user_note: string | null;
}

export interface SymptomCheckpoint {
  id: string;
  session_id: string;
  timestamp_seconds: number;
  score: number;
  symptom_tags: string[];
}

export interface UserLevelProgress {
  id: string;
  user_id: string;
  level_id: number;
  completed_count: number;
  stable_success_count: number;
  last_peak_score: number;
  last_recovery_minutes: number;
  unlocked: boolean;
}

export type SystemRecommendation = {
  action: 'rest' | 'downgrade' | 'maintain' | 'candidate_upgrade';
  message: string;
};

export type ComfortMode = {
  speedReduction: number;
  turnSpeedReduction: number;
  fovReduction: number;
  showCenterDot: boolean;
  pauseAnimations: boolean;
};
