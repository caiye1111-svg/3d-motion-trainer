'use client';

import { useState } from 'react';

interface SafetyGateProps {
  onAccept: () => void;
  levelName: string;
  durationMinutes: number;
}

export default function SafetyGate({ onAccept, levelName, durationMinutes }: SafetyGateProps) {
  const [agreed, setAgreed] = useState(false);

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
      <div className="bg-slate-800 rounded-2xl max-w-lg w-full p-8 border border-slate-700 shadow-2xl">
        <h2 className="text-xl font-bold text-white mb-4">
          ⚠️ 训练前安全确认
        </h2>

        <div className="space-y-3 text-slate-300 text-sm mb-6">
          <p>你即将开始：<strong className="text-white">{levelName}</strong></p>
          <p>预计时长：<strong className="text-white">{durationMinutes} 分钟</strong></p>

          <div className="bg-amber-900/30 border border-amber-700/50 rounded-lg p-4 mt-4">
            <h3 className="text-amber-300 font-semibold mb-2">请确认以下事项：</h3>
            <ul className="list-disc pl-5 space-y-1 text-amber-200/80">
              <li>你现在没有明显恶心、眩晕或头痛</li>
              <li>你没有耳鸣、听力下降或走路不稳</li>
              <li>你所在的环境光线充足，屏幕距离合适</li>
              <li>你知道可以随时点击"不舒服"按钮暂停或停止</li>
              <li>训练后如果持续不适超过 30 分钟，应停止使用并就医</li>
            </ul>
          </div>

          <div className="bg-slate-700/50 rounded-lg p-4">
            <p className="text-slate-400 text-xs">
              本产品不是医疗诊断或治疗工具。训练目的是帮助玩家逐步适应 3D 游戏镜头运动，
              不宣称治愈、治疗或医学康复效果。
            </p>
          </div>
        </div>

        <label className="flex items-start gap-3 mb-6 cursor-pointer">
          <input
            type="checkbox"
            checked={agreed}
            onChange={e => setAgreed(e.target.checked)}
            className="mt-1 h-4 w-4 rounded border-slate-600 bg-slate-700 text-emerald-500 focus:ring-emerald-500"
          />
          <span className="text-sm text-slate-300">
            我已阅读并理解以上安全提示，自愿开始训练
          </span>
        </label>

        <button
          onClick={onAccept}
          disabled={!agreed}
          className={`w-full py-3 rounded-xl font-semibold transition-all ${
            agreed
              ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
              : 'bg-slate-700 text-slate-500 cursor-not-allowed'
          }`}
        >
          开始训练
        </button>
      </div>
    </div>
  );
}
