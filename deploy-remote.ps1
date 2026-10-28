[CmdletBinding()]
param(
    [Parameter(Mandatory = $false, Position = 0)]
    [string]$RemoteHost = "145.241.192.121",

    [Parameter(Mandatory = $false)]
    [string]$RemoteUser = "ubuntu",

    [Parameter(Mandatory = $false)]
    [string]$IdentityFile = ""
)

$ErrorActionPreference = "Stop"

# Auto-detect SSH key if not explicitly supplied
if (-not $IdentityFile) {
    $possibleKeys = @(
        "C:\Users\vboxuser\.ssh\id_rsa",
        "C:\Users\vboxuser\Downloads\ssh-key-2026-08-29.key"
    )
    foreach ($key in $possibleKeys) {
        if (Test-Path $key) {
            $IdentityFile = $key
            Write-Host "[KEY] Auto-detected SSH Key: $IdentityFile" -ForegroundColor Cyan
            break
        }
    }
}

if (-not $RemoteHost) {
    $RemoteHost = Read-Host "Enter Oracle VM IP address or hostname"
}

if (-not $RemoteHost) {
    Write-Error "Remote host IP is required to deploy."
    exit 1
}

$ProjectRoot = $PSScriptRoot
if (-not $ProjectRoot) { $ProjectRoot = (Get-Location).Path }

$ArchiveName = "surveylite-standalone.tar.gz"
$ArchivePath = Join-Path $ProjectRoot $ArchiveName

Write-Host "=== [1/3] Packaging project into $ArchiveName ===" -ForegroundColor Green

# Remove any existing archive
if (Test-Path $ArchivePath) {
    Remove-Item $ArchivePath -Force
}

# Create tar.gz using native Windows tar, excluding node_modules, .git, data, and archive itself
$tarArgs = @(
    "-czf", $ArchiveName,
    "--exclude=node_modules",
    "--exclude=.git",
    "--exclude=data",
    "--exclude=$ArchiveName",
    "--exclude=.env",
    "client",
    "server",
    "Dockerfile",
    "docker-compose.yml",
    "deploy-oracle.sh",
    "package.json",
    "README.md",
    "askbuurspace.jpg"
)

Push-Location $ProjectRoot
try {
    & tar.exe $tarArgs
    if ($LASTEXITCODE -ne 0) {
        throw "tar packaging failed with exit code $LASTEXITCODE"
    }
} finally {
    Pop-Location
}

$ArchiveSize = (Get-Item $ArchivePath).Length / 1MB
Write-Host "[PACKAGE] Package created successfully ($([Math]::Round($ArchiveSize, 2)) MB)" -ForegroundColor Green

Write-Host "=== [2/3] Uploading package to Oracle VM ($RemoteHost) ===" -ForegroundColor Green

$sshKeyArg = @()
if ($IdentityFile -and (Test-Path $IdentityFile)) {
    $sshKeyArg = @("-i", $IdentityFile)
}

# Ensure destination directory exists on remote server
$sshTarget = "${RemoteUser}@${RemoteHost}"
& ssh @sshKeyArg -o StrictHostKeyChecking=accept-new $sshTarget "mkdir -p ~/surveylite"

# Copy archive and deploy script
& scp @sshKeyArg -o StrictHostKeyChecking=accept-new $ArchivePath "${sshTarget}:~/surveylite/$ArchiveName"
& scp @sshKeyArg -o StrictHostKeyChecking=accept-new (Join-Path $ProjectRoot "deploy-oracle.sh") "${sshTarget}:~/surveylite/deploy-oracle.sh"
if (Test-Path (Join-Path $ProjectRoot ".env")) {
    & scp @sshKeyArg -o StrictHostKeyChecking=accept-new (Join-Path $ProjectRoot ".env") "${sshTarget}:~/surveylite/.env"
}

Write-Host "=== [3/3] Executing remote deployment on Oracle VM ===" -ForegroundColor Green
& ssh @sshKeyArg -t $sshTarget "chmod +x ~/surveylite/deploy-oracle.sh && ~/surveylite/deploy-oracle.sh"

# Clean up local archive
if (Test-Path $ArchivePath) {
    Remove-Item $ArchivePath -Force
}

Write-Host ""
Write-Host "[SUCCESS] Deployment complete! You can access SurveyLite at: http://${RemoteHost}:3003" -ForegroundColor Green
