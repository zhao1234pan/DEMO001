# 三名初始店员分支升级数值设计

- 状态：设计完成，待评审；未实现、未合main
- 机器：pc-a
- 分支：codex/pc-a/branch-upgrade-design
- 开始日期：2026-10-02
- 基线：1.1.0功能分支7f35eb7，main 5509e29；软著标签不变。
- 用户要求：先给分支升级出数值、做完整设计，不急于落地。
- 范围：豆包/棉棉/布丁的三级二选一，独立设计XLSX与文档、公式和场景估算；不实现战斗、不改客户端配置或预览。
- 预计文件：design/proposals/StaffBranchDesign.xlsx、docs/STAFF_BRANCH_DESIGN.md与状态/测试/日志。
- 验收条件：基线可追溯、6分支数值与费用完整、技能边界明确、估算可复核；运行代码和CSV/manifest保持不变。
- 下一步：数值及规则审核后另行实施，不将理论估算称为实战通过。

## 完成记录

- 产出：StaffBranchDesign.xlsx四页设计稿、STAFF_BRANCH_DESIGN.md完整规则，以及状态/测试/更新日志。
- 检查：现行三级21项独立比对、6分支DPS、公式联动、3组场景估算、6张渲染及导出XML检查；运行配置来源哈希一致。
- 基线7f35eb7；任务认领提交a7bcb0b；最终设计提交为本文件最近一次docs提交，可用git log -1 -- docs/worklogs/completed/2026-10-02-pc-a-branch-upgrade-design.md查询。
- 遗留：未实现、未实战平衡；重点验证布丁覆盖收益、深冷团队输出及豆包击杀阈值。
- 下一步：等待设计评审，再另开实现任务；不提前改客户端或预览。
