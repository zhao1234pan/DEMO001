# 微信小游戏发布准备

版本：0.5.0。更新：2026-09-29。开发与测试状态见[项目状态](./PROJECT_STATUS.md)及[测试记录](./TESTING.md)。构建完成不代表平台运行、审核或发布通过。

## 当前事实

- 用户确认微信小游戏账号基础信息已提交，头像和介绍已填写；正式App ID为 `wx26d4fc297246037b`，已用于本项目独立构建。
- 游戏内名称为“叮咚夜班开始”。后台名称检测、主体与类目结果仍需上线事务核验，不从公开搜索或工程配置推断审核结果。
- Cocos Creator 3.8.8微信目标于2026-09-29 21:21:17 Finished。开发者工具运行、Android与iOS真机测试均未执行；微信SDK与胶囊适配待接入。
- 软著申请暂缓，未冻结登记版本；本任务未提交审核、上传版本或发布游戏。

账号事实来自用户最新确认及外部协作记录 `C:\Users\49837\Documents\ChatGPT\保卫萝卜项目\微信小游戏上线准备.md`；外部文件不是运行依赖，本开发任务未修改它。App ID是项目标识；不得索取、记录或提交AppSecret、账号令牌等秘密。

## 构建配置与复现

共享配置为[settings/builds/wechatgame.json](../settings/builds/wechatgame.json)，平台wechatgame、正式App ID、portrait、debug=false、原初始场景及merge_dep压缩。默认输出位于项目相邻gptwork目录；构建缓存与产物不提交Git。

在本机使用以下命令；另一电脑替换Creator、项目和gptwork实际路径，不改共享配置中的平台标识。

```powershell
& 'F:\cocos2d\Creator\3.8.8\CocosCreator.exe' --project 'G:\DEMO001' --build 'configPath=G:\DEMO001\settings\builds\wechatgame.json;buildPath=G:\gptwork\wechat-build'
```

配置格式依据[Cocos命令行发布文档](https://docs.cocos.com/creator/3.8/manual/zh/editor/publish/publish-in-command-line.html)；App ID、方向及开发者工具导入流程见[发布到微信小游戏](https://docs.cocos.com/creator/3.8/manual/zh/editor/publish/publish-wechatgame.html)。

本轮基于实现提交4a8d347构建。产物 `G:\gptwork\wechat-build\wechatgame` 共67文件、3817609字节；project.config.json的appid与配置一致、compileType=game，game.json为portrait。业务主脚本88248字节，哈希及日志见TESTING。日志有引擎及配置提示，不声称无警告。

## 已有工程边界

| 能力 | 当前代码事实 | 微信验证状态 |
| --- | --- | --- |
| 启动与首页 | GameRoot显示首页，再进入已解锁关卡；正式包包含首页文案、无GM入口标签 | 产物静态核查通过；尚无微信运行证据 |
| 生命周期 | PlatformService封装Cocos后台事件 | 待前后台、锁屏及恢复验证 |
| 存储 | 数字存档含异常与会话兜底，最高进度读旧值后合并 | 待微信正常/异常、跨重启恢复验证 |
| 布局 | Cocos安全区与BattleLayout等比布局；胶囊查询目前只封装抖音 | 微信胶囊未接入 |
| 广告 | 抖音SDK与非抖音模拟路径 | 微信SDK未接入，模拟奖励不能作为正式微信广告 |
| 音频与资源 | Cocos AudioSource与本地battle_art Bundle | 待加载、焦点、包体、设备表现验证 |

本轮没有空的platform/wechat目录或未使用代码。后续确有微信SDK调用时再建立专属封装及Cocos资源元数据；玩法和UI只调用服务，不直接使用wx.*。本轮广告规则与实现保持原样。

## 后续最小接入顺序

1. 在微信开发者工具导入本轮产物，记录工具版本、基础库版本、源码提交和实际运行结果；核对启动、首页、锁关、暂停/返回、重新进关、存档、资源与音频。
2. 接入微信运行时识别、胶囊避让及必要平台分支。广告另行完成SDK与异常闭环，不能落到现有非抖音模拟奖励路径。
3. 用Android及iOS真机检查前后台、锁屏、安全区、密集触控、存储重启恢复、音频、帧率/内存和10分钟持续运行。
4. 上线事务核对后台名称、主体、类目、资质与审核要求；以真实后台结果判断，不由构建成功推断可发布。

## 待验收清单

- [x] 用户确认基础信息提交完成，正式App ID已记录并配置。
- [x] 微信目标构建完成，产物与源码提交可追溯。
- [ ] 后台名称、主体及类目结果已核验。
- [ ] 微信开发者工具运行与首页/选关/返回等流程验收。
- [ ] 微信SDK、胶囊和广告分支接入。
- [ ] 存储正常/异常、跨重启、前后台、锁屏和音频恢复验证。
- [ ] 手机安全区、密集触控、包体加载、性能及持续运行验收。
- [ ] 本版本截图及材料与实测功能一致，发布条件经真实后台核对。

开发者工具运行：未执行。真机测试：未执行。Web浏览器、抖音产物与机器逻辑替身不能替代上述验证。
