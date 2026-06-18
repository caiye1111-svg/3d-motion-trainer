import Link from 'next/link';

export default function SafetyPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold mb-2">安全说明</h1>
      <p className="text-slate-400 mb-8">开始训练前，请务必阅读以下内容</p>

      <div className="space-y-8">
        <SafetySection title="⚠️ 重要声明">
          <ul className="list-disc pl-5 space-y-2 text-slate-300">
            <li>本产品<strong className="text-white">不是医疗诊断或治疗工具</strong></li>
            <li>不宣称治愈、治疗眩晕症或任何医学康复效果</li>
            <li>训练目的是帮助玩家<strong className="text-white">逐步适应 3D 游戏镜头运动</strong></li>
            <li>如有严重或持续性眩晕，请及时就医</li>
          </ul>
        </SafetySection>

        <SafetySection title="🚫 不适合直接使用的人群">
          <ul className="list-disc pl-5 space-y-2 text-slate-300">
            <li>正在经历急性眩晕、耳石症发作、梅尼埃病发作</li>
            <li>一看屏幕就剧烈恶心、呕吐</li>
            <li>训练后眩晕持续很久不缓解</li>
            <li>伴随耳鸣、听力下降、走路不稳、肢体麻木</li>
            <li>伴随胸闷、视物旋转</li>
            <li>医生建议暂时避免视觉刺激或前庭刺激</li>
          </ul>
          <p className="mt-3 text-amber-400 text-sm">
            以上人群应咨询医生或专业人员，不建议使用本产品进行训练。
          </p>
        </SafetySection>

        <SafetySection title="🛑 训练中何时应该停止">
          <ul className="list-disc pl-5 space-y-2 text-slate-300">
            <li>出现明显恶心或想吐的感觉</li>
            <li>出现视物旋转或方向感严重混乱</li>
            <li>出冷汗、面色发白</li>
            <li>头痛明显加重</li>
            <li>眼睛胀痛难以继续</li>
          </ul>
        </SafetySection>

        <SafetySection title="⏱️ 训练后注意事项">
          <ul className="list-disc pl-5 space-y-2 text-slate-300">
            <li>训练后稍作休息，不要立即开车或操作危险设备</li>
            <li>如果 30 分钟后仍感明显不适，当天不要再训练</li>
            <li>如果不适持续超过 2 小时，建议咨询医生</li>
            <li>不要在疲劳、饥饿、饮酒后训练</li>
          </ul>
        </SafetySection>

        <SafetySection title="💡 提高舒适度的小技巧">
          <ul className="list-disc pl-5 space-y-2 text-slate-300">
            <li>打开房间灯，不要在黑暗中训练</li>
            <li>保持屏幕在舒适距离（约一臂长）</li>
            <li>先使用窗口模式，而非全屏</li>
            <li>保持房间通风</li>
            <li>训练前不要吃太饱</li>
            <li>如果感觉不适，先尝试舒适模式（降低速度、显示中心点）</li>
          </ul>
        </SafetySection>
      </div>

      <div className="mt-10 p-6 bg-emerald-900/20 border border-emerald-800/50 rounded-xl text-center">
        <p className="text-slate-300 mb-4">我已理解以上安全说明，准备好开始训练</p>
        <Link
          href="/onboarding"
          className="inline-block px-8 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl transition-all"
        >
          进入新手适配
        </Link>
      </div>
    </div>
  );
}

function SafetySection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6">
      <h2 className="text-lg font-semibold text-white mb-3">{title}</h2>
      {children}
    </div>
  );
}
