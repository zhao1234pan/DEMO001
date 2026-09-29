# 固定 UI 预制体

本轮保留 0.7.0 已接受的排版、美术、菜单层级和战斗规则，将固定层级保存为 Cocos Creator 3.8.8 原生 `.prefab`。正常启动不再用代码逐项创建固定页面。文件位于 `assets/resources/ui/`，入口资源索引为 `design/tables/UiPrefab.xlsx` → `assets/resources/config/UiPrefab.csv`。

## 资源清单

| 类别 | 资源键 |
| --- | --- |
| 菜单及固定页 | menu_shell、home、levels、collection、settings |
| 弹窗 | notice、detail、pause、win、lose、retry、gm |
| 战斗顶栏/底栏 | battle_hud |
| 通用控件 | level_card、collection_card、setting_row、button、sell_button、build_card、floating_label、toast、obstacle_info |

共 22 个资源。setting_row 是可复用的独立开关行模板；当前设置页保留可直接编辑的音乐/音效完整节点。关卡卡片、图鉴卡片、上下文按钮、建造卡、提示和动态文本实际按模板实例化。

## 在编辑器中修改

1. 打开项目，双击相应 `.prefab`，在层级面板选择节点。位置、尺寸、锚点、颜色、圆角、字体、图片预览均可查看和调整。不要用一次性迁移工具重新生成资源覆盖后续手工排版。
2. `UiShape` 提供编辑器和运行时一致的矢量底板；普通文字是 `Label`，图片是 `Sprite`。`UiImage` 的编辑预览来自 ArtFrame/ArtAtlas 指定的图集切片，运行时也从同一配置绑定。动态内容的空文本框属于数据槽位，运行时会填入实际文案。
3. 节点名是界面绑定协议。可以修改节点变换和视觉属性；重命名或删除绑定节点时，需要同步对应控制器与 `tools/ui/check-prefabs.cjs`，否则构建门禁会报出具体路径。按钮热区来自节点实际四角变换，调整按钮后不必再维护另一套固定点击坐标。
4. 业务文案改 I18.xlsx，图片切片改 ArtFrame/ArtAtlas.xlsx，新增或换路径改 UiPrefab.xlsx；执行 `npm run config:export`。导表只同步文字/图片预览，不重排节点、不覆盖美术手工布局。静态样式和几何归 `.prefab`，例外原因见 CONFIGURATION。
5. 执行 `npm run ui:check`、`npm run config:check`；调整公共组件或交互绑定后执行 `npm run config:test` 并进行浏览器与目标平台验收。

## 代码职责及自适应

- `UiPrefabs` 先准备 battle_art 本地 Bundle，再加载 UiPrefab 索引指定资源；共享图集和切片，配置与资源失败可重试，异步批次全部落定后释放。销毁先解除 Sprite 引用再归还图集，避免延迟销毁节点仍引用纹理。
- `PrefabGameMenuView` 负责页面切换、状态、文本/图片、分页与点击分派；路线缩略图依照实际地图动态绘制，其原点与比例由卡片内 Projection 节点决定。原 GameMenuView 模块保留兼容导出。
- `BattlePrefabView` 管理固定 HUD、结算、暂停、GM 以及实例化控件；GameRoot 保留战斗、输入、防误触、存档、声音和广告规则。动态角色、弹道、血条、路线、特效依旧采用原表现代码。
- 750×1334 设计、390 逻辑宽继续沿用。长屏拓展背景与全屏遮罩，页面内容保持原比例；战斗顶栏/底栏贴安全区，短安全区等比缩小，地图不拉伸。宽窗口居中保留黑边。旋转后刷新布局，点击通过引擎坐标反算；微信胶囊和宿主安全区继续接入原布局函数。
- 配置和预制体加载前的最小失败/重试提示仍由代码创建，避免资源本身损坏时无法提示。它不属于正常固定页面。

## 验收

见 TESTING 的“固定 UI 预制体迁移”条目。22 个预制体均已实例化、检查绑定并独立渲染；另验证实际页面/弹窗的数据状态，不能把空模板截图代替游戏页面验收。用户原预览入口、真实存档及其他工作树保持不变。

浏览器模拟不等同实体手机验收；微信/抖音本轮验证至 Creator 构建与本地分包，未上传、发布或声称通过宿主真机验收。

## 资源分包

编辑器预览属性标记editorOnly；battle_art仅含美术图集，优先级9高于resources的8，防止Prefab依赖扫描将图集转入主包。加载器先准备battle_art，再加载预制体。不要把场景或主流程脚本放入该高优先级图片Bundle。最终本地分包与主目录大小见TESTING；目录大小不代替上传压缩包检查。
