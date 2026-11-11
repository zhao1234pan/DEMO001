# Codex 项目协作指令

<!-- game-guidance:begin -->
## 通用游戏制作 软著与发行规范

- 开始工作先读[根规范](GAME_DEVELOPMENT.md)、[Git 范围](GIT_WORKFLOW.md)和目标游戏当前约定；按任务再读玩法/UI、工程资源、软著、微信、TapTap 或验收分章。
- biu_art、biu_client、biu_design 由用户提交推送；确认属于 zhao1234pan 的个人仓库，由 Agent 验证后提交推送本任务改动并核对远端。当前任务的明确要求优先；下文历史 Git 授权或当时本地保留记录不覆盖当前范围。
- 保留用户与其他任务未提交、已暂存的内容。规范同步只改文档、读取入口和规范工具，不合并各分支玩法，不移动冻结标签，不默认取得平台办理或发布权限。
- 稳定的跨项目经验回收到 DEMO007 默认分支的通用规范，更新版本与来源后维护 DEMO001～007 所有现有分支；游戏特例保留在本游戏。
- 换电脑或分支后核对 GUIDANCE_MANIFEST.json，运行 python tools/sync-game-guidance.py --check。历史绝对路径仅供查证，不是新电脑依赖；自检、用户确认、真实手机及平台状态分别记录。
<!-- game-guidance:end -->

本仓库由两台电脑上的 Codex 共同维护。每次开始工作时必须先阅读：

1. `docs/PROJECT_STATUS.md`
2. `docs/DEVELOPMENT_WORKFLOW.md`
3. 与任务相关的产品、架构、规范和测试文档

## 开始工作前

- 运行 `git status --short --branch`，不得覆盖用户或另一台电脑的未提交改动。
- 运行 `git fetch origin --prune`，确认本机基于最新 `origin/main`。
- 检查 `docs/worklogs/active/`，不得认领已由另一电脑处理、且会修改相同文件的任务。
- 使用 `codex/pc-a/<topic>` 或 `codex/pc-b/<topic>` 分支；机器标识一经选定不得混用。
- 为任务创建唯一工作记录：`docs/worklogs/active/YYYY-MM-DD-<machine>-<topic>.md`。

## 开发约束

- 正式项目代码与运行资源只放在仓库内；辅助构建、日志和临时工具放在非系统盘的 `gptwork` 目录，不提交。
- Cocos 资源与 `.meta` 文件同步处理。
- 业务代码不得直接调用 `tt.*`，统一经过 `assets/scripts/services/` 与 `assets/scripts/platform/douyin/`。
- 修改功能、目录、发布策略或验收结果时，同步维护对应 `.md` 文档。
- 不提交缓存、构建目录、账号令牌、私钥、签名文件或本机专属配置。

## 完成工作前

- 按风险完成 TypeScript、Web Mobile 和/或抖音小游戏构建验证。
- 更新 `docs/PROJECT_STATUS.md`、`docs/TESTING.md`、`CHANGELOG.md` 以及任务工作记录。
- 将工作记录从 `active/` 移到 `completed/`，写明提交、测试、遗留问题和下一步。
- 使用 Conventional Commits，推送任务分支；验收后合并到 `main`。
- 不强制推送，不重写已经共享的提交历史。
