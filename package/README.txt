CLAUDE USAGE METER  -  version 1.2
Made by Hans Tandt
==================================================================

A thin strip at the top of your screen that shows how much of your
Claude usage you have used: the 5-hour limit and the weekly limit.

  - Green below 80%, orange from 80%, red from 95%
  - A Windows notification when you pass 80% and again at 95%
  - Shows when each limit resets
  - Always on top of other windows; drag it wherever you like


WHAT YOU NEED
-------------
  - Windows 10 or 11
  - The Claude desktop app, up to date, and a Claude plan with usage
    limits (Pro or Max). The figures come from Claude Code, the
    "Code" tab in the app.


INSTALL
-------
  1. Unzip this folder anywhere (for example on your Desktop).
  2. Double-click  Install.cmd
  3. Close and reopen the Claude desktop app.
  4. Open the Code tab and send any message. After Claude's first
     reply, the strip fills in with your figures.

The installer:
  - copies the program to  %LOCALAPPDATA%\ClaudeUsageMeter
  - adds one line to your Claude settings (~\.claude\settings.json)
    so Claude Code loads the small usage-meter add-on; a backup is
    saved next to it as settings.json.bak-usage-meter
  - adds "Claude Usage Meter" to the Start menu and starts it at login

You can delete the unzipped folder after installing.


USING IT
--------
  Drag the strip ............ move it
  Right-click the strip ..... Settings, Move to top centre, About, Close
  Tray icon (near the clock)  same menu; double-click brings the strip back
  Start menu ................ "Claude Usage Meter" starts it again after closing

Settings lets you change both warning levels, turn notifications on or
off, pick the three colours, and choose whether it starts at login.

The figures update while a Claude Code session is open. With no session
open, the strip keeps showing the last figures it received.


UNINSTALL
---------
Double-click  Uninstall.cmd  (from this folder), then restart the
Claude desktop app.


ANTIVIRUS / SMARTSCREEN
-----------------------
The program is not code-signed, so Windows SmartScreen or your antivirus
may warn the first time. Choose "More info" > "Run anyway", or allow it
in your antivirus. The full source code is in the "source" folder.
