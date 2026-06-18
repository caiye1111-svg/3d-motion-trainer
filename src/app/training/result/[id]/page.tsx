'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { SystemRecommendation } from '@/types';
import { TRAINING_LEVELS } from '@/lib/sceneConfigs';
import { recordSession, SessionResult, shouldRestToday, getDailySessions } from '@/lib/progressStore';

interface LastSession {
  levelId: number;
  preScore: number;
  peakScore: number;
  postScore: number | null;
  elapsed: number;
  completed: boolean;
  severeSymptoms: string[] | null;
  stoppedReason: string | null;
}

export default function TrainingResultPage() {
  const params = useParams();
  const router = useRouter();
  const [session, setSession] = useState<LastSession | null>(null);
  const [recoveryMinutes, setRecoveryMinutes] = useState(5);
  const [result, setResult] = useState<SessionResult | null>(null);
  const [showRecoveryInput, setShowRecoveryInput] = useState(false);

  useEffect(() => {
    const data = localStorage.getItem('last_session');
    if (data) {
      const parsed = JSON.parse(data) as LastSession;
      setSession(parsed);

      // Auto-record with default recovery (will update if user changes it)
      const res = recordSession(
        parsed.levelId,
        parsed.peakScore,
        parsed.postScore || parsed.peakScore,
        recoveryMinutes,
        parsed.completed,
        !!(parsed.severeSymptoms && parsed.severeSymptoms.length > 0),
      );
      setResult(res);
      setShowRecoveryInput(parsed.completed && parsed.peakScore > 3);
    }
  }, []);

  const handleRecoveryChange = (mins: number) => {
    setRecoveryMinutes(mins);
    if (session) {
      const res = recordSession(
        session.levelId, session.peakScore,
        session.postScore || session.peakScore,
        mins, session.completed,
        !!(session.severeSymptoms && session.severeSymptoms.length > 0),
      );
      setResult(res);
    }
  };

  if (!session) {
    return (
      <div className="max-w-lg mx-auto px-4 py-20 text-center">
        <h1 className="text-2xl font-bold text-slate-300">暂无训练记录</h1>
        <Link href="/training" className="text-emerald-400 hover:underline mt-4 inline-block">前往训练中心</Link>
      </div>
    );
  }

  const level = TRAINING_LEVELS.find(l => l.id === session.levelId);
  const minutes = Math.floor(session.elapsed / 60);
  const seconds = session.elapsed % 60;

  const dailySessions = getDailySessions();
  const { rest: needRest } = shouldRestToday();

  return (
    <div className="max-w-lg mx-auto px-4 py-12">
      <h1 className="text-2xl font-bold mb-2">训练结果</h1>

      {/* Daily limit warning */}
      {dailySessions >= 3 && (
        <div className="bg-amber-900/20 border border-amber-700/50 rounded-xl p-4 mb-4 text-center">
          <p className="text-amber-400 text-sm">⚠️ 今天已训练 {dailySessions} 次，建议休息。每次训练至少间隔 2 小时。</p>
        </div>
      )}

      {needRest && (
        <div className="bg-red-900/20 border border-red-700/50 rounded-xl p-4 mb-4 text-center">
          <p className="text-red-400 text-sm">🛑 身体需要休息，建议今天不要再训练。</p>
        </div>
      )}

      {/* Result card */}
      <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6 mb-6">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-3xl">{session.completed ? '✅' : '⚠️'}</span>
          <div>
            <h2 className="text-lg font-semibold text-white">
              {level ? `Lv.${level.id} · ${level.name}` : `等级 ${session.levelId}`}
            </h2>
            <p className="text-sm text-slate-400">
              {session.completed ? '训练完成' : '训练未完成'}
              {session.stoppedReason === 'severe_symptoms' && ' · 因不适停止'}
              {session.stoppedReason === 'user_stopped' && ' · 用户主动停止'}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <StatCard label="训练前评分" value={session.preScore} max={10} />
          <StatCard label="最高不适分" value={session.peakScore} max={10} highlight={session.peakScore >= 7} />
          <StatCard label="训练后评分" value={session.postScore || session.peakScore} max={10} />
          <StatCard label="训练时长" value={`${minutes}:${String(seconds).padStart(2, '0')}`} isText />
        </div>

        {/* Recovery time input */}
        {showRecoveryInput && (
          <div className="bg-slate-700/30 rounded-xl p-4 mb-4">
            <p className="text-sm text-slate-400 mb-3">训练后多久感觉恢复？（分钟）</p>
            <div className="flex gap-2">
              {[1, 3, 5, 10, 15, 30].map(m => (
                <button key={m} onClick={() => handleRecoveryChange(m)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    recoveryMinutes === m ? 'bg-indigo-600 text-white' : 'bg-slate-600 text-slate-300 hover:bg-slate-500'
                  }`}>
                  {m}
                </button>
              ))}
            </div>
          </div>
        )}

        {session.severeSymptoms && session.severeSymptoms.length > 0 && (
          <div className="bg-red-900/20 border border-red-800/50 rounded-lg p-4">
            <p className="text-red-400 text-sm font-semibold mb-1">严重症状</p>
            <div className="flex flex-wrap gap-2">
              {session.severeSymptoms.map((s, i) => (
                <span key={i} className="px-2 py-0.5 bg-red-900/40 text-red-300 text-xs rounded-full">{s}</span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* System recommendation using new algorithm */}
      {result && (
        <div className={`rounded-2xl p-6 mb-6 border ${
          result.recommendationAction === 'rest' ? 'bg-red-900/10 border-red-800/30'
          : result.recommendationAction === 'downgrade' ? 'bg-orange-900/10 border-orange-800/30'
          : result.recommendationAction === 'upgrade' ? 'bg-emerald-900/10 border-emerald-800/30'
          : 'bg-amber-900/10 border-amber-800/30'
        }`}>
          <h3 className={`font-semibold mb-2 ${
            result.recommendationAction === 'rest' ? 'text-red-400'
            : result.recommendationAction === 'downgrade' ? 'text-orange-400'
            : result.recommendationAction === 'upgrade' ? 'text-emerald-400'
            : 'text-amber-400'
          }`}>
            {result.recommendationAction === 'rest' && '🛑 建议休息'}
            {result.recommendationAction === 'downgrade' && '⬇️ 建议降级'}
            {result.recommendationAction === 'upgrade' && '🎉 升级！'}
            {result.recommendationAction === 'maintain' && '➡️ 保持当前'}
          </h3>
          <p className="text-slate-300 text-sm">{result.recommendation}</p>
          {result.newLevel !== session.levelId && (
            <p className="text-slate-400 text-xs mt-2">当前等级: Lv.{result.newLevel}</p>
          )}
        </div>
      )}

      {/* Unlock notification */}
      {result && result.unlocked.length > 0 && (
        <div className="bg-emerald-900/20 border border-emerald-600/50 rounded-2xl p-6 mb-6 text-center">
          <div className="text-4xl mb-2">🔓</div>
          <h3 className="text-emerald-400 font-bold text-lg mb-1">新关卡已解锁！</h3>
          {result.unlocked.map(lv => {
            const lvl = TRAINING_LEVELS.find(l => l.id === lv);
            return <p key={lv} className="text-emerald-300 text-sm">Lv.{lv} · {lvl?.name}</p>;
          })}
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3">
        <Link href="/training" className="flex-1 text-center px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl transition-all">
          返回训练中心
        </Link>
        <Link href="/dashboard" className="flex-1 text-center px-6 py-3 bg-slate-700 hover:bg-slate-600 text-slate-200 font-semibold rounded-xl transition-all">
          查看仪表盘
        </Link>
      </div>
    </div>
  );
}

function StatCard({ label, value, max, highlight, isText }: {
  label: string; value: string | number; max?: number; highlight?: boolean; isText?: boolean;
}) {
  return (
    <div className={`rounded-xl p-4 ${highlight ? 'bg-red-900/20 border border-red-800/50' : 'bg-slate-700/30'}`}>
      <div className="text-xs text-slate-500 mb-1">{label}</div>
      <div className={`text-xl font-bold ${highlight ? 'text-red-400' : 'text-white'}`}>
        {isText ? value : typeof value === 'number' ? `${value} / ${max}` : value}
      </div>
    </div>
  );
}
