"""Build the portable, single-file AE ScriptUI panel and distributable zip."""
import argparse
import hashlib
import os
from pathlib import Path
import subprocess
import zipfile

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--installer', action='store_true', help='Compile the standalone Windows installer using the installed .NET Framework compiler')
args = parser.parse_args()
root = Path(__file__).resolve().parent
parts = [root / 'src' / name for name in ('lex.js', 'engine.jsxinc', 'panel.jsxinc')]
script = '// Independent Comp Copier 1.0.1 | MIT License\n(function(thisObj) {\n'
script += '\n'.join(p.read_text(encoding='utf-8') for p in parts)
script += '\n})(this);\n'
dist = root / 'dist'
dist.mkdir(exist_ok=True)
(dist / 'Independent Comp Copier.jsx').write_text(script, encoding='utf-8-sig')
with zipfile.ZipFile(dist / 'AE独立合成复制器.zip', 'w', zipfile.ZIP_DEFLATED) as z:
    z.write(dist / 'Independent Comp Copier.jsx', 'Independent Comp Copier.jsx')
    z.write(root / 'README.md', '使用说明.md')
    z.write(root / 'LICENSE', 'LICENSE')
print(dist / 'Independent Comp Copier.jsx')
if args.installer:
    compiler = Path(os.environ.get('WINDIR', 'C:/Windows')) / 'Microsoft.NET/Framework64/v4.0.30319/csc.exe'
    if os.name != 'nt' or not compiler.is_file():
        raise SystemExit('Windows with the .NET Framework compiler is required to build the installer')
    setup = dist / 'AE-Independent-Comp-Copier-Setup-v1.0.1.exe'
    subprocess.run([str(compiler), '/nologo', '/codepage:65001', '/utf8output', '/target:winexe', '/platform:anycpu', '/optimize+',
                    '/reference:System.Windows.Forms.dll', '/reference:System.Drawing.dll',
                    '/win32manifest:' + str(root / 'installer/app.manifest'),
                    '/resource:' + str(dist / 'Independent Comp Copier.jsx') + ',PanelPayload',
                    '/out:' + str(setup), str(root / 'installer/Installer.cs')], check=True)
    with zipfile.ZipFile(dist / 'AE-Independent-Comp-Copier-v1.0.1-Windows.zip', 'w', zipfile.ZIP_DEFLATED) as z:
        for file, archive_name in [(setup, setup.name), (dist / 'Independent Comp Copier.jsx', 'Independent Comp Copier.jsx'),
                                   (root / 'README.md', '使用说明.md'), (root / 'LICENSE', 'LICENSE')]:
            z.write(file, archive_name)
    release_files = [dist / 'Independent Comp Copier.jsx', dist / 'AE独立合成复制器.zip', setup,
                     dist / 'AE-Independent-Comp-Copier-v1.0.1-Windows.zip']
    sums = '\n'.join(hashlib.sha256(p.read_bytes()).hexdigest() + '  ' + p.name for p in release_files) + '\n'
    (dist / 'SHA256SUMS.txt').write_text(sums, encoding='utf-8')
    print(setup)
