# Claude Usage Meter - uninstaller (run through Uninstall.cmd, or from the install folder).
# Keep this file ASCII-only: Windows PowerShell 5.1 misreads UTF-8 without a BOM.

param([switch]$NoShortcuts, [switch]$NoStop)   # used only for testing

$ErrorActionPreference = 'Stop'
$AppName   = 'Claude Usage Meter'
$Dest      = Join-Path $env:LOCALAPPDATA 'ClaudeUsageMeter'
$PluginDir = Join-Path $Dest 'plugin'
$Settings  = Join-Path $env:USERPROFILE '.claude\settings.json'

Write-Host "Removing $AppName..."

if (-not $NoStop) {
    Get-Process ClaudeUsageMeter -ErrorAction SilentlyContinue | Stop-Process -Force
    Start-Sleep -Milliseconds 500
}

if (-not $NoShortcuts) {
    foreach ($folder in 'Programs', 'Startup') {
        $lnk = Join-Path ([Environment]::GetFolderPath($folder)) "$AppName.lnk"
        if (Test-Path $lnk) { Remove-Item -Force $lnk }
    }
    Write-Host "  Shortcuts removed"
}

# Take our folder out of CLAUDE_CODE_PLUGIN_DIRS; leave everything else in settings.json alone.
if (Test-Path $Settings) {
    $cfg = [IO.File]::ReadAllText($Settings) | ConvertFrom-Json
    if ($cfg.PSObject.Properties['env'] -and $cfg.env.PSObject.Properties['CLAUDE_CODE_PLUGIN_DIRS']) {
        $dirs = @($cfg.env.CLAUDE_CODE_PLUGIN_DIRS -split ';' | Where-Object { $_ -and $_ -ne $PluginDir })
        if ($dirs.Count) { $cfg.env.CLAUDE_CODE_PLUGIN_DIRS = $dirs -join ';' }
        else { $cfg.env.PSObject.Properties.Remove('CLAUDE_CODE_PLUGIN_DIRS') }
        if (-not @($cfg.env.PSObject.Properties).Count) { $cfg.PSObject.Properties.Remove('env') }
        [IO.File]::WriteAllText($Settings, ($cfg | ConvertTo-Json -Depth 100), (New-Object Text.UTF8Encoding($false)))
        Write-Host "  Claude Code add-on unregistered"
    }
}

# Remove the app folder (this script may be running from it, so delete from a separate process).
if (Test-Path $Dest) {
    Start-Process cmd.exe -WindowStyle Hidden -ArgumentList '/c', "timeout /t 2 >nul & rmdir /s /q `"$Dest`""
}
foreach ($f in 'usage-meter.json', 'usage-meter-settings.json') {
    $p = Join-Path $env:USERPROFILE ".claude\$f"
    if (Test-Path $p) { Remove-Item -Force $p }
}

Write-Host ""
Write-Host "Done. Restart the Claude desktop app to finish."
