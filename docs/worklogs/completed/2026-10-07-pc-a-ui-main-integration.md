# 新版UI合入主干

- 状态：本地快进合并完成，远端推送与SHA核对为本次收尾步骤。
- 机器：pc-a；日期2026-10-07；集成分支main。
- 用户授权：明确要求直接合并main，合并后再验收；本轮顺序覆盖规范默认的验收后合并，不作为普遍放宽。
- 原主干：5509e29；源分支codex/pc-a/ui-redesign，源提交e5d9406fe6ed73c3480e8a80f7c4b4802c1cabf7。
- 开始检查：工作树干净、活动任务为空；远端与本地main、源分支各自一致，原主干为源提交祖先。
- 合并：git merge --ff-only，36个既有提交快进到main，无冲突、无重写或强推；没有删除其他分支。
- 验证：assets/design/tools/extensions/settings/package.json与源提交无差异；沿用已记录的v11完整跑测与四目标构建，本轮仅更新文档，另复核26表/33Prefab导出一致性。
- 软著标签：copyright-v1.0.0与copyright-v1.0.1保持原引用，未移动归档。
- 同批文档：PROJECT_STATUS、TESTING、CHANGELOG、UI_REDESIGN_VERIFICATION及完成记录改为主干待试玩状态。
- 提交：本记录所在提交（docs: 记录新版UI合入主干并等待试玩）；远端同步以本次git ls-remote origin refs/heads/main与HEAD相等为准。
- 下一步：用户在main验收新版UI；修复具体反馈。真机、真实广告及本轮性能对比仍待验证，没有平台发布。
