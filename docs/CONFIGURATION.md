# XLSX → 客户端 CSV 配置规范

## 当前1.7.0 UI配置（2026-10-07）

当前26张原始表，VisualSkin121项、ArtFrame83项、UiPrefab33套。新增Goods.xlsx九条，字段id/key/nameKey/imageKey/categoryKey/descriptionKey/storyKey/unlockLevel；所有文案引用I18，图标引用VisualSkin，unlockLevel关联冒险进度。商品仅图鉴信息，不产生经济效果；跨表校验缺失引用与非法解锁关。

本轮更新Global/I18/Theme/Collection/UiPrefab/VisualSkin；玩法数值表和关卡路线坐标未改。Global.version与package版本1.7.0，battleGroundSkin引用新地面；Theme控制地图配色并重新离线烘焙。配置修改仍先XLSX、导出和校验。

启动技术例外：业务表全部加载前，loading.prefab的Label预览由导表工具从I18编译，加载失败文案也来自同一原表；不在代码写用户提示。LoadingView只提前读取VisualSkin CSV绑定加载页PNG，不安装半套业务表；初始美术不可用时保留Label兜底。UI固定尺寸/颜色/锚点为Prefab美术数据，残行居中/等比缩放是几何算法。DEBUG和资源包名为技术协议。

## 1.6.0资源规范（2026-10-04）

界面、地图、弹道与状态显示统一采用可替换PNG和原生SpriteFrame。拉伸皮肤设置九宫；固定比例图标不任意拉伸。禁止新增Graphics/运行时Canvas资源绘制和手工关闭packable。分类、源文件、原始表、换图与图集流程见[PNG资源工作流](PNG_RESOURCE_WORKFLOW.md)。下文旧版本的矢量绘制方案仅为历史记录，当前实现以本条为准。

## 1.3.0 配队与预告配置

当前22张表。新增LevelLoadout.xlsx（21条），字段id/levelId/enabled/slots/candidateStaff/defaultStaff；候选与默认均引用Staff.key。Level原表移除availableTowers，默认阵容唯一来源改为LevelLoadout。Staff增加unlockLevel、roleKey、displayOrder；CollectionProgress按明确解锁关管理店员，不按候选池反推。

Global版本1.3.0，I18新增27条，UiPrefab新增loadout、loadout_card、wave_preview、enemy_preview_card，共28个Prefab。预告聚合真实WaveConfig.enemies，不新增手写预告数据副本。原始表先完成，再接CSV读取逻辑。

新增门禁和技术例外、存档协议见[完整说明](LOADOUT_WAVE_PREVIEW.md)。导表兼容整列为空的尾部记录，仍拒绝内部空表头和无表头但有数据的列。新成员或新关卡须同步Staff/LevelLoadout，原表导出后运行config:test，禁止只改CSV。

## 1.2.0 整体复盘修订

本轮原始XLSX、客户端CSV、manifest、资源和Prefab均无数据变化，21表一致性通过。灼烧/减速取值仍来自Staff/Global/StaffBranch；修复到期清理及刷新算法。连发清理属于生命周期，偏好重试属于存储协议，结算动态高度取Label测量和Prefab初始锚点。未新增硬编码玩法参数或文本，未绕过导表改CSV。

## 1.2.0 进化配置

目前共21张运行表。新增StaffBranch.xlsx与StaffForm.xlsx，各6条。StaffBranch维护最终战斗数值、费用、源/目标等级、弹道协议键及formKey；StaffForm维护分支归属、战斗/画像ArtFrame键、故事/特点/代价I18键、角色内排序及主体设计宽度。完整字段和语义见STAFF_BRANCH_DESIGN.md第7节。

三级分支值为最终值，不再乘Global等级系数。Global新增branchUnlockProgress=1与branchAdventureStartLevel=1；I18新文本统一{p0}格式。已支持的解锁事件只有“正常战斗进化成功”，由业务协议固定；没有虚设运行时可配置但代码不消费的unlockEvent字段。

跨表校验双向归属、每位参与店员两条路线、排序唯一、费用正整数、最后连发早于下一轮、减速比例与时长组合、资源及所有文案。进化卡/图鉴的Icon和Base1/Base2节点加入构建门禁。配置修改必须经config:export，不能只手改CSV。

