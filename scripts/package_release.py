#!/usr/bin/env python3
"""Package a clean, offline-runnable MuscleMap release with per-file SHA-256 hashes."""
import argparse
import hashlib
import json
import zipfile
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
ROOT_FILES=['.gitattributes','.gitignore','README.md','THIRD_PARTY_NOTICES.md','anatomy-license.md','plan.md','TODO.md','app.config.ts','index.html','package.json','pnpm-lock.yaml','pnpm-workspace.yaml','tsconfig.json','vite.config.ts','vitest.config.ts','playwright.config.ts']
DIRS=['src','public','dist','scripts','tests','docs','data/raw','data/companion','assets/anatomy-source/metadata']
EXTRA=['data/expected-results.json','assets/anatomy-source/musclemap-source-subset.zip','assets/anatomy-source/subset-manifest.json']

def selected():
    files={ROOT/f for f in ROOT_FILES+EXTRA if (ROOT/f).is_file()}
    for name in DIRS:
        directory=ROOT/name
        if directory.exists():files.update(p for p in directory.rglob('*') if p.is_file())
    return sorted(p for p in files if not any(x in p.parts for x in ['__pycache__','.git','node_modules','.pytest_cache','.vite']) and p.suffix not in ['.pyc','.tsbuildinfo'] and not p.name.startswith('.env'))

def main():
    ap=argparse.ArgumentParser(description=__doc__);ap.add_argument('--output',type=Path,default=ROOT.parent/'MuscleMap_Complete_Release.zip');args=ap.parse_args()
    if not (ROOT/'dist/index.html').is_file():raise SystemExit('Build dist first: pnpm run build')
    files=selected()
    forbidden=[p for p in files if 'data/companion' in str(p) and p.suffix=='.csv']
    if forbidden:raise SystemExit('Raw companion clinical/measurement payloads must not be packaged')
    manifest={'project':'MuscleMap','version':json.loads((ROOT/'package.json').read_text())['version'],'files':[{'path':str(p.relative_to(ROOT)),'bytes':p.stat().st_size,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()} for p in files],'excluded':['node_modules','.git','secrets','temporary test traces','full unused anatomical archives','raw companion clinical records']}
    output=args.output.resolve();output.parent.mkdir(parents=True,exist_ok=True)
    with zipfile.ZipFile(output,'w',zipfile.ZIP_DEFLATED,compresslevel=6) as archive:
        for p in files:archive.write(p,'MuscleMap/'+str(p.relative_to(ROOT)))
        archive.writestr('MuscleMap/RELEASE_MANIFEST.json',json.dumps(manifest,indent=2)+'\n')
    with zipfile.ZipFile(output) as archive:
        if archive.testzip():raise SystemExit('ZIP CRC integrity check failed')
        for entry in manifest['files']:
            if hashlib.sha256(archive.read('MuscleMap/'+entry['path'])).hexdigest()!=entry['sha256']:raise SystemExit('ZIP file hash mismatch')
    digest=hashlib.sha256(output.read_bytes()).hexdigest();output.with_suffix('.sha256').write_text(f'{digest}  {output.name}\n')
    print(json.dumps({'path':str(output),'files':len(files)+1,'bytes':output.stat().st_size,'sha256':digest,'integrity':'ZIP CRC and every file SHA-256 verified'},indent=2))

if __name__=='__main__':main()
