# =====================================================================
# 패키지 설치마법사 (Windows PowerShell) — AIMaster 배포 키트 공용 템플릿
# 원본: AIMaster scripts/kit-template/setup.ps1 (포장 때 각 프로그램 KIT/ 로 복사됨 — 프로그램별 차이는 KIT/kit.json)
# 지침: AIMaster docs/DISTRIBUTION_KIT_GUIDE.md §2-2(패키지 설치마법사 표준)
# 실행: 프로그램 폴더의 「패키지설치마법사.cmd」 더블클릭 (또는 powershell -ExecutionPolicy Bypass -File KIT\setup.ps1)
# 하는 일(8단계): ① Node.js ② Supabase 프로젝트 ③ Supabase 키(확인) ④ DB 파일 실행(자동 복사·확인) ⑤ 이메일 확인 끄기
#   업데이트 모드: 예전 설치 폴더를 찾으면(또는 경로 입력) .env.local·.vercel 을 가져와 ②③⑤⑥을 건너뛰고 ④는 확인만, ⑦⑧로 다시 올림
#                 ⑥ 사이트 설정 ⑦ 설치·빌드 ⑧ Vercel 배포(주소 자동 확인) → 설치결과.txt
# 필요한 화면은 마법사가 브라우저로 열어 주고, 붙여 넣을 내용은 클립보드에 복사해 둡니다. 중간에 멈춰도 다시 실행하면 이어서 합니다.
# 비밀번호·키는 이 컴퓨터의 .env.local 과 본인 Vercel 프로젝트에만 저장됩니다. 키는 입력할 때 화면에 보이지 않습니다.
# =====================================================================
$ErrorActionPreference = "Stop"
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
try { [Console]::OutputEncoding = [System.Text.Encoding]::UTF8 } catch { }
$ProgramDir = Split-Path $PSScriptRoot -Parent
Set-Location $ProgramDir
$KitInfo = Get-Content (Join-Path $PSScriptRoot "kit.json") -Raw -Encoding UTF8 | ConvertFrom-Json
$EnvFile = Join-Path $ProgramDir ".env.local"
$ProgressFile = Join-Path $ProgramDir ".kit-progress"
$Total = 8

function Say($text) { Write-Host $text -ForegroundColor Cyan }
function Ok($text) { Write-Host "  [OK] $text" -ForegroundColor Green }
function Warn($text) { Write-Host "  [주의] $text" -ForegroundColor Yellow }
function Step($n, $text) { Write-Host ""; Write-Host "──────── [$n/$Total] $text ────────" -ForegroundColor Magenta }
function Ask($question, $default) {
  if ($default) { $answer = Read-Host "  $question [$default]" } else { $answer = Read-Host "  $question" }
  if ([string]::IsNullOrWhiteSpace($answer)) { return $default }
  return $answer.Trim()
}
function AskSecret($question) {
  $secure = Read-Host "  $question (붙여넣기는 마우스 오른쪽 클릭 — 화면에 안 보여도 들어갑니다)" -AsSecureString
  $ptr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
  try { $plain = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr) } finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr) }
  return $plain.Trim()
}
function WaitEnter($text) { Read-Host "  $text — 끝나면 Enter" | Out-Null }
function OpenUrl($url) { try { Start-Process $url } catch { Warn "브라우저를 열지 못했습니다. 이 주소를 직접 여세요: $url" } }
function Copy-Text($text) { try { Set-Clipboard -Value $text; return $true } catch { return $false } }
function HttpStatus($url, $headers) {
  # Supabase는 브라우저처럼 보이는 요청(기본 User-Agent에 Mozilla 포함)의 Secret key를 거부한다(401) → 요청 표시를 바꾼다(2026-10-19 확인)
  try { return [int](Invoke-WebRequest -Uri $url -Headers $headers -UserAgent "aimaster-kit-setup" -UseBasicParsing -TimeoutSec 20).StatusCode }
  catch { if ($_.Exception.Response) { return [int]$_.Exception.Response.StatusCode } return 0 }
}
function KeyHeaders($key) { $h = @{ apikey = $key }; if ($key.StartsWith("eyJ")) { $h["Authorization"] = "Bearer $key" }; return $h }
function JwtRole($key) {
  if (-not $key.StartsWith("eyJ")) { return "" }
  try { $p = $key.Split(".")[1].Replace("-", "+").Replace("_", "/"); while ($p.Length % 4) { $p += "=" }
        return ([Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($p)) | ConvertFrom-Json).role } catch { return "" }
}
# 진행 기록(.kit-progress: 끝난 단계 번호 — 비밀값 없음)
function Done($n) { return (Test-Path $ProgressFile) -and ((Get-Content $ProgressFile -Encoding UTF8) -contains "step$n") }
function MarkDone($n) { Add-Content -Path $ProgressFile -Value "step$n" -Encoding UTF8 }
# .env.local 읽기/쓰기(한 줄씩 갱신)
function EnvGet($name) { if (-not (Test-Path $EnvFile)) { return "" }; $line = Get-Content $EnvFile -Encoding UTF8 | Where-Object { $_ -like "$name=*" } | Select-Object -First 1; if ($line) { return $line.Substring($name.Length + 1) } return "" }
function EnvSet($name, $value) {
  $lines = @(); if (Test-Path $EnvFile) { $lines = @(Get-Content $EnvFile -Encoding UTF8 | Where-Object { $_ -notlike "$name=*" }) }
  else { $lines = @("# $($KitInfo.title) — 독립 운영 설정 (패키지 설치마법사가 만든 파일, 절대 공개·커밋 금지)", "NEXT_PUBLIC_STANDALONE_MODE=true") }
  $lines += "$name=$value"
  [System.IO.File]::WriteAllLines($EnvFile, $lines, (New-Object System.Text.UTF8Encoding $false))
}
function Native([scriptblock]$block) { $prev = $ErrorActionPreference; $ErrorActionPreference = "Continue"; try { & $block } finally { $ErrorActionPreference = $prev } }

