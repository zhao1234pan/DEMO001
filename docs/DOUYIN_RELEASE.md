# 抖音小游戏发布准备

## 0.6.0工程状态（2026-09-29）

本轮补主界面、冒险大图选关、挑战预留、三页签图鉴和独立音乐/音效设置，保留0.5.0存档异常恢复和返回首页规则。新增24秒原创BGM及可停止音效源，接入侧边栏能力检测/无奖励跳转；广告、关卡与战斗数值不改。最终三目标构建与集成证据以TESTING为准，不以子模块检查推断发布通过。

目标为抖音及微信，微信另见[微信发布准备](./WECHAT_RELEASE.md)，两平台分别验收。软著申请暂缓，未冻结登记版本。已核对正式抖音App ID `tt160f60b2887734e202`，写入独立构建配置并完成一次目标构建；后台名称、真实广告位、开发者工具、真机和上线事项仍需分别核验。现有广告流程不具备发布验收结论。

## 正式名称约定（2026-09-29）

- 游戏内、抖音后台及软著简称统一使用「叮咚夜班开始」，填写值不含感叹号、空格或书名号。
- 运行时权威值为GAME_CONFIG.gameName；英文工程标识ding-dong-night-shift不是正式中文显示名，不为改名重建项目或修改存档键。
- 此为用户确定的名称规则，不代表本轮已访问后台核验、取得软著或完成备案。名称约定本身不改变广告配置；正式App ID构建配置见下文，本任务不代办账号认证。
- 旧版测试、复盘和截图保留原始证据；后续新提交的简介、截图、说明书与申报材料均按当前名称制作。

## 工程策略

- 发布平台：Cocos Creator 构建面板中的“抖音小游戏”。
- 方向：Portrait。
- 初始场景仍为`assets/scenes/battle/scn_battle.scene`，由`GameRoot`先展示首页；不为首页额外复制一套战斗场景。
- 首包优先只保留启动场景和必要脚本，后续内容使用 Asset Bundle 分包或远程资源。
- 广告、生命周期、存储和胶囊统一经`PlatformService`；侧边栏与设置入口经`PlatformSettings`，SDK调用封装在对应平台目录。
- `tt.*` 仅允许出现在 `assets/scripts/platform/douyin/`。
- GM 选关面板仅使用 Cocos `DEBUG` 编译常量启用；正式抖音构建必须确认入口与相关文案已被移除。

## 正式构建配置

共享配置为[settings/builds/bytedance-mini-game.json](../settings/builds/bytedance-mini-game.json)：platform为bytedance-mini-game、portrait、debug=false、原初始场景及merge_dep压缩，App ID为`tt160f60b2887734e202`。默认产物输出项目相邻的gptwork/douyin-build，不提交Git。

```powershell
& 'F:\cocos2d\Creator\3.8.8\CocosCreator.exe' --project 'G:\DEMO001' --build 'configPath=G:\DEMO001\settings\builds\bytedance-mini-game.json;buildPath=G:\gptwork\douyin-build'
```

正式ID构建已执行，当前最终源码、产物和日志证据由TESTING记录；不得把此前0.5.0的testappId产物当作本轮正式ID验证。App ID是公开项目标识，不记录AppSecret或令牌。

## 设置、隐私与侧边栏

