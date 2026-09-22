/**
 * 本文から Starlight の注意書き (`:::note` など) と独自コラム (`:::column`) を抜き出す。
 * scripts/check-directives.mjs と scripts/export-book.mjs が共有する。
 *
 * 解釈は Starlight (remark-directive) に合わせる。
 *
 *   - 開始行   `:::note`、`:::note[タイトル]`、`:::note[タイトル]{icon="..."}`
 *   - 終了行   `:::` (コロンだけの行)
 *   - 入れ子   外側のコロンを内側より多くする (`::::column` の中に `:::note`)。
 *              終了行は、コロン数が足りる一番外側のブロックを閉じる。そのため同じコロン数で
 *              入れ子にすると、内側の終了行で外側まで閉じてしまう
 *
 * Web 側のコラム記法は src/plugins/book-columns.mjs と共有する。
 */

import { markFenced } from "./markdown.mjs";
import { COLUMN_VERSION_PATTERN } from "../../src/plugins/book-columns.mjs";

/** 本文で使ってよい Directive。注意書きの役割は style-guide.md §16 で固定されている。 */
export const ASIDE_NAMES = new Set(["note", "tip", "caution", "danger"]);
export const COLUMN_NAME = "column";

const OPENING_HEAD = /^(:{3,})([A-Za-z][\w-]*)/;
const CLOSING = /^(:{3,})\s*$/;

/**
 * Directive の開始行を分解する。開始行でなければ null。
 *
 *   ::::column[Unbound 1.26.0]        -> { colons: 4, name: "column", title: "Unbound 1.26.0", attributes: "" }
 *   :::tip[配列 `a[0]` の扱い]         -> title は `]` を含んでよい (角括弧の対応を数える)
 *   :::note{icon="rocket"}            -> attributes: 'icon="rocket"'
 *
 * `valid: false` は、開始行らしいが後ろに余計な文字が続くもの。
 */
export function parseOpening(line) {
  const head = OPENING_HEAD.exec(line);
  if (!head) return null;

  const [, colonRun, name] = head;
  let rest = line.slice(head[0].length);
  let title;
  let attributes = "";

  if (rest.startsWith("[")) {
    const end = matchingBracket(rest, 0, "[", "]");
    if (end === -1) return { colons: colonRun.length, name, title: undefined, attributes, valid: false };
    title = rest.slice(1, end);
    rest = rest.slice(end + 1);
  }

  if (rest.startsWith("{")) {
    const end = matchingBracket(rest, 0, "{", "}");
    if (end === -1) return { colons: colonRun.length, name, title, attributes, valid: false };
    attributes = rest.slice(1, end);
    rest = rest.slice(end + 1);
  }

  return { colons: colonRun.length, name, title, attributes, valid: rest.trim() === "" };
}

/** `open` に対応する閉じ括弧の位置。インラインコードの中の括弧は数えない。 */
function matchingBracket(text, start, open, close) {
  let depth = 0;
  let inCode = false;
  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (ch === "`") inCode = !inCode;
    if (inCode) continue;
    if (ch === "\\") {
      i++;
      continue;
    }
    if (ch === open) depth++;
    else if (ch === close) {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
}

/**
 * 1 ページ分の本文から Directive を取り出す。
 *
 * 返り値の各要素:
 *   kind      "column" | "aside" | "unknown"
 *   name      "column" / "note" など
 *   colons    開始行のコロン数
 *   title     `[...]` に書かれた文字列 (無ければ "")
 *   version   コラムのときだけ入る
 *   body      Directive の本文
 *   line      本文内での開始行 (1 始まり)
 *   closed    対応する終了行があったか
 *   parent    外側の Directive の name (入れ子でなければ undefined)
 *   problems  構造上の問題 (空でなければエラー)
 */
export function findDirectives(body) {
  const lines = body.split(/\r?\n/);
  const inFence = markFenced(lines);
  const found = [];
  /** @type {Array<{ entry: object, start: number }>} */
  const stack = [];

  const close = (depthIndex, endLine) => {
    // depthIndex より内側で閉じていないものは、ここで暗黙に閉じられる
    for (let k = stack.length - 1; k >= depthIndex; k--) {
      const { entry, start } = stack[k];
      entry.body = lines.slice(start + 1, endLine).join("\n").trim();
      entry.closed = true;
      if (k > depthIndex) {
        const outer = stack[depthIndex].entry;
        entry.problems.push(
          `\`${":".repeat(entry.colons)}${entry.name}\` の終了行が、外側の \`${":".repeat(outer.colons)}${outer.name}\` を先に閉じています。入れ子にするときは外側のコロンを増やします (\`${":".repeat(entry.colons + 1)}${outer.name}\`)。`,
        );
      }
    }
    stack.length = depthIndex;
  };

  for (let i = 0; i < lines.length; i++) {
    if (inFence[i]) continue;
    const line = lines[i];

    const closing = CLOSING.exec(line);
    if (closing) {
      const length = closing[1].length;
      const depthIndex = stack.findIndex(({ entry }) => entry.colons <= length);
      if (depthIndex !== -1) close(depthIndex, i);
      continue;
    }

    const opening = parseOpening(line);
    if (!opening) continue;

    const kind =
      opening.name === COLUMN_NAME ? "column" : ASIDE_NAMES.has(opening.name) ? "aside" : "unknown";
    const title = opening.title?.trim() ?? "";
    const parent = stack.at(-1)?.entry;
    const entry = {
      kind,
      name: opening.name,
      colons: opening.colons,
      title,
      version: kind === "column" ? COLUMN_VERSION_PATTERN.exec(title)?.[1] : undefined,
      attributes: opening.attributes,
      body: "",
      line: i + 1,
      closed: false,
      parent: parent?.name,
      problems: [],
    };
    if (!opening.valid) {
      entry.problems.push(`\`${line.trim()}\` の後ろに解釈できない文字があります。`);
    }
    found.push(entry);
    stack.push({ entry, start: i });
  }

  // 閉じられないまま終わったもの
  for (const { entry, start } of stack) {
    entry.body = lines.slice(start + 1).join("\n").trim();
  }

  return found;
}

/**
 * コラムの文字数。空白と改行を除いた文字数で数える。
 * 日本語主体の本文なので、単語数ではなく文字数を目安にする (book.md §4.3: 400〜800 字)。
 */
export function countCharacters(text) {
  return text.replace(/\s+/gu, "").length;
}
