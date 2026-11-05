# Build 4 リリース候補・実機受入手順

2026-11-04（UTC）。TASK-020〜022の受入済みコードを含む次の署名付きiOS版を準備する。
**ローカル検証は完了。署名ビルド・Appleへの提出・TestFlight配布・実機更新は未実施。**

2026-11-05（日本時間）追記：`dedc060`で準備差分のLGTMを受領。Antigravityの認証済み環境ではremote番号3・重複/未完了ジョブなし・Build 3の提出FINISHEDを照合済み。このCodex環境の`eas whoami`は`Not logged in`、番号照会もExpo認証要求で停止した。ビルドコマンドは未開始で、Build ID/提出IDは未発行。認証済みのAntigravity環境で以下の手順を実行するか、この環境の既存EXPO_TOKENと通信設定を反映してから再開する。過去のジョブ照合をもとに再確認なしで新規ビルドを開始しない。

## 対象と検証結果

| 項目 | 候補 / 確認結果 |
| --- | --- |
| 受入済み機能の基準コミット | `cc6a7fecb4f9e0fdd5afbc760b9ac5d6843a6ec6` |
| TASK-020 | 余白と文字階層を整理した白・濃紺のUI、入力を保持する折りたたみ |
| TASK-021 | 全12種目の模型風SVG図解、初心者手順、元画面の入力を保持するガイド |
| TASK-022 | 16ブランド・47都道府県、女性向け/公共/地域施設の検索、お気に入り保存 |
| アプリ | GymFinder / `com.peroki.gymfinder` / `1.0.0` |
| 希望する次のビルド番号 | `4`（Antigravityがremote現在値3を照合済み。実際の割当番号はビルド時に確認） |
| Expo | `peroki1226/gymfinder` / `707c6e89-6ed5-4d65-a6bb-90472a724971` |
| App Store Connect | `6828502638` |
| 自動テスト | 20スイート・150テスト成功、失敗/スキップ0 |
| 型検査 / release:check | 成功 |
| Metroエクスポート | iOS / Android Hermes、Webの生成成功。署名済みIPAではない |

ソースと生成バンドルのハッシュ、未実施項目は[候補記録](../mobile/store/IOS_BUILD4_CANDIDATE.json)に保存する。基準コミットは受入済み機能の出自であり、次回ビルドの実際のソースコミットではない。準備変更は、写真ライブラリ用途説明に既存の「食事写真」用途を追記したものとリリース記録のみ。新しい権限や保存スキーマは追加していない。

## Build 3を先に確認する

[既存の記録](../mobile/store/IOS_RELEASE_STATUS.json)はBuild 3専用。EAS Build IDは`9ba7dd8b-a1e4-4c34-a2cb-4ee5b225c785`、提出IDは`9dc718a2-9a94-478b-bcd4-60be4aad2331`。`dedc060`ではAntigravityによるEAS提出状態`FINISHED`の直接照合を記録。引継ぎにはApple処理完了との報告もあるが、EAS提出完了とTestFlightの配信可否は分けて扱い、招待・実機更新は未確認のまま保全する。Codexでの今回の認証確認は失敗しており、ライブ状態を確認できていない。

