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
    0: '静态 3D 房间，确认屏幕适配安全',
    1: '在房间里走动，找到 3 个发光方块',
    2: '隧道中点击光球，训练视觉流适应',
    3: '沿走廊前进，穿过 5 个发光检查点',
    4: '圆形房间内转头对准角度靶标',
    5: '开阔场地内收集 5 个发光球体',
    6: '山林徒步路线，上坡、下坡、爬楼梯',
    7: '多层霓虹平台间跳跃收集 10 个光球',
    8: '射击位瞄准点击弹出的人形靶子',
    9: '移动中射击靶子，训练瞄准+移动协调',
    10: '小型户外地图，营地走到塔楼',
    11: '慢跑穿越街区，加入镜头晃动',
    12: '高级综合挑战，自由选择专项训练',
  };
  return descriptions[levelId] || `等级 ${levelId} 训练`;
}
