// AI Usage Meter - always-on-top strip showing your Claude 5-hour and weekly usage (works with Claude Code).
// Unofficial community project; not affiliated with, endorsed by or sponsored by Anthropic.
// Reads ~/.claude/usage-meter.json, written by the usage-meter Claude Code plugin. Fully offline.
// Drag to move; right-click the strip or the tray icon for the menu.
// Run from an unzipped release (with a "plugin" folder next to it), it offers to install itself;
// Settings > Uninstall undoes the install. No scripts involved.
// Built with the C# 5 compiler that ships with Windows (see overlay/build.cmd).

using System;
using System.Collections;
using System.Collections.Generic;
using System.Diagnostics;
using System.Globalization;
using System.IO;
using System.Linq;
using System.Reflection;
using System.Text;
using System.Threading;
using System.Net;
using System.Web.Script.Serialization;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Media;
using System.Windows.Shapes;
using System.Windows.Threading;
using System.Windows.Interop;
using System.Runtime.InteropServices;
using Microsoft.Win32;
using Forms = System.Windows.Forms;
using Drawing = System.Drawing;

[assembly: AssemblyTitle("AI Usage Meter")]
[assembly: AssemblyProduct("AI Usage Meter")]
[assembly: AssemblyCompany("Hans Tandt")]
[assembly: AssemblyCopyright("Copyright (c) 2026 Hans Tandt. MIT License.")]
[assembly: AssemblyVersion("1.6.0.0")]
[assembly: AssemblyFileVersion("1.6.0.0")]

namespace AIUsageMeter
{
    public class Settings
    {
        public int Warn1 { get; set; }
        public int Warn2 { get; set; }
        public bool Notify { get; set; }
        public bool NotifyReset { get; set; }
        public int StaleMinutes { get; set; }
        public bool AlwaysOnTop { get; set; }
        public bool CheckUpdates { get; set; }
        public bool SessionView { get; set; }
        public string SessionMode { get; set; }   // "latest" (last typed in) or "fullest"
        public int SwitchSeconds { get; set; }    // 0 = don't switch views
        public int SessLevel1 { get; set; }       // yellow, % of the compaction point
        public int SessLevel2 { get; set; }       // red: stays on the Session view
        public bool Blink { get; set; }
        public bool NotifyCompaction { get; set; }
        public string Layout { get; set; }        // "horizontal", "vertical" or "square"
        public bool HasPosition { get; set; }
        public double PosX { get; set; }
        public double PosY { get; set; }
        public string ColorOk { get; set; }
        public string ColorWarn { get; set; }
        public string ColorDanger { get; set; }

        public static Settings Defaults()
        {
            return new Settings { Warn1 = 80, Warn2 = 95, Notify = true, NotifyReset = true, StaleMinutes = 60, AlwaysOnTop = true, CheckUpdates = true,
                SessionView = true, SessionMode = "latest", SwitchSeconds = 10, SessLevel1 = 80, SessLevel2 = 90, Blink = true, NotifyCompaction = true, Layout = "horizontal",
                ColorOk = "#3FB950", ColorWarn = "#F0883E", ColorDanger = "#F85149" };
        }
    }

    // One live Claude Code session, from <home>/.claude/usage-meter-context/<id>.json (written by the add-on).
    // One figure as the vertical and square layouts draw it: Session (5h), Week or Compress.
    class Gauge
    {
        public string Title, Tip;
        public double? Pct;   // null: unknown (a window that has just reset)
        public Brush Color;
        public bool Stale, Blink;
    }

    class SessionInfo
    {
        public string Id, Folder, Basis;
        public double? ToCompact;
        public DateTimeOffset? UpdatedAt, LastActiveAt, CompactedAt;
        public bool Ended;

        public DateTimeOffset LastSeen
        {
            get
            {
                var a = UpdatedAt ?? DateTimeOffset.MinValue;
                var b = LastActiveAt ?? DateTimeOffset.MinValue;
                return a > b ? a : b;
            }
        }
    }

    class Reading
    {
        public DateTimeOffset At;
        public double Pct;
    }

    public static class Program
    {
        public const string AppName = "AI Usage Meter";
        public const string Version = "1.6";
        public const string Author = "Hans Tandt";

        // Small JSON file on the author's website: {"version":"1.5","url":"https://.../download-page"}.
        // Empty = no update checks at all. AIUM_UPDATE_URL overrides it for testing.
        public const string UpdateUrl = "https://hanstandt.be/projects/ai-usage-meter/latest.json";

        public static string DemoDir;

        public static string UpdateSource()
        {
            var env = Environment.GetEnvironmentVariable("AIUM_UPDATE_URL");
            return string.IsNullOrEmpty(env) ? UpdateUrl : env;
        }

        [STAThread]
        public static void Main(string[] args)
        {
            // "Uninstall" in Windows Settings > Installed apps runs AIUsageMeter.exe /uninstall
            // "/demo <folder>": read usage-meter.json and usage-meter-context\ from that folder instead of
            // ~/.claude, so screenshots can be made with invented figures (no install offer in this mode).
            var demo = Array.FindIndex(args, a => string.Equals(a, "/demo", StringComparison.OrdinalIgnoreCase));
            if (demo >= 0 && demo + 1 < args.Length) DemoDir = args[demo + 1];
            if (args.Any(a => string.Equals(a, "/uninstall", StringComparison.OrdinalIgnoreCase)))
            {
                Installer.ConfirmAndUninstall(null, true);
                return;
            }
            if (DemoDir == null && Installer.OfferInstall()) return;
            bool isFirst;
            using (var mutex = new Mutex(true, "Local\\AIUsageMeterOverlay", out isFirst))
            {
                if (!isFirst) return;
                var app = new Application();
                app.ShutdownMode = ShutdownMode.OnMainWindowClose;
                app.Run(new Strip());
            }
        }
    }

    // ---------- install / uninstall (replaces the old PowerShell scripts) ----------

    static class Installer
    {
        static readonly string LocalAppData = Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData);
        static readonly string Home = Environment.GetFolderPath(Environment.SpecialFolder.UserProfile);
        public static readonly string Dir = System.IO.Path.Combine(LocalAppData, "AIUsageMeter");
        public static readonly string PluginDir = System.IO.Path.Combine(Dir, "plugin");
        public static readonly string InstalledExe = System.IO.Path.Combine(Dir, "AIUsageMeter.exe");
        public static readonly string ClaudeSettings = System.IO.Path.Combine(Home, ".claude", "settings.json");
        public static readonly string ExePath = Process.GetCurrentProcess().MainModule.FileName;
        static readonly string OldDir = System.IO.Path.Combine(LocalAppData, "ClaudeUsageMeter"); // versions up to 1.2
        static readonly string OldPluginDir = System.IO.Path.Combine(OldDir, "plugin");
        const string OldName = "Claude Usage Meter";
        const string Key = "CLAUDE_CODE_PLUGIN_DIRS";
        const string UninstallKey = @"Software\Microsoft\Windows\CurrentVersion\Uninstall\AIUsageMeter";

        static string ProgramsFolder { get { return Environment.GetFolderPath(Environment.SpecialFolder.Programs); } }
        static string StartupFolder { get { return Environment.GetFolderPath(Environment.SpecialFolder.Startup); } }

        static bool SamePath(string a, string b)
        {
            return string.Equals(a.TrimEnd('\\', '/'), b.TrimEnd('\\', '/'), StringComparison.OrdinalIgnoreCase);
        }

        public static bool IsInstalledCopy { get { return SamePath(System.IO.Path.GetDirectoryName(ExePath), Dir); } }

        // True when this process should exit: installed and handed over to the installed copy, or declined.
        public static bool OfferInstall()
        {
            var here = System.IO.Path.GetDirectoryName(ExePath);
            if (IsInstalledCopy || !Directory.Exists(System.IO.Path.Combine(here, "plugin"))) return false;

            var msg = "Install " + Program.AppName + " " + Program.Version + "?\n\n" +
                "This will:\n" +
                "  1. Copy the program to\n      " + Dir + "\n" +
                "  2. Add its Claude Code add-on to CLAUDE_CODE_PLUGIN_DIRS in\n      " + ClaudeSettings + "\n" +
                "      (a backup is saved first as settings.json.bak-usage-meter)\n" +
                "  3. Add \"" + Program.AppName + "\" to the Start menu\n\n" +
                "It does not start at login unless you switch that on in Settings.\n" +
                "To remove it later: right-click the strip > Settings > Uninstall.";
            if (MessageBox.Show(msg, "Install " + Program.AppName, MessageBoxButton.YesNo, MessageBoxImage.Question) != MessageBoxResult.Yes) return true;

            string note;
            try { note = Install(here); }
            catch (Exception ex)
            {
                MessageBox.Show("Installation failed: " + ex.Message, Program.AppName, MessageBoxButton.OK, MessageBoxImage.Error);
                return true;
            }
            MessageBox.Show("Installed.\n\nRestart the Claude desktop app and open a Claude Code session. " +
                "The strip fills in after Claude's first reply.\n\nYou can delete the unzipped folder now." + note,
                Program.AppName, MessageBoxButton.OK, MessageBoxImage.Information);
            Process.Start(InstalledExe);
            return true;
        }

