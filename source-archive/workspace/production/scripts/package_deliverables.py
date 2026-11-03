from pathlib import Path
import zipfile,json,shutil
P=Path(__file__).resolve().parents[2]
report=json.loads((P/'production'/'quality_report_v01.json').read_text())
if len(report['clips'])!=91 or report['missing']:raise RuntimeError('Do not package an incomplete delivery')
files=[P/'index.html',P/'README.md']
files+=list((P/'art').rglob('*'))
for dirname in ['models','scripts','hyperframes','previews']:
    files+=list((P/'production'/dirname).rglob('*'))
files += list((P/'production').glob('*.md'))+list((P/'production').glob('*.json'))
files += list((P/'production'/'animations').glob('*/*.webm'))+list((P/'production'/'animations').glob('*/*.mp4'))+list((P/'production'/'animations').glob('*/*.json'))+list((P/'production'/'animations').glob('*/*/metadata.json'))
z=P/'production'/'eve_games_art_motion_v01.zip'
with zipfile.ZipFile(z,'w',zipfile.ZIP_DEFLATED,compresslevel=6) as pack:
    for f in sorted(set(files)):
        if not f.is_file() or f.suffix in ('.blend1','.log','.pyc') or '.hyperframes' in f.parts or '__pycache__' in f.parts:continue
        pack.write(f,'eve-games/'+str(f.relative_to(P)))
with zipfile.ZipFile(z) as pack:
    if pack.testzip():raise RuntimeError('Archive CRC check failed')
print(json.dumps({'file':str(z),'bytes':z.stat().st_size,'entries':len(zipfile.ZipFile(z).namelist())}))
