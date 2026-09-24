---
title: PowerDNS / NSD と Unbound の位置
description: NSD と PowerDNS の位置づけを補い、本書が扱うのは再帰側の Unbound であることを示します。
---

## NSD - 権威専用

NSD は、権威 DNS サーバー専用のソフトウェアです。公式ドキュメントは、速度や信頼性、安定性、安全性が求められる環境に向けて開発したとしており、ルートサーバーの1つである k.root-servers.net や、複数の TLD のレジストリで使われていると説明しています[^nsd-readme]。

DNSSEC については、署名済みのゾーンを読み込めば自動的に有効になり、`dnssec-enable` のような設定は要らないと公式ドキュメントに明記されています[^nsd-conf]。

## PowerDNS - 2つのプロダクト

PowerDNS Authoritative は、ゾーンのデータの置き場を選べる権威 DNS サーバーです。公式ドキュメントはこの置き場を「バックエンド」と呼び、ゾーンファイルのほかに MySQL や PostgreSQL などのデータベースも選べるとしています[^pdns-backends]。DNSSEC については、ゾーンの署名もでき、外部で署名済みのゾーンを秘密鍵を持たずに配信することもできるとも書いています[^pdns-auth]。PowerDNS Recursor は再帰解決と DNSSEC 検証を担います[^pdns-recursor]。

本書では、この2つを必ず区別して書きます。「PowerDNS は再帰解決をする」とだけ書くと、Authoritative のことなのか Recursor のか分からないためです。

## 本書が扱うのは再帰側

ここまでの分類で言えば、Unbound はフルリゾルバーです。ルート DNS サーバーから委任をたどって答えを探し、その結果をキャッシュし、必要に応じて DNSSEC 検証を行います。本書が扱うのは、この再帰解決を行う側です。権威 DNS サーバーを運用し、自分のゾーンをインターネットに公開する方法は主題にしません。`auth-zone` のようにゾーンのデータを Unbound に持たせる設定は扱いますが、それは名前解決を自分の手元で完結させるための機能として取り上げます。

第3章では、フルリゾルバーとしての Unbound が、どのような機能と構成を持つソフトウェアなのかを見ていきます。

[^nsd-readme]: NSD [`doc/README`](https://github.com/NLnetLabs/nsd/blob/master/doc/README) の 1.0 Introduction

[^nsd-conf]: NSD [`nsd.conf(5)`](https://nsd.docs.nlnetlabs.nl/en/latest/manpages/nsd.conf.html#NSD_CONFIGURATION_FOR_BIND9_HACKERS) の NSD CONFIGURATION FOR BIND9 HACKERS

[^pdns-backends]: PowerDNS [Authoritative Nameserver の概要](https://doc.powerdns.com/authoritative/)。バックエンドの一覧は [Backends](https://doc.powerdns.com/authoritative/backends/)

[^pdns-auth]: PowerDNS Authoritative Server: [DNSSEC](https://doc.powerdns.com/authoritative/dnssec/)

[^pdns-recursor]: PowerDNS Recursor: [DNSSEC](https://doc.powerdns.com/recursor/dnssec.html)
