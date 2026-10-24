"""Publish validated local build artifacts using the workflow's short-lived GITHUB_TOKEN."""
import hashlib
import json
import os
from pathlib import Path
import urllib.error
import urllib.parse
import urllib.request


def publish(api, repo, sha, dist):
    tag = 'v1.0.0'
    prefix = '/repos/' + repo
    try:
        release = api('GET', prefix + '/releases/tags/' + tag)
    except urllib.error.HTTPError as error:
        if error.code != 404:
            raise
        release = api('POST', prefix + '/releases', {
            'tag_name': tag, 'target_commitish': sha,
            'name': 'AE 独立合成复制器 v1.0.0',
            'body': '独立 Windows 安装包：自动检测 AE，内置插件文件，支持安装、更新、旧版本备份和卸载。\n\n'
                    '下载 Setup EXE 后双击安装，或下载 Windows ZIP 获取安装包、JSX 和说明。安装不会关闭 AE。\n\n'
                    '验证：24 项表达式测试、停靠面板回调测试、24 项 AE 原生断言，以及独立安装程序的安装 / 备份 / 卸载测试。\n\n'
                    '表达式静态 comp()/footage() 引用自动独立；不确定的动态引用会定位并停止。支持范围详见 README。',
            'draft': False, 'prerelease': False,
        })
    existing = {asset['name']: asset for asset in api('GET', prefix + '/releases/' + str(release['id']) + '/assets?per_page=100')}
    names = ['AE-Independent-Comp-Copier-Setup-v1.0.0.exe', 'AE-Independent-Comp-Copier-v1.0.0-Windows.zip',
             'Independent Comp Copier.jsx', 'SHA256SUMS.txt']
    for name in names:
        data = (dist / name).read_bytes()
        digest = 'sha256:' + hashlib.sha256(data).hexdigest()
        if name in existing:
            if existing[name].get('digest') == digest:
                print('Already published, identical: ' + name)
                continue
            raise RuntimeError('Release asset exists with different or unknown digest; refusing overwrite: ' + name)
        url = release['upload_url'].split('{', 1)[0] + '?' + urllib.parse.urlencode({'name': name})
        asset = api('POST', url, data, binary=True)
        if asset['size'] != len(data):
            raise RuntimeError('Uploaded size mismatch: ' + name)
        print('Published: ' + name)
    print('Release: ' + release['html_url'])


def main():
    token = os.environ['GITHUB_TOKEN']
    repo = os.environ['GITHUB_REPOSITORY']
    sha = os.environ['GITHUB_SHA']
    api_root = os.environ.get('GITHUB_API_URL', 'https://api.github.com')

    def api(method, endpoint, data=None, binary=False):
        url = endpoint if endpoint.startswith('https://') else api_root + endpoint
        body = data if binary else (json.dumps(data, ensure_ascii=False).encode('utf-8') if data is not None else None)
        request = urllib.request.Request(url, data=body, method=method, headers={
            'Authorization': 'Bearer ' + token, 'Accept': 'application/vnd.github+json',
            'X-GitHub-Api-Version': '2022-11-28', 'User-Agent': 'Independent-Comp-Copier-Release',
            'Content-Type': 'application/octet-stream' if binary else 'application/json',
        })
        with urllib.request.urlopen(request, timeout=120) as response:
            return json.load(response)

    publish(api, repo, sha, Path(__file__).resolve().parents[1] / 'dist')


if __name__ == '__main__':
    main()
