'use client';

interface ComfortControlsProps {
  onPause: () => void;
  onReduceIntensity: () => void;
  onEndTraining: () => void;
  isPaused: boolean;
  comfortMode: boolean;
}

export default function ComfortControls({
  onPause,
  onReduceIntensity,
  onEndTraining,
  isPaused,
  comfortMode,
}: ComfortControlsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      <button
        onClick={onPause}
        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
          isPaused
            ? 'bg-amber-600 text-white'
            : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
        }`}
      >
        {isPaused ? '▶ 继续' : '⏸ 暂停'}
      </button>

      <button
        onClick={onReduceIntensity}
        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
          comfortMode
            ? 'bg-emerald-600 text-white'
            : 'bg-slate-700 text-emerald-400 hover:bg-slate-600'
        }`}
      >
        {comfortMode ? '✓ 舒适模式' : '😌 降低强度'}
      </button>

      <button
        onClick={onEndTraining}
        className="px-4 py-2 rounded-lg text-sm font-medium bg-rose-900/50 text-rose-300 hover:bg-rose-800/50 transition-all"
      >
        结束训练
      </button>
    </div>
  );
}