Clear-Host
Say "╔══════════════════════════════════════════════╗"
Say "   $($KitInfo.title) — 패키지 설치마법사"
Say "╚══════════════════════════════════════════════╝"
Say "질문에 답만 하면 됩니다. 필요한 화면은 마법사가 브라우저로 열어 드립니다."
Say "중간에 창을 닫아도 「패키지설치마법사」을 다시 실행하면 이어서 진행합니다."
Say "폴더: $ProgramDir"
if (Test-Path (Join-Path $ProgramDir ".git")) { Warn "이 폴더가 Git 저장소입니다. 저장소 밖(예: D:\work\$($KitInfo.shortName))에 압축을 풀어 쓰는 것을 권장합니다." }
# 업데이트 모드(2026-10-20): 예전에 설치한 내 사이트에 새 배포판 코드만 다시 올린다 — Supabase·키·DB·사이트 설정 단계는 건너뜀
$UpdateMode = $false
function Is-Installed($dir) {
  $f = Join-Path $dir ".env.local"
  return (Test-Path -LiteralPath $f) -and [bool](Select-String -LiteralPath $f -Pattern "^VERCEL_PROJECT_NAME=." -Quiet)
}
function Same-Program($dir) {
  $k = Join-Path $dir "KIT\kit.json"
  if (-not (Test-Path -LiteralPath $k)) { return $false }
  try { return ((Get-Content -LiteralPath $k -Raw -Encoding UTF8 | ConvertFrom-Json).shortName -eq $KitInfo.shortName) } catch { return $false }
}
function Find-OldInstall {
  $parent = Split-Path $ProgramDir -Parent
  $grand = if ($parent) { Split-Path $parent -Parent } else { $null }
  $dirs = @()
  foreach ($r in @($parent, $grand)) { if ($r) { $dirs += @(Get-ChildItem -LiteralPath $r -Directory -ErrorAction SilentlyContinue) } }
  if ($grand) { foreach ($d in @(Get-ChildItem -LiteralPath $grand -Directory -ErrorAction SilentlyContinue)) { $dirs += @(Get-ChildItem -LiteralPath $d.FullName -Directory -ErrorAction SilentlyContinue) } }
  return $dirs | ForEach-Object { $_.FullName } | Where-Object { $_ -ne $ProgramDir -and (Same-Program $_) -and (Is-Installed $_) } |
    Sort-Object { (Get-Item -LiteralPath (Join-Path $_ ".env.local")).LastWriteTime } -Descending | Select-Object -First 1
}
function Start-Update($from) {
  Copy-Item -LiteralPath (Join-Path $from ".env.local") -Destination $EnvFile -Force
  $vercelDir = Join-Path $from ".vercel"
  if (Test-Path -LiteralPath $vercelDir) { Copy-Item -LiteralPath $vercelDir -Destination $ProgramDir -Recurse -Force }
  if (Test-Path $ProgressFile) { Remove-Item $ProgressFile -Force }
  foreach ($n in 2, 3, 5, 6) { MarkDone $n }
  Ok "예전 설정(.env.local·Vercel 연결)을 가져왔습니다: $from"
}

