# Claude Usage Meter - always-on-top strip showing Claude's 5-hour and weekly usage.
# Reads the file the usage-meter Claude Code plugin writes.
# Drag to move. Right-click (on the strip or the tray icon) for the menu.
# Keep this file ASCII-only: Windows PowerShell 5.1 misreads UTF-8 without a BOM.

Add-Type -AssemblyName PresentationFramework, System.Windows.Forms, System.Drawing

$AppName      = 'Claude Usage Meter'
$Version      = '1.1'
$Author       = 'Hans Tandt'
$Here         = $PSScriptRoot
$DataFile     = Join-Path $env:USERPROFILE '.claude\usage-meter.json'
$SettingsFile = Join-Path $env:USERPROFILE '.claude\usage-meter-settings.json'
$StartupLnk   = Join-Path ([Environment]::GetFolderPath('Startup')) "$AppName.lnk"
$Labels       = @{ five_hour = '5h'; seven_day = 'Week'; spend_limit = 'Spend' }
$Dot          = [char]0x00B7

# Single instance
$mutex = New-Object System.Threading.Mutex($false, 'Local\ClaudeUsageMeterOverlay')
if (-not $mutex.WaitOne(0)) { exit }

# ---------- settings ----------

$Defaults = [ordered]@{
    warn1 = 80; warn2 = 95; notify = $true
    colorOk = '#3FB950'; colorWarn = '#F0883E'; colorDanger = '#F85149'
}

function Load-Settings {
    $s = [ordered]@{}
    foreach ($k in $Defaults.Keys) { $s[$k] = $Defaults[$k] }
    if (Test-Path $SettingsFile) {
        try {
            $j = Get-Content $SettingsFile -Raw | ConvertFrom-Json
            foreach ($k in $Defaults.Keys) { if ($null -ne $j.$k) { $s[$k] = $j.$k } }
        } catch {}
    }
    $s
}

function Save-Settings($s) {
    $dir = Split-Path $SettingsFile
    if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Force $dir | Out-Null }
    [IO.File]::WriteAllText($SettingsFile, ($s | ConvertTo-Json), (New-Object Text.UTF8Encoding($false)))
}

$script:S = Load-Settings

function Brush($hex) { [System.Windows.Media.BrushConverter]::new().ConvertFromString($hex) }
$Track = Brush '#3A3A3A'; $Dim = Brush '#9A9A9A'; $White = Brush '#EDEDED'

function ColorFor($pct) {
    if ($pct -ge $script:S.warn2) { Brush $script:S.colorDanger }
    elseif ($pct -ge $script:S.warn1) { Brush $script:S.colorWarn }
    else { Brush $script:S.colorOk }
}

# ---------- start at login (a shortcut in the Startup folder) ----------

function New-Launcher($path) {
    $sh = New-Object -ComObject WScript.Shell
    $l = $sh.CreateShortcut($path)
    $l.TargetPath = "$env:WINDIR\System32\WindowsPowerShell\v1.0\powershell.exe"
    $l.Arguments = '-NoProfile -STA -WindowStyle Hidden -File "' + (Join-Path $Here 'strip.ps1') + '"'
    $l.WorkingDirectory = $Here
    $l.WindowStyle = 7   # minimised, so no console flashes up
    $l.Description = $AppName
    $l.Save()
}
function Test-Autostart { Test-Path $StartupLnk }
function Set-Autostart($on) {
    if ($on) { New-Launcher $StartupLnk } elseif (Test-Path $StartupLnk) { Remove-Item $StartupLnk -Force }
}

# ---------- strip window ----------

function ResetIn($iso) {
    if (-not $iso) { return '' }
    $mins = [Math]::Max(0, [int](([DateTimeOffset]::Parse($iso) - [DateTimeOffset]::Now).TotalMinutes))
    if ($mins -ge 1440) { return '{0}d {1}h' -f [Math]::Floor($mins / 1440), [Math]::Floor(($mins % 1440) / 60) }
    if ($mins -ge 60)   { return '{0}h {1}m' -f [Math]::Floor($mins / 60), ($mins % 60) }
    return "${mins}m"
}

