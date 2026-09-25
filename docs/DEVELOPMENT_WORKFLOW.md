# 两台电脑开发协作规范

目标是让两台电脑上的开发者和 Codex 只依赖 Git 就能知道“当前做到哪里、谁在做什么、下一步是什么”，并降低场景、`.meta` 和配置文件冲突。

## 1. 固定身份

- 第一台电脑使用机器标识 `pc-a`，分支前缀 `codex/pc-a/`。
- 第二台电脑使用机器标识 `pc-b`，分支前缀 `codex/pc-b/`。
- 建议分别执行 `git config --local codex.machine-id pc-a` 和 `git config --local codex.machine-id pc-b`，该值只保存在各自仓库配置中。
- Fork 客户端应显示 `origin/main` 和两台电脑推送的任务分支。

## 2. 权威信息

- `main`：唯一稳定、可构建基线。
- `docs/PROJECT_STATUS.md`：当前版本、已完成能力、已知问题与优先级。
- `docs/worklogs/active/`：正在进行的任务；每个文件只由认领它的电脑维护。
- `docs/worklogs/completed/`：已合并任务的交接和验证记录。
- `docs/PROJECT_STANDARDS.md`：分辨率、目录、命名、资源与性能规范。

聊天记录、某台电脑的本地文件和未推送提交都不是另一台电脑可见的权威状态。

## 3. 开始任务

```powershell
git status --short --branch
git fetch origin --prune
git switch main
git pull --ff-only origin main
git switch -c codex/pc-a/topic-name
```

电脑 B 将 `pc-a` 替换为 `pc-b`。随后在 `docs/worklogs/active/` 新建唯一任务文件并先提交、推送一次，完成任务认领。认领内容至少包括：目标、范围、预计修改文件、验收条件和潜在冲突。

开始编码前必须检查远端活动分支和工作记录。若两个任务会改同一场景、Prefab、`.meta`、`project.json` 或核心脚本，应串行处理，后认领者等待前一个任务合并。

## 4. 开发与同步

- 一个分支只完成一个主题，提交保持可理解、可回滚；提交信息使用标准类型前缀加中文说明。
- 新增或修改代码时，用中文注释解释必要的业务规则、非直观计算和平台限制，不为显而易见的语句堆叠无效注释。
- 项目 `.md` 文档统一使用中文，API、代码标识符和必要英文专有名词除外。
- 每个可运行节点都可以推送到自己的任务分支，避免进度只存在本机。
- 需要接续另一台电脑的任务时，先由原电脑推送全部提交并更新工作记录，再由接续电脑拉取同一分支。
- 不通过网盘复制整个 Cocos 项目来同步；`library/`、`temp/`、`build/` 等缓存由每台电脑自行生成。
- 同一资源的文件与 `.meta` 必须成对提交，禁止在两台电脑分别重建同名资源。

## 5. 验收与合并

任务完成后：

1. 拉取最新 `origin/main`，在任务分支中合并或变基并解决冲突。
2. 完成与风险匹配的 TypeScript、Web Mobile、抖音小游戏构建和人工试玩。
3. 更新 `PROJECT_STATUS.md`、`TESTING.md`、`CHANGELOG.md` 和相关规范。
4. 将任务记录移到 `docs/worklogs/completed/`，填写最终提交、测试结果和遗留项。
5. 推送任务分支，使用 Fork 或命令行审查差异。
6. 合并到 `main` 并推送；另一台电脑执行 `git pull --ff-only origin main`。

若没有代码托管平台的分支保护，默认由完成验收的电脑担任本次集成者。集成者合并前必须确认远端 `main` 没有新提交。

## 6. 冲突处理

- 禁止用 `git reset --hard`、强制推送或整文件覆盖来“解决”共享冲突。
- `.scene`、`.prefab`、`.meta` 和 Cocos 设置冲突优先由最了解该改动的一方处理，并重新用 Creator 打开和构建验证。
- 发现双方修改范围重叠时，暂停后开始的任务，在工作记录中说明依赖，等待前置分支合并后再继续。
- 无法确认应保留哪一方时，不自行猜测；保留双方分支并在合并前确认。

## 7. 工作记录模板

```markdown
# <任务名称>

- 状态：进行中 / 待验收 / 已完成 / 阻塞
- 机器：pc-a 或 pc-b
- 分支：codex/<machine>/<topic>
- 开始日期：YYYY-MM-DD
- 目标：
- 修改范围：
- 预计修改文件：
- 验收条件：
- 当前进度：
- 测试结果：
- 提交：
- 遗留问题与下一步：
```
