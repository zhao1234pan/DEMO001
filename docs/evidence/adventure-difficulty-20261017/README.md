# 1.17.0 难度与补给验证

2026-10-17，本机G:/DEMO001；基线d3b11cb、分支codex/pc-a/adventure-difficulty。见[问题分析与实现](../../BATTLE_PRESSURE_AND_SUPPLY.md)。

|记录|含义|
|---|---|
|scope-checks.json|挑战21616行模板、间隔／首领字段、角色／地图／经营／I18保持；普通教学和第一波保持|
|config-changes.json|四原始XLSX最终逐单元格变化及15波曲线输入|
|baseline-results.json、candidate-a/b/c-results.json|普通20关四策略前后及被退回的调参样本|
|final-adventure-results.json|最终80例；混合20胜、不升级20胜、单一19胜、四塔17胜，不将少塔失败夸大为所有关卡强制升级|
|diagnostic-results.json|旧配置入口核心：前7波入口击败91.6%～100%，另半图／基础阵容对照|
|challenge-b/c/d-results.json|过缓与过强候选；包含第一波直接失败的退回结果|
|challenge-six-e.json|六专题候选，21／22／24成功、23／25／26失败；最终21／22／24配置相同，25／26另修订|
|refine-final-results.json、warehouse-results.json|最终23原阵容种子42／7失败，含减速阵容成功；25／26修订后成功|
|combo-old/final-results.json|fan／spark／mint／frost群攻组合的旧／新对照，种子42均失败；不是用户三张未知科技的精确复刻|
|strong-combo-results.json、mixed-combo-results.json|追加分散32位种子，覆盖S05／E03／S08开局、群攻补远程及先铺场策略；不是只用7／42推断所有组合|
|negative-results.json|21／26入口半图、全图不升级、无后续科技六例全败，保留真实失败波次|
|playthrough-results.json|最终20冒险＋6挑战全部通过；仓库明确使用减速阵容，六挑战3倍速924～934秒，91%～100%塔位|
|automated-checks.json、validation-summary.json|220项回归、严格类型、配置与36Prefab／2610节点门禁；汇总和限制|
|final-checks.json|最终两Web包Finished，退出36原样保留；39CSV和配置／严格类型再次一致|
|preview-info.json、http-checks.json|1.16原包及中间包备份，最终924文件与17项实际HTTP SHA一致，仍使用4344同源服务|
|browser-wave1-turn.png、browser-manual-wave2-loss.png|真实IAB手动局转角与第2波失败截图；不是自动策略截图或后期胜利截图|
|browser-final-supply-guard.png|最终包出战后立即点选择区域仍停留初始补给；随后完整显示后可正常选卡，非波末计时证明|
|visual-boundary.json|真实浏览器与无渲染测试边界；没有手机／后期真实FPS结论|

复验：`node tools/gameplay/test-battle-progression.cjs <TypeScript目录>`；`node tools/gameplay/test-adventure-balance.cjs <TypeScript目录> <输出JSON> [方案JSON]`；`node tools/gameplay/test-playthrough.cjs <TypeScript目录> <输出JSON>`。挑战旧表对照沿用test-challenge-balance.cjs的configRef，仅测试补齐新字段，并显式禁用相邻波插值／普通成长，精英独立基础补旧healthScale。

旧诊断第三项原命名“截图阵容一级半图”后来确认并非截图阵容，只作为另外的四类基础店员对照；原报告保留，不用该标签推断截图角色。用户截图主要是散射／电链／标记；强化数量不等于可识别三张科技。

实际试玩先读取原标签页，没有刷新或改动原战斗；随后切到localhost独立来源，正常点击配队、补给、建造、升级和倍速，未使用广告／道具或运行时改值。首张F05，四塔中散射升2级，第2波失守、击退263，不能视为完整局胜率。转弯两列目视有间距；最终回归仍覆盖六真实路线的身体不互穿。淡入可见，波末误点暴露后增加输入保护并重构建；最终包重新进入，出战后立即点选择区域仍保留弹窗，完整显示后再点可正常选择。没有把初始弹窗的截图当作精确1.8秒时长证明，时长以真实update回归核对。测试页已关闭，原标签页保留。

背景页推进可能受浏览器节流，手动局耗时不用于15分钟指标。原127.0.0.1存档未重置、未手工写余额；初次同源首页按既有经营逻辑自然结算，后续试玩使用独立来源。默认入口请使用127.0.0.1，刷新并重开一局才能加载新参数。
