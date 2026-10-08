"""从原始I18工作簿生成OFL圆体字体子集；新增文案后重新执行。"""
import hashlib,json,pathlib,string,xml.etree.ElementTree as ET,zipfile
from fontTools import subset
from fontTools.ttLib import TTFont
root=pathlib.Path(__file__).resolve().parents[2]
source=root/'source_assets/fonts/maoken-zhuyuan/MaokenZhuyuanTi.ttf'
with zipfile.ZipFile(root/'design/tables/I18.xlsx') as z:
 text=''.join(e.text or '' for p in z.namelist() if p.endswith('.xml') and ('sharedStrings' in p or '/worksheets/' in p) for e in ET.fromstring(z.read(p)).iter() if e.tag.split('}')[-1] in ('t','v'))
chars=set(text+string.printable)
font=TTFont(source);cmap=font.getBestCmap()
missing=sorted(c for c in chars if ord(c) not in cmap and not c.isspace())
if missing: raise ValueError('圆体缺字：'+''.join(missing))
options=subset.Options();options.name_IDs=['*'];options.name_legacy=True;options.name_languages=['*'];options.recalc_timestamp=False
worker=subset.Subsetter(options=options);worker.populate(unicodes=[ord(c) for c in chars if ord(c) in cmap]);worker.subset(font)
for record in font['name'].names:
 if record.nameID in (1,2,3,4,6,16,17):
  value='Regular' if record.nameID in (2,17) else 'NightShiftRounded'
  record.string=value.encode(record.getEncoding())
font['head'].modified=font['head'].created
output=root/'assets/resources/fonts/night_shift_rounded.ttf';output.parent.mkdir(parents=True,exist_ok=True);font.save(output)
manifest={'format':1,'source':'source_assets/fonts/maoken-zhuyuan/MaokenZhuyuanTi.ttf','sourceSha256':hashlib.sha256(source.read_bytes()).hexdigest(),'fontSha256':hashlib.sha256(output.read_bytes()).hexdigest(),'characters':sorted(font.getBestCmap()),'tool':'fonttools 4.66.1'}
(root/'source_assets/fonts/maoken-zhuyuan/subset.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(json.dumps({'sourceBytes':source.stat().st_size,'subsetBytes':output.stat().st_size,'glyphs':len(font.getBestCmap()),'missing':missing},ensure_ascii=False))
