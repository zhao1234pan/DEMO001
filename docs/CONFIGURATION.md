# XLSX → 客户端 CSV 配置规范

适用0.7.0；本项目和后续新项目都先设计表格，再实现消费配置的代码。原始表是唯一编辑来源，禁止直接改CSV作为正式修复。新增功能的数值、文本、属性、资源引用和解锁条件均遵循本流程；不默认输出服务端配置。

## 目录与日常操作

- design/tables：18张原始XLSX，均为可直接编辑的独立工作簿。
- tools/config：项目自带JAR、客户端Java入口、字段协议和校验器；不依赖参考项目仍存在。
- assets/resources/config：运行时CSV及manifest.json，Cocos按TextAsset加载。
- assets/scripts/config：CSV解析、跨表校验和启动加载；业务模块在配置全部就绪后初始化。
- extensions/config-table-check：Creator全平台构建前调用config:check，失败中止构建。

日常步骤：编辑XLSX并保存 → 在项目根目录执行 npm run config:export（或双击 tools/config/导出客户端配置.bat）→ npm run config:check → 构建与玩法验证 → 同次提交XLSX、CSV、manifest和新增资源.meta。不要用旧的生成脚本覆盖策划后来手改的表。

导表需要Node.js和JDK21。java从JAVA_HOME/bin或PATH查找；node须在PATH。工具所有输入/输出由项目根目录推导。日志和隔离暂存默认在仓库所在盘的gptwork/config-export，CONFIG_WORK_DIR可覆盖。没有Java、校验器未更新或表格不合法时，不覆盖现有CSV；错误会给出对应表或日志位置。

Creator启动时加载项目构建扩展；GUI已打开的工程在新增扩展后须刷新/启用“config-table-check”或重新启动。CLI实际三目标构建会输出“[config-table-check] …张表校验通过”。不要禁用扩展绕过过期配置。

## 表格与关系

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

Level.availableTowers用竖线分隔Staff.key。Level→Map→MapPoint/Spot/Obstacle/Decoration；Wave→Level，WaveGroup→Wave及Enemy。I18、ArtAtlas、ArtFrame等均使用稳定key，不把表格行号当业务ID。删除或改key时必须同步所有引用。

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
