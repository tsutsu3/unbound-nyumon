import { defineCollection, z } from "astro:content";
import type { Loader } from "astro/loaders";
import { docsLoader, i18nLoader } from "@astrojs/starlight/loaders";
import { docsSchema, i18nSchema } from "@astrojs/starlight/schema";

/**
 * `src/content/docs/` は web 版と PDF / EPUB 版の単一ソース。
 * そのため非公開章の本文もここに置き、web ビルドのときだけ落とす。
 *
 * `BOOK_INCLUDE_PRIVATE=1` を付けると非公開ページも含めてビルドする (執筆・組版確認用)。
 */
const includePrivate = process.env.BOOK_INCLUDE_PRIVATE === "1";

function bookDocsLoader(): Loader {
  const base = docsLoader();
  return {
    name: "book-docs-loader",
    load: async (context) => {
      await base.load(context);
      if (includePrivate) return;
      const hidden = [...context.store.entries()].filter(
        ([, entry]) => (entry.data as { access?: string }).access === "private",
      );
      for (const [id] of hidden) context.store.delete(id);
      if (hidden.length > 0) {
        context.logger.info(`Excluded ${hidden.length} private page(s) from the web build`);
      }
    },
  };
}

export const collections = {
  docs: defineCollection({
    loader: bookDocsLoader(),
    schema: docsSchema({
      extend: z.object({
        /**
         * 公開区分。
         * 省略時は公開。明示のない節は公開として扱う。
         */
        access: z.enum(["public", "private"]).default("public"),
      }),
    }),
  }),
  // Starlight の UI 文言を上書きするための入れ物 (src/content/i18n/)。
  i18n: defineCollection({ loader: i18nLoader(), schema: i18nSchema() }),
};
