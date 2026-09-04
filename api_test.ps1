$ErrorActionPreference = "Continue"
$base = "http://192.168.100.85:5173"

Write-Host "=== STEP 1: LOGIN ==="
try {
    $loginResp = Invoke-RestMethod -Uri "$base/api/auth/login" -Method POST -Body '{"email":"superadmin@admin.com","password":"admin123"}' -ContentType "application/json" -TimeoutSec 15
    $token = $loginResp.token
    Write-Host "LOGIN OK - Token length: $($token.Length)"
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
        $req.Timeout = 10000
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

# ==========================================
# PART 1: Auth
# ==========================================
$r = T GET "$base/api/auth/me"
$results += [PSCustomObject]@{Num="1"; Method="GET"; Endpoint="/api/auth/me"; Status=$r.status; Body=$r.body}
Write-Host "#1  GET /api/auth/me -> $($r.status)"

# ==========================================
# PART 2: Assets
# ==========================================
$r = T GET "$base/api/assets"
$results += [PSCustomObject]@{Num="2"; Method="GET"; Endpoint="/api/assets"; Status=$r.status; Body=$r.body}
Write-Host "#2  GET /api/assets -> $($r.status)"

$r = T GET "$base/api/assets?all=true"
$results += [PSCustomObject]@{Num="3"; Method="GET"; Endpoint="/api/assets?all=true"; Status=$r.status; Body=$r.body}
Write-Host "#3  GET /api/assets?all=true -> $($r.status)"

$r = T GET "$base/api/assets/stats"
$results += [PSCustomObject]@{Num="4"; Method="GET"; Endpoint="/api/assets/stats"; Status=$r.status; Body=$r.body}
Write-Host "#4  GET /api/assets/stats -> $($r.status)"

$r = T GET "$base/api/assets/1"
$results += [PSCustomObject]@{Num="5"; Method="GET"; Endpoint="/api/assets/1"; Status=$r.status; Body=$r.body}
Write-Host "#5  GET /api/assets/1 -> $($r.status)"

$r = T GET "$base/api/assets/99999"
$results += [PSCustomObject]@{Num="6"; Method="GET"; Endpoint="/api/assets/99999"; Status=$r.status; Body=$r.body}
Write-Host "#6  GET /api/assets/99999 -> $($r.status)"

# ==========================================
# PART 3: GA & OPS Assets
# ==========================================
$r = T GET "$base/api/ga-assets"
$results += [PSCustomObject]@{Num="7"; Method="GET"; Endpoint="/api/ga-assets"; Status=$r.status; Body=$r.body}
Write-Host "#7  GET /api/ga-assets -> $($r.status)"

$r = T GET "$base/api/ops-assets"
$results += [PSCustomObject]@{Num="8"; Method="GET"; Endpoint="/api/ops-assets"; Status=$r.status; Body=$r.body}
Write-Host "#8  GET /api/ops-assets -> $($r.status)"

# ==========================================
# PART 4: Employees
# ==========================================
$r = T GET "$base/api/employees"
$results += [PSCustomObject]@{Num="9"; Method="GET"; Endpoint="/api/employees"; Status=$r.status; Body=$r.body}
Write-Host "#9  GET /api/employees -> $($r.status)"

$r = T GET "$base/api/employees/stats"
$results += [PSCustomObject]@{Num="10"; Method="GET"; Endpoint="/api/employees/stats"; Status=$r.status; Body=$r.body}
Write-Host "#10 GET /api/employees/stats -> $($r.status)"

$r = T GET "$base/api/employees/locations"
$results += [PSCustomObject]@{Num="11"; Method="GET"; Endpoint="/api/employees/locations"; Status=$r.status; Body=$r.body}
Write-Host "#11 GET /api/employees/locations -> $($r.status)"

$r = T GET "$base/api/employees/with-assets"
$results += [PSCustomObject]@{Num="12"; Method="GET"; Endpoint="/api/employees/with-assets"; Status=$r.status; Body=$r.body}
Write-Host "#12 GET /api/employees/with-assets -> $($r.status)"

# ==========================================
# PART 5: Users
# ==========================================
$r = T GET "$base/api/users"
$results += [PSCustomObject]@{Num="13"; Method="GET"; Endpoint="/api/users"; Status=$r.status; Body=$r.body}
Write-Host "#13 GET /api/users -> $($r.status)"

# ==========================================
# PART 6: Tickets
# ==========================================
$r = T GET "$base/api/tickets"
$results += [PSCustomObject]@{Num="14"; Method="GET"; Endpoint="/api/tickets"; Status=$r.status; Body=$r.body}
Write-Host "#14 GET /api/tickets -> $($r.status)"

$r = T GET "$base/api/tickets/stats"
$results += [PSCustomObject]@{Num="15"; Method="GET"; Endpoint="/api/tickets/stats"; Status=$r.status; Body=$r.body}
Write-Host "#15 GET /api/tickets/stats -> $($r.status)"

$r = T GET "$base/api/tickets/reporters"
$results += [PSCustomObject]@{Num="16"; Method="GET"; Endpoint="/api/tickets/reporters"; Status=$r.status; Body=$r.body}
Write-Host "#16 GET /api/tickets/reporters -> $($r.status)"

# ==========================================
# PART 7: Knowledge Base
# ==========================================
$r = T GET "$base/api/faqs"
$results += [PSCustomObject]@{Num="17"; Method="GET"; Endpoint="/api/faqs"; Status=$r.status; Body=$r.body}
Write-Host "#17 GET /api/faqs -> $($r.status)"

$r = T GET "$base/api/cases"
$results += [PSCustomObject]@{Num="18"; Method="GET"; Endpoint="/api/cases"; Status=$r.status; Body=$r.body}
Write-Host "#18 GET /api/cases -> $($r.status)"

$r = T GET "$base/api/kb-categories"
$results += [PSCustomObject]@{Num="19"; Method="GET"; Endpoint="/api/kb-categories"; Status=$r.status; Body=$r.body}
Write-Host "#19 GET /api/kb-categories -> $($r.status)"

# ==========================================
# PART 8: Logs
# ==========================================
$r = T GET "$base/api/logs"
$results += [PSCustomObject]@{Num="20"; Method="GET"; Endpoint="/api/logs"; Status=$r.status; Body=$r.body}
Write-Host "#20 GET /api/logs -> $($r.status)"

# ==========================================
# PART 9: Export
# ==========================================
$r = T GET "$base/api/export/tables"
$results += [PSCustomObject]@{Num="21"; Method="GET"; Endpoint="/api/export/tables"; Status=$r.status; Body=$r.body}
Write-Host "#21 GET /api/export/tables -> $($r.status)"

$r = T GET "$base/api/export"
$results += [PSCustomObject]@{Num="22"; Method="GET"; Endpoint="/api/export"; Status=$r.status; Body=$r.body}
Write-Host "#22 GET /api/export -> $($r.status)"

# ==========================================
# PART 10: Queues & Bookmarks
# ==========================================
$r = T GET "$base/api/ticket-queues"
$results += [PSCustomObject]@{Num="23"; Method="GET"; Endpoint="/api/ticket-queues"; Status=$r.status; Body=$r.body}
Write-Host "#23 GET /api/ticket-queues -> $($r.status)"

$r = T GET "$base/api/case-bookmarks"
$results += [PSCustomObject]@{Num="24"; Method="GET"; Endpoint="/api/case-bookmarks"; Status=$r.status; Body=$r.body}
Write-Host "#24 GET /api/case-bookmarks -> $($r.status)"

# ==========================================
# PART 11: SSE Endpoint
# ==========================================
try {
    $req = [System.Net.HttpWebRequest]::Create("$base/api/tickets/events")
    $req.Method = "GET"
    $req.Timeout = 5000
    foreach ($k in $headers.Keys) { $req.Headers[$k] = $headers[$k] }
    $webResp = $req.GetResponse()
    $sseCode = [int]$webResp.StatusCode
    $sr = New-Object System.IO.StreamReader($webResp.GetResponseStream())
    $sseData = $sr.ReadToEnd()
    $sr.Close()
    $webResp.Close()
    if ($sseData.Length -gt 200) { $sseData = $sseData.Substring(0,200) + "..." }
    $results += [PSCustomObject]@{Num="25"; Method="GET"; Endpoint="/api/tickets/events (SSE)"; Status=$sseCode; Body=$sseData}
    Write-Host "#25 GET /api/tickets/events -> $sseCode (SSE)"
} catch {
    $sseCode = "?"
    try { $sseCode = [int]$_.Exception.Response.StatusCode } catch {}
    $results += [PSCustomObject]@{Num="25"; Method="GET"; Endpoint="/api/tickets/events (SSE)"; Status=$sseCode; Body="SSE connect attempt"}
    Write-Host "#25 GET /api/tickets/events -> $sseCode (SSE)"
}

# ==========================================
# PART 12: Logout & Post-logout
# ==========================================
$r = T POST "$base/api/auth/logout" "{}"
$results += [PSCustomObject]@{Num="26"; Method="POST"; Endpoint="/api/auth/logout"; Status=$r.status; Body=$r.body}
Write-Host "#26 POST /api/auth/logout -> $($r.status)"

$r = T GET "$base/api/auth/me"
$results += [PSCustomObject]@{Num="27"; Method="GET"; Endpoint="/api/auth/me (after logout)"; Status=$r.status; Body=$r.body}
Write-Host "#27 GET /api/auth/me (post-logout) -> $($r.status)"

# ==========================================
# PART 13: Re-login for edge case tests
# ==========================================
Write-Host ""
Write-Host "=== RE-LOGIN FOR EDGE CASES ==="
Start-Sleep -Seconds 2
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

    # POST /api/assets with invalid body
    $r = T POST "$base/api/assets" '{"invalid":"body with no required fields"}'
    $results += [PSCustomObject]@{Num="28"; Method="POST"; Endpoint="/api/assets (invalid body)"; Status=$r.status; Body=$r.body}
    Write-Host "#28 POST /api/assets (invalid) -> $($r.status)"

    # PUT /api/assets/1 with empty body
    $r = T PUT "$base/api/assets/1" "{}"
    $results += [PSCustomObject]@{Num="29"; Method="PUT"; Endpoint="/api/assets/1 (empty body)"; Status=$r.status; Body=$r.body}
    Write-Host "#29 PUT /api/assets/1 (empty) -> $($r.status)"

    # DELETE /api/assets/99999
    try {
        $req = [System.Net.HttpWebRequest]::Create("$base/api/assets/99999")
        $req.Method = "DELETE"
        $req.Timeout = 10000
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

    # POST /api/tickets with missing required fields
    $r = T POST "$base/api/tickets" '{"title":"only title"}'
    $results += [PSCustomObject]@{Num="31"; Method="POST"; Endpoint="/api/tickets (missing fields)"; Status=$r.status; Body=$r.body}
    Write-Host "#31 POST /api/tickets (missing fields) -> $($r.status)"

    # SQL injection
    $sqli = [System.Uri]::EscapeDataString("'; DROP TABLE users; --")
    $r = T GET "$base/api/assets?search=$sqli"
    $results += [PSCustomObject]@{Num="32"; Method="GET"; Endpoint="/api/assets?search=SQLi"; Status=$r.status; Body=$r.body}
    Write-Host "#32 GET /api/assets (SQLi) -> $($r.status)"

    # XSS
    $xss = [System.Uri]::EscapeDataString("<script>alert(1)</script>")
    $r = T GET "$base/api/assets?search=$xss"
    $results += [PSCustomObject]@{Num="33"; Method="GET"; Endpoint="/api/assets?search=XSS"; Status=$r.status; Body=$r.body}
    Write-Host "#33 GET /api/assets (XSS) -> $($r.status)"

    # Admin-only endpoints
    $r = T GET "$base/api/admin/database/status"
    $results += [PSCustomObject]@{Num="34"; Method="GET"; Endpoint="/api/admin/database/status"; Status=$r.status; Body=$r.body}
    Write-Host "#34 GET /api/admin/database/status -> $($r.status)"

    $r = T GET "$base/api/logs/audit"
    $results += [PSCustomObject]@{Num="35"; Method="GET"; Endpoint="/api/logs/audit"; Status=$r.status; Body=$r.body}
    Write-Host "#35 GET /api/logs/audit -> $($r.status)"

    $r = T GET "$base/api/tickets/1/history"
    $results += [PSCustomObject]@{Num="36"; Method="GET"; Endpoint="/api/tickets/1/history"; Status=$r.status; Body=$r.body}
    Write-Host "#36 GET /api/tickets/1/history -> $($r.status)"

    # GET /api/users as superadmin
    $r = T GET "$base/api/users"
    $results += [PSCustomObject]@{Num="37"; Method="GET"; Endpoint="/api/users (superadmin)"; Status=$r.status; Body=$r.body}
    Write-Host "#37 GET /api/users (superadmin) -> $($r.status)"

    # Final logout
    $r = T POST "$base/api/auth/logout" "{}"
    $results += [PSCustomObject]@{Num="38"; Method="POST"; Endpoint="/api/auth/logout (final)"; Status=$r.status; Body=$r.body}
    Write-Host "#38 POST /api/auth/logout (final) -> $($r.status)"
}

# ==========================================
# RESULTS TABLE
# ==========================================
Write-Host ""
Write-Host "====================================================================================================="
Write-Host "                                        COMPREHENSIVE API TEST RESULTS"
Write-Host "====================================================================================================="
$results | Format-Table Num, Method, Endpoint, Status, Body -AutoSize -Wrap
$results | Export-Csv -Path "C:\Users\Helmy\Documents\Magang\Projects\it-monitoring-assets\api_test_results.csv" -NoTypeInformation
Write-Host "Results exported to api_test_results.csv"
