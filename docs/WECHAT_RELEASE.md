# 微信小游戏发布准备

版本：0.6.0。更新：2026-09-29。开发与测试状态见[项目状态](./PROJECT_STATUS.md)及[测试记录](./TESTING.md)。构建完成不代表平台运行、审核或发布通过。

## 当前事实

- 用户确认微信小游戏账号基础信息已提交，头像和介绍已填写；正式App ID为 `wx26d4fc297246037b`，已用于本项目独立构建。
- 游戏内名称为“叮咚夜班开始”。用户已确认服务类目“游戏→休闲游戏”审核通过；后台名称结果、主体与其他上线事项仍分别核验，不从类目通过推断版本审核或发布通过。
- 0.5.0的Cocos Creator 3.8.8微信目标于2026-09-29 21:21:17 Finished，以下保留该历史证据。0.6.0已接入微信胶囊尺寸封装，最终构建及集成证据由TESTING统一记录。
- 本机注册表存在微信开发者工具1.05.2204264的安装记录，实际路径与当前可运行性待核验；不能写成绝对未安装，也不能据记录认定已通过运行验收。微信开发者工具、Android及iOS真机验收尚未完成。
- 软著申请暂缓，未冻结登记版本；本任务未提交审核、上传版本或发布游戏。

账号事实来自用户最新确认及外部协作记录 `C:\Users\49837\Documents\ChatGPT\保卫萝卜项目\微信小游戏上线准备.md`；外部文件不是运行依赖，本开发任务未修改它。App ID是项目标识；不得索取、记录或提交AppSecret、账号令牌等秘密。

## 构建配置与复现

共享配置为[settings/builds/wechatgame.json](../settings/builds/wechatgame.json)，平台wechatgame、正式App ID、portrait、debug=false、原初始场景及merge_dep压缩。默认输出位于项目相邻gptwork目录；构建缓存与产物不提交Git。

在本机使用以下命令；另一电脑替换Creator、项目和gptwork实际路径，不改共享配置中的平台标识。

```powershell
& 'F:\cocos2d\Creator\3.8.8\CocosCreator.exe' --project 'G:\DEMO001' --build 'configPath=G:\DEMO001\settings\builds\wechatgame.json;buildPath=G:\gptwork\wechat-build'
```

