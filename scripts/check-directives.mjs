#!/usr/bin/env node
/**
 * コラムと注意書きの Directive が執筆ルールを満たしているか調べる。
 * `pnpm build` の先頭で自動的に走る。
 *
 * 見るもの:
 *   - 種別が note / tip / caution / danger / column のいずれかであるか (style-guide.md §16)
 *   - `:::` で閉じているか、入れ子のコロン数が足りているか
 *   - 本文が空でないか
 *   - コラムに 3 桁バージョンがあるか                        (book.md §4.3)
 *   - コラムの中に見出し・コードブロック・別のコラムがないか  (skill book-column)
 *   - 1 コラム 400〜800 字に収まっているか                   (book.md §4.3)
 *   - 章あたりのコラム本数が章仕様の上限以内か               (book.md §4.3 / chapters/*.md)
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
            `${at} ${label} は使えません。注意書きは note / tip / caution / danger、コラムは column です (style-guide.md §16)。`,
          );
          continue;
        }

        for (const problem of directive.problems)
          errors.push(`${at} ${problem}`);

        if (!directive.closed) {
          errors.push(
            `${at} ${label} が \`${":".repeat(directive.colons)}\` で閉じられていません。`,
          );
          continue;
        }

        if (directive.body === "") {
          errors.push(`${at} ${label} の本文が空です。`);
          continue;
        }

        if (directive.kind !== "column") continue;
        columnCount++;

        if (!directive.version) {
          errors.push(
            `${at} コラムにバージョンがありません。\`:::column[Unbound 1.26.0]\` の形で書きます (book.md §4.3)。`,
          );
        }
        if (directive.parent) {
          errors.push(
            `${at} コラムを \`${directive.parent}\` の中に置かないでください。`,
          );
        }
        if (/^\s*(`{3,}|~{3,})/m.test(directive.body)) {
          errors.push(
            `${at} コラムの中にコードブロックを置かないでください。実測出力とコマンドは本文に置きます (skill book-column)。`,
          );
        }
        if (/^#{1,6}\s/m.test(directive.body)) {
          errors.push(
            `${at} コラムの中に見出しを置かないでください (skill book-column)。`,
          );
        }

        if (!columnChars) continue;
        const [MIN_CHARS, MAX_CHARS] = columnChars;
        const chars = countCharacters(directive.body);
        if (chars > MAX_CHARS) {
          errors.push(
            `${at} コラムが ${chars} 字あります。${MAX_CHARS} 字以内にします (book.md §4.3)。`,
          );
        } else if (chars < MIN_CHARS) {
          warnings.push(
            `${at} コラムが ${chars} 字です。${MIN_CHARS} 字に満たないものは、本文か Appendix の一覧表で足ります (book.md §4.3)。`,
          );
        }
      }
    }

    const limit = chapter.columns ?? 0;
    if (columnCount > limit) {
      errors.push(
        limit === 0
          ? `${locale}/${chapter.dir}: コラムが ${columnCount} 本ありますが、この章にコラムは置かない予定です。先に章仕様を直します (planning/chapters/)。`
          : `${locale}/${chapter.dir}: コラムが ${columnCount} 本あります。上限は ${limit} 本です (planning/chapters/)。`,
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
    `\nコラム・注意書きの検査で ${errors.length} 件のエラーがあります。`,
  );
  process.exit(1);
}
console.log(
  `コラム・注意書きの検査を通過しました (warning ${warnings.length} 件)。`,
);
