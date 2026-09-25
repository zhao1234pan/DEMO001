# 技术架构

## 技术基线

- Cocos Creator 3.8.8
- TypeScript
- 2D UI 渲染，390 × 700 竖屏设计分辨率
- 抖音小游戏为首要发布目标，同时保留浏览器预览能力

## 模块

### `assets/scripts/game/GameRoot.ts`

MVP 入口组件，负责游戏状态、波次、寻路、战斗、输入和程序化绘制。当前集中实现便于快速验证；进入内容生产阶段后拆分为 `WaveSystem`、`CombatSystem`、`BuildSystem`、`GameUI`。

### `assets/scripts/game/GameConfig.ts`

集中保存设计分辨率、广告位占位配置、路径、塔位和数值。后续关卡数据应迁移到 JSON 或 Scriptable 配置资源，避免硬编码扩散。

### `assets/scripts/platform/PlatformService.ts`

隔离 `tt.*` 平台 API。游戏逻辑不得在其他模块直接访问 `tt`，以保证浏览器预览、真机调试和错误兜底行为一致。

## 抖音适配边界

- 广告仅通过 `PlatformService.showRewardedVideo` 调用。
- 监听 Cocos `Game.EVENT_HIDE`，切入后台立即暂停。
- 设计为竖屏并优先使用触控事件。
- 资源按“首场景 / 关卡资源 / 音频”预留 Asset Bundle 拆分空间。
- 不依赖 DOM、浏览器专用 API 或 Node.js 运行时。

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

