# Unbound入門

DNS の基礎から Unbound の設定までを解説する『Unbound入門』の Web・書籍共通プロジェクトです。
本文の設計は隣の `unbound-nyumon-planning` に従います。

## 必要なもの

- Node.js 22 以降
- pnpm
- PDF / EPUB 生成時は Pandoc。ローカルにない場合は Docker を使います

依存関係を準備します。

```console
$ pnpm install
```

## Web 版

```console
$ pnpm dev
$ pnpm build
$ pnpm preview
```

通常の Web ビルドには無料ページだけが含まれます。有料ページも含めて執筆確認する場合は次のように起動します。

```console
$ BOOK_INCLUDE_PAID=1 pnpm dev
```

本文は `src/content/docs/ja/` に置きます。章とページの順序、無料・有料の区分は
`book.config.mjs` が Starlight と Pandoc の双方へ供給します。

## PDF / EPUB

```console
$ pnpm book:pdf
$ pnpm book:sample:pdf
$ pnpm book:epub
$ pnpm book:html
```

生成物は `build/` に出力されます。`book:sample:pdf` はコラムと注意書きの PDF 表示を
確認するための `build/notation-sample.pdf` を生成します。無料範囲だけを確認する場合は、
ビルドスクリプトへ `--free` を渡します。

```console
$ ./pandoc/build.sh pdf --free
```

ローカルに Pandoc がない場合は、初回だけ `pandoc/Dockerfile` から日本語組版用イメージを作ります。
別のイメージを使う場合は `PANDOC_IMAGE` で指定できます。PDF には LuaLaTeX、luatexja、
原ノ味フォントを含むイメージが必要です。

## 本文とコラムの記法

通常の Markdown (`.md`) を使い、HTML や MDX に本文の意味を依存させません。
「実装から見ると」コラムは独自の `column` Directive で書きます。

```md
:::column[Unbound 1.26.0]
ここに、ソースコードから確認した実装上の理由を書きます。
:::
```

通常の注意書きには Starlight 標準の `note`、`tip`、`caution`、`danger` を使います。

```md
:::caution[任意のタイトル]
何が起こるのかを具体的に書きます。
:::
```

コラムの中に注意書きを入れるときは、外側のコロンを増やして `::::column[Unbound 1.26.0]` とします。
同じコロン数で入れ子にすると、内側の `:::` で外側まで閉じてしまいます。

Web ではコラムを専用の枠、注意書きを Starlight 標準 Aside として表示します。Pandoc では
Lua filter により PDF / EPUB 用の枠へ変換します。詳細と実表示は開発サーバーの
`/ja/dev/notation-sample/` で確認できます。

コラムには 3 桁の Unbound バージョンが必要です。長さと章ごとの本数を含む規約は
次のコマンドで検査します。`pnpm build` でも先に同じ検査が走ります。

```console
$ pnpm check
```

## 英語版を足すとき

プラグインとビルドはロケールに対応済みなので、次の作業だけでweb・PDF / EPUB・検査が追従します。

1. `book.config.mjs` の `locales` にある `en` の雛形を有効にし、書名とコラム名を決めて埋める
2. 章の見出しを訳す場合は、`chapters` の各章に `translations: { en: "..." }` を足す
3. 本文を `src/content/docs/en/` に置く (URL は `/en/...`。日本語版の URL は変わらない)
4. PDF / EPUB は `pandoc/build.sh pdf --locale en` で作る (`build/unbound-nyumon.en.pdf`)。
   組版設定は `pandoc/metadata.en.yaml`

コラム名、注意書きの既定タイトル、「はじめに」などの文言は `locales.<locale>.strings` が持ちます。
`pnpm check` はすべてのロケールを検査しますが、コラムの字数 (400〜800 字) は日本語の目安なので、
`columnChars` を設定したロケールだけに適用します。lint も、文体・用語・字数の規則は `ja` だけに当てます。

英語版のページが無い場合、Starlight は日本語版のページを英語 URL で表示します (翻訳が無い旨の注記付き)。
全訳しない方針 (publishing.md §7) との兼ね合いは Phase 3 で判断します。

## 主なファイル

- `book.config.mjs`: 章構成、ページ順、公開区分、ロケールごとの書名と文言
- `src/plugins/book-columns.mjs`: Web 用コラム変換
- `src/styles/book.css`: Web 用の本文・コラムスタイル
- `scripts/export-book.mjs`: 共通 Markdown を書籍向けに連結
- `scripts/lib/directives.mjs`: `:::` Directive の解釈 (検査と Pandoc 用の書き換えが共有)
- `scripts/check-directives.mjs`: コラム・注意書きの検査 (`pnpm check`)
- `pandoc/filters/asides.lua`: Pandoc 用コラム・注意書き変換
- `pandoc/latex/preamble.tex`: A5 PDF 用の枠と組版設定
