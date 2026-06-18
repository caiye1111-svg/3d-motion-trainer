export default function GuidesPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold mb-2">游戏设置指南</h1>
      <p className="text-slate-400 mb-8">优化你的游戏设置，降低玩 3D 游戏时的不适感</p>

      <div className="grid md:grid-cols-2 gap-6">
        <GuideCard
          title="🎯 FPS 游戏设置"
          tips={[
            '关闭动态模糊（Motion Blur）',
            '关闭镜头晃动（Camera Shake / Head Bob）',
            '将 FOV（视野）调到 90～100',
            '降低鼠标灵敏度，减少快速甩镜头',
            '关闭画面扭曲和色差效果',
            '提高帧率稳定性，目标 60fps 以上',
            '关闭屏幕边缘暗角和胶片颗粒',
          ]}
        />
        <GuideCard
          title="🌍 开放世界游戏设置"
          tips={[
            '关闭动态模糊',
            '降低镜头灵敏度',
            '关闭自动镜头跟踪',
            '使用第三人称视角（如果支持）',
            '降低画面细节和景深效果',
            '关闭角色跑动时的镜头摇晃',
            '减少快速载具使用',
          ]}
        />
        <GuideCard
          title="🏎️ 赛车游戏设置"
          tips={[
            '使用车尾视角而非驾驶舱视角',
            '调高 FOV，减少隧道视野感',
            '关闭屏幕震动效果',
            '关闭动态模糊',
            '降低画面细节以保证帧率',
            '从低速赛车模式开始适应',
          ]}
        />
        <GuideCard
          title="🥽 VR 游戏设置"
          tips={[
            '使用瞬移移动模式，避免平滑移动',
            '开启视野缩小（Vignette / Tunneling）',
            '降低刷新率到 72Hz 开始适应',
            '每次不超过 15 分钟',
            '出现任何不适立即摘下头显',
            '选择坐姿模式玩',
            '避免过山车、飞行、太空类 VR 游戏作为入门',
          ]}
        />
      </div>

      <div className="mt-12">
        <h2 className="text-2xl font-bold mb-6">通用舒适设置建议</h2>
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6">
          <div className="grid sm:grid-cols-2 gap-6">
            <div>
              <h3 className="text-white font-semibold mb-3">💻 显示设置</h3>
              <ul className="list-disc pl-5 space-y-2 text-sm text-slate-300">
                <li>使用窗口模式而非全屏</li>
                <li>屏幕距离一臂长</li>
                <li>屏幕顶部与眼睛齐平或略低</li>
                <li>刷新率至少 60Hz，越高越好</li>
                <li>开启 FreeSync / G-Sync 如果支持</li>
              </ul>
            </div>
            <div>
              <h3 className="text-white font-semibold mb-3">🏠 环境设置</h3>
              <ul className="list-disc pl-5 space-y-2 text-sm text-slate-300">
                <li>房间保持明亮，不要关灯玩</li>
                <li>保持通风，不要闷热</li>
                <li>定时休息，每 30 分钟休息 5 分钟</li>
                <li>喝水保持水分</li>
                <li>不要空腹或刚吃饱就玩</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-8 text-center">
        <p className="text-sm text-slate-600">
          这些建议基于社区经验和 cybersickness 相关研究，不构成医疗建议。
          如果调整设置后仍然严重不适，请咨询医生。
        </p>
      </div>
    </div>
  );
}

function GuideCard({ title, tips }: { title: string; tips: string[] }) {
  return (
    <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6">
      <h3 className="text-lg font-semibold text-white mb-4">{title}</h3>
      <ul className="space-y-2">
        {tips.map((tip, i) => (
          <li key={i} className="flex items-start gap-2 text-sm text-slate-300">
            <span className="text-emerald-400 mt-0.5">✓</span>
            {tip}
          </li>
        ))}
      </ul>
    </div>
  );
}