if ((Is-Installed $ProgramDir) -and (Done 8)) {
  $upd = Ask "이 폴더는 설치를 마친 폴더입니다. 지금 코드로 내 사이트를 다시 올릴까요? (y=업데이트 / n=처음부터 다시 설치)" "y"
  if ($upd -eq "y") { $UpdateMode = $true; Remove-Item $ProgressFile -Force; foreach ($n in 2, 3, 5, 6) { MarkDone $n } }
  else { Remove-Item $ProgressFile -Force }
} elseif (Test-Path $ProgressFile) {
  $again = Ask "지난번에 하던 설치가 있습니다. 이어서 할까요? (y=이어서 / n=처음부터)" "y"
  if ($again -ne "y") { Remove-Item $ProgressFile -Force }
} elseif (-not (Test-Path $EnvFile)) {
  $old = Find-OldInstall
  if ($old) {
    Say ""
    Say "  예전에 설치한 같은 프로그램을 찾았습니다: $old"
    $upd = Ask "새 버전으로 업데이트할까요? 예전 사이트·DB·키를 그대로 쓰고 새 코드만 다시 올립니다 (y=업데이트 / n=새로 설치)" "y"
    if ($upd -eq "y") { Start-Update $old; $UpdateMode = $true }
  } else {
    $path = Ask "예전에 이 프로그램을 설치한 적이 있으면 그 프로그램 폴더 경로를 붙여 넣으세요(업데이트 — 처음 설치면 그냥 Enter)" ""
    $path = $path.Trim().Trim('"')
    if ($path) {
      if ((Test-Path -LiteralPath $path) -and (Is-Installed $path)) { Start-Update $path; $UpdateMode = $true }
      else { Warn "그 폴더에서 설치 기록(.env.local)을 찾지 못했습니다. 처음 설치로 진행합니다." }
    }
  }
}
if ($UpdateMode) {
  Say "  [업데이트 모드] Supabase·키·DB·사이트 설정은 그대로 두고, 설치·빌드 → 같은 Vercel 프로젝트에 다시 올리기만 합니다."
  Say "  DB(SQL) 작업이 필요한 업데이트인지 KIT\README.md 맨 아래 「업데이트 내역」을 먼저 확인하세요."
}

# ① Node.js
Step 1 "Node.js 확인"
try { $nodeVersion = (node -v) } catch { $nodeVersion = $null }
$major = if ($nodeVersion) { [int]($nodeVersion.TrimStart("v").Split(".")[0]) } else { 0 }
if ($major -lt 20) {
  Warn "Node.js 22 LTS가 필요합니다$(if ($nodeVersion) { " (지금 $nodeVersion)" })."
  if (Get-Command winget -ErrorAction SilentlyContinue) {
    $auto = Ask "지금 자동으로 설치할까요? (y/n)" "y"
    if ($auto -eq "y") { Native { winget install --id OpenJS.NodeJS.LTS -e --accept-source-agreements --accept-package-agreements } }
    else { OpenUrl "https://nodejs.org/ko/download" }
  } else { OpenUrl "https://nodejs.org/ko/download" }
  Say "설치가 끝나면 이 창을 닫고 「패키지설치마법사.cmd」를 다시 더블클릭하세요(새 창에서 Node.js가 인식됩니다)."
  Read-Host "  Enter를 누르면 닫힙니다" | Out-Null
  exit 1
}
Ok "Node.js $nodeVersion"

