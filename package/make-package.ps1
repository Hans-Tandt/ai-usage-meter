# Builds dist\ClaudeUsageMeter-<version>.zip: the exe, the Claude Code add-on, the installer and the source.
# Keep this file ASCII-only: Windows PowerShell 5.1 misreads UTF-8 without a BOM.

$ErrorActionPreference = 'Stop'
$Root    = Split-Path $PSScriptRoot
$Version = ([regex]::Match((Get-Content (Join-Path $Root 'overlay\src\ClaudeUsageMeter.cs') -Raw), 'Version = "([^"]+)"')).Groups[1].Value
$Name    = "ClaudeUsageMeter-$Version"
$Dist    = Join-Path $Root 'dist'
$Stage   = Join-Path $Dist $Name
$Zip     = Join-Path $Dist "$Name.zip"

if (Test-Path $Stage) { Remove-Item -Recurse -Force $Stage }
if (Test-Path $Zip) { Remove-Item -Force $Zip }
$App = Join-Path $Stage 'app'
New-Item -ItemType Directory -Force $App | Out-Null

# Compile straight into the package (the copy in overlay\ may be running and locked).
& (Join-Path $Root 'overlay\build.ps1') -Out (Join-Path $App 'ClaudeUsageMeter.exe')

function Copy-Plugin($to) {
    foreach ($p in '.claude-plugin\plugin.json', 'hooks\hooks.json', 'hooks\register.tsx', 'types\index.d.ts') {
        $d = Join-Path $to $p
        New-Item -ItemType Directory -Force (Split-Path $d) | Out-Null
        Copy-Item (Join-Path $Root $p) $d
    }
}

# What the installer needs
Copy-Item (Join-Path $PSScriptRoot 'install.ps1'), (Join-Path $PSScriptRoot 'uninstall.ps1') $App
Copy-Plugin (Join-Path $App 'plugin')

# What the person double-clicks and reads
Copy-Item (Join-Path $PSScriptRoot 'Install.cmd'), (Join-Path $PSScriptRoot 'Uninstall.cmd'), (Join-Path $PSScriptRoot 'README.txt') $Stage
Copy-Item (Join-Path $Root 'LICENSE') (Join-Path $Stage 'LICENSE.txt')
Copy-Item -Recurse (Join-Path $Root 'Screenshot') (Join-Path $Stage 'screenshots')

# The source code
$SrcOut = Join-Path $Stage 'source'
Copy-Plugin $SrcOut
foreach ($p in 'overlay\src\ClaudeUsageMeter.cs', 'overlay\src\app.ico', 'overlay\build.ps1', 'README.md', 'LICENSE',
               'package\install.ps1', 'package\uninstall.ps1', 'package\Install.cmd', 'package\Uninstall.cmd',
               'package\README.txt', 'package\make-package.ps1') {
    $d = Join-Path $SrcOut $p
    New-Item -ItemType Directory -Force (Split-Path $d) | Out-Null
    Copy-Item (Join-Path $Root $p) $d
}

Compress-Archive -Path $Stage -DestinationPath $Zip
"Built $Zip"