- 認証済み環境で`mobile/`から`npm run release:ios:status`を実行する。
- [App Store ConnectのTestFlight管理画面](https://appstoreconnect.apple.com/apps/6828502638/testflight/ios)で処理結果、必要な申告、テスター割当、有効期限を確認する。EASへの提出成功だけではAppleの処理完了を意味しない。
- Build 3の再提出は行わない。`release:ios:status` / `release:ios:submit`は既存JSONの固定対象を扱うため、Build 4用と解釈しない。既存のBuild 3記録を候補番号で上書きしない。

## 認証と重複確認後に新しいビルドを開始する

クラウド環境の既存`EXPO_TOKEN`要件には安全な値の設定がなく、Expo向け通信設定も実行環境へ未反映。環境設定で値を入力し、設定を保存・反映後に接続を再確認する。パスワードやトークンをチャット、Git、ログへ貼り付けない。本人の認証済みPCでも同じ手順を再開できる。

作業場所は`mobile/`。インストール済みEAS CLIを使う。以下の`EXPO_NO_TELEMETRY=1`はこのクラウド環境でExpo設定読取りの失敗を避けるための指定。PowerShellでは先に`$env:EXPO_NO_TELEMETRY="1"`を設定し、各コマンドの先頭の指定を省く。**EASのAPI操作には`EXPO_OFFLINE=1`を付けない。**

```sh
# すべて読取り。認証が成功してから番号と既存ジョブを確認する。
EXPO_NO_TELEMETRY=1 npx eas project:info
EXPO_NO_TELEMETRY=1 npx eas build:version:get --platform ios --profile production --json --non-interactive
EXPO_NO_TELEMETRY=1 npx eas build:list --platform ios --build-profile production --limit 50 --json --non-interactive
EXPO_NO_TELEMETRY=1 npx eas build:list --platform ios --build-profile production --app-version 1.0.0 --app-build-version 4 --limit 50 --json --non-interactive
```

1. projectId・Bundle ID・App Store Connectアプリと既存のAppleチーム/署名を照合する。プロジェクトや署名鍵を作り直さない。
2. 対象機能を含む同一候補のビルドが進行中/完成済みなら、そのIDとソースを確認して追跡し、新しいジョブを起動しない。上限件数に達する場合は追加ページも確認する。
3. `appVersionSource=remote`、`autoIncrement=true`。ローカルの`ios.buildNumber="2"`を4に変えても配布番号は保証されない。remoteが3か確認し、既に4以上なら番号を巻き戻さず、割り当て予定の番号を確認して候補記録を更新する。
4. 最新mainを取得し、作業ツリーがクリーンな状態で`git rev-parse HEAD`を記録する。そのソースから一度だけ実行する。

```sh
EXPO_NO_TELEMETRY=1 npm run build:ios:testflight
```

この既存コマンドは設定・型・テストを検証し、productionで署名ビルドと自動提出を行う。実際のBuild IDを控える。キュー待ち、通信切断、コマンドの中断だけを理由に同じコマンドを再実行しない。先にEASのジョブ/提出履歴を照合する。

## 完了したジョブと提出を照合する

新しいIDを明示して`npx eas build:view <実際のBuild-ID> --json`で確認する。`--latest`は使わない。

- `FINISHED`、production/store、実機向け、同じprojectId/Bundle ID、バージョンと実際のbuildNumber、`gitCommitHash`が開始前のコミットと一致することを確認する。
- EASの当該ビルドに紐づく提出履歴と、提出先`6828502638`を照合する。通常の`build:view --json`だけでは提出履歴を確認できない。自動提出済みなら追加提出しない。失敗時も提出試行・提出IDを先に確認する。
- `IOS_BUILD4_CANDIDATE.json`の実際のBuild ID・番号・ソースコミット・提出ID・状態を確認結果で更新する。署名成果物のURLはそのIDから取得する。Build 3のIPAを流用しない。
- Apple処理完了・テスター割当と招待の有効性を確認してから「更新可能」と案内する。一般公開は別工程。

## PeroのiPhoneで確認する（まだ未実施）

| 段階 | 操作と記録する結果 |
| --- | --- |
| 更新前 | 既存アプリの版、トレーニング/家トレ/食事/体重ログ、お気に入り、設備投稿、言語設定の件数と内容を控える。個人データの画像は公開Gitへ置かない |
| 上書き更新 | 同じBundle ID・AppleチームのTestFlight版で更新。アプリを削除しない。Ad Hoc版からの更新も実際の端末で確認し、自動保持を断言しない |
| 版の照合 | TestFlightの実際のバージョン/ビルド番号と、記録したEAS IDが対応していることを確認 |
| データ保持 | 更新前の件数・内容が残ることを確認。fitness v4、search v1、directory v1の既存キーを維持したまま、新しい記録を追加して完全終了/再起動後にも復元されることを確認 |
| 新機能 | 5タブ、検索入力/折りたたみ保持、12種目ガイド/戻る操作、16ブランド・47都道府県、エバーフィット24の千葉初期選択、女性向け/公共/地域施設の条件、全国検索のお気に入りを確認 |
| 日英・写真 | 両言語で画面を確認し、切替と再起動後の保持を確認。設備写真の撮影/選択と食事写真の選択、許可拒否時の表示も確認。食事推定は固定値モック |
| トンネル不要起動 | PC・Metro・トンネルを停止。機内モードでアプリを完全終了してから起動し、保存済みデータとSVG図解が表示されることを確認。外部写真/全国検索/地図の通信は別途オンラインで確認 |

操作日、実際のビルド番号、各結果を残してTASK-018の受入を依頼する。単体テストやJavaScriptバンドル生成を実機確認の代わりにしない。

## TestFlight「テスト内容」案

**日本語**

画面を見やすく整理し、初心者向けのマシン図解を追加しました。全国47都道府県・16ブランドからジムを検索でき、女性向け・公共・地域施設の条件やお気に入り保存に対応しました。検索、図解からの戻る操作、日英切替、更新前の記録が残ることをご確認ください。全国検索・地図には通信が必要です。未確認の設備情報は未確認と表示します。

**English**

A cleaner layout, illustrated machine guides, and gym discovery across all 47 Japanese prefectures and 16 brands. Try filters for women-focused, public, and local facilities, and save venues to favorites. Please check search, returning from a guide, language switching, and whether your existing records remain after updating. Nationwide search and maps require internet access. Unverified equipment information is labeled as such.
