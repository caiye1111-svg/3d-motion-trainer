'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { TRAINING_LEVELS } from '@/lib/sceneConfigs';
import { getLevelDescription } from '@/lib/trainingRules';
import { loadProgress } from '@/lib/progressStore';

export default function TrainingHubPage() {
  const [currentLevel, setCurrentLevel] = useState(1);
  const [unlockedLevels, setUnlockedLevels] = useState<number[]>([0, 1]);

  useEffect(() => {
    const progress = loadProgress();
    setCurrentLevel(progress.currentLevel);
    const unlocked = Object.values(progress.levels)
      .filter(l => l.unlocked)
      .map(l => l.levelId);
    if (unlocked.length === 0) setUnlockedLevels([0, 1]);
    else setUnlockedLevels(unlocked);
  }, []);

  const levelData = TRAINING_LEVELS.find(l => l.id === currentLevel);

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">训练中心</h1>
          <p className="text-slate-400 mt-1">当前等级: Lv.{currentLevel}</p>
        </div>
        <Link
          href={`/training/session/${currentLevel}`}
          className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl transition-all"
        >
          开始今日训练
        </Link>
      </div>

      {/* Current level info */}
      {levelData && (
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6 mb-8">
          <h2 className="text-lg font-semibold text-emerald-400 mb-2">
            Lv.{levelData.id} · {levelData.name}
          </h2>
          <p className="text-slate-300 mb-4">{levelData.description}</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
            <Stat label="时长" value={`${Math.floor(levelData.default_duration_seconds / 60)} 分钟`} />
            <Stat label="移动速度" value={`${levelData.movement_speed} m/s`} />
            <Stat label="转向速度" value={`${levelData.turn_speed}°/秒`} />
            <Stat label="FOV" value={`${levelData.fov}°`} />
          </div>
        </div>
      )}

      {/* Level roadmap */}
      <h2 className="text-xl font-semibold mb-4">训练路线</h2>
      <div className="space-y-3">
        {TRAINING_LEVELS.map(level => {
          const unlocked = unlockedLevels.includes(level.id);
          const isCurrent = level.id === currentLevel;
          return (
            <div
              key={level.id}
              className={`rounded-xl p-5 border transition-all ${
                isCurrent
                  ? 'bg-emerald-900/20 border-emerald-700/50'
                  : unlocked
                  ? 'bg-slate-800/30 border-slate-700/30 hover:border-slate-600/50'
                  : 'bg-slate-800/10 border-slate-800 opacity-50'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <span className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold text-sm ${
                    isCurrent ? 'bg-emerald-600 text-white'
                    : unlocked ? 'bg-slate-700 text-slate-300'
                    : 'bg-slate-800 text-slate-600'
                  }`}>
                    {level.id}
                  </span>
                  <div>
                    <h3 className={`font-semibold ${unlocked ? 'text-white' : 'text-slate-600'}`}>
                      {level.name}
                    </h3>
                    <p className={`text-sm ${unlocked ? 'text-slate-400' : 'text-slate-700'}`}>
                      {getLevelDescription(level.id)}
                    </p>
                  </div>
                </div>
                <div>
                  {isCurrent ? (
                    <span className="px-3 py-1 bg-emerald-600/30 text-emerald-400 text-xs font-medium rounded-full">
                      当前
                    </span>
                  ) : unlocked ? (
                    <Link
                      href={`/training/session/${level.id}`}
                      className="px-4 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-300 text-sm rounded-lg transition-all"
                    >
                      训练
                    </Link>
                  ) : (
                    <span className="text-slate-600 text-lg">🔒</span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-slate-700/30 rounded-lg p-3">
      <div className="text-xs text-slate-500">{label}</div>
      <div className="text-white font-semibold">{value}</div>
    </div>
  );
}
