# 技术架构

## 技术基线

- Cocos Creator 3.8.8
- TypeScript
- 2D UI 渲染，750 × 1334 竖屏设计分辨率
- `Fit Width = true`、`Fit Height = false`，固定宽度、动态高度
- 抖音小游戏为首要发布目标，同时保留浏览器预览能力

## 模块

### `assets/scripts/gameplay/battle/GameRoot.ts`

MVP入口组件，负责游戏状态、波次、寻路、战斗和输入；道路、范围、血条、特效及UI矢量底板由程序绘制，单位精灵与UI图标交给独立表现层。2026-09-27已抽出最小精灵表现层、UI图标层与布局计算，后续只按实际维护需求继续拆分，不以全面拆系统作为内容制作前置条件。

### `assets/scripts/gameplay/battle/BattleArtView.ts`

负责三名店员、底座、三类障碍和三类怪物的精灵加载、复用、脚底锚点、前后排序、朝向与轻量动作。底座使用独立下层，店员、障碍和怪物在单位层按Y排序。店员只水平镜像，不把整只动物按旧炮管逻辑旋转；升级沿用首批造型并小幅缩放，等级仍有独立标识。怪物使用轻微摆动/弹跳与暖白受击帧，血条和减速圈仍在上方反馈层。美术加载失败保留程序图形，不能阻断战斗。

运行资源由`assets/art.meta`声明的本地`battle_art` Asset Bundle加载；`assets/art/gameplay/`包含店员、公共件和敌人三张图集，`assets/art/ui/icons/`包含道具图集。当前四张图集均为512×512，PNG合计391,221字节（约382 KiB），不是构建后首包、纹理内存或完整发布包大小。生产源文件继续位于`source_assets/`，不直接进入运行包。

### `assets/scripts/gameplay/battle/BattleUiView.ts`

负责三个道具图标和复用店员缩略图的异步加载、节点复用与释放，不处理输入、价格或奖励规则。图标层位于动态图形之后、文字之前，从同一`battle_art` Bundle读取道具与店员纹理；加载失败保留文字和程序底板，不阻断战斗。`GameRoot`绘制奶油描边状态胶囊、心形耐久、橙色倍速、升级/出售及结算矢量皮肤；其建造菜单绘制与命中均使用64×84逻辑像素卡片、74逻辑像素间距，通用热区与安全布局由`BattleLayout`提供。

### `assets/scripts/gameplay/battle/BattleLayout.ts`

集中定义按钮矩形、共用命中计算和安全区布局。`GameRoot`读取Cocos安全区及平台顶部胶囊避让，常规长屏保持棋盘宽度并延展上下UI；安全高度不足时等比容纳棋盘。文字最低按24设计像素处理；极短安全区中的塔位热区受相邻网格间距限制，会降级缩小以避免重叠，不将其描述为全设备88×88热区已经通过。

### `assets/scripts/gameplay/battle/GameConfig.ts`

集中保存设计分辨率、逻辑画布尺寸、广告位占位配置、店员和敌人基础数值；关卡路径与塔位属于`LevelConfig.ts`。

### `assets/scripts/gameplay/battle/LevelConfig.ts`

保存10条独立路线、每关22个规则建造单元、占用其中10格的障碍耐久/奖励、初始零钱、耐久、可用店员和敌人倍率。第1～9关4波，第10关5波。障碍引用塔位索引，清除后原格开放，避免两份坐标漂移。玩法通过`getLevelConfig`读取；内容继续增长时再评估JSON或编辑器配置。

### `assets/scripts/services/PlatformService.ts`

向玩法层提供生命周期、本地存储、广告和顶部平台遮挡尺寸。广告调用路径本轮按用户要求保持现状；新增布局接口与广告服务无关。

### `assets/scripts/services/AudioService.ts`

集中管理局内短音效。服务通过 Cocos `resources` 异步加载 `assets/resources/audio/sfx/` 中的 `AudioClip`，再使用单一 `AudioSource` 播放，不依赖 DOM、浏览器音频接口或 `tt.*`。资源尚未加载或加载失败时跳过本次播放，不影响战斗；攻击、击杀和漏怪等高频声音由服务统一限频。

### `assets/scripts/platform/douyin/`

唯一允许封装`tt.*`的目录。`DouyinRewardedVideo.ts`管理激励视频实例和一次性回调；`DouyinLayout.ts`读取顶部菜单胶囊及窗口宽度，向上返回避让比例，缺接口时退回引擎安全区。玩法层不得直接引用平台全局变量。

## 抖音适配边界

- 广告仅通过 `PlatformService.showRewardedVideo` 调用。
- 监听 Cocos `Game.EVENT_HIDE`，切入后台立即暂停。
- 设计为竖屏并优先使用触控事件。
- 资源按“首场景 / 关卡资源 / 音频”预留 Asset Bundle 拆分空间。
- 不依赖 DOM、浏览器专用 API 或 Node.js 运行时。
- IAA的广告节奏、奖励和频控尚未定稿。本轮不改广告：缺广告位的直接奖励、异常状态复位等既有问题仍待正式接入前处理，不能声称广告健壮性已修复。

## 性能预算

- 已为美术单位节点建立复用池；敌人、子弹、粒子的战斗对象及每子步寻敌仍待性能实测后优化，尚未建立完整战斗对象池。
- 同屏目标：敌人不超过 60、子弹不超过 100、粒子不超过 200。
- 美术版优先使用图集，限制材质和 DrawCall；背景与路径静态化。
- 发布前在低端安卓真机上记录平均 FPS、最低 FPS、峰值内存和首包加载时间。

## Git 约定

- 必须提交 `.meta` 文件，资源与其 `.meta` 同步增删。
- 不提交 Cocos 的缓存、构建和本地机器配置。
- 一次提交只处理一个主题；提交信息建议使用 `feat:`、`fix:`、`docs:`、`refactor:`、`test:`、`chore:`。
- 合并前至少完成 Creator 预览、TypeScript 编译和目标平台构建检查。

## 检查边界

`tsconfig.json`已明确`strict`、`target: ES2018`和`skipLibCheck`，仍依赖Creator生成`temp/tsconfig.cocos.json`及引擎声明；新电脑先用3.8.8打开工程。配置审计使用真实关卡数据，统一检查十关22/12/10、网格、道路距离、有效覆盖、清障可达性和相邻静态压力，取消旧第3→4关豁免。机器策略演练与构建检查分别验证逻辑和产物，不能替代浏览器视觉检查、人工通关或抖音真机测试；最新结果见[TESTING.md](./TESTING.md)。

目录职责和资源命名以 [PROJECT_STANDARDS.md](./PROJECT_STANDARDS.md) 为准。
