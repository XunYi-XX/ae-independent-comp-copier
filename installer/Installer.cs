using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Drawing;
using System.IO;
using System.Reflection;
using System.Security.Cryptography;
using System.Text;
using System.Windows.Forms;
using Microsoft.Win32;

[assembly: AssemblyTitle("AE 独立合成复制器安装程序")]
[assembly: AssemblyDescription("Install or uninstall the Independent Comp Copier ScriptUI panel")]
[assembly: AssemblyCompany("XunYi-XX")]
[assembly: AssemblyProduct("AE Independent Comp Copier")]
[assembly: AssemblyVersion("1.0.0.0")]
[assembly: AssemblyFileVersion("1.0.0.0")]

internal static class PanelInstaller
{
    internal const string PanelName = "Independent Comp Copier.jsx";
    private const string Marker = "// Independent Comp Copier ";

    internal static byte[] Payload()
    {
        using (Stream stream = Assembly.GetExecutingAssembly().GetManifestResourceStream("PanelPayload"))
        {
            if (stream == null) throw new InvalidOperationException("安装包缺少内置插件，请重新下载。");
            using (MemoryStream memory = new MemoryStream()) { stream.CopyTo(memory); return memory.ToArray(); }
        }
    }

    internal static string Hash(byte[] data)
    {
        using (SHA256 sha = SHA256.Create()) return BitConverter.ToString(sha.ComputeHash(data)).Replace("-", "").ToLowerInvariant();
    }

    internal static string SupportDirectory(string input)
    {
        if (String.IsNullOrWhiteSpace(input)) throw new ArgumentException("请选择 AfterFX.exe 或 AE 安装目录。");
        string path = Path.GetFullPath(input.Trim().Trim('"'));
        if (File.Exists(path))
        {
            if (!String.Equals(Path.GetFileName(path), "AfterFX.exe", StringComparison.OrdinalIgnoreCase))
                throw new ArgumentException("请选择 Adobe After Effects 的 AfterFX.exe。");
            path = Path.GetDirectoryName(path);
        }
        if (!File.Exists(Path.Combine(path, "AfterFX.exe")))
        {
            string support = Path.Combine(path, "Support Files");
            if (File.Exists(Path.Combine(support, "AfterFX.exe"))) path = support;
            else throw new DirectoryNotFoundException("目录中找不到 AfterFX.exe，请通过“浏览”选择 AE 主程序。");
        }
        return path.TrimEnd(Path.DirectorySeparatorChar, Path.AltDirectorySeparatorChar);
    }

    internal static string Destination(string input)
    {
        return Path.Combine(SupportDirectory(input), "Scripts", "ScriptUI Panels", PanelName);
    }

    internal static string Install(string input)
    {
        string target = Destination(input);
        byte[] data = Payload();
        if (File.Exists(target))
        {
            byte[] existing = File.ReadAllBytes(target);
            if (Hash(existing) == Hash(data)) return "已经安装当前版本，无需重复安装。\r\n" + target;
            string text = Encoding.UTF8.GetString(existing).TrimStart('\ufeff');
            if (!text.StartsWith(Marker, StringComparison.Ordinal))
                throw new IOException("同名文件不是本插件，未覆盖。请先备份并重命名该文件：\r\n" + target);
        }
        Directory.CreateDirectory(Path.GetDirectoryName(target));
        string temporary = target + ".tmp-" + Guid.NewGuid().ToString("N");
        string backup = null;
        try
        {
            File.WriteAllBytes(temporary, data);
            if (File.Exists(target))
            {
                backup = target + ".backup-" + DateTime.Now.ToString("yyyyMMdd-HHmmss-fff") + "-" + Guid.NewGuid().ToString("N").Substring(0, 6);
                File.Replace(temporary, target, backup);
            }
            else File.Move(temporary, target);
            if (Hash(File.ReadAllBytes(target)) != Hash(data)) throw new IOException("安装文件校验失败，请重试。");
        }
        finally { if (File.Exists(temporary)) File.Delete(temporary); }
        return "安装成功。请保存工作后自行重启 AE，然后在“窗口”菜单打开面板。\r\n" + target +
            (backup == null ? "" : "\r\n旧版本备份：" + backup);
    }

