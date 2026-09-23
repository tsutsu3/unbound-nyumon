/**
 * コラムと注意書きの Directive が執筆ルールを満たしているか調べる。
 * `pnpm build` の先頭で自動的に走る。
 *
 * 見るもの:
 *   - 種別が note / tip / caution / danger / column のいずれかであるか
 *   - `:::` で閉じているか、入れ子のコロン数が足りているか
 *   - 本文が空でないか
 *   - コラムに 3 桁バージョンがあるか
 *   - コラムの中に見出し・コードブロック・別のコラムがないか (skill book-column)
 *   - 1 コラム 400〜800 字に収まっているか
 *   - 章あたりのコラム本数が book.config.mjs の上限以内か
 *
 * book.config.mjs の locales にあるすべてのロケールを見る。本数はロケールごとに数える。
 * 字数はロケールの `columnChars` があるときだけ見る (日本語の字数を英語に当てはめない)。
 */

import path from "node:path";
import {
  chapters,
  DOCS_ROOT,
  listPageFiles,
  locales,
} from "../book.config.mjs";
import { readPage } from "./lib/markdown.mjs";
import { countCharacters, findDirectives } from "./lib/directives.mjs";

const errors = [];
const warnings = [];

for (const [locale, { columnChars }] of Object.entries(locales)) {
  for (const chapter of chapters) {
    const dir = path.join(DOCS_ROOT, locale, chapter.dir);
    let columnCount = 0;

    for (const file of safeList(dir)) {
      const rel = path.relative(DOCS_ROOT, file);
      const { body, bodyStartLine } = readPage(file);

      for (const directive of findDirectives(body)) {
        const at = `${rel}:${bodyStartLine + directive.line - 1}`;
        const label = `\`${":".repeat(directive.colons)}${directive.name}\``;

        if (directive.kind === "unknown") {
          errors.push(
            `${at} ${label} is not allowed. Use note / tip / caution / danger for asides, and column for columns.`,
          );
          continue;
        }

        for (const problem of directive.problems)
          errors.push(`${at} ${problem}`);

        if (!directive.closed) {
          errors.push(
            `${at} ${label} is not closed with \`${":".repeat(directive.colons)}\`.`,
          );
          continue;
        }

        if (directive.body === "") {
          errors.push(`${at} ${label} has an empty body.`);
          continue;
        }

        if (directive.kind !== "column") continue;
        columnCount++;

        if (!directive.version) {
          errors.push(
            `${at} The column has no version. Write it as \`:::column[Unbound 1.26.0]\`.`,
          );
        }
        if (directive.parent) {
          errors.push(
            `${at} Do not nest a column inside \`${directive.parent}\`.`,
          );
        }
        if (/^\s*(`{3,}|~{3,})/m.test(directive.body)) {
          errors.push(
            `${at} Do not put a code block inside a column. Measured output and commands belong in the body text (skill book-column).`,
          );
        }
        if (/^#{1,6}\s/m.test(directive.body)) {
          errors.push(
            `${at} Do not put a heading inside a column (skill book-column).`,
          );
        }

        if (!columnChars) continue;
        const [MIN_CHARS, MAX_CHARS] = columnChars;
        const chars = countCharacters(directive.body);
        if (chars > MAX_CHARS) {
          errors.push(
            `${at} The column is ${chars} characters. Keep it within ${MAX_CHARS}.`,
          );
        } else if (chars < MIN_CHARS) {
          warnings.push(
            `${at} The column is ${chars} characters. Anything under ${MIN_CHARS} fits better in the body text or an Appendix table.`,
          );
        }
      }
    }

    const limit = chapter.columns ?? 0;
    if (columnCount > limit) {
      errors.push(
        limit === 0
          ? `${locale}/${chapter.dir}: found ${columnCount} column(s), but this chapter is configured to have none. Update \`columns\` in book.config.mjs first.`
          : `${locale}/${chapter.dir}: found ${columnCount} column(s); the limit is ${limit} (\`columns\` in book.config.mjs).`,
      );
    }
  }
}

function safeList(dir) {
  try {
    return listPageFiles(dir);
  } catch {
    return [];
  }
}

for (const message of warnings) console.warn(`warning: ${message}`);
for (const message of errors) console.error(`error: ${message}`);

if (errors.length > 0) {
  console.error(
    `\nDirective check failed with ${errors.length} error(s).`,
  );
  process.exit(1);
}
console.log(
  `Directive check passed (${warnings.length} warning(s)).`,
);
