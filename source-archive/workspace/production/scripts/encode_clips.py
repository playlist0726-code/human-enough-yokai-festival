from pathlib import Path
import json, subprocess, time, os, sys
from concurrent.futures import ThreadPoolExecutor
P=Path(__file__).resolve().parent.parent
FFMPEG='/opt/homebrew/bin/ffmpeg'
FORCE_IDS=set()
def encode(meta):
    r=json.loads(meta.read_text());folder=meta.parent;dest=folder.parent/r['file'];preview=dest.with_name(dest.stem+'_preview.mp4')
    if r['character'] not in FORCE_IDS and dest.exists() and preview.exists():return str(dest)
    args=['-y','-v','error','-framerate',str(r['fps']),'-start_number',str(r['start']),'-i',str(folder/'frame_%04d.png')]
    tmp=dest.with_name(dest.stem+'.tmp.webm')
    subprocess.run([FFMPEG,*args,'-c:v','libvpx-vp9','-pix_fmt','yuva420p','-auto-alt-ref','0','-lossless','1','-b:v','0','-cpu-used','5','-threads','2',str(tmp)],check=True)
    os.replace(tmp,dest)
    temp=preview.with_name(preview.stem+'.tmp.mp4')
    subprocess.run([FFMPEG,*args,'-f','lavfi','-i',f"color=c=0xf3eee5:s={r['size'][0]}x{r['size'][1]}:r={r['fps']}",'-filter_complex','[1:v][0:v]overlay=shortest=1,format=yuv420p','-c:v','libx264','-crf','19','-preset','fast','-threads','2','-movflags','+faststart',str(temp)],check=True)
    os.replace(temp,preview)
    r['webm_bytes']=dest.stat().st_size;r['preview_bytes']=preview.stat().st_size
    (folder/'metadata.json').write_text(json.dumps(r,ensure_ascii=False,indent=2))
    print('ENCODED '+dest.name,flush=True);return str(dest)
def main(watch):
    complete=set();started=time.time();pool=ThreadPoolExecutor(max_workers=3)
    while True:
        metas=list((P/'animations').glob('*/*/metadata.json'))
        todo=[m for m in metas if str(m) not in complete]
        for m,out in zip(todo,pool.map(encode,todo)):complete.add(str(m))
        state={'complete':len(complete),'expected':91,'status':'complete' if len(complete)==91 else 'rendering','elapsed_seconds':round(time.time()-started)}
        (P/'encoding_status.json').write_text(json.dumps(state))
        if len(complete)==91 or not watch:print(json.dumps(state),flush=True);break
        if time.time()-started>43200:raise RuntimeError('Rendering incomplete after twelve hours')
        time.sleep(4)
if __name__=='__main__':main('--watch' in sys.argv)