本次允许的技术常量：进化存档键前缀、基础形态选择枚举、菜单边界间距和布局翻转；为持久化协议与UI几何算法。卡片尺寸和排版保存在原生Prefab，玩法值与图像宽度走表。设计稿中的assetStatus只用于制作记录，不导入运行时。默认不生成服务端配置。

## 1.1.0 战斗表现配置

Global新增6个反馈参数，具体字段见BATTLE_EXPERIENCE.md。配置校验约束时长、形变幅度和整数并发上限；禁止0时长和超额对象分配。I18负责首领、结算及解锁文本；头像仍读取原ArtFrame。首领类型、伤害及店员机制不另设副本。

本轮新增例外仅为动态命中图形的射线数量、半径插值和连锁折线几何，属于渲染算法；固定结算/BOSS区域的布局和颜色在原生Prefab。没有新玩法硬编码数值。


## 2026-10-02 Map网格字段

Map.gridSize为格距，gridOriginX/Y为格位网格原点；当前21图统一50、45、135。Spot横纵坐标必须是原点加格距的整数倍，每格必须有一个横向或纵向相邻格。地台连接通过LevelConfig.gridSize读取相同参数，禁止自由挪半格补数量。三个字段必须在原始Map.xlsx编辑再导出。

本轮Spot454行、Obstacle209行、Decoration63行；其他表行数保持。19表及manifest同步。逐图设计和验收见MAP_GRID；该条覆盖上一轮120夹层与自由坐标说明。


## 2026-10-01 本轮变更与例外

MapPoint/Spot/Obstacle/Decoration/I18原始表导出同步；现19表，Spot458条（含挑战22），Obstacle209条，Decoration63条，I18 304条。运行时无程序随机生成地图，所有审定坐标写在原始表。

建造卡尺寸仍属Prefab，菜单4列上限、6像素间隔及边缘翻转属于布局几何常量，不是玩法数值；存储键、初始关1、完成标志0/1、DEBUG门禁属于持久化协议。其余新增文案读取I18。重置遍历Tutorial/Enemy实际配置，无硬编码角色或引导清单。


适用0.7.0；本项目和后续新项目都先设计表格，再实现消费配置的代码。原始表是唯一编辑来源，禁止直接改CSV作为正式修复。新增功能的数值、文本、属性、资源引用和解锁条件均遵循本流程；不默认输出服务端配置。

## 目录与日常操作

- design/tables：26张原始XLSX，均为可直接编辑的独立工作簿。
- tools/config：项目自带JAR、客户端Java入口、字段协议和校验器；不依赖参考项目仍存在。
- assets/resources/config：运行时CSV及manifest.json，Cocos按TextAsset加载。
- assets/scripts/config：CSV解析、跨表校验和启动加载；业务模块在配置全部就绪后初始化。
- extensions/config-table-check：Creator全平台构建前调用config:check，失败中止构建。

日常步骤：编辑XLSX并保存 → 在项目根目录执行 npm run config:export（或双击 tools/config/导出客户端配置.bat）→ npm run config:check → 构建与玩法验证 → 同次提交XLSX、CSV、manifest和新增资源.meta。不要用旧的生成脚本覆盖策划后来手改的表。

导表需要Node.js和JDK21。java从JAVA_HOME/bin或PATH查找；node须在PATH。工具所有输入/输出由项目根目录推导。日志和隔离暂存默认在仓库所在盘的gptwork/config-export，CONFIG_WORK_DIR可覆盖。没有Java、校验器未更新或表格不合法时，不覆盖现有CSV；错误会给出对应表或日志位置。

Creator启动时加载项目构建扩展；GUI已打开的工程在新增扩展后须刷新/启用“config-table-check”或重新启动。CLI实际三目标构建会输出“[config-table-check] …张表校验通过”。不要禁用扩展绕过过期配置。

## 表格与关系

下表为0.7.0初始行数快照，新增表和后续变更以本文最新版本节及manifest为准。

