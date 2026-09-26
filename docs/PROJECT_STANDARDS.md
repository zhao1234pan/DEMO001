# 项目规范

本规范是《叮咚！夜班开始》（早期工程代号“守护芽芽”）的工程基线。新代码和资源默认遵循本文；确需例外时，应在同一提交中说明原因并更新相关文档。

## 1. 画布与适配

- 方向：竖屏。
- 设计分辨率：`750 × 1334`。
- Cocos 适配：`Fit Width = true`、`Fit Height = false`，即固定宽度、动态高度。
- 目标屏幕比例：优先覆盖 16:9 至 20:9；更长屏幕允许增加上下可视区域，不横向拉伸关键 UI。
- 当前不锁定顶部、战场、底部等界面分区，具体布局随交互方案迭代。
- 关键按钮、货币、生命和广告关闭/跳过入口必须避开系统状态栏、圆角、刘海与底部手势区。
- 新 UI 直接按 750 宽设计。当前程序化 MVP 使用 `390 × 693.68` 逻辑坐标层，与 `750 × 1334` 保持完全相同的宽高比并统一等比缩放；禁止分别拉伸横轴和纵轴。
- Cocos 浏览器预览选择 `Design Resolution (750 × 1334)` 时会按 1:1 像素创建 750 × 1334 画布；若桌面浏览器内容区高度不足，窗口中只会看到画布的一部分，这属于预览窗口裁切，不代表手机画面被裁切。完整构图使用 750 × 1334 浏览器视口或 375 × 667 等比视口验收。

## 2. UI 尺寸基线

以下单位均为 750 宽设计稿像素：

| 用途 | 建议字号/尺寸 |
| --- | --- |
| 辅助说明 | 24 |
| 正文 | 28 |
| 按钮文字 | 30–34 |
| 重要数字 | 36–44 |
| 页面标题 | 42–52 |
| 结算主标题 | 52–64 |
| 最小触控区域 | 88 × 88 |
| 常规按钮高度 | 88–104 |
| 常规元素间距 | 不小于 16 |
| 内容安全边距 | 24–32，另叠加平台安全区 |

- 同类页面保持字号层级一致，不用缩小字号解决溢出；优先调整宽度、换行或文案。
- 文本需要预留本地化扩展空间，数字和按钮状态不得依赖仅靠颜色区分。

## 3. 目录职责

```text
G:\DEMO001
├─ assets
│  ├─ scenes/{boot,lobby,battle}
│  ├─ scripts
│  │  ├─ app
│  │  ├─ core
│  │  ├─ gameplay/{battle,level,tower,enemy,projectile,skill}
│  │  ├─ ui/{screens,panels,dialogs,components}
│  │  ├─ services
│  │  ├─ platform/douyin
│  │  ├─ data/{configs,models}
│  │  ├─ utils
│  │  └─ debug
│  ├─ prefabs/{towers,enemies,projectiles,effects,ui}
│  ├─ art
│  │  ├─ ui/{common,icons,screens,dialogs}
│  │  ├─ gameplay/{towers,enemies,projectiles,maps,effects}
│  │  ├─ atlases
│  │  ├─ animations
│  │  ├─ spine
│  │  └─ fonts
│  ├─ resources/audio/sfx
│  ├─ data/{levels,balance,localization,defaults}
│  └─ bundles/{common,chapter_01,audio}
├─ source_assets/{art,animation,audio}
├─ docs
├─ settings
└─ package.json
```

- 只创建实际使用的子目录，禁止为“看起来完整”提交大量空目录。
- `assets/` 只放游戏运行时需要导入的资源。
- `source_assets/` 存放 PSD、AI、AEP、Spine 工程、无损音频母带等生产源文件。
- `G:\gptwork` 只放辅助脚本、构建验证产物和日志，不纳入项目 Git。
- Cocos 资源与对应 `.meta` 必须同步移动、重命名和提交。