$win = New-Object System.Windows.Window -Property @{
    WindowStyle = 'None'; AllowsTransparency = $true; Background = [System.Windows.Media.Brushes]::Transparent
    Topmost = $true; ShowInTaskbar = $false; SizeToContent = 'WidthAndHeight'; ResizeMode = 'NoResize'
    Title = $AppName
}
$border = New-Object System.Windows.Controls.Border -Property @{
    Background = (Brush '#E61E1E1E'); CornerRadius = 8; Padding = '12,5,12,5'
    BorderThickness = 1; BorderBrush = (Brush '#444444'); ToolTip = 'Right-click for menu'
}
$row = New-Object System.Windows.Controls.StackPanel -Property @{ Orientation = 'Horizontal' }
$border.Child = $row
$win.Content = $border

function Snap-Top {
    $wa = [System.Windows.SystemParameters]::WorkArea
    $win.Left = $wa.Left + ($wa.Width - $win.ActualWidth) / 2
    $win.Top  = $wa.Top + 4
}

function Add-Text($text, $brush, $bold = $false) {
    $tb = New-Object System.Windows.Controls.TextBlock -Property @{
        Text = $text; Foreground = $brush; FontSize = 13; VerticalAlignment = 'Center'
        FontFamily = 'Segoe UI'; Margin = '0,0,6,0'
    }
    if ($bold) { $tb.FontWeight = 'Bold' }
    [void]$row.Children.Add($tb)
}

function Add-Bar($pct, $brush) {
    $g = New-Object System.Windows.Controls.Grid -Property @{ Width = 110; Height = 8; VerticalAlignment = 'Center'; Margin = '0,0,6,0' }
    [void]$g.Children.Add((New-Object System.Windows.Shapes.Rectangle -Property @{ Fill = $Track; RadiusX = 4; RadiusY = 4 }))
    [void]$g.Children.Add((New-Object System.Windows.Shapes.Rectangle -Property @{
        Fill = $brush; RadiusX = 4; RadiusY = 4; HorizontalAlignment = 'Left'
        Width = [Math]::Max(0, [Math]::Min(110, 110 * $pct / 100))
    }))
    [void]$row.Children.Add($g)
}

$tray = New-Object System.Windows.Forms.NotifyIcon -Property @{
    Icon = [System.Drawing.SystemIcons]::Information; Visible = $true; Text = $AppName
}

$script:warned = @{}
$script:silent = $true   # first pass seeds warning state without notifications

function Refresh {
    $row.Children.Clear()
    $raw = $null
    if (Test-Path $DataFile) { try { $raw = Get-Content $DataFile -Raw -ErrorAction Stop } catch {} }
    if (-not $raw) { Add-Text 'Claude usage: open a Claude Code session to start' $Dim; return }

    $data = $raw | ConvertFrom-Json
    $first = $true
    foreach ($w in $data.windows) {
        if (-not $first) { Add-Text '   ' $Dim }
        $first = $false
        $pct   = [double]$w.percentUsed
        $label = if ($Labels.ContainsKey($w.kind)) { $Labels[$w.kind] } else { $w.kind }
        $c     = ColorFor $pct
        Add-Text $label $White
        Add-Bar $pct $c
        Add-Text ('{0}%' -f $pct) $c ($pct -ge $script:S.warn2)
        $r = ResetIn $w.resetsAt
        if ($r) { Add-Text "$Dot $r" $Dim }

        # Notify once per threshold crossing; re-arms when usage drops back below it.
        $hit = @($script:S.warn1, $script:S.warn2) | Where-Object { $pct -ge $_ } | Select-Object -Last 1
        if (-not $hit) { $hit = 0 }
        $before = if ($script:warned.ContainsKey($w.kind)) { $script:warned[$w.kind] } else { 0 }
        if ($hit -gt $before -and -not $script:silent -and $script:S.notify) {
            $tray.ShowBalloonTip(5000, $AppName, "$label usage at $pct%", 'Warning')
        }
        $script:warned[$w.kind] = $hit
    }
    if (@($data.windows).Count -eq 0) { Add-Text 'Claude usage: waiting for first reply' $Dim }
}

