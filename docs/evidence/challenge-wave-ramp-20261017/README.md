# 1.16.0 波内成长验证

2026-10-17，本机G:/DEMO001，基线3990dac，分支codex/pc-a/challenge-wave-ramp。详见[实现与边界](../../CHALLENGE_WAVE_RAMP.md)。

|记录|内容|
|---|---|
|scope-checks.json|原有分流、怪物／店员／技能、波基础数值、出怪、冒险和I18逐项保持|
|config-changes.json|最终两个原始XLSX：两个新字段、六行数值及版本|
|candidate-a-results.json|同策略六专题固定强度与统一55%成长12例，含22／23失败|
|22-results.json|八成原方案失败，全图种子7成功，另较缓成长对照|
|23-results.json|统一／较缓成长、阵容／种子的失败样本|
|23-refine-results.json|20%默认阵容成功、55%不同曲线与减速阵容胜负；最终采用20%|
|hold-results.json|只在每波前34%投资，固定强度耐久10、成长耐久7，两者均胜|
|phase-ratios.json|最终六可行样本90波前／中／后平均出生倍率严格递增|
|validation-summary.json|原始样本来源、90波检查、压力示例与212项汇总|
|playthrough-results.json|最终实际配置重新运行20冒险＋6挑战，全部通过|
|automated-checks.json|212回归和类型／导表原输出，最终23参数之后另验配置与构建|
|final-checks.json|最终严格类型、39表／36Prefab及两Web产物39CSV一致，Finished、退出36|
|preview-info.json、http-checks.json|完整旧包备份，924文件匹配、17项实际HTTP一致，1.16.0同源更新|
|visual-boundary.json|本轮无新实际画面／手机性能结果，未将无渲染逻辑当作真人试玩|

`node tools/gameplay/test-challenge-balance.cjs <TypeScript目录> <输出JSON> [方案JSON]`可复验。默认使用已入库可行方案，22已改全图种子7；方案支持`phaseGrowth`／`phasePower`覆盖测试数值、`holdAfterProgress`限制每波投资窗口。`configRef`读历史提交时，旧表缺少新字段只在测试补growth=0和power=1.5，显式禁用新机制。所有输入仅在隔离测试使用，不进入客户端或玩家存档。

`phaseSections`键0／1／2分别表示本波前／中／后三分之一，0号波是准备期。出生统计与击败时刻统计分开，场上数量／剩余HP每半真实秒采样，可能包含上一波残留；首领不获得出生曲线倍率。四类数据不能混用成严格胜率或真实渲染性能结论。
