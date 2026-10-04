# Claude Usage Meter

An always-on-top strip for Windows that shows your Claude 5-hour and weekly usage, turns orange and then red as you approach the limits, and pops up a Windows notification at each warning level.

Made by Hans Tandt.

## How it works

Two parts:

1. **A Claude Code add-on** (`.claude-plugin/`, `hooks/`, `types/`). Claude Code reports the rate-limit windows after each reply; the add-on writes them to `%USERPROFILE%\.claude\usage-meter.json`. It also adds `/usage-demo <percent>` (and `/usage-demo off`) to preview the colours and warnings.
2. **The strip** (`overlay/`). A small WPF program, `ClaudeUsageMeter.exe`, reads that file every 3 seconds and draws the bars. Right-click it for Settings (warning levels, notifications, colours, start at login), About and Close.

The add-on uses Claude Code's function-hook plugins, so it needs a recent Claude desktop app.

## Building

The exe is built with the C# compiler that ships with Windows (.NET Framework 4), so nothing needs installing:

```powershell
powershell -ExecutionPolicy Bypass -File overlay\build.ps1
```

This writes `overlay\ClaudeUsageMeter.exe`. Source: [overlay/src/ClaudeUsageMeter.cs](overlay/src/ClaudeUsageMeter.cs).

To build the zip for sharing (exe, add-on, installer and source):

```powershell
powershell -ExecutionPolicy Bypass -File package\make-package.ps1
```

This writes `dist\ClaudeUsageMeter-<version>.zip`. The installer and its README are in [package/](package/).

## Files

| Path | What it is |
| --- | --- |
| `hooks/register.tsx` | The Claude Code add-on |
| `overlay/src/ClaudeUsageMeter.cs` | The strip program |
| `overlay/build.ps1` | Builds the exe |
| `package/` | Installer, uninstaller and end-user README |
| `package/make-package.ps1` | Builds the shareable zip |

Settings are stored in `%USERPROFILE%\.claude\usage-meter-settings.json`.

## Licence

MIT, © 2026 Hans Tandt. See [LICENSE](LICENSE).
