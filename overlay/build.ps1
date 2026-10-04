# Builds overlay\ClaudeUsageMeter.exe with the C# compiler that ships with Windows (.NET Framework 4).
# Keep this file ASCII-only: Windows PowerShell 5.1 misreads UTF-8 without a BOM.

param([string]$Out = (Join-Path $PSScriptRoot 'ClaudeUsageMeter.exe'))

$ErrorActionPreference = 'Stop'
$fw   = "$env:WINDIR\Microsoft.NET\Framework64\v4.0.30319"
$src  = Join-Path $PSScriptRoot 'src'
$out  = $Out
$ico  = Join-Path $src 'app.ico'

# Draw the app icon (a rounded bar in three colours) if it isn't there yet.
if (-not (Test-Path $ico)) {
    Add-Type -AssemblyName System.Drawing
    $bmp = New-Object System.Drawing.Bitmap 64, 64
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = 'AntiAlias'
    $g.Clear([System.Drawing.Color]::Transparent)
    $g.FillEllipse((New-Object System.Drawing.SolidBrush ([System.Drawing.ColorTranslator]::FromHtml('#1E1E1E'))), 0, 0, 63, 63)
    $cols = '#3FB950', '#F0883E', '#F85149'
    for ($i = 0; $i -lt 3; $i++) {
        $h = 14 + 10 * $i
        $g.FillRectangle((New-Object System.Drawing.SolidBrush ([System.Drawing.ColorTranslator]::FromHtml($cols[$i]))), 14 + 13 * $i, 48 - $h, 10, $h)
    }
    $g.Dispose()
    $icon = [System.Drawing.Icon]::FromHandle($bmp.GetHicon())
    $fs = [IO.File]::Create($ico); $icon.Save($fs); $fs.Close()
}

& "$fw\csc.exe" /nologo /target:winexe /optimize+ /out:$out /win32icon:$ico `
    "/r:$fw\WPF\PresentationFramework.dll" "/r:$fw\WPF\PresentationCore.dll" "/r:$fw\WPF\WindowsBase.dll" `
    "/r:$fw\System.Xaml.dll" "/r:$fw\System.Windows.Forms.dll" "/r:$fw\System.Drawing.dll" `
    "/r:$fw\System.Web.Extensions.dll" "/r:$fw\Microsoft.CSharp.dll" "/r:$fw\System.Core.dll" `
    (Join-Path $src 'ClaudeUsageMeter.cs')
if ($LASTEXITCODE -ne 0) { throw "Build failed" }
"Built $out"
