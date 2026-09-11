$ErrorActionPreference = "Stop"
Set-Location (Join-Path $PSScriptRoot "..")

if (-not (Test-Path ".env")) {
  Copy-Item ".env.example" ".env"
  Write-Host "Fichier .env cree — editez-le (secrets, DUCKDNS_TOKEN, ACME_EMAIL) puis relancez."
  exit 1
}

Write-Host "Build et demarrage production (HTTPS)..."
$compose = @("-f", "docker-compose.yml", "-f", "docker-compose.prod.yml")
$token = ""
Get-Content ".env" | ForEach-Object {
  if ($_ -match '^\s*DUCKDNS_TOKEN=(.+)$') { $token = $Matches[1].Trim() }
}
if ($token) {
  docker compose @compose --profile duckdns up -d --build
} else {
  Write-Host "DUCKDNS_TOKEN vide : renseignez l IP sur https://www.duckdns.org/"
  docker compose @compose up -d --build
}

$domain = "ltdd-delice.duckdns.org"
Get-Content ".env" | ForEach-Object {
  if ($_ -match '^\s*APP_DOMAIN=(.+)$') { $domain = $Matches[1].Trim() }
}
Write-Host ""
Write-Host "Termine. Site attendu : https://$domain"
