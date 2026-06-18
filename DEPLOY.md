# 3D Motion Sickness Trainer — 部署文档

## 技术栈
- **前端**: Next.js 16 + React 19 + TypeScript
- **3D**: Three.js + React Three Fiber + @react-three/drei
- **样式**: Tailwind CSS v4
- **状态**: Zustand
- **图表**: Recharts
- **数据库**: Supabase (Postgres + Auth)
- **部署**: Vercel

## 本地开发

```bash
# 1. 安装依赖
cd E:/Hermes/3d-motion-trainer
npm install

# 2. 配置环境变量 (可选，不配也能运行)
# 编辑 .env.local:
#   NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
#   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbG...

# 3. 启动开发服务器
npm run dev

# 4. 打开浏览器 http://localhost:3000
```

> **注意**: 不配置 Supabase 也能完整运行，所有数据存储在浏览器 localStorage。

## 构建 & 生产部署

```bash
npm run build   # 构建生产版本
npm start       # 启动生产服务器 (默认端口 3000)
```

### Vercel 部署 (推荐)

1. 推送代码到 GitHub
2. 在 vercel.com 导入仓库
3. 设置环境变量:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. 部署

### Supabase 配置

1. 创建 Supabase 项目
2. 在 SQL Editor 中执行 `supabase/migrations/001_initial_schema.sql`
3. 复制 API URL 和 anon key 到环境变量
4. Authentication → Settings → 按需配置邮箱验证

## 项目结构

```
src/
├── app/                    # Next.js App Router 页面
│   ├── page.tsx            # 首页
│   ├── safety/             # 安全说明
│   ├── onboarding/         # 新手适配
│   ├── training/           # 训练中心 + 会话 + 结果
│   ├── dashboard/          # 仪表盘
│   ├── guides/             # 游戏设置指南
│   ├── auth/               # 登录/注册
│   └── api/                # API 路由
├── components/             # 共享组件
│   ├── TrainingCanvas.tsx  # 3D 场景路由器
│   ├── FirstPersonController.tsx
│   ├── ComfortControls.tsx
│   ├── SafetyGate.tsx
│   └── ...
├── scenes/                 # 3D 训练场景
│   ├── StaticRoomScene.tsx        # Lv.0, Lv.1
│   ├── VisualFlowTunnelScene.tsx  # Lv.2
│   ├── SlowWalkCorridorScene.tsx  # Lv.3
│   ├── TurnTrainingScene.tsx      # Lv.4
│   ├── MazeSearchScene.tsx        # Lv.5
│   └── StairSlopeScene.tsx        # Lv.6
├── lib/                    # 工具库
│   ├── sceneConfigs.ts     # 训练等级配置 (Lv.0-12)
│   ├── trainingRules.ts    # 升级/降级算法
│   ├── progressStore.ts    # 进度持久化
│   └── supabase/           # Supabase 客户端
├── stores/                 # Zustand stores
└── types/                  # TypeScript 类型
```

## 训练等级一览

| Lv | 名称 | 场景类型 | 核心训练 |
|----|------|----------|----------|
| 0 | 安全屏幕适配 | 静态房间 | 确认 3D 画面安全 |
| 1 | 静态 3D 空间适应 | 房间找物 | WASD 移动 + 收集方块 |
| 2 | 隧道视觉流 | 隧道靶标 | 点击光球训练视觉流 |
| 3 | 走廊检查点 | 走廊前进 | 穿过检查点到达终点 |
| 4 | 转向瞄准 | 圆形房间 | 转头对准角度靶标 |
| 5 | 迷宫找光球 | 迷宫探索 | 搜索收集 5 个光球 |
| 6 | 上下坡楼梯 | 坡道+楼梯 | 垂直运动适应 |
| 7-12 | 进阶训练 | 参数强化 | 更高速度/复杂度的复用场景 |

## 安全机制

- **不适评分**: 训练前/中/后三次评分 (0-10)
- **自动停止**: peak_score ≥ 8 或严重症状自动结束
- **降级规则**: 连续高不适 → 自动降低训练等级
- **休息建议**: 连续失败 3 次或日训练 ≥4 次提示休息
- **舒适模式**: 降低速度 30%、缩小 FOV、显示中央点
- **恢复追踪**: 训练后恢复时间记录，影响升级判断
