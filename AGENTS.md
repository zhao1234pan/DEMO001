# Codex 项目协作指令

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
- Git 提交信息使用 Conventional Commits 类型前缀加中文说明，例如 `feat: 优化关卡路线与塔位交互`。
- 新增和修改的必要代码注释使用中文，重点解释业务规则、非直观计算、平台限制和容易误改的设计原因。
- 项目 `.md` 文档使用中文；英文专有名词、API 名称和代码标识符可以保留。
- 修改功能、目录、发布策略或验收结果时，同步维护对应 `.md` 文档。
- 不提交缓存、构建目录、账号令牌、私钥、签名文件或本机专属配置。

## 完成工作前

- 按风险完成 TypeScript、Web Mobile 和/或抖音小游戏构建验证。
- 更新 `docs/PROJECT_STATUS.md`、`docs/TESTING.md`、`CHANGELOG.md` 以及任务工作记录。
- 将工作记录从 `active/` 移到 `completed/`，写明提交、测试、遗留问题和下一步。
- 使用 Conventional Commits，推送任务分支；验收后合并到 `main`。
- 不强制推送，不重写已经共享的提交历史。
