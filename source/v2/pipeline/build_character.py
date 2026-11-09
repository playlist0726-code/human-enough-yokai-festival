"""Run the whole pipeline for one or more configs, downloading generator results when missing.

  .venv-bpy/bin/python source/v2/pipeline/build_character.py <config.json> [more configs] [--from clean|rig|animate|export]

Configs with a `select` key are reveal props (reveal_prop.py); everything else is a character
(clean_character -> rig_contract -> animate_contract -> export_contract). `raw` files that are missing
are fetched from `raw_url` (Higgsfield results are permanent URLs; job ids live in provenance.json).
Each stage runs in its own process so a crash in one never leaves a half-saved .blend behind.
"""
import json, os, subprocess, sys, urllib.request
HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HERE, '..', '..', '..'))
PY = sys.executable
STAGES = ['clean', 'rig', 'animate', 'export']
SCRIPT = {'clean': 'clean_character.py', 'rig': 'rig_contract.py', 'animate': 'animate_contract.py', 'export': 'export_contract.py'}


def fetch(cfg):
    raw = os.path.join(REPO, cfg['raw'])
    if os.path.exists(raw) or not cfg.get('raw_url'):
        return
    os.makedirs(os.path.dirname(raw), exist_ok=True)
    print('[build] downloading', cfg['raw_url'], flush=True)
    urllib.request.urlretrieve(cfg['raw_url'], raw)


def main():
    args = sys.argv[1:]
    start = 'clean'
    if '--from' in args:
        i = args.index('--from'); start = args[i + 1]; del args[i:i + 2]
    for path in args:
        cfg = json.load(open(os.path.join(REPO, path)))
        if 'select' in cfg:
            subprocess.run([PY, os.path.join(HERE, 'reveal_prop.py'), path], check=True, cwd=REPO)
            continue
        if cfg.get('extends'):
            base = json.load(open(os.path.join(REPO, cfg['extends'])))
            cfg = {**base, **cfg}
        fetch(cfg)
        for st in STAGES[STAGES.index(start):]:
            print(f'[build] {cfg["id"]}: {st}', flush=True)
            subprocess.run([PY, os.path.join(HERE, SCRIPT[st]), path], check=True, cwd=REPO)


if __name__ == '__main__':
    main()
