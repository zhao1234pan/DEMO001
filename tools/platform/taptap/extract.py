"""只在新的构建目录解压已验签的官方转换器，不允许路径穿越或链接。"""
import pathlib, stat, sys, zipfile

archive = pathlib.Path(sys.argv[1]).resolve()
target = pathlib.Path(sys.argv[2]).resolve()
if target.exists():
    raise ValueError("解压目录必须是新的临时目录")
with zipfile.ZipFile(archive) as z:
    for item in z.infolist():
        destination = (target / item.filename).resolve()
        if not destination.is_relative_to(target) or stat.S_ISLNK(item.external_attr >> 16):
            raise ValueError("拒绝越界路径或链接：" + item.filename)
    z.extractall(target)