# ② Supabase 프로젝트
Step 2 "Supabase(DB) 프로젝트 만들기"
$sbUrl = EnvGet "NEXT_PUBLIC_SUPABASE_URL"
if (-not (Done 2) -or -not $sbUrl) {
  Say "  브라우저에서 Supabase 새 프로젝트 화면을 엽니다(처음이면 GitHub 또는 이메일로 무료 가입)."
  Say "  · Project name: 아무 이름 · Database Password: [Generate] 후 메모장에 저장 · Region: Northeast Asia (Seoul)"
  Say "  · [Create new project] → 1~2분 기다리면 프로젝트 화면이 열립니다."
  OpenUrl "https://supabase.com/dashboard/new"
  while ($true) {
    $raw = Ask "프로젝트 화면의 브라우저 주소창 주소를 복사해 붙여 넣으세요(또는 Project URL https://xxxx.supabase.co)" ""
    if ($raw -match "supabase\.com/dashboard/project/([a-z0-9]{20})") { $ref = $Matches[1] }
    elseif ($raw -match "https?://([a-z0-9]{20})\.supabase\.co") { $ref = $Matches[1] }
    else { Warn "주소에서 프로젝트 ID(영문·숫자 20자)를 찾지 못했습니다. 프로젝트 화면 주소를 그대로 붙여 넣어 주세요."; continue }
    $sbUrl = "https://$ref.supabase.co"
    if ((HttpStatus "$sbUrl/auth/v1/health" @{}) -in @(200, 401)) { break }
    Warn "$sbUrl 에 연결되지 않습니다. 프로젝트가 아직 만들어지는 중이면 1분 뒤 다시 붙여 넣으세요."
  }
  EnvSet "NEXT_PUBLIC_SUPABASE_URL" $sbUrl
  MarkDone 2
}
$ref = ([Uri]$sbUrl).Host.Split(".")[0]
Ok "Supabase 프로젝트: $sbUrl"

# ③ Supabase 키
Step 3 "Supabase 키 등록(마법사가 맞는 키인지 확인합니다)"
if (-not (Done 3) -or -not (EnvGet "SUPABASE_SERVICE_ROLE_KEY")) {
  Say "  API Keys 화면을 엽니다. 「Publishable key」와 「Secret key」(없으면 Legacy 탭의 anon / service_role)를 복사해 넣으세요."
  OpenUrl "https://supabase.com/dashboard/project/$ref/settings/api-keys"
  while ($true) {
    $anon = AskSecret "① Publishable key (또는 anon public)"
    if ((JwtRole $anon) -eq "service_role" -or $anon.StartsWith("sb_secret_")) { Warn "이것은 Secret key입니다. ①에는 Publishable(공개) 키를 넣어 주세요."; continue }
    if ((HttpStatus "$sbUrl/auth/v1/settings" (KeyHeaders $anon)) -eq 200) { break }
    Warn "이 프로젝트의 키가 아닌 것 같습니다. 다시 복사해 주세요."
  }
  Ok "Publishable key 확인"
  while ($true) {
    $service = AskSecret "② Secret key (또는 service_role — 절대 공개 금지)"
    $role = JwtRole $service
    if (-not ($service.StartsWith("sb_secret_") -or $role -eq "service_role")) { Warn "Secret key(sb_secret_…) 또는 service_role 키를 넣어 주세요(①과 다른 키입니다)."; continue }
    $code = HttpStatus "$sbUrl/rest/v1/" (KeyHeaders $service)
    if ($code -ne 401 -and $code -ne 403 -and $code -ne 0) { break }
    Warn "이 프로젝트의 Secret key가 아닌 것 같습니다(응답 $code). 다시 복사해 주세요."
  }
  EnvSet "NEXT_PUBLIC_SUPABASE_ANON_KEY" $anon
  EnvSet "SUPABASE_SERVICE_ROLE_KEY" $service
  MarkDone 3
}
$serviceKey = EnvGet "SUPABASE_SERVICE_ROLE_KEY"
Ok "Supabase 키 저장(.env.local)"

