/**
 * `:::column[Unbound 1.26.0]` を「実装から見ると」コラムへ変換する。
 * Astro の Markdown プロセッサ の mdast プラグインとして動く。
 *
 * Note / Tip / Caution / Danger は Starlight 標準の Directive をそのまま使う。
 * このプラグインは独自の `column` だけを担当する。
 * Pandoc 側は export-book.mjs と pandoc/filters/asides.lua が同じ記法を変換する。
 * 記法を変えるときは両方を直す。
 *
 * コラムの名称はロケールごとに book.config.mjs の `strings.column` が持つ。
 * ロケールはファイルのパス (`src/content/docs/<locale>/`) から決める。
 */

import { fileURLToPath } from "node:url";
import { DEFAULT_LOCALE, localeOfPath, locales } from "../../book.config.mjs";

/** タイトル行に必ず入れる 3 桁バージョン。 */
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
      const locale = ctx.fileURL
        ? localeOfPath(fileURLToPath(ctx.fileURL))
        : DEFAULT_LOCALE;
      const columnLabel = locales[locale].strings.column;

      const body = [...node.children];
      const label = body[0];
      const hasLabel =
        label?.type === "paragraph" && label.data?.directiveLabel;
      const versionLabel = hasLabel ? ctx.textContent(label).trim() : "";
      if (hasLabel) body.shift();

      if (body.length === 0) {
        fail(
          ctx,
          "The column has an empty body. Write the body between the opening and closing lines of the directive.",
        );
      }

      const version = COLUMN_VERSION_PATTERN.exec(versionLabel)?.[1];
      if (!version) {
        fail(
          ctx,
          "The column has no version. Write a three-part version as `:::column[Unbound 1.26.0]`.",
        );
      }
      return column(columnLabel, version, body);
    },
  };
}

/** 「実装から見ると」コラム。Starlight の Aside とは別の見た目にする。 */
function column(columnLabel, version, body) {
  return element(
    "aside",
    {
      class: "book-column",
      "aria-label": `${columnLabel} (Unbound ${version})`,
    },
    [
      element("p", { class: "book-column__head" }, [
        { type: "html", value: COLUMN_ICON },
        element("span", { class: "book-column__label" }, [
          { type: "text", value: columnLabel },
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
