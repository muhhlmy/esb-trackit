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

function T {
    param([string]$Method, [string]$Url, [string]$Body = $null)
    try {
        $req = [System.Net.HttpWebRequest]::Create($Url)
        $req.Method = $Method
        $req.Timeout = 8000
        $req.ContentType = "application/json"
        foreach ($k in $headers.Keys) { $req.Headers[$k] = $headers[$k] }
        if ($Body -and ($Method -eq "POST" -or $Method -eq "PUT")) {
            $bytes = [System.Text.Encoding]::UTF8.GetBytes($Body)
            $req.ContentLength = $bytes.Length
            $stream = $req.GetRequestStream()
            $stream.Write($bytes, 0, $bytes.Length)
            $stream.Close()
        }
        $webResp = $req.GetResponse()
        $code = [int]$webResp.StatusCode
        $sr = New-Object System.IO.StreamReader($webResp.GetResponseStream())
        $respBody = $sr.ReadToEnd()
        $sr.Close()
        $webResp.Close()
        if ($respBody.Length -gt 300) { $respBody = $respBody.Substring(0,300) + "..." }
        return @{status=$code; body=$respBody}
    } catch {
        $code = "?"
        try { $code = [int]$_.Exception.Response.StatusCode } catch {}
        $msg = ""
        try {
            $sr = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
            $msg = $sr.ReadToEnd()
            $sr.Close()
        } catch {}
        if (-not $msg) { $msg = $_.Exception.Message }
        if ($msg.Length -gt 300) { $msg = $msg.Substring(0,300) + "..." }
        return @{status=$code; body=$msg}
    }
}

# #25 - SSE with very short timeout
Write-Host "#25 Testing SSE /api/tickets/events..."
try {
    $req = [System.Net.HttpWebRequest]::Create("$base/api/tickets/events")
    $req.Method = "GET"
    $req.Timeout = 3000
    foreach ($k in $headers.Keys) { $req.Headers[$k] = $headers[$k] }
    $req.Accept = "text/event-stream"
    $webResp = $req.GetResponse()
    $sseCode = [int]$webResp.StatusCode
    $ct = $webResp.ContentType
    $sr = New-Object System.IO.StreamReader($webResp.GetResponseStream())
    $buf = New-Object char[] 512
    $read = $sr.Read($buf, 0, 512)
    $sseData = New-Object String(,$buf, 0, $read)
    $sr.Close()
    $webResp.Close()
    if ($sseData.Length -gt 200) { $sseData = $sseData.Substring(0,200) + "..." }
    $results += [PSCustomObject]@{Num="25"; Method="GET"; Endpoint="/api/tickets/events (SSE)"; Status=$sseCode; Body="CT=$ct | $sseData"}
    Write-Host "#25 GET /api/tickets/events -> $sseCode (SSE)"
} catch {
    $sseCode = "?"
    try { $sseCode = [int]$_.Exception.Response.StatusCode } catch {}
    $results += [PSCustomObject]@{Num="25"; Method="GET"; Endpoint="/api/tickets/events (SSE)"; Status=$sseCode; Body="SSE connection attempt"}
    Write-Host "#25 GET /api/tickets/events -> $sseCode"
}

# #26 Logout
$r = T POST "$base/api/auth/logout" "{}"
$results += [PSCustomObject]@{Num="26"; Method="POST"; Endpoint="/api/auth/logout"; Status=$r.status; Body=$r.body}
Write-Host "#26 POST /api/auth/logout -> $($r.status)"

# #27 Post-logout auth check
$r = T GET "$base/api/auth/me"
$results += [PSCustomObject]@{Num="27"; Method="GET"; Endpoint="/api/auth/me (after logout)"; Status=$r.status; Body=$r.body}
Write-Host "#27 GET /api/auth/me (post-logout) -> $($r.status)"

# Re-login for edge cases
Write-Host "Re-logging in for edge cases..."
Start-Sleep -Seconds 3
try {
    $loginResp2 = Invoke-RestMethod -Uri "$base/api/auth/login" -Method POST -Body '{"email":"superadmin@admin.com","password":"admin123"}' -ContentType "application/json" -TimeoutSec 15
    $token2 = $loginResp2.token
    Write-Host "RE-LOGIN OK"
} catch {
    Write-Host "RE-LOGIN FAILED: $($_.Exception.Message)"
    $token2 = $null
}

