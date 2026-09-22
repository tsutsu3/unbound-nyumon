/**
 * `:::column[Unbound 1.26.0]` を「実装から見ると」コラムへ変換する。
 * Astro の Markdown プロセッサ (Sätteri) の mdast プラグインとして動く。
 *
 * Note / Tip / Caution / Danger は Starlight 標準の Directive をそのまま使う。
 * このプラグインは独自の `column` だけを担当する。
 * Pandoc 側は export-book.mjs と pandoc/filters/asides.lua が同じ記法を変換する。
 * 記法を変えるときは両方を直す。
 */

/** コラムの名称は 1 種類に固定する (book.md §4.3)。 */
export const COLUMN_LABEL = "実装から見ると";

/** タイトル行に必ず入れる 3 桁バージョン (book.md §4.3 / style-guide.md §18)。 */
export const COLUMN_VERSION_PATTERN = /^Unbound (\d+\.\d+\.\d+)$/;

/** Material Symbols の code アイコン。コラムの見出しに置く。 */
const COLUMN_ICON =
  '<svg class="book-column__icon" viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">' +
  '<path d="M9.4 16.6 4.8 12l4.6-4.6L8 6l-6 6 6 6zm5.2 0 4.6-4.6-4.6-4.6L16 6l6 6-6 6z"/></svg>';

export function bookColumns() {
  return {
    name: "book-columns",
    containerDirective(node, ctx) {
      if (node.name !== "column") return;

      const body = [...node.children];
      const label = body[0];
      const hasLabel =
        label?.type === "paragraph" && label.data?.directiveLabel;
      const versionLabel = hasLabel ? ctx.textContent(label).trim() : "";
      if (hasLabel) body.shift();

      if (body.length === 0) {
        fail(
          ctx,
          "コラムの本文が空です。Directive の開始行と終了行の間に本文を書いてください。",
        );
      }

      const version = COLUMN_VERSION_PATTERN.exec(versionLabel)?.[1];
      if (!version) {
        fail(
          ctx,
          "コラムにバージョンがありません。`:::column[Unbound 1.26.0]` の形で 3 桁のバージョンを書いてください。",
        );
      }
      return column(version, body);
    },
  };
}

/** 「実装から見ると」コラム。Starlight の Aside とは別の見た目にする。 */
function column(version, body) {
  return element(
    "aside",
    {
      class: "book-column",
      "aria-label": `${COLUMN_LABEL} (Unbound ${version})`,
    },
    [
      element("p", { class: "book-column__head" }, [
        { type: "html", value: COLUMN_ICON },
        element("span", { class: "book-column__label" }, [
          { type: "text", value: COLUMN_LABEL },
        ]),
        element("span", { class: "book-column__version" }, [
          { type: "text", value: `Unbound ${version}` },
        ]),
      ]),
      element("div", { class: "book-column__body" }, body),
    ],
  );
}

/** mdast のまま HTML 要素を作る (Starlight の Aside と同じやり方)。 */
function element(tagName, properties, children) {
  return {
    type: "paragraph",
    data: { hName: tagName, hProperties: properties },
    children,
  };
}

/**
 * ビルドログにファイル名付きで出す。Sätteri の位置情報は frontmatter を除いた行番号になるため載せない。
 * 正確な行は `pnpm check` (scripts/check-directives.mjs) が出す。
 */
function fail(ctx, message) {
  const file = ctx.fileURL ? ctx.fileURL.pathname : "";
  throw new Error(`[book-columns] ${file ? `${file} - ` : ""}${message}`);
}
