// 本の構成の単一ソース。
//
// Starlight のサイドバー (astro.config.mjs) と Pandoc 用のエクスポート
// (scripts/export-book.mjs) は、どちらもこのファイルを読む。
// 章立ては planning/book.md と planning/chapters/*.md に従う。

import { existsSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

/** 本文のルート。ロケール配下に章ディレクトリが並ぶ。 */
export const DOCS_ROOT = fileURLToPath(new URL("./src/content/docs", import.meta.url));

/** 既定ロケール。英語版は Phase 3 (publishing.md §7)。 */
export const DEFAULT_LOCALE = "ja";

/**
 * 公開サイトの URL。canonical と sitemap に使う。
 * TODO: 独自ドメインを決めたら差し替える (publishing.md §2)。
 */
export const SITE_URL = process.env.SITE_URL ?? "https://tsutsu3.github.io/unbound-nyumon";

/** 実測に使っている Unbound のバージョン (book.md §6.1)。3 桁で書く。 */
export const UNBOUND_VERSION = "1.26.0";

/**
 * 章の一覧。
 *
 * - `dir`      ロケール配下のディレクトリ名。サイドバーの autogenerate に渡す
 * - `label`    サイドバーと PDF の章見出し
 * - `access`   "free" = 無料 web 版にも出す / "paid" = PDF・EPUB のみ (publishing.md §3)
 * - `pages`    順序を明示したい章だけ書く。省略時はファイル名昇順
 * - `columns`  「実装から見ると」コラムの上限本数。章仕様の値 (book.md §4.3 は 1 章 3〜4 本まで)。
 *              0 は「この章にコラムを置かない」。増やすときは先に章仕様を直す
 *
 * `access: "paid"` の章はページ側の frontmatter でも `access: paid` を指定する。
 * web ビルドから落とすのは frontmatter の側で、ここの値は PDF の構成と目次表示に使う。
 */
export const chapters = [
  { dir: "01-dns-minimum", label: "第1章 Unbound のための DNS 最小限", access: "free", columns: 0 },
  { dir: "02-dns-software", label: "第2章 DNS ソフトウェアの役割", access: "free", columns: 0 },
  { dir: "03-what-is-unbound", label: "第3章 Unbound とは何か", access: "free", columns: 0 },
  { dir: "04-recursion-cache", label: "第4章 再帰名前解決とキャッシュ", access: "free", columns: 0 },
  { dir: "05-local-dns", label: "第5章 ローカルな名前を自分で答える", access: "free", columns: 3 },
  { dir: "06-forwarding", label: "第6章 問い合わせ先を制御する", access: "free", columns: 2 },
  { dir: "07-security-privacy", label: "第7章 セキュリティとプライバシー", access: "paid", columns: 0 },
  { dir: "08-dnssec", label: "第8章 DNSSEC", access: "paid", columns: 0 },
  {
    dir: "09-cookbook",
    label: "第9章 Cookbook",
    access: "free", // レシピ単位で無料・有料が分かれる (09-cookbook.md §13)
    columns: 0,
    // 番号を先頭に付けないファイル名なので、順序はここで持つ (09-cookbook.md §13)
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
  { dir: "10-operations-troubleshooting", label: "第10章 運用とトラブルシューティング", access: "paid", columns: 0 },
  {
    dir: "appendix",
    label: "Appendix",
    access: "free", // 項目単位で分かれる (99-appendix.md §7)
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

/** 執筆中だけサイドバーに出す開発用ページ。本番ビルドには含めない。 */
export const devPages = [{ dir: "dev", label: "執筆用 (dev only)" }];

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
    if (entry.isDirectory()) out.push(...listPageFiles(child));
    else if (PAGE_EXT.test(entry.name)) out.push(child);
  }
  return out.sort();
}