# ④ DB 파일 실행
Step 4 "DB 만들기(설치 SQL 실행)"
$checkTable = if ($KitInfo.checkTable) { $KitInfo.checkTable } else { "profiles" }
$tableUrl = "$sbUrl/rest/v1/$($checkTable)?select=*&limit=1"
$upgradeFiles = @(Get-ChildItem -Path (Join-Path $PSScriptRoot "upgrade-*.sql") -ErrorAction SilentlyContinue | ForEach-Object { "KIT\$($_.Name)" })
if ((HttpStatus $tableUrl (KeyHeaders $serviceKey)) -eq 200) {
  Ok "DB가 이미 준비돼 있습니다($checkTable 확인)"
  if ($UpdateMode -and $upgradeFiles.Count -gt 0) { Say "  업데이트용 SQL: $($upgradeFiles -join ', ') — 「업데이트 내역」에 실행하라고 적힌 것만 SQL Editor에서 한 번 실행하세요(없으면 넘어가세요)." }
}
elseif ($UpdateMode) {
  # 기존 DB에는 설치 SQL 전체를 다시 돌리지 않는다 — 업데이트 내역의 SQL만 안내
  Warn "기존 DB에서 $checkTable 표를 찾지 못했습니다. 이번 버전은 DB 변경이 필요할 수 있습니다."
  Say "  KIT\README.md 맨 아래 「업데이트 내역」에 적힌 SQL$(if ($upgradeFiles.Count -gt 0) { "($($upgradeFiles -join ', '))" })을 SQL Editor에서 실행하세요."
  OpenUrl "https://supabase.com/dashboard/project/$ref/sql/new"
  while ($true) {
    WaitEnter "업데이트 SQL을 실행했나요?"
    if ((HttpStatus $tableUrl (KeyHeaders $serviceKey)) -eq 200) { Ok "DB 확인($checkTable)"; break }
    Warn "아직 $checkTable 표가 보이지 않습니다. 예전 설치와 같은 Supabase 프로젝트인지, SQL에 빨간 오류가 없는지 확인해 주세요."
  }
}
else {
  $sql = Get-Content (Join-Path $PSScriptRoot "schema.sql") -Raw -Encoding UTF8
  while ($true) {
    if (Copy-Text $sql) { Ok "설치 SQL을 클립보드에 복사했습니다." } else { Warn "자동 복사에 실패했습니다. KIT\schema.sql 을 메모장으로 열어 전체 복사(Ctrl+A, Ctrl+C)하세요." }
    Say "  SQL Editor를 엽니다 → 빈 칸을 클릭하고 Ctrl+V → 오른쪽 아래 [Run] → 'Success' 확인"
    Say "  ('destructive operation' 확인 창이 뜨면 [Run this query] 를 누르세요)"
    OpenUrl "https://supabase.com/dashboard/project/$ref/sql/new"
    WaitEnter "Run 을 눌렀나요?"
    if ((HttpStatus $tableUrl (KeyHeaders $serviceKey)) -eq 200) { Ok "DB 만들기 확인($checkTable)"; break }
    Warn "아직 DB가 만들어지지 않았습니다. 빨간 오류가 보이면 그 문장을 메모해 두고, 한 번 더 붙여 넣고 Run 해 주세요."
  }
}
MarkDone 4

# ⑤ 이메일 확인 끄기
Step 5 "회원가입 이메일 확인 끄기(내 사이트에 바로 가입되도록)"
if (-not (Done 5)) {
  Say "  Sign In / Providers 화면을 엽니다 → Email 항목 → 「Confirm email」 끄기 → [Save]"
  OpenUrl "https://supabase.com/dashboard/project/$ref/auth/providers"
  WaitEnter "Confirm email 을 끄고 저장했나요?"
  MarkDone 5
}
Ok "이메일 확인 설정"

