# 1.15.0 数值难度验证

本机G:/DEMO001，2026-10-17，基线11609a0，分支codex/pc-a/challenge-difficulty。范围与测试局限见[设计记录](../../CHALLENGE_DIFFICULTY.md)。

|文件|用途|
|---|---|
|scope-checks.json|移动、科技、店员、怪物、流量、经营相关源码／配置不变；Wave仅挑战普通HP变化|
|config-changes.json|三张原始XLSX最终变化，90个HP、12个精英参数、1个版本值|
|tuning-candidates.json|A／B／C／D与最后版本的完整数值假设|
|baseline.json|1.14.0入口守军和群攻阵容对照|
|baseline-core.json|历史配置、同一默认阵容核心优先，六关均胜|
|candidate-a-results.json、candidate-b-results.json|过难方案及回调过程，不是最终数据|
|candidate-c-results.json、candidate-d-results.json|分地图调参中的胜负均保留；最后版本24不使用其中旧HP|
|negative-results.json|最终21／26不升级、不选额外科技及入口半图，6例失败|
|occupancy-results.json|六专题八成／半图；24为最后加压前，半图曾胜，故再次调整|
|money-results.json|最后24：半图败、八成／全图核心胜、全图原策略败|
|final-balance.json|最后24加压前的六个可行样本；五个其他专题配置保持，24须用money-results替换|
|validation-summary.json|最终六挑战样本的明确来源、半图6败、附加6败与60帧结果|
|playthrough-results.json|20冒险＋6挑战通过，24为最后加压前，最终24单独复验|
|fps-results.json|21／22／25／26同方案60帧：3胜1败，保留22失败|
|automated-checks.json|候选C的209项回归原输出，之后只有三地图普通HP曲线继续修订|
|final-checks.json|最终配置／Prefab／类型门禁和调试／正式Web产物39CSV一致，退出36保留|
|preview-info.json、http-checks.json|原包完整备份，同源更新1.15.0，924文件／17项HTTP匹配|
|browser-check.json|当前浏览器尝试被工具中止；没有本轮实际游戏画面或真人试玩结论|

复验默认：`node tools/gameplay/test-challenge-balance.cjs <TypeScript目录> <输出JSON>`，使用已入库的challenge-validation-plan.json可行样本。`test-playthrough.cjs`也使用该方案，只影响挑战测试选择，冒险策略保持。默认样本已用于调参，不是独立盲测；不能用其胜率证明难度定稿。

额外方案作第四参数，可用报告中的`input`；`configRef: "11609a0"`只读加载历史配置，`mode: entry`优先入口前35%、`swarm`选群攻分支，`tech: build`优先专属、`strong`为旧通用优先、`none`跳过额外科技。支持seed、cap、roster、upgrades和delta。均不写玩家存档，不启用游戏自动操作。所有数据为无渲染逻辑，不能当成浏览器截图、真人胜率或手机性能。
