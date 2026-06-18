'use client';

import { useState } from 'react';

interface SymptomRatingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (score: number, tags: string[]) => void;
}

const SYMPTOM_TAGS = [
  '头晕', '恶心', '眼胀', '冒冷汗', '头痛', '方向感混乱',
  '想吐', '旋转感', '疲劳', '其他不适',
];

export default function SymptomRatingModal({ isOpen, onClose, onSubmit }: SymptomRatingModalProps) {
  const [score, setScore] = useState<number | null>(null);
  const [tags, setTags] = useState<string[]>([]);

  if (!isOpen) return null;

  const toggleTag = (tag: string) => {
    setTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const handleSubmit = () => {
    if (score !== null) {
      onSubmit(score, tags);
      setScore(null);
      setTags([]);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 z-40 flex items-center justify-center p-4">
      <div className="bg-slate-800 rounded-2xl max-w-md w-full p-6 border border-slate-700 shadow-2xl">
        <h3 className="text-lg font-bold text-white mb-2">当前不适评分</h3>
        <p className="text-sm text-slate-400 mb-4">
          0 = 完全无不适 · 10 = 非常不适需要停止
        </p>

        {/* Score buttons */}
        <div className="grid grid-cols-5 gap-2 mb-6">
          {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
            <button
              key={n}
              onClick={() => setScore(n)}
              className={`py-3 rounded-lg font-bold text-sm transition-all ${
                score === n
                  ? n <= 3 ? 'bg-emerald-600 text-white'
                  : n <= 5 ? 'bg-amber-600 text-white'
                  : n <= 7 ? 'bg-orange-600 text-white'
                  : 'bg-red-600 text-white'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              {n}
            </button>
          ))}
        </div>

        {/* Symptom tags */}
        <div className="mb-6">
          <p className="text-sm text-slate-400 mb-2">具体症状（可多选）：</p>
          <div className="flex flex-wrap gap-2">
            {SYMPTOM_TAGS.map(tag => (
              <button
                key={tag}
                onClick={() => toggleTag(tag)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                  tags.includes(tag)
                    ? 'bg-rose-600 text-white'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={handleSubmit}
          disabled={score === null}
          className={`w-full py-3 rounded-xl font-semibold transition-all ${
            score !== null
              ? 'bg-indigo-600 hover:bg-indigo-500 text-white'
              : 'bg-slate-700 text-slate-500 cursor-not-allowed'
          }`}
        >
          确认评分
        </button>
      </div>
    </div>
  );
}