if ($token2) {
    $headers = @{"Authorization" = "Bearer $token2"}

    # #28 POST /api/assets invalid body
    $r = T POST "$base/api/assets" '{"invalid":"body"}'
    $results += [PSCustomObject]@{Num="28"; Method="POST"; Endpoint="/api/assets (invalid body)"; Status=$r.status; Body=$r.body}
    Write-Host "#28 POST /api/assets (invalid) -> $($r.status)"

    # #29 PUT /api/assets/1 empty body
    $r = T PUT "$base/api/assets/1" "{}"
    $results += [PSCustomObject]@{Num="29"; Method="PUT"; Endpoint="/api/assets/1 (empty body)"; Status=$r.status; Body=$r.body}
    Write-Host "#29 PUT /api/assets/1 (empty) -> $($r.status)"

    # #30 DELETE /api/assets/99999
    try {
        $req = [System.Net.HttpWebRequest]::Create("$base/api/assets/99999")
        $req.Method = "DELETE"
        $req.Timeout = 8000
        foreach ($k in $headers.Keys) { $req.Headers[$k] = $headers[$k] }
        $webResp = $req.GetResponse()
        $delCode = [int]$webResp.StatusCode
        $sr = New-Object System.IO.StreamReader($webResp.GetResponseStream())
        $delBody = $sr.ReadToEnd()
        $sr.Close()
        $webResp.Close()
        if ($delBody.Length -gt 300) { $delBody = $delBody.Substring(0,300) + "..." }
        $results += [PSCustomObject]@{Num="30"; Method="DELETE"; Endpoint="/api/assets/99999"; Status=$delCode; Body=$delBody}
        Write-Host "#30 DELETE /api/assets/99999 -> $delCode"
    } catch {
        $delCode = "?"
        try { $delCode = [int]$_.Exception.Response.StatusCode } catch {}
        $delBody = ""
        try {
            $sr = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
            $delBody = $sr.ReadToEnd()
            $sr.Close()
        } catch {}
        if ($delBody.Length -gt 300) { $delBody = $delBody.Substring(0,300) + "..." }
        $results += [PSCustomObject]@{Num="30"; Method="DELETE"; Endpoint="/api/assets/99999"; Status=$delCode; Body=$delBody}
        Write-Host "#30 DELETE /api/assets/99999 -> $delCode"
    }

    # #31 POST /api/tickets missing fields
    $r = T POST "$base/api/tickets" '{"title":"only title"}'
    $results += [PSCustomObject]@{Num="31"; Method="POST"; Endpoint="/api/tickets (missing fields)"; Status=$r.status; Body=$r.body}
    Write-Host "#31 POST /api/tickets (missing) -> $($r.status)"

    # #32 SQL injection
    $sqli = [System.Uri]::EscapeDataString("'; DROP TABLE users; --")
    $r = T GET "$base/api/assets?search=$sqli"
    $results += [PSCustomObject]@{Num="32"; Method="GET"; Endpoint="/api/assets (SQLi)"; Status=$r.status; Body=$r.body}
    Write-Host "#32 GET /api/assets (SQLi) -> $($r.status)"

    # #33 XSS
    $xss = [System.Uri]::EscapeDataString("<script>alert(1)</script>")
    $r = T GET "$base/api/assets?search=$xss"
    $results += [PSCustomObject]@{Num="33"; Method="GET"; Endpoint="/api/assets (XSS)"; Status=$r.status; Body=$r.body}
    Write-Host "#33 GET /api/assets (XSS) -> $($r.status)"

    # #34 Admin database status
    $r = T GET "$base/api/admin/database/status"
    $results += [PSCustomObject]@{Num="34"; Method="GET"; Endpoint="/api/admin/database/status"; Status=$r.status; Body=$r.body}
    Write-Host "#34 GET /api/admin/database/status -> $($r.status)"

    # #35 Audit logs
    $r = T GET "$base/api/logs/audit"
    $results += [PSCustomObject]@{Num="35"; Method="GET"; Endpoint="/api/logs/audit"; Status=$r.status; Body=$r.body}
    Write-Host "#35 GET /api/logs/audit -> $($r.status)"

    # #36 Ticket history
    $r = T GET "$base/api/tickets/1/history"
    $results += [PSCustomObject]@{Num="36"; Method="GET"; Endpoint="/api/tickets/1/history"; Status=$r.status; Body=$r.body}
    Write-Host "#36 GET /api/tickets/1/history -> $($r.status)"

    # #37 GET /api/users (superadmin)
    $r = T GET "$base/api/users"
    $results += [PSCustomObject]@{Num="37"; Method="GET"; Endpoint="/api/users (superadmin)"; Status=$r.status; Body=$r.body}
    Write-Host "#37 GET /api/users (superadmin) -> $($r.status)"

    # #38 Final logout
    $r = T POST "$base/api/auth/logout" "{}"
    $results += [PSCustomObject]@{Num="38"; Method="POST"; Endpoint="/api/auth/logout (final)"; Status=$r.status; Body=$r.body}
    Write-Host "#38 POST /api/auth/logout (final) -> $($r.status)"
}

Write-Host ""
Write-Host "=== PART 2 RESULTS (25-38) ==="
$results | Format-Table Num, Method, Endpoint, Status, Body -AutoSize -Wrap
