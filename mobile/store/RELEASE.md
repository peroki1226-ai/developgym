# GymFinder 1.0.0 リリース準備・署名手順

**2026-11-05 ユーザー指示：TestFlightへの追加提出・自動提出・テスター割当・招待/共有は保留。再開指示までは`build:ios:testflight`/ストア提出を実行しない。実機確認は登録済みiPhoneへのAd Hoc直接配布を基本にし、既存`build:ios:preview`を使う。以下の提出済み記録は取消を意味しない。**

## 最新候補（2026-11-04）

2026-11-05更新：TASK-020〜022を含むBuild 4（`e4781907-f41c-4d4c-a9b3-29ad1e70bf2e`）のビルド・提出はFINISHEDとの記録を同期。Apple処理・TestFlight配信・実機受入を追跡する。[Build 4記録](../../docs/BUILD4_RELEASE.md)にはソース完全ハッシュの照合待ち事項も記載。今回の作成/提出は繰り返さない。既存の`IOS_RELEASE_STATUS.json`と`release:ios:*`はBuild 3専用のまま保全する。

## 今回の設定

| 項目 | 値 |
|---|---|
| 表示名 | GymFinder |
| iOS Bundle ID / Android applicationId | com.peroki.gymfinder |
| バージョン | 1.0.0 |
| iOS buildNumber / Android versionCode | app.jsonのローカル設定は2 / 1。配布値はEAS remoteで自動増分 |
| Expo SDK / Node検証環境 | 58 / 24.19.0 |
| バージョン管理 | EAS remote、preview/productionともautoIncrement=true |
| 署名情報 | EAS管理（credentialsSource=remote）。証明書等はGitへ保存しない |

このBundle IDはユーザー指定の識別子です。Apple / Google / Expo上での所有・登録は未確認です。旧ID `com.gymfinder.mobile`、Expo Go、今回の署名済みアプリは保存領域が同一とは限らず、記録の自動移行を前提にしないでください。

## アセット

| 用途 | ファイル | サイズ・形式 |
|---|---|---|
| iOS / 共通アプリアイコン | assets/icon.png | 1024×1024 PNG、透過なし、角丸加工なし |
| Android adaptive / monochrome | assets/adaptive-foreground.png | 1024×1024 PNG、透過あり、背景は白 |
| スプラッシュロゴ | assets/splash.png | 1024×1024 PNG、透過あり、白背景にcontain配置 |
| Google Playアイコン | assets/store/google-play-icon.png | 512×512 PNG、透過なし |
| Google Play feature graphic | assets/store/feature-graphic.png | 1024×500 PNG、透過なし |
| 編集元 | assets/brand-mark.svg / assets/store/feature-graphic.svg | オリジナル幾何学図形。feature graphic文字はシステムのsans-serifで描画 |

`npm run assets:generate` で生成し、`npm run release:check` で寸法・アルファ・設定を確認できます。feature graphicの文字描画は端末のフォント環境に依存するため、配布にはレビューしたコミット済みPNGを使用してください。

## preview / production

| プロファイル | iOS | Android | 用途 |
|---|---|---|---|
| preview | 実機internal / Ad Hoc | APK | 登録端末への内部配布 |
| production | App Store配布 | AAB | ストア提出用成果物 |

previewはExpo Goの代替となるスタンドアロンアプリで、Metro不要です。iOS previewにはApple Developerの署名と端末登録が必要です。productionはストア提出用で、App StoreやGoogle Playへ自動公開する設定ではありません。

## 認証・プロジェクト連携

既存owner/projectIdはad8d8bdから同期済みです。現在の環境ではEASの番号照合がExpo認証要求で停止し、Expo向けの認証・通信設定が未完了です。既存アカウントでの認証と署名準備を確認してから再開します。

本人が利用する端末で次を実行します。

```sh
cd mobile
npm ci
npx eas-cli@25.3.0 login
npx eas-cli@25.3.0 project:info
```

既存のGymFinderプロジェクト（owner: peroki1226 / projectId: 707c6e89-6ed5-4d65-a6bb-90472a724971）への接続を確認します。新しいプロジェクトを作成したり、推測したUUIDやApple Team IDを記入したりしないでください。

クラウドで続行する場合、環境設定の安全な入力欄へEXPO_TOKENを設定します。トークン・Appleパスワード・サービスアカウントキーをチャットやGitに貼らないでください。既に登録済みのEXPO_TOKEN要件を再利用します。

## 署名付きビルド

### iOS内部配布

```sh
npx eas-cli@25.3.0 device:create
npm run build:ios:preview
```

登録端末がプロビジョニングプロファイルに含まれることを確認します。Appleログイン・2FA・証明書作成等は本人がCLIの案内に従って行います。

### ストア用

```sh
npm run build:ios:production
npx eas-cli@25.3.0 build --platform android --profile production
```

初回Android署名はEASの案内で生成・管理します。既存アプリへ更新する場合は既存署名を再利用し、新規鍵で置き換えないでください。Apple証明書・プロビジョニング・Androidキーストアはリモート管理し、ダウンロードした場合もリポジトリへ追加しません。

