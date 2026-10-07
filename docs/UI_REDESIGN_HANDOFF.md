# 1.7.0 UI改版：历史暂停检查点

本文件保留暂停时的状态。用户随后决定远程连接本机继续，当前实现/自动回归已完成，最新结果见[最终记录](UI_REDESIGN_VERIFICATION.md)。以下待续项已按最终记录执行。

历史状态：用户于2026-10-07要求暂停，当前为开发检查点，尚未最终验收。开发分支 codex/pc-a/ui-redesign；main和软著基线未移动。仓库 https://github.com/zhao1234pan/DEMO001 。

## 已保存的实现

- 首页城市便利店、新版战斗HUD、蓝色加载页、设置、各类弹窗与结算统一PNG风格。
- 挑战配队改为八选四直接勾选；三选一保留竖卡、独立图标、专属底栏、每次一次真实广告刷新。
- 图鉴为店员／怪物／商品三个页签，首领在怪物分页；8名店员、16种进化、6小怪和4首领换图，新增9件信息类商品。
- 全部生成源图和十一份原始参考在 source_assets/art/production/ui_redesign_20261007；inputs.json仅使用项目内相对路径。37张新增皮肤、图标、地面，现有资源UUID保留。
- 26张XLSX/CSV，VisualSkin121行、UiPrefab33行，版本暂为1.7.0；Goods新表及校验已加入。
- 未新增体力、局外钱包、外部商城或排行榜。首页两个入口显示暂未开放，顶部显示真实关卡和收录进度。
- 保持战斗算法和空白处关闭升级／出售菜单。

## 验证状态必须区别

较早的v8辅助构建已通过：TypeScript；26项配置、6项资源、26项挑战规则；四视口28项；逐页28项；20关冒险及15波挑战完整通关（10次选卡），页面异常0。

暂停前最后修改为按Prefab坐标居中图鉴残行，以及关卡缩略图使用地面PNG。当前v9 Web调试构建成功、原表/CSV一致性及TypeScript通过，但最后修改后的浏览器复核尚未运行。正式包7项检查、最终抖音/微信构建尚未完成。v8正式Web仅完成构建，不表示正式流程验收。

已发现并修复：启动跨包依赖、九宫边距过大导致边框压缩、遮罩误换面板、旧HUD文字重叠、GM遮挡入口/关闭按钮、商品详情空统计区、设置大空白、图标/长屏背景变形、启动FPS覆盖。加载中销毁和资源引用释放已保护；最早美术包完全加载失败的兜底页面仍需专项复核。

## 云端接续顺序

1. 拉取当前开发分支，先读AGENTS.md、本文件和活动工作记录，不从main误开新分支。
2. 先完成最终Web界面复核，重点是图鉴三页/残行、缩略图、设置开关、加载重试/销毁、挑战配队/竖卡，以及空白关闭菜单。
3. 运行配置/资源/挑战检查，再构建正式Web验证GM隐藏与实际解锁；完成抖音和微信正式构建。平台真机和真实广告仍单列待验。
4. 完善美术生成指令归档、正式验收截图与记录；更新状态、测试、日志，将活动工作记录移到completed，推送开发分支。用户验收后再处理main。

## 工具和环境

原Windows工程 G:/DEMO001；本机辅助日志、QA脚本和构建在 G:/gptwork/ui-redesign，不是其他电脑可用路径。旧本地预览链接不能跨电脑访问，云端需自行构建/启动预览。

Cocos Creator3.8.8；作者工具需Node18+和Sharp；挑战/地图测试需TypeScript模块路径。配置导表与预制体检查工具已在仓库。配置测试可通过CONFIG_WORK_DIR指定云端可写临时目录。Cloud若没有Creator，先做可执行的代码/配置检查，将原生构建明确记为待验，不能以静态检查冒充完成。

运行命令：node tools/config/export.cjs --check；node tools/config/test.cjs；node tools/art/test-resources.cjs；node tools/gameplay/test-challenge.cjs <typescript模块路径>。作者工具tools/art/import-redesign.cjs与tools/ui/apply-redesign.cjs会覆盖当前美术／布局，正常构建不要自动执行它们；重新执行布局工具后需node tools/config/export.cjs同步文字预览。

阶段证据JSON与部分v8截图在docs/verification/ui-redesign-checkpoint，不能标成v9最终截图。新生成图片使用内置imagegen，未使用API/CLI替代；图集分组已准备，尚未测量本轮性能收益。