        // Returns a note for the user when an optional step (the Start menu shortcut) didn't work.
        static string Install(string from)
        {
            var me = Process.GetCurrentProcess().Id;
            foreach (var name in new[] { "AIUsageMeter", "ClaudeUsageMeter" })
                foreach (var p in Process.GetProcessesByName(name))
                    if (p.Id != me) { try { p.Kill(); p.WaitForExit(3000); } catch { } }

            Directory.CreateDirectory(Dir);
            File.Copy(ExePath, InstalledExe, true);
            if (Directory.Exists(PluginDir)) Directory.Delete(PluginDir, true);
            CopyDir(System.IO.Path.Combine(from, "plugin"), PluginDir);

            UpdatePluginDirs(true);
            RegisterUninstall();

            foreach (var folder in new[] { ProgramsFolder, StartupFolder })
            {
                try { DeleteIfExists(System.IO.Path.Combine(folder, OldName + ".lnk")); } catch { }
            }
            if (Directory.Exists(OldDir)) { try { Directory.Delete(OldDir, true); } catch { } }
            try { Shortcut(System.IO.Path.Combine(ProgramsFolder, Program.AppName + ".lnk"), InstalledExe); }
            catch
            {
                return "\n\nThe Start menu shortcut could not be created (your antivirus may have blocked it). " +
                    "Start the program from:\n" + InstalledExe;
            }
            return "";
        }

        // Lists the app in Windows Settings > Installed apps (per user, no admin rights needed).
        static void RegisterUninstall()
        {
            long bytes = 0;
            foreach (var f in Directory.GetFiles(Dir, "*", SearchOption.AllDirectories)) bytes += new FileInfo(f).Length;
            using (var k = Registry.CurrentUser.CreateSubKey(UninstallKey))
            {
                k.SetValue("DisplayName", Program.AppName);
                k.SetValue("DisplayVersion", Program.Version);
                k.SetValue("Publisher", Program.Author);
                k.SetValue("DisplayIcon", InstalledExe + ",0");
                k.SetValue("InstallLocation", Dir);
                k.SetValue("InstallDate", DateTime.Now.ToString("yyyyMMdd"));
                k.SetValue("UninstallString", "\"" + InstalledExe + "\" /uninstall");
                k.SetValue("NoModify", 1, RegistryValueKind.DWord);
                k.SetValue("NoRepair", 1, RegistryValueKind.DWord);
                k.SetValue("EstimatedSize", (int)Math.Max(1, bytes / 1024), RegistryValueKind.DWord);
            }
        }

        // Shared by Settings > Uninstall and "AIUsageMeter.exe /uninstall". True when it uninstalled.
        public static bool ConfirmAndUninstall(Window owner, bool fromCommandLine)
        {
            var question = "Uninstall " + Program.AppName + "?\n\n" +
                "This will:\n" +
                "  - remove its Start menu and login shortcuts and its entry in Installed apps\n" +
                "  - take its add-on out of\n      " + ClaudeSettings + "\n" +
                "  - delete its settings and its add-on folder\n\n" +
                "The program then closes.";
            if (Show(owner, question, MessageBoxButton.YesNo, MessageBoxImage.Question) != MessageBoxResult.Yes) return false;
            try
            {
                if (fromCommandLine)
                {
                    var me = Process.GetCurrentProcess().Id;
                    foreach (var p in Process.GetProcessesByName("AIUsageMeter"))
                        if (p.Id != me) { try { p.Kill(); p.WaitForExit(3000); } catch { } }
                }
                Uninstall();
            }
            catch (Exception ex)
            {
                Show(owner, "Uninstall failed: " + ex.Message, MessageBoxButton.OK, MessageBoxImage.Error);
                return false;
            }
            Show(owner, Program.AppName + " has been removed.\n\nTo finish:\n" +
                "  1. Delete the folder " + Dir + "\n      (it now only holds the program file; it opens for you after this message)\n" +
                "  2. Restart the Claude desktop app.", MessageBoxButton.OK, MessageBoxImage.Information);
            try { Process.Start("explorer.exe", "/select,\"" + Dir + "\""); } catch { }
            return true;
        }

        static MessageBoxResult Show(Window owner, string text, MessageBoxButton buttons, MessageBoxImage icon)
        {
            var title = "Uninstall " + Program.AppName;
            return owner != null ? MessageBox.Show(owner, text, title, buttons, icon) : MessageBox.Show(text, title, buttons, icon);
        }

        static void Uninstall()
        {
            foreach (var folder in new[] { ProgramsFolder, StartupFolder })
                foreach (var name in new[] { Program.AppName, OldName })
                    DeleteIfExists(System.IO.Path.Combine(folder, name + ".lnk"));
            Registry.CurrentUser.DeleteSubKeyTree(UninstallKey, false);
            UpdatePluginDirs(false);
            var claudeDir = System.IO.Path.GetDirectoryName(ClaudeSettings);
            DeleteIfExists(System.IO.Path.Combine(claudeDir, "usage-meter.json"));
            DeleteIfExists(System.IO.Path.Combine(claudeDir, "usage-meter-settings.json"));
            if (Directory.Exists(PluginDir)) Directory.Delete(PluginDir, true);
            if (Directory.Exists(OldDir)) { try { Directory.Delete(OldDir, true); } catch { } }
        }

        // Adds or removes our plugin folder in CLAUDE_CODE_PLUGIN_DIRS; everything else in settings.json is kept.
        static void UpdatePluginDirs(bool add)
        {
            Dictionary<string, object> cfg = null;
            if (File.Exists(ClaudeSettings))
            {
                var raw = File.ReadAllText(ClaudeSettings);
                if (raw.Trim().Length > 0)
                {
                    try { cfg = new JavaScriptSerializer().Deserialize<Dictionary<string, object>>(raw); }
                    catch { throw new Exception(ClaudeSettings + " could not be read as JSON, so it was left unchanged."); }
                }
                if (add) File.Copy(ClaudeSettings, ClaudeSettings + ".bak-usage-meter", true);
            }
            if (cfg == null) { if (!add) return; cfg = new Dictionary<string, object>(); }

            object envObj;
            var env = cfg.TryGetValue("env", out envObj) ? envObj as Dictionary<string, object> : null;
            if (env == null) { if (!add) return; env = new Dictionary<string, object>(); cfg["env"] = env; }

            object cur;
            var dirs = new List<string>();
            if (env.TryGetValue(Key, out cur) && cur != null) dirs.AddRange(cur.ToString().Split(';').Where(d => d.Length > 0));
            dirs.RemoveAll(d => SamePath(d, PluginDir) || SamePath(d, OldPluginDir));
            if (add) dirs.Add(PluginDir);
            if (dirs.Count > 0) env[Key] = string.Join(";", dirs); else env.Remove(Key);
            if (env.Count == 0) cfg.Remove("env");

            Directory.CreateDirectory(System.IO.Path.GetDirectoryName(ClaudeSettings));
            File.WriteAllText(ClaudeSettings, Json.Write(cfg), new UTF8Encoding(false));
        }

        public static void Shortcut(string lnkPath, string target)
        {
            dynamic shell = Activator.CreateInstance(Type.GetTypeFromProgID("WScript.Shell"));
            dynamic lnk = shell.CreateShortcut(lnkPath);
            lnk.TargetPath = target;
            lnk.WorkingDirectory = System.IO.Path.GetDirectoryName(target);
            lnk.IconLocation = target + ",0";
            lnk.Description = Program.AppName;
            lnk.Save();
        }

        static void CopyDir(string from, string to)
        {
            Directory.CreateDirectory(to);
            foreach (var f in Directory.GetFiles(from)) File.Copy(f, System.IO.Path.Combine(to, System.IO.Path.GetFileName(f)), true);
            foreach (var d in Directory.GetDirectories(from)) CopyDir(d, System.IO.Path.Combine(to, System.IO.Path.GetFileName(d)));
        }

