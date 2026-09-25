# 守护芽芽

原创竖屏轻塔防小游戏，使用 Cocos Creator 3.8.8 开发，目标平台为抖音小游戏，商业模式为 IAA。

> “守护芽芽”是当前工作名。项目只借鉴塔防品类的基础机制，不使用《保卫萝卜》的名称、角色、美术、关卡或音频素材。

## 环境

- 项目目录：`G:\DEMO001`
- Cocos Creator：`F:\cocos2d\Creator\3.8.8\CocosCreator.exe`
- 设计分辨率：390 × 700，竖屏，适配宽度
- 语言：TypeScript

## 打开项目

1. 启动 Cocos Dashboard。
2. 选择“导入项目”，目录指向 `G:\DEMO001`。
3. 使用 Cocos Creator 3.8.8 打开。
4. 打开 `assets/scenes/main.scene`，点击预览。

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
  scenes/                 # Cocos 场景
  scripts/game/           # 核心玩法与配置
  scripts/platform/       # 抖音/预览环境能力适配
docs/                     # 产品、架构、发布与计划文档
settings/                 # 需要纳入 Git 的 Cocos 项目设置
```

## 文档维护约定

- 功能或规则变化：同步修改 `docs/PRODUCT.md`。
- 目录、模块或依赖变化：同步修改 `docs/ARCHITECTURE.md`。
- 抖音能力或提审要求变化：同步修改 `docs/DOUYIN_RELEASE.md`。
- 里程碑变化：同步修改 `docs/ROADMAP.md`。
- 每个可交付版本：更新 `CHANGELOG.md`。

当前自动检查和人工验收方法见 [docs/TESTING.md](./docs/TESTING.md)。

## Git

项目应提交 `assets/`、`settings/`、`docs/`、`package.json` 和 `tsconfig.json`。不要提交 `library/`、`temp/`、`local/`、`build/`、`profiles/`、`native/engine/` 等生成或本机配置文件。
