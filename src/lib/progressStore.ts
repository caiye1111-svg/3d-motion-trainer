'use client';

const STORAGE_KEY = 'motion_trainer_progress';

export interface LevelProgress {
  levelId: number;
  completedCount: number;
  failedCount: number;
  unlocked: boolean;
  lastPlayedAt?: string;
  lastPeakScore?: number;
  lastRecovery?: number;
}

export interface UserProgress {
  currentLevel: number;
  levels: Record<number, LevelProgress>;
  totalSessions: number;
  completedSessions: number;
  streak: number;
  lastSessionDate?: string;
  consecutiveFails: number;
  dailySessions: number;
  dailySessionDate?: string;
}

function getDefaultProgress(): UserProgress {
  // Dev mode: unlock all available levels for easy testing
  const levels: Record<number, LevelProgress> = {};
  for (let i = 0; i <= 12; i++) {
    levels[i] = { levelId: i, completedCount: 0, failedCount: 0, unlocked: true };
  }
  return {
    currentLevel: 1,
    levels,
    totalSessions: 0,
    completedSessions: 0,
    streak: 0,
    consecutiveFails: 0,
    dailySessions: 0,
  };
}

export function loadProgress(): UserProgress {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return getDefaultProgress();
}

export function saveProgress(progress: UserProgress) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
}

export interface SessionResult {
  newLevel: number;
  unlocked: number[];
  recommendation: string;
  recommendationAction: 'rest' | 'downgrade' | 'maintain' | 'upgrade';
  shouldRest: boolean;
  dailyLimitWarning: boolean;
}

/** Record a completed training session and update unlocks */
export function recordSession(
  levelId: number,
  peakScore: number,
  postScore: number,
  recoveryMinutes: number,
  completed: boolean,
  severeSymptoms: boolean,
): SessionResult {
  const progress = loadProgress();
  const today = new Date().toDateString();

  // Daily session tracking
  if (progress.dailySessionDate !== today) {
    progress.dailySessions = 0;
    progress.dailySessionDate = today;
  }
  progress.dailySessions += 1;
  progress.totalSessions += 1;
  if (completed) progress.completedSessions += 1;

  // Update level stats
  const level = progress.levels[levelId] || { levelId, completedCount: 0, failedCount: 0, unlocked: true };
  if (completed) level.completedCount += 1;
  else level.failedCount += 1;
  level.lastPlayedAt = new Date().toISOString();
  level.lastPeakScore = peakScore;
  level.lastRecovery = recoveryMinutes;
  progress.levels[levelId] = level;

  // Streak
  const yesterday = new Date(Date.now() - 86400000).toDateString();
  if (progress.lastSessionDate === yesterday) progress.streak += 1;
  else if (progress.lastSessionDate !== today) progress.streak = 1;
  progress.lastSessionDate = today;

  // === Decision logic ===
  let recommendationAction: SessionResult['recommendationAction'] = 'maintain';
  let recommendation = '';
  let shouldRest = false;
  const unlocked: number[] = [];
  let newLevel = progress.currentLevel;

  // 1. SEVERE: Force rest
  if (severeSymptoms || peakScore >= 8 || recoveryMinutes > 30) {
    recommendationAction = 'rest';
    shouldRest = true;
    recommendation = '⚠️ 你今天不适合继续训练。身体需要充分休息，下一次训练会自动降低强度。如果不适持续，请咨询医生。';
    progress.consecutiveFails += 1;

    // Auto-downgrade after rest day
    if (progress.consecutiveFails >= 2) {
      newLevel = Math.max(0, progress.currentLevel - 1);
      recommendation += ` 已自动降级至 Lv.${newLevel}。`;
    }
  }
  // 2. HIGH DISCOMFORT: Downgrade
  else if (!completed || peakScore >= 6 || recoveryMinutes > 15) {
    recommendationAction = 'downgrade';
    newLevel = Math.max(0, progress.currentLevel - 1);
    recommendation = `⬇️ 下次训练将降至 Lv.${newLevel}，给身体更多适应时间。不要着急，循序渐进最重要。`;
    progress.consecutiveFails += 1;
  }
  // 3. MODERATE: Maintain
  else if (peakScore >= 4 || postScore >= 4 || recoveryMinutes > 5) {
    recommendationAction = 'maintain';
    recommendation = '➡️ 表现不错！建议在当前等级再练习 1~2 次，巩固后再升级。';
    progress.consecutiveFails = 0;
  }
  // 4. GOOD: Candidate upgrade
  else {
    progress.consecutiveFails = 0;
    if (level.completedCount >= 2 && level.failedCount === 0) {
      recommendationAction = 'upgrade';
      const nextLevel = levelId + 1;
      if (nextLevel <= 12 && !progress.levels[nextLevel]?.unlocked) {
        progress.levels[nextLevel] = {
          levelId: nextLevel, completedCount: 0, failedCount: 0, unlocked: true,
        };
        unlocked.push(nextLevel);
      }
      newLevel = Math.min(nextLevel, 12);
      recommendation = `🎉 恭喜！你已解锁 Lv.${nextLevel}。保持当前节奏，你的耐受能力在提升。`;
    } else {
      recommendationAction = 'maintain';
      recommendation = '👍 表现稳定！再完成一次即可解锁下一等级。';
    }
  }

  // Ensure all levels up to current are unlocked
  for (let i = 0; i <= newLevel; i++) {
    if (!progress.levels[i]) {
      progress.levels[i] = { levelId: i, completedCount: 0, failedCount: 0, unlocked: true };
    } else {
      progress.levels[i].unlocked = true;
    }
  }

  progress.currentLevel = newLevel;
  saveProgress(progress);

  // Daily limit warning
  const dailyLimitWarning = progress.dailySessions >= 3;

  return { newLevel, unlocked, recommendation, recommendationAction, shouldRest, dailyLimitWarning };
}

/** Check if a level is unlocked */
export function isLevelUnlocked(levelId: number): boolean {
  const progress = loadProgress();
  return progress.levels[levelId]?.unlocked || false;
}

/** Get all unlocked level IDs */
export function getUnlockedLevels(): number[] {
  const progress = loadProgress();
  return Object.values(progress.levels).filter(l => l.unlocked).map(l => l.levelId);
}

/** Get daily session count */
export function getDailySessions(): number {
  const progress = loadProgress();
  const today = new Date().toDateString();
  if (progress.dailySessionDate !== today) return 0;
  return progress.dailySessions;
}

/** Check if user should rest today */
export function shouldRestToday(): { rest: boolean; reason: string } {
  const progress = loadProgress();
  if (progress.consecutiveFails >= 3) {
    return { rest: true, reason: '连续多次训练出现高不适，建议休息一天再继续。' };
  }
  if (progress.dailySessions >= 4) {
    return { rest: true, reason: '今天已训练多次，建议明天再来。每次训练间隔至少 2 小时。' };
  }
  return { rest: false, reason: '' };
}