| 工作簿 | 本版行数 | 内容与引用 |
| --- | ---: | --- |
| Global | 29 | 全局经济、升级、道具、音乐、版本、最大关卡；value由type解释 |
| I18 | 279 | 简体中文文本，key稳定，支持{p0}等格式参数 |
| Staff | 8 | 店员基础数值、技能参数、弹道样式/速度、尺寸，name指I18 |
| Enemy | 10 | 6小怪和4BOSS；耐久、移速、奖励、漏怪扣血、清场系数 |
| Theme | 4 | 地图主题名称与配色 |
| Map | 21 | 地图ID与Theme.key |
| MapPoint | 180 | mapId、路径顺序、坐标 |
| Spot | 462 | mapId、从0开始的塔位索引、坐标 |
| Obstacle | 210 | mapId、塔位索引、障碍类型、耐久、奖励 |
| Level | 21 | mapId、初始资源、敌人倍率、可用店员列表、标题与目标文本 |
| Wave | 104 | levelId、波次顺序、间隔及本波血量倍率（不改变基础移速） |
| WaveGroup | 420 | waveId、出怪组顺序、Enemy.key与数量 |
| Collection | 18 | 三类档案、角色键、故事I18、解锁提示、图片引用 |
| Audio | 12 | BGM/音效路径、播放节流间隔 |
| Decoration | 64 | mapId、装饰类别、坐标、尺寸与组号 |
| ArtAtlas | 7 | 图集逻辑键、Bundle内路径与尺寸 |
| ArtFrame | 35 | atlas键、切片坐标及尺寸 |
| UiPrefab | 22 | 稳定 UI 键、resources 下的原生预制体路径（不含扩展名） |

当前LevelLoadout.candidateStaff/defaultStaff用竖线分隔Staff.key；Level不再保存availableTowers列。Level→Map→MapPoint/Spot/Obstacle/Decoration；Wave→Level，WaveGroup→Wave及Enemy。I18、ArtAtlas、ArtFrame等均使用稳定key，不把表格行号当业务ID。删除或改key时必须同步所有引用。

## 原始表格式

每张工作簿只有一个配置页；前5行为：字段说明、client、int/float/string、中文字段名、英文字段名。第6行开始为数据。首列id为正整数且表内唯一；同表key也须唯一。首5行冻结，字段说明、类型与字段名各有固定含义，不在数据区混写备注。Global提供note列。

CSV采用UTF-8、LF及标准双引号转义；文本可包含逗号、引号和换行，不用手工拆字符串。导出支持普通单元格和POI可计算的公式；公式错误立即失败。XLSX和JAR按二进制进Git，CSV/校验脚本统一LF，避免Windows换行使manifest变化。

## 新增字段或新功能

1. 先确定字段所有者、单位、类型、默认策划值、合法范围和引用对象；先改XLSX，不在代码写临时业务默认值。
2. 修改tools/config/schema.json字段协议；增加表时同步ConfigTables.TABLE_NAMES和跨表校验。schema只定义协议，不存放另一份游戏数据。
3. 业务代码通过配置访问器取值；新增界面文本先进入I18，新增图片/音频路径进入对应资源表。
4. 修改ConfigTables.ts后运行 node tools/config/regenerate-validator.cjs <TypeScript模块目录>，提交生成的validator.cjs和validator-source.sha256；导表与游戏共用同一校验逻辑。
5. 导出并通过 npm run config:test、config:check 和针对功能的验证。新CSV与资源由Creator导入并成对提交.meta。manifest记录所有工作簿和CSV的SHA256，新增表不可只提交CSV。

当前校验包括字段/类型、重复ID或key、必填表、引用、参数范围、关卡连续、路径与塔位、障碍位置、波次顺序、店员弹道、图鉴、图集切片边界和文件存在性；无效数据不发布到运行内存。启动加载失败显示重试，不静默退回一份旧硬编码数据。尚不提供局中热重载或远端配置服务。

## 代码例外及理由

