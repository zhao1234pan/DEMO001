# 技术架构

## 技术基线

- Cocos Creator 3.8.8
- TypeScript
- 2D UI 渲染，750 × 1334 竖屏设计分辨率
- `Fit Width = true`、`Fit Height = false`，固定宽度、动态高度
- 抖音小游戏为首要发布目标，同时保留浏览器预览能力

## 模块

### `assets/scripts/gameplay/battle/GameRoot.ts`

MVP 入口组件，负责游戏状态、波次、寻路、战斗、输入和程序化绘制。当前集中实现便于快速验证；进入内容生产阶段后拆分为 `WaveSystem`、`CombatSystem`、`BuildSystem`、`GameUI`。

### `assets/scripts/gameplay/battle/GameConfig.ts`

集中保存设计分辨率、广告位占位配置、路径、塔位和店员基础数值。

### `assets/scripts/gameplay/battle/LevelConfig.ts`

保存 10 个关卡各自的路线折点、塔位、初始零钱、耐久、可用店员、敌人生命/速度倍率和 3～5 波敌人编排。玩法通过 `getLevelConfig` 读取关卡，不在输入或渲染逻辑中散落关卡判断；内容量继续增长时再迁移到 JSON 或可编辑配置资源。

### `assets/scripts/services/PlatformService.ts`

向玩法层提供生命周期、本地存储和广告能力。当前可玩原型在正式 750 × 1334 画布中映射原有逻辑坐标，后续新 UI 直接按正式设计尺寸制作。

### `assets/scripts/services/AudioService.ts`

集中管理局内短音效。服务通过 Cocos `resources` 异步加载 `assets/resources/audio/sfx/` 中的 `AudioClip`，再使用单一 `AudioSource` 播放，不依赖 DOM、浏览器音频接口或 `tt.*`。资源尚未加载或加载失败时跳过本次播放，不影响战斗；攻击、击杀和漏怪等高频声音由服务统一限频。

### `assets/scripts/platform/douyin/`

唯一允许封装 `tt.*` 的目录。`DouyinRewardedVideo.ts` 管理激励视频实例和一次性回调保护；玩法层不得直接引用平台全局变量。

## 抖音适配边界

- 广告仅通过 `PlatformService.showRewardedVideo` 调用。
- 监听 Cocos `Game.EVENT_HIDE`，切入后台立即暂停。
- 设计为竖屏并优先使用触控事件。
- 资源按“首场景 / 关卡资源 / 音频”预留 Asset Bundle 拆分空间。
- 不依赖 DOM、浏览器专用 API 或 Node.js 运行时。
- IAA 的广告节奏、奖励内容和频控尚未定稿；平台层只保留能力边界。

## 性能预算

- 逻辑帧不创建大量临时节点；敌人、子弹和特效进入内容版后使用对象池。
- 同屏目标：敌人不超过 60、子弹不超过 100、粒子不超过 200。
- 美术版优先使用图集，限制材质和 DrawCall；背景与路径静态化。
- 发布前在低端安卓真机上记录平均 FPS、最低 FPS、峰值内存和首包加载时间。

## Git 约定

- 必须提交 `.meta` 文件，资源与其 `.meta` 同步增删。
- 不提交 Cocos 的缓存、构建和本地机器配置。
- 一次提交只处理一个主题；提交信息建议使用 `feat:`、`fix:`、`docs:`、`refactor:`、`test:`、`chore:`。
- 合并前至少完成 Creator 预览、TypeScript 编译和目标平台构建检查。

目录职责和资源命名以 [PROJECT_STANDARDS.md](./PROJECT_STANDARDS.md) 为准。
