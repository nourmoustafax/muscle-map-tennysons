#!/usr/bin/env python3
"""Download the four public NLSP CFT70 originals without altering their bytes."""
import hashlib, json, urllib.request
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
FILES=[
 ('Ultrasound_Quadriceps','8e007f6e-2433-5ecd-b1b5-527876ee77e8','29159ef412d35f371681b6ec0efefb872f84c2ece521003215ab8f9dd7ec6b8d'),
 ('Ultrasound_Medial_Gastrocnemius','1caa9f53-93d6-54fb-805a-3548624f8d2b','8361ed7278dfebf5696ae570ee711a09d1707f16cc5f284c342ab304c4a3a0be'),
 ('MRI_Quadriceps','d40188a7-ffc4-54b7-bbbe-49ecf6fb03e9','b82bc0bd38d53826e76edbf67e283a0d9b8b7a3262aa1fe69db53751855c1c69'),
 ('MRI_Medial_Gastrocnemius','7737cb2a-0da7-51af-84b2-7b43471dea2a','949ac4b6e381429e6b6d81f6c5048c2a9e677cee530017b43b7a5e445fe58169'),
]
def main():
    dest=ROOT/'data/raw';dest.mkdir(parents=True,exist_ok=True)
    for label,ident,expected in FILES:
        path=dest/f'BEDREST_IRATS_MRI_ULTRASOUND_CFT70_{label}.csv'
        if path.exists(): data=path.read_bytes()
        else:
            url=f'https://nlsp.nasa.gov/api/v1/files/{ident}/download'
            with urllib.request.urlopen(url,timeout=60) as response: data=response.read()
            if not data.lstrip(b'\xef\xbb\xbf').startswith(b'ID,Subject,'): raise RuntimeError('Unexpected download format')
            if hashlib.sha256(data).hexdigest()!=expected: raise RuntimeError(f'Source checksum changed: {label}. Review before use.')
            path.write_bytes(data)
        if hashlib.sha256(data).hexdigest()!=expected: raise RuntimeError(f'Original changed: {path.name}')
        print(f'Verified {path.name}: {len(data)} bytes')
if __name__=='__main__': main()
