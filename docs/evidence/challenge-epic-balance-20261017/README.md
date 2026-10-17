# 挑战长局验收（2026-10-17）

版本1.13.0，基线44be9a1，任务分支codex/pc-a/challenge-epic-balance。目标、配置与指标解释见[挑战长局设计](../../CHALLENGE_EPIC_BALANCE.md)。

## 原始报告

- [194项回归](automated-checks.json)：配置31、资源12、挑战30、专题5、经营58、交互21、表现15、图鉴15、排行榜7；严格TypeScript、配置／Prefab门禁同时通过。
- [26关自动通关](playthrough-results.json)：实际GameRoot，冒险1倍、挑战3倍；默认阵容，种子42，持续建设升级和科技优先策略，挑战十次选卡完整。
- [八成塔位六专题](final-positive.json)：floor(塔位×0.82)，17/21或18/22；全部通关，3倍速863～922秒，来客8626～8633，峰值80～119。
- [18个负面对照](negative-results.json)：约55%塔位、不升级、跳过额外科技的各六专题全部失败；专题初始规则仍生效。该报告方案verify=false，[矩阵断言](matrix-checks.json)另外核对每个预期结果。
- [另一个种子](seed-check-results.json)：种子7、全图、六专题全部通关，859～930秒。没有遍历所有阵容与种子的通关率。
- [60帧步进](fps-check-results.json)：21／26八成策略879／871秒胜利；23／24八成在15波失败。[多一个塔位](fps-extra-results.json)约86%投入后，两关858／820秒胜利。现有子步拆分和计时取整会产生差异，本轮没有改全局时钟；13:40～15:30是这些成功策略的观察范围，没有保证每种设备严格900秒或80%一定通关。
- [旧基线](baseline.json)与[旧半图对照](before-compare-results.json)：旧版本192～229秒，21／24／26半图也胜利；原基线未统一塔位限制，仅作问题量化。
- [原始七表差异](config-changes.json)：先原始XLSX设计，再导出CSV、manifest和字体，空字符串／Excel空白按同语义回读；原始表渲染与完整导出日志留G:/gptwork/challenge-epic-balance。
- [冒险范围](adventure-scope.json)：Level20行、Wave83行、WaveGroup353行逐项等于基线44be9a1。
- [最终检查](final-checks.json)：严格类型、39表／36Prefab／2610节点，两Web包Finished、39CSV逐字相同；Creator仍退出36，原始诊断保留在G:/gptwork/challenge-epic-balance/*-build.*.log。

## 实际画面

- [390×844怪群](live-crowd-3x.png)与[后续怪潮](crowd-followup.png)：4357隔离存档，真实首轮选卡、五店员建造、3倍速持续出怪。两帧桌面引擎统计60 FPS，Draw46／45、帧耗2.22／2.24ms，纹理约280MB。统计仅为初期采样，不能作为后期满图或手机性能结论。
- [早期尝试失败](first-layout-loss-profiler.png)：操作间隔期间战斗推进，未及时布置／升级，首波失败；保留失败画面，不把它作为成功通关或持续高负载采样。
- [正式1280×720专题页](release-topics-1280x720.png)：长局说明、首专题开放和后续锁定完整；即使URL带perf=1，正式包也没有统计或GM。
- [玩家原入口](player-preview-home.png)：4344刷新显示3倍速约15分钟；已有4关进度和经营余额保留，未代玩家购买、修改商品或重置存档。
- [浏览器错误](browser-errors.json)：三个来源error为空。没有六专题真人全局或实体手机验收；自动策略时长不包含选卡思考、暂停或广告。

## 试玩与同步

[试玩信息](preview-info.json)：先完整备份1.12.0包，再复制最终产物；924文件SHA256一致，原4344进程和同源存储保留。[17项HTTP资源](http-checks.json)与最终包一致。入口http://127.0.0.1:4344/只在本机可用；未发布平台或合并main。

经营金币仅记录了用户确认的长期方向：经营成长＋解锁店员／科技选择范围，具体新解锁交易未在本轮实现。
