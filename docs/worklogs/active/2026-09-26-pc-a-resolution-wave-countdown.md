# 修复设计分辨率适配并增加波次倒计时

- 状态：进行中
- 机器：pc-a
- 分支：codex/pc-a/resolution-wave-countdown
- 开始日期：2026-09-26
- 目标：修复 750 × 1334 基准画布下的非等比缩放与触控映射，并在每波出怪前提供清晰的下一波预告和 3、2、1 倒计时。
- 修改范围：战斗逻辑坐标映射、画布适配、触控坐标换算、波次状态显示、中文玩法与测试文档。
- 预计修改文件：`assets/scripts/gameplay/battle/GameConfig.ts`、`assets/scripts/gameplay/battle/GameRoot.ts`、`docs/PROJECT_STANDARDS.md`、`docs/GAMEPLAY.md`、`docs/PROJECT_STATUS.md`、`docs/TESTING.md`、`CHANGELOG.md`。
- 验收条件：750 × 1334 基准视口无拉伸和裁切；375 × 667 等比手机视口布局一致；触控命中正确；首波和波间均显示下一波提示，最后 3 秒清晰倒计时；倍速与暂停状态正确；TypeScript、Web Mobile 与抖音小游戏构建通过。
- 当前进度：已确认问题来源，准备修复等比适配并设计波次预告。
- 测试结果：待填写。
- 提交：待填写。
- 遗留问题与下一步：待填写。
