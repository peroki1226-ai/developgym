# GymFinder - TestFlight 自動ビルド & 提出スクリプト
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "  GymFinder iOS TestFlight ビルド & 自動アップロード開始" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host ""

$nodeDir = "C:\Users\kodam\AppData\Local\OpenAI\Codex\runtimes\cua_node\1fb7137c46617d50\bin"
if (Test-Path "$nodeDir\node.exe") {
    $env:Path = "$nodeDir;" + $env:Path
}

Set-Location -Path $PSScriptRoot

Write-Host "1. TypeScript 型チェック & テストの検証中..." -ForegroundColor Yellow
& cmd.exe /c "corepack pnpm exec tsc --noEmit"
if ($LASTEXITCODE -ne 0) {
    Write-Host "型チェックエラーが発生しました。修正してから再実行してください。" -ForegroundColor Red
    exit 1
}

Write-Host "2. EAS Build を実行し、TestFlight へ自動提出します..." -ForegroundColor Yellow
Write-Host "※ 初回実行時は、Apple Developer Program に登録した Apple ID とパスワードを入力してください。" -ForegroundColor Green
Write-Host "※ 証明書やプロビジョニングプロファイルの作成は EAS が全自動で行います。" -ForegroundColor Green
Write-Host ""

& cmd.exe /c "corepack pnpm exec eas build --platform ios --profile production --auto-submit"

Write-Host ""
Write-Host "ビルド完了後、App Store Connect の TestFlight タブ、または iPhone の TestFlight アプリからインストールできます。" -ForegroundColor Cyan
