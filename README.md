# 叮咚！夜班开始

以“森林夜班便利店”为世界观主题的原创竖屏动物轻塔防小游戏，使用 Cocos Creator 3.8.8 开发，目标平台为抖音小游戏，商业模式为 IAA。

> 《叮咚！夜班开始》是当前确定的游戏名称，“守护芽芽”为早期工程代号。项目只借鉴塔防品类的基础机制，不使用《保卫萝卜》的名称、角色、美术、关卡或音频素材。

世界观、角色方向和美术基调见 [世界观文档](./docs/WORLD_BUILDING.md)。
轻量塔防循环、店员扩展、道具和首版范围见 [核心玩法设计](./docs/GAMEPLAY.md)。

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

## 当前 MVP

- 单条曲线路径、10 波敌人。
- 嫩芽（单体）、露珠（减速）、花炮（范围）三种防御塔。
- 普通、疾行、重甲三种敌人。
- 建造、三级升级、出售、暂停、胜负结算。
- 失败后每局一次“看广告复活”；浏览器预览模拟成功，抖音真机使用平台广告 API。
- 全部画面暂由 Cocos `Graphics` 程序化绘制，不依赖外部美术资源。

## 目录

```text
assets/
  scenes/battle/          # 战斗场景
  scripts/gameplay/       # 玩法代码
  scripts/services/       # 存档、平台等业务服务
  scripts/platform/       # 平台 API 适配，业务层不得直接调用 tt.*
  prefabs/                # 防御塔、敌人、投射物、特效与 UI 预制体
  art/                    # 运行时美术、图集、动画和字体
  audio/                  # BGM、音效与语音
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
