# 旧Web版の固定配信

**動くフォーム模型など、最新のアプリ機能を確認する場合はこの手順を使わない。** `cd mobile` → `npm run preview:app` でアプリと同じコードを表示する。[アプリ版プレビューの手順](../docs/APP_PREVIEW.md)を参照。ルートの`gym-app-preview.html`もアプリ版の入口に変更済み。

一時トンネルやPCの起動に依存しない、GitHub Pages用のWebアプリです。iPhone Safariの共有 →「ホーム画面に追加」で起動できます。App Store配布のネイティブアプリとは別で、端末保存も別領域です。

```sh
cd mobile
npm ci
npm run preview:build
npm run preview:check
```

公開物は`web-dist/`のみです。TailwindをローカルCSSへコンパイルし、実行時の外部CSSスクリプトとGoogle Fonts依存を外します。アイコン・言語別manifest・Service Workerを同梱し、一度オンラインで開いた後のオフライン再起動に対応します。地図リンク・外部サイト・外部検索APIには通信が必要です。

記録・食事・体重・器具・お気に入り・端末内投稿をWeb専用キーへ保存します。読込みに失敗した保存データを上書きせず、書き出しを提供します。提供サンプルと利用者入力の区別・原文を保持します。Safariとホーム画面版の保存領域が異なる場合やアプリ削除による消去があるため、ネイティブの記録が自動移行するとは扱いません。

## 公開の有効化（一度だけ）

1. GitHubの[Settings → Pages](https://github.com/peroki1226-ai/developgym/settings/pages)でSourceを**GitHub Actions**にする。
2. [Actions](https://github.com/peroki1226-ai/developgym/actions)の**Deploy smartphone app**を開き、**Run workflow**で`main`を実行する。
3. 成功後、ジョブの`github-pages`環境に表示されたURLをiPhone Safariで開く。

公開予定の標準URLは`https://peroki1226-ai.github.io/developgym/`ですが、実際のデプロイ成功前に利用可能とは扱いません。GitHub Pagesの初回有効化はリポジトリ管理者の操作です。ルートドメインへ公開する場合もリポジトリ配下へ公開する場合も相対パスを使用します。

この旧Webビルドだけは表示ソースを`index.html`に統一し、`web-dist/`内の同名ファイルもindex.htmlから生成します。リポジトリルートの`gym-app-preview.html`はアプリ版用であり、この旧ビルド出力とは異なります。別環境の未同期ソースが自動で取り込まれるわけではありません。公開用HTML内に外部JS実行元・iframeが残っていればビルドを失敗させ、追加ソースの整合を確認します。

## 現在の公開結果

コミット`45ee13b`の[公開処理 #1](https://github.com/peroki1226-ai/developgym/actions/runs/41302866781)ではビルドと公開前検証が成功し、公開物を生成しました。デプロイは404（GitHub Pages未有効化）で停止しています。上記のSource設定後に同じ実行画面で**Re-run all jobs**を選ぶか、ワークフローを手動実行してください。公開成功後に表示されるURLでSafari実機確認を行います。
