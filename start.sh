#!/usr/bin/env bash
# Spustí hru na http://localhost:8080 (bez cache, aby sa vždy načítala najnovšia verzia)
cd "$(dirname "$0")"
exec python3 server.py "${1:-8080}"
