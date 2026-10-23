# UI离线对照工具

用途是定位可见尺寸、裁切、层级和截图变化。它不启动浏览器、不读取玩家存档、不把离线合成当作真实引擎画面。

依赖采用GitHub项目[Sharp](https://github.com/lovell/sharp)（Apache-2.0）、[Pixelmatch](https://github.com/mapbox/pixelmatch)（ISC）及[PNGJS](https://github.com/pngjs/pngjs)（MIT）。版本固定在本目录package.json，只用于作者工具，不进入客户端。可以在本目录安装依赖；本轮使用本机已提供的相同版本，没有下载或运行不明的一键安装脚本。

## 工作顺序

1. 保留用户已确认的原设计图与实际运行截图；为每个页面／状态分别命名。冻结参考基线不会自动覆盖。
2. PNG仍是独立资源，文字仍用Label。先测量PNG的可见边界，再更新ArtFrame／VisualSkin原始XLSX的contentX／contentY／contentWidth／contentHeight。坐标原点为PNG左上，单位像素；alpha阈值8是测量协议，不删除或裁切任何像素。
3. UiLayout中的imageFit选择canvas、content或feet，imageFill指定内容占比。已确认首页和圆形头像使用canvas／1；完整立绘可选择feet；普通图标使用content。不同用途不能不加区分地全部放大。
4. UiImage的ImageArtwork子节点负责图像，外层节点保留布局、点击和角色移动。ImageArtwork必须先于携带物、状态与文字绘制；旧外层Sprite禁画，避免重复图像。
5. 导表、检查、运行与逐页截图对照。运行截图应保持相同引擎／视口／数据状态；动态内容需明确排除区域，不能把错误区域一并屏蔽。尺寸不同的图不会静默拉伸。

## 命令

```powershell
# 测量单张PNG，输出结果供原始XLSX作者更新
node tools/art/content-bounds.cjs <PNG路径>
# 全312条资源绑定、全部37套Prefab、图像槽位与图标前后对照
node tools/ui/visual-review.cjs G:/gptwork/ui-review
# 参考图与同尺寸实际截图的像素差分；不自动给出“更好”的结论
node tools/ui/visual/compare.cjs <参考PNG> <实际PNG> G:/gptwork/ui-diff
# 已知单像素变化与输入保护回归
node tools/ui/visual/test-compare.cjs
```

部署到其他电脑时按package.json安装工具依赖，不把本机依赖绝对路径写入项目。依赖通过正常Node模块解析或当前进程的NODE_PATH提供，不修改系统环境。

## 结果解释

- review.json保存资源签名、可见边界、37个Prefab的覆盖清单、93个图像槽位和对照测量。
- contact sheet只用于检查PNG完整性，Before／After图是同一源PNG在两种适配算法下的离线控件预览。
- comparison.json／diff.png只报告变动像素；变化少不代表更美观，也不表示更接近原设计。不能用当前有缺陷的截图直接建立新“正确”基线。
- 资源检查能发现改图后未更新边界、重复绘制和层级错误；缺了耳朵、错误的角色构图、字色不符等语义问题仍必须对照原设计逐项复核。
