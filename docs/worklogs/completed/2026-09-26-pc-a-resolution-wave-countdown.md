# 修复设计分辨率适配并增加波次倒计时

- 状态：已完成
- 机器：pc-a
- 分支：codex/pc-a/resolution-wave-countdown
- 开始日期：2026-09-26
- 目标：修复 750 × 1334 基准画布下的非等比缩放与触控映射，并在每波出怪前提供清晰的下一波预告和 3、2、1 倒计时。
- 修改范围：战斗逻辑坐标映射、画布适配、触控坐标换算、波次状态显示、中文玩法与测试文档。
- 预计修改文件：`assets/scripts/gameplay/battle/GameConfig.ts`、`assets/scripts/gameplay/battle/GameRoot.ts`、`docs/PROJECT_STANDARDS.md`、`docs/GAMEPLAY.md`、`docs/PROJECT_STATUS.md`、`docs/TESTING.md`、`CHANGELOG.md`。
- 验收条件：750 × 1334 基准视口无拉伸和裁切；375 × 667 等比手机视口布局一致；触控命中正确；首波和波间均显示下一波提示，最后 3 秒清晰倒计时；倍速与暂停状态正确；TypeScript、Web Mobile 与抖音小游戏构建通过。
- 当前进度：严格等比逻辑画布、触控换算、入口倒计时、中文文档和验收均已完成，功能分支已推送，等待合并同步 `main`。
- 测试结果：TypeScript 严格检查 0 错误；Web Mobile 与抖音小游戏构建均输出 `Finished`；抖音包约 3.20 MiB、方向为 `portrait`、必需文件完整；750 × 1334 视口中浏览器和 Canvas 尺寸完全一致；375 × 667 视口完整显示且塔位点按命中；首波倒计时显示、归零消失和出怪衔接通过。
- 提交：`b47a830`（任务认领）、`fba28df`（画布等比适配、波次倒计时、中文文档与验收记录）。
- 遗留问题与下一步：16:9 至 20:9 的抖音真机安全区仍需取得正式 App ID 后覆盖验证；Cocos 浏览器预览选择 750 × 1334 时需要足够高的内容区才能在桌面上一次看到完整画布。