- 算法结构、枚举分派和协议字段名保留在代码：例如实现减速/穿透/连锁的执行顺序、存档键、CSV解析器及Cocos API。
- 750×1334设计尺寸、390逻辑宽、向量和碰撞公式、输入热区及UI几何/线宽等保留为引擎表现常量；改变它们涉及场景坐标与适配，不能作为独立策划数值随意调整。固定UI颜色、字体、布局现已存入原生Prefab，供Creator直接编辑；它们属于引擎美术资产，不在XLSX复制第二套节点坐标。UiPrefab.xlsx管理资源引用，I18与ArtAtlas/ArtFrame仍是文字和图片来源，运行状态不从Prefab内的预览文本读取业务参数。动态战场几何继续由原算法绘制。
- 配置尚未加载时的“加载中…”和失败重试提示保留为最小启动文案，否则I18自身无法加载时无从报错。开发日志和导表错误面向开发者，不进入游戏I18。
- settings/builds及.meta、扩展package.json属于引擎构建协议，仍用引擎要求的JSON。schema/manifest为工具协议和自动清单，不与策划数据并列维护。

任何新增例外须在本节记录具体原因；业务数值不能以“默认值”“临时参数”名义绕过表格。

## 工具来源与移植

vendor/zz-excel2csv.jar复制自用户指定biu_design导表工具，复用其Apache POI解析能力和五行表头规范。仅移除原JAR Manifest中Windows无效的Class-Path，不改类文件。ClientExport.java为本项目客户端适配入口，不调用原工具的服务端/JSON/TS导出主函数。原项目未修改，未复制JDK安装包或服务端输出。

