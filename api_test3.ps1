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
$results = @()

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

# Edge case tests using Invoke-RestMethod for proper error capture
$r = T2 POST "$base/api/auth/logout" "{}"
$results += [PSCustomObject]@{Num="26"; Method="POST"; Endpoint="/api/auth/logout"; Status=$r.status; Body=$r.body}
Write-Host "#26 POST /api/auth/logout -> $($r.status)"

$r = T2 GET "$base/api/auth/me"
$results += [PSCustomObject]@{Num="27"; Method="GET"; Endpoint="/api/auth/me (after logout)"; Status=$r.status; Body=$r.body}
Write-Host "#27 GET /api/auth/me (post-logout) -> $($r.status)"

Write-Host "Re-login for edge cases..."
Start-Sleep -Seconds 2
try {
    $loginResp2 = Invoke-RestMethod -Uri "$base/api/auth/login" -Method POST -Body '{"email":"superadmin@admin.com","password":"admin123"}' -ContentType "application/json" -TimeoutSec 15
    $token2 = $loginResp2.token
    Write-Host "RE-LOGIN OK"
} catch {
    Write-Host "RE-LOGIN FAILED: $($_.Exception.Message)"
    exit 1
}
$headers = @{"Authorization" = "Bearer $token2"}

$r = T2 POST "$base/api/assets" '{"invalid":"body"}'
$results += [PSCustomObject]@{Num="28"; Method="POST"; Endpoint="/api/assets (invalid body)"; Status=$r.status; Body=$r.body}
Write-Host "#28 POST /api/assets (invalid) -> $($r.status)"

$r = T2 PUT "$base/api/assets/1" "{}"
$results += [PSCustomObject]@{Num="29"; Method="PUT"; Endpoint="/api/assets/1 (empty body)"; Status=$r.status; Body=$r.body}
Write-Host "#29 PUT /api/assets/1 (empty) -> $($r.status)"

$r = T2 DELETE "$base/api/assets/99999" $null
$results += [PSCustomObject]@{Num="30"; Method="DELETE"; Endpoint="/api/assets/99999"; Status=$r.status; Body=$r.body}
Write-Host "#30 DELETE /api/assets/99999 -> $($r.status)"

$r = T2 POST "$base/api/tickets" '{"title":"only title"}'
$results += [PSCustomObject]@{Num="31"; Method="POST"; Endpoint="/api/tickets (missing fields)"; Status=$r.status; Body=$r.body}
Write-Host "#31 POST /api/tickets (missing) -> $($r.status)"

$sqli = [System.Uri]::EscapeDataString("'; DROP TABLE users; --")
$r = T2 GET "$base/api/assets?search=$sqli"
$results += [PSCustomObject]@{Num="32"; Method="GET"; Endpoint="/api/assets (SQLi)"; Status=$r.status; Body=$r.body}
Write-Host "#32 GET /api/assets (SQLi) -> $($r.status)"

$xss = [System.Uri]::EscapeDataString("<script>alert(1)</script>")
$r = T2 GET "$base/api/assets?search=$xss"
$results += [PSCustomObject]@{Num="33"; Method="GET"; Endpoint="/api/assets (XSS)"; Status=$r.status; Body=$r.body}
Write-Host "#33 GET /api/assets (XSS) -> $($r.status)"

$r = T2 GET "$base/api/admin/database/status"
$results += [PSCustomObject]@{Num="34"; Method="GET"; Endpoint="/api/admin/database/status"; Status=$r.status; Body=$r.body}
Write-Host "#34 GET /api/admin/database/status -> $($r.status)"

$r = T2 GET "$base/api/logs/audit"
$results += [PSCustomObject]@{Num="35"; Method="GET"; Endpoint="/api/logs/audit"; Status=$r.status; Body=$r.body}
Write-Host "#35 GET /api/logs/audit -> $($r.status)"

$r = T2 GET "$base/api/tickets/1/history"
$results += [PSCustomObject]@{Num="36"; Method="GET"; Endpoint="/api/tickets/1/history"; Status=$r.status; Body=$r.body}
Write-Host "#36 GET /api/tickets/1/history -> $($r.status)"

$r = T2 GET "$base/api/users"
$results += [PSCustomObject]@{Num="37"; Method="GET"; Endpoint="/api/users (superadmin)"; Status=$r.status; Body=$r.body}
Write-Host "#37 GET /api/users (superadmin) -> $($r.status)"

$r = T2 POST "$base/api/auth/logout" "{}"
$results += [PSCustomObject]@{Num="38"; Method="POST"; Endpoint="/api/auth/logout (final)"; Status=$r.status; Body=$r.body}
Write-Host "#38 POST /api/auth/logout (final) -> $($r.status)"

Write-Host ""
Write-Host "=== EDGE CASE & REMAINING RESULTS ==="
$results | Format-Table Num, Method, Endpoint, Status, Body -AutoSize -Wrap
