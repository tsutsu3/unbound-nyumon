---
title: RFC ガイド
description: 本書が根拠にしている RFC を、章と目的から逆引きするための表です。
---

本書で参照する RFC を、章と目的から逆引きできるようにまとめています。

各ページの脚注は、その記述の根拠となる RFC の節を直接示しています。このページは「この話題を調べるなら、どの RFC を見ればよいか」を探すためのガイドです。

## 章から引く

| 章    | RFC                                                          | その章で使う範囲                                                         |
| ----- | ------------------------------------------------------------ | ------------------------------------------------------------------------ |
| 第1章 | [RFC 1034](https://www.rfc-editor.org/rfc/rfc1034) (STD 13)  | 名前空間、委任、ゾーン、委任応答、リゾルバーの動作                       |
| 第1章 | [RFC 1035](https://www.rfc-editor.org/rfc/rfc1035) (STD 13)  | 名前とラベルの長さの上限、RR のテキスト表現、TXT                         |
| 第1章 | [RFC 2181](https://www.rfc-editor.org/rfc/rfc2181)           | ゾーンカット、RRset と TTL、CNAME と PTR の制約                          |
| 第1章 | [RFC 2308](https://www.rfc-editor.org/rfc/rfc2308)           | NXDOMAIN と NODATA、ネガティブキャッシュと SOA MINIMUM                   |
| 第1章 | [RFC 9499](https://www.rfc-editor.org/rfc/rfc9499) (BCP 219) | スタブリゾルバー / フルリゾルバー / 権威 DNS サーバーの定義              |
| 第2章 | なし                                                         | 役割の分類は各プロジェクトの公式ドキュメントによる。各ページの脚注を参照 |

この表に載せるのは、本文が実際に根拠として引いた RFC だけです。章が増えれば行も増えます。

## 目的から引く

| 調べたいこと                   | RFC                                                                                                    |
| ------------------------------ | ------------------------------------------------------------------------------------------------------ |
| 用語の定義                     | [RFC 9499](https://www.rfc-editor.org/rfc/rfc9499)                                                     |
| 名前空間と委任                 | [RFC 1034](https://www.rfc-editor.org/rfc/rfc1034)、[RFC 2181](https://www.rfc-editor.org/rfc/rfc2181) |
| 名前・ラベルの長さ             | [RFC 1035](https://www.rfc-editor.org/rfc/rfc1035)                                                     |
| RRset と TTL                   | [RFC 2181](https://www.rfc-editor.org/rfc/rfc2181)                                                     |
| 「ない」という答えのキャッシュ | [RFC 2308](https://www.rfc-editor.org/rfc/rfc2308)                                                     |
| CNAME と PTR の制約            | [RFC 2181](https://www.rfc-editor.org/rfc/rfc2181)                                                     |

## 本書で参照する節

各 RFC について、本書が実際に参照する節だけを挙げます。

### [RFC 1034](https://www.rfc-editor.org/rfc/rfc1034) - Domain Names: Concepts and Facilities

- [4.3.1. Queries and responses](https://www.rfc-editor.org/rfc/rfc1034#section-4.3.1) - RD ビットと再帰的問い合わせ

### [RFC 1035](https://www.rfc-editor.org/rfc/rfc1035) - Domain Names: Implementation and Specification

- [2.3.4. Size limits](https://www.rfc-editor.org/rfc/rfc1035#section-2.3.4) - ラベルは63バイト、名前は255バイト
- [3.3. Standard RRs](https://www.rfc-editor.org/rfc/rfc1035#section-3.3) - `<character-string>` の定義
- [3.3.14. TXT RDATA format](https://www.rfc-editor.org/rfc/rfc1035#section-3.3.14) - TXT の RDATA

この文書の 2.3.4 は TTL を signed と書いていますが、これは RFC 2181 の 8 が符号なしに訂正しています。本書は TTL の範囲をこの節から引きません。

### [RFC 2181](https://www.rfc-editor.org/rfc/rfc2181) - Clarifications to the DNS Specification

- [6.1. Zone authority](https://www.rfc-editor.org/rfc/rfc2181#section-6.1) - 子は親への参照を持たない。SOA と NS はすべてのゾーンに必須
- [8. Time to Live (TTL)](https://www.rfc-editor.org/rfc/rfc2181#section-8) - TTL は最大値であり、上限をかけるのは実装の自由
- [10.1. CNAME resource records](https://www.rfc-editor.org/rfc/rfc2181#section-10.1) - CNAME と他の型の排他
- [10.2. PTR records](https://www.rfc-editor.org/rfc/rfc2181#section-10.2) - PTR は A の裏返しではない

### [RFC 2308](https://www.rfc-editor.org/rfc/rfc2308) - Negative Caching of DNS Queries (DNS NCACHE)

- [4. SOA Minimum Field](https://www.rfc-editor.org/rfc/rfc2308#section-4) - ネガティブキャッシュの保存時間の出どころ
- [5. Caching Negative Answers](https://www.rfc-editor.org/rfc/rfc2308#section-5) - 「ない」という答えをキャッシュする

### [RFC 9499](https://www.rfc-editor.org/rfc/rfc9499) - DNS Terminology

- [6. DNS Servers and Clients](https://www.rfc-editor.org/rfc/rfc9499#section-6) - 3者とフォワーダーの定義

## 更新関係

DNS の仕様は、古い RFC を後の RFC が補足したり更新したりしながら発展しています。そのため、古い RFC だけを読むと、現在の規定と異なる記述をそのまま受け取ってしまうことがあります。本書で参照する範囲で関係する主な更新を示します。

| 更新する側                                              | 更新される側                                                | 何が変わったか                                    |
| ------------------------------------------------------- | ----------------------------------------------------------- | ------------------------------------------------- |
| [RFC 2181](https://www.rfc-editor.org/rfc/rfc2181) の 8 | [RFC 1035](https://www.rfc-editor.org/rfc/rfc1035) の 2.3.4 | TTL は符号なしの数値である                        |
| [RFC 8020](https://www.rfc-editor.org/rfc/rfc8020)      | [RFC 2308](https://www.rfc-editor.org/rfc/rfc2308) の 5     | NXDOMAIN はその下のすべての名前にも効く           |
| [RFC 9520](https://www.rfc-editor.org/rfc/rfc9520)      | [RFC 2308](https://www.rfc-editor.org/rfc/rfc2308) の 7     | SERVFAIL などの解決失敗のキャッシュはこちらによる |
| [RFC 9499](https://www.rfc-editor.org/rfc/rfc9499)      | [RFC 2308](https://www.rfc-editor.org/rfc/rfc2308)          | forwarder と QNAME の定義を更新                    |

用語については、廃止された RFC 8499 と RFC 7719 を引かず、[RFC 9499](https://www.rfc-editor.org/rfc/rfc9499) を引きます。
