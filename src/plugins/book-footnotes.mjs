/**
 * 脚注セクションの見出しを日本語にする。
 *
 * 脚注 (`[^name]`) は mdast から hast へ変換するときに `<section data-footnotes>`
 * へまとめられ、その先頭に `<h2 id="footnote-label">` が付く。既定の文字列は英語の
 * "Footnotes" で、本文では `sr-only` なので見えないが、**Starlight の目次には出る**。
 *
 * Sätteri は変換時の `footnoteLabel` を設定として公開していない (`astro.config.mjs` の
 * `markdown.remarkRehype` は @astrojs/markdown-remark 用で、Sätteri では使えない)。
 * そこで、出来上がった hast の見出しを差し替える。
 *
 * PDF / EPUB は Pandoc が脚注を組むのでこのプラグインを通らない。LaTeX 側は
 * ページ下の脚注になり、見出し自体が出ない。
 */

/** 脚注セクションの見出しに使う文字列。ロケールを足すときはここを分ける。 */
const FOOTNOTE_LABEL = "出典";

export function bookFootnotes() {
  return {
    name: "book-footnotes",
    element: {
      filter: ["h2"],
      visit(node) {
        if (node.properties?.id !== "footnote-label") return;
        return {
          ...node,
          children: [{ type: "text", value: FOOTNOTE_LABEL }],
        };
      },
    },
  };
}
