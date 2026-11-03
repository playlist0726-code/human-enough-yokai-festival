from pathlib import Path
from PIL import Image,ImageChops,ImageStat,ImageDraw
import json,subprocess
P=Path(__file__).resolve().parents[2];A=P/'production'/'animations';OUT=P/'production'/'previews'
CAST=['mizu','pon','kon','sumi','nemu','akari','kasa']
ACT=['idle','walk_front','walk_back','walk_left','walk_right','drink','charm_start','charm_loop','cover','reveal','panic','arrive','success']
report={'bases':[],'clips':[],'missing':[]}
for id in CAST:
    f=P/'art'/id/(id+'_base_v01.png')
    if not f.exists():report['missing'].append(str(f));continue
    im=Image.open(f);alpha=im.getchannel('A') if im.mode=='RGBA' else None
    report['bases'].append({'character':id,'size':im.size,'mode':im.mode,'alpha_extrema':alpha.getextrema() if alpha else None,'bounds':alpha.getbbox() if alpha else None})
sheet=Image.new('RGB',(13*130,7*160),(243,238,229));draw=ImageDraw.Draw(sheet)
for row,id in enumerate(CAST):
    for col,action in enumerate(ACT):
        folder=A/id/(id+'_'+action+'_v01');meta=folder/'metadata.json';video=folder.parent/(folder.name+'.webm')
        if not meta.exists() or not video.exists():report['missing'].append(id+'_'+action);continue
        r=json.loads(meta.read_text());frames=sorted(folder.glob('frame_*.png'));n=r['end']-r['start']+1
        info=json.loads(subprocess.check_output(['/opt/homebrew/bin/ffprobe','-v','quiet','-show_streams','-show_format','-of','json',str(video)]))
        stream=info['streams'][0];alpha_tag=stream.get('tags',{}).get('alpha_mode','0')
        first=Image.open(frames[0]).convert('RGBA');last=Image.open(frames[-1]).convert('RGBA');diff=ImageStat.Stat(ImageChops.difference(first,last)).mean
        middle=Image.open(frames[len(frames)//2]).convert('RGBA');middle.thumbnail((124,130));tile=Image.new('RGBA',(130,130),(243,238,229,255));tile.alpha_composite(middle,((130-middle.width)//2,(130-middle.height)//2));sheet.paste(tile.convert('RGB'),(col*130,row*160+22))
        draw.text((col*130+4,row*160+4),id+' / '+action,fill=(44,64,51))
        alpha=middle.getchannel('A');bounds=Image.open(frames[len(frames)//2]).getchannel('A').getbbox()
        rec={'character':id,'action':action,'frames':len(frames),'expected_frames':n,'dimensions':[stream['width'],stream['height']],'fps':stream.get('r_frame_rate'),'duration':float(info['format']['duration']),'alpha_mode':alpha_tag,'loop':r['loop'],'loop_endpoint_mean_diff':diff if r['loop'] else None,'midpoint_bounds':bounds}
        report['clips'].append(rec)
        if len(frames)!=n or alpha_tag!='1' or rec['dimensions']!=[512,512]:report['missing'].append('invalid '+id+'_'+action)
OUT.mkdir(exist_ok=True);sheet.save(OUT/'motion_contact_sheet_v01.jpg',quality=92)
(P/'production'/'quality_report_v01.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))
print(json.dumps({'base_images':len(report['bases']),'clips':len(report['clips']),'missing':report['missing'],'contact_sheet':str(OUT/'motion_contact_sheet_v01.jpg')},ensure_ascii=False))
