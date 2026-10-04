# PNG资源、九宫格与图集工作流

适用版本：1.6.0。保持现有界面布局、命中区域、角色与地图风格；变更的是资源管线。

## 资源目录

| 目录（相对 assets/art） | 用途 |
| --- | --- |
| ui/skins/common | 面板、按钮、遮罩、进度底板复用的白色圆角皮肤，通过预制体着色 |
| ui/skins/borders | 可拉伸的独立描边，九宫保留圆角 |
| ui/skins/symbols | 心形、锁、齿轮与高光等固定比例符号 |
| ui/icons/perks | 32张挑战强化图标 |
| ui/icons/props | 冰冻、清场、金币道具图标 |
| gameplay/towers/characters | 店员原形和进化形态 |
| gameplay/enemies/characters | 小怪、首领和命中形态 |
| gameplay/obstacles | 木箱、购物篮、盆栽及底座 |
| gameplay/scenery | 地铁口、店铺和绿化 |
| gameplay/maps | 按CSV离线生成的21张透明路面图，底色独立适配长屏 |
| gameplay/projectiles、gameplay/effects | 弹道与环形效果；通用粒子复用PNG |

不为尚未有内容的装备系统新增资源。窗口和HUD目前共享通用皮肤，独有美术增加时再分文件夹，避免同图重复导出。

## 原始配置与编辑

- `design/tables/VisualSkin.xlsx`：84项PNG引用、分类、尺寸、显示模式、九宫边距和外扩留白。运行时读取`VisualSkin.csv`。
- `design/tables/ArtFrame.xlsx`：83项独立图片；`assetPath`是客户端原生SpriteFrame路径。原图集和矩形字段保留为来源和重新切图依据。
- 旧源图集移到`source_assets/art/atlases/`，原PNG与meta一起归档，UUID保留；不再把旧整图和新独立图重复打入运行包。
- 原有515个形状合并为63张皮肤/效果PNG。源SVG在`source_assets/art/production/png_skins/`；地图源SVG在`png_maps/`。这次按已有图形离线转图，没有重新生成角色或改变画风。
- 预制体中的`UiSkin`引用资源键，子节点`Artwork`是原生Sprite；可直接检查显示类型。父节点原位置、尺寸和点击范围保留，描边额外像素由子节点外扩。
- 固定布局和着色保留在Prefab，这属于既有可编辑美术数据。可调玩法数值、文案、图片引用和九宫参数仍在表里，不散落到脚本。
- 白色共享皮肤会乘以Prefab颜色；替换成带色画稿时，相应美术节点颜色设白。文字和数字继续使用Label/I18，不烘焙进PNG。

## 替换与导出

普通换图：保持文件名、画布尺寸、透明边界和原meta。替换PNG后执行导表检查及Creator构建，不必重跑源图导出。

调整切图或九宫：先改XLSX；导表同步CSV，再同步PNG及meta边距，保证校验通过。九宫模式为Sprite.Type.SLICED；保持比例的图标使用SIMPLE。

项目作者工具需要Node.js与Sharp；地图工具另外需要TypeScript，路径作为参数传入，项目不记录本机依赖路径：

```text
node tools/art/export-png.cjs skins
node tools/art/export-png.cjs characters
node tools/art/bake-maps.cjs <typescript模块路径>
node tools/config/export.cjs --check
```

前两项是显式的源图重新导出，会覆盖对应PNG；手工美术先提交再使用。正常构建只检查，不自动覆盖PNG。修改地图表后先正常导出CSV，再重新烘焙地图；过期地图禁止构建。

## 图集与显示

- 小图按上述目录设置`.pac`；九宫禁止旋转，2像素padding/extrude，保留CSV动态引用的帧。较大地图独立存储，避免塞入公共UI图集。
- 使用导入的SpriteFrame；没有运行时`new SpriteFrame()`或`packable=false`。资源加载统一持有引用，战斗层共享；销毁先解绑节点再归还资源。
- 射程、弹道、进度、路线缩略图使用PNG的位移、缩放、旋转、透明度和九宫表现；裁切也使用PNG Sprite stencil。游戏脚本和预制体不含Graphics或运行时Canvas绘图。
- 资源格式转换不代表性能提升；以实际构建中的Draw Call和试玩结果为准，不能只以资源数量作结论。

官方依据：[Sprite九宫与显示模式](https://docs.cocos.com/creator/3.8/manual/en/ui-system/components/editor/sprite.html)、[AutoAtlas构建打包规则](https://docs.cocos.com/creator/3.8/manual/en/asset/auto-atlas.html)。

## 构建门禁

导表与构建检查覆盖：XLSX/CSV版本、资源路径、PNG尺寸、原生切片、九宫边距、预制体绑定、禁止运行时绘图/手工切片、地图配置与烘焙签名。改变美术仍需实际截图和交互验证，静态检查不能代替观感验收。
