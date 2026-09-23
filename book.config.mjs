// 本の構成の単一ソース。
//
// Starlight の設定 (astro.config.mjs)、コラムの変換 (src/plugins/book-columns.mjs)、
// Pandoc 用のエクスポート (scripts/export-book.mjs)、検査 (scripts/check-directives.mjs) は、
// どれもこのファイルを読む。章立てを変えるときは、まずこのファイルを直す。
//
// 読者に見える文字列はロケールごとに `locales` に置く。英語版 を始めるときは、
// `locales` に `en` を足し、章の `translations` と src/content/docs/en/ を用意する。

import { existsSync, readdirSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

/** 本文のルート。ロケール配下に章ディレクトリが並ぶ。 */
export const DOCS_ROOT = fileURLToPath(
  new URL("./src/content/docs", import.meta.url),
);

/** 既定ロケール。英語版は Phase 3。 */
export const DEFAULT_LOCALE = "ja";

/**
 * ロケールごとの設定。キーは URL の接頭辞 (`/ja/`) と `src/content/docs/<key>/` になる。
 *
 * - `label` / `lang`    Starlight の言語切り替えと `<html lang>`
 * - `title`             サイトと PDF / EPUB の書名
 * - `description`       サイトの説明
 * - `pandocLang`        PDF / EPUB のメタデータ `lang`
 * - `columnChars`       コラム本体の字数の目安 [下限, 上限]。無ければ字数を検査しない
 *                       (日本語の 400〜800 字は文字数の目安であり、英語には当てはまらない)
 * - `strings`           本文の外に出る文言
 */
export const locales = {
  ja: {
    label: "日本語",
    lang: "ja",
    title: "Unbound入門",
    description:
      "DNS の基礎から Unbound の設定までを、実測とソースコードで裏を取りながら解説する入門書。",
    pandocLang: "ja-JP",
    columnChars: [400, 800],
    strings: {
      /** コラムの名称。1 種類に固定する */
      column: "実装から見ると",
      /** 注意書きの既定タイトル。web は Starlight の翻訳が出すので、PDF / EPUB 用 */
      aside: { note: "ノート", tip: "ヒント", caution: "注意", danger: "危険" },
      privateBadge: "非公開",
      introduction: "はじめに",
      devPages: "執筆用 (dev only)",
      devSample: "開発用サンプル",
    },
  },
  // 英語版 (Phase 3) の雛形。書名とコラム名は Phase 3 で決める。
  // en: {
  //   label: "English",
  //   lang: "en",
  //   title: "TODO",
  //   description: "TODO",
  //   pandocLang: "en-US",
  //   strings: {
  //     column: "TODO",
  //     aside: { note: "Note", tip: "Tip", caution: "Caution", danger: "Danger" },
  //     privateBadge: "Private",
  //     introduction: "Introduction",
  //     devPages: "Drafting (dev only)",
  //     devSample: "Development sample",
  //   },
  // },
};

/** ロケールの設定。存在しないキーなら例外にする (綴り間違いを黙って既定に落とさない)。 */
export function localeConfig(locale) {
  const config = locales[locale];
  if (!config) {
    throw new Error(
      `ロケール "${locale}" は book.config.mjs の locales にありません。`,
    );
  }
  return config;
}

/**
 * ファイルのパスからロケールを割り出す。`src/content/docs/<locale>/` の外や、
 * 未定義のロケールなら既定ロケールを返す。
 */
export function localeOfPath(file) {
  const rel = path.relative(DOCS_ROOT, file);
  const [head] = rel.split(path.sep);
  return !rel.startsWith("..") && head in locales ? head : DEFAULT_LOCALE;
}

/** 章の見出し。`translations` に無いロケールでは既定ロケールの `label` を使う。 */
export function chapterLabel(chapter, locale = DEFAULT_LOCALE) {
  return chapter.translations?.[locale] ?? chapter.label;
}

/**
 * 公開サイトの URL。canonical と sitemap に使う。
 * TODO: 独自ドメインを決めたら差し替える。
 */
export const SITE_URL =
  process.env.SITE_URL ?? "https://tsutsu3.github.io/unbound-nyumon";

/** 実測に使っている Unbound のバージョン。3 桁で書く。 */
export const UNBOUND_VERSION = "1.26.0";

/**
 * 章の一覧。
 *
 * - `dir`      ロケール配下のディレクトリ名。サイドバーの autogenerate に渡す
 * - `label`    サイドバーと PDF の章見出し (既定ロケール)
 * - `translations`  他ロケールの章見出し。`{ en: "Chapter 1 ..." }`。無ければ `label` を使う
 * - `access`   "public" = web 版にも出す / "private" = PDF・EPUB のみ
 * - `pages`    順序を明示したい章だけ書く。省略時はファイル名昇順
 * - `columns`  「実装から見ると」コラムの上限本数。1 章あたり 3〜4 本までを目安にする。
 *              0 は「この章にコラムを置かない」。増やすときは、まずこの値を直す
 *
 * `access: "private"` の章はページ側の frontmatter でも `access: private` を指定する。
 * web ビルドから落とすのは frontmatter の側で、ここの値は PDF の構成と目次表示に使う。
 */
export const chapters = [
  {
    dir: "01-dns-minimum",
    label: "第1章 Unbound のための DNS 最小限",
    access: "public",
    columns: 0,
  },
  {
    dir: "02-dns-software",
    label: "第2章 DNS ソフトウェアの役割",
    access: "public",
    columns: 0,
  },
  {
    dir: "03-what-is-unbound",
    label: "第3章 Unbound とは何か",
    access: "public",
    columns: 0,
  },
  {
    dir: "04-recursion-cache",
    label: "第4章 再帰名前解決とキャッシュ",
    access: "public",
    columns: 0,
  },
  {
    dir: "05-local-dns",
    label: "第5章 ローカルな名前を自分で答える",
    access: "public",
    columns: 3,
  },
  {
    dir: "06-forwarding",
    label: "第6章 問い合わせ先を制御する",
    access: "public",
    columns: 2,
  },
  {
    dir: "07-security-privacy",
    label: "第7章 セキュリティとプライバシー",
    access: "private",
    columns: 0,
  },
  { dir: "08-dnssec", label: "第8章 DNSSEC", access: "private", columns: 0 },
  {
    dir: "09-cookbook",
    label: "第9章 Cookbook",
    access: "public", // レシピ単位で公開・非公開が分かれる
    columns: 0,
    // 番号を先頭に付けないファイル名なので、順序はここで持つ
    pages: [
      "lan-hostnames",
      "home-arpa",
      "dual-stack-records",
      "reverse-lookup",
      "reverse-lookup-forward",
      "cname-record",
      "txt-record",
      "block-nxdomain",
      "block-zero-address",
      "redirect-zone",
      "block-aaaa",
      "disable-builtin-zone",
      "forward-all",
      "forward-one-domain",
      "forward-internal-dns",
      "multiple-upstreams",
      "forward-dot",
      "pihole-unbound",
      "adguard-unbound",
      "prefetch",
      "serve-expired",
      "checkconf-before-apply",
      "servfail-triage",
    ],
  },
  {
    dir: "10-operations-troubleshooting",
    label: "第10章 運用とトラブルシューティング",
    access: "private",
    columns: 0,
  },
  {
    dir: "appendix",
    label: "Appendix",
    access: "public", // 項目単位で分かれる
    columns: 0,
    pages: [
      "undocumented-index",
      "undocumented",
      "version-diff",
      "local-zone-types",
      "limits-defaults",
      "config-quickref",
      "command-quickref",
      "source-guide",
      "rfc-guide",
      "glossary",
    ],
  },
];

/** 執筆中だけサイドバーに出す開発用ページ。本番ビルドには含めない。見出しは `strings.devPages`。 */
export const devPages = [{ dir: "dev" }];

/**
 * 本文をこのリポジトリの外に置くディレクトリ。ロケール配下の相対パスで書く。
 *
 * `pnpm private:link` が `BOOK_PRIVATE_ROOT` の下の同じパスへシンボリックリンクを張る。
 * リンクが無い環境では章ごと空になり、サイドバーにも PDF にも出ない。
 *
 * 章まるごとではなく章の一部が非公開の場合 (Appendix) もあるため、`chapters` の
 * `access` からは決まらない。ここに明示する。
 */
export const privateDirs = [
  "07-security-privacy",
  "08-dnssec",
  "10-operations-troubleshooting",
  "appendix/undocumented",
];

const PAGE_EXT = /\.(md|mdx)$/;

/** 章ディレクトリに本文ファイルが 1 つでもあるか。空の章はサイドバーに出さない。 */
export function hasPages(dir, locale = DEFAULT_LOCALE) {
  const abs = path.join(DOCS_ROOT, locale, dir);
  if (!existsSync(abs)) return false;
  return listPageFiles(abs).length > 0;
}

/** ディレクトリ配下の本文ファイルを再帰的に集める。`_` 始まりは Starlight が無視する。 */
export function listPageFiles(abs) {
  const out = [];
  for (const entry of readdirSync(abs, { withFileTypes: true })) {
    if (entry.name.startsWith("_") || entry.name.startsWith(".")) continue;
    const child = path.join(abs, entry.name);
    // シンボリックリンクのディレクトリでは entry.isDirectory() が false になるので、
    // リンク先を辿って判定する (本文を別の場所から持ってくる章がある)。
    if (statSync(child).isDirectory()) out.push(...listPageFiles(child));
    else if (PAGE_EXT.test(entry.name)) out.push(child);
  }
  return out.sort();
}
