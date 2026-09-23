/**
 * `src/content/docs/` の本文を Pandoc に渡せる形へ変換する。
 *
 *   src/content/docs/ja/**.md  ->  build/book/NN-chapter.md
 *
 * web 版と PDF / EPUB 版は同じ本文から作る。web 版は frontmatter の
 * `title` を H1 として表示し、本文は H2 から始まる。書籍ではこれを
 *
 *   #   章
 *   ##  ページ
 *   ### 本文の見出し
 *
 * に組み替える必要があるため、ここで見出しを 1 段下げ、ページの `title` を H2 にする。
 *
 * ページ間のリンク (`/ja/05-local-dns/03-local-records/`) は、PDF / EPUB では
 * 文書内リンクに置き換える。非公開章は web に URL を持たないため、外部 URL にはしない。
 *
 * 書名・コラム名など本文の外に出る文言は、book.config.mjs の `locales` から
 * build/book/meta.yaml に書き出す。pandoc/build.sh が `--metadata-file` で渡し、
 * pandoc/filters/asides.lua が `book-strings` を読む。
 *
 * 使い方:
 *   node scripts/export-book.mjs                 全章 (PDF / EPUB 用)
 *   node scripts/export-book.mjs --public        公開範囲だけ
 *   node scripts/export-book.mjs --sample        記法サンプルだけ
 *   node scripts/export-book.mjs --locale en     ロケールを指定する (既定は book.config.mjs の DEFAULT_LOCALE)
 */

import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import {
  chapterLabel,
  chapters,
  DEFAULT_LOCALE,
  DOCS_ROOT,
  listPageFiles,
  localeConfig,
  locales,
  SITE_URL,
} from "../book.config.mjs";
import { readPage, markFenced } from "./lib/markdown.mjs";
import { ASIDE_NAMES, COLUMN_NAME, parseOpening } from "./lib/directives.mjs";

const publicOnly = process.argv.includes("--public");
const sampleOnly = process.argv.includes("--sample");
const locale = argValue("--locale") ?? DEFAULT_LOCALE;
const config = localeConfig(locale);
const { strings } = config;
const LOCALE_ROOT = path.join(DOCS_ROOT, locale);
const OUT_DIR = path.resolve(path.join(DOCS_ROOT, "../../../build/book"));
const INDEX_FILE = path.join(LOCALE_ROOT, "index.md");
const LINK_PATTERN = new RegExp(
  `\\]\\(\\/(${Object.keys(locales).join("|")})\\/([^)#\\s]*)(#[^)\\s]*)?\\)`,
  "g",
);
const SAMPLE_FILE = path.join(LOCALE_ROOT, "dev", "notation-sample.md");

rmSync(OUT_DIR, { recursive: true, force: true });
mkdirSync(OUT_DIR, { recursive: true });

// JSON は YAML としても読めるので、そのまま Pandoc のメタデータファイルにする。
writeFileSync(
  path.join(OUT_DIR, "meta.yaml"),
  `${JSON.stringify(
    {
      title: config.title,
      lang: config.pandocLang,
      "book-strings": {
        column: strings.column,
        "aside-note": strings.aside.note,
        "aside-tip": strings.aside.tip,
        "aside-caution": strings.aside.caution,
        "aside-danger": strings.aside.danger,
      },
    },
    null,
    2,
  )}\n`,
);

const written = [];

if (sampleOnly) {
  // コラムと注意書きの Pandoc 側の見た目を、本文の完成を待たずに確認するための出力。
  const sample = readPage(SAMPLE_FILE);
  if (!sample.frontmatter.title) {
    throw new Error(
      `${path.relative(DOCS_ROOT, SAMPLE_FILE)}: frontmatter has no title.`,
    );
  }
  const out = path.join(OUT_DIR, "00-introduction.md");
  writeFileSync(
    out,
    `# ${strings.devSample} {#c-dev}\n\n## ${sample.frontmatter.title} {#p-dev-notation-sample}\n\n${transform(sample.body)}\n`,
  );
  written.push({ file: out, pages: 1 });
} else {
  // 本文がまだない初期状態でも組版パイプラインを確認できるよう、web のトップページを
  // 書籍の「はじめに」として先頭へ収録する。本文が増えた後も共通の導入として使う。
  const introduction = readPage(INDEX_FILE);
  if (
    introduction.frontmatter.draft !== true &&
    introduction.body.trim() !== ""
  ) {
    const out = path.join(OUT_DIR, "00-introduction.md");
    writeFileSync(
      out,
      `# ${strings.introduction} {#p-index .unnumbered}\n\n${transform(introduction.body)}\n`,
    );
    written.push({ file: out, pages: 1 });
  }

  for (const chapter of chapters) {
    if (publicOnly && chapter.access === "private") continue;

    const dir = path.join(LOCALE_ROOT, chapter.dir);
    const files = orderPages(dir, chapter.pages);
    const parts = [];

    for (const file of files) {
      const { frontmatter, body } = readPage(file);
      if (frontmatter.draft === true) continue;
      if (publicOnly && frontmatter.access === "private") continue;
      if (!frontmatter.title) {
        throw new Error(
          `${path.relative(DOCS_ROOT, file)}: frontmatter has no title.`,
        );
      }
      const slug = pageSlug(file);
      parts.push(`## ${frontmatter.title} {#${slug}}\n\n${transform(body)}`);
    }

    if (parts.length === 0) continue;

    const out = path.join(OUT_DIR, `${chapter.dir}.md`);
    writeFileSync(
      out,
      `# ${chapterLabel(chapter, locale)} {#${chapterSlug(chapter.dir)}}\n\n${parts.join("\n\n")}\n`,
    );
    written.push({ file: out, pages: parts.length });
  }
}