配置格式依据[Cocos命令行发布文档](https://docs.cocos.com/creator/3.8/manual/zh/editor/publish/publish-in-command-line.html)；App ID、方向及开发者工具导入流程见[发布到微信小游戏](https://docs.cocos.com/creator/3.8/manual/zh/editor/publish/publish-wechatgame.html)。

历史记录：0.5.0基于实现提交4a8d347构建。产物 `G:\gptwork\wechat-build\wechatgame` 共67文件、3817609字节；project.config.json的appid与配置一致、compileType=game，game.json为portrait。业务主脚本88248字节，哈希及日志见TESTING。日志有引擎及配置提示，不声称无警告。

## 已有工程边界

| 能力 | 当前代码事实 | 微信验证状态 |
| --- | --- | --- |
| 主界面与冒险 | 三个主页入口、设置、4图分页选关；锁关不可进，暂停/结算返回 | 源码已接；0.6.0微信运行待验 |
| 图鉴 | 三页签、3怪/3店员/2个锁定BOSS预留；正式遭遇与旧档补录，GM/评审隔离 | 子模块检查不代替微信存储与实际展示 |
| 生命周期 | PlatformService封装Cocos前后台事件，后台暂停战斗与声音，前台按偏好恢复音乐 | 待锁屏、焦点及恢复验证 |
| 存储 | 原进度、声音偏好及图鉴发现标记含会话兜底，最高记录读旧值后合并 | 待正常/异常、跨重启恢复验证 |
| 布局 | Cocos安全区加WechatSettings的窗口/胶囊尺寸查询，异常回退0 | 已有接口替身检查；真实胶囊待验 |
| 平台政策 | 使用宿主机制与后台要求，游戏内不复制可选入口或自编政策 | 后台隐私配置及实际使用能力待核验 |
| 广告 | 抖音SDK与非抖音模拟路径保持原样 | 微信广告SDK未接入，模拟奖励不是正式微信广告 |
| 音频与资源 | 24秒原创BGM共用循环源、最多6音效源、本地battle_art复用 | 待加载、混音、循环边界、焦点、包体及设备表现验证 |

本轮新增实际使用的`platform/wechat/WechatSettings.ts`及Cocos元数据，玩法和UI只调用服务，不直接使用`wx.*`。窗口查询使用`getWindowInfo`，不因兼容回退而读取更广系统信息。本轮广告规则与实现保持原样。

## 隐私与设置边界

设置仅保留音乐、音效、版本和返回。政策内容使用宿主机制及后台要求，不在游戏内复制可选入口；不自编隐私/服务政策、数据说明或帮助反馈弹窗，不新增个人资料采集、账号、权限请求或后端。反馈由宿主菜单提供，不作为本游戏已实现功能。

微信官方说明`wx.openPrivacyContract`并非必须调用的接口；本轮按用户“外部只做平台必要要求”的范围，不接该可选API，也不保留闲置封装。后台隐私配置仍须按实际使用能力核验，不能把删去可选按钮等同于免除平台要求。依据[微信小游戏隐私指引API](https://developers.weixin.qq.com/minigame/dev/api/open-api/privacy/wx.openPrivacyContract.html)及[微信官方API定义](https://github.com/wechat-miniprogram/minigame-api-typings/blob/master/types/wx/lib.wx.api.d.ts)。

胶囊能力依据[窗口信息](https://developers.weixin.qq.com/minigame/dev/api/base/system/wx.getWindowInfo.html)与[菜单按钮布局](https://developers.weixin.qq.com/minigame/dev/api/ui/menu/wx.getMenuButtonBoundingClientRect.html)；缺接口或非法尺寸回退引擎安全区，不写成真实微信避让已验收。

## 后续最小接入顺序

1. 核验本机开发者工具安装路径与可运行版本，导入0.6.0最终产物，记录工具/基础库版本、源码提交及实际结果；检查主页、大图三页、图鉴、锁关、返回、存档和声音开关。
2. 验证已接入的微信运行识别与胶囊避让。正式广告另行完成SDK和异常闭环，不能落到现有非抖音模拟奖励路径。
3. 用Android及iOS真机检查前后台、锁屏、安全区、交错多触、存储重启、音乐/音效、循环衔接、帧率/内存和10分钟持续运行。
4. 核对后台名称、主体、平台隐私配置、资质和审核要求；保留已通过的休闲游戏类目事实，不由类别或构建成功推断可发布。

## 待验收清单

- [x] 用户确认基础信息提交完成，正式App ID已记录并配置。
- [x] 0.5.0微信目标构建完成，产物与源码提交可追溯。
- [x] 用户确认服务类目“游戏→休闲游戏”审核通过。
- [x] 0.6.0源码接入微信胶囊尺寸封装。
- [ ] 0.6.0最终目标构建与产物核对，结果以TESTING为准。
- [ ] 后台名称、主体、隐私配置及其他上线事项核验。
- [ ] 微信开发者工具运行与主界面/选关/图鉴/设置/返回流程验收。
- [ ] 已接胶囊在微信客户端验证；微信广告分支另行接入。
- [ ] 存储正常/异常、跨重启、前后台、锁屏和音频恢复验证。
- [ ] 手机安全区、密集触控、包体加载、性能及持续运行验收。
- [ ] 本版本截图及材料与实测功能一致，发布条件经真实后台核对。

开发者工具与真机验收：尚未完成。安装记录不等于可运行或验收通过；Web浏览器、抖音产物与机器逻辑替身不能替代上述验证。

## 2026-09-30 GM发布检查补充

首页新增GM仅供调试。发布必须使用settings/builds中的debug=false配置；非调试运行不显示入口、不加载面板且不能通过GM解锁图鉴。已构建本平台正式包，宿主真机验收仍待完成。详见[GM工具说明](GM_TOOLS.md)。
