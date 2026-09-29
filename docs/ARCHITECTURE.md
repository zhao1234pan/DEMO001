# 技术架构

适用版本：0.7.0（2026-09-29）。本文说明实现边界，构建、逻辑和实屏证据分别见TESTING。

## 0.7.0 配置与战斗更新

本节取代下文0.6模块描述中的固定数量、硬编码与BOSS预留说明；其余生命周期和交互规则继续沿用。完整数据关系见CONFIGURATION，参数设计见CAMPAIGN_20。

GameRoot.onLoad先等待ConfigLoader加载全部客户端CSV并由ConfigTables全量校验，再通过onConfigsReady初始化GameConfig/LevelConfig等桥接数据并启动菜单。未就绪时不执行战斗帧，加载失败允许重试；不保留第二份硬编码回退参数。Global与I18索引缓存避免每帧线性查找。

GameConfig提供业务类型与配置适配，LevelConfig把规范化路径/塔位/障碍/波次表组装为20关。Map/Theme/Decoration驱动四组主题，Staff驱动8店员和全部弹道。新增穿透、连锁、灼烧、标记、多目标机制在原战斗链中执行；6小怪与4BOSS只有数值差异。第20关是当前终局。

GameMenuView冒险共5页，每页4张；图鉴18条（6/4/8）并分页。菜单与战斗共用ArtAtlas/ArtFrame的7图集及切片，未解锁按真实图片轮廓显示剪影。Collection中的故事和所有正常界面短文案来自I18。旧档仅补录原3类怪物，新增敌人/首领要求正式遇到，避免更新后自动全开。

AudioService读取Audio/Global，继续复用原BGM及11音效、独立偏好与生命周期。配置改变不改玩家存档键。美术battle_art在微信/抖音走本地分包，Web走本地合包，未接远端服务器。

项目内构建扩展在Creator所有目标的onBeforeBuild执行同一导表校验；XLSX、CSV或核心校验器不同步会失败。工具复制与客户端适配、协议例外均有文档。

固定UI的Prefab迁移由独立任务在隔离worktree接续，此版本仍使用原程序UI，不能把迁移任务未完成的功能算作本轮已交付。

## 技术基线

- Cocos Creator 3.8.8
- TypeScript
- 2D UI 渲染，750 × 1334 竖屏设计分辨率
- `Fit Width = true`、`Fit Height = false`，固定宽度、动态高度
- 目标为抖音及微信小游戏，同时保留浏览器预览；0.5.0微信目标构建是历史证据，0.6.0最终三目标构建以TESTING为准，开发者工具与真机尚待验收

## 模块

### `assets/scripts/gameplay/battle/GameRoot.ts`

入口组件，负责首页、正式关卡入口、游戏状态、波次、寻路、战斗和输入；范围、血条、特效及UI矢量底板由程序绘制，地图皮肤、场景精灵、单位精灵和UI图标交给独立表现层。0.3.0抽出单位/UI表现与布局计算；v0.4.0继续抽出静态地图和地标层，不以全面拆系统作为内容制作前置条件。

保留0.5.0的`home`/战斗状态分流，0.6.0把正式菜单展示和命中交给`GameMenuView`。`startOfficialLevel`仅接受已解锁关卡，最高进度通过`getLevelConfig(...).id`正规化。`returnHome`结束本局并重置战斗对象，不保存中途快照；暂停和结算页提供返回路径。菜单期间不执行战斗子步、不显示战斗操作。正式`spawnEnemy`记录图鉴遭遇，GM和MapReview跳过记录；GM返回正式首页，MapReview保留固定评审入口。通关保存只提高最高解锁，重玩低关不降进度。

`activeTouchIds`在主触点结束后仍保留其余手指，全部松开前继续取消点击，修复残留第二指时再次按主指的误触边界；专项最终结果见TESTING。`Game.EVENT_HIDE`暂停战斗并挂起音频，`EVENT_SHOW`只恢复音频偏好，不自动继续战斗。

战斗子层固定顺序为：`StaticMap → BattleSceneryView → UnitUnderlay → BattleArtView → DynamicGame → BattleUiView → Label`。地图及子层共用`contentRoot`矩形Mask，宽390逻辑像素，高度随安全区域上下延展；避免宽窗口黑边出现地图外图形。该遮罩不改变坐标或触控反算，仍需实屏检查边缘角色与动态特效的裁切。

### `assets/scripts/gameplay/battle/GameMenuView.ts`

管理`home`、`levels`、`collection`、`settings`四页和独立弹窗；三个主页入口为冒险、挑战预留和图鉴，设置位于角落。冒险按每页4关共3页展示，由真实`pathPoints`和`towerSpots`绘制等比缩略图；`show`按最高已解锁关定位默认页，翻页不写进度。锁关、挑战和必要操作失败通过提示窗表达，不能穿透至卡片或战斗。设置不含自编隐私/数据说明或帮助反馈弹窗。

