#!/usr/bin/env bash
#
# 本文から PDF / EPUB / HTML を作る。
#
#   pandoc/build.sh pdf        A5 PDF   (build/unbound-nyumon.pdf)
#   pandoc/build.sh epub       EPUB     (build/unbound-nyumon.epub)
#   pandoc/build.sh html       確認用 HTML (build/unbound-nyumon.html)
#
# 引数の後ろに --free を付けると、無料公開範囲だけを対象にする。
# --sample はコラム・注意書きの記法サンプルだけを組版する。
#
# pandoc が入っていない場合は Docker を使う (PANDOC_IMAGE で差し替え可能)。
# PDF は lualatex + luatexja を使うため、TeX Live を含むイメージが要る。
set -euo pipefail

cd "$(dirname "$0")/.."

target="${1:-pdf}"
shift || true

export_args=()
output_stem="unbound-nyumon"
for arg in "$@"; do
  [ "$arg" = "--free" ] && export_args+=("--free")
  if [ "$arg" = "--sample" ]; then
    export_args+=("--sample")
    output_stem="notation-sample"
  fi
done

node scripts/export-book.mjs "${export_args[@]}"

inputs=(build/book/*.md)
if [ ! -e "${inputs[0]}" ]; then
  echo "build/book が空です。本文がまだありません。" >&2
  exit 1
fi

common=(
  pandoc/metadata.ja.yaml
  "${inputs[@]}"
  --from=markdown
  --lua-filter=pandoc/filters/asides.lua
  --resource-path=.:src:src/assets:build/book
  --standalone
)

DEFAULT_PANDOC_IMAGE="unbound-nyumon-pandoc:3.9.0.2"
PANDOC_IMAGE="${PANDOC_IMAGE:-$DEFAULT_PANDOC_IMAGE}"

ensure_default_image() {
  [ "$PANDOC_IMAGE" = "$DEFAULT_PANDOC_IMAGE" ] || return 0
  if ! docker image inspect "$PANDOC_IMAGE" >/dev/null 2>&1; then
    echo "日本語 PDF 用 Docker イメージ (${PANDOC_IMAGE}) を作成します。" >&2
    docker build --tag "$PANDOC_IMAGE" --file pandoc/Dockerfile .
  fi
}

run_pandoc() {
  if command -v pandoc >/dev/null 2>&1; then
    pandoc "$@"
  else
    if ! command -v docker >/dev/null 2>&1; then
      echo "pandoc または Docker が必要です。" >&2
      exit 1
    fi
    ensure_default_image
    echo "pandoc が見つからないため Docker (${PANDOC_IMAGE}) を使います。" >&2
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
    echo "使い方: pandoc/build.sh [pdf|epub|html] [--free|--sample]" >&2
    exit 1
    ;;
esac

echo "build/${output_stem}.${target} を出力しました。"
