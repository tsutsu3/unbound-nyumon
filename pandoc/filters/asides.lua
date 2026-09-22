--[[
  Starlight Directive から変換された fenced Div を、PDF / EPUB 用の枠へ変換する。

    ::: {.column data-title="Unbound 1.26.0"}
    本文
    :::

  src/content/docs/ では `:::column[Unbound 1.26.0]` と書く。
  scripts/export-book.mjs が Pandoc 用の fenced Div へ書き換える。

  出力:
    LaTeX  \begin{implcolumn}{Unbound 1.26.0} ... \end{implcolumn}
           \begin{bookasidenote}{タイトル} ... \end{bookasidenote}
           (定義は pandoc/latex/preamble.tex)
    その他 <div class="book-column"> / <div class="book-aside book-aside--note">
           (見た目は pandoc/epub/style.css)
]]

local COLUMN_LABEL = "実装から見ると"

local ASIDES = {
  note = { env = "bookasidenote", class = "note", title = "ノート" },
  tip = { env = "bookasidetip", class = "tip", title = "ヒント" },
  caution = { env = "bookasidecaution", class = "caution", title = "注意" },
  danger = { env = "bookasidedanger", class = "danger", title = "危険" },
}

local function trim(s)
  return (s:gsub("^%s+", ""):gsub("%s+$", ""))
end

local function has_class(el, class)
  for _, value in ipairs(el.classes) do
    if value == class then return true end
  end
  return false
end

--- data-title の Markdown を Inline として読む。`code` などの表現をタイトルでも保つ。
local function parse_title(text)
  if text == "" then return pandoc.Inlines({}) end
  local document = pandoc.read(text, "markdown")
  local block = document.blocks[1]
  if block and (block.t == "Para" or block.t == "Plain") then return block.content end
  return pandoc.Inlines({ pandoc.Str(text) })
end

--- インラインを LaTeX へ書き出す。タイトルに `_` や `#` が含まれても壊れないようにする。
local function to_latex(inlines)
  return pandoc.write(pandoc.Pandoc({ pandoc.Plain(inlines) }), "latex"):gsub("%s+$", "")
end

local function wrap_latex(env, arg, body)
  local blocks = pandoc.List()
  blocks:insert(pandoc.RawBlock("latex", "\\begin{" .. env .. "}{" .. arg .. "}"))
  blocks:extend(body)
  blocks:insert(pandoc.RawBlock("latex", "\\end{" .. env .. "}"))
  return blocks
end

local function column(version, body)
  if FORMAT:match("latex") then
    return wrap_latex("implcolumn", "Unbound " .. version, body)
  end
  local head = pandoc.Div({
    pandoc.Para({
      pandoc.Span({ pandoc.Str(COLUMN_LABEL) }, { class = "book-column__label" }),
      pandoc.Span({ pandoc.Str("Unbound " .. version) }, { class = "book-column__version" }),
    }),
  }, { class = "book-column__head" })
  return pandoc.Div({ head, pandoc.Div(body, { class = "book-column__body" }) }, { class = "book-column" })
end

local function aside(spec, title_inlines, title_text, body)
  local has_title = #title_inlines > 0
  if FORMAT:match("latex") then
    local arg = has_title and to_latex(title_inlines) or spec.title
    return wrap_latex(spec.env, arg, body)
  end
  local title = has_title and title_inlines or pandoc.Inlines({ pandoc.Str(spec.title) })
  local head = pandoc.Div({ pandoc.Para(title) }, { class = "book-aside__title" })
  return pandoc.Div(
    { head, pandoc.Div(body, { class = "book-aside__content" }) },
    { class = "book-aside book-aside--" .. spec.class, ["aria-label"] = has_title and title_text or spec.title }
  )
end

function Div(el)
  local title_text = trim(el.attributes["data-title"] or "")

  if has_class(el, "column") then
    local version = title_text:match("^Unbound (%d+%.%d+%.%d+)$")
    if not version then
      error("[asides] コラムにバージョンがありません: " .. title_text)
    end
    if #el.content == 0 then error("[asides] column の本文が空です。") end
    return column(version, el.content)
  end

  for name, spec in pairs(ASIDES) do
    if has_class(el, name) then
      if #el.content == 0 then error("[asides] " .. name .. " の本文が空です。") end
      return aside(spec, parse_title(title_text), title_text, el.content)
    end
  end

  return nil
end