绘制和点击使用同一矩形，页面状态、尺寸或资源就绪变化时才重画；文本节点按键复用。主页面与弹窗各有图形、精灵和文字层，弹窗开启时独占命中列表。通过`AudioService`控制声音，通过`PlatformSettings`调用平台入口，不直接依赖`tt`或`wx`。

### `assets/scripts/gameplay/battle/MenuArtView.ts`

复用现有`battle_art`中店员、敌人与场景三张纹理，不新增运行图集。图标节点与切片复用，未解锁时将原图颜色置黑、保留Alpha轮廓；BOSS预留剪影由菜单绘制。异步加载失败保留文字与程序底板，销毁先解绑精灵帧，再归还帧和纹理引用；晚到资源不复活已销毁页面。

### `assets/scripts/gameplay/battle/CollectionData.ts`

集中维护怪物、BOSS、店员三页签与8条档案：3怪、2个永久预留BOSS、3店员。数值从`ENEMY_CONFIG`/`TOWER_CONFIG`读取，故事和解锁说明独立，不复制战斗计算。`CollectionProgress`缓存收录状态，绘制仅查缓存，打开菜单或正式进度变化时刷新。

正式怪物首次出场后，独立`night_store_collection_enemy_*`键用`setMaximumInteger(key, 1, 1)`保存发现标记。旧档仅从最高已解锁关之前的已完成关卡补录怪物；店员由截至最高已解锁关的可用店员集合导出，无额外养成存档。BOSS在本版本始终返回未解锁。GM和MapReview不写遭遇，存储异常继续沿用会话兜底与读恢复合并。

### `assets/scripts/gameplay/battle/BattleMapView.ts`

0.4.1仅保留用户选定B庭院皮肤：按实际`pathPoints`绘制薄路缘、浅色砖路和轻微圆角，按`towerSpots`绘制成组铺装与平嵌建造格；圆角只改变视觉，不生成第二套寻路数据。场景位图未就绪时绘制简洁地铁阶梯/店铺兜底，图片加载结束后重画移除兜底。地图仅在切关、布局变化或加载完成时更新。

### `assets/scripts/gameplay/battle/BattleSceneryLayout.ts`

纯装饰布局与避让检查，输出`SceneDecoration`（kind、position、width、height、groupId），不改变LevelConfig。花池48×48逻辑、小树40×56，均为居中完整画布；按每关完整空隙成组选择，与道路、最高级店员、地标联合框及其他装饰保留净空。第3关只有两个花池，不通过压扁树或移动塔位强行补齐数量。

### `assets/scripts/gameplay/battle/BattleSceneryView.ts`

静态场景精灵层，提供`load()`、`setScene(entry, goal, decorations)`、`ready`与`destroy()`；输入为左上原点、Y向下的地图逻辑坐标。复制最新快照，异步加载完成时重画当前关卡；场景节点复用，同索引从花池变为树时同步更换frame与尺寸，避免高树被压扁。销毁前解绑帧，晚到纹理回调立即归还引用。

场景从本地`battle_art`读取`gameplay/maps/atlas_battle_scenery/texture`，仍是一张512图集：地铁入口(0,0,256,224)、终点(256,0,256,224)、花池(0,224,192,192)、小树(192,224,160,224)。均零offset、不翻转UV，meta保留原UUID且`flipVertical=false`。地标64×56、中心(x,y+6)；花池48×48、小树40×56、中心为配置点。绿化固定在地标下方，整个场景层低于战斗单位，不处理寻路、碰撞或点击。旧三方案附加图集移出运行资源，不新增常驻纹理。

首尾位置必须容纳完整画布而非只容纳路径点：位图为[x−32,x+32]、[y−22,y+34]；`GameRoot`地标文字使联合框上沿扩至y−40，终点耐久条仍落在y+29～y+34。基准画面顶栏条纹到75、底栏从约608.68开始；应连同最高级店员和其他提示检查屏内净空，不能只依赖x=0～390、y=73～618的位图范围检查。具体十关与实屏结论由主任务填入TESTING。

当前十关地标联合框配置范围仍为x=8～382、y=80～604，第9关上下最小净空分别5和约4.68逻辑像素。塔位x=45～345，保持原位置。装饰按新完整画布检查而非沿用旧扁灌木半径，具体净空及实屏结果见TESTING。

### `assets/scripts/gameplay/battle/BattleArtView.ts`

