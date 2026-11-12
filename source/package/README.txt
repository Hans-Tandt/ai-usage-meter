AI USAGE METER  -  version 1.6
Made by Hans Tandt  -  MIT License  -  works with Claude Code

Unofficial community project. Not affiliated with, endorsed by or
sponsored by Anthropic. "Claude" is a trademark of Anthropic.
==================================================================

MANUAL: manual\AI_Usage_Meter_Manual_EN.pdf (also FR, NL and DE):
what it does, why it helps, how to install and use it.

WHAT IT IS
----------
A thin strip at the top of your Windows screen that shows how much of
your Claude usage you have used: the 5-hour limit and the weekly limit.

  - Green below 80%, orange from 80%, red from 95%
  - A Windows notification when you pass 80% and again at 95%
  - Shows when each limit resets, and notifies you when it does
  - Warns "100% in 1h 20m" when, at your current pace, you would hit
    the limit before it resets
  - Shows "updated 3h ago" and dims the bars when the figures are old
  - Stays on top of other windows (you can switch that off); drag it
    wherever you like and save that as its start position

Screenshots: screenshots\strip.jpg (Usage view),
screenshots\session-green.jpg, session-yellow.jpg and session-red.jpg
(Session view), screenshots\vertical.jpg and square-session.jpg,
square-week.jpg, square-compress.jpg (layouts),
screenshots\menu.jpg (right-click menu) and
screenshots\settings.jpg (Settings window).

It has two parts:
  - a small Claude Code add-on (the "plugin" folder) that writes your
    usage figures to %USERPROFILE%\.claude\usage-meter.json after each
    Claude Code reply
  - AIUsageMeter.exe, which reads that file and draws the strip

It only reads the usage figures Claude Code reports. It does not read
your Claude login, and it never sends your data anywhere.

UPDATES: once a day it reads a small version file from
https://hanstandt.be/projects/ai-usage-meter/latest.json. If a newer
version exists, the strip shows "update 1.5" and Settings offers
"Download update", which opens the download page in your browser.
Nothing is downloaded or installed automatically. You can switch the
check off in Settings. To update, unzip the new version and
double-click AIUsageMeter.exe; it installs over the old one and keeps
your settings.

The figures only refresh when a Claude Code session starts or replies.
Usage in the Chat tab counts toward the same limits but doesn't update
the strip; that's why it tells you how old the figures are.


LAYOUTS (new in 1.6)
--------------------
Choose the layout in Settings:
  - Horizontal (default): the strip, alternating between the Usage
    view and the Session view.
  - Vertical: three standing bars side by side - Session (5-hour
    limit), Week and Compress (context window) - all visible at once.
  - Square: 72 x 72 pixels, one figure at a time as a ring with the
    percentage in the middle: Session, then Week, then Compress, each
    for the switch time. At the red level it stays on Compress.
Hover over a figure for the details (reset time, pace, sessions).


SESSION VIEW (new in 1.5)
-------------------------
The strip also shows how full the context window of your Claude Code
sessions is. When it is full, Claude Code compacts it: older parts of
the conversation become a summary, and Claude may forget paths, rules
and decisions. The Session view warns you in time.

  - The strip alternates between the Usage view (5h and Week) and the
    Session view: "Context [bar] 72% to compaction - MyProject (+2)".
    It switches every 10 seconds; set 0 to 99 seconds in Settings
    (0 = don't switch).
  - The % is measured against the point where compaction starts, not
    the full window. If that point is unknown it says "(window)".
  - Green below 80%. Yellow from 80%: a notification says to finish
    the task and update your session notes. Red from 90%: the strip
    stays on the Session view, blinks and says "Start a new session".
    Right-click > "Show usage (10 min)" pauses that for 10 minutes.
  - A notification tells you when compaction has run.
  - With several sessions it shows the one you last typed in (or the
    fullest, in Settings); "(+2)" means two more are live (hover for a
    list). If another session is red, it adds "other: <folder> 92%".
  - It sees Claude Code sessions on this PC only, in the app and in
    the terminal. Cloud sessions (Cowork tasks that run in the cloud),
    WSL sessions and sessions on other computers are not seen.


WHAT YOU NEED
-------------
  - Windows 10 or 11
  - The Claude desktop app, up to date, and a Claude plan with usage
    limits (Pro or Max). The figures come from Claude Code, the
    "Code" tab in the app.
  - Claude Code in the terminal works too, if it is recent: check
    with "claude --version" and update with "claude update". An old
    terminal version doesn't load the add-on, so its sessions don't
    appear on the strip.


WHAT INSTALLING CHANGES ON YOUR PC
----------------------------------
  1. Copies the program and the add-on to %LOCALAPPDATA%\AIUsageMeter
  2. Adds one entry (CLAUDE_CODE_PLUGIN_DIRS) to your Claude settings,
     %USERPROFILE%\.claude\settings.json, so Claude Code loads the
     add-on. A backup is saved first as settings.json.bak-usage-meter.
  3. Adds "AI Usage Meter" to the Start menu
  4. Lists it in Windows Settings > Apps > Installed apps

It does NOT start the program at login. You can switch that on in
Settings. Uninstalling undoes all of it.


UNSIGNED PROGRAM - CHECK IT FIRST
---------------------------------
AIUsageMeter.exe is not code-signed, so Windows SmartScreen may warn.
To check that your copy is the one I built, compare its SHA-256
checksum with the one in SHA256SUMS.txt. In a Command Prompt:

    certutil -hashfile AIUsageMeter.exe SHA256

The full source code is in the "source" folder; you can build the exe
yourself with source\overlay\build.cmd instead of using mine.


INSTALL
-------
  1. Unzip this folder anywhere.
  2. Double-click AIUsageMeter.exe. It shows what it will change and
     asks whether to install. Click Yes.
  3. Restart the Claude desktop app, open the Code tab and send any
     message. After Claude's first reply, the strip fills in.

You can delete the unzipped folder afterwards.


USING IT
--------
  Drag the strip ............ move it
  Right-click the strip ..... Refresh now, Settings, Move to top centre,
                              About, Close
  Tray icon (near the clock)  same menu; double-click brings the strip back
  Start menu ................ "AI Usage Meter" starts it again after closing

"Refresh now" re-reads the figures at once. If they are still old, it
tells you so: send Claude Code a message to update them.

Settings lets you change:
  - both warning levels, and whether to show notifications
  - whether to notify when a limit resets
  - after how many minutes the figures count as old (default 60)
  - the three colours
  - whether it starts at login
  - whether it stays on top of other windows
  - the layout: horizontal, vertical or square
  - its start position: drag the strip where you want it, open
    Settings, click "Save current position", then Save.
    "Use top centre" goes back to the default.


UNINSTALL
---------
Windows Settings > Apps > Installed apps > AI Usage Meter > Uninstall,
or right-click the strip > Settings > Uninstall... Both remove the
shortcuts, the Installed apps entry, the add-on entry in your Claude
settings, and its own settings. Then it closes and opens %LOCALAPPDATA% so you can delete
the AIUsageMeter folder. Restart the Claude desktop app afterwards.


LICENCE
-------
MIT License, Copyright (c) 2026 Hans Tandt. Free to use, copy, change
and share. See LICENSE.txt for the full text.
