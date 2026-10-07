# 用户新版UI源资源（开发检查点）

2026-10-07。用户原始十一份设计在references；所有最终选定生成源PNG在本目录，使用内置imagegen生成，无API或CLI替代。inputs.json列出源文件映射，catalog.json记录37张新增运行资产的分类与九宫信息。当前项目204张运行PNG，不代表Draw Call已降低。

风格依据：蓝天城市便利店、薄荷绿庭院、金橙/奶油面板、暖棕描边、圆润动物与商品。首页／加载背景移除交互UI与进度数字；UI工具包不烘焙业务文本；8名店员、6小怪、4首领、16进化、9商品、32强化图标独立切图，保留透明度；缺失弹窗沿用统一皮肤。加载品牌Logo是用户参考的美术标志，其他文字为Label/I18。

生成指令的完整逐项归档尚待接续补齐，当前保存风格和资产约束摘要，不冒充逐字原始提示词。前版Prefab源基线在prefab_baseline，供布局作者工具重复生成。

作者工具tools/art/import-redesign.cjs读取项目内源图，切图尺寸和九宫读取VisualSkin.csv，替换保持UUID；tools/ui/apply-redesign.cjs会还原基线再应用新版布局，之后需重新导表。常规构建不重导美术。资源用途和当前验证边界见docs/UI_REDESIGN_HANDOFF.md。
