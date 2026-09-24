---
title: dnsmasq は再帰解決をしない
description: dnsmasq が上流へ転送するフォワーダーであることと、Pi-hole や AdGuard Home の上流に Unbound を置く理由を説明します。
---

Pi-hole を動かせば、LAN の名前解決も広告のブロックも足りているように見えます。それでも上流に Unbound を置く構成が使われます。理由は、両者が担う役割が違うからです。

## dnsmasq は上流へ渡す

dnsmasq の man は、自身の動作を次のように書いています[^dnsmasq-man]。

> Dnsmasq accepts DNS queries and either answers them from a small, local, cache or forwards them to a real, recursive, DNS server.

dnsmasq が答えるのは、自分のキャッシュに答えがある場合です。それ以外は、`--server` や `/etc/resolv.conf` で指定された上流へ転送します。

## たどる処理が dnsmasq の中にない

man は、dnsmasq 自身の位置づけをさらにはっきり書いています[^dnsmasq-man]。

> Dnsmasq is a DNS query forwarder: it is not capable of recursively answering arbitrary queries starting from the root servers but forwards such queries to a fully recursive upstream DNS server which is typically provided by an ISP.

ルートサーバーから始めて任意の問い合わせに再帰的に答える能力はない、と自ら書いています。[名前解決とキャッシュ](/ja/01-dns-minimum/03-resolution-cache/)で見たように、キャッシュに答えがなければ、誰かがルート DNS サーバーから委任をたどらなければなりません。dnsmasq はこの処理を持ちません。転送先が答えを持っていなければ、その先を探すのも転送先です。dnsmasq から見えるのは、上流へ投げた問い合わせにいつか答えが返ってくることだけです。

DNSSEC 検証にも同じことが表れます。dnsmasq は転送時に検証に必要なレコードを要求して検証しますが、man はその前提として、DNSSEC を有効にしてビルドされていること、検証の起点になる情報（信頼アンカー）が与えられていること、そして上流が DNSSEC のレコードを返せることを挙げています。検証の材料を自分で取りに行かず、転送先から受け取るためです。上流が対応していなければ答えの信頼性を判定できず、名前解決そのものが成り立たなくなる、と man は書いています。

## Pi-hole が担うのはフィルタリングと DHCP

Pi-hole の DNS 部分は FTL（`pihole-FTL`）です。公式ドキュメントは、FTL のうち名前解決を担う部分を dnsmasq をもとにしたものだと説明しています[^pihole-ftl]。DHCP サーバーと Web サーバーも FTL が提供します。

[Pi-hole 公式の Unbound 向けガイド](https://docs.pi-hole.net/guides/dns/unbound/)は、FTL の動きをこう書いています[^pihole-guide]。

> Pi-hole includes a caching and forwarding DNS server, now known as FTLDNS. After applying the blocking lists, it forwards requests made by the clients to configured upstream DNS server(s).

ブロックリストを当てるところまでが Pi-hole の仕事で、残った問い合わせは上流へ転送されます。Pi-hole を入れても、誰かが再帰解決をしなければならない点は変わりません。その誰かは、Pi-hole に設定された上流のサーバーです。

## 上流に Unbound を置くと何が変わるか

上流を Unbound にすると、再帰解決を行うのが自分の手元のソフトウェアになります。Pi-hole はブロックリストを当てて Unbound へ渡し、Unbound はルート DNS サーバーから委任をたどって権威 DNS サーバーへ問い合わせ、答えをキャッシュし、DNSSEC 検証も行います。

![図2 Pi-hole と Unbound の役割分担](/figures/02-dns-software/03-dnsmasq-forwarder.svg)

Pi-hole 公式のガイドは、この構成の利点としてプライバシーを挙げています[^pihole-guide]。問い合わせを1つの上流へまとめて送らず、必要な権威 DNS サーバーへ直接聞くため、どこか1社が閲覧先の全体を記録できる状態にはならない、という説明です。

「なぜ2つ必要か」の答えは、この役割分担そのものです。Pi-hole は何を答えないかを決め、Unbound は答えを探してきます。どちらかがもう一方の代わりになるわけではありません。実際の設定は第9章で扱います。

## AdGuard Home も上流のサーバーへ送る

AdGuard Home の公式ドキュメントは、AdGuard Home を上流のサーバーへ問い合わせを送る DNS プロキシだと説明しています[^agh]。ブロックリストの扱いや実装は Pi-hole と別ですが、自分で再帰解決をせず上流へ送る点は同じです。上流に Unbound を置く理由も変わりません。

## なぜ 1.1.1.1 や 8.8.8.8 ではないのか

上流に `1.1.1.1` や `8.8.8.8` を指定する構成も成り立ちます。これらは事業者が運用するフルリゾルバーです。Pi-hole や AdGuard Home の上流に何を置くかは、機能の有無ではなく、再帰解決を誰に任せるかの判断です。

Pi-hole 公式のガイドは、この選択を「Whom can you trust?」という問いとして立てています[^pihole-guide]。ガイドが挙げているのは2点です。1つは、無料で使える DNS サービスが「プライベート」を掲げていても、約束が守られているかを利用者は確かめられないということ。もう1つは、大きな事業者のリゾルバーは攻撃側から見て価値が高いことです。1台汚染できれば大量の利用者に影響が及ぶためです。

上流に自分で運用する Unbound を置くと、再帰解決を外部へ任せず、自分の環境で行えます。問い合わせ先は名前ごとに分かれ、答えの正しさも手元で確かめることができます。

デメリットもあります。同じガイドは、初めて問い合わせる名前では階層をたどるぶん応答に時間がかかると説明しています。大きな事業者のフルリゾルバーでは多くの利用者から問い合わせを受けているため、よく使われる名前であれば、自分にとっては初めてでも、別の利用者の問い合わせで既にキャッシュされている可能性が高く、階層をたどらず応答が短く済みます。

Unbound でも、一度得た答えは TTL の間キャッシュされます。同じ名前を続けて引けば、階層をたどらずに返ります。

どちらが正しいという話ではありません。答えを探す仕事を他者に預けるか、自分の手元に置くかが違います。

[^dnsmasq-man]: dnsmasq [man page](https://thekelleys.org.uk/dnsmasq/docs/dnsmasq-man.html)。引用した2文は DESCRIPTION と、上流のサーバーの調べ方を説明する段落 (`--resolv-file` の前)。DNSSEC 検証の条件は `--dnssec`、権威ゾーンは `--auth-zone` の項にある

[^pihole-ftl]: Pi-hole: [FTLDNS](https://docs.pi-hole.net/ftldns/)

[^pihole-guide]: Pi-hole: [Unbound](https://docs.pi-hole.net/guides/dns/unbound/)

[^agh]: AdGuard Home: [Configuration](https://adguard-dns.io/kb/adguard-home/configuration/)