    internal static string Uninstall(string input)
    {
        string target = Destination(input);
        if (!File.Exists(target)) return "这个 AE 版本尚未安装本插件。";
        if (Hash(File.ReadAllBytes(target)) != Hash(Payload()))
            throw new IOException("已安装文件与本安装包版本不同，或已手动修改；为保留修改，未删除。请使用匹配版本的安装包，或先自行备份。\r\n" + target);
        File.Delete(target);
        return "插件面板已移除。工程、素材和旧版本备份均保留。请自行重启 AE。";
    }

    private static void AddCandidate(List<string> result, string input)
    {
        if (String.IsNullOrWhiteSpace(input)) return;
        try
        {
            string folder = SupportDirectory(input);
            foreach (string current in result) if (String.Equals(current, folder, StringComparison.OrdinalIgnoreCase)) return;
            result.Add(folder);
        }
        catch (Exception) { }
    }

    internal static List<string> Discover()
    {
        List<string> result = new List<string>();
        // Running AE is authoritative for custom installation drives and paths.
        foreach (Process process in Process.GetProcessesByName("AfterFX"))
        {
            try { AddCandidate(result, process.MainModule.FileName); }
            catch (Exception) { }
            finally { process.Dispose(); }
        }
        foreach (RegistryHive hive in new RegistryHive[] { RegistryHive.LocalMachine, RegistryHive.CurrentUser })
        foreach (RegistryView view in new RegistryView[] { RegistryView.Registry64, RegistryView.Registry32 })
        {
            try
            {
                using (RegistryKey registry = RegistryKey.OpenBaseKey(hive, view))
                {
                    using (RegistryKey adobe = registry.OpenSubKey(@"SOFTWARE\Adobe\After Effects"))
                    {
                        if (adobe != null) foreach (string version in adobe.GetSubKeyNames())
                        using (RegistryKey entry = adobe.OpenSubKey(version))
                        {
                            if (entry == null) continue;
                            foreach (string name in new string[] { "InstallPath", "InstallPath64", "Path" })
                                AddCandidate(result, entry.GetValue(name) as string);
                        }
                    }
                    using (RegistryKey uninstall = registry.OpenSubKey(@"SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall"))
                    {
                        if (uninstall != null) foreach (string name in uninstall.GetSubKeyNames())
                        using (RegistryKey entry = uninstall.OpenSubKey(name))
                        {
                            if (entry == null) continue;
                            string display = entry.GetValue("DisplayName") as string;
                            if (display != null && display.IndexOf("After Effects", StringComparison.OrdinalIgnoreCase) >= 0)
                                AddCandidate(result, entry.GetValue("InstallLocation") as string);
                        }
                    }
                }
            }
            catch (Exception) { }
        }
        foreach (string programFiles in new string[] { Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles), Environment.GetFolderPath(Environment.SpecialFolder.ProgramFilesX86) })
        {
            try
            {
                string adobe = Path.Combine(programFiles, "Adobe");
                if (Directory.Exists(adobe)) foreach (string folder in Directory.GetDirectories(adobe, "Adobe After Effects*")) AddCandidate(result, folder);
            }
            catch (Exception) { }
        }
        return result;
    }

    internal static void SelfTest(string reportPath)
    {
        string tempBase = Path.GetFullPath(Path.GetTempPath());
        string testRoot = Path.GetFullPath(Path.Combine(tempBase, "IIC-Installer-Test-" + Guid.NewGuid().ToString("N")));
        if (!testRoot.StartsWith(tempBase, StringComparison.OrdinalIgnoreCase)) throw new IOException("Invalid test directory");
        List<string> checks = new List<string>();
        try
        {
            string support = Path.Combine(testRoot, "Adobe After Effects Test", "Support Files");
            Directory.CreateDirectory(support); File.WriteAllText(Path.Combine(support, "AfterFX.exe"), "test-only placeholder");
            string target = Destination(support);
            string unrelated = Path.Combine(support, "project.aep"); File.WriteAllText(unrelated, "preserved");
            Install(support); if (Hash(File.ReadAllBytes(target)) != Hash(Payload())) throw new Exception("fresh installation"); checks.Add("fresh installation with exact embedded payload");
            string firstMessage = Install(support); if (firstMessage.IndexOf("无需重复安装") < 0) throw new Exception("idempotence"); checks.Add("repeat installation is idempotent");
            File.WriteAllText(target, Marker + "0.9.0\nold version", new UTF8Encoding(true));
            Install(support); string[] backups = Directory.GetFiles(Path.GetDirectoryName(target), PanelName + ".backup-*");
            if (backups.Length != 1 || File.ReadAllText(backups[0]).IndexOf("old version") < 0) throw new Exception("upgrade backup"); checks.Add("upgrade preserves previous version backup");
            File.AppendAllText(target, "\nuser customization");
            bool refused = false; try { Uninstall(support); } catch (IOException) { refused = true; }
            if (!refused || !File.Exists(target)) throw new Exception("modified file protection"); checks.Add("uninstall refuses user-modified panel");
            File.WriteAllBytes(target, Payload()); Uninstall(support);
            if (File.Exists(target) || !File.Exists(backups[0]) || File.ReadAllText(unrelated) != "preserved") throw new Exception("uninstall scope"); checks.Add("uninstall removes only its exact panel and preserves projects and backups");
            File.WriteAllText(target, "unrelated same-name file");
            refused = false; try { Install(support); } catch (IOException) { refused = true; }
            if (!refused || File.ReadAllText(target) != "unrelated same-name file") throw new Exception("name collision"); checks.Add("installation refuses unrelated same-name file");
            if (SupportDirectory(Path.GetDirectoryName(support)) != support || SupportDirectory(Path.Combine(support, "AfterFX.exe")) != support) throw new Exception("path normalization"); checks.Add("AE root, Support Files, and AfterFX.exe paths resolve consistently");
            checks.Add("AE detection found " + Discover().Count + " installation(s)");
            File.WriteAllText(reportPath, "PASS\r\n" + String.Join("\r\n", checks.ToArray()) + "\r\nSHA256=" + Hash(Payload()), new UTF8Encoding(false));
        }
        finally
        {
            // Delete only the verified, randomly named temporary test directory.
            if (Directory.Exists(testRoot) && Path.GetFullPath(testRoot).StartsWith(tempBase, StringComparison.OrdinalIgnoreCase)
                && Path.GetFileName(testRoot).StartsWith("IIC-Installer-Test-", StringComparison.Ordinal)) Directory.Delete(testRoot, true);
        }
    }
}

