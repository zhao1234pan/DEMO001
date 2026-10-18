# 冒险30关与挑战10专题扩展

- 状态：进行中
- 机器：pc-a
- 分支：codex/pc-a/expand-adventure-challenge
- 开始日期：2026-10-18
- 基线：971deb6，已包含 origin/main；保留现有未合并任务历史。
- 目标：冒险30关、挑战10专题，沿用现有波次、经验补给与选关形式；新增怪物/首领同步实际出怪、图鉴和独立PNG。
- 修改范围：原始配置表、导表、关卡阵容存档兼容、资源和必要UI；试玩构建及美术索引。
- 预计修改文件：Level/Map/MapPoint/Spot/Wave/WaveGroup/LevelLoadout/ChallengeRule/ChallengeTopic/Enemy/Collection/ArtFrame/VisualSkin/I18/Global/UiLayout原始XLSX与客户端CSV，LevelLoadout、GM界面、相关验证工具及文档。
- 验收条件：30个冒险关、10个30波挑战专题；新敌人实际出现且图鉴可发现；旧专题进度与阵容兼容；配置校验、TypeScript、构建及分页视觉复核通过。
- 当前进度：已检查干净工作区、远程归属和活动认领；正在审计编号及存档关系。
- 测试边界：进行必要功能与资源校验，不进行整局数值平衡模拟或30波通关宣称。
- 潜在冲突：配置表、核心关卡及资源索引需串行修改；无其他活动任务。
