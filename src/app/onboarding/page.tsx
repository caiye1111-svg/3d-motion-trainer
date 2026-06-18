'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

const QUESTIONS = [
  {
    id: 'fps_tolerance',
    question: '玩第一人称游戏（FPS）多久会开始不舒服？',
    options: [
      { value: '5', label: '5 分钟以内' },
      { value: '10', label: '5～10 分钟' },
      { value: '20', label: '10～20 分钟' },
      { value: '30', label: '20～30 分钟' },
      { value: '60', label: '30 分钟以上' },
    ],
  },
  {
    id: 'main_symptom',
    question: '最明显的症状是什么？',
    options: [
      { value: 'dizziness', label: '头晕' },
      { value: 'nausea', label: '恶心' },
      { value: 'eye_strain', label: '眼胀 / 眼疲劳' },
      { value: 'headache', label: '头痛' },
      { value: 'disorientation', label: '方向感混乱' },
    ],
  },
  {
    id: 'trigger_type',
    question: '最怕哪类画面或操作？',
    options: [
      { value: 'fast_turn', label: '快速转身' },
      { value: 'walk_bob', label: '跑步晃动' },
      { value: 'stairs', label: '上下楼' },
      { value: 'driving', label: '开车 / 飞行' },
      { value: 'vr', label: 'VR 移动' },
    ],
  },
  {
    id: 'motion_sickness',
    question: '平时坐车 / 坐船是否容易晕？',
    options: [
      { value: 'yes', label: '是，经常晕车晕船' },
      { value: 'sometimes', label: '偶尔会' },
      { value: 'no', label: '基本不会' },
    ],
  },
  {
    id: 'recovery',
    question: '不适感通常多久能恢复？',
    options: [
      { value: '5', label: '5 分钟以内' },
      { value: '15', label: '5～15 分钟' },
      { value: '30', label: '15～30 分钟' },
      { value: '60', label: '30 分钟以上' },
    ],
  },
  {
    id: 'target_mode',
    question: '你想训练的目标方向是？',
    options: [
      { value: 'fps', label: '🎯 FPS 射击游戏' },
      { value: 'open_world', label: '🌍 开放世界' },
      { value: 'racing', label: '🏎️ 赛车游戏' },
      { value: 'vr', label: '🥽 VR 游戏' },
    ],
  },
];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});

  const current = QUESTIONS[step];

  const handleSelect = (value: string) => {
    const newAnswers = { ...answers, [current.id]: value };
    setAnswers(newAnswers);

    if (step < QUESTIONS.length - 1) {
      setStep(step + 1);
    } else {
      // Calculate recommended starting level
      const level = calculateStartLevel(newAnswers);
      localStorage.setItem('onboarding_answers', JSON.stringify(newAnswers));
      localStorage.setItem('start_level', String(level));

      // Save to Supabase
      const riskFlags: string[] = [];
      if (level === 0) riskFlags.push('high_risk');
      else if (level === 1) riskFlags.push('severe');
      else if (level === 2) riskFlags.push('moderate');
      fetch('/api/user/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fps_tolerance_minutes: parseInt(newAnswers.fps_tolerance || '30'),
          main_symptom: newAnswers.main_symptom || '',
          trigger_type: newAnswers.trigger_type || '',
          motion_sickness_history: newAnswers.motion_sickness === 'yes' || newAnswers.motion_sickness === 'sometimes',
          recovery_minutes: parseInt(newAnswers.recovery || '5'),
          risk_flags: riskFlags,
          recommended_start_level: level,
          target_game_mode: newAnswers.target_mode || 'fps',
        }),
      }).catch(() => {
        // Non-blocking — localStorage is the fallback
      });

      router.push('/training');
    }
  };

  const handleBack = () => {
    if (step > 0) setStep(step - 1);
  };

  const progress = ((step) / QUESTIONS.length) * 100;

  return (
    <div className="max-w-lg mx-auto px-4 py-12">
      {/* Progress bar */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-slate-400">新手适配</span>
          <span className="text-sm text-slate-400">{step + 1} / {QUESTIONS.length}</span>
        </div>
        <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-emerald-500 rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Question */}
      <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-8">
        <h2 className="text-xl font-bold text-white mb-6">{current.question}</h2>
        <div className="space-y-3">
          {current.options.map(opt => (
            <button
              key={opt.value}
              onClick={() => handleSelect(opt.value)}
              className={`w-full text-left px-5 py-4 rounded-xl border transition-all font-medium ${
                answers[current.id] === opt.value
                  ? 'bg-emerald-600/20 border-emerald-600 text-emerald-300'
                  : 'bg-slate-700/50 border-slate-600 text-slate-300 hover:border-slate-500 hover:bg-slate-700'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {step > 0 && (
          <button
            onClick={handleBack}
            className="mt-4 text-sm text-slate-500 hover:text-slate-300 transition-colors"
          >
            ← 返回上一题
          </button>
        )}
      </div>

      <p className="text-xs text-slate-600 text-center mt-6">
        这些信息仅用于设置你的初始训练强度，不会用于其他用途
      </p>
    </div>
  );
}

function calculateStartLevel(answers: Record<string, string>): number {
  let score = 0;

  // fp tolerance: lower = more sensitive
  const tol = parseInt(answers.fps_tolerance || '30');
  if (tol <= 5) score += 3;
  else if (tol <= 10) score += 2;
  else if (tol <= 20) score += 1;

  // recovery: longer = more sensitive
  const rec = parseInt(answers.recovery || '5');
  if (rec >= 30) score += 3;
  else if (rec >= 15) score += 2;
  else if (rec >= 5) score += 1;

  // motion sickness history
  if (answers.motion_sickness === 'yes') score += 2;
  else if (answers.motion_sickness === 'sometimes') score += 1;

  // main symptom severity
  if (answers.main_symptom === 'nausea') score += 2;
  if (answers.trigger_type === 'fast_turn') score += 1;

  // Map score to level
  if (score >= 7) return 0;  // S0: high risk, start at Lv.0
  if (score >= 5) return 1;  // S1: severe, start at Lv.1
  if (score >= 3) return 2;  // S2: moderate, start at Lv.2
  return 3;                   // S3: mild, start at Lv.3
}
