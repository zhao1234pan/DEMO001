# 客户端配置导表

原始表格：`design/tables/*.xlsx`。运行配置：`assets/resources/config/*.csv`。

安装Node.js与JDK21后，双击本目录“导出客户端配置.bat”，或在仓库根目录执行 `npm run config:export`。构建扩展会自动执行检查，也可以在构建前执行 `npm run config:check`，过期配置会阻止检查通过。工具不生成服务端配置，不依赖原biu_design目录。

原始表前五行依次为：说明、client、类型、中文字段名、英文字段名；第六行起为数据，第一列必须为正整数id。字符串字段支持逗号、双引号和换行。逻辑键使用key列，引用字段不可随意改名。具体表关系和新增流程见[配置规范](../../docs/CONFIGURATION.md)。

运行依赖与来源：vendor/zz-excel2csv.jar复制自用户指定工具；ClientExport.java复用其中Apache POI Excel解析能力，沿用五行表头，客户端入口移除原项目服务端/JSON/TS输出和固定目录依赖。JAR仅删除原MANIFEST中无效的Class-Path（.;libs/*），类文件内容未改。原SHA256=b92b91e040744e755000fe3b42a3d94a041e6c0eac3eb89dcae2f0ccdfe73040；修订SHA256=fad61b492ba5738a5329f155c433d9ee4dbfb7e3235c03627cf3f492db04b1d9。原参考项目未修改。

validator.cjs由assets/scripts/config/ConfigTables.ts生成，共用游戏校验算法；更改算法后运行 `node tools/config/regenerate-validator.cjs <本机TypeScript模块目录>`。schema.json记录程序消费的字段协议，不保存游戏数值。日志和暂存文件默认放仓库所在盘gptwork/config-export，可用CONFIG_WORK_DIR覆盖。

新增项目复用见[移植步骤](./NEW_PROJECT.md)。运行 npm run config:test 可在隔离副本验证过期表、手改CSV和不同步校验器均会被拒绝，正式表不受影响。
