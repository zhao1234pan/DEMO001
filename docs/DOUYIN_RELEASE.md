# 抖音小游戏发布准备

## 工程策略

- 发布平台：Cocos Creator 构建面板中的“抖音小游戏”。
- 方向：Portrait。
- 初始场景：`assets/scenes/battle/scn_battle.scene`。
- 首包优先只保留启动场景和必要脚本，后续内容使用 Asset Bundle 分包或远程资源。
- 广告、生命周期、存储等平台能力统一经 `PlatformService` 调用。
- `tt.*` 仅允许出现在 `assets/scripts/platform/douyin/`。

## IAA 决策状态

- 当前仅保留平台服务边界和实验性“失败复活”占位流程。
- 广告点位、奖励内容、触发节奏、会话频控和插屏策略均为“待产品确认”。
- 未取得正式 App ID、广告位 ID并完成真机验证前，不把占位逻辑视为可发布方案。

## 平台侧前置条件

- 注册抖音开放平台主体并创建小游戏，取得 App ID。
- 开通流量主后创建激励视频广告位。
- 将真实广告位 ID 配置到发布环境，不把生产 ID 散落在业务代码中。
- 安装抖音开发者工具，使用构建目录 `build/bytedance-mini-game` 进行预览和真机调试。

## 广告合规自检

- [ ] 只有玩家主动点击明确标注的按钮才拉起激励视频。
- [ ] 不默认勾选看广告，不隐藏“不看”或重开入口。
- [ ] 不把广告作为进入正常关卡的前置条件。
- [ ] 完整观看才发放承诺奖励；关闭或失败路径行为明确。
- [ ] 无广告填充或 API 异常时不阻断游戏。
- [ ] 不在连续点击区域突然插入广告按钮。
- [ ] 同一奖励不要求连续观看多条广告。
- [ ] 插屏不在启动时或完整操作过程中打断玩家。

## 构建与真机清单

- [ ] 竖屏、安全区和异形屏布局正确。
- [ ] Android / iOS 前后台切换后游戏保持暂停且可恢复。
- [ ] 来电、锁屏、音频焦点变化不造成计时跳跃。
- [ ] 广告请求、加载、展示、关闭、错误均有埋点和一次性回调保护。
- [ ] 主包与总包大小符合平台当前限制。
- [ ] 弱网、离线、无广告填充时可以继续游戏。
- [ ] 低端安卓机持续 10 分钟无明显掉帧、发热或内存增长。
- [ ] 图标、启动图、截图、隐私说明、适龄提示和资质材料齐全。
- [ ] 按抖音小游戏自审标准完成提审前检查。

## 历史验证记录

- 2026-09-25：Cocos Creator 3.8.8 抖音小游戏目标构建成功。
- 输出方向：Portrait。
- 验证包：约 3.19 MiB，已生成 `game.js`、`game.json`、`project.config.json`。
- 尚缺：正式 App ID、真实广告位 ID、抖音开发者工具真机验证与提审资料。
- 以上记录对应目录迁移和 750 × 1334 规范落地前的 `0.1.0`；最新结果以 `TESTING.md` 为准。

## 官方资料

- [Cocos Creator 3.8：发布到抖音小游戏](https://docs.cocos.com/creator/3.8/manual/zh/editor/publish/publish-bytedance-mini-game.html)
- [抖音开放平台：激励视频广告](https://developer.open-douyin.com/docs/resource/zh-CN/mini-game/develop/guide/open-ability/ad/incentive-ads)
- [抖音开放平台：广告小游戏运营规范](https://developer.open-douyin.com/docs/resource/zh-CN/mini-game/operation1/norms/norms)
- [抖音开放平台：小游戏自审标准](https://developer.open-douyin.com/docs/resource/zh-CN/mini-game/operation1/norms/standards)
