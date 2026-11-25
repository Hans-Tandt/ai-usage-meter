# AI Usage Meter

Shows your Claude 5-hour and weekly usage limits, and how full the context window of your Claude Code
session is, so you can finish a task and write your notes before the context gets compacted.

> Unofficial community project. Not affiliated with, endorsed by or sponsored by Anthropic. "Claude" is a trademark of Anthropic.

Made by Hans Tandt · MIT licence · Downloads, manuals and SHA-256 checksums:
https://hanstandt.be/projects/ai-usage-meter/

## Two versions

| Folder | What it is | Version |
| --- | --- | --- |
| [`MOD_Version/`](MOD_Version/) | **Session Pilot, the mod for Claude Code (recommended).** Formerly the AI Usage Meter mod. A band above the prompt, a `/meter` details pane and short messages, inside Claude Code itself (desktop app and terminal), with safe Close session and Start session, token savers and an optional HTML companion. New features only go here. | 2.1.0 |
| [`source/`](source/) | **The strip for Windows.** A small always-on-top window. It stays available as it is; only serious problems are still fixed. | 1.6 |

Each folder has its own README with the full details, how to build it and how to remove it.

## What it does and does not do

- It only reads the usage figures that Claude Code itself reports. It never reads your Claude login
  or any credentials, and it sends nothing anywhere.
- Its only network use is an optional, once-a-day update check that reads a small version file from
  hanstandt.be. It never downloads or installs anything by itself. You can switch it off.

## What it changes on your PC

- **The mod** is installed with Claude Code's own plugin commands (`claude plugin ...`) and removed
  the same way. It writes its figures in `%USERPROFILE%\.claude\`.
- **The strip** copies itself to `%LOCALAPPDATA%\AIUsageMeter`, adds a Start menu shortcut and a
  per-user entry in Installed apps (no admin rights), and adds its add-on folder to
  `%USERPROFILE%\.claude\settings.json` after saving a backup of that file. It starts with Windows
  only if you tick "Start automatically when I log in to Windows" in its Settings (off by default).
  Uninstall from Installed apps, or from the strip's Settings: this undoes all of it.

## Building from source

- **Mod:** TypeScript files loaded by Claude Code; see [`MOD_Version/README.md`](MOD_Version/README.md).
- **Strip:** builds with tools that ship with Windows 10/11, no PowerShell involved:
  `source\overlay\build.cmd`. See [`source/README.md`](source/README.md).

The released exe is not code-signed, so Windows SmartScreen may warn. Check the SHA-256 checksum
shown on the download page, or build it yourself from this source.

## Licence

MIT, see [`LICENSE`](LICENSE).