新项目复用步骤见 tools/config/NEW_PROJECT.md。构建钩子采用[Cocos Creator官方构建扩展接口](https://docs.cocos.com/creator/3.8/manual/zh/editor/publish/custom-build-plugin.html)；美术分包采用[官方本地小游戏分包机制](https://docs.cocos.com/creator/3.8/manual/zh/editor/publish/subpackage.html)，无需资源服务器。

## UI 资源门禁

UiPrefab是第18张表。config:export同步Prefab内I18预览与ArtFrame切片预览，只更新这些绑定，不改变手工布局。config:check以及所有Creator构建同时检查22个资源、meta、节点引用、必需绑定路径、I18与图片预览是否过期。缺少节点/资源或者未导出的原始表均阻止构建；校验器不自动补造页面。详见UI_PREFABS.md。

## 0.8.0新增字段与约束

- Level.mode（string）：adventure计入连续1～maxLevels的冒险进度，challenge使用独立ID；当前挑战21，冒险上限仍20。Global.challengeLevelId指向挑战模式关卡，禁止用Level总行数作为最高解锁关。
- Wave.healthScale（float，>0）：本波血量倍率；实际HP由Enemy.hp×Level.enemyHealthScale×Wave.healthScale×逐波增长计算。Level.enemySpeedScale保留旧字段协议但校验必须1，客户端基础速度直接读取Enemy.speed；技能与全局倍速仍生效。
- Global.freePropCount允许非负整数0；正式道具每种每局一次成功广告为生命周期规则，未增加第二份可调次数。Level/Wave等模式及I18先写原始表，再扩展schema和读取器。
- 店员属性级别1/2/3是当前三档UI协议；数值与费用公式读取Staff/Global。气泡避让、同类按钮尺寸和文本小数显示属于既有引擎表现例外，新增几何仅在Prefab/布局算法，业务文案从I18读取。

## 0.8.1 点击与地图修复

- Global.touchTravelTolerance（float）：按390宽战斗逻辑坐标衡量的触点移动容错，当前20；统一在触摸开始、移动与结束时转换坐标，避免随屏幕缩放改变容错。
- I18.ui.GameMenuView.017为“共{p0}波”；MapPoint与Spot原始表管理本轮居中修正。配置变更清单见OPTIMIZATION_V2。
- 菜单避让的矩形间隔、屏幕边界、50逻辑像素最小格位命中及64×64建造卡为既有UI几何例外；固定控件外观在原生Prefab，未复制新业务参数到代码。广告count/isEnded及并发结算属于平台协议与算法，仍位于平台适配层。

- GM图鉴预览：I18新增ui.gm.*五键；固定布局使用gm.prefab。命令ID/集合操作/DEBUG属于技术协议与算法例外，临时展示不新增玩家存储键。

## 前三关引导配置

新增Tutorial为第19张表，6条动作配置；字段、完成规则、持久化与验证见TUTORIAL.md。I18和UiPrefab同步，23个预制体。动作/存储键为技术协议；detail.prefab/LayoutSpacing管理信息弹窗几何，描边厚度/圆角与行高排列属于引擎表现例外。

## 1.4.0 全店员进化配置

- StaffBranch补齐16条分支，校验每个Staff恰有两条，StaffForm与ArtFrame引用一一对应。
- 新增pierceLength/pierceWidth/pierceRatio控制贯穿；chainCount（含首目标）、chainRadius/chainRatio控制电链；burnDamage为最终每秒灼烧、burnSeconds为独立持续时间；markRatio为直击伤害倍率、markSeconds为持续时间。
- shotColor/shotSpeed/laneBend控制分支弹道颜色、速度和多目标弧线幅度。禁用穿透/链/灼烧时相关倍率或时长必须为0；禁用标记为倍率1且时长0。
- 原六分支写入明确的禁用值及原弹道参数，不能用缺省数值掩盖漏导字段。新字段、原始表、schema、运行时和共享校验器一起提交。
- 状态独立计时、取强、到期分段积分为算法；目标槽居中属于既有几何例外，无新业务硬编码。新增美术引用与文本均来自表。
- 重点关8/10/15/20的Wave/WaveGroup/Obstacle调整见TACTICS_FULL_EVOLUTION。基础Staff/Enemy/地图与教学表不变。

## 1.5.0 单关挑战配置

- 新增 ChallengeRule、ChallengePerk，总计 24 张客户端表。原始文件在 design/tables，CSV 在 assets/resources/config；现有项目内导表工具、schema、共享校验器与 manifest 一并管理。
- ChallengeRule：levelId 指向挑战关；choiceWaves 为严格递增的清波节点，0 表示开局；waveReward、firstDelay、nextDelay 管理经济与准备时长；minIntervalRatio 为间隔下限；adRefreshPerChoice 为每次选择允许成功观看广告刷新的次数（1.5.1 替换 freeRefresh，当前为1）；allowAllStaff 只控制本模式试玩候选；cashReward、freeProps、reviveProgress 管理现有道具和复活参数。
- ChallengePerk：key 为效果协议键，category 为分类，staffKey 为空表示非专属；nameKey/descriptionKey 关联 I18，iconKey 关联 ArtFrame；params 为显式 JSON 数值字段；condition 为场地可用条件；maxWave 为最晚出现节点；exclusive 为对称互斥键。
- params 的必填键由 ConfigTables 中的效果协议校验，禁止漏字段、文本冒充数值、非整数次数、非法比例和不存在的引用。增加新的效果必须同时扩展协议、原表与客户端算法，不能仅填一个未实现的键。
- Wave 新增 bossHealthScale。挑战使用 Enemy.hp × 本波普通或首领倍率；冒险继续采用原有公式，新增字段在冒险表中显式填 1，不参与其成长。
- 三张候选槽、四人阵容容量、效果事件类型、随机数算法、循环/集合操作属于技术协议；卡牌参数、出现时间、文本和图标不能硬编码。保龄球圆形指孔与快递方形投影属于弹道几何，尺寸基础和作用范围来自效果参数，颜色复用 Staff 配置。固定面板布局在原生 Prefab。
- 原型局内卡牌状态不跨会话持久化，退出即结束。冒险成长和图鉴存档不被试玩写入，配队偏好仍由 LevelLoadout 独立存储。
- 可复用规则测试：`node tools/gameplay/test-challenge.cjs <TypeScript模块目录>`；也可在可解析 TypeScript 的环境执行 `npm run challenge:test`。不依赖引擎渲染，实际战斗和界面另行验证。

## 1.5.1 强化界面与广告换卡

- ChallengePerk.iconKey 逐卡引用 ArtFrame 的 perk_* 切片，禁止重复或缺失；ArtAtlas 新增 challengePerks 透明图集。staffKey 仍是专属归属依据，底栏从 Staff 名称与现有头像引用读取。category 仅参与候选池算法，不显示标签。
- adRefreshPerChoice 在新选择节点初始化，当前1；请求中、取消、失败、模拟回调不消耗额度，成功后换三张并减一。旧局或旧节点回调失效属于生命周期协议，无新业务硬编码。
- I18 新增广告状态、剩余次数和“强化 {p0}”；移除结束按钮文本。六张原始表、CSV与manifest同步；固定几何保存于原生Prefab。
