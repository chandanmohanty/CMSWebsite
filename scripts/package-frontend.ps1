# Builds the deployable source archive for the Next.js frontend.
#
# Hostinger's Node.js hosting installs dependencies and runs `next build` on the
# server, so this ships SOURCE ONLY. Three things this script exists to get right,
# each of which broke a real deployment:
#
#   1. .env.local MUST be excluded. It points at the local API (localhost) and
#      Next.js gives it higher precedence than .env.production even in prod
#      builds, so shipping it silently points the live site at localhost.
#   2. The archive must be .tar.gz, not .zip. PowerShell's Compress-Archive
#      stores Windows attributes rather than Unix mode bits, so extracted
#      directories can lose their traverse permission - the build then dies with
#      "EACCES: scandir .../src/app/(site)/[[...slug]]".
#   3. Entries must sit at the archive root, not under "./". Hostinger's build
#      settings resolver looks for package.json at the top level and errors out
#      if everything is nested under a "./" prefix.
#
# Usage:  pwsh ./scripts/package-frontend.ps1
# Output: an archive path, ready to upload via hPanel -> Node.js, or to hand to
#         the Hostinger deploy API.

$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
$frontend = Join-Path $repoRoot "frontend"
$stage    = Join-Path $env:TEMP "athithi24-frontend-src"
$archive  = Join-Path $env:TEMP "athithi24-frontend-src.tar.gz"

# node_modules and .next are rebuilt on the server; the rest is never deployable.
$exclude = @("node_modules", ".next", ".git", ".env.local", "tsconfig.tsbuildinfo")

if (Test-Path $stage)   { Remove-Item $stage -Recurse -Force }
if (Test-Path $archive) { Remove-Item $archive -Force }
New-Item -ItemType Directory -Path $stage | Out-Null

Push-Location $frontend
try {
    Get-ChildItem -Force | Where-Object { $_.Name -notin $exclude } | ForEach-Object {
        Copy-Item $_.FullName -Destination $stage -Recurse -Force
    }
} finally {
    Pop-Location
}

if (-not (Test-Path (Join-Path $stage ".env.production"))) {
    throw "frontend/.env.production is missing - the build would default to localhost."
}
if (Test-Path (Join-Path $stage ".env.local")) {
    throw ".env.local leaked into the archive - it would override production config."
}

# tar from inside the staging dir with an explicit entry list: keeps package.json
# at the archive root and still includes dotfiles such as .env.production.
Push-Location $stage
try {
    $entries = Get-ChildItem -Force -Name
    tar -czf $archive $entries
} finally {
    Pop-Location
}

Remove-Item $stage -Recurse -Force

$sizeMb = "{0:N2}" -f ((Get-Item $archive).Length / 1MB)
Write-Host "Frontend archive ready: $archive ($sizeMb MB)"
Write-Host "Deploy it via hPanel -> Advanced -> Node.js, or the Hostinger deploy API."
