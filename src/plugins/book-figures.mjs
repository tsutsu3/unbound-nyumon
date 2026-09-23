/**
 * 画像だけの段落を `<figure>` + `<figcaption>` にする。
 *
 *   ![図1 3 者の関係](/figures/01-dns-minimum/01-actors.svg)
 *
 * を、web では次の形にする。alt を残したまま、同じ文字列をキャプションにも出す。
 *
 *   <figure class="book-figure">
 *     <img src="..." alt="図1 3 者の関係">
 *     <figcaption>図1 3 者の関係</figcaption>
 *   </figure>
 *
 * Pandoc 側は同じ Markdown を implicit_figures で図として扱い、alt がそのまま
 * キャプションになる。番号 (「図1」) は本文に書いた文字列をそのまま使い、LaTeX の
 * 自動採番は pandoc/latex/preamble.tex で止めている。web と PDF でキャプションが
 * 一致し、章仕様の図番号と食い違わないようにするため。
 *
 * 画像の大きさは CSS (src/styles/book.css) と LaTeX (同 preamble.tex) が決める。
 * SVG の固有サイズは d2 の出力任せなので、本文側では指定しない。
 */

/** 画像に添える説明のない図は作らない (alt は a11y とキャプションの両方に使う)。 */
export function bookFigures() {
  return {
    name: "book-figures",
    paragraph(node, ctx) {
      const image = onlyImage(node);
      if (!image) return;

      const caption = (image.alt ?? "").trim();
      if (!caption) {
        fail(
          ctx,
          `The figure ${image.url} has no caption. Write what the figure shows in the alt text.`,
        );
      }

      return element("figure", { class: "book-figure" }, [
        image,
        element("figcaption", {}, [{ type: "text", value: caption }]),
      ]);
    },
  };
}

/**
 * 段落の中身が画像 1 つだけなら、その画像を返す。本文中のインライン画像
 * (文章と同じ段落にあるもの) は figure にしない。
 */
function onlyImage(node) {
  const children = node.children.filter(
    (child) => !(child.type === "text" && child.value.trim() === ""),
  );
  if (children.length !== 1) return undefined;
  return children[0].type === "image" ? children[0] : undefined;
}

/** mdast のまま HTML 要素を作る (book-columns.mjs と同じやり方)。 */
function element(tagName, properties, children) {
  return {
    type: "paragraph",
    data: { hName: tagName, hProperties: properties },
    children,
  };
}

function fail(ctx, message) {
  const file = ctx.fileURL ? ctx.fileURL.pathname : "";
  throw new Error(`[book-figures] ${file ? `${file} - ` : ""}${message}`);
}