internal sealed class InstallerForm : Form
{
    private readonly ComboBox locations = new ComboBox();
    private readonly TextBox status = new TextBox();
    private readonly Button install = new Button();
    private readonly Button uninstall = new Button();

    internal InstallerForm()
    {
        Text = "AE 独立合成复制器 · 安装 / 卸载";
        Font = new Font("Microsoft YaHei UI", 10F); AutoScaleMode = AutoScaleMode.Dpi;
        ClientSize = new Size(740, 450); MinimumSize = new Size(660, 450); StartPosition = FormStartPosition.CenterScreen;
        TableLayoutPanel layout = new TableLayoutPanel(); layout.Dock = DockStyle.Fill; layout.Padding = new Padding(24); layout.ColumnCount = 3;
        layout.ColumnStyles.Add(new ColumnStyle(SizeType.Percent, 100)); layout.ColumnStyles.Add(new ColumnStyle(SizeType.Absolute, 92)); layout.ColumnStyles.Add(new ColumnStyle(SizeType.Absolute, 92));
        layout.RowCount = 7;
        layout.RowStyles.Add(new RowStyle(SizeType.Absolute, 44)); layout.RowStyles.Add(new RowStyle(SizeType.Absolute, 44)); layout.RowStyles.Add(new RowStyle(SizeType.Absolute, 28));
        layout.RowStyles.Add(new RowStyle(SizeType.Absolute, 38)); layout.RowStyles.Add(new RowStyle(SizeType.Absolute, 48)); layout.RowStyles.Add(new RowStyle(SizeType.Percent,100)); layout.RowStyles.Add(new RowStyle(SizeType.Absolute, 40));
        Label title = new Label(); title.Text = "独立合成复制器  1.0.0"; title.Font = new Font(Font.FontFamily, 18F, FontStyle.Bold); title.AutoSize = true; title.Dock = DockStyle.Fill;
        layout.Controls.Add(title,0,0); layout.SetColumnSpan(title,3);
        Label description = new Label(); description.Text = "复制嵌套合成、重定向表达式，可独立修改文字、控制器和图片。\r\n插件已内置在本安装包中，无需下载其他文件。"; description.Dock = DockStyle.Fill; description.AutoSize = true;
        layout.Controls.Add(description,0,1); layout.SetColumnSpan(description,3);
        Label label = new Label(); label.Text = "选择 AE 安装位置（可粘贴 AfterFX.exe 的完整路径）："; label.AutoSize = true; label.Dock = DockStyle.Fill;
        layout.Controls.Add(label,0,2); layout.SetColumnSpan(label,3);
        locations.Dock = DockStyle.Fill; locations.DropDownStyle = ComboBoxStyle.DropDown;
        layout.Controls.Add(locations,0,3);
        Button browse = new Button(); browse.Text = "浏览…"; browse.Dock = DockStyle.Fill;
        browse.Click += delegate { using (OpenFileDialog dialog = new OpenFileDialog()) { dialog.Title = "选择 Adobe After Effects 的 AfterFX.exe"; dialog.Filter = "After Effects (AfterFX.exe)|AfterFX.exe"; if (dialog.ShowDialog(this) == DialogResult.OK) locations.Text = dialog.FileName; } };
        layout.Controls.Add(browse,1,3);
        Button refresh = new Button(); refresh.Text = "重新检测"; refresh.Dock = DockStyle.Fill; refresh.Click += delegate { Detect(); }; layout.Controls.Add(refresh,2,3);
        FlowLayoutPanel actions = new FlowLayoutPanel(); actions.Dock = DockStyle.Fill;
        install.Text = "安装 / 更新"; install.AutoSize = true; install.Height = 34; install.Click += delegate { Run(false); };
        uninstall.Text = "卸载插件"; uninstall.AutoSize = true; uninstall.Height = 34; uninstall.Click += delegate { Run(true); };
        actions.Controls.Add(install); actions.Controls.Add(uninstall); layout.Controls.Add(actions,0,4); layout.SetColumnSpan(actions,3);
        status.Multiline = true; status.ReadOnly = true; status.ScrollBars = ScrollBars.Vertical; status.Dock = DockStyle.Fill; status.BackColor = SystemColors.Window;
        layout.Controls.Add(status,0,5); layout.SetColumnSpan(status,3);
        Label note = new Label(); note.Text = "安装不会关闭 AE。完成后请自行保存工作并重启 AE；面板位于“窗口”菜单底部。"; note.Dock = DockStyle.Fill; note.AutoSize = true; layout.Controls.Add(note,0,6); layout.SetColumnSpan(note,3);
        Controls.Add(layout); Detect();
    }

