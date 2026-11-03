import subprocess,pathlib,json
root=pathlib.Path(__file__).resolve().parent
old=json.loads((root.parent/'roster-v02'/'manifest.json').read_text())
results=[]
for item in old['models']:
 key=item['key']
 with (root/(key+'.log')).open('w') as log:
  result=subprocess.run(['/Applications/Blender.app/Contents/MacOS/Blender','--background','--factory-startup','--python',str(root/'refine_rigs.py'),'--',key],stdout=log,stderr=subprocess.STDOUT)
 if result.returncode:raise RuntimeError('Could not refine '+key)
 detail=json.loads((root/key/'deformation.json').read_text())
 results.append(dict(item,bytes=(root/key/(key+'.glb')).stat().st_size,deformation=detail['meshes'],bones=detail['bones']))
 print('Saved',key,flush=True)
(root/'manifest.json').write_text(json.dumps({'version':'blender-roster-v03-weighted','models':results},indent=2))