# ⑥ 사이트 설정
Step 6 "내 사이트 설정"
if (-not (Done 6) -or -not (EnvGet "VERCEL_PROJECT_NAME")) {
  do { $project = Ask "사이트 이름(영문 소문자·숫자·-, 주소가 됩니다: https://이름.vercel.app)" "my-$($KitInfo.shortName)-$(Get-Random -Minimum 100 -Maximum 999)" }
  until ($project -match "^[a-z0-9][a-z0-9-]{1,48}[a-z0-9]$")
  $brand = Ask "화면에 표시할 내 이름/브랜드(예: 홍길동 마케팅, 비우면 표시 안 함)" ""
  EnvSet "VERCEL_PROJECT_NAME" $project
  EnvSet "NEXT_PUBLIC_SITE_URL" "https://$project.vercel.app"
  EnvSet "NEXT_PUBLIC_BRAND_NAME" $brand
  if (-not (EnvGet "CRON_SECRET")) { $bytes = New-Object byte[] 24; [System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes); EnvSet "CRON_SECRET" (-join ($bytes | ForEach-Object { $_.ToString("x2") })) }
  foreach ($item in $KitInfo.extraEnv) {
    if ($item.from -eq "brand") { $value = $brand } elseif ($item.from -eq "siteUrl") { $value = "https://$project.vercel.app" }
    elseif ($item.secret) { $value = AskSecret $item.question } else { $value = Ask $item.question $item.default }
    if (-not [string]::IsNullOrWhiteSpace($value)) { EnvSet $item.name $value }
  }
  MarkDone 6
}
Ok "설정 저장(.env.local)"

# ⑦ 설치·빌드
Step 7 "프로그램 설치·빌드(처음에는 3~5분 걸립니다)"
if (-not (Done 7)) {
  Native { npm install --no-fund --no-audit }
  if ($LASTEXITCODE -ne 0) { Warn "패키지 설치 실패. 인터넷 연결을 확인하고 다시 실행하세요."; Read-Host "  Enter" | Out-Null; exit 1 }
  Native { npm run build }
  if ($LASTEXITCODE -ne 0) { Warn "빌드 실패. 위 오류와 KIT\README.md 의 '자주 막히는 곳'을 확인하세요."; Read-Host "  Enter" | Out-Null; exit 1 }
  MarkDone 7
}
Ok "설치·빌드 완료"

# ⑧ Vercel 배포
Step 8 "인터넷에 올리기(Vercel 배포)"
$project = EnvGet "VERCEL_PROJECT_NAME"
Say "  브라우저가 열리면 본인 Vercel 계정으로 로그인하세요(처음이면 무료 Hobby로 가입, 이미 로그인돼 있으면 넘어갑니다)."
Native { npx --yes vercel@latest login }
Native { npx --yes vercel@latest link --yes --project $project }
if ($LASTEXITCODE -ne 0) { Warn "Vercel 프로젝트 연결 실패. 6단계 이름을 바꾸려면 .kit-progress 파일을 지우고 다시 실행하세요."; Read-Host "  Enter" | Out-Null; exit 1 }
# 폴더가 GitHub 저장소 안이면 Vercel이 그 저장소를 자동 연결해 엉뚱한 코드가 배포될 수 있다(2026-10-19 리허설) → 연결 해제
Native { npx --yes vercel@latest git disconnect --yes *> $null }
function Push-Env($name) { $v = EnvGet $name; if ([string]::IsNullOrWhiteSpace($v)) { return }; Native { $v | npx --yes vercel@latest env add $name production --force *> $null }; Ok "환경변수 $name" }
$envNames = @("NEXT_PUBLIC_STANDALONE_MODE","NEXT_PUBLIC_SITE_URL","NEXT_PUBLIC_BRAND_NAME","NEXT_PUBLIC_SUPABASE_URL","NEXT_PUBLIC_SUPABASE_ANON_KEY","SUPABASE_SERVICE_ROLE_KEY","CRON_SECRET")
if ($KitInfo.extraEnv) { $envNames += @($KitInfo.extraEnv | ForEach-Object { $_.name }) }
foreach ($k in $envNames) { Push-Env $k }