ビルド番号はEAS remoteで管理し、preview/productionとも自動増分します。初回の連携時は既存のGymFinderプロジェクトを選び、各ストアや配布済みビルドの最大番号とリモート値を照合してください。必要な初期同期は`npx eas-cli@25.3.0 build:version:set --platform ios`（Androidも同様）で行い、既存番号より先へ進めます。app.jsonのローカル値は配布済み最新版の番号を示しません。更新時は同じBundle ID・既存署名を使用し、原則アプリを削除せず上書き更新します。

## ストア登録・提出

- Apple Developer Program、App Store Connect、Google Play Consoleのアカウントと契約・アプリ登録を準備。
- Appleに `com.peroki.gymfinder` のApp IDとアプリを登録。Androidも同じapplicationIdで登録。
- `store/metadata.ja.json` の文案、アイコン、feature graphicをレビューして登録。
- サポート窓口、運営者、公開プライバシーポリシーURLを設定。`PRIVACY_POLICY_DRAFT.ja.md` は公開前ドラフト。
- 年齢区分、健康関連の申告、App Privacy / Data safetyは署名済みバイナリ・SDK・実装に基づいて本人が確定。端末内だけの記録と外部収集を区別。
- Play App Signingと初回アップロード、App Store Connect上のTestFlight等を、各コンソールで実施。
- 実機検証と提出素材を確認してから審査提出。build:ios:productionはビルドのみ。build:ios:testflight / release:ios:submitはAppleへのアップロードを行いますが、App Store審査提出・一般公開は別工程です。

## 権限

- iOS NSCameraUsageDescription：設備写真撮影。
- iOS NSPhotoLibraryUsageDescription：利用者が指定した設備・食事写真の選択。
- NSMicrophoneUsageDescriptionは生成しない。
- Android CAMERAを明示。システムPhoto Pickerを使用し、READ_MEDIA_* / READ_EXTERNAL_STORAGE / WRITE_EXTERNAL_STORAGE / RECORD_AUDIO / SYSTEM_ALERT_WINDOWはmanifest mergerの削除指定で除外。
- iOSのusesNonExemptEncryption=falseは、OS標準機能以外の独自暗号処理を実装していない現コードを前提に設定。暗号機能・SDKの変更時は再確認。

Expo Goはホストアプリ側の権限や起動画面を使うため、最終の権限・スプラッシュ・アイコンは署名済みreleaseビルドで確認します。

## スクリーンショット計画（未撮影）

実際のiPhone / iPad / Androidのreleaseビルドで取得してください。HTMLモックやJestツリーをストア用の実機画像として代用しません。掲載前にストアコンソールで対象ディスプレイと現行サイズ要件を確認します。iPad対応を維持しているため、iPad用素材も必要です。

1. Gyms：種目・重量条件とAvailable/Missing。
2. Training：フォーム図解と記録。
3. Home：器具プロファイルと代替提案。
4. Diet：体重推移・カロリー/PFC。
5. My Page：自宅/ジムの統合履歴と端末内投稿。

個人の健康情報や写真の写り込みを避けたテストデータで撮影し、アプリの実際の状態と矛盾する説明を付けないでください。

## 公開前に残ること

- Expo認証・projectId、Apple/Googleの署名・アプリ登録。
- 署名済みIPA/AAB、端末インストール、実機でのカメラ/写真・保存・スプラッシュの確認。
- 実機スクリーンショット、公開サポート窓口とプライバシーポリシーURL。
- 検証用店舗データと固定値の食事写真モックをどう公開するかの最終判断。

設定検証、ネイティブプロジェクト生成、JS/Hermesバンドル成功は、署名・ネイティブコンパイル・ストア審査・公開の成功とは区別します。

## 進捗確認ではトンネル不要の署名付きアプリを使用する

`preview`と`production`は`developmentClient: false`、iOS `buildConfiguration: Release`でビルドし、JavaScript・必要なアセットをアプリに内蔵します。`updates.enabled: false`により起動時のOTA更新取得を行いません。変更を反映するには新しい署名付きビルドを配布し、既存アプリを更新します。

`npm run build:ios:preview` / `npm run build:ios:production`はrelease:checkを実行し、既存EASプロジェクトIDの設定を確認し、型チェックと全テストに通ってからビルドを開始します。開発クライアント、Debug、内蔵コードの省略等の設定へ変わっていた場合は検証で止めます。コマンド自体はストア提出を行いません。

利用者にはAd Hocのビルド詳細ページのInstall、またはTestFlightの配布案内を渡します。`exp://`、localhost、LAN IP、`lhr.life`等の一時URLは通常の進捗確認用として渡しません。Expo Go/開発クライアントは開発者用として扱います。専用アイコンでも開発クライアントの場合があるため、アイコンだけでReleaseと判断しません。

2026-11-02、ユーザーから現在のエラーはSafari URL/ホーム画面に追加したWeb版で発生すると確認。一時トンネルを参照する既存ショートカットのURLは、ネイティブ設定の変更では更新できません。新しい署名付きアプリのインストールを確認してから、Web版アイコンと区別して案内します。Web版の端末内記録は自動移行されず、必要な記録が残っている場合は消去を案内しません。