        static void DeleteIfExists(string path) { if (File.Exists(path)) File.Delete(path); }
    }

    // Writes JSON with 2-space indentation, keeping key order, so settings.json stays readable.
    static class Json
    {
        public static string Write(object o)
        {
            var sb = new StringBuilder();
            W(sb, o, 0);
            return sb.Append("\n").ToString();
        }

        static void W(StringBuilder sb, object o, int ind)
        {
            var pad = new string(' ', (ind + 1) * 2);
            var end = new string(' ', ind * 2);
            if (o == null) sb.Append("null");
            else if (o is string) Str(sb, (string)o);
            else if (o is bool) sb.Append((bool)o ? "true" : "false");
            else if (o is IDictionary<string, object>)
            {
                var d = (IDictionary<string, object>)o;
                if (d.Count == 0) { sb.Append("{}"); return; }
                sb.Append("{\n");
                var i = 0;
                foreach (var kv in d)
                {
                    sb.Append(pad); Str(sb, kv.Key); sb.Append(": "); W(sb, kv.Value, ind + 1);
                    if (++i < d.Count) sb.Append(",");
                    sb.Append("\n");
                }
                sb.Append(end).Append("}");
            }
            else if (o is IEnumerable)
            {
                var list = ((IEnumerable)o).Cast<object>().ToList();
                if (list.Count == 0) { sb.Append("[]"); return; }
                sb.Append("[\n");
                for (var i = 0; i < list.Count; i++)
                {
                    sb.Append(pad); W(sb, list[i], ind + 1);
                    if (i < list.Count - 1) sb.Append(",");
                    sb.Append("\n");
                }
                sb.Append(end).Append("]");
            }
            else if (o is double) sb.Append(((double)o).ToString("R", CultureInfo.InvariantCulture));
            else if (o is IFormattable) sb.Append(((IFormattable)o).ToString(null, CultureInfo.InvariantCulture));
            else Str(sb, o.ToString());
        }

        static void Str(StringBuilder sb, string s)
        {
            sb.Append('"');
            foreach (var ch in s)
            {
                switch (ch)
                {
                    case '"': sb.Append("\\\""); break;
                    case '\\': sb.Append("\\\\"); break;
                    case '\n': sb.Append("\\n"); break;
                    case '\r': sb.Append("\\r"); break;
                    case '\t': sb.Append("\\t"); break;
                    default:
                        if (ch < ' ') sb.AppendFormat("\\u{0:x4}", (int)ch); else sb.Append(ch);
                        break;
                }
            }
            sb.Append('"');
        }
    }

    // ---------- the strip ----------

    public class Strip : Window
    {
        static readonly string ClaudeDir = System.IO.Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.UserProfile), ".claude");
        static readonly string DataFile = System.IO.Path.Combine(Program.DemoDir ?? ClaudeDir, "usage-meter.json");
        static readonly string SettingsFile = System.IO.Path.Combine(ClaudeDir, "usage-meter-settings.json");
        static readonly string StartupLnk = System.IO.Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.Startup), Program.AppName + ".lnk");
        static readonly Dictionary<string, string> Labels = new Dictionary<string, string> { { "five_hour", "5h" }, { "seven_day", "Week" }, { "spend_limit", "Spend" } };
        static readonly Dictionary<string, string> LongLabels = new Dictionary<string, string> { { "five_hour", "5-hour limit" }, { "seven_day", "Weekly limit" }, { "spend_limit", "Spend limit" } };
        const string Dot = "· ";
        const string DefaultTip = "Right-click for menu";

        static readonly Brush Track = Hex("#3A3A3A"), Dim = Hex("#9A9A9A"), White = Hex("#EDEDED");

        readonly StackPanel row = new StackPanel { Orientation = Orientation.Horizontal };
        readonly Border border;
        readonly Forms.NotifyIcon tray;
        readonly Dictionary<string, int> warned = new Dictionary<string, int>();
        readonly Dictionary<string, List<Reading>> history = new Dictionary<string, List<Reading>>();
        readonly Dictionary<string, DateTimeOffset> historyWindow = new Dictionary<string, DateTimeOffset>();
        readonly Dictionary<string, DateTimeOffset> resetFired = new Dictionary<string, DateTimeOffset>();
        readonly Dictionary<string, DateTimeOffset> burnFired = new Dictionary<string, DateTimeOffset>();
        readonly List<UIElement> dimmable = new List<UIElement>();
        Settings settings;
        DateTimeOffset? lastUpdatedAt;
        double? ageMinutes;
        bool silent = true; // first pass seeds notification state without notifying
        bool placed;
        string updateVersion, updatePage, notifiedUpdate;
        string updateStatus = "Not checked yet";

        // Session view
        static readonly string ContextDir = System.IO.Path.Combine(Program.DemoDir ?? ClaudeDir, "usage-meter-context");
        static readonly Brush Yellow = Hex("#E3B341");
        List<SessionInfo> sessions = new List<SessionInfo>();
        readonly Dictionary<string, int> sessWarned = new Dictionary<string, int>();
        readonly Dictionary<string, DateTimeOffset> compactSeen = new Dictionary<string, DateTimeOffset>();
        readonly List<UIElement> blinkTargets = new List<UIElement>();
        readonly List<Gauge> usageGauges = new List<Gauge>();
        static readonly Dictionary<string, string> GaugeTitles = new Dictionary<string, string> { { "five_hour", "Session" }, { "seven_day", "Week" }, { "spend_limit", "Spend" } };
        DateTimeOffset showUsageUntil = DateTimeOffset.MinValue;
        double usageWidth;
        int tick;

        public Strip()
        {
            settings = LoadSettings();
            Title = Program.AppName;
            WindowStyle = WindowStyle.None;
            AllowsTransparency = true;
            Background = Brushes.Transparent;
            Topmost = settings.AlwaysOnTop;
            ShowInTaskbar = false;
            SizeToContent = SizeToContent.Manual; // sized by hand in SizeToFit
            ResizeMode = ResizeMode.NoResize;

            border = new Border
            {
                Background = Hex("#E61E1E1E"), CornerRadius = new CornerRadius(8), Padding = new Thickness(12, 5, 12, 5),
                BorderThickness = new Thickness(1), BorderBrush = Hex("#444444"), ToolTip = DefaultTip, Child = row
            };
            Content = border;

            var menu = new ContextMenu();
            menu.Items.Add(Item("Refresh now", RefreshNow));
            menu.Items.Add(Item("Show usage (10 min)", ShowUsageForAWhile));
            menu.Items.Add(Item("Settings...", ShowSettings));
            menu.Items.Add(Item("Move to top centre", SnapTop));
            menu.Items.Add(Item("About", ShowAbout));
            menu.Items.Add(new Separator());
            menu.Items.Add(Item("Close " + Program.AppName, Close));
            border.ContextMenu = menu;

            tray = new Forms.NotifyIcon { Visible = true, Text = Program.AppName };
            try { tray.Icon = Drawing.Icon.ExtractAssociatedIcon(Installer.ExePath); } catch { tray.Icon = Drawing.SystemIcons.Information; }
            var trayMenu = new Forms.ContextMenuStrip();
            trayMenu.Items.Add("Refresh now", null, delegate { RefreshNow(); });
            trayMenu.Items.Add("Show usage (10 min)", null, delegate { ShowUsageForAWhile(); });
            trayMenu.Items.Add("Settings...", null, delegate { ShowSettings(); });
            trayMenu.Items.Add("Move to top centre", null, delegate { Show(); Activate(); SnapTop(); });
            trayMenu.Items.Add("About", null, delegate { ShowAbout(); });
            trayMenu.Items.Add("-");
            trayMenu.Items.Add("Close " + Program.AppName, null, delegate { Close(); });
            tray.ContextMenuStrip = trayMenu;
            tray.DoubleClick += delegate { Show(); Activate(); };

            MouseLeftButtonDown += delegate { try { DragMove(); } catch { } };
            ContentRendered += delegate
            {
                if (!placed) { if (!PlaceSaved()) SnapTop(); placed = true; }
            };
            // Windows keeps top-level windows at least ~136 px wide; the 72 x 72 square needs less.
            SourceInitialized += delegate
            {
                var src = HwndSource.FromHwnd(new WindowInteropHelper(this).Handle);
                if (src != null) src.AddHook(AllowSmallWindow);
            };
            Closed += delegate { tray.Visible = false; tray.Dispose(); };

            ReadSessions();
            Refresh();
            silent = false;
            // Redraw every second (view switching); read the session files every 3 seconds.
            var timer = new DispatcherTimer { Interval = TimeSpan.FromSeconds(1) };
            timer.Tick += delegate
            {
                if (++tick % 3 == 0) ReadSessions();
                Refresh();
            };
            timer.Start();
            var blinkTimer = new DispatcherTimer { Interval = TimeSpan.FromMilliseconds(250) };
            blinkTimer.Tick += delegate { ApplyBlink(); };
            blinkTimer.Start();

            // Update check: 10 seconds after start, then once a day.
            var updateTimer = new DispatcherTimer { Interval = TimeSpan.FromSeconds(10) };
            updateTimer.Tick += delegate { updateTimer.Interval = TimeSpan.FromHours(24); CheckForUpdate(false, null); };
            updateTimer.Start();
        }

        // ---------- update check (only reads a small version file; never downloads or runs anything) ----------

        void CheckForUpdate(bool manual, Action done)
        {
            var src = Program.UpdateSource();
            if (src.Length == 0 || (!manual && !settings.CheckUpdates)) { if (done != null) done(); return; }
            try
            {
                ServicePointManager.SecurityProtocol |= (SecurityProtocolType)3072; // TLS 1.2
                var wc = new WebClient { Encoding = Encoding.UTF8 };
                wc.Headers[HttpRequestHeader.UserAgent] = "AIUsageMeter/" + Program.Version;
                wc.DownloadStringCompleted += (s, e) =>
                {
                    wc.Dispose();
                    if (e.Error != null) updateStatus = "Couldn't check for updates (" + e.Error.Message + ")";
                    else ReadUpdateInfo(e.Result, src);
                    Refresh();
                    if (done != null) done();
                };
                wc.DownloadStringAsync(new Uri(src));
            }
            catch (Exception ex)
            {
                updateStatus = "Couldn't check for updates (" + ex.Message + ")";
                if (done != null) done();
            }
        }

        void ReadUpdateInfo(string json, string src)
        {
            try
            {
                var j = new JavaScriptSerializer().Deserialize<Dictionary<string, object>>(json);
                object v, u;
                Version latest;
                if (!j.TryGetValue("version", out v) || !Version.TryParse(Convert.ToString(v), out latest))
                {
                    updateStatus = "Couldn't check for updates (unexpected answer)";
                    return;
                }
                var checkedAt = DateTime.Now.ToString("ddd HH:mm");
                if (latest <= Version.Parse(Program.Version))
                {
                    updateVersion = null; updatePage = null;
                    updateStatus = "Up to date (checked " + checkedAt + ")";
                    return;
                }
                // Only ever open a page on the same site as the version file; otherwise its folder.
                var page = j.TryGetValue("url", out u) ? Convert.ToString(u) : null;
                updatePage = SameSite(page, src) ? page : new Uri(new Uri(src), ".").ToString();
                updateVersion = Convert.ToString(v);
                updateStatus = "Version " + updateVersion + " is available (checked " + checkedAt + ")";
                if (notifiedUpdate != updateVersion)
                {
                    notifiedUpdate = updateVersion;
                    if (settings.Notify)
                        Notify(Program.AppName, "Version " + updateVersion + " is available. Right-click the strip > Settings > Download update.", Forms.ToolTipIcon.Info);
                }
            }
            catch { updateStatus = "Couldn't check for updates (unexpected answer)"; }
        }

        static bool SameSite(string page, string src)
        {
            Uri p, s;
            return Uri.TryCreate(page, UriKind.Absolute, out p) && Uri.TryCreate(src, UriKind.Absolute, out s)
                && p.Scheme == s.Scheme && string.Equals(p.Host, s.Host, StringComparison.OrdinalIgnoreCase);
        }

        void OpenUpdatePage()
        {
            if (updatePage == null) return;
            try { Process.Start(updatePage); } catch { }
        }

        // ---------- helpers ----------

        static Brush Hex(string hex) { return (Brush)new BrushConverter().ConvertFromString(hex); }

        static MenuItem Item(string header, Action action)
        {
            var m = new MenuItem { Header = header };
            m.Click += delegate { action(); };
            return m;
        }

        [StructLayout(LayoutKind.Sequential)]
        struct NativePoint { public int X, Y; }

        [StructLayout(LayoutKind.Sequential)]
        struct MinMaxInfo { public NativePoint Reserved, MaxSize, MaxPosition, MinTrackSize, MaxTrackSize; }

        static IntPtr AllowSmallWindow(IntPtr hwnd, int msg, IntPtr wParam, IntPtr lParam, ref bool handled)
        {
            const int WM_GETMINMAXINFO = 0x0024;
            if (msg == WM_GETMINMAXINFO)
            {
                var info = (MinMaxInfo)Marshal.PtrToStructure(lParam, typeof(MinMaxInfo));
                info.MinTrackSize.X = 1;
                info.MinTrackSize.Y = 1;
                Marshal.StructureToPtr(info, lParam, false);
                handled = true; // otherwise WPF's own handler puts the system minimum back
            }
            return IntPtr.Zero;
        }

        // Puts the strip at the saved position, if there is one and it's still (mostly) on a screen.
        bool PlaceSaved()
        {
            if (!settings.HasPosition) return false;
            double x = settings.PosX, y = settings.PosY;
            var left = SystemParameters.VirtualScreenLeft;
            var top = SystemParameters.VirtualScreenTop;
            var right = left + SystemParameters.VirtualScreenWidth;
            var bottom = top + SystemParameters.VirtualScreenHeight;
            if (x + ActualWidth < left + 40 || x > right - 40 || y < top || y > bottom - 20) return false;
            Left = x;
            Top = y;
            return true;
        }

        void SnapTop()
        {
            var wa = SystemParameters.WorkArea;
            Left = wa.Left + (wa.Width - ActualWidth) / 2;
            Top = wa.Top + 4;
        }

        Brush ColorFor(double pct)
        {
            if (pct >= settings.Warn2) return Hex(settings.ColorDanger);
            if (pct >= settings.Warn1) return Hex(settings.ColorWarn);
            return Hex(settings.ColorOk);
        }

        static DateTimeOffset? ParseTime(object iso)
        {
            DateTimeOffset at;
            if (iso == null || !DateTimeOffset.TryParse(iso.ToString(), CultureInfo.InvariantCulture, DateTimeStyles.None, out at)) return null;
            return at;
        }

        static string Span(double minutes)
        {
            var mins = Math.Max(0, (int)minutes);
            if (mins >= 1440) return string.Format("{0}d {1}h", mins / 1440, (mins % 1440) / 60);
            if (mins >= 60) return string.Format("{0}h {1}m", mins / 60, mins % 60);
            return mins + "m";
        }

        static string Ago(double minutes)
        {
            var mins = Math.Max(0, (int)minutes);
            if (mins >= 1440) return (mins / 1440) + "d";
            if (mins >= 60) return (mins / 60) + "h";
            return mins + "m";
        }

        // Claude Code may report slightly different reset times for the same window from one reply to the next.
        static bool SameWindow(DateTimeOffset a, DateTimeOffset b) { return Math.Abs((a - b).TotalMinutes) < 5; }

        static string Local(DateTimeOffset t) { return t.ToLocalTime().ToString("ddd HH:mm"); }

        TextBlock AddText(string text, Brush brush, bool bold = false)
        {
            var t = new TextBlock
            {
                Text = text, Foreground = brush, FontSize = 13, VerticalAlignment = VerticalAlignment.Center,
                FontFamily = new FontFamily("Segoe UI"), Margin = new Thickness(0, 0, 6, 0),
                FontWeight = bold ? FontWeights.Bold : FontWeights.Normal
            };
            row.Children.Add(t);
            return t;
        }

        Grid AddBar(double pct, Brush brush, double width = 110)
        {
            var g = new Grid { Width = width, Height = 8, VerticalAlignment = VerticalAlignment.Center, Margin = new Thickness(0, 0, 6, 0) };
            g.Children.Add(new Rectangle { Fill = Track, RadiusX = 4, RadiusY = 4 });
            g.Children.Add(new Rectangle
            {
                Fill = brush, RadiusX = 4, RadiusY = 4, HorizontalAlignment = HorizontalAlignment.Left,
                Width = Math.Max(0, Math.Min(width, width * pct / 100))
            });
            row.Children.Add(g);
            return g;
        }

        void Notify(string title, string text, Forms.ToolTipIcon icon)
        {
            tray.ShowBalloonTip(5000, title, text, icon);
        }

        // ---------- data ----------

        // Draws the Usage view, then swaps in the Session view when it's that view's turn,
        // or when the shown session is at the red level (then it stays, until "Show usage").
        void Refresh()
        {
            Draw();
            SizeToFit();
        }

        // The window is sized by hand after every redraw. WPF's own size-to-content kept stale heights
        // when the content changed width or the layout changed, cutting off the bottom of the strip,
        // and it won't go below ~136 px wide, which the 72 x 72 square needs.
        void SizeToFit()
        {
            if (SizeToContent != SizeToContent.Manual) SizeToContent = SizeToContent.Manual;
            double w = 72, h = 72;
            if (settings.Layout != "square")
            {
                border.Measure(new Size(double.PositiveInfinity, double.PositiveInfinity));
                w = Math.Ceiling(border.DesiredSize.Width);
                h = Math.Ceiling(border.DesiredSize.Height);
            }
            if (Math.Abs(Width - w) > 0.5 || double.IsNaN(Width)) Width = w;
            if (Math.Abs(Height - h) > 0.5 || double.IsNaN(Height)) Height = h;
        }

        void Draw()
        {
            RenderUsage(); // always: keeps the 5h/Week warnings and history running in every layout and view
            blinkTargets.Clear();
            if (settings.Layout == "vertical" || settings.Layout == "square") { RenderCompact(); return; }
            border.Padding = new Thickness(12, 5, 12, 5);
            row.MinWidth = 0;
            // The Session view takes the Usage view's width, even when the strip starts at red.
            row.Measure(new Size(double.PositiveInfinity, double.PositiveInfinity));
            usageWidth = row.DesiredSize.Width;
            if (!settings.SessionView || sessions.Count == 0) return;

            var now = DateTimeOffset.Now;
            var shown = PickSession();
            var red = shown.ToCompact.Value >= settings.SessLevel2;
            var snoozed = now < showUsageUntil;
            bool showSession;
            if (red && !snoozed) showSession = true;
            else if (settings.SwitchSeconds <= 0) showSession = false;
            else showSession = (now.ToUnixTimeSeconds() / settings.SwitchSeconds) % 2 == 1;
            if (!showSession) return;

            RenderSession(shown, now, red && !snoozed);
        }

        SessionInfo PickSession()
        {
            if (settings.SessionMode == "fullest") return sessions.OrderByDescending(s => s.ToCompact.Value).First();
            return sessions.OrderByDescending(s => s.LastActiveAt ?? s.UpdatedAt ?? DateTimeOffset.MinValue).First();
        }

        void RenderSession(SessionInfo shown, DateTimeOffset now, bool pinned)
        {
            row.Children.Clear();
            dimmable.Clear();
            row.MinWidth = usageWidth; // same size as the Usage view
            var pct = shown.ToCompact.Value;
            var c = pct >= settings.SessLevel2 ? Hex(settings.ColorDanger) : pct >= settings.SessLevel1 ? Yellow : Hex(settings.ColorOk);

            AddText("Context", White);
            var bar = AddBar(pct, c, 200);
            AddText(Math.Round(pct) + "% " + (shown.Basis == "window" ? "of window" : "to compaction"), c, pct >= settings.SessLevel2);
            AddText(Dot + shown.Folder, Dim);
            if (sessions.Count > 1) AddText("(+" + (sessions.Count - 1) + ")", Dim);
            if (pinned)
            {
                var t = AddText("Start a new session", Hex(settings.ColorDanger), true);
                if (settings.Blink) { blinkTargets.Add(bar); blinkTargets.Add(t); }
            }
            var other = sessions.Where(s => s != shown && s.ToCompact.Value >= settings.SessLevel2)
                .OrderByDescending(s => s.ToCompact.Value).FirstOrDefault();
            if (other != null) AddText(Dot + "other: " + other.Folder + " " + Math.Round(other.ToCompact.Value) + "%", Hex(settings.ColorDanger));
            StretchBar(bar, pct);

            border.ToolTip = string.Join("\n", sessions.OrderByDescending(s => s.ToCompact.Value).Select(s =>
                string.Format("{0}: {1}% of {2}, updated {3} ago{4}", s.Folder, Math.Round(s.ToCompact.Value),
                    s.Basis == "window" ? "the window" : "compaction",
                    Ago(((now - (s.UpdatedAt ?? now)).TotalMinutes)), s == shown ? "  (shown)" : "")));
            ApplyBlink();
        }

        // ---------- vertical and square layouts ----------

        // Vertical: Session, Week and Compress as standing bars side by side, all at once.
        // Square (72 x 72, three times a taskbar icon): one ring at a time, Session -> Week -> Compress,
        // each for the switch time; at the red level it stays on Compress (until "Show usage").
        void RenderCompact()
        {
            row.Children.Clear();
            dimmable.Clear();
            row.MinWidth = 0;
            var now = DateTimeOffset.Now;
            var gauges = new List<Gauge>(usageGauges);
            Gauge compress = null;
            if (settings.SessionView && sessions.Count > 0)
            {
                var shown = PickSession();
                var pct = shown.ToCompact.Value;
                var pinned = pct >= settings.SessLevel2 && now >= showUsageUntil;
                compress = new Gauge
                {
                    Title = "Compress", Pct = pct,
                    Color = pct >= settings.SessLevel2 ? Hex(settings.ColorDanger) : pct >= settings.SessLevel1 ? Yellow : Hex(settings.ColorOk),
                    Blink = pinned && settings.Blink,
                    Tip = (pinned ? "Start a new session.\n" : "") + string.Join("\n", sessions.OrderByDescending(s => s.ToCompact.Value).Select(s =>
                        string.Format("{0}: {1}% of {2}{3}", s.Folder, Math.Round(s.ToCompact.Value),
                            s.Basis == "window" ? "the window" : "compaction", s == shown ? "  (shown)" : "")))
                };
                gauges.Add(compress);
            }
            border.ToolTip = updateVersion != null ? "Version " + updateVersion + " is available (Settings > Download update)" : DefaultTip;
            if (gauges.Count == 0) gauges.Add(new Gauge { Title = "Usage", Tip = "Open a Claude Code session to start." });

            if (settings.Layout == "square")
            {
                border.Padding = new Thickness(4); // 72 x 72 overall, set in SizeToFit
                Gauge g;
                if (compress != null && compress.Pct >= settings.SessLevel2 && now >= showUsageUntil) g = compress; // red: stay
                else if (settings.SwitchSeconds <= 0) g = gauges[0];
                else g = gauges[(int)((now.ToUnixTimeSeconds() / settings.SwitchSeconds) % gauges.Count)];
                row.Children.Add(SquareGauge(g));
            }
            else
            {
                border.Padding = new Thickness(6, 8, 6, 6);
                foreach (var g in gauges) row.Children.Add(ColumnGauge(g));
            }
            ApplyBlink();
        }

        FrameworkElement SquareGauge(Gauge g)
        {
            // 72 x 72 overall: 4 padding and 1 border on each side leave 62.
            var panel = new StackPanel { Width = 62, Height = 62, ToolTip = g.Tip };
            panel.Children.Add(new TextBlock
            {
                Text = g.Title, Foreground = White, FontSize = 10, FontFamily = new FontFamily("Segoe UI"),
                HorizontalAlignment = HorizontalAlignment.Center, Margin = new Thickness(0, 0, 0, 2)
            });
            var ring = new Grid { Width = 46, Height = 46, HorizontalAlignment = HorizontalAlignment.Center };
            ring.Children.Add(new Ellipse { Stroke = Track, StrokeThickness = 6 });
            if (g.Pct.HasValue && g.Pct.Value > 0) ring.Children.Add(Arc(46, 6, Math.Min(100, g.Pct.Value), g.Color));
            ring.Children.Add(new TextBlock
            {
                Text = g.Pct.HasValue ? Math.Round(g.Pct.Value) + "%" : "?", Foreground = g.Pct.HasValue ? g.Color : Dim,
                FontSize = 12, FontWeight = FontWeights.Bold, FontFamily = new FontFamily("Segoe UI"),
                HorizontalAlignment = HorizontalAlignment.Center, VerticalAlignment = VerticalAlignment.Center
            });
            if (g.Stale) ring.Opacity = 0.6;
            if (g.Blink) blinkTargets.Add(ring);
            panel.Children.Add(ring);
            return panel;
        }

        FrameworkElement ColumnGauge(Gauge g)
        {
            const double h = 80, w = 14;
            var col = new StackPanel { Margin = new Thickness(6, 0, 6, 0), ToolTip = g.Tip };
            var bar = new Grid { Width = w, Height = h, HorizontalAlignment = HorizontalAlignment.Center };
            bar.Children.Add(new Rectangle { Fill = Track, RadiusX = 4, RadiusY = 4 });
            if (g.Pct.HasValue)
                bar.Children.Add(new Rectangle
                {
                    Fill = g.Color, RadiusX = 4, RadiusY = 4, VerticalAlignment = VerticalAlignment.Bottom,
                    Height = Math.Max(0, Math.Min(h, h * g.Pct.Value / 100))
                });
            var pctText = new TextBlock
            {
                Text = g.Pct.HasValue ? Math.Round(g.Pct.Value) + "%" : "?", Foreground = g.Pct.HasValue ? g.Color : Dim,
                FontSize = 12, FontWeight = FontWeights.Bold, FontFamily = new FontFamily("Segoe UI"),
                HorizontalAlignment = HorizontalAlignment.Center, Margin = new Thickness(0, 4, 0, 0)
            };
            col.Children.Add(bar);
            col.Children.Add(pctText);
            col.Children.Add(new TextBlock
            {
                Text = g.Title, Foreground = White, FontSize = 10, FontFamily = new FontFamily("Segoe UI"),
                HorizontalAlignment = HorizontalAlignment.Center
            });
            if (g.Stale) { bar.Opacity = 0.6; pctText.Opacity = 0.6; }
            if (g.Blink) { blinkTargets.Add(bar); blinkTargets.Add(pctText); }
            return col;
        }

        // A ring segment from 12 o'clock, clockwise, for pct of the full circle.
        static UIElement Arc(double size, double thick, double pct, Brush color)
        {
            if (pct >= 99.9) return new Ellipse { Stroke = color, StrokeThickness = thick };
            var r = (size - thick) / 2;
            var c = size / 2;
            var a = pct / 100 * 2 * Math.PI;
            var fig = new PathFigure { StartPoint = new Point(c, c - r), IsClosed = false };
            fig.Segments.Add(new ArcSegment(new Point(c + r * Math.Sin(a), c - r * Math.Cos(a)), new Size(r, r), 0, pct > 50, SweepDirection.Clockwise, true));
            var geo = new PathGeometry();
            geo.Figures.Add(fig);
            return new System.Windows.Shapes.Path { Data = geo, Stroke = color, StrokeThickness = thick };
        }

        // Gives the Session bar all the width the texts leave, so the view fills the strip.
        void StretchBar(Grid bar, double pct)
        {
            double others = 0;
            foreach (UIElement el in row.Children)
            {
                if (el == bar) continue;
                el.Measure(new Size(double.PositiveInfinity, double.PositiveInfinity));
                others += el.DesiredSize.Width; // includes the margins
            }
            var width = Math.Max(120, usageWidth - others - 6);
            bar.Width = width;
            var fill = (Rectangle)bar.Children[1];
            fill.Width = Math.Max(0, Math.Min(width, width * pct / 100));
        }

        // About once a second; only the elements of a red, pinned Session view blink.
        void ApplyBlink()
        {
            var on = DateTime.Now.Millisecond < 500;
            foreach (var el in blinkTargets) el.Opacity = on ? 1.0 : 0.25;
        }

        void ShowUsageForAWhile()
        {
            showUsageUntil = DateTimeOffset.Now.AddMinutes(10);
            Refresh();
        }

        // Reads every session file; deletes files untouched for 7 days (the add-on can't delete);
        // ignores ended sessions and sessions quiet for 12 hours; sends the session notifications.
        void ReadSessions()
        {
            var now = DateTimeOffset.Now;
            var live = new List<SessionInfo>();
            try
            {
                if (Directory.Exists(ContextDir))
                {
                    foreach (var f in Directory.GetFiles(ContextDir, "*.json"))
                    {
                        try
                        {
                            if (File.GetLastWriteTimeUtc(f) < DateTime.UtcNow.AddDays(-7)) { File.Delete(f); continue; }
                            var s = ParseSession(File.ReadAllText(f), System.IO.Path.GetFileNameWithoutExtension(f));
                            if (s == null || s.Ended || (now - s.LastSeen).TotalHours > 12) continue;
                            SessionAlerts(s, now);
                            if (s.ToCompact.HasValue) live.Add(s);
                        }
                        catch { }
                    }
                }
            }
            catch { }
            sessions = live;
        }

        static SessionInfo ParseSession(string json, string fileId)
        {
            var j = new JavaScriptSerializer().Deserialize<Dictionary<string, object>>(json);
            if (j == null) return null;
            object v;
            var s = new SessionInfo { Id = fileId };
            if (j.TryGetValue("sessionId", out v) && v != null) s.Id = Convert.ToString(v);
            s.Folder = j.TryGetValue("folder", out v) && v != null ? Convert.ToString(v) : s.Id;
            if (j.TryGetValue("toCompact", out v) && v != null) s.ToCompact = Convert.ToDouble(v);
            s.Basis = j.TryGetValue("basis", out v) && v != null ? Convert.ToString(v) : "compaction";
            if (j.TryGetValue("updatedAt", out v)) s.UpdatedAt = ParseTime(v);
            if (j.TryGetValue("lastActiveAt", out v)) s.LastActiveAt = ParseTime(v);
            if (j.TryGetValue("compactedAt", out v)) s.CompactedAt = ParseTime(v);
            if (j.TryGetValue("ended", out v) && v != null) s.Ended = Convert.ToBoolean(v);
            return s;
        }

        // Once per level per session (again only after dropping below it), and once per compaction.
        void SessionAlerts(SessionInfo s, DateTimeOffset now)
        {
            if (s.ToCompact.HasValue)
            {
                var pct = s.ToCompact.Value;
                var hit = pct >= settings.SessLevel2 ? 2 : pct >= settings.SessLevel1 ? 1 : 0;
                int before;
                sessWarned.TryGetValue(s.Id, out before);
                if (hit > before && !silent && settings.Notify)
                {
                    if (hit == 2)
                        Notify(Program.AppName, string.Format("Session at {0} % of compaction in {1}. Stop new work: update Session_Notes.md and start a new session.", settings.SessLevel2, s.Folder), Forms.ToolTipIcon.Warning);
                    else
                        Notify(Program.AppName, string.Format("Session at {0} % of compaction in {1}. Finish this task, then update Session_Notes.md.", settings.SessLevel1, s.Folder), Forms.ToolTipIcon.Warning);
                }
                sessWarned[s.Id] = hit;
            }
            if (s.CompactedAt.HasValue)
            {
                DateTimeOffset seen;
                var known = compactSeen.TryGetValue(s.Id, out seen);
                if (!known || s.CompactedAt.Value > seen)
                {
                    compactSeen[s.Id] = s.CompactedAt.Value;
                    // A compaction first seen now counts only if it is recent (not one from before the strip started).
                    var isNews = known || (now - s.CompactedAt.Value).TotalMinutes < 5;
                    if (isNews && !silent && settings.Notify && settings.NotifyCompaction)
                        Notify(Program.AppName, "Compaction ran in " + s.Folder + ". Older details are now a summary - check Session_Notes.md before you trust the next answers.", Forms.ToolTipIcon.Info);
                }
            }
        }

        void RenderUsage()
        {
            row.Children.Clear();
            dimmable.Clear();
            usageGauges.Clear();
            ageMinutes = null;
            border.ToolTip = DefaultTip;
            var now = DateTimeOffset.Now;

            string raw = null;
            try { if (File.Exists(DataFile)) raw = File.ReadAllText(DataFile); } catch { }
            if (string.IsNullOrWhiteSpace(raw)) { AddText("Usage: open a Claude Code session to start", Dim); return; }

            ArrayList windows = null;
            DateTimeOffset? updatedAt = null;
            try
            {
                var data = new JavaScriptSerializer().Deserialize<Dictionary<string, object>>(raw);
                object v;
                if (data.TryGetValue("windows", out v)) windows = v as ArrayList;
                if (data.TryGetValue("updatedAt", out v)) updatedAt = ParseTime(v);
            }
            catch { }
            if (windows == null || windows.Count == 0) { AddText("Usage: waiting for first reply", Dim); return; }

            if (updatedAt.HasValue) ageMinutes = (now - updatedAt.Value).TotalMinutes;
            var stale = ageMinutes.HasValue && ageMinutes.Value > settings.StaleMinutes;
            var isNewData = updatedAt.HasValue && (!lastUpdatedAt.HasValue || updatedAt.Value != lastUpdatedAt.Value);
            if (isNewData) lastUpdatedAt = updatedAt;

            var first = true;
            foreach (Dictionary<string, object> w in windows)
            {
                var kind = Convert.ToString(w["kind"]);
                var pct = Convert.ToDouble(w["percentUsed"]);
                string label, longLabel;
                if (!Labels.TryGetValue(kind, out label)) label = kind;
                if (!LongLabels.TryGetValue(kind, out longLabel)) longLabel = label + " limit";
                object rv;
                w.TryGetValue("resetsAt", out rv);
                var resetsAt = ParseTime(rv);
                var hasReset = resetsAt.HasValue && resetsAt.Value <= now;

                // A different reset time means a new window: its old readings no longer apply.
                DateTimeOffset win;
                if (resetsAt.HasValue && historyWindow.TryGetValue(kind, out win) && !SameWindow(win, resetsAt.Value))
                {
                    history.Remove(kind);
                    historyWindow.Remove(kind);
                }
                if (isNewData && resetsAt.HasValue) Remember(kind, resetsAt.Value, updatedAt.Value, pct);

                if (hasReset)
                {
                    // Notify once per reset; a restart (silent first pass) only records it.
                    DateTimeOffset fired;
                    if (!(resetFired.TryGetValue(kind, out fired) && SameWindow(fired, resetsAt.Value)))
                    {
                        resetFired[kind] = resetsAt.Value;
                        if (!silent && settings.Notify && settings.NotifyReset)
                            Notify(longLabel + " has reset", "New usage figures appear after your next Claude Code reply.", Forms.ToolTipIcon.Info);
                    }
                }

                if (!first) AddText("  ", Dim);
                first = false;
                AddText(label, White);

                string title;
                if (!GaugeTitles.TryGetValue(kind, out title)) title = label;
                if (hasReset)
                {
                    // The window has reset but the new figure isn't known until Claude Code reports it.
                    AddBar(0, Track);
                    AddText("?", Dim);
                    warned[kind] = 0;
                    usageGauges.Add(new Gauge { Title = title, Tip = longLabel + " has reset; the new figure comes with your next Claude Code reply." });
                    continue;
                }

                var c = ColorFor(pct);
                var gauge = new Gauge { Title = title, Pct = pct, Color = c, Stale = stale, Tip = longLabel + ": " + pct + "% used" + (resetsAt.HasValue ? ", resets in " + Span((resetsAt.Value - now).TotalMinutes) : "") };
                if (stale && updatedAt.HasValue) gauge.Tip += "\nFigures from " + Local(updatedAt.Value) + "; they refresh when a Claude Code session starts or replies.";
                usageGauges.Add(gauge);
                dimmable.Add(AddBar(pct, c));
                dimmable.Add(AddText(pct + "%", c, pct >= settings.Warn2));
                if (resetsAt.HasValue) AddText(Dot + Span((resetsAt.Value - now).TotalMinutes), Dim);

                double minsTo100;
                DateTimeOffset since;
                if (!stale && resetsAt.HasValue && BurnRate(kind, pct, resetsAt.Value, now, out minsTo100, out since))
                {
                    var t = AddText(Dot + "100% in " + Span(minsTo100), Hex(settings.ColorWarn));
                    t.ToolTip = string.Format("At your pace since {0} you reach 100% before the reset at {1}.", Local(since), Local(resetsAt.Value));
                    gauge.Tip += "\nAt this pace you hit 100% in " + Span(minsTo100) + ", before the reset.";
                    DateTimeOffset bf;
                    if (!(burnFired.TryGetValue(kind, out bf) && SameWindow(bf, resetsAt.Value)))
                    {
                        burnFired[kind] = resetsAt.Value;
                        if (!silent && settings.Notify)
                            Notify(Program.AppName, longLabel + ": at this pace you hit 100% in " + Span(minsTo100), Forms.ToolTipIcon.Warning);
                    }
                }

                // Notify once per threshold crossing; re-arms when usage drops back below it.
                var hit = pct >= settings.Warn2 ? settings.Warn2 : pct >= settings.Warn1 ? settings.Warn1 : 0;
                int before;
                warned.TryGetValue(kind, out before);
                if (hit > before && !silent && settings.Notify)
                    Notify(Program.AppName, label + " usage at " + pct + "%", Forms.ToolTipIcon.Warning);
                warned[kind] = hit;
            }

            if (ageMinutes.HasValue && ageMinutes.Value >= 10) AddText(Dot + "updated " + Ago(ageMinutes.Value) + " ago", Dim);
            if (updateVersion != null)
            {
                var u = AddText(Dot + "update " + updateVersion, Hex("#58A6FF"));
                u.ToolTip = "Version " + updateVersion + " is available. Right-click > Settings > Download update.";
            }
            foreach (var el in dimmable) el.Opacity = stale ? 0.6 : 1.0;
            if (stale)
                border.ToolTip = string.Format("Figures from {0}. They refresh when a Claude Code session starts or replies. " +
                    "Chat usage counts toward the limits but doesn't update the strip.", Local(updatedAt.Value));
        }

        // Keeps up to 50 readings per window; a new reset time means a new window, so the list starts over.
        void Remember(string kind, DateTimeOffset resetsAt, DateTimeOffset at, double pct)
        {
            List<Reading> h;
            DateTimeOffset win;
            if (!history.TryGetValue(kind, out h) || !historyWindow.TryGetValue(kind, out win) || !SameWindow(win, resetsAt))
            {
                h = new List<Reading>();
                history[kind] = h;
            }
            historyWindow[kind] = resetsAt;
            h.Add(new Reading { At = at, Pct = pct });
            if (h.Count > 50) h.RemoveAt(0);
        }

        // True when, at the pace since the first reading of this window, usage reaches 100% before the reset.
        bool BurnRate(string kind, double pct, DateTimeOffset resetsAt, DateTimeOffset now, out double minsTo100, out DateTimeOffset since)
        {
            minsTo100 = 0;
            since = now;
            List<Reading> h;
            if (pct >= 100 || !history.TryGetValue(kind, out h) || h.Count < 3) return false;
            var a = h[0];
            var b = h[h.Count - 1];
            var span = (b.At - a.At).TotalMinutes;
            if (span < 15 || b.Pct <= a.Pct) return false;
            var rate = (b.Pct - a.Pct) / span;
            var hitAt = b.At.AddMinutes((100 - b.Pct) / rate);
            if (hitAt >= resetsAt) return false;
            minsTo100 = (hitAt - now).TotalMinutes;
            since = a.At;
            return true;
        }

        void RefreshNow()
        {
            Refresh();
            if (ageMinutes.HasValue && ageMinutes.Value > settings.StaleMinutes)
                Notify("Figures are " + Ago(ageMinutes.Value) + " old", "Start a Claude Code session or send it a message to update them.", Forms.ToolTipIcon.Info);
        }

        // ---------- settings ----------

        static Settings LoadSettings()
        {
            var s = Settings.Defaults();
            try
            {
                if (!File.Exists(SettingsFile)) return s;
                var j = new JavaScriptSerializer().Deserialize<Dictionary<string, object>>(File.ReadAllText(SettingsFile));
                object v;
                if (j.TryGetValue("warn1", out v)) s.Warn1 = Convert.ToInt32(v);
                if (j.TryGetValue("warn2", out v)) s.Warn2 = Convert.ToInt32(v);
                if (j.TryGetValue("notify", out v)) s.Notify = Convert.ToBoolean(v);
                if (j.TryGetValue("notifyReset", out v)) s.NotifyReset = Convert.ToBoolean(v);
                if (j.TryGetValue("staleMinutes", out v)) s.StaleMinutes = Math.Max(10, Math.Min(1440, Convert.ToInt32(v)));
                if (j.TryGetValue("alwaysOnTop", out v)) s.AlwaysOnTop = Convert.ToBoolean(v);
                if (j.TryGetValue("checkUpdates", out v)) s.CheckUpdates = Convert.ToBoolean(v);
                if (j.TryGetValue("sessionView", out v)) s.SessionView = Convert.ToBoolean(v);
                if (j.TryGetValue("sessionMode", out v) && Convert.ToString(v) == "fullest") s.SessionMode = "fullest";
                if (j.TryGetValue("switchSeconds", out v)) s.SwitchSeconds = Math.Max(0, Math.Min(99, Convert.ToInt32(v)));
                if (j.TryGetValue("sessLevel1", out v)) s.SessLevel1 = Math.Max(1, Math.Min(100, Convert.ToInt32(v)));
                if (j.TryGetValue("sessLevel2", out v)) s.SessLevel2 = Math.Max(1, Math.Min(100, Convert.ToInt32(v)));
                if (s.SessLevel1 >= s.SessLevel2) { s.SessLevel1 = 80; s.SessLevel2 = 90; }
                if (j.TryGetValue("blink", out v)) s.Blink = Convert.ToBoolean(v);
                if (j.TryGetValue("notifyCompaction", out v)) s.NotifyCompaction = Convert.ToBoolean(v);
                if (j.TryGetValue("layout", out v) && (Convert.ToString(v) == "vertical" || Convert.ToString(v) == "square")) s.Layout = Convert.ToString(v);
                object y;
                if (j.TryGetValue("posX", out v) && j.TryGetValue("posY", out y) && v != null && y != null)
                {
                    s.HasPosition = true;
                    s.PosX = Convert.ToDouble(v);
                    s.PosY = Convert.ToDouble(y);
                }
                if (j.TryGetValue("colorOk", out v)) s.ColorOk = Convert.ToString(v);
                if (j.TryGetValue("colorWarn", out v)) s.ColorWarn = Convert.ToString(v);
                if (j.TryGetValue("colorDanger", out v)) s.ColorDanger = Convert.ToString(v);
            }
            catch { }
            return s;
        }

        static void SaveSettings(Settings s)
        {
            Directory.CreateDirectory(ClaudeDir);
            var d = new Dictionary<string, object>
            {
                { "warn1", s.Warn1 }, { "warn2", s.Warn2 }, { "notify", s.Notify }, { "notifyReset", s.NotifyReset },
                { "staleMinutes", s.StaleMinutes }, { "alwaysOnTop", s.AlwaysOnTop }, { "checkUpdates", s.CheckUpdates },
                { "sessionView", s.SessionView }, { "sessionMode", s.SessionMode }, { "switchSeconds", s.SwitchSeconds },
                { "sessLevel1", s.SessLevel1 }, { "sessLevel2", s.SessLevel2 }, { "blink", s.Blink }, { "notifyCompaction", s.NotifyCompaction }, { "layout", s.Layout },
                { "colorOk", s.ColorOk }, { "colorWarn", s.ColorWarn }, { "colorDanger", s.ColorDanger }
            };
            if (s.HasPosition) { d["posX"] = Math.Round(s.PosX); d["posY"] = Math.Round(s.PosY); }
            File.WriteAllText(SettingsFile, new JavaScriptSerializer().Serialize(d), new UTF8Encoding(false));
        }

        static bool IsAutostart() { return File.Exists(StartupLnk); }

        static void SetAutostart(bool on)
        {
            if (on) Installer.Shortcut(StartupLnk, Installer.ExePath);
            else if (File.Exists(StartupLnk)) File.Delete(StartupLnk);
        }

        void ShowSettings()
        {
            var cur = LoadSettings();
            var dlg = new Window
            {
                Title = Program.AppName + " - Settings", SizeToContent = SizeToContent.WidthAndHeight, ResizeMode = ResizeMode.NoResize,
                WindowStartupLocation = WindowStartupLocation.CenterScreen, Topmost = true
            };
            var grid = new Grid { Margin = new Thickness(16) };
            grid.ColumnDefinitions.Add(new ColumnDefinition { Width = GridLength.Auto });
            grid.ColumnDefinitions.Add(new ColumnDefinition { Width = GridLength.Auto });
            for (var i = 0; i < 18; i++) grid.RowDefinitions.Add(new RowDefinition { Height = GridLength.Auto });

            Action<UIElement, int, int, int> put = (el, r, c, span) =>
            {
                Grid.SetRow(el, r); Grid.SetColumn(el, c); Grid.SetColumnSpan(el, span); grid.Children.Add(el);
            };
            Action<string, int> label = (t, r) => put(new TextBlock { Text = t, Margin = new Thickness(0, 6, 12, 6), VerticalAlignment = VerticalAlignment.Center }, r, 0, 1);
            Func<int, int, TextBox> numBox = (v, r) =>
            {
                var b = new TextBox { Text = v.ToString(), Width = 60, Margin = new Thickness(0, 6, 0, 6), HorizontalAlignment = HorizontalAlignment.Left };
                put(b, r, 1, 1); return b;
            };
            Func<string, int, Button> colorButton = (hex, r) =>
            {
                var b = new Button { Width = 60, Height = 22, Margin = new Thickness(0, 6, 0, 6), HorizontalAlignment = HorizontalAlignment.Left, Background = Hex(hex), Tag = hex, ToolTip = "Click to choose a colour" };
                b.Click += delegate
                {
                    var cd = new Forms.ColorDialog { FullOpen = true, Color = Drawing.ColorTranslator.FromHtml((string)b.Tag) };
                    if (cd.ShowDialog() == Forms.DialogResult.OK)
                    {
                        var hx = string.Format("#{0:X2}{1:X2}{2:X2}", cd.Color.R, cd.Color.G, cd.Color.B);
                        b.Tag = hx; b.Background = Hex(hx);
                    }
                };
                put(b, r, 1, 1); return b;
            };

            label("First warning at (%)", 0); var w1 = numBox(cur.Warn1, 0);
            label("Second warning at (%)", 1); var w2 = numBox(cur.Warn2, 1);
            var nt = new CheckBox { Content = "Show a Windows notification at each warning", IsChecked = cur.Notify, Margin = new Thickness(0, 6, 0, 6) };
            put(nt, 2, 0, 2);
            var nr = new CheckBox { Content = "Notify when a limit resets", IsChecked = cur.NotifyReset, Margin = new Thickness(0, 6, 0, 6) };
            put(nr, 3, 0, 2);
            label("Mark figures as old after (minutes)", 4); var sm = numBox(cur.StaleMinutes, 4);
            label("Normal colour", 5); var c1 = colorButton(cur.ColorOk, 5);
            label("First warning colour", 6); var c2 = colorButton(cur.ColorWarn, 6);
            label("Second warning colour", 7); var c3 = colorButton(cur.ColorDanger, 7);
            var autostart = new CheckBox { Content = "Start automatically when I log in to Windows", IsChecked = IsAutostart(), Margin = new Thickness(0, 6, 0, 6) };
            put(autostart, 8, 0, 2);
            var onTop = new CheckBox { Content = "Always on top of other windows", IsChecked = cur.AlwaysOnTop, Margin = new Thickness(0, 6, 0, 6) };
            var layout = new ComboBox { Width = 260, Margin = new Thickness(0, 0, 0, 6) };
            layout.Items.Add("Horizontal strip");
            layout.Items.Add("Vertical: standing bars side by side");
            layout.Items.Add("Square: one ring at a time (72 x 72)");
            layout.SelectedIndex = cur.Layout == "vertical" ? 1 : cur.Layout == "square" ? 2 : 0;
            var layoutLine = new StackPanel { Orientation = Orientation.Horizontal };
            layoutLine.Children.Add(new TextBlock { Text = "Layout", Width = 50, VerticalAlignment = VerticalAlignment.Center });
            layoutLine.Children.Add(layout);
            var onTopAndLayout = new StackPanel();
            onTopAndLayout.Children.Add(onTop);
            onTopAndLayout.Children.Add(layoutLine);
            put(onTopAndLayout, 9, 0, 2);

            // Start position: saved from wherever the strip is now, or top centre.
            var hasPos = cur.HasPosition;
            double posX = cur.PosX, posY = cur.PosY;
            label("Start position", 10);
            var posText = new TextBlock { Margin = new Thickness(0, 6, 0, 6), VerticalAlignment = VerticalAlignment.Center };
            put(posText, 10, 1, 1);
            Action showPos = () => posText.Text = hasPos ? string.Format("saved ({0:0}, {1:0})", posX, posY) : "top centre";
            showPos();
            var posBtns = new StackPanel { Orientation = Orientation.Horizontal, Margin = new Thickness(0, 0, 0, 12) };
            var savePos = new Button { Content = "Save current position", Padding = new Thickness(8, 1, 8, 1), Margin = new Thickness(0, 0, 8, 0), ToolTip = "Drag the strip where you want it first, then click this and Save" };
            var topPos = new Button { Content = "Use top centre", Padding = new Thickness(8, 1, 8, 1) };
            posBtns.Children.Add(savePos); posBtns.Children.Add(topPos);
            put(posBtns, 11, 0, 2);
            savePos.Click += delegate { hasPos = true; posX = Left; posY = Top; showPos(); };
            topPos.Click += delegate { hasPos = false; showPos(); };

            // Session view: how full the context window of your Claude Code sessions is.
            var sessBox = new GroupBox { Header = "Session view (context window of Claude Code sessions)", Margin = new Thickness(0, 0, 0, 12), Padding = new Thickness(8, 4, 8, 4) };
            var sessPanel = new StackPanel();
            sessBox.Content = sessPanel;
            put(sessBox, 12, 0, 2);
            Func<UIElement[], StackPanel> line = els =>
            {
                var p = new StackPanel { Orientation = Orientation.Horizontal, Margin = new Thickness(0, 4, 0, 4) };
                foreach (var el in els) p.Children.Add(el);
                sessPanel.Children.Add(p);
                return p;
            };
            Func<string, TextBlock> txt = t => new TextBlock { Text = t, VerticalAlignment = VerticalAlignment.Center, Margin = new Thickness(0, 0, 6, 0) };
            Func<int, TextBox> small = v => new TextBox { Text = v.ToString(), Width = 40, Margin = new Thickness(0, 0, 6, 0) };
            var sv = new CheckBox { Content = "Show the Session view", IsChecked = cur.SessionView };
            line(new UIElement[] { sv });
            var mode = new ComboBox { Width = 190, Margin = new Thickness(0, 0, 6, 0) };
            mode.Items.Add("the session I last typed in");
            mode.Items.Add("the fullest session");
            mode.SelectedIndex = cur.SessionMode == "fullest" ? 1 : 0;
            line(new UIElement[] { txt("Show"), mode });
            var sw = small(cur.SwitchSeconds);
            line(new UIElement[] { txt("Switch views every"), sw, txt("seconds (0 = don't switch)") });
            var l1 = small(cur.SessLevel1);
            var l2 = small(cur.SessLevel2);
            line(new UIElement[] { txt("Yellow at"), l1, txt("% and red at"), l2, txt("% of the compaction point") });
            line(new UIElement[] { txt("At red the strip stays on the Session view (\"Show usage\" in the menu pauses that for 10 minutes).") });
            var bl = new CheckBox { Content = "Blink at the red level", IsChecked = cur.Blink };
            line(new UIElement[] { bl });
            var nc = new CheckBox { Content = "Notify when compaction runs", IsChecked = cur.NotifyCompaction };
            line(new UIElement[] { nc });

            var btns = new StackPanel { Orientation = Orientation.Horizontal, HorizontalAlignment = HorizontalAlignment.Right };
            var reset = new Button { Content = "Defaults", Width = 75, Margin = new Thickness(0, 0, 8, 0) };
            var ok = new Button { Content = "Save", Width = 75, Margin = new Thickness(0, 0, 8, 0), IsDefault = true };
            var cancel = new Button { Content = "Cancel", Width = 75, IsCancel = true };
            btns.Children.Add(reset); btns.Children.Add(ok); btns.Children.Add(cancel);
            put(btns, 16, 0, 2);

            // Updates: reads a small version file; "Download update" only opens the download page in the browser.
            var src = Program.UpdateSource();
            CheckBox cu = null;
            if (src.Length > 0)
            {
                cu = new CheckBox { Content = "Check for updates once a day (" + new Uri(src).Host + ")", IsChecked = cur.CheckUpdates, Margin = new Thickness(0, 6, 0, 6) };
                put(cu, 13, 0, 2);
                var status = new TextBlock { Text = "Version " + Program.Version + ": " + updateStatus, Margin = new Thickness(0, 2, 0, 6), TextWrapping = TextWrapping.Wrap, MaxWidth = 380, HorizontalAlignment = HorizontalAlignment.Left };
                put(status, 14, 0, 2);
                var updBtns = new StackPanel { Orientation = Orientation.Horizontal, Margin = new Thickness(0, 0, 0, 12) };
                var checkNow = new Button { Content = "Check now", Padding = new Thickness(8, 1, 8, 1), Margin = new Thickness(0, 0, 8, 0) };
                var download = new Button { Content = "Download update", Padding = new Thickness(8, 1, 8, 1), IsEnabled = updateVersion != null, ToolTip = "Opens the download page in your browser" };
                updBtns.Children.Add(checkNow); updBtns.Children.Add(download);
                put(updBtns, 15, 0, 2);
                checkNow.Click += delegate
                {
                    checkNow.IsEnabled = false;
                    status.Text = "Checking...";
                    CheckForUpdate(true, () =>
                    {
                        status.Text = "Version " + Program.Version + ": " + updateStatus;
                        download.IsEnabled = updateVersion != null;
                        checkNow.IsEnabled = true;
                    });
                };
                download.Click += delegate { OpenUpdatePage(); };
            }

            if (Installer.IsInstalledCopy)
            {
                var uninstall = new Button { Content = "Uninstall...", Width = 90, Margin = new Thickness(0, 14, 0, 0), HorizontalAlignment = HorizontalAlignment.Left };
                put(uninstall, 17, 0, 1);
                uninstall.Click += delegate { Uninstall(dlg); };
            }

            reset.Click += delegate
            {
                var d = Settings.Defaults();
                w1.Text = d.Warn1.ToString(); w2.Text = d.Warn2.ToString(); sm.Text = d.StaleMinutes.ToString();
                nt.IsChecked = true; nr.IsChecked = true; onTop.IsChecked = true; layout.SelectedIndex = 0;
                if (cu != null) cu.IsChecked = true;
                sv.IsChecked = true; mode.SelectedIndex = 0; sw.Text = d.SwitchSeconds.ToString();
                l1.Text = d.SessLevel1.ToString(); l2.Text = d.SessLevel2.ToString(); bl.IsChecked = true; nc.IsChecked = true;
                hasPos = false; showPos();
                c1.Tag = d.ColorOk; c1.Background = Hex(d.ColorOk);
                c2.Tag = d.ColorWarn; c2.Background = Hex(d.ColorWarn);
                c3.Tag = d.ColorDanger; c3.Background = Hex(d.ColorDanger);
            };
            ok.Click += delegate
            {
                int a, b, st;
                if (!int.TryParse(w1.Text, out a) || !int.TryParse(w2.Text, out b) || a < 1 || b > 100 || a >= b)
                {
                    MessageBox.Show(dlg, "Warnings must be whole numbers from 1 to 100, and the first must be lower than the second.", Program.AppName);
                    return;
                }
                int swv, lv1, lv2;
                if (!int.TryParse(sw.Text, out swv) || swv < 0 || swv > 99)
                {
                    MessageBox.Show(dlg, "\"Switch views every\" must be a whole number of seconds from 0 to 99.", Program.AppName);
                    return;
                }
                if (!int.TryParse(l1.Text, out lv1) || !int.TryParse(l2.Text, out lv2) || lv1 < 1 || lv2 > 100 || lv1 >= lv2)
                {
                    MessageBox.Show(dlg, "The Session view levels must be whole numbers from 1 to 100, yellow lower than red.", Program.AppName);
                    return;
                }
                if (!int.TryParse(sm.Text, out st) || st < 10 || st > 1440)
                {
                    MessageBox.Show(dlg, "\"Mark figures as old\" must be a whole number of minutes from 10 to 1440.", Program.AppName);
                    return;
                }
                var s = new Settings
                {
                    Warn1 = a, Warn2 = b, Notify = nt.IsChecked == true, NotifyReset = nr.IsChecked == true, StaleMinutes = st,
                    AlwaysOnTop = onTop.IsChecked == true, HasPosition = hasPos, PosX = posX, PosY = posY,
                    Layout = layout.SelectedIndex == 1 ? "vertical" : layout.SelectedIndex == 2 ? "square" : "horizontal",
                    CheckUpdates = cu != null ? cu.IsChecked == true : cur.CheckUpdates,
                    SessionView = sv.IsChecked == true, SessionMode = mode.SelectedIndex == 1 ? "fullest" : "latest",
                    SwitchSeconds = swv, SessLevel1 = lv1, SessLevel2 = lv2, Blink = bl.IsChecked == true, NotifyCompaction = nc.IsChecked == true,
                    ColorOk = (string)c1.Tag, ColorWarn = (string)c2.Tag, ColorDanger = (string)c3.Tag
                };
                try
                {
                    SaveSettings(s);
                    SetAutostart(autostart.IsChecked == true);
                }
                catch (Exception ex)
                {
                    MessageBox.Show(dlg, "Could not save settings: " + ex.Message, Program.AppName);
                    return;
                }
                var wasSaved = settings.HasPosition;
                settings = s;
                Topmost = s.AlwaysOnTop;
                if (wasSaved && !s.HasPosition) SnapTop();
                warned.Clear(); silent = true; Refresh(); silent = false;
                dlg.Close();
            };

            dlg.Content = grid;
            dlg.ShowDialog();
        }

        void Uninstall(Window dlg)
        {
            if (!Installer.ConfirmAndUninstall(dlg, false)) return;
            dlg.Close();
            Close();
        }

        void ShowAbout()
        {
            MessageBox.Show(
                Program.AppName + "  -  version " + Program.Version + "\n\nMade by " + Program.Author +
                "\nCopyright (c) 2026 " + Program.Author + ". MIT License." +
                "\n\nShows your Claude 5-hour and weekly usage on top of your screen, with colours and warnings as you approach your limits." +
                "\n\nThe Session view shows how full the context window of your Claude Code sessions on this PC is, measured against the point where compaction starts." +
                "\n\nFigures update when a Claude Code session starts or replies. Usage in the Chat tab counts toward the limits but doesn't update the strip." +
                "\n\nIts only network use is the optional daily update check, which reads a small version file from hanstandt.be. You can switch it off in Settings." +
                "\n\nUnofficial community project. Not affiliated with, endorsed by or sponsored by Anthropic. \"Claude\" is a trademark of Anthropic.",
                "About " + Program.AppName, MessageBoxButton.OK, MessageBoxImage.Information);
        }
    }
}
