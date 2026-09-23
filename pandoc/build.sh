#!/usr/bin/env bash
#
# 本文から PDF / EPUB / HTML を作る。
#
#   pandoc/build.sh pdf        A5 PDF   (build/unbound-nyumon.pdf)
#   pandoc/build.sh epub       EPUB     (build/unbound-nyumon.epub)
#   pandoc/build.sh html       確認用 HTML (build/unbound-nyumon.html)
#
# 引数の後ろに --public を付けると、公開範囲だけを対象にする。
# --sample はコラム・注意書きの記法サンプルだけを組版する。
# --locale en でロケールを選ぶ (既定は ja)。組版設定は pandoc/metadata.<locale>.yaml、
# 書名やコラム名は book.config.mjs の locales から来る。既定以外のロケールは
# 出力ファイル名に `.<locale>` が付く (build/unbound-nyumon.en.pdf)。
#
# pandoc が入っていない場合は Docker を使う (PANDOC_IMAGE で差し替え可能)。
# PDF は lualatex + luatexja を使うため、TeX Live を含むイメージが要る。
set -euo pipefail

cd "$(dirname "$0")/.."

target="${1:-pdf}"
shift || true

export_args=()
output_stem="unbound-nyumon"
locale="ja"
while [ $# -gt 0 ]; do
  case "$1" in
    --public) export_args+=("--public") ;;
    --sample)
      export_args+=("--sample")
      output_stem="notation-sample"
      ;;
    --locale)
      locale="${2:?--locale requires a locale}"
      shift
      ;;
    --locale=*) locale="${1#--locale=}" ;;
    *)
      echo "Unknown argument: $1" >&2
      exit 1
      ;;
  esac
  shift
done

metadata="pandoc/metadata.${locale}.yaml"
if [ ! -f "$metadata" ]; then
  echo "${metadata} not found. Add the typesetting settings for locale ${locale}." >&2
  exit 1
fi
[ "$locale" = "ja" ] || output_stem="${output_stem}.${locale}"

node scripts/export-book.mjs --locale "$locale" "${export_args[@]}"

inputs=(build/book/*.md)
if [ ! -e "${inputs[0]}" ]; then
  echo "build/book is empty. There are no pages yet." >&2
  exit 1
fi

common=(
  "$metadata"
  "${inputs[@]}"
  --metadata-file=build/book/meta.yaml
  --from=markdown
  --lua-filter=pandoc/filters/asides.lua
  --resource-path=.:src:src/assets:public:build/book
  --standalone
)

DEFAULT_PANDOC_IMAGE="unbound-nyumon-pandoc:3.9.0.2"
PANDOC_IMAGE="${PANDOC_IMAGE:-$DEFAULT_PANDOC_IMAGE}"

ensure_default_image() {
  [ "$PANDOC_IMAGE" = "$DEFAULT_PANDOC_IMAGE" ] || return 0
  if ! docker image inspect "$PANDOC_IMAGE" >/dev/null 2>&1; then
    echo "Building the Docker image for Japanese PDF output (${PANDOC_IMAGE})." >&2
    docker build --tag "$PANDOC_IMAGE" --file pandoc/Dockerfile .
  fi
}

run_pandoc() {
  if command -v pandoc >/dev/null 2>&1; then
    pandoc "$@"
  else
    if ! command -v docker >/dev/null 2>&1; then
      echo "pandoc or Docker is required." >&2
      exit 1
    fi
    ensure_default_image
    echo "pandoc not found; using Docker (${PANDOC_IMAGE})." >&2
    docker run --rm --volume "$PWD:/data" --user "$(id -u):$(id -g)" "$PANDOC_IMAGE" "$@"
  fi
}

mkdir -p build

case "$target" in
  pdf)
    run_pandoc "${common[@]}" \
      --pdf-engine=lualatex \
      --include-in-header=pandoc/latex/preamble.tex \
      --top-level-division=chapter \
      --output="build/${output_stem}.pdf"
    ;;
  epub)
    run_pandoc "${common[@]}" \
      --css=pandoc/epub/style.css \
      --epub-title-page=true \
      --split-level=1 \
      --output="build/${output_stem}.epub"
    ;;
  html)
    run_pandoc "${common[@]}" \
      --css=pandoc/epub/style.css \
      --embed-resources \
      --toc \
      --output="build/${output_stem}.html"
    ;;
  *)
    echo "Usage: pandoc/build.sh [pdf|epub|html] [--public] [--sample] [--locale ja|en]" >&2
    exit 1
    ;;
esac

echo "Wrote build/${output_stem}.${target}."
