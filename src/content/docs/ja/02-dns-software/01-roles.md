---
title: DNS ソフトウェアを役割で見る
description: 権威 DNS サーバー、フルリゾルバー、フォワーダーの3分類で、主な DNS ソフトウェアの位置を整理します。
---

BIND、Unbound、NSD、PowerDNS、dnsmasq は、どれも DNS に関わるソフトウェアですが、担っている役割は同じではありません。製品名だけを並べても違いは見えにくいため、この章では性能や優劣ではなく、各ソフトウェアがどのような役割を担うためのものなのかを整理します。

## 権威 DNS サーバーとフルリゾルバーは、ソフトウェアの分類でもある

[権威 DNS サーバーとフルリゾルバー](/ja/01-dns-minimum/01-actors/)という役割の区別は、そのままソフトウェアの分類になります。NSD は権威 DNS サーバーを動かすためのソフトウェアであり、Unbound はフルリゾルバーを動かすためのソフトウェアです。スタブリゾルバーは端末の中の部品なので、サーバーとして動かすソフトウェアの分類には含まれません。

## フォワーダー - 自分では解決せず転送する

分類にはもう1つ、**フォワーダー**（forwarder）があります。フォワーダーは、受け取った問い合わせを自分で解決せず、あらかじめ指定された上流のサーバーへそのまま送る役割です。委任をたどる処理はフォワーダーの中になく、残りの解決は転送先が引き受けます。

自分で解決しない点はスタブリゾルバーと同じですが、立つ位置が違います。スタブリゾルバーは、1台の端末の中でアプリケーションの依頼を受け取る部品です。フォワーダーは LAN の端末から問い合わせを受け取るサーバーで、得た答えをキャッシュして次の端末にも返します。本書で扱う範囲では dnsmasq がこれにあたり、Pi-hole や AdGuard Home も同じ位置にいます。

本書では「フォワーダー」を、転送する側にだけ使います。Unbound の `forward-zone` で指定する相手は「転送先」または「上流」と呼び、フォワーダーとは呼びません。

![図1 フォワーダー、フルリゾルバー、権威 DNS サーバーの位置と問い合わせの向き](/figures/02-dns-software/01-roles.svg)

## 役割で分類する

主なソフトウェアをこの3分類で整理します[^docs]。

| ソフトウェア           | 再帰解決 | 権威   | 上流への転送 | DNSSEC 検証 | DHCP | 主用途                            |
| ---------------------- | -------- | ------ | ------------ | ----------- | ---- | --------------------------------- |
| Unbound                | する     | 限定的 | する         | する        | なし | フルリゾルバー                    |
| NSD                    | しない   | する   | しない       | しない      | なし | 権威 DNS サーバー                 |
| BIND                   | する     | する   | する         | する        | なし | 権威とリゾルバーの兼用            |
| PowerDNS Recursor      | する     | 限定的 | する         | する        | なし | フルリゾルバー                    |
| PowerDNS Authoritative | しない   | する   | しない       | しない      | なし | 権威 DNS サーバー                 |
| dnsmasq                | しない   | 限定的 | する         | 条件付き    | する | フォワーダー（小規模 LAN の入口） |

フォワーダーは製品の種類ではなく役割です。「上流への転送」の列が示すとおり、Unbound も `forward-zone` を使えば転送する側として動きます。違うのは、dnsmasq が再帰解決はしない点です。

「DNSSEC 検証」の列は、応答に付与された署名を検証し、DNS 応答が正しいものであることを確認する機能を持つかどうかを示します。DNSSEC の仕組みは第8章で詳しく扱うため、ここでは各ソフトウェアが検証を行うかどうかだけを確認してください。権威 DNS サーバーの2つが「しない」となっているのは、権威 DNS サーバーの役割が、署名済みのゾーン情報を配信することだからです。その署名が正しいかどうかを検証するのは、応答を受け取る側の役割です。

DHCP の列は、そのソフトウェア自身が DHCP サーバーを持つかどうかを示します。公式ドキュメントが DHCP サーバーを機能として挙げているのは dnsmasq だけで、「小規模 LAN の入口」という主用途もここから来ています。

## 表の「限定的」「条件付き」が指すもの

表中の「限定的」と「条件付き」は、単に機能の有無だけでは表せない場合に使っています。

「限定的」は、その機能を使える範囲が限られていることを示します。「条件付き」は、利用するために追加の条件を満たす必要があることを示します。それぞれの意味は次のとおりです。

- Unbound の権威（限定的）
  `auth-zone` で読み込んだゾーンについては、権威 DNS サーバーのように応答できます。ただし、一般的な権威 DNS サーバーとして動作するのではなく、設定したゾーンに限られます。

- PowerDNS Recursor の権威（限定的）
  `auth-zones` で読み込んだゾーンを、権威をもって応答します。ただし公式ドキュメントは、応答に AA ビットを立てないことと、この機能では DNSSEC を扱わないことを断っています。

- dnsmasq の権威（限定的）
  `--auth-zone` で指定したゾーンについて、ローカルに設定したレコードを権威的な情報として応答できます。

- dnsmasq の DNSSEC 検証（条件付き）
  DNSSEC 検証を利用できますが、dnsmasq 自身が検証に必要な情報を再帰的に取得するわけではありません。ビルド時に DNSSEC が有効になっていることに加え、転送先が DNSSEC のレコードを返せる必要があります。詳しい条件は[dnsmasq は再帰解決をしない](/ja/02-dns-software/03-dnsmasq-forwarder/)で扱います。

いずれも「機能がない」という意味ではありません。

[^docs]: Unbound: [`unbound(8)`](https://unbound.docs.nlnetlabs.nl/en/latest/manpages/unbound.html#description)、[Authority Zone Options](https://unbound.docs.nlnetlabs.nl/en/latest/manpages/unbound.conf.html#authority-zone-options)、[Forward Zone Options](https://unbound.docs.nlnetlabs.nl/en/latest/manpages/unbound.conf.html#forward-zone-options)。本書が根拠にしたのは tag `release-1.26.0` の原文で、リンク先は最新版。
    NSD: `doc/NSD-FOR-BIND-USERS` / `doc/README`、[nsd.conf(5)](https://nsd.docs.nlnetlabs.nl/en/latest/manpages/nsd.conf.html)。
    BIND 9: Administrator Reference Manual の [1.4.6. DNS and BIND 9](https://bind9.readthedocs.io/en/latest/chapter1.html#dns-and-bind-9)、Configuration Reference の [`dnssec-validation`](https://bind9.readthedocs.io/en/latest/reference.html#namedconf-statement-dnssec-validation) と [`forwarders`](https://bind9.readthedocs.io/en/latest/reference.html#namedconf-statement-forwarders)。
    PowerDNS Recursor: [Settings](https://doc.powerdns.com/recursor/settings.html) (`auth-zones` / `forward-zones`)。
    PowerDNS Authoritative: [DNSSEC](https://doc.powerdns.com/authoritative/dnssec/)、[Recursion](https://doc.powerdns.com/authoritative/guides/recursion.html)。
    dnsmasq: [man page](https://thekelleys.org.uk/dnsmasq/docs/dnsmasq-man.html)。
