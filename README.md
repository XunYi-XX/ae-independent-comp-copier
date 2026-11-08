# AE 独立合成复制器 / Independent Comp Copier 1.0.1

[中文](#中文说明) · [English](#english) · [更新日志 / Changelog](CHANGELOG.md)

## 中文说明

复制已有合成、嵌套合成及表达式引用的控制合成。每个副本和对应原合成同目录，以名称区分。中文 ScriptUI 面板支持一次创建 1–20 份，默认沿用原素材项目。

## 安装与打开

Windows 用户可直接运行 **AE-Independent-Comp-Copier-Setup-v1.0.1.exe**，选择检测到的 AE 版本，点击“安装 / 更新”。安装程序内置面板文件，不需要 Python、Node 或在线下载，使用 Windows 自带的 .NET Framework 4.x。也可通过“浏览”指定自定义目录里的 AfterFX.exe。若 AE 安装目录受保护，需由用户右键安装包选择“以管理员身份运行”。

重复安装相同文件不会改动。升级会保留带 `.backup-时间戳` 后缀的旧面板；安装程序内的“卸载插件”只移除匹配版本的面板，保留工程、素材和旧备份。检测到手动改过的面板或无关同名文件时会停止，不覆盖或删除。安装 / 卸载均不关闭 AE。

手动安装方式：

将 `dist/Independent Comp Copier.jsx` 放到 AE 的 `Scripts/ScriptUI Panels` 目录。在本机的路径为：

`D:/ADOBE/Ae/Adobe After Effects 2026/Support Files/Scripts/ScriptUI Panels`

重启 AE 后，在“窗口”菜单底部打开 **Independent Comp Copier.jsx**，可停靠到工作区。立即使用时，可在“文件 → 脚本 → 运行脚本文件”选择同一个 JSX，面板以浮动窗口打开，无需重启。

## 使用

1. 在项目面板选中一个源合成，点击“读取选中合成”。也支持读取当前打开的合成。
2. 输入新合成名称和复制数量。默认共用原素材项目，需要独立换图时可勾选“独立复制素材项目（可选）”。
3. 点击“分析依赖”查看合成、素材、表达式及需要处理的问题。
4. 点击“创建独立副本”。主合成、嵌套合成和控制合成的副本都放在各自原件的目录里。面板列出主合成副本名称，并保留项目面板原有选择和视图。默认模式只新增合成。

复制操作合并为一个撤销步骤。工程仍由用户按自己的路径保存。面板不调用网络、不修改 AE 偏好，也不要求开启“允许脚本写入文件和访问网络”。

## 独立范围

- 每份副本都有自己的嵌套合成、文字、相机、控制器、效果、关键帧、父级及遮罩关系。
- 静态 `comp("合成名")` 引用指向副本，包括仅通过表达式引用的外部控制合成。静态 `footage("素材名")` 引用随素材复制选项处理。字符串支持单 / 双引号、Unicode 转义，注释、普通文本、正则文本保持不变。
- 保留图层名称，所以 `thisComp.layer("名称")`、图层索引、局部图层控制表达式延续原有结构；`thisComp`、`thisLayer` 本来就随副本运行。
- 默认共用图片、视频、音频等原素材项目。只换一个副本的图片时，在该合成中替换目标图层的来源。项目面板里的“替换素材”会影响所有引用。
- 勾选“独立复制素材项目（可选）”时，重新创建素材项目及纯色源，并放入对应副本的独立素材目录。磁盘上的文件仍共用，直接编辑或覆盖磁盘原文件会影响所有引用。
- 同一份副本内重复使用的同一嵌套合成仍只复制一次，保持原有内部共享关系；不同份之间不共用副本。

## 明确的支持边界

当前版本对无法可靠改写的情况停止执行并定位到合成 / 图层 / 属性：动态 `comp(变量)`、名称拼接、间接调用、`eval` / `Function`、模板字符串、同名的引用目标、基本属性 / 媒体替换覆盖。可先将引用改为明确的 `comp("固定名称")`，给引用目标取唯一名称，再分析。

独立素材模式暂不自动重建图像序列、代理、离线 / 占位素材、PSD / AI 分层素材或三维素材。可手动准备这些素材，或使用默认共用素材模式。插件不会猜测分层导入参数。

这是静态依赖工具，不能证明任意 JavaScript 程序在所有时刻的行为。表达式中自定义名称判断、外部脚本 / 磁盘路径、特殊第三方效果等应在副本中检查。创建后会在首 / 中 / 末三个时刻评估启用的表达式，并核对图层引用、时序、父级、遮罩。执行失败时移除本次创建的项目，报告原因；原合成不写入。

## 开发与验证

- `python build.py`：生成单文件面板及 ZIP 安装包。
- `python build.py --installer`：在 Windows 用系统 .NET Framework C# 编译器生成内置插件的独立 EXE 和 Windows 安装包 ZIP。
- `AE-Independent-Comp-Copier-Setup-v1.0.1.exe /self-test C:/work/installer-test.txt` 在临时目录验证安装、重复安装、升级备份、卸载及文件保护。
- `node tests/lex.test.cjs`：表达式扫描、精确改写、转义、重复名称测试。
- `node tests/panel.test.cjs`：停靠面板回调、复制前自定义名称、数量输入及读取 / 分析按钮流程。
- `tests/ae-smoke.jsx`：在 AE 内创建临时夹具，验证深层合成、控制器表达式、素材隔离、多份副本、文字修改及失败回滚；不会打开 / 保存 / 关闭用户工程，结束时清理临时项目并恢复选择。

AE 2026 实机验证。使用其他 AE 版本时建议先在副本工程中验证。

v1.0.0 的历史验证见 `validation.json`。v1.0.1 的测试覆盖同目录复制、保留选择、默认复用嵌套层中的原图片及批量回滚。

API 参考：[Adobe 脚本说明](https://helpx.adobe.com/after-effects/desktop/automate-in-after-effects/automate-animation/scripts.html)、[AE Scripting Guide](https://ae-scripting.docsforadobe.dev/)。

发布流程可在 GitHub Actions 中手动运行“Build Windows installer and release”，从当前提交构建 v1.0.1，并上传独立 EXE、Windows ZIP、JSX 和 SHA-256 校验值。流程拒绝覆盖内容不同的已发布文件。

## English

Independent Comp Copier is a Chinese-language ScriptUI panel for After Effects. It duplicates a composition, its nested compositions, and control compositions referenced by expressions. Copies sit beside their respective originals and are distinguished by name. You can create 1–20 independent copies in one operation. They reuse the original footage items by default.

### Install and open

On Windows, run **AE-Independent-Comp-Copier-Setup-v1.0.1.exe**, choose the detected After Effects installation, and select Install / Update. The installer contains the JSX and uses Windows .NET Framework 4.x. You can browse to `AfterFX.exe` manually. Run the installer as administrator if the AE installation folder is protected.

Reinstalling identical files skips the write. An upgrade backs up the previous panel with a `.backup-<timestamp>` suffix. The uninstaller removes only a panel matching its embedded version and preserves projects, media and backups. Installation and removal leave AE running.

For manual installation, copy `dist/Independent Comp Copier.jsx` to the AE `Support Files/Scripts/ScriptUI Panels` folder. Restart AE and open **Independent Comp Copier.jsx** from **Window** to dock the panel. To open a floating panel immediately, use **File → Scripts → Run Script File**.

### Use the panel

1. Select a source composition in the Project panel, then click **读取选中合成** (Read Selected Comp). You can also read the currently open comp.
2. Enter a name and number of copies. Enable **独立复制素材项目（可选）** (Duplicate Footage Items) if you need independent project-level footage replacement.
3. Click **分析依赖** (Analyze Dependencies) to inspect compositions, footage, expressions and issues.
4. Click **创建独立副本** (Create Independent Copies). Main, nested and control comps appear beside their respective originals. The panel lists the new main comp names and preserves the original Project panel selection. The default mode adds only compositions.

The operation is one undo step. Save the project in AE when ready. The panel works locally and needs no changes to scripting or networking preferences.

### What is independent

- Each copy has independent nested comps, text, cameras, controls, effects, keyframes, parenting and matte relationships.
- Static `comp("name")` calls point to the copied comps, including controllers referenced only by expressions. Static `footage("name")` calls follow the footage setting. The scanner supports single and double quotes and Unicode escapes, and preserves comments, ordinary strings and regular expressions.
- Layer names and indices are preserved, so local references such as `thisComp.layer("name")` continue to work inside each copy.
- With shared footage, replace the source of the specific layer to change only that copy. **Replace Footage** in the Project panel affects every reference to the same footage item.
- Independent footage mode creates separate AE footage items and solids in a per-copy folder. The media files on disk are shared. Overwriting a media file affects every item that uses it.
- A nested comp used more than once within a single copy is duplicated once for that copy. Separate copies have their own nested comps.

### Limits

The panel stops and identifies the composition, layer and property when a reference cannot be rewritten safely. This includes dynamic `comp(variable)` calls, concatenated names, indirect calls, `eval` or `Function`, template literals, duplicate target names, Essential Properties and media replacement overrides. Give targets unique names and use fixed literal references before analyzing again.

Independent footage mode cannot rebuild image sequences, proxies, offline items, placeholders, layered PSD or AI footage, or 3D assets. Prepare those separately or use shared footage mode.

The panel validates references, timing, parenting and mattes, and evaluates enabled expressions at the start, middle and end of each comp. Review name-dependent expressions, external paths and third-party effects in the copied comp. A failed operation removes the items created by that operation.

### Build and verify

- `python build.py` builds the single-file JSX and ZIP.
- `python build.py --installer` uses the Windows .NET Framework C# compiler to build the bundled EXE and Windows ZIP.
- `AE-Independent-Comp-Copier-Setup-v1.0.1.exe /self-test C:/work/installer-test.txt` checks installation, idempotency, backups, removal and file protection in a temporary directory.
- `node tests/lex.test.cjs` checks expression parsing, rewriting, escaping and duplicate names.
- `node tests/panel.test.cjs` checks docked panel callbacks, naming, copy count and the read/analyze controls.
- `tests/ae-smoke.jsx` uses temporary AE fixtures to check nested comps, expressions, footage isolation, multiple copies, text changes and rollback. It cleans up its fixtures and restores the selection.

`validation.json` records native AE 2026 validation for v1.0.0. The v1.0.1 tests cover sibling placement, selection preservation, reuse of photos in nested comps and batch rollback. Try a duplicate project first when using a different AE version.

The **Build Windows installer and release** GitHub Actions workflow builds and uploads the EXE, Windows ZIP, JSX and SHA-256 checksums. It refuses to overwrite published files with different contents. [Adobe scripting documentation](https://helpx.adobe.com/after-effects/desktop/automate-in-after-effects/automate-animation/scripts.html) · [AE Scripting Guide](https://ae-scripting.docsforadobe.dev/)
