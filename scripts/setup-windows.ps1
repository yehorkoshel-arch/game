$ErrorActionPreference = "Stop"

function Require-Command($Name, $InstallHint) {
  if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
    Write-Host ""
    Write-Host "$Name не знайдено." -ForegroundColor Yellow
    Write-Host $InstallHint
    exit 1
  }
}

Require-Command "node" "Встанови Node.js LTS з https://nodejs.org/ і відкрий новий PowerShell."
Require-Command "npm" "Після встановлення Node.js LTS npm має зʼявитися автоматично. Відкрий новий PowerShell."

Write-Host "Node:" -ForegroundColor Cyan
node --version
Write-Host "npm:" -ForegroundColor Cyan
npm --version

Write-Host ""
Write-Host "Встановлюю пакети..." -ForegroundColor Cyan
npm install

Write-Host ""
Write-Host "Генерую українську озвучку..." -ForegroundColor Cyan
npm run voice:generate

Write-Host ""
Write-Host "Готово. Перевір public/audio/voice та src/audio/voiceManifest.js" -ForegroundColor Green
