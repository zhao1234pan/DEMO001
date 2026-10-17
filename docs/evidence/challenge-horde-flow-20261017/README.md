# 1.14.0 挑战怪群与构筑验证

日期2026-10-17，本机G:/DEMO001，基线e9e4018，任务分支codex/pc-a/challenge-horde-flow。设计、数值和测试局限见[实现记录](../../CHALLENGE_HORDE_FLOW.md)。

|记录|含义|
|---|---|
|config-changes.json|7张原始XLSX的改动字段、计数、样本与源文件SHA；不是完整十万单元格差异|
|adventure-scope.json|20冒险Level、83Wave、353WaveGroup及全部原Enemy字段逐项保持|
|body-fit.json|10张独立PNG透明内容、动画尺度与身体安全框计算，非截图|
|card-fit.json|五段文本字体度量换行估计，非Cocos渲染|
|automated-checks.json|209项回归、类型和导表等检查原输出|
|final-full-results.json|最终六专题种子42全图上限、1/30步进的实际GameRoot逻辑|
|negative-final-all.json|4专题×半图／不升级／无额外科技，12例均失败|
|fps-results.json|21／22／26、种子42和7，均1/60步进；含急件种子7失败|
|expert-results.json|同急件种子7、1/60步进，专属核心优先成功；不掩盖原失败|
|default-balance.json|可直接运行的当前默认六专题策略与断言复验|
|playthrough-final.json|隔离存档20冒险＋6挑战逻辑自动策略通过|
|matrix-checks.json|最终原始报告的汇总断言|
|final-checks.json|39表、36Prefab、严格TypeScript及两Web产物CSV／调试标记核对|
|preview-info.json|924文件SHA一致、旧包完整备份、同源更新说明|
|http-checks.json|4344实际返回的17项入口／启动／配置资源SHA与最终包一致|
|browser-check.json|工具无法可靠识别网址，已中止UI，无实际截图或控制台验收|

逻辑报告中的秒数按3倍速推进，不含渲染、思考、广告和暂停。最小身体间距在长局中每半真实秒采样；另有逐步检查的六路线混合体型测试。自动策略和透明PNG边界计算不代表真人难度、手机性能或视觉还原通过。两包Finished但Creator退出36诊断保留；本轮没有实际FPS测量。

复验：`node tools/gameplay/test-crowd-flow.cjs <TypeScript目录>`运行15项占位／阶段／专属测试；`node tools/gameplay/test-challenge-balance.cjs <TypeScript目录> <输出JSON> [方案JSON]`默认六专题全图上限策略。负面对照、60帧和专属优先方案可使用对应报告的`input`内容；`tech: strong`为原固定优先级，`tech: build`为专属核心优先，`none`跳过额外补给但保留初始专题规则。它们均为测试工具，不修改玩家存档。
