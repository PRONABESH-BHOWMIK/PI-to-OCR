# Accepted Bill Payment Reminder - local server that sends through Outlook
# Runs only on this PC (http://localhost). Close the window to stop it.
param([int]$Port = 8765)
$ErrorActionPreference = 'Stop'

$Root   = Split-Path -Parent $MyInvocation.MyCommand.Path
$LogDir = Join-Path $Root 'logs'
if (-not (Test-Path $LogDir)) { New-Item -ItemType Directory -Path $LogDir | Out-Null }
$Token  = [guid]::NewGuid().ToString('N')
$Prefix = "http://localhost:$Port/"

$Mime = @{
  '.html' = 'text/html; charset=utf-8'; '.js' = 'application/javascript; charset=utf-8'
  '.css'  = 'text/css; charset=utf-8';  '.png' = 'image/png'; '.ico' = 'image/x-icon'
  '.svg'  = 'image/svg+xml'
}

$Listener = New-Object System.Net.HttpListener
$Listener.Prefixes.Add($Prefix)
try { $Listener.Start() }
catch {
  Write-Host "The app seems to be running already. Opening it in your browser..." -ForegroundColor Yellow
  Start-Process $Prefix
  Start-Sleep -Seconds 3
  exit
}

function Write-Bytes($ctx, [byte[]]$bytes, [string]$type, [int]$code = 200) {
  $ctx.Response.StatusCode = $code
  $ctx.Response.ContentType = $type
  $ctx.Response.Headers.Add('Cache-Control', 'no-store')
  $ctx.Response.ContentLength64 = $bytes.Length
  $ctx.Response.OutputStream.Write($bytes, 0, $bytes.Length)
  $ctx.Response.OutputStream.Close()
}

function Write-Json($ctx, $obj, [int]$code = 200) {
  $json = ConvertTo-Json -InputObject $obj -Depth 6 -Compress
  Write-Bytes $ctx ([Text.Encoding]::UTF8.GetBytes($json)) 'application/json; charset=utf-8' $code
}

function Get-Outlook {
  try { return [Runtime.InteropServices.Marshal]::GetActiveObject('Outlook.Application') }
  catch { return New-Object -ComObject Outlook.Application }
}

function Get-Accounts {
  $ol = Get-Outlook
  $ns = $ol.GetNamespace('MAPI')
  $list = @()
  foreach ($a in $ns.Accounts) { $list += [string]$a.SmtpAddress }
  return ,$list
}

function Send-Mail($d) {
  $ol   = Get-Outlook
  $ns   = $ol.GetNamespace('MAPI')
  $mail = $ol.CreateItem(0)
  try {
    $mail.To      = [string]$d.to
    if ($d.cc) { $mail.CC = [string]$d.cc }
    $mail.Subject  = [string]$d.subject
    $mail.HTMLBody = [string]$d.html

    if ($d.account) {
      $acc = $null
      foreach ($a in $ns.Accounts) { if ($a.SmtpAddress -eq $d.account) { $acc = $a } }
      if ($acc) {
        [void][System.__ComObject].InvokeMember('SendUsingAccount',
          [System.Reflection.BindingFlags]::SetProperty, $null, $mail, @($acc))
      }
    }
    if ($d.onBehalf) { $mail.SentOnBehalfOfName = [string]$d.onBehalf }

    if (-not $mail.Recipients.ResolveAll()) {
      $bad = @()
      foreach ($r in $mail.Recipients) { if (-not $r.Resolved) { $bad += $r.Name } }
      throw "Outlook couldn't recognise: $($bad -join ', ')"
    }

    if ($d.mode -eq 'display') { $mail.Display() } else { $mail.Send() }
  }
  finally {
    [void][Runtime.InteropServices.Marshal]::ReleaseComObject($mail)
  }
}

function Write-Log($d, [string]$status, [string]$err) {
  $row = [pscustomobject]@{
    Time      = (Get-Date -Format 'yyyy-MM-dd HH:mm:ss')
    Action    = if ($d.mode -eq 'display') { 'Opened' } else { 'Sent' }
    Applicant = [string]$d.applicant
    Type      = [string]$d.kind
    Bills     = [string]$d.bills
    To        = [string]$d.to
    CC        = [string]$d.cc
    Subject   = [string]$d.subject
    Status    = $status
    Error     = $err
  }
  $file = Join-Path $LogDir ("email_log_{0}.csv" -f (Get-Date -Format 'yyyy-MM'))
  $row | Export-Csv -Path $file -Append -NoTypeInformation -Encoding UTF8
}

Clear-Host
Write-Host ""
Write-Host "  Accepted Bill Payment Reminder is running" -ForegroundColor Green
Write-Host "  Open: $Prefix"
Write-Host "  Keep this window open while you work. Close it to stop the app."
Write-Host ""
Start-Process $Prefix

while ($Listener.IsListening) {
  $ctx  = $Listener.GetContext()
  $req  = $ctx.Request
  $path = $req.Url.AbsolutePath
  try {
    if ($path.StartsWith('/api/')) {
      if ($req.Headers['X-BTB-Token'] -ne $Token) {
        Write-Json $ctx @{ ok = $false; error = 'Session expired. Reload the page.' } 403
      }
      elseif ($path -eq '/api/status') {
        Write-Json $ctx @{ ok = $true; accounts = (Get-Accounts) }
      }
      elseif ($path -eq '/api/send' -and $req.HttpMethod -eq 'POST') {
        $reader = New-Object IO.StreamReader($req.InputStream, [Text.Encoding]::UTF8)
        $d = $reader.ReadToEnd() | ConvertFrom-Json
        try {
          Send-Mail $d
          Write-Log $d 'OK' ''
          $label = if ($d.mode -eq 'display') { 'OPENED' } else { 'SENT  ' }
          Write-Host ("  [{0}] {1}  ->  {2}" -f $label, $d.applicant, $d.to) -ForegroundColor Cyan
          Write-Json $ctx @{ ok = $true }
        }
        catch {
          $msg = $_.Exception.Message
          Write-Log $d 'FAILED' $msg
          Write-Host ("  [FAILED] {0}: {1}" -f $d.applicant, $msg) -ForegroundColor Red
          Write-Json $ctx @{ ok = $false; error = $msg }
        }
      }
      else {
        Write-Json $ctx @{ ok = $false; error = 'Unknown request.' } 404
      }
    }
    else {
      $rel  = if ($path -eq '/') { 'index.html' } else { [Uri]::UnescapeDataString($path.TrimStart('/')) }
      $full = [IO.Path]::GetFullPath((Join-Path $Root $rel))
      if (-not $full.StartsWith($Root, [StringComparison]::OrdinalIgnoreCase) -or -not (Test-Path $full -PathType Leaf)) {
        Write-Bytes $ctx ([Text.Encoding]::UTF8.GetBytes('Not found')) 'text/plain' 404
      }
      else {
        $ext = [IO.Path]::GetExtension($full).ToLower()
        if ($ext -eq '.html') {
          $html  = [IO.File]::ReadAllText($full, [Text.Encoding]::UTF8).Replace('__BTB_TOKEN__', $Token)
          $bytes = [Text.Encoding]::UTF8.GetBytes($html)
        } else {
          $bytes = [IO.File]::ReadAllBytes($full)
        }
        $type = $Mime[$ext]
        if (-not $type) { $type = 'application/octet-stream' }
        Write-Bytes $ctx $bytes $type
      }
    }
  }
  catch {
    try { Write-Json $ctx @{ ok = $false; error = $_.Exception.Message } 500 } catch {}
  }
}