## 4. 代码分层

- `app`：启动流程、全局配置、场景切换。
- `core`：事件、对象池、状态机及与业务无关的基础能力。
- `gameplay`：战斗、关卡、塔、敌人、投射物和技能规则。
- `ui`：页面、面板、弹窗和通用组件，只处理展示与输入转发。
- `services`：存档、音频、资源、埋点、广告等面向业务的服务。
- `platform`：平台 SDK 适配；抖音全局 API `tt.*` 只能在 `platform/douyin` 内出现。
- `data`：配置类型、运行时数据模型及加载逻辑。
- `utils`：无业务状态的通用函数。
- `debug`：只用于开发环境的诊断工具，不得进入正式交互流程。

## 5. 命名规则

### TypeScript

- 类、接口、枚举、组件文件：`PascalCase`。
- 变量、函数、方法：`camelCase`。
- 常量：`UPPER_SNAKE_CASE`；配置对象导出可使用项目既有的 `GAME_CONFIG` 形式。
- 禁止中文、空格、拼音缩写和 `new1`、`temp2` 等无语义名称。
- 代码标识符保持英文，必要注释使用中文；注释应说明设计原因、数值依据、状态边界或平台限制，不重复翻译代码本身。

### Cocos 与美术资源

- 文件名使用小写 `snake_case`，按类型添加前缀。
- 场景：`scn_battle.scene`。
- 预制体：`pf_tower_sprout.prefab`。
- 图片：`spr_tower_sprout_lv1.png`。
- 图集：`atlas_ui_common`。
- 动画：`anim_enemy_slime_walk`。
- 同一对象的等级或状态放在名称末尾，例如 `_lv1`、`_disabled`。

### 音频

- 背景音乐：`bgm_`。
- UI 音效：`sfx_ui_`。
- 战斗音效：`sfx_battle_`。
- 系统音效：`sfx_system_`。
- 语音：`voice_`。
- 当前 MVP 的局内短音效放在 `assets/resources/audio/sfx/`，由 `AudioService` 按路径加载；后续大体积背景音乐和章节音频应迁入独立音频 Bundle，不重复保留同一运行时副本。
- 高频战斗音效必须设置播放间隔或并发上限，避免密集波次叠加成噪声并增加解码压力。
- 运行时格式和压缩参数按真机听感与包体评估决定，保留无损母带在 `source_assets/audio/`。

## 6. 图集与资源预算

- 单张图集上限 `2048 × 2048`。
- UI、塔、敌人、特效分别组图，不把所有资源塞进一个全局图集。
- 大背景、长图和低复用资源不进通用图集。
- 章节专属资源放对应章节 Bundle，不进入 `common`。
- 导出前裁掉无效透明边缘；避免重复纹理、重复音频和无法追溯的副本。
- 首场景只依赖启动必需资源，章节和音频为分包/远程资源预留边界。

## 7. 性能基线

- 同屏建议上限：敌人 60、投射物 100、粒子 200；超出前必须真机压测。
- 高频对象使用对象池，不在每帧创建大量节点、数组或临时对象。
- 静态背景和路径尽量静态化；控制材质切换、DrawCall 和透明叠加层数。
- 发布前使用低端安卓真机记录平均 FPS、最低 FPS、峰值内存、首包加载时间和 10 分钟稳定性。
- 任何性能预算调整都要附测试设备、场景和测量结果。

## 8. 抖音与 IAA 边界

- 抖音是首要发布目标，所有触控、生命周期、存储和包体决策均需考虑小游戏环境。
- 业务代码不得直接调用 `tt.*`；统一经过 `services` 和 `platform/douyin`。
- 当前 IAA 的广告点位、奖励、触发节奏和频控均为“待产品确认”。
- 现有失败复活只用于验证广告接口，不代表最终商业化方案。
- 无正式 App ID、广告位 ID 和真机验证时，不得把模拟广告结果当作发布验收。
