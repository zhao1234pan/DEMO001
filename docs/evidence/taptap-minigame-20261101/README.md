# Cocos转Tap小游戏证据

2026-11-01。构建、工具检查、上传与宿主游玩分开记录。

- production-package.json：Cocos微信构建→官方1.2.2转换，1056文件与SHA清单；仅构建时快照，其中platformUploaded=false不是后续平台状态。
- build-tool-checks.json：安全解压正常路径/越界路径/符号链接三项；另有Node/Python语法、版本读取和输出目录边界检查。
- upload-preview.json / upload-result.json：Tap包上传预览与解析产物结果。只拿到artifact不能当作开发包已存在。
- parse-status.json / created-development-version.json / development-packages.json：产物35285解析通过，创建1.26.0开发包409713，回读stage=dev、publish_time=0。
- platform-result.json：最新结论摘要；开发包已上传，未提审/上线；没有改资料页绑定。
- selftest-qr-error.json：请求409713自测二维码返回422“该应用的自测能力已被封禁”。没有二维码PNG，未用其它接口或账号绕过，未声称手机可玩。

未存储OAuth令牌、直传凭据或签名上传URL。需要平台解除应用自测限制后继续真实宿主验收。
