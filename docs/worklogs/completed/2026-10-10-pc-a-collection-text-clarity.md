# 图鉴滚动与文字清晰度修复

- 状态：实现和自动检查完成，待用户画面验收。
- 机器：pc-a。
- 分支：codex/pc-a/collection-text-clarity。
- 日期：2026-10-10。
- 基线：41e495a，用户手动修改首页和图鉴；确认位置、字体和尺寸保留并回写UiLayout。
- 完成：纵向图鉴、PNG遮罩、三列动态书架、台面与角色姓名牌层级、拖动及裁切命中；运行视图与Label采样比例对齐；首页移除爱心并显示独立局外余额。
- 配置：UiLayout/Global/I18三张原始表、CSV、manifest；28表、33套Prefab、1733节点。版本1.7.4。
- 下一轮：挑战扩为四关与20件商品经营方案已归档CHALLENGE_SHOP_PROPOSAL.md，未提前实施。
- 验证：配置31、资源12、挑战27、图鉴模型13，合计83项；TypeScript及导表门禁通过。调试/正式Web生成，Creator均退出36；入口及关键资源请求200。
- 证据：docs/evidence/collection-text-clarity-1.7.4/checks.json；本地G:/gptwork/collection-text-clarity。
- 提交：认领eff3482；实现提交与本记录一同提交，集成后补充SHA。
- 遗留：浏览器工具策略阻止真实运行截图和点击，本轮不冒充视觉验收；构建日志锁/缓存告警仍在。用户此前授权UI修复后提交main，本轮沿用，不移动软著归档标签，不平台发布。