for (const { file, pages } of written) {
  console.log(`${path.relative(process.cwd(), file)} (${pages} page(s))`);
}
console.log(
  `Wrote ${written.length} file(s) to ${path.relative(process.cwd(), OUT_DIR)} (${locale}).`,
);

/** `--name value` と `--name=value` の両方を受け付ける。 */
function argValue(name) {
  const args = process.argv.slice(2);
  for (let i = 0; i < args.length; i++) {
    if (args[i] === name) return args[i + 1];
    if (args[i].startsWith(`${name}=`)) return args[i].slice(name.length + 1);
  }
  return undefined;
}

/** 章の中のページ順。`pages` があればその順、なければファイル名順。 */
function orderPages(dir, pages) {
  let files;
  try {
    files = listPageFiles(dir);
  } catch {
    return [];
  }
  if (!pages) return files;

  const byName = new Map(
    files.map((file) => [path.basename(file).replace(/\.mdx?$/, ""), file]),
  );
  const ordered = [];
  for (const name of pages) {
    const file = byName.get(name);
    if (file) {
      ordered.push(file);
      byName.delete(name);
    }
  }
  // `pages` に載っていないファイルも落とさない。載せ忘れが黙って消えないようにする。
  for (const file of byName.values()) ordered.push(file);
  return ordered;
}

function chapterSlug(dir) {
  return `c-${dir}`;
}

function pageSlug(file) {
  const rel = path.relative(LOCALE_ROOT, file).replace(/\.mdx?$/, "");
  return `p-${rel.split(path.sep).join("-")}`;
}

/** 見出しを 1 段下げ、ページ間リンクを文書内リンクへ置き換える。 */
function transform(body) {
  const lines = body.split(/\r?\n/);
  const inFence = markFenced(lines);

  return lines
    .map((line, i) => {
      if (inFence[i]) return line;
      const pandocDirective = rewriteDirective(line);
      return rewriteLinks(pandocDirective.replace(/^(#{1,5})(\s)/, "#$1$2"));
    })
    .join("\n")
    .trim();
}

/**
 * Starlight の Directive を Pandoc の fenced Div へ変換する。
 *
 *   :::caution[タイトル]          -> ::: {.caution data-title="タイトル"}
 *   ::::column[Unbound 1.26.0]   -> :::: {.column data-title="Unbound 1.26.0"}
 *   :::note{icon="rocket"}       -> ::: {.note}
 *
 * コロン数はそのまま残す。入れ子の対応は `pnpm check` が保証する。
 * `{...}` の属性 (アイコンなど) は web 専用なので落とす。
 */
function rewriteDirective(line) {
  const opening = parseOpening(line);
  if (!opening || !opening.valid) return line;
  if (opening.name !== COLUMN_NAME && !ASIDE_NAMES.has(opening.name))
    return line;

  const fence = ":".repeat(opening.colons);
  const title = opening.title?.trim();
  if (!title) return `${fence} {.${opening.name}}`;
  const escaped = title.replaceAll("\\", "\\\\").replaceAll('"', '\\"');
  return `${fence} {.${opening.name} data-title="${escaped}"}`;
}

/**
 * 同じロケールのページへのリンクは文書内リンクにする。
 *   /ja/05-local-dns/03-local-records/      -> #p-05-local-dns-03-local-records
 *   /ja/05-local-dns/03-local-records/#ttl  -> #ttl
 *
 * 別ロケールのページはこの本に入らないので、web 版の URL にする。
 *   /en/cookbook/lan-hostnames/  -> https://.../en/cookbook/lan-hostnames/
 */
function rewriteLinks(line) {
  return line.replace(LINK_PATTERN, (match, linkLocale, target, hash) => {
    if (linkLocale !== locale)
      return `](${SITE_URL.replace(/\/$/, "")}/${linkLocale}/${target}${hash ?? ""})`;
    if (hash) return `](${hash})`;
    const slug = target.replace(/\/$/, "").split("/").join("-");
    return `](#p-${slug})`;
  });
}
