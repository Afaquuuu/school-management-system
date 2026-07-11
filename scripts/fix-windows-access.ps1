# Run in PowerShell as Administrator to fix edumanageplus.org not loading on Windows.
# Usage: Right-click PowerShell -> Run as administrator, then:
#   Set-ExecutionPolicy -Scope Process Bypass -Force
#   & "C:\Users\Administrator\Desktop\School Management System\scripts\fix-windows-access.ps1"

$ErrorActionPreference = "Stop"
$serverIp = "161.118.219.39"
$domain = "edumanageplus.org"
$hostsPath = "$env:Windir\System32\drivers\etc\hosts"
$hostsMarker = "# edumanageplus.org school app"

Write-Host "=== Fixing Windows access to $domain ===" -ForegroundColor Cyan

# 1. Set reliable public DNS on active adapters
$dnsServers = @("1.1.1.1", "8.8.8.8")
Get-DnsClientServerAddress -AddressFamily IPv4 |
  Where-Object { $_.ServerAddresses -and $_.InterfaceAlias -notmatch "Loopback" } |
  ForEach-Object {
    Write-Host "Setting DNS on $($_.InterfaceAlias) -> $($dnsServers -join ', ')"
    Set-DnsClientServerAddress -InterfaceIndex $_.InterfaceIndex -ServerAddresses $dnsServers
  }

# 2. Flush DNS cache
ipconfig /flushdns | Out-Null
Write-Host "DNS cache flushed."

# 3. Hosts file fallback (direct to server IP, bypasses DNS issues)
$hostsContent = Get-Content $hostsPath -ErrorAction SilentlyContinue
if ($hostsContent -notcontains $hostsMarker) {
  Add-Content -Path $hostsPath -Value "`n$hostsMarker"
  Add-Content -Path $hostsPath -Value "$serverIp $domain"
  Add-Content -Path $hostsPath -Value "$serverIp www.$domain"
  Write-Host "Added hosts entries for $domain -> $serverIp"
} else {
  Write-Host "Hosts entries already present."
}

# 4. Quick connectivity test
Write-Host "`nTesting connectivity..." -ForegroundColor Cyan
try {
  $health = Invoke-WebRequest -Uri "http://$serverIp/api/health" -UseBasicParsing -TimeoutSec 15
  Write-Host "Server health: $($health.StatusCode) $($health.Content)" -ForegroundColor Green
} catch {
  Write-Host "Server health check failed: $_" -ForegroundColor Red
}

try {
  $page = Invoke-WebRequest -Uri "http://$domain/school-auth" -UseBasicParsing -TimeoutSec 15
  Write-Host "Domain school-auth: $($page.StatusCode)" -ForegroundColor Green
} catch {
  Write-Host "Domain check failed: $_" -ForegroundColor Yellow
  Write-Host "Try opening: http://$serverIp/school-auth" -ForegroundColor Yellow
}

Write-Host "`nOpen in browser:" -ForegroundColor Cyan
Write-Host "  http://$domain/school-auth"
Write-Host "  http://$serverIp/school-auth"
Write-Host "  https://$domain/school-auth"
Write-Host "`nIf Edge still fails: Settings -> Privacy -> Security -> turn OFF 'Use secure DNS'" -ForegroundColor Yellow
