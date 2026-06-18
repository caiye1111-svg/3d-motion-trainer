import Link from 'next/link';

export default function HomePage() {
  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-emerald-900/20 via-slate-950 to-slate-950" />
        <div className="relative max-w-5xl mx-auto px-4 py-24 sm:py-32 text-center">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight mb-6">
            <span className="text-white">玩 3D 游戏总头晕？</span>
            <br />
            <span className="bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
              从 5 分钟低强度训练开始适应
            </span>
          </h1>
          <p className="text-lg sm:text-xl text-slate-400 max-w-2xl mx-auto mb-10">
            不是问卷，不是玄学。通过可控 3D 场景，逐步训练前进、转向、
            上下楼、快速镜头等游戏常见刺激。
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/onboarding"
              className="px-8 py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl transition-all text-lg shadow-lg shadow-emerald-600/25"
            >
              🎮 开始低强度体验
            </Link>
            <Link
              href="/safety"
              className="px-8 py-4 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-xl transition-all text-lg border border-slate-700"
            >
              ⚠️ 先看安全说明
            </Link>
          </div>
        </div>
      </section>

      {/* Training roadmap preview */}
      <section className="max-w-5xl mx-auto px-4 py-16">
        <h2 className="text-2xl font-bold text-center mb-12">你的训练路线</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {ROADMAP_STEPS.map((step, i) => (
            <div key={i} className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5 hover:border-emerald-700/50 transition-all">
              <div className="flex items-center gap-3 mb-3">
                <span className="w-8 h-8 bg-emerald-600/20 text-emerald-400 rounded-lg flex items-center justify-center text-sm font-bold">
                  {i}
                </span>
                <h3 className="font-semibold text-white">{step.title}</h3>
              </div>
              <p className="text-sm text-slate-400">{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="max-w-5xl mx-auto px-4 py-16">
        <div className="grid md:grid-cols-3 gap-8">
          <FeatureCard
            icon="🎯"
            title="真实 3D 训练"
            desc="不是问卷，不是视频。在真实 Three.js 场景中完成可交互的视觉适应训练。"
          />
          <FeatureCard
            icon="📊"
            title="数据驱动"
            desc="记录每次训练的不适评分、时长、恢复时间，自动调整下一次训练强度。"
          />
          <FeatureCard
            icon="🛡️"
            title="安全第一"
            desc="随时暂停、降低强度或结束训练。高不适自动降级，严重症状提示停止。"
          />
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-3xl mx-auto px-4 py-16 text-center">
        <div className="bg-gradient-to-r from-emerald-900/40 to-cyan-900/40 border border-emerald-800/50 rounded-2xl p-10">
          <h2 className="text-2xl font-bold mb-4">准备好了吗？</h2>
          <p className="text-slate-400 mb-6">每天 5~10 分钟，记录自己的耐受提升过程</p>
          <Link
            href="/onboarding"
            className="inline-block px-8 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl transition-all"
          >
            免费开始训练
          </Link>
          <p className="text-xs text-slate-500 mt-4">
            免责声明：本产品不是医疗工具，不宣称治愈眩晕症
          </p>
        </div>
      </section>
    </div>
  );
}

function FeatureCard({ icon, title, desc }: { icon: string; title: string; desc: string }) {
  return (
    <div className="text-center p-6">
      <div className="text-3xl mb-3">{icon}</div>
      <h3 className="font-semibold text-white mb-2">{title}</h3>
      <p className="text-sm text-slate-400">{desc}</p>
    </div>
  );
}

const ROADMAP_STEPS = [
  { title: '静态场景', desc: '确认屏幕适配安全，观看静态 3D 房间' },
  { title: '慢速转向', desc: '在房间中慢速转动视角，找到指定物体' },
  { title: '视觉流适应', desc: '注视中央点，适应画面缓慢前进' },
  { title: '主动前进', desc: '按 W 键自己走，经过走廊检查点' },
  { title: '转向训练', desc: '按提示完成小角度左右转向' },
  { title: '迷宫探索', desc: '在小迷宫中搜索发光球体' },
];
