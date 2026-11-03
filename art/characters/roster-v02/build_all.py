"""Isolate Blender jobs: one native source file and GLB per character."""
import subprocess, pathlib,json,time
BASE=pathlib.Path('/Users/gimjunsu/eve-games/yokai-festival')
HERE=BASE/'art/characters/roster-v02'
ids=['mizu','pon','kon','sumi','nemu','akari','kasa']
jobs=[(i,f) for f in ['yokai','human'] for i in ids]+[(f'guest-{i}','guest') for i in range(9)]
results=[]
for id,form in jobs:
 key=id+'_'+form;start=time.monotonic()
 with (HERE/(key+'.log')).open('w') as log:
  p=subprocess.run(['/Applications/Blender.app/Contents/MacOS/Blender','--background','--factory-startup','--python',str(HERE/'run_one.py'),'--',id,form],stdout=log,stderr=subprocess.STDOUT)
 file=BASE/'public/assets/models'/(key+'.glb')
 ok=p.returncode==0 and file.exists()
 results.append({'key':key,'ok':ok,'bytes':file.stat().st_size if file.exists() else 0,'url':'/assets/models/'+key+'.glb','source':key+'/'+key+'.blend'})
 print(key, 'OK' if ok else 'FAILED',round(time.monotonic()-start,1),flush=True)
 manifest={'version':'blender-roster-v02','models':results}
 (HERE/'manifest.json').write_text(json.dumps(manifest,indent=2))
 (BASE/'public/assets/models/manifest.json').write_text(json.dumps(manifest,indent=2))
 if not ok:print((HERE/(key+'.log')).read_text()[-2000:],flush=True)
print('Complete:',sum(r['ok'] for r in results),'/',len(results),flush=True)
