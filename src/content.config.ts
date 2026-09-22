import { defineCollection, z } from "astro:content";
import type { Loader } from "astro/loaders";
import { docsLoader, i18nLoader } from "@astrojs/starlight/loaders";
import { docsSchema, i18nSchema } from "@astrojs/starlight/schema";

/**
 * `src/content/docs/` は web 版と PDF / EPUB 版の単一ソース (publishing.md §2)。
 * そのため有料章の本文もここに置き、web ビルドのときだけ落とす。
 *
 * `BOOK_INCLUDE_PAID=1` を付けると有料ページも含めてビルドする (執筆・組版確認用)。
 */
const includePaid = process.env.BOOK_INCLUDE_PAID === "1";

function bookDocsLoader(): Loader {
  const base = docsLoader();
  return {
    name: "book-docs-loader",
    load: async (context) => {
      await base.load(context);
      if (includePaid) return;
      const paid = [...context.store.entries()].filter(
        ([, entry]) => (entry.data as { access?: string }).access === "paid",
      );
      for (const [id] of paid) context.store.delete(id);
      if (paid.length > 0) {
        context.logger.info(`有料ページ ${paid.length} 件を web ビルドから除外しました`);
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
         * 公開区分 (publishing.md §3)。
         * 省略時は無料。「明示のない節は無料として扱う」という既定に合わせている (§3.1)。
         */
        access: z.enum(["free", "paid"]).default("free"),
      }),
    }),
  }),
  // Starlight の UI 文言を上書きするための入れ物 (src/content/i18n/)。
  i18n: defineCollection({ loader: i18nLoader(), schema: i18nSchema() }),
};
