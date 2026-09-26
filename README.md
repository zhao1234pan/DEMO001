# 叮咚！夜班开始

以“森林夜班便利店”为世界观主题的原创竖屏动物轻塔防小游戏，使用 Cocos Creator 3.8.8 开发，目标平台为抖音小游戏，商业模式为 IAA。

> 《叮咚！夜班开始》是当前确定的游戏名称，“守护芽芽”为早期工程代号。项目只借鉴塔防品类的基础机制，不使用《保卫萝卜》的名称、角色、美术、关卡或音频素材。

世界观、角色方向和美术基调见 [世界观文档](./docs/WORLD_BUILDING.md)。
轻量塔防循环、店员扩展、道具和首版范围见 [核心玩法设计](./docs/GAMEPLAY.md)。
成熟休闲塔防的玩法、UI、交互和逻辑拆解见 [塔防核心参考分析](./docs/TOWER_DEFENSE_REFERENCE.md)。

## 环境

- 项目目录：`G:\DEMO001`
- Cocos Creator：`F:\cocos2d\Creator\3.8.8\CocosCreator.exe`
- 设计分辨率：750 × 1334，竖屏，固定宽度、动态高度
- 语言：TypeScript

## 打开项目

1. 启动 Cocos Dashboard。
2. 选择“导入项目”，目录指向 `G:\DEMO001`。
3. 使用 Cocos Creator 3.8.8 打开。
4. 打开 `assets/scenes/battle/scn_battle.scene`，点击预览。

## GM 调试选关

- Creator 预览或调试构建中，战场右上角显示紫色 `GM` 按钮。
- 打开面板后可直接进入第 1～10 关；面板开启期间战斗自动冻结。
- GM 切关和 GM 模式通关都不会修改玩家的正式解锁进度；点击“返回正式进度”可回到存档中的关卡。
- 抖音正式构建会通过 Cocos `DEBUG` 编译常量移除 GM 入口与面板，不属于正式玩家功能。

## 当前 MVP

- 10 个连续关卡均使用独立路线；前 3 关已升级为每关 22 个规则化建造单元、12 个开局空位与 10 个可清除障碍物，后 7 关暂保留旧版 4～6 塔位等待逐关重做。
- 出怪前在入口完整显示下一波与 4、3、2、1 数字倒计时；教学或波次奖励提示结束后才开始计时，不会后台偷跑。
- 豆包（快速单体）、棉棉（减速控制）、布丁（范围驱赶）三名店员。
- 普通、高速、重型三种敌人。
- 先点空塔位再从塔位旁选择店员；点已建店员显示范围、升级与部分退款出售，点障碍物可指定清理并在清除后释放建造位；另有三个一键道具、正式的 1/2/3 倍速、暂停和胜负结算。
- 失败后可免费重开，也可每关主动选择一次“看广告继续营业”；抖音真机使用平台广告 API。
- 前 3 关已按“豆包基础输出—棉棉克制疾行—布丁处理密集敌群”调优经济与波次，并加入建造、升级、攻击、击杀、漏怪、波次和结算反馈。
- 已接入 11 个原创合成短音效；音频异步加载失败时只跳过声音，不阻断战斗。
- 全部画面暂由 Cocos `Graphics` 程序化绘制，不依赖外部美术资源。
- 调试构建提供 GM 选关面板，可直接验证第 1～10 关；正式抖音构建不包含该入口。

## 目录

```text
assets/
  scenes/battle/          # 战斗场景
  scripts/gameplay/       # 玩法代码
  scripts/services/       # 存档、平台等业务服务
  scripts/platform/       # 平台 API 适配，业务层不得直接调用 tt.*
  prefabs/                # 防御塔、敌人、投射物、特效与 UI 预制体
  art/                    # 运行时美术、图集、动画和字体
  resources/audio/        # 当前由 Cocos resources 运行时加载的音效
  data/                   # 关卡、数值、本地化和默认配置
  bundles/                # 通用、章节和音频分包
source_assets/            # PSD/AI/AEP/母带等生产源文件
docs/                     # 产品、架构、发布与计划文档
settings/                 # 需要纳入 Git 的 Cocos 项目设置
```

完整的分辨率、UI、目录、命名、图集、音频和性能规则见 [项目规范](./docs/PROJECT_STANDARDS.md)。

## 文档维护约定

- 功能或规则变化：同步修改 `docs/PRODUCT.md`。
- 世界观、角色或叙事变化：同步修改 `docs/WORLD_BUILDING.md`。
- 核心循环、关卡、店员、敌人或道具变化：同步修改 `docs/GAMEPLAY.md`。
- 目录、模块或依赖变化：同步修改 `docs/ARCHITECTURE.md`。
- 分辨率、UI、资源或命名规则变化：同步修改 `docs/PROJECT_STANDARDS.md`。
- 抖音能力或提审要求变化：同步修改 `docs/DOUYIN_RELEASE.md`。
- 里程碑变化：同步修改 `docs/ROADMAP.md`。
- 每个可交付版本：更新 `CHANGELOG.md`。
- 每次跨电脑开发开始前阅读 `docs/PROJECT_STATUS.md`，结束前更新任务记录并推送分支。

当前自动检查和人工验收方法见 [docs/TESTING.md](./docs/TESTING.md)。
两台电脑与 Codex 的协作方式见 [开发协作规范](./docs/DEVELOPMENT_WORKFLOW.md)；当前进度以 [项目状态](./docs/PROJECT_STATUS.md) 为准。

## Git

项目应提交 `assets/`、`settings/`、`docs/`、`package.json` 和 `tsconfig.json`。不要提交 `library/`、`temp/`、`local/`、`build/`、`profiles/`、`native/engine/` 等生成或本机配置文件。

- 远端仓库：<https://github.com/zhao1234pan/DEMO001>
- 默认分支：`main`
- Fork 客户端直接打开 `G:\DEMO001` 即可查看本地与远端版本记录。
- 详细提交与同步规则见 [docs/GIT_WORKFLOW.md](./docs/GIT_WORKFLOW.md)。
