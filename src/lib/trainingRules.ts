import { SystemRecommendation } from '@/types';

export interface SessionResult {
  completed: boolean;
  peakScore: number;
  postScore: number;
  recoveryMinutes: number;
  severeSymptoms: string[] | null;
}

export function decideNextTraining(result: SessionResult): SystemRecommendation {
  const { peakScore, postScore, recoveryMinutes, completed, severeSymptoms } = result;

  const hasSevere = severeSymptoms && severeSymptoms.length > 0;

  // 强制休息
  if (hasSevere || peakScore >= 8 || recoveryMinutes > 30) {
    return {
      action: 'rest',
      message: '今天建议停止训练，让身体充分休息。下一次训练会自动降低强度。如果症状持续，请咨询医生。',
    };
  }

  // 降级
  if (!completed || peakScore >= 6 || recoveryMinutes > 15) {
    return {
      action: 'downgrade',
      message: '下一次训练将降低一个等级或缩短训练时长，让身体有更多适应时间。',
    };
  }

  // 保持
  if (peakScore >= 4 || postScore >= 4 || recoveryMinutes > 5) {
    return {
      action: 'maintain',
      message: '表现不错！建议在当前等级再练习几次，巩固适应效果。',
    };
  }

  // 候选升级
  if (peakScore <= 3 && postScore <= 3 && recoveryMinutes <= 5 && completed) {
    return {
      action: 'candidate_upgrade',
      message: '表现稳定！再完成一次类似训练，系统将为你解锁下一个等级。',
    };
  }

  return {
    action: 'maintain',
    message: '保持当前等级继续训练。',
  };
}

export function getComfortModeConfig() {
  return {
    speedReduction: 0.3,
    turnSpeedReduction: 0.3,
    fovReduction: 10,
    showCenterDot: true,
    pauseAnimations: true,
  };
}

export function applyComfortMode(
  speed: number,
  turnSpeed: number,
  fov: number
): { speed: number; turnSpeed: number; fov: number } {
  const comfort = getComfortModeConfig();
  return {
    speed: speed * (1 - comfort.speedReduction),
    turnSpeed: turnSpeed * (1 - comfort.turnSpeedReduction),
    fov: Math.max(50, fov - comfort.fovReduction),
  };
}

export function getLevelDescription(levelId: number): string {
  const descriptions: Record<number, string> = {
    0: '观看静态 3D 场景，确认屏幕适配安全',
    1: '在房间中慢速转动视角，找到指定物体',
    2: '注视中央点，适应低速前进的视觉流',
    3: '按 W 键主动前进，经过走廊检查点',
    4: '按提示完成小角度左右转向训练',
    5: '探索小迷宫，收集发光球体',
  };
  return descriptions[levelId] || `等级 ${levelId} 训练`;
}
