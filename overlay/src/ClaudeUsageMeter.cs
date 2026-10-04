// Claude Usage Meter - always-on-top strip showing Claude's 5-hour and weekly usage.
// Reads ~/.claude/usage-meter.json, written by the usage-meter Claude Code plugin.
// Drag to move; right-click the strip or the tray icon for the menu.
// Built with the C# 5 compiler that ships with Windows (see overlay/build.ps1).

using System;
using System.Collections;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Reflection;
using System.Text;
using System.Threading;
using System.Web.Script.Serialization;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Input;
using System.Windows.Media;
using System.Windows.Shapes;
using System.Windows.Threading;
using Forms = System.Windows.Forms;
using Drawing = System.Drawing;

[assembly: AssemblyTitle("Claude Usage Meter")]
[assembly: AssemblyProduct("Claude Usage Meter")]
[assembly: AssemblyCompany("Hans Tandt")]
[assembly: AssemblyCopyright("Copyright (c) 2026 Hans Tandt. MIT License.")]
[assembly: AssemblyVersion("1.2.0.0")]
[assembly: AssemblyFileVersion("1.2.0.0")]

namespace ClaudeUsageMeter
{
    public class Settings
    {
        public int Warn1 { get; set; }
        public int Warn2 { get; set; }
        public bool Notify { get; set; }
        public string ColorOk { get; set; }
        public string ColorWarn { get; set; }
        public string ColorDanger { get; set; }

        public static Settings Defaults()
        {
            return new Settings { Warn1 = 80, Warn2 = 95, Notify = true, ColorOk = "#3FB950", ColorWarn = "#F0883E", ColorDanger = "#F85149" };
        }
    }

    public static class Program
    {
        public const string AppName = "Claude Usage Meter";
        public const string Version = "1.2";
        public const string Author = "Hans Tandt";

        [STAThread]
        public static void Main()
        {
            bool isFirst;
            using (var mutex = new Mutex(true, "Local\\ClaudeUsageMeterOverlay", out isFirst))
            {
                if (!isFirst) return;
                var app = new Application();
                app.ShutdownMode = ShutdownMode.OnMainWindowClose;
                app.Run(new Strip());
            }
        }
    }

