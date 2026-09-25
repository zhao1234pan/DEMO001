# 增加正式战斗倍速功能

- 状态：进行中
- 机器：pc-a
- 分支：codex/pc-a/battle-speed-control
- 开始日期：2026-09-25
- 目标：为所有玩家增加正式的 1、2、3 倍战斗速度切换，并保持暂停、广告和结算状态安全。
- 修改范围：战斗时间推进、倍速本地保存、顶部状态栏按钮、触控区域、中文产品与测试文档。
- 预计修改文件：`assets/scripts/gameplay/battle/GameRoot.ts`、`docs/GAMEPLAY.md`、`docs/PROJECT_STATUS.md`、`docs/TESTING.md`、`CHANGELOG.md`。
- 验收条件：玩家可在战斗中循环切换 1、2、3 倍速；切关、重开和复活保留选择；暂停或广告期间不推进；按钮在 750×1334 竖屏中无重叠；TypeScript、Web Mobile 与抖音小游戏构建通过。
- 当前进度：正在实现时间推进和顶部按钮。
- 测试结果：待填写。
- 提交：待填写。
- 遗留问题与下一步：待填写。
