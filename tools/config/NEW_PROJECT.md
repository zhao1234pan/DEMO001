# 在后续项目复用配置流程

先确认该项目的功能和实体，再设计XLSX；不要先硬编码一版再搬表。保留本项目AGENTS中的“配置表优先”约定。

1. 复制tools/config（包含vendor里的JAR）和五行表头规范到新仓库；保持design/tables与客户端CSV目录均在该仓库。
2. 复用ClientExport.java的通用Excel解析与CSV转义。按新项目实体重建schema和原始XLSX；本项目17表是游戏业务设计，不要求其他项目照搬全部表。
3. 移植CSV解析/加载器，替换ConfigTables中的业务引用和范围校验；为同一核心生成命令行validator，不能单独手改两套规则。
4. 若新项目资源目录或引擎不同，调整export.cjs的资源存在性校验、CSV输出路径和构建接入；不要保留本游戏ArtAtlas/Audio路径假设。
5. 复制.gitattributes的XLSX/JAR binary及CSV/脚本LF规则；在构建前接入config:check，CI也执行该命令。
6. 验证合法导出、坏值拒绝、过期表拒绝、失败不覆盖四类路径；原始XLSX、工具、CSV、manifest一并提交。

仅保留客户端配置。新增文本先进入I18；资源、解锁、活动条件等按实际需求建表，不借通用化预建服务器或额外系统。新项目也必须在配置规范中说明保留的技术常量。
