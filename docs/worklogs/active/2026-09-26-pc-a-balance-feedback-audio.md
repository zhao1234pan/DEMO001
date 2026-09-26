# 调优前 3 关并增强战斗反馈与音效

- 状态：进行中
- 机器：pc-a
- 分支：codex/pc-a/balance-feedback-audio
- 开始日期：2026-09-26
- 目标：精调前 3 关的经济、敌人组合和店员定位，增加不依赖新手引导的建造、升级、攻击、击杀、漏怪、波次与结算反馈，并接入原创轻量音效。
- 修改范围：前 3 关配置、战斗表现状态、音频服务、原创音效资源、中文玩法与测试文档；本轮不增加新手引导。
- 预计修改文件：`assets/scripts/gameplay/battle/LevelConfig.ts`、`assets/scripts/gameplay/battle/GameConfig.ts`、`assets/scripts/gameplay/battle/GameRoot.ts`、`assets/scripts/services/AudioService.ts`、`assets/audio/`、相关 `.meta`、`docs/GAMEPLAY.md`、`docs/PROJECT_STATUS.md`、`docs/TESTING.md`、`CHANGELOG.md`。
- 验收条件：第 1 关建立豆包建造/升级节奏，第 2 关体现棉棉对高速敌人的价值，第 3 关体现布丁处理密集敌群的价值；关键战斗行为有清晰视觉与声音反馈；音频加载失败不阻断游戏；TypeScript、Web Mobile、抖音小游戏构建和竖屏试玩通过。
- 当前进度：已完成当前 10 关路线与压力审计，准备建立前三关更细的经济和波次基线。
- 测试结果：待填写。
- 提交：待填写。
- 遗留问题与下一步：待填写。
