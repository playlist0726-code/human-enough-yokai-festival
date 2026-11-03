import bpy,sys
base='/Users/gimjunsu/eve-games/yokai-festival/art/characters/roster-v02/'
env={};exec(compile(open(base+'build_roster.py').read(),'build_roster.py','exec'),env)
args=sys.argv[sys.argv.index('--')+1:]
env['setup']();env['build'](args[0],args[1])
