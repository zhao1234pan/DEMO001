# 1.7.2 全界面参考图复盘与独立PNG修订

- 完成日期：2026-10-08。基于 main a14ed48，开发分支 codex/pc-a/ui-reference-restoration，承接认领 e85b4c0。用户授权修复后直接提交 main；软著标签保持。
- 保留玩法、数值、存档、广告成功判定和点击空白关闭升级/出售菜单。首页计数与关卡阵容展示真实状态，不照抄参考图里的示例数字。

## 改动清单

| 页面/资源 | 本轮处理 | 证据 |
| --- | --- | --- |
| 加载 | 专用蓝边底槽、黄色斜纹填充、移动爪端头、白字蓝描边与两侧爪图标；保持真实进度，补齐加载失败重试 | [13%](evidence/ui-reference-1.7.2/loading-13.png)、[50%](evidence/ui-reference-1.7.2/loading-50.png) |
| 首页 | 柠檬黄/草绿专用按钮，标题和说明留在按钮内；顶部白底蓝边计数框、数字、心形/金币图标、底部入口与文本重排 | [首页](evidence/ui-reference-1.7.2/ui-home.png) |
| 冒险选关 | 薄橙边奶油面板；地图/塔位共同等比适配缩略图内框，缩略图不再盖住卡片边框；统一字号、颜色与间距 | [选关](evidence/ui-reference-1.7.2/ui-levels.png) |
| 冒险/挑战配队 | 共用两行四列头像勾选界面，PNG圆形模板裁切头像、立绘源文件完整保留；短名单收紧面板并居中残行；淡绿默认阵容与金色确认按钮 | [早期3人](evidence/ui-reference-1.7.2/preparation-level-4.png)、[八选四](evidence/ui-reference-1.7.2/loadout-375x667.png) |
| 夜班补给/已选强化 | 竖卡遮罩、横幅、淡绿标题、圆形图标底、棕色描述、角色专属底栏、绿按钮；描述与图标留出间距，每次选择广告刷新规则保留 | [竖卡](evidence/ui-reference-1.7.2/portrait-375x667.png)、[长屏](evidence/ui-reference-1.7.2/portrait-390x844.png) |
| 三类图鉴/详情 | 连续书架、统一名称牌、薄边面板、字体和层级；检查6小怪/4首领/8店员/16进化/9商品与未解锁剪影；详情按真实内容排列 | [店员](evidence/ui-reference-1.7.2/ui-collection-staff.png)、[首领详情](evidence/ui-reference-1.7.2/ui-detail-boss.png) |
| 战斗/HUD/建造/进化/预告 | 白底绿边计数框，图标保持比例；道具白字棕色描边、薄边菜单与进化卡、预告文字边界；保留操作热区与空白关闭 | [预告](evidence/ui-reference-1.7.2/ui-wave-preview.png)、[进化](evidence/ui-reference-1.7.2/ui-evolution-menu.png) |
| 设置/通知/暂停/失败/重试/胜利/GM | 逐页复核字体、边框、按钮、内容层，移除旧结算装饰残留；正式包继续屏蔽GM | [设置](evidence/ui-reference-1.7.2/ui-settings.png)、[胜利](evidence/ui-reference-1.7.2/ui-win.png) |

## 单张PNG与配置

- 运行资源全部独立PNG，角色同槽位256×256透明画布；全部83张ArtFrame逐张拼图复核，[完整性检查](evidence/ui-reference-1.7.2/all-characters.png)。完整PNG保留原UUID与meta，头像圆形裁切仅发生在展示模板内。
- 当前制作输入改为 source_assets/art/production/ui_individual_20261007 的独立PNG；133条ArtCut使用明确完整单图区域，原始多资源大图仅历史归档。本轮两张补充按钮/计数皮肤分别单独生成，真实提示词见 generation.json。加载与首页资源在用户提出单图意见前生成于历史sheet，已转为独立作者PNG；不把它们伪称单独生成。
- 15组AutoAtlas配置及meta完整归档至 source_assets/art/archive/auto_atlas_20261007；运行assets无.pac，不再做自动图集打包。packable仍保留true，使用导入SpriteFrame。未宣称Draw Call或帧率改善。
- ArtFrame只保留id、battle/menu/ui/scenery、assetPath、canvasWidth、canvasHeight。ArtAtlas退出27张运行表；旧XLSX转入 design/archive/ui-atlas-20261007。
- UiLayout.xlsx新增1759个节点的坐标、尺寸、比例、字体、字色、描边、对齐、可见和皮肤引用；XLSX→CSV→原生Prefab编译。构建同时检查CSV、源PNG签名、meta、布局过期和漏配节点，不能只手改Prefab。技术例外是节点绑定路径、Sprite类型、遮罩协议与基于配置几何的排列算法。

## 跑测结果

- TypeScript无错误；27张XLSX/CSV一致，33套预制体、1759节点门禁通过。27项配置回归、12项资源回归、26项挑战规则通过。
- 28项逐页/真实点击检查；4种视口375×667、390×844、750×1334、1280×720共28项挑战检查（全部32张卡，8张角色专属，最低实际描述字号>=12）。
- 第4至21关18套配队布局与0/13/50/100%加载组件共22项补充检查通过。
- 完整Web冒险20关及挑战15波/十次选卡通关；页面错误0、运行场景Graphics=0，所有显示Sprite都有资源。模拟采用固定自动策略与加速步进，是回归证据，不等于真人平衡结论。
- 四项启动故障/重试/销毁检查，以及正式包七项GM屏蔽、首领、进化、终章、配队、预告与挑战检查通过。
- Web调试/正式、抖音、微信构建均产出新版资源并记录Finished，正式Web实际运行通过。Creator进程退出36，日志同时包含工程日志EPERM、缓存锁、编辑器OTA_VERSION_CONFLICT和构建子进程SIGTERM；尚未确定退出36的唯一原因，详细构建日志保留在 G:/gptwork/ui-reference-restoration；不能把退出码称为0。实体手机和平台真实广告未验证，未平台发布。

## 本轮查到的额外问题

- 短名单自适应初稿使用Map迭代器展开，Cocos转换后产生Infinity坐标；四屏真实点击测试发现后改用Array.from，并验证全部配队节点有限。
- 加载标题左右爪共用PNG；故障测试改用明确外部持有引用检测，区分引擎加载临时引用和本批持有，确保失败归还及外部引用保留。

所有有参考的页面按效果图检查；未提供对应效果图的弹窗沿用同一奶油/橙边/棕字/绿按钮风格。保留参考与逐页证据供用户对照，本轮不声称逐像素完全相同。

- 主干集成：2026-10-08已快进合入main并推送GitHub；游戏实现2951b224379a82463f2514cef4c580b7ca606c95，本地main和远端main/任务分支已核对一致。预览http://127.0.0.1:4344/；后续此记录归档提交仅更新文档。
