'use client';

import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useState, useEffect, useCallback, useRef } from 'react';
import { TRAINING_LEVELS, buildSceneConfig } from '@/lib/sceneConfigs';
import { decideNextTraining } from '@/lib/trainingRules';
import { isLevelUnlocked } from '@/lib/progressStore';
import SafetyGate from '@/components/SafetyGate';
import ComfortControls from '@/components/ComfortControls';
import SymptomRatingModal from '@/components/SymptomRatingModal';
import TrainingCanvas from '@/components/TrainingCanvas';

export default function TrainingSessionPage() {
  const params = useParams();
  const router = useRouter();
  const levelId = parseInt(params.id as string);

  // Session states
  const [phase, setPhase] = useState<'safety' | 'pre_score' | 'training' | 'result'>('safety');
  const [acceptedSafety, setAcceptedSafety] = useState(false);
  const [preScore, setPreScore] = useState<number | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [comfortMode, setComfortMode] = useState(false);
  const [showRating, setShowRating] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [peakScore, setPeakScore] = useState(0);
  const [currentScore, setCurrentScore] = useState<number | null>(null);
  const [severeSymptoms, setSevereSymptoms] = useState<string[]>([]);
  const [trainingEnded, setTrainingEnded] = useState(false);
  const [checkpoints, setCheckpoints] = useState<Array<{ timestamp_seconds: number; score: number; symptom_tags: string[] }>>([]);

  // Scene-specific state
  const [foundObjects, setFoundObjects] = useState<number[]>([]);
  const [showTunnelTarget, setShowTunnelTarget] = useState(false);
  const [reachedCheckpoints, setReachedCheckpoints] = useState<number[]>([]);
  const [collectedOrbs, setCollectedOrbs] = useState<number[]>([]);
  const [hitCount, setHitCount] = useState(0);
  const [turnCount, setTurnCount] = useState(0);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const ratingTimerRef = useRef<NodeJS.Timeout | null>(null);

  const level = TRAINING_LEVELS.find(l => l.id === levelId);
  const config = level ? buildSceneConfig(level) : null;

  // Timer
  useEffect(() => {
    if (phase === 'training' && !isPaused && !trainingEnded) {
      timerRef.current = setInterval(() => setElapsed(prev => prev + 1), 1000);
      return () => { if (timerRef.current) clearInterval(timerRef.current); };
    }
  }, [phase, isPaused, trainingEnded]);

  // Auto rating popup every 75 seconds
  useEffect(() => {
    if (phase === 'training' && !isPaused && !trainingEnded) {
      ratingTimerRef.current = setInterval(() => setShowRating(true), 75000);
      return () => { if (ratingTimerRef.current) clearInterval(ratingTimerRef.current); };
    }
  }, [phase, isPaused, trainingEnded]);

  // Auto-end when time exceeds max
  useEffect(() => {
    if (config && elapsed >= config.durationSeconds && phase === 'training' && !trainingEnded) {
      endTraining();
    }
  }, [elapsed, config, phase, trainingEnded]);

  // Check for severe symptoms
  useEffect(() => {
    if (peakScore >= 8 && phase === 'training' && !trainingEnded) {
      endTraining('severe_symptoms');
    }
  }, [peakScore, phase, trainingEnded]);

  // Tunnel target spawning removed — scene handles its own bubbles

  const endTraining = useCallback((reason?: string) => {
    setTrainingEnded(true);
    if (timerRef.current) clearInterval(timerRef.current);
    if (ratingTimerRef.current) clearInterval(ratingTimerRef.current);

    const completed = reason !== 'user_stopped' && reason !== 'severe_symptoms' && reason !== 'high_pre_score';
    const recoveryMinutes = severeSymptoms.length > 0 ? 30 : 10;

    const recommendation = decideNextTraining({
      completed,
      peakScore,
      postScore: currentScore || peakScore,
      recoveryMinutes,
      severeSymptoms: severeSymptoms.length > 0 ? severeSymptoms : null,
    });

    const sessionData = {
      levelId, preScore, peakScore, postScore: currentScore, elapsed, completed,
      severeSymptoms: severeSymptoms.length > 0 ? severeSymptoms : null,
      stoppedReason: reason || null,
    };
    localStorage.setItem('last_session', JSON.stringify(sessionData));
    localStorage.setItem('last_recommendation', JSON.stringify(recommendation));

    fetch('/api/training/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        level_id: levelId, mode: 'daily',
        planned_duration_seconds: config?.durationSeconds || 300,
        actual_duration_seconds: elapsed, completed,
        pre_score: preScore, peak_score: peakScore, post_score: currentScore,
        recovery_minutes: recoveryMinutes, comfort_mode_used: comfortMode,
        stopped_reason: reason || null,
        severe_symptoms: severeSymptoms.length > 0 ? severeSymptoms : null,
        system_recommendation: recommendation.action + ': ' + recommendation.message,
        checkpoints,
      }),
    }).catch(() => {});

    setTimeout(() => router.push(`/training/result/last`), 1000);
  }, [levelId, preScore, peakScore, currentScore, elapsed, severeSymptoms, comfortMode, checkpoints, config, router]);

  // Auto-complete when scene objectives are all met
  useEffect(() => {
    if (trainingEnded || phase !== 'training') return;
    const allDone =
      (levelId === 1 && foundObjects.length >= 3) ||
      (levelId === 2 && hitCount >= 15) ||
      (levelId === 3 && reachedCheckpoints.length >= 5) ||
      (levelId === 4 && turnCount >= 15) ||
      (levelId === 5 && collectedOrbs.length >= 5) ||
      (levelId === 6 && reachedCheckpoints.length >= 5);
    if (allDone) endTraining();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [foundObjects, reachedCheckpoints, collectedOrbs, hitCount, turnCount]);

  const handleAcceptSafety = () => {
    setAcceptedSafety(true);
    setPhase('pre_score');
  };

  const handlePreScore = (score: number) => {
    setPreScore(score);
    setPeakScore(score);
    setCurrentScore(score);
    if (score >= 7) { endTraining('high_pre_score'); }
    else { setPhase('training'); }
  };

  const handleRatingSubmit = (score: number, tags: string[]) => {
    setCurrentScore(score);
    if (score > peakScore) setPeakScore(score);
    setCheckpoints(prev => [...prev, { timestamp_seconds: elapsed, score, symptom_tags: tags }]);
    const severeTags = ['想吐', '旋转感'];
    if (tags.some(t => severeTags.includes(t))) {
      setSevereSymptoms(prev => [...prev, ...tags]);
    }
    if (score >= 8 || tags.some(t => severeTags.includes(t))) {
      endTraining('severe_symptoms');
    }
  };

  const handlePause = () => setIsPaused(!isPaused);

  const handleComfortMode = () => {
    setComfortMode(!comfortMode);
    if (!comfortMode) setIsPaused(true);
  };

  const handleEndTraining = () => endTraining('user_stopped');

  // Scene callbacks
  const handleObjectFound = (index: number) => {
    if (!foundObjects.includes(index)) setFoundObjects(prev => [...prev, index]);
  };
  const handleTunnelTargetClick = () => {
    setShowTunnelTarget(false);
    setHitCount(h => h + 1);
    setCheckpoints(prev => [...prev, { timestamp_seconds: elapsed, score: currentScore || 0, symptom_tags: ['target_clicked'] }]);
  };
  const handleCheckpointReached = (index: number) => {
    if (!reachedCheckpoints.includes(index)) {
      setReachedCheckpoints(prev => [...prev, index]);
      if (phase === 'training' && !comfortMode) {
        setIsPaused(true);
        setTimeout(() => setIsPaused(false), 3000);
      }
    }
  };
  const handleOrbCollected = (index: number) => {
    if (!collectedOrbs.includes(index)) setCollectedOrbs(prev => [...prev, index]);
  };
  const handleTurnCompleted = (count: number) => {
    setTurnCount(count);
  };

  const getSceneProgress = () => {
    switch (levelId) {
      case 1: return `已找到 ${foundObjects.length} / 3 个物体`;
      case 2: return `已击中 ${hitCount} / 15 个目标`;
      case 3: return `检查点 ${reachedCheckpoints.length} / 5`;
      case 4: return `转向 ${turnCount} / 15`;
      case 5: return `光球 ${collectedOrbs.length} / 5`;
      case 6: return `检查点 ${reachedCheckpoints.length} / 5`;
      default: return '';
    }
  };

  if (!level || !config) {
    return (
      <div className="max-w-lg mx-auto px-4 py-20 text-center">
        <h1 className="text-2xl font-bold text-slate-300">训练等级不存在</h1>
        <p className="text-slate-500 mt-2">请返回训练中心选择可用等级</p>
      </div>
    );
  }

  if (!isLevelUnlocked(levelId)) {
    return (
      <div className="max-w-lg mx-auto px-4 py-20 text-center">
        <div className="text-5xl mb-4">🔒</div>
        <h1 className="text-2xl font-bold text-slate-300">关卡未解锁</h1>
        <p className="text-slate-500 mt-2 mb-6">
          你需要完成 Lv.{levelId - 1} 且不适评分 ≤3 才能解锁此关卡
        </p>
        <Link href="/training" className="text-emerald-400 hover:underline">
          返回训练中心
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-8rem)] flex flex-col">
      {/* Safety Gate */}
      {phase === 'safety' && (
        <SafetyGate
          onAccept={handleAcceptSafety}
          levelName={`Lv.${level.id} · ${level.name}`}
          durationMinutes={Math.ceil(config.durationSeconds / 60)}
        />
      )}

      {/* Pre-score */}
      {phase === 'pre_score' && (
        <SymptomRatingModal
          isOpen={true}
          onClose={() => {}}
          onSubmit={handlePreScore}
        />
      )}

      {/* Training */}
      {(phase === 'training' || phase === 'result') && (
        <div className="fixed top-16 bottom-0 left-0 right-0 flex flex-col">
          {/* HUD */}
          <div className="z-30 shrink-0">
            <div className="max-w-5xl mx-auto px-4 py-2 flex items-center justify-between">
              <div>
                <div className="bg-slate-900/80 backdrop-blur-sm rounded-lg px-4 py-2 text-sm text-slate-300">
                  Lv.{level.id} · {level.name} · {Math.floor(elapsed / 60)}:{String(elapsed % 60).padStart(2, '0')}
                  {' / '}{Math.floor(config.durationSeconds / 60)}:00
                </div>
                <SceneProgress text={getSceneProgress()} />
              </div>

              <div className="flex items-center gap-4">
                <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                  peakScore <= 3 ? 'bg-emerald-900/60 text-emerald-400'
                  : peakScore <= 5 ? 'bg-amber-900/60 text-amber-400'
                  : peakScore <= 7 ? 'bg-orange-900/60 text-orange-400'
                  : 'bg-red-900/60 text-red-400'
                }`}>
                  不适分: {peakScore}
                </div>

                <ComfortControls
                  onPause={handlePause}
                  onReduceIntensity={handleComfortMode}
                  onEndTraining={handleEndTraining}
                  isPaused={isPaused}
                  comfortMode={comfortMode}
                />
              </div>
            </div>
          </div>

          {/* 3D Canvas */}
          <div className="flex-1 relative min-h-0">
            <TrainingCanvas
              config={config}
              isPaused={isPaused || trainingEnded}
              comfortMode={comfortMode}
              isActive={phase === 'training' && !trainingEnded}
              elapsedSeconds={elapsed}
              foundObjects={foundObjects}
              onObjectFound={handleObjectFound}
              showTunnelTarget={showTunnelTarget}
              onTunnelTargetClick={handleTunnelTargetClick}
              reachedCheckpoints={reachedCheckpoints}
              onCheckpointReached={handleCheckpointReached}
              collectedOrbs={collectedOrbs}
              onOrbCollected={handleOrbCollected}
              onTurnCompleted={handleTurnCompleted}
            />

            {/* Pause overlay */}
            {isPaused && (
              <div className="absolute inset-0 bg-black/60 z-20 flex items-center justify-center">
                <div className="text-center">
                  <div className="text-6xl mb-4">⏸️</div>
                  <p className="text-white text-xl font-semibold mb-2">训练已暂停</p>
                  <p className="text-slate-400 text-sm mb-6">
                    {comfortMode ? '舒适模式已启用 — 速度、转向已降低' : '深呼吸，休息一下'}
                  </p>
                  <button onClick={handlePause}
                    className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl transition-all">
                    继续训练
                  </button>
                </div>
              </div>
            )}

            {/* Training ended overlay */}
            {trainingEnded && (
              <div className="absolute inset-0 bg-black/70 z-20 flex items-center justify-center">
                <div className="text-center">
                  <div className="text-6xl mb-4">✅</div>
                  <p className="text-white text-xl font-semibold mb-2">训练完成</p>
                  <p className="text-slate-400 text-sm mb-2">训练时长: {Math.floor(elapsed / 60)} 分 {elapsed % 60} 秒</p>
                  <p className="text-slate-400 text-sm mb-6">最高不适分: {peakScore}</p>
                  <p className="text-emerald-400 text-sm animate-pulse">正在跳转到结果页...</p>
                </div>
              </div>
            )}
          </div>

          {/* Rating Modal */}
          <SymptomRatingModal
            isOpen={showRating}
            onClose={() => setShowRating(false)}
            onSubmit={handleRatingSubmit}
          />
        </div>
      )}
    </div>
  );
}

function SceneProgress({ text }: { text: string }) {
  if (!text) return null;
  return (
    <div className="mt-1 bg-slate-900/60 backdrop-blur-sm rounded-lg px-4 py-1.5 text-xs text-emerald-400 font-medium">
      {text}
    </div>
  );
}
