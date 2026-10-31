# UI经验落地证据

2026-10-31。打开[index.html](index.html)查看原尺寸组件校样及前后对照。

- 校样不是引擎截图；使用Prefab/PNG/字体与隔离状态，不能作为真实渲染、手机或用户审美通过。
- 字形报告是Pillow字宽和原表行框测量，自动增高详情和固定隐藏模板不判固定高度越界。
- 回归原始结果见checks.json；字体报告见font-report.json；39份业务CSV保持，详见review.json。
- Web构建、包体哈希、试玩同步及TapTap实际状态在后续构建/自测记录中补充。
