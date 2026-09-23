/**
 * 非公開ページのディレクトリへシンボリックリンクを張る。
 *
 * 本文の置き場所は環境変数 `BOOK_PRIVATE_ROOT` で渡す。その下は
 * `src/content/docs/` と同じ形 (`<locale>/<dir>/*.md`) にしておく。
 *
 *   BOOK_PRIVATE_ROOT=/path/to/root pnpm private:link
 *   BOOK_PRIVATE_ROOT=/path/to/root pnpm private:link --unlink
 *
 * 対象は book.config.mjs の `privateDirs`。リンクを張らなければ、その章と
 * ページはビルドから外れる (hasPages が false になる)。
 *
 * 既にあるものがシンボリックリンクでない場合は、消さずにエラーにする。
 */

import {
  existsSync,
  lstatSync,
  mkdirSync,
  readlinkSync,
  rmSync,
  symlinkSync,
} from "node:fs";
import path from "node:path";
import { DOCS_ROOT, locales, privateDirs } from "../book.config.mjs";

const unlink = process.argv.includes("--unlink");
const root = process.env.BOOK_PRIVATE_ROOT;

if (!root) {
  console.error(
    "BOOK_PRIVATE_ROOT is not set. Pass the location of the private pages.\n" +
      "  BOOK_PRIVATE_ROOT=/path/to/root pnpm private:link",
  );
  process.exit(1);
}

const absRoot = path.resolve(root);
if (!unlink && !existsSync(absRoot)) {
  console.error(`BOOK_PRIVATE_ROOT does not exist: ${absRoot}`);
  process.exit(1);
}

const targets = Object.keys(locales).flatMap((locale) =>
  privateDirs.map((dir) => ({
    rel: path.join(locale, dir),
    target: path.join(DOCS_ROOT, locale, dir),
    source: path.join(absRoot, locale, dir),
    existing: lstatSync(path.join(DOCS_ROOT, locale, dir), {
      throwIfNoEntry: false,
    }),
  })),
);

// 1 つでも触れないものがあれば、何もせずに止める。
const blocked = targets.filter(
  ({ existing }) => existing && !existing.isSymbolicLink(),
);
if (blocked.length > 0) {
  for (const { rel } of blocked) {
    console.error(
      `${rel}: not a symlink, so it is left untouched. Check its contents.`,
    );
  }
  process.exit(1);
}

let linked = 0;
let removed = 0;
let skipped = 0;

for (const { rel, target, source, existing } of targets) {
  if (unlink) {
    if (existing) {
      rmSync(target);
      removed++;
      console.log(`unlink ${rel}`);
    }
    continue;
  }

  if (!existsSync(source)) {
    // 章ごと未着手のことがある。リンクを張らなければビルドから外れるだけ。
    skipped++;
    continue;
  }

  if (existing) {
    if (path.resolve(path.dirname(target), readlinkSync(target)) === source)
      continue;
    rmSync(target);
  }

  mkdirSync(path.dirname(target), { recursive: true });
  symlinkSync(source, target);
  linked++;
  console.log(`link   ${rel} -> ${source}`);
}

if (unlink) {
  console.log(`Removed ${removed} symlink(s).`);
} else {
  console.log(
    `Created ${linked} symlink(s)` +
      (skipped > 0 ? `; skipped ${skipped} with no pages at the source.` : "."),
  );
}