负责三名店员、底座、三类障碍和三类怪物的精灵加载、复用、脚底锚点、前后排序、朝向与轻量动作。0.3.0底座使用独立下层，v0.4.0主循环改用地图地台、不再逐格绘制旧椭圆底座，原素材和接口保留。店员、障碍和怪物在单位层按Y排序；店员只水平镜像，不把整只动物按旧炮管逻辑旋转，升级沿用首批造型并小幅缩放，等级仍有独立标识。怪物使用轻微摆动/弹跳与暖白受击帧，血条和减速圈仍在上方反馈层。美术加载失败保留程序图形，不能阻断战斗。

运行资源由`assets/art.meta`声明的本地`battle_art` Asset Bundle加载；0.3.0店员、公共件、敌人和UI图标四张图集为391,221字节。v0.4.0新增场景图集后共五张512×512图集，PNG合计533548字节（约521KiB），不是构建后首包、纹理内存或完整发布包大小。生产源文件位于`source_assets/art/production/v1/`和`v2_scene/`，不直接进入运行包。

### `assets/scripts/gameplay/battle/BattleUiView.ts`

负责三个道具图标和复用店员缩略图的异步加载、节点复用与释放，不处理输入、价格或奖励规则。图标层位于动态图形之后、文字之前，从同一`battle_art` Bundle读取道具与店员纹理；加载失败保留文字和程序底板，不阻断战斗。`GameRoot`绘制奶油描边状态胶囊、心形耐久、橙色倍速、升级/出售及结算矢量皮肤；其建造菜单绘制与命中均使用64×84逻辑像素卡片、74逻辑像素间距，通用热区与安全布局由`BattleLayout`提供。

### `assets/scripts/gameplay/battle/BattleLayout.ts`

集中定义按钮矩形、共用命中计算和安全区布局。`GameRoot`读取Cocos安全区及平台顶部胶囊避让，常规长屏保持棋盘宽度并延展上下UI；安全高度不足时等比容纳棋盘。文字最低按24设计像素处理；极短安全区中的塔位热区受相邻网格间距限制，会降级缩小以避免重叠，不将其描述为全设备88×88热区已经通过。

### `assets/scripts/gameplay/battle/GameConfig.ts`

集中保存设计分辨率、逻辑画布尺寸、广告位占位配置、店员和敌人基础数值；关卡路径与塔位属于`LevelConfig.ts`。

### `assets/scripts/gameplay/battle/LevelConfig.ts`

保存10条独立路线、每关22个规则建造单元、占用其中10格的障碍耐久/奖励、初始零钱、耐久、可用店员和敌人倍率。第1～9关4波，第10关5波。障碍引用塔位索引，清除后原格开放，避免两份坐标漂移。玩法通过`getLevelConfig`读取；入口将非有限ID回退到1、有限ID向下取整并夹到实际配置范围，`GameRoot.currentLevelId`使用返回配置的ID，避免显示/存档索引与实际关卡不一致。内容继续增长时再评估JSON或编辑器配置。

### `assets/scripts/services/PlatformService.ts`

向玩法层提供生命周期、本地存储、广告和顶部平台遮挡尺寸。0.5.0对数值存储读写捕获异常：空白、不可解析或非有限值按默认值处理；`lastNumbers`保留会话内最近有效值，`pendingNumbers`保留尚未成功落盘的新值，非有限写入不落盘。

最高解锁和既有最高关纪录使用`setMaximumInteger(key, value, upperBound)`：将新值、会话缓存及旧存档向下取整并夹到`[0, upperBound]`后取最大值，当前上限为10。写入前必须读旧存档；读取失败时旧最高进度未知，只保留会话待落盘值，不执行写入以免覆盖更高旧档。`pendingMaximumBounds`标记这种待合并的最高纪录；下次`getNumber`读取该键时重试读取旧档、取最大值并保存，成功后清除待落盘标记。没有后台定时重试；最高纪录在下次读取时尝试恢复，也不能保证退出进程后保住未落盘的新值。

倍速、音乐和音效偏好使用普通`setNumber`覆盖选择，允许降速或关闭声音，不套用最大值合并。普通写入失败后优先读取会话待落盘值；与最高纪录、图鉴发现标记的读取恢复机制分开处理。`onShow/offShow`和`onHide/offHide`统一封装Cocos前后台事件；顶部遮挡根据实际运行环境选择抖音或微信尺寸封装。

广告调用路径本轮按用户要求保持原样。当前服务的非抖音分支仍是模拟奖励，不能作为微信广告适配；抖音缺广告位虽返回失败，`GameRoot`仍对`missing-ad-unit`放行奖励/复活，这个既有问题尚未修复。

### `assets/scripts/services/AudioService.ts`

通过Cocos `resources`异步加载11个短音效和`audio/music/bgm_night_shift`。一个循环`AudioSource`供首页、图鉴、设置和全部战斗共用；24秒原创音乐的运行MP3为192261字节，音量0.32。`night_store_music_enabled`与`night_store_effects_enabled`独立保存0/1偏好，首次玩家触摸调用`unlock`后才允许出声。

