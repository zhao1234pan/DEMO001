# 挑战竖版强化卡 1.5.1

- 日期：2026-10-03；承接 1.5.0 单关挑战原型。
- 预览：http://127.0.0.1:4330/ 。
- 三张竖卡横排，暗色遮罩覆盖整个游戏画布；候选界面删除“结束本局”，分类标签不再显示。
- 每张卡有独立效果图标。8 张店员专属卡在底部显示“强化 XX”及现有店员头像；其余卡不显示此行。已选强化查看共用同一版式。
- 每次三选一最多一次成功的广告刷新，共十个选卡节点；选择卡片本身仍免费。广告取消、加载失败、模拟回调不扣额度；新节点重置，重复打开本节点不重置。
- 广告请求期间禁止选卡、重复发起和战斗推进。奖励绑定局编号及选卡节点，旧局或销毁后的回调不改新局；后台返回保留现有暂停规则。
- 效果、冒险数值、现有点击空白关闭建造/升级/出售菜单的操作保持。

## 配置与资源

修改原始 ChallengeRule、ChallengePerk、I18、Global、ArtAtlas、ArtFrame 共六张 XLSX，再由项目内导表工具导出 CSV 与 manifest。ChallengeRule.adRefreshPerChoice 替换 freeRefresh，当前为 1；ChallengePerk.iconKey 逐卡关联独立 ArtFrame，重复引用会被导表校验拒绝。分类字段仍用于候选池筛选，不向玩家展示。

固定尺寸与排版保存在 challenge_pick/challenge_card 原生预制体；遮罩尺寸随可见画布适配。没有新增业务数值硬编码或玩家联动提示。

图集：`assets/art/ui/icons/atlas_challenge_perks.png`（1024×2048，4列8行，透明 PNG，32帧），附配套 .meta。使用内置 imagegen 生成，按网格切片、缩放与留边打包，透明 PNG 调色板柔和扁平重绘后压缩为398031字节。美术顺序与 ChallengePerk 的 32 行一一对应；角色底栏复用现有美术。生成指令见下方归档，未使用第三方游戏图片作为运行资源。

## 平台边界

沿用 PlatformService 的激励视频服务。当前只有抖音真实广告适配，广告位配置仍是待替换值；本地网页/其他未接入运行环境返回模拟标记，客户端显示“广告暂不可用”，不会伪造观看成功。真实平台投放前需填写有效广告位并真机验收。此轮没有擅自新增账号、隐私页面或外部服务。

## 检查

- 严格 TypeScript、24 表导出、25 项导表回归、26 项挑战规则通过；包含 70 种阵容 × 32 种种子的十次候选及每轮刷新。
- 实际 GameRoot 广告回调 10 项：成功、取消、失败、模拟、空奖励、异常重试、双击/选卡锁、旧局回调、销毁、切后台。
- 四视口 375×667、390×844、750×1334、1280×720，28 项真实点击与布局检查；全部 32 张效果、8 个专属底栏、无分类与结束按钮、全屏遮罩通过，页面异常 0。
- Web 实际运行两局完整 15 波，十次卡片点击均完成：种子42一倍速504.7秒/8耐久，种子17三倍速227.5秒/10耐久，与原型一致。自动策略不代表真人手感测试。
- Web 调试、Web 正式、抖音构建；正式包7项检查通过，日志见 TESTING.md。未代验真实广告和实体手机。
- 临时证据在 G:/gptwork/challenge-card-refresh，构建在对应 challenge-card-refresh-*-build，不提交。

## 柔和扁平美术修订

用户以实际地图截图补充治愈、偏扁平的要求；本轮32帧重绘及竖卡配色已落实。源图与完整两轮指令见[美术记录](../source_assets/art/production/challenge_perks_soft/README.md)。

## 内置 imagegen 初版生成指令（历史）

Create ONE production-ready 4-column by 8-row sprite atlas containing exactly 32 separate casual tower defense upgrade icons, no words, no numbers, no letters, no logos. Transparent background. Canvas 1024x2048, each cell exactly256x256. Every icon centered in its cell with at least24px transparent margin. Uniform warm hand-painted cartoon mobile-game item icons with bold dark-brown outlines, soft cream highlights, jade green/gold/orange accents, readable silhouette at64pixels. No frames or badges or characters, only objects/effects. Each of the 32 cells must be visually distinct. Row1 left-to-right: three green pea bullets flying parallel; icy delivery cooler with snowflake burst; twin colorful firework rockets; golden telescopic scope with a distant arrow. Row2: looping blue electric bolt around copper coil; orange embers scattering from charcoal; purple stamp passing between two tags; mint-green curved boomerang with wind. Row3: opening green shop door with speed streaks; two adjacent market counters helping with golden linked hands; single sturdy isolated shop counter with a shield; overflowing golden cash register. Row4: neat clipboard checklist with green checkmarks; four colorful employee caps gathered around a shop bell; small emergency cash pouch spilling coins; crescent moon above coins and an upward clock arrow. Row5: new wooden shop counter with a tied gift ribbon; golden evolution star on a reimbursement receipt; broom sweeping wooden crates and coins; glass coin jar with copper coins. Row6: cardboard return parcel on a recycling conveyor belt with looping arrow; tough green reinforced shop curtain with a shield; yellow slow-down speed bump outside a shop door; cash register firing a bright orange projectile. Row7: two wooden shelves tumbling domino-style; lone last customer ticket with spotlight; giant work apron and oversized boots; tiny apron and little boots with quick motion streaks. Row8: opened surprise parcel with colored sparkle items; heavy blue bowling ball striking pins; cardboard parcel falling under a white parachute; pair of bulging trouser pockets full of shiny coins. Maintain exact grid with generous gutters; keep every object fully inside its assigned cell. Transparent negative space throughout. No shadows extending into adjacent cells.
