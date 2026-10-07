# 1.7.0 UI改版最终自动回归证据

2026-10-07，本机恢复开发后，针对v11最终构建重新跑测。较早v8证据保留在相邻ui-redesign-checkpoint目录，不能混为同一轮。

- checks.json：本轮检查摘要、代码与配置快照哈希。
- browser.json及layout文件：四视口28项真实点击及竖卡布局检查。
- screens-qa.json：逐页28项；screens为最终包实际截图。ui-loading是皮肤加载完成后、启动尚未结束的真实画面；startup-bundle-failed为故障注入的文字兜底。
- campaign.json：实际GameRoot.update自动布阵，冒险20关胜利与挑战15波/10次选卡胜利；不是手工或手机试玩。
- startup.json：美术包失败重试、配置失败重试、空图片回调归还引用、加载中销毁四项。
- release.json：正式Web七项，GM入口/面板/重置与预览禁用。
- builds.json：Web调试/正式、抖音、微信目标的产物哈希和导表门禁。CLI退出码36不单独作为成功依据，核对Finished、门禁、全新产物及Web实际运行。Creator日志的计时/辅助子进程退出信息没有替代上述验收。

构建包、完整辅助脚本和日志保留在G:/gptwork/ui-redesign及ui-redesign-v11-*，不纳入运行仓库。无实体手机、平台开发者工具、平台广告或本轮Draw Call对比结果。完整说明见../../UI_REDESIGN_VERIFICATION.md。
