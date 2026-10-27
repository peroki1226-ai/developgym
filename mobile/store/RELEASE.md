# GymFinder 1.0.0 リリース準備・署名手順

## 今回の設定

| 項目 | 値 |
|---|---|
| 表示名 | GymFinder |
| iOS Bundle ID / Android applicationId | com.peroki.gymfinder |
| バージョン | 1.0.0 |
| iOS buildNumber / Android versionCode | 1 / 1 |
| Expo SDK / Node検証環境 | 58 / 24.19.0 |
| バージョン管理 | EAS local、autoIncrement=false |
| 署名情報 | EAS管理（credentialsSource=remote）。証明書等はGitへ保存しない |

このBundle IDはユーザー指定の識別子です。Apple / Google / Expo上での所有・登録は未確認です。旧ID `com.gymfinder.mobile`、Expo Go、今回の署名済みアプリは保存領域が同一とは限らず、記録の自動移行を前提にしないでください。

## アセット

| 用途 | ファイル | サイズ・形式 |
|---|---|---|
| iOS / 共通アプリアイコン | assets/icon.png | 1024×1024 PNG、透過なし、角丸加工なし |
| Android adaptive / monochrome | assets/adaptive-foreground.png | 1024×1024 PNG、透過あり、背景は黒 |
| スプラッシュロゴ | assets/splash.png | 1024×1024 PNG、透過あり、黒背景にcontain配置 |
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

現在の環境では `eas whoami` はNot logged in、EXPO_TOKENは未設定、`extra.eas.projectId`も未登録です。Expo APIは到達可能でしたが、認証成功や署名準備完了を意味しません。

本人が利用する端末で次を実行します。

```sh
cd mobile
npm ci
npx eas-cli@25.3.0 login
npx eas-cli@25.3.0 init
```

既存のGymFinderプロジェクトがある場合は、それに接続してください。作成・接続後に追加されたprojectId / ownerが正しいことを確認し、非秘密の設定変更だけをコミットします。推測したUUIDやApple Team IDを記入しないでください。

クラウドで続行する場合、環境設定の安全な入力欄へEXPO_TOKENを設定します。トークン・Appleパスワード・サービスアカウントキーをチャットやGitに貼らないでください。既に登録済みのEXPO_TOKEN要件を再利用します。

## 署名付きビルド

### iOS内部配布

```sh
npx eas-cli@25.3.0 device:create
npx eas-cli@25.3.0 build --platform ios --profile preview
```

登録端末がプロビジョニングプロファイルに含まれることを確認します。Appleログイン・2FA・証明書作成等は本人がCLIの案内に従って行います。

### ストア用

```sh
npx eas-cli@25.3.0 build --platform ios --profile production
npx eas-cli@25.3.0 build --platform android --profile production
```

初回Android署名はEASの案内で生成・管理します。既存アプリへ更新する場合は既存署名を再利用し、新規鍵で置き換えないでください。Apple証明書・プロビジョニング・Androidキーストアはリモート管理し、ダウンロードした場合もリポジトリへ追加しません。

ビルド番号は自動増分しません。同じストアへ次のバイナリをアップロードする前にiOS buildNumber / Android versionCodeを増やしてください。初回の1が既に使用済みかは、各ストアで確認します。

## ストア登録・提出

- Apple Developer Program、App Store Connect、Google Play Consoleのアカウントと契約・アプリ登録を準備。
- Appleに `com.peroki.gymfinder` のApp IDとアプリを登録。Androidも同じapplicationIdで登録。
- `store/metadata.ja.json` の文案、アイコン、feature graphicをレビューして登録。
- サポート窓口、運営者、公開プライバシーポリシーURLを設定。`PRIVACY_POLICY_DRAFT.ja.md` は公開前ドラフト。
- 年齢区分、健康関連の申告、App Privacy / Data safetyは署名済みバイナリ・SDK・実装に基づいて本人が確定。端末内だけの記録と外部収集を区別。
- Play App Signingと初回アップロード、App Store Connect上のTestFlight等を、各コンソールで実施。
- 実機検証と提出素材を確認してから審査提出。ここまでのスクリプトはストア送信・公開を行いません。

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
