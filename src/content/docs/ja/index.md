---
title: Unbound入門
description: DNS の基礎から Unbound を解説する入門書です。
tableOfContents: false
hero:
  tagline: DNS の基礎から Unbound を解説する入門書です。
  image:
    file: ../../../assets/mark-dark.svg
    alt: ""
  # 章を公開したらボタンを足す。存在しないページへはリンクしない。
  # actions:
  #   - text: 読み始める
  #     link: /ja/01-dns-minimum/01-actors/
  #     icon: right-arrow
  #   - text: Cookbook
  #     link: /ja/09-cookbook/lan-hostnames/
  #     variant: minimal
---

Unbound は、再帰問い合わせ、キャッシュ、DNSSEC 検証を行う DNS リゾルバーです。本書は、DNS の基礎から始めて、Unbound の設定を目的に応じて組み立てられる状態を目指します。

本書では次の3つを中心に扱います。

- **設定と、その設定が実際に何をするか** - `unbound-checkconf` / `unbound-control` / `dig` の実測出力を伴います
- **公式ドキュメントから読み取れない仕様・挙動** - man に記述がない、記述と実装が食い違う、記述どおりでも結果が直感に反するもの
- **Cookbook** - 「こうしたい」から設定を組み立てる手順

本書の挙動の記述は、断りがない限り Unbound 1.26.0で実測した結果です。

:::note
本書は執筆中です。公開済みのページは左のサイドバーから読めます。
:::
