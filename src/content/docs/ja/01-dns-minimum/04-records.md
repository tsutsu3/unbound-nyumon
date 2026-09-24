---
title: 本書で使う RR
description: A / AAAA / CNAME / NS / PTR / TXT / SOA が何を表すレコードかを、本書で使う範囲に絞って説明します。
---

DNS が返す情報の単位を**リソースレコード**（Resource Record、以降 RR）と呼びます。1つの RR は、名前、型、値の組に TTL とクラスを加えたものです。

```text
www.example.com.   3600   IN       A    192.0.2.1
名前                TTL    クラス   型   値
```

本書では `IN`（Internet）クラスだけを扱います。

型は、その名前について何を聞いているかを表します。同じ名前でも、A を聞けば IPv4 アドレスが、NS を聞けば権威 DNS サーバーの名前が返ります。名前が同じでも型が違えば別のデータです。

## RRset - 問い合わせに返る単位

名前、型、クラスが同じで、値だけが違う RR は複数存在できます。`example.com` に IPv4 アドレスが2つ割り当てられている場合がこれにあたります。この集合を **RRset** と呼びます。

問い合わせに対しては、RRset の一部ではなく全体が返ります。値を1つずつ取り出して返すことはありません。この単位は、第4章でキャッシュの単位を扱うときに再び出てきます。

## 本書で使う7つの型

| 型      | 何を表すか                          | 本書での使いどころ             |
| ------- | ----------------------------------- | ------------------------------ |
| `A`     | IPv4 アドレス                       | 第5章 `local-data`             |
| `AAAA`  | IPv6 アドレス                       | 第5章 `local-data`             |
| `CNAME` | 別名                                | 第5章 `local-data`             |
| `NS`    | ゾーンの権威 DNS サーバー           | 第1章の委任、第6章 `stub-zone` |
| `PTR`   | IP アドレスから名前を引くための情報 | 第5章 `local-data-ptr`         |
| `TXT`   | 任意の文字列                        | 第5章 `local-data`             |
| `SOA`   | ゾーンの管理情報                    | 第4章のネガティブキャッシュ    |

### A / AAAA

A は IPv4 アドレス、AAAA は IPv6 アドレスを表します。同じ名前に両方を置けます。

### CNAME

CNAME は、ある名前が別の名前の別名であることを表します。`www.example.com` に `web.example.com` を値とする CNAME があれば、`www.example.com` を引いた側は `web.example.com` を引き直します。

CNAME には制約があります。CNAME を持つ名前は、他の型のデータを持てません[^cname]。A と CNAME を同じ名前に共存させることはできません。例外は DNSSEC 用のレコードで、これは第8章で扱います。第5章で `local-data` を書くときは、この制約に従う必要があります。

### NS

NS は、そのゾーンの権威 DNS サーバーの名前を表します。[委任](/ja/01-dns-minimum/02-hierarchy-zone/)は、親ゾーンに置かれた NS RR で表現されます。NS は親ゾーンと子ゾーンの両方に現れ、親ゾーンのものが委任応答として返ります。

### PTR

PTR は、IP アドレスから名前を引くために使います。逆引き用の名前は `in-addr.arpa`（IPv4）や `ip6.arpa`（IPv6）の下に作られ、`192.0.2.1` であれば `1.2.0.192.in-addr.arpa` の PTR を引きます。

PTR は A の裏返しではありません。A と PTR は別のゾーンにある別のデータであり、片方を書いたからといってもう片方が自動的にできるわけではありません[^ptr]。

### TXT

TXT は文字列を保持します。1つの TXT RR は文字列を複数持つことができ、その1つ1つに長さの上限があります[^txt]。この境界が実際に問題になるのは第5章なので、ここでは「文字列を持つ型」とだけ押さえておきます。

### SOA

SOA は、ゾーンの管理情報を持つ RR です。ゾーン頂点に必ず置かれ、そのゾーンの更新や再取得に関する値を持ちます。

SOA の各フィールドのうち MINIMUM は、そのゾーンに対する否定応答をどれだけキャッシュしてよいかに関わります。つまり SOA は、存在しない名前の扱いにも影響します。この関係は第4章で扱います。

[^cname]: [RFC 2181 の 10.1. CNAME resource records](https://www.rfc-editor.org/rfc/rfc2181#section-10.1)

[^ptr]: [RFC 2181 の 10.2. PTR records](https://www.rfc-editor.org/rfc/rfc2181#section-10.2)

[^txt]: [RFC 1035 の 3.3. Standard RRs](https://www.rfc-editor.org/rfc/rfc1035#section-3.3) が `<character-string>` を定義し、[3.3.14. TXT RDATA format](https://www.rfc-editor.org/rfc/rfc1035#section-3.3.14) が TXT の RDATA を定める。
