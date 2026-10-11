# 商店表现细化与整轮回归

- 状态：实现和验证完成，待用户验收；机器pc-a；分支codex/pc-a/shop-presentation。
- 基于六专题c93004a；认领aecfec2。实现62bd157已推送并核对远端SHA一致；本提交补充最终试玩证据。
- 入口/袋子/补货筐独立PNG；顾客拿货与平滑排队、店员搬货、收银进度与成交飞币；配置先行，六张XLSX与CSV/manifest、Prefab、字体和meta同步。
- 修复填充锚点、重开离店路径、补货遮字、离线提示覆盖、成交文字进入钱包区域；ShopSimulation/ShopService和home.prefab与c93004a无差异。
- 133回归、类型与35表/35Prefab/2035节点门禁通过；实际GameRoot逻辑26关均胜利、挑战十选完整。真实四视口和正式主要流程检查通过，控制台error0；不是全阵容或26关触屏实玩证明。
- Web两包Finished但Creator退出36，本机旧诊断保留；真机、真实广告、性能与真人平衡未代验。详情见[本轮记录](../../SHOP_PRESENTATION.md)与[证据](../../evidence/shop-presentation-1.9.1/README.md)。
- 4344同源试玩切本轮产物，保留用户进度；任务分支推送，main仍e445a9b。后续先验收商店表现及六专题，再决定是否合main，软著归档不移动。
