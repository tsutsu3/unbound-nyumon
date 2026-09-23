/**
 * 図の生成元 (`figures/**.d2`) から web・PDF 共通の SVG を作る。
 *
 *   figures/01-dns-minimum/01-actors.d2  ->  public/figures/01-dns-minimum/01-actors.svg
 *
 * 本文からは通常の画像として参照する。出力は `public/` に置くので、web では
 * `/figures/...` で解決でき、Pandoc では `pandoc/build.sh` の `--resource-path` が
 * `public` を見る (`scripts/export-book.mjs` が先頭のスラッシュを落とす)。
 *
 * SVG には明色・暗色の両方のテーマを入れる。d2 が `prefers-color-scheme` の
 * メディアクエリを埋め込むので、画像を 2 枚持たなくてよい。
 *
 * 日本語のラベルは d2 の同梱フォントでは出ないため、文字幅の計算に使う和文
 * フォントを渡す。既定では fontconfig に選ばせる。別のフォントを使う場合は
 * `BOOK_FIGURE_FONT` に .ttf のパスを渡す。d2 の実体は `D2` で指定できる。
 *
 * 生成物もリポジトリに入れる。図を直したら次を実行してコミットする。
 *
 *   pnpm figures
 */

import { execFileSync } from "node:child_process";
import { mkdirSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const SRC_DIR = path.join(ROOT, "figures");
const OUT_DIR = path.join(ROOT, "public", "figures");

/** 明色テーマ / 暗色テーマ / 余白。web と PDF で同じ見た目にするため固定する。 */
const THEME = "0";
const DARK_THEME = "200";
const PAD = "20";

const d2 = process.env.D2 ?? "d2";
const font = resolveFont();

const sources = listSources(SRC_DIR);
if (sources.length === 0) {
  console.log(`${path.relative(ROOT, SRC_DIR)} に .d2 がありません。`);
  process.exit(0);
}

for (const src of sources) {
  const rel = path.relative(SRC_DIR, src).replace(/\.d2$/, ".svg");
  const out = path.join(OUT_DIR, rel);
  mkdirSync(path.dirname(out), { recursive: true });

  const args = [
    `--theme=${THEME}`,
    `--dark-theme=${DARK_THEME}`,
    `--pad=${PAD}`,
    ...(font ? [`--font-regular=${font}`] : []),
    src,
    out,
  ];

  try {
    execFileSync(d2, args, { stdio: ["ignore", "ignore", "pipe"] });
  } catch (error) {
    if (error.code === "ENOENT") {
      throw new Error(
        `d2 が見つかりません (${d2})。https://d2lang.com/tour/install から入れるか、` +
          `D2 に実体のパスを渡してください。`,
      );
    }
    throw new Error(
      `${path.relative(ROOT, src)}: d2 が失敗しました。\n${error.stderr?.toString() ?? error.message}`,
    );
  }

  console.log(`${path.relative(ROOT, out)}`);
}

console.log(
  `Wrote ${sources.length} figure(s) to ${path.relative(ROOT, OUT_DIR)}.`,
);

/** `figures/` 配下の .d2 を再帰的に集める。 */
function listSources(dir) {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return [];
  }
  const out = [];
  for (const entry of entries) {
    if (entry.name.startsWith("_") || entry.name.startsWith(".")) continue;
    const child = path.join(dir, entry.name);
    if (statSync(child).isDirectory()) out.push(...listSources(child));
    else if (entry.name.endsWith(".d2")) out.push(child);
  }
  return out.sort();
}

/**
 * 文字幅の計算に使う和文フォント。見つからない場合は指定なしで進める
 * (日本語のラベルが豆腐になるので警告を出す)。
 */
function resolveFont() {
  const configured = process.env.BOOK_FIGURE_FONT;
  if (configured) return configured;

  // d2 が受け取れるのは .ttf だけなので、.otf や .ttc を選ぶ候補は使えない。
  // 先に名前で当て、最後に fontconfig の既定へ落とす。
  const candidates = [
    "IPAGothic",
    "IPAPGothic",
    "Noto Sans JP",
    "Noto Sans CJK JP",
    "sans-serif:lang=ja",
  ];

  for (const candidate of candidates) {
    let file;
    try {
      file = execFileSync("fc-match", ["-f", "%{file}", candidate], {
        encoding: "utf8",
      }).trim();
    } catch {
      console.warn(
        "fc-match が使えません。BOOK_FIGURE_FONT に和文の .ttf を渡してください。",
      );
      return undefined;
    }
    if (file.endsWith(".ttf")) return file;
  }

  console.warn(
    "和文の .ttf が見つかりません。日本語のラベルが崩れます。" +
      "BOOK_FIGURE_FONT に .ttf を渡してください。",
  );
  return undefined;
}
