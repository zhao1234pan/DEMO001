# GM 关卡选择面板

- 状态：待验收
- 机器：pc-a
- 分支：codex/pc-a/gm-level-selector
- 开始日期：2026-09-26
- 目标：增加只在调试环境显示的 GM 入口和 1～10 关选择面板，方便快速验证任意关卡。
- 修改范围：战斗主界面的调试入口、GM 面板、关卡切换逻辑、测试与项目进度文档。
- 预计修改文件：`assets/scripts/gameplay/battle/GameRoot.ts`、`docs/PROJECT_STATUS.md`、`docs/TESTING.md`、`CHANGELOG.md`。
- 验收条件：调试构建可打开/关闭 GM 面板；可直接进入第 1～10 关；切关重置战斗但不修改正式解锁进度；正式构建不显示 GM 入口；Web Mobile 与抖音小游戏构建通过。
- 当前进度：GM 入口、1～10 关面板、当前关高亮、切关重置、GM 存档隔离和返回正式进度均已实现。
- 测试结果：Cocos TypeScript 项目检查通过；750 × 1334 Web 调试版实际完成第 2 关→第 10 关→正式第 2 关切换，控制台无错误或警告；Web Mobile 与抖音小游戏构建均输出 `Finished`；抖音发布包约 3.37 MiB、保持竖屏且检索不到 GM 文案和入口标识。
- 提交：`85c9b1b feat: 增加调试版GM选关面板`。
- 遗留问题与下一步：等待用户在 Creator 预览中验收；正式上线前继续保留发布包 GM 文案检查。
