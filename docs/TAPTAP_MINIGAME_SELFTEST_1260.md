# 1.26.0 Cocos转Tap小游戏自测

2026-11-01。本轮沿用已有叮咚应用951086、厂商105428，只生成开发自测包，不提审、不上线，不新建游戏。

## 路线修正

项目为Cocos Creator3.8.8。此前网页试玩采用Web Mobile，属于H5产物；现有叮咚应用的包体能力为APK/Tap小游戏。平台通用规范列出H5要求，不能据此认定该应用存在H5入口。H5尝试失败保留在[TAPTAP_SELFTEST_1260.md](TAPTAP_SELFTEST_1260.md)。

本次改用[TapTap官方Cocos适配](https://developer.taptap.cn/minigameapidoc/dev/engine/Cocos-Laya-Egret/)：Cocos先构建微信小游戏，再用官方1.2.2工具转换Tap包。没有把H5 ZIP改名或人工加game.json冒充小游戏；网页试玩保持。

## 可复现工具

- 项目包装入口：`tools/platform/taptap/build.cjs`；官方依赖版本、文档、下载地址和SHA锁定在`official-converter.json`。
- 原样调用官方`convertWechatToTap`导出函数，对应插件构建后使用的同一转换函数；不修改转换器源码。官方ZIP下载、Python解压、Node版本及临时路径在本机配置，不写入游戏业务表。
- Cocos配置继承`settings/builds/wechatgame.json`，DEBUG=false，原初始场景/竖屏/微信编译AppID保留；不向微信上传。Tap包关联以自测上传目标951086为准。
- 游戏版本读取原始Global.xlsx导出的Global.csv。UI/文本/数值/资源引用继续使用42表，不新添运行时调参；不增设服务端或账号后端。
- 所有产物使用非系统盘gptwork内新目录；解压拒绝路径穿越和符号链接；转换前确认目标目录不存在。原包及其他项目目录不清理。

```powershell
& '<本机Node.exe>' tools/platform/taptap/build.cjs `
  --creator 'F:/cocos2d/Creator/3.8.8/CocosCreator.exe' `
  --python '<本机Python.exe>' `
  --work-dir 'F:/gptwork/dingdong-tap-build'
```

该工具只构建和转换，不自动上传、签署协议、绑定资料页包体、提审或上线。

## 本次实际产物

- 客户端内容沿用UI1.26.0，构建来源9206f2a（客户端与d58afa5相同）；没有修改场景、PNG、字体、业务CSV或存档协议。
- Cocos微信生产构建于10:29 Finished、退出36；配置检查正常，既有引擎诊断保留。官方转换完整完成，Babel大文件格式提示保留。
- Tap ZIP：`F:/gptwork/dingdong-tap-minigame-20261101/tap-official-1/game.zip`，39309410字节。
- SHA-256：`6eb6e568784bde96625c42a2ebc0d5a84135ae7e6acdb34582d76b65aa18e2e9`。
- ZIP根入口game.js/game.json，没有index.html；竖屏、productVersion=1.26.0。1056文件逐一验签与ZIP CRC通过，42份CSV逐字入包，307张PNG相对微信构建不变。
- 包装工具的参数/语法、安全输出路径、Global版本读取已检查；本次实际转换使用同样的官方函数与独立临时脚本，不能据此声称新包装入口再次全链重建已通过。

## 上传与验收边界

已通过官方CLI的Tap包上传预览并完成文件上传。平台返回产物35285、parseStatus=success；单独回读解析状态为ready，确认不是只有本地压缩成功。上传约15分钟，过程中沿用同一任务与幂等键，没有重复创建上传。

上传捷径只生成解析产物，包体列表仍为空；依据实时schema，在同一应用/产物/上传任务下预览并创建版本号1.26.0的**开发版本**。该操作描述为“使用解析成功后的产物ID创建小游戏开发版本”，不属于整版提审、包体审核或上线；用户原授权包括生成自测包。返回包号409713，包体列表回读为stage=dev、39309410字节、publish_time=0，只有这一条开发包，没有审核/线上包。

获取409713自测二维码时，官方CLI返回HTTP422/failed_precondition：**“该应用的自测能力已被封禁”**。二维码没有生成，未尝试换接口、账号或包号绕过；没有把上传成功说成可扫码游玩。需要平台解除应用951086的自测限制后，再取得此开发包二维码。返回没有说明封禁原因，不能推测为资料、资质或内容问题。

最新证据见[evidence/taptap-minigame-20261101](evidence/taptap-minigame-20261101/README.md)。未调用预审/提审/发布/撤审或资料页主包体绑定，用户指定的不提审、不上线已保留。

原220项回归覆盖原客户端，新增构建工具未改变游戏逻辑，因此没有重复全套经营模拟。本轮尚无Tap宿主/手机实屏、广告、登录或完整关卡测试结果；构建、ZIP和上传均不能替代实际游玩验收。后续自测应覆盖加载→建造/升级→补给→结算、重进存档、音频、胶囊/安全区与暂停恢复，真实广告仍须独立适配和验证，不把网页模拟当成平台广告。