# ---------- settings window ----------

function Show-Settings {
    $cur = Load-Settings
    $d = New-Object System.Windows.Window -Property @{
        Title = "$AppName - Settings"; SizeToContent = 'WidthAndHeight'; ResizeMode = 'NoResize'
        WindowStartupLocation = 'CenterScreen'; Topmost = $true
    }
    $grid = New-Object System.Windows.Controls.Grid -Property @{ Margin = '16' }
    foreach ($i in 0..1) { $grid.ColumnDefinitions.Add((New-Object System.Windows.Controls.ColumnDefinition -Property @{ Width = 'Auto' })) }
    foreach ($i in 0..8) { $grid.RowDefinitions.Add((New-Object System.Windows.Controls.RowDefinition -Property @{ Height = 'Auto' })) }

    function Put($el, $r, $c, $span = 1) {
        [System.Windows.Controls.Grid]::SetRow($el, $r); [System.Windows.Controls.Grid]::SetColumn($el, $c)
        [System.Windows.Controls.Grid]::SetColumnSpan($el, $span); [void]$grid.Children.Add($el)
    }
    function Label($t, $r) { Put (New-Object System.Windows.Controls.TextBlock -Property @{ Text = $t; Margin = '0,6,12,6'; VerticalAlignment = 'Center' }) $r 0 }
    function NumBox($v, $r) {
        $b = New-Object System.Windows.Controls.TextBox -Property @{ Text = "$v"; Width = 60; Margin = '0,6,0,6'; HorizontalAlignment = 'Left' }
        Put $b $r 1; $b
    }
    function ColorButton($hex, $r) {
        $b = New-Object System.Windows.Controls.Button -Property @{ Width = 60; Height = 22; Margin = '0,6,0,6'; HorizontalAlignment = 'Left'; Background = (Brush $hex); Tag = $hex; ToolTip = 'Click to choose a colour' }
        $b.Add_Click({
            param($sender)
            $cd = New-Object System.Windows.Forms.ColorDialog -Property @{ FullOpen = $true; Color = [System.Drawing.ColorTranslator]::FromHtml($sender.Tag) }
            if ($cd.ShowDialog() -eq 'OK') {
                $hx = '#{0:X2}{1:X2}{2:X2}' -f $cd.Color.R, $cd.Color.G, $cd.Color.B
                $sender.Tag = $hx; $sender.Background = Brush $hx
            }
        })
        Put $b $r 1; $b
    }

    Label 'First warning at (%)' 0;  $w1 = NumBox $cur.warn1 0
    Label 'Second warning at (%)' 1; $w2 = NumBox $cur.warn2 1
    $nt = New-Object System.Windows.Controls.CheckBox -Property @{ Content = 'Show a Windows notification at each warning'; IsChecked = [bool]$cur.notify; Margin = '0,6,0,6' }
    Put $nt 2 0 2
    Label 'Normal colour' 3;          $c1 = ColorButton $cur.colorOk 3
    Label 'First warning colour' 4;   $c2 = ColorButton $cur.colorWarn 4
    Label 'Second warning colour' 5;  $c3 = ColorButton $cur.colorDanger 5
    $as = New-Object System.Windows.Controls.CheckBox -Property @{ Content = 'Start automatically when I log in to Windows'; IsChecked = (Test-Autostart); Margin = '0,6,0,12' }
    Put $as 6 0 2

    $btns = New-Object System.Windows.Controls.StackPanel -Property @{ Orientation = 'Horizontal'; HorizontalAlignment = 'Right' }
    $reset  = New-Object System.Windows.Controls.Button -Property @{ Content = 'Defaults'; Width = 75; Margin = '0,0,8,0' }
    $ok     = New-Object System.Windows.Controls.Button -Property @{ Content = 'Save'; Width = 75; Margin = '0,0,8,0'; IsDefault = $true }
    $cancel = New-Object System.Windows.Controls.Button -Property @{ Content = 'Cancel'; Width = 75; IsCancel = $true }
    [void]$btns.Children.Add($reset); [void]$btns.Children.Add($ok); [void]$btns.Children.Add($cancel)
    Put $btns 7 0 2

    $reset.Add_Click({
        $w1.Text = "$($Defaults.warn1)"; $w2.Text = "$($Defaults.warn2)"; $nt.IsChecked = $true
        foreach ($p in @(@($c1, $Defaults.colorOk), @($c2, $Defaults.colorWarn), @($c3, $Defaults.colorDanger))) { $p[0].Tag = $p[1]; $p[0].Background = Brush $p[1] }
    })
    $ok.Add_Click({
        $a = 0; $b = 0
        if (-not ([int]::TryParse($w1.Text, [ref]$a) -and [int]::TryParse($w2.Text, [ref]$b)) -or $a -lt 1 -or $b -gt 100 -or $a -ge $b) {
            [System.Windows.MessageBox]::Show($d, 'Warnings must be whole numbers from 1 to 100, and the first must be lower than the second.', $AppName) | Out-Null
            return
        }
        $new = [ordered]@{ warn1 = $a; warn2 = $b; notify = [bool]$nt.IsChecked; colorOk = $c1.Tag; colorWarn = $c2.Tag; colorDanger = $c3.Tag }
        Save-Settings $new
        $script:S = $new
        Set-Autostart ([bool]$as.IsChecked)
        $script:warned = @{}; $script:silent = $true; Refresh; $script:silent = $false
        $d.Close()
    })

    $d.Content = $grid
    [void]$d.ShowDialog()
}

