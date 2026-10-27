param([string]$Variant='editorial',[string]$WindowId='2624768',[string[]]$Screens=@('main','detail','guide','settings'))
$ErrorActionPreference='Stop'
$designRoot=Join-Path $PSScriptRoot '../../scratch/blog-neighbor-care-design-20261027'
$captureRoot=Join-Path $designRoot 'captures'
New-Item -ItemType Directory -Path $captureRoot -Force | Out-Null
function Get-ViewState {
  $state=orca computer get-app-state --app msedge --window-id $WindowId --json | ConvertFrom-Json
  if(-not $state.ok){throw ($state.error | ConvertTo-Json -Compress)}
  return $state
}
function Open-ViewLink([string]$Target) {
  $state=Get-ViewState
  $lines=$state.result.snapshot.treeText -split "`n"
  $line=$lines | Where-Object {$_.Contains(', Value: file:/') -and $_.Contains($Target)} | Select-Object -First 1
  if(-not $line){throw "Visible link not found: $Target"}
  if($line -notmatch '^\s*(\d+) '){throw 'Missing native element index'}
  $index=$Matches[1]
  $clicked=orca computer click --app msedge --window-id $WindowId --element-index $index --json | ConvertFrom-Json
  if(-not $clicked.ok){throw ($clicked.error | ConvertTo-Json -Compress)}
  return Get-ViewState
}
$state=Get-ViewState
if(-not $state.result.snapshot.treeText.Contains('Value: D:/Antigravity/AIMaster/scratch/blog-neighbor-care_showcase_12views.html,')){
  $state=Open-ViewLink 'blog-neighbor-care_showcase_12views.html'
}
$records=@()
foreach($screen in $Screens) {
  $file="$Variant-$screen.html"
  $state=Open-ViewLink $file
  if(-not $state.result.snapshot.treeText.Contains($file)){throw 'Expected design page not loaded'}
  if(-not $state.result.screenshot.path){throw 'Screenshot absent'}
  Copy-Item -LiteralPath $state.result.screenshot.path -Destination (Join-Path $captureRoot "$Variant-$screen.png")
  $records+=@{variant=$Variant;screen=$screen;windowId=$WindowId;browser='Microsoft Edge native visible window';width=$state.result.screenshot.width;height=$state.result.screenshot.height;file="$Variant-$screen.png";checkedAt=(Get-Date).ToUniversalTime().ToString('o')}
  Write-Output "Captured $Variant-$screen ($($state.result.screenshot.width)x$($state.result.screenshot.height))"
}
$records | ConvertTo-Json -Depth 5 | Set-Content -Encoding utf8 (Join-Path $captureRoot "$Variant-capture.json")
