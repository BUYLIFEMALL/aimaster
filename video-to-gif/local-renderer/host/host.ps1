# VideoToGIF local renderer - Windows Native Messaging host (Windows PowerShell 5.1 built-in, no install).
# Same protocol as host.pl: 4-byte little-endian length + UTF-8 JSON. Host -> Chrome max 1MB per message, so results are chunked.
# Security: never accepts a command string. Only validated numbers (width/fps/colors/trim) are turned into ffmpeg arguments here.
# Keep this file ASCII-only: Windows PowerShell 5.1 reads BOM-less scripts in the system ANSI code page.
$ErrorActionPreference = 'Stop'
$HostVersion = '1.00'
$ChunkBytes = 600 * 1024
$stdin = [Console]::OpenStandardInput()
$stdout = [Console]::OpenStandardOutput()
$utf8 = New-Object System.Text.UTF8Encoding($false)
$workdir = Join-Path ([IO.Path]::GetTempPath()) ('buylife-gif-' + [Guid]::NewGuid().ToString('N').Substring(0, 8))
New-Item -ItemType Directory -Path $workdir -Force | Out-Null
$jobs = @{}

function Send-Raw([string]$text) {
  $bytes = $utf8.GetBytes($text)
  $stdout.Write([BitConverter]::GetBytes([int32]$bytes.Length), 0, 4)
  $stdout.Write($bytes, 0, $bytes.Length)
  $stdout.Flush()
}
function Send-Msg($obj) { Send-Raw ($obj | ConvertTo-Json -Compress -Depth 4) }
function Send-Fail([string]$message, $extra) {
  $o = [ordered]@{ type = 'error'; message = $message }
  if ($extra) { foreach ($k in $extra.Keys) { $o[$k] = $extra[$k] } }
  Send-Msg $o
}
function Read-Exact([int]$n) {
  $buf = New-Object byte[] $n
  $off = 0
  while ($off -lt $n) {
    $got = $stdin.Read($buf, $off, $n - $off)
    if ($got -le 0) { return $null }
    $off += $got
  }
  return , $buf
}
function Find-Ffmpeg {
  $cfg = Join-Path $PSScriptRoot 'config.json'
  if (Test-Path $cfg) {
    try { $c = Get-Content -Raw -Encoding UTF8 $cfg | ConvertFrom-Json; if ($c.ffmpeg -and (Test-Path $c.ffmpeg)) { return $c.ffmpeg } } catch {}
  }
  $local = Join-Path $PSScriptRoot 'ffmpeg.exe'
  if (Test-Path $local) { return $local }
  $cmd = Get-Command ffmpeg -ErrorAction SilentlyContinue
  if ($cmd) { return $cmd.Source }
  return $null
}
function Get-FfmpegVersion($ffmpeg) {
  if (-not $ffmpeg) { return $null }
  try { return (& $ffmpeg -hide_banner -version 2>$null | Select-Object -First 1) } catch { return $null }
}
function Test-Job($job) { return ($job -is [string]) -and ($job -match '^[A-Za-z0-9_-]{1,64}$') }
function Test-Num($v, [double]$min, [double]$max, [bool]$int) {
  if ($null -eq $v) { return $false }
  $s = [string]$v
  if ($s -notmatch '^\d+(\.\d+)?$') { return $false }
  $d = [double]::Parse($s, [Globalization.CultureInfo]::InvariantCulture)
  if ($int -and $d -ne [math]::Floor($d)) { return $false }
  return ($d -ge $min) -and ($d -le $max)
}
function Fmt($v) { return ([double]$v).ToString([Globalization.CultureInfo]::InvariantCulture) }