function Show-About {
    $msg = "$AppName  -  version $Version`n`nMade by $Author`n`nShows your Claude 5-hour and weekly usage on top of your screen, with colours and warnings as you approach your limits.`n`nFigures update while a Claude Code session is open."
    [System.Windows.MessageBox]::Show($msg, "About $AppName", 'OK', 'Information') | Out-Null
}

function Quit { $win.Close() }

# ---------- menus (strip right-click and tray icon) ----------

function New-MenuItem($header, $action) {
    $m = New-Object System.Windows.Controls.MenuItem -Property @{ Header = $header }
    $m.Add_Click($action); $m
}
$menu = New-Object System.Windows.Controls.ContextMenu
[void]$menu.Items.Add((New-MenuItem 'Settings...' { Show-Settings }))
[void]$menu.Items.Add((New-MenuItem 'Move to top centre' { Snap-Top }))
[void]$menu.Items.Add((New-MenuItem 'About' { Show-About }))
[void]$menu.Items.Add((New-Object System.Windows.Controls.Separator))
[void]$menu.Items.Add((New-MenuItem 'Close Claude Usage Meter' { Quit }))
$border.ContextMenu = $menu

$trayMenu = New-Object System.Windows.Forms.ContextMenuStrip
[void]$trayMenu.Items.Add('Settings...', $null, { Show-Settings })
[void]$trayMenu.Items.Add('Move to top centre', $null, { $win.Show(); Snap-Top })
[void]$trayMenu.Items.Add('About', $null, { Show-About })
[void]$trayMenu.Items.Add('-')
[void]$trayMenu.Items.Add('Close Claude Usage Meter', $null, { Quit })
$tray.ContextMenuStrip = $trayMenu
$tray.Add_DoubleClick({ $win.Show(); Snap-Top })

$win.Add_MouseLeftButtonDown({ param($s, $e) $win.DragMove() })
$win.Add_ContentRendered({ if (-not $script:placed) { Snap-Top; $script:placed = $true } })
$win.Add_Closed({ $tray.Visible = $false; $tray.Dispose(); $mutex.ReleaseMutex() })

Refresh
$script:silent = $false

$timer = New-Object System.Windows.Threading.DispatcherTimer -Property @{ Interval = [TimeSpan]::FromSeconds(3) }
$timer.Add_Tick({ Refresh })
$timer.Start()

[void]$win.ShowDialog()