短音效使用最多6个按需创建、可停止的`AudioSource`，保留既有音量和高频间隔；空闲通道优先，满额时替换最早音效。解码期间先占用通道，避免同帧反复抢占。关闭音效或挂起时停止并清空clip，撤销未完成解码的旧播放。音乐停止时记录播放位置、清空clip，按偏好恢复；页面切换不会重复创建音乐源。

资源成功后持有引用，销毁时归还；失败、重复回调或销毁后回调不阻断流程。MapReview不持久化声音偏好。没有DOM、浏览器专用音频或平台录音权限调用；真实听感、循环边界、前后台焦点行为仍须两平台验收。音符、母带和导出记录见`source_assets/audio/night_shift_v1/`。

### `assets/scripts/services/PlatformSettings.ts`

实例提供只读`capabilities`（`runtime`、`sidebar`）、`refresh()`和`openSidebar()`。抖音刷新需接口存在且`checkScene`明确返回`isExist:true`才开放侧边栏入口，较旧并发刷新不能覆盖最新结果。点击后同步发起跳转，不发奖励。设置无可选政策入口，也无`privacy`字段或`openPrivacy`接口；政策按宿主机制及后台要求处理。

回调、同步抛错、8秒超时统一返回`{ok,message}`，重复或晚到回调只结算一次。没有账号、个人资料、授权申请、网络或后端依赖。反馈由宿主菜单提供，本游戏未实现反馈或客服界面。

### `assets/scripts/platform/douyin/`

唯一允许封装`tt.*`的目录。原`DouyinRewardedVideo.ts`广告逻辑不改，`DouyinLayout.ts`继续提供胶囊比例。新增`DouyinSettings.ts`封装小游戏`checkScene`及`navigateToScene`，只检测和打开`sidebar`，不混用抖音小程序隐私API。

### `assets/scripts/platform/wechat/`

`WechatSettings.ts`只识别微信运行环境，并通过`getWindowInfo`与`getMenuButtonBoundingClientRect`计算胶囊避让，不保留未使用的可选隐私接口。旧版缺接口、非有限尺寸或异常返回0，继续引擎安全区，不回退到更广的系统信息接口。`wx.*`不进入玩法或UI，微信广告仍未接入。

## 平台适配边界

- 广告仅通过 `PlatformService.showRewardedVideo` 调用。
- 微信构建配置保留正式App ID；0.6.0新增微信胶囊封装，广告分支仍未接入。开发者工具、真机、存储与焦点行为分别验收，详见[微信发布准备](./WECHAT_RELEASE.md)。
- 监听Cocos `Game.EVENT_HIDE/SHOW`；切后台暂停战斗并挂起音频，回前台按声音偏好恢复音乐，战斗仍保持暂停。
- 设计为竖屏并优先使用触控事件。
- 资源按“首场景 / 关卡资源 / 音频”预留 Asset Bundle 拆分空间。
- 不依赖 DOM、浏览器专用 API 或 Node.js 运行时。
- IAA的广告节奏、奖励和频控尚未定稿。本轮不改广告：缺广告位的直接奖励、异常状态复位等既有问题仍待正式接入前处理，不能声称广告健壮性已修复。

## 性能预算

- 已为美术单位/UI节点建立复用池，静态场景节点跨关复用；敌人、子弹、粒子的战斗对象及每子步寻敌仍待性能实测后优化，尚未建立完整战斗对象池。
- 同屏目标：敌人不超过 60、子弹不超过 100、粒子不超过 200。
- 美术版优先使用图集，限制材质和 DrawCall；背景与路径静态化。
- 发布前在低端安卓真机上记录平均 FPS、最低 FPS、峰值内存和首包加载时间。

## Git 约定

- 必须提交 `.meta` 文件，资源与其 `.meta` 同步增删。
- 不提交 Cocos 的缓存、构建和本地机器配置。
- 一次提交只处理一个主题；提交信息建议使用 `feat:`、`fix:`、`docs:`、`refactor:`、`test:`、`chore:`。
- 合并前至少完成 Creator 预览、TypeScript 编译和目标平台构建检查。

## 检查边界

`tsconfig.json`已明确`strict`、`target: ES2018`和`skipLibCheck`，仍依赖Creator生成`temp/tsconfig.cocos.json`及引擎声明；新电脑先用3.8.8打开工程。配置审计使用真实关卡数据，统一检查十关22/12/10、网格、道路距离、有效覆盖、清障可达性和相邻静态压力，取消旧第3→4关豁免。机器策略演练与构建检查分别验证逻辑和产物，不能替代浏览器视觉检查、人工通关或抖音/微信真机测试；最新结果见[TESTING.md](./TESTING.md)。

目录职责和资源命名以 [PROJECT_STANDARDS.md](./PROJECT_STANDARDS.md) 为准。
