# GymFinder Mobile

React Native / Expo SDK 58。Web版は開発対象外です。

## 起動

Node.js 22.13以上（検証: 24.19.0）を使用します。

```sh
cd mobile
npm ci
npm start
```

iPhoneにSDK 58対応のExpo Goをインストールし、開発PCと同一LANでMetroのQRを読み取ってください。クラウドのlocalhostはiPhoneから接続できません。クラウドからの実機接続には、別途到達可能なネットワーク経路が必要です。この環境ではiPhone実機・シミュレーターによる表示確認を行っていません。

クラウドでホームディレクトリが書込不可の場合は `npm_config_cache=/tmp/gymfinder-npm` と `EXPO_NO_TELEMETRY=1` を指定します。Expoの設定保存先も書込不可の場合は、シェルから `__UNSAFE_EXPO_HOME_DIRECTORY=/tmp/gymfinder-expo`、`XDG_CACHE_HOME=/tmp/gymfinder-cache` を指定します（認証情報を持たない開発用キャッシュとして使用）。Expo APIがネットワーク制限を受ける場合、`EXPO_OFFLINE=1` でSDK同梱の互換情報を使用できます（APIの最新互換検証は行われません）。

## 構成

- `App.tsx`: 型付きReact Navigationの5タブ、Safe Area Provider、ダークテーマ
- `src/components/ui.tsx`: 共通の画面・カード・入力・ボタン
- `src/screens/`: Gyms / Training / Home / Diet / My Page
- `src/data/equipment.ts`: 既存器具ガイド3種目のデータ
- `src/state.tsx`: 記録・お気に入りをタブ間で共有するセッション状態

記録とお気に入りはメモリ内に保持し、再起動時にリセットします。Gymsの店舗と92%マッチ率・Dietのグラフ/PFCはサンプル表示です。マッチ率計算はTASK-007、全12種目の図解・永続保存・位置情報・AI写真推定・設備投稿・API連携は今後のタスクです。写真や位置情報の権限は要求しません。カスタムフォントは未同梱でシステムフォントを使用します。

## 検証

```sh
npm run typecheck
npm test -- --watch=false
EXPO_NO_TELEMETRY=1 npx expo export --platform ios --platform android --max-workers 2
```

テストは実際のナビゲーターを通した5タブ切替、記録とお気に入りの共有、検索の空状態、入力拒否を確認します。

実機レビュー: ノッチ/Dynamic Island、ホームバー、横向き、小画面、大きな文字サイズ、VoiceOver、キーボード表示時のスクロール、Androidの戻る操作を確認してください。上・左右はSafeAreaView、下端はReact NavigationのSafe Area処理を使用します。
