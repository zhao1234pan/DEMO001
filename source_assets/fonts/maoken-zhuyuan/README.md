# 圆体字体来源与导出

- 作者原始文件：MaokenZhuyuanTi.ttf，猫啃珠圆体 Version 1.00。
- 官方来源：https://www.maoken.com/freefonts/17948.html 。下载链接由该页面提供，完整OFL.txt/OFL_ZHS.txt随源文件归档。
- 游戏运行字体：assets/resources/fonts/night_shift_rounded.ttf。基于原始I18.xlsx的全部字符与ASCII生成子集，改名NightShiftRounded；所有Label通过UiLayout.fontPath绑定真实TTFFont，关闭系统字体和模拟加粗。
- fontTools 4.66.1：执行 tools/art/export-font.py，之后执行客户端导表。导表检查来源/子集签名、全部I18字符覆盖；不安装系统字体，不依赖微信或抖音设备字体。
- 字体子集用于游戏文字；PNG用于美术与装饰。字体保留著作权与OFL声明。