    public class Strip : Window
    {
        static readonly string ClaudeDir = System.IO.Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.UserProfile), ".claude");
        static readonly string DataFile = System.IO.Path.Combine(ClaudeDir, "usage-meter.json");
        static readonly string SettingsFile = System.IO.Path.Combine(ClaudeDir, "usage-meter-settings.json");
        static readonly string StartupLnk = System.IO.Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.Startup), Program.AppName + ".lnk");
        static readonly string ExePath = Process.GetCurrentProcess().MainModule.FileName;
        static readonly Dictionary<string, string> Labels = new Dictionary<string, string> { { "five_hour", "5h" }, { "seven_day", "Week" }, { "spend_limit", "Spend" } };

        static readonly Brush Track = Hex("#3A3A3A"), Dim = Hex("#9A9A9A"), White = Hex("#EDEDED");

        readonly StackPanel row = new StackPanel { Orientation = Orientation.Horizontal };
        readonly Forms.NotifyIcon tray;
        readonly Dictionary<string, int> warned = new Dictionary<string, int>();
        Settings settings;
        bool silent = true; // first pass seeds warning state without notifications
        bool placed;

        public Strip()
        {
            settings = LoadSettings();
            Title = Program.AppName;
            WindowStyle = WindowStyle.None;
            AllowsTransparency = true;
            Background = Brushes.Transparent;
            Topmost = true;
            ShowInTaskbar = false;
            SizeToContent = SizeToContent.WidthAndHeight;
            ResizeMode = ResizeMode.NoResize;

            var border = new Border
            {
                Background = Hex("#E61E1E1E"), CornerRadius = new CornerRadius(8), Padding = new Thickness(12, 5, 12, 5),
                BorderThickness = new Thickness(1), BorderBrush = Hex("#444444"), ToolTip = "Right-click for menu", Child = row
            };
            Content = border;

            var menu = new ContextMenu();
            menu.Items.Add(Item("Settings...", ShowSettings));
            menu.Items.Add(Item("Move to top centre", SnapTop));
            menu.Items.Add(Item("About", ShowAbout));
            menu.Items.Add(new Separator());
            menu.Items.Add(Item("Close " + Program.AppName, Close));
            border.ContextMenu = menu;

            tray = new Forms.NotifyIcon { Visible = true, Text = Program.AppName };
            try { tray.Icon = Drawing.Icon.ExtractAssociatedIcon(ExePath); } catch { tray.Icon = Drawing.SystemIcons.Information; }
            var trayMenu = new Forms.ContextMenuStrip();
            trayMenu.Items.Add("Settings...", null, delegate { ShowSettings(); });
            trayMenu.Items.Add("Move to top centre", null, delegate { Show(); SnapTop(); });
            trayMenu.Items.Add("About", null, delegate { ShowAbout(); });
            trayMenu.Items.Add("-");
            trayMenu.Items.Add("Close " + Program.AppName, null, delegate { Close(); });
            tray.ContextMenuStrip = trayMenu;
            tray.DoubleClick += delegate { Show(); SnapTop(); };

            MouseLeftButtonDown += delegate { try { DragMove(); } catch { } };
            ContentRendered += delegate { if (!placed) { SnapTop(); placed = true; } };
            Closed += delegate { tray.Visible = false; tray.Dispose(); };

            Refresh();
            silent = false;
            var timer = new DispatcherTimer { Interval = TimeSpan.FromSeconds(3) };
            timer.Tick += delegate { Refresh(); };
            timer.Start();
        }

        // ---------- helpers ----------

        static Brush Hex(string hex) { return (Brush)new BrushConverter().ConvertFromString(hex); }

        static MenuItem Item(string header, Action action)
        {
            var m = new MenuItem { Header = header };
            m.Click += delegate { action(); };
            return m;
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

        static string ResetIn(object iso)
        {
            if (iso == null) return "";
            DateTimeOffset at;
            if (!DateTimeOffset.TryParse(iso.ToString(), out at)) return "";
            var mins = Math.Max(0, (int)(at - DateTimeOffset.Now).TotalMinutes);
            if (mins >= 1440) return string.Format("{0}d {1}h", mins / 1440, (mins % 1440) / 60);
            if (mins >= 60) return string.Format("{0}h {1}m", mins / 60, mins % 60);
            return mins + "m";
        }

        void AddText(string text, Brush brush, bool bold = false)
        {
            row.Children.Add(new TextBlock
            {
                Text = text, Foreground = brush, FontSize = 13, VerticalAlignment = VerticalAlignment.Center,
                FontFamily = new FontFamily("Segoe UI"), Margin = new Thickness(0, 0, 6, 0),
                FontWeight = bold ? FontWeights.Bold : FontWeights.Normal
            });
        }

        void AddBar(double pct, Brush brush)
        {
            var g = new Grid { Width = 110, Height = 8, VerticalAlignment = VerticalAlignment.Center, Margin = new Thickness(0, 0, 6, 0) };
            g.Children.Add(new Rectangle { Fill = Track, RadiusX = 4, RadiusY = 4 });
            g.Children.Add(new Rectangle
            {
                Fill = brush, RadiusX = 4, RadiusY = 4, HorizontalAlignment = HorizontalAlignment.Left,
                Width = Math.Max(0, Math.Min(110, 110 * pct / 100))
            });
            row.Children.Add(g);
        }

        // ---------- data ----------

        void Refresh()
        {
            row.Children.Clear();
            string raw = null;
            try { if (File.Exists(DataFile)) raw = File.ReadAllText(DataFile); } catch { }
            if (string.IsNullOrWhiteSpace(raw)) { AddText("Claude usage: open a Claude Code session to start", Dim); return; }

            ArrayList windows = null;
            try
            {
                var data = new JavaScriptSerializer().Deserialize<Dictionary<string, object>>(raw);
                object w;
                if (data.TryGetValue("windows", out w)) windows = w as ArrayList;
            }
            catch { }
            if (windows == null || windows.Count == 0) { AddText("Claude usage: waiting for first reply", Dim); return; }

            var first = true;
            foreach (Dictionary<string, object> w in windows)
            {
                if (!first) AddText("  ", Dim);
                first = false;
                var kind = Convert.ToString(w["kind"]);
                var pct = Convert.ToDouble(w["percentUsed"]);
                string label;
                if (!Labels.TryGetValue(kind, out label)) label = kind;
                var c = ColorFor(pct);
                AddText(label, White);
                AddBar(pct, c);
                AddText(pct + "%", c, pct >= settings.Warn2);
                object resetsAt;
                w.TryGetValue("resetsAt", out resetsAt);
                var r = ResetIn(resetsAt);
                if (r != "") AddText("· " + r, Dim);

                // Notify once per threshold crossing; re-arms when usage drops back below it.
                var hit = pct >= settings.Warn2 ? settings.Warn2 : pct >= settings.Warn1 ? settings.Warn1 : 0;
                int before;
                warned.TryGetValue(kind, out before);
                if (hit > before && !silent && settings.Notify)
                    tray.ShowBalloonTip(5000, Program.AppName, label + " usage at " + pct + "%", Forms.ToolTipIcon.Warning);
                warned[kind] = hit;
            }
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
                { "warn1", s.Warn1 }, { "warn2", s.Warn2 }, { "notify", s.Notify },
                { "colorOk", s.ColorOk }, { "colorWarn", s.ColorWarn }, { "colorDanger", s.ColorDanger }
            };
            File.WriteAllText(SettingsFile, new JavaScriptSerializer().Serialize(d), new UTF8Encoding(false));
        }

        static bool IsAutostart() { return File.Exists(StartupLnk); }

        static void SetAutostart(bool on)
        {
            if (!on) { if (File.Exists(StartupLnk)) File.Delete(StartupLnk); return; }
            dynamic shell = Activator.CreateInstance(Type.GetTypeFromProgID("WScript.Shell"));
            dynamic lnk = shell.CreateShortcut(StartupLnk);
            lnk.TargetPath = ExePath;
            lnk.WorkingDirectory = System.IO.Path.GetDirectoryName(ExePath);
            lnk.Description = Program.AppName;
            lnk.Save();
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
            for (var i = 0; i < 8; i++) grid.RowDefinitions.Add(new RowDefinition { Height = GridLength.Auto });

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
            label("Normal colour", 3); var c1 = colorButton(cur.ColorOk, 3);
            label("First warning colour", 4); var c2 = colorButton(cur.ColorWarn, 4);
            label("Second warning colour", 5); var c3 = colorButton(cur.ColorDanger, 5);
            var autostart = new CheckBox { Content = "Start automatically when I log in to Windows", IsChecked = IsAutostart(), Margin = new Thickness(0, 6, 0, 12) };
            put(autostart, 6, 0, 2);

            var btns = new StackPanel { Orientation = Orientation.Horizontal, HorizontalAlignment = HorizontalAlignment.Right };
            var reset = new Button { Content = "Defaults", Width = 75, Margin = new Thickness(0, 0, 8, 0) };
            var ok = new Button { Content = "Save", Width = 75, Margin = new Thickness(0, 0, 8, 0), IsDefault = true };
            var cancel = new Button { Content = "Cancel", Width = 75, IsCancel = true };
            btns.Children.Add(reset); btns.Children.Add(ok); btns.Children.Add(cancel);
            put(btns, 7, 0, 2);

            reset.Click += delegate
            {
                var d = Settings.Defaults();
                w1.Text = d.Warn1.ToString(); w2.Text = d.Warn2.ToString(); nt.IsChecked = true;
                c1.Tag = d.ColorOk; c1.Background = Hex(d.ColorOk);
                c2.Tag = d.ColorWarn; c2.Background = Hex(d.ColorWarn);
                c3.Tag = d.ColorDanger; c3.Background = Hex(d.ColorDanger);
            };
            ok.Click += delegate
            {
                int a, b;
                if (!int.TryParse(w1.Text, out a) || !int.TryParse(w2.Text, out b) || a < 1 || b > 100 || a >= b)
                {
                    MessageBox.Show(dlg, "Warnings must be whole numbers from 1 to 100, and the first must be lower than the second.", Program.AppName);
                    return;
                }
                var s = new Settings { Warn1 = a, Warn2 = b, Notify = nt.IsChecked == true, ColorOk = (string)c1.Tag, ColorWarn = (string)c2.Tag, ColorDanger = (string)c3.Tag };
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
                settings = s;
                warned.Clear(); silent = true; Refresh(); silent = false;
                dlg.Close();
            };

            dlg.Content = grid;
            dlg.ShowDialog();
        }

        void ShowAbout()
        {
            MessageBox.Show(
                Program.AppName + "  -  version " + Program.Version + "\n\nMade by " + Program.Author +
                "\nCopyright (c) 2026 " + Program.Author + ". MIT License." +
                "\n\nShows your Claude 5-hour and weekly usage on top of your screen, with colours and warnings as you approach your limits." +
                "\n\nFigures update while a Claude Code session is open.",
                "About " + Program.AppName, MessageBoxButton.OK, MessageBoxImage.Information);
        }
    }
}