配布前の必須確認:

1. EAS Build ID・ソースコミット・Bundle ID・実際のビルド番号を記録する。
2. iPhoneへ署名付きReleaseビルドをインストールする。以前のネイティブ記録を使う場合は同じアプリへ上書き更新する。
3. PCのMetro/トンネルを停止し、iPhoneを機内モードにする。完全終了したアプリを起動し、5タブ・記録保存・再起動後の復元を確認する。
4. 通信を戻し、外部地図等の通信が必要な操作も確認する。配布ファイルのダウンロード、外部地図・将来のオンライン検索はネット接続が必要で、アプリ起動のトンネル依存とは区別する。

自動テストやMetro/Hermesエクスポートの成功は、この署名付き実機試験の代わりにはしません。

## 検証付きのビルドからTestFlight提出まで

既存の認証・署名・提出先アプリを照合した環境では`npm run build:ios:testflight`を使用できます。Release設定・既存projectId・型チェック・全テストを確認し、productionビルドを作成してそのビルドをauto-submitします。Appleの処理完了・テスターへの配布・招待の有効性は別途確認します。

自動化環境では`npm run build:ios:testflight -- --non-interactive`を使います。認証/署名/提出設定が揃っていなければ停止します。既存PowerShellの直接配布/TestFlightヘルパーも同じ検証付きコマンドを使用します。

## 今回追跡するiOSビルド

[IOS_RELEASE_STATUS.json](IOS_RELEASE_STATUS.json)に対象を記録しています。同期コミット63b3f41ではiOS 1.0.0 (3)、EAS ID `9ba7dd8b-a1e4-4c34-a2cb-4ee5b225c785`がFINISHED、提出ID `9dc718a2-9a94-478b-bcd4-60be4aad2331`でSUBMITTED_TO_APPLEと記録されました。Codex環境の直接照会は認証不足で停止しています。directlyVerified=trueはAntigravityの確認記録を保全した値で、Codexが今回API照会に成功した意味ではありません。状態はライブ更新ではありません。

ascAppId `6828502638`をeas.jsonのproduction提出先に同期済みです。[TestFlight管理画面](https://appstoreconnect.apple.com/apps/6828502638/testflight/ios)でApple処理・テスター割当を確認します。招待リンクや実機での利用可能性はまだ未確認なので、既存の提出を繰り返さないでください。

認証済み環境ではまず状態を照会します（作業ディレクトリはmobile/）。提出コマンドは固定対象の未提出が確認できる場合だけに使用し、既存ID/提出試行があれば重複アップロードを拒否します。新しいビルドや`--latest`は使用しません。

```sh
npm run release:ios:status
# 今回のBuild 3は提出済みの記録があるため、以下は再実行しない。
npm run release:ios:submit
# 署名/提出設定が揃った自動化環境の場合
npm run release:ios:submit -- --non-interactive
```

状態照会は、EASのビルドに加えて提出履歴を読み取ります。通常の`eas build:view --json`には提出履歴が含まれないため、インストール済みEAS CLIの認証/プロキシ/TLSと`withSubmissionsByIdAsync`読取りを使用します。この内部APIはロックファイルのCLIバージョンで検証しており、CLI更新時は再確認してください。利用できなければ提出前に停止します。

提出前にFINISHED・プロジェクト・Bundle ID・バージョン・番号3・ソースコミット・実機STORE配布・HTTPS成果物・ASC提出先を照合します。既存提出は成功/実行中/失敗のいずれも自動再提出せず、提出IDと状態を記録します。認証や照会が失敗した場合は最後の報告を残し、lastCheckSucceeded=falseと試行日時だけを記録します。directlyVerifiedはstatusSourceが示す確認元の結果で、CLIの成功照会ではstatusSource=EAS APIとlastCheckedAtを更新します。

提出コマンド開始前に`submissionAttemptedAt`を保存し、タイムアウト・中断・終了コード0でも提出IDが未確認の場合は`REQUESTED_UNCONFIRMED`を維持します。まずstatusを再実行して確認します。履歴が空でも未解決の試行があれば自動再試行は拒否します。EASとApp Store Connect双方で提出されていないことを担当者が確認した場合のみ、状態ファイルの試行日時を除去し、submissionStatusをNOT_CONFIRMEDへ戻して再実行してください。

並行コマンドは`IOS_RELEASE_STATUS.json.lock`で拒否します。クラッシュで残った場合は、実行中のrelease/EASプロセスがないことを確認してからlockを削除します。JSONは一時ファイルから置換し、署名付きダウンロードURL・秘密値・API応答全体は保存しません。認証情報は環境の安全な設定欄または本人のEASログインで用意します。App Store Connect提出設定が不足している場合、対話実行で既存アプリを選択するかeas.jsonに検証済みのascAppIdを設定してください。未確認IDは追加しません。

提出成功後は提出ID、Apple側の処理結果、テスター配布/招待、実機更新とデータ保持を確認して記録を進めます。ビルド中・提出中・利用可能の状態を混同しません。
