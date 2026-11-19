$ErrorActionPreference = 'Stop'
$taskRoot = Split-Path -Parent $PSScriptRoot
$configPath = Join-Path $taskRoot '.ai/master-wake-config.json'
$receiptPath = Join-Path $taskRoot '.ai/master-wake-status.json'
$config = Get-Content -LiteralPath $configPath -Raw -Encoding UTF8 | ConvertFrom-Json
if (-not $config.enabled) { exit 0 }

function Quote-NativeArgument([string]$Value) {
    if ($Value.Contains([string][char]34) -or $Value.EndsWith([string][char]92)) {
        throw 'unsupported_wake_argument'
    }
    return ([string][char]34) + $Value + ([string][char]34)
}

function Sync-HarnessState {
    $controller = Join-Path $taskRoot 'harness/controller.mjs'
    if (-not (Test-Path -LiteralPath $controller -PathType Leaf)) { return 'controller_missing' }
    $process = New-Object System.Diagnostics.Process
    try {
        $process.StartInfo.FileName = (Get-Command node.exe -CommandType Application -ErrorAction Stop | Select-Object -First 1).Source
        $process.StartInfo.Arguments = (Quote-NativeArgument $controller) + ' sync'
        $process.StartInfo.WorkingDirectory = $taskRoot
        $process.StartInfo.UseShellExecute = $false
        $process.StartInfo.CreateNoWindow = $true
        $process.StartInfo.RedirectStandardOutput = $true
        $process.StartInfo.RedirectStandardError = $true
        [void]$process.Start()
        $stdout = $process.StandardOutput.ReadToEndAsync()
        $stderr = $process.StandardError.ReadToEndAsync()
        if (-not $process.WaitForExit(15000)) {
            $process.Kill()
            return 'timeout'
        }
        if ($process.ExitCode -eq 0) { return 'synced' }
        return 'sync_failed'
    } catch {
        return 'sync_unconfirmed'
    } finally {
        $process.Dispose()
    }
}

$wakeMutex = New-Object System.Threading.Mutex($false, 'Local\AIMaster-Master-30Min-Wake')
$hasMutex = $false
$wakeProcess = $null
$receipt = [ordered]@{
    attemptedAt = [DateTimeOffset]::UtcNow.ToString('o')
    targetRunId = $config.targetRunId
    targetTerminal = $config.targetTerminal
    action = 'harness_sync_and_orchestration_send'
    harnessSync = 'not_run'
    status = 'not_sent'
    messageId = $null
    newAgentCreated = $false
}
try {
    $hasMutex = $wakeMutex.WaitOne(0)
    if (-not $hasMutex) { exit 0 }
    $receipt.harnessSync = Sync-HarnessState
    if (-not (Test-Path -LiteralPath $config.orcaExe -PathType Leaf)) {
        throw 'orca_executable_missing'
    }
    $body = $config.body + ' Harness sync=' + $receipt.harnessSync + '. Read the harness status and checkpoint, reconcile new instructions and Orca receipts with the approved plan. Honor an administrator stop before any dispatch. If sync failed, reconcile with the existing Master records before acting. Record evidence, route independent review, and deliver the next eligible assignment once.'
    $wakeArgs = @('orchestration', 'send', '--from', $config.targetTerminal, '--to', ('run:' + $config.targetRunId),
        '--subject', $config.subject, '--type', 'status', '--body', $body, '--json')
    $startInfo = New-Object System.Diagnostics.ProcessStartInfo
    $startInfo.FileName = $config.orcaExe
    $startInfo.Arguments = ($wakeArgs | ForEach-Object { Quote-NativeArgument $_ }) -join ' '
    $startInfo.WorkingDirectory = $taskRoot
    $startInfo.UseShellExecute = $false
    $startInfo.CreateNoWindow = $true
    $startInfo.RedirectStandardOutput = $true
    $startInfo.RedirectStandardError = $true
    $startInfo.StandardOutputEncoding = [System.Text.Encoding]::UTF8
    $startInfo.StandardErrorEncoding = [System.Text.Encoding]::UTF8
    $wakeProcess = New-Object System.Diagnostics.Process
    $wakeProcess.StartInfo = $startInfo
    [void]$wakeProcess.Start()
    $outputTask = $wakeProcess.StandardOutput.ReadToEndAsync()
    $errorTask = $wakeProcess.StandardError.ReadToEndAsync()
    if (-not $wakeProcess.WaitForExit(45000)) {
        $receipt.status = 'delivery_unknown_timeout'
        $wakeProcess.Kill()
        throw 'wake_send_timeout_no_retry'
    }
    $wakeProcess.WaitForExit()
    $reply = $outputTask.Result | ConvertFrom-Json
    if ($wakeProcess.ExitCode -eq 0 -and $reply.ok -and $reply.result.messageId) {
        $receipt.status = 'message_accepted'
        $receipt.messageId = $reply.result.messageId
    } else {
        $receipt.status = 'send_not_confirmed'
        $receipt.cliExitCode = $wakeProcess.ExitCode
        throw 'wake_send_not_confirmed_no_retry'
    }
} catch {
    $receipt.errorType = $_.Exception.GetType().Name
    if ($receipt.status -eq 'not_sent') { $receipt.status = 'send_failed_or_unconfirmed' }
} finally {
    if ($hasMutex) {
        $receipt.finishedAt = [DateTimeOffset]::UtcNow.ToString('o')
        $receipt | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath $receiptPath -Encoding UTF8
        $wakeMutex.ReleaseMutex()
    }
    if ($wakeProcess) { $wakeProcess.Dispose() }
    $wakeMutex.Dispose()
}
if ($receipt.status -ne 'message_accepted') { exit 1 }
