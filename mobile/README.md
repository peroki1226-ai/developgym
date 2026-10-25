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

記録とお気に入りはメモリ内に保持し、再起動時にリセットします。Gymsの店舗設備とDietのグラフ/PFCは検証用データです。Gymsのマッチ率は選択条件から計算します。全12種目の図解・永続保存・位置情報・AI写真推定・設備投稿・API連携は今後のタスクです。写真や位置情報の権限は要求しません。カスタムフォントは未同梱でシステムフォントを使用します。

## 検証

```sh
npm run typecheck
npm test -- --watch=false
EXPO_NO_TELEMETRY=1 npx expo export --platform ios --platform android --max-workers 2
```

テストは実際のナビゲーターを通した5タブ切替、記録とお気に入りの共有、検索の空状態、入力拒否を確認します。

実機レビュー: ノッチ/Dynamic Island、ホームバー、横向き、小画面、大きな文字サイズ、VoiceOver、キーボード表示時のスクロール、Androidの戻る操作を確認してください。上・左右はSafeAreaView、下端はReact NavigationのSafe Area処理を使用します。


## TASK-007: 検索・マッチ率

`src/data/finder.json` は `index.html` の `DATA.proMenus`（16種目）、`proMuscles`（10部位）、`equipments`、`gyms`（5店舗）から必要なフィールドだけを移植したJSONです。店舗設備・メーカー・重量の真偽は未検証です。Webファイルを実行時に参照せず、APIへの通信や位置情報取得も行いません。

`src/domain/matching.ts` の純粋関数は `index.html` の `calcMatch` 本格モードを基準に、選択種目65% + 部位の器具保有率20% + ダンベル重量15%を四捨五入します。同じ器具を使う複数種目もそれぞれカウントします。種目を選んで全条件一致なら99%、最低15%という元の仕様を保持します。例: 8種目中7種目が対応、部位指定なし、重量充足なら `round((7/8 × .65 + .20 + .15) × 100) = 92%`。

移植時の改善: 全条件未選択ならスコアなし。重量不足ならダンベル種目も実行不可。不足器具は重複を除去。初心者モードや `app.js` の距離加点ロジックは今回の対象外です。

UIの重量指定は片手あたり0（指定なし）/20/40/60/90kg以上の必須フィルターです。検索語・地域とAND条件で絞り込み、マッチ率順に並べます。該当なしでも条件外の店舗を代替表示しません。「検索をクリア」は検索語・地域・重量のみをリセットして種目/部位選択を保持します。選択状態は起動中のみです。

テスト9件: 既存ナビゲーション2件、検索/種目選択の画面操作2件、計算・重複・重量境界・絞り込み・ランキングの単体テスト5件。
