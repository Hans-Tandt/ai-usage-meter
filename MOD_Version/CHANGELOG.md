# What's new in Session Pilot (formerly the AI Usage Meter mod)

Newest version on top. How to update: unzip the new version over your mod folder, then quit and restart
Claude Code. Your settings stay.

## 2.0.0 · 15 November 2026

**New name: Session Pilot.** The mod does much more than measure now, so it has a new name. It is the same
mod: the command stays `/meter`, the plugin stays `ai-usage-meter`, and your settings stay. To update, unzip
the new version and copy everything inside its `Session Pilot` folder over your old `AI Usage Meter Mod`
folder, then restart Claude Code. The AI Usage Meter strip (the Windows program) keeps its name.

**New**
- **`/meter start`**: the short way to run Start session. In the desktop app the band of a new session only
  appears after your first message, so type `/meter start` as that first message: Claude gets only the
  Start session prompt and doesn't start on anything else first. `/meter start-session` still works.
- **The HTML companion** (asks by default): after Claude writes a long Markdown document worth re-reading,
  the mod offers an HTML version (band: **Make it** / **No**; prompt box: Tab, Enter). On a yes Claude writes
  a self-contained page next to the Markdown, with a table of contents and diagrams drawn inside the file
  (works offline). Claude gets no extra instructions until you say yes. Setting *HTML companion*
  (ask, on, off) and `/meter html`. Manual: new chapter 12.

**Changed**
- Before the first message the band now shows its **Start session** button even when no figures have
  come in yet (in the terminal, a brand-new session).

## 1.9.0 · 14 November 2026

**New**
- **A robot for each model.** The robot beside **Details** now shows which model is working: Opus wears a
  crown, Sonnet has ears, Haiku a short antenna and a rounder head, Fable two antenna points. Each also has
  its own colours. In the terminal the brackets show the model: `[o_o]` Opus, `(o_o)` Sonnet, `{o_o}` Haiku,
  `<o_o>` Fable. A switch of model (the menu under the prompt, or `/model` in the terminal) shows at the next request; work done by a helper agent doesn't change it.
- **The effort level:** a bar of five marks under the robot, and five lights on its chest, from 1 (low) to
  5 (max); you count them. While Claude works, the eyes scan faster at a higher level. A model without
  effort levels shows no bar and no lights.
- **Settings in the `/meter` pane:** click **Settings** at the bottom of the pane, or type `/meter settings`.
  Every setting has a button there. In the desktop app `/config` opens the app's own Settings window, so
  the mod's settings could not be reached there before.
- **Robot size** in the settings: 2 (small), 3 (medium, now the default, half as big again as before) or 4 (large).
- Three new settings: "Robot: a different robot for each model", "Robot: show the effort level"
  and "Robot size".
- **The Haiku reader** (off by default). Most of Claude's work is reading. With the reader on, Opus is asked,
  once a turn has read more than 2,000 tokens, to give further searching and reading to a reader on Haiku.
  Haiku reads in its own context and sends back only files, line numbers and the exact lines; Opus reads those
  lines itself, and always before it changes a file. Mode `search` or `summary` and the limit are in
  the settings; the On/Off switch is in the `/meter` pane.
- **A token counter per model** in the `/meter` pane: one line with Haiku's share of this session's tokens
  and the reader's runs; Details shows the tokens per model for this session and this week. Each session
  writes only its own counts, so several sessions at once never overwrite each other. With the reader on,
  the band shows `Haiku 19 %`.
- **The cache clock** (on by default): after each reply the band shows how long the conversation's cache
  stays warm, for example `cache 42m`, orange in the last 5 minutes, then `cache cold`. **Keep warm** in the
  `/meter` pane asks Claude one tiny question, so the cache lasts another period; it never runs by itself.
  The cache lifetime (60 minutes on a Claude plan, set 5 with an API key) is in the settings.
- **A warning at a token number** (off by default): besides the % of the compaction point, the yellow and
  red warnings can start at a number of tokens, for example 250,000 and 350,000, whichever comes first.
  Useful with a very large context window.
- **Search helpers on Haiku** (off by default): Claude Code's read-only search helper (Explore) runs on
  Haiku instead of the session's model. Other helpers keep their model.
- **Manual:** a new chapter 11, "Save tokens: how Claude uses them": tokens, the cache, models and helpers,
  the four tools, and what to watch.

**Changed**
- **Close session** now updates a note this session already wrote instead of adding a second one, and keeps
  its open steps word for word; older notes are never shortened.

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
