#!/usr/bin/env python3
"""Serve the included built application locally; no internet or Node needed."""
import argparse
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from functools import partial
from pathlib import Path
root=Path(__file__).resolve().parents[1]
p=argparse.ArgumentParser();p.add_argument('--port',type=int,default=3000);args=p.parse_args()
if not (root/'dist/index.html').is_file(): raise SystemExit('dist is missing: first run pnpm install --frozen-lockfile && pnpm run build')
server=ThreadingHTTPServer(('127.0.0.1',args.port),partial(SimpleHTTPRequestHandler,directory=str(root/'dist')))
print(f'MuscleMap local application: http://127.0.0.1:{args.port}',flush=True)
try: server.serve_forever()
except KeyboardInterrupt: server.server_close()
