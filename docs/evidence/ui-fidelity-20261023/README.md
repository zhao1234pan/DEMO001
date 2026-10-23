# UI共享图片层与离线对照证据

日期：2026-10-23，版本1.25.0，基线bc9deab。

- index.html／review.json：312条资源绑定、305个独立PNG路径、37套Prefab、93个图像槽位与资源签名。
- staff-level1／staff-level2／evolution／monsters／perks／technology.png：同一PNG在画布适配与可见区域适配下的离线对照；前四组使用落脚线，后两组居中。不是引擎截图。
- assets-01～10.png：完整PNG接触表，已逐张查看；不代表在所有设备上的实屏表现。
- checks.json：202项必要检查；严格类型、42表和37Prefab门禁另列。少量失败的旧测试预期已改为读取当前关数／挑战数量，保留真实检查输出。
- preservation.json：42表原有字段、PNG／meta／字体保持；本轮新增UI元数据及图片子层记录，并更新版本。
- build-preview.json／http-checks.json：Web Finished（Creator退出36）、1051文件、42CSV、15HTTP资源核对；备份在本机G:/gptwork/ui-fidelity-20261023/previous-preview。
- research.json：已查阅仓库、实际使用依赖和许可。本轮没有安装Figma导入器或自动操作浏览器。

浏览器URL安全策略阻止自动访问本地游戏，未绕过。因此不存在本轮真实引擎截图、手机验收或全部UI已1:1完成的证据。像素差分比例不是还原评分；当前画面不会自动覆盖正确基线。完整说明见[方案](../../UI_FIDELITY_PIPELINE.md)。
