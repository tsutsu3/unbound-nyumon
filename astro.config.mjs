// @ts-check
import { defineConfig } from "astro/config";
import starlight from "@astrojs/starlight";
import { satteri } from "@astrojs/markdown-satteri";

import { chapters, devPages, hasPages, SITE_URL, DEFAULT_LOCALE } from "./book.config.mjs";
import { bookColumns } from "./src/plugins/book-columns.mjs";

const isDev = process.env.NODE_ENV !== "production";

/** 有料章も含めて表示する執筆用モード。`BOOK_INCLUDE_PAID=1 pnpm dev` で使う。 */
const includePaid = process.env.BOOK_INCLUDE_PAID === "1";

/**
 * サイドバー。章の並びは book.config.mjs が持つ。
 * 本文ファイルがまだ無い章は出さない (書きかけの空グループを作らない)。
 */
const sidebar = [
  ...chapters
    .filter((chapter) => hasPages(chapter.dir) && (includePaid || chapter.access !== "paid"))
    .map((chapter) => ({
      label: chapter.label,
      collapsed: true,
      // i18n を有効にしているので、ここではロケール接頭辞を書かない。
      items: [{ autogenerate: { directory: chapter.dir } }],
      ...(chapter.access === "paid" ? { badge: { text: "有料版", variant: "note" } } : {}),
    })),
  // TODO(Phase 2): 有料章は web でも目次に存在を示し、LP へリンクする (publishing.md §5.2)。
  ...(isDev
    ? devPages
        .filter((page) => hasPages(page.dir))
        .map((page) => ({
          label: page.label,
          collapsed: true,
          items: [{ autogenerate: { directory: page.dir } }],
        }))
    : []),
];

// https://astro.build/config
export default defineConfig({
  site: SITE_URL,
  // ロケール接頭辞付きの URL に固定する。英語版を足すときに日本語版の URL を動かさないため
  // (publishing.md §7 Phase 0)。
  redirects: { "/": `/${DEFAULT_LOCALE}/` },
  markdown: {
    // 独自の column Directive だけを変換する。標準の Aside は Starlight が処理する。
    processor: satteri({ mdastPlugins: [bookColumns()] }),
  },
  integrations: [
    starlight({
      title: "Unbound入門",
      description:
        "DNS の基礎から Unbound の設定までを、実測とソースコードで裏を取りながら解説する入門書。",
      defaultLocale: DEFAULT_LOCALE,
      locales: {
        // 英語版は Phase 3 で `en` を足す (publishing.md §7)。ja の URL は変わらない。
        ja: { label: "日本語", lang: "ja" },
      },
      customCss: ["./src/styles/book.css"],
      expressiveCode: {
        // 本文の設定例は ```conf で書く。Unbound の設定ファイルに専用の文法は無いので
        // ini として色を付ける。
        shiki: { langAlias: { conf: "ini" } },
      },
      lastUpdated: true,
      social: [
        {
          icon: "github",
          label: "GitHub",
          href: "https://github.com/tsutsu3/unbound-nyumon",
        },
      ],
      sidebar,
    }),
  ],
});
