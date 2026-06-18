'use client';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface ChartDataPoint {
  date: string;
  peakScore: number;
  durationMinutes: number;
  recoveryMinutes: number;
}

interface ProgressChartProps {
  data: ChartDataPoint[];
}

export default function ProgressChart({ data }: ProgressChartProps) {
  if (data.length === 0) {
    return (
      <div className="text-center py-12 text-slate-500">
        暂无训练数据，完成第一次训练后这里会显示你的进度
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Peak score trend */}
      <div className="bg-slate-800/50 rounded-xl p-4">
        <h3 className="text-sm font-semibold text-slate-300 mb-3">最近不适评分趋势（越低越好）</h3>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis dataKey="date" stroke="#64748b" fontSize={12} />
            <YAxis domain={[0, 10]} stroke="#64748b" fontSize={12} />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1e293b',
                border: '1px solid #334155',
                borderRadius: '8px',
                color: '#e2e8f0',
              }}
            />
            <Line
              type="monotone"
              dataKey="peakScore"
              stroke="#22c55e"
              strokeWidth={2}
              dot={{ fill: '#22c55e', r: 4 }}
              name="最高不适分"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Duration trend */}
      <div className="bg-slate-800/50 rounded-xl p-4">
        <h3 className="text-sm font-semibold text-slate-300 mb-3">训练时长趋势（分钟）</h3>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis dataKey="date" stroke="#64748b" fontSize={12} />
            <YAxis stroke="#64748b" fontSize={12} />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1e293b',
                border: '1px solid #334155',
                borderRadius: '8px',
                color: '#e2e8f0',
              }}
            />
            <Line
              type="monotone"
              dataKey="durationMinutes"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={{ fill: '#3b82f6', r: 4 }}
              name="训练时长"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Recovery time trend */}
      <div className="bg-slate-800/50 rounded-xl p-4">
        <h3 className="text-sm font-semibold text-slate-300 mb-3">恢复时间趋势（分钟，越低越好）</h3>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis dataKey="date" stroke="#64748b" fontSize={12} />
            <YAxis stroke="#64748b" fontSize={12} />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1e293b',
                border: '1px solid #334155',
                borderRadius: '8px',
                color: '#e2e8f0',
              }}
            />
            <Line
              type="monotone"
              dataKey="recoveryMinutes"
              stroke="#a855f7"
              strokeWidth={2}
              dot={{ fill: '#a855f7', r: 4 }}
              name="恢复时间"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
