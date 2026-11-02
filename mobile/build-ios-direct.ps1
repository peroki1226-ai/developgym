# GymFinder - iPhone 直接インストール用 (Ad-hoc) ビルドスクリプト
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "  GymFinder iOS 直接インストール用 (Ad-hoc) ビルド開始" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host ""

$nodeDir = "C:\Users\kodam\AppData\Local\OpenAI\Codex\runtimes\cua_node\1fb7137c46617d50\bin"
if (Test-Path "$nodeDir\node.exe") {
    $env:Path = "$nodeDir;" + $env:Path
}

Set-Location -Path $PSScriptRoot

Write-Host "1. TypeScript 型チェックの検証中..." -ForegroundColor Yellow
& cmd.exe /c "npm run typecheck"
if ($LASTEXITCODE -ne 0) {
    Write-Host "型チェックエラーが発生しました。" -ForegroundColor Red
    exit 1
}

Write-Host "2. EAS Build を実行し、iPhone 直接インストール用ビルドを作成します..." -ForegroundColor Yellow
Write-Host "※ ビルド完了後に表示される QR コードを iPhone のカメラで読み取るだけで、Safari から直接インストールできます。" -ForegroundColor Green
Write-Host ""

& cmd.exe /c "npm run build:ios:preview"
