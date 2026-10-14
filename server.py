#!/usr/bin/env python3
"""Lokálny server pre Slovak Soccer Champs – posiela hlavičky, aby prehliadač necachoval staré súbory."""
import http.server
import sys
from functools import partial
from pathlib import Path


class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()

    def log_message(self, fmt, *args):
        pass


def main():
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8080
    root = Path(__file__).resolve().parent
    handler = partial(NoCacheHandler, directory=str(root))
    with http.server.ThreadingHTTPServer(('127.0.0.1', port), handler) as srv:
        print(f'Slovak Soccer Champs beží na http://localhost:{port}  (zastavíš Ctrl+C)', flush=True)
        srv.serve_forever()


if __name__ == '__main__':
    main()