function Invoke-Encode($m) {
  $job = $m.job
  $req = 0
  if ([string]$m.req -match '^\d{1,9}$') { $req = [int]$m.req }
  $ids = [ordered]@{ job = $job; req = $req }
  if (-not (Test-Job $job) -or -not $jobs.ContainsKey($job) -or $jobs[$job].fs) { Send-Fail 'job unknown' $ids; return }
  $ok = (Test-Num $m.width 16 4096 $true) -and (Test-Num $m.fps 1 60 $true) -and (Test-Num $m.colors 2 256 $true) `
    -and (($null -eq $m.start) -or (Test-Num $m.start 0 36000 $false)) -and (($null -eq $m.duration) -or (Test-Num $m.duration 0.05 36000 $false))
  if (-not $ok) { Send-Fail 'bad params' $ids; return }
  $ffmpeg = Find-Ffmpeg
  if (-not $ffmpeg) { $ids['code'] = 'NO_FFMPEG'; Send-Fail 'ffmpeg not found' $ids; return }

  $out = Join-Path $workdir ("$job-$req.gif")
  $ffArgs = @('-hide_banner', '-nostdin', '-loglevel', 'error', '-nostats', '-progress', 'pipe:1', '-y')
  if ($null -ne $m.start -and [double]$m.start -gt 0) { $ffArgs += @('-ss', (Fmt $m.start)) }
  if ($null -ne $m.duration) { $ffArgs += @('-t', (Fmt $m.duration)) }
  $filter = "fps=$([int]$m.fps),scale=$([int]$m.width):-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=$([int]$m.colors):stats_mode=diff[p];[b][p]paletteuse=dither=sierra2_4a:diff_mode=rectangle"
  $ffArgs += @('-i', $jobs[$job].path, '-lavfi', $filter, $out)

  $psi = New-Object System.Diagnostics.ProcessStartInfo
  $psi.FileName = $ffmpeg
  $psi.Arguments = ($ffArgs | ForEach-Object { if ($_ -match '[\s"]') { '"' + ($_ -replace '"', '\"') + '"' } else { $_ } }) -join ' '
  $psi.UseShellExecute = $false
  $psi.RedirectStandardOutput = $true
  $psi.RedirectStandardError = $true
  $psi.CreateNoWindow = $true
  $p = [System.Diagnostics.Process]::Start($psi)
  $errTask = $p.StandardError.ReadToEndAsync()
  $total = 0.0
  if ($null -ne $m.duration) { $total = [double]$m.duration }
  $last = -1
  while ($null -ne ($line = $p.StandardOutput.ReadLine())) {
    if ($total -gt 0 -and $line -match '^out_time_us=(\d+)') {
      $pct = [int][math]::Floor(100 * ([double]$Matches[1] / 1000000) / $total)
      if ($pct -gt 99) { $pct = 99 }
      if ($pct -gt $last) { $last = $pct; Send-Msg ([ordered]@{ type = 'progress'; job = $job; req = $req; ratio = $pct / 100 }) }
    }
  }
  $p.WaitForExit()
  $err = $errTask.Result
  if ($p.ExitCode -ne 0 -or -not (Test-Path $out) -or (Get-Item $out).Length -eq 0) {
    Remove-Item $out -ErrorAction SilentlyContinue
    if ($err.Length -gt 400) { $err = $err.Substring($err.Length - 400) }
    Send-Fail ("ffmpeg failed ($($p.ExitCode)): " + $err) $ids
    return
  }
  $bytes = [IO.File]::ReadAllBytes($out)
  $chunks = [int][math]::Ceiling($bytes.Length / $ChunkBytes)
  Send-Msg ([ordered]@{ type = 'result'; job = $job; req = $req; size = $bytes.Length; chunks = $chunks })
  for ($seq = 0; $seq -lt $chunks; $seq++) {
    $off = $seq * $ChunkBytes
    $len = [math]::Min($ChunkBytes, $bytes.Length - $off)
    $b64 = [Convert]::ToBase64String($bytes, $off, $len)
    Send-Raw ('{"type":"result-chunk","job":"' + $job + '","req":' + $req + ',"seq":' + $seq + ',"data":"' + $b64 + '"}')
  }
  Remove-Item $out -ErrorAction SilentlyContinue
  Send-Msg ([ordered]@{ type = 'result-end'; job = $job; req = $req })
}

try {
  while ($true) {
    $head = Read-Exact 4
    if ($null -eq $head) { break }
    $len = [BitConverter]::ToInt32($head, 0)
    $bodyBytes = Read-Exact $len
    if ($null -eq $bodyBytes) { break }
    $body = $utf8.GetString($bodyBytes)

    # Chunk messages (~700KB) are parsed with regex: faster and avoids JSON size limits in PowerShell 5.1.
    if ($body -match '"type"\s*:\s*"chunk"') {
      $job = if ($body -match '"job"\s*:\s*"([A-Za-z0-9_-]{1,64})"') { $Matches[1] } else { $null }
      $seq = if ($body -match '"seq"\s*:\s*(\d{1,9})') { [int]$Matches[1] } else { $null }
      $data = if ($body -match '"data"\s*:\s*"([A-Za-z0-9+/=]*)"') { $Matches[1] } else { $null }
      if (-not $job -or -not $jobs.ContainsKey($job) -or -not $jobs[$job].fs -or $null -eq $data) { Send-Fail 'job not open' @{ job = $job }; continue }
      $raw = [Convert]::FromBase64String($data)
      $jobs[$job].fs.Write($raw, 0, $raw.Length)
      $jobs[$job].bytes += $raw.Length
      Send-Msg ([ordered]@{ type = 'chunk-ok'; job = $job; seq = $seq })
      continue
    }

    try { $m = $body | ConvertFrom-Json } catch { Send-Fail 'bad message' $null; continue }
    switch ([string]$m.type) {
      'ping' {
        $ff = Find-Ffmpeg
        Send-Msg ([ordered]@{ type = 'pong'; host = 'powershell'; hostVersion = $HostVersion; psVersion = $PSVersionTable.PSVersion.ToString(); ffmpeg = $ff; ffmpegVersion = (Get-FfmpegVersion $ff) })
      }
      'begin' {
        if (-not (Test-Job $m.job)) { Send-Fail 'bad job' $null; break }
        $path = Join-Path $workdir ($m.job + '.in')
        $jobs[$m.job] = @{ path = $path; fs = [IO.File]::Open($path, 'Create', 'Write'); bytes = 0 }
        Send-Msg ([ordered]@{ type = 'begin-ok'; job = $m.job })
      }
      'end' {
        $j = if (Test-Job $m.job) { $jobs[$m.job] } else { $null }
        if (-not $j -or -not $j.fs) { Send-Fail 'job not open' @{ job = $m.job }; break }
        $j.fs.Close(); $j.fs = $null
        Send-Msg ([ordered]@{ type = 'end-ok'; job = $m.job; bytes = $j.bytes })
      }
      'encode' { Invoke-Encode $m }
      'release' {
        if ((Test-Job $m.job) -and $jobs.ContainsKey($m.job)) {
          if ($jobs[$m.job].fs) { $jobs[$m.job].fs.Close() }
          Remove-Item $jobs[$m.job].path -ErrorAction SilentlyContinue
          $jobs.Remove($m.job)
        }
        Send-Msg ([ordered]@{ type = 'release-ok'; job = $m.job })
      }
      default { Send-Fail 'unknown type' $null }
    }
  }
} finally {
  foreach ($j in $jobs.Values) { if ($j.fs) { $j.fs.Close() } }
  Remove-Item -Recurse -Force $workdir -ErrorAction SilentlyContinue
}
