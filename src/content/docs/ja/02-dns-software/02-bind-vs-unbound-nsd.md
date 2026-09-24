---
title: 兼用と分離
description: BIND と Unbound + NSD の違いを、権威とリゾルバーを1つで兼ねるか分けるかという設計の選択として説明します。
---

「BIND と Unbound はどちらを使えばよいのか」という問いは、そのままでは答えるのは困難です。BIND は権威 DNS サーバーとフルリゾルバーの両方を担えますが、Unbound が担うのはフルリゾルバーです。比べる対象が揃っていません。

役割をそろえて比べるなら、BIND と Unbound + NSD です。違いは、「1つのソフトウェアに複数の役割を持たせるか」「役割ごとに別のソフトウェアへ分けるか」です。ここでは、この設計上の違いを見ていきます。

## BIND は1つで両方を担える

BIND 9 の公式ドキュメントは、`named.conf` の書き方によって、権威 DNS サーバーにもフルリゾルバーにもなると説明しています[^bind-arm]。さらに、小規模な運用では1台のサーバーが権威 DNS サーバーとフルリゾルバーを兼ねる構成も取れるとしています。設定で役割が決まる仕組みです。

## Unbound と NSD は初めから分かれている

NLnet Labs は、フルリゾルバーの Unbound と権威 DNS サーバーの NSD を別のソフトウェアとして開発しています。NSD の配布物に含まれる BIND 利用者向けの文書は、NSD について次のように書いています[^nsd-bind]。

> NSD only serves authoritatively. So, NSD does not provide caching, and does not provide recursion, or resolver functionality.

NSD が行うのは権威応答だけです。キャッシュや再帰解決、リゾルバーとしての機能は持ちません。

同じ文書では、NSD はルートゾーンのヒントを必要とせず、設定ファイルからルートゾーンを外してよいことも説明されています。つまり、再帰解決を設定で無効にしているのではありません。再帰解決の機能そのものを持たない設計です。

Unbound 側にも、NSD との併用を想定した記述があります。Unbound 1.26.0 の man では、権威 DNS サーバーも必要な場合には NSD を利用できること、その際は両方が同じ53番ポートを使うため構成に注意が必要であることが説明されています[^unbound-man]。

## PowerDNS も分けている

PowerDNS も役割ごとに分かれています。権威 DNS サーバーの PowerDNS Authoritative と、フルリゾルバーの PowerDNS Recursor が別のプロダクトです。

ただし、そこへ至った経緯は Unbound と NSD とは違います。PowerDNS Authoritative はかつて再帰解決もできました。公式ドキュメントは、その機能が 4.1.0 で削除されたと書いています[^pdns-recursion]。同じページでは、再帰解決が要る場合は Recursor を使う構成へ移るよう案内しています。

## 分けると何が変わるか

役割を分けると、権威 DNS サーバーとフルリゾルバーは別々のプロセスとして動きます。そのため権威側でゾーンの読み込みに失敗しても、それがそのままフルリゾルバーの停止にはなりません。

一方で、管理するプロセスや設定ファイルは増えます。起動、監視、ログの確認なども、それぞれのソフトウェアについて行う必要があります。

ここまでの利点と引き換えは、本書の整理です。NLnet Labs が、こうした分離そのものを設計上の利点として説明している文書は、調べた範囲では見つかりませんでした。同様に、ISC が BIND で権威 DNS サーバーとフルリゾルバーを兼用しないよう勧めている記述も見つかりませんでした。

BIND 9 の公式ドキュメントにあるのは、大規模な事業者では1台のサーバーに1つの機能だけを持たせる構成が一般的である、という説明です[^bind-arm]。ただし、これは BIND が両方の役割を担えることを否定するものではありません。

ここで重要なのは、どちらが優れているかではありません。BIND は1つのソフトウェアで複数の役割を担えるように作られ、Unbound と NSD はそれぞれの役割を別のソフトウェアに分けています。設計が違う、ということです。

[^bind-arm]: BIND 9 Administrator Reference Manual の [1.4.6. DNS and BIND 9](https://bind9.readthedocs.io/en/latest/chapter1.html#dns-and-bind-9)

[^nsd-bind]: NSD [`doc/NSD-FOR-BIND-USERS`](https://github.com/NLnetLabs/nsd/blob/master/doc/NSD-FOR-BIND-USERS) の 2. Authoritative only

[^unbound-man]: Unbound の [`unbound(8)` の DESCRIPTION](https://unbound.docs.nlnetlabs.nl/en/latest/manpages/unbound.html#description)。本書が根拠にしたのは tag `release-1.26.0` の `doc/unbound.rst` で、リンク先は最新版

[^pdns-recursion]: PowerDNS Authoritative Server: [Recursion](https://doc.powerdns.com/authoritative/guides/recursion.html)
