# What's new in the AI Usage Meter mod

Newest version on top. How to update: unzip the new version over your mod folder, then quit and restart
Claude Code. Your settings in `/config` stay.

## 1.8.0 · 8 November 2026

**New**
- **A little pixel robot** beside **Details** in the band, an original design. It blinks now and then, its eyes
  scan while Claude works, and its antenna shows the Compress colour. At red its arms go out, and when
  Close session says it is safe, it cheers. In the terminal it is a short face such as `[o_o]`.
  Switch it off in `/config`: "Little robot in the band".
- **Manual:** a tip for when the band is gone and you see `[+]` (Claude Code folded it: click `[+]`, or
  press `ctrl+x ctrl+a`).

**Changed**
- **Details** moved to the left of the band, away from Claude Code's own `[-]` mark, which folds the band
  away when you click it by mistake.
- **Close session** now ends with a plain statement instead of a YES/NO line: "You are safe to close this
  session now", or "!!! It's NOT safe to close this session, risk of losing data !!!" with the reason.
  The band shows the NOT line in red.
- **New prompts:** End Session v1.1 and New Session v1.3. There is nothing to fill in any more: the mod
  gives Claude the project folder and the task, so one click still runs from start to end.

**Fixed**
- Claude Code rejected every progress report of Close session and Start session; the band now shows the
  steps without an error.
- After the strip was uninstalled, a leftover `AIUsageMeter.exe` made the mod ignore your `/config`
  levels. Now only the strip's settings file counts.
- In the terminal, the bars of Session, Week and Compress were empty. They are drawn with lines again.

## 1.7.1 · 27 October 2026

**Changed**
- Start session uses the New Session prompt v1.2.
- Install: the update step comes first, with a fallback for older Claude Code versions that don't know
  `--marketplace`.

## 1.7.0 · 26 October 2026

The first version of the mod: the band above the prompt with Session, Week and Compress (blinking at red);
the session-notes warnings at 80 and 90 % of the compaction point; Close session and Start session with
their progress in the band; the `/meter` details pane with a Details button; short messages; settings in
`/config`; demo figures with `/meter demo`; a one-command install; and the manual in English, French, Dutch
and German, with a test chapter.
