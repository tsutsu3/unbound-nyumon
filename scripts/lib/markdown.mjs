/**
 * 本文の Markdown を行単位で読むための小さなヘルパー。
 * Astro のビルドを通さずに使いたい検査・変換スクリプトが共有する。
 */

import { readFileSync } from "node:fs";

const FENCE = /^\s*(`{3,}|~{3,})/;

/** frontmatter と本文を分ける。frontmatter は簡易パースで、必要な値だけ取る。 */
export function readPage(file) {
  const raw = readFileSync(file, "utf8");
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(raw);
  if (!match) return { frontmatter: {}, body: raw, bodyStartLine: 1 };
  const frontmatter = parseFrontmatter(match[1]);
  const bodyStartLine = match[0].split("\n").length;
  return { frontmatter, body: raw.slice(match[0].length), bodyStartLine };
}

/**
 * frontmatter の 1 階層目だけを読む簡易パーサー。
 * 本文で使う `title` / `description` / `access` / `draft` を取れれば足りる。
 */
function parseFrontmatter(text) {
  const data = {};
  for (const line of text.split(/\r?\n/)) {
    const m = /^([A-Za-z0-9_-]+):\s*(.*)$/.exec(line);
    if (!m) continue;
    let value = m[2].trim();
    if (value === "") continue;
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (value === "true") data[m[1]] = true;
    else if (value === "false") data[m[1]] = false;
    else data[m[1]] = value;
  }
  return data;
}

/** コードフェンスの中かどうかを行ごとに返す。見出しや引用の誤検出を避けるために使う。 */
export function markFenced(lines) {
  const inFence = new Array(lines.length).fill(false);
  let fence = null;
  for (let i = 0; i < lines.length; i++) {
    const m = FENCE.exec(lines[i]);
    if (fence) {
      inFence[i] = true;
      if (m && m[1][0] === fence[0] && m[1].length >= fence.length)
        fence = null;
      continue;
    }
    if (m) {
      fence = m[1];
      inFence[i] = true;
    }
  }
  return inFence;
}