    private void Detect()
    {
        string previous = locations.Text; locations.Items.Clear();
        foreach (string path in PanelInstaller.Discover()) locations.Items.Add(path);
        if (locations.Items.Count > 0) locations.SelectedIndex = 0;
        else locations.Text = previous;
        status.Text = locations.Items.Count > 0 ? "已检测到 " + locations.Items.Count + " 个 AE 安装位置。请选择后点击安装。" : "未自动找到 AE。点击“浏览”选择 AfterFX.exe，或粘贴安装路径。";
    }

    private void Run(bool remove)
    {
        if (remove && MessageBox.Show(this, "移除所选 AE 版本的独立合成复制器面板？\r\n工程、素材和旧版本备份会保留。", "卸载插件", MessageBoxButtons.YesNo, MessageBoxIcon.Question) != DialogResult.Yes) return;
        install.Enabled = uninstall.Enabled = false;
        try { status.Text = remove ? PanelInstaller.Uninstall(locations.Text) : PanelInstaller.Install(locations.Text); }
        catch (UnauthorizedAccessException) { status.Text = "这个 AE 目录需要写入权限。请关闭本安装窗口，右键本安装包，选择“以管理员身份运行”后重试。\r\n安装程序不会修改系统安全设置。"; }
        catch (Exception error) { status.Text = "操作未完成：\r\n" + error.Message; }
        finally { install.Enabled = uninstall.Enabled = true; }
    }
}

internal static class Program
{
    [STAThread]
    private static int Main(string[] args)
    {
        if (args.Length == 2 && args[0] == "/self-test")
        {
            try { PanelInstaller.SelfTest(Path.GetFullPath(args[1])); return 0; }
            catch (Exception error) { File.WriteAllText(Path.GetFullPath(args[1]), "FAIL\r\n" + error, new UTF8Encoding(false)); return 1; }
        }
        Application.EnableVisualStyles(); Application.SetCompatibleTextRenderingDefault(false);
        Application.Run(new InstallerForm()); return 0;
    }
}