- 设置保留音乐、音效、版本与返回。隐私/服务政策以平台为准，不自编政策、数据说明或帮助反馈弹窗；抖音不新增替代隐私按钮，也不把小程序的隐私API当作小游戏API。
- 平台隐私政策和适龄提示由开发者按实际能力及游戏内容在后台完善；名称、主体、适龄分段和线上展示需真实核验，不能靠设置页面或类目通过替代。[创建与信息完善](https://developer.open-douyin.com/docs/resource/zh-CN/mini-game/guide/minigame/improve-information)
- 官方将侧边栏复访列为所有小游戏必接能力；源码已封装`checkScene({scene:'sidebar'})`，仅`isExist===true`时显示“侧边栏再玩”，点击同步调用`navigateToScene`。接口缺失、失败、抛错和8秒无回调有兜底，不绑定奖励。[必接能力](https://developer.open-douyin.com/docs/resource/zh-CN/mini-game/guide/minigame/essential-skills)、[检测接口](https://developer.open-douyin.com/docs/resource/zh-CN/mini-game/develop/api/javascript-api/open-capacity/sidebar-capacity/tt-check-scene)、[跳转接口](https://developer.open-douyin.com/docs/resource/zh-CN/mini-game/develop/api/javascript-api/open-capacity/sidebar-capacity/tt-navigate-to-scene)
- 必接技术指南包含复访奖励链路；本轮只实现能力检测及无奖励跳转，开发者工具、真机及发布审核仍须按实际版本核验，不宣称全部复访审核要求已经满足。[侧边栏技术指南](https://developer.open-douyin.com/docs/resource/zh-CN/mini-game/develop/guide/open-ability/Introduction-for-tech)
- 反馈由宿主菜单提供，本游戏未实现反馈或客服界面。通用运营规范要求开发者有反馈/客服机制；客服API的必接表另针对内购，不能据此推断当前产品已完成服务验收，发布前须核对实际宿主反馈渠道及处理机制。[运营规范](https://developer.open-douyin.com/docs/resource/zh-CN/mini-game/operation1/norms/game-rule)

## IAA 决策状态

- 当前已有平台服务边界、实验性失败复活和三个道具的广告补用占位流程，尚非真实广告验收结果。
- 广告点位、奖励内容、触发节奏、会话频控和插屏策略均为“待产品确认”。
- 正式App ID已配置，但真实广告位及真机验收尚未完成，不把占位广告逻辑视为可发布方案。

2026-09-27代码复盘确认两项发布前修复：缺失广告位当前仍会放行奖励/复活；创建广告实例同步异常时，请求标记可能不复位而锁住操作。应限制模拟奖励仅在调试环境生效，并对所有异常恢复请求状态。详见 [全项目复盘](./PROJECT_REVIEW_2026-09-27.md)，本轮未修复代码。

## 平台侧前置条件

- 已核对小游戏正式App ID并写入构建配置；主体、名称、平台隐私/适龄及其它上线事项仍按真实后台核验，账号资料不等于运行与审核通过。
- 开通流量主后创建激励视频广告位。
- 将真实广告位 ID 配置到发布环境，不把生产 ID 散落在业务代码中。
- 使用抖音开发者工具导入正式配置生成的`G:\gptwork\douyin-build\bytedance-mini-game`进行预览和真机调试，记录工具/基础库版本及源码提交。

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

- [ ] 主界面三入口、冒险4图分页及锁关提示、图鉴三页签/详情、声音开关、已解锁关重玩、暂停/结算返回流程正确。
- [ ] 侧边栏能力检测、真实跳转、返回及失败/超时行为已在对应宿主验证；不冒充已完成全部复访审核。
- [ ] 平台存储异常不中断流程，正式进度与GM隔离；成功保存后的重启恢复需真机验证。
- [ ] 竖屏、安全区和异形屏布局正确。
- [ ] Android / iOS 前后台切换后游戏保持暂停且可恢复。
- [ ] 来电、锁屏、音频焦点变化不造成计时跳跃；音乐/音效独立开关、后台停止、返回恢复、循环边界及外放混音通过真机听验。
- [ ] 广告请求、加载、展示、关闭、错误均有埋点和一次性回调保护。
- [ ] 主包与总包大小符合平台当前限制。
- [ ] 弱网、离线、无广告填充时可以继续游戏。
- [ ] 低端安卓机持续 10 分钟无明显掉帧、发热或内存增长。
- [ ] 图标、启动图、截图、平台隐私配置、适龄提示、反馈渠道和资质材料已按真实后台核对。
- [ ] 按抖音小游戏自审标准完成提审前检查。
- [ ] 0.6.0最终正式包重新确认无GM入口、“GM 关卡选择”和“返回正式进度”等调试文案；此前版本的静态通过记录保留在TESTING，不能自动沿用。

## 历史验证记录

- 2026-09-25：Cocos Creator 3.8.8 抖音小游戏目标构建成功。
- 输出方向：Portrait。
- 验证包：约 3.19 MiB，已生成 `game.js`、`game.json`、`project.config.json`。
- 尚缺：正式App ID的抖音发布配置验证、真实广告位 ID、抖音开发者工具真机验证与提审资料。
- 以上记录对应目录迁移和 750 × 1334 规范落地前的 `0.1.0`；最新结果以 `TESTING.md` 为准。

## 官方资料

- [Cocos Creator 3.8：发布到抖音小游戏](https://docs.cocos.com/creator/3.8/manual/zh/editor/publish/publish-bytedance-mini-game.html)
- [抖音开放平台：激励视频广告](https://developer.open-douyin.com/docs/resource/zh-CN/mini-game/develop/guide/open-ability/ad/incentive-ads)
- [抖音开放平台：广告小游戏运营规范](https://developer.open-douyin.com/docs/resource/zh-CN/mini-game/operation1/norms/norms)
- [抖音开放平台：小游戏自审标准](https://developer.open-douyin.com/docs/resource/zh-CN/mini-game/operation1/norms/standards)
