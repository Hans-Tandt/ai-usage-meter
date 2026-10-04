# Claude Usage Meter - installer (run through Install.cmd).
# Copies the app to %LOCALAPPDATA%\ClaudeUsageMeter, registers the Claude Code add-on in
# ~/.claude/settings.json, adds Start menu and login shortcuts, and starts the strip.
# Keep this file ASCII-only: Windows PowerShell 5.1 misreads UTF-8 without a BOM.

param([switch]$NoShortcuts, [switch]$NoStart, [switch]$NoStop)   # used only for testing

$ErrorActionPreference = 'Stop'
$AppName   = 'Claude Usage Meter'
$Src       = $PSScriptRoot
$Dest      = Join-Path $env:LOCALAPPDATA 'ClaudeUsageMeter'
$PluginDir = Join-Path $Dest 'plugin'
$Exe       = Join-Path $Dest 'ClaudeUsageMeter.exe'
$Settings  = Join-Path $env:USERPROFILE '.claude\settings.json'
$Utf8      = New-Object Text.UTF8Encoding($false)

Write-Host "Installing $AppName..."

# 1. Stop a running copy, then copy the files.
if (-not $NoStop) {
    Get-Process ClaudeUsageMeter -ErrorAction SilentlyContinue | Stop-Process -Force
    Start-Sleep -Milliseconds 500
}
New-Item -ItemType Directory -Force $Dest | Out-Null
Copy-Item -Force (Join-Path $Src 'ClaudeUsageMeter.exe') $Exe
if (Test-Path $PluginDir) { Remove-Item -Recurse -Force $PluginDir }
Copy-Item -Recurse -Force (Join-Path $Src 'plugin') $PluginDir
Copy-Item -Force (Join-Path $Src 'uninstall.ps1') (Join-Path $Dest 'uninstall.ps1')
Write-Host "  Files copied to $Dest"

# 2. Register the add-on with Claude Code (CLAUDE_CODE_PLUGIN_DIRS in ~/.claude/settings.json).
New-Item -ItemType Directory -Force (Split-Path $Settings) | Out-Null
if (Test-Path $Settings) {
    Copy-Item -Force $Settings "$Settings.bak-usage-meter"
    $raw = [IO.File]::ReadAllText($Settings)
    $cfg = if ($raw.Trim()) { $raw | ConvertFrom-Json } else { New-Object PSObject }
} else {
    $cfg = New-Object PSObject
}
if (-not $cfg.PSObject.Properties['env']) { $cfg | Add-Member -NotePropertyName env -NotePropertyValue (New-Object PSObject) }
$dirs = @()
if ($cfg.env.PSObject.Properties['CLAUDE_CODE_PLUGIN_DIRS'] -and $cfg.env.CLAUDE_CODE_PLUGIN_DIRS) {
    $dirs = @($cfg.env.CLAUDE_CODE_PLUGIN_DIRS -split ';' | Where-Object { $_ })
}
if ($dirs -notcontains $PluginDir) { $dirs += $PluginDir }
$cfg.env | Add-Member -Force -NotePropertyName CLAUDE_CODE_PLUGIN_DIRS -NotePropertyValue ($dirs -join ';')
[IO.File]::WriteAllText($Settings, ($cfg | ConvertTo-Json -Depth 100), $Utf8)
Write-Host "  Claude Code add-on registered in $Settings"

# 3. Shortcuts: Start menu and start at login.
if (-not $NoShortcuts) {
    $sh = New-Object -ComObject WScript.Shell
    foreach ($folder in 'Programs', 'Startup') {
        $lnk = $sh.CreateShortcut((Join-Path ([Environment]::GetFolderPath($folder)) "$AppName.lnk"))
        $lnk.TargetPath = $Exe
        $lnk.WorkingDirectory = $Dest
        $lnk.IconLocation = "$Exe,0"
        $lnk.Description = $AppName
        $lnk.Save()
    }
    Write-Host "  Shortcuts added to the Start menu and to start at login"
}

# 4. Start it.
if (-not $NoStart) { Start-Process $Exe }

Write-Host ""
Write-Host "Done. Open (or restart) the Claude desktop app and start a Claude Code session;"
Write-Host "the strip at the top of your screen fills in after Claude's first reply."
