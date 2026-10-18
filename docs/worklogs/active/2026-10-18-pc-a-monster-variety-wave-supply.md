# 怪物扩充、冒险收紧与逐波补给

- 状态：进行中
- 机器：pc-a
- 分支：codex/pc-a/monster-variety-wave-supply
- 开始日期：2026-10-18
- 基线：8fc58f76e009d45278779d8100bd0b51ff29214f，origin/main为祖先，无其他active任务。
- 用户要求：怪物至少20种，部分可仅外观变化；冒险初始金币减半、怪物血量翻倍；夜班补给30次，每波一次。
- 计划：新增14种独立PNG普通怪，合计20普通怪及4首领；原表管理属性／图鉴／资源／出怪分配。冒险20关Level初始金币减半向下取整、enemyHealthScale翻倍；挑战开局及每次波间补给共30次，解决30次抽卡候选耗尽问题。
- 修改范围：Enemy／Level／WaveGroup／ChallengeRule／ChallengePerk／ArtFrame／Collection／I18／Global原始XLSX及CSV／manifest；必要读表协议与素材导入，不清理存档、不改平台发布。
- 验证：配置导出／候选池边界／类型检查、Web Mobile构建、必要新素材实机页面复核与HTTP核验；不重复完整30波平衡试玩或全关模拟。
- 资源：内置图像生成工具逐张制作透明PNG，源图／提示词／来源／meta入库，辅助脚本与日志放G:/gptwork。
- 提交：先认领、后推任务分支并核对远端SHA，不合并main。