function Deploy { $out = Native { npx --yes vercel@latest deploy --prod --yes 2>&1 | ForEach-Object { "$_" } }; $out | ForEach-Object { Write-Host "  $_" }; return ($out -join "`n") }
$log = Deploy
# 실제 사이트 주소 자동 확인: 이번 배포의 별칭(alias) 중 가장 짧은 *.vercel.app
$deployUrl = ([regex]::Matches($log, "https://[a-z0-9.-]+\.vercel\.app") | ForEach-Object { $_.Value } | Select-Object -Last 1)
$siteUrl = EnvGet "NEXT_PUBLIC_SITE_URL"
if ($deployUrl) {
  $inspect = Native { npx --yes vercel@latest inspect $deployUrl 2>&1 | ForEach-Object { "$_" } }
  $alias = [regex]::Matches(($inspect -join "`n"), "https://[a-z0-9.-]+\.vercel\.app") | ForEach-Object { $_.Value } | Where-Object { $_ -ne $deployUrl } | Sort-Object Length | Select-Object -First 1
  if ($alias) { $siteUrl = $alias }
}
if ((HttpStatus $siteUrl @{}) -ne 200) { $siteUrl = Ask "사이트 주소를 확인하지 못했습니다. Vercel → 이 프로젝트 → Domains 의 주소를 넣어 주세요" $siteUrl }
if ($siteUrl -ne (EnvGet "NEXT_PUBLIC_SITE_URL")) {
  Say "  실제 주소($siteUrl)로 설정을 맞추고 한 번 더 올립니다."
  EnvSet "NEXT_PUBLIC_SITE_URL" $siteUrl
  Push-Env "NEXT_PUBLIC_SITE_URL"
  Deploy | Out-Null
}
MarkDone 8

# (선택) Supabase 로그인 주소 설정 — kit.json authRedirectPath 가 있는 프로그램만(예: 이메일 링크·OAuth 로그인 콜백)
if ($KitInfo.authRedirectPath) {
  Say ""
  Say "  [마무리] Supabase 로그인 주소 설정 — URL Configuration 화면을 엽니다."
  Say "  · Site URL 칸: $siteUrl  (클립보드에 복사해 두었습니다 → Ctrl+V)"
  Say "  · Redirect URLs → [Add URL]: $siteUrl$($KitInfo.authRedirectPath)  → [Save]"
  Copy-Text $siteUrl | Out-Null
  OpenUrl "https://supabase.com/dashboard/project/$ref/auth/url-configuration"
  WaitEnter "두 칸을 저장했나요?"
  Copy-Text "$siteUrl$($KitInfo.authRedirectPath)" | Out-Null
}

$callback = if ($KitInfo.callbackPath) { "$siteUrl$($KitInfo.callbackPath)" } else { "" }
$callbackLabel = if ($KitInfo.callbackLabel) { $KitInfo.callbackLabel } else { "플랫폼 앱 콜백 주소" }
$nextStep = if ($KitInfo.nextStep) { $KitInfo.nextStep } else { "KIT\README.md 를 이어서 진행하세요." }
$result = @(
  "$($KitInfo.title) — $(if ($UpdateMode) { '업데이트' } else { '설치' }) 결과 ($(Get-Date -Format 'yyyy-MM-dd HH:mm'))",
  "",
  "내 사이트: $siteUrl",
  $(if ($callback) { "${callbackLabel}: $callback" }),
  "Supabase 프로젝트: https://supabase.com/dashboard/project/$ref",
  "",
  "다음 단계: $nextStep",
  "  1) 내 사이트 /login 에서 회원가입 → 로그인(관리자 지정은 KIT\README.md 참고)",
  "  2) 플랫폼 앱을 만들고 위 콜백 주소를 등록 → 사이트 설정에 키 저장 → 계정 연결",
  "  3) 예약 게시: 사이트 설정 「⏰ 예약 발행」에 cron-job.org 키 등록",
  "",
  "※ 비밀번호·키는 .env.local 과 Vercel에만 있습니다. 이 파일에는 비밀값이 없습니다."
) | Where-Object { $_ -ne $null }
[System.IO.File]::WriteAllLines((Join-Path $ProgramDir "설치결과.txt"), $result, (New-Object System.Text.UTF8Encoding $true))

Write-Host ""
Say "╔══════════════════════════════════════════════╗"
Say "   $(if ($UpdateMode) { '업데이트 완료!' } else { '설치 완료!' })"
Say "╚══════════════════════════════════════════════╝"
Say "내 사이트: $siteUrl"
if ($callback) { if (Copy-Text $callback) { Say "${callbackLabel}(클립보드에 복사됨): $callback" } else { Say "${callbackLabel}: $callback" } }
Say "다음 단계: $nextStep"
Say "이 내용은 프로그램 폴더의 「설치결과.txt」에도 저장했습니다."
OpenUrl $siteUrl
Read-Host "  Enter를 누르면 창을 닫습니다" | Out-Null
