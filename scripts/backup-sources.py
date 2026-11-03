"""Snapshot this game and its related workspace sources without changing originals."""
from pathlib import Path
from datetime import datetime, timezone
import hashlib
import json
import os
import shutil
import unicodedata

ROOT = Path(__file__).resolve().parents[1]
WORKSPACE = ROOT.parent
SKIP_DIRS = {'.git', 'node_modules', '.cache', '.transcode-cache', '__pycache__', '.venv', 'venv'}
SKIP_FILES = {'.DS_Store', 'SOURCE_BACKUP_MANIFEST.json', 'SOURCE_BACKUP_VERIFICATION.json'}
records, excluded, missing_references = [], [], []

def digest(path):
    h = hashlib.sha256()
    with path.open('rb') as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b''):
            h.update(block)
    return h.hexdigest()

def files(base, omit_archive=False):
    for parent, dirs, names in os.walk(base):
        for name in sorted(dirs[:]):
            if name in SKIP_DIRS or omit_archive and Path(parent) == ROOT and name == 'source-archive':
                dirs.remove(name)
                excluded.append({'path': str((Path(parent) / name).relative_to(WORKSPACE)), 'reason': 'dependency, cache or repository metadata'})
        dirs.sort()
        for name in sorted(names):
            path = Path(parent) / name
            if name in SKIP_FILES or name.startswith('.env') or path.suffix == '.pyc':
                excluded.append({'path': str(path.relative_to(WORKSPACE)), 'reason': 'credential, OS metadata or generated verification file'})
                continue
            if path.is_symlink():
                raise RuntimeError(f'Review symbolic link before copying: {path}')
            yield path

def record(source, target):
    original = digest(source)
    if source != target:
        target.parent.mkdir(parents=True, exist_ok=True)
        if not target.exists() or digest(target) != original:
            shutil.copy2(source, target)
        if digest(target) != original:
            raise RuntimeError(f'Copy verification failed: {target}')
    try:
        origin, scope = str(source.relative_to(WORKSPACE)), 'workspace'
    except ValueError:
        try:
            origin, scope = str(source.relative_to(Path.home())), 'home'
        except ValueError:
            origin, scope = str(source), 'absolute'
    records.append({'path': str(target.relative_to(ROOT)), 'origin': origin, 'origin_scope': scope,
                    'bytes': source.stat().st_size, 'sha256': original, 'mode': oct(source.stat().st_mode & 0o777)})

for source in files(ROOT, omit_archive=True):
    record(source, source)
for name in ['art', 'production', 'exports', 'festival-play']:
    base = WORKSPACE / name
    for source in files(base):
        record(source, ROOT / 'source-archive' / 'workspace' / name / source.relative_to(base))
for name in ['README.md', 'index.html']:
    source = WORKSPACE / name
    if source.is_file():
        record(source, ROOT / 'source-archive' / 'workspace' / name)

# Only references explicitly supplied for this game, never unrelated Desktop files.
image_ids = [
    '4e0172ff-0ac9-437a-b693-bf8240967fdb', '8e52b222-1750-4da7-a1cd-61775326b1ed',
    '9fd16d22-a7de-478e-a9fa-ca32a59766c9', '37c2bbf5-3936-43d6-81a0-8e9ce822a4e3',
    '38a1fc4f-dc35-436d-9820-7ca07d2074da', '66a988e6-9658-4fe3-8c64-7dc24d642abe',
    '74e3cf61-42cd-45c1-a788-61c8e23f7765', '90e51633-0634-4e6f-8893-e144c210fdf5',
    '533b68ea-6e58-4d5c-b57b-e072daf76c8b', '848588cd-5bff-4b73-a7d5-1e04be808263',
    'a83e47b2-4326-4295-8003-68aeede847cb', 'dac70463-4b5d-443c-98be-be168a77c7de',
    'f1b36921-771e-4cbc-bd02-4b38dcefcd09', 'f12b5ec2-a238-4ecb-975b-8521bd837e3e',
    'f57d6d86-9217-4988-ad68-483325ba47de', '4f39aa24-9994-4a51-a7b3-065c936069f9',
    'dd0be2ae-047d-4f2d-8afb-6a345296f869', 'fbe88080-d90f-4da2-94fa-e6ad2b8e212b',
    'fe10933d-260f-423c-96bd-693f1a8c77e3', '628930b5-8e92-4c12-a328-95299b544daa',
    '510ad826-846d-4b05-8bed-7d0eeb351017', '79fda9fd-9863-4fdf-b3ea-af2a489ab2f9',
    '354e105e-2160-46f1-9e30-7c5658bf91f2']
image_base = Path.home() / '.codex/generated_images/01a0fad0-3fff-7b70-af85-9e86aa304715'
references = [(image_base / f'exec-{key}.png', Path('original-images') / f'exec-{key}.png') for key in image_ids]
references.append((Path.home() / '.codex/attachments/46e25d7d-8308-4b6c-a18d-4ea76bde1d2e/붙여넣은 텍스트.txt', Path('contest-rules.txt')))
movie_name = '시퀀스 01_27_1_prob4.mp4'
movie = next((p for p in (Path.home() / 'Desktop').iterdir() if unicodedata.normalize('NFC', p.name) == movie_name), None)
if movie:
    references.append((movie, Path('promotional-video') / movie.name))
else:
    missing_references.append(movie_name)
for source, relative in references:
    if source.is_file():
        record(source, ROOT / 'source-archive' / 'references' / relative)
    else:
        missing_references.append(str(relative))

manifest = {'version': 1, 'created_at': datetime.now(timezone.utc).isoformat(),
            'scope': 'Human Enough game project, related eve-games workspace, and explicitly supplied original art, rules and promotional video',
            'restore_mapping': 'Project files stay at repository root; source-archive/workspace mirrors the original eve-games siblings.',
            'file_count': len(records), 'total_bytes': sum(r['bytes'] for r in records),
            'files': sorted(records, key=lambda r: r['path']), 'excluded': excluded, 'unavailable_references': missing_references}
(ROOT / 'SOURCE_BACKUP_MANIFEST.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n')
print(json.dumps({k: manifest[k] for k in ['file_count', 'total_bytes']}, indent=2))
