# Cocos转Tap小游戏自测包

- 状态：进行中
- 日期/机器：2026-11-01 / pc-a
- 分支：codex/pc-a/ui-experience-refresh，接续9ac12c5；不合并main。
- 用户范围：继续上传叮咚自测包，不提审、不上线；用户提醒项目使用Cocos，核实后改用官方Cocos→Tap小游戏构建链。
- 原因：此前复用Web Mobile H5产物；现有应用951086的可用包体类型为apk/mini_app，H5上传通道不适用。游戏仍为Cocos Creator3.8.8，网页试玩保留。
- 官方依据：https://developer.taptap.cn/minigameapidoc/dev/engine/Cocos-Laya-Egret/；官方插件1.2.2支持Cocos3.8.x，先构建微信小游戏再转换Tap。
- 工具来源：https://app-res.tapimg.com/file/2026-04-14/67e7d94f5e586596dab061816d1c509d.zip；SHA-256 6b8a9a3cc62b6c54cefab397097babb771d9d99f90442cddff06310a4c9ed73f。
- 本地临时目录：F:/gptwork/dingdong-tap-minigame-20261101；不清理其他项目进程或目录。
- 预计改动：可复现构建/转换包装、平台必要兼容、来源/配置规范和测试/交付记录；原玩法及已确认UI不改。
- 验证：配置门禁、微信生产构建、官方转换完成、Tap包结构/方向/版本/PNG与CSV核对；必要平台回归、上传结果和自测二维码。不能用构建替代宿主/真机通过。
- 平台现状：厂商105428/叮咚951086已核实，登录有效；mini_app包体列表为空。未开通新的游戏类型、未提审/上线。涉及附加开通行为需先核对实际必要性，不执行未经需要的分析或其他服务开通。
- 已完成：微信生产构建Finished/退出36，官方转换成功；1056文件/42CSV/307PNG、ZIP CRC与SHA通过，独立Tap包39309410字节，SHA 6eb6e568784bde96625c42a2ebc0d5a84135ae7e6acdb34582d76b65aa18e2e9。
- 工具：7aef174加入可复现包装，后补解压/路径硬化；参数/语法/路径与三种解压行为通过。记录详见docs/TAPTAP_MINIGAME_SELFTEST_1260.md。
- 上传：已按明确授权完成dry-run并执行upload-mini-app-package，稳定幂等键dingdong-1260-tap-selftest-20261101；任务38cebfcf-1017-4dd7-a49f-61e9734b1dab，当前文件传输中，未重复创建上传任务，尚无包号/二维码。
