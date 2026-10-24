# VideoToGIF local renderer - Windows Native Messaging host (Windows PowerShell 5.1 built-in, no install).
# Same protocol as host.pl: 4-byte little-endian length + UTF-8 JSON. Host -> Chrome max 1MB per message, so results are chunked.
# Security: never accepts a command string. Only validated numbers (width/fps/colors/trim) are turned into ffmpeg arguments here.
# Keep this file ASCII-only: Windows PowerShell 5.1 reads BOM-less scripts in the system ANSI code page.
$ErrorActionPreference = 'Stop'
$HostVersion = '1.30'
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

# v1.10 'audio' command (AIMaster music programs): format conversion + optional loudness normalization (loudnorm, 2 passes).
# Only validated words/numbers are used: format in mp3|aac|flac|wav, bitrate 96..320 kbps, sampleRate 44100|48000,
# lufs 6..30 (target = -lufs LUFS), tp 0..3 (true peak = -tp dBTP), duration (for progress only).
function Get-LoudJson([string]$text) {
  $ms = [regex]::Matches($text, '\{[^{}]*"input_i"[^{}]*\}')
  if ($ms.Count -eq 0) { return $null }
  try { return ($ms[$ms.Count - 1].Value | ConvertFrom-Json) } catch { return $null }
}
function Invoke-Ff([string]$ffmpeg, $ffArgs, [double]$total, $ids, [double]$from, [double]$span) {
  $psi = New-Object System.Diagnostics.ProcessStartInfo
  $psi.FileName = $ffmpeg
  $psi.Arguments = ($ffArgs | ForEach-Object { if ($_ -match '[\s"]') { '"' + ($_ -replace '"', '\"') + '"' } else { $_ } }) -join ' '
  $psi.UseShellExecute = $false
  $psi.RedirectStandardOutput = $true
  $psi.RedirectStandardError = $true
  $psi.CreateNoWindow = $true
  $p = [System.Diagnostics.Process]::Start($psi)
  $errTask = $p.StandardError.ReadToEndAsync()
  $last = -1
  while ($null -ne ($line = $p.StandardOutput.ReadLine())) {
    if ($total -gt 0 -and $line -match '^out_time_us=(\d+)') {
      $r = [math]::Min(1.0, ([double]$Matches[1] / 1000000) / $total)
      $pct = [int][math]::Floor(100 * ($from + $span * $r))
      if ($pct -gt 99) { $pct = 99 }
      if ($pct -gt $last) { $last = $pct; Send-Msg ([ordered]@{ type = 'progress'; job = $ids.job; req = $ids.req; ratio = $pct / 100 }) }
    }
  }
  $p.WaitForExit()
  return @{ code = $p.ExitCode; err = $errTask.Result }
}
function Send-File([string]$out, $ids, $extra) {
  $bytes = [IO.File]::ReadAllBytes($out)
  $chunks = [int][math]::Ceiling($bytes.Length / $ChunkBytes)
  $res = [ordered]@{ type = 'result'; job = $ids.job; req = $ids.req; size = $bytes.Length; chunks = $chunks }
  if ($extra) { foreach ($k in $extra.Keys) { $res[$k] = $extra[$k] } }
  Send-Msg $res
  for ($seq = 0; $seq -lt $chunks; $seq++) {
    $off = $seq * $ChunkBytes
    $len = [math]::Min($ChunkBytes, $bytes.Length - $off)
    $b64 = [Convert]::ToBase64String($bytes, $off, $len)
    Send-Raw ('{"type":"result-chunk","job":"' + $ids.job + '","req":' + $ids.req + ',"seq":' + $seq + ',"data":"' + $b64 + '"}')
  }
  Remove-Item $out -ErrorAction SilentlyContinue
  Send-Msg ([ordered]@{ type = 'result-end'; job = $ids.job; req = $ids.req })
}
function Invoke-Audio($m) {
  $job = $m.job
  $req = 0
  if ([string]$m.req -match '^\d{1,9}$') { $req = [int]$m.req }
  $ids = [ordered]@{ job = $job; req = $req }
  if (-not (Test-Job $job) -or -not $jobs.ContainsKey($job) -or $jobs[$job].fs) { Send-Fail 'job unknown' $ids; return }
  $formats = @{ mp3 = @('libmp3lame', 'mp3', $true); aac = @('aac', 'm4a', $true); flac = @('flac', 'flac', $false); wav = @('pcm_s24le', 'wav', $false) }
  $fmt = [string]$m.format
  $ok = $formats.ContainsKey($fmt) -and (Test-Num $m.sampleRate 44100 48000 $true) -and (([int]$m.sampleRate -eq 44100) -or ([int]$m.sampleRate -eq 48000)) `
    -and ((-not $formats[$fmt][2]) -or (Test-Num $m.bitrate 96 320 $true)) `
    -and (($null -eq $m.lufs) -or (Test-Num $m.lufs 6 30 $false)) -and (($null -eq $m.tp) -or (Test-Num $m.tp 0 3 $false)) `
    -and (($null -eq $m.duration) -or (Test-Num $m.duration 0.05 36000 $false))
  if (-not $ok) { Send-Fail 'bad params' $ids; return }
  $ffmpeg = Find-Ffmpeg
  if (-not $ffmpeg) { $ids['code'] = 'NO_FFMPEG'; Send-Fail 'ffmpeg not found' $ids; return }
  $total = 0.0
  if ($null -ne $m.duration) { $total = [double]$m.duration }
  $in = $jobs[$job].path
  $I = if ($null -ne $m.lufs) { '-' + (Fmt $m.lufs) } else { '-14' }
  $TP = if ($null -ne $m.tp) { '-' + (Fmt $m.tp) } else { '-1' }
  $norm = ($null -ne $m.lufs)

  # Pass 1: measure (always - reports the input loudness)
  $base = @('-hide_banner', '-nostdin', '-nostats', '-progress', 'pipe:1', '-y')
  $r1 = Invoke-Ff $ffmpeg ($base + @('-i', $in, '-af', "loudnorm=I=$($I):TP=$($TP):LRA=11:print_format=json", '-f', 'null', 'NUL')) $total $ids 0 0.4
  $meas = Get-LoudJson $r1.err
  if ($r1.code -ne 0 -or -not $meas) {
    $e = $r1.err; if ($e.Length -gt 400) { $e = $e.Substring($e.Length - 400) }
    Send-Fail ("ffmpeg measure failed ($($r1.code)): " + $e) $ids; return
  }
  # Pass 2: encode (with linear loudnorm using the measured values when requested)
  $out = Join-Path $workdir ("$job-$req." + $formats[$fmt][1])
  $a2 = $base + @('-i', $in, '-vn', '-map_metadata', '-1')
  if ($norm) {
    $af = "loudnorm=I=$($I):TP=$($TP):LRA=11:measured_I=$($meas.input_i):measured_TP=$($meas.input_tp):measured_LRA=$($meas.input_lra):measured_thresh=$($meas.input_thresh):offset=$($meas.target_offset):linear=true:print_format=json"
    $a2 += @('-af', $af)
  }
  $a2 += @('-ar', [string][int]$m.sampleRate, '-c:a', $formats[$fmt][0])
  if ($formats[$fmt][2]) { $a2 += @('-b:a', ([string][int]$m.bitrate + 'k')) }
  $a2 += @($out)
  $r2 = Invoke-Ff $ffmpeg $a2 $total $ids 0.4 0.6
  if ($r2.code -ne 0 -or -not (Test-Path $out) -or (Get-Item $out).Length -eq 0) {
    Remove-Item $out -ErrorAction SilentlyContinue
    $e = $r2.err; if ($e.Length -gt 400) { $e = $e.Substring($e.Length - 400) }
    Send-Fail ("ffmpeg failed ($($r2.code)): " + $e) $ids; return
  }
  $after = if ($norm) { Get-LoudJson $r2.err } else { $null }
  $extra = [ordered]@{ ext = $formats[$fmt][1]; inputI = [string]$meas.input_i; inputTP = [string]$meas.input_tp; inputLRA = [string]$meas.input_lra }
  if ($after) { $extra['outputI'] = [string]$after.output_i; $extra['outputTP'] = [string]$after.output_tp; $extra['outputLRA'] = [string]$after.output_lra }
  Send-File $out $ids $extra
}

# v1.20 'loop' command (AIMaster video programs, infinite-loop-video): seamless loop unit + repeat.
# Same rules as infinite-loop-video src/lib/loop/plan.ts normalize()/buildFilter()/encodeArgs() - keep them in sync.
# Only validated words/numbers: mode smart|overlap|bounce, format mp4|webm|gif, start/end 0..36000 s,
# crossfade 0..2 s, repeat 1..200, duration (source length) 0.1..36000 s. Audio is detected here from ffmpeg -i output.
function Clamp([double]$v, [double]$lo, [double]$hi) { return [math]::Min($hi, [math]::Max($lo, $v)) }
function F3([double]$v) { return $v.ToString('0.000', [Globalization.CultureInfo]::InvariantCulture) }
function Invoke-Loop($m) {
  $job = $m.job
  $req = 0
  if ([string]$m.req -match '^\d{1,9}$') { $req = [int]$m.req }
  $ids = [ordered]@{ job = $job; req = $req }
  if (-not (Test-Job $job) -or -not $jobs.ContainsKey($job) -or $jobs[$job].fs) { Send-Fail 'job unknown' $ids; return }
  $mode = [string]$m.mode
  $fmt = [string]$m.format
  $ok = (@('smart', 'overlap', 'bounce') -contains $mode) -and (@('mp4', 'webm', 'gif') -contains $fmt) `
    -and (Test-Num $m.start 0 36000 $false) -and (Test-Num $m.end 0 36000 $false) -and (Test-Num $m.crossfade 0 2 $false) `
    -and (Test-Num $m.repeat 1 200 $true) -and (Test-Num $m.duration 0.1 36000 $false)
  if (-not $ok) { Send-Fail 'bad params' $ids; return }
  $ffmpeg = Find-Ffmpeg
  if (-not $ffmpeg) { $ids['code'] = 'NO_FFMPEG'; Send-Fail 'ffmpeg not found' $ids; return }

  # normalize (plan.ts)
  $dur = [math]::Max(0.1, [double]$m.duration)
  $s = Clamp ([double]$m.start) 0 $dur
  $e = Clamp ([double]$m.end) 0 $dur
  if ($mode -eq 'overlap') { $s = 0.0; $e = $dur }
  if ($e - $s -lt 0.1) { $e = [math]::Min($dur, $s + 0.1) }
  if ($e - $s -lt 0.1) { $s = [math]::Max(0.0, $e - 0.1) }
  $len = $e - $s
  $cf = if ($mode -eq 'overlap') { 1.0 } else { Clamp ([double]$m.crossfade) 0.1 2 }
  if ($mode -eq 'bounce') { $cf = 0.0 }
  $cf = [math]::Min($cf, [math]::Max(0.0, $len / 2 - 0.01))
  $cf = [math]::Round($cf, 3)
  $repeat = [int]$m.repeat
  $unitLen = if ($mode -eq 'bounce') { $len * 2 } else { $len - $cf }

  # audio track? (Chrome cannot tell; read it from the file)
  $in = $jobs[$job].path
  $probe = Invoke-Ff $ffmpeg @('-hide_banner', '-nostdin', '-i', $in) 0 $ids 0 0
  $hasAudio = ($fmt -ne 'gif') -and ($probe.err -match 'Stream #\d+:\d+(?:\[[^\]\r\n]*\])?(?:\([^)\r\n]*\))?: Audio:')

  # filter (plan.ts buildFilter)
  $tS = F3 $s; $tE = F3 $e; $tCF = F3 $cf
  $map = @('-map', '[vout]')
  if ($mode -eq 'bounce') {
    $fl = "[0:v]trim=$($tS):$($tE),setpts=PTS-STARTPTS,split[v1][v2];[v2]reverse[vr];[v1][vr]concat=n=2:v=1:a=0[vout]"
    if ($hasAudio) { $fl += ";[0:a]atrim=$($tS):$($tE),asetpts=PTS-STARTPTS,asplit[a1][a2];[a2]areverse[ar];[a1][ar]concat=n=2:v=0:a=1[aout]"; $map += @('-map', '[aout]') }
  } elseif ($cf -le 0) {
    $fl = "[0:v]trim=$($tS):$($tE),setpts=PTS-STARTPTS[vout]"
    if ($hasAudio) { $fl += ";[0:a]atrim=$($tS):$($tE),asetpts=PTS-STARTPTS[aout]"; $map += @('-map', '[aout]') }
  } else {
    $mid = $e - $s - 2 * $cf
    $tT0 = F3 ($e - $cf); $tH1 = F3 ($s + $cf)
    $parts = @("[0:v]trim=$($tT0):$($tE),setpts=PTS-STARTPTS[tail]", "[0:v]trim=$($tS):$($tH1),setpts=PTS-STARTPTS[head]", "[tail][head]xfade=transition=fade:duration=$($tCF):offset=0[blend]")
    $vcat = '[blend]'; $vn = 1
    if ($mid -gt 0.001) { $parts += "[0:v]trim=$($tH1):$($tT0),setpts=PTS-STARTPTS[mid]"; $vcat = '[blend][mid]'; $vn = 2 }
    $parts += "$($vcat)concat=n=$($vn):v=1:a=0[vout]"
    if ($hasAudio) {
      $parts += @("[0:a]atrim=$($tT0):$($tE),asetpts=PTS-STARTPTS[atail]", "[0:a]atrim=$($tS):$($tH1),asetpts=PTS-STARTPTS[ahead]", "[atail][ahead]acrossfade=d=$($tCF)[ablend]")
      $acat = '[ablend]'; $an = 1
      if ($mid -gt 0.001) { $parts += "[0:a]atrim=$($tH1):$($tT0),asetpts=PTS-STARTPTS[amid]"; $acat = '[ablend][amid]'; $an = 2 }
      $parts += "$($acat)concat=n=$($an):v=0:a=1[aout]"
      $map += @('-map', '[aout]')
    }
    $fl = $parts -join ';'
  }

  # encode (plan.ts encodeArgs) - gif makes an mp4 unit first
  $unitExt = if ($fmt -eq 'webm') { 'webm' } else { 'mp4' }
  $aud = $hasAudio -and ($fmt -ne 'gif')
  if ($unitExt -eq 'webm') { $enc = @('-c:v', 'libvpx', '-b:v', '2M', '-crf', '10'); if ($aud) { $enc += @('-c:a', 'libvorbis') } else { $enc += '-an' } }
  else { $enc = @('-c:v', 'libx264', '-preset', 'veryfast', '-crf', '23', '-pix_fmt', 'yuv420p'); if ($aud) { $enc += @('-c:a', 'aac', '-b:a', '128k') } else { $enc += '-an' } }
  $base = @('-hide_banner', '-nostdin', '-loglevel', 'error', '-nostats', '-progress', 'pipe:1', '-y')
  $unit = Join-Path $workdir ("$job-$req-unit.$unitExt")
  $span1 = if ($fmt -eq 'gif') { 0.7 } elseif ($repeat -gt 1) { 0.9 } else { 1.0 }
  $r1 = Invoke-Ff $ffmpeg ($base + @('-i', $in, '-filter_complex', $fl) + $map + $enc + @($unit)) $unitLen $ids 0 $span1
  if ($r1.code -ne 0 -or -not (Test-Path $unit) -or (Get-Item $unit).Length -eq 0) {
    Remove-Item $unit -ErrorAction SilentlyContinue
    $err = $r1.err; if ($err.Length -gt 400) { $err = $err.Substring($err.Length - 400) }
    Send-Fail ("ffmpeg loop failed ($($r1.code)): " + $err) $ids; return
  }
  $out = $unit
  if ($fmt -eq 'gif') {
    $out = Join-Path $workdir ("$job-$req.gif")
    $r2 = Invoke-Ff $ffmpeg ($base + @('-i', $unit, '-vf', "fps=15,scale='min(480,iw)':-2:flags=lanczos,split[a][b];[a]palettegen[pl];[b][pl]paletteuse", '-loop', '0', $out)) $unitLen $ids 0.7 0.3
    Remove-Item $unit -ErrorAction SilentlyContinue
    if ($r2.code -ne 0 -or -not (Test-Path $out)) { Remove-Item $out -ErrorAction SilentlyContinue; Send-Fail ("ffmpeg gif failed ($($r2.code))") $ids; return }
  } elseif ($repeat -gt 1) {
    $out = Join-Path $workdir ("$job-$req.$unitExt")
    $r2 = Invoke-Ff $ffmpeg ($base + @('-stream_loop', [string]($repeat - 1), '-i', $unit, '-c', 'copy', $out)) 0 $ids 0.9 0.1
    Remove-Item $unit -ErrorAction SilentlyContinue
    if ($r2.code -ne 0 -or -not (Test-Path $out)) { Remove-Item $out -ErrorAction SilentlyContinue; Send-Fail ("ffmpeg repeat failed ($($r2.code))") $ids; return }
  }
  $ext = if ($fmt -eq 'gif') { 'gif' } else { $unitExt }
  Send-File $out $ids ([ordered]@{ ext = $ext; hasAudio = [bool]$aud; unitSeconds = [math]::Round($unitLen, 3); filter = $fl })
}

# v1.30 'normalize' / 'compress' commands (AIMaster video programs, ai-video-studio edit).
# normalize: H.264 yuv420p, constant fps, even size, long side <= maxSide, AAC 48k stereo if the file has audio, faststart.
#   values: fps 24..60 (int), maxSide 360..3840 (int), duration 0.05..36000 (progress only).
# compress: H.264 re-encode with quality word high|balanced|small (crf 20/23/27), optional maxSide 360..3840, AAC 128k if audio, faststart.
function Test-HasAudio([string]$ffmpeg, [string]$in, $ids) {
  $probe = Invoke-Ff $ffmpeg @('-hide_banner', '-nostdin', '-i', $in) 0 $ids 0 0
  return [bool]($probe.err -match 'Stream #\d+:\d+(?:\[[^\]\r\n]*\])?(?:\([^)\r\n]*\))?: Audio:')
}
function Get-ScaleFilter([int]$maxSide) {
  return "scale='if(gt(iw,ih),trunc(min($($maxSide),iw)/2)*2,-2)':'if(gt(iw,ih),-2,trunc(min($($maxSide),ih)/2)*2)':flags=lanczos,setsar=1"
}
function Get-Ids($m) {
  $req = 0
  if ([string]$m.req -match '^\d{1,9}$') { $req = [int]$m.req }
  return [ordered]@{ job = $m.job; req = $req }
}
function Invoke-Normalize($m) {
  $ids = Get-Ids $m
  $job = $m.job
  if (-not (Test-Job $job) -or -not $jobs.ContainsKey($job) -or $jobs[$job].fs) { Send-Fail 'job unknown' $ids; return }
  $ok = (Test-Num $m.fps 24 60 $true) -and (Test-Num $m.maxSide 360 3840 $true) -and (($null -eq $m.duration) -or (Test-Num $m.duration 0.05 36000 $false))
  if (-not $ok) { Send-Fail 'bad params' $ids; return }
  $ffmpeg = Find-Ffmpeg
  if (-not $ffmpeg) { $ids['code'] = 'NO_FFMPEG'; Send-Fail 'ffmpeg not found' $ids; return }
  $in = $jobs[$job].path
  $aud = Test-HasAudio $ffmpeg $in $ids
  $fpsN = [int]$m.fps
  $vf = "fps=$($fpsN)," + (Get-ScaleFilter ([int]$m.maxSide)) + ",format=yuv420p"
  $total = 0.0; if ($null -ne $m.duration) { $total = [double]$m.duration }
  $out = Join-Path $workdir ("$job-$($ids.req)-norm.mp4")
  $a = @('-hide_banner', '-nostdin', '-loglevel', 'error', '-nostats', '-progress', 'pipe:1', '-y', '-i', $in, '-map', '0:v:0')
  if ($aud) { $a += @('-map', '0:a:0') }
  $a += @('-vf', $vf, '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '20', '-pix_fmt', 'yuv420p', '-g', [string]($fpsN * 2))
  if ($aud) { $a += @('-c:a', 'aac', '-b:a', '160k', '-ar', '48000', '-ac', '2') } else { $a += '-an' }
  $a += @('-movflags', '+faststart', $out)
  $r = Invoke-Ff $ffmpeg $a $total $ids 0 1
  if ($r.code -ne 0 -or -not (Test-Path $out) -or (Get-Item $out).Length -eq 0) {
    Remove-Item $out -ErrorAction SilentlyContinue
    $err = $r.err; if ($err.Length -gt 400) { $err = $err.Substring($err.Length - 400) }
    Send-Fail ("ffmpeg normalize failed ($($r.code)): " + $err) $ids; return
  }
  Send-File $out $ids ([ordered]@{ ext = 'mp4'; hasAudio = $aud })
}
function Invoke-Compress($m) {
  $ids = Get-Ids $m
  $job = $m.job
  if (-not (Test-Job $job) -or -not $jobs.ContainsKey($job) -or $jobs[$job].fs) { Send-Fail 'job unknown' $ids; return }
  $crfs = @{ high = '20'; balanced = '23'; small = '27' }
  $q = [string]$m.quality
  $ok = $crfs.ContainsKey($q) -and (($null -eq $m.maxSide) -or (Test-Num $m.maxSide 360 3840 $true)) -and (($null -eq $m.duration) -or (Test-Num $m.duration 0.05 36000 $false))
  if (-not $ok) { Send-Fail 'bad params' $ids; return }
  $ffmpeg = Find-Ffmpeg
  if (-not $ffmpeg) { $ids['code'] = 'NO_FFMPEG'; Send-Fail 'ffmpeg not found' $ids; return }
  $in = $jobs[$job].path
  $inSize = (Get-Item $in).Length
  $aud = Test-HasAudio $ffmpeg $in $ids
  $total = 0.0; if ($null -ne $m.duration) { $total = [double]$m.duration }
  $out = Join-Path $workdir ("$job-$($ids.req)-small.mp4")
  $a = @('-hide_banner', '-nostdin', '-loglevel', 'error', '-nostats', '-progress', 'pipe:1', '-y', '-i', $in, '-map', '0:v:0')
  if ($aud) { $a += @('-map', '0:a:0') }
  $vf = 'format=yuv420p'
  if ($null -ne $m.maxSide) { $vf = (Get-ScaleFilter ([int]$m.maxSide)) + ',format=yuv420p' }
  $a += @('-vf', $vf, '-c:v', 'libx264', '-preset', 'medium', '-crf', $crfs[$q], '-pix_fmt', 'yuv420p')
  if ($aud) { $a += @('-c:a', 'aac', '-b:a', '128k') } else { $a += '-an' }
  $a += @('-movflags', '+faststart', $out)
  $r = Invoke-Ff $ffmpeg $a $total $ids 0 1
  if ($r.code -ne 0 -or -not (Test-Path $out) -or (Get-Item $out).Length -eq 0) {
    Remove-Item $out -ErrorAction SilentlyContinue
    $err = $r.err; if ($err.Length -gt 400) { $err = $err.Substring($err.Length - 400) }
    Send-Fail ("ffmpeg compress failed ($($r.code)): " + $err) $ids; return
  }
  Send-File $out $ids ([ordered]@{ ext = 'mp4'; hasAudio = $aud; inSize = $inSize })
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
        Send-Msg ([ordered]@{ type = 'pong'; host = 'powershell'; hostVersion = $HostVersion; psVersion = $PSVersionTable.PSVersion.ToString(); ffmpeg = $ff; ffmpegVersion = (Get-FfmpegVersion $ff); capabilities = @('gif', 'audio', 'loop', 'normalize', 'compress') })
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
      'audio' { Invoke-Audio $m }
      'loop' { Invoke-Loop $m }
      'normalize' { Invoke-Normalize $m }
      'compress' { Invoke-Compress $m }
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
