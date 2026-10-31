# UI经验落地证据

2026-10-31。打开[index.html](index.html)查看原尺寸组件校样及前后对照。

- 校样不是引擎截图；使用Prefab/PNG/字体与隔离状态，不能作为真实渲染、手机或用户审美通过。
- 字形报告是Pillow字宽和原表行框测量，自动增高详情和固定隐藏模板不判固定高度越界。
- 回归原始结果见checks.json；字体报告见font-report.json；39份业务CSV保持，详见review.json。
- 最终预览/生产Web Finished、退出36（既有诊断保留）；包体哈希及1051文件见production-package.json，试玩复制见preview-package.json，15HTTP签名见http-checks.json。
- TapTap尚未登录完成，未上传/提审/上线，实际状态见../../TAPTAP_SELFTEST_1260.md。包体生成不等于平台或实机通过。
