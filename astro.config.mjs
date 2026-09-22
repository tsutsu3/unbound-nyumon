// @ts-check
import { defineConfig } from "astro/config";
import starlight from "@astrojs/starlight";
import { satteri } from "@astrojs/markdown-satteri";

import {
  chapterLabel,
  chapters,
  DEFAULT_LOCALE,
  devPages,
  hasPages,
  locales,
  SITE_URL,
} from "./book.config.mjs";
import { bookColumns } from "./src/plugins/book-columns.mjs";

const isDev = process.env.NODE_ENV !== "production";

/** 有料章も含めて表示する執筆用モード。`BOOK_INCLUDE_PAID=1 pnpm dev` で使う。 */
const includePaid = process.env.BOOK_INCLUDE_PAID === "1";

const defaultStrings = locales[DEFAULT_LOCALE].strings;
const otherLocales = Object.keys(locales).filter((locale) => locale !== DEFAULT_LOCALE);

/** 既定ロケール以外の翻訳。Starlight は `lang` をキーにする。 */
function translate(pick) {
  return Object.fromEntries(
    otherLocales
      .map((locale) => [locales[locale].lang, pick(locale)])
      .filter(([, value]) => value !== undefined),
  );
}

/** ロケールごとの値。既定ロケールの値を必ず含む。 */
function perLang(pick) {
  return Object.fromEntries(Object.keys(locales).map((locale) => [locales[locale].lang, pick(locale)]));
}

/**
 * サイドバー。章の並びは book.config.mjs が持つ。
 * 本文ファイルがまだ無い章は出さない (書きかけの空グループを作らない)。
 */
const sidebar = [
  ...chapters
    .filter(
      (chapter) =>
        Object.keys(locales).some((locale) => hasPages(chapter.dir, locale)) &&
        (includePaid || chapter.access !== "paid"),
    )
    .map((chapter) => ({
      label: chapter.label,
      translations: translate((locale) => chapter.translations?.[locale]),
      collapsed: true,
      // i18n を有効にしているので、ここではロケール接頭辞を書かない。
      items: [{ autogenerate: { directory: chapter.dir } }],
      ...(chapter.access === "paid"
        ? { badge: { text: perLang((locale) => locales[locale].strings.paidBadge), variant: "note" } }
        : {}),
    })),
  // TODO(Phase 2): 有料章は web でも目次に存在を示し、LP へリンクする (publishing.md §5.2)。
  ...(isDev
    ? devPages
        .filter((page) => Object.keys(locales).some((locale) => hasPages(page.dir, locale)))
        .map((page) => ({
          label: defaultStrings.devPages,
          translations: translate((locale) => locales[locale].strings.devPages),
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
      title: perLang((locale) => locales[locale].title),
      // Starlight の description はロケールごとに持てない。各ページの frontmatter で上書きする。
      description: locales[DEFAULT_LOCALE].description,
      defaultLocale: DEFAULT_LOCALE,
      // 英語版は Phase 3 で book.config.mjs の locales に `en` を足す (publishing.md §7)。
      // ja の URL は変わらない。
      locales: Object.fromEntries(
        Object.entries(locales).map(([key, { label, lang }]) => [key, { label, lang }]),
      ),
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
