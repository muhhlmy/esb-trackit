$ErrorActionPreference = "Continue"
$base = "http://192.168.100.85:5173"

Write-Host "=== LOGIN ==="
try {
    $loginResp = Invoke-RestMethod -Uri "$base/api/auth/login" -Method POST -Body '{"email":"superadmin@admin.com","password":"admin123"}' -ContentType "application/json" -TimeoutSec 15
    $token = $loginResp.token
    Write-Host "LOGIN OK"
} catch {
    Write-Host "LOGIN FAILED: $($_.Exception.Message)"
    exit 1
}

$headers = @{"Authorization" = "Bearer $token"}

function T2 {
    param([string]$Method, [string]$Url, [string]$Body = $null)
    try {
        $p = @{ Uri=$Url; Method=$Method; Headers=$headers; TimeoutSec=8000; ErrorAction='Stop' }
        if ($Body) { $p.Body = $Body; $p.ContentType = "application/json" }
        $r = Invoke-RestMethod @p
        $json = ($r | ConvertTo-Json -Compress -Depth 3)
        if ($json.Length -gt 300) { $json = $json.Substring(0,300) + "..." }
        return @{status=200; body=$json}
    } catch {
        $code = "?"
        try { $code = [int]$_.Exception.Response.StatusCode } catch {}
        $msg = ""
        try { $msg = $_.ErrorDetails.Message } catch {}
        if (-not $msg) { $msg = $_.Exception.Message }
        if ($msg.Length -gt 300) { $msg = $msg.Substring(0,300) + "..." }
        return @{status=$code; body=$msg}
    }
}

Write-Host "#1 GET /api/auth/me"
$r = T2 GET "$base/api/auth/me"
Write-Host "  Status: $($r.status)"
Write-Host "  Body: $($r.body)"

Write-Host "#2 GET /api/assets"
$r = T2 GET "$base/api/assets"
Write-Host "  Status: $($r.status)"
Write-Host "  Body: $($r.body)"

Write-Host "#3 GET /api/assets?all=true"
$r = T2 GET "$base/api/assets?all=true"
Write-Host "  Status: $($r.status)"
Write-Host "  Body: $($r.body)"

Write-Host "#4 GET /api/assets/stats"
$r = T2 GET "$base/api/assets/stats"
Write-Host "  Status: $($r.status)"
Write-Host "  Body: $($r.body)"

Write-Host "#5 GET /api/assets/1"
$r = T2 GET "$base/api/assets/1"
Write-Host "  Status: $($r.status)"
Write-Host "  Body: $($r.body)"

Write-Host "#6 GET /api/assets/99999"
$r = T2 GET "$base/api/assets/99999"
Write-Host "  Status: $($r.status)"
Write-Host "  Body: $($r.body)"

Write-Host "#7 GET /api/ga-assets"
$r = T2 GET "$base/api/ga-assets"
Write-Host "  Status: $($r.status)"
Write-Host "  Body: $($r.body)"

Write-Host "#8 GET /api/ops-assets"
$r = T2 GET "$base/api/ops-assets"
Write-Host "  Status: $($r.status)"
Write-Host "  Body: $($r.body)"

Write-Host "#9 GET /api/employees"
$r = T2 GET "$base/api/employees"
Write-Host "  Status: $($r.status)"
Write-Host "  Body: $($r.body)"

Write-Host "#10 GET /api/employees/stats"
$r = T2 GET "$base/api/employees/stats"
Write-Host "  Status: $($r.status)"
Write-Host "  Body: $($r.body)"

Write-Host "#11 GET /api/employees/locations"
$r = T2 GET "$base/api/employees/locations"
Write-Host "  Status: $($r.status)"
Write-Host "  Body: $($r.body)"

Write-Host "#12 GET /api/employees/with-assets"
$r = T2 GET "$base/api/employees/with-assets"
Write-Host "  Status: $($r.status)"
Write-Host "  Body: $($r.body)"

Write-Host "#13 GET /api/users"
$r = T2 GET "$base/api/users"
Write-Host "  Status: $($r.status)"
Write-Host "  Body: $($r.body)"

Write-Host "#14 GET /api/tickets"
$r = T2 GET "$base/api/tickets"
Write-Host "  Status: $($r.status)"
Write-Host "  Body: $($r.body)"

Write-Host "#15 GET /api/tickets/stats"
$r = T2 GET "$base/api/tickets/stats"
Write-Host "  Status: $($r.status)"
Write-Host "  Body: $($r.body)"

Write-Host "#16 GET /api/tickets/reporters"
$r = T2 GET "$base/api/tickets/reporters"
Write-Host "  Status: $($r.status)"
Write-Host "  Body: $($r.body)"

Write-Host "#17 GET /api/faqs"
$r = T2 GET "$base/api/faqs"
Write-Host "  Status: $($r.status)"
Write-Host "  Body: $($r.body)"

Write-Host "#18 GET /api/cases"
$r = T2 GET "$base/api/cases"
Write-Host "  Status: $($r.status)"
Write-Host "  Body: $($r.body)"

Write-Host "#19 GET /api/kb-categories"
$r = T2 GET "$base/api/kb-categories"
Write-Host "  Status: $($r.status)"
Write-Host "  Body: $($r.body)"

Write-Host "#20 GET /api/logs"
$r = T2 GET "$base/api/logs"
Write-Host "  Status: $($r.status)"
Write-Host "  Body: $($r.body)"

Write-Host "#21 GET /api/export/tables"
$r = T2 GET "$base/api/export/tables"
Write-Host "  Status: $($r.status)"
Write-Host "  Body: $($r.body)"

Write-Host "#22 GET /api/export"
$r = T2 GET "$base/api/export"
Write-Host "  Status: $($r.status)"
Write-Host "  Body: $($r.body)"

Write-Host "#23 GET /api/ticket-queues"
$r = T2 GET "$base/api/ticket-queues"
Write-Host "  Status: $($r.status)"
Write-Host "  Body: $($r.body)"

Write-Host "#24 GET /api/case-bookmarks"
$r = T2 GET "$base/api/case-bookmarks"
Write-Host "  Status: $($r.status)"
Write-Host "  Body: $($r.body)"

Write-Host "#25 GET /api/tickets/events (SSE)"
try {
    $r = T2 GET "$base/api/tickets/events"
    Write-Host "  Status: $($r.status)"
    Write-Host "  Body: $($r.body)"
} catch {
    Write-Host "  SSE test: connection maintained (expected for SSE)"
}

Write-Host ""
Write-Host "=== ALL DETAILED RESULTS CAPTURED ==="
