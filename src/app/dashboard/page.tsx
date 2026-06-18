'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import ProgressChart from '@/components/ProgressChart';
import { TRAINING_LEVELS } from '@/lib/sceneConfigs';
import { loadProgress, shouldRestToday, getDailySessions } from '@/lib/progressStore';

interface ChartDataPoint {
  date: string;
  peakScore: number;
  durationMinutes: number;
  recoveryMinutes: number;
}

export default function DashboardPage() {
  const [currentLevel, setCurrentLevel] = useState(1);
  const [totalSessions, setTotalSessions] = useState(0);
  const [completedSessions, setCompletedSessions] = useState(0);
  const [streak, setStreak] = useState(0);
  const [consecutiveGood, setConsecutiveGood] = useState(0);
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [needsRest, setNeedsRest] = useState(false);
  const [restReason, setRestReason] = useState('');
  const [dailySessions, setDailySessions] = useState(0);
  const [unlockedCount, setUnlockedCount] = useState(2);

  useEffect(() => {
    const progress = loadProgress();
    setCurrentLevel(progress.currentLevel);
    setTotalSessions(progress.totalSessions);
    setCompletedSessions(progress.completedSessions);
    setStreak(progress.streak);
    setConsecutiveGood(Math.max(0, 3 - progress.consecutiveFails));
    setDailySessions(getDailySessions());
    setUnlockedCount(Object.values(progress.levels).filter(l => l.unlocked).length);

    const { rest, reason } = shouldRestToday();
    setNeedsRest(rest);
    setRestReason(reason);

    // Build chart data from level progress
    const charts: ChartDataPoint[] = Object.values(progress.levels)
      .filter(l => l.lastPlayedAt)
      .sort((a, b) => (a.lastPlayedAt || '').localeCompare(b.lastPlayedAt || ''))
      .map(l => ({
        date: l.lastPlayedAt ? new Date(l.lastPlayedAt).toLocaleDateString('zh-CN') : '',
        peakScore: l.lastPeakScore || 0,
        durationMinutes: 5,
        recoveryMinutes: l.lastRecovery || 5,
      }));

    if (charts.length === 0) {
      setChartData([
        { date: '暂无数据', peakScore: 0, durationMinutes: 0, recoveryMinutes: 0 },
      ]);
    } else {
      setChartData(charts);
    }

    setLoading(false);
  }, []);

  const level = TRAINING_LEVELS.find(l => l.id === currentLevel);

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">个人仪表盘</h1>
          <p className="text-slate-400 mt-1">你的训练数据和进度</p>
        </div>
        <Link href="/training" className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl transition-all text-sm">
          开始训练
        </Link>
      </div>

      {/* Rest warning */}
      {needsRest && (
        <div className="bg-red-900/20 border border-red-700/50 rounded-2xl p-5 mb-6">
          <div className="flex items-start gap-3">
            <span className="text-2xl">🛑</span>
            <div>
              <p className="text-red-400 font-semibold">建议休息</p>
              <p className="text-red-300/80 text-sm">{restReason}</p>
            </div>
          </div>
        </div>
      )}

      {/* Daily count */}
      {dailySessions >= 2 && !needsRest && (
        <div className="bg-amber-900/20 border border-amber-700/50 rounded-2xl p-5 mb-6">
          <div className="flex items-start gap-3">
            <span className="text-2xl">⚠️</span>
            <div>
              <p className="text-amber-400 font-semibold">今日已训练 {dailySessions} 次</p>
              <p className="text-amber-300/80 text-sm">每次训练建议间隔至少 2 小时，给身体充分恢复时间</p>
            </div>
          </div>
        </div>
      )}

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <DashboardStatCard label="当前等级" value={`Lv.${currentLevel}`} color="emerald" subtitle={level?.name} />
        <DashboardStatCard label="完成训练" value={String(completedSessions)} color="blue" subtitle={`共 ${totalSessions} 次`} />
        <DashboardStatCard label="连续天数" value={String(streak)} color="purple" subtitle="坚持训练" />
        <DashboardStatCard label="已解锁" value={String(unlockedCount)} color="amber" subtitle={`共 ${TRAINING_LEVELS.length} 关`} />
      </div>

      {/* Progress charts */}
      {chartData.length > 0 && chartData[0].date !== '暂无数据' && (
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">训练趋势</h2>
          <ProgressChart data={chartData} />
        </div>
      )}

      {/* Training recommendations */}
      <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6 mb-6">
        <h2 className="text-lg font-semibold text-white mb-4">📋 训练建议</h2>
        <div className="space-y-4 text-sm">
          <Tip icon="🎯" title="循序渐进" desc="每次训练后系统会根据不适评分自动调整强度。不要跳过等级，每个等级至少完成 2 次再升级。" />
          <Tip icon="⏰" title="保持规律" desc="建议每天同一时间段训练，每次不超过 10 分钟。连续 3 天训练效果更好。" />
          <Tip icon="🛡️" title="听从身体" desc={`不舒服时立即暂停或结束。你当前连续良好训练 ${consecutiveGood} 次，继续保持！`} />
          <Tip icon="💡" title="舒适设置" desc="训练中可随时开启舒适模式 — 降低速度、缩小视野、显示中央辅助点。" />
          <Tip icon="📊" title="关注趋势" desc="不适评分的下降和训练时长的增加是进步的信号，不要太关注单次数据。" />
        </div>
      </div>

      {/* Level roadmap preview */}
      <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6">
        <h2 className="text-lg font-semibold text-white mb-4">🗺️ 训练路线</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {TRAINING_LEVELS.map(lv => {
            const progress = loadProgress().levels[lv.id];
            const unlocked = progress?.unlocked || lv.id <= 1;
            const done = (progress?.completedCount || 0) >= 1;
            return (
              <div key={lv.id} className={`flex items-center gap-3 px-3 py-2 rounded-lg text-xs ${
                lv.id === currentLevel ? 'bg-emerald-900/20 border border-emerald-700/30'
                : done ? 'bg-slate-700/20'
                : unlocked ? 'bg-slate-700/10'
                : 'bg-slate-800/20 opacity-50'
              }`}>
                <span className="w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold shrink-0"
                  style={{ background: done ? '#22c55e' : unlocked ? '#334155' : '#1e293b', color: done ? '#fff' : '#64748b' }}>
                  {done ? '✓' : unlocked ? lv.id : '🔒'}
                </span>
                <span className={unlocked ? 'text-slate-300' : 'text-slate-600'}>{lv.name}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function Tip({ icon, title, desc }: { icon: string; title: string; desc: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5">{icon}</span>
      <div>
        <p className="text-slate-300 font-medium">{title}</p>
        <p className="text-slate-500">{desc}</p>
      </div>
    </div>
  );
}

function DashboardStatCard({ label, value, color, subtitle }: {
  label: string; value: string; color: 'emerald' | 'blue' | 'purple' | 'amber'; subtitle?: string;
}) {
  const colorMap = { emerald: 'border-emerald-800/30 bg-emerald-900/10', blue: 'border-blue-800/30 bg-blue-900/10', purple: 'border-purple-800/30 bg-purple-900/10', amber: 'border-amber-800/30 bg-amber-900/10' };
  const textMap = { emerald: 'text-emerald-400', blue: 'text-blue-400', purple: 'text-purple-400', amber: 'text-amber-400' };
  return (
    <div className={`rounded-xl border p-5 ${colorMap[color]}`}>
      <div className="text-xs text-slate-500 mb-1">{label}</div>
      <div className={`text-2xl font-bold ${textMap[color]}`}>{value}</div>
      {subtitle && <div className="text-xs text-slate-500 mt-1">{subtitle}</div>}
    </div>
  );
}
