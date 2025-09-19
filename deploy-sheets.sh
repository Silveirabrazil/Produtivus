#!/usr/bin/env bash
set -euo pipefail

TARGET_ROOT=""
INCLUDE_HTML=0

usage() {
  echo "Uso: $0 -t <destino> [--include-html]" >&2
  exit 1
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    -t|--target)
      TARGET_ROOT="$2"; shift 2 ;;
    --include-html)
      INCLUDE_HTML=1; shift ;;
    *) usage ;;
  esac
done

if [[ -z "${TARGET_ROOT}" ]]; then
  usage
fi

HERE="$(cd "$(dirname "$0")" && pwd)"
SRC_DIST="$HERE/apps/sheets/dist"
SRC_HTML="$HERE/planilhas.html"

if [[ ! -d "$SRC_DIST" ]]; then
  echo "Pasta de build não encontrada: $SRC_DIST. Execute a build primeiro (npm --prefix apps/sheets run build)." >&2
  exit 2
fi

DST_DIST="$TARGET_ROOT/apps/sheets/dist"
mkdir -p "$DST_DIST"

echo "Copiando dist -> $DST_DIST"
rsync -a --delete "$SRC_DIST/" "$DST_DIST/"

if [[ "$INCLUDE_HTML" -eq 1 ]]; then
  echo "Copiando planilhas.html -> $TARGET_ROOT/planilhas.html"
  install -m 0644 "$SRC_HTML" "$TARGET_ROOT/planilhas.html"
fi

echo "OK: deploy concluído."
