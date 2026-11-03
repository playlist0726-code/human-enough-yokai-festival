"""Verify every recorded file, including hydrated Git LFS content, after cloning."""
from pathlib import Path
import argparse
import hashlib
import json

parser = argparse.ArgumentParser()
parser.add_argument('--compare-originals', action='store_true')
args = parser.parse_args()
root = Path(__file__).resolve().parents[1]
manifest = json.loads((root / 'SOURCE_BACKUP_MANIFEST.json').read_text())

def digest(path):
    h = hashlib.sha256()
    with path.open('rb') as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b''):
            h.update(block)
    return h.hexdigest()

failures = []
for item in manifest['files']:
    path = root / item['path']
    if not path.is_file() or path.stat().st_size != item['bytes'] or digest(path) != item['sha256']:
        failures.append(item['path'])
    if args.compare_originals:
        scope = item.get('origin_scope', 'workspace')
        original = (root.parent if scope == 'workspace' else Path.home() if scope == 'home' else Path('/')) / item['origin']
        if not original.is_file() or digest(original) != item['sha256']:
            failures.append('original:' + item['origin'])
result = {'ok': not failures, 'files_checked': len(manifest['files']), 'bytes_checked': manifest['total_bytes'],
          'originals_compared': args.compare_originals, 'failures': failures}
print(json.dumps(result, indent=2))
if failures:
    raise SystemExit(1)
